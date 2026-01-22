import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const DocSection = ({ id, title, children }) => (
    <div id={id} className="mb-16 scroll-mt-32">
        <h2 className="text-3xl font-bold mb-6 text-slate-900 pb-2 border-b border-slate-200">{title}</h2>
        <div className="prose prose-slate max-w-none text-slate-600">
            {children}
        </div>
    </div>
);

const CodeBlock = ({ code, language = 'bash' }) => (
    <div className="my-4 bg-slate-900 rounded-lg p-4 overflow-x-auto">
        <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-mono text-slate-400 uppercase">{language}</span>
            <button className="text-xs text-accent hover:text-white transition-colors">Copy</button>
        </div>
        <pre className="text-sm font-mono text-slate-200 m-0"><code>{code}</code></pre>
    </div>
);

const DocumentationPage = () => {
    const [activeSection, setActiveSection] = useState('introduction');

    const scrollTo = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            setActiveSection(id);
        }
    };

    const sidebarLinks = [
        { id: 'introduction', label: 'Introduction' },
        { id: 'quick-start', label: 'Quick Start' },
        { id: 'installation', label: 'Agent Installation' },
        { id: 'configuration', label: 'Configuration' },
        { id: 'dashboards', label: 'Using Dashboards' },
        { id: 'api-reference', label: 'API Reference' }
    ];

    return (
        <div className="bg-slate-50 min-h-screen text-slate-900 selection:bg-accent selection:text-white">
            <Navbar />

            <div className="container mx-auto px-6 pt-24">
                <div className="flex flex-col lg:flex-row gap-12">
                    {/* Sidebar */}
                    <div className="lg:w-64 flex-shrink-0 hidden lg:block">
                        <div className="sticky top-24 pt-8 pb-12">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Table of Contents</h3>
                            <nav className="space-y-1">
                                {sidebarLinks.map(link => (
                                    <button
                                        key={link.id}
                                        onClick={() => scrollTo(link.id)}
                                        className={`block w-full text-left px-4 py-2 text-sm rounded-lg transition-colors ${activeSection === link.id
                                                ? 'bg-blue-50 text-accent font-medium'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                            }`}
                                    >
                                        {link.label}
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </div>

                    {/* Content */}
                    <main className="lg:flex-1 py-8 lg:pt-8 min-h-[80vh]">
                        <DocSection id="introduction" title="Introduction">
                            <p className="text-lg leading-relaxed mb-4">
                                Welcome to Nexus Monitor documentation. Nexus Monitor is a comprehensive observability platform designed for modern engineering teams. It provides real-time monitoring for your servers, applications, and networks.
                            </p>
                            <p className="mb-4">
                                Whether you're monitoring a single server or a distributed kubernetes cluster, Nexus Monitor enables you to detect issues before they impact your users.
                            </p>
                        </DocSection>

                        <DocSection id="quick-start" title="Quick Start">
                            <p className="mb-4">
                                Getting started with Nexus Monitor is easy. You can be up and running in less than 5 minutes.
                            </p>
                            <ol className="list-decimal pl-5 space-y-2 mb-4">
                                <li>Sign up for a free account.</li>
                                <li>Create a new project.</li>
                                <li>Install the agent on your server.</li>
                                <li>View your metrics in the dashboard.</li>
                            </ol>
                        </DocSection>

                        <DocSection id="installation" title="Agent Installation">
                            <p className="mb-4">
                                The Nexus Agent is a lightweight binary that collects metrics and logs from your system. To install it, run the following command on your Linux server:
                            </p>
                            <CodeBlock code="curl -sL https://get.nexus-monitor.com/install.sh | sudo bash" />
                            <p className="mt-4 mb-4">
                                For Docker environments, you can run the agent as a container:
                            </p>
                            <CodeBlock code={`docker run -d \\
  --name nexus-agent \\
  --net host \\
  --pid host \\
  -v /var/run/docker.sock:/var/run/docker.sock \\
  -e NEXUS_API_KEY=your_api_key \\
  nexusmonitor/agent:latest`} />
                        </DocSection>

                        <DocSection id="configuration" title="Configuration">
                            <p className="mb-4">
                                The agent is configured via a YAML file located at <code>/etc/nexus-agent/config.yaml</code>.
                                By default, it collects cpu, memory, and disk metrics.
                            </p>
                            <p className="mb-4">
                                You can enable additional plugins like PostgreSQL, Redis, or Nginx monitoring by editing this file.
                            </p>
                        </DocSection>

                        <DocSection id="dashboards" title="Using Dashboards">
                            <p className="mb-4">
                                Once your data is flowing, you can visualize it using our powerful dashboarding tools.
                            </p>
                            <ul className="list-disc pl-5 space-y-2 mb-4">
                                <li><strong>Overview:</strong> High-level health status of your infrastructure.</li>
                                <li><strong>Metrics Explorer:</strong> Deep dive into specific metric queries.</li>
                                <li><strong>Alerts:</strong> Configure threshold-based or anomaly-based alerts.</li>
                            </ul>
                        </DocSection>

                        <DocSection id="api-reference" title="API Reference">
                            <p className="mb-4">
                                Nexus Monitor exposes a REST API for programmatically accessing your data and configuration.
                            </p>
                            <p>
                                View the full <a href="http://localhost:3000/api-docs" target="_blank" className="text-accent underline hover:text-blue-600">Swagger API Documentation</a>.
                            </p>
                        </DocSection>
                    </main>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default DocumentationPage;
