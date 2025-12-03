import React, { useEffect } from 'react';

const Notification = ({ type, message, onClose }) => {
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                onClose();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [message, onClose]);

    if (!message) return null;

    const isSuccess = type === 'success';

    return (
        <div className={`fixed top-24 right-8 z-50 max-w-sm w-full bg-bg-card backdrop-blur-xl shadow-2xl rounded-r-lg overflow-hidden border-l-4 ${isSuccess ? 'border-green-500' : 'border-red-500'} animate-slide-in`}>
            <div className="p-4 flex items-start">
                <div className="flex-shrink-0">
                    {isSuccess ? (
                        <i className="fas fa-check-circle text-green-500 text-xl"></i>
                    ) : (
                        <i className="fas fa-exclamation-circle text-red-500 text-xl"></i>
                    )}
                </div>
                <div className="ml-3 w-0 flex-1 pt-0.5">
                    <p className="text-sm font-bold text-text-primary">
                        {isSuccess ? 'Success' : 'Error'}
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
