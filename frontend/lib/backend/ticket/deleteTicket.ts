import { convertToTicket } from "./ticket";
import { convertToTicketWithEventData } from "./ticketWithUserAndEventData";

import sendBackendRequest from "../sendBackendRequest";

export default async function deleteTicket(id: string) {
    const res = await sendBackendRequest(`/tickets/${id}`, "delete", true, true);
    if (res.status !== 200) {
        throw (res.status, res.data);
    }
}
