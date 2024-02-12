import { useState } from "react";

import { useRouter } from "next/router";

import { Typography } from "@material-tailwind/react";
import QRCode from "react-qr-code";
import { useQuery } from "react-query";

import { CustomFieldsSchema } from "@/lib/backend/event";
import { getTicket } from "@/lib/backend/ticket";

import Layout from "@/components/Layout";
import { ForbiddenComponent } from "@/pages/403";
import { NotFoundComponent } from "@/pages/404";
import { ServerErrorComponent } from "@/pages/500";
import getCustomFieldsFromTicket from "@/util/getCustomFieldsFromTicket";
import TicketInfoTable from "@/components/user/TicketInfoTable";

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

    const CustomFieldsComponent = ({
        customFields,
        customFieldsSchema,
    }: {
        customFields: { [key: string]: any };
        customFieldsSchema: CustomFieldsSchema;
    }) => {
        const properties = getCustomFieldsFromTicket(customFields, customFieldsSchema)

        return properties.map(property => (
            <Typography
                variant="lead"
                color="blue-gray"
                className="font-medium text-center"
                key={property.id}
            >
                {property.schema.displayName}: {property.value}
            </Typography>
        ))
    };

    return (
        <Layout
            name={pageName}
            userProtected={true}
            className="p-4 md:p-8 lg:px-12"
        >
            {isLoading ? (
                <span>Loading...</span>
            ) : (
                <div className="flex flex-col items-center">
                    <Typography
                        variant="h2"
                        className="text-center mb-2"
                    >
                        Your Ticket for {data!.eventData.name}
                    </Typography>

                    <TicketInfoTable ticket={data!} />

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
