// layout.tsx
import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/ui/sidebar'; // Verifique se este caminho está correto
import { Toaster } from "@/components/ui/toaster"; // Verifique se este caminho está correto
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  // Função para ler estado inicial do localStorage de forma segura
  const getInitialSidebarState = () => {
    if (typeof window !== 'undefined') {
      const storedState = localStorage.getItem('sidebarCollapsed');
      // Retorna o valor armazenado ou 'true' (recolhido) como padrão
      return storedState ? JSON.parse(storedState) : true;
    }
    // Retorna 'true' durante SSR ou se window não estiver disponível
    return true;
  };

  // Inicializa o estado, mas será definido corretamente no useEffect
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState(false); // Controla a montagem no cliente

  // Efeito para buscar o estado do localStorage após a montagem no cliente
  useEffect(() => {
    setIsSidebarCollapsed(getInitialSidebarState());
    setIsMounted(true); // Marca como montado
  }, []); // Executa apenas uma vez

  // Efeito para salvar o estado no localStorage quando ele mudar (após montagem)
  useEffect(() => {
    // Só salva se já estiver montado para evitar problemas com SSR/localStorage
    if (isMounted && typeof window !== 'undefined') {
      localStorage.setItem('sidebarCollapsed', JSON.stringify(isSidebarCollapsed));
    }
  }, [isSidebarCollapsed, isMounted]); // Depende do estado e da montagem

  // Callback para alternar a sidebar
  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prevState => !prevState);
  }, []);

  // Calcula a classe de padding com base no estado (só se montado)
  // Garante que o padding inicial não cause "salto" antes da hidratação
  const mainPaddingClass = isMounted ? (isSidebarCollapsed ? "pl-16" : "pl-60") : "pl-16"; // Usa padding padrão antes de montar

  // Opcional: Renderizar null ou um loader antes de isMounted ser true
  // if (!isMounted) {
  //    return <div>Carregando Layout...</div>; // Ou null
  // }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Renderiza Sidebar apenas se montado para garantir consistência */}
      {isMounted && <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />}

      {/* Conteúdo Principal */}
      <main className={cn(
          "flex-1 pt-4 pb-8", // Padding vertical
          mainPaddingClass, // Padding lateral dinâmico
          "transition-[padding-left] duration-300 ease-in-out" // Animação
      )}>
        {/* Container interno para padding */}
        <div className="px-4 md:px-6">
             {children}
        </div>
      </main>

      {/* <<< ESSENCIAL PARA useToast FUNCIONAR >>> */}
       <Toaster />
    </div>
  );
};

export default Layout;