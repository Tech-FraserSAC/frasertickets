import sendBackendRequest from "@/lib/backend/sendBackendRequest";
import { convertToTicket } from "@/lib/backend/ticket";

export default async function getTicket(id: string) {
    const res = await sendBackendRequest(`/tickets/${id}`, "get");
    const ticket = convertToTicket(res.data as { [key: string]: any });
    return ticket;
}
