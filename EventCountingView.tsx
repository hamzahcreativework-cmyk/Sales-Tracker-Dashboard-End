import React, { useState, useEffect } from 'react';
import { VENUES } from './constants';
import { DealingEntry, UserRole } from './types';
import { supabase } from './supabaseClient';
import { dateUtils } from './dateUtils';

interface EventCountingViewProps {
    userRole: UserRole;
    assignedVenue: string | null;
    venueName?: string;
}

interface EventCounts {
    monday: { morning: number; evening: number };
    tuesday: { morning: number; evening: number };
    wednesday: { morning: number; evening: number };
    thursday: { morning: number; evening: number };
    friday: { morning: number; evening: number };
    saturday: { morning: number; evening: number };
    sunday: { morning: number; evening: number };
    total: number;
}

const EventCountingView: React.FC<EventCountingViewProps> = ({ userRole, assignedVenue, venueName }) => {
    const [counts, setCounts] = useState<EventCounts>({
        monday: { morning: 0, evening: 0 },
        tuesday: { morning: 0, evening: 0 },
        wednesday: { morning: 0, evening: 0 },
        thursday: { morning: 0, evening: 0 },
        friday: { morning: 0, evening: 0 },
        saturday: { morning: 0, evening: 0 },
        sunday: { morning: 0, evening: 0 },
        total: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [yearStart, setYearStart] = useState<string>(`${new Date().getFullYear()}-01`);
    const [yearEnd, setYearEnd] = useState<string>(`${new Date().getFullYear()}-12`);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [filterMode, setFilterMode] = useState<'year' | 'range'>('year');
    const [emptyDatesByVenue, setEmptyDatesByVenue] = useState<Record<string, { weekdays: number; weekendSlots: number }>>({});

    const effectiveVenueName = assignedVenue || venueName;

    const getYearRangeBounds = (startMonth: string, endMonth: string) => {
        if (!startMonth || !endMonth) {
            return null;
        }

        const startYear = Number(startMonth.slice(0, 4));
        const endYear = Number(endMonth.slice(0, 4));
        const startMonthIndex = Number(startMonth.slice(5, 7));
        const endMonthIndex = Number(endMonth.slice(5, 7));

        const firstDayOfStartMonth = `${startMonth}-01`;
        const lastDayOfEndMonth = `${endMonth}-${String(new Date(endYear, endMonthIndex, 0).getDate()).padStart(2, '0')}`;

        return {
            start: firstDayOfStartMonth,
            end: lastDayOfEndMonth,
            startDate: dateUtils.parseLocalDate(firstDayOfStartMonth),
            endDate: dateUtils.parseLocalDate(lastDayOfEndMonth),
        };
    };

    const fetchAndCountEvents = async () => {
        setIsLoading(true);
        setError(null);
        try {
            console.log('Fetching events for counting...');
            const venuesToCount = effectiveVenueName ? [effectiveVenueName] : VENUES.map(v => v.name);

            let query = supabase.from('deals').select('namaVenue, tanggalAcara, waktuAcara');
            if (effectiveVenueName) {
                query = query.eq('namaVenue', effectiveVenueName);
            }

            let rangeStartValue = '';
            let rangeEndValue = '';

            if (filterMode === 'year' && yearStart && yearEnd) {
                const yearBounds = getYearRangeBounds(yearStart, yearEnd);
                if (yearBounds) {
                    rangeStartValue = yearBounds.start;
                    rangeEndValue = yearBounds.end;
                    query = query.gte('tanggalAcara', rangeStartValue).lte('tanggalAcara', rangeEndValue);
                }
            } else if (filterMode === 'range' && startDate && endDate) {
                rangeStartValue = startDate;
                rangeEndValue = endDate;
                query = query.gte('tanggalAcara', rangeStartValue).lte('tanggalAcara', rangeEndValue);
            }

            const { data, error: fetchError } = await query;
            
            if (fetchError) {
                console.error('Error fetching deals:', fetchError.message);
                setError(`Error: ${fetchError.message}`);
                return;
            }

            const deals = (data as DealingEntry[]) || [];
            console.log('Fetched deals:', deals);

            // Filter deals based on the same date range used by the picker
            let filteredDeals = deals;
            if (rangeStartValue && rangeEndValue) {
                filteredDeals = deals.filter(deal => {
                    const eventDate = deal.tanggalAcara;
                    return eventDate >= rangeStartValue && eventDate <= rangeEndValue;
                });
            }

            // Count events by day of week and time
            const newCounts: EventCounts = {
                monday: { morning: 0, evening: 0 },
                tuesday: { morning: 0, evening: 0 },
                wednesday: { morning: 0, evening: 0 },
                thursday: { morning: 0, evening: 0 },
                friday: { morning: 0, evening: 0 },
                saturday: { morning: 0, evening: 0 },
                sunday: { morning: 0, evening: 0 },
                total: filteredDeals.length,
            };

            const datesByVenueWeekday: Record<string, Set<string>> = {};
            const datesByVenueWeekendSlots: Record<string, Set<string>> = {};
            venuesToCount.forEach(venue => {
                datesByVenueWeekday[venue] = new Set();
                datesByVenueWeekendSlots[venue] = new Set();
            });

            filteredDeals.forEach(deal => {
                if (!deal.namaVenue || !deal.tanggalAcara || !venuesToCount.includes(deal.namaVenue)) {
                    return;
                }

                const eventDate = dateUtils.parseLocalDate(deal.tanggalAcara);
                const eventDateStr = deal.tanggalAcara;
                const dayOfWeek = eventDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
                const waktuAcara = deal.waktuAcara || 'Malam'; // Default to Malam if not specified

                // Day mapping: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
                const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
                const dayName = dayNames[dayOfWeek];

                if (waktuAcara === 'Pagi' || waktuAcara === 'Full Day') {
                    newCounts[dayName].morning++;
                }
                if (waktuAcara === 'Malam' || waktuAcara === 'Full Day') {
                    newCounts[dayName].evening++;
                }

                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    if (waktuAcara === 'Pagi' || waktuAcara === 'Full Day') {
                        datesByVenueWeekendSlots[deal.namaVenue]?.add(`${eventDateStr}|Pagi`);
                    }
                    if (waktuAcara === 'Malam' || waktuAcara === 'Full Day') {
                        datesByVenueWeekendSlots[deal.namaVenue]?.add(`${eventDateStr}|Malam`);
                    }
                } else {
                    datesByVenueWeekday[deal.namaVenue]?.add(eventDateStr);
                }
            });

            const rangeStart = filterMode === 'year'
                ? (getYearRangeBounds(yearStart, yearEnd)?.startDate ?? null)
                : startDate ? dateUtils.parseLocalDate(startDate) : null;
            const rangeEnd = filterMode === 'year'
                ? (getYearRangeBounds(yearStart, yearEnd)?.endDate ?? null)
                : endDate ? dateUtils.parseLocalDate(endDate) : null;

            const countInclusiveDays = (start: Date, end: Date) => {
                let weekdays = 0;
                let weekend = 0;
                const current = new Date(start);
                while (current <= end) {
                    const day = current.getDay();
                    if (day === 0 || day === 6) {
                        weekend += 1;
                    } else {
                        weekdays += 1;
                    }
                    current.setDate(current.getDate() + 1);
                }
                return { weekdays, weekend };
            };

            const newEmptyDatesByVenue: Record<string, { weekdays: number; weekendSlots: number }> = {};
            venuesToCount.forEach(venue => {
                if (rangeStart && rangeEnd && rangeStart <= rangeEnd) {
                    const totals = countInclusiveDays(rangeStart, rangeEnd);
                    const occupiedWeekdays = datesByVenueWeekday[venue]?.size || 0;
                    const occupiedWeekendSlots = datesByVenueWeekendSlots[venue]?.size || 0;
                    newEmptyDatesByVenue[venue] = {
                        weekdays: Math.max(0, totals.weekdays - occupiedWeekdays),
                        weekendSlots: Math.max(0, totals.weekend * 2 - occupiedWeekendSlots),
                    };
                } else {
                    newEmptyDatesByVenue[venue] = { weekdays: 0, weekendSlots: 0 };
                }
            });

            setCounts(newCounts);
            setEmptyDatesByVenue(newEmptyDatesByVenue);
            console.log('Event counts:', newCounts);
            console.log('Empty dates by venue:', newEmptyDatesByVenue);
        } catch (err) {
            console.error('Unexpected error in fetchAndCountEvents:', err);
            setError('Terjadi kesalahan saat memuat data');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAndCountEvents();
    }, [effectiveVenueName, yearStart, yearEnd, startDate, endDate, filterMode]);

    const handleRefresh = () => {
        fetchAndCountEvents();
    };

    return (
        <div className="w-full max-w-5xl mx-auto p-6">
            <div className="mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Perhitungan Event</h1>
                        <p className="text-sm text-gray-500 mt-1">Ringkasan jumlah event per hari dan waktu</p>
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
                    >
                        <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filter Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-1 gap-4">
                    {/* Filter Mode Toggle */}
                    <div className="flex gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                value="year"
                                checked={filterMode === 'year'}
                                onChange={(e) => setFilterMode(e.target.value as 'year' | 'range')}
                                className="w-4 h-4"
                            />
                            <span className="text-sm font-medium text-gray-700">Filter Tahun</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                value="range"
                                checked={filterMode === 'range'}
                                onChange={(e) => setFilterMode(e.target.value as 'year' | 'range')}
                                className="w-4 h-4"
                            />
                            <span className="text-sm font-medium text-gray-700">Range Tanggal</span>
                        </label>
                    </div>

                    {/* Year Filter */}
                    {filterMode === 'year' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tahun Mulai</label>
                                <input
                                    type="month"
                                    value={yearStart}
                                    onChange={(e) => setYearStart(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tahun Akhir</label>
                                <input
                                    type="month"
                                    value={yearEnd}
                                    onChange={(e) => setYearEnd(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                                />
                            </div>
                        </div>
                    )}

                    {/* Date Range Filter */}
                    {filterMode === 'range' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Mulai</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Akhir</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                    {error}
                </div>
            )}

            {isLoading && !error ? (
                <div className="flex justify-center items-center py-16">
                    <div className="animate-spin">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </div>
                    <span className="ml-3 text-gray-500 text-sm">Memuat data...</span>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Summary Card */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="text-sm text-gray-600 mb-2">Total Event</div>
                        <p className="text-3xl font-semibold text-gray-900">{counts.total}</p>
                    </div>

                    {/* Counting Grid - All Days */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Monday */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-700 mb-3">Senin</div>
                            <div className="space-y-2">
                                <div>
                                    <div className="text-xs text-gray-600 mb-1">Pagi</div>
                                    <div className="text-2xl font-bold text-gray-900">{counts.monday.morning}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-600 mb-1">Malam</div>
                                    <div className="text-2xl font-bold text-gray-900">{counts.monday.evening}</div>
                                </div>
                            </div>
                        </div>

                        {/* Tuesday */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-700 mb-3">Selasa</div>
                            <div className="space-y-2">
                                <div>
                                    <div className="text-xs text-gray-600 mb-1">Pagi</div>
                                    <div className="text-2xl font-bold text-gray-900">{counts.tuesday.morning}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-600 mb-1">Malam</div>
                                    <div className="text-2xl font-bold text-gray-900">{counts.tuesday.evening}</div>
                                </div>
                            </div>
                        </div>

                        {/* Wednesday */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-700 mb-3">Rabu</div>
                            <div className="space-y-2">
                                <div>
                                    <div className="text-xs text-gray-600 mb-1">Pagi</div>
                                    <div className="text-2xl font-bold text-gray-900">{counts.wednesday.morning}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-600 mb-1">Malam</div>
                                    <div className="text-2xl font-bold text-gray-900">{counts.wednesday.evening}</div>
                                </div>
                            </div>
                        </div>

                        {/* Thursday */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-700 mb-3">Kamis</div>
                            <div className="space-y-2">
                                <div>
                                    <div className="text-xs text-gray-600 mb-1">Pagi</div>
                                    <div className="text-2xl font-bold text-gray-900">{counts.thursday.morning}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-600 mb-1">Malam</div>
                                    <div className="text-2xl font-bold text-gray-900">{counts.thursday.evening}</div>
                                </div>
                            </div>
                        </div>

                        {/* Friday */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-700 mb-3">Jumat</div>
                            <div className="space-y-2">
                                <div>
                                    <div className="text-xs text-gray-600 mb-1">Pagi</div>
                                    <div className="text-2xl font-bold text-gray-900">{counts.friday.morning}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-600 mb-1">Malam</div>
                                    <div className="text-2xl font-bold text-gray-900">{counts.friday.evening}</div>
                                </div>
                            </div>
                        </div>

                        {/* Saturday */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-700 mb-3">Sabtu</div>
                            <div className="space-y-2">
                                <div>
                                    <div className="text-xs text-gray-600 mb-1">Pagi</div>
                                    <div className="text-2xl font-bold text-gray-900">{counts.saturday.morning}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-600 mb-1">Malam</div>
                                    <div className="text-2xl font-bold text-gray-900">{counts.saturday.evening}</div>
                                </div>
                            </div>
                        </div>

                        {/* Sunday */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-700 mb-3">Minggu</div>
                            <div className="space-y-2">
                                <div>
                                    <div className="text-xs text-gray-600 mb-1">Pagi</div>
                                    <div className="text-2xl font-bold text-gray-900">{counts.sunday.morning}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-600 mb-1">Malam</div>
                                    <div className="text-2xl font-bold text-gray-900">{counts.sunday.evening}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Summary Statistics - Total per Day */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Total Event per Hari</h3>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white border border-gray-200 rounded p-3">
                                <div className="text-xs text-gray-600 mb-1">Senin</div>
                                <div className="text-2xl font-bold text-gray-900">{counts.monday.morning + counts.monday.evening}</div>
                            </div>
                            <div className="bg-white border border-gray-200 rounded p-3">
                                <div className="text-xs text-gray-600 mb-1">Selasa</div>
                                <div className="text-2xl font-bold text-gray-900">{counts.tuesday.morning + counts.tuesday.evening}</div>
                            </div>
                            <div className="bg-white border border-gray-200 rounded p-3">
                                <div className="text-xs text-gray-600 mb-1">Rabu</div>
                                <div className="text-2xl font-bold text-gray-900">{counts.wednesday.morning + counts.wednesday.evening}</div>
                            </div>
                            <div className="bg-white border border-gray-200 rounded p-3">
                                <div className="text-xs text-gray-600 mb-1">Kamis</div>
                                <div className="text-2xl font-bold text-gray-900">{counts.thursday.morning + counts.thursday.evening}</div>
                            </div>
                            <div className="bg-white border border-gray-200 rounded p-3">
                                <div className="text-xs text-gray-600 mb-1">Jumat</div>
                                <div className="text-2xl font-bold text-gray-900">{counts.friday.morning + counts.friday.evening}</div>
                            </div>
                            <div className="bg-white border border-gray-200 rounded p-3">
                                <div className="text-xs text-gray-600 mb-1">Sabtu</div>
                                <div className="text-2xl font-bold text-gray-900">{counts.saturday.morning + counts.saturday.evening}</div>
                            </div>
                            <div className="bg-white border border-gray-200 rounded p-3">
                                <div className="text-xs text-gray-600 mb-1">Minggu</div>
                                <div className="text-2xl font-bold text-gray-900">{counts.sunday.morning + counts.sunday.evening}</div>
                            </div>
                        </div>
                    </div>

                    {/* Empty Dates by Venue */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Tanggal Kosong per Venue</h3>
                                <p className="text-xs text-gray-500">Jumlah hari tanpa event di setiap venue untuk periode yang dipilih.</p>
                            </div>
                            {filterMode === 'range' && (!startDate || !endDate) && (
                                <p className="text-xs text-red-600">Pilih tanggal mulai dan akhir untuk melihat perhitungan tanggal kosong.</p>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {(effectiveVenueName ? [effectiveVenueName] : VENUES.map(v => v.name)).map(venue => {
                                const emptyCounts = emptyDatesByVenue[venue] || { weekdays: 0, weekendSlots: 0 };
                                return (
                                    <div key={venue} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                        <div className="text-xs text-gray-600 mb-2">{venue}</div>
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <div className="text-2xl font-semibold text-gray-900">{emptyCounts.weekdays}</div>
                                                <div className="text-xs text-gray-500">Weekdays</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-semibold text-gray-900">{emptyCounts.weekendSlots}</div>
                                                <div className="text-xs text-gray-500">Weekend Slots</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventCountingView;
