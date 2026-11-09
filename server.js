/**
 * SERVIDOR WEBHOOK WHATSAPP CLOUD API & BOT DE RESERVACIONES
 * Empresa: MOVEXA (Teziutlán ↔ Puebla)
 * Archivo: server.js - Versión con Formato México y Logs Detallados
 */

require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'teziutlan_puebla_token_2026';
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_ID;

const TARIFA_BOLETO = "$180.00 MXN";
const DATOS_PAGO = `
💳 *DATOS DE PAGO Y DEPÓSITO - MOVEXA*
---------------------------------------
• *Banco:* BBVA Bancomer
• *Cuenta CLABE:* 012 680 015 489 302 119
• *Titular:* MOVEXA Transporte Express
• *Pago en OXXO:* Depositar a tarjeta BBVA: 4152 3138 9012 3456

⚠️ *Nota:* Dispones de 30 minutos para enviar tu comprobante por este chat.
`;

// Función para sanear números de teléfono de México (remueve el "1" internacional)
function formatMexicanPhone(phone) {
    if (!phone) return phone;
    let clean = phone.toString().replace(/[^0-9]/g, '');
    if (clean.startsWith('521') && clean.length === 13) {
        clean = '52' + clean.substring(3);
    }
    return clean;
}

app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('✅ Webhook verificado exitosamente con Meta.');
        return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
    try {
        const body = req.body;
        if (body.object === 'whatsapp_business_account') {
            const entry = body.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;
            const message = value?.messages?.[0];

            if (message) {
                const rawFrom = message.from;
                const from = formatMexicanPhone(rawFrom);
                const messageType = message.type;

                console.log(`📩 Mensaje recibido de ${from} (${rawFrom}) tipo [${messageType}]`);

                if (messageType === 'text') {
                    const text = message.text.body.trim().toLowerCase();
                    if (text.includes('pago') || text.includes('cuenta') || text.includes('oxxo')) {
                        await sendTextMessage(from, DATOS_PAGO);
                    } else if (text.includes('precio') || text.includes('costo')) {
                        await sendTextMessage(from, `🎫 *Tarifa Oficial MOVEXA*\nEl pasaje individual es de *${TARIFA_BOLETO}*.`);
                    } else {
                        await sendMainMenu(from);
                    }
                } else if (messageType === 'interactive') {
                    const buttonId = message.interactive?.button_reply?.id;
                    if (buttonId === 'BTN_TEZ_PUE') {
                        await sendTextMessage(from, `🚐 *Reserva Teziutlán ➔ Puebla*\nCosto: *${TARIFA_BOLETO}*\nElige tu asiento en:\n👉 https://mi-empresa-transporte.com/webview_asientos.html?origen=Teziutlan&phone=${from}`);
                    } else if (buttonId === 'BTN_PUE_TEZ') {
                        await sendTextMessage(from, `🚐 *Reserva Puebla ➔ Teziutlán*\nCosto: *${TARIFA_BOLETO}*\nElige tu asiento en:\n👉 https://mi-empresa-transporte.com/webview_asientos.html?origen=Puebla&phone=${from}`);
                    } else if (buttonId === 'BTN_PAGOS') {
                        await sendTextMessage(from, DATOS_PAGO);
                    }
                }
            }
            return res.status(200).send('EVENT_RECEIVED');
        }
        return res.sendStatus(404);
    } catch (error) {
        console.error('❌ Error procesando Webhook POST:', error.message);
        return res.status(500).send('ERROR');
    }
});

async function sendTextMessage(to, textBody) {
    try {
        console.log(`📤 Enviando mensaje de texto a Meta API para ${to}...`);
        const resp = await axios.post(
            `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
            { messaging_product: 'whatsapp', to: to, type: 'text', text: { body: textBody } },
            { headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' } }
        );
        console.log(`✅ Respuesta enviada a ${to} exitosamente:`, resp.data);
    } catch (err) {
        console.error('❌ ERROR DETALLADO DESDE META GRAPH API:', err.response?.data || err.message);
    }
}

async function sendMainMenu(to) {
    try {
        console.log(`📤 Enviando menú de botones interactivos a Meta API para ${to}...`);
        const resp = await axios.post(
            `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: 'whatsapp',
                to: to,
                type: 'interactive',
                interactive: {
                    type: 'button',
                    header: { type: 'text', text: '🚐 MOVEXA - Transporte & Paquetería' },
                    body: { text: '¡Hola! Bienvenido al servicio de reservaciones de MOVEXA Teziutlán ↔ Puebla.\n\n¿En qué ruta deseas reservar hoy?' },
                    footer: { text: 'Selecciona una opción para continuar' },
                    action: {
                        buttons: [
                            { type: 'reply', reply: { id: 'BTN_TEZ_PUE', title: 'Teziutlán ➔ Puebla' } },
                            { type: 'reply', reply: { id: 'BTN_PUE_TEZ', title: 'Puebla ➔ Teziutlán' } },
                            { type: 'reply', reply: { id: 'BTN_PAGOS', title: 'Datos de Pago / OXXO' } }
                        ]
                    }
                }
            },
            { headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' } }
        );
        console.log(`✅ Menú interactivo enviado a ${to} exitosamente:`, resp.data);
    } catch (err) {
        console.error('❌ ERROR DETALLADO DESDE META GRAPH API (sendMainMenu):', err.response?.data || err.message);
    }
}

app.listen(PORT, () => console.log(`🚀 Servidor Webhook de MOVEXA listo en puerto ${PORT}`));