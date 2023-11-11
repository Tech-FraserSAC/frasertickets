import axios, { AxiosRequestConfig } from "axios";
import getBackendRoute from "./getBackendRoute";
import getTokenSafely from "../auth/getTokenSafely";

type Method = "get" | "post" | "patch" | "delete"

// Sends a request to the backend server while also handling authentication.
export default async function sendBackendRequest(path: string, method: Method, authenticate?: boolean, adminRoute?: boolean, data?: object, headers?: { [key: string]: string }, axiosConfig?: AxiosRequestConfig<object>) {
    const route = getBackendRoute(path)

    // Get token if authentication required
    let bearerToken = ""
    if (authenticate === undefined || authenticate === true) {
        const token = await getTokenSafely()
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