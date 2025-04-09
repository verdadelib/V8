// pages/api/funnel.ts
import type { NextApiRequest, NextApiResponse } from 'next';

// Estruturas de dados esperadas pelo frontend
interface FunnelStage { name: string; value: number; displayValue: string; color?: string; /* Cor é opcional aqui */ }
interface PeriodResult { daily: number; weekly: number; monthly: number; }
interface FunnelData { clientName?: string; productName?: string; funnelData?: FunnelStage[]; volume?: PeriodResult; revenue?: PeriodResult; profit?: PeriodResult; }

// Funções de formatação
const formatCurrency = (value: number): string => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatNumber = (value: number): string => value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FunnelData | { message: string }>
) {
  if (req.method === 'GET') {
    try {
      const { startDate, endDate, campaignId } = req.query;
      console.log(`[API /api/funnel] GET Req:`, { startDate, endDate, campaignId });

      // --- LÓGICA MOCK ---
      const isAllCampaigns = !campaignId || campaignId === 'all';
      const campaignFactor = isAllCampaigns ? 1 : 0.2 + Math.random() * 0.6;

      // Simula inputs (poderiam vir do DB)
      const dailyInvestment = (isAllCampaigns?500:100+Math.random()*200)*campaignFactor;
      const cpc = 1.00 + Math.random() * 1.50;
      const productPrice = 97 + Math.random() * 100;
      const organicReach = (isAllCampaigns?20000:5000+Math.random()*10000)*campaignFactor;
      const reachToClickConv = 1.5 + Math.random() * 2.0; // %
      const siteConvRate = 2.0 + Math.random() * 3.0; // %

      // Calcula métricas
      const cliquesPagos = cpc > 0 ? dailyInvestment / cpc : 0;
      const visitantesPagos = cliquesPagos;
      const visitantesOrganicos = organicReach * (reachToClickConv / 100);
      const totalVisitantes = visitantesPagos + visitantesOrganicos;
      const vendasDiarias = totalVisitantes * (siteConvRate / 100);
      const faturamentoDiario = vendasDiarias * productPrice;
      const lucroDiario = faturamentoDiario - dailyInvestment;

      const mockFunnelData: FunnelData = {
        clientName: `Cliente ${isAllCampaigns ? 'Mock' : campaignId?.toString().slice(-3)}`,
        productName: `Produto #${Math.floor(100 + Math.random() * 900)}`,
        funnelData: [
          { name: "Investimento", value: dailyInvestment, displayValue: formatCurrency(dailyInvestment) },
          { name: "Visit. Pagos", value: visitantesPagos, displayValue: formatNumber(visitantesPagos) },
          { name: "Visit. Orgân.", value: visitantesOrganicos, displayValue: formatNumber(visitantesOrganicos) },
          { name: "Total Visit.", value: totalVisitantes, displayValue: formatNumber(totalVisitantes) },
          { name: "Vendas", value: vendasDiarias, displayValue: formatNumber(vendasDiarias) },
          { name: "Faturamento", value: faturamentoDiario, displayValue: formatCurrency(faturamentoDiario) },
        ],
        volume: { daily: vendasDiarias, weekly: vendasDiarias*7, monthly: vendasDiarias*30 },
        revenue: { daily: faturamentoDiario, weekly: faturamentoDiario*7, monthly: faturamentoDiario*30 },
        profit: { daily: lucroDiario, weekly: lucroDiario*7, monthly: lucroDiario*30 }
      };
      // --- FIM MOCK ---

      res.status(200).json(mockFunnelData);

    } catch (error: any) {
      console.error("[API /api/funnel] Erro:", error);
      res.status(500).json({ message: `Erro Interno: ${error.message || 'Erro'}` });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ message: `Método ${req.method} Não Permitido` });
  }
}