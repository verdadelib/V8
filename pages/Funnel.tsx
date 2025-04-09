// C:\Users\ADM\Desktop\USB MKT PRO V3\pages\Funnel.tsx
import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Layout from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Info, Loader2, TrendingUp, DollarSign, Users, MousePointerClick, Percent, Target, Filter, TrendingDown, HelpCircle, LineChart, BarChartHorizontal } from 'lucide-react'; // Add icons
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

// --- Interfaces e Funções Auxiliares ---
interface FunnelStage {
    name: string;
    value: number;
    displayValue: string; // Valor formatado para exibição
    color: string;
}
const formatCurrency = (value: number): string => {
     if (isNaN(value)) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
const formatNumber = (value: number): string => {
    if (isNaN(value)) return '0';
    return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}
interface FunnelState { leads: number; ctr: number; conversionRate: number; avgTicket: number; cpc: number; } // Keep original state for LTV compatibility if needed
interface LtvState { avgRevenuePerUser: number; churnRate: number; avgLifespan: number; ltv: number; }
interface CampaignMetrics { costPerLead: number; conversionRate: number; averageSaleValue: number; } // For Projection compatibility if needed


export default function FunnelPage() {
    const { toast } = useToast();

    // State para Inputs
    const [clientName, setClientName] = useState("Cliente Exemplo");
    const [productName, setProductName] = useState("Produto Exemplo");
    const [dailyInvestment, setDailyInvestment] = useState(279.70);
    const [cpc, setCpc] = useState(1.95);
    const [productPrice, setProductPrice] = useState(97.00);
    const [organicReach, setOrganicReach] = useState(12000);
    const [reachToClickConversion, setReachToClickConversion] = useState(2.0); // % Alcance -> Clique
    const [siteConversionRate, setSiteConversionRate] = useState(2.5); // % Visitante -> Venda

    // State para Resultados
    const [funnelData, setFunnelData] = useState<FunnelStage[]>([]);
    const [volume, setVolume] = useState({ daily: 0, weekly: 0, monthly: 0 });
    const [revenue, setRevenue] = useState({ daily: 0, weekly: 0, monthly: 0 });
    const [profit, setProfit] = useState({ daily: 0, weekly: 0, monthly: 0 });
    const [isCalculating, setIsCalculating] = useState(false);

    // LTV State (Mantido por enquanto)
    const [ltvState, setLtvState] = useState<LtvState>({ avgRevenuePerUser: 20, churnRate: 5, avgLifespan: 0, ltv: 0 });

    // --- Constantes de Estilo ---
    const neonColor = '#1E90FF';
    const neonColorMuted = '#4682B4';
    const neonGreenColor = '#32CD32';
    const neonRedColor = '#FF4444';
    const cardStyle = "bg-[#141414]/80 backdrop-blur-sm shadow-[5px_5px_10px_rgba(0,0,0,0.4),-5px_-5px_10px_rgba(255,255,255,0.05)] rounded-lg border border-[hsl(var(--border))]/30";
    const neumorphicInputStyle = "bg-[#141414] text-white shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] placeholder:text-gray-500 border border-[hsl(var(--border))]/20 focus:ring-2 focus:ring-[hsl(var(--primary))] focus:ring-offset-2 focus:ring-offset-[#0e1015] h-8 text-sm px-2 py-1";
    const primaryButtonStyle = `bg-gradient-to-r from-[hsl(var(--primary))] to-[${neonColorMuted}] hover:from-[${neonColorMuted}] hover:to-[hsl(var(--primary))] text-primary-foreground font-semibold shadow-[0_4px_10px_rgba(30,144,255,0.3)] transition-all duration-300 ease-in-out transform hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0e1015] focus:ring-[#5ca2e2]`;
    const neumorphicButtonStyle = "bg-[#141414] border-none text-white shadow-[3px_3px_6px_rgba(0,0,0,0.3),-3px_-3px_6px_rgba(255,255,255,0.05)] hover:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] hover:bg-[#1E90FF]/80 active:scale-[0.98] active:brightness-95 transition-all duration-150 ease-out h-9 px-4 text-sm"; // Para o botão Reset
    const labelStyle = "text-xs text-gray-300 mb-0.5";
    const valueStyle = "font-semibold text-white text-sm";
    const titleStyle = "text-base font-semibold text-white";
    const summaryTitleStyle = "text-xs font-bold text-white mb-0.5";
    const insetCardStyle = "bg-[#141414]/50 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.3),inset_-1px_-1px_2px_rgba(255,255,255,0.03)] rounded-md border-none p-3 text-center"; // Para LTV
    const funnelColors = ['#1E90FF', '#22C55E', '#3abf9a', '#FACC15', '#F97316', '#FF5722']; // Cores para o SVG
    const customSliderClass = cn(
        "relative flex w-full touch-none select-none items-center group py-1",
        "[&_[data-radix-slider-track]]:relative [&_[data-radix-slider-track]]:h-2 [&_[data-radix-slider-track]]:w-full [&_[data-radix-slider-track]]:grow [&_[data-radix-slider-track]]:overflow-hidden [&_[data-radix-slider-track]]:rounded-full [&_[data-radix-slider-track]]:bg-gray-800/60 [&_[data-radix-slider-track]]:shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)]",
        "[&_[data-radix-slider-range]]:absolute [&_[data-radix-slider-range]]:h-full [&_[data-radix-slider-range]]:rounded-full [&_[data-radix-slider-range]]:bg-[var(--slider-color)]",
        "[&_[data-radix-slider-thumb]]:block [&_[data-radix-slider-thumb]]:h-4 [&_[data-radix-slider-thumb]]:w-4 [&_[data-radix-slider-thumb]]:rounded-full [&_[data-radix-slider-thumb]]:border-2 [&_[data-radix-slider-thumb]]:border-gray-900/50 [&_[data-radix-slider-thumb]]:bg-gray-300",
        "[&_[data-radix-slider-thumb]]:shadow-[1.5px_1.5px_3px_rgba(0,0,0,0.4),-1px_-1px_2px_rgba(255,255,255,0.1)]",
        "[&_[data-radix-slider-thumb]]:transition-transform [&_[data-radix-slider-thumb]]:duration-100",
        "[&_[data-radix-slider-thumb]]:focus-visible:outline-none [&_[data-radix-slider-thumb]]:focus-visible:ring-2 [&_[data-radix-slider-thumb]]:focus-visible:ring-offset-1 [&_[data-radix-slider-thumb]]:focus-visible:ring-[var(--slider-color)]",
        "[&_[data-radix-slider-thumb]]:disabled:pointer-events-none [&_[data-radix-slider-thumb]]:disabled:opacity-50",
        "hover:[&_[data-radix-slider-thumb]]:scale-110 hover:[&_[data-radix-slider-thumb]]:border-[var(--slider-color)]"
    );
    const primaryIconStyle = { filter: `drop-shadow(0 0 3px ${neonColor})` };
    // --- End Style constants ---

    // --- Handlers e Lógica ---
    const handleSliderChange = (setter: React.Dispatch<React.SetStateAction<number>>) => (value: number[]) => { setter(value[0]); };
    const handleInputChange = (setter: React.Dispatch<React.SetStateAction<number>>, min: number, max: number, isPercent: boolean = false) => (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(',', '.'); let numValue: number;
        if (value === "" || value === "-") { setter(0); return; }
        if (value.endsWith('.') && !value.substring(0, value.length - 1).includes('.')) { return; }
        numValue = parseFloat(value);
        if (isNaN(numValue)) { numValue = 0; }
        numValue = Math.max(min, Math.min(isPercent ? 100 : max, numValue));
        setter(numValue);
    };

    const calculateFunnelMetrics = useCallback(() => {
        setIsCalculating(true);
        try {
            const conversaoCliquesDecimal = (reachToClickConversion || 0) / 100;
            const conversaoSiteDecimal = (siteConversionRate || 0) / 100;
            const cliquesPagos = cpc > 0 ? (dailyInvestment || 0) / cpc : 0;
            const visitantesPagos = cliquesPagos;
            const visitantesOrganicos = (organicReach || 0) * conversaoCliquesDecimal;
            const totalVisitantes = visitantesPagos + visitantesOrganicos;
            const vendasDiarias = totalVisitantes * conversaoSiteDecimal;
            const faturamentoDiario = vendasDiarias * (productPrice || 0);
            const lucroDiario = faturamentoDiario - (dailyInvestment || 0);

            setVolume({ daily: vendasDiarias, weekly: vendasDiarias * 7, monthly: vendasDiarias * 30 });
            setRevenue({ daily: faturamentoDiario, weekly: faturamentoDiario * 7, monthly: faturamentoDiario * 30 });
            setProfit({ daily: lucroDiario, weekly: lucroDiario * 7, monthly: lucroDiario * 30 });

            setFunnelData([
                { name: "Investimento", value: dailyInvestment || 0, displayValue: `${formatCurrency(dailyInvestment || 0)}/d`, color: funnelColors[0] },
                { name: "Visit. Pagos", value: visitantesPagos, displayValue: `${formatNumber(visitantesPagos)}/d`, color: funnelColors[1] },
                { name: "Visit. Orgân.", value: visitantesOrganicos, displayValue: `${formatNumber(visitantesOrganicos)}/d`, color: funnelColors[2] },
                { name: "Total Visit.", value: totalVisitantes, displayValue: `${formatNumber(totalVisitantes)}/d`, color: funnelColors[3] },
                { name: "Vendas", value: vendasDiarias, displayValue: `${formatNumber(vendasDiarias)}/d`, color: funnelColors[4] },
                { name: "Faturamento", value: faturamentoDiario, displayValue: `${formatCurrency(faturamentoDiario)}/d`, color: funnelColors[5] },
            ]);
        } catch (error) {
            console.error("Erro no cálculo do funil:", error);
            toast({ title: "Erro de Cálculo", description: "Não foi possível calcular o funil.", variant: "destructive" });
        } finally {
            setTimeout(() => setIsCalculating(false), 300);
        }
    }, [dailyInvestment, cpc, productPrice, organicReach, reachToClickConversion, siteConversionRate, toast]);

    // --- LTV Calculation (Mantido) ---
     const calculateLtv = useCallback(() => {
        const churnDecimal = (ltvState.churnRate || 0) / 100;
        const avgLifespan = churnDecimal > 0 ? 1 / churnDecimal : 0;
        const ltv = (ltvState.avgRevenuePerUser || 0) * avgLifespan;
        setLtvState(prevState => ({ ...prevState, avgLifespan, ltv }));
    }, [ltvState.avgRevenuePerUser, ltvState.churnRate]);

    useEffect(() => { calculateFunnelMetrics(); }, [calculateFunnelMetrics]);
    useEffect(() => { calculateLtv(); }, [calculateLtv]);

    // --- LTV Handlers (Mantidos) ---
    const handleLtvChange = (field: keyof Omit<LtvState, 'avgLifespan' | 'ltv'>) => (value: number) => { setLtvState(prevState => ({ ...prevState, [field]: value })); };
    const handleLtvInputChange = (setter: Function, min: number, max: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = event.target.value; let numericValue: number;
        if (rawValue === '') { setter(min); return; }
        const normalizedValue = rawValue.replace(',', '.');
        if ((normalizedValue.match(/\./g) || []).length > 1) { return; }
        numericValue = parseFloat(normalizedValue);
        if (isNaN(numericValue) && !normalizedValue.endsWith('.')) { return; }
        if (!isNaN(numericValue)) { numericValue = Math.max(min, Math.min(max, numericValue)); setter(numericValue); }
    };

    const resetFunnel = () => {
        setDailyInvestment(279.70); setCpc(1.95); setProductPrice(97.00); setOrganicReach(12000); setReachToClickConversion(2.0); setSiteConversionRate(2.5);
        setLtvState({ avgRevenuePerUser: 20, churnRate: 5, avgLifespan: 0, ltv: 0 });
        toast({ title: "Simulador Resetado", description: "Valores retornaram ao padrão." });
        // calculateFunnelMetrics will be called automatically by useEffect
    };

    // --- Tooltip Label Component (Reutilizado) ---
    const tooltips = { /* Mantenha ou atualize os tooltips conforme necessário */ }; // Omitido para brevidade
    const TooltipLabel = ({ label, tooltipKey }: { label: string, tooltipKey: keyof typeof tooltips }) => (
        <TooltipProvider> <Tooltip delayDuration={150}>
            <TooltipTrigger type="button" className="flex items-center justify-start text-left cursor-help"> {/* Alinhado à esquerda */}
                <Label htmlFor={tooltipKey} className={cn(labelStyle, "mr-1")} style={{ textShadow: `0 0 4px ${neonColorMuted}` }}>{label}</Label>
                <HelpCircle className="h-3 w-3 text-gray-500" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs bg-[#1e2128] border border-[#1E90FF]/30 text-white p-1.5 rounded shadow-lg">
                <p>{tooltips[tooltipKey] || "Tooltip não definido"}</p>
            </TooltipContent>
        </Tooltip> </TooltipProvider>
    );

    // --- Input Panel Component (Reutilizado) ---
    interface InputConfig { label: string; min: number; max: number; defaultValue: number; isPercent?: boolean; tooltip: string; state: number; setter: React.Dispatch<React.SetStateAction<number>>; }
    const renderInputPanel = (title: string, inputs: InputConfig[]) => (
        <Card key={title} className={cn(cardStyle, "mb-3 p-3")}> {/* Padding ajustado */}
            <CardHeader className="p-0 pb-1.5 mb-2 border-b border-[#1E90FF]/20">
                <CardTitle className={cn(titleStyle, "text-center text-sm font-bold")} style={{ textShadow: `0 0 4px ${neonColor}` }}> {title} </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-0">
                {inputs.map((input) => (
                    <div key={input.label} className="space-y-1">
                        <div className="flex justify-between items-center">
                            <TooltipLabel label={input.label} tooltipKey={input.label.toLowerCase().replace(/[^a-z0-9]/g, '') as keyof typeof tooltips} /> {/* Chave simplificada */}
                            <span className={cn(valueStyle, "text-xs")}>{input.state.toLocaleString('pt-BR', { maximumFractionDigits: input.isPercent ? 1 : 2 })}{input.isPercent ? '%' : ''}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Slider aria-label={input.label} value={[Number(input.state) || 0]} onValueChange={handleSliderChange(input.setter)} min={input.min} max={input.max} step={input.isPercent ? 0.1 : (input.max - input.min > 1000 ? 10 : 1)} className={cn(customSliderClass, "flex-grow")} style={{ '--slider-color': neonColor } as React.CSSProperties} />
                            <Input id={input.label.replace(/\s+/g, '-')} type="text" inputMode="decimal" value={input.state.toString()} onChange={handleInputChange(input.setter, input.min, input.max, input.isPercent)} className={cn(neumorphicInputStyle, "w-16 shrink-0")} /> {/* Reduced width */}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );

    // --- Input Configurations (Mantido) ---
    const inputConfigs: { title: string; inputs: InputConfig[] }[] = [
        { title: "Métricas Tráfego Pago", inputs: [ { label: "Investimento diário (R$)", min: 0, max: 2000, defaultValue: 279.70, tooltip: "Investimento diário em anúncios.", state: dailyInvestment, setter: setDailyInvestment }, { label: "CPC (R$)", min: 0.25, max: 10, defaultValue: 1.95, tooltip: "Custo médio por clique.", state: cpc, setter: setCpc }, { label: "Preço Produto (R$)", min: 0, max: 1000, defaultValue: 97.00, tooltip: "Preço de venda.", state: productPrice, setter: setProductPrice }, ] },
        { title: "Métricas Tráfego Orgânico", inputs: [ { label: "Alcance Orgânico", min: 0, max: 50000, defaultValue: 12000, tooltip: "Pessoas alcançadas organicamente.", state: organicReach, setter: setOrganicReach }, { label: "Conv. Alcance->Clique (%)", min: 0.5, max: 10, defaultValue: 2.0, isPercent: true, tooltip: "% de pessoas que clicam.", state: reachToClickConversion, setter: setReachToClickConversion }, { label: "Taxa Conversão Site (%)", min: 0.5, max: 10, defaultValue: 2.5, isPercent: true, tooltip: "% de visitantes que compram.", state: siteConversionRate, setter: setSiteConversionRate }, ] },
    ];
     const ltvInputsConfig = [
        { label: 'Receita Média/Mês (R$)', state: ltvState.avgRevenuePerUser, setter: handleLtvChange('avgRevenuePerUser'), min: 0, max: 1000, step: 1, icon: DollarSign, isPercent: false, tooltip: tooltips.avgRevenuePerUser },
        { label: 'Churn Mensal (%)', state: ltvState.churnRate, setter: handleLtvChange('churnRate'), min: 0, max: 100, step: 0.1, icon: TrendingDown, isPercent: true, tooltip: tooltips.churnRate },
    ];

    // --- SVG Funnel Renderer (Usuário Forneceu) ---
     const renderFunnelSVG = () => {
        if (funnelData.length === 0) return null;
        const svgHeight = 260; // Ligeiramente menor
        const svgWidth = 300; // Mais estreito
        const maxRectWidth = svgWidth * 0.65;
        const minRectWidth = svgWidth * 0.10;
        const rectHeight = svgHeight / (funnelData.length + 1.2); // Mais espaço
        const spacing = rectHeight * 0.12;
        const validStages = funnelData.filter(stage => stage.value > 0);
        const visualMaxValue = validStages.length > 0 ? Math.max(...validStages.map(d => d.value)) : 1;
        if (visualMaxValue <= 0) return <div className="flex items-center justify-center h-[260px] text-gray-500 text-xs italic">Valores precisam ser positivos.</div>;

        const getWidth = (value: number) => {
             if (value <= 0) return minRectWidth;
             const proportion = value / visualMaxValue;
             return minRectWidth + (maxRectWidth - minRectWidth) * proportion;
         };

        return (
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
                {funnelData.map((stage, index) => {
                    const yPos = index * (rectHeight + spacing) + spacing;
                    const currentWidth = getWidth(stage.value);
                    let nextPositiveStageIndex = -1;
                    for (let j = index + 1; j < funnelData.length; j++) { if (funnelData[j].value > 0) { nextPositiveStageIndex = j; break; } }
                    const bottomValue = nextPositiveStageIndex !== -1 ? funnelData[nextPositiveStageIndex].value : (stage.value > 0 ? stage.value : 0);
                    const bottomWidth = getWidth(bottomValue);
                    const x1 = (svgWidth - currentWidth) / 2; const x2 = x1 + currentWidth; const x3 = (svgWidth - bottomWidth) / 2; const x4 = x3 + bottomWidth; const y2 = yPos + rectHeight; const points = `${x1},${yPos} ${x2},${yPos} ${x4},${y2} ${x3},${y2}`;
                    return (
                        <g key={stage.name}>
                            <polygon points={points} fill={stage.color} fillOpacity={0.8} style={{ filter: `drop-shadow(1px 2px 3px rgba(0,0,0,0.4))` }} />
                            {/* Ocultar texto dentro do SVG para não poluir */}
                            {/* <text x={svgWidth / 2} y={yPos + rectHeight / 2} textAnchor="middle" dominantBaseline="central" fill="#ffffff" fontSize="9" fontWeight="bold" style={{ textShadow: '0.5px 0.5px 1.5px rgba(0,0,0,0.7)' }}>
                                <tspan x={svgWidth / 2} dy="-0.5em">{stage.name}</tspan>
                                <tspan x={svgWidth / 2} dy="1.2em">{stage.displayValue}</tspan>
                            </text> */}
                        </g>
                    );
                })}
            </svg>
        );
    };

    // --- RENDERIZAÇÃO ---
    return (
        <Layout>
             <Head> <title>Simulador de Funil - USBMKT</title> </Head>
             <div className='space-y-4'>
                 <h1 className="text-2xl font-black text-white mb-4" style={{ textShadow: `0 0 8px ${neonColor}` }}> Simulador de Funil e LTV </h1>
                 <Card className={cn(cardStyle, "mb-3 p-3")}>
                     <CardContent className="p-0">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                             <div className="space-y-0.5">
                                 <Label htmlFor="clientName" className={cn(labelStyle)} style={{ textShadow: `0 0 4px ${neonColor}` }}> Cliente </Label>
                                 <Input id="clientName" type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className={cn(neumorphicInputStyle)} placeholder="Nome do cliente" />
                             </div>
                             <div className="space-y-0.5">
                                 <Label htmlFor="productName" className={cn(labelStyle)} style={{ textShadow: `0 0 4px ${neonColor}` }}> Produto </Label>
                                 <Input id="productName" type="text" value={productName} onChange={(e) => setProductName(e.target.value)} className={cn(neumorphicInputStyle)} placeholder="Nome do produto" />
                             </div>
                         </div>
                     </CardContent>
                 </Card>

                 <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                     {/* Coluna de Inputs */}
                     <div className="lg:col-span-2 space-y-0">
                         {inputConfigs.map(panel => renderInputPanel(panel.title, panel.inputs))}
                         {/* Card LTV Inputs */}
                         <Card className={cn(cardStyle, "mb-3 p-3")}>
                            <CardHeader className="p-0 pb-1.5 mb-2 border-b border-[#1E90FF]/20">
                                <CardTitle className={cn(titleStyle, "text-center text-sm font-bold")} style={{ textShadow: `0 0 4px ${neonColor}` }}>Entradas LTV</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 p-0">
                                {ltvInputsConfig.map((input) => (
                                    <div key={input.label} className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <TooltipLabel label={input.label} tooltipKey={input.label.toLowerCase().replace(/[^a-z0-9]/g, '') as keyof typeof tooltips} />
                                            <span className={cn(valueStyle, "text-xs")}>{input.state.toLocaleString('pt-BR', { maximumFractionDigits: input.isPercent ? 1 : 2 })}{input.isPercent ? '%' : ''}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Slider aria-label={input.label} value={[Number(input.state) || 0]} onValueChange={handleSliderChange(input.setter)} min={input.min} max={input.max} step={input.step} className={cn(customSliderClass, "flex-grow")} style={{ '--slider-color': neonColor } as React.CSSProperties} />
                                            <Input type="text" inputMode="decimal" value={input.state.toString()} onChange={handleLtvInputChange(input.setter, input.min, input.max)} className={cn(neumorphicInputStyle, "w-16 shrink-0")} />
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                         </Card>
                          <Button className={cn(primaryButtonStyle, "w-full mt-3 h-9 text-sm")} onClick={calculateFunnelMetrics} disabled={isCalculating}> {isCalculating ? <Loader2 className="h-4 w-4 animate-spin mr-1.5"/> : null} {isCalculating ? "Calculando..." : "Recalcular"} </Button>
                          <Button variant="outline" onClick={resetFunnel} className={cn(neumorphicButtonStyle, "w-full mt-2")}>Resetar</Button>
                     </div>

                     {/* Coluna de Resultados (Funil e Resumo) */}
                     <div className="lg:col-span-3 space-y-3">
                         {/* Card Funil (SVG + Dados ao lado) */}
                         <Card className={cn(cardStyle, "p-3")}>
                             <CardHeader className="p-0 pb-1.5 mb-2 border-b border-[#1E90FF]/20">
                                 <CardTitle className={cn(titleStyle, "text-center text-sm font-bold truncate")} style={{ textShadow: `0 0 4px ${neonColor}` }}> {`${clientName || "Cliente"} | ${productName || "Produto"}`} </CardTitle>
                             </CardHeader>
                             <CardContent className="p-0 grid grid-cols-1 md:grid-cols-2 gap-3 items-center min-h-[280px]"> {/* Grid SVG + Dados */}
                                 {/* SVG */}
                                 <div className="w-full h-full flex items-center justify-center md:border-r border-[#1E90FF]/15 pr-2">
                                     {isCalculating ? <Loader2 className="h-8 w-8 animate-spin text-[#1E90FF]"/> : renderFunnelSVG()}
                                 </div>
                                 {/* Dados das Etapas */}
                                 <div className="space-y-1.5 text-xs md:pl-2">
                                      <h5 className="text-[11px] font-semibold text-gray-300 mb-1 uppercase tracking-wider" style={{ textShadow: `0 0 4px ${neonColorMuted}` }}>Etapas do Funil</h5>
                                      {isCalculating ? (
                                         <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-gray-400"/></div>
                                     ) : funnelData.length > 0 ? (
                                         funnelData.map((stage, index) => (
                                             <div key={stage.name} className="flex items-center justify-between gap-2 border-b border-[#1E90FF]/10 pb-1">
                                                 <span className="flex items-center text-gray-300">
                                                     <span className="w-2 h-2 rounded-full mr-1.5 shrink-0" style={{ backgroundColor: stage.color, filter: `drop-shadow(0 0 2px ${stage.color})` }}></span>
                                                     {stage.name}
                                                 </span>
                                                 <span className="font-medium text-white" style={{ textShadow: `0 0 4px ${neonColor}` }}>{stage.displayValue}</span>
                                             </div>
                                         ))
                                     ) : (
                                         <p className="text-gray-500 italic text-center py-4">Nenhum dado para exibir.</p>
                                     )}
                                 </div>
                             </CardContent>
                         </Card>

                         {/* Card de Resumo */}
                         <Card className={cn(cardStyle)}>
                             <CardHeader className="p-0 pt-2 pb-1.5 mb-2 border-b border-[#1E90FF]/20">
                                <CardTitle className={cn(titleStyle, "text-center text-sm font-bold")} style={{ textShadow: `0 0 4px ${neonColor}` }}>Resumo Financeiro</CardTitle>
                             </CardHeader>
                             <CardContent className="p-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                                {isCalculating ? (
                                    <div className="sm:col-span-3 flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-gray-400"/></div>
                                ) : (
                                    <>
                                         <div> <h4 className={cn(summaryTitleStyle)} style={{ textShadow: `0 0 4px ${neonColor}` }}> 📈 Volume </h4> <p className={cn(labelStyle, "mt-0.5")}> D: <span className={cn(valueStyle)}>{formatNumber(volume.daily)}</span> </p> <p className={cn(labelStyle)}> S: <span className={cn(valueStyle)}>{formatNumber(volume.weekly)}</span> </p> <p className={cn(labelStyle)}> M: <span className={cn(valueStyle)}>{formatNumber(volume.monthly)}</span> </p> </div>
                                         <div> <h4 className={cn(summaryTitleStyle)} style={{ textShadow: `0 0 4px ${neonColor}` }}> 💰 Faturamento </h4> <p className={cn(labelStyle, "mt-0.5")}> D: <span className={cn(valueStyle)}>{formatCurrency(revenue.daily)}</span> </p> <p className={cn(labelStyle)}> S: <span className={cn(valueStyle)}>{formatCurrency(revenue.weekly)}</span> </p> <p className={cn(labelStyle)}> M: <span className={cn(valueStyle)}>{formatCurrency(revenue.monthly)}</span> </p> </div>
                                         <div> <h4 className={cn(summaryTitleStyle)} style={{ textShadow: `0 0 4px ${neonColor}` }}> 💎 Lucro </h4> <p className={cn(labelStyle, "mt-0.5")}> D: <span className={cn(valueStyle)}>{formatCurrency(profit.daily)}</span> </p> <p className={cn(labelStyle)}> S: <span className={cn(valueStyle)}>{formatCurrency(profit.weekly)}</span> </p> <p className={cn(labelStyle)}> M: <span className={cn(valueStyle)}>{formatCurrency(profit.monthly)}</span> </p> </div>
                                     </>
                                )}
                             </CardContent>
                         </Card>

                         {/* Card LTV Results (Mantido abaixo) */}
                          <Card className={cn(cardStyle)}>
                             <CardHeader className="p-0 pt-2 pb-1.5 mb-2 border-b border-[#1E90FF]/20">
                                <CardTitle className={cn(titleStyle, "flex items-center justify-center gap-2 text-sm font-bold")} style={{ textShadow: `0 0 4px ${neonColor}` }}><TrendingUp className="h-4 w-4" style={primaryIconStyle} /> Resultados LTV</CardTitle>
                            </CardHeader>
                             <CardContent className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className={cn(insetCardStyle)}>
                                    {/* Correção: Usar a chave correta ou simplificar */}
                                    <TooltipLabel label="Tempo Médio de Vida" tooltipKey={'avgLifespan'} />
                                    <p className="text-lg font-semibold text-white" style={{ textShadow: `0 0 5px ${neonColor}` }}>{ltvState.avgLifespan > 0 ? `${ltvState.avgLifespan.toFixed(1)} meses` : 'N/A'}</p>
                                </div>
                                <div className={cn(insetCardStyle)}>
                                    {/* Correção: Usar a chave correta ou simplificar */}
                                    <TooltipLabel label="LTV Estimado (R$)" tooltipKey={'ltv'} />
                                    <p className="text-lg font-semibold text-green-400" style={{ textShadow: `0 0 5px ${neonGreenColor}` }}>{ltvState.ltv > 0 ? ltvState.ltv.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}</p>
                                </div>
                            </CardContent>
                         </Card>
                     </div>
                 </div>
             </div>
         </Layout>
    );
}