import React, { useState, useEffect } from 'react';
import { DealingEntry, MarketingPerson, WeddingType } from './types';
import { CloseIcon } from './Icons';
import { useVenues } from './VenueContext';
import { supabase } from './supabaseClient';

interface AddDealModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (deal: Omit<DealingEntry, 'id'>) => void;
    assignedVenue?: string | null;
}

const AddDealModal: React.FC<AddDealModalProps> = ({ isOpen, onClose, onSave, assignedVenue }) => {
    const { venues: VENUES } = useVenues();
    const [namaClient, setNamaClient] = useState('');
    const [namaVenue, setNamaVenue] = useState(assignedVenue || VENUES[0]?.name || '');
    const [namaMarketing, setNamaMarketing] = useState('');
    const [namaPax, setNamaPax] = useState('');
    const [totalPax, setTotalPax] = useState<number | ''>('');
    const [jenisAcara, setJenisAcara] = useState<'Wedding' | 'Non Wedding'>('Wedding');
    const [weddingType, setWeddingType] = useState<WeddingType | ''>('');
    const [tanggalBooking, setTanggalBooking] = useState(new Date().toISOString().split('T')[0]);
    const [tanggalAcara, setTanggalAcara] = useState('');
    const [sumberData, setSumberData] = useState('');
    const [jenisBooking, setJenisBooking] = useState<'DP' | 'Lunas'>('DP');
    const [tanggalPelunasan, setTanggalPelunasan] = useState('');
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
    const [marketingOptions, setMarketingOptions] = useState<MarketingPerson[]>([]);


    useEffect(() => {
        if (jenisAcara === 'Non Wedding') {
            setWeddingType('');
        }
    }, [jenisAcara]);

    // Update venue when assignedVenue changes
    useEffect(() => {
        if (assignedVenue) {
            setNamaVenue(assignedVenue);
        }
    }, [assignedVenue]);

    useEffect(() => {
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
                setMarketingOptions(options);
                if (options.length > 0) {
                    setNamaMarketing(options[0].name);
                } else {
                    setNamaMarketing('');
                }
            }
        };
        fetchMarketingOptions();
    }, [namaVenue]);
    
    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!namaClient || !namaVenue || !namaMarketing || !namaPax || totalPax === '' || !tanggalAcara || (jenisAcara === 'Wedding' && !weddingType)) {
            alert('Harap isi semua field yang wajib diisi.');
            return;
        }
        
        const finalTanggalPelunasan = jenisBooking === 'Lunas'
            ? (tanggalPelunasan || new Date().toISOString().split('T')[0])
            : (tanggalPelunasan || 'Belum Lunas');

        const newDeal: Omit<DealingEntry, 'id'> = {
            namaClient,
            namaVenue,
            namaMarketing,
            namaPax,
            totalPax: Number(totalPax),
            jenisAcara,
            id_bitrix24: idBitrix24 || undefined,
            weddingType: jenisAcara === 'Wedding' ? weddingType as WeddingType : undefined,
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
            tanggalBooking,
            tanggalAcara,
            sumberData,
            jenisBooking,
            tanggalPelunasan: finalTanggalPelunasan,
        };
        
        onSave(newDeal);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 fade-in">
            <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl max-w-2xl w-full p-6 sm:p-8 relative border border-[var(--color-border)] max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-start mb-6 flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Tambah Deal Baru</h2>
                        <p className="text-md text-[var(--color-text-secondary)]">Masukkan detail deal yang baru.</p>
                    </div>
                    <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] p-2 rounded-full hover:bg-white/10 transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="overflow-y-auto pr-2 -mr-4 flex-grow">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                        <div>
                            <label htmlFor="namaClient" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Nama Client</label>
                            <input id="namaClient" type="text" value={namaClient} onChange={e => setNamaClient(e.target.value)} className="w-full form-input px-4 py-2.5" required />
                        </div>
                        <div>
                            <label htmlFor="idBitrix24" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">ID Bitrix24</label>
                            <input id="idBitrix24" type="text" value={idBitrix24} onChange={e => setIdBitrix24(e.target.value)} className="w-full form-input px-4 py-2.5" placeholder="Optional" />
                        </div>
                        <div>
                            <label htmlFor="namaPax" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Nama Package</label>
                            <input id="namaPax" type="text" value={namaPax} onChange={e => setNamaPax(e.target.value)} className="w-full form-input px-4 py-2.5" required />
                        </div>
                         <div>
                            <label htmlFor="namaVenue" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                                Nama Venue {assignedVenue && <span className="text-xs text-[var(--color-primary)]">(Auto-assigned)</span>}
                            </label>
                            <select 
                                id="namaVenue" 
                                value={namaVenue} 
                                onChange={e => setNamaVenue(e.target.value)} 
                                className="w-full form-select px-4 py-2.5" 
                                required
                                disabled={!!assignedVenue}
                            >
                                {VENUES.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
                            </select>
                            {assignedVenue && (
                                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                                    Venue telah ditentukan secara otomatis berdasarkan assignment Anda.
                                </p>
                            )}
                        </div>
                        <div>
                            <label htmlFor="namaMarketing" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Nama Marketing</label>
                            <input
                                id="namaMarketing"
                                name="namaMarketing"
                                list="marketing-list"
                                value={namaMarketing}
                                onChange={e => setNamaMarketing(e.target.value)}
                                className="w-full form-input px-4 py-2.5"
                                required
                            />
                            <datalist id="marketing-list">
                                {marketingOptions.map(m => <option key={m.name} value={m.name} />)}
                            </datalist>
                            <p className="text-xs text-[var(--color-text-secondary)] mt-1">Ketikan nama marketing jika tidak tersedia di daftar.</p>
                        </div>
                         <div>
                            <label htmlFor="totalPax" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Total Pax</label>
                            <input id="totalPax" type="number" value={totalPax} onChange={e => setTotalPax(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full form-input px-4 py-2.5" required />
                        </div>
                         <div>
                            <label htmlFor="sumberData" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Sumber Data</label>
                            <input id="sumberData" type="text" value={sumberData} onChange={e => setSumberData(e.target.value)} className="w-full form-input px-4 py-2.5" />
                        </div>
                        <div>
                            <label htmlFor="tanggalBooking" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Tanggal Booking</label>
                            <input id="tanggalBooking" type="date" value={tanggalBooking} onChange={e => setTanggalBooking(e.target.value)} className="w-full form-select px-4 py-2.5" required />
                        </div>
                        <div>
                            <label htmlFor="tanggalAcara" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Tanggal Acara</label>
                            <input id="tanggalAcara" type="date" value={tanggalAcara} onChange={e => setTanggalAcara(e.target.value)} className="w-full form-select px-4 py-2.5" required />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Jenis Acara</label>
                            <div className="flex gap-2 p-1.5 rounded-lg bg-[var(--color-interactive)]">
                                <label className={`flex items-center flex-1 justify-center py-2 rounded-md cursor-pointer transition-all duration-200 font-semibold ${jenisAcara === 'Wedding' ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`}>
                                    <input type="radio" name="jenisAcara" value="Wedding" checked={jenisAcara === 'Wedding'} onChange={() => setJenisAcara('Wedding')} className="sr-only"/> Wedding
                                </label>
                                <label className={`flex items-center flex-1 justify-center py-2 rounded-md cursor-pointer transition-all duration-200 font-semibold ${jenisAcara === 'Non Wedding' ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`}>
                                    <input type="radio" name="jenisAcara" value="Non Wedding" checked={jenisAcara === 'Non Wedding'} onChange={() => setJenisAcara('Non Wedding')} className="sr-only"/> Non Wedding
                                </label>
                            </div>
                        </div>
                        {jenisAcara === 'Wedding' && (
                            <div className="md:col-span-2">
                                <label htmlFor="weddingType" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Detail Acara Wedding</label>
                                <select
                                    id="weddingType"
                                    value={weddingType}
                                    onChange={e => setWeddingType(e.target.value as WeddingType)}
                                    className="w-full form-select px-4 py-2.5"
                                    required
                                >
                                    <option value="">Pilih Detail Acara</option>
                                    <option value="Resepsi">Resepsi</option>
                                    <option value="Akad & Resepsi">Akad & Resepsi</option>
                                    <option value="Pemberkatan Resepsi">Pemberkatan Resepsi</option>
                                    <option value="Teapai">Teapai</option>
                                    <option value="Teapai Resepsi">Teapai Resepsi</option>
                                    <option value="Venue Only">Venue Only</option>
                                </select>
                            </div>
                        )}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Jenis Booking</label>
                            <div className="flex gap-2 p-1.5 rounded-lg bg-[var(--color-interactive)]">
                                 <label className={`flex items-center flex-1 justify-center py-2 rounded-md cursor-pointer transition-all duration-200 font-semibold ${jenisBooking === 'DP' ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`}>
                                    <input type="radio" name="jenisBooking" value="DP" checked={jenisBooking === 'DP'} onChange={() => setJenisBooking('DP')} className="sr-only"/> DP
                                </label>
                                <label className={`flex items-center flex-1 justify-center py-2 rounded-md cursor-pointer transition-all duration-200 font-semibold ${jenisBooking === 'Lunas' ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`}>
                                    <input type="radio" name="jenisBooking" value="Lunas" checked={jenisBooking === 'Lunas'} onChange={() => setJenisBooking('Lunas')} className="sr-only"/> Lunas
                                </label>
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="tanggalPelunasan" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                                {jenisBooking === 'Lunas' ? 'Tanggal Pelunasan' : 'Tanggal Jatuh Tempo Pelunasan'}
                            </label>
                            <input 
                                id="tanggalPelunasan" 
                                type="date" 
                                value={tanggalPelunasan} 
                                onChange={e => setTanggalPelunasan(e.target.value)} 
                                className="w-full form-select px-4 py-2.5"
                            />
                            {jenisBooking === 'DP' && <p className="text-xs text-[var(--color-text-secondary)] mt-1">Kosongkan jika belum ada tanggal jatuh tempo.</p>}
                        </div>
                        {/* Vendors section */}
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
                        {/* Note Lainnya */}
                        <div className="md:col-span-2">
                            <label htmlFor="noteLainnya" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Note Lainnya / Catatan Tambahan</label>
                            <textarea id="noteLainnya" value={noteLainnya} onChange={e => setNoteLainnya(e.target.value)} rows={3} className="w-full form-input px-4 py-2.5" placeholder="Tambahkan catatan tambahan, kebutuhan khusus, atau informasi lain yang relevan..." />
                        </div>
                    </div>
                     <div className="flex space-x-4 mt-8 pt-6 border-t border-[var(--color-border)] flex-shrink-0">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-xl hover:bg-white/5 font-semibold transition-colors">
                            Batal
                        </button>
                        <button type="submit" className="flex-1 px-4 py-2.5 btn-primary">
                            Simpan Deal
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddDealModal;
