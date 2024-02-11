// Cleans the display name from firebase to not include JFSS info
export default function cleanDisplayName(raw: string | null | undefined) {
    return (raw ?? "").replace(" John Fraser SS", "").replace(" - (2652)", "");
}

// Cleans the display name from firebase to not include JFSS info
export function cleanDisplayNameWithStudentNumber(
    raw: string | null | undefined,
    studentNumber: string | null | undefined,
) {
    return (raw ?? "")
        .replace(" John Fraser SS", "")
        .replace(" - (2652)", "")
        .replace(studentNumber ?? "", "");
}
