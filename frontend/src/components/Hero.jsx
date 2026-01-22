import React from 'react';

import heroDashboard from '../assets/hero-dashboard.png';

const Hero = () => {
    return (
        <section className="relative pt-32 pb-20 overflow-hidden bg-gradient-to-b from-white to-slate-50">
            <div className="container mx-auto px-6 relative z-10">
                <div className="flex flex-col lg:flex-row items-center gap-12">
                    <div className="lg:w-1/2 text-center lg:text-left">
                        <div className="inline-block px-4 py-1.5 mb-6 rounded-full bg-blue-50 text-accent font-semibold text-sm">
                            New: Advanced AI Anomaly Detection
                        </div>
                        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight text-slate-900 text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700">
                            Monitor Everything.<br />Everywhere.
                        </h1>
                        <p className="text-xl text-slate-600 mb-8 leading-relaxed max-w-lg mx-auto lg:mx-0">
                            The most advanced monitoring platform for modern engineering teams. Real-time insights, AI-powered alerts, and seamless integration.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            <a href="#pricing" className="bg-accent hover:bg-blue-600 text-white px-8 py-3.5 rounded-lg font-bold text-lg shadow-xl shadow-accent/20 transition-all hover:-translate-y-1">
                                Start Free Trial
                            </a>
                            <a href="#features" className="px-8 py-3.5 rounded-lg font-bold text-lg text-slate-700 hover:text-accent border border-slate-200 hover:border-accent/50 bg-white transition-all">
                                Learn More
                            </a>
                        </div>
                        <div className="mt-8 flex items-center justify-center lg:justify-start gap-8 text-slate-400 grayscale opacity-70">
                            <i className="fab fa-aws text-3xl"></i>
                            <i className="fab fa-google text-3xl"></i>
                            <i className="fab fa-microsoft text-3xl"></i>
                            <i className="fab fa-docker text-3xl"></i>
                        </div>
                    </div>
                    <div className="lg:w-1/2 relative">
                        <div className="absolute inset-0 bg-accent/20 blur-[100px] rounded-full"></div>
                        <img
                            src={heroDashboard}
                            alt="Nexus Monitor Dashboard"
                            className="relative z-10 rounded-xl shadow-2xl border border-slate-200/50 backdrop-blur-sm transform hover:scale-[1.02] transition-transform duration-500"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
