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
        <div className="card p-8 md:p-12 w-full max-w-md fade-in">
            <h3 className="text-xl font-semibold text-center text-[var(--color-text-primary)] mb-2">Create an Account</h3>
            <p className="text-center text-[var(--color-text-secondary)] mb-8">Get started by creating your new account.</p>

            <form onSubmit={handleSubmit} className="space-y-6">
                 <div>
                    <label htmlFor="name" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Full Name</label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 form-input"
                        placeholder="John Doe"
                        required
                        autoComplete="name"
                    />
                </div>
                <div>
                    <label htmlFor="signup-email" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Email</label>
                    <input
                        type="email"
                        id="signup-email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 form-input"
                        placeholder="youremail@example.com"
                        required
                        autoComplete="email"
                    />
                </div>
                <div>
                    <label htmlFor="signup-password"className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Password</label>
                    <input
                        type="password"
                        id="signup-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 form-input"
                        placeholder="••••••••"
                        required
                        autoComplete="new-password"
                    />
                </div>
                <div>
                    <label htmlFor="confirm-password"className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Confirm Password</label>
                    <input
                        type="password"
                        id="confirm-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 form-input"
                        placeholder="••••••••"
                        required
                        autoComplete="new-password"
                    />
                </div>

                {error && <p className="text-sm text-center text-red-500">{error}</p>}

                <button
                    type="submit"
                    className="w-full btn-primary py-3 disabled:opacity-70 disabled:cursor-not-allowed"
                    disabled={loading}
                >
                    {loading ? 'Creating Account...' : 'Create Account'}
                </button>
            </form>

            <p className="mt-8 text-center text-sm text-[var(--color-text-secondary)]">
                Already have an account?{' '}
                <button onClick={onSwitchToLogin} className="font-semibold text-[var(--color-primary)] hover:underline">
                    Login
                </button>
            </p>
        </div>
    );
};

export default SignUpView;
