import { convertToEvent } from "./event";

import sendBackendRequest from "../sendBackendRequest";

export default async function getEvent(id: string) {
    const res = await sendBackendRequest(`/events/${id}`, "get");
    const event = convertToEvent(res.data as { [key: string]: any });
    return event;
}
