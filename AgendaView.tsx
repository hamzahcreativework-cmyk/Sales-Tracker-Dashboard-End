import React, { useMemo } from 'react';
import { CalendarEventEntry, EventStatus } from './types';
import { WaktuMalamIcon, WaktuPagiIcon, WaktuFullDayIcon } from './Icons';
import { dateUtils } from './dateUtils';

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

interface AgendaViewProps {
    currentDate: Date;
    events: CalendarEventEntry[];
    onEventClick: (event: CalendarEventEntry) => void;
}

const getWaktuStyles = (waktuAcara?: string): { bg: string; badge: string; badgeText: string } => {
    switch (waktuAcara) {
        case 'Pagi':
            return { bg: 'bg-amber-100/70', badge: 'bg-amber-100', badgeText: 'text-amber-700' };
        case 'Malam':
            return { bg: 'bg-slate-300', badge: 'bg-slate-800', badgeText: 'text-white' };
        case 'Full Day':
            return { bg: 'bg-emerald-100/70', badge: 'bg-emerald-100', badgeText: 'text-emerald-700' };
        default:
            return { bg: 'bg-gray-50', badge: 'bg-gray-100', badgeText: 'text-gray-700' };
    }
};

const getEventStatusStyles = (status: EventStatus): { border: string; bg: string; text: string; dot: string } => {
    switch (status) {
        case 'Confirmed':
            return { border: 'border-green-500', bg: 'bg-green-500/10', text: 'text-green-800', dot: 'bg-green-500' };
        case 'Tentative':
            return { border: 'border-yellow-500', bg: 'bg-yellow-500/10', text: 'text-yellow-800', dot: 'bg-yellow-500' };
        case 'Cancelled':
            return { border: 'border-red-500', bg: 'bg-red-500/10', text: 'text-red-800', dot: 'bg-red-500' };
        case 'Waiting List':
            return { border: 'border-gray-500', bg: 'bg-gray-500/10', text: 'text-gray-800', dot: 'bg-gray-500' };
        default:
            return { border: 'border-gray-400', bg: 'bg-gray-400/10', text: 'text-gray-800', dot: 'bg-gray-400' };
    }
};


const AgendaView: React.FC<AgendaViewProps> = ({ currentDate, events, onEventClick }) => {
    
    const groupedEvents = useMemo(() => {
        const relevantEvents = [...events]
            .sort((a, b) => dateUtils.parseLocalDate(a.eventDate).getTime() - dateUtils.parseLocalDate(b.eventDate).getTime());

        // FIX: Add type annotation for the accumulator in `reduce` to prevent type errors with an empty initial object.
        return relevantEvents.reduce((acc: Record<string, CalendarEventEntry[]>, event) => {
            const dateKey = event.eventDate;
            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }
            acc[dateKey].push(event);
            // Sort events by eventOrder
            acc[dateKey].sort((a, b) => (a.eventOrder || 1) - (b.eventOrder || 1));
            return acc;
        }, {});

    }, [events, currentDate]);

    const sortedDates = Object.keys(groupedEvents).sort();

    return (
        <div className="max-h-[70vh] overflow-y-auto pr-2">
            {sortedDates.length > 0 ? (
                <div className="space-y-6">
                    {sortedDates.map(dateStr => {
                         const date = dateUtils.parseLocalDate(dateStr);
                         const isToday = dateUtils.toLocalDateString(date) === dateUtils.getTodayString();
                         const formattedDate = dateUtils.formatForDisplay(date);
                         return (
                            <div key={dateStr}>
                                <h3 className={`text-lg font-bold mb-3 pb-2 border-b-2 ${isToday ? 'text-[var(--color-primary)] border-[var(--color-primary)]' : 'text-[var(--color-text-primary)] border-[var(--color-border)]'}`}>
                                    {formattedDate}
                                </h3>
                                <div className="space-y-3">
                                    {groupedEvents[dateStr].map(event => {
                                        const styles = getEventStatusStyles(event.status);
                                        const waktuStyles = getWaktuStyles(event.waktuAcara);
                                        const venueColor = getVenueColor(event.venueName);
                                        return (
                                            <button
                                                key={event.id}
                                                onClick={() => onEventClick(event)}
                                                className={`w-full flex items-start gap-3 p-4 rounded-lg text-left transition-all duration-200 border-l-4 ${styles.border} ${waktuStyles.bg} hover:shadow-md hover:border-l-8 hover:-translate-y-px`}
                                            >
                                                <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${styles.dot}`}></div>
                                                <span className="flex-shrink-0 w-5 h-5 mt-0.5 text-[var(--color-text-secondary)]">
                                                    {event.waktuAcara === 'Pagi' && <WaktuPagiIcon className="w-5 h-5" />}
                                                    {event.waktuAcara === 'Malam' && <WaktuMalamIcon className="w-5 h-5" />}
                                                    {event.waktuAcara === 'Full Day' && <WaktuFullDayIcon className="w-5 h-5" />}
                                                </span>
                                                <div className="flex-grow min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                        <p className="font-bold text-[var(--color-text-primary)]">{event.eventOrder || 1}. {event.eventName}</p>
                                                        {event.eventType && (
                                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${event.eventType === 'Wedding' ? 'bg-pink-100 text-pink-800 border-pink-300' : 'bg-indigo-100 text-indigo-800 border-indigo-300'}`}>
                                                                {event.eventType}
                                                            </span>
                                                        )}
                                                        {event.jenisBooking && (
                                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${styles.bg} ${styles.text} ${styles.border}`}>
                                                                {event.jenisBooking}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-[var(--color-text-secondary)]">
                                                        <span className="flex items-center gap-1">
                                                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: venueColor }}></span>
                                                            {event.venueName}
                                                        </span>
                                                        {event.marketingName && (
                                                            <span>Marketing: {event.marketingName}</span>
                                                        )}
                                                        <span>{event.paxCount} Pax</span>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                         )
                    })}
                </div>
            ) : (
                <div className="text-center py-20">
                     <p className="font-semibold text-lg text-[var(--color-text-primary)]">Tidak ada event</p>
                     <p className="text-[var(--color-text-secondary)] mt-2">Belum ada event yang dijadwalkan.</p>
                </div>
            )}
        </div>
    );
};

export default AgendaView;
