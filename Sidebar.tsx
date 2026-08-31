import React, { useState, useEffect, useMemo } from 'react';
import {
    DashboardIcon, AnalyticsIcon, CloseIcon, SettingsIcon, LogoutIcon, LogoIcon, TeamIcon, TasksIcon, CalendarIcon, BellIcon, ListIcon
} from './Icons';
import { ActiveView } from './App';
import { UserRole } from './types';
import { useVenues } from './VenueContext';

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    activeView: ActiveView;
    setActiveView: (view: ActiveView) => void;
    onLogout: () => void;
    userRole: UserRole;
    assignedVenue: string | null;
}

const NavLink: React.FC<{
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    badge?: number;
    onClick?: () => void;
}> = ({ icon, label, active, badge, onClick }) => (
    <a href="#" onClick={(e) => { e.preventDefault(); onClick?.(); }}
        className={`flex items-center h-10 text-sm transition-all duration-200 relative mx-2 my-0.5 rounded-lg group ${active ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-interactive)] hover:text-[var(--color-text-primary)]'}`}>
        <span className="transition-all duration-300 mx-3">{icon}</span>
        <h3 className="font-medium">{label}</h3>
        {badge && (
            <span className="ml-auto mr-3 text-xs bg-[var(--color-interactive)] text-[var(--color-text-secondary)] font-bold px-2 py-0.5 rounded-full">{badge > 9 ? '9+' : badge}</span>
        )}
    </a>
);

const SectionLabel: React.FC<{ label: string }> = ({ label }) => (
    <p className="px-4 pt-5 pb-1 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">{label}</p>
);

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, activeView, setActiveView, onLogout, userRole, assignedVenue }) => {
    const { venues } = useVenues();
    const isCalendarActive = activeView.type === 'CalendarEvent';
    const [isCalendarOpen, setIsCalendarOpen] = useState(isCalendarActive);

    useEffect(() => {
        if (isCalendarActive) {
            setIsCalendarOpen(true);
        }
    }, [isCalendarActive]);

    const displayedVenues = useMemo(() => {
        if (userRole === 'User' && assignedVenue) {
            return venues.filter(v => v.name === assignedVenue);
        }
        return venues;
    }, [userRole, assignedVenue, venues]);

    const sidebarContent = (
        <>
            {/* Brand / Logo area */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="font-bold text-sm text-[var(--color-text-primary)] leading-tight">Kediaman Corp</h1>
                        <p className="text-xs text-[var(--color-text-secondary)] leading-tight">Calendar Tracking</p>
                    </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="md:hidden text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                    <CloseIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Navigation */}
            <div className="flex-grow flex flex-col overflow-y-auto py-2">
                <nav className="flex-grow">
                    <SectionLabel label="Overview" />
                    <NavLink
                        icon={<DashboardIcon className="w-5 h-5" />}
                        label="Dashboard"
                        active={activeView.type === 'Dashboard'}
                        onClick={() => setActiveView({ type: 'Dashboard' })}
                    />

                    <SectionLabel label="Data" />
                    <NavLink
                        icon={<TasksIcon className="w-5 h-5" />}
                        label="Data Dealing"
                        active={activeView.type === 'DataDealing'}
                        onClick={() => setActiveView({ type: 'DataDealing' })}
                    />
                    <NavLink
                        icon={<AnalyticsIcon className="w-5 h-5" />}
                        label="Grafik"
                        active={activeView.type === 'Grafik'}
                        onClick={() => setActiveView({ type: 'Grafik' })}
                    />
                    <NavLink
                        icon={<TasksIcon className="w-5 h-5" />}
                        label="Perhitungan Event"
                        active={activeView.type === 'EventCounting'}
                        onClick={() => setActiveView({ type: 'EventCounting' })}
                    />
                    <NavLink
                        icon={<AnalyticsIcon className="w-5 h-5" />}
                        label="Leaderboard"
                        active={activeView.type === 'Leaderboard'}
                        onClick={() => setActiveView({ type: 'Leaderboard' })}
                    />

                    <SectionLabel label="Laporan" />
                    <NavLink
                        icon={<BellIcon className="w-5 h-5" />}
                        label="Daily Report"
                        active={activeView.type === 'Marketing'}
                        onClick={() => setActiveView({ type: 'Marketing' })}
                    />
                    <NavLink
                        icon={<ListIcon className="w-5 h-5" />}
                        label="Laporan Data Bitrix24"
                        active={activeView.type === 'LaporanBitrix'}
                        onClick={() => setActiveView({ type: 'LaporanBitrix' })}
                    />

                    {/* Calendar Event Venue with submenu */}
                    <div className="mx-2 my-0.5">
                        <a href="#" onClick={(e) => { e.preventDefault(); setIsCalendarOpen(!isCalendarOpen); if (!isCalendarActive) setActiveView({ type: 'CalendarEvent', venueName: assignedVenue || undefined }) }}
                            className={`flex items-center h-10 text-sm transition-all duration-200 relative rounded-lg group ${isCalendarActive ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-interactive)] hover:text-[var(--color-text-primary)]'}`}>
                            <span className="transition-all duration-300 mx-3"><CalendarIcon className="w-5 h-5" /></span>
                            <h3 className="font-medium">Calendar Event Venue</h3>
                            <svg className={`w-4 h-4 ml-auto mr-3 transition-transform duration-200 ${isCalendarOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </a>
                        {isCalendarOpen && (
                            <div className="pl-5 mt-0.5 border-l-2 border-[var(--color-border)] ml-5 py-1">
                                {!assignedVenue && (
                                    <a href="#" onClick={(e) => { e.preventDefault(); setActiveView({ type: 'CalendarEvent' }) }}
                                        className={`flex items-center h-8 text-xs transition-colors duration-200 rounded-md group my-0.5 px-3 ${isCalendarActive && !activeView.venueName ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-interactive)] hover:text-[var(--color-text-primary)]'}`}>
                                        <span>Semua Venue</span>
                                    </a>
                                )}
                                {displayedVenues.map(venue => (
                                    <a href="#" key={venue.name} onClick={(e) => { e.preventDefault(); setActiveView({ type: 'CalendarEvent', venueName: venue.name }) }}
                                        className={`flex items-center h-8 text-xs transition-colors duration-200 rounded-md group my-0.5 px-3 ${isCalendarActive && activeView.venueName === venue.name ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-interactive)] hover:text-[var(--color-text-primary)]'}`}>
                                        <span>{venue.name}</span>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>

                    {(userRole === 'Admin' || userRole === 'IT') && (
                        <>
                            <SectionLabel label="Admin" />
                            <NavLink
                                icon={<TeamIcon className="w-5 h-5" />}
                                label="Data User"
                                active={activeView.type === 'DataUser'}
                                onClick={() => setActiveView({ type: 'DataUser' })}
                            />
                            <NavLink
                                icon={<SettingsIcon className="w-5 h-5" />}
                                label="Pengaturan Situs"
                                active={activeView.type === 'SiteSettings'}
                                onClick={() => setActiveView({ type: 'SiteSettings' })}
                            />
                        </>
                    )}
                </nav>
            </div>

            {/* User profile at bottom */}
            <div className="border-t border-[var(--color-border)] px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-600 text-xs font-bold">KC</span>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">Kediaman Corp</p>
                    <p className="text-xs text-[var(--color-text-secondary)] truncate">Owner</p>
                </div>
                <button
                    onClick={onLogout}
                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-secondary)] transition-colors duration-200 flex-shrink-0"
                    title="Logout"
                >
                    <LogoutIcon className="w-5 h-5" />
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && <div onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black bg-opacity-40 z-40 lg:hidden" />}

            <aside className={`fixed top-0 left-0 h-full w-64 bg-[var(--color-surface)] z-50 flex flex-col transition-transform duration-300 ease-in-out border-r border-[var(--color-border)] lg:relative lg:translate-x-0 lg:flex ${isOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'}`}>
                {sidebarContent}
            </aside>
        </>
    );
};

export default Sidebar;
