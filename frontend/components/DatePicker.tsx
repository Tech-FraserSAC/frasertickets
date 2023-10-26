import React, { useState, useRef } from 'react';
import { DateRangePicker } from 'react-date-range';
import 'react-date-range/dist/styles.css'; // main css file
import 'react-date-range/dist/theme/default.css'; // theme css file

function DatePickerModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [state, setState] = useState([
        {
            startDate: new Date(),
            endDate: null,
            key: 'selection'
        }
    ]);

    const buttonRef = useRef(null);

    const getButtonPosition = () => {
        if (!buttonRef.current) return {};
        const rect = buttonRef.current.getBoundingClientRect();
        return {
            top: `${rect.bottom + window.scrollY}px`,
            left: `${rect.left + window.scrollX}px`
        };
    };

    return (
        <div>
            <button ref={buttonRef} onClick={() => setIsOpen(true)} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >Open Date Picker</button>

            {isOpen && (
                <div style={{
                    ...getButtonPosition(),
                    zIndex: 1000
                }}
                    className="absolute z-10 mt-2 p-4 bg-white border rounded shadow-lg"
                >
                    <DateRangePicker
                        ranges={state}
                        onChange={(item) => setState([item.selection])}
                    />
                    <button onClick={() => setIsOpen(false)} className="mt-2 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300">
                        Close
                    </button>
                </div>
            )}
        </div>
    );
}

export default DatePickerModal;
