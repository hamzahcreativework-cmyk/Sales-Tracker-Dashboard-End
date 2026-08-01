import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { DealingEntry, UserRole, BookingStatus } from './types';
import { dateUtils } from './dateUtils';
import { useVenues } from './VenueContext';

interface LeaderboardViewProps {
    userRole: UserRole;
    assignedVenue: string | null;
}

interface RankedEntry {
    name: string;
    eventCount: number;
    totalPax: number;
}

const MEDAL_COLORS = {
    1: { bg: '#FFD700', text: '#7a5c00', label: 'Gold' },
    2: { bg: '#C0C0C0', text: '#4a4a4a', label: 'Silver' },
    3: { bg: '#CD7F32', text: '#5c3100', label: 'Bronze' },
};

// Trophy SVG icon
const TrophyIcon: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = '#FFD700' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M7 3H17V13C17 15.7614 14.7614 18 12 18C9.23858 18 7 15.7614 7 13V3Z"
            fill={color}
            opacity="0.9"
        />
        <path
            d="M5 4H7V8C5.89543 8 5 7.10457 5 6V4Z"
            fill={color}
            opacity="0.7"
        />
        <path
            d="M19 4H17V8C18.1046 8 19 7.10457 19 6V4Z"
            fill={color}
            opacity="0.7"
        />
        <rect x="10" y="18" width="4" height="3" fill={color} opacity="0.8" />
        <rect x="8" y="21" width="8" height="1.5" rx="0.75" fill={color} />
    </svg>
);

// Crown SVG icon for #1
const CrownIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#FFD700" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 19L4 10L8.5 14.5L12 5L15.5 14.5L20 10L22 19H2Z" />
    </svg>
);

// Star SVG icon
const StarIcon: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = '#FFD700' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
    </svg>
);

// Medal circle for top 3 ranks
const MedalCircle: React.FC<{ rank: number; size?: number }> = ({ rank, size = 28 }) => {
    const medal = MEDAL_COLORS[rank as keyof typeof MEDAL_COLORS];
    if (!medal) return null;

    return (
        <div
            className="flex items-center justify-center rounded-full font-bold flex-shrink-0"
            style={{
                width: size,
                height: size,
                backgroundColor: medal.bg,
                color: medal.text,
                fontSize: size * 0.45,
                boxShadow: `0 2px 6px ${medal.bg}60`,
            }}
        >
            {rank}
        </div>
    );
};

// Rank number display for regular entries
const RankBadge: React.FC<{ rank: number }> = ({ rank }) => (
    <div
        className="flex items-center justify-center rounded-full font-bold flex-shrink-0 text-sm"
        style={{
            width: 28,
            height: 28,
            backgroundColor: 'var(--color-interactive)',
            color: 'var(--color-text-secondary)',
        }}
    >
        {rank}
    </div>
);

// Progress bar component
const ProgressBar: React.FC<{ value: number; max: number }> = ({ value, max }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (
        <div
            className="w-full rounded-full overflow-hidden"
            style={{ height: 6, backgroundColor: 'var(--color-interactive)' }}
        >
            <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                    width: `${percentage}%`,
                    backgroundColor: 'var(--color-primary)',
                }}
            />
        </div>
    );
};

// Podium item for top 3
const PodiumItem: React.FC<{
    entry: RankedEntry;
    rank: 1 | 2 | 3;
    isCenter?: boolean;
}> = ({ entry, rank, isCenter }) => {
    const medal = MEDAL_COLORS[rank];
    const podiumHeights: Record<1 | 2 | 3, string> = {
        1: 'h-24',
        2: 'h-16',
        3: 'h-12',
    };

    return (
        <div className={`flex flex-col items-center ${isCenter ? 'order-first sm:order-none z-10' : ''}`}>
            {/* Crown for #1 */}
            {rank === 1 && (
                <div className="mb-1">
                    <CrownIcon size={22} />
                </div>
            )}
            {/* Avatar circle */}
            <div
                className="flex items-center justify-center rounded-full mb-2 font-bold text-lg transition-transform duration-300 hover:scale-110"
                style={{
                    width: isCenter ? 64 : 52,
                    height: isCenter ? 64 : 52,
                    backgroundColor: medal.bg,
                    color: medal.text,
                    boxShadow: `0 4px 16px ${medal.bg}70`,
                    fontSize: isCenter ? 22 : 18,
                }}
            >
                {entry.name.charAt(0).toUpperCase()}
            </div>
            {/* Name */}
            <p
                className="font-semibold text-center leading-tight mb-1"
                style={{
                    color: 'var(--color-text-primary)',
                    fontSize: isCenter ? '0.85rem' : '0.75rem',
                    maxWidth: isCenter ? 90 : 76,
                    wordBreak: 'break-word',
                }}
            >
                {entry.name}
            </p>
            {/* Event count badge */}
            <div
                className="flex items-center gap-1 rounded-full px-2 py-0.5 mb-2"
                style={{ backgroundColor: `${medal.bg}22`, border: `1.5px solid ${medal.bg}` }}
            >
                <StarIcon size={10} color={medal.bg} />
                <span className="font-bold" style={{ color: medal.bg, fontSize: '0.75rem' }}>
                    {entry.eventCount} event
                </span>
            </div>
            {/* Podium bar */}
            <div
                className={`w-full ${podiumHeights[rank]} rounded-t-lg flex items-center justify-center`}
                style={{
                    backgroundColor: `${medal.bg}30`,
                    border: `2px solid ${medal.bg}60`,
                    minWidth: isCenter ? 80 : 64,
                }}
            >
                <span
                    className="font-black"
                    style={{ color: medal.bg, fontSize: isCenter ? '1.5rem' : '1.25rem' }}
                >
                    #{rank}
                </span>
            </div>
        </div>
    );
};

// Full leaderboard list row
const LeaderboardRow: React.FC<{
    entry: RankedEntry;
    rank: number;
    maxCount: number;
    isEven: boolean;
}> = ({ entry, rank, maxCount, isEven }) => {
    const isTop3 = rank <= 3;

    return (
        <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group cursor-default"
            style={{
                backgroundColor: isEven ? 'transparent' : 'rgba(255,255,255,0.03)',
            }}
            onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--color-interactive)';
            }}
            onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = isEven
                    ? 'transparent'
                    : 'rgba(255,255,255,0.03)';
            }}
        >
            {/* Rank */}
            {isTop3 ? (
                <MedalCircle rank={rank} size={28} />
            ) : (
                <RankBadge rank={rank} />
            )}

            {/* Name */}
            <div className="flex-1 min-w-0">
                <p
                    className="font-semibold truncate"
                    style={{ color: 'var(--color-text-primary)', fontSize: '0.9rem' }}
                >
                    {entry.name}
                </p>
                {/* Progress bar */}
                <div className="mt-1.5">
                    <ProgressBar value={entry.eventCount} max={maxCount} />
                </div>
            </div>

            {/* Count */}
            <div className="text-right flex-shrink-0">
                <p
                    className="font-black"
                    style={{
                        color: isTop3
                            ? MEDAL_COLORS[rank as keyof typeof MEDAL_COLORS].bg
                            : 'var(--color-primary)',
                        fontSize: '1.1rem',
                    }}
                >
                    {entry.eventCount}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    event
                </p>
            </div>
        </div>
    );
};

// Leaderboard section card
const LeaderboardSection: React.FC<{
    title: string;
    entries: RankedEntry[];
    icon: React.ReactNode;
    accentColor?: string;
}> = ({ title, entries, icon, accentColor = 'var(--color-primary)' }) => {
    const top3 = entries.slice(0, 3);
    const hasPodium = entries.length >= 3;
    const maxCount = entries.length > 0 ? entries[0].eventCount : 1;

    return (
        <div
            className="flex flex-col rounded-2xl border shadow-lg overflow-hidden"
            style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
            }}
        >
            {/* Card header */}
            <div
                className="flex items-center justify-between px-6 py-4 border-b"
                style={{ borderColor: 'var(--color-border)' }}
            >
                <div className="flex items-center gap-3">
                    <div
                        className="flex items-center justify-center w-10 h-10 rounded-xl"
                        style={{ backgroundColor: `${accentColor}22` }}
                    >
                        {icon}
                    </div>
                    <div>
                        <h2
                            className="font-bold text-lg leading-tight"
                            style={{ color: 'var(--color-text-primary)' }}
                        >
                            {title}
                        </h2>
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            Berdasarkan jumlah event
                        </p>
                    </div>
                </div>
                {/* Total badge */}
                <div
                    className="rounded-full px-3 py-1 text-sm font-bold"
                    style={{
                        backgroundColor: `${accentColor}22`,
                        color: accentColor,
                    }}
                >
                    {entries.length} peserta
                </div>
            </div>

            {entries.length === 0 ? (
                // Empty state
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <div className="opacity-30 mb-4">
                        <TrophyIcon size={48} color="var(--color-text-secondary)" />
                    </div>
                    <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        Belum Ada Data
                    </p>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                        Tidak ada data untuk periode yang dipilih
                    </p>
                </div>
            ) : (
                <>
                    {/* Podium (only if 3+ entries) */}
                    {hasPodium && (
                        <div
                            className="px-6 py-6"
                            style={{
                                background: `linear-gradient(180deg, ${accentColor}10 0%, transparent 100%)`,
                            }}
                        >
                            <div className="flex items-end justify-center gap-4">
                                {/* #2 left */}
                                <div className="flex-1 flex justify-end">
                                    {top3[1] && (
                                        <PodiumItem entry={top3[1]} rank={2} />
                                    )}
                                </div>
                                {/* #1 center */}
                                <div className="flex-shrink-0">
                                    {top3[0] && (
                                        <PodiumItem entry={top3[0]} rank={1} isCenter />
                                    )}
                                </div>
                                {/* #3 right */}
                                <div className="flex-1 flex justify-start">
                                    {top3[2] && (
                                        <PodiumItem entry={top3[2]} rank={3} />
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Divider */}
                    {hasPodium && (
                        <div
                            className="mx-6 border-t"
                            style={{ borderColor: 'var(--color-border)' }}
                        />
                    )}

                    {/* Full ranked list */}
                    <div className="px-2 py-3 space-y-1 overflow-y-auto" style={{ maxHeight: 380 }}>
                        {entries.map((entry, index) => (
                            <LeaderboardRow
                                key={entry.name}
                                entry={entry}
                                rank={index + 1}
                                maxCount={maxCount}
                                isEven={index % 2 === 0}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

// --- Main Component ---

const MONTHS = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);

const BOOKING_STATUSES: BookingStatus[] = ['DP', 'Lunas', 'Soft Booking', 'Booking', 'Waiting List'];

const LeaderboardView: React.FC<LeaderboardViewProps> = ({ userRole, assignedVenue }) => {
    const { venues } = useVenues();
    const [allDeals, setAllDeals] = useState<DealingEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState<number>(currentYear);
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); // 1-12; -1 = all
    const [selectedVenue, setSelectedVenue] = useState<string>('');
    const [selectedBookingStatus, setSelectedBookingStatus] = useState<string>('');

    // Fetch all deals from Supabase
    useEffect(() => {
        const fetchDeals = async () => {
            setIsLoading(true);
            setError(null);
            try {
                let query = supabase
                    .from('deals')
                    .select('namaMarketing, namaVenue, tanggalAcara, jenisBooking, jenisAcara, totalPax');

                // If user is restricted to a specific venue, filter at DB level
                if (userRole === 'User' && assignedVenue) {
                    query = query.eq('namaVenue', assignedVenue);
                }

                const { data, error: fetchError } = await query;

                if (fetchError) {
                    console.error('Error fetching deals for leaderboard:', fetchError.message);
                    setError('Gagal memuat data. Silakan coba lagi nanti.');
                    setAllDeals([]);
                } else {
                    setAllDeals((data as DealingEntry[]) || []);
                }
            } catch (err) {
                console.error('Unexpected error in LeaderboardView:', err);
                setError('Terjadi kesalahan tak terduga saat memuat data.');
                setAllDeals([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDeals();
    }, [userRole, assignedVenue]);

    // Filter deals by year/month/venue/bookingStatus client-side
    const filteredDeals = useMemo(() => {
        return allDeals.filter((deal) => {
            if (!deal.tanggalAcara) return false;
            const date = dateUtils.parseLocalDate(deal.tanggalAcara);
            const yearMatch = date.getFullYear() === selectedYear;
            const monthMatch = selectedMonth === -1 || date.getMonth() + 1 === selectedMonth;
            const venueMatch = !selectedVenue || deal.namaVenue === selectedVenue;
            const bookingMatch = !selectedBookingStatus || deal.jenisBooking === selectedBookingStatus;
            return yearMatch && monthMatch && venueMatch && bookingMatch;
        });
    }, [allDeals, selectedYear, selectedMonth, selectedVenue, selectedBookingStatus]);

    // Compute Sales Wedding leaderboard (grouped by namaMarketing, Wedding only)
    const salesWeddingLeaderboard = useMemo((): RankedEntry[] => {
        const weddingDeals = filteredDeals.filter(deal => deal.jenisAcara === 'Wedding');
        const map = new Map<string, { eventCount: number; totalPax: number }>();
        weddingDeals.forEach((deal) => {
            const name = deal.namaMarketing?.trim();
            if (!name) return;
            const existing = map.get(name) || { eventCount: 0, totalPax: 0 };
            map.set(name, {
                eventCount: existing.eventCount + 1,
                totalPax: existing.totalPax + (Number(deal.totalPax) || 0),
            });
        });
        return Array.from(map.entries())
            .map(([name, stats]) => ({ name, ...stats }))
            .sort((a, b) => b.eventCount - a.eventCount || b.totalPax - a.totalPax);
    }, [filteredDeals]);

    // Compute Sales Non Wedding leaderboard (grouped by namaMarketing, Non Wedding only)
    const salesNonWeddingLeaderboard = useMemo((): RankedEntry[] => {
        const nonWeddingDeals = filteredDeals.filter(deal => deal.jenisAcara !== 'Wedding');
        const map = new Map<string, { eventCount: number; totalPax: number }>();
        nonWeddingDeals.forEach((deal) => {
            const name = deal.namaMarketing?.trim();
            if (!name) return;
            const existing = map.get(name) || { eventCount: 0, totalPax: 0 };
            map.set(name, {
                eventCount: existing.eventCount + 1,
                totalPax: existing.totalPax + (Number(deal.totalPax) || 0),
            });
        });
        return Array.from(map.entries())
            .map(([name, stats]) => ({ name, ...stats }))
            .sort((a, b) => b.eventCount - a.eventCount || b.totalPax - a.totalPax);
    }, [filteredDeals]);

    // Compute Venue leaderboard (grouped by namaVenue)
    const venueLeaderboard = useMemo((): RankedEntry[] => {
        const map = new Map<string, { eventCount: number; totalPax: number }>();

        filteredDeals.forEach((deal) => {
            const name = deal.namaVenue?.trim();
            if (!name) return;
            const existing = map.get(name) || { eventCount: 0, totalPax: 0 };
            map.set(name, {
                eventCount: existing.eventCount + 1,
                totalPax: existing.totalPax + (Number(deal.totalPax) || 0),
            });
        });

        return Array.from(map.entries())
            .map(([name, stats]) => ({ name, ...stats }))
            .sort((a, b) => b.eventCount - a.eventCount || b.totalPax - a.totalPax);
    }, [filteredDeals]);

    const totalEvents = filteredDeals.length;

    return (
        <div className="w-full max-w-6xl mx-auto p-6 fade-in">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-1">
                    <div
                        className="flex items-center justify-center w-11 h-11 rounded-xl"
                        style={{ backgroundColor: 'rgba(255, 215, 0, 0.15)' }}
                    >
                        <TrophyIcon size={24} color="#FFD700" />
                    </div>
                    <div>
                        <h1
                            className="text-3xl font-black tracking-tight"
                            style={{ color: 'var(--color-text-primary)' }}
                        >
                            Leaderboard
                        </h1>
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            Peringkat sales dan venue berdasarkan jumlah event
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter bar */}
            <div
                className="flex flex-wrap items-end gap-4 mb-6 p-4 rounded-2xl border"
                style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                }}
            >
                {/* Year filter */}
                <div>
                    <label
                        htmlFor="lb-year"
                        className="block text-xs font-semibold mb-1.5"
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        Tahun
                    </label>
                    <select
                        id="lb-year"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="form-select py-2 px-3 rounded-lg text-sm font-medium"
                        style={{
                            backgroundColor: 'var(--color-background)',
                            color: 'var(--color-text-primary)',
                            border: '1.5px solid var(--color-border)',
                        }}
                    >
                        {YEARS.map((y) => (
                            <option key={y} value={y}>
                                {y}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Month filter */}
                <div>
                    <label
                        htmlFor="lb-month"
                        className="block text-xs font-semibold mb-1.5"
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        Bulan
                    </label>
                    <select
                        id="lb-month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="form-select py-2 px-3 rounded-lg text-sm font-medium"
                        style={{
                            backgroundColor: 'var(--color-background)',
                            color: 'var(--color-text-primary)',
                            border: '1.5px solid var(--color-border)',
                        }}
                    >
                        <option value={-1}>Semua Bulan</option>
                        {MONTHS.map((m) => (
                            <option key={m.value} value={m.value}>
                                {m.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Venue filter */}
                <div>
                    <label
                        htmlFor="lb-venue"
                        className="block text-xs font-semibold mb-1.5"
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        Venue
                    </label>
                    <select
                        id="lb-venue"
                        value={userRole === 'User' && assignedVenue ? assignedVenue : selectedVenue}
                        onChange={(e) => setSelectedVenue(e.target.value)}
                        disabled={userRole === 'User' && !!assignedVenue}
                        className="form-select py-2 px-3 rounded-lg text-sm font-medium"
                        style={{
                            backgroundColor: 'var(--color-background)',
                            color: 'var(--color-text-primary)',
                            border: '1.5px solid var(--color-border)',
                        }}
                    >
                        <option value="">Semua Venue</option>
                        {venues.map((v) => (
                            <option key={v.name} value={v.name}>
                                {v.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Jenis Booking filter */}
                <div>
                    <label
                        htmlFor="lb-booking"
                        className="block text-xs font-semibold mb-1.5"
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        Jenis Booking
                    </label>
                    <select
                        id="lb-booking"
                        value={selectedBookingStatus}
                        onChange={(e) => setSelectedBookingStatus(e.target.value)}
                        className="form-select py-2 px-3 rounded-lg text-sm font-medium"
                        style={{
                            backgroundColor: 'var(--color-background)',
                            color: 'var(--color-text-primary)',
                            border: '1.5px solid var(--color-border)',
                        }}
                    >
                        <option value="">Semua Status</option>
                        {BOOKING_STATUSES.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Summary chip */}
                {!isLoading && (
                    <div
                        className="ml-auto flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
                        style={{
                            backgroundColor: 'var(--color-interactive)',
                            color: 'var(--color-text-primary)',
                        }}
                    >
                        <TrophyIcon size={16} color="var(--color-primary)" />
                        <span>{totalEvents} event ditemukan</span>
                    </div>
                )}
            </div>

            {/* Error state */}
            {error && (
                <div
                    className="mb-6 p-4 rounded-2xl border flex items-start gap-3"
                    style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderColor: 'rgba(239, 68, 68, 0.3)',
                    }}
                >
                    <svg
                        className="w-5 h-5 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                        />
                    </svg>
                    <div>
                        <p className="font-semibold text-red-400">Gagal Memuat Data</p>
                        <p className="text-sm text-red-400/80 mt-0.5">{error}</p>
                    </div>
                </div>
            )}

            {/* Loading state */}
            {isLoading && (
                <div
                    className="flex items-center justify-center py-24 rounded-2xl border"
                    style={{
                        backgroundColor: 'var(--color-surface)',
                        borderColor: 'var(--color-border)',
                    }}
                >
                    <div
                        className="animate-spin rounded-full border-b-2"
                        style={{
                            width: 40,
                            height: 40,
                            borderColor: 'var(--color-primary)',
                        }}
                    />
                    <p className="ml-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        Mengambil data dari database...
                    </p>
                </div>
            )}

            {/* Leaderboard grid */}
            {!isLoading && !error && (
                <div className="space-y-6">
                    {/* Sales Leaderboards - Wedding & Non Wedding side by side */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Sales Wedding leaderboard */}
                        <LeaderboardSection
                            title="Sales Wedding"
                            entries={salesWeddingLeaderboard}
                            accentColor="#ec4899"
                            icon={
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                </svg>
                            }
                        />

                        {/* Sales Non Wedding leaderboard */}
                        <LeaderboardSection
                            title="Sales Non Wedding"
                            entries={salesNonWeddingLeaderboard}
                            accentColor="#6366f1"
                            icon={
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                            }
                        />
                    </div>

                    {/* Venue leaderboard - full width */}
                    <div className="grid grid-cols-1">
                        <LeaderboardSection
                            title="Venue Leaderboard"
                            entries={venueLeaderboard}
                            accentColor="#10b981"
                            icon={
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                    <polyline points="9 22 9 12 15 12 15 22" />
                                </svg>
                            }
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeaderboardView;
