import Layout from "@/components/admin/Layout";
import scanTicket from "@/lib/backend/ticket/scanTicket";
import TicketScan from "@/lib/backend/ticket/ticketScan";
import { Typography } from "@material-tailwind/react";
import { BrowserQRCodeReader, BrowserCodeReader, IScannerControls } from '@zxing/browser';
import { useRouter } from "next/router";
import { ReactElement, ReactNode, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

enum ScanStatus {
    SUCCESS,
    DOES_NOT_EXIST,
    INVALID_FORMAT,
    UNSCANNED,
    SCANNER_LOADING,
    PROCESSING_SCAN
}

export default function TicketScanningPage() {
    const router = useRouter()
    const codeReader = new BrowserQRCodeReader()
    const previewElem = useRef<HTMLVideoElement | null>(null);
    const [videoControls, setVideoControls] = useState<IScannerControls>();
    const [qrCodeResult, setQRCodeResult] = useState<string>();
    const [scanStatus, setScanStatus] = useState<ScanStatus>(ScanStatus.SCANNER_LOADING);
    const [scanData, setScanData] = useState<TicketScan>();

    useEffect(() => {
        if (scanStatus === ScanStatus.SCANNER_LOADING || scanStatus === ScanStatus.UNSCANNED) {
            (async () => {
                try {
                    const videoInputDevices = await BrowserCodeReader.listVideoInputDevices();
                    if (videoInputDevices.length === 0) {
                        console.error("No video input devices found.");
                        return;
                    }

                    const selectedDeviceId = videoInputDevices[0].deviceId;

                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            aspectRatio: 1 / 1,
                            frameRate: {
                                ideal: 60,
                                max: 60
                            },
                            facingMode: "environment"
                        }
                    })

                    setVideoControls(await codeReader.decodeFromStream(
                        stream,
                        previewElem.current!,
                        (result, err, controls) => {
                            if (result) {
                                setScanStatus(ScanStatus.PROCESSING_SCAN);
                                setQRCodeResult(result.getText());
                                controls.stop(); // Stop only when a QR code is successfully read
                            }

                            if (err && err.name !== "NotFoundException") {
                                // Only show issues that aren't the "not found exception" since its expected
                                console.error(`Error: ${err}`);
                            }
                        }
                    ))

                    setScanStatus(ScanStatus.UNSCANNED)
                } catch (e) {
                    console.error(`Exception: ${e}`);
                }
            })();
        }

        return () => {
            videoControls?.stop()
        }
    // This should only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        (async () => {
            if (qrCodeResult !== undefined) {
                // Scan ticket into system
                try {
                    const res = await scanTicket(qrCodeResult);
                    setScanStatus(ScanStatus.SUCCESS);
                    setScanData(res);
                } catch (err: any) {
                    if (err?.response?.status === 400) {
                        setScanStatus(ScanStatus.INVALID_FORMAT);
                    } else if (err?.response?.status === 404) {
                        setScanStatus(ScanStatus.DOES_NOT_EXIST);
                    }
                    console.error(err)
                }

                videoControls?.stop()
            }
        })();
    }, [qrCodeResult, videoControls])


    const innerComponent = (() => {
        switch (scanStatus) {
            case ScanStatus.INVALID_FORMAT: {
                return (
                    <div className="flex flex-col items-center">
                        <Typography variant="h2" className="text-center text-red-500">Invalid QR Code</Typography>
                        <Typography variant="lead" className="text-center lg:w-1/2 mb-4">This QR code doesn&apos;t match our internal format. Try scanning the QR code again.</Typography>
                        <button className="py-2 px-4 bg-blue-500 text-md font-semibold rounded-lg hover:bg-blue-800 duration-75 text-white" onClick={router.reload}>
                            Reload
                        </button>
                    </div>
                )
            }
            case ScanStatus.DOES_NOT_EXIST: {
                return (
                    <div className="flex flex-col items-center">
                        <Typography variant="h2" className="text-center text-red-500">Ticket Not Found</Typography>
                        <Typography variant="lead" className="text-center lg:w-1/2">The ticket with the given QR code could not be found in our systems. Try scanning the QR code again.</Typography>
                        <button className="py-2 px-4 bg-blue-500 text-md font-semibold rounded-lg hover:bg-blue-800 duration-75 text-white" onClick={router.reload}>
                            Reload
                        </button>
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
                                        {scanData?.ticketData.lastScanTime.toLocaleString("en-US", {
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
                                                <Image src={scanData?.userData.pfp_url} alt="pfp" height={25} width={25} className="rounded-full" quality={100} />
                                                <span>{scanData?.userData.full_name.replace(" John Fraser SS", "").replace(scanData?.userData.student_number, "")}</span>
                                            </div>
                                        ) : (
                                            <td className='border border-gray-500 px-4 py-1'>{scanData?.userData.full_name.replace(" John Fraser SS", "").replace(scanData?.userData.student_number, "")}</td>
                                        )}
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <button className="py-2 px-4 bg-blue-500 text-md font-semibold rounded-lg hover:bg-blue-800 duration-75 text-white mt-4" onClick={router.reload}>
                            Scan New Ticket
                        </button>
                    </div>
                )
            }
            case ScanStatus.PROCESSING_SCAN: {
                return (
                    <div className="flex flex-col items-center">
                        <Typography variant="h2" className="text-center text-gray-800">Processing Ticket...</Typography>
                    </div>
                )
            }
            default: {
                return (
                    <div className="flex flex-col items-center">
                        {
                            scanStatus === ScanStatus.SCANNER_LOADING
                            && <Typography variant="h2" className="text-center text-blue-700">Loading ticket scanner...</Typography>
                        }
                        <video ref={previewElem} muted={true} playsInline={true} autoPlay={true} />
                        {
                            scanStatus === ScanStatus.UNSCANNED
                            && <Typography variant="lead" className="text-center md:w-1/2 mt-2 text-gray-700">Hover your camera over the QR code for at least a second. If this does not work, try adjusting the QR code or your phone.</Typography>
                        }
                    </div>
                )
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
