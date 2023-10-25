import sendBackendRequest from "../sendBackendRequest";
import { convertToTicket } from "./ticket";
import { convertToTicketWithEventData } from "./ticketWithUserAndEventData";

export default async function deleteTicket(id: string) {
    const res = await sendBackendRequest(`/tickets/${id}`, 'delete')
    if (res.status !== 200) {
        throw res.status, res.data
    }
}