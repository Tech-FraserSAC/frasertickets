import sendBackendRequest from "@/lib/backend/sendBackendRequest";

interface UpdateBody {
    maxScanCount?: number;
    customFields?: { [key: string]: any };
}

// Admin-only route!
export default async function updateTicket(ticketId: string, updates: UpdateBody) {
    const res = await sendBackendRequest(`/tickets/${ticketId}`, "patch", true, true, updates);

    return;
}
