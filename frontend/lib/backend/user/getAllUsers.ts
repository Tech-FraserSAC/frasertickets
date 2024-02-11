import User, { convertToUser } from "./user";

import sendBackendRequest from "../sendBackendRequest";

// Admin-only route!
export default async function getAllUsers() {
    const res = await sendBackendRequest("/users", "get", true, true);

    const rawUsers = res.data as { [key: string]: any }[];
    const users = rawUsers.map((data) => convertToUser(data));

    return users as User[];
}
