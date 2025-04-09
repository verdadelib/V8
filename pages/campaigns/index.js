import { Campaign } from '@/entities/Campaign';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const campaigns = await Campaign.list();
      res.status(200).json(campaigns);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao listar campanhas' });
    }
  } else {
    res.status(405).json({ error: 'Método não permitido' });
  }
}