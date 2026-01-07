import React from 'react';

/**
 * HealthIndicator Component
 * Displays health status with color-coded indicator
 * @param {string} health - 'healthy', 'warning', or 'critical'
 * @param {boolean} showText - Whether to show text label
 * @param {string} size - 'sm', 'md', or 'lg'
 */
const HealthIndicator = ({ health, showText = true, size = 'md' }) => {
    const getHealthConfig = () => {
        switch (health) {
            case 'healthy':
                return {
                    color: 'green',
                    icon: '🟢',
                    text: 'Healthy',
                    bgClass: 'bg-green-500/10',
                    textClass: 'text-green-400',
                    borderClass: 'border-green-500/20'
                };
            case 'warning':
                return {
                    color: 'yellow',
                    icon: '🟡',
                    text: 'Warning',
                    bgClass: 'bg-yellow-500/10',
                    textClass: 'text-yellow-400',
                    borderClass: 'border-yellow-500/20'
                };
            case 'critical':
                return {
                    color: 'red',
                    icon: '🔴',
                    text: 'Critical',
                    bgClass: 'bg-red-500/10',
                    textClass: 'text-red-400',
                    borderClass: 'border-red-500/20'
                };
            default:
                return {
                    color: 'gray',
                    icon: '⚪',
                    text: 'Unknown',
                    bgClass: 'bg-gray-500/10',
                    textClass: 'text-gray-400',
                    borderClass: 'border-gray-500/20'
                };
        }
    };

    const config = getHealthConfig();

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2 py-1 text-xs',
        lg: 'px-3 py-1.5 text-sm'
    };

    if (!showText) {
        return <span className="text-lg">{config.icon}</span>;
    }

    return (
        <span className={`inline-flex items-center gap-1 rounded font-medium border ${config.bgClass} ${config.textClass} ${config.borderClass} ${sizeClasses[size]}`}>
            {config.icon} {config.text}
        </span>
    );
};

export default HealthIndicator;
