import React from 'react';

/**
 * MetricCard Component
 * Displays a metric with title, value, and optional trend
 * @param {string} title - Metric title
 * @param {string|number} value - Metric value
 * @param {string} unit - Unit of measurement
 * @param {string} icon - FontAwesome icon class
 * @param {string} color - Accent color (accent, purple, green, orange, red, blue)
 * @param {number} trend - Percentage change (positive or negative)
 * @param {string} subtitle - Additional information
 * @param {array} sparklineData - Optional sparkline data for mini chart
 */
const MetricCard = ({
    title,
    value,
    unit = '',
    icon,
    color = 'accent',
    trend = null,
    subtitle = null,
    sparklineData = null
}) => {
    const colorClasses = {
        accent: 'border-l-sky-500',
        purple: 'border-l-purple-500',
        green: 'border-l-green-500',
        orange: 'border-l-orange-500',
        red: 'border-l-red-500',
        blue: 'border-l-blue-500',
        yellow: 'border-l-yellow-500'
    };

    const iconColorClasses = {
        accent: 'text-sky-400',
        purple: 'text-purple-400',
        green: 'text-green-400',
        orange: 'text-orange-400',
        red: 'text-red-400',
        blue: 'text-blue-400',
        yellow: 'text-yellow-400'
    };

    const getTrendDisplay = () => {
        if (trend === null || trend === undefined) return null;

        const isPositive = trend > 0;
        const isNegative = trend < 0;

        return (
            <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-red-400' : isNegative ? 'text-green-400' : 'text-gray-400'
                }`}>
                <i className={`fas fa-arrow-${isPositive ? 'up' : isNegative ? 'down' : 'right'}`}></i>
                <span>{Math.abs(trend)}%</span>
                <span className="text-text-secondary">vs baseline</span>
            </div>
        );
    };

    return (
        <div className={`bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5 border-l-4 ${colorClasses[color]} hover:bg-bg-secondary transition-all`}>
            <div className="flex items-start justify-between mb-2">
                <h3 className="text-text-secondary text-xs font-bold uppercase tracking-wider">{title}</h3>
                {icon && <i className={`${icon} ${iconColorClasses[color]}`}></i>}
            </div>

            <div className="flex items-baseline gap-2 mb-2">
                <p className="text-3xl font-bold text-white">{value}</p>
                {unit && <span className="text-sm font-normal text-text-secondary">{unit}</span>}
            </div>

            {getTrendDisplay()}

            {subtitle && (
                <p className="text-xs text-text-secondary mt-2">{subtitle}</p>
            )}

            {sparklineData && sparklineData.length > 0 && (
                <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div
                        className={`bg-${color === 'accent' ? 'sky' : color}-500 h-full rounded-full transition-all duration-500`}
                        style={{ width: `${value}%` }}
                    ></div>
                </div>
            )}
        </div>
    );
};

export default MetricCard;
