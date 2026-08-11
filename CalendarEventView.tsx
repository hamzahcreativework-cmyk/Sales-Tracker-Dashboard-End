import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CalendarEventEntry, UserRole, DealingEntry, EventStatus, BookingStatus } from './types';
import { PlusIcon, GridIcon, ListIcon, CloseIcon, WarningIcon } from './Icons';
import AddEventModal from './AddEventModal';
import { supabase } from './supabaseClient';
import CalendarGrid from './CalendarGrid';
import EventDetailModal from './EventDetailModal';
import { ActiveView } from './App';
import { useVenues } from './VenueContext';
import AgendaView from './AgendaView';
import { dateUtils } from './dateUtils';

interface CalendarEventViewProps {
    userRole: UserRole;
    venueName?: string;
    setActiveView: (view: ActiveView) => void;
    assignedVenue: string | null;
    selectedEventId?: number;
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

const CalendarEventView: React.FC<CalendarEventViewProps> = ({ userRole, venueName, setActiveView, assignedVenue, selectedEventId }) => {
    const { venues: VENUES } = useVenues();
    const [eventsForGrid, setEventsForGrid] = useState<CalendarEventEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEventEntry | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');
    const [bookingStatusFilter, setBookingStatusFilter] = useState<BookingStatus | ''>('');
    const [selectedWeek, setSelectedWeek] = useState<number | ''>('');
    const [selectedVenuePopup, setSelectedVenuePopup] = useState<string | null>(null);
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

        if (viewMode === 'month') {
            // Month view: show events for the currently viewed month
            filtered = filtered.filter(event => {
                const eventDate = dateUtils.parseLocalDate(event.eventDate);
                return eventDate.getMonth() === currentDate.getMonth() &&
                       eventDate.getFullYear() === currentDate.getFullYear();
            });
        }
        // Agenda view: show ALL events (past + future) without month restriction

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

    const monthlyStats = useMemo(() => {
        const monthEvents = eventsForGrid.filter(event => {
            const eventDate = dateUtils.parseLocalDate(event.eventDate);
            return eventDate.getMonth() === currentDate.getMonth() &&
                   eventDate.getFullYear() === currentDate.getFullYear();
        });
        return {
            total: monthEvents.length,
            softBooking: monthEvents.filter(e => e.jenisBooking === 'Soft Booking').length,
            booking: monthEvents.filter(e => e.jenisBooking === 'Booking').length,
            waitingList: monthEvents.filter(e => e.jenisBooking === 'Waiting List').length,
            dp: monthEvents.filter(e => e.jenisBooking === 'DP').length,
            lunas: monthEvents.filter(e => e.jenisBooking === 'Lunas').length,
        };
    }, [eventsForGrid, currentDate]);

    const venueEventCounts = useMemo(() => {
        const monthEvents = eventsForGrid.filter(event => {
            const eventDate = dateUtils.parseLocalDate(event.eventDate);
            return eventDate.getMonth() === currentDate.getMonth() &&
                   eventDate.getFullYear() === currentDate.getFullYear();
        });
        const counts: Record<string, number> = {};
        monthEvents.forEach(event => {
            if (event.venueName) {
                counts[event.venueName] = (counts[event.venueName] || 0) + 1;
            }
        });
        return counts;
    }, [eventsForGrid, currentDate]);

    const venuePopupEvents = useMemo(() => {
        if (!selectedVenuePopup) return [];
        return eventsForGrid
            .filter(event => {
                const eventDate = dateUtils.parseLocalDate(event.eventDate);
                return event.venueName === selectedVenuePopup &&
                    eventDate.getMonth() === currentDate.getMonth() &&
                    eventDate.getFullYear() === currentDate.getFullYear();
            })
            .sort((a, b) => {
                const dateCompare = a.eventDate.localeCompare(b.eventDate);
                if (dateCompare !== 0) return dateCompare;
                return (a.eventOrder || 1) - (b.eventOrder || 1);
            });
    }, [selectedVenuePopup, eventsForGrid, currentDate]);

    const venueWeekendWarnings = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const weekends: { weekNum: number; saturday: Date; sunday: Date; satStr: string; sunStr: string | null }[] = [];
        let weekNum = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            const d = new Date(year, month, day);
            if (d.getDay() === 6) {
                weekNum++;
                const sunDate = new Date(year, month, day + 1);
                const sunInMonth = sunDate.getMonth() === month;
                weekends.push({
                    weekNum,
                    saturday: d,
                    sunday: sunDate,
                    satStr: dateUtils.toLocalDateString(d),
                    sunStr: sunInMonth ? dateUtils.toLocalDateString(sunDate) : null,
                });
            }
        }

        const monthEvents = eventsForGrid.filter(e => {
            const ed = dateUtils.parseLocalDate(e.eventDate);
            return ed.getMonth() === month && ed.getFullYear() === year;
        });

        const venueNames = VENUES.map(v => v.name);
        const venueResults: {
            venueName: string;
            missing: { weekNum: number; saturday: Date; sunday: Date; satHasEvent: boolean; sunHasEvent: boolean }[];
            totalWeekends: number;
        }[] = [];

        for (const venue of venueNames) {
            const venueDates = new Set(
                monthEvents.filter(e => e.venueName === venue).map(e => e.eventDate)
            );
            const missing = weekends
                .map(w => ({
                    weekNum: w.weekNum,
                    saturday: w.saturday,
                    sunday: w.sunday,
                    satHasEvent: venueDates.has(w.satStr),
                    sunHasEvent: w.sunStr ? venueDates.has(w.sunStr) : true,
                }))
                .filter(w => !w.satHasEvent || !w.sunHasEvent);

            if (missing.length > 0) {
                venueResults.push({ venueName: venue, missing, totalWeekends: weekends.length });
            }
        }

        return { venues: venueResults, totalWeekends: weekends.length };
    }, [eventsForGrid, currentDate, VENUES]);

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


                <div className="mb-4 px-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-semibold text-[var(--color-text-primary)] mr-1">Total Event Bulan Ini:</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-primary)] text-white font-bold text-xs">{monthlyStats.total}</span>
                        <span className="text-[var(--color-border)] select-none">|</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300 font-semibold text-xs">Soft Booking: {monthlyStats.softBooking}</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-300 font-semibold text-xs">Booking: {monthlyStats.booking}</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-300 font-semibold text-xs">Waiting List: {monthlyStats.waitingList}</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300 font-semibold text-xs">DP: {monthlyStats.dp}</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold text-xs">Lunas: {monthlyStats.lunas}</span>
                    </div>
                    {!effectiveVenueName && VENUES.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            {VENUES.map(v => {
                                const count = venueEventCounts[v.name] || 0;
                                const venueColor = getVenueColor(v.name);
                                return (
                                    <button
                                        key={v.name}
                                        onClick={() => setSelectedVenuePopup(v.name)}
                                        className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-interactive)] hover:border-[var(--color-interactive-hover)] transition-all duration-200 cursor-pointer group"
                                    >
                                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 group-hover:scale-125 transition-transform" style={{ backgroundColor: venueColor }}></span>
                                        <span className="group-hover:text-[var(--color-text-primary)] transition-colors">{v.name}</span>
                                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[18px] text-center transition-transform group-hover:scale-110" style={{ backgroundColor: venueColor, color: 'white' }}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <h2 className="text-xl font-bold text-[var(--color-text-primary)] text-center mb-4">
                    {monthYearFormat.format(currentDate)}
                </h2>

                {(() => {
                    const displayedWarnings = effectiveVenueName
                        ? venueWeekendWarnings.venues.filter(v => v.venueName === effectiveVenueName)
                        : venueWeekendWarnings.venues;
                    if (displayedWarnings.length === 0) return null;
                    const isAllVenues = !effectiveVenueName;
                    const totalVenueCount = isAllVenues ? VENUES.length : 1;
                    return (
                        <div className="mb-4 p-4 rounded-xl border border-amber-400 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-600">
                            <div className="flex items-start gap-3">
                                <WarningIcon className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <h3 className="font-bold text-amber-800 dark:text-amber-300 text-sm mb-1">
                                        {isAllVenues
                                            ? 'Target Weekend Venue Belum Tercapai'
                                            : `Target Weekend ${effectiveVenueName} Belum Tercapai`}
                                    </h3>
                                    <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
                                        {isAllVenues
                                            ? 'Setiap venue harus memiliki minimal 1 event di hari Sabtu dan 1 event di hari Minggu setiap weekend.'
                                            : `${effectiveVenueName} harus memiliki minimal 1 event di hari Sabtu dan 1 event di hari Minggu setiap weekend.`}
                                    </p>
                                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                                        {displayedWarnings.map(v => {
                                            const venueColor = getVenueColor(v.venueName);
                                            const achieved = v.totalWeekends - v.missing.length;
                                            return (
                                                <div key={v.venueName} className="border border-amber-300 dark:border-amber-600 rounded-lg p-3 bg-amber-100/50 dark:bg-amber-900/30">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: venueColor }} />
                                                            <span className="font-bold text-xs text-amber-900 dark:text-amber-200">{v.venueName}</span>
                                                        </div>
                                                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                                            v.missing.length <= 1
                                                                ? 'bg-amber-200 text-amber-800'
                                                                : 'bg-red-100 text-red-800'
                                                        }`}>
                                                            {achieved}/{v.totalWeekends} tercapai
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        {v.missing.map(w => {
                                                            const satFormatted = w.saturday.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                                                            const sunFormatted = w.sunday.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                                                            const missingParts: string[] = [];
                                                            if (!w.satHasEvent) missingParts.push(`Sabtu ${satFormatted}`);
                                                            if (!w.sunHasEvent) missingParts.push(`Minggu ${sunFormatted}`);
                                                            return (
                                                                <div key={w.weekNum} className="flex items-center gap-2 text-xs">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                                                                    <span className="text-amber-800 dark:text-amber-300">
                                                                        <span className="font-semibold">Weekend {w.weekNum}:</span> Belum ada event di {missingParts.join(' & ')}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-amber-300 dark:border-amber-600 flex items-center gap-4 text-xs">
                                        <span className="text-amber-800 dark:text-amber-300 font-semibold">
                                            {isAllVenues
                                                ? `Summary: ${displayedWarnings.length} dari ${totalVenueCount} venue belum mencapai target weekend`
                                                : `Summary: ${venueWeekendWarnings.totalWeekends - displayedWarnings[0].missing.length}/${venueWeekendWarnings.totalWeekends} weekend tercapai`}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                            isAllVenues
                                                ? displayedWarnings.length <= 2
                                                    ? 'bg-amber-200 text-amber-800'
                                                    : displayedWarnings.length <= 5
                                                    ? 'bg-orange-200 text-orange-800'
                                                    : 'bg-red-100 text-red-800'
                                                : displayedWarnings[0].missing.length <= 1
                                                    ? 'bg-amber-200 text-amber-800'
                                                    : 'bg-red-100 text-red-800'
                                        }`}>
                                            {isAllVenues
                                                ? `${totalVenueCount - displayedWarnings.length}/${totalVenueCount} venue OK`
                                                : `${displayedWarnings[0].missing.length} weekend belum tercapai`}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}

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

            {selectedVenuePopup && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[51] fade-in" onClick={() => setSelectedVenuePopup(null)}>
                    <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl max-w-lg w-full relative border border-[var(--color-border)]" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
                            <div className="flex items-center gap-3">
                                <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: getVenueColor(selectedVenuePopup) }}></span>
                                <div>
                                    <h3 className="text-lg font-bold text-[var(--color-text-primary)]">{selectedVenuePopup}</h3>
                                    <p className="text-sm text-[var(--color-text-secondary)]">
                                        {venuePopupEvents.length} event di {monthYearFormat.format(currentDate)}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedVenuePopup(null)} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] p-2 rounded-full hover:bg-white/10 transition-colors">
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="max-h-96 overflow-y-auto p-4">
                            {venuePopupEvents.length === 0 ? (
                                <p className="text-center text-[var(--color-text-secondary)] py-8 text-sm">
                                    Tidak ada event untuk venue ini di bulan ini.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {venuePopupEvents.map(event => {
                                        const eventDate = dateUtils.parseLocalDate(event.eventDate);
                                        const formattedDate = eventDate.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
                                        const statusColor = event.jenisBooking === 'Booking' || event.jenisBooking === 'Lunas'
                                            ? 'bg-green-500/10 border-green-500 text-green-800'
                                            : event.jenisBooking === 'Waiting List'
                                            ? 'bg-gray-500/10 border-gray-500 text-gray-800'
                                            : 'bg-yellow-500/10 border-yellow-500 text-yellow-800';
                                        return (
                                            <button
                                                key={event.id}
                                                onClick={() => {
                                                    setSelectedVenuePopup(null);
                                                    handleEventClick(event);
                                                }}
                                                className={`w-full text-left p-3 rounded-lg border-l-4 transition-colors hover:bg-opacity-30 ${statusColor}`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <p className="font-semibold text-sm truncate flex-1">{event.eventOrder || 1}. {event.eventName}</p>
                                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-interactive)] text-[var(--color-text-secondary)] ml-2 flex-shrink-0">
                                                        {event.jenisBooking}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-[var(--color-text-secondary)]">
                                                    <span>{formattedDate}</span>
                                                    {event.waktuAcara && <span>· {event.waktuAcara}</span>}
                                                    {event.paxCount > 0 && <span>· {event.paxCount} pax</span>}
                                                    {event.marketingName && <span>· {event.marketingName}</span>}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-[var(--color-border)]">
                            <button
                                onClick={() => {
                                    setSelectedVenuePopup(null);
                                    setActiveView({ type: 'CalendarEvent', venueName: selectedVenuePopup });
                                }}
                                className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors"
                            >
                                Lihat Kalender {selectedVenuePopup}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarEventView;
