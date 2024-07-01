import sendBackendRequest from "@/lib/backend/sendBackendRequest";

export interface EventUpdates {
    name?: string;
    description?: string;
    img_urls?: string[];
    location?: string;
    address?: string;
    start_timestamp?: Date;
    end_timestamp?: Date;
}

export default async function updateEvent(id: string, updates: EventUpdates) {
    // Need to convert dates to ISO strings beforehand
    let updatesAdjusted = updates as {[key: string]: any};
    if (updates.start_timestamp) {
        updatesAdjusted.start_timestamp = updates.start_timestamp.toISOString();
    }
    if (updates.end_timestamp) {
        updatesAdjusted.end_timestamp = updates.end_timestamp.toISOString();
    }

    const res = await sendBackendRequest(`/events/${id}`, "patch", true, true, updates);
    if (res.status !== 200) {
        throw (res.status, res.data);
    }
}
