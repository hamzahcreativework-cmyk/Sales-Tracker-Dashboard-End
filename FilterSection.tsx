import React from 'react';
import { useVenues } from './VenueContext';
import { MarketingPerson } from './types';

export interface DealFilters {
    namaClient: string;
    namaVenue: string;
    namaMarketing: string;
    jenisAcara: '' | 'Wedding' | 'Non Wedding';
    jenisBooking: '' | 'DP' | 'Lunas';
    sumberData: string;
    tanggalAcaraStart: string;
    tanggalAcaraEnd: string;
}

interface FilterSectionProps {
    filters: DealFilters;
    onFilterChange: <K extends keyof DealFilters>(key: K, value: DealFilters[K]) => void;
    onReset: () => void;
    sumberDataOptions: string[];
    marketingOptions: MarketingPerson[];
}

const FilterSection: React.FC<FilterSectionProps> = ({ filters, onFilterChange, onReset, sumberDataOptions, marketingOptions }) => {
    const { venues: VENUES } = useVenues();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        onFilterChange(name as keyof DealFilters, value);
    };

    return (
        <div className="card p-6 mb-6 fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                {/* Cari Nama Client */}
                <div>
                    <label htmlFor="namaClient" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Cari Nama Client</label>
                    <input
                        type="text"
                        id="namaClient"
                        name="namaClient"
                        value={filters.namaClient}
                        onChange={handleInputChange}
                        placeholder="Masukkan nama client..."
                        className="w-full form-input py-2.5"
                    />
                </div>
                {/* Venue */}
                <div>
                    <label htmlFor="namaVenue" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Venue</label>
                    <select
                        id="namaVenue"
                        name="namaVenue"
                        value={filters.namaVenue}
                        onChange={handleInputChange}
                        className="w-full form-select py-2.5"
                    >
                        <option value="">Semua Venue</option>
                        {VENUES.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
                    </select>
                </div>
                {/* Marketing */}
                <div>
                    <label htmlFor="namaMarketing" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Marketing</label>
                    <select
                        id="namaMarketing"
                        name="namaMarketing"
                        value={filters.namaMarketing}
                        onChange={handleInputChange}
                        className="w-full form-select py-2.5"
                    >
                        <option value="">Semua Marketing</option>
                        {marketingOptions.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                    </select>
                </div>
                 {/* Jenis Acara */}
                <div>
                    <label htmlFor="jenisAcara" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Jenis Acara</label>
                    <select
                        id="jenisAcara"
                        name="jenisAcara"
                        value={filters.jenisAcara}
                        onChange={handleInputChange}
                        className="w-full form-select py-2.5"
                    >
                        <option value="">Semua Jenis</option>
                        <option value="Wedding">Wedding</option>
                        <option value="Non Wedding">Non Wedding</option>
                    </select>
                </div>
                {/* Jenis Booking */}
                <div>
                    <label htmlFor="jenisBooking" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Jenis Booking</label>
                    <select
                        id="jenisBooking"
                        name="jenisBooking"
                        value={filters.jenisBooking}
                        onChange={handleInputChange}
                        className="w-full form-select py-2.5"
                    >
                        <option value="">Semua Status</option>
                        <option value="DP">DP</option>
                        <option value="Lunas">Lunas</option>
                    </select>
                </div>
                {/* Sumber Data */}
                <div>
                    <label htmlFor="sumberData" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Sumber Data</label>
                    <select
                        id="sumberData"
                        name="sumberData"
                        value={filters.sumberData}
                        onChange={handleInputChange}
                        className="w-full form-select py-2.5"
                    >
                        <option value="">Semua Sumber</option>
                        {sumberDataOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                {/* Tanggal Acara Start */}
                <div>
                    <label htmlFor="tanggalAcaraStart" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Tgl Acara (Dari)</label>
                    <input
                        type="date"
                        id="tanggalAcaraStart"
                        name="tanggalAcaraStart"
                        value={filters.tanggalAcaraStart}
                        onChange={handleInputChange}
                        className="w-full form-input py-2.5"
                    />
                </div>
                {/* Tanggal Acara End */}
                <div>
                    <label htmlFor="tanggalAcaraEnd" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Tgl Acara (Sampai)</label>
                    <input
                        type="date"
                        id="tanggalAcaraEnd"
                        name="tanggalAcaraEnd"
                        value={filters.tanggalAcaraEnd}
                        onChange={handleInputChange}
                        className="w-full form-input py-2.5"
                    />
                </div>
            </div>
            <div className="flex justify-end mt-6">
                 <button 
                    onClick={onReset}
                    className="w-full sm:w-auto px-6 py-2.5 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-xl hover:bg-[var(--color-interactive)] font-semibold transition-colors"
                >
                    Reset Filter
                </button>
            </div>
        </div>
    );
};

export default FilterSection;
