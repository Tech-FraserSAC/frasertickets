import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/router";

import { Option, Select, Typography } from "@material-tailwind/react";
import { ColDef } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useMutation, useQuery } from "react-query";

import { getAllEvents } from "@/lib/backend/event";
import { deleteTicket, getAllTickets, updateTicket } from "@/lib/backend/ticket";
import { cleanDisplayNameWithStudentNumber } from "@/util/cleanDisplayName";

import Layout from "@/components/Layout";
import TicketCreationModal from "@/components/admin/TicketCreationModal";

// Core grid CSS, always needed
import "ag-grid-community/styles/ag-grid.css";
// Optional theme CSS
import "ag-grid-community/styles/ag-theme-alpine.css";

const EventCellRenderer = (props: any) => {
    return (
        <div className="w-full h-full flex items-center">
            <Link
                href={`/admin/tickets/event/${props.data.eventId}`}
                className="text-blue-500 hover:text-blue-700 duration-75 hover:underline"
            >
                {props.data.eventData.name}
            </Link>
        </div>
    );
};

const ViewButtonCellRenderer = (props: any) => {
    return (
        <div className="flex flex-row flex-wrap items-center justify-center w-full h-full">
            <Link
                href={`/tickets/${props.data.id}`}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-700 duration-75 font-semibold text-xs text-white rounded-lg"
                rel="noopener noreferrer"
                target="_blank"
            >
                View
            </Link>
        </div>
    );
};

export default function TicketViewingPage() {
    const router = useRouter();
    const [modalOpen, setModalOpen] = useState(false);
    const { data: tickets, refetch: refetchTickets } = useQuery("frasertix-admin-tickets", () => getAllTickets(), {
        refetchOnWindowFocus: !modalOpen, // Don't refetch when modal open to prevent selected event from flashing
    });
    const { data: events } = useQuery("frasertix-admin-tickets-events", getAllEvents, {
        refetchOnWindowFocus: !modalOpen,
    });

    const updateMaxScanCountTicketMutation = useMutation(
        ({
            ticketId,
            newMaxScanCountRaw,
            oldScanCount,
        }: {
            ticketId: string;
            newMaxScanCountRaw: string;
            oldScanCount: number;
        }) => {
            let num = Number(newMaxScanCountRaw);
            if (Number.isNaN(num) || !Number.isInteger(num) || !Number.isFinite(num) || num < 0) {
                alert("Please provide a number larger than 0, or 0 for infinite scans.");
                throw "New max scan count is invalid";
            }

            if (oldScanCount > num && num !== 0) {
                alert("Please provide a max scan count larger than or equal to the current scan count value.");
                throw "Max scan count smaller than current scan count value";
            }

            if (num === 0) {
                // Need to pass -1 to backend since no value gets parsed as 0 in backend
                num = -1;
            }
            return updateTicket(ticketId, {
                maxScanCount: num,
            });
        },
        {
            onSuccess: () => {
                return refetchTickets();
            },
        },
    );

    const deleteTicketMutation = useMutation(({ ticketId }: { ticketId: string }) => deleteTicket(ticketId), {
        onSuccess: () => {
            return refetchTickets();
        },
    });

    const deleteTicketWithId = async (id: string) => {
        const deletionAllowed = confirm("Are you sure you want to delete this ticket?");
        if (!deletionAllowed) {
            return;
        }

        try {
            await deleteTicketMutation.mutateAsync({ ticketId: id });
            alert("Ticket has been deleted.");
        } catch (err) {
            alert("Something went wrong when deleting the ticket. Please try again.");
            throw err;
        }
    };

    const DeleteButtonCellRenderer = (props: any) => (
        <div className="flex flex-row flex-wrap items-center justify-center w-full h-full">
            <button
                className="px-4 py-2 bg-red-500 hover:bg-red-700 duration-75 font-semibold text-xs text-white rounded-lg"
                onClick={() => deleteTicketWithId(props.data.id)}
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
            field: "ownerData.full_name",
            headerName: "Student Name",
            valueFormatter: (params: any) =>
                cleanDisplayNameWithStudentNumber(
                    params.data.ownerData.full_name,
                    params.data.ownerData.student_number,
                ),
        },
        {
            field: "ownerData.student_number",
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
            field: "scanCount",
            headerName: "Scans",
        },
        {
            field: "lastScanTime",
            headerName: "Last Scan Time",
            valueFormatter: (params: any) =>
                params.data.scanCount === 0
                    ? "N/A"
                    : params.data.lastScanTime.toLocaleString("en-US", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",

                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                      }),
        },
        {
            field: "maxScanCount",
            headerName: "Max Scan Count",
            valueFormatter: (params: any) => (params.data.maxScanCount === 0 ? "∞" : params.data.maxScanCount),
            comparator: (a, b, nodeA, nodeB, isDesc) => {
                return (a === 0 ? Infinity : a) - (b === 0 ? Infinity : b);
            },
            editable: true,
            valueGetter: (params) => params.data.maxScanCount,
            valueSetter: (params) => {
                try {
                    updateMaxScanCountTicketMutation.mutate({
                        ticketId: params.data.id,
                        newMaxScanCountRaw: params.newValue,
                        oldScanCount: Number(params.data.scanCount),
                    });
                    return true;
                } catch (e) {
                    console.error(e);
                    return false;
                }
            },
        },
        {
            colId: "viewAction",
            headerName: "View",
            sortable: false,
            filter: false,
            cellRenderer: ViewButtonCellRenderer,
            flex: 0,
            width: 100,
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

    const eventDropdownOnChange = (value?: string) => router.push(`/admin/tickets/event/${value}`);

    return (
        <Layout
            name="Tickets"
            className="p-4 md:p-8 lg:px-12"
            adminProtected
        >
            <TicketCreationModal
                onCreate={() => refetchTickets()}
                open={modalOpen}
                setOpen={setModalOpen}
            />

            <div className="flex flex-col items-center gap-2 mb-4">
                <Typography
                    variant="h1"
                    className="text-center"
                >
                    Tickets
                </Typography>

                {events ? (
                    <div className="w-72">
                        <Select
                            label="Filter for event"
                            onChange={eventDropdownOnChange}
                        >
                            {events?.map((event) => (
                                <Option
                                    value={event.id}
                                    key={event.id}
                                >
                                    {event.name}
                                </Option>
                            ))}
                        </Select>
                    </div>
                ) : (
                    <></>
                )}

                <button
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-700 duration-75 text-md font-semibold rounded-lg text-white"
                    onClick={() => setModalOpen(true)}
                >
                    Create Ticket
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
