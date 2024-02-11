import Ticket, { convertToTicket } from "./ticket";
import TicketWithUserAndEventData, { convertToTicketWithEventData } from "./ticketWithUserAndEventData";

import sendBackendRequest from "../sendBackendRequest";

export default async function getSelfTickets() {
    const res = await sendBackendRequest("/tickets", "get");

    const rawTickets = res.data as { [key: string]: any }[];
    const tickets = rawTickets.map((data) => convertToTicketWithEventData(data));

    return tickets as TicketWithUserAndEventData[];
}
