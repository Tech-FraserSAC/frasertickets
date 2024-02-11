import { Typography } from "@material-tailwind/react";
import { useRouter } from "next/router";
import { useState } from "react";
import QRCode from "react-qr-code";
import { useQuery } from "react-query";

import getTicket from "@/lib/backend/ticket/getTicket";

import Layout from "@/components/Layout";

import { ForbiddenComponent } from "../403";
import { NotFoundComponent } from "../404";
import { ServerErrorComponent } from "../500";

const studentNameRegex = /[a-zA-Z]{2} - [0-9]{2}[a-zA-Z]{2} (\d{6,7})/gm;

export default function TicketSpecificPage() {
    const router = useRouter();
    const { id } = router.query;
    const [statusCode, setStatusCode] = useState(200);

    const {
        isLoading: rqLoading,
        error,
        data,
    } = useQuery("frasertix-ticket", () => getTicket(id as string), {
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

            return failureCount < 3;
        },
        refetchInterval: (data, query) => (query.state.error ? 0 : 60 * 1000),
    });

    const isLoading = !router.isReady || rqLoading;
    const pageName = !isLoading ? (data?.eventData.name as string) : "Ticket";
    const studentNumber = data?.ownerData.student_number;
    const scanCount = data?.scanCount;
    const maxScanCount = data?.maxScanCount;
    const lastScanTimestampStr = data?.lastScanTime.toLocaleString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });

    if (error) {
        console.error(error);

        // 400 means its not an actual code, which is basically equivalent to not found
        if (statusCode === 400 || statusCode === 404) {
            return (
                <Layout
                    name="404 Not Found"
                    userProtected={true}
                    className="flex flex-col p-4 md:p-8 lg:px-12"
                >
                    <NotFoundComponent home="/tickets" />
                </Layout>
            );
        } else if (statusCode === 403) {
            return (
                <Layout
                    name="403 Forbidden"
                    userProtected={true}
                    className="flex flex-col p-4 md:p-8 lg:px-12"
                >
                    <ForbiddenComponent home="/" />
                </Layout>
            );
        } else {
            return (
                <Layout
                    name="500 Server Error"
                    userProtected={true}
                    className="flex flex-col p-4 md:p-8 lg:px-12"
                >
                    <ServerErrorComponent home="/tickets" />
                </Layout>
            );
        }
    }

    return (
        <Layout
            name={pageName}
            userProtected={true}
            className="p-4 md:p-8 lg:px-12"
        >
            {isLoading || error ? (
                isLoading ? (
                    <span>Loading...</span>
                ) : (
                    <span>error...</span>
                )
            ) : (
                <div className="flex flex-col items-center">
                    <Typography
                        variant="h2"
                        className="text-center"
                    >
                        Your Ticket for {data!.eventData.name}
                    </Typography>

                    <Typography
                        variant="lead"
                        color="blue-gray"
                        className="font-medium text-center mb-4"
                    >
                        {studentNumber !== undefined && (
                            <>
                                Student Number: {studentNumber}
                                <br />
                            </>
                        )}

                        {scanCount !== undefined && (
                            <>
                                # of scans: {scanCount}
                                <br />
                            </>
                        )}

                        {maxScanCount !== undefined && (
                            <>
                                Max. # of scans: {maxScanCount === 0 ? <>&infin;</> : maxScanCount}
                                <br />
                            </>
                        )}
                        {lastScanTimestampStr && scanCount !== 0 && scanCount !== undefined && (
                            <>Last scanned at {lastScanTimestampStr}</>
                        )}
                    </Typography>

                    <Typography
                        variant="lead"
                        color="blue-gray"
                        className="font-medium text-center lg:w-1/2 mb-4"
                    >
                        This is your ticket for the event. It will be required to check-in. Please screenshot this page
                        for later use or keep this page open to present when necessary.
                    </Typography>

                    <div style={{ background: "white", padding: "16px" }}>
                        <QRCode value={`https://tickets.johnfrasersac.com/admin/scan/${data?.id}` || ""} />
                    </div>
                </div>
            )}
        </Layout>
    );
}
