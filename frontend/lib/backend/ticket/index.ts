import Event, { convertToEvent } from "@/lib/backend/event";
import createNewTicket from "@/lib/backend/ticket/createNewTicket";
import deleteTicket from "@/lib/backend/ticket/deleteTicket";
import getAllTickets from "@/lib/backend/ticket/getAllTickets";
import getSelfTickets from "@/lib/backend/ticket/getSelfTickets";
import getTicket from "@/lib/backend/ticket/getTicket";
import searchForTicket from "@/lib/backend/ticket/searchForTicket";
import updateTicket from "@/lib/backend/ticket/updateTicket";
import User, { convertToUser } from "@/lib/backend/user";

type Ticket = {
    id: string;
    ownerId: string;
    eventId: string;
    timestamp: Date;
    eventData: Event;
    ownerData: User;
    scanCount: Number;
    lastScanTime: Date;
    maxScanCount: Number;
};

export function convertToTicket(rawData: { [key: string]: any }): Ticket {
    return {
        id: rawData.id,
        ownerId: rawData.ownerID,
        eventId: rawData.eventID,
        timestamp: new Date(rawData.timestamp),
        eventData: convertToEvent(rawData.eventData),
        ownerData: convertToUser(rawData.ownerData),
        scanCount: Number(rawData.scanCount),
        lastScanTime: new Date(rawData.lastScanTime),
        maxScanCount: rawData.maxScanCount,
    };
}

export default Ticket;
export { createNewTicket, deleteTicket, getAllTickets, getSelfTickets, getTicket, searchForTicket, updateTicket };
