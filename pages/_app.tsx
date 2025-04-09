// pages/_app.tsx
import '@/styles/globals.css' // Importa estilos globais
import type { AppProps } from 'next/app'
import { Toaster } from "@/components/ui/toaster" // Import Toaster (necessário para useToast)
import { ReactFlowProvider } from '@xyflow/react'; // Mantém o provider do ReactFlow

// **REMOVIDO O LAYOUT DAQUI** - O Layout será aplicado em cada página individualmente
export default function App({ Component, pageProps }: AppProps) {
  return (
    <ReactFlowProvider> {/* Mantém providers globais */}
        <Component {...pageProps} /> {/* Renderiza o componente da página */}
        <Toaster /> {/* <<< ESSENCIAL PARA useToast FUNCIONAR >>> */}
    </ReactFlowProvider>
  )
}