import { useState } from "react";

import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

import { Typography } from "@material-tailwind/react";
import { ColDef } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { AiOutlineArrowLeft } from "react-icons/ai";
import { useMutation, useQuery } from "react-query";
import { ValidationError, object as yupObject } from "yup";

import { getEvent } from "@/lib/backend/event";
import { deleteTicket, getAllTickets, updateTicket } from "@/lib/backend/ticket";
import { cleanDisplayNameWithStudentNumber } from "@/util/cleanDisplayName";
import { buildValidatorForCustomEventData } from "@/util/eventCustomDataValidator";
import toTitleCase from "@/util/toTitleCase";

import Layout from "@/components/Layout";
import TicketCreationModal from "@/components/admin/TicketCreationModal";
import { ForbiddenComponent } from "@/pages/403";
import { NotFoundComponent } from "@/pages/404";
import { ServerErrorComponent } from "@/pages/500";

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
    const eventId = router.isReady ? (router.query.id as string) : "";

    const [modalOpen, setModalOpen] = useState(false);
    const [statusCode, setStatusCode] = useState(200);

    const {
        data: event,
        isLoading: eventIsLoading,
        isError: eventError,
        isSuccess: eventLoadSuccessful,
    } = useQuery("frasertix-admin-tickets-event", () => getEvent(eventId), {
        enabled: router.isReady,
        retry: (failureCount, error: any | undefined) => {
            if (statusCode != error?.response?.status) {
                setStatusCode(error?.response?.status);
            }
            if (error?.response?.status === 400 || error?.response?.status === 404) {
                return false;
            }

            if (error?.response?.status === 403) {
                return false;
            }

            if (error?.response?.status === 500) {
                return false;
            }

            return failureCount < 1;
        },
        refetchInterval: (data, query) => (query.state.error ? 0 : 60 * 1000),
    });
    const eventName = eventIsLoading ? "Event" : event?.name;

    const { data: tickets, refetch: refetchTickets } = useQuery(
        "frasertix-admin-tickets",
        () => getAllTickets(eventId),
        {
            enabled: router.isReady,
        },
    );

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

    const updateCustomFieldMutation = useMutation(
        ({ ticketId, fieldKey, newFieldValue }: { ticketId: string; fieldKey: string; newFieldValue: any }) => {
            // Get the actual schema property
            const property = event!.custom_fields_schema.properties[fieldKey];

            // Create yup validator from schema
            const schemaValidator = buildValidatorForCustomEventData(event!);
            const fieldValidator = yupObject().shape({
                [fieldKey]: schemaValidator.fields[fieldKey],
            });

            // Run validator on given key/value pair
            try {
                fieldValidator.validateSync({ [fieldKey]: newFieldValue });
            } catch (error) {
                if (error instanceof ValidationError) {
                    if (error.type === "typeError") {
                        alert(`Please provide a value of type '${property.type}'.`);
                        throw error.message;
                    } else {
                        alert(`This error occured while updating '${property.displayName}': ${error.message}`);
                        throw error;
                    }
                } else {
                    alert("Sorry, something went wrong while trying to update the given attribute.");
                    throw error;
                }
            }

            // Send update to backend
            return updateTicket(ticketId, {
                customFields: {
                    [fieldKey]: newFieldValue,
                },
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

    const initialColDefs: ColDef[] = [
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
    ];

    const buttonColDefs: ColDef[] = [
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

    const customFieldsColDefs: ColDef[] = !eventLoadSuccessful
        ? []
        : Object.keys(event!.custom_fields_schema.properties).map((propertyId) => {
              const property = event!.custom_fields_schema.properties[propertyId];

              return {
                  colId: propertyId,
                  headerName: toTitleCase(property.displayName),
                  sortable: true,
                  filter: true,
                  editable: property.editable,
                  valueGetter: (params) => params.data.customFields[propertyId],
                  valueSetter: (params) => {
                      try {
                          updateCustomFieldMutation.mutate({
                              ticketId: params.data.id,
                              fieldKey: propertyId,
                              newFieldValue: params.newValue,
                          });
                          return true;
                      } catch (e) {
                          console.error(e);
                          return false;
                      }
                  },
              };
          });

    const colDefs = [...initialColDefs, ...customFieldsColDefs, ...buttonColDefs];

    const defaultColDef: ColDef = {
        sortable: true,
        filter: true,
        flex: 1,
        rowDrag: false,
        lockVisible: true,
        resizable: true,
    };

    if (eventError) {
        console.error(eventError);

        // 400 means its not an actual code, which is basically equivalent to not found
        if (statusCode === 400 || statusCode === 404) {
            return (
                <Layout
                    name="404 Not Found"
                    adminProtected={true}
                    className="flex flex-col justify-center items-center"
                >
                    <NotFoundComponent home="/admin/tickets" />
                </Layout>
            );
        } else if (statusCode === 403) {
            return (
                <Layout
                    name="403 Forbidden"
                    adminProtected={true}
                    className="flex flex-col justify-center items-center"
                >
                    <ForbiddenComponent home="/" />
                </Layout>
            );
        } else {
            return (
                <Layout
                    name="500 Server Error"
                    adminProtected={true}
                    className="flex flex-col justify-center items-center"
                >
                    <ServerErrorComponent home="/admin/tickets" />
                </Layout>
            );
        }
    }

    return (
        <Layout
            name="Tickets for Event"
            className="p-4 md:p-8 lg:px-12"
            adminProtected
        >
            {/* Override title without causing refresh of entire page from changing prop */}
            <Head>
                <title>{`Tickets for ${eventName}`}</title>
            </Head>

            <TicketCreationModal
                onCreate={() => refetchTickets()}
                open={modalOpen}
                setOpen={setModalOpen}
                event={event}
            />

            <div className="flex flex-col items-center justify-center">
                <Link
                    href="/admin/tickets"
                    className="flex items-center gap-1 text-blue-500 hover:text-blue-600 text-lg font-medium"
                >
                    <AiOutlineArrowLeft />
                    <span>Back to all tickets</span>
                </Link>

                <Typography
                    variant="h1"
                    className="text-center mb-2"
                >
                    Tickets for {eventName}
                </Typography>

                <button
                    className="mb-4 px-4 py-2 bg-blue-500 hover:bg-blue-700 duration-75 text-md font-semibold rounded-lg text-white"
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
                        columnDefs={colDefs}
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
