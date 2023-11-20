import sendBackendRequest from "../sendBackendRequest";
import TicketWithUserAndEventData, { convertToTicketWithEventData } from "./ticketWithUserAndEventData";

interface UpdateBody {
    maxScanCount: number
}

// Admin-only route!
export default async function updateTicket(ticketId: string, updates: UpdateBody) {
    const res = await sendBackendRequest(
        `/tickets/${ticketId}`, 
        'patch', 
        true, 
        true,
        updates
    )

    return
}