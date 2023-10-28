import Layout from "@/components/admin/Layout";
import { Typography } from "@material-tailwind/react";
import ZXingBrowser, { BrowserQRCodeReader } from '@zxing/browser';
import { useEffect, useRef } from "react";

export default function TicketScanningPage() {
    const codeReader = new BrowserQRCodeReader()
    const previewElem = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        (async () => {
            const videoInputDevices = await ZXingBrowser.BrowserCodeReader.listVideoInputDevices()
            const selectedDeviceId = videoInputDevices[0].deviceId;
            console.log(selectedDeviceId)
            const controls = await codeReader.decodeFromVideoDevice(selectedDeviceId, previewElem.current === null ? undefined : previewElem.current, (res, err, controls) => {
                console.log(res, err)
                controls.stop()
            })
        })()
    }, [])

    return (
        <Layout name="Ticket Scan" className="p-4 md:p-8 lg:px-12">
            <Typography variant="h1" className="text-center">Work in Progress!</Typography>

            <video ref={previewElem} />
        </Layout>
    )
}