import Event, { convertToEvent } from "@/lib/backend/event";
import User, { convertToUser } from "@/lib/backend/user";

type TicketWithUserAndEventData = {
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

export function convertToTicketWithEventData(rawData: { [key: string]: any }): TicketWithUserAndEventData {
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

export default TicketWithUserAndEventData;
