import React from 'react';

const Footer = () => {
    return (
        <footer id="contact" className="bg-slate-900/80 border-t border-white/10 pt-16 pb-8">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                    <div className="col-span-1 md:col-span-1">
                        <a href="#" className="text-2xl font-bold text-accent flex items-center gap-2 mb-4">
                            <i className="fas fa-bolt"></i> NEXUS
                        </a>
                        <p className="text-text-secondary">
                            Empowering developers to build reliable software with world-class monitoring tools.
                        </p>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-6">Product</h4>
                        <ul className="space-y-3">
                            {['Features', 'Integrations', 'Pricing', 'Changelog'].map(item => (
                                <li key={item}><a href="#" className="text-text-secondary hover:text-accent transition-colors">{item}</a></li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-6">Resources</h4>
                        <ul className="space-y-3">
                            {['Documentation', 'API Reference', 'Blog', 'Community'].map(item => (
                                <li key={item}><a href="#" className="text-text-secondary hover:text-accent transition-colors">{item}</a></li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-6">Company</h4>
                        <ul className="space-y-3">
                            {['About Us', 'Careers', 'Legal', 'Contact'].map(item => (
                                <li key={item}><a href="#" className="text-text-secondary hover:text-accent transition-colors">{item}</a></li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-8 text-center text-text-secondary">
                    <p>&copy; 2024 Nexus Monitor Inc. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
