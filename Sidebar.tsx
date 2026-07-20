import React, { useState, useEffect, useMemo } from 'react';
import {
    DashboardIcon, AnalyticsIcon, CloseIcon, SettingsIcon, LogoutIcon, LogoIcon, TeamIcon, TasksIcon, CalendarIcon, BellIcon, ListIcon
} from './Icons';
import { ActiveView } from './App';
import { UserRole } from './types';
import { VENUES } from './constants';

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
        className={`flex items-center h-12 text-sm transition-all duration-200 relative mx-2 my-1 rounded-lg group border-l-4 ${active ? 'bg-violet-500/10 text-violet-300 border-violet-500' : 'text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-[var(--color-text-primary)] border-transparent'}`}>
        <span className="transition-all duration-300 mx-3">{icon}</span>
        <h3 className="font-semibold">{label}</h3>
        {badge && (
            <span className="ml-auto mr-3 text-xs bg-gray-700 text-gray-300 font-bold px-2 py-0.5 rounded-full">{badge > 9 ? '9+' : badge}</span>
        )}
    </a>
);

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, activeView, setActiveView, onLogout, userRole, assignedVenue }) => {
    const isCalendarActive = activeView.type === 'CalendarEvent';
    const [isCalendarOpen, setIsCalendarOpen] = useState(isCalendarActive);

    useEffect(() => {
        if (isCalendarActive) {
            setIsCalendarOpen(true);
        }
    }, [isCalendarActive]);

    const displayedVenues = useMemo(() => {
        if (userRole === 'User' && assignedVenue) {
            return VENUES.filter(v => v.name === assignedVenue);
        }
        return VENUES;
    }, [userRole, assignedVenue]);

    const sidebarContent = (
        <>
            <div className="flex items-center justify-between h-20 px-4 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="font-bold text-lg text-[var(--color-text-primary)] leading-tight">Kediaman Corp</h1>
                        <p className="text-xs text-[var(--color-text-secondary)] leading-tight">Calendar Tracking</p>
                    </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="md:hidden text-2xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                    <CloseIcon className="w-6 h-6" />
                </button>
            </div>
            <div className="flex-grow flex flex-col pt-4">
                <nav className="flex-grow">
                    <p className="px-4 text-xs font-semibold text-gray-500 uppercase mb-2">Menu</p>
                    <NavLink
                        icon={<DashboardIcon className="w-5 h-5" />}
                        label="Dashboard"
                        active={activeView.type === 'Dashboard'}
                        onClick={() => setActiveView({ type: 'Dashboard' })}
                    />
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
                        icon={<BellIcon className="w-5 h-5" />} // Using BellIcon for Marketing temporarily
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
                    <div className="mx-2 my-1">
                        <a href="#" onClick={(e) => { e.preventDefault(); setIsCalendarOpen(!isCalendarOpen); if (!isCalendarActive) setActiveView({ type: 'CalendarEvent', venueName: assignedVenue || undefined }) }}
                            className={`flex items-center h-12 text-sm transition-all duration-200 relative rounded-lg group border-l-4 ${isCalendarActive ? 'bg-violet-500/10 text-violet-300 border-violet-500' : 'text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-[var(--color-text-primary)] border-transparent'}`}>
                            <span className="transition-all duration-300 mx-3"><CalendarIcon className="w-5 h-5" /></span>
                            <h3 className="font-semibold">Calendar Event Venue</h3>
                            <svg className={`w-4 h-4 ml-auto mr-3 transition-transform duration-200 ${isCalendarOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </a>
                        {isCalendarOpen && (
                            <div className="pl-6 mt-1 border-l-2 border-slate-700/50 ml-5 py-1">
                                {!assignedVenue && (
                                    <a href="#" onClick={(e) => { e.preventDefault(); setActiveView({ type: 'CalendarEvent' }) }}
                                        className={`flex items-center h-9 text-xs transition-colors duration-200 rounded-md group my-1 px-3 ${isCalendarActive && !activeView.venueName ? 'bg-violet-500/10 text-violet-300 font-semibold' : 'text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-[var(--color-text-primary)]'}`}>
                                        <span>Semua Venue</span>
                                    </a>
                                )}
                                {displayedVenues.map(venue => (
                                    <a href="#" key={venue.name} onClick={(e) => { e.preventDefault(); setActiveView({ type: 'CalendarEvent', venueName: venue.name }) }}
                                        className={`flex items-center h-9 text-xs transition-colors duration-200 rounded-md group my-1 px-3 ${isCalendarActive && activeView.venueName === venue.name ? 'bg-violet-500/10 text-violet-300 font-semibold' : 'text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-[var(--color-text-primary)]'}`}>
                                        <span>{venue.name}</span>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                    {(userRole === 'Admin' || userRole === 'IT') && (
                        <NavLink
                            icon={<TeamIcon className="w-5 h-5" />}
                            label="Data User"
                            active={activeView.type === 'DataUser'}
                            onClick={() => setActiveView({ type: 'DataUser' })}
                        />
                    )}
                </nav>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && <div onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black bg-opacity-60 z-40 lg:hidden" />}

            <aside className={`fixed top-0 left-0 h-full w-64 bg-[var(--color-surface)] z-50 flex flex-col transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:w-auto lg:h-auto lg:bg-transparent ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
                <div className="h-full flex flex-col bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] lg:rounded-none lg:border-0">
                    {sidebarContent}
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
