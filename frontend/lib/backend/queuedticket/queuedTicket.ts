type QueuedTicket = {
    id: string,
    studentNumber: string,
    eventId: string,
    timestamp: Date,
    maxScanCount: Number,
    fullNameUpdate: string
}

export function convertToQueuedTicket(rawData: { [key: string]: any }): QueuedTicket {
    return {
        id: rawData.id,
        studentNumber: rawData.student_number,
        eventId: rawData.event_id,
        timestamp: new Date(rawData.timestamp),
        maxScanCount: rawData.max_scan_count,
        fullNameUpdate: rawData.full_name_update
    }
}

export default QueuedTicket