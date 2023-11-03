import Head from "next/head"

// import Navbar from "./Navbar"
// import Footer from "./Footer"

import { motion } from "framer-motion"
import { useFirebaseAuth } from "../FirebaseAuthContext";
import { useEffect } from "react";
import { ComplexNavbar } from "./Navbar";
import AdminRestrictedPage from "./AdminRestrictedPage";
import { useRouter } from "next/router";

const transition = { ease: [0.6, 0.01, 0.0, 0.9] };

const contentVariants = {
    initial: { y: 200, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -200, opacity: 0 },
    transition: { duration: 0.4, ...transition }
}

export default function Layout({ name, children, noAnim, className }: { name: string, children: any, noAnim?: boolean, className?: string }) {
    const title = `${name} (Admin) | FraserTickets`;
    const description = "An admin page for FraserTickets.";
    const imageSrc = "CHANGE ME"

    const router = useRouter()

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#fbc7d4]/25  to-[#9796f0]/25 overflow-hidden" key={name}>
            <Head>
                <title>{title}</title>
                <meta name="description" content={description} />

                <meta property="og:title" content={title} />
                <meta property="og:description" content={description} />
                <meta property="og:type" content="website" />
                <meta property="og:image" content={imageSrc} />
                <meta property="og:image:type" content="image/png" />
                <meta property="og:image:width" content="1111" />
                <meta property="og:image:height" content="1111" />

                <meta name="twitter:card" content="summary_large_image" />
                <meta property="twitter:title" content={title} />
                <meta property="twitter:description" content={description} />
                <meta property="twitter:image:src" content={imageSrc} />
            </Head>

            <ComplexNavbar />

            <motion.div
                initial={noAnim ? undefined : contentVariants.initial}
                animate={noAnim ? undefined : contentVariants.animate}
                exit={noAnim ? undefined : contentVariants.exit}
                transition={noAnim ? undefined : contentVariants.transition}
                className={`flex-grow ${className}`}
            >
                <AdminRestrictedPage key={router.pathname}>
                    {children}
                </AdminRestrictedPage>
            </motion.div>


            {/* <Footer /> */}
        </div>
    )
}