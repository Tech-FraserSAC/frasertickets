import User, { convertToUser } from "../user/user"
import TicketWithUserAndEventData, { convertToTicketWithEventData } from "./ticketWithUserAndEventData"

type TicketScan = {
    scanCount: number,
    timestamp: Date,
    ticketData: TicketWithUserAndEventData,
    userData: User
}

export function convertToTicketScan(rawData: { [key: string]: any }): TicketScan {
    return {
        scanCount: rawData.index,
        timestamp: new Date(rawData.timestamp),
        ticketData: convertToTicketWithEventData(rawData.ticketData),
        userData: convertToUser(rawData.userData)
    }
}

export default TicketScan