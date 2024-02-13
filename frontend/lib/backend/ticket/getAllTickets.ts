import sendBackendRequest from "@/lib/backend/sendBackendRequest";
import Ticket, { convertToTicket } from "@/lib/backend/ticket";

// Admin-only route!
export default async function getAllTickets(eventIdFilter?: string) {
    const res = await sendBackendRequest(`/tickets/all${eventIdFilter && `?eventId=${eventIdFilter}`}`, "get", true, true);

    const rawTickets = res.data as { [key: string]: any }[];
    const tickets = rawTickets.map((data) => convertToTicket(data));

    return tickets as Ticket[];
}
