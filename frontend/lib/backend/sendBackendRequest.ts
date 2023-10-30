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
        console.time("firebase auth ready")
        await auth.authStateReady()
        console.timeEnd("firebase auth ready")
        
        const user = auth.currentUser
        if (user === null) {
            throw "User is not signed in"
        }

        // Always make sure to generate a new token for admin routes,
        // since their admin status is stored in the token itself
        // and should always be up-to-date. An example case where using 
        // the cached token could go wrong is if a user has been given 
        // or had their admin privileges revoked. In this case, the user would
        // still have the same permissions as they did before, until the token
        // expires (max. 5 min).
        console.time("firebase token ready")
        const token = await user.getIdToken(!!adminRoute)
        console.timeEnd("firebase token ready")

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