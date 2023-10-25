import Layout from "@/components/admin/Layout";
import getAllTickets from "@/lib/backend/ticket/getAllTickets";
import TicketWithUserAndEventData from "@/lib/backend/ticket/ticketWithUserAndEventData";
import { Typography } from "@material-tailwind/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "react-query";

export default function TicketViewingPage() {
    const { isLoading, error, data: tickets } = useQuery('frasertix-admin-tickets', async () => {
        const tickets = await getAllTickets()
        setFilteredTickets(tickets)
        return tickets
    })

    const [eventNameFilter, setEventNameFilter] = useState("");
    const [studentNameFilter, setStudentNameFilter] = useState("");
    const [studentNumberFilter, setStudentNumberFilter] = useState("");
    const [filteredTickets, setFilteredTickets] = useState<TicketWithUserAndEventData[] | null>(null);

    // TODO: Replace this with logic that requests the server
    const updateFilteredTickets = () => {
        setFilteredTickets(!tickets ? null : tickets.filter((ticket) => {
            const eventNameMatches = ticket.eventData.name.toLocaleLowerCase().indexOf(eventNameFilter.toLocaleLowerCase()) != -1;
            const studentNameMatches = ticket.ownerData.full_name.toLocaleLowerCase().indexOf(studentNameFilter.toLocaleLowerCase()) != -1;
            const studentNumberMatches = ticket.ownerData.student_number.indexOf(studentNumberFilter) != -1;
            
            return eventNameMatches && studentNameMatches && studentNumberMatches;
        }))
    }

    // Only refresh the table once done typing
    useEffect(() => {
        const timeoutId = setTimeout(() => updateFilteredTickets(), 250);
        return () => clearTimeout(timeoutId);
    }, [eventNameFilter, studentNameFilter, studentNumberFilter])

    return (
        <Layout name="Tickets" className="p-4 md:p-8 lg:px-12">
            <Typography variant="h1" className="text-center mb-2">Tickets</Typography>
            {isLoading && (
                <Typography variant="paragraph" className="text-center lg:w-3/4">Loading...</Typography>
            )}
            {tickets && (
                <div className='overflow-x-auto max-w-full'>
                    <table className="table table-fixed border-collapse mb-6 w-full">
                        <thead>
                            <tr className="bg-transparent">
                                <th></th>
                                <th>
                                    <input
                                        className="px-4 py-2 m-1 rounded-lg bg-white text-black text-sm w-5/6 placeholder:text-gray-600 font-normal border-2 border-transparent duration-75 active:border-blue-200 transition-all"
                                        placeholder="Event name..."
                                        value={eventNameFilter}
                                        onInput={e => setEventNameFilter(e.currentTarget.value)}
                                    />
                                </th>
                                <th>
                                    <input
                                        className="px-4 py-2 m-1 rounded-lg bg-white text-black text-sm w-5/6 placeholder:text-gray-600 font-normal border-2 border-transparent duration-75 active:border-blue-200 transition-all"
                                        placeholder="Student name..."
                                        value={studentNameFilter}
                                        onInput={e => setStudentNameFilter(e.currentTarget.value)}
                                    />
                                </th>
                                <th>
                                    <input
                                        className="px-4 py-2 m-1 rounded-lg bg-white text-black text-sm w-5/6 placeholder:text-gray-600 font-normal border-2 border-transparent duration-75 active:border-blue-200 transition-all"
                                        placeholder="Student number..."
                                        value={studentNumberFilter}
                                        onInput={e => setStudentNumberFilter(e.currentTarget.value)}
                                    />
                                </th>
                                <th></th>
                                <th></th>
                            </tr>

                            <tr className="bg-gray-400 border border-gray-500 border-collapse text-black font-semibold text-md lg:text-xl">
                                <th className='px-4 border border-gray-500 py-1'>Created Time</th>
                                <th className='px-6 border border-gray-500'>Event</th>
                                <th className='px-4 border border-gray-500'>Student Name</th>
                                <th className='px-4 border border-gray-500'>Student #</th>
                                <th className='px-4 border border-gray-500'>Scans</th>
                                <th className='px-4 border border-gray-500'>Actions</th>
                            </tr>
                        </thead>

                        <tbody className='text-gray-800 text-center text-md'>
                            {filteredTickets.map(ticket => {
                                const timestamp = new Date(ticket.timestamp);
                                const timestampStr = timestamp.toLocaleString("en-US", {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',

                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                });

                                return (
                                    <tr key={ticket.id}>
                                        <td className='border border-gray-500 px-4 py-1'>{timestampStr}</td>
                                        <td className='border border-gray-500 px-4 py-1'>
                                            <Link href={`/events/${ticket.eventId}`} className="text-blue-500 hover:text-blue-700 duration-75 hover:underline">
                                                {ticket.eventData.name}
                                            </Link>
                                        </td>
                                        <td className='px-4 py-1 border border-gray-500'>
                                            {ticket.ownerData.pfp_url ? (
                                                <div className="flex flex-row gap-1 items-center justify-center w-full">
                                                    <Image src={ticket.ownerData.pfp_url} alt="pfp" height={25} width={25} className="rounded-full" quality={100} />
                                                    <span>{ticket.ownerData.full_name.replace(" John Fraser SS", "").replace(ticket.ownerData.student_number, "")}</span>
                                                </div>
                                            ) : (
                                                <td className='border border-gray-500 px-4 py-1'>{ticket.ownerData.full_name.replace(" John Fraser SS", "").replace(ticket.ownerData.student_number, "")}</td>
                                            )}
                                        </td>
                                        <td className='border border-gray-500 px-4 py-1'>{ticket.ownerData.student_number}</td>
                                        <td className='border border-gray-500 px-4 py-1'>0</td>
                                        <td className='border border-gray-500 px-4 py-2'>
                                            <Link
                                                href={`/tickets/${ticket.id}`}
                                                className="px-4 py-2 bg-blue-500 hover:bg-blue-700 duration-75 font-semibold text-sm text-white rounded-lg"
                                                rel="noopener noreferrer" target="_blank"
                                            >
                                                View
                                            </Link>
                                        </td>
                                    </tr>
                                )
                            })}
                            {/*entries.map((data: any) => {
                            const signInTime = new Date(data.time.seconds * 1000);
                            const timeString = signInTime.toLocaleTimeString("en-US", {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                            });

                            return (
                                <tr key={data.student_number}>
                                    <td className='border border-neutral-500 px-4 py-1'>{data.student_number}</td>
                                    <td className='border border-neutral-500 px-4'>
                                        {data.user_info && (
                                            <div className="flex flex-row gap-1 items-center">
                                                <Image src={data.user_info.photo_url} alt="pfp" height={25} width={25} className="rounded-full" quality={100} />
                                                <span>{data.user_info.display_name.replace(" John Fraser SS", "").replace(data.student_number, "")}</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className={`${data.late && "text-yellow-400"} border border-neutral-500 px-4`}>{timeString}</td>
                                    <td className={`${data.is_good_ip ? "text-gray-300" : "text-red-400"} border border-neutral-500 px-4`}>{data.is_good_ip ? "Yes" : "No"}</td>
                                    <td className='border border-neutral-500 px-4'>{data.using_vpn ? "Yes" : "No"}</td>
                                </tr>
                            )
                        })*/}
                        </tbody>
                    </table>
                </div>
            )}
        </Layout>
    )
}