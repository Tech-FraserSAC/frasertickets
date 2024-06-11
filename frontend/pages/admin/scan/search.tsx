import { useRef, useState } from "react";

import { useRouter } from "next/router";

import { Combobox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/24/outline";
import { Button, Typography } from "@material-tailwind/react";
import { useMutation, useQuery } from "react-query";

import { getAllEvents } from "@/lib/backend/event";
import { searchForTicket } from "@/lib/backend/ticket";

import Layout from "@/components/Layout";
import TicketInfoTable from "@/components/user/TicketInfoTable";

interface CondensedEvent {
    name: string;
    id: string;
}

export default function TicketSearchAndScanPage() {
    const router = useRouter();

    // Just the names and IDs to put in the modal
    const { data: eventNames } = useQuery("frasertix-admin-search-events", async () => {
        const events = await getAllEvents();
        const mappedEvents = events
            .sort((a, b) => b.end_timestamp.getTime() - a.start_timestamp.getTime())
            .map((event) => ({
                name: event.name,
                id: event.id,
            }));
        return mappedEvents;
    });

    const modalStudentNumberRef = useRef<HTMLInputElement>(null);
    const [modalEventChosen, setModalEventChosen] = useState<CondensedEvent | null>(null);
    const [modalEventQuery, setModalEventQuery] = useState("");

    const filteredEventNames =
        modalEventQuery === ""
            ? eventNames
            : eventNames?.filter((event) => {
                  return event.name.toLocaleLowerCase().includes(modalEventQuery.toLocaleLowerCase());
              });

    const ticketSearchMutation = useMutation(() =>
        searchForTicket(modalEventChosen?.id ?? "", modalStudentNumberRef.current?.value ?? ""),
    );

    const runSearchAndScan = async () => {
        const studentNumber = Number(modalStudentNumberRef.current?.value);

        if (modalEventChosen === null || modalEventQuery !== "") {
            // If the query isn't empty, this means they were searching for something but didn't select anything
            alert("Please choose an event.");
        } else if (Number.isNaN(studentNumber) || studentNumber < 100000 || studentNumber > 9999999) {
            alert("Please provide a valid student number.");
        } else {
            try {
                await ticketSearchMutation.mutateAsync();
            } catch (err: any) {
                if (err && err.response) {
                    if (err.response.status === 404) {
                        alert("No such ticket exists. Please try again.");
                    } else if (err.response.status === 400) {
                        alert(
                            "There are no accounts associated with the given student number. Please ask them to register and try again.",
                        );
                    } else {
                        alert("Something went wrong. Please try again.");
                        console.error(err);
                    }
                } else {
                    alert("Something went wrong. Please try again.");
                    console.error(err);
                }
            }
        }
    };

    const ScanTicketComponent = (
        <div className="flex flex-col items-center">
            <Typography
                variant="h3"
                color="blue-gray"
            >
                Searched Ticket Info
            </Typography>

            <TicketInfoTable ticket={ticketSearchMutation.data!} />

            <div className="flex flex-wrap gap-2">
                <Button
                    color="green"
                    size="md"
                    className="mt-4 mb-6"
                    onClick={() => {
                        router.push(`/admin/scan/${ticketSearchMutation.data?.id}`);
                    }}
                >
                    Scan
                </Button>

                <Button
                    color="gray"
                    size="md"
                    className="mt-4 mb-6"
                    onClick={() => {
                        ticketSearchMutation.reset();
                    }}
                >
                    Go Back
                </Button>
            </div>
        </div>
    );

    const SearchTicketComponent = (
        <div className="flex flex-col self-center items-center w-60 sm:w-72">
            <Typography
                variant="p"
                className="self-start"
            >
                Student Number <span className="text-red-500">*</span>
            </Typography>

            <input
                className={`mt-1 mb-3 rounded-lg py-2 px-3 w-60 sm:w-72 align-middle text-gray-900 text-md outline-none focus:ring-2 focus:ring-blue-700 duration-200 bg-white shadow-lg`}
                name="studentNumber"
                id="studentNumber"
                required
                minLength={6}
                maxLength={7}
                ref={modalStudentNumberRef}
            />

            <Typography
                variant="p"
                className="self-start"
            >
                Event <span className="text-red-500">*</span>
            </Typography>

            <Combobox
                value={modalEventChosen}
                onChange={setModalEventChosen}
            >
                <div className="relative mt-1 z-[999999999999]">
                    <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left shadow-md border-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-md">
                        <Combobox.Input
                            className="border-none w-60 sm:w-72 py-2 pl-3 pr-10 text-md leading-5 text-gray-900 focus:ring-0 focus:outline-none"
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
                        <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg  border-none focus:outline-none sm:text-md">
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
                                                    className={`block truncate ${
                                                        selected ? "font-medium" : "font-normal"
                                                    }`}
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

            <Button
                color="blue"
                size="md"
                className="mt-4 mb-6"
                onClick={() => {
                    runSearchAndScan();
                }}
                disabled={ticketSearchMutation.isLoading}
            >
                Search
            </Button>
        </div>
    );

    return (
        <Layout
            name="Ticket Search"
            className="flex flex-col p-4 md:p-8 lg:px-12"
            adminProtected
        >
            <Typography
                variant="h1"
                className="text-center mb-4"
            >
                Search & Scan Ticket
            </Typography>

            {ticketSearchMutation.isSuccess ? ScanTicketComponent : SearchTicketComponent}
        </Layout>
    );
}
