type Ticket = {
    id: string,
    ownerId: string,
    eventId: string,
    timestamp: Date,
    scanCount: Number,
    lastScanTime: Date
}

export function convertToTicket(rawData: { [key: string]: any }): Ticket {
    return {
        id: rawData.id,
        ownerId: rawData.ownerID,
        eventId: rawData.eventID,
        timestamp: new Date(rawData.timestamp),
        scanCount: Number(rawData.scanCount),
        lastScanTime: new Date(rawData.lastScanTime)
    }
}

export default Ticket