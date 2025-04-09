// pages/_app.tsx
import '@/styles/globals.css' // Importa estilos globais
import type { AppProps } from 'next/app'

// **REMOVA QUALQUER WRAPPER DE LAYOUT DAQUI**
function MyApp({ Component, pageProps }: AppProps) {
  // Simplesmente renderiza o componente da página atual
  return <Component {...pageProps} />
}

export default MyApp