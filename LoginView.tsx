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
        <div className="card p-8 md:p-12 w-full max-w-md fade-in">
            <h3 className="text-xl font-semibold text-center text-[var(--color-text-primary)] mb-2">Welcome Back!</h3>
            <p className="text-center text-[var(--color-text-secondary)] mb-8">Sign in to continue to your dashboard.</p>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Email</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 form-input"
                        placeholder="youremail@example.com"
                        required
                        autoComplete="email"
                    />
                </div>
                <div>
                    <label htmlFor="password"className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Password</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 form-input"
                        placeholder="••••••••"
                        required
                        autoComplete="current-password"
                    />
                </div>
                {error && <p className="text-sm text-center text-red-500">{error}</p>}
                <button
                    type="submit"
                    className="w-full btn-primary py-3 disabled:opacity-70 disabled:cursor-not-allowed"
                    disabled={loading}
                >
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>

            <p className="mt-8 text-center text-sm text-[var(--color-text-secondary)]">
                Don't have an account?{' '}
                <button onClick={onSwitchToSignUp} className="font-semibold text-[var(--color-primary)] hover:underline">
                    Sign Up
                </button>
            </p>
        </div>
    );
};

export default LoginView;
