import sendBackendRequest from "../sendBackendRequest";
import { convertToTicket } from "./ticket";
import { convertToTicketWithEventData } from "./ticketWithUserAndEventData";

export default async function getTicket(id: string) {
    const res = await sendBackendRequest(`/tickets/${id}`, 'get')
    const ticket = convertToTicketWithEventData(res.data as { [key: string]: any })
    return ticket
}