import TicketWithUserAndEventData, { convertToTicketWithEventData } from "./ticketWithUserAndEventData";

import sendBackendRequest from "../sendBackendRequest";

interface UpdateBody {
    maxScanCount: number;
}

// Admin-only route!
export default async function updateTicket(ticketId: string, updates: UpdateBody) {
    const res = await sendBackendRequest(`/tickets/${ticketId}`, "patch", true, true, updates);

    return;
}
