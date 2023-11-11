import axios, { AxiosRequestConfig } from "axios";
import getBackendRoute from "./getBackendRoute";
import auth from "../firebase/auth";

type Method = "get" | "post" | "patch" | "delete"

// Sends a request to the backend server while also handling authentication.
export default async function sendBackendRequest(path: string, method: Method, authenticate?: boolean, adminRoute?: boolean, data?: object, headers?: { [key: string]: string }, axiosConfig?: AxiosRequestConfig<object>) {
    const route = getBackendRoute(path)

    // Get token if authentication required
    let bearerToken = ""
    if (authenticate === undefined || authenticate === true) {
        const log_id = Math.round(Math.random() * 100000)
        console.time(`auth ready (req id ${log_id})`)
        await auth.authStateReady()
        console.timeEnd(`auth ready (req id ${log_id})`)
        
        const user = auth.currentUser
        if (user === null) {
            throw "User is not signed in"
        }

        // Always make sure to use very fresh tokens for admin routes,
        // since their admin status is stored in the token itself
        // and should always be up-to-date. An example case where using 
        // the cached token could go wrong is if a user has been given 
        // or had their admin privileges revoked. In this case, the user would
        // still have the same permissions as they did before, until the token
        // expires (max. 1 hour).
        let token: string
        console.time(`token ready (req id ${log_id})`)
        // Refresh token for admin routes if more than 5 minutes old
        const tokenDecoded = await user.getIdTokenResult()
        const tokenAge = Date.now() - new Date(tokenDecoded.issuedAtTime).getTime();
        if (!!adminRoute && tokenAge > 5 * 60 * 1000) {
            token = await user.getIdToken(true)
        } else {
            token = tokenDecoded.token
        }
        console.timeEnd(`token ready (req id ${log_id})`)

        bearerToken = `Bearer ${token}`
    }

    return await axios({
        method: method,
        url: route,
        data: data,
        headers: {
            Authorization: bearerToken,
            ...headers
        },
        ...axiosConfig
    })
}