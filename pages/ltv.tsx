// C:\Users\ADM\Desktop\USB MKT PRO V3\pages\ltv.tsx
import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Layout from '@/components/layout';
// Removed Sidebar import
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Slider import remains removed as it's not used
import { Button } from "@/components/ui/button"; // Button might be needed later
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, DollarSign, Users, Repeat, CalendarDays } from 'lucide-react';
// Recharts imports remain removed
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { Campaign } from '@/entities/Campaign';
import axios from 'axios';

// Simulação de busca de campanhas
const fetchCampaigns = async (): Promise<Campaign[]> => {
    try {
        const response = await axios.get('/api/campaigns', { headers: { 'Cache-Control': 'no-cache' } });
        if (!Array.isArray(response.data)) {
             console.warn("API response is not an array:", response.data);
             return [];
        }
        return response.data.map((camp: any) => ({
            id: camp.id ?? `unknown-${Math.random()}`,
            name: camp.name ?? 'Campanha Desconhecida',
            // Usando os nomes corretos como definidos na entidade ou API
            avgTicket: typeof camp.avgTicket === 'number' ? camp.avgTicket : 100,
            purchaseFrequency: typeof camp.purchaseFrequency === 'number' ? camp.purchaseFrequency : 1.5,
            customerLifespan: typeof camp.customerLifespan === 'number' ? camp.customerLifespan : 12, // Assumindo que existe este campo
            // Adicione outros campos necessários com defaults
            platform: camp.platform || [],
            objective: camp.objective || [],
            budget: camp.budget || 0,
            daily_budget: camp.daily_budget || 0,
            segmentation: camp.segmentation || '',
            adFormat: camp.adFormat || [],
            duration: camp.duration || 0,
            industry: camp.industry || '',
            targetAudience: camp.targetAudience || '',
            status: camp.status || 'unknown',
            impressions: camp.impressions || 0,
            clicks: camp.clicks || 0,
            leads: camp.leads || 0,
            sales: camp.sales || 0,
            revenue: camp.revenue || 0,
            copies: camp.copies || [],
        }));
    } catch (error) {
        console.error("Error fetching campaigns for LTV:", error);
        throw new Error("Failed to fetch campaigns");
    }
};


export default function LTVPage() {
    const { toast } = useToast();
    // Removed Sidebar state

    // --- State ---
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>(""); // ID como string
    const [campaignsLoading, setCampaignsLoading] = useState<boolean>(true);
    const [avgTicket, setAvgTicket] = useState<number>(100);
    const [purchaseFrequency, setPurchaseFrequency] = useState<number>(1.5); // Frequência por mês
    const [customerLifespan, setCustomerLifespan] = useState<number>(12); // Tempo de vida em meses
    const [ltvResult, setLtvResult] = useState<number>(0);

    // --- Style constants ---
    const neonColor = '#1E90FF';
    const cardStyle = "bg-[#141414]/80 backdrop-blur-sm shadow-[5px_5px_10px_rgba(0,0,0,0.4),-5px_-5px_10px_rgba(255,255,255,0.05)] rounded-lg border-none";
    const neumorphicInputStyle = "bg-[#141414] text-white shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] placeholder:text-gray-500 border-none focus:ring-2 focus:ring-[#1E90FF] focus:ring-offset-2 focus:ring-offset-[hsl(var(--background))] h-9";
    // const neumorphicButtonStyle = "bg-[#141414] border-none text-white shadow-[3px_3px_6px_rgba(0,0,0,0.3),-3px_-3px_6px_rgba(255,255,255,0.05)] hover:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] hover:bg-[#1E90FF]/80 active:scale-[0.98] active:brightness-95 transition-all duration-150 ease-out";
    const labelStyle = "text-sm text-gray-300";
    const valueStyle = "font-semibold text-white text-3xl";
    const titleStyle = "text-base font-semibold text-white";

    // --- Functions ---
    // Removed toggleSidebar function
    const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const loadCampaignsCallback = useCallback(async () => {
        setCampaignsLoading(true);
        try {
            const data = await fetchCampaigns();
            setCampaigns(data);
            // Auto-select first campaign only if none is selected ('manual' is a valid selection)
            if (data.length > 0 && selectedCampaignId === "") {
                 const firstId = data[0]?.id;
                 if (firstId !== undefined) {
                     // Do not auto-select, let user choose or stay manual
                     // setSelectedCampaignId(firstId.toString());
                 }
            }
        } catch (error: any) {
            toast({ title: "Erro", description: error.message || "Falha ao carregar campanhas.", variant: "destructive" });
        } finally {
            setCampaignsLoading(false);
        }
    // Depend on toast, but not selectedCampaignId to avoid loop
    }, [toast]);

    useEffect(() => {
        loadCampaignsCallback();
    }, [loadCampaignsCallback]); // Run once on mount

    const calculateLTV = useCallback(() => {
        // LTV = (Ticket Médio * Frequência de Compra Mensal) * Tempo de Vida em Meses
        const ltv = (avgTicket || 0) * (purchaseFrequency || 0) * (customerLifespan || 0);
        setLtvResult(ltv);
    }, [avgTicket, purchaseFrequency, customerLifespan]);

    useEffect(() => {
        calculateLTV();
    }, [calculateLTV]); // Recalculate whenever inputs change

    // Atualiza inputs quando campanha muda
    useEffect(() => {
        if (!selectedCampaignId || selectedCampaignId === "manual" || campaigns.length === 0) {
            // If switching to manual or no campaign, potentially reset fields or keep last values
            // For now, it keeps the last values, allowing manual override
            return;
        }
        const selected = campaigns.find(c => c.id.toString() === selectedCampaignId);
        if (selected) {
            // Use defaults if specific LTV fields are missing in the campaign data
            setAvgTicket(selected.avgTicket ?? 100);
            setPurchaseFrequency(selected.purchaseFrequency ?? 1.5);
            setCustomerLifespan(selected.customerLifespan ?? 12);
        }
    }, [selectedCampaignId, campaigns]); // Only depends on selection and campaign data

    const handleNumericInputChange = (setter: React.Dispatch<React.SetStateAction<number>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(',', '.');
        const numValue = parseFloat(value);
        if (value === "" || value === "-") { setter(0); }
        else if (!isNaN(numValue)) { setter(Math.max(0, numValue)); } // Ensure non-negative
        // If user changes any input manually, switch selector to "Manual"
        if (selectedCampaignId !== "manual") {
            setSelectedCampaignId("manual");
        }
    };

    return (
        <Layout>
            {/* Removed outer div */}
                <Head> <title>LTV - USBMKT</title> </Head>
                {/* Removed Sidebar component */}
                {/* Main content is now directly inside Layout's children */}
                <h1 className="text-2xl font-black text-white mb-6" style={{ textShadow: `0 0 8px ${neonColor}` }}>
                    Calculadora de LTV (Lifetime Value)
                </h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* --- Coluna de Inputs --- */}
                    <div className="lg:col-span-1 space-y-4">
                        <Card className={cn(cardStyle)}>
                            <CardHeader className="pt-3 pb-2"><CardTitle className={cn(titleStyle)} style={{ textShadow: `0 0 5px ${neonColor}` }}>Campanha (Opcional)</CardTitle></CardHeader>
                            <CardContent className="p-3">
                                <Label htmlFor="campaign-select-ltv" className={cn(labelStyle, "mb-1 block")} style={{ textShadow: `0 0 4px ${neonColor}` }}> Carregar dados da campanha </Label>
                                <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId} disabled={campaignsLoading}>
                                    <SelectTrigger id="campaign-select-ltv" className={cn(neumorphicInputStyle, "w-full")}> <SelectValue placeholder="Manual ou Selecione..." /> </SelectTrigger>
                                    <SelectContent className="bg-[#1e2128] border-[#1E90FF]/30 text-white">
                                        <SelectItem value="manual" className="hover:bg-[#1E90FF]/20 focus:bg-[#1E90FF]/20">-- Manual --</SelectItem>
                                        {campaignsLoading ? (<SelectItem value="loading" disabled><div className='flex items-center'><Loader2 className="h-3 w-3 animate-spin mr-2" />Carregando...</div></SelectItem>) : ( campaigns.map((campaign) => ( <SelectItem key={campaign.id} value={campaign.id.toString()} className="hover:bg-[#1E90FF]/20 focus:bg-[#1E90FF]/20"> {campaign.name} </SelectItem> )) )}
                                        {!campaignsLoading && campaigns.length === 0 && (<SelectItem value="no-camp" disabled>Nenhuma campanha</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </CardContent>
                        </Card>
                        <Card className={cn(cardStyle)}>
                            <CardHeader className="pt-3 pb-2"><CardTitle className={cn(titleStyle)} style={{ textShadow: `0 0 5px ${neonColor}` }}>Variáveis</CardTitle></CardHeader>
                            <CardContent className="space-y-3 p-3">
                                <div className="space-y-1">
                                    <Label htmlFor="avgTicket" className={cn(labelStyle)} style={{ textShadow: `0 0 4px ${neonColor}` }}>Ticket Médio (R$)</Label>
                                    <div className="flex items-center gap-1"> <DollarSign className="h-4 w-4 text-gray-400 shrink-0" /> <Input id="avgTicket" type="number" value={avgTicket} onChange={handleNumericInputChange(setAvgTicket)} min="0" step="10" className={cn(neumorphicInputStyle, "flex-grow")} /> </div>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="purchaseFrequency" className={cn(labelStyle)} style={{ textShadow: `0 0 4px ${neonColor}` }}>Frequência de Compra (por Mês)</Label>
                                    <div className="flex items-center gap-1"> <Repeat className="h-4 w-4 text-gray-400 shrink-0" /> <Input id="purchaseFrequency" type="number" value={purchaseFrequency} onChange={handleNumericInputChange(setPurchaseFrequency)} min="0" step="0.1" className={cn(neumorphicInputStyle, "flex-grow")} /> </div>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="customerLifespan" className={cn(labelStyle)} style={{ textShadow: `0 0 4px ${neonColor}` }}>Tempo de Vida do Cliente (Meses)</Label>
                                    <div className="flex items-center gap-1"> <CalendarDays className="h-4 w-4 text-gray-400 shrink-0" /> <Input id="customerLifespan" type="number" value={customerLifespan} onChange={handleNumericInputChange(setCustomerLifespan)} min="0" step="1" className={cn(neumorphicInputStyle, "flex-grow")} /> </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* --- Coluna de Resultados --- */}
                    <div className="lg:col-span-2 flex flex-col justify-center items-center space-y-6">
                        <Card className={cn(cardStyle, "w-full")}>
                            <CardHeader className="pt-4 pb-2 text-center">
                                <CardTitle className={cn(titleStyle, "text-xl")} style={{ textShadow: `0 0 6px ${neonColor}` }}> Lifetime Value (LTV) Estimado </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 text-center">
                                <div className={cn(valueStyle, "mb-2")} style={{ textShadow: `0 0 10px ${neonColor}, 0 0 15px ${neonColor}` }}> {formatCurrency(ltvResult)} </div>
                                <p className={cn(labelStyle, "text-xs")}> (Ticket Médio × Frequência Mensal × Meses de Vida) </p>
                            </CardContent>
                        </Card>
                         {/* Placeholder for potential future chart */}
                         {/*
                         <Card className={cn(cardStyle, "w-full h-64")}>
                             <CardHeader className="pt-3 pb-1"><CardTitle className={cn(titleStyle, "text-sm")}> Placeholder Gráfico </CardTitle></CardHeader>
                             <CardContent className="p-2 h-full flex items-center justify-center text-gray-500"> Gráfico LTV (Futuro) </CardContent>
                         </Card>
                         */}
                    </div>
                </div>

        </Layout>
    );
}