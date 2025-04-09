// C:\Users\ADM\Desktop\USB MKT PRO V3\pages\api\campaigns.ts
import { NextApiRequest, NextApiResponse } from 'next';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function openDb() {
  return open({
    filename: './database.db',
    driver: sqlite3.Database
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = await openDb();

  // Cria ou atualiza a tabela campaigns
  await db.exec(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      industry TEXT,
      targetAudience TEXT,
      platform TEXT,
      objective TEXT,
      budget REAL,
      daily_budget REAL,
      segmentation TEXT,
      adFormat TEXT,
      duration INTEGER,
      revenue REAL DEFAULT 0,
      leads INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      sales INTEGER DEFAULT 0
    )
  `);

  // Adiciona colunas que podem estar faltando na tabela existente
  try {
    await db.exec('ALTER TABLE campaigns ADD COLUMN industry TEXT');
  } catch (e) { /* Ignora se já existe */ }
  try {
    await db.exec('ALTER TABLE campaigns ADD COLUMN targetAudience TEXT');
  } catch (e) { /* Ignora se já existe */ }
  try {
    await db.exec('ALTER TABLE campaigns ADD COLUMN segmentation TEXT');
  } catch (e) { /* Ignora se já existe */ }
  try {
    await db.exec('ALTER TABLE campaigns ADD COLUMN adFormat TEXT');
  } catch (e) { /* Ignora se já existe */ }
  try {
    await db.exec('ALTER TABLE campaigns ADD COLUMN revenue REAL DEFAULT 0');
  } catch (e) { /* Ignora se já existe */ }
  try {
    await db.exec('ALTER TABLE campaigns ADD COLUMN leads INTEGER DEFAULT 0');
  } catch (e) { /* Ignora se já existe */ }
  try {
    await db.exec('ALTER TABLE campaigns ADD COLUMN clicks INTEGER DEFAULT 0');
  } catch (e) { /* Ignora se já existe */ }
  try {
    await db.exec('ALTER TABLE campaigns ADD COLUMN sales INTEGER DEFAULT 0');
  } catch (e) { /* Ignora se já existe */ }

  if (req.method === 'GET') {
    try {
      const campaigns = await db.all('SELECT * FROM campaigns');
      res.status(200).json(campaigns);
    } catch (err) {
      console.error('Erro ao buscar campanhas:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  } else if (req.method === 'POST') {
    const { name, industry, targetAudience, platform, objective, budget, daily_budget, segmentation, adFormat, duration, revenue, leads, clicks, sales } = req.body;
    const id = Date.now().toString();
    try {
      if (!name) {
        return res.status(400).json({ error: 'Nome da campanha é obrigatório' });
      }
      await db.run(
        'INSERT INTO campaigns (id, name, industry, targetAudience, platform, objective, budget, daily_budget, segmentation, adFormat, duration, revenue, leads, clicks, sales) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, name, industry || null, targetAudience || null, platform || null, objective || null, budget || 0, daily_budget || 0, segmentation || null, adFormat || null, duration || 0, revenue || 0, leads || 0, clicks || 0, sales || 0]
      );
      const newCampaign = await db.get('SELECT * FROM campaigns WHERE id = ?', [id]);
      res.status(201).json(newCampaign);
    } catch (err) {
      console.error('Erro ao criar campanha:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  } else if (req.method === 'PUT') {
    const { id } = req.query;
    const { name, industry, targetAudience, platform, objective, budget, daily_budget, segmentation, adFormat, duration, revenue, leads, clicks, sales } = req.body;
    try {
      if (!id || !name) {
        return res.status(400).json({ error: 'ID e nome da campanha são obrigatórios' });
      }
      await db.run(
        'UPDATE campaigns SET name = ?, industry = ?, targetAudience = ?, platform = ?, objective = ?, budget = ?, daily_budget = ?, segmentation = ?, adFormat = ?, duration = ?, revenue = ?, leads = ?, clicks = ?, sales = ? WHERE id = ?',
        [name, industry || null, targetAudience || null, platform || null, objective || null, budget || 0, daily_budget || 0, segmentation || null, adFormat || null, duration || 0, revenue || 0, leads || 0, clicks || 0, sales || 0, id]
      );
      const updatedCampaign = await db.get('SELECT * FROM campaigns WHERE id = ?', [id]);
      res.status(200).json(updatedCampaign);
    } catch (err) {
      console.error('Erro ao atualizar campanha:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  } else if (req.method === 'DELETE') {
    const { id } = req.query;
    try {
      if (!id) {
        return res.status(400).json({ error: 'ID da campanha é obrigatório' });
      }
      await db.run('DELETE FROM campaigns WHERE id = ?', [id]);
      res.status(204).end();
    } catch (err) {
      console.error('Erro ao excluir campanha:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  } else {
    res.status(405).json({ error: 'Método não permitido' });
  }

  await db.close();
}