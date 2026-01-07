import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockServices, getGlobalMetrics } from '../../mockData/services';
import { mockTraces } from '../../mockData/traces';
import MetricCard from '../../components/shared/MetricCard';
import HealthIndicator from '../../components/shared/HealthIndicator';
import MetricSparkline from '../../components/shared/MetricSparkline';

const GlobalDashboard = () => {
    const navigate = useNavigate();
    const globalMetrics = getGlobalMetrics();

    // Generate sparkline data
    const generateSparklineData = (count = 20) => {
        return Array.from({ length: count }, () => Math.random() * 100);
    };

    // Get top slow services
    const topSlowServices = [...mockServices]
        .sort((a, b) => b.metrics.p95Latency - a.metrics.p95Latency)
        .slice(0, 5);

    // Get recent error traces
    const errorTraces = mockTraces.filter(t => t.status >= 400).slice(0, 5);

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">APM Dashboard</h2>
                <p className="text-text-secondary mt-1">Application Performance Monitoring Overview</p>
            </div>

            {/* Global Health */}
            <div className="bg-gradient-to-r from-sky-500/10 to-purple-500/10 backdrop-blur-sm p-6 rounded-xl border border-white/10 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-white mb-2">Global Health</h3>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <i className="fas fa-cube text-sky-400"></i>
                                <span className="text-white font-medium">Services: {globalMetrics.totalServices}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-green-400">🟢 {globalMetrics.healthyServices}</span>
                                <span className="text-yellow-400">🟡 {globalMetrics.warningServices}</span>
                                <span className="text-red-400">🔴 {globalMetrics.criticalServices}</span>
                            </div>
                            {globalMetrics.problemCount > 0 && (
                                <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <i className="fas fa-exclamation-triangle text-red-400"></i>
                                    <span className="text-red-400 font-medium">{globalMetrics.problemCount} Problem{globalMetrics.problemCount > 1 ? 's' : ''}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/services')}
                        className="px-4 py-2 bg-accent hover:bg-accent/80 text-white rounded-lg transition-colors font-medium"
                    >
                        View All Services
                    </button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <MetricCard
                    title="Request Rate"
                    value={globalMetrics.totalRequestsPerMin}
                    unit="req/min"
                    icon="fas fa-tachometer-alt"
                    color="accent"
                    subtitle={`${(globalMetrics.totalRequestsPerMin / 60).toFixed(1)} req/s`}
                />
                <MetricCard
                    title="Error Rate"
                    value={globalMetrics.avgErrorRate}
                    unit="%"
                    icon="fas fa-exclamation-circle"
                    color={globalMetrics.avgErrorRate > 1 ? 'red' : globalMetrics.avgErrorRate > 0.5 ? 'yellow' : 'green'}
                />
                <MetricCard
                    title="Avg Latency (P95)"
                    value={globalMetrics.avgLatency}
                    unit="ms"
                    icon="fas fa-clock"
                    color={globalMetrics.avgLatency > 800 ? 'red' : globalMetrics.avgLatency > 500 ? 'yellow' : 'green'}
                />
            </div>

            {/* Top Slow Services */}
            <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <i className="fas fa-exclamation-triangle text-yellow-400"></i>
                        Top Slow Services (P95)
                    </h3>
                    <button
                        onClick={() => navigate('/services')}
                        className="text-accent hover:text-white transition-colors text-sm"
                    >
                        View All →
                    </button>
                </div>
                <div className="space-y-3">
                    {topSlowServices.map((service) => (
                        <div
                            key={service.id}
                            onClick={() => navigate(`/services/${service.name}`)}
                            className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer group"
                        >
                            <div className="flex items-center gap-3 flex-1">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500/20 to-purple-500/20 flex items-center justify-center border border-white/10">
                                    <i className="fas fa-cube text-sky-400"></i>
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-white group-hover:text-accent transition-colors">{service.name}</p>
                                    <p className="text-xs text-text-secondary">{service.type} • {service.host}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="w-32">
                                    <MetricSparkline
                                        data={generateSparklineData()}
                                        color={service.health === 'critical' ? '#f87171' : '#fbbf24'}
                                        height={30}
                                    />
                                </div>
                                <div className="text-right">
                                    <p className={`text-xl font-bold ${service.metrics.p95Latency > 800 ? 'text-red-400' : 'text-yellow-400'
                                        }`}>
                                        {service.metrics.p95Latency}ms
                                    </p>
                                    <p className="text-xs text-text-secondary">
                                        +{service.metrics.p95Latency - service.baseline.p95Latency}ms vs baseline
                                    </p>
                                </div>
                                <HealthIndicator health={service.health} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Errors and Services Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Error Traces */}
                <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <i className="fas fa-bug text-red-400"></i>
                            Recent Errors
                        </h3>
                        <button
                            onClick={() => navigate('/traces')}
                            className="text-accent hover:text-white transition-colors text-sm"
                        >
                            View All →
                        </button>
                    </div>
                    <div className="space-y-2">
                        {errorTraces.length > 0 ? errorTraces.map((trace) => (
                            <div
                                key={trace.id}
                                onClick={() => navigate(`/traces/${trace.id}`)}
                                className="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-white text-sm">{trace.service}</span>
                                    <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                                        {trace.status}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-text-secondary">
                                    <span>{trace.method} {trace.path}</span>
                                    <span>{trace.duration}ms</span>
                                </div>
                                {trace.error && (
                                    <p className="text-xs text-red-400 mt-1">{trace.error}</p>
                                )}
                            </div>
                        )) : (
                            <div className="text-center py-8 text-text-secondary">
                                <i className="fas fa-check-circle text-3xl text-green-400 mb-2"></i>
                                <p>No recent errors</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Services Health Summary */}
                <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <i className="fas fa-heartbeat text-green-400"></i>
                        Services Health
                    </h3>
                    <div className="space-y-3">
                        {mockServices.slice(0, 5).map((service) => (
                            <div
                                key={service.id}
                                onClick={() => navigate(`/services/${service.name}`)}
                                className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500/20 to-purple-500/20 flex items-center justify-center border border-white/10">
                                        <i className="fas fa-cube text-sky-400 text-sm"></i>
                                    </div>
                                    <div>
                                        <p className="font-medium text-white text-sm group-hover:text-accent transition-colors">{service.name}</p>
                                        <p className="text-xs text-text-secondary">{service.metrics.requestsPerMin} req/min</p>
                                    </div>
                                </div>
                                <HealthIndicator health={service.health} size="sm" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlobalDashboard;
