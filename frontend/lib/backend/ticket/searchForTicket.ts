import sendBackendRequest from "@/lib/backend/sendBackendRequest";
import Ticket, { convertToTicket } from "@/lib/backend/ticket";

// Admin-only route!
export default async function searchForTicket(eventID: string, studentNumber: string) {
    const res = await sendBackendRequest("/tickets/search", "post", true, true, {
        eventID: eventID,
        studentNumber: studentNumber,
    });

    const rawTicket = res.data as { [key: string]: any }[];
    const ticket = convertToTicket(rawTicket);

    return ticket as Ticket;
}
