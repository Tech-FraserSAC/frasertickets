import sendBackendRequest from "@/lib/backend/sendBackendRequest";
import Ticket, { convertToTicket } from "@/lib/backend/ticket";

export default async function getSelfTickets() {
    const res = await sendBackendRequest("/tickets", "get");

    const rawTickets = res.data as { [key: string]: any }[];
    const tickets = rawTickets.map((data) => convertToTicket(data));

    return tickets as Ticket[];
}
