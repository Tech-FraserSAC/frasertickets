import Layout from "@/components/admin/Layout";
import deleteTicket from "@/lib/backend/ticket/deleteTicket";
import getAllTickets from "@/lib/backend/ticket/getAllTickets";
import TicketWithUserAndEventData from "@/lib/backend/ticket/ticketWithUserAndEventData";
import { Typography } from "@material-tailwind/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "react-query";
import { Dialog, Transition, Combobox } from '@headlessui/react'
import getAllEvents from "@/lib/backend/event/getAllEvents";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import createNewTicket from "@/lib/backend/ticket/createNewTicket";
import DatePickerModal from "@/components/DatePicker";
import { DateRangePicker, RangeKeyDict, Range } from 'react-date-range';

export default function TicketViewingPage() {
    const queryClient = useQueryClient();
    const { isLoading: ticketsAreLoading, error: ticketFetchError, data: tickets } = useQuery('frasertix-admin-tickets', async () => {
        const tickets = await getAllTickets();
        updateFilteredTickets(tickets);
        return tickets;
    });

    // Just the names and IDs to put in the modal
    const { isLoading: eventsAreLoading, error: eventFetchError, data: eventNames } = useQuery('frasertix-admin-tickets-events', async () => {
        const events = await getAllEvents();
        const mappedEvents = events
            .sort((a, b) => b.end_timestamp.getTime() - a.start_timestamp.getTime())
            .map(event => ({
                name: event.name,
                id: event.id
            }));
        return [
            ...mappedEvents,
            {
                name: "abc",
                id: "askjdjklads"
            },
            {
                name: "bcd",
                id: "asdadsasd"
            },
            {
                name: "sdf",
                id: "dfgdfgfdg"
            },
        ];
    });

    const [eventNameFilter, setEventNameFilter] = useState("");
    const [studentNameFilter, setStudentNameFilter] = useState("");
    const [studentNumberFilter, setStudentNumberFilter] = useState("");
    const [filteredTickets, setFilteredTickets] = useState<TicketWithUserAndEventData[] | null>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const modalStudentNumberRef = useRef<HTMLInputElement>(null);
    const [modalEventChosen, setModalEventChosen] = useState<any>((eventNames && eventNames.length !== 0) ? eventNames[0] : null);
    const [modalEventQuery, setModalEventQuery] = useState("");
    const [modalSubmitting, setModalSubmitting] = useState(false);

    const [datePickerSelection, setDatePickerSelection] = useState<Range>(
        {
            startDate: undefined,
            endDate: undefined,
            key: 'selection'
        }
    );

    const filteredEventNames =
        modalEventQuery === ""
            ? eventNames
            : eventNames?.filter((event) => {
                return event.name.toLocaleLowerCase().includes(modalEventQuery.toLocaleLowerCase())
            })

    // TODO: Replace this with logic that requests the server
    const updateFilteredTickets = (tickets: TicketWithUserAndEventData[] | undefined) => {
        setFilteredTickets(!tickets ? null : tickets.filter((ticket) => {
            const eventNameMatches = ticket.eventData.name.toLocaleLowerCase().indexOf(eventNameFilter.toLocaleLowerCase()) != -1;
            const studentNameMatches = ticket.ownerData.full_name.toLocaleLowerCase().indexOf(studentNameFilter.toLocaleLowerCase()) != -1;
            const studentNumberMatches = ticket.ownerData.student_number.indexOf(studentNumberFilter) != -1;

            const timestampMatchesStartDate = datePickerSelection.startDate ? 
            datePickerSelection.startDate.getTime() < ticket.timestamp.getTime() : true;
            const timestampMatchesEndDate = datePickerSelection.endDate ? 
            datePickerSelection.endDate.getTime() > ticket.timestamp.getTime() : true;
            let timestampMatches = timestampMatchesStartDate && timestampMatchesEndDate;

            return eventNameMatches && studentNameMatches && studentNumberMatches && timestampMatches;
        }))
    }

    // Only refresh the table once done typing
    useEffect(() => {
        const timeoutId = setTimeout(() => updateFilteredTickets(tickets), 250);
        return () => clearTimeout(timeoutId);
    }, [eventNameFilter, studentNameFilter, studentNumberFilter, datePickerSelection])

    const deleteTicketWithId = async (id: string) => {
        const deletionAllowed = confirm("Are you sure you want to delete this ticket?")
        if (!deletionAllowed) {
            return
        }

        try {
            await deleteTicket(id);
            alert("Ticket has been deleted.");
            queryClient.invalidateQueries({ queryKey: ['frasertix-admin-tickets'] })
        } catch (err) {
            alert("Something went wrong when deleting the ticket. Please try again.");
            throw err;
        }
    }

    const createNewTicketUI = async () => {
        setModalSubmitting(true)

        const studentNumber = Number(modalStudentNumberRef.current?.value);
        if (Number.isNaN(studentNumber) || studentNumber < 100000 || studentNumber > 9999999) {
            alert("Please provide a valid student number.")
        } else if (!modalEventChosen || modalEventQuery !== "") {
            // If the query isn't empty, this means they were searching for something but didn't select anything
            alert("Please provide a valid event and make sure it is selected.");
        } else {
            try {
                await createNewTicket(studentNumber.toString(), modalEventChosen.id)
                alert("Ticket has been created.")

                modalStudentNumberRef.current!.value = "";
                setModalOpen(false);
                queryClient.invalidateQueries({ queryKey: ['frasertix-admin-tickets'] });
            } catch (err: any) {
                if (err && err.response) {
                    if (err.response.status === 409) {
                        alert("The user already has a ticket. Please check this and try again.");
                    } else if (err.response.status === 400) {
                        alert("There are no accounts associated with the given student number. Please ask them to register and try again.");
                    }
                } else {
                    alert("Something went wrong. Please try again.");
                }
                console.error(err)
            }
        }

        setModalSubmitting(false);
    }

    return (
        <Layout name="Tickets" className="p-4 md:p-8 lg:px-12">
            <Transition.Root show={modalOpen} >
                <Dialog as="div" className="relative z-10" onClose={setModalOpen}>
                    <Transition.Child
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black bg-opacity-80 transition-opacity" />
                    </Transition.Child>

                    <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center sm:items-center sm:p-0">
                            <Transition.Child
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                                enterTo="opacity-100 translate-y-0 sm:scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            >
                                <Dialog.Panel className="relative transform rounded-lg bg-gray-400 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                                    <div className="bg-slate-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                                        <div className="sm:flex sm:items-start">
                                            <div className="flex flex-col items-center mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                                                <Dialog.Title as="h2" className="text-2xl font-semibold mb-2 text-black text-center">
                                                    Create New Ticket
                                                </Dialog.Title>

                                                <label htmlFor="studentNumber">
                                                    <span className='text-md text-gray-900 text-left'>Student Number</span>
                                                </label>

                                                <input
                                                    className={`mt-1 mb-3 rounded-lg py-2 px-3 w-60 sm:w-72 align-middle text-black outline-none focus:ring-2 focus:ring-blue-700 duration-200 bg-white shadow-lg focus:shadow-none`}
                                                    name="studentNumber"
                                                    id="studentNumber"
                                                    required
                                                    minLength={6}
                                                    maxLength={7}
                                                    ref={modalStudentNumberRef}
                                                />

                                                <span className='text-md text-gray-900'>Event</span>

                                                <Combobox value={modalEventChosen} onChange={setModalEventChosen}>
                                                    <div className="relative mt-1">
                                                        <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left shadow-md border-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm">
                                                            <Combobox.Input
                                                                className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0 focus:outline-none"
                                                                displayValue={(event: any) => event && event.name}
                                                                onChange={(event) => setModalEventQuery(event.target.value)}
                                                            />
                                                            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                                                                <ChevronUpDownIcon
                                                                    className="h-5 w-5 text-gray-400"
                                                                    aria-hidden="true"
                                                                />
                                                            </Combobox.Button>
                                                        </div>
                                                        <Transition
                                                            leave="transition ease-in duration-100"
                                                            leaveFrom="opacity-100"
                                                            leaveTo="opacity-0"
                                                            afterLeave={() => setModalEventQuery('')}
                                                        >
                                                            <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg  border-none focus:outline-none sm:text-sm">
                                                                {filteredEventNames && filteredEventNames?.length === 0 && modalEventQuery !== '' ? (
                                                                    <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                                                                        Nothing found.
                                                                    </div>
                                                                ) : (
                                                                    filteredEventNames?.map((event) => (
                                                                        <Combobox.Option
                                                                            key={event.id}
                                                                            className={({ active }) =>
                                                                                `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-blue-600 text-white' : 'text-gray-900'
                                                                                }`
                                                                            }
                                                                            value={event}
                                                                        >
                                                                            {({ selected, active }) => (
                                                                                <>
                                                                                    <span
                                                                                        className={`block truncate ${selected ? 'font-medium' : 'font-normal'
                                                                                            }`}
                                                                                    >
                                                                                        {event.name}
                                                                                    </span>
                                                                                    {selected ? (
                                                                                        <span
                                                                                            className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-white' : 'text-blue-600'
                                                                                                }`}
                                                                                        >
                                                                                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                                                                        </span>
                                                                                    ) : null}
                                                                                </>
                                                                            )}
                                                                        </Combobox.Option>
                                                                    ))
                                                                )}
                                                            </Combobox.Options>
                                                        </Transition>
                                                    </div>
                                                </Combobox>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-slate-800 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                        <button
                                            type="button"
                                            className="inline-flex w-full justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold shadow-md text-white hover:bg-green-500 sm:ml-3 sm:w-auto duration-75"
                                            disabled={modalSubmitting}
                                            onClick={createNewTicketUI}
                                        >
                                            Create
                                        </button>
                                        <button
                                            type="button"
                                            className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-md ring-1 ring-inset ring-gray-300 hover:bg-gray-200 duration-75 sm:mt-0 sm:w-auto"
                                            onClick={() => setModalOpen(false)}
                                            disabled={modalSubmitting}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition.Root>

            <div className="flex flex-col items-center">
                <Typography variant="h1" className="text-center mb-2">Tickets</Typography>
                <button
                    className="mb-4 px-4 py-2 bg-blue-500 hover:bg-blue-700 duration-75 text-md font-semibold rounded-lg text-white"
                    onClick={() => setModalOpen(true)}
                >
                    Create Ticket
                </button>
            </div>

            {ticketsAreLoading && (
                <Typography variant="paragraph" className="text-center lg:w-3/4">Loading...</Typography>
            )}
            {tickets && (
                <div className='overflow-x-auto max-w-full'>
                    <table className="table table-fixed border-collapse mb-6 w-full">
                        <thead>
                            <tr className="bg-transparent">
                                <th>
                                    <DatePickerModal
                                        state={datePickerSelection}
                                        setState={setDatePickerSelection}
                                    />
                                </th>
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
                                <th className='px-4 border border-gray-500'>Last Scan Time</th>
                                <th className='px-4 border border-gray-500'>Actions</th>
                            </tr>
                        </thead>

                        <tbody className='text-gray-800 text-center text-md'>
                            {filteredTickets && filteredTickets.map(ticket => {
                                const timestampStr = ticket.timestamp.toLocaleString("en-US", {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',

                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                });

                                const lastScanTimestampStr = ticket.scanCount === 0
                                    ? "N/A"
                                    : ticket.lastScanTime.toLocaleString("en-US", {
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
                                        <td className='border border-gray-500 px-4 py-1'>{ticket.scanCount.toString()}</td>
                                        <td className='border border-gray-500 px-4 py-1'>{lastScanTimestampStr}</td>
                                        <td className='border border-gray-500 px-4 py-2'>
                                            <div className="flex flex-row flex-wrap gap-2 items-center justify-center">
                                                <Link
                                                    href={`/tickets/${ticket.id}`}
                                                    className="px-4 py-2 bg-blue-500 hover:bg-blue-700 duration-75 font-semibold text-sm text-white rounded-lg"
                                                    rel="noopener noreferrer" target="_blank"
                                                >
                                                    View
                                                </Link>

                                                <button
                                                    className="px-4 py-2 bg-red-500 hover:bg-red-700 duration-75 font-semibold text-sm text-white rounded-lg"
                                                    onClick={() => deleteTicketWithId(ticket.id)}
                                                >
                                                    Delete
                                                </button>
                                            </div>
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