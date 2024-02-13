import Image from "next/image";
import Link from "next/link";

import { Typography } from "@material-tailwind/react";

import Ticket from "@/lib/backend/ticket";
import { cleanDisplayNameWithStudentNumber } from "@/util/cleanDisplayName";
import getCustomFieldsFromTicket from "@/util/getCustomFieldsFromTicket";

export default function TicketInfoTable({ ticket }: { ticket: Ticket }) {
    const customProperties = getCustomFieldsFromTicket(ticket.customFields, ticket.eventData.custom_fields_schema);

    return (
        <table className="border-collapse border border-gray-500 mb-4">
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
                    <td className="border-collapse border-y border-gray-500 px-3">
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
                            {ticket.ownerData.student_number}
                        </Typography>
                    </td>
                </tr>

                <tr className="border-collapse border-y border-gray-500">
                    <td className="border-collapse border-y border-gray-500 px-3">
                        <Typography
                            variant="paragraph"
                            color="blue-gray"
                            className="font-medium"
                        >
                            Display Name
                        </Typography>
                    </td>
                    <td className="border-collapse border-y border-gray-500 text-right px-3 py-2">
                        {ticket.ownerData.pfp_url ? (
                            <div className="flex flex-row gap-1 items-center justify-end w-full">
                                <Image
                                    src={ticket.ownerData.pfp_url}
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
                                        ticket.ownerData.full_name,
                                        ticket.ownerData.student_number,
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
                                        ticket.ownerData.full_name,
                                        ticket.ownerData.student_number,
                                    )}
                                </Typography>
                            </td>
                        )}
                    </td>
                </tr>

                <tr className="border-collapse border-y border-gray-500">
                    <td className="border-collapse border-y border-gray-500 px-3">
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
                            {ticket.scanCount.toString()}
                        </Typography>
                    </td>
                </tr>

                <tr className="border-collapse border-y border-gray-500">
                    <td className="border-collapse border-y border-gray-500 px-3">
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
                            {ticket.maxScanCount === 0 ? <>&infin;</> : ticket.maxScanCount.toString()}
                        </Typography>
                    </td>
                </tr>

                <tr className="border-collapse border-y border-gray-500">
                    <td className="border-collapse border-y border-gray-500 px-3">
                        <Typography
                            variant="paragraph"
                            color="blue-gray"
                            className="font-medium"
                        >
                            Latest Scan Timestamp
                        </Typography>
                    </td>
                    <td className="border-collapse border-y border-gray-500 text-right px-3">
                        <Typography
                            variant="paragraph"
                            color="blue-gray"
                            className="font-medium"
                        >
                            {ticket.scanCount === 0
                                ? "N/A"
                                : ticket.lastScanTime.toLocaleString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      second: "2-digit",
                                  })}
                        </Typography>
                    </td>
                </tr>

                <tr className="border-collapse border-y border-gray-500">
                    <td className="border-collapse border-y border-gray-500 px-3">
                        <Typography
                            variant="paragraph"
                            color="blue-gray"
                            className="font-medium"
                        >
                            Event
                        </Typography>
                    </td>
                    <td className="border-collapse border-y border-gray-500 text-right px-3">
                        <Typography
                            variant="paragraph"
                            color="blue"
                            className="font-medium"
                        >
                            <Link
                                href={`/events/${ticket.eventId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:underline"
                            >
                                {ticket.eventData.name.slice(0, 25)}
                                {ticket.eventData.name.length! >= 25 && "..."}
                            </Link>
                        </Typography>
                    </td>
                </tr>

                {customProperties.map((property) => (
                    <tr
                        className="border-collapse border-y border-gray-500"
                        key={property.id}
                    >
                        <td className="border-collapse border-y border-gray-500 px-3">
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
