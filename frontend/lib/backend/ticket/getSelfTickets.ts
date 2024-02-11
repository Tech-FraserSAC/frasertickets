import sendBackendRequest from "@/lib/backend/sendBackendRequest";
import TicketWithUserAndEventData, {
    convertToTicketWithEventData,
} from "@/lib/backend/ticket/ticketWithUserAndEventData";

export default async function getSelfTickets() {
    const res = await sendBackendRequest("/tickets", "get");

    const rawTickets = res.data as { [key: string]: any }[];
    const tickets = rawTickets.map((data) => convertToTicketWithEventData(data));

    return tickets as TicketWithUserAndEventData[];
}
