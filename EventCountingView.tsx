import React, { useState, useEffect, useMemo } from 'react';
import { useVenues } from './VenueContext';
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

const PIE_COLORS = [
    '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899',
];

interface PieSlice {
    label: string;
    value: number;
    color: string;
}

interface PieChartProps {
    data: PieSlice[];
    title: string;
    subtitle?: string;
    centerLabel?: string;
}

const PieChart: React.FC<PieChartProps> = ({ data, title, subtitle, centerLabel }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const total = data.reduce((sum, d) => sum + d.value, 0);
    const sorted = useMemo(() => [...data].sort((a, b) => b.value - a.value), [data]);
    const maxValue = sorted.length > 0 ? sorted[0].value : 0;

    if (total === 0) {
        return (
            <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center min-h-[360px] shadow-sm">
                <div className="text-sm font-semibold text-gray-900 mb-1">{title}</div>
                {subtitle && <div className="text-xs text-gray-500 mb-4">{subtitle}</div>}
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300 mb-3">
                    <circle cx="12" cy="12" r="10" strokeDasharray="4 2" />
                    <path d="M12 8v4m0 4h.01" strokeLinecap="round" />
                </svg>
                <div className="text-gray-400 text-sm">Tidak ada data untuk periode ini</div>
            </div>
        );
    }

    const size = 200;
    const cx = size / 2;
    const cy = size / 2;
    const outerRadius = 88;
    const innerRadius = 58;

    let currentAngle = -Math.PI / 2;
    const slices = data.filter(d => d.value > 0).map((d, idx) => {
        const sliceAngle = (d.value / total) * 2 * Math.PI;
        const startAngle = currentAngle;
        const endAngle = currentAngle + sliceAngle;
        currentAngle = endAngle;

        const isHovered = hoveredIndex === idx;
        const r = isHovered ? outerRadius + 4 : outerRadius;
        const ir = innerRadius;

        const x1 = cx + r * Math.cos(startAngle);
        const y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(endAngle);
        const y2 = cy + r * Math.sin(endAngle);
        const ix1 = cx + ir * Math.cos(endAngle);
        const iy1 = cy + ir * Math.sin(endAngle);
        const ix2 = cx + ir * Math.cos(startAngle);
        const iy2 = cy + ir * Math.sin(startAngle);
        const largeArc = sliceAngle > Math.PI ? 1 : 0;

        const path = sliceAngle >= 2 * Math.PI - 0.001
            ? `M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} M ${cx + ir} ${cy} A ${ir} ${ir} 0 1 0 ${cx - ir} ${cy} A ${ir} ${ir} 0 1 0 ${cx + ir} ${cy}`
            : `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${ir} ${ir} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;

        const pct = Math.round((d.value / total) * 100);

        return { ...d, path, pct, sliceAngle, idx };
    });

    const topItem = sorted[0];
    const topPct = Math.round((topItem.value / total) * 100);

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="text-sm font-semibold text-gray-900">{title}</div>
                    {subtitle && <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>}
                </div>
                <div className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {total} event
                </div>
            </div>

            <div className="flex flex-col lg:flex-row items-center gap-6">
                {/* Donut Chart */}
                <div className="relative flex-shrink-0">
                    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm">
                        {slices.map((s, i) => (
                            <path
                                key={i}
                                d={s.path}
                                fill={s.color}
                                fillRule="evenodd"
                                stroke="white"
                                strokeWidth="2"
                                opacity={hoveredIndex === null || hoveredIndex === s.idx ? 1 : 0.4}
                                style={{ transition: 'opacity 0.2s, d 0.2s', cursor: 'pointer' }}
                                onMouseEnter={() => setHoveredIndex(s.idx)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            />
                        ))}
                    </svg>
                    {/* Center content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        {hoveredIndex !== null ? (
                            <>
                                <div className="text-2xl font-bold text-gray-900">{data[hoveredIndex]?.value}</div>
                                <div className="text-xs text-gray-500 max-w-[70px] text-center leading-tight">{data[hoveredIndex]?.label}</div>
                            </>
                        ) : (
                            <>
                                <div className="text-2xl font-bold text-gray-900">{total}</div>
                                <div className="text-xs text-gray-500">{centerLabel || 'Total'}</div>
                            </>
                        )}
                    </div>
                </div>

                {/* Legend with bars */}
                <div className="flex-1 w-full space-y-2.5">
                    {sorted.map((d, i) => {
                        const pct = Math.round((d.value / total) * 100);
                        const barWidth = maxValue > 0 ? (d.value / maxValue) * 100 : 0;
                        const originalIdx = data.findIndex(orig => orig.label === d.label);
                        const isHovered = hoveredIndex === originalIdx;
                        return (
                            <div
                                key={i}
                                className={`rounded-lg px-3 py-2 transition-colors cursor-pointer ${isHovered ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                                onMouseEnter={() => setHoveredIndex(originalIdx)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: d.color }} />
                                        <span className="text-xs font-medium text-gray-700">{d.label}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-gray-900">{d.value}</span>
                                        <span className="text-xs text-gray-400">({pct}%)</span>
                                    </div>
                                </div>
                                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-300"
                                        style={{ width: `${barWidth}%`, backgroundColor: d.color, opacity: isHovered ? 1 : 0.7 }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Insight callout */}
            <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-500 flex-shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span><strong className="text-gray-800">{topItem.label}</strong> mendominasi dengan {topPct}% dari total event</span>
                </div>
            </div>
        </div>
    );
};

const EventCountingView: React.FC<EventCountingViewProps> = ({ userRole, assignedVenue, venueName }) => {
    const { venues: VENUES } = useVenues();
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
    const [allVenueNames, setAllVenueNames] = useState<string[]>([]);

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
            let venuesToCount = effectiveVenueName ? [effectiveVenueName] : VENUES.map(v => v.name);

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

            if (!effectiveVenueName) {
                const dealVenues = new Set(filteredDeals.map(d => d.namaVenue).filter(Boolean));
                dealVenues.forEach(v => {
                    if (!venuesToCount.includes(v)) venuesToCount.push(v);
                });
                venuesToCount.sort((a, b) => a.localeCompare(b));
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
                if (!deal.tanggalAcara) {
                    return;
                }

                const eventDate = dateUtils.parseLocalDate(deal.tanggalAcara);
                const eventDateStr = deal.tanggalAcara;
                const dayOfWeek = eventDate.getDay();
                const waktuAcara = deal.waktuAcara || 'Malam';

                const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
                const dayName = dayNames[dayOfWeek];

                if (waktuAcara === 'Pagi' || waktuAcara === 'Full Day') {
                    newCounts[dayName].morning++;
                }
                if (waktuAcara === 'Malam' || waktuAcara === 'Full Day') {
                    newCounts[dayName].evening++;
                }

                if (deal.namaVenue && venuesToCount.includes(deal.namaVenue)) {
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
            setAllVenueNames(venuesToCount);
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
    }, [effectiveVenueName, yearStart, yearEnd, startDate, endDate, filterMode, VENUES]);

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

                    {/* Pie Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <PieChart
                            title="Distribusi Event per Hari"
                            subtitle="Proporsi event berdasarkan hari dalam seminggu"
                            centerLabel="Total"
                            data={[
                                { label: 'Senin', value: counts.monday.morning + counts.monday.evening, color: PIE_COLORS[0] },
                                { label: 'Selasa', value: counts.tuesday.morning + counts.tuesday.evening, color: PIE_COLORS[1] },
                                { label: 'Rabu', value: counts.wednesday.morning + counts.wednesday.evening, color: PIE_COLORS[2] },
                                { label: 'Kamis', value: counts.thursday.morning + counts.thursday.evening, color: PIE_COLORS[3] },
                                { label: 'Jumat', value: counts.friday.morning + counts.friday.evening, color: PIE_COLORS[4] },
                                { label: 'Sabtu', value: counts.saturday.morning + counts.saturday.evening, color: PIE_COLORS[5] },
                                { label: 'Minggu', value: counts.sunday.morning + counts.sunday.evening, color: PIE_COLORS[6] },
                            ]}
                        />
                        <PieChart
                            title="Distribusi Waktu Event"
                            subtitle="Perbandingan sesi Pagi dan Malam"
                            centerLabel="Sesi"
                            data={[
                                {
                                    label: 'Pagi',
                                    value: counts.monday.morning + counts.tuesday.morning + counts.wednesday.morning + counts.thursday.morning + counts.friday.morning + counts.saturday.morning + counts.sunday.morning,
                                    color: '#f59e0b',
                                },
                                {
                                    label: 'Malam',
                                    value: counts.monday.evening + counts.tuesday.evening + counts.wednesday.evening + counts.thursday.evening + counts.friday.evening + counts.saturday.evening + counts.sunday.evening,
                                    color: '#6366f1',
                                },
                            ]}
                        />
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

                    {/* Empty Dates by Venue - Pie Charts */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Tanggal Kosong per Venue</h3>
                                <p className="text-xs text-gray-500">Visualisasi hari tanpa event di setiap venue untuk periode yang dipilih.</p>
                            </div>
                            {filterMode === 'range' && (!startDate || !endDate) && (
                                <p className="text-xs text-red-600">Pilih tanggal mulai dan akhir untuk melihat perhitungan tanggal kosong.</p>
                            )}
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <PieChart
                                title="Weekdays Kosong per Venue"
                                subtitle="Jumlah hari kerja tanpa event per venue"
                                centerLabel="Hari"
                                data={(effectiveVenueName ? [effectiveVenueName] : allVenueNames).map((venue, idx) => ({
                                    label: venue,
                                    value: (emptyDatesByVenue[venue] || { weekdays: 0 }).weekdays,
                                    color: PIE_COLORS[idx % PIE_COLORS.length],
                                }))}
                            />
                            <PieChart
                                title="Weekend Slots Kosong per Venue"
                                subtitle="Jumlah slot weekend tanpa event per venue"
                                centerLabel="Slot"
                                data={(effectiveVenueName ? [effectiveVenueName] : allVenueNames).map((venue, idx) => ({
                                    label: venue,
                                    value: (emptyDatesByVenue[venue] || { weekendSlots: 0 }).weekendSlots,
                                    color: PIE_COLORS[idx % PIE_COLORS.length],
                                }))}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventCountingView;
