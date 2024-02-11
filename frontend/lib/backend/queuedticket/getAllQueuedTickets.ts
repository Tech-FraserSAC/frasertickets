import QueuedTicket, { convertToQueuedTicket } from "./queuedTicket";

import sendBackendRequest from "../sendBackendRequest";

// Admin-only route!
export default async function getAllQueuedTickets() {
    const res = await sendBackendRequest("/queuedtickets", "get", true, true);

    const rawTickets = res.data as { [key: string]: any }[];
    const tickets = rawTickets.map((data) => convertToQueuedTicket(data));

    return tickets as QueuedTicket[];
}
