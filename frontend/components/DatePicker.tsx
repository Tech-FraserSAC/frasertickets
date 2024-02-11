import React, { useEffect, useRef, useState } from "react";
import { DateRangePicker, Range } from "react-date-range";

// main css file
import "react-date-range/dist/styles.css";
// theme css file
import "react-date-range/dist/theme/default.css";

interface Props {
    state: Range;
    setState: React.Dispatch<React.SetStateAction<Range>>;
}

function DatePickerModal({ state, setState }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const clearRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                modalRef.current &&
                !modalRef.current.contains(e.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(e.target as Node) &&
                clearRef.current &&
                !clearRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const getButtonPosition = () => {
        if (!buttonRef.current) return {};
        const rect = buttonRef.current!.getBoundingClientRect();
        return {
            top: `${rect.bottom + window.scrollY}px`,
            left: `${rect.left + window.scrollX}px`,
        };
    };

    return (
        <>
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className="text-sm bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
                {isOpen ? "Close" : "Open"} Date Picker <br />
                {(state.startDate !== undefined || state.endDate !== undefined) && <>(date selected)</>}
            </button>

            {isOpen && (
                <div
                    ref={modalRef}
                    style={{
                        ...getButtonPosition(),
                        zIndex: 1000,
                    }}
                    className="flex flex-col gap-2 absolute z-10 mt-2 p-4 bg-white border rounded shadow-lg"
                >
                    <button
                        ref={clearRef}
                        onClick={() =>
                            setState({
                                startDate: undefined,
                                endDate: undefined,
                                key: "selection",
                            })
                        }
                        className="text-sm mb-2 bg-orange-500 text-white px-4 py-2 mx-4 lg:mx-8 rounded hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300"
                    >
                        Clear
                    </button>

                    <DateRangePicker
                        ranges={[state]}
                        onChange={(item) => setState(item.selection)}
                    />
                </div>
            )}
        </>
    );
}

export default DatePickerModal;
