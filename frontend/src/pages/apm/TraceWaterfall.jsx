import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, GitCommit, AlertCircle, ChevronRight, ChevronDown } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const TraceWaterfall = () => {
    const { traceId } = useParams();
    const navigate = useNavigate();
    const [trace, setTrace] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedSpans, setExpandedSpans] = useState({});

    useEffect(() => {
        const fetchTrace = async () => {
            try {
                const token = localStorage.getItem('token');
                // Support both potential endpoints (Standard vs OTel) if needed, 
                // but user used /api/otel/traces recently, so we keep that or fallback? 
                // Let's stick to the URL user manually added if it works, or use the standard one.
                // The user's manual code used /api/otel/traces/${traceId}. 
                // My apmRoutes has /api/apm/traces/${traceId}.
                // I will try to use the one that matches the data structure provided.
                // Since data keys are snake_case, it matches the manual 'otel' endpoint likely.
                // However, I'll stick to the user's apparent preference for the URL or just use the base url logic.
                // For safety, I will assume the route /api/otel/traces exits if user added it, otherwise /api/apm/traces.
                // I'll use the user's manual URL: /api/otel/traces/${traceId}

                const response = await axios.get(`${API_BASE_URL}/api/otel/traces/${traceId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data.success) {
                    const rawSpans = response.data.data.spans || [];

                    if (rawSpans.length > 0) {
                        // 1. Calculate base timestamps
                        // Handle potential key naming differences (raw snake_case vs mapped PascalCase)
                        const getStartTime = (s) => new Date(s.start_time || s.Timestamp).getTime();

                        const traceStart = Math.min(...rawSpans.map(s => getStartTime(s)));

                        // 2. Build Tree Structure
                        const spanMap = {};
                        const roots = [];

                        // Initialize map and enrich spans
                        rawSpans.forEach(s => {
                            const startTime = getStartTime(s);
                            // duration_ms is usually ms, Duration is usually ns.
                            const duration = (s.duration_ms !== undefined) ? Number(s.duration_ms) : (s.Duration / 1000000);

                            const spanId = s.span_id || s.SpanId;

                            spanMap[spanId] = {
                                ...s,
                                SpanId: spanId,
                                ParentSpanId: s.parent_span_id || s.ParentSpanId,
                                ServiceName: s.service_name || s.ServiceName,
                                SpanName: s.span_name || s.SpanName,
                                StatusCode: s.status_code || s.StatusCode,
                                startTimeMs: startTime,
                                relativeStart: startTime - traceStart,
                                durationMs: duration,
                                endRelative: (startTime - traceStart) + duration,
                                children: [],
                                depth: 0
                            };
                        });

                        // Link parents and children
                        Object.values(spanMap).forEach(span => {
                            if (span.ParentSpanId && spanMap[span.ParentSpanId]) {
                                spanMap[span.ParentSpanId].children.push(span);
                            } else {
                                roots.push(span);
                            }
                        });

                        // Sort children by start time
                        const sortChildren = (nodes) => {
                            nodes.sort((a, b) => a.startTimeMs - b.startTimeMs);
                            nodes.forEach(node => sortChildren(node.children));
                        };
                        sortChildren(roots);

                        // Flatten tree for rendering (DFS)
                        const flatList = [];
                        const traverse = (nodes, depth) => {
                            nodes.forEach(node => {
                                node.depth = depth;
                                flatList.push(node);
                                traverse(node.children, depth + 1);
                            });
                        };
                        traverse(roots, 0);

                        const totalDuration = Math.max(...flatList.map(s => s.endRelative));

                        // Auto-expand all
                        const initialExpanded = {};
                        rawSpans.forEach(s => {
                            const id = s.span_id || s.SpanId;
                            initialExpanded[id] = true;
                        });
                        setExpandedSpans(initialExpanded);

                        setTrace({
                            traceId,
                            spans: flatList,
                            spanMap,
                            totalDuration,
                            rootService: roots[0]?.ServiceName || 'Unknown'
                        });
                    }
                }
            } catch (error) {
                console.error("Failed to fetch trace details:", error);

                // Fallback: Try the other endpoint if the first one failed strictly on 404? 
                // Or just error out. 
            } finally {
                setLoading(false);
            }
        };
        fetchTrace();
    }, [traceId]);

    const toggleExpand = (spanId) => {
        setExpandedSpans(prev => ({ ...prev, [spanId]: !prev[spanId] }));
    };

    const isSpanVisible = (span) => {
        if (!span.ParentSpanId) return true; // Roots always visible

        // Safety check if spanMap logic failed or incomplete
        if (!trace.spanMap) return true;

        let current = trace.spanMap[span.ParentSpanId];
        while (current) {
            if (!expandedSpans[current.SpanId]) return false; // If any ancestor is collapsed
            if (!current.ParentSpanId) break;
            current = trace.spanMap[current.ParentSpanId];
        }
        return true;
    };

    const getSpanColor = (serviceName) => {
        const name = serviceName || 'Unknown';
        const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    if (loading) return <div className="p-6 text-text-secondary">Loading trace...</div>;
    if (!trace) return <div className="p-6 text-text-secondary">Trace not found</div>;

    return (
        <div className="p-6 h-full overflow-y-auto">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full text-text-secondary transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
                        <GitCommit className="text-accent-color" />
                        Trace: <span className="font-mono text-text-secondary text-base">{traceId}</span>
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

            <div className="bg-card-bg border border-white/10 rounded-lg p-6 overflow-hidden flex flex-col h-[calc(100vh-200px)]">
                {/* Header */}
                <div className="flex text-xs text-text-secondary border-b border-white/10 pb-2 mb-2 bg-card-bg z-10 shrink-0">
                    <div className="w-[35%] min-w-[300px] flex-shrink-0 pl-2 font-medium">Service & Operation</div>
                    <div className="flex-1 relative h-4 mx-4 border-l border-white/5 border-r border-white/5">
                        <span className="absolute left-0 -translate-x-1/2">0ms</span>
                        <span className="absolute left-1/4 -translate-x-1/2">{Math.round(trace.totalDuration * 0.25)}ms</span>
                        <span className="absolute left-1/2 -translate-x-1/2">{Math.round(trace.totalDuration * 0.5)}ms</span>
                        <span className="absolute left-3/4 -translate-x-1/2">{Math.round(trace.totalDuration * 0.75)}ms</span>
                        <span className="absolute right-0 translate-x-1/2">{Math.round(trace.totalDuration)}ms</span>
                    </div>
                    <div className="w-24 text-right flex-shrink-0 pr-2 font-medium">Duration</div>
                </div>

                {/* Spans List */}
                <div className="space-y-0.5 overflow-y-auto pr-2 flex-1 custom-scrollbar">
                    {trace.spans.map((span, i) => {
                        if (!isSpanVisible(span)) return null;

                        return (
                            <div key={i} className="group hover:bg-white/5 rounded-sm py-1.5 flex items-center text-sm relative transition-colors">
                                {/* Service Name Column with Indentation Lines */}
                                <div className="w-[35%] min-w-[300px] flex-shrink-0 flex items-center overflow-hidden relative">

                                    {/* Guide Lines */}
                                    {Array.from({ length: span.depth }).map((_, d) => (
                                        <div
                                            key={d}
                                            className="w-4 h-full flex-shrink-0 border-r border-white/5 absolute top-0"
                                            style={{ left: `${d * 16}px` }}
                                        />
                                    ))}

                                    {/* Current Level Indent & L-shape connector */}
                                    <div
                                        className="h-full flex-shrink-0 relative"
                                        style={{ width: `${span.depth * 16}px` }}
                                    >
                                        {span.depth > 0 && (
                                            <div className="absolute right-0 top-0 w-full h-1/2 border-b border-l border-white/10 rounded-bl-sm" style={{ left: '-8px', top: '-50%' }}></div>
                                        )}
                                    </div>

                                    {/* Toggle / Icon */}
                                    <div className="mr-1.5 z-10 flex-shrink-0">
                                        {span.children && span.children.length > 0 ? (
                                            <button onClick={() => toggleExpand(span.SpanId)} className="p-0.5 hover:bg-white/10 rounded text-text-secondary hover:text-text-primary transition-colors">
                                                {expandedSpans[span.SpanId] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                            </button>
                                        ) : (
                                            <div className="w-4.5" />
                                        )}
                                    </div>

                                    <div className="truncate pr-2 z-10 min-w-0" title={`${span.ServiceName}: ${span.SpanName}`}>
                                        <div className="font-medium text-text-primary text-xs leading-tight truncate">{span.ServiceName}</div>
                                        <div className="text-[11px] text-text-secondary truncate opacity-80">{span.SpanName}</div>
                                    </div>
                                </div>

                                {/* Gantt Bar Area */}
                                <div className="flex-1 relative h-6 mx-4 border-l border-r border-white/5">
                                    {/* Grid lines in background */}
                                    <div className="absolute inset-0 w-full h-full flex pointer-events-none">
                                        <div className="w-1/4 border-r border-dashed border-white/5 h-full"></div>
                                        <div className="w-1/4 border-r border-dashed border-white/5 h-full"></div>
                                        <div className="w-1/4 border-r border-dashed border-white/5 h-full"></div>
                                        <div className="w-1/4 border-r border-dashed border-white/5 h-full"></div>
                                    </div>

                                    <div
                                        className={`absolute h-3.5 rounded-sm top-1.5 ${getSpanColor(span.ServiceName)} opacity-80 group-hover:opacity-100 transition-all shadow-sm`}
                                        style={{
                                            left: `${(span.relativeStart / trace.totalDuration) * 100}%`,
                                            width: `${Math.max((span.durationMs / trace.totalDuration) * 100, 0.2)}%`,
                                            minWidth: '2px'
                                        }}
                                    ></div>

                                    {span.StatusCode === 'Error' && (
                                        <AlertCircle
                                            size={14}
                                            className="absolute text-red-500 top-1 -ml-5 bg-card-bg rounded-full z-10"
                                            style={{ left: `${(span.relativeStart / trace.totalDuration) * 100}%` }}
                                        />
                                    )}

                                    {/* Label next to bar if short */}
                                    <span
                                        className="absolute top-1 text-[10px] text-text-secondary ml-2 whitespace-nowrap pointer-events-none"
                                        style={{ left: `${((span.relativeStart + span.durationMs) / trace.totalDuration) * 100}%` }}
                                    >
                                        {span.durationMs < 50 ? `${Math.round(span.durationMs)}ms` : ''}
                                    </span>
                                </div>

                                {/* Duration Column */}
                                <div className="w-24 text-right flex-shrink-0 px-2 font-mono text-xs text-text-secondary group-hover:text-text-primary">
                                    {span.durationMs < 0.1 ? '< 0.1ms' : `${Math.round(span.durationMs)}ms`}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default TraceWaterfall;
