import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, GitCommit, AlertCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const TraceWaterfall = () => {
    const { traceId } = useParams();
    const navigate = useNavigate();
    const [trace, setTrace] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTrace = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get(`${API_BASE_URL}/api/otel/traces/${traceId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data.success) {
                    // Normalize spans
                    const spans = response.data.data.spans || [];
                    // Calculate relative start times
                    if (spans.length > 0) {
                        const traceStart = Math.min(...spans.map(s => new Date(s.Timestamp).getTime()));
                        const enrichedSpans = spans.map(s => {
                            const startTime = new Date(s.Timestamp).getTime();
                            const duration = s.Duration / 1000000; // ns to ms
                            return {
                                ...s,
                                startTimeMs: startTime,
                                relativeStart: startTime - traceStart,
                                durationMs: duration,
                                endRelative: (startTime - traceStart) + duration
                            };
                        }).sort((a, b) => a.startTimeMs - b.startTimeMs);

                        const totalDuration = Math.max(...enrichedSpans.map(s => s.endRelative));

                        setTrace({
                            traceId,
                            spans: enrichedSpans,
                            totalDuration,
                            rootService: enrichedSpans[0]?.ServiceName
                        });
                    }
                }
            } catch (error) {
                console.error("Failed to fetch trace details:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTrace();
    }, [traceId]);

    const getSpanColor = (serviceName) => {
        // Simple hash to color
        const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500'];
        let hash = 0;
        for (let i = 0; i < serviceName.length; i++) {
            hash = serviceName.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    if (loading) return <div className="p-6 text-text-secondary">Loading trace...</div>;
    if (!trace) return <div className="p-6 text-text-secondary">Trace not found</div>;

    return (
        <div className="p-6 h-full overflow-y-auto">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full text-text-secondary">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
                        <GitCommit className="text-accent-color" />
                        Trace: <span className="font-mono text-text-secondary">{traceId}</span>
                    </h1>
                    <div className="flex items-center gap-4 text-sm text-text-secondary mt-1">
                        <div className="flex items-center gap-1">
                            <Clock size={14} /> {Math.round(trace.totalDuration)}ms total
                        </div>
                        <div>
                            {trace.spans.length} spans
                        </div>
                        <div>
                            Root: <span className="text-text-primary font-medium">{trace.rootService}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-card-bg border border-white/10 rounded-lg p-6 overflow-x-auto">
                <div className="min-w-[800px]">
                    <div className="flex text-xs text-text-secondary border-b border-white/10 pb-2 mb-2">
                        <div className="w-64 flex-shrink-0">Service & Operation</div>
                        <div className="flex-1 relative h-4">
                            <span className="absolute left-0">0ms</span>
                            <span className="absolute left-1/4">{Math.round(trace.totalDuration * 0.25)}ms</span>
                            <span className="absolute left-1/2">{Math.round(trace.totalDuration * 0.5)}ms</span>
                            <span className="absolute left-3/4">{Math.round(trace.totalDuration * 0.75)}ms</span>
                            <span className="absolute right-0">{Math.round(trace.totalDuration)}ms</span>
                        </div>
                        <div className="w-24 text-right flex-shrink-0">Duration</div>
                    </div>

                    <div className="space-y-1">
                        {trace.spans.map((span, i) => (
                            <div key={i} className="group hover:bg-white/5 rounded py-1 flex items-center text-sm">
                                <div className="w-64 flex-shrink-0 px-2 truncate">
                                    <div className="font-medium text-text-primary truncate" title={span.ServiceName}>{span.ServiceName}</div>
                                    <div className="text-xs text-text-secondary truncate" title={span.SpanName}>{span.SpanName}</div>
                                </div>
                                <div className="flex-1 relative h-6 mx-2">
                                    <div
                                        className={`absolute h-4 rounded top-1 ${getSpanColor(span.ServiceName)} opacity-80 group-hover:opacity-100 transition-opacity`}
                                        style={{
                                            left: `${(span.relativeStart / trace.totalDuration) * 100}%`,
                                            width: `${Math.max((span.durationMs / trace.totalDuration) * 100, 0.5)}%`
                                        }}
                                        title={`${span.ServiceName}: ${span.SpanName} (${Math.round(span.durationMs)}ms)`}
                                    ></div>
                                    {span.StatusCode === 'Error' && (
                                        <AlertCircle
                                            size={14}
                                            className="absolute text-red-500 top-1.5 -ml-5"
                                            style={{ left: `${(span.relativeStart / trace.totalDuration) * 100}%` }}
                                        />
                                    )}
                                </div>
                                <div className="w-24 text-right flex-shrink-0 px-2 font-mono text-xs text-text-secondary">
                                    {Math.round(span.durationMs)}ms
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TraceWaterfall;
