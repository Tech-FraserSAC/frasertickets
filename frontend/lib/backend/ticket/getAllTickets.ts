import sendBackendRequest from "../sendBackendRequest";
import Ticket, { convertToTicket } from "./ticket";
import TicketWithUserAndEventData, { convertToTicketWithEventData } from "./ticketWithUserAndEventData";

// Admin-only route!
export default async function getAllTickets() {
    const res = await sendBackendRequest("/tickets/all", 'get')

    const rawTickets = res.data as { [key: string]: any }[]
    const tickets = rawTickets.map(data => convertToTicketWithEventData(data))
    
    return tickets as TicketWithUserAndEventData[]
}