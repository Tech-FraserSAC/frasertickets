import sendBackendRequest from "@/lib/backend/sendBackendRequest";

interface UserUpdates {
    full_name: string;
}

export default async function editUser(uid: string, updates: UserUpdates) {
    await sendBackendRequest(`/users/${uid}`, "patch", true, true, updates, undefined, {
        validateStatus: (status) => status === 200 || status === 304,
    });
}
