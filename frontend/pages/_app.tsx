import { FirebaseAuthProvider } from '@/components/FirebaseAuthContext'
import '@/styles/globals.css'
import { ThemeProvider } from '@material-tailwind/react'
import { AnimatePresence, LazyMotion, domAnimation } from 'framer-motion'
import type { AppProps } from 'next/app'
import { QueryClient, QueryClientProvider } from 'react-query'
import { GoogleAnalytics } from "nextjs-google-analytics";
import dynamic from 'next/dynamic'
import { Montserrat, Poppins } from 'next/font/google'
import { GoogleOAuthProvider } from '@react-oauth/google';

const domMax = () => import("@/lib/anim/domMax").then(res => res.default)

const poppins = Poppins({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-poppins'
})

export default function App({ Component, pageProps }: AppProps) {
  const queryClient = new QueryClient()

  return (
    <main className={poppins.variable}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GCLOUD_CLIENT_ID ?? ""}>
            <FirebaseAuthProvider>
              <LazyMotion features={domMax} strict>
                <AnimatePresence mode="wait">
                  <>
                    <GoogleAnalytics trackPageViews />
                    <Component {...pageProps} />
                  </>
                </AnimatePresence>
              </LazyMotion>
            </FirebaseAuthProvider>
          </GoogleOAuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </main>
  )
}
