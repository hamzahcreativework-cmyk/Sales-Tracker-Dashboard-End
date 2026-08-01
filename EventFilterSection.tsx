import React from 'react';
import { useVenues } from './VenueContext';
import { MarketingPerson } from './types';

export interface EventFilters {
    eventName: string;
    venueName: string;
    marketingName: string;
    eventType: '' | 'Wedding' | 'Non Wedding';
    status: '' | 'Confirmed' | 'Tentative' | 'Cancelled';
    sumberData: string;
    eventDateStart: string;
    eventDateEnd: string;
}

interface EventFilterSectionProps {
    filters: EventFilters;
    onFilterChange: <K extends keyof EventFilters>(key: K, value: EventFilters[K]) => void;
    onReset: () => void;
    sumberDataOptions: string[];
    marketingOptions: MarketingPerson[];
}

const EventFilterSection: React.FC<EventFilterSectionProps> = ({ filters, onFilterChange, onReset, sumberDataOptions, marketingOptions }) => {
    const { venues: VENUES } = useVenues();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        onFilterChange(name as keyof EventFilters, value);
    };

    return (
        <div className="card p-6 mb-6 fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                {/* Cari Nama Event */}
                <div>
                    <label htmlFor="eventName" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Cari Nama Event</label>
                    <input
                        type="text"
                        id="eventName"
                        name="eventName"
                        value={filters.eventName}
                        onChange={handleInputChange}
                        placeholder="Masukkan nama event..."
                        className="w-full form-input py-2.5"
                    />
                </div>
                {/* Venue */}
                <div>
                    <label htmlFor="venueName" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Venue</label>
                    <select
                        id="venueName"
                        name="venueName"
                        value={filters.venueName}
                        onChange={handleInputChange}
                        className="w-full form-select py-2.5"
                    >
                        <option value="">Semua Venue</option>
                        {VENUES.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
                    </select>
                </div>
                {/* Marketing */}
                <div>
                    <label htmlFor="marketingName" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Marketing</label>
                    <select
                        id="marketingName"
                        name="marketingName"
                        value={filters.marketingName}
                        onChange={handleInputChange}
                        className="w-full form-select py-2.5"
                        disabled={!filters.venueName}
                    >
                        <option value="">Semua Marketing</option>
                        {marketingOptions.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                    </select>
                </div>
                 {/* Jenis Acara */}
                <div>
                    <label htmlFor="eventType" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Jenis Acara</label>
                    <select
                        id="eventType"
                        name="eventType"
                        value={filters.eventType}
                        onChange={handleInputChange}
                        className="w-full form-select py-2.5"
                    >
                        <option value="">Semua Jenis</option>
                        <option value="Wedding">Wedding</option>
                        <option value="Non Wedding">Non Wedding</option>
                    </select>
                </div>
                {/* Status Event */}
                <div>
                    <label htmlFor="status" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Status Event</label>
                    <select
                        id="status"
                        name="status"
                        value={filters.status}
                        onChange={handleInputChange}
                        className="w-full form-select py-2.5"
                    >
                        <option value="">Semua Status</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Tentative">Tentative</option>
                        <option value="Cancelled">Cancelled</option>
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
                    <label htmlFor="eventDateStart" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Tgl Acara (Dari)</label>
                    <input
                        type="date"
                        id="eventDateStart"
                        name="eventDateStart"
                        value={filters.eventDateStart}
                        onChange={handleInputChange}
                        className="w-full form-input py-2.5"
                    />
                </div>
                {/* Tanggal Acara End */}
                <div>
                    <label htmlFor="eventDateEnd" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Tgl Acara (Sampai)</label>
                    <input
                        type="date"
                        id="eventDateEnd"
                        name="eventDateEnd"
                        value={filters.eventDateEnd}
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

export default EventFilterSection;
