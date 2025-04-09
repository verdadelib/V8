// pages/api/whatsapp/reload-flow.ts
import type { NextApiRequest, NextApiResponse } from 'next';
// *** NENHUMA IMPORTAÇÃO DE '@/lib/whatsappBot' AQUI ***

type ResponseData = {
  message: string;
};

const BOT_API_URL = `http://localhost:${process.env.WHATSAPP_BOT_API_PORT || 3001}`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData | { message: string; error?: string }>
) {
  if (req.method === 'POST') {
    console.log('[API Reload Flow] Recebida solicitação para recarregar fluxo via API interna...');
    try {
      const botResponse = await fetch(`${BOT_API_URL}/reload-flow`, { method: 'POST' });

      if (!botResponse.ok) {
        let errorMsg = `Erro ao solicitar recarga de fluxo ao bot: Status ${botResponse.status}`;
        try { const errorJson = await botResponse.json(); errorMsg = errorJson.message || errorMsg; } catch (e) {}
        console.error(`[API Reload Flow] Falha na comunicação com a API do bot: ${botResponse.status}`);
        throw new Error(errorMsg);
      }

      const data = await botResponse.json();
      console.log('[API Reload Flow] Resposta recebida do bot:', data.message);

      res.status(200).json({ message: data.message });

    } catch (error: any) {
      console.error("[API Reload Flow] Erro ao tentar recarregar fluxo via API interna:", error);
      res.status(503).json({ message: 'Erro ao comunicar com o serviço WhatsApp para recarregar fluxo', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ message: `Método ${req.method} não permitido` });
  }
}