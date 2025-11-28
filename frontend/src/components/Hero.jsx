import React from 'react';

const Hero = () => {
    return (
        <section className="relative pt-40 pb-24 overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-accent/20 rounded-full blur-[100px] -z-10"></div>

            <div className="container mx-auto px-6 text-center relative z-10">
                <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                    Monitor Everything.<br />Everywhere. All at Once.
                </h1>
                <p className="text-xl text-text-secondary mb-10 max-w-2xl mx-auto">
                    The most advanced monitoring platform for modern engineering teams. Real-time insights, AI-powered alerts, and seamless integration.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="#" className="bg-gradient-to-r from-accent to-blue-600 text-white px-8 py-3 rounded-full font-bold text-lg shadow-lg shadow-accent/20 hover:shadow-accent/40 hover:-translate-y-1 transition-all">
                        Start Free Trial
                    </a>
                    <a href="#features" className="border-2 border-white/10 text-white px-8 py-3 rounded-full font-bold text-lg hover:border-accent hover:text-accent transition-all">
                        Learn More
                    </a>
                </div>
            </div>
        </section>
    );
};

export default Hero;
