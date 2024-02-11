import Ticket, { convertToTicket } from "./ticket";
import TicketWithUserAndEventData, { convertToTicketWithEventData } from "./ticketWithUserAndEventData";

import sendBackendRequest from "../sendBackendRequest";

// Admin-only route!
export default async function getAllTickets() {
    const res = await sendBackendRequest("/tickets/all", "get", true, true);

    const rawTickets = res.data as { [key: string]: any }[];
    const tickets = rawTickets.map((data) => convertToTicketWithEventData(data));

    return tickets as TicketWithUserAndEventData[];
}
