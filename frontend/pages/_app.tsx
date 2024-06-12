import type { AppProps } from "next/app";
import dynamic from "next/dynamic";
import { Poppins } from "next/font/google";

import { QueryClient } from "react-query";

import "@/styles/globals.css";
import { AnimatePresence, LazyMotion } from "framer-motion";

const FirebaseAuthProvider = dynamic(() =>
    import("@/components/FirebaseAuthContext").then((mod) => mod.FirebaseAuthProvider),
);
const QueryClientProvider = dynamic(() => import("react-query").then((mod) => mod.QueryClientProvider));
const GoogleOAuthProvider = dynamic(() => import("@react-oauth/google").then((mod) => mod.GoogleOAuthProvider));
const GoogleAnalytics = dynamic(() => import("nextjs-google-analytics").then((mod) => mod.GoogleAnalytics), { ssr: false });

const domMax = () => import("@/lib/anim/domMax").then((res) => res.default);

const poppins = Poppins({
    weight: "400",
    subsets: ["latin"],
    variable: "--font-poppins",
});

export default function App({ Component, pageProps }: AppProps) {
    const queryClient = new QueryClient();

    return (
        <main className={poppins.variable}>
            <QueryClientProvider client={queryClient}>
                <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GCLOUD_CLIENT_ID ?? ""}>
                    <FirebaseAuthProvider>
                        <LazyMotion features={domMax} strict>
                            <AnimatePresence mode="wait">
                                <>
                                    <Component {...pageProps} key="component" />
                                    <GoogleAnalytics trackPageViews />
                                </>
                            </AnimatePresence>
                        </LazyMotion>
                    </FirebaseAuthProvider>
                </GoogleOAuthProvider>
            </QueryClientProvider>
        </main>
    );
}
