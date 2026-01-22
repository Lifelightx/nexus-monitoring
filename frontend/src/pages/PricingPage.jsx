import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const PricingPage = () => {
    return (
        <div className="bg-slate-50 min-h-screen text-slate-900 selection:bg-accent selection:text-white">
            <Navbar />
            <main className="pt-32 pb-24">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h1 className="text-5xl font-bold mb-6 text-slate-900">Fair & Transparent Pricing</h1>
                        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                            Scale your monitoring as you grow. No hidden fees, no surprises.
                        </p>
                    </div>

                    {/* Comparison Table */}
                    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden mb-24">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr>
                                        <th className="p-6 border-b border-slate-100 bg-slate-50 w-1/4"></th>
                                        <th className="p-6 border-b border-slate-100 bg-slate-50 w-1/4 text-center">
                                            <div className="text-xl font-bold mb-2">Starter</div>
                                            <div className="text-3xl font-bold text-slate-900">₹0</div>
                                            <div className="text-sm text-slate-500">Free Forever</div>
                                        </th>
                                        <th className="p-6 border-b border-slate-100 bg-blue-50/50 w-1/4 text-center relative">
                                            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-accent text-white text-xs font-bold px-3 py-1 rounded-b-lg">RECOMMENDED</div>
                                            <div className="text-xl font-bold mb-2 text-accent">Pro</div>
                                            <div className="text-3xl font-bold text-slate-900">₹999</div>
                                            <div className="text-sm text-slate-500">per month</div>
                                        </th>
                                        <th className="p-6 border-b border-slate-100 bg-slate-50 w-1/4 text-center">
                                            <div className="text-xl font-bold mb-2">Enterprise</div>
                                            <div className="text-3xl font-bold text-slate-900">Custom</div>
                                            <div className="text-sm text-slate-500">Contact Us</div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { category: "Usage" },
                                        { name: "Servers included", starter: "5", pro: "20", ent: "Unlimited" },
                                        { name: "Data Retention", starter: "15 Days", pro: "45 Days", ent: "1 Year+" },
                                        { name: "Team Members", starter: "3", pro: "10", ent: "Unlimited" },

                                        { category: "Features" },
                                        { name: "Real-time Metrics", starter: true, pro: true, ent: true },
                                        { name: "Docker Monitoring", starter: true, pro: true, ent: true },
                                        { name: "Advanced Alerts", starter: true, pro: true, ent: true },
                                        { name: "AI Anomaly Detection", starter: false, pro: true, ent: true },
                                        { name: "Distributed Tracing", starter: false, pro: true, ent: true },
                                        { name: "Custom Dashboards", starter: false, pro: true, ent: true },

                                        { category: "Support" },
                                        { name: "Email Support", starter: "Community", pro: "Priority", ent: "24/7 Dedicated" },
                                        { name: "SLA Guarantee", starter: false, pro: "99.9%", ent: "99.99%" },
                                        { name: "On-boarding", starter: false, pro: false, ent: true },
                                    ].map((row, i) => (
                                        row.category ? (
                                            <tr key={i} className="bg-slate-50">
                                                <td colSpan="4" className="p-4 px-6 text-sm font-bold text-slate-500 uppercase tracking-wider">{row.category}</td>
                                            </tr>
                                        ) : (
                                            <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                                <td className="p-4 px-6 font-medium text-slate-700">{row.name}</td>
                                                <td className="p-4 text-center text-slate-600">
                                                    {typeof row.starter === 'boolean' ? (
                                                        row.starter ? <i className="fas fa-check text-green-500"></i> : <i className="fas fa-minus text-slate-300"></i>
                                                    ) : row.starter}
                                                </td>
                                                <td className="p-4 text-center text-slate-900 font-medium bg-blue-50/20">
                                                    {typeof row.pro === 'boolean' ? (
                                                        row.pro ? <i className="fas fa-check text-accent"></i> : <i className="fas fa-minus text-slate-300"></i>
                                                    ) : row.pro}
                                                </td>
                                                <td className="p-4 text-center text-slate-600">
                                                    {typeof row.ent === 'boolean' ? (
                                                        row.ent ? <i className="fas fa-check text-green-500"></i> : <i className="fas fa-minus text-slate-300"></i>
                                                    ) : row.ent}
                                                </td>
                                            </tr>
                                        )
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td className="p-6"></td>
                                        <td className="p-6 text-center">
                                            <a href="/signup" className="block w-full py-2 rounded-lg border border-slate-300 font-semibold hover:bg-slate-50 transition-colors">Start Free</a>
                                        </td>
                                        <td className="p-6 text-center bg-blue-50/20">
                                            <a href="/signup" className="block w-full py-2 rounded-lg bg-accent text-white font-semibold hover:bg-blue-600 transition-colors shadow-lg shadow-accent/20">Get Pro</a>
                                        </td>
                                        <td className="p-6 text-center">
                                            <a href="/contact" className="block w-full py-2 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors">Contact Sales</a>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* FAQ */}
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-3xl font-bold mb-10 text-center">Frequently Asked Questions</h2>
                        <div className="grid gap-6">
                            {[
                                { q: "Can I upgrade or downgrade at any time?", a: "Yes, you can change your plan at any time. Prorated charges will apply automatically." },
                                { q: "Is there a limit on data ingestion?", a: "We have fair usage limits based on your plan tier. Enterprise plans have custom limits tailored to your needs." },
                                { q: "Do you offer discounts for open source projects?", a: "Yes! If you are an open-source maintainer, contact us for a free Pro plan license." },
                                { q: "What payment methods do you accept?", a: "We accept all major credit cards, UPI (India), and invoicing for Enterprise plans." }
                            ].map((faq, i) => (
                                <div key={i} className="bg-white p-6 rounded-xl border border-slate-200">
                                    <h3 className="text-lg font-bold mb-2 text-slate-900">{faq.q}</h3>
                                    <p className="text-slate-600">{faq.a}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default PricingPage;
