// C:\Users\ADM\Desktop\USB MKT PRO V3\pages\index.tsx
import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, parseISO, isValid, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DollarSign, Users, MousePointerClick, ShoppingCart, Maximize2, Minimize2, RefreshCw, Loader2, AlertTriangle, MoreHorizontal, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Layout from '@/components/layout';
import GaugeChart from '@/components/dashboard/GaugeChart';
import StatCard from '@/components/dashboard/StatCard';
import RadialDeviceChart from '@/components/dashboard/RadialDeviceChart';
import { useToast } from "@/components/ui/use-toast";
import type { Campaign } from '@/entities/Campaign';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import axios from 'axios';

const DEFAULT_PERIOD_DAYS = 14;
const DATE_FORMAT_DISPLAY = 'dd/MM/yyyy';
const DATE_FORMAT_AXIS = 'dd/MM';
const DATE_FORMAT_API = 'yyyy-MM-dd';

interface HomeProps {}

const fetchDashboardData = async (startDate: string, endDate: string, campaignId: string | null = null): Promise<any> => {
  console.log(`[API MOCK] Fetching data from ${startDate} to ${endDate}${campaignId ? ` for Campaign ID: ${campaignId}` : ''}`);
  try {
    await new Promise(resolve => setTimeout(resolve, 800));
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    if (!isValid(start) || !isValid(end)) {
      throw new Error("Datas de início ou fim inválidas para mock.");
    }
    const days = Math.abs((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const campaignFactor = campaignId ? (0.3 + Math.random() * 0.4) : 1;
    const baseRevenue = (5000 + Math.random() * 15000) * campaignFactor;
    const baseUsers = (10000 + Math.random() * 5000) * campaignFactor;
    const baseClicks = (1000 + Math.random() * 9000) * campaignFactor;
    const baseSales = (10 + Math.random() * 90) * campaignFactor;
    const baseCost = baseClicks * (0.5 + Math.random() * 1.5);

    const dailyData = Array.from({ length: days }).map((_, dayIndex) => {
        const date = format(addDays(start, dayIndex), DATE_FORMAT_API);
        return {
          date: date,
          revenue: Math.max(0, Math.floor(baseRevenue / days * (0.7 + Math.random() * 0.6))),
          clicks: Math.max(0, Math.floor(baseClicks / days * (0.7 + Math.random() * 0.6))),
        };
      });

    const prevEndDate = subDays(start, 1);
    const prevStartDate = subDays(prevEndDate, days - 1);
    const prevCampaignFactor = campaignId ? campaignFactor : 1;
    const prevBaseRevenue = (5000 + Math.random() * 15000) * prevCampaignFactor;
    const prevBaseUsers = (10000 + Math.random() * 5000) * prevCampaignFactor;
    const prevBaseClicks = (1000 + Math.random() * 9000) * prevCampaignFactor;
    const prevBaseSales = (10 + Math.random() * 90) * prevCampaignFactor;

    const calculateChange = (current: number, previous: number): string => {
        if (previous === 0) return current > 0 ? "+100.0%" : "0.0%";
        const change = ((current - previous) / previous) * 100;
        return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
    };

    console.log("[API MOCK] Returning mock data");
    return {
        totalUsers: baseUsers,
        totalRevenue: baseRevenue,
        totalClicks: baseClicks,
        totalSales: baseSales,
        totalCost: baseCost,
        dailyData: dailyData,
        userChange: calculateChange(baseUsers, prevBaseUsers),
        revenueChange: calculateChange(baseRevenue, prevBaseRevenue),
        clickChange: calculateChange(baseClicks, prevBaseClicks),
        salesChange: calculateChange(baseSales, prevBaseSales),
        totalBudget: baseCost * (1.3 + Math.random() * 0.4),
    };
  } catch (error) {
    console.error("[API MOCK] Erro ao gerar dados mock:", error);
    throw error;
  }
};

export default function Home({}: HomeProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>({});
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [deviceData, setDeviceData] = useState<any[]>([]);
  const [keyMetrics, setKeyMetrics] = useState({ roi: 0, conversionRate: 0, budgetUsed: 0 });
  const [expandedCards, setExpandedCards] = useState<{ [key: string]: boolean }>({});
  const [currentStartDate, setCurrentStartDate] = useState<Date>(subDays(new Date(), DEFAULT_PERIOD_DAYS - 1));
  const [currentEndDate, setCurrentEndDate] = useState<Date>(new Date());
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: currentStartDate,
    to: currentEndDate,
  });

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("all");
  const [campaignsLoading, setCampaignsLoading] = useState<boolean>(false);

  const processDashboardData = useCallback((data: any) => {
    console.log("[Process Data] Iniciando processamento...");
    try {
      if (!data || Object.keys(data).length === 0) {
        setDashboardData({}); setRevenueData([]); setDeviceData([]); setKeyMetrics({ roi: 0, conversionRate: 0, budgetUsed: 0 });
        console.warn("[Process Data] Nenhum dado para processar.");
        return;
      }
      console.log("[Process Data] Processando dados recebidos:", data);
      setDashboardData(data);
      const formattedRevenueData = (data.dailyData || []).map((day: any) => ({
        date: day.date, revenue: Math.round(day.revenue), clicks: day.clicks
      })).sort((a: any, b: any) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
      setRevenueData(formattedRevenueData);

      setDeviceData([
        { name: 'Desktop', value: parseFloat((0.50 + Math.random() * 0.2).toFixed(3)) * 100, color: '#0ea5e9' },
        { name: 'Mobile', value: parseFloat((0.25 + Math.random() * 0.2).toFixed(3)) * 100, color: '#22d3ee' },
        { name: 'Tablet', value: parseFloat((0.10 + Math.random() * 0.1).toFixed(3)) * 100, color: '#67e8f9' }
      ].filter(d => d.value > 0.1)
         .map(d => ({...d, value: parseFloat(d.value.toFixed(1))})));


      const revenue = data.totalRevenue || 0; const clicks = data.totalClicks || 0; const sales = data.totalSales || 0; const cost = data.totalCost || 0;
      const totalBudget = data.totalBudget || cost * 1.5;
      const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : (revenue > 0 ? Infinity : 0);
      const conversionRate = clicks > 0 ? (sales / clicks) * 100 : 0;
      const budgetUsed = totalBudget > 0 ? Math.min(100, (cost / totalBudget) * 100) : 0;
      setKeyMetrics({
          roi: isFinite(roi) ? parseFloat(roi.toFixed(1)) : (roi === Infinity ? 300 : 0),
          conversionRate: parseFloat(conversionRate.toFixed(1)),
          budgetUsed: parseFloat(budgetUsed.toFixed(1))
      });
      console.log("[Process Data] Concluído. Metrics:", { roi, conversionRate, budgetUsed });
    } catch (procError: any) {
      console.error("[Process Data] Erro:", procError); setError("Erro ao processar dados.");
      setDashboardData({}); setRevenueData([]); setDeviceData([]); setKeyMetrics({ roi: 0, conversionRate: 0, budgetUsed: 0 });
      toast({ title: "Erro de Processamento", description: procError.message || "Não foi possível processar os dados.", variant: "destructive" });
    }
  }, [toast]);

  const loadData = useCallback(async (isRefreshing = false) => {
    if (!currentStartDate || !currentEndDate) {
        console.warn("[Load Data] Start or end date is missing.");
        setError("Selecione um período de datas válido.");
        toast({ title: "Erro", description: "Período de datas inválido.", variant: "destructive" });
        setLoading(false);
        setRefreshing(false);
        return;
    }

    if (!isRefreshing) { setLoading(true); setError(null); } else { setRefreshing(true); }
    console.log(`[Load Data] Buscando... Refresh: ${isRefreshing}, Start: ${format(currentStartDate, DATE_FORMAT_API)}, End: ${format(currentEndDate, DATE_FORMAT_API)}, Campaign: ${selectedCampaignId}`);
    try {
      const startDateStr = format(currentStartDate, DATE_FORMAT_API);
      const endDateStr = format(currentEndDate, DATE_FORMAT_API);

      if (!isValid(parseISO(startDateStr)) || !isValid(parseISO(endDateStr))) { throw new Error("Datas inválidas."); }

      const campIdToSend = selectedCampaignId === 'all' ? null : selectedCampaignId;
      const data = await fetchDashboardData(startDateStr, endDateStr, campIdToSend);
      processDashboardData(data || {});
      if (isRefreshing) { toast({ title: "Dados atualizados!", duration: 2000 }); }
      setError(null);
    } catch (error: any) {
      console.error('[Load Data] Erro:', error); setError(error.message || 'Falha ao buscar dados.');
      toast({ title: "Erro ao Carregar", description: error.message || 'Não foi possível buscar dados.', variant: "destructive" });
    } finally { setLoading(false); setRefreshing(false); }
  }, [currentStartDate, currentEndDate, selectedCampaignId, processDashboardData, toast]);

  useEffect(() => {
      if (dateRange?.from && dateRange?.to) {
          setCurrentStartDate(dateRange.from);
          setCurrentEndDate(dateRange.to);
      }
  }, [dateRange]);

  useEffect(() => {
    if (currentStartDate && currentEndDate) {
      loadData();
    }
  }, [loadData]); // loadData depends on currentStartDate, currentEndDate, selectedCampaignId

  useEffect(() => {
    const fetchCampaigns = async () => {
        setCampaignsLoading(true);
        try {
            const response = await axios.get<Campaign[]>('/api/campaigns');
            setCampaigns(response.data || []);
        } catch (err) {
            console.error("Erro ao buscar campanhas:", err);
            toast({ title: "Erro", description: "Falha ao carregar lista de campanhas.", variant: "destructive" });
            setCampaigns([]);
        } finally {
            setCampaignsLoading(false);
        }
    };
    fetchCampaigns();
  }, [toast]);


  const toggleCardExpansion = (cardId: string) => { setExpandedCards(prev => ({ ...prev, [cardId]: !prev[cardId] })); };
  const formatRevenueXAxis = (tickItem: string): string => { try { if (!tickItem || !/^\d{4}-\d{2}-\d{2}$/.test(tickItem)) return ''; const date = parseISO(tickItem); return isValid(date) ? format(date, DATE_FORMAT_AXIS, { locale: ptBR }) : ''; } catch { return ''; } };
  const formatRevenueTooltip = (value: number | string, name: string, props: any): [string, string] | null => { if (name === 'revenue') { const formattedValue = typeof value === 'number' ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : value; return [formattedValue, 'Receita']; } if (name === 'clicks') { const formattedValue = typeof value === 'number' ? `${value.toLocaleString('pt-BR')}` : value; return [formattedValue, 'Cliques']; } return null; };
  const formatRevenueTooltipLabel = (label: string): string => { try { const date = parseISO(label); return isValid(date) ? format(date, DATE_FORMAT_DISPLAY, { locale: ptBR }) : label; } catch { return label; } };

  const METRIC_TARGETS = { roi: 150, conversionRate: 5, budgetUsed: 80 };
  const METRIC_MAX = { roi: 300, conversionRate: 10, budgetUsed: 100 };

  const roiColor = keyMetrics.roi >= METRIC_TARGETS.roi ? '#22c55e' : '#ef4444';
  const conversionColor = keyMetrics.conversionRate >= METRIC_TARGETS.conversionRate ? '#22c55e' : '#ef4444';
  const budgetColor = keyMetrics.budgetUsed <= METRIC_TARGETS.budgetUsed ? '#22c55e' : (keyMetrics.budgetUsed <= 100 ? '#f97316' : '#ef4444');
  const neonColor = '#1E90FF';


  return (
    <Layout>
      <Head><title>Dashboard - Visão Geral</title></Head>
      <div className="space-y-3 p-4 md:p-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
           <div className="flex-1">
             <h1
              className="text-xl md:text-2xl font-bold text-white"
              style={{ textShadow: `0 0 6px ${neonColor}, 0 0 10px ${neonColor}` }}
             >
                 Visão Geral
             </h1>
           </div>
           <div className="flex flex-wrap items-center gap-2">
             {/* Date Range Picker */}
             <Popover>
               <PopoverTrigger asChild>
                 <Button
                   id="date"
                   variant={"outline"}
                   className={cn(
                     "w-[260px] justify-start text-left font-normal bg-[#141414] border-none text-white shadow-[3px_3px_6px_rgba(0,0,0,0.3),-3px_-3px_6px_rgba(255,255,255,0.05)] hover:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] hover:bg-[#1E90FF]/80 h-8 px-3",
                     !dateRange && "text-muted-foreground"
                   )}
                   style={{ textShadow: `0 0 4px ${neonColor}` }}
                   disabled={loading || refreshing}
                 >
                   <CalendarIcon className="mr-2 h-3 w-3" style={{ filter: `drop-shadow(0 0 4px ${neonColor})` }} />
                   {dateRange?.from ? (
                     dateRange.to ? (
                       <>
                         {format(dateRange.from, "LLL dd, y", { locale: ptBR })} -{" "}
                         {format(dateRange.to, "LLL dd, y", { locale: ptBR })}
                       </>
                     ) : (
                       format(dateRange.from, "LLL dd, y", { locale: ptBR })
                     )
                   ) : (
                     <span className="text-xs">Selecione o período</span>
                   )}
                 </Button>
               </PopoverTrigger>
               <PopoverContent className="w-auto p-0 bg-[#1e2128] border-[#1E90FF]/30" align="end">
                 <Calendar
                   initialFocus
                   mode="range"
                   defaultMonth={dateRange?.from}
                   selected={dateRange}
                   onSelect={setDateRange}
                   numberOfMonths={2}
                   locale={ptBR}
                   className="text-white [&>div>table>tbody>tr>td>button]:text-white [&>div>table>tbody>tr>td>button]:border-[#1E90FF]/20 [&>div>table>thead>tr>th]:text-gray-400 [&>div>div>button]:text-white [&>div>div>button:hover]:bg-[#1E90FF]/20 [&>div>div>div]:text-white"
                 />
               </PopoverContent>
             </Popover>

             {/* Campaign Selector */}
             <Select
                value={selectedCampaignId}
                onValueChange={setSelectedCampaignId}
                disabled={loading || refreshing || campaignsLoading}
             >
                <SelectTrigger
                 className="w-auto min-w-[150px] max-w-[250px] bg-[#141414] border-none text-white shadow-[3px_3px_6px_rgba(0,0,0,0.3),-3px_-3px_6px_rgba(255,255,255,0.05)] focus:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] h-8 px-3 text-xs"
                 style={{ textShadow: `0 0 4px ${neonColor}` }}
                >
                    <SelectValue placeholder="Campanha" className="truncate" />
                </SelectTrigger>
                <SelectContent className="bg-[#1e2128] border-[#1E90FF]/30 text-white">
                    <SelectItem value="all" className="text-xs hover:bg-[#1E90FF]/20 focus:bg-[#1E90FF]/20">Todas Campanhas</SelectItem>
                    {campaignsLoading && <div className="p-2 text-xs text-gray-400 text-center">Carregando...</div>}
                    {!campaignsLoading && campaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id} className="text-xs hover:bg-[#1E90FF]/20 focus:bg-[#1E90FF]/20">
                            {campaign.name}
                        </SelectItem>
                    ))}
                     {!campaignsLoading && campaigns.length === 0 && <div className="p-2 text-xs text-gray-400 text-center">Nenhuma campanha.</div>}
                </SelectContent>
             </Select>

             {/* Refresh Button */}
             <Button
              className="bg-[#141414] border-none text-white shadow-[3px_3px_6px_rgba(0,0,0,0.3),-3px_-3px_6px_rgba(255,255,255,0.05)] hover:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] hover:bg-[#1E90FF]/80 h-8 px-3"
              size="sm" onClick={() => loadData(true)} disabled={refreshing || loading}
              style={{ textShadow: `0 0 4px ${neonColor}` }}
             >
               <RefreshCw
                className={cn("h-3 w-3", refreshing && 'animate-spin')}
                style={{ filter: `drop-shadow(0 0 4px ${neonColor})` }}
               />
               <span className="ml-1.5 text-xs">{refreshing ? '' : 'Atualizar'}</span>
             </Button>
           </div>
        </div>

        {/* Loading and Error States */}
        {loading && ( <div className="flex flex-col justify-center items-center py-16 text-center"> <Loader2 className="h-8 w-8 animate-spin text-[#1E90FF] mb-3" style={{ filter: `drop-shadow(0 0 5px ${neonColor})` }}/> <span className="text-sm text-gray-400" style={{ textShadow: `0 0 4px ${neonColor}` }}>Carregando dados...</span> </div> )}
        {!loading && error && ( <Card className="flex flex-col justify-center items-center py-8 text-center bg-[#141414] border-none shadow-[5px_5px_10px_rgba(0,0,0,0.4),-5px_-5px_10px_rgba(255,255,255,0.05)] rounded-lg"> <CardContent className="flex flex-col items-center gap-3 p-0"> <AlertTriangle className="h-6 w-6 text-red-400" style={{ filter: `drop-shadow(0 0 4px ${neonColor})`}} /> <div className="space-y-1"> <p className="text-sm font-semibold text-red-400" style={{ textShadow: `0 0 4px ${neonColor}` }}>Erro ao Carregar Dados</p> <p className="text-xs text-red-400/80" style={{ textShadow: `0 0 4px ${neonColor}` }}>{error}</p> </div> <Button className="bg-[#141414] border-none text-white shadow-[3px_3px_6px_rgba(0,0,0,0.3),-3px_-3px_6px_rgba(255,255,255,0.05)] hover:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] hover:bg-[#1E90FF]/80 mt-3" size="sm" onClick={() => loadData()} style={{ textShadow: `0 0 4px ${neonColor}` }}> <RefreshCw className="h-4 w-4 mr-2 text-[#1E90FF]" style={{ filter: `drop-shadow(0 0 3px ${neonColor})` }}/> <span className="text-xs">Tentar Novamente</span> </Button> </CardContent> </Card> )}

        {/* Main Dashboard Content */}
        {!loading && !error && Object.keys(dashboardData).length > 0 && (
          <>
            {/* Row 1: Stat Cards */}
            <div className="grid gap-2 md:grid-cols-4">
              <StatCard key={`users-${selectedCampaignId}`} title="Usuários" value={(dashboardData.totalUsers || 0).toLocaleString('pt-BR')} icon={Users} change={dashboardData.userChange} isLoading={refreshing} isCompact={true} />
              <StatCard key={`revenue-${selectedCampaignId}`} title="Receita" value={`R$ ${(dashboardData.totalRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} icon={DollarSign} change={dashboardData.revenueChange} isLoading={refreshing} isCompact={true} />
              <StatCard key={`clicks-${selectedCampaignId}`} title="Cliques" value={(dashboardData.totalClicks || 0).toLocaleString('pt-BR')} icon={MousePointerClick} change={dashboardData.clickChange} isLoading={refreshing} isCompact={true} />
              <StatCard key={`sales-${selectedCampaignId}`} title="Vendas" value={(dashboardData.totalSales || 0).toLocaleString('pt-BR')} icon={ShoppingCart} change={dashboardData.salesChange} isLoading={refreshing} isCompact={true} />
            </div>

            {/* Row 2: Gauge Cards */}
            <div className="grid gap-2 md:grid-cols-3 mt-1">
               {/* ROI Card */}
               <Card className="bg-[#141414] border-none shadow-[5px_5px_10px_rgba(0,0,0,0.4),-5px_-5px_10px_rgba(255,255,255,0.05)] rounded-lg h-[210px]">
                 <CardHeader className="flex flex-row items-center justify-between pb-0 pt-2 px-3 h-[30px]">
                   <CardTitle className="text-xs font-medium text-white" style={{ textShadow: `0 0 4px ${neonColor}` }}>ROI (%)</CardTitle>
                   <Button variant="ghost" size="icon" className="h-5 w-5 text-gray-500 hover:text-white"> <MoreHorizontal size={16} style={{ filter: `drop-shadow(0 0 4px ${neonColor})` }}/> </Button>
                 </CardHeader>
                 <CardContent className="flex flex-col items-center justify-center h-[calc(100%-30px)] px-1">
                   {refreshing ? <Loader2 className="h-6 w-6 animate-spin text-[#1E90FF]" style={{ filter: `drop-shadow(0 0 5px ${neonColor})` }}/> : <GaugeChart value={keyMetrics.roi} max={METRIC_MAX.roi} label="Retorno Invest." color={roiColor} />}
                 </CardContent>
               </Card>
               {/* Conversion Rate Card */}
               <Card className="bg-[#141414] border-none shadow-[5px_5px_10px_rgba(0,0,0,0.4),-5px_-5px_10px_rgba(255,255,255,0.05)] rounded-lg h-[210px]">
                 <CardHeader className="flex flex-row items-center justify-between pb-0 pt-2 px-3 h-[30px]">
                   <CardTitle className="text-xs font-medium text-white" style={{ textShadow: `0 0 4px ${neonColor}` }}>Tx. Conversão (%)</CardTitle>
                   <Button variant="ghost" size="icon" className="h-5 w-5 text-gray-500 hover:text-white"> <MoreHorizontal size={16} style={{ filter: `drop-shadow(0 0 4px ${neonColor})` }}/> </Button>
                 </CardHeader>
                 <CardContent className="flex flex-col items-center justify-center h-[calc(100%-30px)] px-1">
                    {refreshing ? <Loader2 className="h-6 w-6 animate-spin text-[#1E90FF]" style={{ filter: `drop-shadow(0 0 5px ${neonColor})` }}/> : <GaugeChart value={keyMetrics.conversionRate} max={METRIC_MAX.conversionRate} label="Vendas/Cliques" color={conversionColor} />}
                 </CardContent>
               </Card>
               {/* Budget Usage Card */}
               <Card className="bg-[#141414] border-none shadow-[5px_5px_10px_rgba(0,0,0,0.4),-5px_-5px_10px_rgba(255,255,255,0.05)] rounded-lg h-[210px]">
                 <CardHeader className="flex flex-row items-center justify-between pb-0 pt-2 px-3 h-[30px]">
                   <CardTitle className="text-xs font-medium text-white" style={{ textShadow: `0 0 4px ${neonColor}` }}>Uso Orçamento (%)</CardTitle>
                   <Button variant="ghost" size="icon" className="h-5 w-5 text-gray-500 hover:text-white"> <MoreHorizontal size={16} style={{ filter: `drop-shadow(0 0 4px ${neonColor})` }}/> </Button>
                 </CardHeader>
                 <CardContent className="flex flex-col items-center justify-center h-[calc(100%-30px)] px-1">
                    {refreshing ? <Loader2 className="h-6 w-6 animate-spin text-[#1E90FF]" style={{ filter: `drop-shadow(0 0 5px ${neonColor})` }}/> : <GaugeChart value={keyMetrics.budgetUsed} max={METRIC_MAX.budgetUsed} label="Gasto/Orçamento" color={budgetColor} />}
                 </CardContent>
               </Card>
            </div>

            {/* Row 3: Graph Cards */}
            <div className="grid gap-2 lg:grid-cols-2 mt-1">
               {/* Area Chart Card */}
               <Card className={cn( "bg-[#141414] border-none shadow-[5px_5px_10px_rgba(0,0,0,0.4),-5px_-5px_10px_rgba(255,255,255,0.05)] rounded-lg transition-all duration-300 ease-in-out", expandedCards['revenue-chart'] ? "lg:col-span-2 h-[450px]" : "h-[340px]" )}>
                 <CardHeader className="flex flex-row items-center justify-between px-4 pt-3 pb-1">
                   <CardTitle className="text-sm font-medium text-white" style={{ textShadow: `0 0 5px ${neonColor}` }}>Receita & Cliques</CardTitle>
                   <Button variant="ghost" size="icon" className="h-6 w-6 text-[#1E90FF] hover:text-[#1E90FF]" onClick={() => toggleCardExpansion('revenue-chart')}>
                     {expandedCards['revenue-chart'] ? <Minimize2 className="h-4 w-4" style={{ filter: `drop-shadow(0 0 4px ${neonColor})` }}/> : <Maximize2 className="h-4 w-4" style={{ filter: `drop-shadow(0 0 4px ${neonColor})` }}/>}
                   </Button>
                 </CardHeader>
                 <CardContent className="px-2 pb-3 h-[calc(100%-50px)]">
                   <div className={cn("w-full h-full relative", refreshing && "opacity-50")}>
                     {refreshing && <div className="absolute inset-0 flex justify-center items-center z-10"><Loader2 className="h-5 w-5 animate-spin text-[#1E90FF]" style={{ filter: `drop-shadow(0 0 5px ${neonColor})` }}/></div>}
                     {(revenueData.length > 0 || refreshing) ? (
                       <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={revenueData} key={`areachart-${selectedCampaignId}`} margin={{ top: 5, right: 10, left: -15, bottom: 0 }} style={{ filter: `drop-shadow(0 0 5px ${neonColor}66)`}}>
                           <defs> <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1"> <stop offset="5%" stopColor="#1E90FF" stopOpacity={0.4}/> <stop offset="95%" stopColor="#1E90FF" stopOpacity={0}/> </linearGradient> <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1"> <stop offset="5%" stopColor="#4682B4" stopOpacity={0.2}/> <stop offset="95%" stopColor="#4682B4" stopOpacity={0}/> </linearGradient> </defs>
                           <CartesianGrid strokeDasharray="3 3" stroke={neonColor} strokeOpacity={0.2} />
                           <XAxis dataKey="date" tickFormatter={formatRevenueXAxis} tick={{ fill: '#a0aec0', fontSize: 10, style:{textShadow: `0 0 4px ${neonColor}`} }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={20} />
                           <YAxis yAxisId="left" tickFormatter={(v) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}`} tick={{ fill: '#a0aec0', fontSize: 10, style:{textShadow: `0 0 4px ${neonColor}`} }} axisLine={false} tickLine={false} width={55} stroke={neonColor} />
                           <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}`} tick={{ fill: '#a0aec0', fontSize: 10, style:{textShadow: `0 0 4px ${neonColor}`} }} axisLine={false} tickLine={false} width={50} stroke={neonColor} />
                           <Tooltip cursor={{ fill: neonColor, fillOpacity: 0.05 }} contentStyle={{ backgroundColor: 'rgba(14, 16, 21, 0.8)', border: `1px solid ${neonColor}4D`, backdropFilter: 'blur(4px)', borderRadius: '6px', fontSize: '10px', boxShadow: '5px 5px 10px rgba(0,0,0,0.4), -5px -5px 10px rgba(255,255,255,0.05)', padding: '4px 8px', textShadow: `0 0 4px ${neonColor}` }} labelFormatter={formatRevenueTooltipLabel} formatter={formatRevenueTooltip} />
                           <Area yAxisId="left" type="monotone" dataKey="revenue" stroke={neonColor} fill="url(#revenueGradient)" strokeWidth={2} dot={false} name="Receita" />
                           <Area yAxisId="right" type="monotone" dataKey="clicks" stroke={`${neonColor}99`} fill="url(#clicksGradient)" strokeWidth={1.5} dot={false} name="Cliques" />
                         </AreaChart>
                       </ResponsiveContainer>
                     ) : ( <div className="flex items-center justify-center h-full text-gray-400 text-xs" style={{ textShadow: `0 0 4px ${neonColor}` }}>Sem dados de receita para o período.</div> )}
                   </div>
                 </CardContent>
               </Card>

               {/* Device Chart Card */}
               <Card className={cn( "bg-[#141414] border-none shadow-[5px_5px_10px_rgba(0,0,0,0.4),-5px_-5px_10px_rgba(255,255,255,0.05)] rounded-lg transition-all duration-300 ease-in-out", expandedCards['device-chart'] ? "lg:col-span-2 h-[450px]" : "h-[340px]" )}>
                 <CardHeader className="flex flex-row items-center justify-between px-4 pt-3 pb-1">
                   <CardTitle className="text-sm font-medium text-white" style={{ textShadow: `0 0 5px ${neonColor}` }}>Acesso por Dispositivo (%)</CardTitle>
                   <Button variant="ghost" size="icon" className="h-6 w-6 text-[#1E90FF] hover:text-[#1E90FF]" onClick={() => toggleCardExpansion('device-chart')}>
                     {expandedCards['device-chart'] ? <Minimize2 className="h-4 w-4" style={{ filter: `drop-shadow(0 0 4px ${neonColor})` }}/> : <Maximize2 className="h-4 w-4" style={{ filter: `drop-shadow(0 0 4px ${neonColor})` }}/>}
                   </Button>
                 </CardHeader>
                 <CardContent className="flex flex-col items-center justify-center h-[calc(100%-50px)] px-1 pb-2">
                   <div className={cn("w-full h-full flex items-center justify-center relative", refreshing && "opacity-50")}>
                     {refreshing && <div className="absolute inset-0 flex justify-center items-center z-10"><Loader2 className="h-5 w-5 animate-spin text-[#1E90FF]" style={{ filter: `drop-shadow(0 0 5px ${neonColor})` }}/></div>}
                     {(deviceData.length > 0 || refreshing) ? ( <RadialDeviceChart data={deviceData} key={`radialchart-${selectedCampaignId}`} /> ) : ( <div className="flex items-center justify-center h-full text-gray-400 text-xs" style={{ textShadow: `0 0 4px ${neonColor}` }}>Sem dados de dispositivo para o período.</div> )}
                   </div>
                 </CardContent>
               </Card>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
// Make sure there is NO code after this line in your file.