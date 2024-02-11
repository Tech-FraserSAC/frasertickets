import TicketWithUserAndEventData, { convertToTicketWithEventData } from "./ticketWithUserAndEventData";

import sendBackendRequest from "../sendBackendRequest";

// Admin-only route!
export default async function searchForTicket(eventID: string, studentNumber: string) {
    const res = await sendBackendRequest("/tickets/search", "post", true, true, {
        eventID: eventID,
        studentNumber: studentNumber,
    });

    const rawTicket = res.data as { [key: string]: any }[];
    const ticket = convertToTicketWithEventData(rawTicket);

    return ticket as TicketWithUserAndEventData;
}
