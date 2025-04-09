// C:\Users\ADM\Desktop\USB MKT PRO V3\lib\db.js
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

let db = null;

// Função exportada para obter/abrir a conexão
async function initializeDatabase() {
  if (db) {
    return db;
  }
  try {
    console.log('Abrindo nova conexão SQLite...');
    const newDbInstance = await open({ filename: './database.db', driver: sqlite3.Database });
    console.log('Conectado SQLite.');
    await initializeDatabaseStructure(newDbInstance);
    db = newDbInstance;
    return db;
  } catch (err) {
    console.error('Erro ao abrir/inicializar DB:', err.message);
    db = null;
    throw err;
  }
}

// Função interna para verificar se coluna existe
async function columnExists(dbInstance, tableName, columnName) {
    try {
        const tableCheck = await dbInstance.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tableName]);
        if (!tableCheck) return false;
        const columns = await dbInstance.all(`PRAGMA table_info(${tableName})`);
        return columns.some(col => col.name === columnName);
    } catch (error) {
        console.error(`Erro ao verificar coluna ${tableName}.${columnName}:`, error);
        return false;
    }
}

// Função interna para inicializar/migrar estrutura
async function initializeDatabaseStructure(dbInstance) {
   if (!dbInstance) {
       console.error("initializeDatabaseStructure chamada com dbInstance nulo.");
       return;
   }
   console.log("Verificando/Criando estrutura DB...");
   await dbInstance.exec(`PRAGMA foreign_keys = ON;`);

   await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, platform TEXT, objective TEXT, budget REAL, daily_budget REAL,
      duration INTEGER, revenue REAL, leads INTEGER, clicks INTEGER, sales INTEGER, industry TEXT,
      targetAudience TEXT, segmentation TEXT, adFormat TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, message TEXT NOT NULL, metric TEXT,
      value REAL, threshold REAL, created_date TEXT, read INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS copies (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL, cta TEXT NOT NULL, target_audience TEXT,
      status TEXT, campaign_id TEXT, created_date TEXT, clicks INTEGER DEFAULT 0, impressions INTEGER DEFAULT 0,
      conversions INTEGER DEFAULT 0, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS flows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      campaign_id TEXT,
      status TEXT DEFAULT 'inactive' CHECK(status IN ('active', 'inactive', 'draft')),
      elements TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
    );
   `);

   const flowsHasCampaignId = await columnExists(dbInstance, 'flows', 'campaign_id');
   if (!flowsHasCampaignId) {
       try {
           console.log("Adicionando coluna 'campaign_id' em 'flows'...");
           await dbInstance.exec('ALTER TABLE flows ADD COLUMN campaign_id TEXT');
           console.log("Coluna 'campaign_id' adicionada.");
       } catch (alterError) { console.error("Erro ao adicionar 'campaign_id':", alterError); }
   }
   const flowsHasStatus = await columnExists(dbInstance, 'flows', 'status');
    if (!flowsHasStatus) {
        try {
            console.log("Adicionando coluna 'status' em 'flows'...");
            await dbInstance.exec("ALTER TABLE flows ADD COLUMN status TEXT DEFAULT 'inactive'");
            console.log("Coluna 'status' adicionada.");
        } catch (alterError) { console.error("Erro ao adicionar 'status':", alterError); }
    }

   await dbInstance.exec(`CREATE TRIGGER IF NOT EXISTS update_flow_updated_at AFTER UPDATE ON flows FOR EACH ROW BEGIN UPDATE flows SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id; END;`);
   await dbInstance.exec(`CREATE TRIGGER IF NOT EXISTS update_campaign_updated_at AFTER UPDATE ON campaigns FOR EACH ROW BEGIN UPDATE campaigns SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id; END;`);
   await dbInstance.exec(`CREATE TRIGGER IF NOT EXISTS update_copy_updated_at AFTER UPDATE ON copies FOR EACH ROW BEGIN UPDATE copies SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id; END;`);

  console.log("Estrutura DB verificada/criada.");
}

// --- Funções CRUD para Campaigns ---
async function getCampaignsForSelect() {
  const dbConn = await initializeDatabase();
  try {
      return await dbConn.all('SELECT id, name FROM campaigns ORDER BY name ASC');
  } catch (error) {
      console.error("Erro ao buscar campanhas para select:", error);
      return [];
  }
}

// --- Funções CRUD para Flows ---
async function getAllFlows(campaignId = null) {
  const dbConn = await initializeDatabase();
  let query = 'SELECT id, name, status, campaign_id, updated_at FROM flows';
  const params = [];
  if (campaignId && campaignId !== 'all') {
      if (campaignId === 'none' || campaignId === 'null') { query += ' WHERE campaign_id IS NULL'; }
      else { query += ' WHERE campaign_id = ?'; params.push(campaignId); }
  }
  query += ' ORDER BY name ASC';
   try { return await dbConn.all(query, params); }
   catch (error) { console.error("Erro ao buscar lista de fluxos:", error); return []; }
}

// *** REMOVIDA TIPAGEM DO PARÂMETRO id ***
async function getFlowById(id) {
   const dbConn = await initializeDatabase();
    try {
        const row = await dbConn.get('SELECT * FROM flows WHERE id = ?', [id]);
        if (!row) return null;
         let parsedElements = null;
         if (row.elements && typeof row.elements === 'string') { try { parsedElements = JSON.parse(row.elements); } catch (e) { console.error("Erro parse elements:", e); parsedElements = null; } }
         else if (row.elements && typeof row.elements === 'object') { parsedElements = row.elements; }
         if (parsedElements) { if (!Array.isArray(parsedElements.nodes)) parsedElements.nodes = []; if (!Array.isArray(parsedElements.edges)) parsedElements.edges = []; }
         else { parsedElements = { nodes: [], edges: [] }; }
         return { ...row, elements: parsedElements };
    } catch (error) { console.error(`Erro ao buscar fluxo por ID ${id}:`, error); return null; }
}

async function getActiveFlow() {
    const dbConn = await initializeDatabase();
     try {
         const row = await dbConn.get("SELECT * FROM flows WHERE status = 'active' LIMIT 1");
          if (!row) return null;
         let parsedElements = null;
         if (row.elements && typeof row.elements === 'string') { try { parsedElements = JSON.parse(row.elements); } catch (e) { console.error("Erro parse elements (active):", e); parsedElements = null; } }
         else if (row.elements && typeof row.elements === 'object') { parsedElements = row.elements; }
         if (parsedElements) { if (!Array.isArray(parsedElements.nodes)) parsedElements.nodes = []; if (!Array.isArray(parsedElements.edges)) parsedElements.edges = []; }
         else { parsedElements = { nodes: [], edges: [] }; }
         return { ...row, elements: parsedElements };
     } catch (error) { console.error("Erro ao buscar fluxo ativo:", error); return null; }
 }

// *** REMOVIDA TIPAGEM DOS PARÂMETROS name, campaign_id ***
async function createFlow(name, campaign_id = null) {
  const dbConn = await initializeDatabase();
  const elementsJson = JSON.stringify({ nodes: [], edges: [] });
  const status = 'draft';
   try {
       const result = await dbConn.run( 'INSERT INTO flows (name, campaign_id, elements, status, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)', [name, campaign_id, elementsJson, status] );
       if (!result.lastID) throw new Error("Falha ao obter lastID após insert.");
       // Chama getFlowById sem tipagem explícita
       return getFlowById(result.lastID);
   } catch (error) { console.error("Erro ao criar fluxo:", error); throw error; }
}

// *** REMOVIDA TIPAGEM DO PARÂMETRO id e data ***
async function updateFlow(id, data) {
    const dbConn = await initializeDatabase();
    const fields = [];
    const values = [];
    Object.keys(data).forEach(key => {
        if (key === 'id') return;
        if (key === 'elements' && data[key] !== undefined) {
            fields.push('elements = ?');
            values.push(JSON.stringify(data[key] || { nodes: [], edges: [] }));
        } else if (data[key] !== undefined) {
            fields.push(`${key} = ?`);
            values.push(data[key]);
        }
    });

    if (fields.length === 0) { console.warn("updateFlow chamado sem campos para atualizar para ID:", id); return { changes: 0 }; }
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    const query = `UPDATE flows SET ${fields.join(', ')} WHERE id = ?`;

    try {
        if (data.status === 'active') {
            await dbConn.run("UPDATE flows SET status = 'inactive' WHERE status = 'active' AND id != ?", [id]);
        }
        const result = await dbConn.run(query, values);
        console.log(`Fluxo ID ${id} atualizado. Changes: ${result.changes}`);
        return { changes: result.changes };
    } catch (error) { console.error(`Erro ao atualizar fluxo ID ${id}:`, error); throw error; }
}

// *** REMOVIDA TIPAGEM DO PARÂMETRO id ***
async function deleteFlow(id) {
    const dbConn = await initializeDatabase();
    try {
        const result = await dbConn.run('DELETE FROM flows WHERE id = ?', [id]);
        console.log(`Tentativa de deletar fluxo ID ${id}. Changes: ${result.changes}`);
        return result;
    } catch (error) { console.error(`Erro ao deletar fluxo ID ${id}:`, error); throw error; }
}

module.exports = {
    initializeDatabase,
    getAllFlows,
    getFlowById,
    getActiveFlow,
    createFlow,
    updateFlow,
    deleteFlow,
    getCampaignsForSelect
};