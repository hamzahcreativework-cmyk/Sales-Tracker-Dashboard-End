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
                        return (
                             <button
                                key={event.id}
                                onClick={() => {
                                    onEventClick(event);
                                    onClose();
                                }}
                                className={`w-full text-left p-3 rounded-lg flex flex-col transition-colors border-l-4 ${styles.border} ${styles.bg} hover:bg-opacity-20`}
                            >
                                <p className={`font-semibold text-sm ${styles.text}`}>{event.eventOrder || 1}. {event.eventName}</p>
                                <p className="text-xs text-[var(--color-text-secondary)] mt-1">{event.venueName} - {event.paxCount} pax</p>
                            </button>
                        )
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
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 for Sunday

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
                            <span className={`self-end text-xs font-semibold flex items-center justify-center w-6 h-6 rounded-full transition-colors ${
                                isToday ? "bg-[var(--color-primary)] text-white" : 
                                isCurrentMonth ? "text-[var(--color-text-primary)]" : "text-gray-400"
                            }`}>
                                {date.getDate()}
                            </span>
                            <div className="flex-grow space-y-1.5 mt-1">
                                {eventsToDisplay.map((event, index) => {
                                    const styles = getEventStatusStyles(event.status);
                                    return (
                                        <button
                                            key={event.id}
                                            onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                                            className={`w-full text-left p-1.5 rounded-md text-xs font-semibold cursor-pointer border-l-4 transition-transform hover:scale-[1.03] ${styles.border} ${styles.bg} ${styles.text}`}
                                            title={`${event.eventOrder || 1}. ${event.eventName} - ${event.venueName}`}
                                            aria-label={`Lihat detail untuk ${event.eventName}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="flex-shrink-0 w-4 h-4 text-[var(--color-text-secondary)]">
                                                    {event.waktuAcara === 'Pagi' && <WaktuPagiIcon className="w-4 h-4" />}
                                                    {event.waktuAcara === 'Malam' && <WaktuMalamIcon className="w-4 h-4" />}
                                                    {event.waktuAcara === 'Full Day' && <WaktuFullDayIcon className="w-4 h-4" />}
                                                </span>
                                                <p className="truncate">{event.eventOrder || 1}. {event.eventName}</p>
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
