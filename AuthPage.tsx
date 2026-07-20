import React, { useState } from 'react';
import LoginView from './LoginView';
import SignUpView from './SignUpView';

interface AuthPageProps {
    onAuthSuccess: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
    const [view, setView] = useState<'login' | 'signup'>('login');

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[var(--color-background)]">
            {view === 'login' ? (
                <LoginView onLoginSuccess={onAuthSuccess} onSwitchToSignUp={() => setView('signup')} />
            ) : (
                <SignUpView onSignUpSuccess={onAuthSuccess} onSwitchToLogin={() => setView('login')} />
            )}
        </div>
    );
};

export default AuthPage;