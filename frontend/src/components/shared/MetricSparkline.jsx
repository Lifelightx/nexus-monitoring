import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

/**
 * MetricSparkline Component
 * Displays a small inline chart for showing metric trends
 * @param {array} data - Array of data points [{value: number}]
 * @param {string} color - Line color (hex or color name)
 * @param {number} height - Chart height in pixels
 */
const MetricSparkline = ({ data = [], color = '#38bdf8', height = 40 }) => {
    if (!data || data.length === 0) {
        return null;
    }

    // Transform data if needed
    const chartData = data.map((value, index) => ({
        index,
        value: typeof value === 'number' ? value : value.value
    }));

    return (
        <div className="w-full" style={{ height: `${height}px` }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default MetricSparkline;
