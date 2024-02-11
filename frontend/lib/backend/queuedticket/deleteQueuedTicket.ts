import sendBackendRequest from "../sendBackendRequest";

export default async function deleteQueuedTicket(id: string) {
    const res = await sendBackendRequest(`/queuedtickets/${id}`, "delete", true, true);
    if (res.status !== 200) {
        throw (res.status, res.data);
    }
}
