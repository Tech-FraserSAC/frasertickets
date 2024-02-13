import getAllEvents from "@/lib/backend/event/getAllEvents";
import getEvent from "@/lib/backend/event/getEvent";

export type PropertySchema = {
    type: "integer" | "string";
    editable: boolean;
    userVisible: boolean;
    description: string;
    displayName: string;
    [key: string]: any;
};

export type CustomFieldsSchema = {
    type: string;
    properties: { [key: string]: PropertySchema };
    required: string[];
    [key: string]: any;
};

export function convertPropertySchemaTypeToInputType(schema: PropertySchema) {
    switch (schema.type) {
        case "integer": {
            return "number";
        }
        default: {
            return "text";
        }
    }
}

type Event = {
    id: string;
    name: string;
    description: string;
    img_urls: string[];
    location: string;
    address: string;
    start_timestamp: Date;
    end_timestamp: Date;
    custom_fields_schema: CustomFieldsSchema;
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
        custom_fields_schema: rawData.custom_fields_schema,
    };
}

export default Event;
export { getEvent, getAllEvents };
