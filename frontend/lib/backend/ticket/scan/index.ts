import Ticket, { convertToTicket } from "@/lib/backend/ticket";
import scanTicket from "@/lib/backend/ticket/scan/scanTicket";
import User, { convertToUser } from "@/lib/backend/user";

type TicketScan = {
    scanCount: number;
    timestamp: Date;
    ticketData: Ticket;
    userData: User;
    processed: boolean;
    noProcessReason?: string;
};

export function convertToTicketScan(rawData: { [key: string]: any }): TicketScan {
    return {
        scanCount: rawData.index,
        timestamp: new Date(rawData.timestamp),
        ticketData: convertToTicket(rawData.ticketData),
        userData: convertToUser(rawData.userData),
        processed: rawData.processed,
        noProcessReason: rawData.processed ? undefined : rawData.noProcessReason,
    };
}

export default TicketScan;
export { scanTicket };
