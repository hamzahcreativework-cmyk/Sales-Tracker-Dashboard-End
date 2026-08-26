import React, { useState } from 'react';
import { supabase } from './supabaseClient';

interface SignUpViewProps {
    onSignUpSuccess: () => void;
    onSwitchToLogin: () => void;
}

const SignUpView: React.FC<SignUpViewProps> = ({ onSignUpSuccess, onSwitchToLogin }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!name || !email || !password || !confirmPassword) {
            setError('Please fill in all fields.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name.trim(),
                    role: 'User',
                },
            },
        });

        if (error) {
            setError(error.message);
        } else {
            // In a real app, you might want a message about email confirmation.
            // For this app, we assume immediate login on success.
            onSignUpSuccess();
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
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Buat Akun Baru</h1>
                <p className="text-gray-500 text-sm mb-8">Mulai perjalanan Anda bersama Kediaman Corp.</p>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Full Name */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                            Nama Lengkap
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                </svg>
                            </span>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                placeholder="John Doe"
                                required
                                autoComplete="name"
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1">
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
                                id="signup-email"
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
                        <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1">
                            Password
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                </svg>
                            </span>
                            <input
                                type="password"
                                id="signup-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                placeholder="••••••••"
                                required
                                autoComplete="new-password"
                            />
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                            Konfirmasi Password
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                                </svg>
                            </span>
                            <input
                                type="password"
                                id="confirm-password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                placeholder="••••••••"
                                required
                                autoComplete="new-password"
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
                        {loading ? 'Membuat Akun...' : 'Buat Akun'}
                    </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-4 my-6">
                    <hr className="flex-1 border-gray-200" />
                    <span className="text-xs text-gray-400 font-medium">OR</span>
                    <hr className="flex-1 border-gray-200" />
                </div>

                {/* Switch to login */}
                <p className="text-center text-sm text-gray-500">
                    Sudah punya akun?{' '}
                    <button
                        onClick={onSwitchToLogin}
                        className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                    >
                        Masuk sekarang
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

export default SignUpView;
