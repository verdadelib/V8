// C:\Users\ADM\Desktop\USB MKT PRO V3\pages\Projection.tsx
import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { TrendingUp, DollarSign, Target, CalendarDays, AlertCircle, Loader2, Users } from 'lucide-react'; // Adicionado Users
import Layout from '@/components/layout';
import { cn } from '@/lib/utils';
import { useToast } from "@/components/ui/use-toast";
// *** REMOVIDO: Importação direta de 'lib/db' que causa o erro de build ***
// import { initializeDatabase, getCampaignsForSelect as dbGetCampaignsForSelect } from '@/lib/db';
import type { Campaign } from '@/entities/Campaign'; // Mantém tipo

// Tipo para os dados de projeção
interface ProjectionData {
  futureInvestment: number;
  expectedLeads: number;
  expectedSales: number;
  expectedRevenue: number;
  expectedRoi: number;
  cpaEstimate: number; // Custo por Aquisição (Venda)
}

// Tipo para métricas da campanha selecionada
interface CampaignMetrics {
    costPerLead: number;
    conversionRate: number; // Taxa de conversão Lead -> Venda
    averageSaleValue: number; // Valor médio por venda
}

export default function ProjectionPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [currentMetrics, setCurrentMetrics] = useState<CampaignMetrics | null>(null);
  const [futureInvestment, setFutureInvestment] = useState<number>(1000);
  const [projectionPeriod, setProjectionPeriod] = useState<number>(30);
  const [projectionData, setProjectionData] = useState<ProjectionData | null>(null);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState<boolean>(true);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(false);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const { toast } = useToast();

  // --- Estilos ---
  const neonColor = '#1E90FF'; const neonColorMuted = '#4682B4';
  const cardStyle = "bg-[#141414]/80 backdrop-blur-sm shadow-[5px_5px_10px_rgba(0,0,0,0.4),-5px_-5px_10px_rgba(255,255,255,0.05)] rounded-lg border-none";
  const neumorphicInputStyle = "bg-[#141414] text-white shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] placeholder:text-gray-500 border-none focus:ring-2 focus:ring-[#1E90FF] focus:ring-offset-2 focus:ring-offset-[hsl(var(--background))]";
  const neumorphicButtonStyle = "bg-[#141414] border-none text-white shadow-[3px_3px_6px_rgba(0,0,0,0.3),-3px_-3px_6px_rgba(255,255,255,0.05)] hover:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] hover:bg-[#1E90FF]/80 active:scale-[0.98] active:brightness-95 transition-all duration-150 ease-out";

  // --- Busca de Campanhas (Client-side via API) ---
  const fetchCampaignsClient = useCallback(async () => {
    setIsLoadingCampaigns(true);
    try {
      // *** USA FETCH PARA API ROUTE /api/campaigns ***
      const response = await fetch('/api/campaigns');
      if (!response.ok) {
        throw new Error(`Falha ao buscar campanhas: ${response.statusText}`);
      }
      const apiCampaigns: Campaign[] = await response.json();

      setCampaigns(apiCampaigns || []);
      // Mantém a seleção atual se possível, senão seleciona a primeira ou nenhuma
      if (apiCampaigns && apiCampaigns.length > 0) {
          if (!apiCampaigns.find(c => c.id === selectedCampaignId)) { // Se a selecionada não existe mais
             setSelectedCampaignId(apiCampaigns[0].id); // Seleciona a primeira
          }
          // Se a selecionada ainda existe, não faz nada para manter a seleção
      } else {
           setSelectedCampaignId(''); // Limpa se não houver campanhas
      }

    } catch (error: any) {
      console.error('Erro ao buscar campanhas via API:', error);
      toast({ title: "Erro", description: "Falha ao buscar campanhas.", variant: "destructive" });
      setCampaigns([]);
    } finally {
      setIsLoadingCampaigns(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]); // Removido selectedCampaignId para buscar sempre a lista atualizada

  useEffect(() => {
    fetchCampaignsClient();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Roda apenas uma vez ao montar

  // --- Busca/Calcula Métricas da Campanha Selecionada ---
  const loadMetricsForCampaign = useCallback(async (campaignId: string) => {
    if (!campaignId) {
      setCurrentMetrics(null);
      setProjectionData(null); // Limpa projeção se deselecionar
      return;
    }
    setIsLoadingMetrics(true);
    setProjectionData(null); // Reseta projeção ao mudar campanha
    try {
      // Tenta encontrar na lista já carregada
      let campaignDetails = campaigns.find(c => c.id === campaignId);

      // Se precisar de dados mais completos ou não achou, busca da API
      // (Ajuste a condição se a lista inicial já tiver tudo necessário)
      if (!campaignDetails || campaignDetails.leads === undefined) { // Ex: Se 'leads' não vem na lista inicial
         console.log(`[Metrics] Buscando detalhes completos para ID ${campaignId} da API...`);
         const response = await fetch(`/api/campaigns?id=${campaignId}`);
         if (response.ok) {
            campaignDetails = await response.json();
         } else {
             console.warn(`Falha ao buscar detalhes completos da API para ${campaignId}`);
         }
      }

      if (campaignDetails) {
        // Simulação/Cálculo de métricas base (ajuste conforme seus dados reais)
        // Use 0 como fallback para evitar NaN se os dados não existirem
        const budget = campaignDetails.budget || 0;
        const leads = campaignDetails.leads || 0;
        const clicks = campaignDetails.clicks || 0;
        const sales = campaignDetails.sales || 0;
        const revenue = campaignDetails.revenue || 0;

        // Adiciona uma pequena constante para evitar divisão por zero em CPL se leads for 0
        const safeLeadsForCpl = leads || 1;
        const costPerLead = parseFloat((budget / safeLeadsForCpl).toFixed(2));

        // Usa 0 se leads for 0 para CR
        const conversionRate = leads > 0 ? parseFloat(((sales / leads) * 100).toFixed(1)) : 0;

        // Usa 0 se sales for 0 para TM
        const averageSaleValue = sales > 0 ? parseFloat((revenue / sales).toFixed(2)) : 0;

         // Validação Mínima antes de setar
         if (costPerLead > 0 && averageSaleValue >= 0 && conversionRate >= 0) {
            setCurrentMetrics({ costPerLead, conversionRate, averageSaleValue });
            console.log("Métricas Carregadas/Calculadas:", { costPerLead, conversionRate, averageSaleValue });
         } else {
             console.warn("Métricas base calculadas são inválidas:", { costPerLead, conversionRate, averageSaleValue });
             setCurrentMetrics(null);
             toast({ title: "Aviso", description: "Métricas base da campanha inválidas ou zeradas.", variant: "default" });
         }

      } else {
        setCurrentMetrics(null);
        toast({ title: "Aviso", description: "Dados da campanha selecionada não encontrados.", variant: "default" });
      }
    } catch (error) {
      console.error("Erro ao carregar métricas da campanha:", error);
      toast({ title: "Erro", description: "Falha ao carregar métricas da campanha.", variant: "destructive" });
      setCurrentMetrics(null);
    } finally {
      setIsLoadingMetrics(false);
    }
  }, [campaigns, toast]);

  useEffect(() => {
    // Roda loadMetricsForCampaign apenas se campaigns tiver dados e um ID estiver selecionado
    if (selectedCampaignId && campaigns.length > 0) {
      loadMetricsForCampaign(selectedCampaignId);
    } else if (!selectedCampaignId) {
        // Limpa se nenhuma campanha estiver selecionada
        setCurrentMetrics(null);
        setProjectionData(null);
    }
  }, [selectedCampaignId, campaigns, loadMetricsForCampaign]); // Depende de campaigns agora

  // --- Calcula Projeção ---
  const calculateProjection = useCallback(() => {
    if (!currentMetrics) { // Verifica se currentMetrics não é null
      toast({ title: "Aviso", description: "Métricas da campanha base não carregadas ou inválidas.", variant: "default" });
      return;
    }
     if (futureInvestment <= 0) {
       toast({ title: "Aviso", description: "O investimento futuro deve ser maior que zero.", variant: "default" });
       return;
    }
    setIsCalculating(true);
    setProjectionData(null);

    try {
        const { costPerLead, conversionRate, averageSaleValue } = currentMetrics;

        // Validações mais robustas
        if (costPerLead <= 0) throw new Error("Custo por Lead (CPL) inválido (<= 0).");
        if (conversionRate < 0) throw new Error("Taxa de Conversão inválida (< 0).");
        if (averageSaleValue < 0) throw new Error("Valor Médio de Venda inválido (< 0).");


        const expectedLeads = Math.max(0, Math.floor(futureInvestment / costPerLead));
        const expectedSales = Math.max(0, Math.floor(expectedLeads * (conversionRate / 100)));
        const expectedRevenue = Math.max(0, parseFloat((expectedSales * averageSaleValue).toFixed(2)));

        // Calcula ROI com segurança, evitando divisão por zero
        let expectedRoi = 0;
        if (futureInvestment > 0) {
            expectedRoi = parseFloat((((expectedRevenue - futureInvestment) / futureInvestment) * 100).toFixed(1));
        } else if (expectedRevenue > 0) {
             expectedRoi = Infinity; // Ou poderia ser 0 ou NaN, dependendo da interpretação
        } // Se ambos forem 0, ROI é 0

        // Calcula CPA com segurança
        const cpaEstimate = expectedSales > 0 ? parseFloat((futureInvestment / expectedSales).toFixed(2)) : Infinity;

        setProjectionData({
            futureInvestment,
            expectedLeads,
            expectedSales,
            expectedRevenue,
            expectedRoi,
            cpaEstimate
        });

    } catch (error: any) {
         console.error("Erro ao calcular projeção:", error);
         toast({ title: "Erro no Cálculo", description: error.message || "Não foi possível calcular a projeção.", variant: "destructive" });
         setProjectionData(null);
    } finally {
        setIsCalculating(false);
    }
  }, [currentMetrics, futureInvestment, projectionPeriod, toast]); // projectionPeriod não usado no cálculo atual, mas mantido

    // Efeito para logar a projeção APÓS o estado ser atualizado
    useEffect(() => {
        if (projectionData) {
            console.log("Projeção Calculada (estado atualizado):", projectionData);
        }
    }, [projectionData]);

  return (
    <Layout>
      <>
        <Head> <title>Projeção de Resultados - USBMKT</title> </Head>
        <div className="space-y-6">
          <h1 className="text-3xl font-black text-white mb-6" style={{ textShadow: `0 0 10px ${neonColor}` }}>
            Projeção de Resultados
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Coluna de Configuração */}
            <div className="md:col-span-1 space-y-6">
              <Card className={cn(cardStyle, "p-4")}>
                <CardHeader className="p-0 pb-4 mb-4 border-b border-[#1E90FF]/20">
                  <CardTitle className="text-xl font-semibold text-white" style={{ textShadow: `0 0 6px ${neonColor}` }}>
                    Configurar Projeção
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-4">
                  {/* Selecionar Campanha */}
                  <div className="space-y-1.5">
                    <Label htmlFor="campaign_select_proj" className="text-sm text-gray-300 pl-1" style={{ textShadow: `0 0 4px ${neonColorMuted}` }}>Campanha Base</Label>
                    <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId} disabled={isLoadingCampaigns || isCalculating}>
                      <SelectTrigger id="campaign_select_proj" className={cn(neumorphicInputStyle, "w-full h-9 px-3 py-2 text-sm")}>
                        <SelectValue placeholder={isLoadingCampaigns ? "Carregando..." : "Selecione uma campanha"} />
                      </SelectTrigger>
                      <SelectContent className="bg-[#141414] border-[#1E90FF]/50 text-white shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                        {campaigns.length === 0 && !isLoadingCampaigns && <div className="px-3 py-2 text-sm text-gray-500">Nenhuma campanha.</div>}
                        {campaigns.map(campaign => (
                          <SelectItem key={campaign.id} value={campaign.id} className="hover:bg-[#1E90FF]/20 focus:bg-[#1E90FF]/30 text-sm">
                            {campaign.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Métricas Atuais */}
                  <div className="space-y-1">
                    <Label className="text-sm text-gray-300 pl-1" style={{ textShadow: `0 0 4px ${neonColorMuted}` }}>Métricas Atuais (Base)</Label>
                    <div className={cn(cardStyle, "bg-[#101010]/50 p-3 space-y-1 text-xs rounded-md")}>
                      {isLoadingMetrics ? (
                         <div className="flex items-center justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-gray-400"/></div>
                      ) : currentMetrics ? (
                        <>
                          <p className="text-gray-400">CPL: <span className="font-medium text-white">R$ {currentMetrics.costPerLead.toFixed(2)}</span></p>
                          <p className="text-gray-400">Conv. Lead {'>'} Venda: <span className="font-medium text-white">{currentMetrics.conversionRate.toFixed(1)}%</span></p>
                          <p className="text-gray-400">Valor Médio Venda: <span className="font-medium text-white">R$ {currentMetrics.averageSaleValue.toFixed(2)}</span></p>
                        </>
                      ) : (
                        <p className="text-gray-500 italic py-2 text-center">Selecione uma campanha.</p>
                      )}
                    </div>
                  </div>

                  {/* Investimento Futuro */}
                  <div className="space-y-1.5">
                    <Label htmlFor="future_investment" className="text-sm text-gray-300 pl-1" style={{ textShadow: `0 0 4px ${neonColorMuted}` }}>Investimento Futuro (R$)</Label>
                    <Input
                      id="future_investment"
                      type="number"
                      value={futureInvestment}
                      onChange={(e) => setFutureInvestment(Math.max(0, parseFloat(e.target.value) || 0))}
                      className={cn(neumorphicInputStyle, "w-full h-9 px-3 py-2 text-sm")}
                      placeholder="Ex: 5000"
                      disabled={isCalculating}
                      min="0" // Garante que não seja negativo no input
                    />
                    <Slider
                      value={[futureInvestment]}
                      onValueChange={(value) => setFutureInvestment(value[0])}
                      max={10000}
                      step={50}
                      className="[&>span]:h-1 [&>span>span]:h-1 [&>span>span]:bg-primary [&>span>button]:bg-primary [&>span>button]:w-3.5 [&>span>button]:h-3.5 [&>span>button]:border-primary-foreground/50 [&>span>button]:shadow-[0_0_5px_var(--title-glow-color)] pt-2"
                      disabled={isCalculating}
                    />
                  </div>

                  {/* Período da Projeção */}
                  <div className="space-y-1.5">
                    <Label htmlFor="projection_period" className="text-sm text-gray-300 pl-1" style={{ textShadow: `0 0 4px ${neonColorMuted}` }}>Período (Dias)</Label>
                    <Input
                      id="projection_period"
                      type="number"
                      value={projectionPeriod}
                      onChange={(e) => setProjectionPeriod(Math.max(1, parseInt(e.target.value) || 1))}
                      className={cn(neumorphicInputStyle, "w-full h-9 px-3 py-2 text-sm")}
                      placeholder="Ex: 30"
                      min="1"
                      disabled={isCalculating}
                    />
                  </div>

                  {/* Botão Calcular */}
                  <Button
                    onClick={calculateProjection}
                    disabled={isCalculating || isLoadingMetrics || !currentMetrics || !selectedCampaignId}
                    className={cn(neumorphicButtonStyle, "w-full mt-4 bg-[#1E90FF]/80 hover:bg-[#1E90FF] h-10 text-sm")}
                  >
                    {isCalculating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <TrendingUp className="mr-2 h-4 w-4" />
                    )}
                    Calcular Projeção
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Coluna de Resultados */}
            <div className="md:col-span-2">
              <Card className={cn(cardStyle, "p-4 min-h-[400px] flex flex-col")}>
                <CardHeader className="p-0 pb-4 mb-4 border-b border-[#1E90FF]/20 flex-shrink-0">
                  <CardTitle className="text-xl font-semibold text-white" style={{ textShadow: `0 0 6px ${neonColor}` }}>
                    Resultados Projetados
                  </CardTitle>
                  <CardDescription className="text-gray-400 text-sm" style={{ textShadow: `0 0 4px ${neonColorMuted}` }}>
                    Estimativas para os próximos {projectionPeriod} dia(s) com base na campanha "{campaigns.find(c => c.id === selectedCampaignId)?.name || 'Selecionada'}".
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 flex-grow flex items-center justify-center">
                  {isCalculating ? (
                     <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-[#1E90FF]" /></div>
                  ) : projectionData ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                      <div className={cn(cardStyle, "bg-[#101010]/50 p-4 text-center rounded-md")}>
                        <DollarSign className="mx-auto h-6 w-6 text-[#1E90FF] mb-2" style={{ filter: `drop-shadow(0 0 4px ${neonColor})` }} />
                        <p className="text-xs text-gray-400 uppercase tracking-wider">Investimento</p>
                        <p className="text-xl font-bold text-white">R$ {projectionData.futureInvestment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className={cn(cardStyle, "bg-[#101010]/50 p-4 text-center rounded-md")}>
                        <Users className="mx-auto h-6 w-6 text-[#1E90FF] mb-2" style={{ filter: `drop-shadow(0 0 4px ${neonColor})` }} />
                        <p className="text-xs text-gray-400 uppercase tracking-wider">Leads Esperados</p>
                        <p className="text-xl font-bold text-white">{projectionData.expectedLeads.toLocaleString('pt-BR')}</p>
                      </div>
                      <div className={cn(cardStyle, "bg-[#101010]/50 p-4 text-center rounded-md")}>
                        <Target className="mx-auto h-6 w-6 text-[#1E90FF] mb-2" style={{ filter: `drop-shadow(0 0 4px ${neonColor})` }} />
                        <p className="text-xs text-gray-400 uppercase tracking-wider">Vendas Esperadas</p>
                        <p className="text-xl font-bold text-white">{projectionData.expectedSales.toLocaleString('pt-BR')}</p>
                      </div>
                      <div className={cn(cardStyle, "bg-[#101010]/50 p-4 text-center rounded-md")}>
                        <TrendingUp className="mx-auto h-6 w-6 text-[#1E90FF] mb-2" style={{ filter: `drop-shadow(0 0 4px ${neonColor})` }} />
                        <p className="text-xs text-gray-400 uppercase tracking-wider">Receita Esperada</p>
                        <p className="text-xl font-bold text-white">R$ {projectionData.expectedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                       <div className={cn(cardStyle, "bg-[#101010]/50 p-4 text-center rounded-md")}>
                        <DollarSign className="mx-auto h-6 w-6 text-[#1E90FF] mb-2" style={{ filter: `drop-shadow(0 0 4px ${neonColor})` }} />
                        <p className="text-xs text-gray-400 uppercase tracking-wider">Custo por Venda (CPA)</p>
                        <p className="text-xl font-bold text-white">{isFinite(projectionData.cpaEstimate) ? `R$ ${projectionData.cpaEstimate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "N/A (0 Vendas)"}</p>
                      </div>
                      <div className={cn(cardStyle, "bg-[#101010]/50 p-4 text-center rounded-md")}>
                         <TrendingUp className="mx-auto h-6 w-6 mb-2" style={{ filter: `drop-shadow(0 0 4px ${projectionData.expectedRoi >= 0 ? 'rgba(74, 222, 128, 0.6)' : 'rgba(248, 113, 113, 0.6)'})` }} />
                        <p className="text-xs text-gray-400 uppercase tracking-wider">ROI Esperado</p>
                        <p className={cn("text-xl font-bold", projectionData.expectedRoi >= 0 ? "text-green-400" : "text-red-400")}>{isFinite(projectionData.expectedRoi) ? `${projectionData.expectedRoi.toLocaleString('pt-BR')}%` : "∞"}</p> {/* Mostra infinito se aplicável */}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <AlertCircle className="mx-auto h-8 w-8 text-gray-500 mb-3" />
                      <p className="text-gray-400">Configure os parâmetros e clique em "Calcular Projeção".</p>
                      {!selectedCampaignId && <p className="text-sm text-yellow-500 mt-2">Selecione uma campanha base primeiro.</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </>
    </Layout>
  );
}