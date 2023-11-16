import Layout from "@/components/admin/Layout";
import scanTicket from "@/lib/backend/ticket/scanTicket";
import { Typography } from "@material-tailwind/react";
import { useRouter } from "next/router";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "react-query";
import { ForbiddenComponent } from "@/pages/403";

enum ScanStatus {
    SUCCESS,
    MAX_SCAN_COUNT_REACHED,
    DOES_NOT_EXIST,
    INVALID_FORMAT,
    LOADING,
    FORBIDDEN
}

export default function TicketScanningPage() {
    const router = useRouter()
    const [scanStatus, setScanStatus] = useState<ScanStatus>(ScanStatus.LOADING)

    const { isLoading: rqLoading, error, data: scanData } = useQuery('frasertix-scan-ticket', () => (
        scanTicket(router.query.id as string)
    ), {
        enabled: router.isReady,
        retry: (failureCount, error: any | undefined) => {
            if (error?.response?.status === 400) {
                setScanStatus(ScanStatus.INVALID_FORMAT)
                return false
            } else if (error?.response?.status === 404) {
                setScanStatus(ScanStatus.DOES_NOT_EXIST)
                return false
            } else if (error?.response?.status === 403 || error?.response?.status === 401) {
                setScanStatus(ScanStatus.FORBIDDEN)
                return false
            }

            return failureCount < 3
        },
        onSuccess: (data) => {
            console.log(data)
            if (!data.processed && data.noProcessReason === "max scan count exceeded") {
                setScanStatus(ScanStatus.MAX_SCAN_COUNT_REACHED)
            } else if (data.processed) {
                setScanStatus(ScanStatus.SUCCESS)
            } else {
                alert("Something seems to have gone wrong. Try refreshing your page.")
            }
        },
        // Scanning the ticket changes stuff in the database that we don't want happening multiple times
        // because the window got refreshed.
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false
    })

    const innerComponent = (() => {
        switch (scanStatus) {
            case ScanStatus.INVALID_FORMAT: {
                return (
                    <div className="flex flex-col items-center">
                        <Typography variant="h2" className="text-center text-red-500">Invalid QR Code</Typography>
                        <Typography variant="lead" className="text-center lg:w-1/2 mb-4">This QR code doesn&apos;t match our internal format. Try scanning the QR code again.</Typography>
                        
                        <div className="flex flex-wrap gap-2 mt-2">
                            <button className="py-2 px-4 bg-blue-500 text-md font-semibold rounded-lg hover:bg-blue-800 duration-75 text-white" onClick={router.reload}>
                                Reload
                            </button>
                            <Link className="py-2 px-4 bg-teal-500 text-md font-semibold rounded-lg hover:bg-teal-800 duration-75 text-white" href="/admin/scan">
                                Scan New Ticket
                            </Link>
                        </div>
                    </div>
                )
            }
            case ScanStatus.DOES_NOT_EXIST: {
                return (
                    <div className="flex flex-col items-center">
                        <Typography variant="h2" className="text-center text-red-500">Ticket Not Found</Typography>
                        <Typography variant="lead" className="text-center lg:w-1/2">The ticket with the given QR code could not be found in our systems. Try scanning the QR code again.</Typography>

                        <div className="flex flex-wrap gap-2 mt-2">
                            <button className="py-2 px-4 bg-blue-500 text-md font-semibold rounded-lg hover:bg-blue-800 duration-75 text-white" onClick={router.reload}>
                                Reload
                            </button>
                            <Link className="py-2 px-4 bg-teal-500 text-md font-semibold rounded-lg hover:bg-teal-800 duration-75 text-white" href="/admin/scan">
                                Scan New Ticket
                            </Link>
                        </div>
                    </div>
                )
            }
            case ScanStatus.MAX_SCAN_COUNT_REACHED: {
                return (
                    <div className="flex flex-col items-center">
                        <Typography variant="h2" className="text-center text-orange-700">Valid Ticket, Max Scans Exceeded</Typography>
                        <Typography variant="p" className="text-center text-gray-700 mb-2 lg:w-3/4">Ticket scan has not been recorded since it has already reached the maximum scans allowed.</Typography>

                        <table className="border-collapse border-2 border-gray-500">
                            <thead className="border-collapse border-2 border-gray-500 bg-green-200">
                                <th className="text-left border-collapse border-2 border-gray-500 px-2">Attributes</th>
                                <th className="text-right border-collapse border-2 border-gray-500">Value</th>
                            </thead>

                            <tbody className="border-collapse border-2 border-gray-500">
                                <tr className="border-collapse border-2 border-gray-500">
                                    <td className="border-collapse border-2 border-gray-500 px-2">Scan Count</td>
                                    <td className="border-collapse border-2 border-gray-500 text-right px-2">{scanData?.scanCount}</td>
                                </tr>

                                <tr className="border-collapse border-2 border-gray-500">
                                    <td className="border-collapse border-2 border-gray-500 px-2">Max Scan Count</td>
                                    <td className="border-collapse border-2 border-gray-500 text-right px-2">{scanData?.ticketData.maxScanCount.toString()}</td>
                                </tr>

                                <tr className="border-collapse border-2 border-gray-500">
                                    <td className="border-collapse border-2 border-gray-500 px-2">Previous Scan Timestamp</td>
                                    <td className="border-collapse border-2 border-gray-500 text-right px-2">
                                        {/** We pass in the previous as current for when max is reached **/ 
                                        scanData?.timestamp.toLocaleString("en-US", {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit'
                                        })}
                                    </td>
                                </tr>

                                <tr className="border-collapse border-2 border-gray-500">
                                    <td className="border-collapse border-2 border-gray-500 px-2">Event Name</td>
                                    <td className="border-collapse border-2 border-gray-500 text-right px-2 text-blue-500 hover:text-blue-700 hover:underline">
                                        <Link href={`/events/${scanData?.ticketData.eventId}`} target="_blank" rel="noreferrer">
                                            {scanData?.ticketData.eventData.name.slice(0, 25)}
                                            {scanData?.ticketData.eventData.name.length! >= 25 && "..."}
                                        </Link>
                                    </td>
                                </tr>

                                <tr className="border-collapse border-2 border-gray-500">
                                    <td className="border-collapse border-2 border-gray-500 px-2">Student Number</td>
                                    <td className="border-collapse border-2 border-gray-500 text-right px-2">
                                        {scanData?.userData.student_number}
                                    </td>
                                </tr>

                                <tr className="border-collapse border-2 border-gray-500">
                                    <td className="border-collapse border-2 border-gray-500 px-2">Display Name</td>
                                    <td className="border-collapse border-2 border-gray-500 text-right p-2">
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
                                                <span>{scanData?.userData.full_name.replace(" John Fraser SS", "").replace(scanData?.userData.student_number, "")}</span>
                                            </div>
                                        ) : (
                                            <td className='border border-gray-500 px-4 py-1'>{scanData?.userData.full_name.replace(" John Fraser SS", "").replace(scanData?.userData.student_number, "")}</td>
                                        )}
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <div className="flex flex-wrap gap-2 mt-2">
                            <Link className="py-2 px-4 bg-teal-500 text-md font-semibold rounded-lg hover:bg-teal-800 duration-75 text-white" href="/admin/scan">
                                Scan New Ticket
                            </Link>
                        </div>
                    </div>
                )
            }
            case ScanStatus.SUCCESS: {
                return (
                    <div className="flex flex-col items-center">
                        <Typography variant="h2" className="text-center text-green-500">Valid Ticket</Typography>

                        <table className="border-collapse border-2 border-gray-500">
                            <thead className="border-collapse border-2 border-gray-500 bg-green-200">
                                <th className="text-left border-collapse border-2 border-gray-500 px-2">Attributes</th>
                                <th className="text-right border-collapse border-2 border-gray-500">Value</th>
                            </thead>

                            <tbody className="border-collapse border-2 border-gray-500">
                                <tr className="border-collapse border-2 border-gray-500">
                                    <td className="border-collapse border-2 border-gray-500 px-2">Scan Count</td>
                                    <td className="border-collapse border-2 border-gray-500 text-right px-2">{scanData?.scanCount}</td>
                                </tr>

                                <tr className="border-collapse border-2 border-gray-500">
                                    <td className="border-collapse border-2 border-gray-500 px-2">Max Scan Count</td>
                                    <td className="border-collapse border-2 border-gray-500 text-right px-2">{scanData?.ticketData.maxScanCount === 0 ? <>&infin;</> : scanData?.ticketData.maxScanCount.toString()}</td>
                                </tr>

                                <tr className="border-collapse border-2 border-gray-500">
                                    <td className="border-collapse border-2 border-gray-500 px-2">Scan Timestamp</td>
                                    <td className="border-collapse border-2 border-gray-500 text-right px-2">
                                        {scanData?.timestamp.toLocaleString("en-US", {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit'
                                        })}
                                    </td>
                                </tr>

                                <tr className="border-collapse border-2 border-gray-500">
                                    <td className="border-collapse border-2 border-gray-500 px-2">Previous Scan Timestamp</td>
                                    <td className="border-collapse border-2 border-gray-500 text-right px-2">
                                        {scanData?.scanCount === 1 ? "N/A" : scanData?.ticketData.lastScanTime.toLocaleString("en-US", {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit'
                                        })}
                                    </td>
                                </tr>

                                <tr className="border-collapse border-2 border-gray-500">
                                    <td className="border-collapse border-2 border-gray-500 px-2">Event Name</td>
                                    <td className="border-collapse border-2 border-gray-500 text-right px-2 text-blue-500 hover:text-blue-700 hover:underline">
                                        <Link href={`/events/${scanData?.ticketData.eventId}`} target="_blank" rel="noreferrer">
                                            {scanData?.ticketData.eventData.name.slice(0, 25)}
                                            {scanData?.ticketData.eventData.name.length! >= 25 && "..."}
                                        </Link>
                                    </td>
                                </tr>

                                <tr className="border-collapse border-2 border-gray-500">
                                    <td className="border-collapse border-2 border-gray-500 px-2">Student Number</td>
                                    <td className="border-collapse border-2 border-gray-500 text-right px-2">
                                        {scanData?.userData.student_number}
                                    </td>
                                </tr>

                                <tr className="border-collapse border-2 border-gray-500">
                                    <td className="border-collapse border-2 border-gray-500 px-2">Display Name</td>
                                    <td className="border-collapse border-2 border-gray-500 text-right p-2">
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
                                                <span>{scanData?.userData.full_name.replace(" John Fraser SS", "").replace(scanData?.userData.student_number, "")}</span>
                                            </div>
                                        ) : (
                                            <td className='border border-gray-500 px-4 py-1'>{scanData?.userData.full_name.replace(" John Fraser SS", "").replace(scanData?.userData.student_number, "")}</td>
                                        )}
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <div className="flex flex-wrap gap-2 mt-2">
                            <Link className="py-2 px-4 bg-teal-500 text-md font-semibold rounded-lg hover:bg-teal-800 duration-75 text-white" href="/admin/scan">
                                Scan New Ticket
                            </Link>
                        </div>
                    </div>
                )
            }
            case ScanStatus.LOADING: {
                return (
                    <div className="flex flex-col items-center">
                        <Typography variant="h2" className="text-center text-gray-800">Processing Ticket...</Typography>
                    </div>
                )
            }
            case ScanStatus.FORBIDDEN: {
                return <ForbiddenComponent />
            }
        }
    })()


    return (
        <Layout name="Ticket Scan" className="p-4 md:p-8 lg:px-12">
            <Typography variant="h1" className="text-center mb-4">Ticket Scanner</Typography>

            {innerComponent}
        </Layout>
    );
}
