import React from 'react';

const PricingCard = ({ title, price, features, recommended = false }) => (
    <div className={`p-8 rounded-2xl transition-transform duration-300 hover:-translate-y-2 border ${recommended
            ? 'bg-slate-900 text-white border-accent shadow-xl shadow-accent/20 scale-105 z-10'
            : 'bg-white text-slate-800 border-slate-200 hover:border-accent/50 hover:shadow-lg'
        }`}>
        {recommended && (
            <div className="text-accent text-sm font-bold uppercase tracking-wider mb-4">
                Recommended
            </div>
        )}
        <h3 className={`text-2xl font-bold mb-2 ${recommended ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
        <div className="mb-6">
            <span className="text-4xl font-bold">₹{price}</span>
            <span className={`text-sm ${recommended ? 'text-slate-400' : 'text-slate-500'}`}>/month</span>
        </div>
        <ul className="space-y-4 mb-8">
            {features.map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                    <i className="fas fa-check text-accent"></i>
                    <span className={recommended ? 'text-slate-300' : 'text-slate-600'}>{feature}</span>
                </li>
            ))}
        </ul>
        <button className={`w-full py-3 rounded-lg font-bold transition-colors ${recommended
                ? 'bg-accent hover:bg-blue-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
            }`}>
            Choose Plan
        </button>
    </div>
);

const Pricing = () => {
    const plans = [
        {
            title: "Starter",
            price: "0",
            features: [
                "Up to 5 Servers",
                "15 Days Data Retention",
                "Basic Metrics",
                "Email Alerts",
                "Community Support"
            ]
        },
        {
            title: "Pro",
            price: "999",
            recommended: true,
            features: [
                "Up to 20 Servers",
                "45 Days Data Retention",
                "Advanced AI Anomaly Detection",
                "Custom Dashboards",
                "Priority Email Support",
                "Distributed Tracing"
            ]
        },
        {
            title: "Enterprise",
            price: "4,999",
            features: [
                "Unlimited Servers",
                "1 Year Data Retention",
                "24/7 Dedicated Support",
                "SSO & Advanced Security",
                "Custom Integrations",
                "On-premise Deployment"
            ]
        }
    ];

    return (
        <section id="pricing" className="py-24 bg-slate-50">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold mb-4 text-slate-900">Simple, Transparent Pricing</h2>
                    <p className="text-slate-600 max-w-2xl mx-auto">
                        Choose the plan that's right for your team. No hidden fees.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
                    {plans.map((plan, index) => (
                        <PricingCard key={index} {...plan} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Pricing;
