import { CustomFieldsSchema } from "@/lib/backend/event";

export default function getCustomFieldsFromTicket(customFields: { [key: string]: any }, customFieldsSchema: CustomFieldsSchema) {
    return Object.keys(customFields)
        .filter((key) => key in customFieldsSchema.properties) // Must be an attribute in schema
        .map((key) => ({
            id: key,
            value: customFields[key],
            schema: customFieldsSchema.properties[key],
        }));
}