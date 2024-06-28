import sendBackendRequest from "@/lib/backend/sendBackendRequest";
import { convertToEvent } from ".";

export default async function createEvent(newEventData: FormData) {
    const res = await sendBackendRequest(`/events`, "post", true, true, newEventData);
    if (res.status !== 200) {
        throw (res.status, res.data);
    }
    return convertToEvent(res.data);
}
