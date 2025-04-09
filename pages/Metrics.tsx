// pages/Metrics.tsx
import React, { useState, useEffect } from 'react';
import Head from 'next/head'; // Import Head
import Layout from '@/components/layout';
import { list as listCampaigns } from '@/entities/Campaign';
import { Campaign } from '@/entities/Campaign'; // Import Campaign type if needed for listCampaigns return type
import {
  Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { RefreshCw, Download, BarChart2, PieChart as PieChartIcon, LineChart as LineChartIcon, ArrowUpCircle, ArrowDownCircle, Activity } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Remove unused imports if any (like Progress, ScrollArea, Target)
// import { Progress } from "@/components/ui/progress";
// import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils"; // Import cn

export default function MetricsPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]); // Use Campaign[] type
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>(""); // Use string for ID consistency
    const [timeframe, setTimeframe] = useState("30d");
    const [chartType, setChartType] = useState("line");
    const [metricType, setMetricType] = useState("performance");
    const [metricsData, setMetricsData] = useState<any[]>([]); // Use any[] or a specific type
    const [keyMetrics, setKeyMetrics] = useState({ clicks: 0, impressions: 0, conversions: 0, ctr: 0, cpc: 0, conversionRate: 0, costPerConversion: 0, revenue: 0, roi: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    // Remove unused insights state if generateInsights is simplified
    // const [insights, setInsights] = useState([]);
    const { toast } = useToast();

    // --- Style constants (Copied and adapted from Budget/Campaign) ---
    const neonColor = '#1E90FF';
    const cardStyle = "bg-[#141414]/80 backdrop-blur-sm shadow-[5px_5px_10px_rgba(0,0,0,0.4),-5px_-5px_10px_rgba(255,255,255,0.05)] rounded-lg border-none";
    const neumorphicInputStyle = "bg-[#141414] text-white shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] placeholder:text-gray-500 border-none focus:ring-2 focus:ring-[#1E90FF] focus:ring-offset-2 focus:ring-offset-[hsl(var(--background))]";
    const neumorphicButtonStyle = "bg-[#141414] border-none text-white shadow-[3px_3px_6px_rgba(0,0,0,0.3),-3px_-3px_6px_rgba(255,255,255,0.05)] hover:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] hover:bg-[#1E90FF]/80 active:scale-[0.98] active:brightness-95 transition-all duration-150 ease-out";
    const neumorphicButtonPrimaryStyle = cn(neumorphicButtonStyle, "bg-[#1E90FF]/80 hover:bg-[#1E90FF]/100"); // Specific style for primary active button
    const labelStyle = "text-sm text-gray-300";
    const titleStyle = "text-lg font-semibold text-white";
    // --- End Style constants ---

    useEffect(() => {
        loadCampaigns();
    }, []);

    useEffect(() => {
        if (selectedCampaignId) {
            loadMetricsData();
            // generateInsights(); // Keep if needed, otherwise remove
        }
     // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCampaignId, timeframe, metricType]); // Dependency array corrected

    const loadCampaigns = async () => {
        setLoading(true);
        try {
            // Assuming listCampaigns returns Campaign[]
            const data: Campaign[] = await listCampaigns();
            setCampaigns(data);
            if (data.length > 0 && !selectedCampaignId) {
                setSelectedCampaignId(data[0].id.toString());
            }
        } catch (error) {
            console.error('Erro ao carregar campanhas:', error);
             toast({ title: "Erro", description: "Falha ao carregar campanhas.", variant: "destructive" });
        } finally {
            // Delay setting loading to false slightly AFTER potential selection update
            setTimeout(() => setLoading(false), 100);
        }
    };

    // --- MOCK Data Loading - Replace with actual API call ---
    const loadMetricsData = () => {
        if (!selectedCampaignId) return; // Don't load if no campaign selected
        setRefreshing(true);
        setMetricsData([]); // Clear previous data
        console.log(`Carregando métricas mock para Campanha ${selectedCampaignId}, Período ${timeframe}, Tipo ${metricType}`);
        const days = parseInt(timeframe.replace('d', ''), 10);
        try {
            // Simulate API call delay
            setTimeout(() => {
                const data = [];
                const campaignFactor = Math.random() * 0.5 + 0.75; // Simulate different campaign performance

                for (let i = days -1 ; i >= 0; i--) { // Corrected loop for date generation
                    const date = subDays(new Date(), i);
                     // Adjust base values based on metricType for more distinct patterns
                     let baseClicks, baseImpressions, baseConversions, baseCost, baseRevenue;
                     if (metricType === "costs") {
                         baseClicks = (60 + Math.floor(Math.random() * 30)) * campaignFactor;
                         baseCost = baseClicks * (1.0 + Math.random() * 0.6); // Higher cost variation
                         baseImpressions = baseClicks * (8 + Math.floor(Math.random() * 4));
                         baseConversions = Math.max(1, Math.floor(baseClicks * (0.03 + Math.random() * 0.02)));
                         baseRevenue = baseConversions * (70 + Math.random() * 30);
                     } else if (metricType === "revenue") {
                         baseClicks = (120 + Math.floor(Math.random() * 60)) * campaignFactor;
                         baseConversions = Math.max(2, Math.floor(baseClicks * (0.06 + Math.random() * 0.04))); // Higher conversion variation
                         baseRevenue = baseConversions * (90 + Math.random() * 50); // Higher revenue variation
                         baseImpressions = baseClicks * (12 + Math.floor(Math.random() * 6));
                         baseCost = baseClicks * (0.7 + Math.random() * 0.3);
                     } else { // performance
                         baseClicks = (100 + Math.floor(Math.random() * 50)) * campaignFactor;
                         baseImpressions = baseClicks * (10 + Math.floor(Math.random() * 5));
                         baseConversions = Math.max(1, Math.floor(baseClicks * (0.05 + Math.random() * 0.03)));
                         baseCost = baseClicks * (0.8 + Math.random() * 0.4);
                         baseRevenue = baseConversions * (80 + Math.random() * 40);
                     }

                    // Calculate derived metrics safely
                    const ctr = (baseImpressions > 0) ? (baseClicks / baseImpressions) * 100 : 0;
                    const cpc = (baseClicks > 0) ? baseCost / baseClicks : 0;
                    const conversionRate = (baseClicks > 0) ? (baseConversions / baseClicks) * 100 : 0;
                    const costPerConversion = (baseConversions > 0) ? baseCost / baseConversions : 0;
                    const roi = (baseCost > 0) ? ((baseRevenue - baseCost) / baseCost) * 100 : (baseRevenue > 0 ? Infinity : 0); // Handle ROI for zero cost

                    data.push({
                        date: format(date, 'dd/MM', { locale: ptBR }), // Keep format for XAxis
                        clicks: baseClicks,
                        impressions: baseImpressions,
                        conversions: baseConversions,
                        ctr: ctr,
                        cpc: cpc,
                        conversionRate: conversionRate,
                        costPerConversion: costPerConversion,
                        cost: baseCost,
                        revenue: baseRevenue,
                        roi: roi
                    });
                }

                setMetricsData(data);

                // Calculate Key Metrics totals from the generated data
                const totalClicks = data.reduce((sum, item) => sum + item.clicks, 0);
                const totalImpressions = data.reduce((sum, item) => sum + item.impressions, 0);
                const totalConversions = data.reduce((sum, item) => sum + item.conversions, 0);
                const totalCost = data.reduce((sum, item) => sum + item.cost, 0);
                const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);

                 setKeyMetrics({
                    clicks: totalClicks,
                    impressions: totalImpressions,
                    conversions: totalConversions,
                    ctr: (totalImpressions > 0) ? (totalClicks / totalImpressions) * 100 : 0,
                    cpc: (totalClicks > 0) ? totalCost / totalClicks : 0,
                    conversionRate: (totalClicks > 0) ? (totalConversions / totalClicks) * 100 : 0,
                    costPerConversion: (totalConversions > 0) ? totalCost / totalConversions : 0,
                    revenue: totalRevenue,
                    roi: (totalCost > 0) ? ((totalRevenue - totalCost) / totalCost) * 100 : (totalRevenue > 0 ? Infinity : 0)
                });

                setRefreshing(false);
            }, 500); // 500ms delay

        } catch (error) {
            console.error('Erro ao gerar dados mock:', error);
            toast({ title: "Erro", description: "Erro ao gerar métricas.", variant: "destructive" });
            setRefreshing(false);
        }
    };
    // --- End MOCK Data Loading ---

    // Simplified generateInsights or remove if not used
    const generateInsights = () => { /* Placeholder */ };
    const refreshData = () => { if(selectedCampaignId) { loadMetricsData(); /* generateInsights(); */ }};

    // --- getChartData adapted for direct metric access ---
    const getChartData = () => {
        // Return the raw data; filtering/formatting happens in renderChart/config
        return metricsData;
    };

    // --- getChartConfig with correct color references ---
    const getChartConfig = () => {
        const colors = {
            clicks: "#3b82f6", // Blue
            conversions: "#22c55e", // Green
            ctr: "#eab308", // Yellow
            cpc: "#f97316", // Orange
            costPerConversion: "#a855f7", // Purple
            cost: "#ef4444", // Red
            revenue: "#0ea5e9", // Sky Blue
            roi: "#14b8a6" // Teal
        };
        const metrics: { [key: string]: { key: string; name: string; color: string }[] } = {
            performance: [
                { key: "clicks", name: "Cliques", color: colors.clicks },
                { key: "conversions", name: "Conversões", color: colors.conversions },
                { key: "ctr", name: "CTR (%)", color: colors.ctr }
            ],
            costs: [
                { key: "cpc", name: "CPC (R$)", color: colors.cpc },
                { key: "costPerConversion", name: "Custo/Conv. (R$)", color: colors.costPerConversion },
                { key: "cost", name: "Custo Total (R$)", color: colors.cost }
            ],
            revenue: [
                { key: "revenue", name: "Receita (R$)", color: colors.revenue },
                { key: "roi", name: "ROI (%)", color: colors.roi }
            ]
        };
        return metrics[metricType] || metrics.performance; // Fallback
    };

    // --- renderChart with theme adjustments ---
    const renderChart = () => {
        const data = getChartData();
        const config = getChartConfig();
        const axisTickColor = "#a0aec0"; // Tailwind gray-400 approx
        const gridColor = "#1E90FF33"; // Neon blue with alpha
        const tooltipBg = "rgba(20, 20, 20, 0.85)"; // Dark background
        const tooltipBorder = `${neonColor}66`;

        if (!data || data.length === 0) return <div className="flex items-center justify-center h-[400px] text-gray-500">Sem dados para exibir</div>;

        if (chartType === "line") {
            return (
                <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={data} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis dataKey="date" tick={{ fill: axisTickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: axisTickColor, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => typeof v === 'number' ? v.toLocaleString('pt-BR', {maximumFractionDigits: 0}) : v} />
                        <Tooltip
                            contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '6px', backdropFilter: 'blur(4px)', boxShadow: '5px 5px 10px rgba(0,0,0,0.4)' }}
                            labelStyle={{ color: '#a0aec0', fontSize: '11px', marginBottom: '4px' }}
                            itemStyle={{ color: 'white', fontSize: '12px' }}
                            formatter={(value: number, name: string) => [typeof value === 'number' ? value.toFixed(2) : value, name]}
                         />
                        <Legend wrapperStyle={{ color: axisTickColor, fontSize: '11px', paddingTop: '10px' }} />
                        {config.map(metric => (
                            <Line key={metric.key} type="monotone" dataKey={metric.key} name={metric.name} stroke={metric.color} strokeWidth={2.5} dot={false} activeDot={{ r: 6, strokeWidth: 1, fill: metric.color, stroke: '#fff' }} style={{ filter: `drop-shadow(0 0 4px ${metric.color})` }}/>
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            );
        } else if (chartType === "bar") {
             return (
                 <ResponsiveContainer width="100%" height={400}>
                     <BarChart data={data} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                         <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                         <XAxis dataKey="date" tick={{ fill: axisTickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                         <YAxis tick={{ fill: axisTickColor, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => typeof v === 'number' ? v.toLocaleString('pt-BR', {maximumFractionDigits: 0}) : v} />
                         <Tooltip
                            contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '6px', backdropFilter: 'blur(4px)', boxShadow: '5px 5px 10px rgba(0,0,0,0.4)' }}
                            labelStyle={{ color: '#a0aec0', fontSize: '11px', marginBottom: '4px' }}
                            itemStyle={{ color: 'white', fontSize: '12px' }}
                            formatter={(value: number, name: string) => [typeof value === 'number' ? value.toFixed(2) : value, name]}
                         />
                         <Legend wrapperStyle={{ color: axisTickColor, fontSize: '11px', paddingTop: '10px' }} />
                         {config.map(metric => (
                             <Bar key={metric.key} dataKey={metric.key} name={metric.name} fill={metric.color} radius={[3, 3, 0, 0]} fillOpacity={0.8} style={{ filter: `drop-shadow(0 0 3px ${metric.color}88)` }}/>
                         ))}
                     </BarChart>
                 </ResponsiveContainer>
             );
         } else if (chartType === "pie") {
             // Use totals for Pie chart for better representation
            const pieData = config
                .map(metric => {
                    const totalValue = keyMetrics[metric.key as keyof typeof keyMetrics] ?? 0;
                    // Exclude metrics that don't make sense as part of a whole (like percentages, ratios)
                    if (['ctr', 'cpc', 'conversionRate', 'costPerConversion', 'roi'].includes(metric.key)) {
                        return null;
                    }
                    return { name: metric.name, value: totalValue, color: metric.color };
                })
                .filter((d): d is { name: string; value: number; color: string } => d !== null && d.value > 0); // Filter out nulls and zero values

             if (pieData.length === 0) return <div className="flex items-center justify-center h-[400px] text-gray-500">Sem dados agregados para gráfico Pizza</div>;

             return (
                 <ResponsiveContainer width="100%" height={400}>
                     <PieChart>
                         <Pie
                             data={pieData}
                             cx="50%" cy="50%"
                             labelLine={false}
                             label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                             outerRadius={140} // Slightly smaller
                             innerRadius={60} // Doughnut effect
                             fill="#8884d8"
                             dataKey="value"
                             paddingAngle={2}
                             stroke="none" // No border between slices
                             >
                             {pieData.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} style={{ filter: `drop-shadow(0 0 5px ${entry.color})` }}/>
                             ))}
                         </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '6px', backdropFilter: 'blur(4px)', boxShadow: '5px 5px 10px rgba(0,0,0,0.4)' }}
                            labelStyle={{ color: '#a0aec0', fontSize: '11px', marginBottom: '4px' }}
                            itemStyle={{ color: 'white', fontSize: '12px' }}
                            formatter={(value: number, name: string) => [formatMetricValue(name, value), name]} // Use formatMetricValue here
                         />
                          <Legend wrapperStyle={{ color: axisTickColor, fontSize: '11px', paddingTop: '10px' }} />
                     </PieChart>
                 </ResponsiveContainer>
             );
         }
        return null;
    };
    // --- End renderChart ---

    const getKeyMetricStatus = (metric: keyof typeof keyMetrics) => {
        const value = keyMetrics[metric];
        if (isNaN(value) || !isFinite(value)) return 'neutral'; // Handle NaN/Infinity

        switch (metric) {
            case 'ctr': return value > 2 ? 'positive' : value > 1 ? 'neutral' : 'negative';
            case 'cpc': return value < 1 ? 'positive' : value < 2 ? 'neutral' : 'negative';
            case 'conversionRate': return value > 5 ? 'positive' : value > 2 ? 'neutral' : 'negative';
            case 'roi': return value > 200 ? 'positive' : value > 100 ? 'neutral' : 'negative';
            default: return 'neutral';
        }
    };

    const formatMetricValue = (metric: string, value: any): string => {
        const numValue = Number(value);
        if (value === undefined || value === null || isNaN(numValue)) return 'N/A';
        if (!isFinite(numValue)) return value > 0 ? '+Inf' : '-Inf'; // Handle Infinity

        switch (metric.toLowerCase()) { // Use lowercase for robustness
            case 'clicks': case 'impressions': case 'conversions': return numValue.toLocaleString('pt-BR');
            case 'ctr': case 'conversionrate': case 'roi': return `${numValue.toFixed(1)}%`; // Adjusted precision
            case 'cpc': case 'costperconversion': case 'revenue': case 'cost': return `R$ ${numValue.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            default: return numValue.toLocaleString('pt-BR', {maximumFractionDigits: 2}); // Default formatting
        }
    };


    return (
        <Layout>
             <Head> <title>Métricas - USBMKT</title> </Head>
            <div className="space-y-4 p-4 md:p-6"> {/* Reduced overall spacing */}
                <h1 className="text-2xl font-black text-white mb-4" style={{ textShadow: `0 0 8px ${neonColor}` }}>
                    Métricas de Campanha
                </h1>
                <div className="flex flex-col space-y-4"> {/* Reduced spacing */}
                    {/* --- Controls Row --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"> {/* Reduced gap */}
                        {/* Campaign Select Card */}
                         <Card className={cn(cardStyle)}>
                             <CardContent className="p-3"> {/* Reduced padding */}
                                 <Label htmlFor="campaign_select" className={cn(labelStyle, "mb-1 block")} style={{ textShadow: `0 0 4px ${neonColor}` }}>Campanha</Label>
                                 <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId} disabled={loading || campaigns.length === 0} >
                                     <SelectTrigger id="campaign_select" className={cn(neumorphicInputStyle, "w-full h-9")}>
                                         <SelectValue placeholder="Selecione..." />
                                     </SelectTrigger>
                                     <SelectContent className="bg-[#1e2128] border-[#1E90FF]/30 text-white">
                                         {loading ? <SelectItem value="loading" disabled>Carregando...</SelectItem> : campaigns.length === 0 ? <SelectItem value="no-camp" disabled>Nenhuma campanha</SelectItem> : campaigns.map(campaign => ( <SelectItem key={campaign.id} value={campaign.id.toString()} className="hover:bg-[#1E90FF]/20 focus:bg-[#1E90FF]/20"> {campaign.name} </SelectItem> ))}
                                     </SelectContent>
                                 </Select>
                             </CardContent>
                         </Card>
                         {/* Timeframe Select Card */}
                         <Card className={cn(cardStyle)}>
                             <CardContent className="p-3">
                                 <Label htmlFor="timeframe_select" className={cn(labelStyle, "mb-1 block")} style={{ textShadow: `0 0 4px ${neonColor}` }}>Período</Label>
                                 <Select value={timeframe} onValueChange={setTimeframe}>
                                     <SelectTrigger id="timeframe_select" className={cn(neumorphicInputStyle, "w-full h-9")}>
                                         <SelectValue />
                                     </SelectTrigger>
                                     <SelectContent className="bg-[#1e2128] border-[#1E90FF]/30 text-white">
                                         <SelectItem value="7d" className="hover:bg-[#1E90FF]/20 focus:bg-[#1E90FF]/20">Últimos 7 dias</SelectItem>
                                         <SelectItem value="14d" className="hover:bg-[#1E90FF]/20 focus:bg-[#1E90FF]/20">Últimos 14 dias</SelectItem>
                                         <SelectItem value="30d" className="hover:bg-[#1E90FF]/20 focus:bg-[#1E90FF]/20">Últimos 30 dias</SelectItem>
                                         <SelectItem value="90d" className="hover:bg-[#1E90FF]/20 focus:bg-[#1E90FF]/20">Últimos 90 dias</SelectItem>
                                     </SelectContent>
                                 </Select>
                             </CardContent>
                         </Card>
                         {/* Metric Type Select Card */}
                         <Card className={cn(cardStyle)}>
                             <CardContent className="p-3">
                                 <Label htmlFor="metric_type_select" className={cn(labelStyle, "mb-1 block")} style={{ textShadow: `0 0 4px ${neonColor}` }}>Tipo Métrica</Label>
                                 <Select value={metricType} onValueChange={setMetricType}>
                                     <SelectTrigger id="metric_type_select" className={cn(neumorphicInputStyle, "w-full h-9")}>
                                         <SelectValue />
                                     </SelectTrigger>
                                     <SelectContent className="bg-[#1e2128] border-[#1E90FF]/30 text-white">
                                         <SelectItem value="performance" className="hover:bg-[#1E90FF]/20 focus:bg-[#1E90FF]/20">Performance</SelectItem>
                                         <SelectItem value="costs" className="hover:bg-[#1E90FF]/20 focus:bg-[#1E90FF]/20">Custos</SelectItem>
                                         <SelectItem value="revenue" className="hover:bg-[#1E90FF]/20 focus:bg-[#1E90FF]/20">Receita & ROI</SelectItem>
                                     </SelectContent>
                                 </Select>
                             </CardContent>
                         </Card>
                         {/* Chart Type/Refresh Card */}
                         <Card className={cn(cardStyle)}>
                             <CardContent className="p-3">
                                 <Label className={cn(labelStyle, "mb-1 block")} style={{ textShadow: `0 0 4px ${neonColor}` }}>Visualização</Label>
                                 <div className="flex space-x-2">
                                      <Button variant="outline" size="icon" className={cn(chartType === "line" ? neumorphicButtonPrimaryStyle : neumorphicButtonStyle, "h-9 w-9")} onClick={() => setChartType("line")} title="Gráfico de Linha"> <LineChartIcon className="h-4 w-4" style={{ filter: `drop-shadow(0 0 3px ${neonColor})` }}/> </Button>
                                      <Button variant="outline" size="icon" className={cn(chartType === "bar" ? neumorphicButtonPrimaryStyle : neumorphicButtonStyle, "h-9 w-9")} onClick={() => setChartType("bar")} title="Gráfico de Barra"> <BarChart2 className="h-4 w-4" style={{ filter: `drop-shadow(0 0 3px ${neonColor})` }}/> </Button>
                                      <Button variant="outline" size="icon" className={cn(chartType === "pie" ? neumorphicButtonPrimaryStyle : neumorphicButtonStyle, "h-9 w-9")} onClick={() => setChartType("pie")} title="Gráfico de Pizza"> <PieChartIcon className="h-4 w-4" style={{ filter: `drop-shadow(0 0 3px ${neonColor})` }}/> </Button>
                                      <Button variant="outline" size="icon" className={cn(neumorphicButtonStyle, "ml-auto h-9 w-9")} onClick={refreshData} disabled={refreshing || loading || !selectedCampaignId} title="Atualizar Dados"> <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} style={{ filter: `drop-shadow(0 0 3px ${neonColor})` }}/> </Button>
                                 </div>
                             </CardContent>
                         </Card>
                    </div>
                    {/* --- Key Metrics Row --- */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {/* Key Metric Cards */}
                         {(Object.keys(keyMetrics) as Array<keyof typeof keyMetrics>)
                             .filter(k => ['ctr', 'cpc', 'conversionRate', 'roi'].includes(k)) // Filter for specific key metrics
                             .map(metricKey => (
                            <Card key={metricKey} className={cn(cardStyle, "p-2")}>
                                <CardContent className="p-0">
                                    <div className="flex justify-between items-start">
                                        <div>
                                             <p className={cn(labelStyle, "text-xs mb-0")} style={{ textShadow: `0 0 4px ${neonColor}` }}>{metricKey.toUpperCase()}</p>
                                             <h3 className="text-lg font-bold text-white leading-tight" style={{ textShadow: `0 0 5px ${neonColor}` }}>{formatMetricValue(metricKey, keyMetrics[metricKey])}</h3>
                                        </div>
                                        <div className={`flex items-center justify-center p-1 rounded-full mt-0.5 ${ getKeyMetricStatus(metricKey) === 'positive' ? 'bg-green-600/20' : getKeyMetricStatus(metricKey) === 'negative' ? 'bg-red-600/20' : 'bg-yellow-600/20' }`}>
                                            {getKeyMetricStatus(metricKey) === 'positive' ? <ArrowUpCircle className="h-3.5 w-3.5 text-green-400" style={{ filter: `drop-shadow(0 0 3px ${neonColor})` }}/> : getKeyMetricStatus(metricKey) === 'negative' ? <ArrowDownCircle className="h-3.5 w-3.5 text-red-400" style={{ filter: `drop-shadow(0 0 3px ${neonColor})` }}/> : <Activity className="h-3.5 w-3.5 text-yellow-400" style={{ filter: `drop-shadow(0 0 3px ${neonColor})` }}/>}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                     {/* --- Main Chart Card --- */}
                    <Card className={cn(cardStyle)}>
                        <CardHeader className="pt-4 pb-2">
                             <CardTitle className={cn(titleStyle)} style={{ textShadow: `0 0 6px ${neonColor}` }}>
                                 {metricType === "performance" ? "Visão de Performance" : metricType === "costs" ? "Análise de Custos" : "Análise de Receita & ROI"}
                                 <span className="text-sm font-normal text-gray-400 ml-2">({timeframe === "7d" ? "7 dias" : timeframe === "14d" ? "14 dias" : timeframe === "30d" ? "30 dias" : "90 dias"})</span>
                             </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {/* Loading/Rendering Logic */}
                             {(loading && !refreshing) || !selectedCampaignId ? (
                                <div className="flex flex-col items-center justify-center h-[400px] text-center">
                                    <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
                                    <span className="text-sm text-gray-400">{!selectedCampaignId ? "Selecione uma campanha para ver as métricas." : "Carregando dados..."}</span>
                                </div>
                            ) : refreshing ? (
                                 <div className="flex items-center justify-center h-[400px]">
                                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                 </div>
                            ): (
                                renderChart()
                            )}
                        </CardContent>
                    </Card>
                    {/* Detalhes e Insights (Placeholder) */}
                    {/* <Card className={cn(cardStyle)}> ... </Card> */}
                    {/* --- Export Button --- */}
                    <div className="flex justify-end">
                         <Button className={cn(neumorphicButtonStyle, "bg-[#1E90FF]/80 hover:bg-[#1E90FF]/100")} disabled={loading || !selectedCampaignId || metricsData.length === 0}>
                             <Download className="h-4 w-4 mr-2" style={{ filter: `drop-shadow(0 0 3px ${neonColor})` }}/>
                              <span style={{ textShadow: `0 0 4px ${neonColor}` }}>Exportar CSV</span>
                          </Button>
                     </div>
                </div>
            </div>
        </Layout>
    );
}