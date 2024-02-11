import { convertToTicketWithEventData } from "./ticketWithUserAndEventData";

import sendBackendRequest from "../sendBackendRequest";

export default async function getTicket(id: string) {
    const res = await sendBackendRequest(`/tickets/${id}`, "get");
    const ticket = convertToTicketWithEventData(res.data as { [key: string]: any });
    return ticket;
}
