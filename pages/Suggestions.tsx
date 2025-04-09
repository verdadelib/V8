// C:\Users\ADM\Desktop\USB MKT PRO V3\pages\Suggestions.tsx
import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import type { Campaign } from '@/entities/Campaign';
import type { Copy } from '@/entities/Copy';
import { InvokeLLM } from '@/integrations/core';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Lightbulb,
  TrendingUp,
  DollarSign,
  Target,
  Copy as CopyIcon,
  RefreshCw,
  BrainCircuit,
  Save,
  Clock,
  Star,
  Loader2
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { initializeDatabase, getCampaignsForSelect as dbGetCampaignsForSelect } from '@/lib/db';
import Layout from '@/components/layout';
import { cn } from "@/lib/utils";

// Tipos locais para cópias e sugestões
interface Suggestion {
    id?: string; title?: string; description?: string; justification?: string;
    estimated_impact?: string; recommended_action?: string; budget_allocation?: string;
    expected_roi?: string; implementation_timeline?: string; ad_title?: string;
    ad_description?: string; cta?: string; target_audience?: string;
    persuasion_technique?: string; strategy_title?: string;
    recommended_segments?: string; estimated_audience_size?: string;
    type?: string; date?: string; content?: string;
}
interface CampaignWithCopies extends Campaign { copies?: Copy[]; }

export default function SuggestionsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [selectedCampaignData, setSelectedCampaignData] = useState<CampaignWithCopies | null>(null);
  const [metrics, setMetrics] = useState({ ctr: 0, cpc: 0, conversionRate: 0, roi: 0, costPerLead: 0 });
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [generatingSuggestions, setGeneratingSuggestions] = useState<boolean>(false);
  const [savedSuggestions, setSavedSuggestions] = useState<Suggestion[]>([]);
  const [suggestionType, setSuggestionType] = useState<string>("performance");
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState<boolean>(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const { toast } = useToast();

  // --- Estilos ---
  const neonColor = '#1E90FF'; const neonColorMuted = '#4682B4';
  const cardStyle = "bg-[#141414]/80 backdrop-blur-sm shadow-[5px_5px_10px_rgba(0,0,0,0.4),-5px_-5px_10px_rgba(255,255,255,0.05)] rounded-lg border-none";
  const neumorphicInputStyle = "bg-[#141414] text-white shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] placeholder:text-gray-500 border-none focus:ring-2 focus:ring-[#1E90FF] focus:ring-offset-2 focus:ring-offset-[hsl(var(--background))]";
  const neumorphicButtonStyle = "bg-[#141414] border-none text-white shadow-[3px_3px_6px_rgba(0,0,0,0.3),-3px_-3px_6px_rgba(255,255,255,0.05)] hover:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] hover:bg-[#1E90FF]/80 active:scale-[0.98] active:brightness-95 transition-all duration-150 ease-out";
  const neumorphicOutlineButtonStyle = cn(neumorphicButtonStyle, "bg-transparent border border-[#1E90FF]/30 hover:bg-[#1E90FF]/20 text-[#1E90FF] hover:text-white");

  // --- Busca de Campanhas (Client-side) ---
   const fetchCampaignsClient = useCallback(async () => {
     setIsLoadingCampaigns(true);
     console.log("[Suggestions] Buscando campanhas no cliente...");
     try {
        const response = await fetch('/api/campaigns');
        if (!response.ok) throw new Error('Falha ao buscar campanhas da API');
        const dbCampaigns: Campaign[] = await response.json();

         console.log("[Suggestions] Campanhas recebidas:", dbCampaigns);
         setCampaigns(dbCampaigns || []);
         if (dbCampaigns && dbCampaigns.length > 0 && !selectedCampaignId) {
             setSelectedCampaignId(dbCampaigns[0].id);
         } else if (!dbCampaigns || dbCampaigns.length === 0) {
             setSelectedCampaignId('');
         }
     } catch (error: any) {
         console.error('Erro ao buscar campanhas no cliente:', error);
         toast({ title: "Erro", description: "Falha ao buscar campanhas.", variant: "destructive" });
         setCampaigns([]);
     } finally {
         setIsLoadingCampaigns(false);
     }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  useEffect(() => {
    fetchCampaignsClient();
    loadSavedSuggestions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Busca Dados da Campanha e Métricas ao Selecionar (Client-side) ---
  const loadCampaignDataAndMetrics = useCallback(async (campaignId: string) => {
     if (!campaignId) {
        setSelectedCampaignData(null);
        setMetrics({ ctr: 0, cpc: 0, conversionRate: 0, roi: 0, costPerLead: 0 });
        setSuggestions([]); // Limpa sugestões ao deselecionar campanha
        return;
     }
     setIsLoadingDetails(true);
     setSuggestions([]); // Limpa sugestões anteriores ao carregar nova campanha
     console.log(`[Suggestions] Carregando dados/métricas para campanha ID: ${campaignId}`);
     try {
         // Busca dados da campanha (incluindo cópias se a API suportar ou em chamada separada)
         const campResponse = await fetch(`/api/campaigns?id=${campaignId}`);
         if (!campResponse.ok) throw new Error('Falha ao buscar dados da campanha.');
         const campaignData: Campaign = await campResponse.json();

         // Busca cópias associadas
         const copiesResponse = await fetch(`/api/copies?campaignId=${campaignId}`);
         const copiesData: Copy[] = copiesResponse.ok ? await copiesResponse.json() : [];

         const campaignWithCopies: CampaignWithCopies = { ...campaignData, copies: copiesData };
         setSelectedCampaignData(campaignWithCopies);

         // Calcula/Simula Métricas (como antes)
         const { impressions = 0, clicks = 0, leads = 0, sales = 0, budget = 0, revenue = 0 } = campaignWithCopies;
         const imps = impressions || Math.random() * 10000 + 5000;
         const clks = clicks || imps * (Math.random() * 0.03 + 0.01);
         const lds = leads || clks * (Math.random() * 0.1 + 0.05);
         const sls = sales || lds * (Math.random() * 0.2 + 0.05);
         const bud = budget || Math.random() * 500 + 100;
         const rev = revenue || sls * (Math.random() * 50 + 20);

         const calculatedCtr = imps > 0 ? (clks / imps * 100) : 0;
         const calculatedCpc = clks > 0 ? (bud / clks) : 0;
         const calculatedConvRate = lds > 0 ? (sls / lds * 100) : 0; // Conv Lead -> Venda
         const calculatedRoi = bud > 0 ? ((rev - bud) / bud * 100) : 0;
         const calculatedCpl = lds > 0 ? (bud / lds) : 0;

         setMetrics({
             ctr: parseFloat(calculatedCtr.toFixed(1)) || 0,
             cpc: parseFloat(calculatedCpc.toFixed(2)) || 0,
             conversionRate: parseFloat(calculatedConvRate.toFixed(1)) || 0,
             roi: parseFloat(calculatedRoi.toFixed(0)) || 0,
             costPerLead: parseFloat(calculatedCpl.toFixed(2)) || 0
         });
         console.log("[Suggestions] Métricas calculadas/simuladas:", { ctr: calculatedCtr, cpc: calculatedCpc, conversionRate: calculatedConvRate, roi: calculatedRoi, costPerLead: calculatedCpl });

     } catch (error) {
         console.error('Erro ao carregar dados/métricas da campanha:', error);
         toast({ title: "Erro", description: "Falha ao carregar dados da campanha.", variant: "destructive" });
         setSelectedCampaignData(null);
         setMetrics({ ctr: 0, cpc: 0, conversionRate: 0, roi: 0, costPerLead: 0 });
     } finally {
         setIsLoadingDetails(false);
     }
 }, [toast]); // Removido 'campaigns' da dependência, busca via API agora

  useEffect(() => {
    if(selectedCampaignId){
        loadCampaignDataAndMetrics(selectedCampaignId);
    } else {
        setSelectedCampaignData(null);
        setMetrics({ ctr: 0, cpc: 0, conversionRate: 0, roi: 0, costPerLead: 0 });
        setSuggestions([]); // Limpa sugestões se deselecionar
    }
  }, [selectedCampaignId, loadCampaignDataAndMetrics]);


  // --- Funções ---
   const loadSavedSuggestions = () => {
      // Mock: Carregar do localStorage ou API
      const saved = localStorage.getItem('savedSuggestions');
      setSavedSuggestions(saved ? JSON.parse(saved) : []);
   };

   const generateSuggestions = async () => {
     if (!selectedCampaignData) {
       toast({ title: "Aviso", description: "Selecione uma campanha válida primeiro.", variant: "default" });
       return;
     }
     setGeneratingSuggestions(true);
     setSuggestions([]); // Limpa sugestões anteriores
     console.log(`[Suggestions] Gerando sugestões tipo '${suggestionType}' para Campanha: ${selectedCampaignData.name}`);

     // Monta o prompt para a LLM
     const promptContext = `
        Campanha: ${selectedCampaignData.name || 'N/A'}
        Objetivo: ${selectedCampaignData.objective || 'N/A'}
        Plataforma: ${selectedCampaignData.platform || 'N/A'}
        Indústria: ${selectedCampaignData.industry || 'N/A'}
        Público-Alvo: ${selectedCampaignData.targetAudience || 'N/A'}
        Segmentação: ${selectedCampaignData.segmentation || 'N/A'}
        Orçamento Total: R$ ${selectedCampaignData.budget?.toFixed(2) || 'N/A'}
        Orçamento Diário: R$ ${selectedCampaignData.daily_budget?.toFixed(2) || 'N/A'}
        Duração (dias): ${selectedCampaignData.duration || 'N/A'}

        Métricas Atuais:
        - CTR: ${metrics.ctr.toFixed(1)}%
        - CPC: R$ ${metrics.cpc.toFixed(2)}
        - Taxa de Conversão (Leads -> Vendas): ${metrics.conversionRate.toFixed(1)}%
        - ROI: ${metrics.roi.toFixed(0)}%
        - Custo por Lead: R$ ${metrics.costPerLead.toFixed(2)}

        Cópias Utilizadas:
        ${selectedCampaignData.copies && selectedCampaignData.copies.length > 0
            ? selectedCampaignData.copies.map((copy, i) => ` - Cópia ${i+1}: Título: "${copy.title}", Conteúdo: "${copy.content}", CTA: "${copy.cta}"`).join('\n')
            : ' Nenhuma cópia associada encontrada.'
        }

        Gere 3 a 5 sugestões detalhadas de ${suggestionType} para otimizar esta campanha.
        Forneça justificativas claras baseadas nos dados e métricas.
        Para cada sugestão, inclua: título, descrição, justificativa, impacto estimado (qualitativo ou quantitativo), ação recomendada.
        Se for sugestão de cópia, inclua: título do anúncio, descrição do anúncio, CTA, público-alvo específico, técnica de persuasão.
        Se for sugestão de targeting, inclua: título da estratégia, segmentos recomendados, tamanho estimado da audiência (se possível).
        Se for sugestão de orçamento, inclua: recomendação de alocação, ROI esperado, período de implementação.
        Formate a resposta como um array JSON de objetos, onde cada objeto representa uma sugestão e contém os campos relevantes mencionados.
        Campos possíveis: id (gerar um uuid simples como s-1, s-2), type ('${suggestionType}'), title, description, justification, estimated_impact, recommended_action, budget_allocation, expected_roi, implementation_timeline, ad_title, ad_description, cta, target_audience, persuasion_technique, strategy_title, recommended_segments, estimated_audience_size.
        Use apenas os campos relevantes para o tipo de sugestão '${suggestionType}'.
        `;

     try {
        // *** Substituir por chamada real à API da LLM ***
        // const llmResponse = await InvokeLLM(promptContext);
        // Simulação de resposta da LLM
        await new Promise(res => setTimeout(res, 2000)); // Simula delay da API
        const mockSuggestions: Suggestion[] = [
            { id: 's-1', type: suggestionType, title: `Otimizar ${suggestionType === 'copy' ? 'Cópia Principal' : 'Segmento X'}`, description: `Revisar a ${suggestionType === 'copy' ? 'mensagem principal' : 'segmentação demográfica'} para focar em [detalhe específico].`, justification: `Baseado no baixo ${metrics.ctr < 1.5 ? 'CTR' : 'ROI'} e na análise do público [detalhe].`, estimated_impact: `Aumento esperado de ${suggestionType === 'copy' ? '15% no CTR' : '10% nas conversões'}`, recommended_action: `Testar nova ${suggestionType === 'copy' ? 'headline e CTA' : 'faixa etária e interesses'} por 7 dias.`, ad_title: suggestionType === 'copy' ? 'Nova Headline Otimizada!' : undefined, ad_description: suggestionType === 'copy' ? 'Descrição focada no benefício principal X.' : undefined, cta: suggestionType === 'copy' ? 'Saiba Mais Agora!' : undefined, target_audience: suggestionType === 'copy' ? 'Público específico Y' : undefined, strategy_title: suggestionType === 'targeting' ? 'Refinamento Demográfico' : undefined, recommended_segments: suggestionType === 'targeting' ? 'Mulheres 25-34, Interesse em Z' : undefined },
            { id: 's-2', type: suggestionType, title: `Ajustar ${suggestionType === 'budget' ? 'Alocação Diária' : 'Chamada para Ação'}`, description: `Realocar R$ ${suggestionType === 'budget' ? 'XX' : 'N/A'} do [segmento/canal A] para [segmento/canal B].`, justification: `O [segmento/canal B] apresenta ${metrics.cpc < 1.0 ? 'CPC menor' : 'taxa de conversão maior'} (${metrics.conversionRate}%)`, estimated_impact: `Redução de ${suggestionType === 'budget' ? '10% no CPL' : 'N/A'}`, recommended_action: `Monitorar o ${suggestionType === 'budget' ? 'orçamento por 5 dias' : 'desempenho do novo CTA'}`, budget_allocation: suggestionType === 'budget' ? 'Canal A: -R$XX, Canal B: +R$XX' : undefined, expected_roi: suggestionType === 'budget' ? `${(metrics.roi + 5).toFixed(0)}%` : undefined, implementation_timeline: suggestionType === 'budget' ? '3-5 dias' : undefined },
            { id: 's-3', type: suggestionType, title: `Testar ${suggestionType === 'performance' ? 'Novo Formato de Anúncio' : 'Abordagem de Urgência'}`, description: `Introduzir anúncios em ${suggestionType === 'performance' ? 'formato de vídeo curto' : 'copy com gatilho de escassez.'}`, justification: `Formatos ${suggestionType === 'performance' ? 'de vídeo' : 'com urgência'} tendem a ter maior engajamento (${metrics.ctr}% atual).`, estimated_impact: `Potencial de ${suggestionType === 'performance' ? 'aumentar o alcance' : 'melhorar a conversão imediata'}`, recommended_action: `Criar 2 variações e rodar teste A/B.`, persuasion_technique: suggestionType === 'copy' ? 'Escassez/Urgência' : undefined },
        ];
        // console.log("Mock LLM Response:", mockSuggestions);
        setSuggestions(mockSuggestions);
        toast({ title: "Sucesso", description: `Sugestões de ${suggestionType} geradas.` });
     } catch (error: any) {
       console.error('Erro ao gerar sugestões:', error);
       toast({ title: "Erro", description: "Falha ao comunicar com a IA.", variant: "destructive" });
       setSuggestions([]);
     } finally {
       setGeneratingSuggestions(false);
     }
   };

   const saveSuggestion = (suggestion: Suggestion) => {
     const now = new Date();
     const suggestionWithMeta = {
         ...suggestion,
         id: suggestion.id || `s-${Date.now()}`, // Garante ID único
         date: now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit'}),
         content: suggestion.description || suggestion.recommended_action || 'Detalhes não disponíveis', // Fallback para content
     };
     const updatedSaved = [suggestionWithMeta, ...savedSuggestions];
     setSavedSuggestions(updatedSaved);
     localStorage.setItem('savedSuggestions', JSON.stringify(updatedSaved)); // Salva no localStorage
     toast({ title: "Salvo", description: `Sugestão "${suggestion.title}" salva.` });
   };

   const renderSuggestionContent = (suggestion: Suggestion) => {
     const fields = [
        { label: "Descrição", value: suggestion.description }, { label: "Justificativa", value: suggestion.justification }, { label: "Impacto Estimado", value: suggestion.estimated_impact }, { label: "Ação Recomendada", value: suggestion.recommended_action }, { label: "Título Anúncio", value: suggestion.ad_title, type: 'copy' }, { label: "Descrição Anúncio", value: suggestion.ad_description, type: 'copy' }, { label: "CTA", value: suggestion.cta, type: 'copy' }, { label: "Público Alvo (Copy)", value: suggestion.target_audience, type: 'copy' }, { label: "Técnica de Persuasão", value: suggestion.persuasion_technique, type: 'copy' }, { label: "Título Estratégia", value: suggestion.strategy_title, type: 'targeting' }, { label: "Segmentos Recomendados", value: suggestion.recommended_segments, type: 'targeting' }, { label: "Alocação Orçamento", value: suggestion.budget_allocation, type: 'budget' }, { label: "ROI Esperado", value: suggestion.expected_roi, type: 'budget' }, { label: "Período Implementação", value: suggestion.implementation_timeline, type: 'budget' },
     ];
     const filteredFields = fields.filter(f => f.value && (!f.type || f.type === suggestion.type));

     return (
        <div className="space-y-2">
            <div className="flex justify-between items-start">
                <div className="flex items-start gap-2">
                    {getTypeIcon(suggestion.type)}
                    <h4 className="text-base font-semibold text-white" style={{ textShadow: `0 0 4px ${neonColorMuted}` }}>{suggestion.title || "Sugestão"}</h4>
                </div>
                <Button variant="ghost" size="sm" className={cn(neumorphicOutlineButtonStyle, "h-7 px-2")} onClick={() => saveSuggestion(suggestion)}>
                    <Save className="h-3.5 w-3.5 mr-1" /> Salvar
                </Button>
            </div>
            {filteredFields.map(field => (
                <div key={field.label} className="text-sm">
                    <strong className="text-gray-300 font-medium block mb-0.5">{field.label}:</strong>
                    <p className="text-gray-400 whitespace-pre-wrap">{field.value}</p>
                </div>
            ))}
        </div>
     );
   };

   const getTypeIcon = (type: string | undefined) => {
     const iconProps = { className: "h-5 w-5 text-[#1E90FF] mt-0.5 shrink-0", style: { filter: `drop-shadow(0 0 3px ${neonColor})` } };
     switch (type) { case 'performance': return <TrendingUp {...iconProps} />; case 'budget': return <DollarSign {...iconProps} />; case 'copy': return <CopyIcon {...iconProps} />; case 'targeting': return <Target {...iconProps} />; default: return <Lightbulb {...iconProps} />; }
   };

  // Combina estados de loading
   const isLoading = isLoadingCampaigns || isLoadingDetails || generatingSuggestions;

  return (
     <Layout>
       <>
         <Head> <title>Sugestões Inteligentes - USBMKT</title> </Head>
         <div className="space-y-4">
           <h1 className="text-2xl font-black text-white mb-4" style={{ textShadow: `0 0 8px ${neonColor}` }}> Sugestões Inteligentes </h1>
           <div className="grid gap-4 lg:grid-cols-3">
             {/* Coluna Esquerda */}
             <div className="lg:col-span-1 space-y-4">
               <Card className={cn(cardStyle, "p-3")}>
                 <CardHeader className="p-0 pb-3 mb-3 border-b border-[#1E90FF]/20"> <CardTitle className="text-lg font-semibold text-white" style={{ textShadow: `0 0 6px ${neonColor}` }}> Controles </CardTitle> </CardHeader>
                 <CardContent className="p-0 space-y-3">
                   {/* Select Campanha */}
                   <div className="space-y-1">
                     <Label htmlFor="campaign_select" className="text-sm text-gray-300 pl-1" style={{ textShadow: `0 0 4px ${neonColorMuted}` }}>Campanha</Label>
                     <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId} disabled={isLoadingCampaigns || generatingSuggestions}>
                       <SelectTrigger id="campaign_select" className={cn(neumorphicInputStyle, "w-full h-9 px-3 py-2")}> <SelectValue placeholder={isLoadingCampaigns ? "Carregando..." : "Selecione..."} /> </SelectTrigger>
                       <SelectContent className="bg-[#141414] border-[#1E90FF]/50 text-white shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                         {campaigns.length === 0 && !isLoadingCampaigns && <div className="px-3 py-2 text-sm text-gray-500">Nenhuma campanha.</div>}
                         {campaigns.map(campaign => ( <SelectItem key={campaign.id} value={campaign.id} className="hover:bg-[#1E90FF]/20 focus:bg-[#1E90FF]/30"> {campaign.name} </SelectItem> ))}
                       </SelectContent>
                     </Select>
                   </div>
                   <Separator className="bg-[#1E90FF]/20" />
                   {/* Métricas Atuais */}
                   <div>
                     <h3 className="text-sm font-semibold text-white mb-2 pl-1" style={{ textShadow: `0 0 4px ${neonColorMuted}` }}>Métricas Atuais</h3>
                     {isLoadingDetails ? ( <div className="text-xs text-gray-500 px-1 py-4 text-center"><Loader2 className="h-4 w-4 animate-spin inline mr-1"/> Carregando...</div>
                     // *** CORREÇÃO AQUI: usa selectedCampaignData em vez de currentMetrics ***
                     ) : selectedCampaignData ? (
                        <div className="space-y-1.5 px-1">
                           <div className="flex justify-between text-xs"><span className="text-gray-400">CTR:</span> <span className="text-white">{metrics.ctr.toFixed(1)}%</span></div> <Progress value={metrics.ctr * 10} className="h-1 bg-[#141414] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.3)] [&>div]:bg-[#1E90FF]" />
                           <div className="flex justify-between text-xs"><span className="text-gray-400">CPC:</span> <span className="text-white">R$ {metrics.cpc.toFixed(2)}</span></div> <Progress value={Math.max(0, 100 - (metrics.cpc / 5 * 100))} className="h-1 bg-[#141414] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.3)] [&>div]:bg-[#1E90FF]" /> {/* Garante valor >= 0 */}
                           <div className="flex justify-between text-xs"><span className="text-gray-400">Conversão:</span> <span className="text-white">{metrics.conversionRate.toFixed(1)}%</span></div> <Progress value={metrics.conversionRate * 10} className="h-1 bg-[#141414] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.3)] [&>div]:bg-[#1E90FF]" />
                           <div className="flex justify-between text-xs"><span className="text-gray-400">ROI:</span> <span className="text-white">{metrics.roi.toFixed(0)}%</span></div> <Progress value={Math.min(100, Math.max(0, metrics.roi / 3))} className="h-1 bg-[#141414] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.3)] [&>div]:bg-[#1E90FF]" /> {/* Garante 0 <= valor <= 100 */}
                        </div>
                     ) : ( <div className="text-xs text-gray-500 px-1 py-4 text-center italic">Selecione uma campanha válida.</div> )}
                   </div>
                   <Separator className="bg-[#1E90FF]/20" />
                   {/* Tipos de Sugestão */}
                   <div className="space-y-1.5">
                     <Label className="text-sm text-gray-300 pl-1" style={{ textShadow: `0 0 4px ${neonColorMuted}` }}>Tipo de Sugestão</Label>
                     <div className="grid grid-cols-2 gap-1.5"> {[ {value: 'performance', label: 'Performance', icon: TrendingUp}, {value: 'budget', label: 'Orçamento', icon: DollarSign}, {value: 'copy', label: 'Copys', icon: CopyIcon}, {value: 'targeting', label: 'Targeting', icon: Target} ].map(type => ( <Button key={type.value} variant="outline" size="sm" className={cn( neumorphicButtonStyle, "justify-start gap-2 text-sm h-8", suggestionType === type.value ? 'bg-[#1E90FF]/30 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)]' : 'bg-[#141414]/50 hover:bg-[#1E90FF]/10' )} onClick={() => setSuggestionType(type.value)} > <type.icon className="h-3.5 w-3.5" style={{ filter: `drop-shadow(0 0 3px ${neonColorMuted})` }}/> <span style={{ textShadow: `0 0 4px ${neonColorMuted}` }}>{type.label}</span> </Button> ))} </div>
                   </div>
                   {/* Botão Gerar */}
                   <Button onClick={generateSuggestions} disabled={isLoading || !selectedCampaignId || !selectedCampaignData} className={cn(neumorphicButtonStyle, "w-full mt-3 bg-[#1E90FF]/80 hover:bg-[#1E90FF] h-9")}>
                     {generatingSuggestions ? ( <> <Loader2 className="mr-2 h-4 w-4 animate-spin" style={{ filter: `drop-shadow(0 0 3px ${neonColor})` }}/> <span style={{ textShadow: `0 0 4px ${neonColor}` }}>Gerando...</span> </> ) : ( <> <BrainCircuit className="mr-2 h-4 w-4" style={{ filter: `drop-shadow(0 0 3px ${neonColor})` }}/> <span style={{ textShadow: `0 0 4px ${neonColor}` }}>Gerar Sugestões</span> </> )}
                   </Button>
                 </CardContent>
               </Card>
               {/* Sugestões Salvas */}
               <Card className={cn(cardStyle, "p-3")}> <CardHeader className="p-0 pb-3 mb-3 border-b border-[#1E90FF]/20"> <CardTitle className="text-lg font-semibold text-white" style={{ textShadow: `0 0 6px ${neonColor}` }}> Sugestões Salvas </CardTitle> </CardHeader> <CardContent className="p-0"> <ScrollArea className="h-[200px] pr-2"> {savedSuggestions.length === 0 ? ( <div className="text-center py-6"> <Star className="mx-auto h-7 w-7 text-gray-500 mb-1.5" style={{ filter: `drop-shadow(0 0 3px ${neonColorMuted})` }}/> <p className="text-gray-400 text-sm">Nenhuma sugestão salva</p> </div> ) : ( <div className="space-y-1.5"> {savedSuggestions.map(suggestion => ( <Card key={suggestion.id} className="bg-[#141414]/50 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.3),inset_-1px_-1px_2px_rgba(255,255,255,0.03)] border-none"> <CardContent className="p-2 space-y-0.5"> <div className="flex items-start gap-1.5"> {getTypeIcon(suggestion.type)} <div> <h4 className="text-sm font-medium text-white leading-tight">{suggestion.title}</h4> <p className="text-xs text-gray-500 flex items-center gap-1"> <Clock className="h-3 w-3" /> {suggestion.date} </p> </div> </div> <p className="text-xs text-gray-400 line-clamp-2">{suggestion.content}</p> </CardContent> </Card> ))} </div> )} </ScrollArea> </CardContent> </Card>
             </div>
             {/* Coluna Direita */}
             <div className="lg:col-span-2">
               <Card className={cn(cardStyle, "p-3")}>
                 <CardHeader className="p-0 pb-3 mb-3 border-b border-[#1E90FF]/20"> <CardTitle className="text-lg font-semibold text-white" style={{ textShadow: `0 0 6px ${neonColor}` }}> Sugestões Geradas ({ suggestionType.charAt(0).toUpperCase() + suggestionType.slice(1) }) </CardTitle> <CardDescription className="text-gray-400 text-sm" style={{ textShadow: `0 0 4px ${neonColorMuted}` }}> Baseadas na campanha selecionada e métricas atuais. </CardDescription> </CardHeader>
                 <CardContent className="p-0">
                   {generatingSuggestions ? ( <div className="py-10 text-center"> <Loader2 className="mx-auto h-9 w-9 text-[#1E90FF] animate-spin" style={{ filter: `drop-shadow(0 0 4px ${neonColor})` }} /> <p className="mt-3 text-gray-300" style={{ textShadow: `0 0 4px ${neonColorMuted}` }}>Analisando dados...</p> <Progress value={45} className="mt-3 w-56 mx-auto h-1.5 bg-[#141414] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.3)] [&>div]:bg-[#1E90FF]" /> </div>
                   ) : suggestions.length === 0 ? ( <div className="py-12 text-center"> <Lightbulb className="mx-auto h-10 w-10 text-gray-500 mb-3" style={{ filter: `drop-shadow(0 0 4px ${neonColorMuted})` }}/> <p className="text-gray-300 text-lg" style={{ textShadow: `0 0 4px ${neonColorMuted}` }}>Pronto para otimizar?</p> <p className="text-gray-500 text-sm mt-1.5 max-w-md mx-auto"> Selecione uma campanha, escolha um tipo e clique em "Gerar Sugestões". </p> </div>
                   ) : ( <ScrollArea className="h-[550px] pr-2"> <div className="space-y-3"> {suggestions.map((suggestion, index) => ( <Card key={index} className={cn(cardStyle, "bg-[#141414]/60")}> <CardContent className="p-3"> {renderSuggestionContent(suggestion)} </CardContent> </Card> ))} </div> </ScrollArea> )}
                 </CardContent>
               </Card>
             </div>
           </div>
         </div>
       </>
     </Layout>
  );
}