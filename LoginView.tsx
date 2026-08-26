import React, { useState } from 'react';
import { supabase } from './supabaseClient';

interface LoginViewProps {
    onLoginSuccess: () => void;
    onSwitchToSignUp: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onSwitchToSignUp }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!email || !password) {
            setError('Please fill in all fields.');
            return;
        }
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
        } else {
            onLoginSuccess();
        }
        setLoading(false);
    };

    return (
        <div className="flex w-full min-h-screen font-['Inter',sans-serif]">
            {/* Left side — form */}
            <div className="w-full lg:w-[55%] bg-white flex flex-col justify-center px-8 sm:px-16 xl:px-24 py-12">
                {/* Logo */}
                <div className="flex items-center gap-2 mb-12">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                        </svg>
                    </div>
                    <span className="text-sm font-semibold text-gray-800 tracking-tight">Kediaman Corp</span>
                </div>

                {/* Heading */}
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Sign in to Kediaman Corp</h1>
                <p className="text-gray-500 text-sm mb-8">Pick up where the studio left off.</p>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Email */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                            Work email
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                </svg>
                            </span>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                placeholder="you@company.com"
                                required
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Password
                            </label>
                            <button
                                type="button"
                                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium hover:underline"
                            >
                                Forgot password?
                            </button>
                        </div>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                </svg>
                            </span>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                placeholder="••••••••"
                                required
                                autoComplete="current-password"
                            />
                        </div>
                    </div>

                    {error && (
                        <p className="text-sm text-center text-red-500 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg text-sm transition disabled:opacity-70 disabled:cursor-not-allowed"
                        disabled={loading}
                    >
                        {loading ? 'Signing in...' : 'Sign in'}
                    </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-4 my-6">
                    <hr className="flex-1 border-gray-200" />
                    <span className="text-xs text-gray-400 font-medium">OR</span>
                    <hr className="flex-1 border-gray-200" />
                </div>

                {/* Switch to signup */}
                <p className="text-center text-sm text-gray-500">
                    New to Kediaman Corp?{' '}
                    <button
                        onClick={onSwitchToSignUp}
                        className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                    >
                        Create an account
                    </button>
                </p>
            </div>

            {/* Right side — dark panel, desktop only */}
            <div className="hidden lg:flex lg:w-[45%] bg-gray-900 flex-col justify-center px-12 xl:px-16 py-12">
                <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase mb-8">
                    Calendar Tracking System
                </p>
                <h2 className="text-3xl xl:text-4xl font-bold text-amber-400 leading-snug mb-10">
                    From first conversation to final payment, without retyping anything at the handoffs.
                </h2>
                <ul className="space-y-4">
                    {[
                        'Kelola semua data dealing dalam satu tempat',
                        'Pantau jadwal venue dan kalender event',
                        'Laporan dan grafik real-time',
                        'Manajemen tim marketing yang efisien',
                    ].map((item) => (
                        <li key={item} className="flex items-start gap-3">
                            <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                            </span>
                            <span className="text-sm text-gray-200 leading-relaxed">{item}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default LoginView;
