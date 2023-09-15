import Event, { convertToEvent } from "../event/event"

type TicketWithEventData = {
    id: string,
    ownerId: string,
    eventId: string,
    timestamp: Date,
    eventData: Event
}

export function convertToTicketWithEventData(rawData: { [key: string]: any }): TicketWithEventData {
    return {
        id: rawData.id,
        ownerId: rawData.ownerID,
        eventId: rawData.eventID,
        timestamp: new Date(rawData.timestamp),
        eventData: convertToEvent(rawData.eventData)
    }
}

export default TicketWithEventData