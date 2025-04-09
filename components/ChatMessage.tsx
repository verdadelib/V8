// components/ChatMessage.tsx
import React from 'react';
import { Message } from '@/types/chat'; // Importa do arquivo centralizado
import styles from '@/styles/Chat.module.css';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Importa o Avatar (que você adicionará)
import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';

// Props do componente
interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.sender === 'user';

  return (
    <div className={cn(
        styles.message, // Classe base do módulo CSS
        "flex items-start gap-3 w-full", // Ocupa largura total para alinhamento
        isUser ? "justify-end" : "justify-start"
    )}>
      {/* Avatar (AI) - Renderiza primeiro se for AI */}
      {!isUser && (
        <Avatar className="h-8 w-8 border border-border flex-shrink-0"> {/* flex-shrink-0 evita encolher */}
          {/* <AvatarImage src="/ai-avatar.png" alt="AI" /> */}
          <AvatarFallback className='bg-secondary text-secondary-foreground flex items-center justify-center'> {/* Centraliza ícone */}
              <Bot size={16} />
          </AvatarFallback>
        </Avatar>
      )}

      {/* Balão da Mensagem */}
      <div
        className={cn(
          "max-w-[75%] rounded-lg px-3 py-2 text-sm", // Estilo base
          isUser
            ? "bg-primary text-primary-foreground rounded-br-none" // Estilo user
            : "bg-secondary text-secondary-foreground rounded-bl-none" // Estilo AI
        )}
        // Estilos inline para garantir quebra de linha correta em todos navegadores
        style={{ overflowWrap: 'break-word', wordWrap: 'break-word', wordBreak: 'break-word', hyphens: 'auto' }}
      >
        {message.text}
      </div>

       {/* Avatar (User) - Renderiza por último se for User */}
       {isUser && (
        <Avatar className="h-8 w-8 border border-border flex-shrink-0">
          {/* <AvatarImage src={user?.imageUrl} alt={user?.firstName} /> */}
          <AvatarFallback className='bg-primary text-primary-foreground flex items-center justify-center'> {/* Centraliza ícone */}
              <User size={16}/>
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default ChatMessage;