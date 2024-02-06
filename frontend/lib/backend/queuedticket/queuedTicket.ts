type QueuedTicket = {
    id: string,
    studentNumber: string,
    eventId: string,
    eventData: Event,
    timestamp: Date,
    maxScanCount: Number,
    fullNameUpdate: string
}

export function convertToQueuedTicket(rawData: { [key: string]: any }): QueuedTicket {
    return {
        id: rawData.id,
        studentNumber: rawData.studentNumber,
        eventId: rawData.eventID,
        eventData: rawData.eventData as Event,
        timestamp: new Date(rawData.timestamp),
        maxScanCount: rawData.max_scan_count,
        fullNameUpdate: rawData.full_name_update
    }
}

export default QueuedTicket