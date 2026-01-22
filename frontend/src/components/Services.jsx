import React from 'react';

import serverRoom from '../assets/server-room.png';
import devMonitoring from '../assets/dev-monitoring.png';

const Services = () => {
    return (
        <section id="services" className="py-24 bg-slate-50">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold mb-4 text-slate-900">Our Services</h2>
                    <p className="text-slate-600 max-w-2xl mx-auto">
                        Comprehensive solutions tailored for your enterprise needs.
                    </p>
                </div>

                {/* Service 1 */}
                <div className="flex flex-col lg:flex-row items-center gap-16 mb-24">
                    <div className="flex-1">
                        <div className="inline-block px-4 py-1 mb-4 rounded-full bg-blue-100 text-accent font-semibold text-sm">
                            Infrastructure
                        </div>
                        <h3 className="text-3xl font-bold mb-6 text-slate-900">Cloud Infrastructure Monitoring</h3>
                        <p className="text-slate-600 mb-8 text-lg leading-relaxed">
                            Gain complete visibility into your AWS, Azure, or GCP infrastructure. We automatically discover and map your resources, providing you with a unified view of your entire stack.
                        </p>
                        <ul className="space-y-4">
                            {['Auto-scaling support', 'Cost optimization insights', 'Multi-cloud dashboard', 'Real-time resource tracking'].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-slate-700">
                                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs">
                                        <i className="fas fa-check"></i>
                                    </div>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="flex-1 relative group">
                        <div className="absolute inset-0 bg-accent/10 rounded-2xl transform rotate-3 transition-transform group-hover:rotate-6"></div>
                        <img
                            src={serverRoom}
                            alt="Server Room"
                            className="relative rounded-2xl shadow-xl w-full h-[400px] object-cover"
                        />
                    </div>
                </div>

                {/* Service 2 */}
                <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
                    <div className="flex-1">
                        <div className="inline-block px-4 py-1 mb-4 rounded-full bg-purple-100 text-purple-600 font-semibold text-sm">
                            APM
                        </div>
                        <h3 className="text-3xl font-bold mb-6 text-slate-900">Application Performance Management</h3>
                        <p className="text-slate-600 mb-8 text-lg leading-relaxed">
                            Deep dive into your code performance. Identify slow queries, memory leaks, and error hotspots with our advanced tracing and profiling tools to ensure optimal user experience.
                        </p>
                        <ul className="space-y-4">
                            {['Code-level profiling', 'Error tracking & replay', 'User experience monitoring', 'Distributed transaction tracing'].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-slate-700">
                                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs">
                                        <i className="fas fa-check"></i>
                                    </div>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="flex-1 relative group">
                        <div className="absolute inset-0 bg-purple-500/10 rounded-2xl transform -rotate-3 transition-transform group-hover:-rotate-6"></div>
                        <img
                            src={devMonitoring}
                            alt="Developer Monitoring"
                            className="relative rounded-2xl shadow-xl w-full h-[400px] object-cover"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Services;
