import React, { useState, useMemo, useEffect } from 'react';
import { ActiveView, LaporanModalInfo } from './App';
import Header from './Header';
import GrafikView from './GrafikView';
import ManagemenUserView from './ManagemenUserView';
import { Venue, MarketingPerson, DealingEntry, UserRole, EventStatus, BookingStatus } from './types';
import { useVenues } from './VenueContext';
import AddVenueModal from './AddVenueModal';
import { PlusIcon, ExcelIcon, TrashIcon, EditIcon, PdfIcon, CsvIcon, CalendarIcon, CloseIcon, FilterIcon, ListIcon, GridIcon, TasksIcon, TeamIcon, SuccessIcon } from './Icons';
import AddEmployeeModal from './AddEmployeeModal';
import AddDealModal from './AddDealModal';
import DealDetailModal from './DealDetailModal';
import FilterSection, { DealFilters } from './FilterSection';
import { supabase } from './supabaseClient';
import ProfileView from './ProfileView';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import CalendarEventView from './CalendarEventView';
import { dateUtils } from './dateUtils';
import MarketingView from './MarketingView';
import LaporanBitrixView from './LaporanBitrixView';
import EventCountingView from './EventCountingView';
import LeaderboardView from './LeaderboardView';
import SiteSettingsView from './SiteSettingsView';


interface MainContentProps {
    activeView: ActiveView;
    setActiveView: (view: ActiveView) => void;
    setLaporanModalData: (data: LaporanModalInfo | null) => void;
    onLogout: () => void;
    userRole: UserRole;
    assignedVenue: string | null;
}

// Helper function for event status color
const getEventStatusColor = (status: EventStatus): string => {
    switch (status) {
        case 'Confirmed':
            return 'bg-green-500';
        case 'Tentative':
            return 'bg-yellow-500';
        case 'Cancelled':
            return 'bg-red-500';
        case 'Waiting List':
            return 'bg-gray-400';
        default:
            return 'bg-gray-400';
    }
};

const formatDateRelative = (dateString: string) => {
    const eventDate = dateUtils.parseLocalDate(dateString);
    const today = dateUtils.parseLocalDate(dateUtils.getTodayString());

    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return 'Hari Ini';
    }
    if (diffDays === 1) {
        return 'Besok';
    }
    if (diffDays === -1) {
        return 'Kemarin';
    }
    return dateUtils.formatForDisplay(eventDate);
};


// --- MonthlyBookingStatus component for Dashboard ---
const BookingDonutChart: React.FC<{ booked: number, available: number }> = ({ booked, available }) => {
    // FIX: The left-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.
    // FIX: The right-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.
    const total = Number(booked) + Number(available);
    if (total === 0) return null;

    const size = 140;
    const strokeWidth = 20;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const bookedPercentage = total > 0 ? Number(booked) / total : 0;
    const strokeDashoffset = circumference * (1 - bookedPercentage);

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="var(--color-interactive-hover)"
                    strokeWidth={strokeWidth}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="var(--color-primary)"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-[var(--color-text-primary)]">{booked}</span>
                <span className="text-sm text-[var(--color-text-secondary)]">Terisi</span>
            </div>
        </div>
    );
};

const MonthlyBookingStatus: React.FC<{ userRole: UserRole; assignedVenue: string | null; }> = ({ userRole, assignedVenue }) => {
    const { venues } = useVenues();
    const currentYear = new Date().getFullYear();
    const [stats, setStats] = useState({ booked: 0, total: 0 });
    const [bookingStats, setBookingStats] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [selectedVenue, setSelectedVenue] = useState('');
    const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11 for months, -1 for all

    const isVenueRestricted = userRole === 'User' && !!assignedVenue;

    useEffect(() => {
        const fetchAvailableYears = async () => {
            const { data, error } = await supabase.from('deals').select('tanggalAcara');
            if (error) {
                console.error("Error fetching years for filter:", error.message);
            } else if (data) {
                const years = new Set(
                    data.map(d => dateUtils.parseLocalDate(d.tanggalAcara).getFullYear()).filter(year => !isNaN(year))
                );
                if (!years.has(currentYear)) years.add(currentYear);
                setAvailableYears(Array.from(years).sort((a, b) => b - a));
            }
        };
        fetchAvailableYears();
    }, []);

    useEffect(() => {
        const fetchBookingStats = async () => {
            setIsLoading(true);

            let firstDay: Date, lastDay: Date, daysInPeriod: number;
            const isAllMonths = selectedMonth === -1;

            if (isAllMonths) {
                firstDay = new Date(selectedYear, 0, 1);
                lastDay = new Date(selectedYear, 11, 31);
                const isLeap = (selectedYear % 4 === 0 && selectedYear % 100 !== 0) || selectedYear % 400 === 0;
                daysInPeriod = isLeap ? 366 : 365;
            } else {
                firstDay = new Date(selectedYear, selectedMonth, 1);
                lastDay = new Date(selectedYear, selectedMonth + 1, 0);
                daysInPeriod = lastDay.getDate();
            }

            const firstDayStr = dateUtils.toLocalDateString(firstDay);
            const lastDayStr = dateUtils.toLocalDateString(lastDay);

            let query = supabase.from('deals').select('tanggalAcara, jenisBooking')
                .gte('tanggalAcara', firstDayStr)
                .lte('tanggalAcara', lastDayStr);

            const venueToFilter = isVenueRestricted ? assignedVenue : selectedVenue;
            if (venueToFilter) {
                query = query.eq('namaVenue', venueToFilter);
            }

            const { data, error } = await query;

            if (error) {
                console.error("Error fetching booking stats for chart:", error.message);
            } else {
                const bookedDates = new Set(data.map(d => d.tanggalAcara));
                setStats({ booked: bookedDates.size, total: daysInPeriod });

                // Count bookings by status
                const statusCounts: Record<string, number> = {};
                data.forEach(d => {
                    statusCounts[d.jenisBooking] = (statusCounts[d.jenisBooking] || 0) + 1;
                });
                setBookingStats(statusCounts);
            }
            setIsLoading(false);
        };

        if (availableYears.length > 0) {
            fetchBookingStats();
        }
    }, [selectedVenue, selectedYear, selectedMonth, availableYears, userRole, assignedVenue, isVenueRestricted]);

    const availableDays = stats.total - stats.booked;

    const displayPeriod = useMemo(() => {
        if (selectedMonth === -1) return `Tahun ${selectedYear}`;
        const date = new Date(selectedYear, selectedMonth);
        return date.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
    }, [selectedYear, selectedMonth]);

    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    return (
        <div className="card p-6 h-full">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-2">
                <div>
                    <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">Status Booking</h2>
                    <p className="text-sm text-[var(--color-text-secondary)]">{displayPeriod}</p>
                </div>
                <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2">
                    <select
                        id="year-filter-dashboard"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="form-select text-sm py-2"
                        aria-label="Filter by Year"
                    >
                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select
                        id="month-filter-dashboard"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="form-select text-sm py-2"
                        aria-label="Filter by Month"
                    >
                        <option value={-1}>Semua Bulan</option>
                        {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    <select
                        id="venue-filter-dashboard"
                        value={isVenueRestricted ? assignedVenue : selectedVenue}
                        onChange={(e) => setSelectedVenue(e.target.value)}
                        className="form-select text-sm py-2"
                        aria-label="Filter by Venue"
                        disabled={isVenueRestricted}
                    >
                        <option value="">Semua Venue</option>
                        {venues.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
                        <BookingDonutChart booked={stats.booked} available={availableDays} />
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded-md bg-[var(--color-primary)]"></div>
                                <div>
                                    <p className="font-semibold text-[var(--color-text-primary)]">{stats.booked} Hari Terisi</p>
                                    <p className="text-sm text-[var(--color-text-secondary)]">Jadwal sudah dipesan</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded-md bg-[var(--color-interactive-hover)]"></div>
                                <div>
                                    <p className="font-semibold text-[var(--color-text-primary)]">{availableDays} Hari Kosong</p>
                                    <p className="text-sm text-[var(--color-text-secondary)]">Jadwal masih tersedia</p>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-[var(--color-border)]">
                                <p className="font-bold text-lg text-[var(--color-text-primary)]">{stats.total} Total Hari</p>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-[var(--color-border)] pt-4">
                        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Distribusi Status Booking</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Object.entries(bookingStats).map(([status, count]) => (
                                <div key={status} className="text-center p-3 bg-gray-50 rounded-lg">
                                    <p className="text-2xl font-bold text-[var(--color-text-primary)]">{count}</p>
                                    <p className="text-sm text-[var(--color-text-secondary)]">{status}</p>
                                </div>
                            ))}
                            {Object.keys(bookingStats).length === 0 && (
                                <div className="col-span-full text-center py-4">
                                    <p className="text-[var(--color-text-secondary)]">Tidak ada data booking</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


// --- UpcomingEvents ---
interface UpcomingEventsProps {
    setActiveView: (view: ActiveView) => void;
    userRole: UserRole;
    assignedVenue: string | null;
    onOpenDirektorModal?: () => void;
}

const UpcomingEvents: React.FC<UpcomingEventsProps> = ({ setActiveView, userRole, assignedVenue, onOpenDirektorModal }) => {
    const [upcomingEvents, setUpcomingEvents] = useState<DealingEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUpcomingEvents = async () => {
            setIsLoading(true);
            let query = supabase
                .from('deals')
                .select('*')
                .order('tanggalAcara', { ascending: false })
                .limit(userRole === 'Direktor' ? 10 : 5);

            if (userRole === 'User' && assignedVenue) {
                query = query.eq('namaVenue', assignedVenue);
            }

            const { data, error } = await query;

            if (error) {
                console.error("Error fetching upcoming events:", error.message);
            } else {
                setUpcomingEvents(data as DealingEntry[]);
            }
            setIsLoading(false);
        };

        fetchUpcomingEvents();
    }, [userRole, assignedVenue]);

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

    const getEventStatusColor = (status: EventStatus): string => {
        switch (status) {
            case 'Confirmed':
                return 'bg-green-500';
            case 'Waiting List':
                return 'bg-yellow-500';
            case 'Tentative':
            default:
                return 'bg-blue-500';
        }
    };

    return (
        <div className="card p-8 h-full">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Event Terbaru</h2>
                {userRole === 'Direktor' && onOpenDirektorModal && (
                    <button
                        onClick={onOpenDirektorModal}
                        className="text-sm text-[var(--color-primary)] hover:underline"
                    >
                        Lihat Semua
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-40">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--color-primary)]"></div>
                </div>
            ) : upcomingEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {upcomingEvents.map(event => {
                        const status: EventStatus = mapBookingStatusToEventStatus(event.jenisBooking);
                        return (
                            <div key={event.id} className="card p-4 hover:shadow-lg transition-all duration-200 cursor-pointer" onClick={() => setActiveView({ type: 'CalendarEvent', selectedEventId: event.id })}>
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${getEventStatusColor(status)}`}></div>
                                        <span className="text-xs font-medium text-[var(--color-text-secondary)] px-2 py-1 rounded-full bg-gray-100 uppercase">{event.jenisBooking}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                                            {dateUtils.parseLocalDate(event.tanggalAcara).toLocaleDateString('id-ID', {
                                                day: 'numeric',
                                                month: 'short'
                                            })}
                                        </p>
                                        <p className="text-xs text-[var(--color-text-secondary)]">
                                            {dateUtils.parseLocalDate(event.tanggalAcara).toLocaleDateString('id-ID', {
                                                weekday: 'short'
                                            })}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="font-bold text-lg text-[var(--color-text-primary)]">{event.namaClient}</h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <p className="text-[var(--color-text-secondary)]">Venue</p>
                                            <p className="font-medium text-[var(--color-text-primary)]">{event.namaVenue}</p>
                                        </div>
                                        <div>
                                            <p className="text-[var(--color-text-secondary)]">Marketing</p>
                                            <p className="font-medium text-[var(--color-text-primary)]">{event.namaMarketing}</p>
                                        </div>
                                        <div>
                                            <p className="text-[var(--color-text-secondary)]">Pax</p>
                                            <p className="font-medium text-[var(--color-text-primary)]">{event.totalPax} ({event.namaPax})</p>
                                        </div>
                                        <div>
                                            <p className="text-[var(--color-text-secondary)]">Jenis Acara</p>
                                            <JenisAcaraBadge jenis={event.jenisAcara} />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                                    <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                                        <span>Booking: {event.tanggalBooking}</span>
                                        {event.tanggalPelunasan && <span>Pelunasan: {event.tanggalPelunasan}</span>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-12">
                    <CalendarIcon className="w-16 h-16 mx-auto text-[var(--color-text-secondary)] mb-4" />
                    <p className="text-[var(--color-text-secondary)] text-lg">Tidak ada event</p>
                    <p className="text-[var(--color-text-secondary)] text-sm mt-2">Event akan muncul di sini</p>
                </div>
            )}

            {userRole !== 'Direktor' && (
                <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                    <button
                        onClick={() => setActiveView({ type: 'CalendarEvent', venueName: assignedVenue || undefined })}
                        className="w-full text-center text-sm text-[var(--color-primary)] hover:underline"
                    >
                        Lihat Kalender Lengkap
                    </button>
                </div>
            )}
        </div>
    );
};
interface DirektorCalendarModalProps {
    events: DealingEntry[];
    onClose: () => void;
}

const DirektorCalendarModal: React.FC<DirektorCalendarModalProps> = ({ events, onClose }) => {
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

    // Group events by date for better display
    const eventsByDate = useMemo(() => {
        const grouped: Record<string, DealingEntry[]> = {};
        events.forEach(event => {
            const date = event.tanggalAcara;
            if (!grouped[date]) grouped[date] = [];
            grouped[date].push(event);
        });
        return grouped;
    }, [events]);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50 fade-in">
            <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl max-w-6xl w-full max-h-[95vh] p-4 sm:p-6 md:p-8 relative border border-[var(--color-border)] flex flex-col">
                <div className="flex justify-between items-start mb-4 sm:mb-6 flex-shrink-0">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">Dashboard Kalender Event</h2>
                        <p className="text-sm text-[var(--color-text-secondary)] mt-1">Ringkasan semua event untuk Direktur</p>
                    </div>
                    <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <CloseIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                </div>

                <div className="overflow-y-auto pr-2 -mr-4 flex-grow">
                    {Object.keys(eventsByDate).length > 0 ? (
                        <div className="space-y-4 sm:space-y-6">
                            {Object.entries(eventsByDate).map(([date, dateEvents]) => (
                                <div key={date} className="border border-[var(--color-border)] rounded-lg p-3 sm:p-4">
                                    <h3 className="text-base sm:text-lg font-semibold text-[var(--color-text-primary)] mb-3">
                                        {dateUtils.parseLocalDate(date).toLocaleDateString('id-ID', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                        {(dateEvents as DealingEntry[]).map(event => {
                                            const status: EventStatus = mapBookingStatusToEventStatus(event.jenisBooking);
                                            return (
                                                <div key={event.id} className="bg-[var(--color-background)] p-3 sm:p-4 rounded-lg border border-[var(--color-border)] hover:shadow-md transition-shadow">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className={`w-2 h-2 rounded-full ${getEventStatusColor(status)}`}></div>
                                                        <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase">{event.jenisBooking}</span>
                                                    </div>
                                                    <h4 className="font-bold text-[var(--color-text-primary)] mb-1 text-sm sm:text-base">{event.namaClient}</h4>
                                                    <p className="text-sm text-[var(--color-text-secondary)] mb-1">{event.namaVenue}</p>
                                                    <p className="text-sm text-[var(--color-text-secondary)] mb-1">Marketing: {event.namaMarketing}</p>
                                                    <p className="text-sm text-[var(--color-text-secondary)]">Pax: {event.totalPax} | Acara: {event.jenisAcara}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 sm:py-12">
                            <CalendarIcon className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-[var(--color-text-secondary)] mb-4" />
                            <p className="text-[var(--color-text-secondary)] text-base sm:text-lg">Tidak ada event untuk ditampilkan.</p>
                        </div>
                    )}
                </div>

                <div className="mt-4 sm:mt-6 pt-4 border-t border-[var(--color-border)] flex flex-col sm:flex-row justify-between items-center gap-2 flex-shrink-0">
                    <div className="text-sm text-[var(--color-text-secondary)]">
                        Total Events: {events.length}
                    </div>
                    <button onClick={onClose} className="px-4 sm:px-6 py-2 sm:py-2.5 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-xl hover:bg-gray-50 font-semibold transition-colors w-full sm:w-auto">
                        Tutup Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- DashboardView ---
interface DashboardViewProps {
    setActiveView: (view: ActiveView) => void;
    userRole: UserRole;
    assignedVenue: string | null;
}

const DashboardView: React.FC<DashboardViewProps> = ({ setActiveView, userRole, assignedVenue }) => {
    const { venues, deleteVenue } = useVenues();
    const [marketingCounts, setMarketingCounts] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isDirektorCalendarModalOpen, setIsDirektorCalendarModalOpen] = useState(false);
    const [upcomingEvents, setUpcomingEvents] = useState<DealingEntry[]>([]);
    const [isAddVenueModalOpen, setIsAddVenueModalOpen] = useState(false);

    const displayedVenues = useMemo(() => {
        if (userRole === 'User' && assignedVenue) {
            return venues.filter(v => v.name === assignedVenue);
        }
        return venues;
    }, [userRole, assignedVenue, venues]);

    useEffect(() => {
        const fetchCounts = async () => {
            const { data, error } = await supabase
                .from('marketing_staff')
                .select('venueName');

            if (error) {
                console.error('Error fetching marketing counts:', error.message);
            } else {
                const counts = (data as { venueName: string }[]).reduce((acc, curr) => {
                    acc[curr.venueName] = (acc[curr.venueName] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);
                setMarketingCounts(counts);
            }
            setIsLoading(false);
        };
        fetchCounts();
    }, []);

    const fetchUpcomingEvents = async () => {
        let query = supabase
            .from('deals')
            .select('*')
            .order('tanggalAcara', { ascending: false })
            .limit(10);

        if (userRole === 'User' && assignedVenue) {
            query = query.eq('namaVenue', assignedVenue);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error fetching upcoming events:", error.message);
        } else {
            setUpcomingEvents(data as DealingEntry[]);
        }
    };

    useEffect(() => {
        if (userRole === 'Direktor') {
            fetchUpcomingEvents();
        }
    }, [userRole, assignedVenue]);

    return (
        <div className="fade-in space-y-8">
            {userRole === 'Direktor' ? (
                <div className="space-y-8">
                    <MonthlyBookingStatus userRole={userRole} assignedVenue={assignedVenue} />
                    <UpcomingEvents setActiveView={setActiveView} userRole={userRole} assignedVenue={assignedVenue} onOpenDirektorModal={() => setIsDirektorCalendarModalOpen(true)} />
                </div>
            ) : (
                <UpcomingEvents setActiveView={setActiveView} userRole={userRole} assignedVenue={assignedVenue} />
            )}

            <div>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">Venue</h1>
                        <p className="text-[var(--color-text-secondary)]">Pilih venue untuk melihat detail</p>
                    </div>
                    {(userRole === 'Admin' || userRole === 'IT') && (
                        <button
                            onClick={() => setIsAddVenueModalOpen(true)}
                            className="btn-primary py-2.5 px-5 flex items-center"
                        >
                            <PlusIcon className="w-5 h-5 mr-2" />
                            Tambah Venue
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {displayedVenues.map(venue => (
                        <div
                            key={venue.name}
                            className="card p-6 cursor-pointer transform group relative"
                            onClick={() => setActiveView({ type: 'VenueDetail', venueName: venue.name })}
                        >
                            {(userRole === 'Admin' || userRole === 'IT') && venue.id && (
                                <button
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        if (window.confirm(`Apakah Anda yakin ingin menghapus venue "${venue.name}"?`)) {
                                            const result = await deleteVenue(venue.id!);
                                            if (!result.success) {
                                                alert(result.error || 'Gagal menghapus venue.');
                                            }
                                        }
                                    }}
                                    className="absolute top-3 right-3 text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] p-1.5 rounded-full hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                    aria-label={`Hapus venue ${venue.name}`}
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            )}
                            <h3 className="font-bold text-lg text-[var(--color-text-primary)]">{venue.name}</h3>
                            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                                {isLoading ? 'Loading...' : `${marketingCounts[venue.name] || 0} Marketing Staff`}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <AddVenueModal
                isOpen={isAddVenueModalOpen}
                onClose={() => setIsAddVenueModalOpen(false)}
            />

            {isDirektorCalendarModalOpen && (
                <DirektorCalendarModal
                    events={upcomingEvents}
                    onClose={() => setIsDirektorCalendarModalOpen(false)}
                />
            )}
        </div>
    );
};

// --- DataDealingView ---
const BookingStatusBadge: React.FC<{ status: BookingStatus }> = ({ status }) => {
    let statusClasses = '';
    switch (status) {
        case 'Lunas':
        case 'Booking':
            statusClasses = 'bg-green-50 text-green-600';
            break;
        case 'DP':
        case 'Soft Booking':
            statusClasses = 'bg-yellow-50 text-yellow-600';
            break;
        case 'Waiting List':
            statusClasses = 'bg-gray-100 text-gray-600';
            break;
        default:
            statusClasses = 'bg-gray-100 text-gray-600';
            break;
    }

    return (
        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusClasses}`}>
            {status}
        </span>
    );
};

const JenisAcaraBadge: React.FC<{ jenis: 'Wedding' | 'Non Wedding' }> = ({ jenis }) => {
    const jenisClasses = jenis === 'Wedding'
        ? 'bg-pink-50 text-pink-600'
        : 'bg-sky-50 text-sky-600';

    return (
        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${jenisClasses}`}>
            {jenis}
        </span>
    );
};

const initialFilters: DealFilters = {
    namaClient: '',
    namaVenue: '',
    namaMarketing: '',
    jenisAcara: '',
    jenisBooking: '',
    sumberData: '',
    tanggalAcaraStart: '',
    tanggalAcaraEnd: '',
};

const DataDealingView: React.FC<{ userRole: UserRole; assignedVenue: string | null; }> = ({ userRole, assignedVenue }) => {
    const [deals, setDeals] = useState<DealingEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDeals, setSelectedDeals] = useState<Set<number>>(new Set());
    const [isAddDealModalOpen, setIsAddDealModalOpen] = useState(false);
    const [editingDeal, setEditingDeal] = useState<DealingEntry | null>(null);
    const [filters, setFilters] = useState<DealFilters>(initialFilters);
    const [marketingFilterOptions, setMarketingFilterOptions] = useState<MarketingPerson[]>([]);
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const [showFilters, setShowFilters] = useState(false);
    // Pagination
    const [pageSize, setPageSize] = useState<number>(10);
    const [currentPage, setCurrentPage] = useState<number>(1);

    useEffect(() => {
        const fetchDeals = async () => {
            setIsLoading(true);
            try {
                let query = supabase.from('deals').select('*').order('tanggalBooking', { ascending: false });
                if (userRole === 'User' && assignedVenue) {
                    query = query.eq('namaVenue', assignedVenue);
                }
                const { data, error } = await query;
                if (error) {
                    console.error('Error fetching deals:', error.message);
                    alert('Gagal memuat data dealing.');
                } else {
                    setDeals(data as DealingEntry[]);
                }
            } catch (err) {
                console.error('Unexpected error in fetchDeals:', err);
                alert('Terjadi kesalahan tak terduga saat memuat data dealing.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchDeals();
    }, [userRole, assignedVenue]);

    useEffect(() => {
        const fetchMarketingOptions = async () => {
            try {
                let query = supabase.from('marketing_staff').select('name, venueName');
                
                // If venue is selected, fetch only marketing for that venue
                // Otherwise, fetch all marketing staff
                if (filters.namaVenue) {
                    query = query.eq('venueName', filters.namaVenue);
                }
                
                const { data, error } = await query;

                if (error) {
                    console.error("Error fetching marketing options for filter:", error.message);
                    setMarketingFilterOptions([]);
                } else {
                    // Remove duplicates by name
                    const uniqueMarketing = Array.from(new Map((data as MarketingPerson[]).map(m => [m.name, m])).values());
                    setMarketingFilterOptions(uniqueMarketing);
                }
            } catch (err) {
                console.error("Error in fetchMarketingOptions:", err);
                setMarketingFilterOptions([]);
            }
        };
        fetchMarketingOptions();
    }, [filters.namaVenue]);

    const handleFilterChange = <K extends keyof DealFilters>(key: K, value: DealFilters[K]) => {
        setFilters(prev => {
            const newFilters = { ...prev, [key]: value };
            return newFilters;
        });
    };

    const handleResetFilters = () => {
        setFilters(initialFilters);
    };

    const sumberDataOptions = useMemo(() => {
        const sources = new Set(deals.map(deal => deal.sumberData));
        return Array.from(sources).filter(Boolean); // Filter out empty strings
    }, [deals]);

    const filteredDeals = useMemo(() => {
        return deals.filter(deal => {
            const { namaClient, namaVenue, namaMarketing, jenisAcara, jenisBooking, sumberData, tanggalAcaraStart, tanggalAcaraEnd } = filters;

            if (namaClient && !deal.namaClient.toLowerCase().includes(namaClient.toLowerCase())) return false;
            if (namaVenue && deal.namaVenue !== namaVenue) return false;
            if (namaMarketing && deal.namaMarketing !== namaMarketing) return false;
            if (jenisAcara && deal.jenisAcara !== jenisAcara) return false;
            if (jenisBooking && deal.jenisBooking !== jenisBooking) return false;
            if (sumberData && deal.sumberData !== sumberData) return false;

            if (tanggalAcaraStart) {
                if (!deal.tanggalAcara) return false;
                const dealDate = dateUtils.parseLocalDate(deal.tanggalAcara);
                const filterDate = dateUtils.parseLocalDate(tanggalAcaraStart);
                if (dealDate < filterDate) return false;
            }
            if (tanggalAcaraEnd) {
                if (!deal.tanggalAcara) return false;
                const dealDate = dateUtils.parseLocalDate(deal.tanggalAcara);
                const filterDate = dateUtils.parseLocalDate(tanggalAcaraEnd);
                if (dealDate > filterDate) return false;
            }

            return true;
        });
    }, [deals, filters]);

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filteredDeals, pageSize]);

    const totalPages = Math.max(1, Math.ceil(filteredDeals.length / pageSize));
    const pageStartIndex = (currentPage - 1) * pageSize;
    const pageDeals = filteredDeals.slice(pageStartIndex, pageStartIndex + pageSize);

    // Select-all applies to currently visible page rows
    const isAllSelected = useMemo(() => {
        if (pageDeals.length === 0) return false;
        return pageDeals.every(deal => selectedDeals.has(deal.id));
    }, [selectedDeals, pageDeals]);

    const handleSelectDeal = (id: number) => {
        setSelectedDeals(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(id)) {
                newSelection.delete(id);
            } else {
                newSelection.add(id);
            }
            return newSelection;
        });
    };

    const handleSelectAllDeals = (e: React.ChangeEvent<HTMLInputElement>) => {
        const pageIds = new Set(pageDeals.map(d => d.id));
        if (e.target.checked) {
            // Add all visible page IDs to the current selection
            setSelectedDeals(prev => new Set([...prev, ...pageIds]));
        } else {
            // Remove all visible page IDs from the current selection
            setSelectedDeals(prev => {
                const newSelection = new Set(prev);
                for (const id of pageIds) {
                    newSelection.delete(id);
                }
                return newSelection;
            });
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedDeals.size > 0) {
            if (window.confirm(`Apakah Anda yakin ingin menghapus ${selectedDeals.size} deal yang dipilih?`)) {
                const idsToDelete = Array.from(selectedDeals);
                const { error } = await supabase.from('deals').delete().in('id', idsToDelete);
                if (error) {
                    console.error('Error deleting deals:', error.message);
                    alert('Gagal menghapus deal.');
                } else {
                    setDeals(prevDeals => prevDeals.filter(deal => !selectedDeals.has(deal.id)));
                    setSelectedDeals(new Set());
                }
            }
        }
    };

    const handleAddDeal = async (newDealData: Omit<DealingEntry, 'id'>) => {
        const { data, error } = await supabase.from('deals').insert([newDealData]).select();

        if (error || !data) {
            console.error('Error adding deal:', error?.message);
            alert('Gagal menambahkan deal.');
        } else {
            setDeals(prevDeals => [data[0] as DealingEntry, ...prevDeals]);
            setIsAddDealModalOpen(false);
        }
    };

    const handleDownloadCSV = () => {
        if (filteredDeals.length === 0) {
            alert("Tidak ada data untuk diunduh.");
            return;
        }
        const headers = [
            "ID", "Nama Client", "Nama Venue", "Nama Marketing", "Nama Package",
            "Total Pax", "Jenis Acara", "Tanggal Booking", "Tanggal Acara",
            "Sumber Data", "Jenis Booking", "Tanggal Pelunasan"
        ];

        const escapeCSV = (str: string | number | null | undefined) => {
            if (str === null || str === undefined) return '';
            const s = String(str);
            if (s.includes(',') || s.includes('"') || s.includes('\n')) {
                return `"${s.replace(/"/g, '""')}"`;
            }
            return s;
        };

        const rows = filteredDeals.map(deal => [
            deal.id,
            escapeCSV(deal.namaClient),
            escapeCSV(deal.namaVenue),
            escapeCSV(deal.namaMarketing),
            escapeCSV(deal.namaPax),
            deal.totalPax,
            deal.jenisAcara,
            deal.tanggalBooking,
            deal.tanggalAcara,
            escapeCSV(deal.sumberData),
            deal.jenisBooking,
            escapeCSV(deal.tanggalPelunasan)
        ].join(','));

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `data-dealing-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadPDF = () => {
        if (filteredDeals.length === 0) {
            alert("Tidak ada data untuk diunduh.");
            return;
        }

        const doc = new jsPDF({ orientation: 'landscape' });
        doc.text("Laporan Data Dealing", 14, 16);

        const tableColumn = [
            "Client", "Venue", "Marketing", "Package", "Total", "Jenis Acara",
            "Tgl Booking", "Tgl Acara", "Sumber", "Booking", "Pelunasan"
        ];
        const tableRows: (string | number)[][] = [];

        filteredDeals.forEach(deal => {
            const dealData = [
                deal.namaClient,
                deal.namaVenue,
                deal.namaMarketing,
                deal.namaPax,
                deal.totalPax,
                deal.jenisAcara,
                deal.tanggalBooking,
                deal.tanggalAcara,
                deal.sumberData,
                deal.jenisBooking,
                deal.tanggalPelunasan
            ];
            tableRows.push(dealData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 20,
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 1.5 },
            headStyles: { fillColor: [30, 41, 59] },
        });

        doc.save(`data-dealing-${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const tableColSpan = userRole === 'Direktor' ? 11 : 13;

    // Summary statistics
    const summaryStats = useMemo(() => {
        const totalDeals = filteredDeals.length;
        const totalPax = filteredDeals.reduce((sum, deal) => sum + (deal.totalPax || 0), 0);
        const lunasCount = filteredDeals.filter(deal => deal.jenisBooking === 'Lunas').length;
        const bookingCount = filteredDeals.filter(deal => deal.jenisBooking === 'Booking').length;
        const dpCount = filteredDeals.filter(deal => deal.jenisBooking === 'DP').length;
        const weddingCount = filteredDeals.filter(deal => deal.jenisAcara === 'Wedding').length;

        return {
            totalDeals,
            totalPax,
            lunasCount,
            bookingCount,
            dpCount,
            weddingCount,
            pendingCount: totalDeals - lunasCount
        };
    }, [filteredDeals]);

    return (
        <div className="fade-in space-y-6">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">Data Dealing</h1>
                    <p className="text-[var(--color-text-secondary)] mt-1">Kelola dan pantau semua data dealing Anda</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {/* View Toggle */}
                    <div className="flex items-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-1">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${viewMode === 'table'
                                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                                }`}
                        >
                            <ListIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden xs:inline">Tabel</span>
                        </button>
                        <button
                            onClick={() => setViewMode('cards')}
                            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${viewMode === 'cards'
                                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                                }`}
                        >
                            <GridIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden xs:inline">Kartu</span>
                        </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-semibold text-[var(--color-text-secondary)] bg-[var(--color-surface)] border border-[var(--color-border)] px-2 sm:px-3 py-1.5 sm:py-2.5 rounded-xl hover:bg-[var(--color-interactive)] hover:text-[var(--color-primary)] transition-all duration-200"
                        >
                            <FilterIcon className="w-3 h-3 sm:w-5 sm:h-5" />
                            <span className="hidden sm:inline">Filter</span>
                        </button>

                        <button onClick={handleDownloadPDF} className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-semibold text-[var(--color-text-secondary)] bg-[var(--color-surface)] border border-[var(--color-border)] px-2 sm:px-3 py-1.5 sm:py-2.5 rounded-xl hover:bg-[var(--color-interactive)] hover:text-[var(--color-primary)] transition-all duration-200">
                            <PdfIcon className="w-3 h-3 sm:w-5 sm:h-5" />
                            <span className="hidden sm:inline">PDF</span>
                        </button>

                        <button onClick={handleDownloadCSV} className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-semibold text-[var(--color-text-secondary)] bg-[var(--color-surface)] border border-[var(--color-border)] px-2 sm:px-3 py-1.5 sm:py-2.5 rounded-xl hover:bg-[var(--color-interactive)] hover:text-[var(--color-primary)] transition-all duration-200">
                            <CsvIcon className="w-3 h-3 sm:w-5 sm:h-5" />
                            <span className="hidden sm:inline">CSV</span>
                        </button>

                        {(userRole === 'Admin' || userRole === 'Manager') && (
                            <>
                                {selectedDeals.size > 0 && (
                                    <button
                                        onClick={handleDeleteSelected}
                                        className="bg-red-500 text-white font-semibold py-1.5 sm:py-2.5 px-2 sm:px-4 rounded-xl hover:bg-red-600 transition-all duration-200 flex items-center shadow-sm text-xs sm:text-sm"
                                    >
                                        <TrashIcon className="w-3 h-3 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                                        <span className="hidden sm:inline">Hapus</span>
                                        <span className="sm:hidden">({selectedDeals.size})</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsAddDealModalOpen(true)}
                                    className="btn-primary py-1.5 sm:py-2.5 px-2 sm:px-4 flex items-center text-xs sm:text-sm"
                                >
                                    <PlusIcon className="w-3 h-3 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                                    <span className="hidden sm:inline">Tambah Deal</span>
                                    <span className="sm:hidden">+</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Pagination controls are rendered below the data table/card view so they match the list */}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                            <TasksIcon className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--color-text-primary)]">{summaryStats.totalDeals}</p>
                            <p className="text-sm text-[var(--color-text-secondary)]">Total Deal</p>
                        </div>
                    </div>
                </div>

                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                            <SuccessIcon className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--color-text-primary)]">{summaryStats.lunasCount}</p>
                            <p className="text-sm text-[var(--color-text-secondary)]">Lunas</p>
                        </div>
                    </div>
                </div>

                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                            <CalendarIcon className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--color-text-primary)]">{summaryStats.pendingCount}</p>
                            <p className="text-sm text-[var(--color-text-secondary)]">Pending</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters Section */}
            {showFilters && (
                <div className="card p-6 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Filter Data</h3>
                        <button
                            onClick={handleResetFilters}
                            className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] underline"
                        >
                            Reset Filter
                        </button>
                    </div>
                    <FilterSection
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onReset={handleResetFilters}
                        sumberDataOptions={sumberDataOptions}
                        marketingOptions={marketingFilterOptions}
                    />
                </div>
            )}

            {/* Data Display */}
            {viewMode === 'table' ? (
                <div className="card p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-full table-fixed">
                            <thead className="bg-gray-50">
                                <tr className="text-[var(--color-text-secondary)]">
                                    {userRole !== 'Direktor' && (
                                        <th className="px-1 sm:px-2 py-2 sm:py-3 w-8 sm:w-10">
                                            <input
                                                type="checkbox"
                                                className="h-3 w-3 sm:h-4 sm:w-4 rounded border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] focus:ring-offset-[var(--color-surface)]"
                                                checked={isAllSelected}
                                                onChange={handleSelectAllDeals}
                                                aria-label="Select all deals"
                                            />
                                        </th>
                                    )}
                                    <th className="px-1 sm:px-2 py-2 sm:py-3 font-semibold text-xs">Nama Client</th>
                                    <th className="px-1 sm:px-2 py-2 sm:py-3 font-semibold text-xs">Venue</th>
                                    <th className="px-1 sm:px-2 py-2 sm:py-3 font-semibold text-xs">Marketing</th>
                                    <th className="px-1 sm:px-2 py-2 sm:py-3 font-semibold text-xs">Package</th>
                                    <th className="px-1 sm:px-2 py-2 sm:py-3 font-semibold text-xs w-12 sm:w-16">Pax</th>
                                    <th className="px-1 sm:px-2 py-2 sm:py-3 font-semibold text-xs w-16 sm:w-20">Jenis</th>
                                    <th className="px-1 sm:px-2 py-2 sm:py-3 font-semibold text-xs w-16 sm:w-20">Tgl Book</th>
                                    <th className="px-1 sm:px-2 py-2 sm:py-3 font-semibold text-xs w-16 sm:w-20">Tgl Acara</th>
                                    <th className="px-1 sm:px-2 py-2 sm:py-3 font-semibold text-xs w-16 sm:w-20">Sumber</th>
                                    <th className="px-1 sm:px-2 py-2 sm:py-3 font-semibold text-xs w-16 sm:w-20">Status</th>
                                    <th className="px-1 sm:px-2 py-2 sm:py-3 font-semibold text-xs w-16 sm:w-20">Pelunasan</th>
                                    {userRole !== 'Direktor' && <th className="px-1 sm:px-2 py-2 sm:py-3 font-semibold text-xs w-16 sm:w-20 text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={tableColSpan} className="text-center p-4 sm:p-8">
                                            <div className="animate-spin rounded-full h-4 w-4 sm:h-6 sm:w-6 border-b-2 border-[var(--color-primary)] mx-auto"></div>
                                            <p className="mt-2 text-[var(--color-text-secondary)] text-xs sm:text-sm">Memuat data...</p>
                                        </td>
                                    </tr>
                                ) : pageDeals.length > 0 ? (
                                    pageDeals.map((deal) => (
                                        <tr key={deal.id}
                                            className={`border-t border-[var(--color-border)] transition-colors ${selectedDeals.has(deal.id) ? 'bg-indigo-50' : 'hover:bg-gray-50'} ${userRole === 'Direktor' ? '' : 'cursor-pointer'}`}
                                            onClick={() => { if (userRole !== 'Direktor') setEditingDeal(deal); }}
                                        >
                                            {userRole !== 'Direktor' && (
                                                <td className="px-1 sm:px-2 py-2" onClick={e => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        className="h-3 w-3 sm:h-4 sm:w-4 rounded border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] focus:ring-offset-[var(--color-surface)]"
                                                        checked={selectedDeals.has(deal.id)}
                                                        onChange={() => handleSelectDeal(deal.id)}
                                                        aria-label={`Select deal for ${deal.namaClient}`}
                                                    />
                                                </td>
                                            )}
                                            <td className="px-1 sm:px-2 py-2 font-semibold text-[var(--color-text-primary)] text-xs truncate max-w-0">{deal.namaClient}</td>
                                            <td className="px-1 sm:px-2 py-2 text-[var(--color-text-secondary)] text-xs truncate max-w-0">{deal.namaVenue}</td>
                                            <td className="px-1 sm:px-2 py-2 text-[var(--color-text-secondary)] text-xs truncate max-w-0">{deal.namaMarketing}</td>
                                            <td className="px-1 sm:px-2 py-2 text-[var(--color-text-secondary)] text-xs truncate max-w-0">{deal.namaPax}</td>
                                            <td className="px-1 sm:px-2 py-2 text-[var(--color-text-secondary)] text-xs text-center">{deal.totalPax}</td>
                                            <td className="px-1 sm:px-2 py-2"><JenisAcaraBadge jenis={deal.jenisAcara} /></td>
                                            <td className="px-1 sm:px-2 py-2 text-[var(--color-text-secondary)] text-xs">{deal.tanggalBooking}</td>
                                            <td className="px-1 sm:px-2 py-2 text-[var(--color-text-secondary)] text-xs">{deal.tanggalAcara}</td>
                                            <td className="px-1 sm:px-2 py-2 text-[var(--color-text-secondary)] text-xs truncate max-w-0">{deal.sumberData}</td>
                                            <td className="px-1 sm:px-2 py-2"><BookingStatusBadge status={deal.jenisBooking} /></td>
                                            <td className="px-1 sm:px-2 py-2 text-[var(--color-text-secondary)] text-xs">{deal.tanggalPelunasan}</td>
                                            {userRole !== 'Direktor' && (
                                                <td className="px-1 sm:px-2 py-2 text-right" onClick={e => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={() => setEditingDeal(deal)}
                                                            className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] p-1 rounded-full hover:bg-gray-50 transition-colors" aria-label={`Edit ${deal.namaClient}`}>
                                                            <EditIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                if (window.confirm(`Hapus deal untuk ${deal.namaClient}?`)) {
                                                                    const { error } = await supabase.from('deals').delete().eq('id', deal.id);
                                                                    if (error) {
                                                                        alert('Gagal menghapus deal.');
                                                                    } else {
                                                                        setDeals(prev => prev.filter(d => d.id !== deal.id));
                                                                    }
                                                                }
                                                            }}
                                                            className="text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] p-1 rounded-full hover:bg-red-50 transition-colors"
                                                            aria-label={`Delete ${deal.namaClient}`}
                                                        >
                                                            <TrashIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={tableColSpan}>
                                            <div className="text-center py-4 sm:py-8">
                                                <TasksIcon className="w-8 h-8 sm:w-12 sm:h-12 mx-auto text-[var(--color-text-secondary)] mb-2" />
                                                <p className="text-[var(--color-text-secondary)] text-xs sm:text-sm">
                                                    {deals.length > 0 ? 'Tidak ada data yang cocok dengan filter Anda.' : 'Tidak ada data dealing yang tersedia.'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* Card View */
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
                            <p className="ml-4 text-[var(--color-text-secondary)]">Memuat data...</p>
                        </div>
                    ) : pageDeals.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {pageDeals.map((deal) => (
                                <div key={deal.id} className="card p-4 hover:shadow-lg transition-all duration-200">
                                    {userRole !== 'Direktor' && (
                                        <div className="flex items-center justify-between mb-3">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] focus:ring-offset-[var(--color-surface)]"
                                                checked={selectedDeals.has(deal.id)}
                                                onChange={() => handleSelectDeal(deal.id)}
                                                aria-label={`Select deal for ${deal.namaClient}`}
                                            />
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => setEditingDeal(deal)}
                                                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] p-2 rounded-full hover:bg-gray-50 transition-colors"
                                                    aria-label={`Edit ${deal.namaClient}`}
                                                >
                                                    <EditIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (window.confirm(`Hapus deal untuk ${deal.namaClient}?`)) {
                                                            const { error } = await supabase.from('deals').delete().eq('id', deal.id);
                                                            if (error) {
                                                                alert('Gagal menghapus deal.');
                                                            } else {
                                                                setDeals(prev => prev.filter(d => d.id !== deal.id));
                                                            }
                                                        }
                                                    }}
                                                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] p-2 rounded-full hover:bg-red-50 transition-colors"
                                                    aria-label={`Delete ${deal.namaClient}`}
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        <div>
                                            <h3 className="font-bold text-lg text-[var(--color-text-primary)] mb-1">{deal.namaClient}</h3>
                                            <p className="text-sm text-[var(--color-text-secondary)]">{deal.namaVenue}</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <p className="text-[var(--color-text-secondary)]">Marketing</p>
                                                <p className="font-medium text-[var(--color-text-primary)]">{deal.namaMarketing}</p>
                                            </div>
                                            <div>
                                                <p className="text-[var(--color-text-secondary)]">Package</p>
                                                <p className="font-medium text-[var(--color-text-primary)]">{deal.totalPax} ({deal.namaPax})</p>
                                            </div>
                                            <div>
                                                <p className="text-[var(--color-text-secondary)]">Jenis Acara</p>
                                                <JenisAcaraBadge jenis={deal.jenisAcara} />
                                            </div>
                                            <div>
                                                <p className="text-[var(--color-text-secondary)]">Status</p>
                                                <BookingStatusBadge status={deal.jenisBooking} />
                                            </div>
                                        </div>

                                        <div className="border-t border-[var(--color-border)] pt-3 space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-[var(--color-text-secondary)]">Booking:</span>
                                                <span className="text-[var(--color-text-primary)]">{deal.tanggalBooking}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-[var(--color-text-secondary)]">Acara:</span>
                                                <span className="text-[var(--color-text-primary)]">{deal.tanggalAcara}</span>
                                            </div>
                                            {deal.tanggalPelunasan && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-[var(--color-text-secondary)]">Pelunasan:</span>
                                                    <span className="text-[var(--color-text-primary)]">{deal.tanggalPelunasan}</span>
                                                </div>
                                            )}
                                            {deal.sumberData && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-[var(--color-text-secondary)]">Sumber:</span>
                                                    <span className="text-[var(--color-text-primary)]">{deal.sumberData}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <TasksIcon className="w-16 h-16 mx-auto text-[var(--color-text-secondary)] mb-4" />
                            <p className="text-[var(--color-text-secondary)] text-lg mb-2">
                                {deals.length > 0 ? 'Tidak ada data yang cocok dengan filter Anda.' : 'Tidak ada data dealing yang tersedia.'}
                            </p>
                            <p className="text-[var(--color-text-secondary)] text-sm">Coba ubah filter atau tambahkan data baru.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Pagination controls (placed below the data list) */}
            {filteredDeals.length > 0 && (
                <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-[var(--color-text-secondary)]">Tampilkan per halaman:</label>
                        <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} className="form-select text-sm py-1">
                            <option value={10}>10</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <span className="text-sm text-[var(--color-text-secondary)]">Menampilkan {filteredDeals.length === 0 ? 0 : pageStartIndex + 1} - {Math.min(pageStartIndex + pageSize, filteredDeals.length)} dari {filteredDeals.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="px-3 py-1 rounded bg-[var(--color-surface)] border border-[var(--color-border)] disabled:opacity-50">Prev</button>
                        <span className="text-sm text-[var(--color-text-secondary)]">Hal {currentPage} / {totalPages}</span>
                        <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="px-3 py-1 rounded bg-[var(--color-surface)] border border-[var(--color-border)] disabled:opacity-50">Next</button>
                    </div>
                </div>
            )}

            <AddDealModal
                isOpen={isAddDealModalOpen}
                onClose={() => setIsAddDealModalOpen(false)}
                onSave={handleAddDeal}
                assignedVenue={assignedVenue}
            />
            {editingDeal && (
                <DealDetailModal
                    key={editingDeal.id}
                    deal={editingDeal}
                    onClose={() => setEditingDeal(null)}
                    onDealUpdate={(updatedDealData) => {
                        setDeals(prevDeals => prevDeals.map(d => d.id === updatedDealData.id ? { ...d, ...updatedDealData } : d));
                        setEditingDeal(prev => prev ? { ...prev, ...updatedDealData } : null);
                    }}
                    onDealDelete={(deletedDealId) => {
                        setDeals(prevDeals => prevDeals.filter(d => d.id !== deletedDealId));
                        setEditingDeal(null);
                    }}
                    userRole={userRole}
                />
            )}
        </div>
    );
};


// --- VenueDetailView ---
interface VenueDetailViewProps {
    venueName: string;
    setLaporanModalData: (data: LaporanModalInfo | null) => void;
    setActiveView: (view: ActiveView) => void;
    userRole: UserRole;
    assignedVenue: string | null;
}

const VenueDetailView: React.FC<VenueDetailViewProps> = ({ venueName, setLaporanModalData, setActiveView, userRole, assignedVenue }) => {
    const { venues } = useVenues();
    const venue = venues.find(v => v.name === venueName);
    const [marketingStaff, setMarketingStaff] = useState<MarketingPerson[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<number>>(new Set());

    // Check if user is restricted to a specific venue
    const isVenueRestricted = userRole === 'User' && !!assignedVenue;
    if (isVenueRestricted && assignedVenue !== venueName) {
        return (
            <div className="card p-6 text-center">
                <h1 className="text-2xl font-bold text-red-500">Akses Ditolak</h1>
                <p className="text-[var(--color-text-secondary)] mt-2">Anda hanya dapat mengakses venue yang ditugaskan kepada Anda.</p>
                <button onClick={() => setActiveView({ type: 'Dashboard' })} className="mt-4 btn-primary">Kembali ke Dashboard</button>
            </div>
        );
    }

    const fetchMarketing = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('marketing_staff')
            .select('*')
            .eq('venueName', venueName)
            .order('name');

        if (error) {
            console.error('Error fetching marketing staff:', error.message);
            alert('Gagal memuat data marketing.');
            setMarketingStaff([]);
        } else {
            setMarketingStaff(data as MarketingPerson[]);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchMarketing();
    }, [venueName]);

    if (!venue) {
        return (
            <div className="card p-6 text-center">
                <h1 className="text-2xl font-bold text-red-500">Venue not found</h1>
                <button onClick={() => setActiveView({ type: 'Dashboard' })} className="mt-4 btn-primary">Back to Dashboard</button>
            </div>
        );
    }

    const handleAddEmployee = async (newEmployee: Omit<MarketingPerson, 'id' | 'venueName'>) => {
        const { error } = await supabase.from('marketing_staff').insert([{ ...newEmployee, venueName: venueName }]);
        if (error) {
            alert('Gagal menambahkan karyawan.');
            console.error('Error adding employee:', (error as Error).message);
        } else {
            setIsAddEmployeeModalOpen(false);
            fetchMarketing(); // Refresh list
        }
    };

    const handleSelectEmployee = (employeeId?: number) => {
        if (!employeeId) return;
        setSelectedEmployeeIds(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(employeeId)) {
                newSelection.delete(employeeId);
            } else {
                newSelection.add(employeeId);
            }
            return newSelection;
        });
    };

    const isAllSelected = marketingStaff.length > 0 && selectedEmployeeIds.size === marketingStaff.length;

    const handleSelectAllEmployees = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allIds = new Set(marketingStaff.map(p => p.id).filter((id): id is number => id !== undefined));
            setSelectedEmployeeIds(allIds);
        } else {
            setSelectedEmployeeIds(new Set());
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedEmployeeIds.size === 0) return;
        if (window.confirm(`Apakah Anda yakin ingin menghapus ${selectedEmployeeIds.size} karyawan yang dipilih?`)) {
            const idsToDelete = Array.from(selectedEmployeeIds);
            const { error } = await supabase.from('marketing_staff').delete().in('id', idsToDelete);

            if (error) {
                alert('Gagal menghapus karyawan.');
                console.error('Error deleting employees:', (error as Error).message);
            } else {
                setSelectedEmployeeIds(new Set());
                fetchMarketing(); // Refresh list
            }
        }
    };

    const tableColSpan = userRole === 'Direktor' ? 3 : 4;

    return (
        <div className="fade-in">
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <div>
                    <button onClick={() => setActiveView({ type: 'Dashboard' })} className="text-sm text-[var(--color-primary)] hover:underline mb-2">&larr; Back to Dashboard</button>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">{venue.name}</h1>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3">
                    {venue.spreadsheetUrl && (
                        <a
                            href={venue.spreadsheetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] font-semibold py-2.5 px-5 flex items-center rounded-xl hover:bg-[var(--color-interactive)] hover:text-[var(--color-text-primary)] transition-all duration-200 shadow-sm"
                        >
                            <ExcelIcon className="w-5 h-5 mr-2 text-green-400" />
                            Spreadsheet
                        </a>
                    )}
                    {userRole !== 'Direktor' && (
                        <>
                            {selectedEmployeeIds.size > 0 && (
                                <button
                                    onClick={handleDeleteSelected}
                                    className="bg-red-500 text-white font-semibold py-2.5 px-5 flex items-center rounded-xl hover:bg-red-600 transition-all duration-200 shadow-sm"
                                >
                                    <TrashIcon className="w-5 h-5 mr-2" />
                                    Hapus ({selectedEmployeeIds.size})
                                </button>
                            )}
                            <button
                                onClick={() => setIsAddEmployeeModalOpen(true)}
                                className="btn-primary py-2.5 px-5 flex items-center"
                            >
                                <PlusIcon className="w-5 h-5 mr-2" />
                                Tambah Karyawan
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-full table-fixed">
                        <thead className="bg-gray-50">
                            <tr className="text-[var(--color-text-secondary)]">
                                {userRole !== 'Direktor' && (
                                    <th className="p-1 sm:p-2 w-8 sm:w-10">
                                        <input
                                            type="checkbox"
                                            className="h-3 w-3 sm:h-4 sm:w-4 rounded border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] focus:ring-offset-[var(--color-surface)]"
                                            checked={isAllSelected}
                                            onChange={handleSelectAllEmployees}
                                            aria-label="Select all employees"
                                        />
                                    </th>
                                )}
                                <th className="p-1 sm:p-2 font-semibold text-xs">Nama Marketing</th>
                                <th className="p-1 sm:p-2 font-semibold text-xs">Jabatan</th>
                                <th className="p-1 sm:p-2 font-semibold text-xs text-right">Laporan</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={tableColSpan} className="text-center p-4 sm:p-8">
                                        <div className="animate-spin rounded-full h-4 w-4 sm:h-6 sm:w-6 border-b-2 border-[var(--color-primary)] mx-auto"></div>
                                        <p className="mt-2 text-[var(--color-text-secondary)] text-xs sm:text-sm">Memuat data marketing...</p>
                                    </td>
                                </tr>
                            ) : marketingStaff.length > 0 ? (
                                marketingStaff.map((person) => (
                                    <tr key={person.id} className={`border-t border-[var(--color-border)] transition-colors ${selectedEmployeeIds.has(person.id!) ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                                        {userRole !== 'Direktor' && (
                                            <td className="p-1 sm:p-2">
                                                <input
                                                    type="checkbox"
                                                    className="h-3 w-3 sm:h-4 sm:w-4 rounded border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] focus:ring-offset-[var(--color-surface)]"
                                                    checked={selectedEmployeeIds.has(person.id!)}
                                                    onChange={() => handleSelectEmployee(person.id)}
                                                    aria-label={`Select ${person.name}`}
                                                />
                                            </td>
                                        )}
                                        <td className="p-1 sm:p-2 font-semibold text-[var(--color-text-primary)] text-xs truncate max-w-0">{person.name}</td>
                                        <td className="p-1 sm:p-2 text-[var(--color-text-secondary)] text-xs truncate max-w-0">{person.role || 'Marketing'}</td>
                                        <td className="p-1 sm:p-2 text-right">
                                            <button
                                                onClick={() => setLaporanModalData({ venue: venue.name, marketingName: person.name })}
                                                className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
                                            >
                                                Lihat Laporan
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={tableColSpan} className="text-center py-4 sm:py-8">
                                        <p className="text-[var(--color-text-secondary)] text-xs sm:text-sm">Belum ada data marketing untuk venue ini.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AddEmployeeModal
                isOpen={isAddEmployeeModalOpen}
                onClose={() => setIsAddEmployeeModalOpen(false)}
                onSave={handleAddEmployee}
                venueName={venueName}
            />
        </div>
    );
};

const MainContent: React.FC<MainContentProps> = ({ activeView, setActiveView, setLaporanModalData, onLogout, userRole, assignedVenue }) => {

    const renderContent = () => {
        switch (activeView.type) {
            case 'Dashboard':
                return <DashboardView setActiveView={setActiveView} userRole={userRole} assignedVenue={assignedVenue} />;
            case 'DataDealing':
                return <DataDealingView userRole={userRole} assignedVenue={assignedVenue} />;
            case 'Grafik':
                return <GrafikView userRole={userRole} assignedVenue={assignedVenue} />;
            case 'CalendarEvent':
                return <CalendarEventView userRole={userRole} venueName={activeView.venueName} setActiveView={setActiveView} assignedVenue={assignedVenue} selectedEventId={activeView.selectedEventId} />;
            case 'EventCounting':
                return <EventCountingView userRole={userRole} assignedVenue={assignedVenue} venueName={activeView.venueName} />;
            case 'Leaderboard':
                return <LeaderboardView userRole={userRole} assignedVenue={assignedVenue} />;
            case 'Profile':
                return <ProfileView />;
            case 'DataUser':
                return <ManagemenUserView userRole={userRole} />;
            case 'Marketing':
                return <MarketingView userRole={userRole} assignedVenue={assignedVenue} />;
            case 'LaporanBitrix':
                return <LaporanBitrixView userRole={userRole} assignedVenue={assignedVenue} />;
            case 'SiteSettings':
                return <SiteSettingsView userRole={userRole} />;
            case 'VenueDetail':
                return <VenueDetailView venueName={activeView.venueName} setLaporanModalData={setLaporanModalData} setActiveView={setActiveView} userRole={userRole} assignedVenue={assignedVenue} />;
            default:
                return <DashboardView setActiveView={setActiveView} userRole={userRole} assignedVenue={assignedVenue} />;
        }
    };

    return (
        <main className="w-full px-6 lg:px-8">
            <Header setActiveView={setActiveView} onLogout={onLogout} />
            <div className="mt-4">
                {renderContent()}
            </div>
        </main>
    );
};

export default MainContent;
