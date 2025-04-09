// /pages/api/whatsapp/send.ts
import { NextApiRequest, NextApiResponse } from 'next';
// Se o bot rodar em processo separado, a comunicação deve ser feita via API interna
// ou utilizando a função do whatsappSender se aplicável.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { number, message } = req.body;

    if (!number || !message) {
      return res.status(400).json({ success: false, error: 'Número e mensagem são obrigatórios.' });
    }

    const jid = `${number.replace(/\D/g, '')}@s.whatsapp.net`;

    try {
      // Aqui, você pode chamar a função de envio se o bot estiver no mesmo processo,
      // ou fazer uma requisição HTTP para a API interna do bot.
      console.log(`API /send: Simulado envio para ${jid}: "${message}"`);
      console.warn("AVISO: A API /send atualmente apenas simula o envio. O bot precisa rodar separadamente e a comunicação inter-processos não está implementada aqui.");

      res.status(200).json({ success: true, message: 'Envio simulado com sucesso.' });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro no endpoint /api/whatsapp/send:', errorMessage);
      res.status(500).json({ success: false, error: 'Falha ao processar envio: ' + errorMessage });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: `Método ${req.method} não permitido` });
  }
}
