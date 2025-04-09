// Campaign.ts
// No changes needed, providing complete code as requested.

// Interface para tipagem de uma campanha
// <<< DEFINIÇÃO ATUALIZADA PARA CORRESPONDER AOS DADOS USADOS NO Campaign.tsx >>>
export interface Campaign {
    id: number | string; // Pode ser número ou string (como no mock)
    name: string;
    startDate?: string; // Adicionado
    endDate?: string;   // Adicionado
    budget?: number;
    status?: string;    // Adicionado
    revenue?: number;   // Mantido como opcional
    leads?: number;     // Mantido como opcional
    clicks?: number;    // Mantido como opcional
    sales?: number;     // Mantido como opcional
    platform?: string;
    objective?: string;
    daily_budget?: number;
    duration?: number;
    // Campos adicionados que estavam faltando
    industry?: string | null;          // <<< ADICIONADO
    targetAudience?: string | null;  // <<< ADICIONADO
    segmentation?: string | null;      // <<< ADICIONADO
    adFormat?: string | null;          // <<< ADICIONADO
    // Métricas aninhadas
    metrics?: {
      cost?: number;
      impressions?: number;
      ctr?: number;
      cpc?: number;
    };
    // Dados diários (usado no processamento do gráfico)
    dailyData?: {
        date: string;
        revenue?: number;
        clicks?: number;
        leads?: number;
        cost?: number;
    }[];
}


// Função para listar campanhas via API (mantida como exemplo)
export async function list(): Promise<Campaign[]> {
  try {
    // Use a URL base da variável de ambiente se disponível, senão fallback
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    console.log(`[Campaign Entity] Fetching from: ${baseUrl}/api/campaigns`);
    const response = await fetch(`${baseUrl}/api/campaigns`, { // Usando URL completa
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Adicione cabeçalhos de autenticação se necessário
      },
    });

    if (!response.ok) {
       // Tenta ler a mensagem de erro do corpo da resposta
       let errorBody = 'Erro desconhecido';
       try {
           errorBody = await response.text();
       } catch (_) {}
      console.error(`Erro ${response.status}: ${response.statusText}. Body: ${errorBody}`);
      throw new Error(`Erro ao buscar campanhas (${response.status})`);
    }

    const data = await response.json();
     console.log(`[Campaign Entity] Received ${data?.length ?? 0} campaigns.`);
    return data as Campaign[]; // Faz type assertion
  } catch (error) {
    console.error('[Campaign Entity] Erro ao listar campanhas:', error);
    return []; // Retorna array vazio em caso de erro
  }
}

// Função de inicialização (mantida como comentário)
export async function init(): Promise<void> {
  // console.log('Inicialização de campanhas deve ser feita no servidor.');
}