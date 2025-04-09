// /pages/api/whatsapp/webhook.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendMessageToWhatsApp } from '@/lib/whatsappSender'; // ASSUMIR que esta função existe e envia a msg

const FLOW_CONTROLLER_URL = process.env.FLOW_CONTROLLER_URL || 'http://localhost:5000/process_message';
const WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'seu_token_secreto'; // Token para verificar requisições GET

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('[Webhook] Received request:', req.method, req.url);

  // --- Verificação do Webhook (Facebook/Meta exige isso) ---
  if (req.method === 'GET') {
    console.log('[Webhook GET] Request query:', req.query);
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
      console.log('[Webhook GET] Verification successful.');
      res.status(200).send(challenge);
    } else {
      console.warn('[Webhook GET] Verification failed.');
      res.status(403).send('Forbidden');
    }
    return;
  }

  // --- Processamento de Mensagens Recebidas ---
  if (req.method === 'POST') {
    const body = req.body;
    console.log('[Webhook POST] Request body:', JSON.stringify(body, null, 2));

    // Estrutura esperada da API Cloud do WhatsApp
    // Adapte conforme a estrutura real recebida do Baileys ou outro provedor
    if (body?.object === 'whatsapp_business_account' && body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const messageEntry = body.entry[0].changes[0].value.messages[0];
      const senderJid = messageEntry.from; // Número com código do país, sem @s.whatsapp.net
      const messageType = messageEntry.type;
      let messageText = '';

      // Extrai o texto da mensagem
      if (messageType === 'text') {
        messageText = messageEntry.text?.body || '';
      } else if (messageType === 'interactive') {
        // Resposta de botão ou lista
        if (messageEntry.interactive?.type === 'button_reply') {
          messageText = messageEntry.interactive.button_reply?.id || ''; // Use o ID do botão como "texto"
        } else if (messageEntry.interactive?.type === 'list_reply') {
          messageText = messageEntry.interactive.list_reply?.id || ''; // Use o ID do item como "texto"
        }
      } else {
        console.log(`[Webhook POST] Ignorando tipo de mensagem não suportado: ${messageType}`);
        return res.status(200).send('EVENT_RECEIVED'); // Confirma recebimento
      }

       // Ignora mensagens vazias ou de status
      if (!messageText || messageEntry.status) {
        console.log('[Webhook POST] Mensagem vazia ou de status ignorada.');
        return res.status(200).send('EVENT_RECEIVED');
      }


      console.log(`[Webhook POST] Mensagem de ${senderJid}: "${messageText}"`);

      // Normaliza JID se necessário (ex: se Baileys não incluir o @s.whatsapp.net)
      const normalizedSenderId = senderJid.includes('@') ? senderJid : `${senderJid}@s.whatsapp.net`;

      try {
        console.log(`[Webhook POST] Enviando para Flow Controller (${FLOW_CONTROLLER_URL})...`);
        const flowResponse = await fetch(FLOW_CONTROLLER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender_id: normalizedSenderId, // Envia JID completo
            message: messageText,
          }),
        });

        if (!flowResponse.ok) {
          const errorText = await flowResponse.text();
          console.error(`[Webhook POST] Erro do Flow Controller (${flowResponse.status}): ${errorText}`);
          throw new Error(`Flow Controller error: ${flowResponse.status}`);
        }

        const flowData = await flowResponse.json();
        console.log('[Webhook POST] Resposta do Flow Controller:', flowData);

        if (flowData.response_message) {
           console.log(`[Webhook POST] Enviando resposta via whatsappSender para ${normalizedSenderId}: "${flowData.response_message}"`);
           // ** PONTO CRÍTICO: Chamar a função de envio REAL **
           await sendMessageToWhatsApp(normalizedSenderId, { text: flowData.response_message });
           console.log('[Webhook POST] Mensagem enviada (ou enfileirada).');
        } else {
           console.log('[Webhook POST] Flow Controller não retornou mensagem de resposta.');
        }

        // Responde ao WhatsApp que o evento foi processado
        return res.status(200).send('EVENT_RECEIVED');

      } catch (error: any) {
        console.error('[Webhook POST] Erro ao processar mensagem:', error);
        // Responde OK para o WhatsApp não reenviar, mas loga o erro
        return res.status(200).send('EVENT_RECEIVED_WITH_ERROR');
      }
    } else {
       console.log('[Webhook POST] Payload não reconhecido ou sem mensagem processável.');
       return res.status(200).send('EVENT_RECEIVED_UNPROCESSED');
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}