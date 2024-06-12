import Layout from "@/components/Layout";
import { Card, CardHeader, CardBody, Typography, CardFooter, Button } from "@material-tailwind/react";
import Link from "next/link";
import Image from "next/image";
import Event, { getAllEvents } from "@/lib/backend/event";
import { useQuery } from "react-query";
import getEventTicketCount from "@/lib/backend/event/getEventTicketCount";

const EventCard = ({ event }: { event: Event }) => {
    const { isLoading, error, data: ticketCount } = useQuery(`frasertix-event-ticket-count-${event.id}`, () => getEventTicketCount(event.id));

    if (error) console.error(error);

    return (
        <div>
            <Card className="w-fit sm:w-80 lg:w-96">
                <CardHeader
                    color="blue-gray"
                    className="relative h-56 mt-4"
                >
                    <Image
                        src={event.img_urls[0] /* There must always be at least one photo */}
                        alt="event image"
                        width={600}
                        height={600}
                        className="w-full h-full object-cover object-center"
                    />
                </CardHeader>
                <CardBody>
                    <Typography
                        variant="h5"
                        color="blue-gray"
                        className="text-center sm:text-start"
                    >
                        {event.name}
                    </Typography>
                    <Typography className="text-center sm:text-start mb-2">
                        {(isLoading || error) ? "..." : ticketCount} ticket{ticketCount !== 1 ? "s" : ""}
                    </Typography>
                    <Typography className="text-center sm:text-start">
                        {event.description.length > 120 ? event.description.slice(0, 120) + "..." : event.description}
                    </Typography>
                </CardBody>
                <CardFooter className="flex flex-row gap-2 flex-wrap items-center sm:items-start text-center sm:text-start pt-0">
                    <Link href={`/events/${event.id}`}>
                        <Button color="blue">View Page</Button>
                    </Link>
                    
                    <Link href={`/events/${event.id}`}>
                        <Button color="orange">Edit</Button>
                    </Link>

                    <Link href={`/events/${event.id}`}>
                        <Button color="red">Delete</Button>
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
};

const SkeletonEventCard = () => {
    return (
        <Card className="w-fit sm:w-80 lg:w-96 animate-pulse">
            <CardHeader
                color="blue-gray"
                className="relative h-56 mt-4"
            >
                <div className="bg-gray-200 h-[300px] sm:h-[400px] w-[200px] sm:w-[400px]" />
            </CardHeader>
            <CardBody>
                <div className="mb-2">
                    <div className="h-6 bg-gray-200 rounded-full max-w-[200px] sm:max-w-[400px]" />
                </div>
                <div className="flex flex-col gap-1">
                    <div className="h-4 bg-gray-200 rounded-full max-w-[150px] sm:max-w-[300px]" />
                    <div className="h-4 bg-gray-200 rounded-full max-w-[150px] sm:max-w-[300px]" />
                    <div className="h-4 bg-gray-200 rounded-full max-w-[150px] sm:max-w-[300px]" />
                </div>
            </CardBody>
            <CardFooter className="pt-0">
                <div className="h-8 w-20 bg-gray-200 rounded-full" />
            </CardFooter>
        </Card>
    );
};

export default function EventsAdminPage() {
    const { isLoading, error, data: events } = useQuery("frasertix-events", () => getAllEvents());

    if (error) console.error(error);

    const currentEvents = events?.filter(
        (event) => event.start_timestamp.getTime() < Date.now() && event.end_timestamp.getTime() > Date.now(),
    );
    const upcomingEvents = events?.filter((event) => event.start_timestamp.getTime() > Date.now());
    const previousEvents = events?.filter((event) => event.end_timestamp.getTime() < Date.now());
    return (
        <Layout
            name="Events"
            className="p-4 md:p-8 lg:px-12"
            adminProtected
        >
            <div className="flex flex-col items-center gap-1 mb-4">
                <Typography
                    variant="h1"
                    className="text-center"
                >
                    Events
                </Typography>

                <Button color="blue">Create Event</Button>
            </div>


            {!(isLoading || error) ? (
                <div className="flex flex-col gap-4">
                    {events && events.length === 0 && (
                        <div className="flex flex-col items-center">
                            <Typography
                                variant="h3"
                                className="mb-2 text-center"
                                color="blue-gray"
                            >
                                No events
                            </Typography>
                            <Typography
                                variant="lead"
                                className="text-center lg:w-3/4"
                            >
                                It looks like there aren&apos;t any events yet. You can add one with the button above.
                            </Typography>
                        </div>
                    )}
                    {currentEvents && currentEvents.length !== 0 && (
                        <div>
                            <Typography
                                variant="h3"
                                className="text-center lg:text-left mb-2"
                                color="blue-gray"
                            >
                                Happening now
                            </Typography>
                            <div className="flex flex-wrap gap-4 justify-center lg:justify-start w-full">
                                {currentEvents.map((event) => (
                                    <EventCard
                                        key={event.id}
                                        event={event}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {upcomingEvents && upcomingEvents.length !== 0 && (
                        <div>
                            <Typography
                                variant="h3"
                                className="text-center lg:text-left mb-2"
                                color="blue-gray"
                            >
                                Upcoming
                            </Typography>
                            <div className="flex flex-wrap gap-4 justify-center lg:justify-start w-full">
                                {upcomingEvents.map((event) => (
                                    <EventCard
                                        key={event.id}
                                        event={event}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {previousEvents && previousEvents.length !== 0 && (
                        <div>
                            <Typography
                                variant="h3"
                                className="text-center lg:text-left mb-2"
                                color="blue-gray"
                            >
                                Previous
                            </Typography>
                            <div className="flex flex-wrap gap-4 justify-center lg:justify-start w-full">
                                {previousEvents.map((event) => (
                                    <EventCard
                                        key={event.id}
                                        event={event}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div>
                    <Typography
                        variant="h3"
                        className="text-center lg:text-left mb-2"
                        color="blue-gray"
                    >
                        Upcoming
                    </Typography>
                    <div className="flex flex-wrap gap-4 justify-center lg:justify-start w-full">
                        {[...Array(2)].map((_, i) => (
                            <SkeletonEventCard key={i} />
                        ))}
                    </div>
                </div>
            )}
        </Layout>
    )
}