import Link from "next/link";

import { Button, Card, CardBody, CardFooter, Typography } from "@material-tailwind/react";
import { useQuery } from "react-query";

import getSelfTickets from "@/lib/backend/ticket/getSelfTickets";
import TicketWithUserAndEventData from "@/lib/backend/ticket/ticketWithUserAndEventData";

import cleanDisplayName from "@/util/cleanDisplayName";
import formatDateRange from "@/util/formatFullDate";

import { useFirebaseAuth } from "@/components/FirebaseAuthContext";
import Layout from "@/components/Layout";

const TicketCard = ({
    ticket,
    fullName,
    allowTicketShow = true,
}: {
    ticket: TicketWithUserAndEventData;
    fullName: string;
    allowTicketShow?: boolean;
}) => {
    return (
        <div>
            <Card className="w-96">
                <CardBody>
                    <Typography
                        variant="h5"
                        color="blue-gray"
                        className="mb-2"
                    >
                        {ticket.eventData.name}
                    </Typography>
                    <Typography>
                        {formatDateRange(ticket.eventData.start_timestamp, ticket.eventData.end_timestamp)}
                    </Typography>
                    <Typography>Solely for {fullName}</Typography>
                </CardBody>
                <CardFooter className="pt-0 space-x-2">
                    {allowTicketShow && (
                        <Link href={`/tickets/${ticket.id}`}>
                            <Button color="blue">View Ticket</Button>
                        </Link>
                    )}

                    <Link href={`/events/${ticket.eventData.id}`}>
                        <Button color="gray">View Event</Button>
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
};

export default function EventsIndex() {
    const {
        isLoading,
        error,
        data: tickets,
    } = useQuery("frasertix-events", () => getSelfTickets(), {
        refetchInterval: 60 * 1000,
    });
    const { user, loaded: authLoaded } = useFirebaseAuth();

    if (error) console.error(error);

    const currentTickets = tickets?.filter(
        (ticket) =>
            ticket.eventData.start_timestamp.getTime() < Date.now() &&
            ticket.eventData.end_timestamp.getTime() > Date.now(),
    );
    const upcomingTickets = tickets?.filter((ticket) => ticket.eventData.start_timestamp.getTime() > Date.now());
    const previousTickets = tickets?.filter((ticket) => ticket.eventData.end_timestamp.getTime() < Date.now());

    return (
        <Layout
            name="Events"
            userProtected={true}
            className="p-4 md:p-8 lg:px-12"
        >
            <Typography
                variant="h1"
                className="mb-4 text-center"
            >
                Tickets
            </Typography>

            {!(isLoading || error) ? (
                <div className="flex flex-col gap-4">
                    {tickets && tickets.length === 0 && (
                        <div className="flex flex-col items-center">
                            <Typography
                                variant="h3"
                                className="mb-2 text-center"
                                color="blue-gray"
                            >
                                No tickets
                            </Typography>
                            <Typography
                                variant="lead"
                                className="text-center lg:w-3/4"
                            >
                                It looks like you don&apos;t have any tickets yet. If you have recently purchased a
                                ticket either through SchoolCashOnline, or in-person, please keep in mind that it may
                                take some time for it to show up here. In this case, please be patient as we work to get
                                your ticket added.
                            </Typography>
                        </div>
                    )}
                    {currentTickets && currentTickets.length !== 0 && (
                        <div>
                            <Typography
                                variant="h3"
                                className="mb-2"
                                color="blue-gray"
                            >
                                Happening now
                            </Typography>
                            <div className="flex flex-wrap gap-4">
                                {currentTickets.map((ticket) => (
                                    <TicketCard
                                        key={ticket.id}
                                        ticket={ticket}
                                        fullName={authLoaded ? cleanDisplayName(user?.displayName)! : ""}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {upcomingTickets && upcomingTickets.length !== 0 && (
                        <div>
                            <Typography
                                variant="h3"
                                className="mb-2"
                                color="blue-gray"
                            >
                                Upcoming
                            </Typography>
                            <div className="flex flex-wrap gap-4">
                                {upcomingTickets.map((ticket) => (
                                    <TicketCard
                                        key={ticket.id}
                                        ticket={ticket}
                                        fullName={authLoaded ? cleanDisplayName(user?.displayName)! : ""}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {previousTickets && previousTickets.length !== 0 && (
                        <div>
                            <Typography
                                variant="h3"
                                className="mb-2"
                                color="blue-gray"
                            >
                                Previous
                            </Typography>
                            <div className="flex flex-wrap gap-4">
                                {previousTickets.map((ticket) => (
                                    <TicketCard
                                        key={ticket.id}
                                        ticket={ticket}
                                        fullName={authLoaded ? cleanDisplayName(user?.displayName!) : ""}
                                        allowTicketShow={false}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <span className="text-center">Loading...</span>
            )}
        </Layout>
    );
}
