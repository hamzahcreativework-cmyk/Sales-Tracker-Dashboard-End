import React, { useMemo } from 'react';
import { CalendarEventEntry, EventStatus } from './types';
import { WaktuMalamIcon, WaktuPagiIcon, WaktuFullDayIcon } from './Icons';
import { dateUtils } from './dateUtils';

interface AgendaViewProps {
    currentDate: Date;
    events: CalendarEventEntry[];
    onEventClick: (event: CalendarEventEntry) => void;
}

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
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        startOfMonth.setHours(0,0,0,0);

        const relevantEvents = events
            .filter(event => {
                const eventDate = dateUtils.parseLocalDate(event.eventDate);
                return eventDate >= startOfMonth;
            })
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
                                        return (
                                            <button 
                                                key={event.id}
                                                onClick={() => onEventClick(event)}
                                                className={`w-full flex items-center gap-4 p-4 rounded-lg text-left transition-all duration-200 border-l-4 ${styles.border} ${styles.bg} hover:shadow-md hover:border-l-8 hover:-translate-y-px`}
                                            >
                                                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${styles.dot}`}></div>
                                                <div className="flex items-center gap-3">
                                                    <span className="flex-shrink-0 w-5 h-5 text-[var(--color-text-secondary)]">
                                                        {event.waktuAcara === 'Pagi' && <WaktuPagiIcon className="w-5 h-5" />}
                                                        {event.waktuAcara === 'Malam' && <WaktuMalamIcon className="w-5 h-5" />}
                                                        {event.waktuAcara === 'Full Day' && <WaktuFullDayIcon className="w-5 h-5" />}
                                                    </span>
                                                    <div className="flex-grow grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1">
                                                    <div>
                                                        <p className="font-bold text-[var(--color-text-primary)]">{event.eventOrder || 1}. {event.eventName}</p>
                                                        <p className="text-sm text-[var(--color-text-secondary)]">{event.venueName}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-[var(--color-text-secondary)]">{event.paxCount} Pax</p>
                                                    </div>
                                                     <div>
                                                         <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${styles.bg} ${styles.text} border ${styles.border}`}>{event.status}</span>
                                                    </div>
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
                     <p className="font-semibold text-lg text-[var(--color-text-primary)]">Tidak ada event mendatang</p>
                     <p className="text-[var(--color-text-secondary)] mt-2">Tidak ada event yang dijadwalkan untuk bulan ini atau bulan-bulan berikutnya.</p>
                </div>
            )}
        </div>
    );
};

export default AgendaView;
