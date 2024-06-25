import Layout from "@/components/Layout";
import { Input, Textarea, Typography } from "@material-tailwind/react";
import { useState } from "react";
import DateTimePicker from "react-tailwindcss-datetimepicker";
import 'react-tailwindcss-datetimepicker/style.css';


const now = new Date();
const startOfToday = new Date();
startOfToday.setHours(0, 0, 0, 0);

const endOfToday = new Date(startOfToday);
endOfToday.setDate(endOfToday.getDate() + 1);
endOfToday.setSeconds(endOfToday.getSeconds() - 1);

export default function EventsCreationAdminPage() {
    // Set the initial view of picker to last 2 days
    const [selectedRange, setSelectedRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 2)),
        end: endOfToday,
    });

    function handleApply(startDate: Date, endDate: Date) {
        setSelectedRange({ start: startDate, end: endDate });
    }

    return (
        <Layout
            name="Create Event"
            className="flex flex-col items-center p-4 md:p-8 lg:px-12"
            adminProtected
        >
            <Typography
                variant="h1"
                className="text-center mb-4"
            >
                Create Event
            </Typography>

            <div className="flex flex-col gap-4">
                <Input className="w-[90%] sm:w-5/6 md:w-1/2" label="Name" required />
                <Textarea className="w-[90%] sm:w-5/6 md:w-1/2 h-32" draggable label="Description" required />

                <div className="flex flex-col gap-1 -mt-2 items-center">
                    <span className="text-blue-gray-600 text-md">Datetime Range</span>

                    <DateTimePicker
                        ranges={{
                            Today: [new Date(startOfToday), new Date(endOfToday)],
                        }}
                        start={selectedRange.start}
                        end={selectedRange.end}
                        applyCallback={handleApply}
                        standalone
                        twelveHoursClock
                        years={[new Date().getFullYear(), new Date().getFullYear() + 5]}
                    >
                        <></> {/* The props on the DateTimePicker requires children for some reason, but doesn't need them in standalone mode. */}
                    </DateTimePicker>
                </div>
            </div>
        </Layout>
    )
}