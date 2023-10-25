import Layout from "@/components/admin/Layout";
import getAllTickets from "@/lib/backend/ticket/getAllTickets";
import TicketWithUserAndEventData from "@/lib/backend/ticket/ticketWithUserAndEventData";
import { Typography } from "@material-tailwind/react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "react-query";

export default function TicketViewingPage() {
    const { isLoading, error, data: tickets } = useQuery('frasertix-admin-tickets', () => (
        getAllTickets()
    ))

    return (
        <Layout name="Tickets" className="p-4 md:p-8 lg:px-12">
            <Typography variant="h1" className="text-center mb-2">Tickets</Typography>
            {isLoading && (
                <Typography variant="paragraph" className="text-center lg:w-3/4">Loading...</Typography>
            )}
            {tickets && (
                <div className='overflow-x-auto max-w-full'>
                    <table className="table table-fixed border border-gray-500 border-collapse mb-6 w-full">
                        <thead className='text-black font-semibold text-md lg:text-xl bg-gray-400'>
                            <tr>
                                <th className='px-4 border border-gray-500 py-1'>Created Time</th>
                                <th className='px-6 border border-gray-500'>Event</th>
                                <th className='px-4 border border-gray-500'>Student Name</th>
                                <th className='px-4 border border-gray-500'>Student #</th>
                                <th className='px-4 border border-gray-500'>Scans</th>
                                <th className='px-4 border border-gray-500'>Actions</th>
                            </tr>
                        </thead>

                        <tbody className='text-gray-800 text-center text-md'>
                            {tickets.map(ticket => {
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