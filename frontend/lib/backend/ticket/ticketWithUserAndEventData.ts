import Event, { convertToEvent } from "../event/event"
import User, { convertToUser } from "../user/user"

type TicketWithUserAndEventData = {
    id: string,
    ownerId: string,
    eventId: string,
    timestamp: Date,
    eventData: Event,
    ownerData: User
}

export function convertToTicketWithEventData(rawData: { [key: string]: any }): TicketWithUserAndEventData {
    return {
        id: rawData.id,
        ownerId: rawData.ownerID,
        eventId: rawData.eventID,
        timestamp: new Date(rawData.timestamp),
        eventData: convertToEvent(rawData.eventData),
        ownerData: convertToUser(rawData.ownerData)
    }
}

export default TicketWithUserAndEventData