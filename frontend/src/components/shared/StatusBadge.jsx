import React from 'react';

/**
 * StatusBadge Component
 * Displays HTTP status codes with appropriate styling
 * @param {number} status - HTTP status code
 * @param {string} size - 'sm', 'md', or 'lg'
 */
const StatusBadge = ({ status, size = 'sm' }) => {
    const getStatusConfig = () => {
        if (status >= 200 && status < 300) {
            return {
                bgClass: 'bg-green-500/10',
                textClass: 'text-green-400',
                borderClass: 'border-green-500/20'
            };
        } else if (status >= 300 && status < 400) {
            return {
                bgClass: 'bg-blue-500/10',
                textClass: 'text-blue-400',
                borderClass: 'border-blue-500/20'
            };
        } else if (status >= 400 && status < 500) {
            return {
                bgClass: 'bg-yellow-500/10',
                textClass: 'text-yellow-400',
                borderClass: 'border-yellow-500/20'
            };
        } else if (status >= 500) {
            return {
                bgClass: 'bg-red-500/10',
                textClass: 'text-red-400',
                borderClass: 'border-red-500/20'
            };
        } else {
            return {
                bgClass: 'bg-gray-500/10',
                textClass: 'text-gray-400',
                borderClass: 'border-gray-500/20'
            };
        }
    };

    const config = getStatusConfig();

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2 py-1 text-sm',
        lg: 'px-3 py-1.5 text-base'
    };

    return (
        <span className={`inline-flex items-center rounded font-mono font-medium border ${config.bgClass} ${config.textClass} ${config.borderClass} ${sizeClasses[size]}`}>
            {status}
        </span>
    );
};

export default StatusBadge;
