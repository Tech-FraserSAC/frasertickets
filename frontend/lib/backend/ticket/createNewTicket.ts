import sendBackendRequest from "../sendBackendRequest";
import TicketWithUserAndEventData, { convertToTicketWithEventData } from "./ticketWithUserAndEventData";

// Admin-only route!
export default async function createNewTicket(ownerID: string, eventID: string) {
    const res = await sendBackendRequest(
        "/tickets", 
        'post', 
        true, 
        {
            "studentNumber": ownerID,
            "eventID": eventID
        }
    )

    const rawTicket = res.data as { [key: string]: any }[]
    const ticket = convertToTicketWithEventData(rawTicket)
    
    return ticket as TicketWithUserAndEventData
}