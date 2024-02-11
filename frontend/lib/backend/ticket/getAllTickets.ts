import sendBackendRequest from "@/lib/backend/sendBackendRequest";
import TicketWithUserAndEventData, {
    convertToTicketWithEventData,
} from "@/lib/backend/ticket/ticketWithUserAndEventData";

// Admin-only route!
export default async function getAllTickets() {
    const res = await sendBackendRequest("/tickets/all", "get", true, true);

    const rawTickets = res.data as { [key: string]: any }[];
    const tickets = rawTickets.map((data) => convertToTicketWithEventData(data));

    return tickets as TicketWithUserAndEventData[];
}
