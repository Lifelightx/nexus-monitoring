import React from 'react';

const Services = () => {
    return (
        <section id="services" className="py-24">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold mb-4 text-white">Our Services</h2>
                    <p className="text-text-secondary max-w-2xl mx-auto">
                        Comprehensive solutions tailored for your enterprise needs.
                    </p>
                </div>

                {/* Service 1 */}
                <div className="flex flex-col md:flex-row items-center gap-16 mb-24">
                    <div className="flex-1">
                        <h3 className="text-3xl font-bold mb-6 text-white">Cloud Infrastructure Monitoring</h3>
                        <p className="text-text-secondary mb-8 text-lg">
                            Gain complete visibility into your AWS, Azure, or GCP infrastructure. We automatically discover and map your resources.
                        </p>
                        <ul className="space-y-4">
                            {['Auto-scaling support', 'Cost optimization insights', 'Multi-cloud dashboard'].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-text-primary">
                                    <i className="fas fa-check text-accent"></i> {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="flex-1 h-[400px] glass rounded-2xl flex items-center justify-center text-8xl text-text-secondary/20">
                        <i className="fas fa-cloud"></i>
                    </div>
                </div>

                {/* Service 2 */}
                <div className="flex flex-col md:flex-row-reverse items-center gap-16">
                    <div className="flex-1">
                        <h3 className="text-3xl font-bold mb-6 text-white">Application Performance Management</h3>
                        <p className="text-text-secondary mb-8 text-lg">
                            Deep dive into your code performance. Identify slow queries, memory leaks, and error hotspots.
                        </p>
                        <ul className="space-y-4">
                            {['Code-level profiling', 'Error tracking & replay', 'User experience monitoring'].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-text-primary">
                                    <i className="fas fa-check text-accent"></i> {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="flex-1 h-[400px] glass rounded-2xl flex items-center justify-center text-8xl text-text-secondary/20">
                        <i className="fas fa-code"></i>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Services;
