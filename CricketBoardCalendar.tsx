import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './supabaseClient';
import { dateUtils } from './dateUtils';
import { DealingEntry } from './types';

// ─── Venue Color Utilities ───────────────────────────────────────────────────
const VENUE_COLORS = [
    '#3B82F6', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6',
    '#F97316', '#06B6D4', '#F43F5E', '#10B981', '#F59E0B', '#7C3AED',
];
const getVenueColor = (venueName: string): string => {
    let hash = 0;
    for (let i = 0; i < venueName.length; i++) {
        hash = venueName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return VENUE_COLORS[Math.abs(hash) % VENUE_COLORS.length];
};

// ─── Constants ───────────────────────────────────────────────────────────────
const INDONESIAN_DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const INDONESIAN_MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const BOOKING_STATUS_COLORS: Record<string, string> = {
    'Lunas':        '#10B981',
    'DP':           '#F59E0B',
    'Booking':      '#3B82F6',
    'Soft Booking': '#8B5CF6',
    'Waiting List': '#6B7280',
};

const WAKTU_ICONS: Record<string, string> = {
    Pagi:     '🌅',
    Malam:    '🌙',
    'Full Day': '☀️',
};

// ─── CSS Var helpers (inline style shorthand) ────────────────────────────────
function adjustColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, ((num >> 16) & 0xff) + amount);
    const g = Math.min(255, ((num >> 8) & 0xff) + amount);
    const b = Math.min(255, (num & 0xff) + amount);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

const DEFAULT_COLORS = {
    bg: '#0a2e1a',
    surface: '#0d3a22',
    panel: '#132f1e',
    border: '#1a5c35',
};

let S = {
    bg:      { backgroundColor: DEFAULT_COLORS.bg } as React.CSSProperties,
    surface: { backgroundColor: DEFAULT_COLORS.surface } as React.CSSProperties,
    panel:   { backgroundColor: DEFAULT_COLORS.panel } as React.CSSProperties,
    border:  `1px solid ${DEFAULT_COLORS.border}`,
    bgRaw:      DEFAULT_COLORS.bg,
    surfaceRaw: DEFAULT_COLORS.surface,
    panelRaw:   DEFAULT_COLORS.panel,
    borderRaw:  DEFAULT_COLORS.border,
    muted:      '#3d6b4d',
    gold:    '#FFD700',
    white:   '#E8F5E9',
    red:     '#FF4444',
    glow:    '0 0 10px rgba(255,215,0,0.3)',
    orbitron: { fontFamily: "var(--font-heading, 'Orbitron', monospace)" } as React.CSSProperties,
    poppins:  { fontFamily: "var(--font-body, 'Poppins', sans-serif)" } as React.CSSProperties,
};

// ─── Sub-components ──────────────────────────────────────────────────────────

interface EventCardProps {
    deal: DealingEntry;
    compact?: boolean;
    onClick: (deal: DealingEntry) => void;
}
const EventCard: React.FC<EventCardProps> = ({ deal, compact, onClick }) => {
    const color = getVenueColor(deal.namaVenue);
    const waktuIcon = deal.waktuAcara ? WAKTU_ICONS[deal.waktuAcara] ?? '' : '';
    return (
        <div
            onClick={(e) => { e.stopPropagation(); onClick(deal); }}
            style={{
                ...S.surface,
                borderLeft: `3px solid ${color}`,
                borderRadius: 4,
                padding: compact ? '2px 4px' : '3px 6px',
                marginBottom: 2,
                cursor: 'pointer',
                transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            title={`${deal.namaClient} — ${deal.namaVenue}`}
        >
            <div style={{
                ...S.poppins,
                color: S.white,
                fontSize: compact ? 9 : 10,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
            }}>
                {waktuIcon} {deal.namaClient}
            </div>
            {!compact && (
                <div style={{ ...S.poppins, color: '#9CA3AF', fontSize: 9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {deal.totalPax} pax
                </div>
            )}
        </div>
    );
};

// ─── Event Detail Modal ───────────────────────────────────────────────────────
interface EventDetailModalProps {
    deal: DealingEntry;
    onClose: () => void;
}
const EventDetailModal: React.FC<EventDetailModalProps> = ({ deal, onClose }) => {
    const color = getVenueColor(deal.namaVenue);
    const statusColor = BOOKING_STATUS_COLORS[deal.jenisBooking] ?? '#6B7280';

    const rows: [string, string | number | undefined][] = [
        ['Nama Client',    deal.namaClient],
        ['Venue',          deal.namaVenue],
        ['Lokasi Venue',   deal.venueLokasi ?? '—'],
        ['Marketing',      deal.namaMarketing],
        ['Nama Pax',       deal.namaPax],
        ['Total Pax',      deal.totalPax],
        ['Jenis Acara',    deal.jenisAcara],
        ['Tipe Wedding',   deal.weddingType ?? '—'],
        ['Waktu Acara',    deal.waktuAcara ?? '—'],
        ['Status Booking', deal.jenisBooking],
        ['Tanggal Booking',deal.tanggalBooking],
        ['Tanggal Acara',  deal.tanggalAcara],
        ['Sumber Data',    deal.sumberData],
        ['Order',          deal.eventOrder ?? '—'],
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
                position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1000, padding: 16,
            }}
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: 20 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{
                    ...S.panel,
                    border: `2px solid ${color}`,
                    borderRadius: 12,
                    width: '100%',
                    maxWidth: 540,
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: `0 0 30px ${color}44`,
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Modal header */}
                <div style={{
                    ...S.surface,
                    padding: '16px 20px',
                    borderBottom: `1px solid ${color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderRadius: '10px 10px 0 0',
                }}>
                    <div>
                        <div style={{ ...S.poppins, color: S.white, fontSize: 18, fontWeight: 700 }}>
                            {deal.namaClient}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            ...S.orbitron,
                            backgroundColor: 'transparent',
                            border: S.border,
                            color: S.white,
                            borderRadius: 6,
                            padding: '4px 10px',
                            cursor: 'pointer',
                            fontSize: 12,
                        }}
                    >
                        ✕ CLOSE
                    </button>
                </div>

                {/* Status badge */}
                <div style={{ padding: '12px 20px', borderBottom: S.border, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                        ...S.poppins,
                        backgroundColor: statusColor + '33',
                        color: statusColor,
                        border: `1px solid ${statusColor}`,
                        borderRadius: 20,
                        padding: '2px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                    }}>
                        {deal.jenisBooking}
                    </span>
                    <span style={{
                        ...S.poppins,
                        backgroundColor: color + '22',
                        color,
                        border: `1px solid ${color}`,
                        borderRadius: 20,
                        padding: '2px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                    }}>
                        {deal.namaVenue}
                    </span>
                </div>

                {/* Scorecard table */}
                <div style={{ padding: '12px 20px' }}>
                    {rows.map(([label, value], i) => (
                        <div key={label} style={{
                            display: 'flex',
                            borderBottom: i < rows.length - 1 ? `1px solid ${S.borderRaw}55` : 'none',
                            padding: '7px 0',
                        }}>
                            <div style={{
                                ...S.poppins,
                                color: S.gold,
                                fontSize: 11,
                                fontWeight: 600,
                                width: 140,
                                flexShrink: 0,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}>
                                {label}
                            </div>
                            <div style={{ ...S.poppins, color: S.white, fontSize: 13, flex: 1 }}>
                                {label === 'Status Booking' ? (
                                    <span style={{ color: statusColor, fontWeight: 700 }}>{value}</span>
                                ) : label === 'Total Pax' ? (
                                    <span style={{ ...S.orbitron, color: S.gold, fontWeight: 700 }}>{value}</span>
                                ) : (
                                    String(value ?? '—')
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );
};

// ─── Day overflow popup ───────────────────────────────────────────────────────
interface DayOverflowPopupProps {
    date: string;
    deals: DealingEntry[];
    onClose: () => void;
    onSelectDeal: (deal: DealingEntry) => void;
}
const DayOverflowPopup: React.FC<DayOverflowPopupProps> = ({ date, deals, onClose, onSelectDeal }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 900, padding: 16,
        }}
        onClick={onClose}
    >
        <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
                ...S.panel,
                border: S.border,
                borderRadius: 10,
                width: '100%',
                maxWidth: 380,
                maxHeight: '80vh',
                overflowY: 'auto',
                boxShadow: `0 0 20px rgba(255,215,0,0.15)`,
            }}
            onClick={e => e.stopPropagation()}
        >
            <div style={{
                ...S.surface,
                padding: '12px 16px',
                borderBottom: S.border,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderRadius: '8px 8px 0 0',
            }}>
                <div style={{ ...S.orbitron, color: S.gold, fontSize: 13, textShadow: S.glow }}>
                    {date} — ALL EVENTS
                </div>
                <button
                    onClick={onClose}
                    style={{
                        backgroundColor: 'transparent', border: 'none',
                        color: S.white, cursor: 'pointer', fontSize: 16,
                    }}
                >✕</button>
            </div>
            <div style={{ padding: 12 }}>
                {deals.map(d => (
                    <div
                        key={d.id}
                        onClick={() => { onClose(); onSelectDeal(d); }}
                        style={{
                            ...S.surface,
                            borderLeft: `3px solid ${getVenueColor(d.namaVenue)}`,
                            borderRadius: 6,
                            padding: '8px 10px',
                            marginBottom: 8,
                            cursor: 'pointer',
                            transition: 'opacity 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                        <div style={{ ...S.poppins, color: S.white, fontSize: 13, fontWeight: 600 }}>
                            {d.waktuAcara ? WAKTU_ICONS[d.waktuAcara] : ''} {d.namaClient}
                        </div>
                        <div style={{ ...S.poppins, color: '#9CA3AF', fontSize: 11 }}>
                            {d.namaVenue} · {d.totalPax} pax · {d.jenisBooking}
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    </motion.div>
);

// ─── Stat Panel ───────────────────────────────────────────────────────────────
interface StatPanelProps {
    label: string;
    value: number;
    color?: string;
    flash?: boolean;
    index?: number;
    baseDelay?: number;
}
const StatPanel: React.FC<StatPanelProps> = ({ label, value, color = S.gold, flash, index = 0, baseDelay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, delay: baseDelay + 0.08 * index, ease: 'easeOut' }}
        style={{
            ...S.surface,
            border: S.border,
            borderRadius: 8,
            padding: '6px 10px',
            textAlign: 'center',
            minWidth: 80,
            flex: '1 1 80px',
            transition: 'box-shadow 0.3s',
            boxShadow: flash ? `0 0 20px ${color}88` : 'none',
        }}
    >
        <div style={{
            ...S.orbitron,
            color,
            fontSize: 20,
            fontWeight: 700,
            textShadow: S.glow,
            lineHeight: 1.1,
        }}>
            {value}
        </div>
        <div style={{
            ...S.poppins,
            color: '#9CA3AF',
            fontSize: 10,
            marginTop: 4,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
        }}>
            {label}
        </div>
    </motion.div>
);

// ─── Compact mode sub-components ─────────────────────────────────────────────

// Generate "tanggal cantik" (beautiful/unique dates) for a given month/year
function generateTanggalCantik(year: number, month: number): { day: number; label: string }[] {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const mm = month + 1;
    const results: { day: number; label: string }[] = [];
    const added = new Set<number>();

    const addIfValid = (day: number, label: string) => {
        if (day >= 1 && day <= daysInMonth && !added.has(day)) {
            added.add(day);
            results.push({ day, label });
        }
    };

    // Repeating: DD.MM where DD === MM (e.g., 01.01, 08.08)
    if (mm <= daysInMonth) addIfValid(mm, `${String(mm).padStart(2, '0')}.${String(mm).padStart(2, '0')}`);

    // Mirror dates: day mirrors the month digits (e.g., month 12 → day 21)
    if (mm >= 10) {
        const reversed = parseInt(String(mm).split('').reverse().join(''), 10);
        if (reversed !== mm) addIfValid(reversed, `${String(reversed).padStart(2, '0')}.${String(mm).padStart(2, '0')} Mirror`);
    }

    // Sequential: DD.MM.YY forms ascending sequence
    const yy = year % 100;
    if (mm === yy - 1 || mm === yy + 1) {
        const seqDay = mm < yy ? mm - 1 : mm + 1;
        addIfValid(seqDay, `${String(seqDay).padStart(2, '0')}.${String(mm).padStart(2, '0')}.${yy} Sequence`);
    }
    // Check if dd.mm.yyyy is palindrome (e.g., 02.02.2020)
    for (let d = 1; d <= daysInMonth; d++) {
        const full = `${String(d).padStart(2, '0')}${String(mm).padStart(2, '0')}${year}`;
        if (full === full.split('').reverse().join('') && !added.has(d)) {
            added.add(d);
            results.push({ day: d, label: `Palindrome` });
        }
    }

    // Lucky numbers: 7, 17, 27
    [7, 17, 27].forEach(d => addIfValid(d, `Lucky ${d}`));

    // Double digits: 11, 22
    [11, 22].forEach(d => addIfValid(d, `Double ${d}`));

    // Last day of month
    addIfValid(daysInMonth, `Akhir Bulan`);

    return results.sort((a, b) => a.day - b.day);
}

// Grid 1: Tanggal Cantik — curated beautiful dates of the month
interface TanggalCantikProps {
    year: number;
    month: number;
    deals: DealingEntry[];
    onSelectDate: (dateStr: string) => void;
    baseDelay?: number;
}
const TanggalCantik: React.FC<TanggalCantikProps> = ({ year, month, deals, onSelectDate, baseDelay = 0 }) => {
    const cantikDates = generateTanggalCantik(year, month);
    const mm = String(month + 1).padStart(2, '0');

    const dealsByDate = deals.reduce<Record<string, DealingEntry[]>>((acc, d) => {
        if (!acc[d.tanggalAcara]) acc[d.tanggalAcara] = [];
        acc[d.tanggalAcara].push(d);
        return acc;
    }, {});

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: baseDelay, ease: 'easeOut' }}
            className="billboard-panel"
            style={{
                ...S.panel,
                borderRadius: 16,
                overflow: 'hidden',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Header */}
            <div className="billboard-header" style={{
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>💎</span>
                    <span style={{ ...S.orbitron, color: S.gold, fontSize: 11, letterSpacing: '0.12em', textShadow: `0 0 10px rgba(255,215,0,0.4), 0 0 20px rgba(255,215,0,0.15)` }}>
                        TANGGAL CANTIK
                    </span>
                </div>
                <span style={{ ...S.poppins, color: '#9CA3AF', fontSize: 10 }}>
                    {INDONESIAN_MONTHS[month]} {year}
                </span>
            </div>

            {/* Date list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
                {cantikDates.length === 0 ? (
                    <div style={{ ...S.poppins, color: S.muted, fontSize: 12, textAlign: 'center', padding: 24 }}>
                        Tidak ada tanggal cantik bulan ini
                    </div>
                ) : (
                    cantikDates.map((cd, i) => {
                        const dateStr = `${year}-${mm}-${String(cd.day).padStart(2, '0')}`;
                        const dayDeals = dealsByDate[dateStr] ?? [];
                        const dateObj = new Date(year, month, cd.day);
                        const dayName = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][dateObj.getDay()];
                        const isBooked = dayDeals.length > 0;

                        return (
                            <motion.div
                                key={cd.day}
                                initial={{ opacity: 0, y: 18 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35, delay: baseDelay + 0.06 * i, ease: 'easeOut' }}
                            >
                            <div
                                className="billboard-card"
                                onClick={() => onSelectDate(dateStr)}
                                style={{
                                    borderRadius: 10,
                                    padding: '10px 12px',
                                    marginBottom: 8,
                                    cursor: 'pointer',
                                    borderLeft: `3px solid ${S.gold}`,
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        {/* Day number */}
                                        <div style={{
                                            ...S.orbitron,
                                            color: S.gold,
                                            fontSize: 24,
                                            fontWeight: 900,
                                            lineHeight: 1,
                                            minWidth: 36,
                                            textAlign: 'center',
                                            textShadow: `0 0 12px ${S.gold}66, 0 0 24px ${S.gold}22`,
                                        }}>
                                            {String(cd.day).padStart(2, '0')}
                                        </div>
                                        <div>
                                            <div style={{ ...S.poppins, color: S.white, fontSize: 11, fontWeight: 600 }}>
                                                {dayName}, {cd.day} {INDONESIAN_MONTHS[month]}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Booking count badge */}
                                    <div style={{
                                        ...S.orbitron,
                                        fontSize: 9,
                                        fontWeight: 700,
                                        padding: '3px 8px',
                                        borderRadius: 10,
                                        backgroundColor: isBooked ? '#F59E0B22' : '#10B98122',
                                        color: isBooked ? '#F59E0B' : '#10B981',
                                        border: `1px solid ${isBooked ? '#F59E0B44' : '#10B98144'}`,
                                        letterSpacing: '0.05em',
                                    }}>
                                        {isBooked ? `${dayDeals.length} EVENT` : 'KOSONG'}
                                    </div>
                                </div>
                            </div>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </motion.div>
    );
};

// Grid 2: Video display (supports multiple videos as carousel)
const VideoPanel: React.FC<{ videoUrls: string[]; enabled?: boolean; placeholderText?: string }> = ({ videoUrls, enabled = true, placeholderText = '' }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Clamp index if urls shrink
    const safeIndex = videoUrls.length > 0 ? Math.min(currentIndex, videoUrls.length - 1) : 0;

    const goPrev = () => setCurrentIndex(i => (i - 1 + videoUrls.length) % videoUrls.length);
    const goNext = () => setCurrentIndex(i => (i + 1) % videoUrls.length);

    const arrowBtn: React.CSSProperties = {
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        backgroundColor: 'rgba(0,0,0,0.45)',
        border: '1px solid rgba(255,215,0,0.35)',
        color: S.gold,
        borderRadius: 6,
        width: 28,
        height: 36,
        cursor: 'pointer',
        fontSize: 13,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
        transition: 'background-color 0.15s',
    };

    return (
        <div className="billboard-panel" style={{
            ...S.panel,
            borderRadius: 16,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
        }}>
            {/* Video area */}
            <div style={{ position: 'relative', backgroundColor: enabled ? '#000' : '#FFFFFF', flex: 1, minHeight: 0 }}>
                {!enabled ? (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        gap: 12,
                        backgroundColor: '#FFFFFF',
                    }}>
                        <span style={{
                            ...S.poppins,
                            color: '#6B7280',
                            fontSize: 16,
                            fontWeight: 600,
                            textAlign: 'center',
                            padding: '0 20px',
                            lineHeight: 1.5,
                        }}>
                            {placeholderText || 'Video tidak tersedia'}
                        </span>
                    </div>
                ) : videoUrls.length === 0 ? (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        gap: 8,
                    }}>
                        <span style={{ fontSize: 32, opacity: 0.3 }}>📺</span>
                        <span style={{ ...S.poppins, color: S.muted, fontSize: 12 }}>
                            No video — upload via CMS
                        </span>
                    </div>
                ) : (
                    <>
                        <video
                            autoPlay
                            loop
                            muted
                            playsInline
                            key={videoUrls[safeIndex]}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                position: 'absolute',
                                inset: 0,
                            }}
                        >
                            <source src={videoUrls[safeIndex]} type="video/mp4" />
                        </video>

                        {/* Prev / Next arrows (only if multiple videos) */}
                        {videoUrls.length > 1 && (
                            <>
                                <button
                                    onClick={goPrev}
                                    style={{ ...arrowBtn, left: 6 }}
                                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.7)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.45)'; }}
                                >◀</button>
                                <button
                                    onClick={goNext}
                                    style={{ ...arrowBtn, right: 6 }}
                                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.7)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.45)'; }}
                                >▶</button>

                                {/* Dots indicator */}
                                <div style={{
                                    position: 'absolute',
                                    bottom: 8,
                                    left: 0,
                                    right: 0,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    gap: 5,
                                    zIndex: 2,
                                }}>
                                    {videoUrls.map((_, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setCurrentIndex(idx)}
                                            style={{
                                                width: idx === safeIndex ? 14 : 8,
                                                height: 8,
                                                borderRadius: 4,
                                                backgroundColor: idx === safeIndex ? S.gold : '#6B7280',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: 0,
                                                transition: 'width 0.2s, background-color 0.2s',
                                            }}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

// Grid 3: Venue availability with date picker
interface VenueAvailabilityProps {
    deals: DealingEntry[];
    selectedDate: string;
    onDateChange: (dateStr: string) => void;
    onToday: () => void;
    venueNames: string[];
    baseDelay?: number;
    compact?: boolean;
}
const VenueAvailability: React.FC<VenueAvailabilityProps> = ({ deals, selectedDate, onDateChange, onToday, venueNames, baseDelay = 0, compact = false }) => {
    const selectedDeals = deals.filter(d => d.tanggalAcara === selectedDate);

    const venueMap: Record<string, { pagi: DealingEntry | null; malam: DealingEntry | null; fullDay: DealingEntry | null; others: DealingEntry[] }> = {};
    const dealVenues = deals.map(d => d.namaVenue);
    const allVenues = Array.from(new Set([...venueNames, ...dealVenues])).sort();

    allVenues.forEach(v => {
        venueMap[v] = { pagi: null, malam: null, fullDay: null, others: [] };
    });

    selectedDeals.forEach(d => {
        if (!venueMap[d.namaVenue]) venueMap[d.namaVenue] = { pagi: null, malam: null, fullDay: null, others: [] };
        if (d.waktuAcara === 'Full Day') venueMap[d.namaVenue].fullDay = d;
        else if (d.waktuAcara === 'Pagi') venueMap[d.namaVenue].pagi = d;
        else if (d.waktuAcara === 'Malam') venueMap[d.namaVenue].malam = d;
        else venueMap[d.namaVenue].others.push(d);
    });

    // Parse selected date for display
    const [sy, sm, sd] = selectedDate.split('-').map(Number);
    const selDateObj = new Date(sy, sm - 1, sd);
    const dayName = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][selDateObj.getDay()];
    const todayStr = dateUtils.getTodayString();
    const isToday = selectedDate === todayStr;

    const todayBtnStyle: React.CSSProperties = {
        ...S.orbitron,
        backgroundColor: 'transparent',
        border: S.border,
        color: S.gold,
        borderRadius: 4,
        padding: '2px 8px',
        cursor: 'pointer',
        fontSize: 9,
        fontWeight: 700,
        transition: 'background-color 0.15s',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: baseDelay, ease: 'easeOut' }}
            className="billboard-panel"
            style={{
                ...S.panel,
                borderRadius: 16,
                overflow: 'hidden',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Header */}
            <div className="billboard-header" style={{
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>🏟️</span>
                    <span style={{ ...S.orbitron, color: S.gold, fontSize: 11, letterSpacing: '0.12em', textShadow: `0 0 10px rgba(255,215,0,0.4), 0 0 20px rgba(255,215,0,0.15)` }}>
                        VENUE AVAILABILITY
                    </span>
                </div>
            </div>

            {/* Date picker */}
            {!compact && (
            <div style={{
                ...S.surface,
                borderBottom: S.border,
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
            }}>
                <div style={{ flex: 1 }}>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={e => onDateChange(e.target.value)}
                        style={{
                            ...S.orbitron,
                            backgroundColor: S.surfaceRaw,
                            border: S.border,
                            color: S.gold,
                            borderRadius: 6,
                            padding: '4px 8px',
                            fontSize: 12,
                            fontWeight: 700,
                            width: '100%',
                            cursor: 'pointer',
                            outline: 'none',
                            colorScheme: 'dark',
                        }}
                    />
                    <div style={{ ...S.poppins, color: '#9CA3AF', fontSize: 9, marginTop: 3 }}>
                        {dayName}{isToday ? ' · Hari Ini' : ''}
                    </div>
                </div>
                {!isToday && (
                    <button
                        style={todayBtnStyle}
                        onClick={onToday}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = S.borderRaw; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >TODAY</button>
                )}
            </div>
            )}

            {/* Venue list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
                {allVenues.length === 0 ? (
                    <div style={{ ...S.poppins, color: S.muted, fontSize: 12, textAlign: 'center', padding: 24 }}>
                        Memuat data venue...
                    </div>
                ) : (
                    allVenues.map((venue, i) => {
                        const info = venueMap[venue];
                        const color = getVenueColor(venue);
                        const hasFullDay = !!info.fullDay;
                        const hasPagi = !!info.pagi;
                        const hasMalam = !!info.malam;
                        const hasOthers = info.others.length > 0;
                        const isBooked = hasFullDay || hasPagi || hasMalam || hasOthers;

                        const slots: { label: string; icon: string; deal: DealingEntry | null; available: boolean }[] = hasFullDay
                            ? [{ label: 'Full Day', icon: '☀️', deal: info.fullDay, available: false }]
                            : [
                                { label: 'Pagi', icon: '🌅', deal: info.pagi, available: !info.pagi },
                                { label: 'Malam', icon: '🌙', deal: info.malam, available: !info.malam },
                            ];

                        return (
                            <motion.div
                                key={venue}
                                initial={{ opacity: 0, y: 18 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35, delay: baseDelay + 0.06 * i, ease: 'easeOut' }}
                            >
                            <div
                                className="billboard-card"
                                style={{
                                    borderLeft: `3px solid ${color}`,
                                    borderRadius: 8,
                                    padding: '10px 12px',
                                    marginBottom: 8,
                                }}
                            >
                                {/* Venue name */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: 6,
                                }}>
                                    <span style={{ ...S.poppins, color: S.white, fontSize: 12, fontWeight: 600 }}>
                                        {venue}
                                    </span>
                                    {!isBooked && (
                                        <span style={{
                                            ...S.orbitron,
                                            fontSize: 8,
                                            fontWeight: 700,
                                            color: '#10B981',
                                            backgroundColor: '#10B98122',
                                            border: '1px solid #10B98144',
                                            borderRadius: 10,
                                            padding: '2px 8px',
                                            letterSpacing: '0.05em',
                                        }}>
                                            AVAILABLE
                                        </span>
                                    )}
                                </div>
                                {/* Time slots */}
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {slots.map(slot => {
                                        const statusColor = slot.available ? '#10B981' : BOOKING_STATUS_COLORS[slot.deal?.jenisBooking ?? ''] ?? '#6B7280';
                                        return (
                                            <div
                                                key={slot.label}
                                                style={{
                                                    ...S.poppins,
                                                    fontSize: 10,
                                                    padding: '3px 8px',
                                                    borderRadius: 6,
                                                    backgroundColor: slot.available ? '#10B98115' : `${statusColor}15`,
                                                    border: `1px solid ${slot.available ? '#10B98133' : `${statusColor}33`}`,
                                                    color: slot.available ? '#10B981' : statusColor,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                }}
                                            >
                                                <span style={{ fontSize: 10 }}>{slot.icon}</span>
                                                <span>{slot.label}</span>
                                                {slot.deal && (
                                                    <span style={{ fontWeight: 600, marginLeft: 2 }}>
                                                        — {slot.deal.namaClient}
                                                    </span>
                                                )}
                                                {slot.available && (
                                                    <span style={{ fontWeight: 600, marginLeft: 2 }}>— Kosong</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {info.others.map(d => (
                                        <div
                                            key={d.id}
                                            style={{
                                                ...S.poppins,
                                                fontSize: 10,
                                                padding: '3px 8px',
                                                borderRadius: 6,
                                                backgroundColor: `${BOOKING_STATUS_COLORS[d.jenisBooking] ?? '#6B7280'}15`,
                                                border: `1px solid ${BOOKING_STATUS_COLORS[d.jenisBooking] ?? '#6B7280'}33`,
                                                color: BOOKING_STATUS_COLORS[d.jenisBooking] ?? '#6B7280',
                                            }}
                                        >
                                            {d.namaClient} — {d.jenisBooking}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </motion.div>
    );
};

// ─── EventChart Sub-component ─────────────────────────────────────────────────
interface EventChartProps {
    monthDeals: DealingEntry[];
    monthLabel: string;
}
const EventChart: React.FC<EventChartProps> = ({ monthDeals, monthLabel }) => {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 50);
        return () => clearTimeout(timer);
    }, []);

    // Chart A: group by venue
    const venueCounts: Record<string, number> = {};
    monthDeals.forEach(d => {
        venueCounts[d.namaVenue] = (venueCounts[d.namaVenue] ?? 0) + 1;
    });
    const venueData = Object.entries(venueCounts).sort((a, b) => b[1] - a[1]);
    const maxVenue = Math.max(...venueData.map(([, c]) => c), 1);

    // Chart B: group by booking status
    const statusOrder = ['Lunas', 'DP', 'Booking', 'Soft Booking', 'Waiting List'];
    const statusCounts: Record<string, number> = {};
    monthDeals.forEach(d => {
        statusCounts[d.jenisBooking] = (statusCounts[d.jenisBooking] ?? 0) + 1;
    });
    const statusData = statusOrder
        .map(s => [s, statusCounts[s] ?? 0] as [string, number])
        .filter(([, c]) => c > 0 || true); // always show all statuses
    const maxStatus = Math.max(...statusData.map(([, c]) => c), 1);

    const renderBar = (label: string, count: number, maxCount: number, color: string, key: string) => {
        const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
        return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{
                    ...S.poppins,
                    color: '#9CA3AF',
                    fontSize: 10,
                    width: 120,
                    flexShrink: 0,
                    textAlign: 'right',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}>
                    {label}
                </div>
                <div style={{ flex: 1, height: 18, backgroundColor: S.bgRaw, borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                        height: '100%',
                        width: mounted ? `${pct}%` : '0%',
                        backgroundColor: color,
                        borderRadius: 4,
                        transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)',
                        boxShadow: `0 0 6px ${color}66`,
                    }} />
                </div>
                <div style={{
                    ...S.orbitron,
                    color: color,
                    fontSize: 11,
                    fontWeight: 700,
                    width: 24,
                    textAlign: 'right',
                    flexShrink: 0,
                }}>
                    {count}
                </div>
            </div>
        );
    };

    return (
        <div style={{
            ...S.panel,
            border: S.border,
            borderRadius: 10,
            padding: '8px 12px',
            marginTop: 8,
        }}>
            <div style={{ ...S.orbitron, color: S.gold, fontSize: 11, letterSpacing: '0.1em', marginBottom: 14, textShadow: S.glow }}>
                EVENT CHART — {monthLabel}
            </div>
            <div className="event-chart-grid" style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 20,
            }}>
                {/* Chart A: Events per Venue */}
                <div>
                    <div style={{
                        ...S.orbitron,
                        color: '#9CA3AF',
                        fontSize: 9,
                        letterSpacing: '0.12em',
                        marginBottom: 10,
                        textTransform: 'uppercase',
                    }}>
                        EVENTS PER VENUE
                    </div>
                    {venueData.length === 0 ? (
                        <div style={{ ...S.poppins, color: S.muted, fontSize: 12 }}>Tidak ada data</div>
                    ) : (
                        venueData.map(([venue, count]) =>
                            renderBar(venue, count, maxVenue, getVenueColor(venue), `venue-${venue}`)
                        )
                    )}
                </div>

                {/* Chart B: Events per Status */}
                <div>
                    <div style={{
                        ...S.orbitron,
                        color: '#9CA3AF',
                        fontSize: 9,
                        letterSpacing: '0.12em',
                        marginBottom: 10,
                        textTransform: 'uppercase',
                    }}>
                        EVENTS PER STATUS
                    </div>
                    {statusData.map(([status, count]) =>
                        renderBar(status, count, maxStatus, BOOKING_STATUS_COLORS[status] ?? '#6B7280', `status-${status}`)
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── YouTube URL helper ────────────────────────────────────────────────────────
function getYouTubeId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
}

// ─── MusicPlayer Sub-component ────────────────────────────────────────────────
interface MusicPlayerProps {
    musicUrls: string[];
}
const MusicPlayer: React.FC<MusicPlayerProps> = ({ musicUrls }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const ytPlayerRef = useRef<any>(null);
    const ytContainerRef = useRef<HTMLDivElement>(null);
    const [trackIndex, setTrackIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(0.7);
    const [ytReady, setYtReady] = useState(false);

    const safeIndex = musicUrls.length > 0 ? Math.min(trackIndex, musicUrls.length - 1) : 0;
    const currentUrl = musicUrls[safeIndex] || '';
    const ytId = getYouTubeId(currentUrl);
    const isYouTube = !!ytId;

    // Load YouTube IFrame API once if any URL is a YouTube link
    useEffect(() => {
        if (!musicUrls.some(u => getYouTubeId(u))) return;
        if ((window as any).YT) { setYtReady(true); return; }
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
        (window as any).onYouTubeIframeAPIReady = () => setYtReady(true);
    }, [musicUrls]);

    // Update audio src when track changes (only for non-YouTube tracks)
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || musicUrls.length === 0) return;
        if (isYouTube) { audio.pause(); audio.src = ''; return; }
        audio.src = musicUrls[safeIndex];
        audio.load();
        if (isPlaying) {
            audio.play().catch(() => setIsPlaying(false));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [safeIndex, musicUrls, isYouTube]);

    // Create or update YouTube player when current track is YouTube
    useEffect(() => {
        if (!isYouTube || !ytReady || !ytId) return;

        // Stop audio playback
        if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }

        if (ytPlayerRef.current) {
            ytPlayerRef.current.loadVideoById(ytId);
            if (!isPlaying) ytPlayerRef.current.pauseVideo();
        } else if (ytContainerRef.current) {
            ytPlayerRef.current = new (window as any).YT.Player(ytContainerRef.current, {
                height: '1',
                width: '1',
                videoId: ytId,
                playerVars: { autoplay: isPlaying ? 1 : 0, controls: 0 },
                events: {
                    onStateChange: (event: any) => {
                        if (event.data === (window as any).YT.PlayerState.ENDED) handleEnded();
                    },
                },
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isYouTube, ytReady, ytId, safeIndex]);

    // Pause YT player when switching away from a YouTube track
    useEffect(() => {
        if (!isYouTube && ytPlayerRef.current) {
            try { ytPlayerRef.current.pauseVideo(); } catch {}
        }
    }, [isYouTube]);

    // Sync volume / mute for both audio and YT
    useEffect(() => {
        const audio = audioRef.current;
        if (audio) audio.volume = isMuted ? 0 : volume;
        if (ytPlayerRef.current) {
            try {
                if (isMuted) ytPlayerRef.current.mute();
                else { ytPlayerRef.current.unMute(); ytPlayerRef.current.setVolume(volume * 100); }
            } catch {}
        }
    }, [volume, isMuted]);

    const handlePlayPause = () => {
        if (isYouTube && ytPlayerRef.current) {
            if (isPlaying) {
                ytPlayerRef.current.pauseVideo();
                setIsPlaying(false);
            } else {
                ytPlayerRef.current.playVideo();
                setIsPlaying(true);
            }
        } else {
            const audio = audioRef.current;
            if (!audio) return;
            if (isPlaying) {
                audio.pause();
                setIsPlaying(false);
            } else {
                audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
            }
        }
    };

    const handleNext = () => {
        const next = (safeIndex + 1) % musicUrls.length;
        setTrackIndex(next);
    };

    const handleEnded = () => {
        const next = (safeIndex + 1) % musicUrls.length;
        setTrackIndex(next);
        // auto-play next
        setTimeout(() => {
            audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
        }, 100);
    };

    const btnStyle: React.CSSProperties = {
        backgroundColor: 'transparent',
        border: 'none',
        color: S.gold,
        cursor: 'pointer',
        fontSize: 20,
        padding: 0,
        lineHeight: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    };

    return (
        <>
            <audio ref={audioRef} onEnded={handleEnded} preload="none" />
            <div ref={ytContainerRef} style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, overflow: 'hidden' }} />
            <div style={{
                backgroundColor: S.surfaceRaw,
                border: '1px solid rgba(255,215,0,0.2)',
                borderRadius: 30,
                padding: '6px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 0 10px rgba(255,215,0,0.1)',
            }}>
                {/* Track info */}
                <div style={{
                    ...S.orbitron,
                    color: S.gold,
                    fontSize: 10,
                    letterSpacing: '0.08em',
                    whiteSpace: 'nowrap',
                }}>
                    {isYouTube ? '▶ YT' : '♪'} {safeIndex + 1}/{musicUrls.length}
                </div>

                {/* Play/Pause */}
                <button
                    style={btnStyle}
                    onClick={handlePlayPause}
                    title={isPlaying ? 'Pause' : 'Play'}
                >
                    {isPlaying ? '⏸' : '▶'}
                </button>

                {/* Next */}
                <button
                    style={btnStyle}
                    onClick={handleNext}
                    title="Next track"
                >
                    ⏭
                </button>

                {/* Mute toggle */}
                <button
                    style={{ ...btnStyle, fontSize: 14 }}
                    onClick={() => setIsMuted(m => !m)}
                    title={isMuted ? 'Unmute' : 'Mute'}
                >
                    {isMuted ? '🔇' : '🔊'}
                </button>

                {/* Volume slider */}
                <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={e => {
                        const v = parseFloat(e.target.value);
                        setVolume(v);
                        if (v > 0 && isMuted) setIsMuted(false);
                    }}
                    style={{
                        width: 64,
                        accentColor: S.gold,
                        cursor: 'pointer',
                    }}
                    title="Volume"
                />
            </div>
        </>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
type ViewMode = 'calendar' | 'compact';

const CricketBoardCalendar: React.FC = () => {
    const today = new Date();
    const [currentYear, setCurrentYear]   = useState(today.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed
    const [deals, setDeals]               = useState<DealingEntry[]>([]);
    const [loading, setLoading]           = useState(true);
    const [time, setTime]                 = useState(new Date());
    const [flash, setFlash]               = useState(false);
    const [selectedDeal, setSelectedDeal] = useState<DealingEntry | null>(null);
    const [overflowDay, setOverflowDay]   = useState<{ dateStr: string; deals: DealingEntry[] } | null>(null);
    const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [bgVideoUrls, setBgVideoUrls] = useState<string[]>([]);
    const [bgMusicUrls, setBgMusicUrls] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>('compact');
    const [compactDate, setCompactDate] = useState(dateUtils.getTodayString());
    const [calendarDate, setCalendarDate] = useState(dateUtils.getTodayString());
    const [calendarDateRange, setCalendarDateRange] = useState<{
        startMonth: number; startYear: number; endMonth: number; endYear: number;
    } | null>(null);
    const [allVenueNames, setAllVenueNames] = useState<string[]>([]);
    const [headingFont, setHeadingFont] = useState('Orbitron');
    const [bodyFont, setBodyFont] = useState('Poppins');
    const [customFonts, setCustomFonts] = useState<{ name: string; url: string }[]>([]);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [bgColor, setBgColor] = useState<string | null>(null);
    const [autoSwitchMinutes, setAutoSwitchMinutes] = useState<number>(0);
    const [videoEnabled, setVideoEnabled] = useState(true);
    const [videoPlaceholderText, setVideoPlaceholderText] = useState('');
    const [marqueeTexts, setMarqueeTexts] = useState<string[]>([]);

    // Fetch all venue names
    useEffect(() => {
        const fetchVenues = async () => {
            const { data } = await supabase.from('venues').select('name').order('name');
            if (data) setAllVenueNames(data.map((v: { name: string }) => v.name));
        };
        fetchVenues();
    }, []);

    // Clock tick
    useEffect(() => {
        const id = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    // Fetch all deals
    const fetchEvents = useCallback(async () => {
        const { data, error } = await supabase.from('deals').select('*');
        if (error) { console.error('CricketBoardCalendar fetch error:', error); return; }
        setDeals((data as DealingEntry[]) || []);
        setLoading(false);
        // Trigger flash
        setFlash(true);
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setFlash(false), 800);
    }, []);

    // Initial fetch + real-time subscription
    useEffect(() => {
        fetchEvents();
        const channel = supabase
            .channel('public-calendar-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, () => {
                fetchEvents();
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchEvents]);

    // Fetch background video URLs from site_settings
    useEffect(() => {
        const fetchBgVideos = async () => {
            // Try plural key first (JSON array string)
            const { data: dataPlural } = await supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'calendar_bg_video_urls')
                .maybeSingle();
            if (dataPlural?.value) {
                try {
                    const parsed = JSON.parse(dataPlural.value);
                    if (Array.isArray(parsed)) { setBgVideoUrls(parsed.filter(Boolean)); return; }
                } catch { /* fall through */ }
            }
            // Fallback: singular key (single URL wrapped in array)
            const { data: dataSingle } = await supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'calendar_bg_video_url')
                .maybeSingle();
            if (dataSingle?.value) {
                setBgVideoUrls([dataSingle.value]);
            }
        };
        fetchBgVideos();

        // Subscribe to changes so videos update in real-time
        const channel = supabase
            .channel('bg-video-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload: any) => {
                if (payload.new?.key === 'calendar_bg_video_urls') {
                    try {
                        const parsed = JSON.parse(payload.new.value || '[]');
                        if (Array.isArray(parsed)) setBgVideoUrls(parsed.filter(Boolean));
                    } catch { /* ignore */ }
                } else if (payload.new?.key === 'calendar_bg_video_url') {
                    setBgVideoUrls(payload.new.value ? [payload.new.value] : []);
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Fetch background music URLs from site_settings
    useEffect(() => {
        const fetchBgMusic = async () => {
            const { data } = await supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'calendar_bg_music_urls')
                .maybeSingle();
            if (data?.value) {
                try {
                    const parsed = JSON.parse(data.value);
                    if (Array.isArray(parsed)) { setBgMusicUrls(parsed.filter(Boolean)); }
                } catch { /* ignore */ }
            }
        };
        fetchBgMusic();

        const musicChannel = supabase
            .channel('bg-music-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload: any) => {
                if (payload.new?.key === 'calendar_bg_music_urls') {
                    try {
                        const parsed = JSON.parse(payload.new.value || '[]');
                        if (Array.isArray(parsed)) setBgMusicUrls(parsed.filter(Boolean));
                    } catch { /* ignore */ }
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(musicChannel); };
    }, []);

    // Fetch calendar date range from site_settings
    useEffect(() => {
        const fetchDateRange = async () => {
            const { data } = await supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'calendar_date_range')
                .maybeSingle();
            if (data?.value) {
                try {
                    const parsed = JSON.parse(data.value);
                    if (parsed && typeof parsed.startMonth === 'number') {
                        setCalendarDateRange(parsed);
                    }
                } catch { /* ignore malformed */ }
            }
        };
        fetchDateRange();

        const channel = supabase
            .channel('date-range-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload: any) => {
                if (payload.new?.key === 'calendar_date_range') {
                    try {
                        const parsed = JSON.parse(payload.new.value || 'null');
                        setCalendarDateRange(parsed && typeof parsed.startMonth === 'number' ? parsed : null);
                    } catch { /* ignore */ }
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Fetch font settings from site_settings
    useEffect(() => {
        const fetchFonts = async () => {
            const { data } = await supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'calendar_fonts')
                .maybeSingle();
            if (data?.value) {
                try {
                    const parsed = JSON.parse(data.value);
                    if (parsed.heading) setHeadingFont(parsed.heading);
                    if (parsed.body) setBodyFont(parsed.body);
                } catch { /* ignore */ }
            }

            const { data: customFontData } = await supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'calendar_custom_fonts')
                .maybeSingle();
            if (customFontData?.value) {
                try {
                    const parsed = JSON.parse(customFontData.value);
                    if (Array.isArray(parsed)) setCustomFonts(parsed);
                } catch {}
            }

            const { data: marqueeData } = await supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'calendar_marquee_text')
                .maybeSingle();
            if (marqueeData?.value) {
                try {
                    const parsed = JSON.parse(marqueeData.value);
                    if (Array.isArray(parsed)) setMarqueeTexts(parsed);
                    else setMarqueeTexts([marqueeData.value]);
                } catch {
                    setMarqueeTexts([marqueeData.value]);
                }
            }
        };
        fetchFonts();

        const channel = supabase
            .channel('calendar-font-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload: any) => {
                if (payload.new?.key === 'calendar_fonts') {
                    try {
                        const parsed = JSON.parse(payload.new.value || '{}');
                        if (parsed.heading) setHeadingFont(parsed.heading);
                        if (parsed.body) setBodyFont(parsed.body);
                    } catch { /* ignore */ }
                }
                if (payload.new?.key === 'calendar_custom_fonts') {
                    try {
                        const parsed = JSON.parse(payload.new.value || '[]');
                        if (Array.isArray(parsed)) setCustomFonts(parsed);
                    } catch {}
                }
                if (payload.new?.key === 'calendar_marquee_text') {
                    try {
                        const parsed = JSON.parse(payload.new.value || '[]');
                        if (Array.isArray(parsed)) setMarqueeTexts(parsed);
                        else setMarqueeTexts([payload.new.value]);
                    } catch {
                        setMarqueeTexts([payload.new.value]);
                    }
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Fetch logo from site_settings
    useEffect(() => {
        const fetchLogo = async () => {
            const { data } = await supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'calendar_logo_url')
                .maybeSingle();
            if (data?.value) {
                setLogoUrl(data.value);
            }
        };
        fetchLogo();

        const channel = supabase
            .channel('calendar-logo-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload: any) => {
                if (payload.new?.key === 'calendar_logo_url') {
                    setLogoUrl(payload.new.value || null);
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Fetch background color from site_settings
    useEffect(() => {
        const fetchBgColor = async () => {
            const { data } = await supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'calendar_bg_color')
                .maybeSingle();
            if (data?.value) {
                setBgColor(data.value);
            }
        };
        fetchBgColor();

        const channel = supabase
            .channel('calendar-bg-color-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload: any) => {
                if (payload.new?.key === 'calendar_bg_color') {
                    setBgColor(payload.new.value || null);
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Fetch video toggle + placeholder text from site_settings
    useEffect(() => {
        const fetchVideoToggle = async () => {
            const { data: enabledData } = await supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'calendar_video_enabled')
                .maybeSingle();
            if (enabledData?.value !== undefined && enabledData?.value !== null) {
                setVideoEnabled(enabledData.value !== 'false');
            }

            const { data: textData } = await supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'calendar_video_placeholder_text')
                .maybeSingle();
            if (textData?.value) {
                setVideoPlaceholderText(textData.value);
            }
        };
        fetchVideoToggle();

        const channel = supabase
            .channel('calendar-video-toggle-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload: any) => {
                if (payload.new?.key === 'calendar_video_enabled') {
                    setVideoEnabled(payload.new.value !== 'false');
                }
                if (payload.new?.key === 'calendar_video_placeholder_text') {
                    setVideoPlaceholderText(payload.new.value || '');
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Fetch auto-switch interval from site_settings
    useEffect(() => {
        const fetchAutoSwitch = async () => {
            const { data } = await supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'calendar_auto_switch_minutes')
                .maybeSingle();
            if (data?.value) {
                const parsed = parseInt(data.value, 10);
                setAutoSwitchMinutes(isNaN(parsed) ? 0 : parsed);
            }
        };
        fetchAutoSwitch();

        const channel = supabase
            .channel('calendar-auto-switch-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload: any) => {
                if (payload.new?.key === 'calendar_auto_switch_minutes') {
                    const parsed = parseInt(payload.new.value || '0', 10);
                    setAutoSwitchMinutes(isNaN(parsed) ? 0 : parsed);
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Ref to hold current values so the interval callback avoids stale closures
    const autoSwitchRef = useRef({ currentMonth, currentYear, calendarDateRange });
    useEffect(() => {
        autoSwitchRef.current = { currentMonth, currentYear, calendarDateRange };
    }, [currentMonth, currentYear, calendarDateRange]);

    // Auto-advance month every autoSwitchMinutes minutes
    useEffect(() => {
        if (autoSwitchMinutes <= 0) return;
        const id = setInterval(() => {
            const { currentMonth: cm, currentYear: cy, calendarDateRange: range } = autoSwitchRef.current;
            let newMonth = cm === 11 ? 0 : cm + 1;
            let newYear = cm === 11 ? cy + 1 : cy;

            if (range) {
                const { endMonth, endYear, startMonth, startYear } = range;
                // endMonth/startMonth are 1-indexed in storage
                if (newYear > endYear || (newYear === endYear && newMonth > endMonth - 1)) {
                    newMonth = startMonth - 1;
                    newYear = startYear;
                }
            }

            setCurrentMonth(newMonth);
            setCurrentYear(newYear);
            setCompactDate(`${newYear}-${String(newMonth + 1).padStart(2, '0')}-01`);
        }, autoSwitchMinutes * 60 * 1000);
        return () => clearInterval(id);
    }, [autoSwitchMinutes]);

    // Dynamically load Google Fonts when heading/body fonts change
    useEffect(() => {
        const families = [headingFont, bodyFont]
            .filter(Boolean)
            .map(f => f.replace(/ /g, '+') + ':wght@300;400;500;600;700;800;900')
            .join('&family=');
        const href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`;

        const id = 'dynamic-calendar-fonts';
        let link = document.getElementById(id) as HTMLLinkElement | null;
        if (!link) {
            link = document.createElement('link');
            link.id = id;
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
        link.href = href;
    }, [headingFont, bodyFont]);

    useEffect(() => {
        const id = 'custom-font-faces';
        let style = document.getElementById(id) as HTMLStyleElement | null;
        if (!style) {
            style = document.createElement('style');
            style.id = id;
            document.head.appendChild(style);
        }
        style.textContent = customFonts.map(f => {
            const ext = f.url.split('.').pop()?.toLowerCase();
            const format = ext === 'woff2' ? 'woff2' : ext === 'woff' ? 'woff' : ext === 'otf' ? 'opentype' : 'truetype';
            return `@font-face { font-family: '${f.name}'; src: url('${f.url}') format('${format}'); font-display: swap; }`;
        }).join('\n');
    }, [customFonts]);

    // ── Update S based on bgColor ──────────────────────────────────────────
    if (bgColor) {
        S = {
            ...S,
            bg:      { backgroundColor: bgColor },
            surface: { backgroundColor: adjustColor(bgColor, 12) },
            panel:   { backgroundColor: adjustColor(bgColor, 6) },
            border:  `1px solid ${adjustColor(bgColor, 30)}`,
            bgRaw:      bgColor,
            surfaceRaw: adjustColor(bgColor, 12),
            panelRaw:   adjustColor(bgColor, 6),
            borderRaw:  adjustColor(bgColor, 30),
            muted:      adjustColor(bgColor, 40),
        };
    } else {
        S = {
            ...S,
            bg:      { backgroundColor: DEFAULT_COLORS.bg },
            surface: { backgroundColor: DEFAULT_COLORS.surface },
            panel:   { backgroundColor: DEFAULT_COLORS.panel },
            border:  `1px solid ${DEFAULT_COLORS.border}`,
            bgRaw:      DEFAULT_COLORS.bg,
            surfaceRaw: DEFAULT_COLORS.surface,
            panelRaw:   DEFAULT_COLORS.panel,
            borderRaw:  DEFAULT_COLORS.border,
            muted:      adjustColor(DEFAULT_COLORS.bg, 40),
        };
    }

    // ── Calendar grid helpers ──────────────────────────────────────────────
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0=Sun
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear  = currentMonth === 0 ? currentYear - 1 : currentYear;
    const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();

    const todayStr = dateUtils.getTodayString();

    // Build grid cells
    interface GridCell {
        dateStr: string;
        day: number;
        isCurrentMonth: boolean;
        isToday: boolean;
    }
    const cells: GridCell[] = [];
    // Leading cells from previous month
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const month = String(prevMonth + 1).padStart(2, '0');
        const year  = prevYear;
        cells.push({ dateStr: `${year}-${month}-${String(day).padStart(2, '0')}`, day, isCurrentMonth: false, isToday: false });
    }
    // Current month cells
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        cells.push({ dateStr, day: d, isCurrentMonth: true, isToday: dateStr === todayStr });
    }
    // Trailing cells to complete the last row
    const remainder = cells.length % 7;
    if (remainder !== 0) {
        const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
        const nextYear  = currentMonth === 11 ? currentYear + 1 : currentYear;
        for (let d = 1; d <= 7 - remainder; d++) {
            const month = String(nextMonth + 1).padStart(2, '0');
            cells.push({ dateStr: `${nextYear}-${month}-${String(d).padStart(2, '0')}`, day: d, isCurrentMonth: false, isToday: false });
        }
    }

    // Deals indexed by date
    const dealsByDate = deals.reduce<Record<string, DealingEntry[]>>((acc, deal) => {
        const d = deal.tanggalAcara;
        if (!acc[d]) acc[d] = [];
        acc[d].push(deal);
        return acc;
    }, {});

    // Sort each day's deals by eventOrder then namaClient
    Object.keys(dealsByDate).forEach(d => {
        dealsByDate[d].sort((a, b) => {
            if (a.eventOrder !== undefined && b.eventOrder !== undefined) return a.eventOrder - b.eventOrder;
            if (a.eventOrder !== undefined) return -1;
            if (b.eventOrder !== undefined) return 1;
            return a.namaClient.localeCompare(b.namaClient);
        });
    });

    // ── Monthly stats ─────────────────────────────────────────────────────
    const monthDeals = deals.filter(d => {
        const [y, m] = d.tanggalAcara.split('-').map(Number);
        return y === currentYear && m === currentMonth + 1;
    });
    const countBy = (status: string) => monthDeals.filter(d => d.jenisBooking === status).length;

    // ── Venue legend ──────────────────────────────────────────────────────
    const venueCounts: Record<string, number> = {};
    monthDeals.forEach(d => {
        venueCounts[d.namaVenue] = (venueCounts[d.namaVenue] ?? 0) + 1;
    });
    const venueEntries = Object.entries(venueCounts).sort((a, b) => b[1] - a[1]);

    // ── Navigation ────────────────────────────────────────────────────────
    const prevMonthNav = () => {
        const newMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const newYear  = currentMonth === 0 ? currentYear - 1 : currentYear;
        if (calendarDateRange) {
            const { startMonth, startYear } = calendarDateRange;
            // startMonth is 1-indexed in the stored value
            if (newYear < startYear || (newYear === startYear && newMonth < startMonth - 1)) return;
        }
        setCurrentMonth(newMonth);
        setCurrentYear(newYear);
    };
    const nextMonthNav = () => {
        const newMonth = currentMonth === 11 ? 0 : currentMonth + 1;
        const newYear  = currentMonth === 11 ? currentYear + 1 : currentYear;
        if (calendarDateRange) {
            const { endMonth, endYear } = calendarDateRange;
            // endMonth is 1-indexed in the stored value
            if (newYear > endYear || (newYear === endYear && newMonth > endMonth - 1)) return;
        }
        setCurrentMonth(newMonth);
        setCurrentYear(newYear);
    };
    const goToday = () => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()); };

    // ── Time display ──────────────────────────────────────────────────────
    const timeStr = time.toLocaleTimeString('id-ID', { hour12: false });
    const dateStr = time.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const navBtnStyle: React.CSSProperties = {
        ...S.orbitron,
        backgroundColor: S.surfaceRaw,
        border: '1px solid rgba(255,215,0,0.3)',
        color: S.gold,
        borderRadius: 8,
        padding: '8px 18px',
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 700,
        transition: 'all 0.3s ease',
        boxShadow: '0 0 8px rgba(255,215,0,0.15)',
        letterSpacing: '0.05em',
    };

    return (
        <div style={{
            ...S.bg,
            width: 1920,
            height: 1080,
            maxWidth: '100vw',
            maxHeight: '100vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column' as const,
            ...S.poppins,
            position: 'relative',
            '--font-heading': `'${headingFont}', monospace`,
            '--font-body': `'${bodyFont}', sans-serif`,
            '--color-bg': S.bgRaw,
            '--color-surface': S.surfaceRaw,
            '--color-panel': S.panelRaw,
            '--color-border': S.borderRaw,
        } as React.CSSProperties}>
            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                @keyframes marqueeShimmer {
                    0%, 100% { color: #FFD700; text-shadow: 0 0 10px rgba(255,215,0,0.3), 0 0 20px rgba(255,215,0,0.1); }
                    25% { color: #FFF8DC; text-shadow: 0 0 15px rgba(255,215,0,0.6), 0 0 30px rgba(255,215,0,0.3), 0 0 50px rgba(255,215,0,0.15); }
                    50% { color: #FFD700; text-shadow: 0 0 8px rgba(255,215,0,0.2); }
                    75% { color: #FFEC8B; text-shadow: 0 0 20px rgba(255,215,0,0.5), 0 0 40px rgba(255,215,0,0.2); }
                }
                .marquee-text-shimmer {
                    animation: marqueeShimmer 3s ease-in-out infinite;
                }
                .marquee-separator {
                    animation: marqueeShimmer 3s ease-in-out infinite 1.5s;
                }
                @keyframes neonPulse {
                    0%, 100% { box-shadow: 0 0 5px rgba(255,215,0,0.3), 0 0 20px rgba(255,215,0,0.1); }
                    50% { box-shadow: 0 0 10px rgba(255,215,0,0.5), 0 0 40px rgba(255,215,0,0.2), 0 0 60px rgba(255,215,0,0.1); }
                }
                @keyframes borderGlow {
                    0%, 100% { border-color: rgba(255,215,0,0.3); }
                    50% { border-color: rgba(255,215,0,0.7); }
                }
                @keyframes textGlow {
                    0%, 100% { text-shadow: 0 0 10px rgba(255,215,0,0.3), 0 0 20px rgba(255,215,0,0.1); }
                    50% { text-shadow: 0 0 15px rgba(255,215,0,0.6), 0 0 30px rgba(255,215,0,0.3), 0 0 45px rgba(255,215,0,0.1); }
                }
                .billboard-panel {
                    border: 1px solid rgba(255,215,0,0.25) !important;
                    animation: neonPulse 3s ease-in-out infinite;
                    background: var(--color-panel) !important;
                }
                .billboard-header {
                    background: linear-gradient(90deg, rgba(255,215,0,0.08) 0%, transparent 50%, rgba(255,215,0,0.08) 100%) !important;
                    border-bottom: 1px solid rgba(255,215,0,0.2) !important;
                }
                .billboard-card {
                    border: 1px solid rgba(255,215,0,0.15);
                    background: var(--color-surface);
                    transition: all 0.3s ease;
                }
                .billboard-card:hover {
                    border-color: rgba(255,215,0,0.5);
                    box-shadow: 0 0 15px rgba(255,215,0,0.2), inset 0 0 15px rgba(255,215,0,0.05);
                    transform: translateX(3px);
                }
                .billboard-marquee {
                    background: linear-gradient(90deg, rgba(255,215,0,0.05) 0%, rgba(255,215,0,0.12) 50%, rgba(255,215,0,0.05) 100%) !important;
                    border: 1px solid rgba(255,215,0,0.3) !important;
                    animation: borderGlow 2s ease-in-out infinite;
                }
                .compact-month-title {
                    animation: textGlow 2.5s ease-in-out infinite;
                }
            `}</style>

            {/* Video Background (calendar mode only — compact has its own video panel) */}
            {bgVideoUrls.length > 0 && viewMode === 'calendar' && videoEnabled && (
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    key={bgVideoUrls[0]}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        zIndex: 0,
                        opacity: 0.3,
                        pointerEvents: 'none',
                    }}
                >
                    <source src={bgVideoUrls[0]} type="video/mp4" />
                </video>
            )}

            {/* ── HEADER ────────────────────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{
                    ...S.surface,
                    borderBottom: S.border,
                    padding: '10px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'nowrap',
                    gap: 12,
                    position: 'relative',
                    zIndex: 1,
                    flexShrink: 0,
                }}
            >
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {logoUrl && (
                        <img
                            src={logoUrl}
                            alt="Logo"
                            style={{
                                height: 40,
                                width: 'auto',
                                objectFit: 'contain',
                                flexShrink: 0,
                                filter: 'drop-shadow(0 0 6px rgba(255,215,0,0.3))',
                            }}
                        />
                    )}
                </div>

                {/* Music Player + Mode toggle + Clock */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {bgMusicUrls.length > 0 && <MusicPlayer musicUrls={bgMusicUrls} />}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {/* Mode toggle */}
                    <div style={{
                        display: 'flex',
                        borderRadius: 8,
                        overflow: 'hidden',
                        border: S.border,
                    }}>
                        <button
                            onClick={() => setViewMode('compact')}
                            style={{
                                ...S.orbitron,
                                padding: '6px 12px',
                                fontSize: 10,
                                fontWeight: 700,
                                cursor: 'pointer',
                                border: 'none',
                                letterSpacing: '0.05em',
                                transition: 'all 0.2s',
                                backgroundColor: viewMode === 'compact' ? S.borderRaw : S.surfaceRaw,
                                color: viewMode === 'compact' ? S.gold : '#6B7280',
                                boxShadow: viewMode === 'compact' ? `inset 0 0 10px rgba(255,215,0,0.15)` : 'none',
                            }}
                        >
                            ◫ COMPACT
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            style={{
                                ...S.orbitron,
                                padding: '6px 12px',
                                fontSize: 10,
                                fontWeight: 700,
                                cursor: 'pointer',
                                border: 'none',
                                borderLeft: S.border,
                                letterSpacing: '0.05em',
                                transition: 'all 0.2s',
                                backgroundColor: viewMode === 'calendar' ? S.borderRaw : S.surfaceRaw,
                                color: viewMode === 'calendar' ? S.gold : '#6B7280',
                                boxShadow: viewMode === 'calendar' ? `inset 0 0 10px rgba(255,215,0,0.15)` : 'none',
                            }}
                        >
                            ▦ CALENDAR
                        </button>
                    </div>

                    {/* Clock + date */}
                    <div style={{ textAlign: 'right' }}>
                        <div style={{
                            ...S.orbitron,
                            color: S.gold,
                            fontSize: 'clamp(16px, 2.5vw, 24px)',
                            fontWeight: 700,
                            textShadow: S.glow,
                            letterSpacing: '0.08em',
                        }}>
                            {timeStr}
                        </div>
                        <div style={{ ...S.poppins, color: '#9CA3AF', fontSize: 11, marginTop: 1 }}>
                            {dateStr}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ── COMPACT VIEW ──────────────────────────────────────── */}
            {viewMode === 'compact' && (<>
                <div key={`compact-${currentMonth}-${currentYear}`} style={{ padding: '10px 20px 0 20px', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', width: '100%', boxSizing: 'border-box' as const }}>
                    {/* Month navigation for compact mode */}
                    <motion.div
                        initial={{ opacity: 0, y: 25 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
                        style={{ flexShrink: 0 }}
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 12,
                            marginBottom: 8,
                        }}>
                            <button style={navBtnStyle} onClick={prevMonthNav}
                                onMouseEnter={e => { e.currentTarget.style.boxShadow = S.glow; e.currentTarget.style.backgroundColor = S.panelRaw; }}
                                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.backgroundColor = S.surfaceRaw; }}
                            >◀</button>
                            <div className="compact-month-title" style={{
                                ...S.orbitron,
                                color: S.gold,
                                fontSize: 'clamp(18px, 3vw, 28px)',
                                fontWeight: 900,
                                letterSpacing: '0.15em',
                                textShadow: `0 0 10px rgba(255,215,0,0.4), 0 0 30px rgba(255,215,0,0.2), 0 0 50px rgba(255,215,0,0.1)`,
                            }}>
                                {INDONESIAN_MONTHS[currentMonth].toUpperCase()} {currentYear}
                            </div>
                            <button style={navBtnStyle} onClick={nextMonthNav}
                                onMouseEnter={e => { e.currentTarget.style.boxShadow = S.glow; e.currentTarget.style.backgroundColor = S.panelRaw; }}
                                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.backgroundColor = S.surfaceRaw; }}
                            >▶</button>
                        </div>
                    </motion.div>

                    {/* 3 columns: Tanggal Cantik | Video (landscape) | Venue Availability */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row' as const,
                        gap: 12,
                        flex: 1,
                        minHeight: 0,
                    }}>
                        <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
                            <TanggalCantik
                                year={currentYear}
                                month={currentMonth}
                                deals={deals}
                                onSelectDate={(dateStr) => setCompactDate(dateStr)}
                                baseDelay={0.25}
                            />
                        </div>
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.45, ease: 'easeOut' }}
                            style={{ flex: 2, minWidth: 0, minHeight: 0 }}
                        >
                            <VideoPanel videoUrls={bgVideoUrls} enabled={videoEnabled} placeholderText={videoPlaceholderText} />
                        </motion.div>
                        <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
                            <VenueAvailability
                                deals={deals}
                                selectedDate={compactDate}
                                onDateChange={(dateStr) => setCompactDate(dateStr)}
                                onToday={() => setCompactDate(dateUtils.getTodayString())}
                                venueNames={allVenueNames}
                                baseDelay={0.65}
                                compact
                            />
                        </div>
                    </div>

                    {/* Marquee — inside the viewport container so no scroll needed */}
                    {marqueeTexts.length > 0 && (
                        <div
                            className="billboard-marquee"
                            style={{
                                flexShrink: 0,
                                borderRadius: 10,
                                padding: '14px 0',
                                marginTop: 12,
                                overflow: 'hidden',
                                position: 'relative',
                            }}
                        >
                            <div style={{
                                display: 'inline-flex',
                                whiteSpace: 'nowrap',
                                animation: 'marquee 60s linear infinite',
                            }}>
                                {[0, 1].map(copy => (
                                    <span key={copy} style={{
                                        ...S.orbitron,
                                        fontSize: 22,
                                        fontWeight: 700,
                                        letterSpacing: '0.05em',
                                        paddingRight: 60,
                                    }}>
                                        {marqueeTexts.map((text, i) => (
                                            <React.Fragment key={i}>
                                                {i > 0 && <span className="marquee-separator" style={{ margin: '0 24px', opacity: 0.5 }}>{' ✦ '}</span>}
                                                <span className="marquee-text-shimmer">{text}</span>
                                            </React.Fragment>
                                        ))}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </>)}

            {/* ── CALENDAR VIEW ────────────────────────────────────────── */}
            {viewMode === 'calendar' && (
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
                style={{ padding: '16px 20px', maxWidth: 1400, margin: '0 auto', position: 'relative', zIndex: 1, flex: 1, overflow: 'auto', width: '100%' }}
            >

                {/* ── VENUE LEGEND ─────────────────────────────────────── */}
                {venueEntries.length > 0 && (
                    <div style={{
                        ...S.surface,
                        border: S.border,
                        borderRadius: 8,
                        padding: '10px 16px',
                        marginBottom: 14,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 10,
                        alignItems: 'center',
                    }}>
                        <span style={{ ...S.orbitron, color: S.gold, fontSize: 10, letterSpacing: '0.08em', marginRight: 4 }}>VENUES:</span>
                        {venueEntries.map(([venue, count]) => (
                            <div key={venue} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{
                                    display: 'inline-block',
                                    width: 10, height: 10, borderRadius: '50%',
                                    backgroundColor: getVenueColor(venue),
                                    flexShrink: 0,
                                }} />
                                <span style={{ ...S.poppins, color: S.white, fontSize: 11 }}>{venue}</span>
                                <span style={{ ...S.orbitron, color: '#9CA3AF', fontSize: 10 }}>({count})</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── MONTH NAVIGATION ─────────────────────────────────── */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                    flexWrap: 'wrap',
                    gap: 8,
                }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button style={navBtnStyle} onClick={prevMonthNav}
                            onMouseEnter={e => { e.currentTarget.style.boxShadow = S.glow; e.currentTarget.style.backgroundColor = S.panelRaw; }}
                            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.backgroundColor = S.surfaceRaw; }}
                        >
                            ◀ PREV
                        </button>
                        <button style={navBtnStyle} onClick={goToday}
                            onMouseEnter={e => { e.currentTarget.style.boxShadow = S.glow; e.currentTarget.style.backgroundColor = S.panelRaw; }}
                            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.backgroundColor = S.surfaceRaw; }}
                        >
                            TODAY
                        </button>
                    </div>
                    <div style={{
                        ...S.orbitron,
                        color: S.gold,
                        fontSize: 'clamp(16px, 3vw, 22px)',
                        fontWeight: 700,
                        textShadow: S.glow,
                        textAlign: 'center',
                    }}>
                        {INDONESIAN_MONTHS[currentMonth].toUpperCase()} {currentYear}
                    </div>
                    <button style={navBtnStyle} onClick={nextMonthNav}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow = S.glow; e.currentTarget.style.backgroundColor = S.panelRaw; }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.backgroundColor = S.surfaceRaw; }}
                    >
                        NEXT ▶
                    </button>
                </div>

                {/* ── CALENDAR GRID ─────────────────────────────────────── */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 60 }}>
                        <div style={{ ...S.orbitron, color: S.gold, fontSize: 18, textShadow: S.glow }}>LOADING...</div>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: 4,
                        border: S.border,
                        borderRadius: 10,
                        overflow: 'hidden',
                        ...S.panel,
                    }}>
                        {/* Day headers */}
                        {INDONESIAN_DAYS.map(day => (
                            <div key={day} style={{
                                ...S.surface,
                                borderBottom: S.border,
                                padding: '8px 4px',
                                textAlign: 'center',
                                ...S.orbitron,
                                color: S.gold,
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: '0.06em',
                            }}>
                                {day}
                            </div>
                        ))}

                        {/* Day cells */}
                        {cells.map((cell, idx) => {
                            const dayDeals = dealsByDate[cell.dateStr] ?? [];
                            const visible  = dayDeals.slice(0, 3);
                            const overflow = dayDeals.length - visible.length;
                            const isToday  = cell.isToday;
                            const compact  = true; // always compact in cell

                            return (
                                <div
                                    key={idx}
                                    style={{
                                        ...S.panel,
                                        border: isToday
                                            ? `2px solid ${S.gold}`
                                            : `1px solid ${S.border.replace('1px solid ', '')}44`,
                                        borderRadius: 0,
                                        minHeight: 110,
                                        padding: 4,
                                        position: 'relative',
                                        boxShadow: isToday ? `inset 0 0 12px rgba(255,215,0,0.12)` : 'none',
                                        transition: 'background-color 0.15s',
                                    }}
                                    onMouseEnter={e => { if (!isToday) e.currentTarget.style.backgroundColor = S.surface.backgroundColor as string; }}
                                    onMouseLeave={e => { if (!isToday) e.currentTarget.style.backgroundColor = S.panel.backgroundColor as string; }}
                                >
                                    {/* Date number */}
                                    <div style={{
                                        ...S.orbitron,
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: isToday ? S.gold : cell.isCurrentMonth ? S.white : S.muted,
                                        textAlign: 'right',
                                        textShadow: isToday ? S.glow : 'none',
                                        marginBottom: 3,
                                        paddingRight: 2,
                                    }}>
                                        {cell.day}
                                    </div>

                                    {/* Event cards */}
                                    {visible.map(deal => (
                                        <EventCard
                                            key={deal.id}
                                            deal={deal}
                                            compact={compact}
                                            onClick={setSelectedDeal}
                                        />
                                    ))}

                                    {/* Overflow button */}
                                    {overflow > 0 && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setOverflowDay({ dateStr: cell.dateStr, deals: dayDeals }); }}
                                            style={{
                                                ...S.poppins,
                                                backgroundColor: `${S.border.replace('1px solid ', '')}88`,
                                                border: S.border,
                                                color: S.gold,
                                                borderRadius: 4,
                                                padding: '1px 5px',
                                                fontSize: 9,
                                                cursor: 'pointer',
                                                width: '100%',
                                                marginTop: 2,
                                                fontWeight: 600,
                                            }}
                                        >
                                            +{overflow} more
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── TANGGAL CANTIK & VENUE AVAILABILITY ─────────────── */}
                <div className="calendar-bottom-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 14,
                    marginTop: 14,
                    maxHeight: 500,
                }}>
                    <TanggalCantik
                        year={currentYear}
                        month={currentMonth}
                        deals={deals}
                        onSelectDate={(dateStr) => setCalendarDate(dateStr)}
                        baseDelay={0.3}
                    />
                    <VenueAvailability
                        deals={deals}
                        selectedDate={calendarDate}
                        onDateChange={(dateStr) => setCalendarDate(dateStr)}
                        onToday={() => setCalendarDate(dateUtils.getTodayString())}
                        venueNames={allVenueNames}
                        baseDelay={0.45}
                    />
                </div>

            </motion.div>
            )}

            {/* Music player moved to header */}

            {/* ── MODALS ───────────────────────────────────────────────── */}
            <AnimatePresence>
                {selectedDeal && (
                    <EventDetailModal deal={selectedDeal} onClose={() => setSelectedDeal(null)} />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {overflowDay && (
                    <DayOverflowPopup
                        date={overflowDay.dateStr}
                        deals={overflowDay.deals}
                        onClose={() => setOverflowDay(null)}
                        onSelectDeal={setSelectedDeal}
                    />
                )}
            </AnimatePresence>

            {/* ── KEYFRAME ANIMATION ───────────────────────────────────── */}
            <style>{`
                @keyframes cricketPulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50%       { opacity: 0.3; transform: scale(0.85); }
                }

                @keyframes barGrow {
                    from { width: 0%; }
                    to   { width: var(--bar-target-width); }
                }

                ::-webkit-scrollbar { width: 6px; height: 6px; }
                ::-webkit-scrollbar-track { background: ${S.bg.backgroundColor}; }
                ::-webkit-scrollbar-thumb { background: ${S.border.replace('1px solid ', '')}; border-radius: 3px; }
                ::-webkit-scrollbar-thumb:hover { background: #FFD700; }

                @media (max-width: 768px) {
                    .calendar-bottom-grid { grid-template-columns: 1fr !important; }
                    .cricket-stats-panel { flex-wrap: wrap !important; }
                }
            `}</style>
        </div>
    );
};

export default CricketBoardCalendar;
