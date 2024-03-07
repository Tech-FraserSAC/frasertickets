import { useEffect, useState } from "react";

import Head from "next/head";
import router from "next/router";

import { Typography } from "@material-tailwind/react";
import { GoogleLogin } from "@react-oauth/google";
import {
    GoogleAuthProvider,
    browserLocalPersistence,
    setPersistence,
    signInWithCredential,
    signInWithRedirect,
    signOut,
} from "firebase/auth";

import addUser from "@/lib/backend/user/addUser";
import auth from "@/lib/firebase/auth";
import getElementBySelectorAsync from "@/util/getElementBySelectorAsync";
import parseClientCookies from "@/util/parseCookies";

import Layout from "@/components/Layout";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function Login() {
    const [signInReady, setSignInReady] = useState(false);

    const authProvider = new GoogleAuthProvider();
    authProvider.setCustomParameters({
        login_hint: "000000@pdsb.net",
        hd: "pdsb.net", // Only allows users part of pdsb.net organization
    });

    const logIn = () => {
        // Prompt user to log in
        setPersistence(auth, browserLocalPersistence).then(() => {
            return signInWithRedirect(auth, authProvider);
        });
    };

    const [inBrowser, setInBrowser] = useState(false);
    const [signInButtonVisible, setSignInButtonVisible] = useState(false);
    useEffect(() => {
        setInBrowser(true);
    }, []);

    const loginUri = `${inBrowser ? window.location.origin : ""}/auth/redirect`;

    const loadingTextSet = [
        "Loading...",
        "Please wait...",
        "Almost there...",
        "Setting things up...",
        "Just a few more seconds...",
        "Setting things up...",
    ];
    const [loadingText, setLoadingText] = useState(loadingTextSet[0]);

    const onInAppBrowserIOS =
        inBrowser &&
        navigator.userAgent.includes("AppleWebKit") &&
        navigator.userAgent.includes("Mobile") &&
        !navigator.userAgent.includes("Safari");

    const onInstagramBrowserAndroid = inBrowser && navigator.userAgent.includes("Instagram");

    useEffect(() => {
        const startUpdateLoadingTextLoop = () => {
            setTimeout(() => {
                if (!signInButtonVisible) {
                    setLoadingText(loadingTextSet[Math.floor(Math.random() * loadingTextSet.length)]);
                    startUpdateLoadingTextLoop();
                }
            }, 3000);
        };

        startUpdateLoadingTextLoop();
    }, []);

    // Check whether a new login occured, if so, try to create a user object in DB
    useEffect(() => {
        const cookies = parseClientCookies();

        if ("credential" in cookies) {
            const credential = cookies.credential;
            // Delete the cookie so we don't accidently use it later
            // Immediately cleared so user can refresh and instantly try again
            // if something goes wrong
            document.cookie = "credential=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/login;";

            (async () => {
                try {
                    const res = await signInWithCredential(auth, GoogleAuthProvider.credential(credential));

                    // Only allow people to join with student accounts
                    if (res.user.email?.includes("@pdsb.net")) {
                        await addUser();

                        // Try registering them in DB if they are new
                        if (res.user.metadata.creationTime === res.user.metadata.lastSignInTime) {
                            // Give them a quick alert letting them know what's up with general upcoming tickets
                            alert(
                                "Welcome to FraserTickets! If you are looking for your ticket for an upcoming event, please keep in mind that it may take a few days for it to show up on the platform. Thank you for understanding.",
                            );
                        }

                        await router.push("/events");
                    }
                } catch (e) {
                    alert("Sorry, something went wrong when signing you in.");
                    console.error(e);

                    // Sign them out so they can sign in again
                    await signOut(auth);
                }

                setSignInReady(true);
            })();
        } else {
            setSignInReady(true);
        }
    }, []);

    useEffect(() => {
        (async () => {
            const signInWrapper = await getElementBySelectorAsync("#google-login-button");
            signInWrapper.setAttribute("style", "height: 0;");
            await getElementBySelectorAsync("#google-login-button>div");
            setSignInButtonVisible(true);
            signInWrapper.setAttribute("style", "height: 40px;");
        })();
    }, []);

    return (
        <Layout
            name="Login"
            className="flex flex-col items-center justify-center"
        >
            <Head>
                <meta
                    name="referrer"
                    content="strict-origin-when-cross-origin"
                    key="referrer-policy"
                />
            </Head>

            <div className="flex flex-col items-center justify-center p-8 pb-6 bg-white rounded-lg shadow-md max-w-md">
                <Typography
                    variant="h3"
                    color="blue-gray"
                    className="text-center mb-2"
                >
                    Log into FraserTickets
                </Typography>

                {signInReady ? (
                    <>
                        <GoogleLogin
                            onSuccess={() => {}}
                            size="large"
                            shape="pill"
                            ux_mode="redirect"
                            use_fedcm_for_prompt
                            hosted_domain="pdsb.net"
                            theme="filled_blue"
                            login_uri={loginUri}
                            containerProps={{
                                id: "google-login-button",
                            }}
                        />
                        {!signInButtonVisible && (
                            <div className="flex flex-row gap-2 items-center mt-2">
                                <LoadingSpinner />
                                <Typography
                                    variant="paragraph"
                                    className="text-center"
                                >
                                    {loadingText}
                                </Typography>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-row gap-2 items-center">
                        <LoadingSpinner />
                        <Typography
                            variant="paragraph"
                            className="text-center"
                        >
                            {loadingText}
                        </Typography>
                    </div>
                )}

                {onInAppBrowserIOS || onInstagramBrowserAndroid ? (
                    <Typography
                        variant="small"
                        color="gray"
                        className="text-center mt-2 font-bold"
                    >
                        Using Instagram&apos;s browser? Please open this website in your normal browser. You can do this
                        by clicking the three dots at the top and selecting &quot;Open in Browser&quot;.
                    </Typography>
                ) : (
                    <></>
                )}
                <Typography
                    variant="small"
                    color="gray"
                    className="text-center mt-2"
                >
                    Please log in using your pdsb.net email.
                </Typography>
            </div>
        </Layout>
    );
}
