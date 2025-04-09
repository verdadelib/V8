// pages/api/metrics.ts
import type { NextApiRequest, NextApiResponse } from 'next';
// --- IMPORT CORRIGIDO ---
import { format, addDays, parseISO, differenceInDays, isValid } from 'date-fns';
// -----------------------

// Estruturas esperadas pelo frontend (export.tsx -> addMetricsContent)
type MetricsTotals = { clicks: number; impressions: number; conversions: number; cost: number; revenue: number; ctr: number; cpc: number; conversionRate: number; costPerConversion: number; roi: number; };
type DailyMetric = { date: string; clicks: number; impressions: number; conversions: number; cost: number; revenue: number; };
type MetricsData = { totals: MetricsTotals; dailyData: DailyMetric[]; };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MetricsData | { message: string }>
) {
  if (req.method === 'GET') {
    try {
      const { startDate, endDate, campaignId } = req.query;
      console.log(`[API /api/metrics] GET Req:`, { startDate, endDate, campaignId });

      if (typeof startDate !== 'string' || typeof endDate !== 'string' || !startDate || !endDate) {
        return res.status(400).json({ message: 'startDate e endDate são obrigatórios.' });
      }

      // --- CORREÇÃO: Validar datas ANTES de usar ---
      const start = parseISO(startDate);
      const end = parseISO(endDate);

      if (!isValid(start) || !isValid(end) || end < start) {
         return res.status(400).json({ message: `Datas inválidas: ${startDate} / ${endDate}` });
      }
      // ---------------------------------------------

      const days = differenceInDays(end, start) + 1;
      const isAllCampaigns = !campaignId || campaignId === 'all';
      const campaignFactor = isAllCampaigns ? 1 : 0.2 + Math.random() * 0.6;

      // --- LÓGICA MOCK ---
      const mockDailyData: DailyMetric[] = [];
      let totalClicks=0, totalImpressions=0, totalConversions=0, totalCost=0, totalRevenue=0;

      for (let i = 0; i < days; i++) {
        const currentDate = addDays(start, i);
        const dateStr = format(currentDate, 'yyyy-MM-dd'); // Formato API
        const dailyImpressions = Math.floor((10000+Math.random()*40000)*campaignFactor/days);
        const dailyClicks = Math.floor(dailyImpressions*(0.01+Math.random()*0.04));
        const dailyCost = dailyClicks*(0.50+Math.random()*1.50);
        const dailyConversions = Math.floor(dailyClicks*(0.02+Math.random()*0.08));
        const dailyRevenue = dailyConversions*(50+Math.random()*150);
        mockDailyData.push({date:dateStr,clicks:dailyClicks,impressions:dailyImpressions,conversions:dailyConversions,cost:parseFloat(dailyCost.toFixed(2)),revenue:parseFloat(dailyRevenue.toFixed(2))});
        totalClicks+=dailyClicks;totalImpressions+=dailyImpressions;totalConversions+=dailyConversions;totalCost+=dailyCost;totalRevenue+=dailyRevenue;
      }
      const ctr=totalImpressions>0?(totalClicks/totalImpressions)*100:0;
      const cpc=totalClicks>0?totalCost/totalClicks:0;
      const conversionRate=totalClicks>0?(totalConversions/totalClicks)*100:0;
      const costPerConversion=totalConversions>0?totalCost/totalConversions:0;
      const roi=totalCost>0?((totalRevenue-totalCost)/totalCost)*100:(totalRevenue>0?Infinity:0);
      const mockTotals:MetricsTotals={clicks:totalClicks,impressions:totalImpressions,conversions:totalConversions,cost:parseFloat(totalCost.toFixed(2)),revenue:parseFloat(totalRevenue.toFixed(2)),ctr:parseFloat(ctr.toFixed(2)),cpc:parseFloat(cpc.toFixed(2)),conversionRate:parseFloat(conversionRate.toFixed(2)),costPerConversion:parseFloat(costPerConversion.toFixed(2)),roi:isFinite(roi)?parseFloat(roi.toFixed(1)):(roi===Infinity?10000:0)};
      // --- FIM MOCK ---

      res.status(200).json({ totals: mockTotals, dailyData: mockDailyData });

    } catch (error: any) {
      console.error("[API /api/metrics] Erro:", error);
      res.status(500).json({ message: `Erro Interno: ${error.message || 'Erro'}` });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ message: `Método ${req.method} Não Permitido` });
  }
}