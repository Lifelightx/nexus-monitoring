import React, { useState } from 'react';

/**
 * TimeRangeSelector Component
 * Allows users to select predefined time ranges or custom date range
 * @param {string} selectedRange - Currently selected range
 * @param {function} onRangeChange - Callback when range changes
 */
const TimeRangeSelector = ({ selectedRange = '1h', onRangeChange }) => {
    const [isOpen, setIsOpen] = useState(false);

    const timeRanges = [
        { value: '15m', label: 'Last 15 minutes' },
        { value: '1h', label: 'Last hour' },
        { value: '6h', label: 'Last 6 hours' },
        { value: '24h', label: 'Last 24 hours' },
        { value: '7d', label: 'Last 7 days' },
        { value: '30d', label: 'Last 30 days' }
    ];

    const handleSelect = (range) => {
        onRangeChange(range);
        setIsOpen(false);
    };

    const getCurrentLabel = () => {
        const current = timeRanges.find(r => r.value === selectedRange);
        return current ? current.label : 'Select range';
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-bg-secondary/50 border border-white/10 rounded-lg text-white hover:bg-bg-secondary transition-colors"
            >
                <i className="fas fa-clock text-accent"></i>
                <span>{getCurrentLabel()}</span>
                <i className={`fas fa-chevron-down text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 w-56 bg-bg-secondary border border-white/10 rounded-lg shadow-xl z-20 overflow-hidden">
                        {timeRanges.map((range) => (
                            <button
                                key={range.value}
                                onClick={() => handleSelect(range.value)}
                                className={`w-full px-4 py-2 text-left hover:bg-white/5 transition-colors ${selectedRange === range.value
                                        ? 'bg-accent/10 text-accent'
                                        : 'text-white'
                                    }`}
                            >
                                {range.label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default TimeRangeSelector;
