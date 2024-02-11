import Link from "next/link";

import Layout from "@/components/Layout";

export function NotFoundComponent({ home }: { home?: string }) {
    return (
        <div
            className="flex flex-col h-screen flex-grow justify-center"
            key="page-404"
        >
            <div className="flex flex-col p-8">
                <h1 className="text-8xl text-center mb-2 font-semibold text-red-500">404</h1>
                <h2 className="text-3xl text-center mb-6 text-black">Page Not Found</h2>

                <p className="text-xl text-center mb-6 text-gray-700">
                    Sorry, the page that you&apos;re looking for does not exist.
                </p>

                <div className="self-center">
                    <Link
                        href={home ?? "/"}
                        className="text-md bg-blue-500 hover:bg-blue-600 duration-75 text-white px-4 py-2 rounded-lg font-semibold"
                    >
                        Take me home!
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function Page404() {
    return (
        <Layout
            name="404 Not Found"
            className="h-screen"
        >
            <NotFoundComponent />
        </Layout>
    );
}
