import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Layout from '@/components/layout'; // Verifique o caminho
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Download, Loader2, FileText, BarChart3, DollarSign, Filter, TrendingUp, LineChart, Calendar as CalendarIcon, Image as ImageIconLucide, PieChart as PieChartIcon } from 'lucide-react'; // Adicionei PieChartIcon
import jsPDF from 'jspdf';
import 'jspdf-autotable'; // Confia que está funcionando
import axios, { AxiosError } from 'axios';
import { format, subDays, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- Interfaces e Constantes ---
interface jsPDFWithAutoTable extends jsPDF { autoTable: (options: any) => jsPDFWithAutoTable; lastAutoTable?: { finalY: number }; }
interface ReportLoadingState { campaigns: boolean; budget: boolean; metrics: boolean; funnel: boolean; ltv: boolean; general: boolean; }
interface CampaignSelectItem { id: string; name: string; }
type ReportType = keyof ReportLoadingState;

// Cores Tema CLARO e Elegante para PDF
const PDF_THEME = {
    BACKGROUND: [255, 255, 255], // Branco
    TEXT: [52, 58, 64],          // Cinza Escuro (#343a40)
    TEXT_MUTED: [108, 117, 125], // Cinza Médio (#6c757d)
    PRIMARY: [0, 123, 255],       // Azul Bootstrap Padrão (#007bff) - Menos "Neon"
    SECONDARY: [108, 117, 125],   // Cinza Médio
    ERROR: [220, 53, 69],         // Vermelho (#dc3545)
    SUCCESS: [25, 135, 84],        // Verde (#198754)
    WARNING: [255, 193, 7],       // Amarelo (#ffc107)
    INFO: [13, 202, 240],         // Ciano (#0dcaf0)
    TABLE_HEADER_BG: [233, 236, 239], // Cinza bem claro (#e9ecef)
    TABLE_HEADER_TEXT: [73, 80, 87],   // Cinza mais escuro para header (#495057)
    TABLE_BORDER: [222, 226, 230],    // Cinza claro para bordas (#dee2e6)
    TABLE_ALT_BG: [248, 249, 250],    // Cinza quase branco (#f8f9fa)
};

// Constantes de Data e Layout
const DATE_FORMAT_DISPLAY = 'dd/MM/yyyy'; const DATE_FORMAT_API = 'yyyy-MM-dd'; const DEFAULT_PERIOD_DAYS = 14;
const LOGO_PATH = '/logo.png'; const LOGO_WIDTH_MM = 30; const LOGO_HEIGHT_MM = 12; const PAGE_MARGIN = 15; const FOOTER_HEIGHT = 15;

// Helpers de Formatação
const formatCurrency = (v: any): string => v == null || isNaN(v) ? 'R$ 0,00' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatNumber = (v: any): string => v == null || isNaN(v) ? '0' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const formatPercentage = (v: any): string => v == null || isNaN(v) ? '0.0%' : `${Number(v).toFixed(1)}%`;
const formatDecimal = (v: any, d = 2): string => { if (v == null || isNaN(v)) return (0).toFixed(d); if (!isFinite(v)) return 'N/A'; return Number(v).toFixed(d); };

// --- Configurações Padrão do autoTable (Tema Claro Aprimorado) ---
const getBaseTableOptions = (startY: number, logoUrl: string | null): any => ({ // Use 'any' por simplicidade ou defina uma interface específica
    startY: startY,
    theme: 'striped', // 'striped' costuma ser elegante em temas claros
    styles: {
        font: 'helvetica', // Mais legível que 'times'
        fontSize: 9,
        cellPadding: 2.8, // Um pouco mais de respiro
        textColor: PDF_THEME.TEXT,
        valign: 'middle',
    },
    headStyles: {
        fillColor: PDF_THEME.SECONDARY, // Cabeçalho cinza escuro
        textColor: PDF_THEME.BACKGROUND, // Texto branco
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 9.5,
        lineWidth: 0.1,
        lineColor: PDF_THEME.SECONDARY,
    },
    bodyStyles: {
        fillColor: PDF_THEME.BACKGROUND,
        textColor: PDF_THEME.TEXT,
        lineWidth: 0.1,
        lineColor: PDF_THEME.TABLE_BORDER,
    },
    alternateRowStyles: {
        fillColor: PDF_THEME.TABLE_ALT_BG,
    },
    // Remove borda externa da tabela para visual mais limpo
    // tableLineColor: PDF_THEME.SECONDARY,
    // tableLineWidth: 0.2,
    margin: { top: PAGE_MARGIN + (logoUrl ? LOGO_HEIGHT_MM + 12 : 17), bottom: FOOTER_HEIGHT + PAGE_MARGIN, left: PAGE_MARGIN, right: PAGE_MARGIN }
});

// --- Componente Principal ---
export default function ExportPage() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<CampaignSelectItem[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('all');
  const [campaignsLoading, setCampaignsLoading] = useState<boolean>(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => { const e = new Date(); const s = subDays(e, DEFAULT_PERIOD_DAYS - 1); return { from: s, to: e }; });
  const [isLoading, setIsLoading] = useState<ReportLoadingState>({ campaigns: false, budget: false, metrics: false, funnel: false, ltv: false, general: false });
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Estilos UI
  const cardStyle = "bg-[#141414]/80 backdrop-blur-sm shadow-[5px_5px_10px_rgba(0,0,0,0.4),-5px_-5px_10px_rgba(255,255,255,0.05)] rounded-lg border border-[hsl(var(--border))]/30";
  const primaryButtonStyle = `bg-gradient-to-r from-[hsl(var(--primary))] to-[#4682B4] hover:from-[#4682B4] hover:to-[hsl(var(--primary))] text-primary-foreground font-semibold shadow-[0_4px_10px_rgba(30,144,255,0.3)] transition-all duration-300 ease-in-out transform hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0e1015] focus:ring-[#5ca2e2]`;
  const titleStyle = "text-base font-semibold text-white";
  const neumorphicBaseStyle = "bg-[#141414] border-none text-white shadow-[3px_3px_6px_rgba(0,0,0,0.3),-3px_-3px_6px_rgba(255,255,255,0.05)]";
  const selectTriggerStyle = cn(neumorphicBaseStyle, `hover:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] hover:bg-[#1E90FF]/10 focus:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)]`);
  const popoverContentStyle = `bg-[#1e2128] border-[#1E90FF]/30 text-white`;

  // Hooks
  useEffect(() => { /* Carrega Logo */ const c=document.createElement('canvas');const x=c.getContext('2d');const i=new Image();i.crossOrigin="Anonymous";i.src=LOGO_PATH;i.onload=()=>{c.width=i.naturalWidth||250;c.height=i.naturalHeight||100;if(x){x.drawImage(i,0,0,c.width,c.height);try{setLogoDataUrl(c.toDataURL('image/png'))}catch(e){console.error("L:",e);toast({title:"Erro Logo",variant:"destructive"})}}};i.onerror=()=>{console.error("L:",LOGO_PATH);toast({title:"Erro Logo",variant:"destructive"})}}, [toast]);
  const fetchCampaignsClient = useCallback(async () => {setCampaignsLoading(true); try { const r=await axios.get('/api/campaigns?fields=id,name');if(!Array.isArray(r.data))throw new Error("Dados inválidos");setCampaigns(r.data);}catch(e:unknown){console.error("E:",e);let d="Falha buscar.";if(axios.isAxiosError(e))d=e.response?.data?.message||e.message||d;else if(e instanceof Error)d=e.message;toast({title:"Erro Rede",description:d,variant:"destructive"});setCampaigns([]);}finally{setCampaignsLoading(false);}}, [toast]);
  useEffect(() => { fetchCampaignsClient(); }, [fetchCampaignsClient]);
  const getFormattedDateRange = (): { start: string; end: string } | null => { const { from, to } = dateRange ?? {}; if (from && to && isValid(from) && isValid(to)) { return { start: format(from, DATE_FORMAT_API), end: format(to, DATE_FORMAT_API) }; } return null; };
  const getDisplayDateRange = (): string => { const { from, to } = dateRange ?? {}; if (from && to && isValid(from) && isValid(to)) { return `Per: ${format(from, DATE_FORMAT_DISPLAY)} a ${format(to, DATE_FORMAT_DISPLAY)}`; } if (from && isValid(from)) { return `Data: ${format(from, DATE_FORMAT_DISPLAY)}`; } return 'Selec. período'; };

  // --- Funções PDF ---
  const addPdfHeaderFooter = (doc: jsPDFWithAutoTable, pageNum: number, totalPages: number, title: string, campaignName: string, dateRangeStr: string) => { const h=doc.internal.pageSize.height;const w=doc.internal.pageSize.width; if(logoDataUrl){ try { doc.addImage(logoDataUrl,'PNG',PAGE_MARGIN, PAGE_MARGIN - 8, LOGO_WIDTH_MM, LOGO_HEIGHT_MM) } catch(e){} } const tY=PAGE_MARGIN+(logoDataUrl?LOGO_HEIGHT_MM-5:0); doc.setFontSize(16).setFont('helvetica','bold').setTextColor(...PDF_THEME.PRIMARY).text(title, w/2, tY, {align:'center'}); doc.setFontSize(9).setFont('helvetica','normal').setTextColor(...PDF_THEME.TEXT_MUTED).text(`${campaignName} | ${dateRangeStr}`, w/2, tY+6, {align:'center'}); doc.setDrawColor(...PDF_THEME.SECONDARY).setLineWidth(0.2).line(PAGE_MARGIN, tY+10, w-PAGE_MARGIN, tY+10); const fY=h-8; const gD=format(new Date(), "dd/MM/yy HH:mm"); doc.setFontSize(8).setTextColor(...PDF_THEME.TEXT_MUTED).text("Gerado por USBMKT", PAGE_MARGIN, fY).text(gD, w/2, fY, {align:'center'}).text(`Pág ${pageNum}/${totalPages}`, w-PAGE_MARGIN, fY, {align:'right'}); };
  const addPdfText = (doc: jsPDFWithAutoTable, text: string, x: number, y: number, options: any = {}, size: number = 10, style: string = 'normal', color: number[] = PDF_THEME.TEXT): { y: number, addedPage: boolean } => { const pH=doc.internal.pageSize.height; const pW=doc.internal.pageSize.width; const csY=PAGE_MARGIN+(logoDataUrl?LOGO_HEIGHT_MM+12:17); const ceY=pH-FOOTER_HEIGHT-PAGE_MARGIN; const lH=(size/doc.internal.scaleFactor)*1.25; doc.setFontSize(size).setFont('helvetica',style).setTextColor(color[0],color[1],color[2]); const ls=doc.splitTextToSize(text,options.maxWidth||(pW-x-PAGE_MARGIN)); const nH=ls.length*lH; let cY=y<csY?csY:y; let aP=false; if(cY+nH>ceY){doc.addPage();const cP=doc.internal.getNumberOfPages();addPdfHeaderFooter(doc,cP,cP,"Continuação...", "","");cY=csY;aP=true} doc.text(ls,x,cY,options); return{y:cY+nH,addedPage:aP}; };
  const addSectionTitle = (doc: jsPDFWithAutoTable, title: string, y: number): number => { doc.setFontSize(13).setFont('helvetica','bold').setTextColor(...PDF_THEME.PRIMARY); doc.text(title, PAGE_MARGIN, y + 3); const tW=doc.getStringUnitWidth(title)*doc.getFontSize()/doc.internal.scaleFactor; doc.setDrawColor(...PDF_THEME.SECONDARY).setLineWidth(0.3).line(PAGE_MARGIN, y + 4.5, PAGE_MARGIN + tW + 3, y + 4.5); return y + 10; };

  // Função para desenhar um placeholder de gráfico
  const addChartPlaceholder = (doc: jsPDFWithAutoTable, title: string, y: number, height: number = 50): number => {
    const chartX = PAGE_MARGIN + 10;
    const chartWidth = doc.internal.pageSize.width - (PAGE_MARGIN * 2) - 20;
    const textY = y + height / 2;

    // Verifica se cabe na página
    if (y + height > doc.internal.pageSize.height - FOOTER_HEIGHT - PAGE_MARGIN) {
      doc.addPage();
      y = PAGE_MARGIN + (logoDataUrl ? LOGO_HEIGHT_MM + 12 : 17); // Reset Y na nova página
      // Redesenhar cabeçalho seria ideal aqui se for um relatório longo
    }

    doc.setDrawColor(...PDF_THEME.TABLE_BORDER).setLineWidth(0.2);
    doc.setFillColor(...PDF_THEME.TABLE_ALT_BG);
    doc.rect(chartX, y, chartWidth, height, 'FD'); // Desenha retângulo com preenchimento e borda
    doc.setFont('helvetica', 'italic').setTextColor(...PDF_THEME.TEXT_MUTED).setFontSize(10);
    doc.text(`[ ${title} (Gráfico Placeholder) ]`, doc.internal.pageSize.width / 2, textY, { align: 'center', baseline: 'middle' });
    return y + height + 10; // Retorna nova posição Y com espaçamento
};

  // --- Funções de Conteúdo PDF (Tema Claro, Tabelas Aprimoradas, Placeholders Gráfico) ---
  const addCampaignsContent = (doc: jsPDFWithAutoTable, data: any[], currentY: number): { y: number } => { let y=addSectionTitle(doc,"Campanhas", currentY); if(!Array.isArray(data)||data.length===0){return{y:addPdfText(doc,"Nenhuma campanha.",PAGE_MARGIN,y,{},10,'italic',PDF_THEME.TEXT_MUTED).y+5};} try{const h=[['Nome','Plat.','Objetivo','Orçamento Total','Orçamento Diário','Duração (d)']];const b=data.map(c=>[c?.name??'N/A',(Array.isArray(c?.platform)?c.platform.join(', '):c?.platform)??'N/A',(Array.isArray(c?.objective)?c.objective.join(', '):c?.objective)??'N/A',typeof c?.budget==='number'?formatCurrency(c.budget):'N/A',typeof c?.daily_budget==='number'?formatCurrency(c.daily_budget):'N/A',c?.duration??'N/A']);doc.autoTable({...getBaseTableOptions(y,logoDataUrl),head:h,body:b, columnStyles:{3:{halign:'right'},4:{halign:'right'},5:{halign:'center'}}}); return { y:(doc.lastAutoTable?.finalY??y)+12 };} catch(e:unknown){const ed=(e instanceof Error?e.message:'Erro.');return{y:addPdfText(doc,`Erro Tab Campanha: ${ed}`,PAGE_MARGIN,y,{},10,'normal',PDF_THEME.ERROR).y+5};}};
  const addBudgetContent = (doc: jsPDFWithAutoTable, data: any, currentY: number): { y: number } => { let y=addSectionTitle(doc,"Orçamento", currentY); if(!data||typeof data!=='object'){return{y:addPdfText(doc,"Dados inválidos.",PAGE_MARGIN,y,{},10,'italic',PDF_THEME.TEXT_MUTED).y+5};} y=addPdfText(doc,`Orçamento Total: ${data.totalBudgetFmt??'N/A'}`,PAGE_MARGIN,y,{},11,'bold',PDF_THEME.PRIMARY).y+5; y=addPdfText(doc,`- Tráfego: ${data.trafficCostFmt??'N/A'} (${formatPercentage(data.trafficPerc)})`,PAGE_MARGIN+5,y).y+1; y=addPdfText(doc,`- Criativos: ${data.creativeCostFmt??'N/A'} (${formatPercentage(data.creativePerc)})`,PAGE_MARGIN+5,y).y+1; y=addPdfText(doc,`- Operacional: ${data.operationalCostFmt??'N/A'} (${formatPercentage(data.opPerc)})`,PAGE_MARGIN+5,y).y+1; y=addPdfText(doc,`- Lucro Esperado: ${data.profitFmt??'N/A'} (${formatPercentage(data.profitPerc)})`,PAGE_MARGIN+5,y).y+1; if(data.unallocatedValue!=null&&!isNaN(data.unallocatedValue)&&data.unallocatedValue>0.01){y=addPdfText(doc,`- Ñ Alocado: ${data.unallocatedFmt??'N/A'} (${formatPercentage(data.unallocatedPerc)})`,PAGE_MARGIN+5,y,{},9,'italic',PDF_THEME.TEXT_MUTED).y+1;} y = addChartPlaceholder(doc, "Distribuição do Orçamento", y+4); return{y: y+5}; };
  const addFunnelContent = (doc: jsPDFWithAutoTable, data: any, currentY: number): { y: number } => { let y=addSectionTitle(doc, `Funil: ${data.clientName||'Cliente'} | ${data.productName||'Produto'}`, currentY); if(!data||typeof data!=='object'){return{y:addPdfText(doc,"Dados inválidos.",PAGE_MARGIN,y,{},10,'italic',PDF_THEME.TEXT_MUTED).y+5};} if(data.funnelData&&Array.isArray(data.funnelData)&&data.funnelData.length>0){y=addPdfText(doc,"Etapas (Sim. Diária):",PAGE_MARGIN,y,{},10,'bold',PDF_THEME.SECONDARY).y+2;const sBody=data.funnelData.map((s:any)=>[s.name||'?',s.displayValue??formatNumber(s.value)]);doc.autoTable({...getBaseTableOptions(y,logoDataUrl),head:[['Etapa','Valor/Dia']],body:sBody,tableWidth:'wrap',styles:{fontSize:8.5},headStyles:{fontSize:9},columnStyles:{1:{halign:'right'}}});y=(doc.lastAutoTable?.finalY??y)+8;}else{y=addPdfText(doc,"Etapas ñ disponíveis.",PAGE_MARGIN,y,{},10,'italic',PDF_THEME.TEXT_MUTED).y+4;} y=addPdfText(doc,"Resumo Financeiro (Estimativa):",PAGE_MARGIN,y,{},10,'bold',PDF_THEME.SECONDARY).y+2;const sumBody=[['Volume (D/S/M)',`${formatNumber(data.volume?.daily)}/${formatNumber(data.volume?.weekly)}/${formatNumber(data.volume?.monthly)}`],['Faturamento (D/S/M)',`${formatCurrency(data.revenue?.daily)}/${formatCurrency(data.revenue?.weekly)}/${formatCurrency(data.revenue?.monthly)}`],['Lucro (D/S/M)',`${formatCurrency(data.profit?.daily)}/${formatCurrency(data.profit?.weekly)}/${formatCurrency(data.profit?.monthly)}`],];doc.autoTable({...getBaseTableOptions(y,logoDataUrl),head:[['Indicador','Estimativa']],body:sumBody,styles:{fontSize:8.5},headStyles:{fontSize:9},columnStyles:{0:{fontStyle:'bold'},1:{halign:'right'}}});return{y:(doc.lastAutoTable?.finalY??y)+12}; };
  const addMetricsContent = (doc: jsPDFWithAutoTable, data: any, currentY: number): { y: number } => { let y = addSectionTitle(doc, "Métricas", currentY); if (!data || !data.totals) { return { y: addPdfText(doc, "Dados inválidos.", PAGE_MARGIN, y, {}, 10, 'italic', PDF_THEME.TEXT_MUTED).y + 5 }; } const t = data.totals; const totBody = [ ['Cliques',formatNumber(t.clicks)],['Impressões',formatNumber(t.impressions)],['Conversões',formatNumber(t.conversions)],['Custo Total',formatCurrency(t.cost)],['Receita Total',formatCurrency(t.revenue)],['CTR',`${formatDecimal(t.ctr,2)}%`],['CPC Médio',formatCurrency(t.cpc)],['Tx Conv',`${formatDecimal(t.conversionRate,2)}%`],['Custo/Conv',formatCurrency(t.costPerConversion)],['ROI',!isFinite(t.roi??NaN)?'N/A':`${formatDecimal(t.roi,1)}%`], ]; doc.autoTable({ ...getBaseTableOptions(y, logoDataUrl), head: [['Métrica', 'Valor Total']], body: totBody, columnStyles:{0:{fontStyle:'bold'}, 1:{halign:'right'}}}); y = (doc.lastAutoTable?.finalY ?? y) + 8; y = addChartPlaceholder(doc, "Gráfico Receita vs. Custo Diário", y); if (data.dailyData && Array.isArray(data.dailyData) && data.dailyData.length > 0) { y = addPdfText(doc, "Detalhes Diários:", PAGE_MARGIN, y, {}, 10, 'bold', PDF_THEME.SECONDARY).y + 2; try { const dBody=data.dailyData.map((d: any)=>{let fd='Inv';try{if(typeof d.date==='string'&&d.date.match(/^\d{4}-\d{2}-\d{2}/)){const p=parseISO(d.date);if(isValid(p))fd=format(p,DATE_FORMAT_DISPLAY);}else if(d.date instanceof Date&&isValid(d.date)){fd=format(d.date,DATE_FORMAT_DISPLAY)}}catch(e){}return[fd,formatNumber(d.clicks),formatNumber(d.conversions),formatCurrency(d.cost),formatCurrency(d.revenue)];}); doc.autoTable({...getBaseTableOptions(y, logoDataUrl), head:[['Data','Cliques','Conv','Custo','Receita']], body:dBody, styles:{fontSize:8}, headStyles:{fontSize:8.5}}); y = (doc.lastAutoTable?.finalY ?? y) + 10; } catch (e: unknown) { const ed=(e instanceof Error?e.message:'Erro.'); y = addPdfText(doc, `Erro Tabela Diária: ${ed}.`, PAGE_MARGIN, y, {}, 10, 'normal', PDF_THEME.ERROR).y + 5; } } else { y = addPdfText(doc, "Nenhum dado diário.", PAGE_MARGIN, y, {}, 10, 'italic', PDF_THEME.TEXT_MUTED).y + 5; } return { y }; };
  const addLtvContent = (doc: jsPDFWithAutoTable, data: any, currentY: number): { y: number } => { let y=addSectionTitle(doc,"Lifetime Value (LTV)",currentY); if (!data?.inputs || data.result===undefined || data.result===null){return{y:addPdfText(doc,"Dados LTV inválidos.",PAGE_MARGIN,y,{},10,'italic',PDF_THEME.TEXT_MUTED).y+5}} y=addPdfText(doc,`Parâmetros:`,PAGE_MARGIN,y,{},10,'bold',PDF_THEME.SECONDARY).y+2; y=addPdfText(doc,` • Ticket Médio: ${formatCurrency(data.inputs.avgTicket)}`,PAGE_MARGIN+3,y).y+1; y=addPdfText(doc,` • Freq. Compra (mês): ${formatDecimal(data.inputs.purchaseFrequency,1)}`,PAGE_MARGIN+3,y).y+1; y=addPdfText(doc,` • Tempo Vida (meses): ${formatNumber(data.inputs.customerLifespan)}`,PAGE_MARGIN+3,y).y+6; doc.setFillColor(...PDF_THEME.SUCCESS, 0.1); doc.setDrawColor(...PDF_THEME.SUCCESS); doc.setLineWidth(0.2); doc.roundedRect(PAGE_MARGIN, y - 3, doc.internal.pageSize.width - PAGE_MARGIN * 2, 12, 3, 3, 'FD'); y=addPdfText(doc,`LTV Estimado: ${formatCurrency(data.result)}`,PAGE_MARGIN+5, y,{},11,'bold',PDF_THEME.SUCCESS).y ; return{y:y+12}; };
  const addGeneralContent = (doc: jsPDFWithAutoTable, data: any, currentY: number): { y: number } => { let y = addSectionTitle(doc, "Resumo Geral", currentY); if (!data) { return { y: addPdfText(doc, "Dados gerais ñ enc.", PAGE_MARGIN, y, {}, 10, 'italic', PDF_THEME.TEXT_MUTED).y + 5 } } const itemStyle = {size: 9, style: 'normal', color: PDF_THEME.TEXT}; const valueStyle = {size: 9, style: 'bold', color: PDF_THEME.TEXT}; if (data.metrics?.totals) { y=addPdfText(doc,"Métricas:",PAGE_MARGIN+2,y,{},10,'bold',PDF_THEME.SECONDARY).y+1.5; const t=data.metrics.totals; y=addPdfText(doc,` Custo: ${formatCurrency(t.cost)} | Receita: ${formatCurrency(t.revenue)}`,PAGE_MARGIN+4,y, {}, itemStyle.size, itemStyle.style, itemStyle.color).y; const roi=!isFinite(t.roi??NaN)?'N/A':`${formatDecimal(t.roi,1)}%`; y=addPdfText(doc,` ROI: ${roi} | Conv: ${formatNumber(t.conversions)}`,PAGE_MARGIN+4,y, {}, itemStyle.size, itemStyle.style, itemStyle.color).y; } else { y = addPdfText(doc, "Métricas ñ disp.", PAGE_MARGIN + 2, y, {}, 9, 'italic', PDF_THEME.TEXT_MUTED).y; } y += 3; if (data.funnel) { y=addPdfText(doc,"Funil (Diário):",PAGE_MARGIN+2,y,{},10,'bold',PDF_THEME.SECONDARY).y+1.5; y=addPdfText(doc,` Vendas: ${formatNumber(data.funnel.volume?.daily)} | Fat: ${formatCurrency(data.funnel.revenue?.daily)} | Lucro: ${formatCurrency(data.funnel.profit?.daily)}`,PAGE_MARGIN+4,y, {}, itemStyle.size, itemStyle.style, itemStyle.color).y; } else { y = addPdfText(doc, "Funil ñ disp.", PAGE_MARGIN + 2, y, {}, 9, 'italic', PDF_THEME.TEXT_MUTED).y; } y += 3; if (data.ltv?.result != null || data.funnel?.clientName) { y = addPdfText(doc, "Cliente & LTV:", PAGE_MARGIN + 2, y, {}, 10, 'bold', PDF_THEME.SECONDARY).y + 1.5; if(data.ltv?.result!=null){y=addPdfText(doc,` LTV: ${formatCurrency(data.ltv.result)}`,PAGE_MARGIN+4,y, {}, itemStyle.size, 'bold', PDF_THEME.SUCCESS).y;}else{y=addPdfText(doc,"- LTV ñ disp.",PAGE_MARGIN+4,y,{},9,'italic',PDF_THEME.TEXT_MUTED).y;} if(data.funnel?.clientName){y=addPdfText(doc,` Cliente: ${data.funnel.clientName} | Produto: ${data.funnel.productName||'N/A'}`,PAGE_MARGIN+4,y, {}, itemStyle.size, itemStyle.style, itemStyle.color).y;} } else { y = addPdfText(doc, "Cliente/LTV ñ disp.", PAGE_MARGIN + 2, y, {}, 9, 'italic', PDF_THEME.TEXT_MUTED).y; } y += 3; if (data.budget) { y = addPdfText(doc, "Orçamento:", PAGE_MARGIN + 2, y, {}, 10, 'bold', PDF_THEME.SECONDARY).y + 1.5; y=addPdfText(doc,`- Total: ${data.budget.totalBudgetFmt??'N/A'} | Tráfego: ${formatPercentage(data.budget.trafficPerc)}`,PAGE_MARGIN+4,y, {}, itemStyle.size, itemStyle.style, itemStyle.color).y; y=addPdfText(doc,`- Criativos: ${formatPercentage(data.budget.creativePerc)} | Operacional: ${formatPercentage(data.budget.opPerc)}`,PAGE_MARGIN+4,y, {}, itemStyle.size, itemStyle.style, itemStyle.color).y; } else { y = addPdfText(doc, "Orçamento ñ disp.", PAGE_MARGIN + 2, y, {}, 9, 'italic', PDF_THEME.TEXT_MUTED).y; } return { y: y + 10 }; };

  // --- Lógica Principal de Geração PDF ---
  const generatePdf = async (reportType: ReportType) => {
    if (!dateRange?.from || !dateRange?.to) { toast({ title: "Seleção Necessária", variant: "destructive" }); return; }
    setIsLoading(prev => ({ ...prev, [reportType]: true }));
    const dateRangeFormatted = getFormattedDateRange();
    if (!dateRangeFormatted) { toast({ title: "Erro Data", variant: "destructive" }); setIsLoading(prev => ({ ...prev, [reportType]: false })); return; }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as jsPDFWithAutoTable;
    let totalPages = 1;
    const campaignName = selectedCampaignId === 'all' ? 'Todas Campanhas' : campaigns.find(c => c.id === selectedCampaignId)?.name || 'Campanha Específica';
    const dateRangeStr = getDisplayDateRange();
    let title = "Relatório"; let data: any = null; let currentY = PAGE_MARGIN + (logoDataUrl ? LOGO_HEIGHT_MM + 12 : 17);
    let errorMessage = ''; const backendMessage = " Verifique API.";

    try {
      if (typeof doc.autoTable !== 'function') { throw new Error('Plugin jspdf-autotable não carregado.'); }
      switch(reportType){ case 'campaigns': title="Rel. Campanhas"; break; case 'budget': title="Rel. Orçamento"; break; case 'metrics': title="Rel. Métricas"; break; case 'funnel': title="Rel. Funil"; break; case 'ltv': title="Rel. LTV"; break; case 'general': title="Rel. Geral"; break; }
      addPdfHeaderFooter(doc, 1, totalPages, title, campaignName, dateRangeStr);

      const params = { startDate: dateRangeFormatted.start, endDate: dateRangeFormatted.end, campaignId: selectedCampaignId };
      const requiresBackend = ['budget', 'metrics', 'funnel', 'ltv', 'general'].includes(reportType);

      // Switch Case para buscar dados e adicionar conteúdo
      switch (reportType) {
        case 'campaigns': try {const r=await axios.get('/api/campaigns',{params});if(!Array.isArray(r.data))throw new Error("Dados inválidos");data=r.data;currentY=addCampaignsContent(doc, data, currentY).y;} catch (e:unknown){errorMessage=(axios.isAxiosError(e)?e.response?.data?.message:(e instanceof Error?e.message:'Erro'));console.error("E:",e);currentY=addPdfText(doc,`Erro: ${errorMessage}.`,PAGE_MARGIN,currentY,{},10,'normal',PDF_THEME.ERROR).y;} break;
        case 'budget': try {const r=await axios.get(`/api/budget`,{params});data=r.data;currentY=addBudgetContent(doc,data,currentY).y;} catch (e:unknown){errorMessage=(axios.isAxiosError(e)?e.response?.data?.message:(e instanceof Error?e.message:'Erro'));console.error("E:",e);currentY=addPdfText(doc,`Erro: ${errorMessage}.${requiresBackend?backendMessage:''}`,PAGE_MARGIN,currentY,{},10,'normal',PDF_THEME.ERROR).y;} break;
        case 'metrics': try {const r=await axios.get(`/api/metrics`,{params});data=r.data;currentY=addMetricsContent(doc,data,currentY).y;} catch (e:unknown){errorMessage=(axios.isAxiosError(e)?e.response?.data?.message:(e instanceof Error?e.message:'Erro'));console.error("E:",e);currentY=addPdfText(doc,`Erro: ${errorMessage}.${requiresBackend?backendMessage:''}`,PAGE_MARGIN,currentY,{},10,'normal',PDF_THEME.ERROR).y;} break;
        case 'funnel': try {const r=await axios.get(`/api/funnel`,{params});data=r.data;currentY=addFunnelContent(doc,data,currentY).y;} catch (e:unknown){errorMessage=(axios.isAxiosError(e)?e.response?.data?.message:(e instanceof Error?e.message:'Erro'));console.error("E:",e);currentY=addPdfText(doc,`Erro: ${errorMessage}.${requiresBackend?backendMessage:''}`,PAGE_MARGIN,currentY,{},10,'normal',PDF_THEME.ERROR).y;} break;
        case 'ltv': try {const r=await axios.get(`/api/ltv`,{params});data=r.data;currentY=addLtvContent(doc,data,currentY).y;} catch (e:unknown){errorMessage=(axios.isAxiosError(e)?e.response?.data?.message:(e instanceof Error?e.message:'Erro'));console.error("E:",e);currentY=addPdfText(doc,`Erro: ${errorMessage}.${requiresBackend?backendMessage:''}`,PAGE_MARGIN,currentY,{},10,'normal',PDF_THEME.ERROR).y;} break;
        case 'general': try {const[m,f,l,b]=await Promise.all([axios.get('/api/metrics',{params}),axios.get('/api/funnel',{params}),axios.get('/api/ltv',{params}),axios.get('/api/budget',{params})]);data={metrics:m.data,funnel:f.data,ltv:l.data,budget:b.data};currentY=addGeneralContent(doc,data,currentY).y;} catch (e:unknown){errorMessage='Falha busca geral.';if(axios.isAxiosError(e))errorMessage=e.response?.data?.message||e.message||errorMessage;else if(e instanceof Error)errorMessage=e.message;console.error("E geral:",e);currentY=addPdfText(doc,`Erro: ${errorMessage}.${backendMessage}`,PAGE_MARGIN,currentY,{},10,'normal',PDF_THEME.ERROR).y;} break;
        default: throw new Error(`Tipo inválido: ${reportType}`);
      }

      // Conclusão e Atualização de Rodapés
      if (!errorMessage) { addPdfText(doc, "Relatório concluído.", PAGE_MARGIN, currentY + 8, {}, 9, 'italic', PDF_THEME.TEXT_MUTED); } // Mais espaço
      totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) { doc.setPage(i); addPdfHeaderFooter(doc, i, totalPages, title, campaignName, dateRangeStr); }

      // Salvar
      const safeName = campaignName.replace(/[^a-zA-Z0-9]/g,'_'); const finalTitle = title.replace(/\s+/g,'_');
      const fileName = `${finalTitle}_${safeName}_${dateRangeFormatted.start}_a_${dateRangeFormatted.end}.pdf`;
      doc.save(fileName);
      if (!errorMessage) { toast({ title: "Sucesso!", description: `${title} exportado.` }); }

    } catch (error: any) { console.error(`Erro GERAL PDF ${reportType}:`, error); if (!errorMessage) { errorMessage = error.message || 'Erro PDF.'; toast({ title: "Erro Crítico", description: `Falha: ${errorMessage}.`, variant: "destructive" }); } try {const eDoc=new jsPDF({orientation:'p',unit:'mm',format:'a4'}); addPdfHeaderFooter(eDoc as jsPDFWithAutoTable, 1, 1, "ERRO", campaignName, dateRangeStr); addPdfText(eDoc as jsPDFWithAutoTable, `Erro Crítico:\n${errorMessage}`, PAGE_MARGIN, PAGE_MARGIN+LOGO_HEIGHT_MM+12,{},10,'bold',PDF_THEME.ERROR); eDoc.save(`ERRO_${reportType}.pdf`);} catch(fe){} } finally { setIsLoading(prev => ({ ...prev, [reportType]: false })); }
  };

  // --- Renderização JSX ---
  return (
    <Layout>
       <Head> <title>Exportar Relatórios | USBMKT</title> </Head>
       <div className="container mx-auto p-4 py-6">
        <h1 className="text-2xl font-bold mb-6 text-white">Exportar Relatórios</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Card Filtros */}
          <Card className={cardStyle}> <CardHeader className="pb-2"> <CardTitle className={titleStyle}>Filtros</CardTitle> <CardDescription className="text-slate-400">Critérios</CardDescription> </CardHeader> <CardContent> <div className="grid gap-3"> <div className="space-y-1.5"> <Label htmlFor="campaign" className="text-sm font-medium text-slate-300">Campanha</Label> <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId} disabled={campaignsLoading||Object.values(isLoading).some(Boolean)} > <SelectTrigger id="campaign" className={selectTriggerStyle} aria-label="Selec Campanha"> <SelectValue placeholder={campaignsLoading ? "Carregando..." : "Selecione..."} /> </SelectTrigger> <SelectContent className={`${neumorphicBaseStyle} border-[#1E90FF]/20`}> {campaignsLoading ? ( <SelectItem value="loading" disabled>Carregando...</SelectItem> ) : ( <> <SelectItem value="all">Todas Campanhas</SelectItem> {campaigns.length > 0 ? campaigns.map((c) => ( <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem> )) : ( <SelectItem value="no-camps" disabled>Nenhuma</SelectItem> )} </> )} </SelectContent> </Select> </div> <div className="space-y-1.5"> <Label htmlFor="datePeriod" className="text-sm font-medium text-slate-300">Período</Label> <Popover open={popoverOpen} onOpenChange={setPopoverOpen}> <PopoverTrigger as={Button} id="datePeriod" variant="outline" className={cn("w-full justify-start text-left font-normal", selectTriggerStyle, !dateRange && "text-muted-foreground")} disabled={Object.values(isLoading).some(Boolean)} > <CalendarIcon className="mr-2 h-4 w-4" /> {getDisplayDateRange()} </PopoverTrigger> <PopoverContent className={popoverContentStyle} align="start"> <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={(range) => { setDateRange(range); setPopoverOpen(false); }} numberOfMonths={2} locale={ptBR} disabled={Object.values(isLoading).some(Boolean)} className="text-white [&>div>table>tbody>tr>td>button]:text-white [&>div>table>tbody>tr>td>button]:border-[#1E90FF]/20 [&>div>table>thead>tr>th]:text-gray-400 [&>div>div>button]:text-white [&>div>div>button:hover]:bg-[#1E90FF]/20 [&>div>div>div]:text-white" /> </PopoverContent> </Popover> </div> </div> </CardContent> </Card>
          {/* Card Informações */}
           <Card className={cardStyle}> <CardHeader className="pb-2"> <CardTitle className={titleStyle}>Informações</CardTitle> <CardDescription className="text-slate-400">Relatórios</CardDescription> </CardHeader> <CardContent className="space-y-2 text-xs text-slate-300"> <p><span className="font-medium text-white">Campanhas:</span> Detalhes.</p> <p><span className="font-medium text-white">Orçamento:</span> Gastos. <span className="text-red-500 text-[10px]">(API Req.)</span></p> <p><span className="font-medium text-white">Métricas:</span> KPIs. <span className="text-red-500 text-[10px]">(API Req.)</span></p> <p><span className="font-medium text-white">Funil:</span> Conversão. <span className="text-red-500 text-[10px]">(API Req.)</span></p> <p><span className="font-medium text-white">LTV:</span> Valor cliente. <span className="text-red-500 text-[10px]">(API Req.)</span></p> <p><span className="font-medium text-white">Geral:</span> Consolidado. <span className="text-red-500 text-[10px]">(API Req.)</span></p> <p className="mt-2 text-yellow-500 text-[11px]">Nota: <span className="text-red-500">(API Req.)</span> = Requer API Backend.</p> </CardContent> </Card>
        </div>
        {/* Botões Exportar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(['campaigns', 'budget', 'metrics', 'funnel', 'ltv', 'general'] as ReportType[]).map((reportType) => {
             const cfg = { campaigns: { title: "Campanhas", i: FileText, d: "Detalhes" }, budget: { title: "Orçamento", i: DollarSign, d: "Gastos" }, metrics: { title: "Métricas", i: BarChart3, d: "KPIs" }, funnel: { title: "Funil", i: Filter, d: "Conversão" }, ltv: { title: "LTV", i: TrendingUp, d: "Valor" }, general: { title: "Geral", i: LineChart, d: "Consolidado" }, }[reportType];
             const Icon = cfg.i; const reqB = ['budget','metrics','funnel','ltv','general'].includes(reportType);
             return ( <Card key={reportType} className={`${cardStyle} hover:shadow-[0_5px_15px_rgba(30,144,255,0.2)]`}> <CardHeader className="pb-2"> <CardTitle className="flex items-center gap-2"> <Icon className="h-5 w-5 text-[#1E90FF]" /> <span className={titleStyle}>{cfg.title}</span> </CardTitle> <CardDescription className="text-slate-400 text-xs">{cfg.d}{reqB && <span className="text-red-500 ml-1 text-[10px]">(API)</span>}</CardDescription> </CardHeader> <CardContent className="pt-4"> <Button onClick={() => generatePdf(reportType)} disabled={isLoading[reportType] || campaignsLoading || !dateRange?.from || !dateRange?.to} className={`${primaryButtonStyle} w-full`} > {isLoading[reportType] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} Exportar PDF </Button> </CardContent> </Card> );
          })}
        </div>
      </div>
    </Layout>
  );
} // <<< FIM DO COMPONENTE <<< --- VERIFIQUE ESTA CHAVE