// pages/api/budget.ts
import type { NextApiRequest, NextApiResponse } from 'next';

const formatCurrency = (value: number): string => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatPercentage = (value: number): string => `${Number(value).toFixed(1)}%`;

type BudgetData = {
  totalBudget?: number; totalBudgetFmt?: string;
  trafficCost?: number; trafficCostFmt?: string; trafficPerc?: number;
  creativeCost?: number; creativeCostFmt?: string; creativePerc?: number;
  operationalCost?: number; operationalCostFmt?: string; opPerc?: number;
  expectedProfit?: number; profitFmt?: string; profitPerc?: number;
  unallocatedValue?: number; unallocatedFmt?: string; unallocatedPerc?: number;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BudgetData | { message: string }>
) {
  if (req.method === 'GET') {
    try {
      const { startDate, endDate, campaignId } = req.query;
      console.log(`[API /api/budget] GET Req:`, { startDate, endDate, campaignId });

      // --- LÓGICA MOCK ---
      const baseBudget = 10000 + Math.random() * 15000;
      const trafficP = 45 + Math.random() * 15;
      const creativeP = 10 + Math.random() * 10;
      const opP = 8 + Math.random() * 7;
      const profitP = Math.max(0, 100 - trafficP - creativeP - opP);
      const unallocatedP = 100 - (trafficP + creativeP + opP + profitP); // ~0
      const trafficCost=baseBudget*(trafficP/100); const creativeCost=baseBudget*(creativeP/100); const operationalCost=baseBudget*(opP/100); const expectedProfit=baseBudget*(profitP/100); const unallocatedValue=baseBudget*(unallocatedP/100);
      const mockData: BudgetData = { totalBudget: baseBudget, totalBudgetFmt: formatCurrency(baseBudget), trafficCost: trafficCost, trafficCostFmt: formatCurrency(trafficCost), trafficPerc: parseFloat(trafficP.toFixed(1)), creativeCost: creativeCost, creativeCostFmt: formatCurrency(creativeCost), creativePerc: parseFloat(creativeP.toFixed(1)), operationalCost: operationalCost, operationalCostFmt: formatCurrency(operationalCost), opPerc: parseFloat(opP.toFixed(1)), expectedProfit: expectedProfit, profitFmt: formatCurrency(expectedProfit), profitPerc: parseFloat(profitP.toFixed(1)), unallocatedValue: parseFloat(unallocatedValue.toFixed(2)), unallocatedFmt: formatCurrency(unallocatedValue), unallocatedPerc: parseFloat(unallocatedP.toFixed(1)), };
      // --- FIM MOCK ---

      res.status(200).json(mockData);

    } catch (error: any) {
      console.error("[API /api/budget] Erro:", error);
      res.status(500).json({ message: `Erro Interno: ${error.message || 'Erro'}` });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ message: `Método ${req.method} Não Permitido` });
  }
}