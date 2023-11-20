import dynamic from 'next/dynamic'

const FirebaseAuthProvider = dynamic(() => import("@/components/FirebaseAuthContext").then(mod => mod.FirebaseAuthProvider))
const QueryClientProvider = dynamic(() => import("react-query").then(mod => mod.QueryClientProvider))
const ThemeProvider = dynamic(() => import("@material-tailwind/react").then(mod => mod.ThemeProvider))
const AnimatePresence = dynamic(() => import("framer-motion").then(mod => mod.AnimatePresence))
const LazyMotion = dynamic(() => import("framer-motion").then(mod => mod.LazyMotion))
const GoogleAnalytics = dynamic(() => import("nextjs-google-analytics").then(mod => mod.GoogleAnalytics))
const GoogleOAuthProvider = dynamic(() => import("@react-oauth/google").then(mod => mod.GoogleOAuthProvider))

import { QueryClient } from 'react-query'
import { Poppins } from 'next/font/google'
import type { AppProps } from 'next/app'
import '@/styles/globals.css'

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
