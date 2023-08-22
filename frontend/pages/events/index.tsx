import Layout from "@/components/Layout"
import Event from "@/lib/backend/event/event"
import getAllEvents from "@/lib/backend/event/getAllEvents"
import { Button, Card, CardBody, CardFooter, CardHeader, Typography } from "@material-tailwind/react"
import { Fragment } from "react"
import { useQuery } from "react-query"

import Image from "next/image"
import Link from "next/link"

const EventCard = ({ event }: { event: Event }) => {
    return (
        <Card className="w-96">
            <CardHeader color="blue-gray" className="relative h-56 mt-4">
                <Image src={event.img_url} alt="event image" width={400} height={400} className="object-cover object-center" />
            </CardHeader>
            <CardBody>
                <Typography variant="h5" color="blue-gray" className="mb-2">
                    {event.name}
                </Typography>
                <Typography>
                    {event.description.length > 100 ? event.description.slice(0, 100) + "..." : event.description}
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

    console.log(currentEvents, upcomingEvents, previousEvents)

    return (
        <Layout name="Events" userProtected={true} className="p-4">
            <Typography variant="h1" className="mb-4 text-center">Events</Typography>

            {!(isLoading || error) ? (
                <div className="flex flex-col gap-4">
                    {currentEvents && currentEvents.length !== 0 &&
                        <div>
                            <Typography variant="h3" className="mb-2" color="blue-gray">Happening now</Typography>
                            <div className="flex flex-wrap gap-4">
                                {currentEvents.map(event => <EventCard event={event} />)}
                            </div>
                        </div>
                    }

                    {upcomingEvents && upcomingEvents.length !== 0 &&
                        <div>
                            <Typography variant="h3" className="mb-2" color="blue-gray">Upcoming</Typography>
                            <div className="flex flex-wrap gap-4">
                                {upcomingEvents.map(event => <EventCard event={event} />)}
                            </div>
                        </div>
                    }

                    {previousEvents && previousEvents.length !== 0 &&
                        <div>
                            <Typography variant="h3" className="mb-2" color="blue-gray">Previous</Typography>
                            <div className="flex flex-wrap gap-4">
                                {previousEvents.map(event => <EventCard event={event} />)}
                            </div>
                        </div>
                    }

                </div>
            ) :
                <span className="text-center">Loading...</span>
            }

        </Layout>
    )
}