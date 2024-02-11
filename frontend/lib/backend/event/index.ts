import getAllEvents from "@/lib/backend/event/getAllEvents";
import getEvent from "@/lib/backend/event/getEvent";

type Event = {
    id: string;
    name: string;
    description: string;
    img_urls: string[];
    location: string;
    address: string;
    start_timestamp: Date;
    end_timestamp: Date;
};

export function convertToEvent(rawData: { [key: string]: any }): Event {
    return {
        id: rawData.id,
        name: rawData.name,
        description: rawData.description,
        img_urls: rawData.img_urls,
        location: rawData.location,
        address: rawData.address,
        start_timestamp: new Date(rawData.start_timestamp),
        end_timestamp: new Date(rawData.end_timestamp),
    };
}

export default Event;
export { getEvent, getAllEvents };
