import React, { useState } from 'react';
import { CalendarEventEntry, EventStatus } from './types';
import { CloseIcon } from './Icons';
import { dateUtils } from './dateUtils';

interface CalendarGridProps {
    currentDate: Date;
    events: CalendarEventEntry[];
    onDateClick: (date: Date) => void;
    onEventClick: (event: CalendarEventEntry) => void;
}

const VENUE_COLORS = [
    '#3B82F6', '#8B5CF6', '#EC4899', '#6366F1',
    '#14B8A6', '#F97316', '#06B6D4', '#F43F5E',
    '#10B981', '#F59E0B', '#7C3AED'
];

const getVenueColor = (venueName: string): string => {
    let hash = 0;
    for (let i = 0; i < venueName.length; i++) {
        hash = venueName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return VENUE_COLORS[Math.abs(hash) % VENUE_COLORS.length];
};

const getStatusBorder = (status: EventStatus): string => {
    switch (status) {
        case 'Confirmed':
            return 'border-l-green-500';
        case 'Tentative':
            return 'border-l-yellow-500';
        case 'Cancelled':
            return 'border-l-red-500';
        case 'Waiting List':
            return 'border-l-gray-400';
        default:
            return 'border-l-gray-300';
    }
};

const WAKTU_CONFIG: Record<string, { emoji: string; label: string; pillBg: string; pillText: string; cardBg: string }> = {
    'Pagi':     { emoji: '🌅', label: 'Pagi',     pillBg: 'bg-amber-100',   pillText: 'text-amber-700',   cardBg: 'bg-amber-100/70' },
    'Malam':    { emoji: '🌙', label: 'Malam',    pillBg: 'bg-slate-800',   pillText: 'text-white',       cardBg: 'bg-slate-300' },
    'Full Day': { emoji: '☀️', label: 'Full Day', pillBg: 'bg-emerald-100', pillText: 'text-emerald-700', cardBg: 'bg-emerald-100/70' },
};

const WaktuPill: React.FC<{ waktuAcara?: string; size?: 'sm' | 'md' }> = ({ waktuAcara, size = 'sm' }) => {
    const config = waktuAcara ? WAKTU_CONFIG[waktuAcara] : null;
    if (!config) return null;
    const sizeClasses = size === 'sm'
        ? 'px-1.5 py-0.5 text-[9px] gap-0.5'
        : 'px-2 py-0.5 text-[10px] gap-1';
    return (
        <span className={`inline-flex items-center ${sizeClasses} rounded-full font-semibold ${config.pillBg} ${config.pillText} flex-shrink-0`}>
            <span className={size === 'sm' ? 'text-[10px]' : 'text-xs'}>{config.emoji}</span>
            {config.label}
        </span>
    );
};

const MoreEventsModal: React.FC<{
    date: Date;
    events: CalendarEventEntry[];
    onClose: () => void;
    onEventClick: (event: CalendarEventEntry) => void;
}> = ({ date, events, onClose, onEventClick }) => {
    const formattedDate = date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[51] fade-in" onClick={onClose}>
            <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl max-w-md w-full relative border border-[var(--color-border)]" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
                    <div>
                        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Semua Event</h3>
                        <p className="text-sm text-[var(--color-text-secondary)]">{formattedDate}</p>
                    </div>
                    <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="max-h-80 overflow-y-auto p-4 space-y-2">
                    {events.map(event => {
                        const statusBorder = getStatusBorder(event.status);
                        const waktuCfg = event.waktuAcara ? WAKTU_CONFIG[event.waktuAcara] : null;
                        const cardBg = waktuCfg?.cardBg || 'bg-white';
                        const venueColor = getVenueColor(event.venueName || '');
                        return (
                            <button
                                key={event.id}
                                onClick={() => { onEventClick(event); onClose(); }}
                                className={`w-full text-left p-3 rounded-xl border-l-4 ${statusBorder} ${cardBg} hover:shadow-md transition-all duration-200 hover:-translate-y-px`}
                            >
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <p className="font-semibold text-sm text-[var(--color-text-primary)] truncate">{event.eventOrder || 1}. {event.eventName}</p>
                                    <WaktuPill waktuAcara={event.waktuAcara} size="md" />
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: venueColor }} />
                                        {event.venueName}
                                    </span>
                                    {event.paxCount && (
                                        <span className="text-xs text-[var(--color-text-secondary)]">{event.paxCount} pax</span>
                                    )}
                                    {event.marketingName && (
                                        <span className="text-xs text-[var(--color-text-secondary)]">{event.marketingName}</span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const CalendarGrid: React.FC<CalendarGridProps> = ({ currentDate, events, onDateClick, onEventClick }) => {
    const MAX_EVENTS_PER_DAY = 3;
    const [moreEventsModalData, setMoreEventsModalData] = useState<{ date: Date, events: CalendarEventEntry[] } | null>(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDayOfWeek = firstDayOfMonth.getDay();

    const calendarDays = [];
    for (let i = 0; i < startDayOfWeek; i++) {
        calendarDays.push({ date: new Date(year, month, i - startDayOfWeek + 1), isCurrentMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
        calendarDays.push({ date: new Date(year, month, day), isCurrentMonth: true });
    }
    const remainingCells = 7 - (calendarDays.length % 7);
    if (remainingCells < 7) {
        for (let i = 1; i <= remainingCells; i++) {
            calendarDays.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
        }
    }

    const dayNames = [
        { short: 'Min', isWeekend: true },
        { short: 'Sen', isWeekend: false },
        { short: 'Sel', isWeekend: false },
        { short: 'Rab', isWeekend: false },
        { short: 'Kam', isWeekend: false },
        { short: 'Jum', isWeekend: false },
        { short: 'Sab', isWeekend: true },
    ];

    return (
        <>
            <div className="rounded-xl overflow-hidden border border-[var(--color-border)] shadow-sm">
                {/* Day header */}
                <div className="grid grid-cols-7">
                    {dayNames.map(day => (
                        <div
                            key={day.short}
                            className={`text-center font-semibold text-xs py-2.5 border-b border-[var(--color-border)] ${
                                day.isWeekend
                                    ? 'bg-red-50 text-red-400'
                                    : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)]'
                            }`}
                        >
                            {day.short}
                        </div>
                    ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7">
                    {calendarDays.map(({ date, isCurrentMonth }, index) => {
                        const dateString = dateUtils.toLocalDateString(date);
                        const eventsForDay = events.filter(e => e.eventDate === dateString);
                        const isToday = dateUtils.toLocalDateString(date) === dateUtils.getTodayString();
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                        const eventsToDisplay = eventsForDay
                            .sort((a, b) => (a.eventOrder || 1) - (b.eventOrder || 1))
                            .slice(0, MAX_EVENTS_PER_DAY);
                        const hiddenEventsCount = eventsForDay.length - MAX_EVENTS_PER_DAY;

                        const waktuTypes = [...new Set(eventsForDay.map(e => e.waktuAcara).filter(Boolean))];
                        const dominantWaktu = waktuTypes.length === 1 ? waktuTypes[0] : null;
                        const cellBg = !isCurrentMonth
                            ? 'bg-gray-50/50'
                            : dominantWaktu === 'Pagi' ? 'bg-amber-100'
                            : dominantWaktu === 'Malam' ? 'bg-slate-300'
                            : dominantWaktu === 'Full Day' ? 'bg-emerald-100'
                            : waktuTypes.length > 1 ? 'bg-gradient-to-br from-amber-100 via-white to-slate-300'
                            : isWeekend ? 'bg-red-50/30'
                            : 'bg-[var(--color-surface)]';

                        return (
                            <div
                                key={index}
                                className={`relative min-h-[130px] p-1.5 flex flex-col border-b border-r border-[var(--color-border)] transition-colors duration-150 cursor-pointer group
                                    ${cellBg}
                                    ${!isCurrentMonth ? 'opacity-50' : ''}
                                    ${isCurrentMonth ? 'hover:brightness-95' : ''}
                                    ${isToday ? 'ring-2 ring-inset ring-[var(--color-primary)]/30' : ''}
                                `}
                                onClick={() => onDateClick(date)}
                                role="button"
                                aria-label={`Tambah event untuk ${date.toLocaleDateString('id-ID')}`}
                            >
                                {/* Date number + event count */}
                                <div className="flex items-center justify-between mb-1 px-0.5">
                                    <span className={`text-xs font-bold flex items-center justify-center w-6 h-6 rounded-full transition-colors ${
                                        isToday
                                            ? 'bg-[var(--color-primary)] text-white shadow-sm'
                                            : isCurrentMonth
                                            ? 'text-[var(--color-text-primary)] group-hover:bg-blue-100 group-hover:text-blue-700'
                                            : 'text-gray-400'
                                    }`}>
                                        {date.getDate()}
                                    </span>
                                    {eventsForDay.length > 0 && (
                                        <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-bold bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                                            {eventsForDay.length}
                                        </span>
                                    )}
                                </div>

                                {/* Event cards */}
                                <div className="flex-grow space-y-1">
                                    {eventsToDisplay.map((event) => {
                                        const statusBorder = getStatusBorder(event.status);
                                        const waktuCfg = event.waktuAcara ? WAKTU_CONFIG[event.waktuAcara] : null;
                                        const cardBg = waktuCfg?.cardBg || 'bg-gray-50';
                                        return (
                                            <button
                                                key={event.id}
                                                onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                                                className={`w-full text-left px-1.5 py-1 rounded-lg border-l-[3px] ${statusBorder} ${cardBg} transition-all duration-150 hover:shadow-sm hover:scale-[1.02] active:scale-100`}
                                                title={`${event.eventOrder || 1}. ${event.eventName} - ${event.venueName}`}
                                            >
                                                <div className="flex items-center gap-1 mb-0.5">
                                                    <p className="truncate text-[11px] font-semibold text-[var(--color-text-primary)] leading-tight flex-1 min-w-0">
                                                        {event.eventOrder || 1}. {event.eventName}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1 flex-wrap">
                                                    <WaktuPill waktuAcara={event.waktuAcara} />
                                                    <span className="flex items-center gap-0.5 min-w-0">
                                                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: getVenueColor(event.venueName || '') }} />
                                                        <span className="truncate text-[9px] text-[var(--color-text-secondary)] max-w-[60px]">{event.venueName}</span>
                                                    </span>
                                                    {event.paxCount && (
                                                        <span className="text-[9px] text-[var(--color-text-secondary)] flex-shrink-0">{event.paxCount}p</span>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                    {hiddenEventsCount > 0 && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setMoreEventsModalData({ date, events: eventsForDay });
                                            }}
                                            className="w-full text-center text-[10px] font-bold text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] py-0.5 rounded-md hover:bg-blue-50 transition-colors"
                                        >
                                            +{hiddenEventsCount} lainnya
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {moreEventsModalData && (
                <MoreEventsModal
                    {...moreEventsModalData}
                    onClose={() => setMoreEventsModalData(null)}
                    onEventClick={onEventClick}
                />
            )}
        </>
    );
};

export default CalendarGrid;
