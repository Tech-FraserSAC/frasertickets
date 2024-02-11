import sendBackendRequest from "@/lib/backend/sendBackendRequest";
import TicketScan, { convertToTicketScan } from "@/lib/backend/ticket/ticketScan";

// Admin-only route!
export default async function scanTicket(ticketID: string) {
    const res = await sendBackendRequest("/tickets/scan", "post", true, true, {
        ticketID: ticketID,
    });

    const rawTicketScan = res.data as { [key: string]: any }[];
    const ticketScan = convertToTicketScan(rawTicketScan);

    return ticketScan as TicketScan;
}
