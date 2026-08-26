import React, { useState, useEffect, useCallback } from 'react';
import { CalendarEventEntry, DealingEntry, EventStatus, MarketingPerson, UserRole, WeddingType, BookingStatus } from './types';
import { CloseIcon, TrashIcon } from './Icons';
import { supabase } from './supabaseClient';
import { useVenues } from './VenueContext';
import { dateUtils } from './dateUtils';

interface EventDetailModalProps {
    event: CalendarEventEntry;
    onClose: () => void;
    onUpdate: (updatedEvent: CalendarEventEntry) => void;
    onDelete: (eventId: number) => void;
    userRole: UserRole;
}

const EventDetailModal: React.FC<EventDetailModalProps> = ({ event, onClose, onUpdate, onDelete, userRole }) => {
    const { venues: VENUES } = useVenues();
    const [formData, setFormData] = useState<Omit<DealingEntry, 'id' | 'totalPax'> & { totalPax: number | ''; waktuAcara?: string } >({
        namaClient: event.eventName,
        namaVenue: event.venueName,
        venueLokasi: (event as any).venueLokasi || '',
        namaMarketing: event.marketingName,
        namaPax: event.notes?.split(',')[0].replace('Pax: ', '') || '',
        totalPax: event.paxCount,
        jenisAcara: event.eventType,
        weddingType: event.weddingType,
        tanggalBooking: event.bookingDate,
        tanggalAcara: event.eventDate,
        waktuAcara: (event as any).waktuAcara || 'Malam',
        sumberData: event.sumberData,
        jenisBooking: event.jenisBooking,
        tanggalPelunasan: event.notes?.split(', ')[1].replace('Pelunasan: ', '') || '',
    });
    const [marketingOptions, setMarketingOptions] = useState<MarketingPerson[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const isReadOnly = userRole === 'Direktor' || userRole === 'User';

    const formattedDate = (() => {
        const dateStr = formData.tanggalAcara || event.eventDate;
        try {
            const date = dateUtils.parseLocalDate(dateStr);
            return dateUtils.formatForDisplay(date);
        } catch (e) {
            return dateStr;
        }
    })();
    const fetchMarketingOptions = useCallback(async (venueName: string) => {
        const { data, error } = await supabase.from('marketing_staff').select('name').eq('venueName', venueName);
        if (error) {
            console.error("Error fetching marketing options:", error.message);
            setMarketingOptions([]);
        } else {
            setMarketingOptions((data as MarketingPerson[]) || []);
        }
    }, []);

    useEffect(() => {
        fetchMarketingOptions(formData.namaVenue);
    }, [formData.namaVenue, fetchMarketingOptions]);

    // Fetch the full deal record to get vendor notes and additional fields (noteLainnya, vendor notes, etc.)
    useEffect(() => {
        const fetchFullDeal = async () => {
            try {
                const { data, error } = await supabase.from('deals').select('*').eq('id', event.id).single();
                if (error) {
                    // Not fatal: keep using event-derived formData
                    console.warn('Could not fetch full deal record:', error.message);
                    return;
                }
                const deal = data as DealingEntry;
                setFormData(prev => ({
                    ...prev,
                    // map fields from deal into formData; keep existing defaults
                    namaClient: deal.namaClient || prev.namaClient,
                    namaVenue: deal.namaVenue || prev.namaVenue,
                    venueLokasi: (deal as any).venueLokasi || (prev as any).venueLokasi || '',
                    namaMarketing: deal.namaMarketing || prev.namaMarketing,
                    namaPax: deal.namaPax || prev.namaPax,
                    totalPax: deal.totalPax ?? prev.totalPax,
                    jenisAcara: deal.jenisAcara || prev.jenisAcara,
                    weddingType: deal.weddingType || prev.weddingType,
                    tanggalBooking: deal.tanggalBooking || prev.tanggalBooking,
                    tanggalAcara: deal.tanggalAcara || prev.tanggalAcara,
                    waktuAcara: deal.waktuAcara || prev.waktuAcara,
                    sumberData: deal.sumberData || prev.sumberData,
                    jenisBooking: deal.jenisBooking || prev.jenisBooking,
                    tanggalPelunasan: deal.tanggalPelunasan || prev.tanggalPelunasan,
                    // vendor fields
                    vendorCatering: (deal as any).vendorCatering || (prev as any).vendorCatering || '',
                    vendorCateringNote: (deal as any).vendorCateringNote || (prev as any).vendorCateringNote || '',
                    vendorDekorasi: (deal as any).vendorDekorasi || (prev as any).vendorDekorasi || '',
                    vendorDekorasiNote: (deal as any).vendorDekorasiNote || (prev as any).vendorDekorasiNote || '',
                    vendorRiasBusana: (deal as any).vendorRiasBusana || (prev as any).vendorRiasBusana || '',
                    vendorRiasBusanaNote: (deal as any).vendorRiasBusanaNote || (prev as any).vendorRiasBusanaNote || '',
                    vendorMUA: (deal as any).vendorMUA || (prev as any).vendorMUA || '',
                    vendorMUANote: (deal as any).vendorMUANote || (prev as any).vendorMUANote || '',
                    vendorPhotoVideo: (deal as any).vendorPhotoVideo || (prev as any).vendorPhotoVideo || '',
                    vendorPhotoVideoNote: (deal as any).vendorPhotoVideoNote || (prev as any).vendorPhotoVideoNote || '',
                    vendorEntertainment: (deal as any).vendorEntertainment || (prev as any).vendorEntertainment || '',
                    vendorEntertainmentNote: (deal as any).vendorEntertainmentNote || (prev as any).vendorEntertainmentNote || '',
                    vendorMC: (deal as any).vendorMC || (prev as any).vendorMC || '',
                    vendorMCNote: (deal as any).vendorMCNote || (prev as any).vendorMCNote || '',
                    vendorPhotobooth: (deal as any).vendorPhotobooth || (prev as any).vendorPhotobooth || '',
                    vendorPhotoboothNote: (deal as any).vendorPhotoboothNote || (prev as any).vendorPhotoboothNote || '',
                    vendorProsesiAdat: (deal as any).vendorProsesiAdat || (prev as any).vendorProsesiAdat || '',
                    vendorProsesiAdatNote: (deal as any).vendorProsesiAdatNote || (prev as any).vendorProsesiAdatNote || '',
                    vendorLiveStreaming: (deal as any).vendorLiveStreaming || (prev as any).vendorLiveStreaming || '',
                    vendorLiveStreamingNote: (deal as any).vendorLiveStreamingNote || (prev as any).vendorLiveStreamingNote || '',
                    vendorFoodstallMillenial: (deal as any).vendorFoodstallMillenial || (prev as any).vendorFoodstallMillenial || '',
                    vendorFoodstallMillenialNote: (deal as any).vendorFoodstallMillenialNote || (prev as any).vendorFoodstallMillenialNote || '',
                    noteLainnya: (deal as any).noteLainnya || (prev as any).noteLainnya || '',
                } as any));
            } catch (err) {
                console.error('Unexpected error fetching deal:', err);
            }
        };
        fetchFullDeal();
    }, [event.id]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'totalPax') {
            setFormData(prev => ({ ...prev, [name]: value === '' ? '' : parseInt(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };
    
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
    
    const handleSave = async () => {
        if (!formData.namaClient || !formData.namaVenue || !formData.namaMarketing || !formData.namaPax || formData.totalPax === '') {
            alert('Harap isi semua field yang wajib diisi.');
            return;
        }

        setIsSaving(true);
        const dealToUpdate: Omit<DealingEntry, 'id'> = {
            ...formData,
            totalPax: Number(formData.totalPax),
            // include waktuAcara if present in formData
            ...(formData.waktuAcara ? { waktuAcara: formData.waktuAcara } : {}),
        } as any;
        
        const { error } = await supabase.from('deals').update(dealToUpdate).eq('id', event.id);

        if (error) {
            console.error('Error updating event:', error.message);
            alert('Gagal menyimpan perubahan.');
        } else {
            const updatedEventEntry: CalendarEventEntry = {
                ...event,
                eventName: dealToUpdate.namaClient,
                venueName: dealToUpdate.namaVenue,
                venueLokasi: (dealToUpdate as any).venueLokasi || undefined,
                marketingName: dealToUpdate.namaMarketing,
                paxCount: dealToUpdate.totalPax,
                eventType: dealToUpdate.jenisAcara,
                weddingType: dealToUpdate.weddingType,
                bookingDate: dealToUpdate.tanggalBooking,
                eventDate: dealToUpdate.tanggalAcara,
                // keep waktuAcara in event object if available
                ...(dealToUpdate as any).waktuAcara ? { /* noop - extra field kept in DB */ } : {},
                sumberData: dealToUpdate.sumberData,
                status: mapBookingStatusToEventStatus(dealToUpdate.jenisBooking),
                jenisBooking: dealToUpdate.jenisBooking,
                notes: `Pax: ${dealToUpdate.namaPax}, Pelunasan: ${dealToUpdate.tanggalPelunasan || 'N/A'}`
            };
            onUpdate(updatedEventEntry);
        }
        setIsSaving(false);
    };

    const handleDelete = async () => {
        if (window.confirm(`Apakah Anda yakin ingin menghapus event "${event.eventName}"?`)) {
            const { error } = await supabase.from('deals').delete().eq('id', event.id);
            if (error) {
                alert(`Gagal menghapus event: ${error.message}`);
            } else {
                onDelete(event.id);
            }
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 fade-in">
            <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl max-w-2xl w-full p-6 sm:p-8 relative border border-[var(--color-border)] max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-start mb-6 flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Edit Event</h2>
                        <p className="text-md text-[var(--color-text-secondary)]">{formattedDate ? `Untuk tanggal: ${formattedDate}` : event.eventName}</p>
                    </div>
                    <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="overflow-y-auto pr-2 -mr-4 flex-grow">
                     <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                        <div className="md:col-span-2">
                            <label htmlFor="namaClient" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Nama Client / Event</label>
                            <input id="namaClient" name="namaClient" type="text" value={formData.namaClient} onChange={handleInputChange} className="w-full form-input px-4 py-2.5" required readOnly={isReadOnly} />
                        </div>
                         <div>
                            <label htmlFor="namaVenue" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Nama Venue</label>
                            <select id="namaVenue" name="namaVenue" value={formData.namaVenue} onChange={handleInputChange} className="w-full form-select px-4 py-2.5" required disabled={isReadOnly}>
                                {VENUES.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="venueLokasi" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Lokasi Venue</label>
                            <input id="venueLokasi" name="venueLokasi" type="text" placeholder="Misalnya: Ballroom A, Outdoor Garden, dll" value={(formData as any).venueLokasi || ''} onChange={handleInputChange} className="w-full form-input px-4 py-2.5" readOnly={isReadOnly} />
                        </div>
                        <div>
                            <label htmlFor="namaMarketing" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Nama Marketing</label>
                            <select id="namaMarketing" name="namaMarketing" value={formData.namaMarketing} onChange={handleInputChange} className="w-full form-select px-4 py-2.5" required disabled={isReadOnly}>
                                {marketingOptions.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                                {!marketingOptions.some(m => m.name === formData.namaMarketing) && formData.namaMarketing && (
                                    <option value={formData.namaMarketing}>{formData.namaMarketing}</option>
                                )}
                            </select>
                        </div>
                         <div>
                            <label htmlFor="namaPax" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Nama Package</label>
                            <input id="namaPax" name="namaPax" type="text" value={formData.namaPax} onChange={handleInputChange} className="w-full form-input px-4 py-2.5" required readOnly={isReadOnly} />
                        </div>
                         <div>
                            <label htmlFor="totalPax" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Total Pax</label>
                            <input id="totalPax" name="totalPax" type="number" value={formData.totalPax} onChange={handleInputChange} className="w-full form-input px-4 py-2.5" required readOnly={isReadOnly} />
                        </div>
                        <div className="md:col-span-1">
                            <label htmlFor="tanggalAcara" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Tanggal Acara</label>
                            <input id="tanggalAcara" name="tanggalAcara" type="date" value={formData.tanggalAcara} onChange={handleInputChange} className="w-full form-select px-4 py-2.5" required readOnly={isReadOnly} />
                        </div>
                        <div>
                            <label htmlFor="waktuAcara" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Waktu Acara</label>
                            <select id="waktuAcara" name="waktuAcara" value={formData.waktuAcara} onChange={handleInputChange} className="w-full form-select px-4 py-2.5" required disabled={isReadOnly}>
                                <option value="Malam">Malam</option>
                                <option value="Pagi">Pagi</option>
                                <option value="Full Day">Full Day</option>
                            </select>
                        </div>
                        {/* Vendors section */}
                        <div className="md:col-span-2">
                            <h4 className="font-semibold text-[var(--color-text-primary)] mb-2">Vendors</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Vendor Catering</label>
                                    <input name="vendorCatering" value={(formData as any).vendorCatering || ''} onChange={handleInputChange} className="w-full form-input px-4 py-2.5" readOnly={isReadOnly} />
                                    <input name="vendorCateringNote" placeholder="Note" value={(formData as any).vendorCateringNote || ''} onChange={handleInputChange} className="w-full form-input px-3 py-2 mt-2 text-sm" readOnly={isReadOnly} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Vendor Dekorasi</label>
                                    <input name="vendorDekorasi" value={(formData as any).vendorDekorasi || ''} onChange={handleInputChange} className="w-full form-input px-4 py-2.5" readOnly={isReadOnly} />
                                    <input name="vendorDekorasiNote" placeholder="Note" value={(formData as any).vendorDekorasiNote || ''} onChange={handleInputChange} className="w-full form-input px-3 py-2 mt-2 text-sm" readOnly={isReadOnly} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Vendor Rias & Busana</label>
                                    <input name="vendorRiasBusana" value={(formData as any).vendorRiasBusana || ''} onChange={handleInputChange} className="w-full form-input px-4 py-2.5" readOnly={isReadOnly} />
                                    <input name="vendorRiasBusanaNote" placeholder="Note" value={(formData as any).vendorRiasBusanaNote || ''} onChange={handleInputChange} className="w-full form-input px-3 py-2 mt-2 text-sm" readOnly={isReadOnly} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Vendor MUA</label>
                                    <input name="vendorMUA" value={(formData as any).vendorMUA || ''} onChange={handleInputChange} className="w-full form-input px-4 py-2.5" readOnly={isReadOnly} />
                                    <input name="vendorMUANote" placeholder="Note" value={(formData as any).vendorMUANote || ''} onChange={handleInputChange} className="w-full form-input px-3 py-2 mt-2 text-sm" readOnly={isReadOnly} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Vendor Photo & Video</label>
                                    <input name="vendorPhotoVideo" value={(formData as any).vendorPhotoVideo || ''} onChange={handleInputChange} className="w-full form-input px-4 py-2.5" readOnly={isReadOnly} />
                                    <input name="vendorPhotoVideoNote" placeholder="Note" value={(formData as any).vendorPhotoVideoNote || ''} onChange={handleInputChange} className="w-full form-input px-3 py-2 mt-2 text-sm" readOnly={isReadOnly} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Vendor Entertainment</label>
                                    <input name="vendorEntertainment" value={(formData as any).vendorEntertainment || ''} onChange={handleInputChange} className="w-full form-input px-4 py-2.5" readOnly={isReadOnly} />
                                    <input name="vendorEntertainmentNote" placeholder="Note" value={(formData as any).vendorEntertainmentNote || ''} onChange={handleInputChange} className="w-full form-input px-3 py-2 mt-2 text-sm" readOnly={isReadOnly} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Vendor MC</label>
                                    <input name="vendorMC" value={(formData as any).vendorMC || ''} onChange={handleInputChange} className="w-full form-input px-4 py-2.5" readOnly={isReadOnly} />
                                    <input name="vendorMCNote" placeholder="Note" value={(formData as any).vendorMCNote || ''} onChange={handleInputChange} className="w-full form-input px-3 py-2 mt-2 text-sm" readOnly={isReadOnly} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Vendor Photobooth</label>
                                    <input name="vendorPhotobooth" value={(formData as any).vendorPhotobooth || ''} onChange={handleInputChange} className="w-full form-input px-4 py-2.5" readOnly={isReadOnly} />
                                    <input name="vendorPhotoboothNote" placeholder="Note" value={(formData as any).vendorPhotoboothNote || ''} onChange={handleInputChange} className="w-full form-input px-3 py-2 mt-2 text-sm" readOnly={isReadOnly} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Vendor Prosesi Adat</label>
                                    <input name="vendorProsesiAdat" value={(formData as any).vendorProsesiAdat || ''} onChange={handleInputChange} className="w-full form-input px-4 py-2.5" readOnly={isReadOnly} />
                                    <input name="vendorProsesiAdatNote" placeholder="Note" value={(formData as any).vendorProsesiAdatNote || ''} onChange={handleInputChange} className="w-full form-input px-3 py-2 mt-2 text-sm" readOnly={isReadOnly} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Vendor Live Streaming</label>
                                    <input name="vendorLiveStreaming" value={(formData as any).vendorLiveStreaming || ''} onChange={handleInputChange} className="w-full form-input px-4 py-2.5" readOnly={isReadOnly} />
                                    <input name="vendorLiveStreamingNote" placeholder="Note" value={(formData as any).vendorLiveStreamingNote || ''} onChange={handleInputChange} className="w-full form-input px-3 py-2 mt-2 text-sm" readOnly={isReadOnly} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Vendor Foodstall Millenial</label>
                                    <input name="vendorFoodstallMillenial" value={(formData as any).vendorFoodstallMillenial || ''} onChange={handleInputChange} className="w-full form-input px-4 py-2.5" readOnly={isReadOnly} />
                                    <input name="vendorFoodstallMillenialNote" placeholder="Note" value={(formData as any).vendorFoodstallMillenialNote || ''} onChange={handleInputChange} className="w-full form-input px-3 py-2 mt-2 text-sm" readOnly={isReadOnly} />
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="noteLainnya" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Note Lainnya / Catatan Tambahan</label>
                            <textarea id="noteLainnya" name="noteLainnya" value={(formData as any).noteLainnya || ''} onChange={handleInputChange} rows={3} className="w-full form-input px-4 py-2.5" readOnly={isReadOnly} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Status Booking</label>
                             <select name="jenisBooking" value={formData.jenisBooking} onChange={handleInputChange} className="w-full form-select px-4 py-2.5" disabled={isReadOnly}>
                                <option value="Soft Booking">Soft Booking</option>
                                <option value="Booking">Booking</option>
                                <option value="Waiting List">Waiting List</option>
                            </select>
                        </div>
                    </form>
                </div>
                
                <div className="mt-8 pt-6 border-t border-[var(--color-border)] flex justify-between items-center flex-shrink-0">
                    <div>
                        {!isReadOnly && (
                            <button onClick={handleDelete} className="flex items-center gap-2 text-sm font-semibold text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-colors">
                                <TrashIcon className="w-5 h-5" /> Hapus Event
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="px-6 py-2.5 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-xl hover:bg-gray-50 font-semibold transition-colors">
                            Tutup
                        </button>
                        {!isReadOnly && (
                            <button onClick={handleSave} disabled={isSaving} className="btn-primary py-2.5 px-6 disabled:opacity-50">
                                {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventDetailModal;
