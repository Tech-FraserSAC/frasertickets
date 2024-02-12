import Image from "next/image";
import Link from "next/link";

import TicketScan from "@/lib/backend/ticket/scan";
import { cleanDisplayNameWithStudentNumber } from "@/util/cleanDisplayName";
import getCustomFieldsFromTicket from "@/util/getCustomFieldsFromTicket";
import { Typography } from "@material-tailwind/react";

export default function TicketScanInfoTable({ scanData }: { scanData: TicketScan }) {
    const customProperties = getCustomFieldsFromTicket(
        scanData!.ticketData.customFields,
        scanData!.ticketData.eventData.custom_fields_schema,
    );

    return (
        <table className="border-collapse border border-gray-500">
            <thead className="border-collapse border-y border-gray-500 bg-gradient-to-br  from-blue-gray-400/30 to-blue-gray-500/20">
                <th className="text-left border-collapse border-y border-gray-500 px-3">
                    <Typography
                        variant="paragraph"
                        color="blue-gray"
                        className="font-semibold"
                    >
                        Field
                    </Typography>
                </th>
                <th className="text-right border-collapse border-y border-gray-500 px-3">
                    <Typography
                        variant="paragraph"
                        color="blue-gray"
                        className="font-semibold"
                    >
                        Details
                    </Typography>
                </th>
            </thead>

            <tbody className="border-collapse border-y border-gray-500">
                <tr className="border-collapse border-y border-gray-500">
                    <td className="border-collapse border-y border-gray-500 px-3 pr-5">
                        <Typography
                            variant="paragraph"
                            color="blue-gray"
                            className="font-medium"
                        >
                            Scan Count
                        </Typography>
                    </td>
                    <td className="border-collapse border-y border-gray-500 text-right px-3">
                        <Typography
                            variant="paragraph"
                            color="blue-gray"
                            className="font-medium"
                        >
                            {scanData?.scanCount}
                        </Typography>
                    </td>
                </tr>

                <tr className="border-collapse border-y border-gray-500">
                    <td className="border-collapse border-y border-gray-500 px-3 pr-5">
                        <Typography
                            variant="paragraph"
                            color="blue-gray"
                            className="font-medium"
                        >
                            Max Scan Count
                        </Typography>
                    </td>
                    <td className="border-collapse border-y border-gray-500 text-right px-3">
                        <Typography
                            variant="paragraph"
                            color="blue-gray"
                            className="font-medium"
                        >
                            {scanData?.ticketData.maxScanCount === 0 ? (
                                <>&infin;</>
                            ) : (
                                scanData?.ticketData.maxScanCount.toString()
                            )}
                        </Typography>
                    </td>
                </tr>

                {scanData.processed ? (
                    <>
                        <tr className="border-collapse border-y border-gray-500">
                            <td className="border-collapse border-y border-gray-500 px-3 pr-5">
                                <Typography
                                    variant="paragraph"
                                    color="blue-gray"
                                    className="font-medium"
                                >
                                    Scan Timestamp
                                </Typography>
                            </td>
                            <td className="border-collapse border-y border-gray-500 text-right px-3">
                                <Typography
                                    variant="paragraph"
                                    color="blue-gray"
                                    className="font-medium"
                                >
                                    {scanData?.timestamp.toLocaleString("en-US", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "2-digit",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        second: "2-digit",
                                    })}
                                </Typography>
                            </td>
                        </tr>

                        <tr className="border-collapse border-y border-gray-500">
                            <td className="border-collapse border-y border-gray-500 px-3 pr-5">
                                <Typography
                                    variant="paragraph"
                                    color="blue-gray"
                                    className="font-medium"
                                >Previous Scan Timestamp
                                </Typography>
                            </td>
                            <td className="border-collapse border-y border-gray-500 text-right px-3">
                                <Typography
                                    variant="paragraph"
                                    color="blue-gray"
                                    className="font-medium"
                                >
                                    {scanData?.scanCount === 1
                                        ? "N/A"
                                        : scanData?.ticketData.lastScanTime.toLocaleString("en-US", {
                                            day: "2-digit",
                                            month: "2-digit",
                                            year: "2-digit",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            second: "2-digit",
                                        })}
                                </Typography>
                            </td>
                        </tr>
                    </>
                ) : (
                    <tr className="border-collapse border-y border-gray-500">
                        <td className="border-collapse border-y border-gray-500 px-3 pr-5">
                            <Typography
                                variant="paragraph"
                                color="blue-gray"
                                className="font-medium"
                            >
                                Previous Scan Timestamp
                            </Typography>
                        </td>
                        <td className="border-collapse border-y border-gray-500 text-right px-3">
                            <Typography
                                variant="paragraph"
                                color="blue-gray"
                                className="font-medium"
                            >
                                {/** We pass in the previous as current for when max is reached **/
                                    scanData?.timestamp.toLocaleString("en-US", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "2-digit",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        second: "2-digit",
                                    })}
                            </Typography>
                        </td>
                    </tr>
                )}

                <tr className="border-collapse border-y border-gray-500">
                    <td className="border-collapse border-y border-gray-500 px-3 pr-5">
                        <Typography
                            variant="paragraph"
                            color="blue-gray"
                            className="font-medium"
                        >
                            Event Name
                        </Typography>
                    </td>
                    <td className="border-collapse border-y border-gray-500 text-right px-3 text-blue-500 hover:text-blue-700">
                        <Link
                            href={`/events/${scanData?.ticketData.eventId}`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <Typography
                                variant="paragraph"
                                color="blue"
                                className="font-medium hover:underline"
                            >
                                {scanData?.ticketData.eventData.name.slice(0, 25)}
                                {scanData?.ticketData.eventData.name.length! >= 25 && "..."}
                            </Typography>
                        </Link>
                    </td>
                </tr>

                <tr className="border-collapse border-y border-gray-500">
                    <td className="border-collapse border-y border-gray-500 px-3 pr-5">
                        <Typography
                            variant="paragraph"
                            color="blue-gray"
                            className="font-medium"
                        >
                            Student Number
                        </Typography>
                    </td>
                    <td className="border-collapse border-y border-gray-500 text-right px-3">
                        <Typography
                            variant="paragraph"
                            color="blue-gray"
                            className="font-medium"
                        >
                            {scanData?.userData.student_number}
                        </Typography>
                    </td>
                </tr>

                <tr className="border-collapse border-y border-gray-500">
                    <td className="border-collapse border-y border-gray-500 px-3 pr-5">
                        <Typography
                            variant="paragraph"
                            color="blue-gray"
                            className="font-medium"
                        >
                            Display Name
                        </Typography>
                    </td>
                    <td className="border-collapse border-y border-gray-500 text-right p-2">
                        {scanData?.userData.pfp_url ? (
                            <div className="flex flex-row gap-1 items-center justify-end w-full">
                                <Image
                                    src={scanData?.userData.pfp_url}
                                    alt="pfp"
                                    height={25}
                                    width={25}
                                    className="rounded-full"
                                    quality={100}
                                    unoptimized
                                />
                                <Typography
                                    variant="paragraph"
                                    color="blue-gray"
                                    className="font-medium"
                                >
                                    {cleanDisplayNameWithStudentNumber(
                                        scanData?.userData.full_name,
                                        scanData?.userData.student_number,
                                    )}
                                </Typography>
                            </div>
                        ) : (
                            <td className="border border-gray-500 px-4 py-1">
                                <Typography
                                    variant="paragraph"
                                    color="blue-gray"
                                    className="font-medium"
                                >
                                    {cleanDisplayNameWithStudentNumber(
                                        scanData?.userData.full_name,
                                        scanData?.userData.student_number,
                                    )}
                                </Typography>
                            </td>
                        )}
                    </td>
                </tr>

                {customProperties.map((property) => (
                    <tr
                        className="border-collapse border-y border-gray-500"
                        key={property.id}
                    >
                        <td className="border-collapse border-y border-gray-500 px-3 pr-5">
                            <Typography
                                variant="paragraph"
                                color="blue-gray"
                                className="font-medium"
                            >
                                {property.schema.displayName}
                            </Typography>
                        </td>
                        <td className="border-collapse border-y border-gray-500 text-right p-2">
                            <Typography
                                variant="paragraph"
                                color="blue-gray"
                                className="font-medium"
                            >
                                {property.value}
                            </Typography>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
