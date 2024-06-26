import Layout from "@/components/Layout";
import trimFileName from "@/util/trimFileName";
import { ArrowUpTrayIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button, Input, Textarea, Typography } from "@material-tailwind/react";
import { ChangeEvent, useState } from "react";
import DateTimePicker from "react-tailwindcss-datetimepicker";
import Swal from "sweetalert2";
import Editor from "@monaco-editor/react";
import { ValidationError, array, date, object, string } from "yup";

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
    img_urls: array().of(string()).min(1, "at least 1 photo is required").max(5, "a maximum of 5 photos are required").required("photos are required"),
    custom_fields_schema: object().required("a custom fields schema is required, even the default one"),
});
  

export default function EventsCreationAdminPage() {
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
    const [customFieldsSchemaRaw, setCustomFieldsSchemaRaw] = useState<string | undefined>(`{
    "type": "object",
    "properties": {},
    "required": []
}`);

    const handleApply = (startDate: Date, endDate: Date) => {
        setSelectedRange({ start: startDate, end: endDate });
    }

    const onFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const allowedFileTypes = new Set(["image/jpeg", "image/png"]);

        if (files.length === 0) {
            setFileUploads([]);
            return;
        }

        if (files.some((file) => !(allowedFileTypes.has(file.type)))) {
            Swal.fire({
                title: "Files not uploaded",
                text: "Please only upload compatible file types (.jpg, .jpeg, .png).",
                icon: "error"
            });
            setFileUploads([]);
            return;
        } else if (files.length > 5) {
            Swal.fire({
                title: "Max photos exceeded",
                text: "Please upload a maximum of 5 photos.",
                icon: "error"
            });
            setFileUploads([]);
            return;
        }

        setFileUploads(files);
    }

    const clearFileUploads = () => {
        setFileUploads([]);
    }

    const onFormSubmit = async () => {
        if (fileUploads.length === 0) {
            Swal.fire({
                title: "Not enough photos",
                text: "Please provide 1-5 photos for the event.",
                icon: "error"
            });
            
            return;
        }

        // TODO: Upload all images

        // TODO: Verify that custom fields schema is valid JSON Schema
        const customFieldsSchema: object = {};

        const newEventData = {
            name: eventName,
            location: locationName,
            address: address,
            description: description,
            start_timestamp: selectedRange.start.toISOString(),
            end_timestamp: selectedRange.end.toISOString(),
            img_urls: ["https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/1200px-Google_2015_logo.svg.png"],
            custom_fields_schema: customFieldsSchema,
        }

        try {
            const validationRes = await formSubmissionSchema
                .validate(newEventData, { abortEarly: false })
        } catch (err) {
            const validationErrors = (err as ValidationError).errors;
            let errorMessage = "";
            for (let i = 0; i < validationErrors.length; i++) {
                errorMessage += validationErrors[i];

                if (i === validationErrors.length - 1) {
                    errorMessage += "."
                } else if (i === validationErrors.length - 2) {
                    errorMessage += ", and ";
                } else {
                    errorMessage += ", ";
                }
            }
            
            Swal.fire({
                title: "Invalid form input",
                text: `Please address the following errors: ${errorMessage}`,
                icon: "error"
            });
            return;
        }

        // TODO: Figure out mutation

        Swal.fire({
            title: "Successfully created event!",
            text: "Your event has successfully been created. Redirecting you to the event page...",
            icon: "success",
        });
    }

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
                            onChange={e => setEventName(e.target.value)}
                        />
                        <Input
                            className="focus:outline-none"
                            label="Location"
                            color="blue"
                            required
                            value={locationName}
                            onChange={e => setLocationName(e.target.value)}
                        />
                        <Input
                            className="focus:outline-none"
                            label="Address"
                            color="blue"
                            required
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                        />
                        <Textarea 
                            className="h-32 focus:outline-none resize-y"
                            color="blue"
                            draggable
                            label="Description"
                            required
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />

                        <div>
                            <div className="flex items-center justify-center w-full">
                                <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border border-blue-gray-200 rounded-[7px] cursor-pointer hover:bg-gray-700/10 duration-75 transition-all">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <ArrowUpTrayIcon className="w-8 h-8 mb-4 text-blue-gray-500" />

                                        {fileUploads.length === 0 ? (
                                            <>
                                                <p className="mb-2 text-sm text-blue-gray-500 text-center"><span className="font-semibold">Click to upload</span> event photos or drag and drop<span className="text-red-500"> *</span></p>
                                                <p className="text-xs text-blue-gray-500">(Max. 5, PNG or JPG)</p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="mb-2 text-sm text-blue-gray-500"><span className="font-semibold">{fileUploads.length} file{fileUploads.length !== 1 && "s"}</span> uploaded</p>
                                                <p className="text-xs text-blue-gray-500 text-center">{fileUploads.map(file => trimFileName(file.name, 15)).join(", ")}</p>
                                            </>
                                        )}
                                    </div>

                                    <input id="dropzone-file" type="file" multiple className="hidden" accept=".png,.jpg,.jpeg" onChange={onFileUpload} />
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
                            classNames={{ rootContainer: "w-full md:max-w-2xl"}}
                        >
                            <></> {/* The props on the DateTimePicker requires children for some reason, but doesn't need them in standalone mode. */}
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
                        </a>, or use a{" "}
                        <a
                            href="https://json-schema-editor.tangramjs.com/editor.html#/"
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-500 hover:text-blue-700"
                        >
                            GUI editor
                        </a>. However, the default value is sufficient if no custom fields are required.
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
                                automaticLayout: true
                            }}
                        />
                    </div>
                </div>

                <Button color="blue" onClick={onFormSubmit}>
                    Create
                </Button>
            </div>
        </Layout>
    )
}