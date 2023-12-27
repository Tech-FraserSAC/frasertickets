import sendBackendRequest from "../sendBackendRequest";
import QueuedTicket, { convertToQueuedTicket } from "./queuedTicket";

// Admin-only route!
export default async function getAllQueuedTickets() {
    const res = await sendBackendRequest("/queuedtickets", 'get', true, true)

    const rawTickets = res.data as { [key: string]: any }[]
    const tickets = rawTickets.map(data => convertToQueuedTicket(data))
    
    return tickets as QueuedTicket[]
}