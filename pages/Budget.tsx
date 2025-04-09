// pages/Budget.tsx
import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Layout from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { Campaign } from '@/entities/Campaign'; // Usar a interface Campaign
import { DollarSign, Percent, TrendingUp, ClipboardList, Target } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

// Definir cores consistentes com o tema NEON
const COLORS = [
    '#1E90FF', // Azul Neon (Tráfego)
    '#32CD32', // Verde Neon (Criativos)
    '#FFD700', // Amarelo/Dourado Neon (Operacional)
    '#FF4444', // Vermelho Neon (Lucro) - Ajustado
    '#9370DB'  // Roxo Neon Médio (Outros/Não alocado)
];

interface BudgetAllocation {
  name: string;
  value: number; // Valor absoluto
  percentage: number; // Percentual
  color: string; // Cor para o gráfico
}

const formatCurrency = (value: number): string => {
    if (isNaN(value) || value === null || typeof value === 'undefined') {
      return 'R$ 0,00';
    }
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export default function BudgetPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [totalBudget, setTotalBudget] = useState<number>(5000);
  const [trafficInvestment, setTrafficInvestment] = useState<number>(55);
  const [creativeInvestment, setCreativeInvestment] = useState<number>(20);
  const [operationalCost, setOperationalCost] = useState<number>(10);
  const [profitMargin, setProfitMargin] = useState<number>(15);
  const [allocationData, setAllocationData] = useState<BudgetAllocation[]>([]);
  const [calculatedValues, setCalculatedValues] = useState({
    trafficCost: 0, creativeCost: 0, operationalCostValue: 0, expectedProfit: 0, unallocated: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // --- Style constants (Adaptado de Campaign.tsx) ---
  const neonColor = '#1E90FF';
  const neonColorMuted = '#4682B4';
  const neonRedColor = '#FF4444';
  const cardStyle = "bg-[#141414]/80 backdrop-blur-sm shadow-[5px_5px_10px_rgba(0,0,0,0.4),-5px_-5px_10px_rgba(255,255,255,0.05)] rounded-lg border-none p-4"; // Padding adicionado aqui
  const insetCardStyle = "bg-[#141414]/50 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.3),inset_-1px_-1px_2px_rgba(255,255,255,0.03)] rounded-md border-none p-3"; // Padding para valores calculados
  const neumorphicInputStyle = "bg-[#141414] text-white shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] placeholder:text-gray-500 border-none focus:ring-2 focus:ring-[#1E90FF] focus:ring-offset-2 focus:ring-offset-[#0e1015] h-9 text-sm px-3 py-2";
  const neumorphicSliderStyle = "[&>span:first-child]:bg-[#141414] [&>span:first-child]:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] [&>span:first-child]:h-2 [&>span>span]:shadow-[3px_3px_6px_rgba(0,0,0,0.3),-3px_-3px_6px_rgba(255,255,255,0.05)] [&>span>span]:h-4 [&>span>span]:w-4 [&>span>span]:border-none"; // Baseado no Chat.tsx
  const primaryIconStyle = { filter: `drop-shadow(0 0 3px ${neonColor})` };
  const labelStyle = "text-xs text-gray-300 mb-0.5 block"; // Adicionado block
  const titleStyle = "text-lg font-semibold text-white";
  // --- End Style constants ---

  const calculateAllocationCallback = useCallback(() => {
    setError(null);
    const traffic = (trafficInvestment / 100) * totalBudget;
    const creative = (creativeInvestment / 100) * totalBudget;
    const operational = (operationalCost / 100) * totalBudget;
    const profit = (profitMargin / 100) * totalBudget;
    const totalAllocatedPercentage = trafficInvestment + creativeInvestment + operationalCost + profitMargin;
    const unallocatedPercentage = Math.max(0, 100 - totalAllocatedPercentage);
    const unallocatedValue = (unallocatedPercentage / 100) * totalBudget;

    if (totalAllocatedPercentage > 100) { setError(`A soma das alocações (${totalAllocatedPercentage}%) excede 100%. Ajuste os valores.`); }

    setCalculatedValues({ trafficCost: traffic, creativeCost: creative, operationalCostValue: operational, expectedProfit: profit, unallocated: unallocatedValue, });

    const dataForChart: BudgetAllocation[] = [
      { name: 'Tráfego Pago', value: traffic, percentage: trafficInvestment, color: COLORS[0] },
      { name: 'Criativos/Design', value: creative, percentage: creativeInvestment, color: COLORS[1] },
      { name: 'Custos Operacionais', value: operational, percentage: operationalCost, color: COLORS[2] },
      { name: 'Margem de Lucro', value: profit, percentage: profitMargin, color: COLORS[3] },
    ];
    if (unallocatedValue > 0.01) { dataForChart.push({ name: 'Não Alocado', value: unallocatedValue, percentage: unallocatedPercentage, color: COLORS[4] }); }
    setAllocationData(dataForChart.filter(item => item.value > 0.01));
  }, [totalBudget, trafficInvestment, creativeInvestment, operationalCost, profitMargin]); // Dependências corretas

  useEffect(() => { calculateAllocationCallback(); }, [calculateAllocationCallback]); // Usar o callback

  // Mock da função listCampaigns se não for usada ou para fallback
  const listCampaignsMock = async (): Promise<Campaign[]> => {
      console.warn("Usando mock de listCampaigns em Budget.tsx");
      await new Promise(resolve => setTimeout(resolve, 300)); // Simula delay
      return [
          // Adicione campanhas mock se necessário para testes
          // { id: 'camp1', name: 'Campanha Mock 1', budget: 3000, ...outrosCampos },
      ];
  }

  useEffect(() => {
      const fetchCampaignData = async () => {
        try {
          // Tente usar a função real se existir, senão use o mock
          const data = typeof listCampaigns === 'function' ? await listCampaigns() : await listCampaignsMock();
          setCampaigns(data || []); // Garante que seja um array
          if (data && data.length > 0) { // Verifica se data é array e tem itens
            const totalFromCampaigns = data.reduce((sum, campaign) => sum + (campaign.budget || 0), 0);
            setTotalBudget(prev => Math.max(prev, totalFromCampaigns));
          }
        } catch (err) {
          console.error("Erro ao buscar campanhas:", err);
          toast({ title: "Erro", description: "Falha ao carregar campanhas.", variant: "destructive" });
        }
      };
    // fetchCampaignData(); // Descomentado, mas pode usar mock se preferir
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

  const handleSliderChange = (setter: React.Dispatch<React.SetStateAction<number>>) => (value: number[]) => { setter(value[0]); };
  const handleBudgetInputChange = (event: React.ChangeEvent<HTMLInputElement>) => { const value = event.target.value; const numValue = value === '' ? 0 : Number(value); if (!isNaN(numValue) && numValue >= 0) { setTotalBudget(numValue); } };

  return (
    <Layout>
        <Head> <title>Planejamento Orçamentário - USBMKT</title> </Head>
        <div className="space-y-4"> {/* Reduced spacing */}
            <h1 className="text-2xl font-black text-white mb-4" style={{ textShadow: `0 0 8px ${neonColor}` }}>
                Planejamento Orçamentário
            </h1>

            {error && (
                <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-md text-red-400 text-xs text-center shadow-[inset_1px_1px_2px_rgba(0,0,0,0.3),inset_-1px_-1px_2px_rgba(255,255,255,0.03)]" style={{ textShadow: `0 0 4px ${neonRedColor}` }}>
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"> {/* Reduced gap */}
                {/* Coluna de Controles */}
                <div className="lg:col-span-1 space-y-4">
                    <Card className={cn(cardStyle)}>
                        <CardHeader className="p-0 pb-3 mb-3 border-b border-[#1E90FF]/20">
                            <CardTitle className={cn(titleStyle, "flex items-center gap-2")} style={{ textShadow: `0 0 6px ${neonColor}` }}>
                                <DollarSign className="h-5 w-5" style={primaryIconStyle}/> Orçamento Total
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Label htmlFor="totalBudget" className={labelStyle} style={{ textShadow: `0 0 4px ${neonColor}` }}>Valor Total (R$)</Label>
                            <Input id="totalBudget" type="number" value={totalBudget === 0 ? '' : totalBudget} onChange={handleBudgetInputChange} placeholder="0,00" min="0" step="0.01" className={cn(neumorphicInputStyle, "mt-1")} />
                        </CardContent>
                    </Card>

                    <Card className={cn(cardStyle)}>
                         <CardHeader className="p-0 pb-3 mb-3 border-b border-[#1E90FF]/20">
                            <CardTitle className={cn(titleStyle, "flex items-center gap-2")} style={{ textShadow: `0 0 6px ${neonColor}` }}>
                                <Percent className="h-5 w-5" style={primaryIconStyle}/> Distribuição (%)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 space-y-4">
                            {/* Slider Tráfego */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center"> <Label htmlFor="trafficInvestment" className={cn(labelStyle, "flex items-center gap-1")} style={{ textShadow: `0 0 4px ${neonColor}` }}><TrendingUp className="h-4 w-4" style={{filter: `drop-shadow(0 0 3px ${COLORS[0]})`}}/> Tráfego</Label> <span className="text-xs font-medium text-white w-10 text-right">{trafficInvestment}%</span> </div>
                                <Slider id="trafficInvestment" min={0} max={100} step={1} value={[trafficInvestment]} onValueChange={handleSliderChange(setTrafficInvestment)} className={cn(neumorphicSliderStyle, "[&>span>span]:bg-[#1E90FF]")} />
                            </div>
                             {/* Slider Criativos */}
                             <div className="space-y-1.5">
                                <div className="flex justify-between items-center"> <Label htmlFor="creativeInvestment" className={cn(labelStyle, "flex items-center gap-1")} style={{ textShadow: `0 0 4px ${neonColor}` }}><Target className="h-4 w-4" style={{filter: `drop-shadow(0 0 3px ${COLORS[1]})`}}/> Criativos</Label> <span className="text-xs font-medium text-white w-10 text-right">{creativeInvestment}%</span> </div>
                                <Slider id="creativeInvestment" min={0} max={100} step={1} value={[creativeInvestment]} onValueChange={handleSliderChange(setCreativeInvestment)} className={cn(neumorphicSliderStyle, "[&>span>span]:bg-[#32CD32]")} />
                             </div>
                             {/* Slider Operacional */}
                             <div className="space-y-1.5">
                                <div className="flex justify-between items-center"> <Label htmlFor="operationalCost" className={cn(labelStyle, "flex items-center gap-1")} style={{ textShadow: `0 0 4px ${neonColor}` }}><ClipboardList className="h-4 w-4" style={{filter: `drop-shadow(0 0 3px ${COLORS[2]})`}}/> Operacional</Label> <span className="text-xs font-medium text-white w-10 text-right">{operationalCost}%</span> </div>
                                <Slider id="operationalCost" min={0} max={100} step={1} value={[operationalCost]} onValueChange={handleSliderChange(setOperationalCost)} className={cn(neumorphicSliderStyle, "[&>span>span]:bg-[#FFD700]")} />
                             </div>
                             {/* Slider Lucro */}
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center"> <Label htmlFor="profitMargin" className={cn(labelStyle, "flex items-center gap-1")} style={{ textShadow: `0 0 4px ${neonColor}` }}><DollarSign className="h-4 w-4" style={{filter: `drop-shadow(0 0 3px ${COLORS[3]})`}}/> Lucro</Label> <span className="text-xs font-medium text-white w-10 text-right">{profitMargin}%</span> </div>
                                <Slider id="profitMargin" min={0} max={100} step={1} value={[profitMargin]} onValueChange={handleSliderChange(setProfitMargin)} className={cn(neumorphicSliderStyle, "[&>span>span]:bg-[#FF4444]")} />
                              </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Coluna Gráfico e Valores */}
                <div className="lg:col-span-2 space-y-4">
                    <Card className={cn(cardStyle)}>
                        <CardHeader className="p-0 pb-3 mb-3 border-b border-[#1E90FF]/20">
                            <CardTitle className={cn(titleStyle)} style={{ textShadow: `0 0 6px ${neonColor}` }}>Alocação do Orçamento</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 h-[300px]"> {/* Altura ajustada */}
                            {totalBudget > 0 && allocationData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={allocationData} cx="50%" cy="50%" labelLine={false}
                                             label={({ name, percentage, x, y, midAngle, innerRadius, outerRadius }) => { const RADIAN = Math.PI / 180; const radius = innerRadius + (outerRadius - innerRadius) * 1.3; const lx = x + radius * Math.cos(-midAngle * RADIAN); const ly = y + radius * Math.sin(-midAngle * RADIAN); return ( <text x={lx} y={ly} fill="hsl(var(--muted-foreground))" textAnchor={lx > x ? 'start' : 'end'} dominantBaseline="central" fontSize={10}> {`${name} (${percentage.toFixed(0)}%)`} </text> ); }}
                                             outerRadius={95} innerRadius={55} fill="#8884d8" dataKey="value" paddingAngle={3} >
                                            {allocationData.map((entry, index) => ( <Cell key={`cell-${index}`} fill={entry.color} stroke={'#141414'} strokeWidth={2}/> ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value: number, name: string) => [formatCurrency(value), name]}
                                            contentStyle={{ backgroundColor: 'rgba(20, 20, 20, 0.85)', borderColor: `${neonColor}66`, borderRadius: '8px', color: 'white', fontSize: '11px', backdropFilter: 'blur(3px)', boxShadow: '5px 5px 10px rgba(0,0,0,0.4)'}}
                                        />
                                        {/* <Legend /> // Opcional */}
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-500 text-sm italic"> {totalBudget <= 0 ? "Insira um orçamento total." : "Ajuste as alocações."} </div>
                            )}
                        </CardContent>
                    </Card>

                     <Card className={cn(cardStyle)}>
                         <CardHeader className="p-0 pb-3 mb-3 border-b border-[#1E90FF]/20">
                            <CardTitle className={cn(titleStyle)} style={{ textShadow: `0 0 6px ${neonColor}` }}>Valores Calculados</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className={cn(insetCardStyle)}> <span className="text-xs font-medium text-gray-300 flex items-center gap-1.5"><TrendingUp className="h-4 w-4" style={{filter: `drop-shadow(0 0 3px ${COLORS[0]})`}}/> Tráfego</span> <span className="block text-right font-semibold text-white text-sm">{formatCurrency(calculatedValues.trafficCost)}</span> </div>
                            <div className={cn(insetCardStyle)}> <span className="text-xs font-medium text-gray-300 flex items-center gap-1.5"><Target className="h-4 w-4" style={{filter: `drop-shadow(0 0 3px ${COLORS[1]})`}}/> Criativos</span> <span className="block text-right font-semibold text-white text-sm">{formatCurrency(calculatedValues.creativeCost)}</span> </div>
                            <div className={cn(insetCardStyle)}> <span className="text-xs font-medium text-gray-300 flex items-center gap-1.5"><ClipboardList className="h-4 w-4" style={{filter: `drop-shadow(0 0 3px ${COLORS[2]})`}}/> Operacional</span> <span className="block text-right font-semibold text-white text-sm">{formatCurrency(calculatedValues.operationalCostValue)}</span> </div>
                            <div className={cn(insetCardStyle)}> <span className="text-xs font-medium text-gray-300 flex items-center gap-1.5"><DollarSign className="h-4 w-4" style={{filter: `drop-shadow(0 0 3px ${COLORS[3]})`}}/> Lucro</span> <span className="block text-right font-semibold text-white text-sm">{formatCurrency(calculatedValues.expectedProfit)}</span> </div>
                             {calculatedValues.unallocated > 0.01 && (
                                 <div className={cn(insetCardStyle, "sm:col-span-2 bg-[#141414]/30 border border-dashed border-[#9370DB]/50")}> <span className="text-xs font-medium text-gray-400">Não Alocado</span> <span className="block text-right font-semibold text-gray-400 text-sm">{formatCurrency(calculatedValues.unallocated)}</span> </div>
                             )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    </Layout>
  );
}