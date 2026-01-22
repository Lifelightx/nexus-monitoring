import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Features from '../components/Features';
import Services from '../components/Services';
import Footer from '../components/Footer';
import Pricing from '../components/Pricing';

const LandingPage = () => {
    return (
        <div className="bg-slate-50 text-slate-900 min-h-screen selection:bg-accent selection:text-white">
            <Navbar />
            <main>
                <Hero />
                <Features />
                <Services />
                <Pricing />
            </main>
            <Footer />
        </div>
    );
};

export default LandingPage;
