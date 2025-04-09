// Chat.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head'; // Import Head
import Layout from '@/components/layout'; // Import Layout
import type { Campaign } from '@/entities/Campaign';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import axios from 'axios'; // Import axios
import { Send, User, Sparkles, Brain, Database, RefreshCw, Cpu, Zap, Upload, History, Trash2, Save, RotateCw, Loader2, Bot, Lightbulb, MessageSquare, CheckCircle2, Info, AlertTriangle, AlertCircle, Eye, Bell, Phone, Users, Settings, BarChart2, MessageCircle as IconMessageCircle, Percent, Target, DollarSign, MousePointerClick, ShoppingCart, Calendar, Maximize2, Minimize2, MoreHorizontal, ChevronRight, Smartphone, ListChecks, Play, Pause, EyeOff, CreditCard, FileText, Copy as CopyIcon, Wand2, PanelLeft, Check, ChevronUp, Filter } from 'lucide-react'; // Added Filter icon

// Types
interface Message { role: 'user' | 'assistant'; content: string; }
interface Conversation { id: string; title: string; date: string; messages: Message[]; }
interface SimpleCampaignChatInfo { id?: string; name?: string | null; platform?: string | null; daily_budget?: number | null; duration?: number | null; objective?: string | null; }
interface CopyInfo { id?: string; campaign_id?: string; title?: string | null; cta?: string | null; target_audience?: string | null; content?: string | null; }
interface ChatPageProps {}
interface Suggestion { id: string; title: string; type: string; date?: string; description?: string; details?: any; }
type CampaignOption = Pick<Campaign, 'id' | 'name'>;


export default function ChatPage({ }: ChatPageProps) {
    // --- States ---
    const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: 'Olá! Sou o assistente USBABC IA. Como posso ajudar?' }]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [context, setContext] = useState('');
    const [modelSettings, setModelSettings] = useState({ temperature: 0.7, useLocalModel: false, modelName: 'API Remota', maxTokens: 1000, repetitionPenalty: 1.2 });
    const [loadingModel, setLoadingModel] = useState(false);
    const [modelStatus, setModelStatus] = useState('Conectado (API)');
    const [savedConversations, setSavedConversations] = useState<Conversation[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [localModelOptions, setLocalModelOptions] = useState<string[]>(['TinyLlama-1.1B-Chat-v1.0', 'Mistral-7B-Instruct-v0.1', 'Gemma-2B-it']);
    const [activeTab, setActiveTab] = useState("chat");
    const [promptInput, setPromptInput] = useState('');
    const [iaMessages, setIaMessages] = useState<Message[]>([]);
    const [iaChatLoading, setIaChatLoading] = useState(false);
    const [campaignOptions, setCampaignOptions] = useState<CampaignOption[]>([]);
    const [contextCampaignId, setContextCampaignId] = useState<string>(""); // "" representa "Geral / Mais Recente"
    const [contextLoading, setContextLoading] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const chatIaEndRef = useRef<HTMLDivElement>(null);
    const chatIaScrollRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    const API_LLM_URL = '/api/llm';
    const API_CAMPAIGNS_URL = '/api/campaigns';
    const API_COPIES_URL = '/api/copies';

    // --- Style Constants ---
    const neonColor = '#1E90FF';
    const neonColorMuted = '#4682B4';
    const cardStyle = "bg-[#141414]/80 backdrop-blur-sm shadow-[5px_5px_10px_rgba(0,0,0,0.4),-5px_-5px_10px_rgba(255,255,255,0.05)] rounded-lg border-none";
    const insetCardStyle = "bg-[#141414]/50 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.3),inset_-1px_-1px_2px_rgba(255,255,255,0.03)] rounded-md border-none";
    const neumorphicInputStyle = "bg-[#141414] text-white shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] placeholder:text-gray-500 border-none focus:ring-2 focus:ring-[#1E90FF] focus:ring-offset-2 focus:ring-offset-[#0e1015] h-9 text-sm px-3 py-2";
    const neumorphicTextAreaStyle = cn(neumorphicInputStyle, "min-h-[80px] py-2");
    const neumorphicButtonStyle = "bg-[#141414] border-none text-white shadow-[3px_3px_6px_rgba(0,0,0,0.3),-3px_-3px_6px_rgba(255,255,255,0.05)] hover:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] hover:bg-[#1E90FF]/80 active:scale-[0.98] active:brightness-95 transition-all duration-150 ease-out h-9 px-3 text-sm";
    const neumorphicGhostButtonStyle = cn(neumorphicButtonStyle, "bg-transparent shadow-none hover:bg-[#1E90FF]/20 hover:text-[#1E90FF] h-8 w-8 p-0");
    const primaryNeumorphicButtonStyle = cn(neumorphicButtonStyle, "bg-[#1E90FF]/80 hover:bg-[#1E90FF]/100");
    const tabsListStyle = "bg-[#141414]/70 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] rounded-lg p-1 h-auto";
    const tabsTriggerStyle = "data-[state=active]:bg-[#1E90FF]/30 data-[state=active]:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] data-[state=active]:text-white text-gray-400 hover:text-white hover:bg-[#1E90FF]/10 rounded-md px-3 py-1.5 text-sm transition-all duration-150";
    const iconStyle = { filter: `drop-shadow(0 0 3px ${neonColorMuted})` };
    const primaryIconStyle = { filter: `drop-shadow(0 0 3px ${neonColor})` };
    const neumorphicSliderStyle = "[&>span:first-child]:bg-[#141414] [&>span:first-child]:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] [&>span:first-child]:h-2 [&>span>span]:bg-[#1E90FF] [&>span>span]:shadow-[3px_3px_6px_rgba(0,0,0,0.3),-3px_-3px_6px_rgba(255,255,255,0.05)] [&>span>span]:h-4 [&>span>span]:w-4 [&>span>span]:border-none";

    // --- Data Fetching ---
    const fetchCampaignOptions = useCallback(async () => {
        try {
            const response = await axios.get<CampaignOption[]>(`${API_CAMPAIGNS_URL}?fields=id,name`);
            setCampaignOptions(response.data || []);
        } catch (error) {
            console.error('Erro ao buscar opções de campanha:', error);
            toast({ title: "Erro", description: "Falha ao buscar campanhas.", variant: "destructive" });
        }
    }, [API_CAMPAIGNS_URL, toast]);

    // --- Context Generation ---
    const generateContext = useCallback(async () => {
        setContextLoading(true);
        const campaignName = contextCampaignId ? campaignOptions.find(c=>c.id.toString() === contextCampaignId)?.name || `ID: ${contextCampaignId}` : 'Geral/Mais Recente';
        let contextText = `Contexto Atual (${campaignName}):\n`;
        let campaignEndpoint = API_CAMPAIGNS_URL;
        let copyEndpoint = API_COPIES_URL;

        if (contextCampaignId && contextCampaignId !== "") {
            campaignEndpoint += `?id=${contextCampaignId}`;
            copyEndpoint += `?campaign_id=${contextCampaignId}`;
        } else {
            campaignEndpoint += `?limit=1`;
            copyEndpoint += `?limit=1`;
        }

        try {
            const campaignRes = await axios.get<SimpleCampaignChatInfo[]>(campaignEndpoint);
            let campaignData: SimpleCampaignChatInfo | null = null;
            if (campaignRes.data && campaignRes.data.length > 0) {
                campaignData = campaignRes.data[0];
                contextText += `- Campanha:\n  - Nome: ${campaignData.name || 'N/A'}\n  - Plataforma: ${campaignData.platform || 'N/A'}\n  - Objetivo: ${campaignData.objective || 'N/A'}\n  - Orçamento Dia: R$ ${campaignData.daily_budget?.toFixed(2) || 'N/A'}\n`;
            } else {
                contextText += "- Nenhuma Campanha encontrada para este contexto.\n";
            }

             let copyData: CopyInfo | null = null;
             const effectiveCampaignId = contextCampaignId || campaignData?.id;
             if (effectiveCampaignId) {
                 copyEndpoint = `${API_COPIES_URL}?campaign_id=${effectiveCampaignId}&limit=1`;
                 try {
                     const copyRes = await axios.get<CopyInfo[]>(copyEndpoint);
                     if (copyRes.data && copyRes.data.length > 0) {
                         copyData = copyRes.data[0];
                         const copyContextLabel = contextCampaignId ? 'Relacionado' : `(Mais Recente - Campanha ID: ${copyData.campaign_id || 'N/A'})`;
                         contextText += `- Copy ${copyContextLabel}:\n  - Título: ${copyData.title||'N/A'}\n  - CTA: ${copyData.cta||'N/A'}\n  - Público: ${copyData.target_audience||'N/A'}\n`;
                     } else {
                         contextText += `- Nenhum Copy encontrado ${contextCampaignId ? 'para esta campanha' : '(geral)'}.\n`;
                     }
                 } catch (copyError) {
                     console.error('Erro ao buscar cópia:', copyError);
                     contextText += "- (Erro ao buscar Copy)\n";
                 }
             } else {
                  contextText += "- Nenhum Copy encontrado (sem ID de campanha).\n";
             }

            contextText += "- Métricas (Ex): CTR: 2.5%, CPC: R$1.75";

        } catch (error) {
            console.error('Erro ao gerar contexto:', error);
            contextText += "- (Erro ao gerar contexto)\n";
            toast({ title: "Erro de Contexto", description: "Não foi possível carregar dados.", variant: "destructive"});
        } finally {
            setContext(contextText.trim());
            setContextLoading(false);
        }
    }, [API_CAMPAIGNS_URL, API_COPIES_URL, contextCampaignId, toast, campaignOptions]);

    // --- Other Functions ---
    const scrollToBottom = () => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
    const handleSendMessage = async () => { if (!input.trim() || loading) return; const userMsg: Message = { role: 'user', content: input }; setMessages(prev => [...prev, userMsg]); setInput(''); setLoading(true); const history = messages.map(m => `${m.role}: ${m.content}`).join('\n'); const prompt = `Contexto:\n${context}\n\nHistórico:\n${history}\n\nuser: ${userMsg.content}\nassistant:`; try { const res = await fetch(API_LLM_URL, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ prompt, temperature: modelSettings.temperature, max_tokens: modelSettings.maxTokens, repetition_penalty: modelSettings.repetitionPenalty }) }); if (!res.ok) { const errData = await res.json().catch(()=>({error: res.statusText})); throw new Error(errData.error || `API Erro: ${res.status}`); } const result = await res.json(); const aiContent = result.response || result.detail || "Erro na resposta da IA."; setMessages(prev => [...prev, { role: 'assistant', content: aiContent }]); } catch (error: any) { console.error('IA Err:', error); setMessages(prev => [...prev, { role: 'assistant', content: `Erro: ${error.message}` }]); toast({ title: "Erro na IA", description: error.message, variant: "destructive" }); } finally { setLoading(false); } };
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if(activeTab === 'chat') handleSendMessage(); else if (activeTab === 'ia-chat') handleSendIaMessage(); } };
    const checkModelStatus = async () => { if (modelSettings.useLocalModel) { try { const statusRes = await fetch('http://localhost:8000/status'); if (statusRes.ok) { const statusData = await statusRes.json(); setModelStatus(statusData.model_loaded ? `Local: ${modelSettings.modelName} (${statusData.device})` : 'Local (sem modelo)'); } else setModelStatus('Local indisponível'); } catch (e) { setModelStatus('Local offline'); } } else setModelStatus('API Remota'); };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.length) { const file = e.target.files[0]; setSelectedFile(file); const modelName = file.name.replace(/\.(bin|gguf|onnx|safetensors)$/i, ''); if (!localModelOptions.includes(modelName)) setLocalModelOptions(prev => [...prev, modelName]); setModelSettings(prev => ({ ...prev, modelName })); toast({ title: "Arquivo selecionado", description: file.name }); } };
    const loadLocalModel = async () => { if (!selectedFile) { toast({ title: "Erro", description: "Nenhum arquivo.", variant: "destructive" }); return; } setLoadingModel(true); setModelStatus('Carregando...'); try { await new Promise(resolve => setTimeout(resolve, 2500)); setModelStatus(`Local: ${modelSettings.modelName} (Simulado)`); toast({ title: "Carregado", description: `Modelo ${selectedFile.name} (simulado).` }); } catch (error: any) { console.error('Erro load local:', error); setModelStatus('Erro'); toast({ title: "Erro", description: `Falha: ${error.message}`, variant: "destructive" }); } finally { setLoadingModel(false); } };
    const saveConversation = () => { const targetMessages = activeTab === 'chat' ? messages : iaMessages; if (targetMessages.length <= 1) { toast({title: "Vazio", description:"Chat vazio.", variant:"destructive"}); return; } const title = prompt("Nome:", `Conversa ${new Date().toLocaleString('pt-BR')}`) || `Conversa ${Date.now()}`; const newConvo: Conversation = { id: crypto.randomUUID(), title, date: new Date().toISOString(), messages: [...targetMessages] }; const updated = [newConvo, ...savedConversations]; setSavedConversations(updated); localStorage.setItem('chatHistory', JSON.stringify(updated)); toast({ title: "Salva", description: `"${title}" salva.` }); };
    const loadSavedConversations = () => { const history = localStorage.getItem('chatHistory'); if (history) { try { const parsedHistory: Conversation[] = JSON.parse(history); setSavedConversations(parsedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())); } catch (e) { console.error("Erro load hist:", e); localStorage.removeItem('chatHistory'); } } };
    const loadConversation = (id: string) => { const convo = savedConversations.find(c => c.id === id); if (convo?.messages) { setMessages(convo.messages); toast({ title: "Carregada", description: `"${convo.title}" carregada.` }); setActiveTab('chat'); } else { toast({ title: "Erro", description: "Não foi possível carregar.", variant: "destructive"}); } };
    const deleteConversation = (id: string) => { if (!confirm("Excluir esta conversa?")) return; const updated = savedConversations.filter(c => c.id !== id); setSavedConversations(updated); localStorage.setItem('chatHistory', JSON.stringify(updated)); toast({ title: "Excluída", variant: "destructive" }); };
    const clearConversation = () => { if (!confirm("Limpar chat atual? O contexto será mantido.")) return; setMessages([{ role: 'assistant', content: 'Chat limpo. Como posso ajudar?' }]); setInput(''); };
    const clearIaConversation = () => { if (!confirm("Limpar chat IA direto?")) return; setIaMessages([]); };
    const callApiLLM = async (prompt: string, response_json_schema?: object): Promise<any> => { try { const res = await fetch(API_LLM_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, temperature: modelSettings.temperature, max_tokens: modelSettings.maxTokens, repetition_penalty: modelSettings.repetitionPenalty, ...(response_json_schema && { response_json_schema }) }) }); if (!res.ok) { const err = await res.text(); throw new Error(`API LLM ${res.status}: ${err}`); } try { return await res.json(); } catch { const txt = await res.text(); return { response: `Texto: ${txt}` }; } } catch (error: any) { throw new Error(`Falha IA: ${error.message}`); } };
    const handleSendIaMessage = async () => { if (!promptInput.trim() || iaChatLoading) return; const userMsgContent = promptInput; setIaMessages(prev => [...prev, { role: 'user', content: userMsgContent }]); setPromptInput(''); setIaChatLoading(true); const historyStr = iaMessages.map(m => `${m.role}: ${m.content}`).join('\n'); const prompt = `Contexto: Chat IA. Histórico:\n${historyStr}\nUser: ${userMsgContent}\nAssistant:`; try { const result = await callApiLLM(prompt); const respContent = result?.response || result?.detail || JSON.stringify(result); setIaMessages(prev => [...prev, { role: 'assistant', content: respContent }]); } catch (e: any) { setIaMessages(prev => [...prev, { role: 'assistant', content: `Erro: ${e.message}` }]); } finally { setIaChatLoading(false); } };

    // --- Effects ---
    useEffect(() => {
        loadSavedConversations();
        fetchCampaignOptions();
        checkModelStatus();
    }, [fetchCampaignOptions]);

     useEffect(() => {
         generateContext();
     }, [generateContext, contextCampaignId]);

    useEffect(() => { scrollToBottom(); }, [messages]);
    useEffect(() => { chatIaEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [iaMessages]);

    // --- JSX ---
    return (
        <Layout>
             <Head> <title>Chat IA - USBMKT</title> </Head>
             <div className="space-y-4">
                 <h1 className="text-2xl font-black text-white mb-4" style={{ textShadow: `0 0 8px ${neonColor}` }}>
                     USBABC IA MKT DIGITAL
                 </h1>
                 <div className="grid gap-4 lg:grid-cols-4">
                     {/* Coluna Principal */}
                     <div className="lg:col-span-3 space-y-4">
                         <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                             <TabsList className={cn(tabsListStyle, "grid grid-cols-4")}>
                                 <TabsTrigger value="chat" className={tabsTriggerStyle}>Chat Principal</TabsTrigger>
                                 <TabsTrigger value="ia-chat" className={tabsTriggerStyle}>Chat IA Direto</TabsTrigger>
                                 <TabsTrigger value="history" className={tabsTriggerStyle}>Histórico</TabsTrigger>
                                 <TabsTrigger value="settings" className={tabsTriggerStyle}>Configurações</TabsTrigger>
                             </TabsList>

                            {/* Conteúdo das Abas */}
                            <TabsContent value="chat">
                                 <Card className={cn(cardStyle, "overflow-hidden")}>
                                     <CardHeader className="flex flex-row items-center justify-between p-3 border-b border-[#1E90FF]/20">
                                         <div className="flex items-center gap-2">
                                             <div className={cn(insetCardStyle, "p-1.5 rounded-md")}><Brain className="h-5 w-5 text-primary" style={primaryIconStyle} /></div>
                                             <CardTitle className="text-base font-semibold text-white" style={{ textShadow: `0 0 5px ${neonColor}` }}>Chat IA (Contexto)</CardTitle>
                                         </div>
                                         <div className="flex gap-1">
                                             <Button variant="ghost" size="icon" className={cn(neumorphicGhostButtonStyle)} onClick={saveConversation} title="Salvar Conversa"><Save className="h-4 w-4" style={iconStyle} /></Button>
                                             <Button variant="ghost" size="icon" className={cn(neumorphicGhostButtonStyle)} onClick={clearConversation} title="Limpar Chat Atual"><Trash2 className="h-4 w-4" style={iconStyle} /></Button>
                                         </div>
                                     </CardHeader>
                                     <CardContent className="p-0">
                                         <ScrollArea className="h-[50vh] p-3">
                                             <div className="space-y-3">
                                                 {messages.map((message, index) => ( <div key={index} className={cn("flex gap-2 w-full", message.role === 'user' ? "justify-end" : "justify-start")}> {message.role === 'assistant' && (<div className={cn(insetCardStyle, "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0")}><img src="/logo.png" alt="AI" className="h-4 w-4 object-contain"/></div>)} <div className={cn( "max-w-[80%] rounded-lg px-3 py-1.5 text-sm shadow-[3px_3px_6px_rgba(0,0,0,0.3),-3px_-3px_6px_rgba(255,255,255,0.05)]", message.role === 'user' ? "bg-[#1E90FF]/90 text-white" : "bg-[#141414]/60 text-gray-200" )}> <p className="whitespace-pre-wrap">{message.content}</p> </div> {message.role === 'user' && (<div className={cn(insetCardStyle, "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0")}><User className="w-4 h-4 text-primary" style={primaryIconStyle}/></div>)} </div> ))}
                                                 {loading && (<div className="flex justify-start gap-2"><div className={cn(insetCardStyle, "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0")}><img src="/logo.png" alt="AI Loading" className="h-4 w-4 object-contain opacity-70"/></div><div className={cn(insetCardStyle, "rounded-lg p-2")}><Loader2 className="h-4 w-4 animate-spin text-gray-400"/></div></div>)}
                                                 <div ref={chatEndRef} />
                                             </div>
                                         </ScrollArea>
                                     </CardContent>
                                     <CardFooter className="p-2 border-t border-[#1E90FF]/10">
                                         <div className="flex w-full items-center gap-2">
                                             <Input placeholder="Digite sua mensagem (usará contexto)..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} className={cn(neumorphicInputStyle, "flex-1")} disabled={loading}/>
                                             <Button onClick={handleSendMessage} disabled={loading || !input.trim()} className={cn(primaryNeumorphicButtonStyle, "h-9 w-9 p-0")} aria-label="Enviar">
                                                 {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" style={primaryIconStyle}/>}
                                             </Button>
                                         </div>
                                     </CardFooter>
                                 </Card>
                             </TabsContent>
                             <TabsContent value="ia-chat">
                                <Card className={cn(cardStyle, "overflow-hidden")}>
                                    <CardHeader className="flex flex-row items-center justify-between p-3 border-b border-[#1E90FF]/20">
                                        <div className="flex items-center gap-2">
                                             <div className={cn(insetCardStyle, "p-1.5 rounded-md")}><MessageSquare className="h-5 w-5 text-primary" style={primaryIconStyle} /></div>
                                             <CardTitle className="text-base font-semibold text-white" style={{ textShadow: `0 0 5px ${neonColor}` }}>Chat IA Direto</CardTitle>
                                         </div>
                                         <Button variant="ghost" size="icon" className={cn(neumorphicGhostButtonStyle)} onClick={clearIaConversation} title="Limpar Chat Direto"><Trash2 className="h-4 w-4" style={iconStyle}/></Button>
                                     </CardHeader>
                                     <CardContent className="p-0 flex flex-col h-[55vh]">
                                         <ScrollArea className="flex-grow p-3 space-y-3" ref={chatIaScrollRef}>
                                             {iaMessages.map((msg, idx) => ( <div key={idx} className={cn("flex gap-2 w-full", msg.role === 'user' ? 'justify-end' : 'justify-start')}> {msg.role === 'assistant' && <div className={cn(insetCardStyle, "w-7 h-7 rounded-full flex items-center justify-center shrink-0")}><Bot className="h-4 w-4" style={iconStyle}/></div>} <div className={cn( "max-w-[80%] rounded-lg px-3 py-1.5 text-sm shadow-[3px_3px_6px_rgba(0,0,0,0.3),-3px_-3px_6px_rgba(255,255,255,0.05)]", msg.role === 'user' ? 'bg-[#1E90FF]/90 text-white' : 'bg-[#141414]/60 text-gray-200' )}> <p className="whitespace-pre-wrap">{msg.content}</p> </div> {msg.role === 'user' && <div className={cn(insetCardStyle, "w-7 h-7 rounded-full flex items-center justify-center shrink-0")}><User className="h-4 w-4 text-primary" style={primaryIconStyle}/></div>} </div> ))}
                                             {iaChatLoading && <div className="flex justify-start gap-2"><div className={cn(insetCardStyle, "w-7 h-7 rounded-full flex items-center justify-center shrink-0")}><Bot className="h-4 w-4 opacity-50" style={iconStyle}/></div><div className={cn(insetCardStyle, "rounded-lg p-2")}><Loader2 className="h-4 w-4 animate-spin text-gray-400"/></div></div>}
                                             <div ref={chatIaEndRef}/>
                                         </ScrollArea>
                                         <div className="p-2 border-t border-[#1E90FF]/10">
                                             <div className="flex items-center gap-2">
                                                 <Textarea placeholder="Sua pergunta direta para a IA..." value={promptInput} onChange={e => setPromptInput(e.target.value)} onKeyDown={handleKeyDown} disabled={iaChatLoading} rows={1} className={cn(neumorphicTextAreaStyle, "flex-1 resize-none py-1.5 min-h-[38px] max-h-[100px]")}/>
                                                 <Button size="icon" className={cn(primaryNeumorphicButtonStyle, "h-9 w-9 p-0 shrink-0")} onClick={handleSendIaMessage} disabled={iaChatLoading || !promptInput.trim()}> {iaChatLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4" style={primaryIconStyle}/>} </Button>
                                             </div>
                                         </div>
                                     </CardContent>
                                 </Card>
                             </TabsContent>
                             <TabsContent value="history">
                                <Card className={cn(cardStyle)}>
                                    <CardHeader className="p-3 border-b border-[#1E90FF]/20"><CardTitle className="text-base font-semibold text-white" style={{ textShadow: `0 0 5px ${neonColor}` }}>Histórico de Conversas</CardTitle></CardHeader>
                                    <CardContent className="p-0">
                                        <ScrollArea className="h-[55vh] p-3">
                                            {savedConversations.length === 0 ? ( <p className="text-gray-500 text-center py-8 text-sm">Nenhuma conversa salva.</p> ) : (
                                            <div className="space-y-2">
                                                {savedConversations.map((conversation) => (
                                                <Card key={conversation.id} className={cn(insetCardStyle, "overflow-hidden")}>
                                                    <CardContent className="p-2 flex justify-between items-center gap-2">
                                                        <div>
                                                            <h3 className="font-medium text-sm text-white truncate" title={conversation.title}>{conversation.title}</h3>
                                                            <p className="text-xs text-gray-400">{format(parseISO(conversation.date), "'Salvo 'dd/MM/yy HH:mm", { locale: ptBR })}</p>
                                                        </div>
                                                        <div className='flex gap-1'>
                                                            <Button variant="outline" size="sm" className={cn(neumorphicButtonStyle, "h-8 px-2")} onClick={() => loadConversation(conversation.id)}><History className="h-4 w-4 mr-1" style={iconStyle}/> Carregar</Button>
                                                            <Button variant="ghost" size="icon" className={cn(neumorphicGhostButtonStyle, "text-red-500 hover:bg-red-900/30")} onClick={() => deleteConversation(conversation.id)}><Trash2 className="h-4 w-4"/></Button>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                                ))}
                                            </div>
                                            )}
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                             </TabsContent>
                             <TabsContent value="settings">
                                <Card className={cn(cardStyle)}>
                                    <CardHeader className="p-3 border-b border-[#1E90FF]/20"><CardTitle className="text-base font-semibold text-white" style={{ textShadow: `0 0 5px ${neonColor}` }}>Configurações do Modelo</CardTitle></CardHeader>
                                    <CardContent className="p-3 space-y-4">
                                        <div className={cn(insetCardStyle, "flex items-center justify-between rounded-lg p-3")}>
                                            <div>
                                                <Label htmlFor="local-model-switch" className="text-white font-medium text-sm">Usar Modelo Local</Label>
                                                <p className="text-xs text-gray-400">Ativar para usar modelo no seu PC (requer servidor local).</p>
                                            </div>
                                            <Switch id="local-model-switch" checked={modelSettings.useLocalModel} onCheckedChange={(checked) => { setModelSettings(prev => ({ ...prev, useLocalModel: checked, modelName: checked ? localModelOptions[0] : 'API Remota' })); checkModelStatus(); }} />
                                        </div>
                                        {modelSettings.useLocalModel && (
                                        <div className={cn(insetCardStyle, "space-y-3 p-3 rounded-lg")}>
                                            <div className="space-y-1">
                                                <Label htmlFor="model-select" className="text-sm text-gray-300">Modelo Local</Label>
                                                <Select value={modelSettings.modelName} onValueChange={(value) => setModelSettings(prev => ({ ...prev, modelName: value }))}>
                                                    <SelectTrigger id="model-select" className={cn(neumorphicInputStyle, "w-full")}> <SelectValue placeholder="Selecione..." /> </SelectTrigger>
                                                    <SelectContent className="bg-[#1e2128] border-[#1E90FF]/30 text-white"> {localModelOptions.map(name => <SelectItem key={name} value={name} className="hover:bg-[#1E90FF]/20 focus:bg-[#1E90FF]/20">{name}</SelectItem>)} </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-sm text-gray-300">Carregar Arquivo (.bin, .gguf)</Label>
                                                <div className="flex items-center gap-2">
                                                    <Input value={selectedFile?.name || ''} placeholder="Nenhum arquivo selecionado" readOnly className={cn(neumorphicInputStyle, "flex-1 text-xs italic text-gray-400")}/>
                                                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} className={cn(neumorphicButtonStyle, "h-9 w-9 p-0")}><Upload className="h-4 w-4" style={iconStyle}/></Button>
                                                    <input type="file" accept=".bin,.gguf,.safetensors" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                                                </div>
                                                <Button onClick={loadLocalModel} disabled={loadingModel || !selectedFile} className={cn(primaryNeumorphicButtonStyle, "w-full mt-2")}> {loadingModel ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" style={primaryIconStyle}/>} {loadingModel ? 'Carregando...' : 'Carregar Modelo Local'} </Button>
                                            </div>
                                            {loadingModel && <Progress value={65} className="h-1.5 rounded-full bg-gray-700 shadow-inner [&>div]:bg-[#1E90FF]" />}
                                        </div>
                                        )}
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-sm"><Label className="text-gray-300">Temperatura</Label><span className="text-white font-medium">{modelSettings.temperature.toFixed(1)}</span></div>
                                            <Slider value={[modelSettings.temperature]} min={0.1} max={1.5} step={0.1} onValueChange={(v) => setModelSettings(prev => ({ ...prev, temperature: v[0] }))} className={cn(neumorphicSliderStyle)} />
                                            <div className="flex justify-between text-xs text-gray-500"><span>Preciso</span><span>Criativo</span></div>
                                        </div>
                                         <div className="space-y-1.5">
                                            <div className="flex justify-between text-sm"><Label className="text-gray-300">Resposta Máx. (Tokens)</Label><span className="text-white font-medium">{modelSettings.maxTokens}</span></div>
                                            <Slider value={[modelSettings.maxTokens]} min={100} max={4000} step={100} onValueChange={(v) => setModelSettings(prev => ({ ...prev, maxTokens: v[0] }))} className={cn(neumorphicSliderStyle)} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-sm"><Label className="text-gray-300">Penalidade Repetição</Label><span className="text-white font-medium">{modelSettings.repetitionPenalty.toFixed(1)}</span></div>
                                            <Slider value={[modelSettings.repetitionPenalty]} min={1.0} max={2.0} step={0.1} onValueChange={(v) => setModelSettings(prev => ({ ...prev, repetitionPenalty: v[0] }))} className={cn(neumorphicSliderStyle)} />
                                            <div className="flex justify-between text-xs text-gray-500"><span>Mínima</span><span>Máxima</span></div>
                                        </div>
                                        <div className="flex justify-end pt-2">
                                            <Button onClick={checkModelStatus} className={cn(primaryNeumorphicButtonStyle)}><Cpu className="mr-2 h-4 w-4" style={primaryIconStyle}/>Verificar Status</Button>
                                        </div>
                                    </CardContent>
                                </Card>
                             </TabsContent>

                         </Tabs>
                     </div>

                     {/* Coluna Lateral */}
                     <div className="space-y-4 lg:col-span-1">
                         {/* Card de Seleção de Campanha para Contexto */}
                         <Card className={cn(cardStyle)}>
                             <CardHeader className="p-3 border-b border-[#1E90FF]/10">
                                 <CardTitle className="text-base font-semibold text-white flex items-center gap-2" style={{ textShadow: `0 0 5px ${neonColor}` }}>
                                     <Filter className="h-4 w-4" style={primaryIconStyle}/> Contexto da Campanha
                                 </CardTitle>
                             </CardHeader>
                             <CardContent className="p-3">
                                 <Label htmlFor="context-campaign-select" className="text-xs text-gray-400 mb-1 block">Selecionar para focar o contexto:</Label>
                                 <Select
                                     value={contextCampaignId}
                                     onValueChange={setContextCampaignId}
                                     disabled={campaignOptions.length === 0 && !contextLoading}
                                 >
                                     <SelectTrigger id="context-campaign-select" className={cn(neumorphicInputStyle, "w-full")}>
                                         <SelectValue placeholder="Contexto Geral / Mais Recente" />
                                     </SelectTrigger>
                                     <SelectContent className="bg-[#1e2128] border-[#1E90FF]/30 text-white">
                                         {/* --- CORREÇÃO SELECT ITEM REMOVIDO --- */}
                                         {campaignOptions.map((campaign) => (
                                             <SelectItem key={campaign.id} value={campaign.id.toString()} className="hover:bg-[#1E90FF]/20 focus:bg-[#1E90FF]/20">
                                                 {campaign.name}
                                             </SelectItem>
                                         ))}
                                         {/* --- FIM CORREÇÃO --- */}
                                         {campaignOptions.length === 0 && !contextLoading && <SelectItem value="no-camp" disabled>Nenhuma campanha encontrada</SelectItem>}
                                         {/* Opção visual para limpar seleção é implicitamente o placeholder quando value="" */}
                                     </SelectContent>
                                 </Select>
                             </CardContent>
                         </Card>

                         {/* Card de Contexto Automático */}
                        <Card className={cn(cardStyle)}>
                            <CardHeader className="p-3 border-b border-[#1E90FF]/10 flex flex-row justify-between items-center">
                                <CardTitle className="text-base font-semibold text-white" style={{ textShadow: `0 0 5px ${neonColor}` }}>
                                     {contextLoading ? "Carregando Contexto..." : `Contexto (${contextCampaignId ? 'Específico' : 'Geral'})`}
                                </CardTitle>
                                <Button
                                     variant="ghost" size="icon"
                                     className={cn(neumorphicGhostButtonStyle, contextLoading ? "animate-spin" : "")}
                                     onClick={generateContext}
                                     disabled={contextLoading}
                                     title="Atualizar Contexto"
                                 >
                                     <RefreshCw className="h-4 w-4" style={iconStyle}/>
                                 </Button>
                            </CardHeader>
                            <CardContent className="p-3 space-y-2">
                                <Textarea
                                     value={contextLoading ? "Aguarde..." : context}
                                     readOnly
                                     placeholder="Contexto da conversa será exibido aqui..."
                                     className={cn(neumorphicTextAreaStyle, "h-[120px] resize-none text-xs bg-[#0a0c10]/50")}
                                     />
                            </CardContent>
                        </Card>

                         {/* Card de Sugestões Rápidas */}
                        <Card className={cn(cardStyle)}>
                            <CardHeader className="p-3 border-b border-[#1E90FF]/10"><CardTitle className="text-base font-semibold text-white" style={{ textShadow: `0 0 5px ${neonColor}` }}>Sugestões Rápidas</CardTitle></CardHeader>
                            <CardContent className="p-3 space-y-1.5">
                                {["Melhorar conversão?", "3 copies FB Ads.", "Melhor horário?", "Analisar ROI.", "Sugerir KPIs."].map((suggestion, index) => (
                                <Button key={index} variant="outline" className={cn(neumorphicButtonStyle, "w-full justify-start text-left h-auto py-1.5 px-2 text-sm")} onClick={() => { setActiveTab('chat'); setInput(suggestion); setTimeout(handleSendMessage, 50); }} disabled={loading}>
                                    <Sparkles className="h-4 w-4 mr-2 text-primary shrink-0" style={primaryIconStyle} />
                                    <span className="truncate">{suggestion}</span>
                                </Button>
                                ))}
                            </CardContent>
                        </Card>

                         {/* Card de Status do Modelo */}
                        <Card className={cn(insetCardStyle, "p-3")}>
                             <CardHeader className="p-0 pb-2 flex flex-row items-center gap-2"> <Zap className="h-5 w-5 text-primary" style={primaryIconStyle}/> <CardTitle className="text-base font-semibold text-white" style={{ textShadow: `0 0 5px ${neonColor}` }}>Status Modelo</CardTitle> </CardHeader>
                             <CardContent className="p-0 pt-2 space-y-1 text-xs">
                                 <div className="flex justify-between items-center"><span className="text-gray-400">Modelo:</span><span className="font-medium truncate text-white" title={modelSettings.modelName}>{modelSettings.modelName}</span></div>
                                 <div className="flex justify-between items-center"><span className="text-gray-400">Status:</span><div className="flex items-center gap-1"><div className={cn("w-1.5 h-1.5 rounded-full", modelStatus.includes('Local:') && !modelStatus.includes('Erro') && !modelStatus.includes('offline') ? 'bg-green-500 animate-pulse' : modelStatus.includes('API') ? 'bg-blue-500' : 'bg-red-500')}></div><span className="text-white">{modelStatus}</span></div></div>
                                 <div className="flex justify-between items-center"><span className="text-gray-400">Temp:</span><span className="text-white">{modelSettings.temperature.toFixed(1)}</span></div>
                                 <div className="flex justify-between items-center"><span className="text-gray-400">Resp Max:</span><span className="text-white">{modelSettings.maxTokens}</span></div>
                                 <div className="flex justify-between items-center"><span className="text-gray-400">Pen. Rep.:</span><span className="text-white">{modelSettings.repetitionPenalty.toFixed(1)}</span></div>
                             </CardContent>
                         </Card>
                     </div>
                 </div>
             </div>
        </Layout>
    );
}