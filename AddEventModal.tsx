import React, { useState, useEffect } from 'react';
import { DealingEntry, MarketingPerson, BookingStatus, EventTime, UserRole } from './types';
import { CloseIcon } from './Icons';
import { useVenues } from './VenueContext';
import { supabase } from './supabaseClient';
import { dateUtils } from './dateUtils';

interface AddEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (deal: Omit<DealingEntry, 'id'>) => void;
    selectedDate?: string | null;
    venueName?: string;
    userRole?: UserRole;
}

const AddEventModal: React.FC<AddEventModalProps> = ({ isOpen, onClose, onSave, selectedDate, venueName: preselectedVenue, userRole }) => {
    const { venues: VENUES } = useVenues();
    const [namaClient, setNamaClient] = useState('');
    const [namaVenue, setNamaVenue] = useState(preselectedVenue || VENUES[0]?.name || '');
    const [namaMarketing, setNamaMarketing] = useState('');
    const [namaPax, setNamaPax] = useState('');
    const [totalPax, setTotalPax] = useState<number | ''>('');
    const [tanggalAcara, setTanggalAcara] = useState('');
    const [jenisBooking, setJenisBooking] = useState<Extract<BookingStatus, 'Soft Booking' | 'Booking' | 'Waiting List'>>('Soft Booking');
    const [waktuAcara, setWaktuAcara] = useState<EventTime>('Malam');
    const [marketingOptions, setMarketingOptions] = useState<MarketingPerson[]>([]);
    const [isCrossDealing, setIsCrossDealing] = useState(false);
    const [crossDealingMarketingName, setCrossDealingMarketingName] = useState('');
    const [crossDealingVenueAsal, setCrossDealingVenueAsal] = useState('');
    const [crossDealingMarketingOptions, setCrossDealingMarketingOptions] = useState<MarketingPerson[]>([]);
    // Vendor fields
    const [vendorCatering, setVendorCatering] = useState('');
    const [vendorCateringNote, setVendorCateringNote] = useState('');
    const [vendorDekorasi, setVendorDekorasi] = useState('');
    const [vendorDekorasiNote, setVendorDekorasiNote] = useState('');
    const [vendorRiasBusana, setVendorRiasBusana] = useState('');
    const [vendorRiasBusanaNote, setVendorRiasBusanaNote] = useState('');
    const [vendorMUA, setVendorMUA] = useState('');
    const [vendorMUANote, setVendorMUANote] = useState('');
    const [vendorPhotoVideo, setVendorPhotoVideo] = useState('');
    const [vendorPhotoVideoNote, setVendorPhotoVideoNote] = useState('');
    const [vendorEntertainment, setVendorEntertainment] = useState('');
    const [vendorEntertainmentNote, setVendorEntertainmentNote] = useState('');
    const [vendorMC, setVendorMC] = useState('');
    const [vendorMCNote, setVendorMCNote] = useState('');
    const [vendorPhotobooth, setVendorPhotobooth] = useState('');
    const [vendorPhotoboothNote, setVendorPhotoboothNote] = useState('');
    const [vendorProsesiAdat, setVendorProsesiAdat] = useState('');
    const [vendorProsesiAdatNote, setVendorProsesiAdatNote] = useState('');
    const [vendorLiveStreaming, setVendorLiveStreaming] = useState('');
    const [vendorLiveStreamingNote, setVendorLiveStreamingNote] = useState('');
    const [vendorFoodstallMillenial, setVendorFoodstallMillenial] = useState('');
    const [vendorFoodstallMillenialNote, setVendorFoodstallMillenialNote] = useState('');
    const [noteLainnya, setNoteLainnya] = useState('');
    const [idBitrix24, setIdBitrix24] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (preselectedVenue) {
                setNamaVenue(preselectedVenue);
            }
            if (selectedDate) {
                setTanggalAcara(selectedDate);
            } else {
                setTanggalAcara('');
            }
        }
    }, [selectedDate, isOpen, preselectedVenue]);


    useEffect(() => {
        if (!isOpen) return;
        const fetchMarketingOptions = async () => {
            if (!namaVenue) {
                setMarketingOptions([]);
                setNamaMarketing('');
                return;
            }
            const { data, error } = await supabase
                .from('marketing_staff')
                .select('name')
                .eq('venueName', namaVenue)
                .order('name');
            
            if (error) {
                console.error("Error fetching marketing options:", error.message);
                alert(`Gagal memuat data marketing: ${error.message}`);
                setMarketingOptions([]);
            } else {
                const options = data as MarketingPerson[];
                // Add "Cross Dealing" option at the beginning
                const crossDealingOption = { name: 'Cross Dealing' } as MarketingPerson;
                setMarketingOptions([crossDealingOption, ...options]);
                if (options.length > 0) {
                    setNamaMarketing(options[0].name);
                } else {
                    setNamaMarketing('Cross Dealing');
                }
            }
        };
        fetchMarketingOptions();
    }, [namaVenue, isOpen]);
    
    useEffect(() => {
        if (!isOpen || !isCrossDealing || !crossDealingVenueAsal) {
            setCrossDealingMarketingOptions([]);
            return;
        }
        const fetchCrossDealingMarketingOptions = async () => {
            const { data, error } = await supabase
                .from('marketing_staff')
                .select('name')
                .eq('venueName', crossDealingVenueAsal)
                .order('name');
            
            if (error) {
                console.error("Error fetching cross dealing marketing options:", error.message);
                alert(`Gagal memuat data marketing venue asal: ${error.message}`);
                setCrossDealingMarketingOptions([]);
            } else {
                const options = data as MarketingPerson[];
                setCrossDealingMarketingOptions(options);
                if (options.length > 0 && !crossDealingMarketingName) {
                    setCrossDealingMarketingName(options[0].name);
                } else if (options.length === 0) {
                    setCrossDealingMarketingName('');
                }
            }
        };
        fetchCrossDealingMarketingOptions();
    }, [crossDealingVenueAsal, isOpen, isCrossDealing]);
    
    const handleMarketingChange = (value: string) => {
        setNamaMarketing(value);
        setIsCrossDealing(value === 'Cross Dealing');
        if (value !== 'Cross Dealing') {
            setCrossDealingMarketingName('');
            setCrossDealingVenueAsal('');
            setCrossDealingMarketingOptions([]);
        }
    };
    
    const handleVenueAsalChange = (value: string) => {
        setCrossDealingVenueAsal(value);
        // Reset marketing name when venue changes
        setCrossDealingMarketingName('');
    };
    
    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!namaClient || !namaVenue || !namaPax || totalPax === '' || !tanggalAcara) {
            alert('Harap isi semua field yang wajib diisi.');
            return;
        }
        // Prevent users with role 'User' from adding a second Booking for the same venue/date/time
        if (userRole === 'User') {
            try {
                const { data: existing, error: checkError } = await supabase
                    .from('deals')
                    .select('id')
                    .eq('namaVenue', namaVenue)
                    .eq('tanggalAcara', tanggalAcara)
                    .eq('waktuAcara', waktuAcara)
                    .eq('jenisBooking', 'Booking')
                    .limit(1);
                if (checkError) {
                    console.error('Error checking existing booking:', checkError.message);
                } else if (existing && existing.length > 0) {
                    alert('Tanggal Tersebut Sudah Dibooking');
                    return;
                }
            } catch (err) {
                console.error('Unexpected error checking booking conflict:', err);
            }
        }

        // Validate cross dealing fields
        if (isCrossDealing) {
            if (!crossDealingMarketingName.trim() || !crossDealingVenueAsal.trim()) {
                alert('Untuk Cross Dealing, harap isi Nama Marketing dan Venue Asal.');
                return;
            }
        } else if (!namaMarketing || namaMarketing === 'Cross Dealing') {
            alert('Harap pilih nama marketing yang valid.');
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        if (tanggalAcara < today) {
            alert('Tanggal acara tidak boleh di masa lalu.');
            return;
        }

        const finalMarketingName = isCrossDealing ? `${crossDealingMarketingName} (Cross Dealing - ${crossDealingVenueAsal})` : namaMarketing;

        const newDeal: Omit<DealingEntry, 'id'> = {
            namaClient,
            namaVenue,
            namaMarketing: finalMarketingName,
            namaPax,
            totalPax: Number(totalPax),
            jenisAcara: 'Non Wedding', // Default value
            id_bitrix24: idBitrix24 || undefined,
            tanggalBooking: new Date().toISOString().split('T')[0], // Default value
            tanggalAcara,
            waktuAcara,
            // vendor fields
            vendorCatering: vendorCatering || undefined,
            vendorCateringNote: vendorCateringNote || undefined,
            vendorDekorasi: vendorDekorasi || undefined,
            vendorDekorasiNote: vendorDekorasiNote || undefined,
            vendorRiasBusana: vendorRiasBusana || undefined,
            vendorRiasBusanaNote: vendorRiasBusanaNote || undefined,
            vendorMUA: vendorMUA || undefined,
            vendorMUANote: vendorMUANote || undefined,
            vendorPhotoVideo: vendorPhotoVideo || undefined,
            vendorPhotoVideoNote: vendorPhotoVideoNote || undefined,
            vendorEntertainment: vendorEntertainment || undefined,
            vendorEntertainmentNote: vendorEntertainmentNote || undefined,
            vendorMC: vendorMC || undefined,
            vendorMCNote: vendorMCNote || undefined,
            vendorPhotobooth: vendorPhotobooth || undefined,
            vendorPhotoboothNote: vendorPhotoboothNote || undefined,
            vendorProsesiAdat: vendorProsesiAdat || undefined,
            vendorProsesiAdatNote: vendorProsesiAdatNote || undefined,
            vendorLiveStreaming: vendorLiveStreaming || undefined,
            vendorLiveStreamingNote: vendorLiveStreamingNote || undefined,
            vendorFoodstallMillenial: vendorFoodstallMillenial || undefined,
            vendorFoodstallMillenialNote: vendorFoodstallMillenialNote || undefined,
            noteLainnya: noteLainnya || undefined,
            sumberData: '', // Default value
            jenisBooking,
            tanggalPelunasan: '', // Default value
        };
        
        onSave(newDeal);
    };
    
    const handleClose = () => {
        setNamaClient('');
        setIdBitrix24('');
        setNamaVenue(VENUES[0]?.name || '');
        setNamaMarketing('');
        setNamaPax('');
        setTotalPax('');
        setTanggalAcara('');
        setJenisBooking('Soft Booking');
        setWaktuAcara('Malam');
        setIsCrossDealing(false);
        setCrossDealingMarketingName('');
        setCrossDealingVenueAsal('');
        setCrossDealingMarketingOptions([]);
        onClose();
    };

    const formatDateForDisplay = (dateString: string) => {
        const date = dateUtils.parseLocalDate(dateString);
        return dateUtils.formatForDisplay(date);
    };
    
    const formattedDate = selectedDate ? formatDateForDisplay(selectedDate) : null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 fade-in">
            <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl max-w-2xl w-full p-6 sm:p-8 relative border border-[var(--color-border)] max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-start mb-6 flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
                            {selectedDate ? 'Tambah Event' : 'Tambah Event Baru'}
                        </h2>
                        <p className="text-md text-[var(--color-text-secondary)]">
                            {formattedDate ? `Untuk tanggal: ${formattedDate}` : 'Masukkan detail event/deal yang baru.'}
                        </p>
                    </div>
                    <button onClick={handleClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] p-2 rounded-full hover:bg-white/10 transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                
                                <form onSubmit={handleSubmit} className="overflow-y-auto pr-2 -mr-4 flex-grow">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                        <div className="md:col-span-2">
                            <label htmlFor="namaClient" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Nama Client / Event</label>
                            <input id="namaClient" type="text" value={namaClient} onChange={e => setNamaClient(e.target.value)} className="w-full form-input px-4 py-2.5" required />
                        </div>
                        <div>
                            <label htmlFor="idBitrix24" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">ID Bitrix24</label>
                            <input id="idBitrix24" type="text" value={idBitrix24} onChange={e => setIdBitrix24(e.target.value)} className="w-full form-input px-4 py-2.5" placeholder="Optional" />
                        </div>
                         <div>
                            <label htmlFor="namaVenue" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Nama Venue</label>
                            <select id="namaVenue" value={namaVenue} onChange={e => setNamaVenue(e.target.value)} className="w-full form-select px-4 py-2.5" required disabled={!!preselectedVenue}>
                                {VENUES.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="namaMarketing" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Nama Marketing</label>
                            <input
                                id="namaMarketing"
                                name="namaMarketing"
                                list="marketing-list"
                                value={namaMarketing}
                                onChange={e => handleMarketingChange(e.target.value)}
                                className="w-full form-input px-4 py-2.5"
                                required
                            />
                            <datalist id="marketing-list">
                                {marketingOptions.map(m => <option key={m.name} value={m.name} />)}
                            </datalist>
                            <p className="text-xs text-[var(--color-text-secondary)] mt-1">Ketikan nama marketing jika tidak tersedia di daftar.</p>
                        </div>
                        
                        {isCrossDealing && (
                            <>
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                                    <div>
                                        <label htmlFor="crossDealingMarketingName" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Nama Marketing Asli</label>
                                        <select 
                                            id="crossDealingMarketingName" 
                                            value={crossDealingMarketingName} 
                                            onChange={e => setCrossDealingMarketingName(e.target.value)} 
                                            className="w-full form-select px-4 py-2.5" 
                                            required
                                            disabled={crossDealingMarketingOptions.length === 0}
                                        >
                                            <option value="">Pilih nama marketing</option>
                                            {crossDealingMarketingOptions.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="crossDealingVenueAsal" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Venue Asal</label>
                                        <select 
                                            id="crossDealingVenueAsal" 
                                            value={crossDealingVenueAsal} 
                                            onChange={e => handleVenueAsalChange(e.target.value)} 
                                            className="w-full form-select px-4 py-2.5" 
                                            required
                                        >
                                            <option value="">Pilih venue asal</option>
                                            {VENUES.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </>
                        )}
                        
                         <div>
                            <label htmlFor="namaPax" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Nama Package</label>
                            <input id="namaPax" type="text" value={namaPax} onChange={e => setNamaPax(e.target.value)} className="w-full form-input px-4 py-2.5" required />
                        </div>
                         <div>
                            <label htmlFor="totalPax" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Total Pax</label>
                            <input id="totalPax" type="number" value={totalPax} onChange={e => setTotalPax(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full form-input px-4 py-2.5" required />
                        </div>
                        <div>
                            <label htmlFor="tanggalAcara" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Tanggal Acara</label>
                            <input id="tanggalAcara" type="date" value={tanggalAcara} onChange={e => setTanggalAcara(e.target.value)} className="w-full form-select px-4 py-2.5" required />
                        </div>
                        <div>
                            <label htmlFor="waktuAcara" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Waktu Acara</label>
                            <select id="waktuAcara" value={waktuAcara} onChange={e => setWaktuAcara(e.target.value as EventTime)} className="w-full form-select px-4 py-2.5" required>
                                <option value="Malam">Malam</option>
                                <option value="Pagi">Pagi</option>
                                <option value="Full Day">Full Day</option>
                            </select>
                        </div>
                        {/* Vendors */}
                        <div className="md:col-span-2">
                            <h4 className="font-semibold text-[var(--color-text-primary)] mb-2">Vendors</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Vendor Catering</label>
                                    <input value={vendorCatering} onChange={e => setVendorCatering(e.target.value)} className="w-full form-input px-4 py-2.5" />
                                    <input placeholder="Note" value={vendorCateringNote} onChange={e => setVendorCateringNote(e.target.value)} className="w-full form-input px-3 py-2 mt-2 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Vendor Dekorasi</label>
                                    <input value={vendorDekorasi} onChange={e => setVendorDekorasi(e.target.value)} className="w-full form-input px-4 py-2.5" />
                                    <input placeholder="Note" value={vendorDekorasiNote} onChange={e => setVendorDekorasiNote(e.target.value)} className="w-full form-input px-3 py-2 mt-2 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Vendor Rias & Busana</label>
                                    <input value={vendorRiasBusana} onChange={e => setVendorRiasBusana(e.target.value)} className="w-full form-input px-4 py-2.5" />
                                    <input placeholder="Note" value={vendorRiasBusanaNote} onChange={e => setVendorRiasBusanaNote(e.target.value)} className="w-full form-input px-3 py-2 mt-2 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Vendor MUA</label>
                                    <input value={vendorMUA} onChange={e => setVendorMUA(e.target.value)} className="w-full form-input px-4 py-2.5" />
                                    <input placeholder="Note" value={vendorMUANote} onChange={e => setVendorMUANote(e.target.value)} className="w-full form-input px-3 py-2 mt-2 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Vendor Photo & Video</label>
                                    <input value={vendorPhotoVideo} onChange={e => setVendorPhotoVideo(e.target.value)} className="w-full form-input px-4 py-2.5" />
                                    <input placeholder="Note" value={vendorPhotoVideoNote} onChange={e => setVendorPhotoVideoNote(e.target.value)} className="w-full form-input px-3 py-2 mt-2 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Vendor Entertainment</label>
                                    <input value={vendorEntertainment} onChange={e => setVendorEntertainment(e.target.value)} className="w-full form-input px-4 py-2.5" />
                                    <input placeholder="Note" value={vendorEntertainmentNote} onChange={e => setVendorEntertainmentNote(e.target.value)} className="w-full form-input px-3 py-2 mt-2 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Vendor MC</label>
                                    <input value={vendorMC} onChange={e => setVendorMC(e.target.value)} className="w-full form-input px-4 py-2.5" />
                                    <input placeholder="Note" value={vendorMCNote} onChange={e => setVendorMCNote(e.target.value)} className="w-full form-input px-3 py-2 mt-2 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Vendor Photobooth</label>
                                    <input value={vendorPhotobooth} onChange={e => setVendorPhotobooth(e.target.value)} className="w-full form-input px-4 py-2.5" />
                                    <input placeholder="Note" value={vendorPhotoboothNote} onChange={e => setVendorPhotoboothNote(e.target.value)} className="w-full form-input px-3 py-2 mt-2 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Vendor Prosesi Adat</label>
                                    <input value={vendorProsesiAdat} onChange={e => setVendorProsesiAdat(e.target.value)} className="w-full form-input px-4 py-2.5" />
                                    <input placeholder="Note" value={vendorProsesiAdatNote} onChange={e => setVendorProsesiAdatNote(e.target.value)} className="w-full form-input px-3 py-2 mt-2 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Vendor Live Streaming</label>
                                    <input value={vendorLiveStreaming} onChange={e => setVendorLiveStreaming(e.target.value)} className="w-full form-input px-4 py-2.5" />
                                    <input placeholder="Note" value={vendorLiveStreamingNote} onChange={e => setVendorLiveStreamingNote(e.target.value)} className="w-full form-input px-3 py-2 mt-2 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Vendor Foodstall Millenial</label>
                                    <input value={vendorFoodstallMillenial} onChange={e => setVendorFoodstallMillenial(e.target.value)} className="w-full form-input px-4 py-2.5" />
                                    <input placeholder="Note" value={vendorFoodstallMillenialNote} onChange={e => setVendorFoodstallMillenialNote(e.target.value)} className="w-full form-input px-3 py-2 mt-2 text-sm" />
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Status Booking</label>
                             <select name="jenisBooking" value={jenisBooking} onChange={(e) => setJenisBooking(e.target.value as any)} className="w-full form-select px-4 py-2.5">
                                <option value="Soft Booking">Soft Booking</option>
                                <option value="Booking">Booking</option>
                                <option value="Waiting List">Waiting List</option>
                            </select>
                        </div>

                        {/* Note Lainnya */}
                        <div className="md:col-span-2">
                            <label htmlFor="noteLainnya" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Note Lainnya / Catatan Tambahan</label>
                            <textarea id="noteLainnya" value={noteLainnya} onChange={e => setNoteLainnya(e.target.value)} rows={3} className="w-full form-input px-4 py-2.5" placeholder="Tambahkan catatan tambahan, kebutuhan khusus, atau informasi lain yang relevan..." />
                        </div>
                    </div>
                     <div className="flex space-x-4 mt-8 pt-6 border-t border-[var(--color-border)] flex-shrink-0">
                        <button type="button" onClick={handleClose} className="flex-1 px-4 py-2.5 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-xl hover:bg-white/5 font-semibold transition-colors">
                            Batal
                        </button>
                        <button type="submit" className="flex-1 px-4 py-2.5 btn-primary">
                            Simpan Event
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddEventModal;
