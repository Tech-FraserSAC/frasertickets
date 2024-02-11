import sendBackendRequest from "@/lib/backend/sendBackendRequest";
import Ticket, { convertToTicket } from "@/lib/backend/ticket";

// Admin-only route!
export default async function createNewTicket(ownerID: string, eventID: string, maxScanCount: number) {
    const res = await sendBackendRequest("/tickets", "post", true, true, {
        studentNumber: ownerID,
        eventID: eventID,
        maxScanCount: maxScanCount ?? 0, // default to infinite scans
    });

    const rawTicket = res.data as { [key: string]: any }[];
    const ticket = convertToTicket(rawTicket);

    return ticket as Ticket;
}
