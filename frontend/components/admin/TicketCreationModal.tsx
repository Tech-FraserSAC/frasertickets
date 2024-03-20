import React, { useRef, useState } from "react";

import { Combobox, Dialog, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { useMutation, useQuery } from "react-query";
import { ValidationError } from "yup";

import Event, { convertPropertySchemaTypeToInputType, getAllEvents } from "@/lib/backend/event";
import { createNewTicket } from "@/lib/backend/ticket";
import { buildValidatorForCustomEventData } from "@/util/eventCustomDataValidator";
import { studentOrTeacherNumberRegex } from "@/util/regexps";
import toTitleCase from "@/util/toTitleCase";

import { useFirebaseAuth } from "@/components/FirebaseAuthContext";

export default function TicketCreationModal({
    onCreate,
    open,
    setOpen,
    event: presetEvent,
}: {
    onCreate: () => Promise<any>;
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    event?: Event;
}) {
    const { user } = useFirebaseAuth();

    const { data: events } = useQuery(
        "frasertix-admin-ticket-creation-events",
        async () => {
            const events = await getAllEvents();
            const mappedEvents = events
                .sort((a, b) => b.end_timestamp.getTime() - a.start_timestamp.getTime())
                .map((event) => ({
                    ...event,
                    customFieldValidator: buildValidatorForCustomEventData(event),
                }));
            return mappedEvents;
        },
        {
            enabled: presetEvent === undefined,
            refetchOnWindowFocus: false // Prevents text flash for event selector
        },
    );

    const createTicketMutation = useMutation(
        ({
            studentNumber,
            eventId,
            maxScanCount,
            customFields,
        }: {
            studentNumber: string;
            eventId: string;
            maxScanCount: number;
            customFields: { [key: string]: any };
        }) => createNewTicket(studentNumber, eventId, maxScanCount, customFields),
        {
            onSettled: () => {
                return onCreate();
            },
        },
    );

    const modalStudentNumberRef = useRef<HTMLInputElement>(null);
    const modalMaxScanCountRef = useRef<HTMLInputElement>(null);
    const [modalEventChosen, setModalEventChosen] = useState(events && events.length !== 0 ? events[0] : null);
    const [modalEventQuery, setModalEventQuery] = useState("");
    const [modalSubmitting, setModalSubmitting] = useState(false);
    const modalFormRef = useRef<HTMLFormElement>(null);

    const filteredEventNames =
        modalEventQuery === ""
            ? events
            : events?.filter((event) => {
                  return event.name.toLocaleLowerCase().includes(modalEventQuery.toLocaleLowerCase());
              });

    // Add the custom validator to the event itself so that we don't have
    // to regenerate it for every submission
    const selectedEvent =
        presetEvent !== undefined
            ? {
                  ...presetEvent,
                  customFieldValidator: buildValidatorForCustomEventData(presetEvent),
              }
            : modalEventChosen;

    const createNewTicketUI = async () => {
        setModalSubmitting(true);

        const studentNumber = modalStudentNumberRef.current?.value ?? "";
        const maxScanCount = Number(modalMaxScanCountRef.current?.value ?? 0);

        // Get all custom fields
        const builtInFields = new Set(["studentNumber", "maxScanCount", ""]);
        let customFieldsRaw: { [key: string]: any } = {};
        modalFormRef.current?.querySelectorAll("input").forEach((input) => {
            if (!builtInFields.has(input.name)) {
                customFieldsRaw[input.name] = input.value;
            }
        });

        // Validate custom fields against schema
        let customFields: { [key: string]: any } = {};
        try {
            customFields = await selectedEvent?.customFieldValidator.validate(customFieldsRaw);
        } catch (err) {
            if (err instanceof ValidationError) {
                alert(`Something went wrong while validating your custom fields: ${err.message}`);
            } else {
                alert("Something went wrong. Please try again.");
                console.error(err);
            }

            setModalSubmitting(false);
            return;
        }

        if (!studentOrTeacherNumberRegex.test(studentNumber)) {
            alert(
                "Please provide a valid student / teacher number. If you're typing in a teacher number, make sure to include the p00.",
            );
        } else if (Number.isNaN(maxScanCount) || maxScanCount < 0 || Math.floor(maxScanCount) !== maxScanCount) {
            alert(
                "Please provide a whole number max scan count above or equal to 0, or keep it blank for infinite entires.",
            );
        } else if (selectedEvent === null) {
            alert("Please provide a valid event.");
        } else if (presetEvent === undefined && (modalEventChosen === null || modalEventQuery !== "")) {
            // If the query isn't empty, this means they were searching for something but didn't select anything
            alert("Please provide a valid event and make sure it is selected.");
        } else {
            try {
                await createTicketMutation.mutateAsync({
                    studentNumber: studentNumber.toString(),
                    eventId: selectedEvent.id,
                    maxScanCount: maxScanCount,
                    customFields: customFields,
                });
                alert("Ticket has been created.");

                modalStudentNumberRef.current!.value = "";
                setOpen(false);
            } catch (err: any) {
                if (err && err.response) {
                    if (err.response.status === 409) {
                        alert("The user already has a ticket. Please check this and try again.");
                    } else if (err.response.status === 400) {
                        alert(
                            "There are no accounts associated with the given student number. Please ask them to register and try again.",
                        );
                    } else if (err.response.status === 403 && studentNumber === user?.email?.replace("@pdsb.net", "")) {
                        // While 403 can be returned for a user who isn't allowed to post,
                        // it would have likely been caused if the student number is the same as the one of the
                        // given student. We don't check this beforehand because it's a lot easier / faster to find
                        // the user's student number on the backend than it is on the frontend.
                        alert("You are not allowed to make a ticket for yourself.");
                    } else {
                        alert("Something went wrong. Please try again.");
                    }
                } else {
                    alert("Something went wrong. Please try again.");
                }
                console.error(err);
            }
        }

        setModalSubmitting(false);
    };

    const EventComboBox = () => (
        <Combobox
            value={modalEventChosen}
            onChange={setModalEventChosen}
        >
            <div className="relative">
                <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left shadow-md border-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm">
                    <Combobox.Input
                        className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0 focus:outline-none"
                        displayValue={(event: any) => event && event.name}
                        onChange={(event) => setModalEventQuery(event.target.value)}
                    />
                    <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                        <ChevronUpDownIcon
                            className="h-5 w-5 text-gray-400"
                            aria-hidden="true"
                        />
                    </Combobox.Button>
                </div>
                <Transition
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                    afterLeave={() => setModalEventQuery("")}
                >
                    <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg  border-none focus:outline-none sm:text-sm">
                        {filteredEventNames && filteredEventNames?.length === 0 && modalEventQuery !== "" ? (
                            <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                                Nothing found.
                            </div>
                        ) : (
                            filteredEventNames?.map((event) => (
                                <Combobox.Option
                                    key={event.id}
                                    className={({ active }) =>
                                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                            active ? "bg-blue-600 text-white" : "text-gray-900"
                                        }`
                                    }
                                    value={event}
                                >
                                    {({ selected, active }) => (
                                        <>
                                            <span
                                                className={`block truncate ${selected ? "font-medium" : "font-normal"}`}
                                            >
                                                {event.name}
                                            </span>
                                            {selected ? (
                                                <span
                                                    className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                                        active ? "text-white" : "text-blue-600"
                                                    }`}
                                                >
                                                    <CheckIcon
                                                        className="h-5 w-5"
                                                        aria-hidden="true"
                                                    />
                                                </span>
                                            ) : null}
                                        </>
                                    )}
                                </Combobox.Option>
                            ))
                        )}
                    </Combobox.Options>
                </Transition>
            </div>
        </Combobox>
    );

    return (
        <Transition.Root show={open}>
            <Dialog
                as="div"
                className="relative z-10"
                onClose={setOpen}
            >
                <Transition.Child
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-80 transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center sm:items-center sm:p-0">
                        <Transition.Child
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="relative transform rounded-lg bg-gray-400 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                                <div className="bg-slate-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                                    <div className="sm:flex sm:items-start">
                                        <form
                                            ref={modalFormRef}
                                            className="flex flex-col items-center mt-3 text-center sm:ml-4 sm:mt-0 gap-4 sm:text-left"
                                        >
                                            <Dialog.Title
                                                as="h2"
                                                className="text-2xl font-semibold text-black text-center"
                                            >
                                                Create New Ticket
                                            </Dialog.Title>

                                            <div className="flex flex-col items-center gap-2">
                                                <label htmlFor="studentNumber">
                                                    <span className="text-md text-gray-900 text-left">
                                                        Student Number
                                                    </span>

                                                    <span className="text-md text-red-500 font-semibold"> *</span>
                                                </label>

                                                <input
                                                    className={`rounded-lg py-2 px-3 w-60 sm:w-72 align-middle text-black outline-none focus:ring-2 focus:ring-blue-700 duration-200 bg-white shadow-lg focus:shadow-none`}
                                                    name="studentNumber"
                                                    id="studentNumber"
                                                    required
                                                    minLength={6}
                                                    maxLength={8}
                                                    ref={modalStudentNumberRef}
                                                />
                                            </div>

                                            {presetEvent === undefined ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <span className="text-md text-gray-900">
                                                        Event
                                                        <span className="text-md text-red-500 font-semibold"> *</span>
                                                    </span>
                                                    <EventComboBox />
                                                </div>
                                            ) : (
                                                <></>
                                            )}

                                            <div className="flex flex-col items-center gap-2">
                                                <label htmlFor="maxScanCount">
                                                    <span className="text-md text-gray-900 text-left">
                                                        Max Scan Count (blank or 0 &#8594; infinite)
                                                    </span>
                                                    <span className="text-md text-red-500 font-semibold"> *</span>
                                                </label>

                                                <input
                                                    className={`rounded-lg py-2 px-3 w-32 align-middle text-black outline-none focus:ring-2 focus:ring-blue-700 duration-200 bg-white shadow-lg focus:shadow-none`}
                                                    name="maxScanCount"
                                                    id="maxScanCount"
                                                    type="number"
                                                    required
                                                    min={0}
                                                    ref={modalMaxScanCountRef}
                                                />
                                            </div>

                                            {selectedEvent !== null ? (
                                                Object.keys(selectedEvent.custom_fields_schema.properties).map(
                                                    (propertyId) => {
                                                        const property =
                                                            selectedEvent.custom_fields_schema.properties[propertyId];
                                                        const requiredKeysSet = new Set(
                                                            selectedEvent.custom_fields_schema.required,
                                                        );

                                                        const inputType =
                                                            convertPropertySchemaTypeToInputType(property);

                                                        let inputFieldWidth;
                                                        switch (inputType) {
                                                            case "number": {
                                                                inputFieldWidth = "w-32";
                                                            }
                                                            default: {
                                                                inputFieldWidth = "w-full";
                                                            }
                                                        }

                                                        return (
                                                            <div
                                                                className="flex flex-col items-center w-full"
                                                                key={propertyId}
                                                            >
                                                                <label htmlFor={propertyId}>
                                                                    <span className="text-md text-gray-900 text-left">
                                                                        {toTitleCase(property.displayName)}
                                                                    </span>
                                                                    {requiredKeysSet.has(propertyId) ? (
                                                                        <span className="text-md text-red-500 font-semibold">
                                                                            {" "}
                                                                            *
                                                                        </span>
                                                                    ) : (
                                                                        <></>
                                                                    )}
                                                                </label>

                                                                <span className="text-sm text-gray-800 text-center mb-2">
                                                                    {property.description}
                                                                </span>

                                                                <input
                                                                    className={`rounded-lg py-2 px-3 ${inputFieldWidth} align-middle text-black outline-none focus:ring-2 focus:ring-blue-700 duration-200 bg-white shadow-lg focus:shadow-none`}
                                                                    name={propertyId}
                                                                    id={propertyId}
                                                                    type={inputType}
                                                                    required
                                                                />
                                                            </div>
                                                        );
                                                    },
                                                )
                                            ) : (
                                                <></>
                                            )}
                                        </form>
                                    </div>
                                </div>
                                <div className="bg-slate-800 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                    <button
                                        type="button"
                                        className="inline-flex w-full justify-center rounded-md bg-green-600 disabled:bg-green-700 px-3 py-2 text-sm font-semibold shadow-md text-white hover:bg-green-500 sm:ml-3 sm:w-auto duration-75"
                                        disabled={modalSubmitting}
                                        onClick={createNewTicketUI}
                                    >
                                        {modalSubmitting ? "Submitting..." : "Create"}
                                    </button>
                                    <button
                                        type="button"
                                        className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-md ring-1 ring-inset ring-gray-300 hover:bg-gray-200 duration-75 sm:mt-0 sm:w-auto"
                                        onClick={() => setOpen(false)}
                                        disabled={modalSubmitting}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
}
