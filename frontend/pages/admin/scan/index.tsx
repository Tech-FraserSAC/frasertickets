import { useFirebaseAuth } from "@/components/FirebaseAuthContext";
import Layout from "@/components/admin/Layout";
import TicketScan from "@/lib/backend/ticket/ticketScan";
import { Typography } from "@material-tailwind/react";
import { BrowserQRCodeReader, BrowserCodeReader, IScannerControls } from '@zxing/browser';
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";

enum ScanStatus {
    SUCCESS,
    DOES_NOT_EXIST,
    INVALID_FORMAT,
    UNSCANNED,
    SCANNER_LOADING,
    PROCESSING_SCAN
}

export default function TicketScanningPage() {
    const { user, loaded } = useFirebaseAuth()
    const router = useRouter()
    const codeReader = new BrowserQRCodeReader()
    const previewElem = useRef<HTMLVideoElement | null>(null);
    const [videoControls, setVideoControls] = useState<IScannerControls>();
    const [qrCodeResult, setQRCodeResult] = useState<string>();
    const [scanStatus, setScanStatus] = useState<ScanStatus>(ScanStatus.SCANNER_LOADING);

    useEffect(() => {
        if ((scanStatus === ScanStatus.SCANNER_LOADING || scanStatus === ScanStatus.UNSCANNED) && loaded && user !== null) {
            (async () => {
                // Need to check this here so we don't start scanning for QR codes if they're unauthorized
                const token = await user.getIdTokenResult()
                if (!token.claims.admin) {
                    router.push("/403")
                }

                try {
                    const videoInputDevices = await BrowserCodeReader.listVideoInputDevices();
                    if (videoInputDevices.length === 0) {
                        console.error("No video input devices found.");
                        return;
                    }

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
    }, [loaded, user]);

    useEffect(() => {
        (async () => {
            if (qrCodeResult !== undefined) {
                const ticketId = qrCodeResult.replace("https://tickets.johnfrasersac.com/admin/scan/", "")
                router.push(`/admin/scan/${ticketId}`)

                videoControls?.stop()
            }
        })();
    }, [qrCodeResult, videoControls])


    const innerComponent = (() => {
        switch (scanStatus) {
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
