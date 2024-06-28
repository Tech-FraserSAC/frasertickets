import { ChangeEvent, useEffect, useState } from "react";

import { useRouter } from "next/router";

import { ArrowUpTrayIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button, Input, Textarea, Typography } from "@material-tailwind/react";
import Editor from "@monaco-editor/react";
import Ajv from "ajv";
import Swal from "sweetalert2";
import { ValidationError, array, date, object, string } from "yup";

import { getEvent } from "@/lib/backend/event";
import createEvent from "@/lib/backend/event/createEvent";
import trimFileName from "@/util/trimFileName";

import Layout from "@/components/Layout";

import DateTimePicker from "react-tailwindcss-datetimepicker";
import { AiOutlineArrowLeft } from "react-icons/ai";
import Link from "next/link";

const ajv = new Ajv({
    allErrors: true,
});

const startOfToday = new Date();
startOfToday.setHours(0, 0, 0, 0);

const endOfToday = new Date(startOfToday);
endOfToday.setDate(endOfToday.getDate() + 1);
endOfToday.setSeconds(endOfToday.getSeconds() - 1);

const formSubmissionSchema = object({
    name: string().required("the name of the event is required"),
    location: string().required("the location of where the event is being held (ex. the cafeteria) is required"),
    address: string().required("the address of the event is required"),
    description: string().required("a brief description of the event is required"),
    start_timestamp: date().required("a starting time for the event is required"),
    end_timestamp: date().required("an ending time for the event is required"),
    custom_fields_schema: object().required("a custom fields schema is required, even the default one"),
});

export default function EventsCreationAdminPage() {
    const router = useRouter();

    const [dataReady, setDataReady] = useState<boolean>(false);
    const [busy, setBusy] = useState<boolean>(false);

    const [eventName, setEventName] = useState<string>("");
    const [locationName, setLocationName] = useState<string>("");
    const [address, setAddress] = useState<string>("");
    const [description, setDescription] = useState<string>("");

    // Set the initial view of picker to last 2 days
    const [selectedRange, setSelectedRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 2)),
        end: endOfToday,
    });

    const [fileUploads, setFileUploads] = useState<File[]>([]);

    const handleApply = (startDate: Date, endDate: Date) => {
        setSelectedRange({ start: startDate, end: endDate });
    };

    const onFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const allowedFileTypes = new Set(["image/jpeg", "image/png"]);

        if (files.length === 0) {
            setFileUploads([]);
            return;
        }

        if (files.some((file) => !allowedFileTypes.has(file.type))) {
            Swal.fire({
                title: "Files not uploaded",
                text: "Please only upload compatible file types (.jpg, .jpeg, .png).",
                icon: "error",
            });
            setFileUploads([]);
            return;
        } else if (files.length > 5) {
            Swal.fire({
                title: "Max photos exceeded",
                text: "Please upload a maximum of 5 photos.",
                icon: "error",
            });
            setFileUploads([]);
            return;
        }

        setFileUploads(files);
    };

    const clearFileUploads = () => {
        setFileUploads([]);
    };

    const uploadEventToDB = async () => {
        // if (fileUploads.length === 0) {
        //     Swal.fire({
        //         title: "Not enough photos",
        //         text: "Please provide 1-5 photos for the event.",
        //         icon: "error"
        //     });

        //     return;
        // }

        // Collect all the state variables into one object for validation
        const newEventData = {
            name: eventName,
            location: locationName,
            address: address,
            description: description,
            start_timestamp: selectedRange.start.toISOString(),
            end_timestamp: selectedRange.end.toISOString(),
        };

        // Validate all form data w/ yup
        try {
            await formSubmissionSchema.validate(newEventData, { abortEarly: false });
        } catch (err) {
            const validationErrors = (err as ValidationError).errors;
            let errorMessage = "";
            for (let i = 0; i < validationErrors.length; i++) {
                errorMessage += validationErrors[i];

                if (i === validationErrors.length - 1) {
                    errorMessage += ".";
                } else if (i === validationErrors.length - 2) {
                    errorMessage += ", and ";
                } else {
                    errorMessage += ", ";
                }
            }

            Swal.fire({
                title: "Invalid form input",
                text: `Please address the following errors: ${errorMessage}`,
                icon: "error",
            });
            return;
        }

        // Convert data into FormData & send to server
        // const formData = new FormData();
        // Object.entries(newEventData).forEach(([key, val]) => formData.append(key, typeof val === "string" ? val : JSON.stringify(val)));
        // fileUploads.forEach(file => { formData.append("images", file) });

        // let eventId: string;
        // try {
        //     eventId = (await createEvent(formData)).id;
        // } catch (e) {
        //     console.error(e)
        //     Swal.fire({
        //         title: "Something went wrong",
        //         text: "Your new event could not be added. Please try again later.",
        //         icon: "error"
        //     });
        //     return;
        // }

        // router.push(`/events/${eventId}`);
        // Swal.fire({
        //     title: "Successfully created event!",
        //     text: "Your event has successfully been created. Redirecting you to the event page...",
        //     icon: "success",
        // });
    };

    const onFormSubmit = async () => {
        setBusy(true);
        await uploadEventToDB();
        setBusy(false);
    };

    // Begin form by setting to event's current values
    useEffect(() => {
        if (!router.isReady) return;

        (async () => {
            const id = (router.query.id || "") as string; // Will always be a string, since this isn't a catch-all segment
            if (id === "") {
                console.error("Could not get dynamic route");
                Swal.fire({
                    title: "Something went wrong",
                    text: "The event could not be loaded. Redirecting to events admin page...",
                    icon: "error",
                });
                router.push("/admin/events");
                return;
            }

            try {
                const oldEventData = await getEvent(id);
                setEventName(oldEventData.name);
                setLocationName(oldEventData.location);
                setAddress(oldEventData.address);
                setDescription(oldEventData.description);
                setSelectedRange({
                    start: oldEventData.start_timestamp,
                    end: oldEventData.end_timestamp,
                });
                setDataReady(true);
            } catch (e) {
                console.error(e);

                Swal.fire({
                    title: "Something went wrong",
                    text: "The event could not be loaded. Redirecting to events admin page...",
                    icon: "error",
                });
                router.push("/admin/events");
                return;
            }
        })();
    }, [router.isReady]);

    return (
        <Layout
            name={eventName ? `Edit Event "${eventName}"` : "Edit Event"}
            className="flex flex-col items-center p-4 md:p-8"
            adminProtected
        >
            <div className="flex flex-col justify-center items-center md:w-auto lg:w-full xl:w-5/6 max-w-screen-2xl">
                <Link
                    href="/admin/events"
                    className="flex items-center gap-1 self-start text-blue-500 hover:text-blue-600 hover:underline text-lg font-medium mb-2"
                >
                    <AiOutlineArrowLeft />
                    <span>Events (Admin)</span>
                </Link>

                <Typography
                    variant="h1"
                    className="text-center mb-4"
                >
                    Edit Event "{eventName}"
                </Typography>
            </div>

            <div className="flex flex-col gap-4 w-5/6 md:w-auto lg:w-full xl:w-5/6 max-w-screen-2xl">
                <div className="flex flex-col lg:flex-row gap-4">
                    {dataReady ? (
                        <div className="flex flex-col gap-4 lg:w-full lg:mt-8">
                            <Input
                                className="focus:outline-none"
                                label="Name"
                                color="blue"
                                required
                                value={eventName}
                                onChange={(e) => setEventName(e.target.value)}
                            />
                            <Input
                                className="focus:outline-none"
                                label="Location"
                                color="blue"
                                required
                                value={locationName}
                                onChange={(e) => setLocationName(e.target.value)}
                            />
                            <Input
                                className="focus:outline-none"
                                label="Address"
                                color="blue"
                                required
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                            />
                            <Textarea
                                className="h-32 focus:outline-none resize-y"
                                color="blue"
                                draggable
                                label="Description"
                                required
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />

                            <div>
                                <div className="flex items-center justify-center w-full">
                                    <label
                                        htmlFor="dropzone-file"
                                        className="flex flex-col items-center justify-center w-full h-64 border border-blue-gray-200 rounded-[7px] cursor-pointer hover:bg-gray-700/10 duration-75 transition-all"
                                    >
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <ArrowUpTrayIcon className="w-8 h-8 mb-4 text-blue-gray-500" />

                                            {fileUploads.length === 0 ? (
                                                <>
                                                    <p className="mb-2 text-sm text-blue-gray-500 text-center">
                                                        <span className="font-semibold">Click to upload</span> event
                                                        photos or drag and drop<span className="text-red-500"> *</span>
                                                    </p>
                                                    <p className="text-xs text-blue-gray-500">(Max. 5, PNG or JPG)</p>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="mb-2 text-sm text-blue-gray-500">
                                                        <span className="font-semibold">
                                                            {fileUploads.length} file{fileUploads.length !== 1 && "s"}
                                                        </span>{" "}
                                                        uploaded
                                                    </p>
                                                    <p className="text-xs text-blue-gray-500 text-center">
                                                        {fileUploads
                                                            .map((file) => trimFileName(file.name, 15))
                                                            .join(", ")}
                                                    </p>
                                                </>
                                            )}
                                        </div>

                                        <input
                                            id="dropzone-file"
                                            type="file"
                                            multiple
                                            className="hidden"
                                            accept=".png,.jpg,.jpeg"
                                            onChange={onFileUpload}
                                        />
                                    </label>
                                </div>

                                {fileUploads.length > 0 && (
                                    <button
                                        className="flex flex-row items-center text-red-500 hover:text-red-700 duration-75 transition-colors text-xs mt-1"
                                        onClick={clearFileUploads}
                                    >
                                        <XMarkIcon className="w-4 h-4" /> <span className="-mt-px">Clear</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4 lg:w-full lg:mt-8">
                            <div className="animate-pulse rounded-lg bg-gray-300">&nbsp;</div>
                            <div className="animate-pulse rounded-lg bg-gray-300">&nbsp;</div>
                            <div className="animate-pulse rounded-lg bg-gray-300">&nbsp;</div>
                            <div className="animate-pulse rounded-xl bg-gray-300 h-32">&nbsp;</div>

                            <div className="w-full h-64 animate-pulse bg-gray-300 rounded-xl">&nbsp;</div>
                        </div>
                    )}

                    <div className="flex flex-col gap-1 -mt-2 lg:mt-0 items-center">
                        {dataReady ? (
                            <>
                                <span className="text-blue-gray-600 text-md">Datetime Range</span>

                                <DateTimePicker
                                    ranges={{
                                        Today: [new Date(startOfToday), new Date(endOfToday)],
                                    }}
                                    start={selectedRange.start}
                                    end={selectedRange.end}
                                    applyCallback={handleApply}
                                    autoApply
                                    standalone
                                    twelveHoursClock
                                    years={[new Date().getFullYear(), new Date().getFullYear() + 5]}
                                    classNames={{ rootContainer: "w-full md:max-w-2xl" }}
                                >
                                    <></>{" "}
                                    {/* The props on the DateTimePicker requires children for some reason, but doesn't need them in standalone mode. */}
                                </DateTimePicker>
                            </>
                        ) : (
                            <>
                                <span className="hidden lg:block text-md">&nbsp;</span>
                                <div className="w-full md:w-[42rem] h-full min-h-72 animate-pulse bg-gray-300 rounded-xl">
                                    &nbsp;
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {dataReady ? (
                    <Button
                        color="blue"
                        onClick={onFormSubmit}
                        disabled={busy}
                    >
                        Save Edits
                    </Button>
                ) : (
                    <div className="h-12 w-full animate-pulse bg-gray-300 rounded-xl">&nbsp;</div>
                )}
            </div>
        </Layout>
    );
}
