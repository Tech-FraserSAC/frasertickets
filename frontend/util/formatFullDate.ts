export default function formatDateRange(startDate: Date, endDate: Date) {
    const fmt = new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });

    return fmt.formatRange(startDate, endDate);
}
