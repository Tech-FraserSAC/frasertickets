import { useRef, useState } from "react";

import Link from "next/link";

import { Combobox, Dialog, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { Typography } from "@material-tailwind/react";
import { ColDef } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useMutation, useQuery, useQueryClient } from "react-query";

import { getAllEvents } from "@/lib/backend/event";
import { createNewQueuedTicket, deleteQueuedTicket, getAllQueuedTickets } from "@/lib/backend/queuedticket";
import { studentOrTeacherNumberRegex } from "@/util/regexps";

import { useFirebaseAuth } from "@/components/FirebaseAuthContext";
import Layout from "@/components/Layout";

// Core grid CSS, always needed
import "ag-grid-community/styles/ag-grid.css";
// Optional theme CSS
import "ag-grid-community/styles/ag-theme-alpine.css";

const EventCellRenderer = (props: any) => {
    return (
        <div className="w-full h-full flex items-center">
            <Link
                href={`/events/${props.data.eventId}`}
                className="text-blue-500 hover:text-blue-700 duration-75 hover:underline"
            >
                {props.data.eventData.name}
            </Link>
        </div>
    );
};

export default function TicketViewingPage() {
    const queryClient = useQueryClient();

    const { user } = useFirebaseAuth();

    const {
        data: tickets,
        refetch: refetchTickets,
    } = useQuery("frasertix-admin-queued-tickets", getAllQueuedTickets);

    // Just the names and IDs to put in the modal
    const {
        data: eventNames,
    } = useQuery("frasertix-admin-tickets-events", async () => {
        const events = await getAllEvents();
        const mappedEvents = events
            .sort((a, b) => b.end_timestamp.getTime() - a.start_timestamp.getTime())
            .map((event) => ({
                name: event.name,
                id: event.id,
            }));
        return mappedEvents;
    });

    const createTicketMutation = useMutation(
        ({ studentNumber, eventId, maxScanCount }: { studentNumber: string; eventId: string; maxScanCount: number }) =>
            createNewQueuedTicket(studentNumber, eventId, maxScanCount),
        {
            onSettled: () => {
                return refetchTickets();
            },
        },
    );

    const deleteQueuedTicketMutation = useMutation(
        ({ queuedTicketId }: { queuedTicketId: string }) => deleteQueuedTicket(queuedTicketId),
        {
            onSuccess: () => {
                return refetchTickets();
            },
        },
    );

    const [modalOpen, setModalOpen] = useState(false);
    const modalStudentNumberRef = useRef<HTMLInputElement>(null);
    const modalMaxScanCountRef = useRef<HTMLInputElement>(null);
    const [modalEventChosen, setModalEventChosen] = useState<any>(
        eventNames && eventNames.length !== 0 ? eventNames[0] : null,
    );
    const [modalEventQuery, setModalEventQuery] = useState("");
    const [modalSubmitting, setModalSubmitting] = useState(false);

    const filteredEventNames =
        modalEventQuery === ""
            ? eventNames
            : eventNames?.filter((event) => {
                  return event.name.toLocaleLowerCase().includes(modalEventQuery.toLocaleLowerCase());
              });

    const createNewTicketUI = async () => {
        setModalSubmitting(true);

        const studentNumber = modalStudentNumberRef.current?.value ?? "";
        const maxScanCount = Number(modalMaxScanCountRef.current?.value ?? 0);

        if (!studentOrTeacherNumberRegex.test(studentNumber)) {
            alert(
                "Please provide a valid student / teacher number. If you're typing in a teacher number, make sure to include the p00.",
            );
        } else if (Number.isNaN(maxScanCount) || maxScanCount < 0 || Math.floor(maxScanCount) !== maxScanCount) {
            alert(
                "Please provide a whole number max scan count above or equal to 0, or keep it blank for infinite entires.",
            );
        } else if (modalEventChosen === null || modalEventQuery !== "") {
            // If the query isn't empty, this means they were searching for something but didn't select anything
            alert("Please provide a valid event and make sure it is selected.");
        } else {
            try {
                await createTicketMutation.mutateAsync({
                    studentNumber: studentNumber.toString(),
                    eventId: modalEventChosen.id,
                    maxScanCount: maxScanCount,
                });
                alert("Queued ticket has been created.");

                modalStudentNumberRef.current!.value = "";
                setModalOpen(false);
                await queryClient.invalidateQueries("frasertix-admin-queued-tickets");
            } catch (err: any) {
                if (err && err.response) {
                    if (err.response.status === 409) {
                        alert("The (possible) user already has a ticket. Please check this and try again.");
                    } else if (err.response.status === 400) {
                        alert(
                            "There is already an account registered to this student number. Please switch to the Tickets page and make their ticket there.",
                        );
                    } else if (err.response.status === 403 && studentNumber === user?.email?.replace("@pdsb.net", "")) {
                        // While 403 can be returned for a user who isn't allowed to post,
                        // it would have likely been caused if the student number is the same as the one of the
                        // given student. We don't check this beforehand because it's a lot easier / faster to find
                        // the user's student number on the backend than it is on the frontend.
                        alert("You are not allowed to make a ticket for yourself.");
                    } else {
                        alert("Something went wrong. Please try again.");
                    }
                } else {
                    alert("Something went wrong. Please try again.");
                }
                console.error(err);
            }
        }

        setModalSubmitting(false);
    };

    const deleteQueuedTicketWithId = async (id: string) => {
        const deletionAllowed = confirm("Are you sure you want to delete this queued ticket?");
        if (!deletionAllowed) {
            return;
        }

        try {
            await deleteQueuedTicketMutation.mutateAsync({
                queuedTicketId: id,
            });
            alert("Queued ticket has been deleted.");
        } catch (err) {
            alert("Something went wrong when deleting the ticket. Please try again.");
            throw err;
        }
    };

    const DeleteButtonCellRenderer = (props: any) => (
        <div className="flex flex-row flex-wrap items-center justify-center w-full h-full">
            <button
                className="px-4 py-2 bg-red-500 hover:bg-red-700 duration-75 font-semibold text-xs text-white rounded-lg"
                onClick={() => deleteQueuedTicketWithId(props.data.id)}
            >
                Delete
            </button>
        </div>
    );

    const colsDefs: ColDef[] = [
        {
            field: "timestamp",
            headerName: "Created Time",
            valueFormatter: (params: any) =>
                params.data.timestamp.toLocaleString("en-US", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",

                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                }),
            sort: "desc",
        },
        {
            field: "eventData.name",
            headerName: "Event",
            cellRenderer: EventCellRenderer,
        },
        {
            field: "studentNumber",
            headerName: "Student #",
            comparator: (a, b, nodeA, nodeB, isDesc) => {
                const numA = Number(a.replace(/\D/g, ""));
                const numB = Number(b.replace(/\D/g, ""));
                if (Number.isNaN(numA) || Number.isNaN(numB)) {
                    return 0;
                }

                return numA - numB;
            },
        },
        {
            field: "maxScanCount",
            headerName: "Max Scan Count",
            valueFormatter: (params: any) => (params.data.maxScanCount === 0 ? "∞" : params.data.maxScanCount),
            comparator: (a, b, nodeA, nodeB, isDesc) => {
                return (a === 0 ? Infinity : a) - (b === 0 ? Infinity : b);
            },
            editable: false,
            valueGetter: (params) => params.data.maxScanCount,
        },
        {
            colId: "deleteAction",
            headerName: "Delete",
            sortable: false,
            filter: false,
            cellRenderer: DeleteButtonCellRenderer,
            flex: 0,
            width: 100,
        },
    ];

    const defaultColDef: ColDef = {
        sortable: true,
        filter: true,
        flex: 1,
        rowDrag: false,
        lockVisible: true,
        resizable: true,
    };

    return (
        <Layout
            name="Queued Tickets"
            className="p-4 md:p-8 lg:px-12"
            adminProtected
        >
            <Transition.Root show={modalOpen}>
                <Dialog
                    as="div"
                    className="relative z-10"
                    onClose={setModalOpen}
                >
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
                                                <Dialog.Title
                                                    as="h2"
                                                    className="text-2xl font-semibold mb-2 text-black text-center"
                                                >
                                                    Create New Ticket
                                                </Dialog.Title>

                                                <label htmlFor="studentNumber">
                                                    <span className="text-md text-gray-900 text-left">
                                                        Student Number
                                                    </span>
                                                </label>

                                                <input
                                                    className={`mt-1 mb-3 rounded-lg py-2 px-3 w-60 sm:w-72 align-middle text-black outline-none focus:ring-2 focus:ring-blue-700 duration-200 bg-white shadow-lg focus:shadow-none`}
                                                    name="studentNumber"
                                                    id="studentNumber"
                                                    required
                                                    minLength={6}
                                                    maxLength={8}
                                                    ref={modalStudentNumberRef}
                                                />

                                                <span className="text-md text-gray-900">Event</span>

                                                <Combobox
                                                    value={modalEventChosen}
                                                    onChange={setModalEventChosen}
                                                >
                                                    <div className="relative mt-1">
                                                        <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left shadow-md border-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm">
                                                            <Combobox.Input
                                                                className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0 focus:outline-none"
                                                                displayValue={(event: any) => event && event.name}
                                                                onChange={(event) =>
                                                                    setModalEventQuery(event.target.value)
                                                                }
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
                                                            afterLeave={() => setModalEventQuery("")}
                                                        >
                                                            <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg  border-none focus:outline-none sm:text-sm">
                                                                {filteredEventNames &&
                                                                filteredEventNames?.length === 0 &&
                                                                modalEventQuery !== "" ? (
                                                                    <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                                                                        Nothing found.
                                                                    </div>
                                                                ) : (
                                                                    filteredEventNames?.map((event) => (
                                                                        <Combobox.Option
                                                                            key={event.id}
                                                                            className={({ active }) =>
                                                                                `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                                                                    active
                                                                                        ? "bg-blue-600 text-white"
                                                                                        : "text-gray-900"
                                                                                }`
                                                                            }
                                                                            value={event}
                                                                        >
                                                                            {({ selected, active }) => (
                                                                                <>
                                                                                    <span
                                                                                        className={`block truncate ${
                                                                                            selected
                                                                                                ? "font-medium"
                                                                                                : "font-normal"
                                                                                        }`}
                                                                                    >
                                                                                        {event.name}
                                                                                    </span>
                                                                                    {selected ? (
                                                                                        <span
                                                                                            className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                                                                                active
                                                                                                    ? "text-white"
                                                                                                    : "text-blue-600"
                                                                                            }`}
                                                                                        >
                                                                                            <CheckIcon
                                                                                                className="h-5 w-5"
                                                                                                aria-hidden="true"
                                                                                            />
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

                                                <span className="mt-3 text-md text-gray-900 text-left">
                                                    Max Scan Count (blank or 0 &#8594; infinite)
                                                </span>

                                                <input
                                                    className={`mt-1 mb-3 rounded-lg py-2 px-3 w-32 align-middle text-black outline-none focus:ring-2 focus:ring-blue-700 duration-200 bg-white shadow-lg focus:shadow-none`}
                                                    name="maxScanCount"
                                                    id="maxScanCount"
                                                    type="number"
                                                    required
                                                    min={0}
                                                    ref={modalMaxScanCountRef}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-slate-800 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                        <button
                                            type="button"
                                            className="inline-flex w-full justify-center rounded-md bg-green-600 disabled:bg-green-700 px-3 py-2 text-sm font-semibold shadow-md text-white hover:bg-green-500 sm:ml-3 sm:w-auto duration-75"
                                            disabled={modalSubmitting}
                                            onClick={createNewTicketUI}
                                        >
                                            {modalSubmitting ? "Submitting..." : "Create"}
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
                <Typography
                    variant="h1"
                    className="text-center mb-2"
                >
                    Queued Tickets
                </Typography>
                <button
                    className="mb-4 px-4 py-2 bg-blue-500 hover:bg-blue-700 duration-75 text-md font-semibold rounded-lg text-white"
                    onClick={() => setModalOpen(true)}
                >
                    Create Queued Ticket
                </button>
            </div>

            <div className="overflow-x-auto w-full">
                <div
                    className="ag-theme-alpine"
                    style={{ minWidth: "1000px", height: "64vh" }}
                >
                    <AgGridReact
                        rowData={tickets}
                        columnDefs={colsDefs}
                        defaultColDef={defaultColDef}
                        animateRows={true}
                        gridOptions={{
                            suppressScrollOnNewData: true,
                            getRowId: (params) => params.data.id,
                        }}
                    />
                </div>
            </div>
        </Layout>
    );
}
