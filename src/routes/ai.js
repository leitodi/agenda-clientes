const express = require('express');
const { authRequired, adminRequired } = require('../middleware/auth');

const router = express.Router();

const OPENAI_API_KEY = String(process.env.OPENAI_API_KEY || '').trim();
const OPENAI_RESPONSES_MODEL = String(process.env.OPENAI_VISION_MODEL || 'gpt-4.1-mini').trim();
const OPENAI_IMAGE_MODEL = String(process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1').trim();
const OPENAI_IMAGE_SIZE = String(process.env.OPENAI_IMAGE_SIZE || '1024x1024').trim();
const AI_DEMO_MODE = String(process.env.AI_DEMO_MODE || 'true').trim().toLowerCase() !== 'false';
const OPENAI_API_BASE = 'https://api.openai.com/v1';

function validateDataUrlImage(dataUrl) {
    const text = String(dataUrl || '').trim();
    const match = text.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);

    if (!match) {
        throw new Error('La foto enviada no es valida');
    }

    const mimeType = match[1];
    const base64 = match[2];
    const bytes = Buffer.from(base64, 'base64');

    if (!bytes.length) {
        throw new Error('La foto enviada esta vacia');
    }

    return {
        mimeType,
        base64,
        bytes
    };
}

async function openAIJsonRequest(endpoint, payload, extraHeaders = {}) {
    const response = await fetch(`${OPENAI_API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
            ...extraHeaders
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        const message = data?.error?.message || 'No se pudo procesar la solicitud con OpenAI';
        throw new Error(message);
    }

    return data;
}

function extractResponseText(payload) {
    if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
        return payload.output_text.trim();
    }

    const outputs = Array.isArray(payload?.output) ? payload.output : [];
    const parts = [];

    outputs.forEach((output) => {
        const content = Array.isArray(output?.content) ? output.content : [];
        content.forEach((item) => {
            if (item?.type === 'output_text' && item.text) {
                parts.push(String(item.text));
            }
        });
    });

    return parts.join('\n').trim();
}

function safeParseJson(text) {
    const raw = String(text || '').trim();
    if (!raw) {
        throw new Error('La IA no devolvio una recomendacion interpretable');
    }

    try {
        return JSON.parse(raw);
    } catch (error) {
        const start = raw.indexOf('{');
        const end = raw.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return JSON.parse(raw.slice(start, end + 1));
        }
        throw new Error('La respuesta de IA no pudo convertirse a JSON');
    }
}

function sanitizeString(value, fallback = '') {
    const text = String(value || '').trim();
    return text || fallback;
}

function sanitizeArray(values, fallback = []) {
    if (!Array.isArray(values)) {
        return fallback;
    }

    return values
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .slice(0, 4);
}

function normalizeRecommendation(result, requestText) {
    return {
        recomendacionPrincipal: sanitizeString(
            result?.recomendacionPrincipal,
            'Cambio recomendado'
        ),
        resumen: sanitizeString(
            result?.resumen,
            `Recomendacion basada en la foto y en el pedido: ${requestText}`
        ),
        tecnicaSugerida: sanitizeString(result?.tecnicaSugerida, 'A definir con el peluquero'),
        nivelMantenimiento: sanitizeString(result?.nivelMantenimiento, 'Medio'),
        alternativas: sanitizeArray(result?.alternativas, []),
        advertencias: sanitizeArray(result?.advertencias, []),
        promptSimulacion: sanitizeString(result?.promptSimulacion, '')
    };
}

function buildDemoRecommendation({ pedido, clienteNombre }) {
    const pedidoNormalizado = String(pedido || '').toLowerCase();
    const nombre = sanitizeString(clienteNombre, 'cliente');

    let recomendacionPrincipal = 'Corte con textura y laterales prolijos';
    let tecnicaSugerida = 'Trabajo con tijera y terminacion suave';
    let nivelMantenimiento = 'Medio';
    let alternativas = [
        'Dejar mas volumen arriba con contornos limpios',
        'Corte clasico corto de facil mantenimiento'
    ];
    let advertencias = [
        'Modo demo: esta respuesta es simulada para probar el modulo',
        'La simulacion visual usa la foto original y no un cambio real generado por IA'
    ];

    if (pedidoNormalizado.includes('teni') || pedidoNormalizado.includes('teñ') || pedidoNormalizado.includes('color')) {
        recomendacionPrincipal = 'Cambio de color suave y natural';
        tecnicaSugerida = 'Bano de color o aclarado progresivo segun diagnostico';
        nivelMantenimiento = 'Medio a alto';
        alternativas = [
            'Reflejos sutiles para iluminar sin un cambio brusco',
            'Tono mas parejo y natural para menor mantenimiento'
        ];
    } else if (pedidoNormalizado.includes('corto') || pedidoNormalizado.includes('degrade') || pedidoNormalizado.includes('degrad')) {
        recomendacionPrincipal = 'Corte corto con desvanecido moderado';
        tecnicaSugerida = 'Degrade medio con textura superior';
        nivelMantenimiento = 'Medio';
        alternativas = [
            'Degrade bajo si quiere algo mas clasico',
            'Laterales cortos y parte superior peinable'
        ];
    } else if (pedidoNormalizado.includes('largo') || pedidoNormalizado.includes('dejar crecer')) {
        recomendacionPrincipal = 'Mantener largo con forma y limpieza de puntas';
        tecnicaSugerida = 'Capas suaves para ordenar el volumen';
        nivelMantenimiento = 'Bajo a medio';
        alternativas = [
            'Recorte de mantenimiento conservando largo',
            'Forma mas marcada en contorno y nuca'
        ];
    }

    return {
        recomendacionPrincipal,
        resumen: `Demo para ${nombre}: en base al pedido "${pedido}" se sugiere una opcion comercial y facil de mostrar en salon.`,
        tecnicaSugerida,
        nivelMantenimiento,
        alternativas,
        advertencias,
        promptSimulacion: 'Demo local sin generacion real de imagen'
    };
}

async function analizarFotoCliente({ foto, pedido, clienteNombre }) {
    const instruction = [
        'Eres un asesor de salon profesional.',
        'Analiza la foto del cliente y su pedido.',
        'Devuelve solo JSON valido sin markdown.',
        'Responde en espanol.',
        'Debes recomendar un look realista y comercialmente viable.',
        'Si el pedido no conviene, propon una alternativa mas favorecedora.',
        'El JSON debe tener estas claves:',
        'recomendacionPrincipal, resumen, tecnicaSugerida, nivelMantenimiento, alternativas, advertencias, promptSimulacion.',
        'alternativas y advertencias deben ser arrays de strings.',
        'promptSimulacion debe describir como editar la foto para que cambie solo el cabello, manteniendo rostro, identidad, pose y fondo.'
    ].join(' ');

    const userText = [
        clienteNombre ? `Cliente: ${clienteNombre}.` : '',
        `Pedido del cliente: ${pedido}.`,
        'Quiero una recomendacion principal, hasta 2 alternativas y advertencias si aplica.',
        'La simulacion debe verse realista y apta para mostrar en una peluqueria.'
    ].filter(Boolean).join(' ');

    const payload = {
        model: OPENAI_RESPONSES_MODEL,
        input: [
            {
                role: 'system',
                content: [
                    {
                        type: 'input_text',
                        text: instruction
                    }
                ]
            },
            {
                role: 'user',
                content: [
                    {
                        type: 'input_text',
                        text: userText
                    },
                    {
                        type: 'input_image',
                        image_url: foto,
                        detail: 'high'
                    }
                ]
            }
        ],
        max_output_tokens: 1000
    };

    const response = await openAIJsonRequest('/responses', payload);
    const parsed = safeParseJson(extractResponseText(response));
    return normalizeRecommendation(parsed, pedido);
}

async function generarSimulacion({ imageBytes, mimeType, pedido, recomendacion }) {
    const form = new FormData();
    const simulationPrompt = [
        'Edita esta foto de forma realista para simular un cambio de look en peluqueria.',
        `Pedido del cliente: ${pedido}.`,
        `Recomendacion principal: ${recomendacion.recomendacionPrincipal}.`,
        `Resumen tecnico: ${recomendacion.resumen}.`,
        `Tecnica sugerida: ${recomendacion.tecnicaSugerida}.`,
        recomendacion.promptSimulacion || '',
        'Cambia solo el cabello.',
        'Mantener identidad, rostro, expresion, tono de piel, pose, ropa y fondo.',
        'No agregar accesorios ni cambiar la persona.',
        'Resultado prolijo, creible y util para mostrar como simulacion en el salon.'
    ].filter(Boolean).join(' ');

    form.append('model', OPENAI_IMAGE_MODEL);
    form.append('prompt', simulationPrompt);
    form.append('size', OPENAI_IMAGE_SIZE);
    form.append('output_format', 'png');
    form.append('image', new Blob([imageBytes], { type: mimeType }), 'cliente.png');

    const response = await fetch(`${OPENAI_API_BASE}/images/edits`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`
        },
        body: form
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        const message = data?.error?.message || 'No se pudo generar la simulacion de IA';
        throw new Error(message);
    }

    const firstImage = Array.isArray(data?.data) ? data.data[0] : null;
    const imageBase64 = firstImage?.b64_json || firstImage?.base64 || '';
    const imageUrl = String(firstImage?.url || '').trim();

    if (imageBase64) {
        return `data:image/png;base64,${imageBase64}`;
    }

    if (imageUrl) {
        return imageUrl;
    }

    throw new Error('OpenAI no devolvio una imagen de simulacion');
}

router.post('/asesor-capilar', authRequired, adminRequired, async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        const pedido = sanitizeString(req.body?.pedido);
        const clienteNombre = sanitizeString(req.body?.clienteNombre);
        const foto = sanitizeString(req.body?.foto);

        if (!pedido) {
            return res.status(400).json({ error: 'Debes indicar que quiere hacerse el cliente' });
        }

        if (!foto) {
            return res.status(400).json({ error: 'Debes enviar una foto del cliente' });
        }

        if (!OPENAI_API_KEY && AI_DEMO_MODE) {
            return res.json({
                pedido,
                clienteNombre,
                recomendacion: buildDemoRecommendation({ pedido, clienteNombre }),
                simulacion: foto,
                modelos: {
                    analisis: 'demo-local',
                    imagen: 'demo-local'
                },
                modo: 'demo',
                nota: 'Modo demo activo: la recomendacion es simulada y la imagen mostrada es la foto original.'
            });
        }

        if (!OPENAI_API_KEY) {
            return res.status(503).json({
                error: 'Falta configurar OPENAI_API_KEY para usar el Asesor IA'
            });
        }

        const parsedImage = validateDataUrlImage(foto);
        const recomendacion = await analizarFotoCliente({
            foto,
            pedido,
            clienteNombre
        });

        const simulacion = await generarSimulacion({
            imageBytes: parsedImage.bytes,
            mimeType: parsedImage.mimeType,
            pedido,
            recomendacion
        });

        return res.json({
            pedido,
            clienteNombre,
            recomendacion,
            simulacion,
            modelos: {
                analisis: OPENAI_RESPONSES_MODEL,
                imagen: OPENAI_IMAGE_MODEL
            },
            modo: 'openai',
            nota: ''
        });
    } catch (error) {
        console.error('Error generando asesor IA:', error);
        return res.status(500).json({
            error: error.message || 'No se pudo completar el analisis de IA'
        });
    }
});

module.exports = router;
