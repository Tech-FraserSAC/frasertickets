// Route should have a leading slash
export default function getBackendRoute(route: string) {
    return process.env.NEXT_PUBLIC_BACKEND_URL + route
}