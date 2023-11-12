import { useEffect, useState } from "react";
import router from "next/router";
import axios from "axios";

import { 
    GoogleAuthProvider, 
    browserLocalPersistence, 
    getRedirectResult, 
    setPersistence, 
    signInWithRedirect, 
    signOut 
} from "firebase/auth";
import { useFirebaseAuth } from "@/components/FirebaseAuthContext";
import auth from "@/lib/firebase/auth";

import Layout from "@/components/Layout";
import addUser from "@/lib/backend/user/addUser";

import { Typography } from "@material-tailwind/react";
import GoogleButton from "react-google-button";

export default function Login() {
    const [redirectStatus, setRedirectStatus] = useState({
        checked: false,
        redirected: false,
        actedUpon: false
    })

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

    // Check whether a new login occured, if so, try to create a user object in DB
    useEffect(() => {
        (async () => {
            const redirectRes = await getRedirectResult(auth)

            if (redirectRes) {
                try {
                    // Try registering them if they're weren't already
                    await addUser()

                    router.push("/events")
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
            <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-md">
                <Typography variant="h3" color="blue-gray" className="text-center mb-4">Log into FraserTickets</Typography>

                <GoogleButton
                    onClick={logIn}
                    disabled={!redirectStatus.checked}
                />
            </div>
        </Layout>
    )
}