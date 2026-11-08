/**
 * SERVIDOR WEBHOOK WHATSAPP CLOUD API & BOT DE RESERVACIONES
 * Empresa: MOVEXA (Transporte & Paquetería Express Teziutlán ↔ Puebla)
 * Archivo: server.js
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

// ✏️ TARIFA OFICIAL Y DATOS BANCARIOS DE MOVEXA
const TARIFA_BOLETO = "$200.00 MXN";
const DATOS_PAGO = `
💳 *DATOS DE PAGO Y DEPÓSITO - MOVEXA*
---------------------------------------
• *Banco:* BBVA Bancomer
• *Cuenta CLABE:* 012 680 015 489 302 119
• *Titular:* MOVEXA Transporte Express
• *Pago en OXXO:* Depositar a tarjeta BBVA: 4152 3138 9012 3456

⚠️ *Nota:* Dispones de 30 minutos para enviar tu comprobante de pago por este chat para confirmar tu asiento.
`;

// =============================================================================
// 1. VERIFICACIÓN DE WEBHOOK DE META (GET /webhook)
// =============================================================================
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

// =============================================================================
// 2. RECEPCIÓN Y RESPUESTA DE MENSAJES (POST /webhook)
// =============================================================================
app.post('/webhook', async (req, res) => {
    try {
        const body = req.body;
        if (body.object === 'whatsapp_business_account') {
            const entry = body.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;
            const message = value?.messages?.[0];

            if (message) {
                const from = message.from; // Número del cliente
                const messageType = message.type;

                if (messageType === 'text') {
                    const text = message.text.body.trim().toLowerCase();
                    await handleIncomingText(from, text);
                } else if (messageType === 'interactive') {
                    const buttonId = message.interactive?.button_reply?.id;
                    await handleButtonReply(from, buttonId);
                }
            }
            return res.status(200).send('EVENT_RECEIVED');
        }
        return res.sendStatus(404);
    } catch (error) {
        console.error('❌ Error en Webhook:', error.response?.data || error.message);
        return res.status(500).send('INTERNAL_SERVER_ERROR');
    }
});

// =============================================================================
// 3. DIÁLOGOS Y RESPUESTAS DEL BOT MOVEXA
// =============================================================================

async function handleIncomingText(from, text) {
    if (text.includes('pago') || text.includes('cuenta') || text.includes('clabe') || text.includes('oxxo')) {
        await sendTextMessage(from, DATOS_PAGO);
    } else if (text.includes('precio') || text.includes('costo') || text.includes('cuanto')) {
        await sendTextMessage(from, `🎫 *Tarifa Oficial MOVEXA*\n\nEl costo del pasaje individual Teziutlán ↔ Puebla (Parque Puebla / Plaza Dorada) es de *${TARIFA_BOLETO}* por asiento.`);
    } else if (text.includes('paquete') || text.includes('envio') || text.includes('paqueteria')) {
        await sendTextMessage(from, `📦 *Servicio de Paquetería Express MOVEXA*\n\nRealizamos envíos de sobres y paquetes en la ruta Teziutlán ↔ Puebla con entrega el mismo día.\n\nPara cotizar un envío, indícanos el tamaño o peso aproximado de tu paquete.`);
    } else {
        await sendMainMenu(from);
    }
}

async function handleButtonReply(from, buttonId) {
    if (buttonId === 'BTN_TEZ_PUE') {
        const webviewUrl = `https://mi-empresa-transporte.com/webview_asientos.html?origen=Teziutlan&destino=Puebla&phone=${from}`;
        await sendTextMessage(from, `🚐 *Reserva: Teziutlán ➔ Puebla*\n\nCosto por asiento: *${TARIFA_BOLETO}*\n\nPara seleccionar tu horario de salida, tu asiento en la Urvan y tu lugar de bajada en Puebla (*Parque Puebla* o *Plaza Dorada*), abre el siguiente enlace seguro:\n\n👉 ${webviewUrl}`);
    } else if (buttonId === 'BTN_PUE_TEZ') {
        const webviewUrl = `https://mi-empresa-transporte.com/webview_asientos.html?origen=Puebla&destino=Teziutlan&phone=${from}`;
        await sendTextMessage(from, `🚐 *Reserva: Puebla ➔ Teziutlán*\n\nCosto por asiento: *${TARIFA_BOLETO}*\n\nPara seleccionar tu horario de salida y tu asiento en la Urvan, abre el siguiente enlace seguro:\n\n👉 ${webviewUrl}`);
    } else if (buttonId === 'BTN_PAGOS') {
        await sendTextMessage(from, DATOS_PAGO);
    }
}

// =============================================================================
// 4. FUNCIONES AUXILIARES DE ENVÍO (GRAPH API META)
// =============================================================================

async function sendTextMessage(to, textBody) {
    try {
        await axios.post(
            `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
            { messaging_product: 'whatsapp', to: to, type: 'text', text: { body: textBody } },
            { headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' } }
        );
    } catch (err) {
        console.error('Error enviando mensaje:', err.response?.data || err.message);
    }
}

async function sendMainMenu(to) {
    try {
        await axios.post(
            `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: 'whatsapp',
                to: to,
                type: 'interactive',
                interactive: {
                    type: 'button',
                    header: { type: 'text', text: '🚐 MOVEXA - Transporte & Paquetería' },
                    body: { text: '¡Hola! Bienvenido al servicio de reservaciones de MOVEXA Teziutlán ↔ Puebla.\n\n¿En qué ruta deseas reservar tu asiento hoy?' },
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
    } catch (err) {
        console.error('Error enviando menú:', err.response?.data || err.message);
    }
}

app.listen(PORT, () => {
    console.log(`🚀 Servidor Webhook de MOVEXA ejecutándose en el puerto ${PORT}`);
});