import sendBackendRequest from "@/lib/backend/sendBackendRequest";

export default async function deleteEvent(id: string) {
    const res = await sendBackendRequest(`/events/${id}`, "delete", true, true);
    if (res.status !== 200) {
        throw (res.status, res.data);
    }
}
