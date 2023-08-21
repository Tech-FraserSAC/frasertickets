import axios, { AxiosRequestConfig } from "axios";
import getBackendRoute from "./getBackendRoute";
import auth from "../firebase/auth";

type Method = "get" | "post" | "patch" | "delete"

// Sends a request to the backend server while also handling authentication.
export default async function sendBackendRequest(path: string, method: Method, authenticate?: boolean, data?: object, headers?: { [key: string]: string }, axiosConfig?: AxiosRequestConfig<object>) {
    const route = getBackendRoute(path)

    // Get token if authentication required
    let bearerToken = ""
    if (authenticate === undefined || authenticate === true) {
        const user = auth.currentUser
        if (user === null) {
            throw "User is not signed in"
        }

        bearerToken = `Bearer ${await user.getIdToken()}`
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