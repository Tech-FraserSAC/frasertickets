import Layout from "@/components/Layout"
import Event from "@/lib/backend/event/event"
import getAllEvents from "@/lib/backend/event/getAllEvents"
import { Button, Card, CardBody, CardFooter, CardHeader, Typography } from "@material-tailwind/react"
import { useQuery } from "react-query"

import Image from "next/image"
import Link from "next/link"

const EventCard = ({ event }: { event: Event }) => {
    return (
        <div>
            <Card className="w-96">
                <CardHeader color="blue-gray" className="relative h-56 mt-4">
                    <Image src={event.img_urls[0] /* There must always be at least one photo */} alt="event image" width={600} height={600} className="w-full h-full object-cover object-center" />
                </CardHeader>
                <CardBody>
                    <Typography variant="h5" color="blue-gray" className="mb-2">
                        {event.name}
                    </Typography>
                    <Typography>
                        {event.description.length > 120 ? event.description.slice(0, 120) + "..." : event.description}
                    </Typography>
                </CardBody>
                <CardFooter className="pt-0">
                    <Link href={`/events/${event.id}`}>
                        <Button>
                            View More
                        </Button>
                    </Link>
                </CardFooter>
            </Card>
        </div>
    )
}

const SkeletonEventCard = () => {
    return (
        <Card className="w-96 animate-pulse">
            <CardHeader color="blue-gray" className="relative h-56 mt-4">
                <div className="bg-gray-200 h-[400px] w-[400px]" />
            </CardHeader>
            <CardBody>
                <div className="mb-2">
                    <div className="h-6 bg-gray-200 rounded-full max-w-[400px]" />
                </div>
                <div className="flex flex-col gap-1">
                    <div className="h-4 bg-gray-200 rounded-full max-w-[300px]" />
                    <div className="h-4 bg-gray-200 rounded-full max-w-[300px]" />
                    <div className="h-4 bg-gray-200 rounded-full max-w-[300px]" />
                </div>
            </CardBody>
            <CardFooter className="pt-0">
                <div className="h-8 w-20 bg-gray-200 rounded-full" />
            </CardFooter>
        </Card>
    )
}

export default function EventsIndex() {
    const { isLoading, error, data: events } = useQuery('frasertix-events', () => (
        getAllEvents()
    ))

    if (error) console.error(error)

    const currentEvents = events?.filter(event => event.start_timestamp.getTime() < Date.now() && event.end_timestamp.getTime() > Date.now())
    const upcomingEvents = events?.filter(event => event.start_timestamp.getTime() > Date.now())
    const previousEvents = events?.filter(event => event.end_timestamp.getTime() < Date.now())

    return (
        <Layout name="Events" userProtected={true} className="p-4 md:p-8 lg:px-12">
            <Typography variant="h1" className="mb-4 text-center">Events</Typography>

            {!(isLoading || error) ? (
                <div className="flex flex-col gap-4">
                    {currentEvents && currentEvents.length !== 0 &&
                        <div>
                            <Typography variant="h3" className="text-center lg:text-left mb-2" color="blue-gray">Happening now</Typography>
                            <div className="flex flex-wrap gap-4 justify-center lg:justify-start w-full">
                                {currentEvents.map(event => <EventCard key={event.id} event={event} />)}
                            </div>
                        </div>
                    }

                    {upcomingEvents && upcomingEvents.length !== 0 &&
                        <div>
                            <Typography variant="h3" className="text-center lg:text-left mb-2" color="blue-gray">Upcoming</Typography>
                            <div className="flex flex-wrap gap-4 justify-center lg:justify-start w-full">
                                {upcomingEvents.map(event => <EventCard key={event.id} event={event} />)}
                            </div>
                        </div>
                    }

                    {previousEvents && previousEvents.length !== 0 &&
                        <div>
                            <Typography variant="h3" className="text-center lg:text-left mb-2" color="blue-gray">Previous</Typography>
                            <div className="flex flex-wrap gap-4 justify-center lg:justify-start w-full">
                                {previousEvents.map(event => <EventCard key={event.id} event={event} />)}
                            </div>
                        </div>
                    }

                </div>
            ) :
                <div>
                    <Typography variant="h3" className="mb-2" color="blue-gray">Upcoming</Typography>
                    <div className="flex flex-wrap gap-4">
                        {[...Array(1)].map((_, i) => <SkeletonEventCard key={i} />)}
                    </div>
                </div>
            }

        </Layout>
    )
}