import TicketWithUserAndEventData, { convertToTicketWithEventData } from "./ticketWithUserAndEventData";

import User, { convertToUser } from "../user/user";

type TicketScan = {
    scanCount: number;
    timestamp: Date;
    ticketData: TicketWithUserAndEventData;
    userData: User;
    processed: boolean;
    noProcessReason?: string;
};

export function convertToTicketScan(rawData: { [key: string]: any }): TicketScan {
    return {
        scanCount: rawData.index,
        timestamp: new Date(rawData.timestamp),
        ticketData: convertToTicketWithEventData(rawData.ticketData),
        userData: convertToUser(rawData.userData),
        processed: rawData.processed,
        noProcessReason: rawData.processed ? undefined : rawData.noProcessReason,
    };
}

export default TicketScan;
