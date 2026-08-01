import React, { useState } from 'react';
import { CalendarEventEntry, EventStatus } from './types';
import { CloseIcon, WaktuMalamIcon, WaktuPagiIcon, WaktuFullDayIcon } from './Icons';
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

const getEventStatusStyles = (status: EventStatus): { border: string; bg: string; text: string; } => {
    switch (status) {
        case 'Confirmed':
            return { border: 'border-green-500', bg: 'bg-green-500/10', text: 'text-green-800' };
        case 'Tentative':
            return { border: 'border-yellow-500', bg: 'bg-yellow-500/10', text: 'text-yellow-800' };
        case 'Cancelled':
            return { border: 'border-red-500', bg: 'bg-red-500/10', text: 'text-red-800' };
        case 'Waiting List':
            return { border: 'border-gray-500', bg: 'bg-gray-500/10', text: 'text-gray-800' };
        default:
            return { border: 'border-gray-400', bg: 'bg-gray-400/10', text: 'text-gray-800' };
    }
};

const TimeIcon: React.FC<{ waktuAcara: CalendarEventEntry['waktuAcara'] }> = ({ waktuAcara }) => (
    <span className="flex-shrink-0 w-4 h-4 text-[var(--color-text-secondary)]">
        {waktuAcara === 'Pagi' && <WaktuPagiIcon className="w-4 h-4" />}
        {waktuAcara === 'Malam' && <WaktuMalamIcon className="w-4 h-4" />}
        {waktuAcara === 'Full Day' && <WaktuFullDayIcon className="w-4 h-4" />}
    </span>
);

const MoreEventsModal: React.FC<{
    date: Date;
    events: CalendarEventEntry[];
    onClose: () => void;
    onEventClick: (event: CalendarEventEntry) => void;
}> = ({ date, events, onClose, onEventClick }) => {
    const formattedDate = date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[51] fade-in" onClick={onClose}>
            <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl max-w-md w-full p-6 relative border border-[var(--color-border)]" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">Semua Event</h3>
                <p className="text-sm text-[var(--color-text-secondary)] mb-4">{formattedDate}</p>
                <button onClick={onClose} className="absolute top-4 right-4 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] p-2 rounded-full hover:bg-white/10 transition-colors">
                    <CloseIcon className="w-5 h-5" />
                </button>
                <div className="max-h-80 overflow-y-auto space-y-2 pr-2 -mr-2">
                    {events.map(event => {
                        const styles = getEventStatusStyles(event.status);
                        const venueColor = getVenueColor(event.venueName || '');
                        return (
                            <button
                                key={event.id}
                                onClick={() => {
                                    onEventClick(event);
                                    onClose();
                                }}
                                className={`w-full text-left p-3 rounded-lg flex flex-col gap-1 transition-colors border-l-4 ${styles.border} ${styles.bg} hover:bg-opacity-20`}
                            >
                                <div className="flex items-center gap-2">
                                    <TimeIcon waktuAcara={event.waktuAcara} />
                                    <p className={`font-semibold text-sm truncate ${styles.text}`}>{event.eventOrder || 1}. {event.eventName}</p>
                                </div>
                                <div className="flex items-center gap-1.5 pl-6">
                                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: venueColor }} />
                                    <p className="text-xs text-[var(--color-text-secondary)] truncate">{event.venueName}</p>
                                    {event.paxCount && (
                                        <span className="text-xs text-[var(--color-text-secondary)] flex-shrink-0">· {event.paxCount} pax</span>
                                    )}
                                </div>
                                {event.marketingName && (
                                    <p className="text-xs text-[var(--color-text-secondary)] pl-6 truncate">{event.marketingName}</p>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const CalendarGrid: React.FC<CalendarGridProps> = ({ currentDate, events, onDateClick, onEventClick }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const MAX_EVENTS_PER_DAY = 3;

    const [moreEventsModalData, setMoreEventsModalData] = useState<{ date: Date, events: CalendarEventEntry[] } | null>(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
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

    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    return (
        <>
            <div className="grid grid-cols-7 border-t border-l border-[var(--color-border)]">
                {dayNames.map(day => (
                    <div key={day} className="text-center font-semibold text-xs py-2 bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-r border-b border-[var(--color-border)]">
                        {day}
                    </div>
                ))}
                {calendarDays.map(({ date, isCurrentMonth }, index) => {
                    const dateString = dateUtils.toLocalDateString(date);
                    const eventsForDay = events.filter(e => e.eventDate === dateString);
                    const isToday = dateUtils.toLocalDateString(date) === dateUtils.getTodayString();

                    const eventsToDisplay = eventsForDay
                        .sort((a, b) => (a.eventOrder || 1) - (b.eventOrder || 1))
                        .slice(0, MAX_EVENTS_PER_DAY);
                    const hiddenEventsCount = eventsForDay.length - MAX_EVENTS_PER_DAY;

                    return (
                        <div
                            key={index}
                            className={`relative min-h-[140px] p-2 flex flex-col border-r border-b border-[var(--color-border)] transition-colors duration-200 group ${isCurrentMonth ? 'bg-[var(--color-surface)] hover:bg-[var(--color-interactive)]' : 'bg-slate-50'}`}
                            onClick={() => onDateClick(date)}
                            role="button"
                            aria-label={`Tambah event untuk ${date.toLocaleDateString('id-ID')}`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                {eventsForDay.length > 0 ? (
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold bg-[var(--color-primary)] text-white">
                                        {eventsForDay.length}
                                    </span>
                                ) : (
                                    <span />
                                )}
                                <span className={`text-xs font-semibold flex items-center justify-center w-6 h-6 rounded-full transition-colors ${
                                    isToday ? "bg-[var(--color-primary)] text-white" :
                                    isCurrentMonth ? "text-[var(--color-text-primary)]" : "text-gray-400"
                                }`}>
                                    {date.getDate()}
                                </span>
                            </div>
                            <div className="flex-grow space-y-1.5">
                                {eventsToDisplay.map((event) => {
                                    const styles = getEventStatusStyles(event.status);
                                    const venueColor = getVenueColor(event.venueName || '');
                                    return (
                                        <button
                                            key={event.id}
                                            onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                                            className={`w-full text-left p-1.5 rounded-md text-xs font-semibold cursor-pointer border-l-4 transition-transform hover:scale-[1.03] ${styles.border} ${styles.bg} ${styles.text}`}
                                            title={`${event.eventOrder || 1}. ${event.eventName} - ${event.venueName}`}
                                            aria-label={`Lihat detail untuk ${event.eventName}`}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <TimeIcon waktuAcara={event.waktuAcara} />
                                                <p className="truncate">{event.eventOrder || 1}. {event.eventName}</p>
                                            </div>
                                            <div className="flex items-center gap-1 mt-0.5 pl-[22px]">
                                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: venueColor }} />
                                                <p className="truncate text-[10px] font-normal text-[var(--color-text-secondary)]">{event.venueName}</p>
                                                {event.paxCount && (
                                                    <span className="flex-shrink-0 text-[10px] font-normal text-[var(--color-text-secondary)]">· {event.paxCount} pax</span>
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
                                        className="w-full text-left text-xs font-bold text-[var(--color-primary)] hover:underline p-1 rounded"
                                    >
                                        + {hiddenEventsCount} lainnya
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
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
