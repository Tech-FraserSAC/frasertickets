import sendBackendRequest from "@/lib/backend/sendBackendRequest";
import User, { convertToUser } from "@/lib/backend/user";

// Admin-only route!
export default async function getAllUsers() {
    const res = await sendBackendRequest("/users", "get", true, true);

    const rawUsers = res.data as { [key: string]: any }[];
    const users = rawUsers.map((data) => convertToUser(data));

    return users as User[];
}
