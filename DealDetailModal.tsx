import React, { useState, useEffect, useCallback } from 'react';
import { DealingEntry, DealComment, UserRole, MarketingPerson, WeddingType } from './types';
import { CloseIcon, TrashIcon, UserCircleIcon } from './Icons';
import { supabase } from './supabaseClient';
import { useVenues } from './VenueContext';
import type { User } from '@supabase/supabase-js';

interface DealDetailModalProps {
    deal: DealingEntry;
    onClose: () => void;
    onDealUpdate: (updatedDeal: Partial<DealingEntry> & { id: number }) => void;
    onDealDelete: (dealId: number) => void;
    userRole: UserRole;
}

const PRIORITY_MAP: Record<DealingEntry['priority'], { label: string, color: string }> = {
    'Low': { label: 'Low', color: 'bg-sky-500/20 text-sky-300' },
    'Medium': { label: 'Medium', color: 'bg-yellow-500/20 text-yellow-300' },
    'High': { label: 'High', color: 'bg-red-500/20 text-red-300' },
};

const STATUS_MAP: Record<DealingEntry['completion_status'], { label: string, color: string }> = {
    'Not Started': { label: 'Not Started', color: 'bg-gray-500/20 text-gray-300' },
    'In Progress': { label: 'In Progress', color: 'bg-blue-500/20 text-blue-300' },
    'Completed': { label: 'Completed', color: 'bg-green-500/20 text-green-300' },
};

const DealDetailModal: React.FC<DealDetailModalProps> = ({ deal, onClose, onDealUpdate, onDealDelete, userRole }) => {
    const { venues: VENUES } = useVenues();
    const [formData, setFormData] = useState<DealingEntry>(deal);
    const [comments, setComments] = useState<DealComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [marketingOptions, setMarketingOptions] = useState<MarketingPerson[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isPostingComment, setIsPostingComment] = useState(false);
    const isReadOnly = userRole === 'Direktor' || userRole === 'User';

    const fetchMarketingOptions = useCallback(async (venueName: string) => {
        const { data, error } = await supabase.from('marketing_staff').select('name').eq('venueName', venueName);
        if (error) {
            console.error("Error fetching marketing options:", error.message);
            setMarketingOptions([]);
        } else {
            setMarketingOptions((data as MarketingPerson[]) || []);
        }
    }, []);

    const fetchComments = useCallback(async () => {
        const { data, error } = await supabase.from('deal_comments').select('*').eq('deal_id', deal.id).order('created_at', { ascending: false });
        if (error) {
            console.error('Error fetching comments:', error.message);
            alert('Failed to load comments.');
        } else {
            setComments(data as DealComment[]);
        }
    }, [deal.id]);

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);
            await Promise.all([
                fetchComments(),
                fetchMarketingOptions(formData.namaVenue)
            ]);
            setIsLoading(false);
        };
        init();
    }, [deal.id, fetchComments, fetchMarketingOptions, formData.namaVenue]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newState = { ...prev, [name]: value };
            if (name === 'jenisAcara' && value === 'Non Wedding') {
                newState.weddingType = undefined;
            }
            return newState;
        });
    };

    const handleFieldChange = <K extends keyof DealingEntry>(name: K, value: DealingEntry[K]) => {
         setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        const { error } = await supabase.from('deals').update({ ...formData }).eq('id', deal.id);
        if (error) {
            console.error('Error updating deal:', error.message);
            alert('Failed to save changes.');
        } else {
            onDealUpdate(formData);
            alert('Changes saved successfully.');
        }
        setIsSaving(false);
    };

    const handleDelete = async () => {
        if (window.confirm(`Are you sure you want to delete the deal for "${deal.namaClient}"? This cannot be undone.`)) {
            const { error } = await supabase.from('deals').delete().eq('id', deal.id);
            if (error) {
                console.error('Error deleting deal:', error.message);
                alert('Failed to delete deal.');
            } else {
                onDealDelete(deal.id);
            }
        }
    };
    
    const handleAddComment = async () => {
        if (!newComment.trim() || !currentUser) return;
        setIsPostingComment(true);
        
        const commentData: Omit<DealComment, 'id' | 'created_at'> = {
            deal_id: deal.id,
            user_id: currentUser.id,
            comment: newComment.trim(),
            user_name: currentUser.user_metadata?.full_name || 'Unnamed User',
            user_avatar_url: currentUser.user_metadata?.avatar_url,
        };

        const { error } = await supabase.from('deal_comments').insert([commentData]);
        if (error) {
            console.error('Error posting comment:', error.message);
            alert('Failed to post comment.');
        } else {
            setNewComment('');
            await fetchComments();
        }
        setIsPostingComment(false);
    };

    const SegmentedControl = <T extends string>({ options, value, onChange, map }: { options: readonly T[], value: T, onChange: (value: T) => void, map: Record<T, { label: string, color: string }> }) => (
        <div className="flex w-full gap-1 p-1 rounded-lg bg-[var(--color-interactive)]">
            {options.map(option => (
                <button
                    key={option}
                    type="button"
                    onClick={() => onChange(option)}
                    disabled={isReadOnly}
                    className={`flex-1 text-sm font-semibold py-1.5 px-2 rounded-md transition-all duration-200 disabled:cursor-not-allowed ${value === option ? `${map[option].color} shadow-sm bg-opacity-100` : 'text-[var(--color-text-secondary)] hover:bg-white/5'}`}
                >
                    {map[option].label}
                </button>
            ))}
        </div>
    );
    
    const renderFormInput = (label: string, name: keyof DealingEntry, type: string = 'text', required: boolean = false) => (
         <div>
            <label htmlFor={name} className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">{label}</label>
            <input id={name} name={name} type={type} value={formData[name] as string || ''} onChange={handleInputChange} className="w-full form-input px-4 py-2.5" required={required} readOnly={isReadOnly}/>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 fade-in">
            <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl max-w-5xl w-full p-6 sm:p-8 relative border border-[var(--color-border)] max-h-[95vh] flex flex-col">
                <div className="flex justify-between items-start mb-4 flex-shrink-0">
                    <input 
                        type="text"
                        name="namaClient"
                        value={formData.namaClient}
                        onChange={handleInputChange}
                        className="text-2xl font-bold text-[var(--color-text-primary)] bg-transparent border-none p-0 focus:ring-0 w-full"
                        readOnly={isReadOnly}
                    />
                    <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] p-2 rounded-full hover:bg-white/10 transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto pr-2 -mr-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Description</label>
                                <textarea name="description" value={formData.description || ''} onChange={handleInputChange} rows={4} className="w-full form-input px-4 py-2.5" placeholder="Add a more detailed description..." readOnly={isReadOnly}></textarea>
                            </div>

{/* Status, Priority, and Due Date removed as per request */}
                            
                            <details className="space-y-4 pt-4 border-t border-[var(--color-border)]" open>
                                <summary className="cursor-pointer font-semibold text-[var(--color-text-primary)]">Other Details</summary>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 pt-4">
                                    {renderFormInput('Nama Package', 'namaPax', 'text', true)}
                                    {renderFormInput('Total Pax', 'totalPax', 'number', true)}
                                    <div>
                                        <label htmlFor="namaVenue" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Nama Venue</label>
                                        <select id="namaVenue" name="namaVenue" value={formData.namaVenue} onChange={handleInputChange} className="w-full form-select px-4 py-2.5" required disabled={isReadOnly}>
                                            {VENUES.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="namaMarketing" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Nama Marketing</label>
                                        <input
                                            id="namaMarketing"
                                            name="namaMarketing"
                                            list="marketing-list"
                                            value={formData.namaMarketing}
                                            onChange={handleInputChange}
                                            className="w-full form-input px-4 py-2.5"
                                            required
                                            readOnly={isReadOnly}
                                        />
                                        <datalist id="marketing-list">
                                            {marketingOptions.map(m => <option key={m.name} value={m.name} />)}
                                        </datalist>
                                        <p className="text-xs text-[var(--color-text-secondary)] mt-1">Jika nama marketing tidak muncul, ketik secara manual (mis. marketing pindah venue tetapi tetap bisa dipilih).</p>
                                    </div>
                                     <div>
                                        <label htmlFor="jenisAcara" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Jenis Acara</label>
                                        <select id="jenisAcara" name="jenisAcara" value={formData.jenisAcara} onChange={handleInputChange} className="w-full form-select px-4 py-2.5" required disabled={isReadOnly}>
                                            <option value="Wedding">Wedding</option>
                                            <option value="Non Wedding">Non Wedding</option>
                                        </select>
                                    </div>
                                    {formData.jenisAcara === 'Wedding' && (
                                        <div>
                                            <label htmlFor="weddingType" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Detail Acara Wedding</label>
                                            <select
                                                id="weddingType"
                                                name="weddingType"
                                                value={formData.weddingType || ''}
                                                onChange={handleInputChange}
                                                className="w-full form-select px-4 py-2.5"
                                                required={!isReadOnly}
                                                disabled={isReadOnly}
                                            >
                                                <option value="">Pilih Detail Acara</option>
                                                <option value="Resepsi">Resepsi</option>
                                                <option value="Akad & Resepsi">Akad & Resepsi</option>
                                                <option value="Pemberkatan Resepsi">Pemberkatan Resepsi</option>
                                                <option value="Teapai">Teapai</option>
                                                <option value="Teapai">Teapai Resepsi</option>
                                                <option value="Venue Only">Venue Only</option>
                                            </select>
                                        </div>
                                    )}
                                    {renderFormInput('Sumber Data', 'sumberData')}
                                    {renderFormInput('ID Bitrix24', 'id_bitrix24', 'text', false)}
                                    {renderFormInput('Tgl Dealing', 'tanggalBooking', 'date')}
                                    {renderFormInput('Tgl Acara', 'tanggalPelunasan', 'date')}
                                    {/* Vendor fields with notes */}
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Vendor Catering</label>
                                        <input name="vendorCatering" value={formData.vendorCatering || ''} onChange={e => handleFieldChange('vendorCatering', e.target.value)} className="w-full form-input px-4 py-2.5" />
                                        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mt-2">Note</label>
                                        <input name="vendorCateringNote" value={formData.vendorCateringNote || ''} onChange={e => handleFieldChange('vendorCateringNote', e.target.value)} className="w-full form-input px-3 py-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Vendor Dekorasi</label>
                                        <input name="vendorDekorasi" value={formData.vendorDekorasi || ''} onChange={e => handleFieldChange('vendorDekorasi', e.target.value)} className="w-full form-input px-4 py-2.5" />
                                        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mt-2">Note</label>
                                        <input name="vendorDekorasiNote" value={formData.vendorDekorasiNote || ''} onChange={e => handleFieldChange('vendorDekorasiNote', e.target.value)} className="w-full form-input px-3 py-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Vendor Rias & Busana</label>
                                        <input name="vendorRiasBusana" value={formData.vendorRiasBusana || ''} onChange={e => handleFieldChange('vendorRiasBusana', e.target.value)} className="w-full form-input px-4 py-2.5" />
                                        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mt-2">Note</label>
                                        <input name="vendorRiasBusanaNote" value={formData.vendorRiasBusanaNote || ''} onChange={e => handleFieldChange('vendorRiasBusanaNote', e.target.value)} className="w-full form-input px-3 py-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Vendor MUA</label>
                                        <input name="vendorMUA" value={formData.vendorMUA || ''} onChange={e => handleFieldChange('vendorMUA', e.target.value)} className="w-full form-input px-4 py-2.5" />
                                        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mt-2">Note</label>
                                        <input name="vendorMUANote" value={formData.vendorMUANote || ''} onChange={e => handleFieldChange('vendorMUANote', e.target.value)} className="w-full form-input px-3 py-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Vendor Photo & Video</label>
                                        <input name="vendorPhotoVideo" value={formData.vendorPhotoVideo || ''} onChange={e => handleFieldChange('vendorPhotoVideo', e.target.value)} className="w-full form-input px-4 py-2.5" />
                                        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mt-2">Note</label>
                                        <input name="vendorPhotoVideoNote" value={formData.vendorPhotoVideoNote || ''} onChange={e => handleFieldChange('vendorPhotoVideoNote', e.target.value)} className="w-full form-input px-3 py-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Vendor Entertainment</label>
                                        <input name="vendorEntertainment" value={formData.vendorEntertainment || ''} onChange={e => handleFieldChange('vendorEntertainment', e.target.value)} className="w-full form-input px-4 py-2.5" />
                                        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mt-2">Note</label>
                                        <input name="vendorEntertainmentNote" value={formData.vendorEntertainmentNote || ''} onChange={e => handleFieldChange('vendorEntertainmentNote', e.target.value)} className="w-full form-input px-3 py-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Vendor MC</label>
                                        <input name="vendorMC" value={formData.vendorMC || ''} onChange={e => handleFieldChange('vendorMC', e.target.value)} className="w-full form-input px-4 py-2.5" />
                                        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mt-2">Note</label>
                                        <input name="vendorMCNote" value={formData.vendorMCNote || ''} onChange={e => handleFieldChange('vendorMCNote', e.target.value)} className="w-full form-input px-3 py-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Vendor Photobooth</label>
                                        <input name="vendorPhotobooth" value={formData.vendorPhotobooth || ''} onChange={e => handleFieldChange('vendorPhotobooth', e.target.value)} className="w-full form-input px-4 py-2.5" />
                                        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mt-2">Note</label>
                                        <input name="vendorPhotoboothNote" value={formData.vendorPhotoboothNote || ''} onChange={e => handleFieldChange('vendorPhotoboothNote', e.target.value)} className="w-full form-input px-3 py-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Vendor Prosesi Adat</label>
                                        <input name="vendorProsesiAdat" value={formData.vendorProsesiAdat || ''} onChange={e => handleFieldChange('vendorProsesiAdat', e.target.value)} className="w-full form-input px-4 py-2.5" />
                                        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mt-2">Note</label>
                                        <input name="vendorProsesiAdatNote" value={formData.vendorProsesiAdatNote || ''} onChange={e => handleFieldChange('vendorProsesiAdatNote', e.target.value)} className="w-full form-input px-3 py-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Vendor Live Streaming</label>
                                        <input name="vendorLiveStreaming" value={formData.vendorLiveStreaming || ''} onChange={e => handleFieldChange('vendorLiveStreaming', e.target.value)} className="w-full form-input px-4 py-2.5" />
                                        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mt-2">Note</label>
                                        <input name="vendorLiveStreamingNote" value={formData.vendorLiveStreamingNote || ''} onChange={e => handleFieldChange('vendorLiveStreamingNote', e.target.value)} className="w-full form-input px-3 py-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Vendor Foodstall Millenial</label>
                                        <input name="vendorFoodstallMillenial" value={formData.vendorFoodstallMillenial || ''} onChange={e => handleFieldChange('vendorFoodstallMillenial', e.target.value)} className="w-full form-input px-4 py-2.5" />
                                        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mt-2">Note</label>
                                        <input name="vendorFoodstallMillenialNote" value={formData.vendorFoodstallMillenialNote || ''} onChange={e => handleFieldChange('vendorFoodstallMillenialNote', e.target.value)} className="w-full form-input px-3 py-2 text-sm" />
                                    </div>
                                </div>
                            </details>
                        </div>
                        
                        <div className="lg:col-span-1 space-y-4 lg:border-l lg:pl-8 border-[var(--color-border)]">
                            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Activity</h3>
                             {!isReadOnly && (
                                <div className="flex items-start gap-3">
                                    <img src={currentUser?.user_metadata?.avatar_url || `https://i.pravatar.cc/150?u=${currentUser?.email}`} alt="user" className="w-8 h-8 rounded-full mt-1" />
                                    <div className="flex-grow">
                                        <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." rows={2} className="w-full form-input p-2 text-sm"></textarea>
                                        <button onClick={handleAddComment} disabled={isPostingComment || !newComment.trim()} className="mt-2 text-sm btn-primary px-3 py-1.5 disabled:opacity-50">
                                            {isPostingComment ? 'Posting...' : 'Post'}
                                        </button>
                                    </div>
                                </div>
                             )}
                            <div className="space-y-4">
                                {isLoading ? (
                                    <p className="text-sm text-[var(--color-text-secondary)]">Loading comments...</p>
                                ) : comments.length > 0 ? (
                                    comments.map(comment => (
                                        <div key={comment.id} className="flex items-start gap-3">
                                            <img src={comment.user_avatar_url || 'https://i.pravatar.cc/150'} alt={comment.user_name} className="w-8 h-8 rounded-full" />
                                            <div>
                                                <div className="flex items-baseline gap-2">
                                                    <p className="font-semibold text-sm text-[var(--color-text-primary)]">{comment.user_name}</p>
                                                    <p className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleString('id-ID')}</p>
                                                </div>
                                                <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">{comment.comment}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-center text-[var(--color-text-secondary)] py-8">No comments yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--color-border)] flex justify-between items-center flex-shrink-0">
                    <div>
                        {!isReadOnly && (
                             <button onClick={handleDelete} className="flex items-center gap-2 text-sm font-semibold text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-colors">
                                <TrashIcon className="w-5 h-5" /> Delete Deal
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="px-6 py-2.5 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-xl hover:bg-white/5 font-semibold transition-colors">
                            Close
                        </button>
                        {!isReadOnly && (
                            <button onClick={handleSave} disabled={isSaving} className="btn-primary py-2.5 px-6 disabled:opacity-50">
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DealDetailModal;
