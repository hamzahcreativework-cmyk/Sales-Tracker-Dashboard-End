import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CalendarEventEntry, UserRole, DealingEntry, EventStatus, BookingStatus } from './types';
import { PlusIcon, GridIcon, ListIcon } from './Icons';
import AddEventModal from './AddEventModal';
import { supabase } from './supabaseClient';
import CalendarGrid from './CalendarGrid';
import EventDetailModal from './EventDetailModal';
import { ActiveView } from './App';
import { VENUES } from './constants';
import AgendaView from './AgendaView';
import { dateUtils } from './dateUtils';

interface CalendarEventViewProps {
    userRole: UserRole;
    venueName?: string;
    setActiveView: (view: ActiveView) => void;
    assignedVenue: string | null;
    selectedEventId?: number;
}

const CalendarEventView: React.FC<CalendarEventViewProps> = ({ userRole, venueName, setActiveView, assignedVenue, selectedEventId }) => {
    const [eventsForGrid, setEventsForGrid] = useState<CalendarEventEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEventEntry | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');
    const [bookingStatusFilter, setBookingStatusFilter] = useState<BookingStatus | ''>('');
    const [selectedWeek, setSelectedWeek] = useState<number | ''>('');
    const fetchRequestIdRef = useRef(0);
    
    const isVenueRestricted = userRole === 'User' && !!assignedVenue;
    const effectiveVenueName = isVenueRestricted ? assignedVenue : venueName;

    console.log('assignedVenue:', assignedVenue, 'venueName:', venueName, 'effectiveVenueName:', effectiveVenueName);

    const displayedVenues = assignedVenue ? VENUES.filter(v => v.name === assignedVenue) : VENUES;
    const isVenueDropdownDisabled = !!assignedVenue;
    const defaultVenueValue = assignedVenue || venueName || '';

    const fetchEvents = async () => {
        const requestId = ++fetchRequestIdRef.current;
        setIsLoading(true);
        try {
            console.log('Fetching events for venue:', effectiveVenueName);
            let query = supabase.from('deals').select('*');
            if (effectiveVenueName) {
                query = query.eq('namaVenue', effectiveVenueName);
            }
            const { data, error } = await query;
            if (requestId !== fetchRequestIdRef.current) {
                return;
            }
            if (error) {
                console.error('Error fetching deals for calendar:', error.message);
                alert('Gagal memuat data event.');
            } else {
                const deals = data as DealingEntry[];
                console.log('Fetched deals for calendar:', deals);
                const mapBookingStatusToEventStatus = (bookingStatus: DealingEntry['jenisBooking']): EventStatus => {
                    switch (bookingStatus) {
                        case 'Lunas':
                        case 'Booking':
                            return 'Confirmed';
                        case 'Waiting List':
                            return 'Waiting List';
                        case 'DP':
                        case 'Soft Booking':
                        default:
                            return 'Tentative';
                    }
                };
                const mappedEvents = deals.map(deal => ({
                    id: deal.id,
                    eventName: deal.namaClient,
                    venueName: deal.namaVenue,
                    venueLokasi: (deal as any).venueLokasi || undefined,
                    marketingName: deal.namaMarketing,
                    paxCount: deal.totalPax,
                    waktuAcara: (deal as any).waktuAcara || undefined,
                    eventType: deal.jenisAcara,
                    weddingType: deal.weddingType,
                    bookingDate: deal.tanggalBooking,
                    eventDate: deal.tanggalAcara,
                    sumberData: deal.sumberData,
                    status: mapBookingStatusToEventStatus(deal.jenisBooking),
                    jenisBooking: deal.jenisBooking,
                    eventOrder: deal.eventOrder || 1, // Default order 1 jika tidak ada
                    notes: `Pax: ${deal.namaPax}, Pelunasan: ${deal.tanggalPelunasan || 'N/A'}`
                }));
                console.log('Mapped events:', mappedEvents);
                setEventsForGrid(mappedEvents);
            }
        } catch (err) {
            console.error('Unexpected error in fetchEvents:', err);
            alert('Terjadi kesalahan tak terduga saat memuat data event.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, [effectiveVenueName]);

    useEffect(() => {
        if (selectedEventId && eventsForGrid.length > 0) {
            const event = eventsForGrid.find(e => e.id === selectedEventId);
            if (event) {
                setSelectedEvent(event);
            }
        }
    }, [selectedEventId, eventsForGrid]);

    const getWeekOfMonth = (date: Date, selectedMonth: Date): number => {
        const firstDayOfSelectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
        const dayOfMonth = date.getDate();
        const firstDayOfWeek = firstDayOfSelectedMonth.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        // Calculate which week of the selected month this date falls into
        const adjustedDate = dayOfMonth + firstDayOfWeek - 1; // -1 to make Monday = 0
        return Math.ceil(adjustedDate / 7);
    };

    const filteredEvents = useMemo(() => {
        let filtered = eventsForGrid;

        // Apply date filter based on view mode and filters
        if (selectedWeek && viewMode === 'agenda') {
            // When week filter is active in agenda view, show all events in the selected month
            filtered = filtered.filter(event => {
                const eventDate = dateUtils.parseLocalDate(event.eventDate);
                return eventDate.getMonth() === currentDate.getMonth() &&
                       eventDate.getFullYear() === currentDate.getFullYear();
            });
        } else {
            // Default: show only future events
            filtered = filtered.filter(event => dateUtils.isTodayOrFuture(event.eventDate));
        }

        filtered = filtered.sort((a, b) => {
            const dateCompare = a.eventDate.localeCompare(b.eventDate);
            if (dateCompare !== 0) return dateCompare;
            return (a.eventOrder || 1) - (b.eventOrder || 1);
        });

        // Apply booking status filter
        if (bookingStatusFilter) {
            filtered = filtered.filter(event => event.jenisBooking === bookingStatusFilter);
        }

        // Apply week filter (only for agenda view)
        if (selectedWeek && viewMode === 'agenda') {
            filtered = filtered.filter(event => {
                const eventDate = dateUtils.parseLocalDate(event.eventDate);
                return getWeekOfMonth(eventDate, currentDate) === selectedWeek;
            });
        }

        return filtered;
    }, [eventsForGrid, bookingStatusFilter, selectedWeek, viewMode, currentDate]);


    const handleAddEvent = async (newDealData: Omit<DealingEntry, 'id'>) => {
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                console.error('User not authenticated:', userError);
                alert('User tidak terautentikasi. Silakan login kembali.');
                return;
            }

            const dealWithUser = { ...newDealData, user_id: user.id };
            console.log('Inserting deal with user_id:', dealWithUser);
            const { data, error } = await supabase.from('deals').insert([dealWithUser]).select();

            if (error) {
                console.error('Error adding event (Supabase error object):', error);
                // Show more details to the user to help debugging (non-sensitive)
                alert(`Gagal menambahkan event. ${error.message || ''} ${error.details || ''}`.trim());
                return;
            }

            if (!data || data.length === 0) {
                console.error('Insert returned no data:', data);
                alert('Gagal menambahkan event: respons kosong dari server. Periksa konsol untuk detail.');
                return;
            }

            console.log('Event berhasil disimpan:', data[0]);
            // Success: refresh list and close modal
            await fetchEvents();
            setIsAddEventModalOpen(false);
            setSelectedDate(null);
        } catch (err) {
            console.error('Unexpected error when adding event:', err);
            alert('Terjadi kesalahan saat menambahkan event. Periksa konsol untuk detail.');
        }
    };
    
    const handleDateClick = (date: Date) => {
        if (userRole === 'Admin' || userRole === 'Manager') {
            setSelectedDate(dateUtils.toLocalDateString(date));
            setIsAddEventModalOpen(true);
        }
    };
    
    const handleEventClick = (event: CalendarEventEntry) => {
        setSelectedEvent(event);
    };

    const handleEventUpdate = (updatedEvent: CalendarEventEntry) => {
        setEventsForGrid(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
        setSelectedEvent(null);
    };
    
    const handleEventDelete = (deletedEventId: number) => {
        setEventsForGrid(prev => prev.filter(e => e.id !== deletedEventId));
        setSelectedEvent(null);
    };

    const goToPreviousMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };
    
    const monthYearFormat = new Intl.DateTimeFormat('id-ID', { year: 'numeric', month: 'long' });

    const ViewSwitcherButton: React.FC<{ isActive: boolean, onClick: () => void, children: React.ReactNode, ariaLabel: string }> = ({ isActive, onClick, children, ariaLabel }) => (
        <button 
            onClick={onClick}
            aria-label={ariaLabel}
            className={`p-2 rounded-md transition-colors ${isActive ? 'bg-[var(--color-primary-surface)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-interactive)]'}`}
        >
            {children}
        </button>
    );

    // Always hide DP and Lunas filters in Calendar Event view per request.
    const bookingStatuses = React.useMemo(() => {
        const base: (BookingStatus | '')[] = ['', 'DP', 'Lunas', 'Soft Booking', 'Booking', 'Waiting List'];
        return base.filter(s => s !== 'DP' && s !== 'Lunas');
    }, []);

    const statusLabels: Record<BookingStatus | '', string> = {
        '': 'Semua',
        'DP': 'DP',
        'Lunas': 'Lunas',
        'Soft Booking': 'Soft Booking',
        'Booking': 'Booking',
        'Waiting List': 'Waiting List'
    };

    // Reset week filter when month changes
    useEffect(() => {
        setSelectedWeek('');
    }, [currentDate.getMonth(), currentDate.getFullYear()]);

    return (
        <div className="fade-in">
             <div className="card p-4 sm:p-6 overflow-hidden">
                <header className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4 flex-wrap">
                    {/* Left: Title & Venue Filter */}
                    <div className="flex items-center gap-4 flex-wrap">
                        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] shrink-0">
                            Kalender Event
                        </h1>
                        <select
                            value={defaultVenueValue}
                            onChange={(e) => {
                                if (!assignedVenue) {
                                    const newVenue = e.target.value;
                                    setActiveView({ type: 'CalendarEvent', venueName: newVenue || undefined });
                                }
                            }}
                            disabled={isVenueDropdownDisabled}
                            className="form-select py-2 pl-3 pr-9 text-sm w-full sm:w-auto"
                            aria-label="Filter berdasarkan venue"
                        >
                            {!assignedVenue && <option value="">Semua Venue</option>}
                            {displayedVenues.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
                        </select>
                       
                    </div>

                     {/* Center: Navigation */}
                    <div className="flex items-center gap-2">
                        <button onClick={goToPreviousMonth} className="p-2 rounded-lg hover:bg-[var(--color-interactive)] transition-colors" aria-label="Bulan sebelumnya">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                        </button>
                        <button onClick={goToToday} className="px-4 py-2 text-sm font-semibold rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-interactive)] transition-colors">Hari Ini</button>
                        <button onClick={goToNextMonth} className="p-2 rounded-lg hover:bg-[var(--color-interactive)] transition-colors" aria-label="Bulan berikutnya">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                        </button>
                    </div>

                    {/* Right: View Switcher & Actions */}
                    <div className="flex items-center gap-3">
                         <div className="flex items-center gap-1 bg-[var(--color-interactive)] p-1 rounded-lg">
                            <ViewSwitcherButton isActive={viewMode === 'month'} onClick={() => setViewMode('month')} ariaLabel="Tampilan Bulan">
                                <GridIcon className="w-5 h-5" />
                            </ViewSwitcherButton>
                             <ViewSwitcherButton isActive={viewMode === 'agenda'} onClick={() => setViewMode('agenda')} ariaLabel="Tampilan Agenda">
                                <ListIcon className="w-5 h-5" />
                            </ViewSwitcherButton>
                        </div>
                        {(userRole === 'Admin' || userRole === 'Manager') && (
                            <button 
                                onClick={() => {
                                    // Default to the first day of the currently viewed month
                                    setSelectedDate(dateUtils.toLocalDateString(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)));
                                    setIsAddEventModalOpen(true);
                                }}
                                className="btn-primary py-2.5 px-4 flex items-center"
                            >
                                <PlusIcon className="w-5 h-5 sm:mr-2" />
                                <span className="hidden sm:inline">Tambah Event</span>
                            </button>
                        )}
                    </div>
                </header>
                
                <div className="border-b border-[var(--color-border)] mb-4 pb-4">
                    <div className="flex items-baseline gap-3 mb-2">
                        <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">Status Booking:</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {bookingStatuses.map(status => (
                            <button
                                key={status}
                                onClick={() => setBookingStatusFilter(status)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 border ${
                                    bookingStatusFilter === status
                                        ? 'bg-[var(--color-primary)] text-white border-transparent shadow-md'
                                        : 'bg-transparent text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-interactive)] hover:border-[var(--color-interactive-hover)]'
                                }`}
                            >
                                {statusLabels[status]}
                            </button>
                        ))}
                    </div>
                    
                    {viewMode === 'agenda' && (
                        <div className="flex items-baseline gap-3 mt-4">
                            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">Filter Minggu:</h3>
                            <select
                                value={selectedWeek}
                                onChange={(e) => setSelectedWeek(e.target.value ? Number(e.target.value) : '')}
                                className="form-select py-2 pl-3 pr-9 text-sm"
                                aria-label="Filter berdasarkan minggu"
                            >
                                <option value="">Semua Minggu</option>
                                <option value={1}>Minggu 1 ({currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })})</option>
                                <option value={2}>Minggu 2 ({currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })})</option>
                                <option value={3}>Minggu 3 ({currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })})</option>
                                <option value={4}>Minggu 4 ({currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })})</option>
                            </select>
                        </div>
                    )}
                </div>


                <h2 className="text-xl font-bold text-[var(--color-text-primary)] text-center mb-4">
                    {monthYearFormat.format(currentDate)}
                </h2>

                {isLoading ? (
                    <div className="flex justify-center items-center h-96">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)] mx-auto"></div>
                        <p className="ml-4 text-[var(--color-text-secondary)]">Memuat data event...</p>
                    </div>
                ) : (
                    viewMode === 'month' ? (
                        <CalendarGrid 
                            currentDate={currentDate}
                            events={filteredEvents}
                            onDateClick={handleDateClick}
                            onEventClick={handleEventClick}
                        />
                    ) : (
                        <AgendaView
                            currentDate={currentDate}
                            events={filteredEvents}
                            onEventClick={handleEventClick}
                        />
                    )
                )}
            </div>

             <AddEventModal 
                isOpen={isAddEventModalOpen}
                onClose={() => {
                    setIsAddEventModalOpen(false);
                    setSelectedDate(null);
                }}
                onSave={handleAddEvent}
                selectedDate={selectedDate}
                venueName={effectiveVenueName || undefined}
                userRole={userRole}
            />
            {selectedEvent && (
                <EventDetailModal
                    event={selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                    onUpdate={handleEventUpdate}
                    onDelete={handleEventDelete}
                    userRole={userRole}
                />
            )}
        </div>
    );
};

export default CalendarEventView;
