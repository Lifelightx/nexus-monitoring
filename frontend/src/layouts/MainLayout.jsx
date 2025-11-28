import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/dashboard/Sidebar';
import DashboardNavbar from '../components/dashboard/DashboardNavbar';

const MainLayout = () => {
    const [showGuide, setShowGuide] = useState(true);

    return (
        <div className="min-h-screen bg-bg-dark text-text-primary font-sans">
            <DashboardNavbar
                showGuideButton={!showGuide}
                onToggleGuide={() => setShowGuide(true)}
            />

            <Sidebar />

            <main className="pl-64 pt-16 min-h-screen transition-all duration-300">
                <div className="p-8 max-w-7xl mx-auto">
                    <Outlet context={{ showGuide, setShowGuide }} />
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
