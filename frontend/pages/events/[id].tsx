import getEvent from "@/lib/backend/event/getEvent"
import { useQuery } from "react-query"

import Router, { useRouter } from "next/router"
import Layout from "@/components/Layout"
import Image from "next/image"
import { Breadcrumbs, Carousel, Typography } from "@material-tailwind/react"
import Link from "next/link"

import { AiOutlineArrowLeft } from "react-icons/ai"
import formatFullDate from "@/util/formatFullDate"

export default function EventSpecificPage() {
    const router = useRouter()
    const { id } = router.query

    const { isLoading: rqLoading, error, data } = useQuery('frasertix-event', () => (
        getEvent(id as string)
    ), {
        enabled: router.isReady,
        retry: (failureCount, error: any | undefined) => {
            // 400 means its not an actual code, which is basically equivalent to not found
            if (error?.response?.status === 400 || error?.response?.status === 404) {
                router.push("/404")
                return false
            }

            return failureCount < 3
        }
    })

    const isLoading = !(router.isReady) || rqLoading
    const pageName = !isLoading ? data?.name as string : "Events"

    if (error) console.error(error)

    return (
        <Layout name={pageName} userProtected={true} className="p-4 md:p-8 lg:px-12">
            {
                (isLoading || error) ? (
                    isLoading ? (
                        <span>Loading...</span>
                    ) : (
                        <span>error...</span>
                    )
                ) : (

                    <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-8 xl:gap-12">
                        <div className="flex flex-col items-center lg:items-start lg:w-1/2 mb-6">
                            <Link href="/events" className="flex items-center gap-1 self-start text-blue-500 hover:text-blue-600 text-lg font-medium mb-2">
                                <AiOutlineArrowLeft />
                                <span>Events</span>
                            </Link>

                            <Carousel className="md:w-1/2 lg:w-full rounded-xl" autoplay={true}>
                                {data!.img_urls.map((img_url, i) => (
                                    <Image 
                                        src={img_url as string} 
                                        width={1000} 
                                        height={1000} 
                                        className="w-full h-full object-cover object-center" 
                                        alt=""
                                        key={i}
                                        loading="eager"
                                    />
                                ))}
                            </Carousel>
                        </div>

                        <div className="flex flex-col items-center lg:items-start text-center lg:text-start lg:w-3/4">
                            <Typography variant="h1">{data!.name}</Typography>
                            <Typography variant="lead" color="blue-gray" className="font-medium">
                                {data!.location} | {data!.address}
                            </Typography>
                            <Typography variant="lead" color="blue-gray" className="font-medium mb-6">
                                {formatFullDate(data!.start_timestamp, data!.end_timestamp)}
                            </Typography>

                            <Typography variant="paragraph">
                                {data!.description}
                            </Typography>
                        </div>
                    </div>
                )
            }
        </Layout>
    )
}