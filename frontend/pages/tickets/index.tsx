import Layout from "@/components/Layout"
import Event from "@/lib/backend/event/event"
import getAllEvents from "@/lib/backend/event/getAllEvents"
import { Button, Card, CardBody, CardFooter, CardHeader, Typography } from "@material-tailwind/react"
import { Fragment } from "react"
import { useQuery } from "react-query"

import Image from "next/image"
import Link from "next/link"
import TicketWithEventData from "@/lib/backend/ticket/ticketWithEventData"
import getSelfTickets from "@/lib/backend/ticket/getSelfTickets"
import formatDateRange from "@/util/formatFullDate"
import { useFirebaseAuth } from "@/components/FirebaseAuthContext"

const TicketCard = ({ ticket, fullName, allowTicketShow = true }: { ticket: TicketWithEventData, fullName: string, allowTicketShow?: boolean }) => {
    return (
        <Card className="w-96">
            <CardBody>
                <Typography variant="h5" color="blue-gray" className="mb-2">
                    {ticket.eventData.name}
                </Typography>
                <Typography>
                    {formatDateRange(ticket.eventData.start_timestamp, ticket.eventData.end_timestamp)}
                </Typography>
                <Typography>
                    Solely for {fullName}
                </Typography>
            </CardBody>
            <CardFooter className="pt-0 space-x-2">
                {allowTicketShow && (
                    <Link href={`/tickets/${ticket.id}`}>
                        <Button color="blue">
                            View Ticket
                        </Button>
                    </Link>
                )}

                <Link href={`/events/${ticket.eventData.id}`}>
                    <Button color="gray">
                        View Event
                    </Button>
                </Link>
            </CardFooter>
        </Card>
    )
}

export default function EventsIndex() {
    const { isLoading, error, data: tickets } = useQuery('frasertix-events', () => (
        getSelfTickets()
    ))
    const { user, loaded: authLoaded } = useFirebaseAuth()

    if (error) console.error(error)

    console.log(tickets)

    const currentTickets = tickets?.filter(ticket => ticket.eventData.start_timestamp.getTime() < Date.now() && ticket.eventData.end_timestamp.getTime() > Date.now())
    const upcomingTickets = tickets?.filter(ticket => ticket.eventData.start_timestamp.getTime() > Date.now())
    const previousTickets = tickets?.filter(ticket => ticket.eventData.end_timestamp.getTime() < Date.now())

    console.log(currentTickets, upcomingTickets, previousTickets)

    return (
        <Layout name="Events" userProtected={true} className="p-4 md:p-8 lg:px-12">
            <Typography variant="h1" className="mb-4 text-center">Tickets</Typography>

            {!(isLoading || error) ? (
                <div className="flex flex-col gap-4">
                    {tickets && tickets.length === 0 && 
                        <div className="flex flex-col items-center">
                            <Typography variant="h3" className="mb-2 text-center" color="blue-gray">No tickets</Typography>
                            <Typography variant="lead" className="text-center lg:w-3/4">It looks like you don&apos;t have any tickets yet. If you have recently purchased a ticket either through SchoolCashOnline, or in-person, it may take a while to show up.</Typography>
                        </div>
                    }
                    {currentTickets && currentTickets.length !== 0 &&
                        <div>
                            <Typography variant="h3" className="mb-2" color="blue-gray">Happening now</Typography>
                            <div className="flex flex-wrap gap-4">
                                {currentTickets.map(ticket => <TicketCard key={ticket.id} ticket={ticket} fullName={authLoaded ? user?.displayName! : ""} />)}
                            </div>
                        </div>
                    }

                    {upcomingTickets && upcomingTickets.length !== 0 &&
                        <div>
                            <Typography variant="h3" className="mb-2" color="blue-gray">Upcoming</Typography>
                            <div className="flex flex-wrap gap-4">
                                {upcomingTickets.map(ticket => <TicketCard key={ticket.id} ticket={ticket} fullName={authLoaded ? user?.displayName! : ""} />)}
                            </div>
                        </div>
                    }

                    {previousTickets && previousTickets.length !== 0 &&
                        <div>
                            <Typography variant="h3" className="mb-2" color="blue-gray">Previous</Typography>
                            <div className="flex flex-wrap gap-4">
                                {previousTickets.map(ticket => <TicketCard key={ticket.id} ticket={ticket} fullName={authLoaded ? user?.displayName! : ""} allowTicketShow={false} />)}
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