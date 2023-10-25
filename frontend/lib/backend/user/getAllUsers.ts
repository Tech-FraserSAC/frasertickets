import sendBackendRequest from "../sendBackendRequest";
import User, { convertToUser } from "./user";

// Admin-only route!
export default async function getAllUsers() {
    const res = await sendBackendRequest("/users", 'get')

    const rawUsers = res.data as { [key: string]: any }[]
    const users = rawUsers.map(data => convertToUser(data))
    
    return users as User[]
}