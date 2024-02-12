import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/router";

import { Typography } from "@material-tailwind/react";
import { useQuery } from "react-query";

import { scanTicket } from "@/lib/backend/ticket/scan";
import getCustomFieldsFromTicket from "@/util/getCustomFieldsFromTicket";

import Layout from "@/components/Layout";
import TicketScanInfoTable from "@/components/admin/TicketScanInfoTable";
import { ForbiddenComponent } from "@/pages/403";

enum ScanStatus {
    SUCCESS,
    MAX_SCAN_COUNT_REACHED,
    DOES_NOT_EXIST,
    INVALID_FORMAT,
    LOADING,
    FORBIDDEN,
}

export default function TicketScanningPage() {
    const router = useRouter();
    const [scanStatus, setScanStatus] = useState<ScanStatus>(ScanStatus.LOADING);

    const { data: scanData } = useQuery("frasertix-scan-ticket", () => scanTicket(router.query.id as string), {
        enabled: router.isReady,
        retry: (failureCount, error: any | undefined) => {
            if (error?.response?.status === 400) {
                setScanStatus(ScanStatus.INVALID_FORMAT);
                return false;
            } else if (error?.response?.status === 404) {
                setScanStatus(ScanStatus.DOES_NOT_EXIST);
                return false;
            } else if (error?.response?.status === 403 || error?.response?.status === 401) {
                setScanStatus(ScanStatus.FORBIDDEN);
                return false;
            }

            return failureCount < 3;
        },
        onSuccess: (data) => {
            console.log(data);
            if (!data.processed && data.noProcessReason === "max scan count exceeded") {
                setScanStatus(ScanStatus.MAX_SCAN_COUNT_REACHED);
            } else if (data.processed) {
                setScanStatus(ScanStatus.SUCCESS);
            } else {
                alert("Something seems to have gone wrong. Try refreshing your page.");
            }
        },
        // Scanning the ticket changes stuff in the database that we don't want happening multiple times
        // because the window got refreshed.
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
    });

    const innerComponent = (() => {
        switch (scanStatus) {
            case ScanStatus.INVALID_FORMAT: {
                return (
                    <div className="flex flex-col items-center">
                        <Typography
                            variant="h2"
                            className="text-center text-red-500"
                        >
                            Invalid QR Code
                        </Typography>
                        <Typography
                            variant="lead"
                            className="text-center lg:w-1/2 mb-4"
                        >
                            This QR code doesn&apos;t match our internal format. Try scanning the QR code again.
                        </Typography>

                        <div className="flex flex-wrap gap-2 mt-2">
                            <button
                                className="py-2 px-4 bg-blue-500 text-md font-semibold rounded-lg hover:bg-blue-800 duration-75 text-white"
                                onClick={router.reload}
                            >
                                Reload
                            </button>
                            <Link
                                className="py-2 px-4 bg-teal-500 text-md font-semibold rounded-lg hover:bg-teal-800 duration-75 text-white"
                                href="/admin/scan"
                            >
                                Scan New Ticket
                            </Link>
                        </div>
                    </div>
                );
            }
            case ScanStatus.DOES_NOT_EXIST: {
                return (
                    <div className="flex flex-col items-center">
                        <Typography
                            variant="h2"
                            className="text-center text-red-500"
                        >
                            Ticket Not Found
                        </Typography>
                        <Typography
                            variant="lead"
                            className="text-center lg:w-1/2"
                        >
                            The ticket with the given QR code could not be found in our systems. Try scanning the QR
                            code again.
                        </Typography>

                        <div className="flex flex-wrap gap-2 mt-2">
                            <button
                                className="py-2 px-4 bg-blue-500 text-md font-semibold rounded-lg hover:bg-blue-800 duration-75 text-white"
                                onClick={router.reload}
                            >
                                Reload
                            </button>
                            <Link
                                className="py-2 px-4 bg-teal-500 text-md font-semibold rounded-lg hover:bg-teal-800 duration-75 text-white"
                                href="/admin/scan"
                            >
                                Scan New Ticket
                            </Link>
                        </div>
                    </div>
                );
            }
            case ScanStatus.MAX_SCAN_COUNT_REACHED: {
                return (
                    <div className="flex flex-col items-center">
                        <Typography
                            variant="h2"
                            className="text-center text-orange-700"
                        >
                            Valid Ticket, Max Scans Exceeded
                        </Typography>
                        <Typography
                            variant="p"
                            className="text-center text-gray-700 mb-2 lg:w-3/4"
                        >
                            Ticket scan has not been recorded since it has already reached the maximum scans allowed.
                        </Typography>

                        <TicketScanInfoTable scanData={scanData!} />

                        <div className="flex flex-wrap gap-2 mt-2">
                            <Link
                                className="py-2 px-4 bg-teal-500 text-md font-semibold rounded-lg hover:bg-teal-800 duration-75 text-white"
                                href="/admin/scan"
                            >
                                Scan New Ticket
                            </Link>
                            <button
                                className="py-2 px-4 bg-blue-500 text-md font-semibold rounded-lg hover:bg-blue-800 duration-75 text-white"
                                onClick={router.reload}
                            >
                                Reload
                            </button>
                        </div>
                    </div>
                );
            }
            case ScanStatus.SUCCESS: {
                // Get all custom fields from the ticket
                const customProperties = getCustomFieldsFromTicket(
                    scanData!.ticketData.customFields,
                    scanData!.ticketData.eventData.custom_fields_schema,
                );

                return (
                    <div className="flex flex-col items-center">
                        <Typography
                            variant="h2"
                            className="text-center text-green-500"
                        >
                            Valid Ticket
                        </Typography>

                        <TicketScanInfoTable scanData={scanData!} />

                        <div className="flex flex-wrap gap-2 mt-2">
                            <Link
                                className="py-2 px-4 bg-teal-500 text-md font-semibold rounded-lg hover:bg-teal-800 duration-75 text-white"
                                href="/admin/scan"
                            >
                                Scan New Ticket
                            </Link>
                            <button
                                className="py-2 px-4 bg-blue-500 text-md font-semibold rounded-lg hover:bg-blue-800 duration-75 text-white"
                                onClick={router.reload}
                            >
                                Re-scan Ticket
                            </button>
                        </div>
                    </div>
                );
            }
            case ScanStatus.LOADING: {
                return (
                    <div className="flex flex-col items-center">
                        <Typography
                            variant="h2"
                            className="text-center text-gray-800"
                        >
                            Processing Ticket...
                        </Typography>
                    </div>
                );
            }
            case ScanStatus.FORBIDDEN: {
                return <ForbiddenComponent />;
            }
        }
    })();

    return (
        <Layout
            name="Ticket Scan"
            className="p-4 md:p-8 lg:px-12"
            adminProtected
        >
            <Typography
                variant="h1"
                className="text-center mb-4"
            >
                Ticket Scanner
            </Typography>

            {innerComponent}
        </Layout>
    );
}
