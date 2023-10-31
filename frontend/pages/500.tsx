import Layout from '@/components/Layout'
import Link from 'next/link'

export function ServerErrorComponent({ home } : { home?: string }) {
    return (
        <div className="flex flex-col flex-grow justify-center" key="page-404">
            <div className="flex flex-col p-8">
                <h1 className="text-8xl text-center mb-2 font-semibold text-red-500">
                    500
                </h1>
                <h2 className="text-3xl text-center mb-6 text-black">
                    Server Error
                </h2>

                <p className="text-xl text-center mb-6 text-gray-700">
                    Sorry, something went wrong on our side while processing your request. We&apos;ll get this fixed as soon as possible.
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
    )
}

export default function Page500() {
    return (
        <Layout name="500 Server Error" className='h-screen'>
            <ServerErrorComponent />
        </Layout>
    )
}