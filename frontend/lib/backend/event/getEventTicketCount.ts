import sendBackendRequest from "@/lib/backend/sendBackendRequest";

export default async function getEventTicketCount(id: string) {
    const res = await sendBackendRequest(`/events/${id}/ticket-count`, "get");
    return res.data as number;
}
