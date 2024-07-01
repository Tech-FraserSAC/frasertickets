import { useEffect, useState } from "react";

import Image from "next/image";
import Link from "next/link";

import { useFirebaseAuth } from "@/components/FirebaseAuthContext";

import BannerPhoto from "@/assets/landing-banner-4.jpg";

const bottomLine = "FraserTickets".split("  ");

export default function Hero() {
    const { user, loaded } = useFirebaseAuth();
    const [onBrowser, setOnBrowser] = useState(false);

    const signedIn = loaded && user !== null;

    useEffect(() => {
        setOnBrowser(true);
    }, []);

    return (
        <div className="flex flex-col h-[100vh] relative w-full">
            <div
                className="overflow-hidden"
                style={{ boxShadow: "inset 0 0 200px #000000" }}
            >
                <Image
                    src={BannerPhoto}
                    placeholder="blur"
                    className="object-cover object-center w-screen h-screen"
                    alt="Hero image"
                    quality={40}
                    priority={true}
                />
            </div>

            <div className="w-full h-[100vh] absolute bg-black/60 mix-blend-normal" />

            <div className="absolute p-4 md:p-16 z-1 flex flex-col justify-center items-center h-[100vh] w-full">
                <div className="text-center md:mb-4 break-all font-bold flex flex-col flex-wrap gap-2 text-3xl xs:text-5xl sm:text-7xl md:text-8xl lg:text-9xl">
                    {bottomLine.map((char) => (
                        <span
                            className="inline-block relative bg-clip-text text-transparent bg-gradient-to-r from-[#5379ed] to-[#2450d6] pb-5 font-poppins"
                            key={char}
                        >
                            {char}
                        </span>
                    ))}
                </div>

                <div className="text-white text-2xl md:text-3xl font-light text-center mb-6 md:w-3/4 lg:w-2/3 xl:w-1/2">
                    The online event ticketing platform for John Fraser S.S. students, made by the{" "}
                    <a
                        href="https://www.johnfrasersac.com"
                        className="text-blue-600 hover:underline"
                        target="_blank"
                        rel="noreferrer"
                    >
                        JFSS SAC
                    </a>
                    .
                </div>

                {signedIn ? (
                    <Link
                        href="/events"
                        className="py-4 px-6 bg-[#4169e1] rounded-lg font-semibold text-white hover:bg-[#1a47ce] duration-150 text-lg lg:text-2xl"
                    >
                        Open Portal
                    </Link>
                ) : (
                    <Link
                        href="/login"
                        className="py-4 px-6 bg-blue-500 rounded-lg font-semibold text-white hover:bg-blue-700 duration-150 text-lg lg:text-2xl"
                    >
                        Sign in
                    </Link>
                )}
            </div>
        </div>
    );
}
