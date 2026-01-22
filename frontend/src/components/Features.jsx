import React from 'react';

const FeatureCard = ({ icon, title, description }) => (
    <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50 hover:-translate-y-2 transition-all duration-300 group">
        <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center text-2xl text-accent mb-6 group-hover:scale-110 transition-transform duration-300">
            <i className={`fas ${icon}`}></i>
        </div>
        <h3 className="text-xl font-bold mb-4 text-slate-900">{title}</h3>
        <p className="text-slate-600 leading-relaxed">{description}</p>
    </div>
);

const Features = () => {
    const features = [
        {
            icon: "fa-chart-line",
            title: "Real-time Analytics",
            description: "Visualize your data with millisecond precision. Our dashboard updates instantly as data flows in."
        },
        {
            icon: "fa-shield-alt",
            title: "Bank-grade Security",
            description: "End-to-end encryption and compliance with SOC2, GDPR, and HIPAA standards."
        },
        {
            icon: "fa-robot",
            title: "AI Anomaly Detection",
            description: "Our ML models learn your system's behavior and alert you to anomalies before they become outages."
        },
        {
            icon: "fa-network-wired",
            title: "Distributed Tracing",
            description: "Trace requests across microservices to pinpoint bottlenecks and latency issues instantly."
        }
    ];

    return (
        <section id="features" className="py-24 bg-white">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold mb-4 text-slate-900">Why Choose Nexus?</h2>
                    <p className="text-slate-600 max-w-2xl mx-auto">
                        We provide the tools you need to keep your systems running smoothly, 24/7.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {features.map((feature, index) => (
                        <FeatureCard key={index} {...feature} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Features;
