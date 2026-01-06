import React, { useEffect } from 'react';

const Notification = ({ type, message, onClose }) => {
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000); // Changed to 3 seconds
            return () => clearTimeout(timer);
        }
    }, [message, onClose]);

    if (!message) return null;

    const getStyles = () => {
        switch (type) {
            case 'success':
                return {
                    border: 'border-green-500',
                    icon: 'fa-check-circle text-green-500',
                    title: 'Success'
                };
            case 'error':
                return {
                    border: 'border-red-500',
                    icon: 'fa-exclamation-circle text-red-500',
                    title: 'Error'
                };
            case 'warning':
                return {
                    border: 'border-yellow-500',
                    icon: 'fa-exclamation-triangle text-yellow-500',
                    title: 'Warning'
                };
            default:
                return {
                    border: 'border-blue-500',
                    icon: 'fa-info-circle text-blue-500',
                    title: 'Info'
                };
        }
    };

    const styles = getStyles();

    return (
        <div className={`fixed top-24 right-8 z-50 max-w-sm w-full bg-bg-card backdrop-blur-xl shadow-2xl rounded-r-lg overflow-hidden border-l-4 ${styles.border} animate-slide-in`}>
            <div className="p-4 flex items-start">
                <div className="flex-shrink-0">
                    <i className={`fas ${styles.icon} text-xl`}></i>
                </div>
                <div className="ml-3 w-0 flex-1 pt-0.5">
                    <p className="text-sm font-bold text-text-primary">
                        {styles.title}
                    </p>
                    <p className="mt-1 text-sm text-text-secondary">
                        {message}
                    </p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                    <button
                        className="bg-transparent rounded-md inline-flex text-text-secondary hover:text-text-primary focus:outline-none"
                        onClick={onClose}
                    >
                        <span className="sr-only">Close</span>
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Notification;
