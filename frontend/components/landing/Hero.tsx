import Image from 'next/image'
import Link from 'next/link'
import { m, motion } from "framer-motion"
import React, { useEffect, useRef, useState } from 'react'

import BannerPhoto from "../../assets/landing-banner.jpg"
import { useFirebaseAuth } from '../FirebaseAuthContext'

const transition = { duration: 1.4, ease: [0.6, 0.01, 0.0, 0.9] };

const lineVariants = {
    initial: {
    },
    animate: {
        transition: {
            staggerChildren: 0.2,
        }
    }
};

const subtitleVariants = {
    initial: { opacity: 0, y: 50 },
    animate: { opacity: 1, y: 0, transition: { ...transition, duration: 1.2, delay: 0.5 }, }
};

const characterVariants = {
    initial: { opacity: 0, y: 50 },
    animate: { opacity: 1, y: 0, transition: { ...transition, duration: 1.2 }, }
};

const bottomLine = "FraserTickets".split('  ');

export default function Hero() {
    const { user, loaded } = useFirebaseAuth();

    const signedIn = loaded && user !== null;

    return (
        <div className="flex flex-col h-[93vh] relative w-full">
            <div className='overflow-hidden' style={{ boxShadow: "inset 0 0 200px #000000" }}>
                <Image
                    src={BannerPhoto}
                    placeholder="blur"
                    objectFit="cover"
                    objectPosition="center"
                    alt="Hero image"
                    layout="fill"
                    quality={100}
                    priority={true}
                />
            </div>

            <div className='w-full h-[93vh] absolute bg-black/60 mix-blend-normal' />

            <div className="absolute p-4 xs:p-8 sm:p-16 z-1 flex flex-col justify-center items-center h-[93vh] w-full">
                <div className="text-center">
                    <div className="mb-4">
                        <motion.div variants={lineVariants} initial="initial" animate="animate" className="font-bold flex flex-col flex-wrap gap-2 text-6xl sm:text-7xl lg:text-9xl">
                            {bottomLine.map(char => <motion.span className="inline-block relative bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-green-300 pb-5" variants={characterVariants} key={char}>{char}</motion.span>)}
                        </motion.div>
                    </div>
                </div>

                <motion.div variants={subtitleVariants} initial="initial" animate="animate" className="text-white text-3xl font-light text-center mb-6 md:w-3/4 lg:w-1/3">
                    The online event ticketing platform for John Fraser S.S. students, made by the <a href="https://www.johnfrasersac.com" className="text-blue-500 hover:text-blue-700 duration-75">SAC</a>.
                </motion.div>

                {signedIn ?
                    <Link
                        href="/events"
                        className="py-4 px-6 bg-green-500 rounded-lg font-semibold text-white hover:bg-green-700 duration-150 text-lg lg:text-2xl mt-4"
                    >
                        Open Portal
                    </Link>
                    :
                    <Link
                        href="/login"
                        className="py-4 px-6 bg-blue-500 rounded-lg font-semibold text-white hover:bg-blue-700 duration-150 text-lg lg:text-2xl mt-4"
                    >
                        Sign in
                    </Link>
                }
            </div>
        </div>
    )
}