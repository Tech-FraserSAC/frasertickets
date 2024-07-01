import { ChangeEvent, useState } from "react";

import Image from "next/image";
import { useRouter } from "next/router";

import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { ArrowUpTrayIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button, Input, Textarea, Typography } from "@material-tailwind/react";
import Editor from "@monaco-editor/react";
import Ajv from "ajv";
import Swal from "sweetalert2";
import { ValidationError, array, date, object, string } from "yup";

import createEvent from "@/lib/backend/event/createEvent";
import trimFileName from "@/util/trimFileName";

import Layout from "@/components/Layout";

import DateTimePicker from "react-tailwindcss-datetimepicker";

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

interface UploadedFile {
    file: File;
    objUrl: string;
}

export default function EventsCreationAdminPage() {
    const router = useRouter();

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

    const [fileUploads, setFileUploads] = useState<UploadedFile[]>([]);
    const [customFieldsSchemaRaw, setCustomFieldsSchemaRaw] = useState<string | undefined>(`{
    "type": "object",
    "properties": {},
    "required": []
}`);

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
        } else if (files.length + fileUploads.length > 5) {
            Swal.fire({
                title: "Max photos exceeded",
                text: "Please upload a maximum of 5 photos.",
                icon: "error",
            });
            setFileUploads([]);
            return;
        }

        setFileUploads(fileUploads.concat(files.map((file) => ({ file, objUrl: URL.createObjectURL(file) }))));
    };

    const onDragEnd = (result: any) => {
        if (!result.destination) return;

        setFileUploads((currentImages) => {
            const reorderedImages = Array.from(currentImages);
            const [movedImage] = reorderedImages.splice(result.source.index, 1);
            reorderedImages.splice(result.destination.index, 0, movedImage);
            return reorderedImages;
        });
    };

    const uploadEventToDB = async () => {
        if (fileUploads.length === 0) {
            Swal.fire({
                title: "Not enough photos",
                text: "Please provide 1-5 photos for the event.",
                icon: "error",
            });

            return;
        }

        // Verify that custom fields schema is valid JSON Schema
        let customFieldsSchema: object;
        try {
            customFieldsSchema = JSON.parse(customFieldsSchemaRaw || "");
            ajv.validateSchema(customFieldsSchema, true);
        } catch (e) {
            Swal.fire({
                title: "Invalid custom fields schema",
                text: "The provided custom fields schema could not be parsed as valid JSON schema.",
                icon: "error",
            });

            return;
        }

        // Collect all the state variables into one object for validation
        const newEventData = {
            name: eventName,
            location: locationName,
            address: address,
            description: description,
            start_timestamp: selectedRange.start.toISOString(),
            end_timestamp: selectedRange.end.toISOString(),
            custom_fields_schema: customFieldsSchema,
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
        const formData = new FormData();
        Object.entries(newEventData).forEach(([key, val]) =>
            formData.append(key, typeof val === "string" ? val : JSON.stringify(val)),
        );
        fileUploads.forEach((file) => {
            formData.append("images", file.file);
        });

        let eventId: string;
        try {
            eventId = (await createEvent(formData)).id;
        } catch (e) {
            console.error(e);
            Swal.fire({
                title: "Something went wrong",
                text: "Your new event could not be added. Please try again later.",
                icon: "error",
            });
            return;
        }

        router.push(`/events/${eventId}`);
        Swal.fire({
            title: "Successfully created event!",
            text: "Your event has successfully been created. Redirecting you to the event page...",
            icon: "success",
        });
    };

    const onFormSubmit = async () => {
        setBusy(true);
        await uploadEventToDB();
        setBusy(false);
    };

    return (
        <Layout
            name="Create Event"
            className="flex flex-col items-center p-4 md:p-8"
            adminProtected
        >
            <Typography
                variant="h1"
                className="text-center mb-4"
            >
                Create Event
            </Typography>

            <div className="flex flex-col gap-4 w-5/6 md:w-auto lg:w-full xl:w-5/6 max-w-screen-2xl">
                <div className="flex flex-col lg:flex-row gap-4">
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

                        <div className="flex flex-col gap-4">
                            {fileUploads.length > 0 && (
                                <DragDropContext onDragEnd={onDragEnd}>
                                    <Droppable
                                        droppableId="images"
                                        direction="horizontal"
                                    >
                                        {(provided) => (
                                            <div
                                                className="flex flex-row items-center justify-center w-full space-x-2"
                                                {...provided.droppableProps}
                                                ref={provided.innerRef}
                                            >
                                                {fileUploads.map((img, i) => {
                                                    const srcUrl = typeof img === "string" ? img : img.objUrl;
                                                    const onRemove = () => {
                                                        const fileUploadsCopy = fileUploads.slice();
                                                        fileUploadsCopy.splice(i, 1);
                                                        setFileUploads(fileUploadsCopy);
                                                    };

                                                    return (
                                                        <Draggable
                                                            key={btoa(srcUrl)}
                                                            draggableId={btoa(srcUrl)}
                                                            index={i}
                                                        >
                                                            {(provided) => (
                                                                <div
                                                                    className="relative"
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                >
                                                                    <div
                                                                        className="absolute z-10 top-1 right-1 p-1 bg-gray-200 rounded-full cursor-pointer hover:bg-gray-300 active:bg-gray-400 duration-75 transition-colors"
                                                                        onClick={onRemove}
                                                                    >
                                                                        <XMarkIcon className="text-red-500 w-4 h-4 font-bold" />
                                                                    </div>

                                                                    <Image
                                                                        src={srcUrl}
                                                                        width={256}
                                                                        height={256}
                                                                        className="object-cover object-center rounded-xl w-auto h-32"
                                                                        alt=""
                                                                    />
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    );
                                                })}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </DragDropContext>
                            )}

                            <div className="flex items-center justify-center w-full">
                                <label
                                    htmlFor="dropzone-file"
                                    className={`flex flex-col items-center justify-center w-full border border-blue-gray-200 rounded-[7px] cursor-pointer hover:bg-gray-700/10 duration-75 transition-colors ${fileUploads.length > 0 ? "h-24" : "h-64"}`}
                                >
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <ArrowUpTrayIcon className="w-8 h-8 mb-2 text-blue-gray-500" />

                                        {fileUploads.length === 0 ? (
                                            <>
                                                <p className="mb-1 text-sm text-blue-gray-500 text-center">
                                                    <span className="font-semibold">Click to upload</span> event photos
                                                    or drag and drop<span className="text-red-500"> *</span>
                                                </p>
                                                <p className="text-xs text-blue-gray-500">(Max. 5, PNG or JPG)</p>
                                                <p className="text-xs text-blue-gray-500">Note: all images will be cropped to the initial image's aspect ratio.</p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-sm text-blue-gray-500">
                                                    <span className="font-semibold">
                                                        {fileUploads.length} file{fileUploads.length !== 1 && "s"}
                                                    </span>{" "}
                                                    uploaded
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
                        </div>
                    </div>

                    <div className="flex flex-col gap-1 -mt-2 lg:mt-0 items-center">
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
                    </div>
                </div>

                <div className="flex flex-col items-center lg:items-start text-center lg:text-start w-full">
                    <p className="text-blue-gray-800 text-lg">Custom Fields Schema</p>
                    <p className="text-gray-600 text-sm mb-2">
                        This uses JSONSchema. You can find more information in their{" "}
                        <a
                            href="https://json-schema.org/learn/getting-started-step-by-step"
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-500 hover:text-blue-700"
                        >
                            documentation
                        </a>
                        , or use a{" "}
                        <a
                            href="https://json-schema-editor.tangramjs.com/editor.html#/"
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-500 hover:text-blue-700"
                        >
                            GUI editor
                        </a>
                        . However, the default value is sufficient if no custom fields are required.
                    </p>

                    <div className="w-full md:w-5/6 lg:w-full">
                        <Editor
                            width="100%"
                            height="400px"
                            language="json"
                            theme="vs-dark"
                            value={customFieldsSchemaRaw}
                            onChange={setCustomFieldsSchemaRaw}
                            options={{
                                automaticLayout: true,
                            }}
                        />
                    </div>
                </div>

                <Button
                    color="blue"
                    onClick={onFormSubmit}
                    disabled={busy}
                >
                    Create
                </Button>
            </div>
        </Layout>
    );
}
