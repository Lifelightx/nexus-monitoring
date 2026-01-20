import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getTraceDetails } from '../../services/otelService';

const OTelTraceDetails = () => {
    const { traceId } = useParams();
    const [trace, setTrace] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchTraceDetails = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await getTraceDetails(traceId);
                if (response.success) {
                    setTrace(response.data);
                } else {
                    setError('Failed to fetch trace details');
                }
            } catch (err) {
                console.error('Error fetching trace details:', err);
                setError('Failed to load trace details: ' + err.message);
            } finally {
                setLoading(false);
            }
        };

        if (traceId) {
            fetchTraceDetails();
        }
    }, [traceId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
                <p className="ml-4 text-text-secondary">Loading trace details...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                ⚠️ {error}
            </div>
        );
    }

    if (!trace || !trace.spans || trace.spans.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-text-secondary">No trace data found</p>
            </div>
        );
    }

    // Calculate trace duration
    const spans = trace.spans;
    const startTime = Math.min(...spans.map(s => new Date(s.Timestamp).getTime()));
    const endTime = Math.max(...spans.map(s => new Date(s.Timestamp).getTime() + (s.Duration / 1000000)));
    const totalDuration = endTime - startTime;

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Trace Details</h2>
                <p className="text-text-secondary mt-1 font-mono text-sm">{traceId}</p>
            </div>

            {/* Trace Summary */}
            <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Total Duration</p>
                        <p className="text-xl font-bold text-white">{Math.round(totalDuration)}ms</p>
                    </div>
                    <div>
                        <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Spans</p>
                        <p className="text-xl font-bold text-white">{spans.length}</p>
                    </div>
                    <div>
                        <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Services</p>
                        <p className="text-xl font-bold text-white">
                            {new Set(spans.map(s => s.ServiceName)).size}
                        </p>
                    </div>
                    <div>
                        <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Start Time</p>
                        <p className="text-xl font-bold text-white">
                            {new Date(startTime).toLocaleTimeString()}
                        </p>
                    </div>
                </div>
            </div>

            {/* Span Timeline */}
            <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5">
                <h3 className="text-lg font-semibold text-white mb-4">Span Timeline</h3>

                <div className="space-y-2">
                    {spans.map((span, index) => {
                        const spanStart = new Date(span.Timestamp).getTime() - startTime;
                        const spanDuration = span.Duration / 1000000; // Convert to ms
                        const leftPercent = (spanStart / totalDuration) * 100;
                        const widthPercent = (spanDuration / totalDuration) * 100;

                        return (
                            <div key={index} className="group">
                                {/* Span Info */}
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-white font-mono">
                                            {span.SpanName}
                                        </span>
                                        <span className="px-2 py-0.5 rounded text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                            {span.ServiceName}
                                        </span>
                                    </div>
                                    <span className="text-sm text-text-secondary">
                                        {Math.round(spanDuration)}ms
                                    </span>
                                </div>

                                {/* Timeline Bar */}
                                <div className="relative h-8 bg-bg-primary/50 rounded">
                                    <div
                                        className="absolute h-full bg-accent/30 border-l-2 border-accent rounded group-hover:bg-accent/50 transition-colors"
                                        style={{
                                            left: `${leftPercent}%`,
                                            width: `${Math.max(widthPercent, 0.5)}%`
                                        }}
                                    >
                                        <div className="h-full flex items-center px-2">
                                            <span className="text-xs text-white font-mono truncate">
                                                {span.SpanId.substring(0, 8)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Span Attributes (expandable) */}
                                {span.SpanAttributes && Object.keys(span.SpanAttributes).length > 0 && (
                                    <details className="mt-2">
                                        <summary className="cursor-pointer text-xs text-text-secondary hover:text-accent">
                                            Show attributes
                                        </summary>
                                        <div className="mt-2 p-3 bg-bg-primary/30 rounded text-xs font-mono">
                                            {Object.entries(span.SpanAttributes).map(([key, value]) => (
                                                <div key={key} className="flex gap-2">
                                                    <span className="text-purple-400">{key}:</span>
                                                    <span className="text-text-secondary">{value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Timeline Scale */}
                <div className="mt-4 flex justify-between text-xs text-text-secondary">
                    <span>0ms</span>
                    <span>{Math.round(totalDuration)}ms</span>
                </div>
            </div>
        </div>
    );
};

export default OTelTraceDetails;
