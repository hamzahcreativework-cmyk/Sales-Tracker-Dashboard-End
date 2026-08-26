import React, { useMemo, useState, useEffect } from 'react';
import { useVenues } from './VenueContext';
import { OptionStatus, LaporanDatabaseEntry, MarketingPerson, UserRole } from './types';
import { PdfIcon, CsvIcon, WarningIcon } from './Icons';
import { supabase } from './supabaseClient';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

type ChartData = Record<OptionStatus, number>;

// Tailwind color classes for the legend
const STATUS_COLORS_TAILWIND: Record<OptionStatus, string> = {
    'Pengisian Lengkap': 'bg-[var(--color-success)]',
    'Pengisian Data Tidak Lengkap': 'bg-[var(--color-warning)]',
    'Tidak Mengisi Data': 'bg-[var(--color-danger)]',
    'Sudah Mengisi Data': 'bg-[var(--color-success)]',
};

// Hex colors for the SVG chart strokes
const STATUS_COLORS_HEX: Record<OptionStatus, string> = {
    'Pengisian Lengkap': '#34d399',
    'Pengisian Data Tidak Lengkap': '#facc15',
    'Tidak Mengisi Data': '#f43f5e',
    'Sudah Mengisi Data': '#34d399',
};

const STATUS_LABELS: Record<OptionStatus, string> = {
    'Pengisian Lengkap': 'Lengkap',
    'Pengisian Data Tidak Lengkap': 'Kurang Lengkap',
    'Tidak Mengisi Data': 'Kosong',
    'Sudah Mengisi Data': 'Sudah Mengisi',
};

const DonutChart: React.FC<{ 
    data: ChartData;
    setTooltip: (tooltip: { x: number, y: number, content: React.ReactNode } | null) => void; 
}> = ({ data, setTooltip }) => {
    const size = 150;
    const strokeWidth = 22;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const gapSize = 4; // Visual gap between segments
    // FIX: Operator '+' cannot be applied to types 'unknown' and 'number'.
    // `Object.values` can return `unknown[]`. Cast `val` to a Number to ensure the reduction operation is safe.
    const total = Object.values(data).reduce((sum: number, val) => sum + (Number(val) || 0), 0) as number;

    const segments = (Object.keys(data) as OptionStatus[])
        .map(status => ({
            status,
            // FIX: The right-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.
            // Cast `data[status]` to a Number to ensure type safety for subsequent arithmetic operations.
            value: Number(data[status] || 0),
            color: STATUS_COLORS_HEX[status]
        }))
        .filter(segment => segment.value > 0);

    let accumulatedPercentage = 0;

    return (
        <div 
            className="relative" 
            style={{ width: size, height: size }}
            onMouseLeave={() => setTooltip(null)}
        >
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                {segments.map((segment, index) => {
                    const percentage = total === 0 ? 0 : segment.value / total;
                    const arcLength = circumference * percentage;
                    const strokeDasharray = `${arcLength - (segments.length > 1 ? gapSize : 0)} ${circumference - (arcLength - (segments.length > 1 ? gapSize : 0))}`;
                    const rotation = accumulatedPercentage * 360;
                    accumulatedPercentage += percentage;

                    return (
                        <circle
                            key={index}
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="none"
                            stroke={segment.color}
                            strokeWidth={strokeWidth}
                            strokeDasharray={strokeDasharray}
                            transform={`rotate(${rotation}, ${size / 2}, ${size / 2})`}
                            style={{ transition: 'all 0.5s ease-out' }}
                            onMouseMove={(e) => {
                                const percentValue = total === 0 ? 0 : (segment.value / total) * 100;
                                setTooltip({
                                    x: e.clientX,
                                    y: e.clientY,
                                    content: (
                                        <div className="flex flex-col p-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: segment.color }}></div>
                                                <span className="font-bold text-white">{STATUS_LABELS[segment.status]}</span>
                                            </div>
                                            <span className="text-sm text-slate-200 pl-5">{segment.value} Laporan ({percentValue.toFixed(1)}%)</span>
                                        </div>
                                    )
                                });
                            }}
                        />
                    );
                })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <span className="text-3xl font-bold text-[var(--color-text-primary)]">{total > 0 ? '100%' : 'N/A'}</span>
            </div>
        </div>
    );
};

interface GrafikViewProps {
    userRole: UserRole;
    assignedVenue: string | null;
}

const GrafikView: React.FC<GrafikViewProps> = ({ userRole, assignedVenue }) => {
    const { venues: VENUES } = useVenues();
    const [selectedVenue, setSelectedVenue] = useState<string>(assignedVenue || VENUES[0]?.name || '');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [allReports, setAllReports] = useState<LaporanDatabaseEntry[]>([]);
    const [allMarketing, setAllMarketing] = useState<MarketingPerson[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tooltip, setTooltip] = useState<{ x: number, y: number, content: React.ReactNode } | null>(null);
    
    const isVenueRestricted = userRole === 'User' && !!assignedVenue;

    useEffect(() => {
        const fetchChartData = async () => {
            setIsLoading(true);
            setError(null);
            
            try {
                let reportsQuery = supabase.from('reports').select('*');
                if (isVenueRestricted) {
                    reportsQuery = reportsQuery.eq('venueName', assignedVenue);
                }

                const [reportsRes, marketingRes] = await Promise.all([
                    reportsQuery,
                    supabase.from('marketing_staff').select('*')
                ]);

                const fetchError = reportsRes.error || marketingRes.error;
                if (fetchError) {
                    console.error('Error fetching chart data:', fetchError.message);
                    setError('Gagal memuat data. Silakan coba lagi nanti.');
                    setAllReports([]);
                    setAllMarketing([]);
                } else {
                    setAllReports(reportsRes.data as LaporanDatabaseEntry[]);
                    setAllMarketing(marketingRes.data as MarketingPerson[]);
                }
            } catch (err) {
                console.error('Unexpected error in fetchChartData:', err);
                setError('Terjadi kesalahan tak terduga saat memuat data.');
                setAllReports([]);
                setAllMarketing([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchChartData();
    }, [userRole, assignedVenue, isVenueRestricted]);

    const filteredReports = useMemo(() => {
        if (isLoading) return [];
        return allReports.filter(report => {
            if (!startDate && !endDate) return true;
            const reportDate = new Date(report.tanggalUpdate);
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            
            if (end) end.setHours(23, 59, 59, 999);

            if (start && reportDate < start) return false;
            if (end && reportDate > end) return false;
            return true;
        });
    }, [startDate, endDate, allReports, isLoading]);

    const displayedVenues = useMemo(() => {
        return isVenueRestricted ? VENUES.filter(v => v.name === assignedVenue) : VENUES;
    }, [isVenueRestricted, assignedVenue]);

    const summaryData = useMemo(() => {
        return displayedVenues.map(venue => {
            const reportsForVenue = filteredReports.filter(r => r.venueName === venue.name);
            const totalReports = reportsForVenue.length;
            const counts: ChartData = {
                'Pengisian Lengkap': reportsForVenue.filter(r => r.optionStatus === 'Pengisian Lengkap').length,
                'Pengisian Data Tidak Lengkap': reportsForVenue.filter(r => r.optionStatus === 'Pengisian Data Tidak Lengkap').length,
                'Tidak Mengisi Data': reportsForVenue.filter(r => r.optionStatus === 'Tidak Mengisi Data').length,
                'Sudah Mengisi Data': reportsForVenue.filter(r => r.optionStatus === 'Sudah Mengisi Data').length,
            };
            return { venueName: venue.name, totalReports, counts };
        });
    }, [filteredReports, displayedVenues]);

    const dataByVenue = useMemo(() => {
        return displayedVenues.map(venue => {
            const marketingForVenue = allMarketing.filter(p => p.venueName === venue.name);
            
            const marketingData = marketingForVenue.map(person => {
                const personReports = filteredReports.filter(
                    r => r.marketingName === person.name && r.venueName === venue.name
                );
                
                const counts: ChartData = {
                    'Pengisian Lengkap': personReports.filter(r => r.optionStatus === 'Pengisian Lengkap').length,
                    'Pengisian Data Tidak Lengkap': personReports.filter(r => r.optionStatus === 'Pengisian Data Tidak Lengkap').length,
                    'Tidak Mengisi Data': personReports.filter(r => r.optionStatus === 'Tidak Mengisi Data').length,
                    'Sudah Mengisi Data': personReports.filter(r => r.optionStatus === 'Sudah Mengisi Data').length,
                };

                const totalReports = personReports.length;

                return { name: person.name, counts, totalReports };
            });
            return { venueName: venue.name, marketingData };
        });
    }, [filteredReports, allMarketing, displayedVenues]);
    
    const selectedVenueData = useMemo(() => {
        return dataByVenue.find(v => v.venueName === selectedVenue);
    }, [dataByVenue, selectedVenue]);
    
    const handleDownloadSummaryCSV = () => {
        if (summaryData.length === 0) {
            alert("Tidak ada data ringkasan untuk diunduh.");
            return;
        }
        const headers = [
            "Venue", "Total Laporan", "Lengkap (Jumlah)", "Lengkap (%)", 
            "Kurang Lengkap (Jumlah)", "Kurang Lengkap (%)", "Kosong (Jumlah)", "Kosong (%)",
            "Sudah Mengisi (Jumlah)", "Sudah Mengisi (%)"
        ];
    
        const rows = summaryData.map(item => {
            const total = item.totalReports;
            const lengkap = item.counts['Pengisian Lengkap'];
            const kurang = item.counts['Pengisian Data Tidak Lengkap'];
            const kosong = item.counts['Tidak Mengisi Data'];
            const sudah = item.counts['Sudah Mengisi Data'];
    
            const lengkapPerc = total > 0 ? ((lengkap / total) * 100).toFixed(1) : '0.0';
            const kurangPerc = total > 0 ? ((kurang / total) * 100).toFixed(1) : '0.0';
            const kosongPerc = total > 0 ? ((kosong / total) * 100).toFixed(1) : '0.0';
            const sudahPerc = total > 0 ? ((sudah / total) * 100).toFixed(1) : '0.0';
    
            return [
                `"${item.venueName}"`, total, lengkap, `${lengkapPerc}%`,
                kurang, `${kurangPerc}%`, kosong, `${kosongPerc}%`, sudah, `${sudahPerc}%`
            ].join(',');
        });
    
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `ringkasan-venue-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadSummaryPDF = () => {
        if (summaryData.length === 0) {
            alert("Tidak ada data ringkasan untuk diunduh.");
            return;
        }
    
        const doc = new jsPDF();
        let title = "Ringkasan Laporan per Venue";
        if (startDate || endDate) {
            title += ` (${startDate || '...'} s/d ${endDate || '...'})`;
        }
        doc.text(title, 14, 16);
    
        const tableColumn = [
            "Venue", "Total", "Lengkap", "Kurang", "Kosong", "Sudah Mengisi"
        ];
        const tableRows: (string | number)[][] = [];
    
        summaryData.forEach(item => {
            const total = item.totalReports;
            const lengkap = item.counts['Pengisian Lengkap'];
            const kurang = item.counts['Pengisian Data Tidak Lengkap'];
            const kosong = item.counts['Tidak Mengisi Data'];
            const sudah = item.counts['Sudah Mengisi Data'];
    
            const formatCell = (count: number) => {
                const perc = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
                return `${count} (${perc}%)`;
            };
            
            const rowData = [
                item.venueName,
                total,
                formatCell(lengkap),
                formatCell(kurang),
                formatCell(kosong),
                formatCell(sudah)
            ];
            tableRows.push(rowData);
        });
    
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 20,
            theme: 'grid',
            styles: { fontSize: 9 },
            headStyles: { fillColor: [30, 41, 59] },
        });
        
        doc.save(`ringkasan-venue-${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const DownloadButton: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
        <button onClick={onClick} className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-secondary)] bg-[var(--color-surface)] border border-[var(--color-border)] px-3 py-2 rounded-lg hover:bg-[var(--color-interactive)] hover:text-[var(--color-primary)] transition-all duration-200">
            {icon}
            {label}
        </button>
    );

    const SummaryStatusCell: React.FC<{ count: number; total: number; type: OptionStatus }> = ({ count, total, type }) => {
        const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
        const colorClass = 
            type === 'Pengisian Lengkap' || type === 'Sudah Mengisi Data' ? 'text-green-400' :
            type === 'Pengisian Data Tidak Lengkap' ? 'text-yellow-400' : 'text-red-400';
        
        return (
            <td className={`p-3 sm:p-4 font-semibold ${colorClass}`}>
                {count} <span className="text-xs text-[var(--color-text-secondary)]">({percentage}%)</span>
            </td>
        );
    };

    return (
        <div className="space-y-8 fade-in">
            <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-[var(--color-text-primary)]">Grafik Laporan</h1>
                 <p className="mt-2 text-[var(--color-text-secondary)]">Visualisasi kinerja tim marketing berdasarkan status kelengkapan laporan.</p>
            </div>

            {error && (
                <div className="card p-4 bg-red-900/20 border border-red-500/30">
                    <div className="flex items-start gap-3">
                        <div className="mt-1 flex-shrink-0">
                            <WarningIcon className="w-6 h-6 text-red-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-red-300">Gagal Memuat Data</h3>
                            <p className="text-sm text-red-300/80 mt-1">{error}</p>
                        </div>
                    </div>
                </div>
            )}
            
             <div className="card p-4">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="flex flex-wrap items-end gap-4 flex-grow">
                        <div className="flex-grow sm:flex-grow-0">
                            <label htmlFor="venue-select" className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-1">Pilih Venue</label>
                            <select
                                id="venue-select"
                                value={selectedVenue}
                                onChange={(e) => setSelectedVenue(e.target.value)}
                                className="form-select w-full p-2.5"
                                disabled={isVenueRestricted}
                            >
                                {displayedVenues.map(venue => (
                                    <option key={venue.name} value={venue.name}>{venue.name}</option>
                                ))}
                            </select>
                        </div>
                         <div className="flex-grow sm:flex-grow-0">
                            <label htmlFor="start-date" className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-1">Dari Tanggal</label>
                            <input type="date" id="start-date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="form-select w-full p-2.5" />
                        </div>
                        <div className="flex-grow sm:flex-grow-0">
                            <label htmlFor="end-date" className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-1">Sampai Tanggal</label>
                            <input type="date" id="end-date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="form-select w-full p-2.5" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <DownloadButton icon={<PdfIcon className="w-5 h-5" />} label="PDF" onClick={handleDownloadSummaryPDF} />
                        <DownloadButton icon={<CsvIcon className="w-5 h-5" />} label="CSV" onClick={handleDownloadSummaryCSV} />
                    </div>
                </div>
            </div>

            {!isLoading && !error && (
                <div className="card p-0 overflow-hidden">
                    <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] p-6 border-b border-[var(--color-border)]">Ringkasan Per Venue</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50">
                                <tr className="text-[var(--color-text-secondary)]">
                                    <th className="p-3 sm:p-4 font-semibold text-sm">Venue</th>
                                    <th className="p-3 sm:p-4 font-semibold text-sm">Total Laporan</th>
                                    <th className="p-3 sm:p-4 font-semibold text-sm">Lengkap</th>
                                    <th className="p-3 sm:p-4 font-semibold text-sm">Kurang Lengkap</th>
                                    <th className="p-3 sm:p-4 font-semibold text-sm">Kosong</th>
                                    <th className="p-3 sm:p-4 font-semibold text-sm">Sudah Mengisi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summaryData.map(item => (
                                    <tr key={item.venueName} className="border-t border-[var(--color-border)]">
                                        <td className="p-3 sm:p-4 font-semibold text-[var(--color-text-primary)] whitespace-nowrap">{item.venueName}</td>
                                        <td className="p-3 sm:p-4 text-[var(--color-text-secondary)] font-bold text-center">{item.totalReports}</td>
                                        <SummaryStatusCell count={item.counts['Pengisian Lengkap']} total={item.totalReports} type="Pengisian Lengkap" />
                                        <SummaryStatusCell count={item.counts['Pengisian Data Tidak Lengkap']} total={item.totalReports} type="Pengisian Data Tidak Lengkap" />
                                        <SummaryStatusCell count={item.counts['Tidak Mengisi Data']} total={item.totalReports} type="Tidak Mengisi Data" />
                                        <SummaryStatusCell count={item.counts['Sudah Mengisi Data']} total={item.totalReports} type="Sudah Mengisi Data" />
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="flex items-center justify-center py-16 card">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-primary)]"></div>
                    <p className="ml-4 text-[var(--color-text-secondary)]">Mengambil data dari database...</p>
                </div>
            ) : selectedVenueData ? (
                <div>
                    <h2 className="text-2xl font-semibold mb-6 text-[var(--color-text-primary)] border-b border-[var(--color-border)] pb-3">{selectedVenueData.venueName}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {selectedVenueData.marketingData.length > 0 ? (
                            selectedVenueData.marketingData.map(personData => (
                                <div key={personData.name} className="card p-4 flex flex-col items-center justify-between fade-in h-full">
                                   <div className="text-center">
                                       <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{personData.name}</h3>
                                       <p className="text-sm text-[var(--color-text-secondary)] mb-4">Total Laporan: {personData.totalReports}</p>
                                   </div>
                                   {personData.totalReports > 0 ? (
                                       <div className="flex flex-col items-center">
                                           <DonutChart data={personData.counts} setTooltip={setTooltip} />
                                           <div className="flex justify-center items-center gap-x-3 gap-y-1 mt-4 text-xs flex-wrap px-2">
                                               {(Object.keys(personData.counts) as OptionStatus[]).map(status => (
                                                   <div key={status} className="flex items-center">
                                                       <span className={`w-3 h-3 rounded-full mr-1.5 ${STATUS_COLORS_TAILWIND[status]}`}></span>
                                                       <span className="text-[var(--color-text-secondary)] font-medium">{STATUS_LABELS[status]}</span>
                                                   </div>
                                               ))}
                                           </div>
                                       </div>
                                   ) : (
                                       <div className="flex-grow w-full flex items-center justify-center p-4 my-4 border border-dashed border-[var(--color-border)] rounded-xl bg-gray-50">
                                           <p className="text-[var(--color-text-secondary)] text-center">Tidak ada data laporan.</p>
                                       </div>
                                   )}
                               </div>
                           ))
                        ) : (
                             <div className="col-span-full card text-center py-16">
                                <p className="text-[var(--color-text-secondary)]">Belum ada data marketing untuk venue ini.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                 <div className="text-center py-16 card">
                    <p className="text-[var(--color-text-secondary)]">Silakan pilih venue untuk melihat data.</p>
                </div>
            )}
            
            {tooltip && (
                <div
                    className="fixed pointer-events-none p-2 text-sm bg-gray-800 bg-opacity-90 rounded-lg shadow-lg z-50 transition-opacity duration-100"
                    style={{
                        left: tooltip.x,
                        top: tooltip.y,
                        transform: 'translate(15px, 15px)', // Offset from cursor
                    }}
                >
                    {tooltip.content}
                </div>
            )}
        </div>
    );
};

export default GrafikView;
