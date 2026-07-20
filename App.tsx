import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import MainContent from './MainContent';
import LaporanModal from './LaporanModal';
import { MenuIcon } from './Icons';
import AuthPage from './AuthPage';
import { supabase } from './supabaseClient';
import { LaporanDatabaseEntry, UserRole } from './types';
import type { User } from '@supabase/supabase-js';
import ImagePreviewModal from './ImagePreviewModal';

export type ActiveView =
    | { type: 'Dashboard' }
    | { type: 'DataDealing' }
    | { type: 'VenueDetail'; venueName: string }
    | { type: 'Grafik' }
    | { type: 'CalendarEvent'; venueName?: string; selectedEventId?: number }
    | { type: 'DataUser' }
    | { type: 'Marketing' }
    | { type: 'LaporanBitrix' }
    | { type: 'EventCounting' }
    | { type: 'Profile' };

export interface LaporanModalInfo {
    venue: string;
    marketingName: string;
}

const App: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [userRole, setUserRole] = useState<UserRole>('User');
    const [assignedVenue, setAssignedVenue] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeView, setActiveView] = useState<ActiveView>({ type: 'Dashboard' });
    const [laporanModalData, setLaporanModalData] = useState<LaporanModalInfo | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

    const fetchUserProfile = async (user: User | null) => {
        console.log('fetchUserProfile called for user:', user?.email, 'id:', user?.id);
        if (user) {
            try {
                console.log('Querying profiles for user id:', user.id);
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('role, assigned_venue')
                    .eq('id', user.id)
                    .maybeSingle(); // Use maybeSingle to avoid error if no profile exists

                console.log('Profile fetch result:', { profile, error, userId: user.id });
                if (error) {
                    console.error('Error fetching user profile:', error.message, 'for user:', user.email);
                    // If error, set default values
                    setUserRole('User');
                    setAssignedVenue(null);
                } else if (profile) {
                    console.log('Setting role:', profile.role, 'assigned_venue:', profile.assigned_venue, 'for user:', user.email);
                    setUserRole(profile.role as UserRole || 'User');
                    setAssignedVenue(profile.assigned_venue || null);
                } else {
                    // No profile found, set defaults
                    console.warn('No profile found for user:', user.email, 'id:', user.id, 'setting defaults');
                    setUserRole('User');
                    setAssignedVenue(null);
                }
            } catch (err) {
                console.error('Unexpected error in fetchUserProfile:', err, 'for user:', user?.email);
                setUserRole('User');
                setAssignedVenue(null);
            }
        } else {
            // Reset on logout
            console.log('No user, resetting profile');
            setUserRole('User');
            setAssignedVenue(null);
        }
        console.log('fetchUserProfile completed for user:', user?.email);
    };

    const fetchUserProfileWithRetry = async (user: User, retries = 3) => {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                console.log(`fetchUserProfileWithRetry attempt ${attempt}/${retries} for user:`, user.email);
                await fetchUserProfile(user);
                console.log('fetchUserProfileWithRetry succeeded on attempt', attempt);
                return; // Success, exit retry loop
            } catch (err) {
                console.error(`fetchUserProfileWithRetry attempt ${attempt} failed:`, err);
                if (attempt === retries) {
                    console.error('All retry attempts failed, setting defaults');
                    setUserRole('User');
                    setAssignedVenue(null);
                    throw err; // Re-throw after all retries
                }
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
    };

    useEffect(() => {
        console.log('🚀 App component mounted, initializing auth...');

        const checkSession = async () => {
            console.log('🔍 checkSession started at:', new Date().toISOString());
            setIsLoading(true);
            const timeout = setTimeout(() => {
                console.warn('⏰ checkSession timeout after 30s, forcing loading off but keeping auth state');
                setIsLoading(false);
                // Don't force logout, just stop loading to prevent infinite loading
            }, 30000); // Increased to 30 seconds

            try {
                console.log('📡 Calling supabase.auth.getSession()...');
                const startTime = Date.now();
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                const sessionTime = Date.now() - startTime;
                console.log('✅ getSession completed in', sessionTime, 'ms');

                if (sessionError) {
                    console.error('❌ Session error:', sessionError);
                    setIsAuthenticated(false);
                    setUser(null);
                    setUserRole('User');
                    setAssignedVenue(null);
                    return;
                }

                console.log('📋 Session retrieved:', !!session, 'user:', session?.user?.email);
                const user = session?.user ?? null;
                console.log('👤 User from session:', user?.email, 'id:', user?.id);
                setIsAuthenticated(!!session);
                setUser(user);

                // Don't wait for profile fetch - do it in background
                if (user) {
                    // Start profile fetch asynchronously without blocking
                    fetchUserProfileWithRetry(user).catch(err => {
                        console.error('Background profile fetch failed:', err);
                        // Set defaults if background fetch fails
                        setUserRole('User');
                        setAssignedVenue(null);
                    });
                } else {
                    setUserRole('User');
                    setAssignedVenue(null);
                }

                console.log('✅ checkSession completed successfully (profile fetch in background)');
            } catch (err) {
                console.error('💥 Unexpected error in checkSession:', err);
                setIsAuthenticated(false);
                setUser(null);
                setUserRole('User');
                setAssignedVenue(null);
            } finally {
                clearTimeout(timeout);
                setIsLoading(false);
                console.log('🏁 checkSession finished, loading state:', !isLoading);
            }
        };

        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            console.log('🔄 Auth state change:', _event, 'session user:', session?.user?.email, 'id:', session?.user?.id);
            setIsLoading(true);
            const timeout = setTimeout(() => {
                console.warn('⏰ Auth state change timeout after 30s, forcing loading off');
                setIsLoading(false);
            }, 30000); // Increased to 30 seconds

            try {
                const user = session?.user ?? null;
                console.log('🔄 Setting user from auth change:', user?.email, 'id:', user?.id);
                setIsAuthenticated(!!session);
                setUser(user);

                // Don't wait for profile fetch - do it in background
                if (user) {
                    // Start profile fetch asynchronously without blocking
                    fetchUserProfileWithRetry(user).catch(err => {
                        console.error('Background profile fetch failed:', err);
                        // Set defaults if background fetch fails
                        setUserRole('User');
                        setAssignedVenue(null);
                    });
                } else {
                    setUserRole('User');
                    setAssignedVenue(null);
                }
            } catch (err) {
                console.error('💥 Unexpected error in auth state change:', err);
                setIsAuthenticated(false);
                setUser(null);
                setUserRole('User');
                setAssignedVenue(null);
            } finally {
                clearTimeout(timeout);
                setIsLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);


    const handleCloseModal = () => {
        setLaporanModalData(null);
    };

    const handleLogout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Error logging out:', error.message);
                // Show user-friendly message but continue clearing local state
                // so the UI doesn't stay stuck.
                // eslint-disable-next-line no-alert
                alert('Gagal logout: ' + error.message);
            }
        } catch (err) {
            console.error('Unexpected error during signOut:', err);
        }

        // Immediately clear local UI auth state so the app returns to the auth page
        // even if the auth state change event from Supabase is delayed or suppressed.
        setIsAuthenticated(false);
        setUser(null);
        setUserRole('User');
        setAssignedVenue(null);
        setActiveView({ type: 'Dashboard' });
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-[var(--color-background)]/80 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="bg-[var(--color-surface)] rounded-lg shadow-xl border border-[var(--color-border)] p-8 flex flex-col items-center space-y-4">
                    <div className="relative">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--color-primary)]/30"></div>
                        <div className="absolute inset-2 animate-spin rounded-full h-8 w-8 border-4 border-transparent border-t-[var(--color-primary)] animation-reverse"></div>
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-medium text-[var(--color-text-primary)]">Memuat...</p>
                        <p className="text-sm text-[var(--color-text-secondary)] mt-1">Mohon tunggu sebentar</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <AuthPage onAuthSuccess={() => { /* The listener will handle auth state */ }} />;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[16rem,1fr] w-full max-w-screen-2xl mx-auto p-2 sm:p-3 md:p-4 lg:p-6 gap-2 sm:gap-3 md:gap-4 lg:gap-6 transition-all duration-300 min-h-screen">
            <Sidebar
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
                activeView={activeView}
                setActiveView={setActiveView}
                onLogout={handleLogout}
                userRole={userRole}
                assignedVenue={assignedVenue}
            />
            <MainContent
                activeView={activeView}
                setActiveView={setActiveView}
                setLaporanModalData={setLaporanModalData}
                onLogout={handleLogout}
                userRole={userRole}
                assignedVenue={assignedVenue}
            />

            <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden fixed top-4 left-4 z-40 text-[var(--color-text-primary)] bg-[var(--color-surface)]/70 backdrop-blur-sm rounded-full p-2 shadow-lg border border-[var(--color-border)]"
                aria-label="Open sidebar"
            >
                <MenuIcon className="w-6 h-6" />
            </button>

            {laporanModalData && (
                <LaporanModal
                    isOpen={!!laporanModalData}
                    onClose={handleCloseModal}
                    venueName={laporanModalData.venue}
                    marketingName={laporanModalData.marketingName}
                    onImagePreview={setImagePreviewUrl}
                    userRole={userRole}
                />
            )}

            {imagePreviewUrl && (
                <ImagePreviewModal
                    src={imagePreviewUrl}
                    onClose={() => setImagePreviewUrl(null)}
                />
            )}
        </div>
    );
};

export default App;
