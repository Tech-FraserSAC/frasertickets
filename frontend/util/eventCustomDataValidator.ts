import { buildYup } from "schema-to-yup";

import Event from "@/lib/backend/event";

export function validateCustomDataForEvent(event: Event, data: { [key: string]: any }) {
    const yupSchema = buildYup(event.custom_fields_schema);
    return yupSchema.isValid(data);
}

export function buildValidatorForCustomEventData(event: Event) {
    return buildYup(event.custom_fields_schema);
}
