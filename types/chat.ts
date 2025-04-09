// types/chat.ts (ou interfaces/chat.ts)

export interface Message {
  id: string; // <<< GARANTIR QUE ID é sempre string
  sender: 'user' | 'ai';
  text: string;
  timestamp: string; // Manter como string (ISO)
}

export interface Conversation {
    id: string; // ID pode ser string (UUID) ou number
    title: string;
    date: string; // Ou Date
    messages: Message[];
}

export interface ModelConfig {
    useLocal: boolean;
    modelName: string;
    modelPath?: string;
    temperature: number;
    maxTokens: number;
    repetitionPenalty: number;
    // Outros parâmetros...
}