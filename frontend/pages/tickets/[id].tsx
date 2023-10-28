import getEvent from "@/lib/backend/event/getEvent"
import { useQuery } from "react-query"

import Router, { useRouter } from "next/router"
import Layout from "@/components/Layout"
import Image from "next/image"
import { Breadcrumbs, Carousel, Typography } from "@material-tailwind/react"
import Link from "next/link"

import { AiOutlineArrowLeft } from "react-icons/ai"
import formatFullDate from "@/util/formatFullDate"
import getTicket from "@/lib/backend/ticket/getTicket"
import QRCode from "react-qr-code"
import { useFirebaseAuth } from "@/components/FirebaseAuthContext"

const studentNameRegex = /[a-zA-Z]{2} - [0-9]{2}[a-zA-Z]{2} (\d{6,7})/gm;

export default function TicketSpecificPage() {
    const { user, loaded } = useFirebaseAuth()
    const router = useRouter()
    const { id } = router.query

    const { isLoading: rqLoading, error, data } = useQuery('frasertix-ticket', () => (
        getTicket(id as string)
    ), {
        enabled: router.isReady,
        retry: (failureCount, error: any | undefined) => {
            // 400 means its not an actual code, which is basically equivalent to not found
            if (error?.response?.status === 400 || error?.response?.status === 404) {
                router.push("/404")
                return false
            }

            if (error?.response?.status === 403) {
                router.push("/403")
                return false
            }

            if (error?.response?.status === 500) {
                router.push("/500")
                return false
            }

            return failureCount < 3
        }
    })

    const isLoading = !(router.isReady) || rqLoading
    const pageName = !isLoading ? data?.eventData.name as string : "Ticket"
    const studentNumber = data?.ownerData.student_number;
    const scanCount = data?.scanCount;
    const lastScanTimestampStr = data?.lastScanTime.toLocaleString("en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });

    if (error) console.error(error)

    console.log(data)

    return (
        <Layout name={pageName} userProtected={true} className="p-4 md:p-8 lg:px-12">
            {
                (isLoading || error) ? (
                    isLoading ? (
                        <span>Loading...</span>
                    ) : (
                        <span>error...</span>
                    )
                ) : (
                    <div className="flex flex-col items-center">
                        <Typography variant="h2" className="text-center">Your Ticket for {data!.eventData.name}</Typography>

                        <Typography variant="lead" color="blue-gray" className="font-medium text-center mb-4">
                            {studentNumber !== undefined && <>
                                Student Number: {studentNumber}</>}
                            <br />
                            {scanCount !== undefined && <>
                                # of scans: {scanCount}</>}
                            <br />
                            {
                                lastScanTimestampStr &&
                                scanCount !== 0 &&
                                scanCount !== undefined && <>
                                    Last scanned at {lastScanTimestampStr}
                                </>
                            }
                        </Typography>

                        <Typography variant="lead" color="blue-gray" className="font-medium text-center lg:w-1/2 mb-4">
                            This is your ticket for the event. It will be required to check-in.
                            Please screenshot this page for later use or use the buttons below to add it to your digital wallet.
                        </Typography>

                        <div style={{ background: 'white', padding: '16px' }}>
                            <QRCode value={data?.id || ""} />
                        </div>
                    </div>
                )
            }
        </Layout >
    )
}