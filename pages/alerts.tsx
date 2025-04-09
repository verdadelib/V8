// pages/alerts.tsx
import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head'; // <<< ADICIONAR IMPORTAÇÃO DO HEAD
import Layout from '@/components/layout'; // Importar Layout
// ... outros imports (Card, Button, ScrollArea, Badge, useToast, Lucide icons, cn, format, ptBR) ...
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Bell, Info, AlertTriangle, CheckCircle2, AlertCircle, Clock, Eye, Filter, Trash2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';


// Interface AlertItem (como definida anteriormente)
interface AlertItem {
  id?: number | string;
  type: "info" | "warning" | "success" | "error" | string;
  message: string;
  metric?: string | null;
  value?: number | string | null;
  threshold?: number | string | null;
  created_date: string;
  read: boolean;
  campaignId?: string | null;
  campaignName?: string | null;
}

// Função mock Alert (como definida anteriormente)
const Alert = { /* ... (código mock como antes) ... */ list: async(): Promise<AlertItem[]> => {return[];}, create: async(d:any): Promise<AlertItem> => ({id:''+Date.now(),...d}), update: async(id:any,d:any): Promise<AlertItem> => ({id,...d}), delete: async(id:any): Promise<{id:any}> => ({id}) };

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<AlertItem[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Funções generateInitialAlerts, loadData, generateRandomAlert, applyFilter, markAsRead, etc.
  // (Mantenha o código dessas funções como na versão anterior, com a tipagem correta)
  const generateInitialAlerts = useCallback((): AlertItem[] => { /* ... */ return []; }, []);
  const loadData = useCallback(async () => { /* ... */ setLoading(true); try { const alertData = await Alert.list(); if (!Array.isArray(alertData)) throw new Error("Dados inválidos"); const validatedData = alertData.map(a => ({...a, read: Boolean(a.read), created_date: a.created_date || new Date().toISOString()})) as AlertItem[]; setAlerts(validatedData.length === 0 ? generateInitialAlerts() : validatedData); } catch (error: any) { console.error('Erro:', error); toast({ variant: "destructive", title: "Erro", description: error.message }); setAlerts([]); } finally { setLoading(false); } }, [generateInitialAlerts, toast]);
  const generateRandomAlert = useCallback(async () => { /* ... */ }, []);
  const applyFilter = useCallback(() => { /* ... */ }, [alerts, filter]);
  const markAsRead = useCallback(async (alertId?: number | string) => { /* ... */ }, [toast]);
  const markAllAsRead = useCallback(async () => { /* ... */ }, [alerts, toast]);
  const deleteAlert = useCallback(async (alertId?: number | string) => { /* ... */ }, [toast]);
  const clearAllAlerts = useCallback(async () => { /* ... */ }, [alerts, toast]);
  const getAlertIcon = (type: string) => { /* ... */ };
  const formatDate = (dateString: string) => { /* ... */ };

  useEffect(() => { loadData(); const interval = setInterval(generateRandomAlert, 60000); return () => clearInterval(interval); }, [loadData, generateRandomAlert]);
  useEffect(() => { applyFilter(); }, [applyFilter]);

  const neoButtonBase = "border-[#2d62a3]/40 text-gray-300 neo-button";
  const neoButtonActive = "bg-[#3a7ebf]";
  const neoButtonError = "bg-[#f44336]";

  return (
    <Layout>
      {/* <<< CORREÇÃO AQUI >>> */}
      <Head><title>Alertas - USBMKT</title></Head>
      <div className="space-y-6 p-4 md:p-6">
        <h1 className="text-2xl font-black bg-gradient-to-r from-[#3a7ebf] to-[#5ca2e2] text-transparent bg-clip-text">
          Alertas e Notificações
        </h1>
        {/* Filtros e Ações */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          {/* Botões de Filtro */}
          <div className="flex flex-wrap gap-2">
             <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")} className={cn(neoButtonBase, filter === "all" && neoButtonActive)}> <Bell className="mr-2 h-4 w-4" /> Todos </Button>
             <Button variant={filter === "unread" ? "default" : "outline"} onClick={() => setFilter("unread")} className={cn(neoButtonBase, filter === "unread" && neoButtonActive)}> <Eye className="mr-2 h-4 w-4" /> Não Lidos {alerts.filter(a => !a.read).length > 0 && ( <Badge className="ml-2 bg-red-500 text-white">{alerts.filter(a => !a.read).length}</Badge> )} </Button>
             <Button variant={filter === "error" ? "default" : "outline"} onClick={() => setFilter("error")} className={cn(neoButtonBase, filter === "error" && neoButtonError)}> <AlertCircle className="mr-2 h-4 w-4" /> Críticos </Button>
             <Button variant={filter === "warning" ? "default" : "outline"} onClick={() => setFilter("warning")} className={cn(neoButtonBase, filter === "warning" && 'bg-yellow-600')}> <AlertTriangle className="mr-2 h-4 w-4" /> Avisos </Button>
             <Button variant={filter === "success" ? "default" : "outline"} onClick={() => setFilter("success")} className={cn(neoButtonBase, filter === "success" && 'bg-green-600')}> <CheckCircle2 className="mr-2 h-4 w-4" /> Sucesso </Button>
             <Button variant={filter === "info" ? "default" : "outline"} onClick={() => setFilter("info")} className={cn(neoButtonBase, filter === "info" && 'bg-blue-600')}> <Info className="mr-2 h-4 w-4" /> Info </Button>
          </div>
          {/* Botões de Ação */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={markAllAsRead} className={neoButtonBase} disabled={!alerts.some(a => !a.read)}> <CheckCircle2 className="mr-2 h-4 w-4" /> Marcar Todos Lidos </Button>
            <Button variant="destructive" onClick={clearAllAlerts} className={neoButtonBase} disabled={alerts.length === 0}> Limpar Todos </Button>
          </div>
        </div>
        {/* Card Principal com Alertas */}
        <Card className="neo-brutal">
          <CardHeader> <CardTitle>Lista de Alertas</CardTitle> </CardHeader>
          <CardContent>
            {loading ? ( /* Loading spinner */ <div className="text-center p-8">Carregando...</div> ) : (
              <>
                {filteredAlerts.length === 0 ? ( /* Mensagem de Nenhum Alerta */ <div className="text-center p-8 text-gray-500">Nenhuma notificação encontrada.</div> ) : (
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-4">
                      {filteredAlerts.map((alert) => (
                        <div key={alert.id} className={cn("p-4 rounded-lg", alert.read ? "opacity-70" : "border-2", /* Cores */)}>
                          {/* Conteúdo do Alerta */}
                           <div className="flex items-start gap-4">
                                <div className="bg-opacity-20 p-3 rounded-full neo-inset"> {getAlertIcon(alert.type)} </div>
                                <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                    <p className={cn("font-bold text-sm", /* Cores */)}> {alert.message} </p>
                                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2"> {formatDate(alert.created_date)} </span>
                                </div>
                                {alert.metric && ( <div className="mt-1 flex items-center gap-2 flex-wrap"> <Badge>{alert.metric}: {alert.value}</Badge> {alert.threshold && <Badge>Meta: {alert.threshold}</Badge>} </div> )}
                                <div className="mt-3 flex justify-end items-center gap-2">
                                    <Button size="sm" onClick={() => markAsRead(alert.id)} disabled={alert.read} className={cn(neoButtonBase, "h-7 px-2 text-xs", alert.read && "opacity-50")}> <Eye className="mr-1 h-3 w-3" /> {alert.read ? "Lido" : "Marcar Lido"} </Button>
                                    <Button variant="ghost" size="icon" onClick={() => deleteAlert(alert.id)} className="text-red-500 hover:text-red-600 hover:bg-red-500/10 h-7 w-7"> <Trash2 className="h-4 w-4"/> </Button>
                                </div>
                                </div>
                            </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}