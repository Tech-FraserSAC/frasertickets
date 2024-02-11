import Event, { convertToEvent } from "./event";

import sendBackendRequest from "../sendBackendRequest";

export default async function getAllEvents() {
    const res = await sendBackendRequest("/events", "get");

    const rawEvents = res.data as { [key: string]: any }[];
    const events = rawEvents.map((data) => convertToEvent(data));

    return events as Event[];
}
