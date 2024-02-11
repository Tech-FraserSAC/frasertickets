// ONLY RUNS ON THE CLIENT!!!
export default function parseClientCookies() {
    return Object.fromEntries(document.cookie.split("; ").map((raw) => raw.split("=")));
}
