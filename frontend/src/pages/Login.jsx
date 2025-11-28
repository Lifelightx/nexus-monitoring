import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const result = await login(email, password);
        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg-dark">
            <div className="glass p-8 rounded-2xl w-full max-w-md">
                <h2 className="text-3xl font-bold text-white mb-6 text-center">Welcome Back</h2>
                {error && <div className="bg-red-500/20 text-red-400 p-3 rounded mb-4">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-text-secondary mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-slate-800/50 border border-white/10 rounded-lg p-3 text-white focus:border-accent outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-text-secondary mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-800/50 border border-white/10 rounded-lg p-3 text-white focus:border-accent outline-none"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-accent hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-colors"
                    >
                        Login
                    </button>
                </form>
                <p className="text-text-secondary text-center mt-6">
                    Don't have an account? <Link to="/signup" className="text-accent hover:underline">Sign up</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
