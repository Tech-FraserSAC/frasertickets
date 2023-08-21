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

    return (
        <Layout name="Events" userProtected={true} className="p-4">
            <Typography variant="h1" className="mb-4 text-center">Events</Typography>

            <div className="flex flex-wrap gap-4">
                {!(isLoading || error) ? events?.map(event => <EventCard event={event} />) : <span className="text-center">Loading...</span>}
            </div>
        </Layout>
    )
}