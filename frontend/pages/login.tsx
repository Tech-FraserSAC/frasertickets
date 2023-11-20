import { useEffect, useState } from "react";
import router from "next/router";
import axios from "axios";

import {
    GoogleAuthProvider,
    browserLocalPersistence,
    getRedirectResult,
    setPersistence,
    signInWithCredential,
    signInWithRedirect,
    signOut
} from "firebase/auth";
import { useFirebaseAuth } from "@/components/FirebaseAuthContext";
import auth from "@/lib/firebase/auth";

import Layout from "@/components/Layout";
import addUser from "@/lib/backend/user/addUser";

import { Typography } from "@material-tailwind/react";
import GoogleButton from "react-google-button";
import { GoogleLogin } from "@react-oauth/google";
import { GetServerSideProps } from "next";
import parseClientCookies from "@/util/parseCookies";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function Login() {
    // const [redirectStatus, setRedirectStatus] = useState({
    //     checked: false,
    //     redirected: false,
    //     actedUpon: false
    // })

    const [signInReady, setSignInReady] = useState(false)

    const authProvider = new GoogleAuthProvider()
    authProvider.setCustomParameters({
        login_hint: "000000@pdsb.net",
        hd: "pdsb.net", // Only allows users part of pdsb.net organization
    })

    const logIn = () => {
        // Prompt user to log in
        setPersistence(auth, browserLocalPersistence).then(() => {
            return signInWithRedirect(auth, authProvider)
        })
    }

    const [inBrowser, setInBrowser] = useState(false)
    useEffect(() => {
        setInBrowser(true)
    }, [])

    const loginUri = `${inBrowser ? window.location.origin : ""}/auth/redirect`

    // Check whether a new login occured, if so, try to create a user object in DB
    useEffect(() => {
        const cookies = parseClientCookies();

        if ("credential" in cookies) {
            const credential = cookies.credential
            // Delete the cookie so we don't accidently use it later
            // Immediately cleared so user can refresh and instantly try again
            // if something goes wrong
            document.cookie = "credential=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/login;";

            (async () => {
                try {
                    const res = await signInWithCredential(auth, GoogleAuthProvider.credential(credential))

                    // Only allow people to join with student accounts
                    if (res.user.email?.includes("@pdsb.net")) {
                        await addUser()

                        // Try registering them in DB if they are new
                        if (res.user.metadata.creationTime === res.user.metadata.lastSignInTime) {
                            // Give them a quick alert letting them know what's up with semi-formal tickets
                            alert("Welcome to FraserTickets! If you are looking for your semi-formal ticket, please keep in mind that it may take a few days for it to show up on the platform. Thank you for understanding.")
                        }

                        await router.push("/events")
                    }
                }
                catch (e) {
                    alert("Sorry, something went wrong when signing you in.")
                    console.error(e)

                    // Sign them out so they can sign in again
                    await signOut(auth)
                }

                setSignInReady(true)
            })()
        } else {
            setSignInReady(true)
        }

        /*
        (async () => {
            const redirectRes = await getRedirectResult(auth)

            if (redirectRes) {
                try {
                    // Only allow people to join with student accounts
                    if (redirectRes.user.email?.includes("@pdsb.net")) {
                        await addUser()

                        // Try registering them in DB if they are new
                        if (redirectRes.user.metadata.creationTime === redirectRes.user.metadata.lastSignInTime) {
                            // Give them a quick alert letting them know what's up with semi-formal tickets
                            alert("Welcome to FraserTickets! If you are looking for your semi-formal ticket, please keep in mind that it may take a few days for it to show up on the platform. Thank you for understanding.")
                        }

                        router.push("/events")
                    }
                } catch (e) {
                    alert("Sorry, something went wrong when signing you in.")
                    console.error(e)

                    // Sign them out so they can sign in again
                    await signOut(auth)
                }
            } else {
                // Check if they're already signed in
                // Current user should have already loaded by now, I'd assume?
                // Since redirect result has already run
                if (auth.currentUser) {
                    alert("You are already signed in. Redirecting...")
                    router.push("/events")
                }
            }

            setRedirectStatus({
                checked: true,
                redirected: redirectRes !== null,
                actedUpon: false
            })
        })()
        */
    }, [])

    /*
    useEffect(() => {
        // Ensure that a redirect login didn't happen and the redirect was checked
        console.log("Redirect status", redirectStatus)
        if (redirectStatus.checked && !redirectStatus.redirected && !redirectStatus.actedUpon && user !== null) {
            alert("You are already signed in. Redirecting...")
            router.push("/")

            setRedirectStatus({
                checked: true,
                redirected: redirectStatus.redirected,
                actedUpon: true
            })
        } 
    }, [user, redirectStatus])
    */


    return (
        <Layout name="Login" className="flex flex-col items-center justify-center">
            <div className="flex flex-col items-center justify-center p-8 pb-6 bg-white rounded-lg shadow-md max-w-md">
                <Typography variant="h3" color="blue-gray" className="text-center mb-2">Log into FraserTickets</Typography>

                {/* <GoogleButton
                    onClick={logIn}
                    disabled={!redirectStatus.checked}
                /> */}

                {signInReady ? (
                    <GoogleLogin
                        onSuccess={() => { }}
                        size="large"
                        shape="pill"
                        ux_mode="redirect"
                        use_fedcm_for_prompt
                        hosted_domain="pdsb.net"
                        theme="filled_blue"
                        login_uri={loginUri}
                    />
                ) : (
                    <div className="flex flex-row gap-2 items-center">
                        <LoadingSpinner />
                        <Typography variant="paragraph" className="text-center">Loading...</Typography>
                    </div>
                )
                }

                {
                    (inBrowser && navigator.userAgent.includes("Instagram")) ?
                        <Typography variant="small" color="gray" className="text-center mt-2 font-bold">
                            Using Instagram&apos;s browser? Please open this website in your normal browser.
                            You can do this by clicking the three dots at the top and selecting &quot;Open in Browser&quot;.
                        </Typography>
                        :
                        <></>
                }
                <Typography variant="small" color="gray" className="text-center mt-2">Please log in using your pdsb.net email.</Typography>
            </div>
        </Layout>
    )
}