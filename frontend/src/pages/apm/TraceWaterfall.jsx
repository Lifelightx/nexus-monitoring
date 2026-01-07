import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTrace, getTraceAnalysis } from '../../services/apmService';

const TraceWaterfall = () => {
    const { traceId } = useParams();
    const navigate = useNavigate();
    const [trace, setTrace] = useState(null);
    const [spans, setSpans] = useState([]);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchTraceData = async () => {
            try {
                setLoading(true);
                setError(null);

                console.log('🔍 Fetching trace data for traceId:', traceId);

                // Fetch trace and spans
                const traceData = await getTrace(traceId);
                console.log('✅ Trace data received:', traceData);

                setTrace(traceData.trace);
                setSpans(traceData.spans || []);

                // Fetch analysis
                try {
                    const analysisData = await getTraceAnalysis(traceId);
                    console.log('✅ Analysis data received:', analysisData);
                    setAnalysis(analysisData);
                } catch (analysisErr) {
                    console.warn('⚠️ Analysis fetch failed (non-critical):', analysisErr);
                    // Analysis is optional, don't fail the whole page
                }
            } catch (err) {
                console.error('❌ Error fetching trace:', err);
                setError('Failed to load trace data: ' + err.message);
            } finally {
                setLoading(false);
            }
        };

        if (traceId) {
            fetchTraceData();
        }
    }, [traceId]);

    // Build span hierarchy
    const buildSpanTree = (spans) => {
        const spanMap = {};
        const rootSpans = [];

        // Create map
        spans.forEach(span => {
            spanMap[span.span_id] = { ...span, children: [] };
        });

        // Build tree
        spans.forEach(span => {
            if (span.parent_span_id && spanMap[span.parent_span_id]) {
                spanMap[span.parent_span_id].children.push(spanMap[span.span_id]);
            } else {
                rootSpans.push(spanMap[span.span_id]);
            }
        });

        return rootSpans;
    };

    // Render span row with detailed information
    const renderSpan = (span, depth = 0, traceStartTime) => {
        const startOffset = ((new Date(span.start_time) - new Date(traceStartTime)) / trace.duration_ms) * 100;
        const width = (span.duration_ms / trace.duration_ms) * 100;

        const typeColors = {
            http: 'bg-blue-500',
            db: 'bg-green-500',
            external: 'bg-orange-500',
            internal: 'bg-purple-500'
        };

        const typeIcons = {
            http: 'fa-globe',
            db: 'fa-database',
            external: 'fa-arrow-right',
            internal: 'fa-code'
        };

        // Extract meaningful details based on span type
        const getSpanDetails = () => {
            if (span.type === 'db') {
                return {
                    title: `${span.metadata.db_type?.toUpperCase() || 'DB'}: ${span.metadata.db_operation || 'query'}`,
                    subtitle: span.metadata.db_collection || span.metadata.db_table || 'unknown',
                    detail: span.metadata.db_query || '',
                    icon: 'fa-database'
                };
            } else if (span.type === 'external') {
                return {
                    title: `${span.metadata.external_method || 'GET'} ${span.metadata.external_host || 'external'}`,
                    subtitle: span.metadata.external_url || '',
                    detail: `Status: ${span.metadata.external_status_code || 'N/A'}`,
                    icon: 'fa-arrow-right'
                };
            } else if (span.type === 'http') {
                return {
                    title: `${span.metadata.http_method || 'GET'} ${span.metadata.http_url || '/'}`,
                    subtitle: `Status: ${span.metadata.http_status_code || 'N/A'}`,
                    detail: '',
                    icon: 'fa-globe'
                };
            }
            return {
                title: span.name,
                subtitle: span.type,
                detail: '',
                icon: 'fa-code'
            };
        };

        const details = getSpanDetails();

        return (
            <div key={span.span_id} className="span-row-group">
                <div className="flex items-start py-3 px-4 hover:bg-white/5 transition-colors border-b border-white/5 group">
                    {/* Span info - Left side */}
                    <div className="w-2/5 pr-4" style={{ paddingLeft: `${depth * 24}px` }}>
                        <div className="flex items-start gap-3">
                            {/* Type indicator */}
                            <div className={`w-8 h-8 rounded-lg ${typeColors[span.type] || 'bg-gray-500'} bg-opacity-20 flex items-center justify-center flex-shrink-0 mt-1`}>
                                <i className={`fas ${typeIcons[span.type] || 'fa-code'} text-sm ${typeColors[span.type]?.replace('bg-', 'text-') || 'text-gray-400'}`}></i>
                            </div>

                            {/* Span details */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-white truncate">{details.title}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[span.type]?.replace('bg-', 'bg-') + '/20 border ' + typeColors[span.type]?.replace('bg-', 'border-') + '/30 ' + typeColors[span.type]?.replace('bg-', 'text-')}`}>
                                        {span.type}
                                    </span>
                                </div>
                                {details.subtitle && (
                                    <p className="text-xs text-text-secondary truncate font-mono">{details.subtitle}</p>
                                )}
                                {details.detail && (
                                    <p className="text-xs text-text-secondary mt-1 truncate">{details.detail}</p>
                                )}
                                {span.metadata?.error && (
                                    <div className="flex items-center gap-1 mt-1">
                                        <i className="fas fa-exclamation-circle text-red-400 text-xs"></i>
                                        <span className="text-xs text-red-400">{span.metadata.error_message || 'Error occurred'}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Timeline - Right side */}
                    <div className="w-3/5 relative h-12 flex items-center">
                        <div
                            className={`absolute h-8 rounded ${typeColors[span.type] || 'bg-gray-500'} opacity-80 hover:opacity-100 transition-all cursor-pointer group-hover:shadow-lg`}
                            style={{
                                left: `${startOffset}%`,
                                width: `${Math.max(width, 0.5)}%`
                            }}
                            title={`${span.name}\nDuration: ${span.duration_ms}ms\nStart: ${new Date(span.start_time).toLocaleTimeString()}`}
                        >
                            <div className="h-full flex items-center justify-center px-2">
                                <span className="text-xs text-white font-medium whitespace-nowrap">
                                    {span.duration_ms}ms
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Render children with increased depth */}
                {span.children && span.children.length > 0 && (
                    <div className="children-spans">
                        {span.children.map(child => renderSpan(child, depth + 1, traceStartTime))}
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
                <p className="ml-4 text-text-secondary">Loading trace...</p>
            </div>
        );
    }

    if (error || !trace) {
        return (
            <div className="text-center py-12">
                <i className="fas fa-exclamation-triangle text-4xl text-red-400 mb-3"></i>
                <p className="text-text-secondary">{error || 'Trace not found'}</p>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-4 px-4 py-2 bg-accent hover:bg-accent/80 text-white rounded-lg transition-colors"
                >
                    Go Back
                </button>
            </div>
        );
    }

    const spanTree = buildSpanTree(spans);
    const traceStartTime = trace.timestamp;

    return (
        <div>
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <button
                        onClick={() => navigate(-1)}
                        className="text-accent hover:text-white transition-colors mb-2 flex items-center gap-2"
                    >
                        <i className="fas fa-arrow-left"></i>
                        Back
                    </button>
                    <h2 className="text-2xl font-bold text-white">Trace Details</h2>
                    <p className="text-text-secondary mt-1 font-mono text-sm">{trace.trace_id}</p>
                </div>
                <div className="text-right">
                    <p className="text-text-secondary text-sm">Service</p>
                    <p className="text-white font-medium">{trace.service_name}</p>
                </div>
            </div>

            {/* Trace Info */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-bg-secondary/50 backdrop-blur-sm p-4 rounded-xl border border-white/5">
                    <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Endpoint</p>
                    <p className="text-white font-mono text-sm">{trace.endpoint}</p>
                </div>
                <div className="bg-bg-secondary/50 backdrop-blur-sm p-4 rounded-xl border border-white/5">
                    <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Duration</p>
                    <p className="text-2xl font-bold text-white">{trace.duration_ms}ms</p>
                </div>
                <div className="bg-bg-secondary/50 backdrop-blur-sm p-4 rounded-xl border border-white/5">
                    <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Status</p>
                    <p className={`text-2xl font-bold ${trace.status_code >= 400 ? 'text-red-400' : 'text-green-400'}`}>
                        {trace.status_code}
                    </p>
                </div>
                <div className="bg-bg-secondary/50 backdrop-blur-sm p-4 rounded-xl border border-white/5">
                    <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Spans</p>
                    <p className="text-2xl font-bold text-white">{spans.length}</p>
                </div>
            </div>

            {/* Performance Breakdown */}
            {analysis && (
                <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5 mb-6">
                    <h3 className="text-lg font-bold text-white mb-4">Performance Breakdown</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <p className="text-text-secondary text-sm mb-1">Database Time</p>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-bg-dark rounded-full h-2">
                                    <div
                                        className="bg-green-500 h-2 rounded-full"
                                        style={{ width: `${analysis.breakdown.db_percentage}%` }}
                                    ></div>
                                </div>
                                <span className="text-white font-medium">{analysis.breakdown.db_time}ms</span>
                                <span className="text-text-secondary text-sm">({analysis.breakdown.db_percentage}%)</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-text-secondary text-sm mb-1">Downstream Time</p>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-bg-dark rounded-full h-2">
                                    <div
                                        className="bg-orange-500 h-2 rounded-full"
                                        style={{ width: `${analysis.breakdown.downstream_percentage}%` }}
                                    ></div>
                                </div>
                                <span className="text-white font-medium">{analysis.breakdown.downstream_time}ms</span>
                                <span className="text-text-secondary text-sm">({analysis.breakdown.downstream_percentage}%)</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-text-secondary text-sm mb-1">Code Time</p>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-bg-dark rounded-full h-2">
                                    <div
                                        className="bg-purple-500 h-2 rounded-full"
                                        style={{ width: `${analysis.breakdown.code_percentage}%` }}
                                    ></div>
                                </div>
                                <span className="text-white font-medium">{analysis.breakdown.code_time}ms</span>
                                <span className="text-text-secondary text-sm">({analysis.breakdown.code_percentage}%)</span>
                            </div>
                        </div>
                    </div>

                    {/* Recommendations */}
                    {analysis.recommendations && analysis.recommendations.length > 0 && (
                        <div className="mt-4">
                            <p className="text-text-secondary text-sm mb-2">Recommendations:</p>
                            <div className="space-y-2">
                                {analysis.recommendations.map((rec, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-sm">
                                        <i className="fas fa-lightbulb text-yellow-400 mt-1"></i>
                                        <p className="text-text-secondary">{rec.message}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Waterfall */}
            <div className="bg-bg-secondary/50 backdrop-blur-sm rounded-xl border border-white/5 overflow-hidden">
                <div className="p-4 border-b border-white/5 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <i className="fas fa-stream text-purple-400"></i>
                        Span Timeline
                    </h3>
                    <p className="text-xs text-text-secondary mt-1">
                        Hierarchical view of all operations in this trace
                    </p>
                </div>
                <div className="overflow-x-auto">
                    {spans.length === 0 ? (
                        <div className="text-center py-12">
                            <i className="fas fa-info-circle text-4xl text-text-secondary mb-3 opacity-30"></i>
                            <p className="text-text-secondary mb-2">No spans captured for this trace</p>
                            <p className="text-xs text-text-secondary max-w-md mx-auto">
                                This trace doesn't contain any database queries or external HTTP calls.
                                Spans are automatically captured when your application makes database queries,
                                external API calls, or other instrumented operations.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Timeline header */}
                            <div className="flex items-center py-2 px-4 bg-bg-dark/50 border-b border-white/10 text-xs text-text-secondary uppercase tracking-wider">
                                <div className="w-2/5 pr-4 font-medium">Operation</div>
                                <div className="w-3/5 font-medium">Timeline ({trace.duration_ms}ms total)</div>
                            </div>
                            {/* Span rows */}
                            {spanTree.map(span => renderSpan(span, 0, traceStartTime))}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TraceWaterfall;
