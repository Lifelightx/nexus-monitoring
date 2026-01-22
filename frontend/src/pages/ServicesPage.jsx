import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const FeatureDetail = ({ icon, title, description, details }) => (
    <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50 hover:-translate-y-1 transition-transform duration-300">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl text-accent mb-6">
            <i className={`fas ${icon}`}></i>
        </div>
        <h3 className="text-2xl font-bold mb-4 text-slate-900">{title}</h3>
        <p className="text-slate-600 mb-6 text-lg">{description}</p>
        <ul className="space-y-3">
            {details.map((detail, i) => (
                <li key={i} className="flex items-start gap-3 text-slate-700">
                    <i className="fas fa-check-circle text-accent mt-1"></i>
                    <span>{detail}</span>
                </li>
            ))}
        </ul>
    </div>
);

const ServicesPage = () => {
    const services = [
        {
            icon: "fa-server",
            title: "Infrastructure Monitoring",
            description: "Complete visibility into your entire stack, from bare metal servers to cloud instances and containers.",
            details: [
                "Real-time CPU, Memory, and Disk metrics",
                "Docker Container & Orchestration monitoring",
                "Network traffic analysis & bandwidth tracking",
                "Process-level resource usage insights",
                "Automatic discovery of new assets"
            ]
        },
        {
            icon: "fa-code-branch",
            title: "Application Performance",
            description: "Trace every request across your distributed systems. Identify latency bottlenecks and optimize code.",
            details: [
                "Distributed Tracing (OpenTelemetry support)",
                "Service Map visualization",
                "Latency heatmap & percentile analysis",
                "Database query profiling",
                "Error rate tracking & stack trace capture"
            ]
        },
        {
            icon: "fa-file-alt",
            title: "Log Management",
            description: "Centralized logging for all your services. Search, filter, and analyze logs in real-time.",
            details: [
                "Structured logging support (JSON, etc.)",
                "Full-text search with regex capabilities",
                "Contextual log viewing from traces",
                "Live log tailing",
                "Long-term archival & retention policies"
            ]
        },
        {
            icon: "fa-bell",
            title: "Smart Alerting",
            description: "Get notified about what matters. Reduce alert fatigue with AI-powered anomaly detection.",
            details: [
                "Multi-channel alerts (Slack, Email, PagerDuty)",
                "Dynamic thresholds based on ML baselines",
                "Alert aggregation & deduplication",
                "Customizable escalation policies",
                "Maintenance windows & silence rules"
            ]
        },
        {
            icon: "fa-lock",
            title: "Security & Compliance",
            description: "Ensure your infrastructure is secure and compliant with industry standards.",
            details: [
                "Vulnerability scanning for containers",
                "Audit logs for all user actions",
                "Role-Based Access Control (RBAC)",
                "SOC2 & HIPAA compliance helper reports",
                "Data encryption at rest and in transit"
            ]
        },
        {
            icon: "fa-project-diagram",
            title: "Integrations",
            description: "Connect with your existing tools and workflows seamlessly.",
            details: [
                "Cloud Providers (AWS, Azure, GCP)",
                "CI/CD Pipelines (GitHub Actions, Jenkins)",
                "Communication Tools (Slack, Teams)",
                "Ticket Systems (Jira, Linear)",
                "Custom Webhooks"
            ]
        }
    ];

    return (
        <div className="bg-slate-50 min-h-screen text-slate-900 selection:bg-accent selection:text-white">
            <Navbar />
            <main className="pt-32 pb-24">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-20">
                        <h1 className="text-5xl font-bold mb-6 text-slate-900">Our Capabilities</h1>
                        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                            Nexus Monitor provides a comprehensive suite of tools to ensure the reliability, performance, and security of your digital infrastructure.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {services.map((service, index) => (
                            <FeatureDetail key={index} {...service} />
                        ))}
                    </div>

                    {/* CTA Section */}
                    <div className="mt-24 p-12 bg-white rounded-3xl border border-slate-200 shadow-xl text-center relative overflow-hidden">
                        <div className="relative z-10">
                            <h2 className="text-3xl font-bold mb-6">Ready to see it in action?</h2>
                            <p className="text-slate-600 mb-8 max-w-2xl mx-auto">
                                Start your free trial today and get full access to all features. No credit card required.
                            </p>
                            <a href="/signup" className="inline-block bg-accent hover:bg-blue-600 text-white px-8 py-3.5 rounded-lg font-bold text-lg shadow-lg shadow-accent/20 transition-all hover:-translate-y-1">
                                Get Started Now
                            </a>
                        </div>
                        {/* Decorative background */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default ServicesPage;
