import { FirebaseAuthProvider } from '@/components/FirebaseAuthContext'
import '@/styles/globals.css'
import { ThemeProvider } from '@material-tailwind/react'
import { AnimatePresence } from 'framer-motion'
import type { AppProps } from 'next/app'
import { QueryClient, QueryClientProvider } from 'react-query'

export default function App({ Component, pageProps }: AppProps) {
  const queryClient = new QueryClient()

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <FirebaseAuthProvider>
          <AnimatePresence mode="wait">
            <Component {...pageProps} />
          </AnimatePresence>
        </FirebaseAuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
