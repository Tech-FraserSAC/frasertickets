import { convertToQueuedTicket } from "./queuedTicket";

import sendBackendRequest from "../sendBackendRequest";

// Admin-only route!
export default async function createNewQueuedTicket(studentNumber: string, eventID: string, maxScanCount: number) {
    const res = await sendBackendRequest("/queuedtickets", "post", true, true, {
        studentNumber: studentNumber,
        eventID: eventID,
        maxScanCount: maxScanCount ?? 0, // default to infinite scans
    });

    const rawTicket = res.data as { [key: string]: any }[];
    const ticket = convertToQueuedTicket(rawTicket);

    return ticket;
}
