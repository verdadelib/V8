// lib/whatsappBot.js
const { makeWASocket, useMultiFileAuthState, Browsers, proto, fetchLatestBaileysVersion, DisconnectReason, isJidUser, jidNormalizedUser } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
const { getActiveFlow } = require('./db');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const SESSION_DIR = path.resolve(__dirname, '..', 'auth_info');
const activeConversations = new Map();
let currentFlow = null;
let sock = null;
let qrCodeData = null;
let connectionStatus = 'disconnected';
let connectionRetryTimeout = null;
let globalResolveConnect = null;
const API_PORT = process.env.WHATSAPP_BOT_API_PORT || 3001;
let contactsCache = new Map();

const pinoOptions = { level: process.env.LOG_LEVEL || 'info' };
if (process.env.NODE_ENV === 'development') {
    try {
        const prettyTarget = require.resolve('pino-pretty');
        pinoOptions.transport = { target: prettyTarget, options: { colorize: true } };
    } catch (err) {
        console.warn("pino-pretty não encontrado...");
    }
}
const logger = pino(pinoOptions);

const getQrCodeInternal = () => qrCodeData;
const getConnectionStatusInternal = () => connectionStatus;

async function getContactsInternal() {
    if (connectionStatus !== 'connected') {
         logger.warn('[CONTACTS CACHE] Bot não conectado. Retornando cache vazio.');
         return [];
    }
    const contactsArray = Array.from(contactsCache.values());
    contactsArray.sort((a, b) => (a.notify || a.name || a.jid).localeCompare(b.notify || b.name || b.jid));
    logger.info(`[CONTACTS CACHE] Retornando ${contactsArray.length} contatos do cache.`);
    return contactsArray;
}

function updateContactsCache(newOrUpdatedContacts) {
    if (!Array.isArray(newOrUpdatedContacts)) return;
    let updatedCount = 0;
    let newCount = 0;
    newOrUpdatedContacts.forEach(contact => {
        if (contact && contact.id && isJidUser(contact.id)) {
            const jid = jidNormalizedUser(contact.id);
            const existingContact = contactsCache.get(jid);
            const formattedContact = {
                jid: jid,
                name: contact.name,
                notify: contact.notify,
            };
            if (!existingContact || JSON.stringify(existingContact) !== JSON.stringify(formattedContact)) {
                if (existingContact) { updatedCount++; } else { newCount++; }
                contactsCache.set(jid, formattedContact);
            }
        }
    });
    if (newCount > 0 || updatedCount > 0) {
        logger.info(`[CONTACTS CACHE] Cache atualizado: ${newCount} novos, ${updatedCount} atualizados. Total: ${contactsCache.size}`);
    }
}

function displayQrInTerminal(qrString) {
    try {
        qrcode.generate(qrString, { small: true }, (qrVisual) => {
            console.log('\n--------------------------------------------------');
            console.log('Escaneie o QR Code abaixo com seu WhatsApp:');
            console.log(qrVisual);
            console.log('--------------------------------------------------');
        });
        logger.info('[CONN] QR Code gerado para exibição no console.');
    } catch (qrErr) {
        logger.error('[CONN] Erro ao gerar QR Code:', qrErr);
    }
}

const ensureSessionDirExists = () => {
    if (!fs.existsSync(SESSION_DIR)) {
        fs.mkdirSync(SESSION_DIR, { recursive: true });
        logger.info(`[SYS] Diretório de sessão criado: ${SESSION_DIR}`);
    }
};

async function loadFlowFromDb() {
    logger.info("[FLUXO] Carregando fluxo ativo do DB...");
    try {
        const activeFlowData = await getActiveFlow();
        if (activeFlowData?.elements && Array.isArray(activeFlowData.elements.nodes) && Array.isArray(activeFlowData.elements.edges)) {
            currentFlow = activeFlowData;
            logger.info(`[FLUXO] Fluxo ativo "${currentFlow.name}" (ID: ${currentFlow.id}) carregado.`);
        } else {
            currentFlow = null;
            logger.warn("[FLUXO] Nenhum fluxo ativo encontrado ou estrutura inválida.");
        }
    } catch (error) {
        logger.error("[FLUXO] Erro ao carregar fluxo do DB:", error);
        currentFlow = null;
    }
}

async function sendWhatsAppMessage(jid, message) {
    if (!sock || connectionStatus !== 'connected') {
        logger.warn(`[WPP SEND] Falha ao enviar para ${jid}. Status: ${connectionStatus}`);
        return null;
    }
    if (!isJidUser(jid)) {
        logger.warn(`[WPP SEND] JID inválido: ${jid}`);
        return null;
    }
    try {
        await sock.presenceSubscribe(jid);
        await sock.sendPresenceUpdate('composing', jid);
        await new Promise(resolve => setTimeout(resolve, 500));
        const sentMsg = await sock.sendMessage(jid, message);
        await sock.sendPresenceUpdate('paused', jid);
        logger.info(`[WPP SEND] Mensagem enviada para ${jid}.`);
        return sentMsg;
    } catch (error) {
        logger.error(`[WPP SEND] Erro ao enviar mensagem para ${jid}:`, error);
        return null;
    }
}

const clearConnectionRetry = () => {
    if (connectionRetryTimeout) { clearTimeout(connectionRetryTimeout); connectionRetryTimeout = null; }
};

const scheduleConnectionRetry = (delay = 15000) => {
    clearConnectionRetry();
    if (connectionStatus === 'connected' || connectionStatus === 'logging_out') return;
    connectionRetryTimeout = setTimeout(() => {
        if (connectionStatus !== 'connected') {
            logger.warn('[CONN] Tentando reconectar...');
            connectToWhatsApp().catch(err => logger.error("[CONN] Falha na reconexão:", err));
        }
    }, delay);
};

async function disconnectWhatsApp(manualLogout = false) {
    logger.info(`[CONN] Desconexão solicitada (Manual: ${manualLogout}). Status: ${connectionStatus}`);
    clearConnectionRetry();
    contactsCache.clear();
    logger.info('[CONTACTS CACHE] Cache de contatos limpo.');
    if (!sock || connectionStatus === 'disconnected') {
        connectionStatus = 'disconnected'; qrCodeData = null; activeConversations.clear(); return;
    }
    const currentSock = sock;
    sock = null;
    if (manualLogout) {
        connectionStatus = 'logging_out';
        try {
            logger.info('[CONN] Tentando logout...'); 
            await currentSock.logout(); 
            logger.info('[CONN] Logout realizado com sucesso.');
            if (fs.existsSync(SESSION_DIR)) { fs.rmSync(SESSION_DIR, { recursive: true, force: true }); logger.info(`[SYS] Sessão ${SESSION_DIR} removida.`); }
        } catch (err) { logger.error('[CONN] Erro durante logout:', err); } finally { connectionStatus = 'disconnected'; }
    } else {
        connectionStatus = 'disconnected';
        try { logger.info('[CONN] Encerrando conexão local...'); currentSock.end(new Error('Desconexão local solicitada')); logger.info('[CONN] Conexão local encerrada.'); }
        catch (err) { logger.error('[CONN] Erro ao encerrar conexão local:', err); }
    }
    qrCodeData = null; activeConversations.clear();
    if (currentSock?.ev) { currentSock.ev.removeAllListeners(); logger.info('[CONN] Listeners removidos do socket antigo.'); }
    if (globalResolveConnect) { globalResolveConnect(null); globalResolveConnect = null; }
    logger.info(`[CONN] Estado final após desconexão: ${connectionStatus}`);
}

async function connectToWhatsApp() {
    if (connectionStatus === 'connected' || connectionStatus === 'connecting') {
        logger.warn(`[CONN] Conexão já em andamento (Status: ${connectionStatus}).`);
        return Promise.resolve(sock);
    }
    logger.info('[CONN] Iniciando conexão WhatsApp...');
    connectionStatus = 'connecting'; qrCodeData = null; 
    ensureSessionDirExists(); clearConnectionRetry(); contactsCache.clear();

    try {
        const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
        const { version } = await fetchLatestBaileysVersion();
        logger.info(`[SYS] Usando Baileys v${version.join('.')}`);
        sock = makeWASocket({ 
          version, 
          logger: logger.child({ class: 'baileys' }), 
          printQRInTerminal: false, 
          auth: state, 
          browser: Browsers.ubuntu('Chrome'), 
          shouldIgnoreJid: jid => !isJidUser(jid), 
          getMessage: async key => undefined, 
          syncFullHistory: false, 
          markOnlineOnConnect: true 
        });

        sock.ev.on('contacts.upsert', contacts => { logger.info(`[STORE EVENT] contacts.upsert recebido com ${contacts.length} contatos.`); updateContactsCache(contacts); });
        sock.ev.on('contacts.set', ({ contacts }) => { logger.info(`[STORE EVENT] contacts.set recebido com ${contacts.length} contatos. (Re)Inicializando cache.`); contactsCache.clear(); updateContactsCache(contacts); });

        sock.ev.on('connection.update', async (update) => {
            logger.info('[CONN UPDATE RAW]', update);
            const { connection, lastDisconnect, qr } = update;
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const disconnectError = lastDisconnect?.error;
            const errorMessage = disconnectError ? (disconnectError.message || disconnectError.toString()) : 'Motivo desconhecido';
            logger.info(`[CONN UPDATE] Status: ${connection || 'N/A'}, QR: ${!!qr}, LastDisconnect Code: ${statusCode || 'N/A'}`);

            if (qr) {
                qrCodeData = qr; connectionStatus = 'connecting'; 
                logger.info('[CONN] QR Code recebido.'); 
                displayQrInTerminal(qr);
            }
            if (connection === 'close') {
                qrCodeData = null; 
                const reasonCode = statusCode || DisconnectReason.connectionClosed;
                const shouldReconnect = reasonCode !== DisconnectReason.loggedOut && reasonCode !== 401;
                logger.error(`[CONN] Conexão fechada! Código: ${reasonCode}, Motivo: ${errorMessage}`);
                if (connectionStatus !== 'logging_out') { connectionStatus = 'disconnected'; }
                contactsCache.clear(); 
                logger.info('[CONTACTS CACHE] Cache de contatos limpo devido à conexão fechada.');

                if (shouldReconnect) { 
                  logger.info('[CONN] Agendando tentativa de reconexão...'); 
                  scheduleConnectionRetry(); 
                } else {
                     logger.info(`[CONN] Desconexão permanente (Código ${reasonCode}). Limpando sessão...`);
                     await disconnectWhatsApp(true);
                }
            } else if (connection === 'open') {
                qrCodeData = null; 
                connectionStatus = 'connected'; 
                clearConnectionRetry(); 
                logger.info('[CONN] WhatsApp conectado!');
                if (sock?.store?.contacts) { 
                  logger.info('[CONN OPEN DEBUG] Tentando inicializar cache com sock.store.contacts...'); 
                  updateContactsCache(Object.values(sock.store.contacts)); 
                }
                else { 
                  logger.warn('[CONN OPEN DEBUG] sock.store.contacts não disponível imediatamente após "open". Aguardando eventos...'); 
                }
                await loadFlowFromDb();
                if (globalResolveConnect) { globalResolveConnect(sock); globalResolveConnect = null; }
            }
        });

        sock.ev.on('creds.update', saveCreds);
        sock.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0]; 
            if (!msg.message || msg.key.fromMe || !isJidUser(msg.key.remoteJid)) return;
            const jid = msg.key.remoteJid; 
            const userMessage = msg.message.conversation || msg.message.extendedTextMessage?.text || '[Mídia]';
            logger.info(`[WPP MSG] Recebida de ${jid}: "${userMessage}"`);
            await processMessageInFlow(jid, userMessage).catch(err => { 
              logger.error(`[FLUXO] Erro ao processar mensagem de ${jid}:`, err); 
              sendWhatsAppMessage(jid, { text: "⚠️ Erro ao processar sua mensagem." }); 
            });
        });
        return new Promise((resolve) => { globalResolveConnect = resolve; });
    } catch (error) {
        logger.fatal('[CONN] Erro fatal ao iniciar conexão:', error); 
        connectionStatus = 'disconnected'; 
        qrCodeData = null;
        if (sock?.ev) { sock.ev.removeAllListeners(); } 
        sock = null; 
        contactsCache.clear(); 
        return Promise.resolve(null);
    }
}

async function processMessageInFlow(jid, userMessage) { 
    if (!currentFlow) { 
      logger.warn(`[FLUXO] Nenhum fluxo ativo para processar mensagem de ${jid}`); 
      return; 
    } 
    logger.info(`[FLUXO] Processando mensagem de ${jid} no fluxo "${currentFlow.name}" (Implementação básica)`);
    let conversationState = activeConversations.get(jid) || { 
      currentNodeId: currentFlow.elements?.nodes?.find(n => n.type === 'textMessage' || n.type === 'buttonMessage' || n.type === 'listMessage')?.id, 
      variables: { userJid: jid, userMessage: userMessage } 
    }; 
    if (!conversationState.currentNodeId && currentFlow.elements?.nodes?.length > 0) { 
      conversationState.currentNodeId = currentFlow.elements.nodes[0].id; 
    } 
    activeConversations.set(jid, conversationState); 
    await executeNode(jid, conversationState); 
}

async function executeNode(jid, conversationState) { 
    if (!currentFlow || !conversationState.currentNodeId) { 
      logger.warn(`[FLUXO EXEC] Fluxo ou nó atual inválido para ${jid}`); 
      return; 
    } 
    const currentNode = currentFlow.elements.nodes.find(n => n.id === conversationState.currentNodeId); 
    if (!currentNode) { 
      logger.error(`[FLUXO EXEC] Nó ID ${conversationState.currentNodeId} não encontrado no fluxo para ${jid}`); 
      activeConversations.delete(jid); 
      return; 
    } 
    logger.info(`[FLUXO EXEC] Executando nó ${currentNode.type} (ID: ${currentNode.id}) para ${jid}`);
    let nextEdge = null;
    switch (currentNode.type) { 
      case 'textMessage': 
        await sendWhatsAppMessage(jid, { text: currentNode.data.text }); 
        nextEdge = currentFlow.elements.edges.find(e => e.source === currentNode.id && e.sourceHandle === 'source-bottom'); 
        break; 
      default: 
        logger.warn(`[FLUXO EXEC] Tipo de nó ${currentNode.type} não implementado para execução.`); 
        nextEdge = currentFlow.elements.edges.find(e => e.source === currentNode.id); 
        break; 
    } 
    if (nextEdge) { 
      conversationState.currentNodeId = nextEdge.target; 
      activeConversations.set(jid, conversationState); 
      logger.info(`[FLUXO EXEC] Indo para o próximo nó ${conversationState.currentNodeId} para ${jid}`); 
      await new Promise(resolve => setTimeout(resolve, 500)); 
      await executeNode(jid, conversationState); 
    } else { 
      logger.info(`[FLUXO EXEC] Fluxo encerrado para ${jid} no nó ${currentNode.id} (sem próxima borda).`); 
      activeConversations.delete(jid); 
    } 
}

// Exportações públicas
module.exports = { 
  connectToWhatsApp, 
  disconnectWhatsApp, 
  sendWhatsAppMessage, 
  loadFlowFromDb, 
  getConnectionStatus: getConnectionStatusInternal, 
  getQrCode: getQrCodeInternal, 
  getContacts: getContactsInternal 
};

// ***** IMPORTANTE *****
// Somente inicie o bot e o servidor API interno se não estivermos no ambiente Vercel.
// Em ambiente serverless (Vercel) os endpoints da pasta /pages/api/ serão importados como funções.
// Desta forma, evitamos que o processo persistente seja iniciado no deploy.
if (process.env.VERCEL_ENV !== 'production' && require.main === module) {
    logger.info('[SYS] Iniciando bot WhatsApp e servidor API interno...');
    connectToWhatsApp().catch(err => logger.error("[SYS] Falha na tentativa de conexão inicial:", err));
    const apiServer = http.createServer(async (req, res) => {
        const parsedUrl = url.parse(req.url || '', true);
        res.setHeader('Access-Control-Allow-Origin', '*'); 
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); 
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
        try {
            if (req.method === 'GET' && parsedUrl.pathname === '/status') { 
              res.writeHead(200, { 'Content-Type': 'application/json' }); 
              res.end(JSON.stringify({ status: getConnectionStatusInternal(), qrCode: getQrCodeInternal() })); 
            }
            else if (req.method === 'POST' && parsedUrl.pathname === '/connect') { 
              if (connectionStatus === 'connected' || connectionStatus === 'connecting') { 
                res.writeHead(200, { 'Content-Type': 'application/json' }); 
                res.end(JSON.stringify({ message: `Conexão já ${connectionStatus}.`, status: connectionStatus })); 
              } else { 
                connectToWhatsApp().catch(err => logger.error("[API /connect] Erro ao iniciar conexão:", err)); 
                res.writeHead(202, { 'Content-Type': 'application/json' }); 
                res.end(JSON.stringify({ message: 'Solicitação de conexão recebida.' })); 
              } 
            }
            else if (req.method === 'POST' && parsedUrl.pathname === '/disconnect') { 
              await disconnectWhatsApp(true); 
              res.writeHead(200, { 'Content-Type': 'application/json' }); 
              res.end(JSON.stringify({ message: 'Desconexão solicitada.' })); 
            }
            else if (req.method === 'POST' && parsedUrl.pathname === '/reload-flow') { 
              await loadFlowFromDb(); 
              res.writeHead(200, { 'Content-Type': 'application/json' }); 
              res.end(JSON.stringify({ message: 'Fluxo ativo recarregado do banco de dados.' })); 
            }
            else if (req.method === 'GET' && parsedUrl.pathname === '/contacts') {
              logger.info(`[API Interna] Recebida requisição GET /contacts`);
              const contacts = await getContactsInternal();
              logger.info(`[API Interna] Retornando ${contacts.length} contatos (do cache) para a API Next.`);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(contacts));
            }
            else { 
              logger.warn(`[API Interna] Endpoint não encontrado: ${req.method} ${parsedUrl.pathname}`);
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ message: 'Endpoint não encontrado nesta API interna.' }));
            }
        } catch (error) { 
          logger.error(`[API Interna ${req.method} ${parsedUrl.pathname}] Erro inesperado:`, error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Erro interno do servidor no bot.' }));
        }
    });
    apiServer.listen(API_PORT, () => { 
      logger.info(`[SYS] Servidor API interno escutando na porta ${API_PORT}`); 
    }).on('error', (err) => { 
      logger.fatal(`[SYS] Falha ao iniciar servidor API na porta ${API_PORT}:`, err); 
      process.exit(1); 
    });
    
    const gracefulShutdown = async (signal) => { 
      logger.info(`[SYS] Sinal ${signal} recebido. Encerrando bot e servidor...`); 
      clearConnectionRetry(); 
      await disconnectWhatsApp(false).catch(err => logger.error('[SYS] Erro durante desconexão no shutdown:', err)); 
      logger.info('[SYS] Fechando servidor API...'); 
      apiServer.close(() => { 
         logger.info('[SYS] Servidor API interno parado.'); 
         setTimeout(() => { 
           logger.info('[SYS] Encerrando processo.'); 
           process.exit(0); 
         }, 500); 
      }); 
      setTimeout(() => { 
         logger.warn('[SYS] Timeout! Forçando encerramento do processo.'); 
         process.exit(1); 
      }, 5000); 
    };
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
}
