import React, { useState } from 'react';
import { CloseIcon } from './Icons';
import { useVenues } from './VenueContext';

interface AddVenueModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AddVenueModal: React.FC<AddVenueModalProps> = ({ isOpen, onClose }) => {
    const { addVenue } = useVenues();
    const [name, setName] = useState('');
    const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
    const [publishedCsvUrl, setPublishedCsvUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() === '') {
            alert('Nama venue tidak boleh kosong.');
            return;
        }

        setIsSaving(true);
        const result = await addVenue({
            name: name.trim(),
            spreadsheetUrl: spreadsheetUrl.trim() || undefined,
            publishedCsvUrl: publishedCsvUrl.trim() || undefined,
        });

        setIsSaving(false);

        if (result.success) {
            setName('');
            setSpreadsheetUrl('');
            setPublishedCsvUrl('');
            onClose();
        } else {
            alert(result.error || 'Gagal menambahkan venue.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 fade-in">
            <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl max-w-md w-full p-6 sm:p-8 relative border border-[var(--color-border)]">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Tambah Venue</h2>
                        <p className="text-sm text-[var(--color-text-secondary)]">Masukkan data venue baru</p>
                    </div>
                    <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] p-2 rounded-full hover:bg-white/10 transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="venueName" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Nama Venue *</label>
                            <input
                                type="text"
                                id="venueName"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 form-input"
                                placeholder="Contoh: Swasana Grand Slipi"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="spreadsheetUrl" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">URL Spreadsheet (opsional)</label>
                            <input
                                type="url"
                                id="spreadsheetUrl"
                                value={spreadsheetUrl}
                                onChange={(e) => setSpreadsheetUrl(e.target.value)}
                                className="w-full px-3 py-2 form-input"
                                placeholder="https://docs.google.com/spreadsheets/d/..."
                            />
                        </div>
                        <div>
                            <label htmlFor="publishedCsvUrl" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">URL CSV Publikasi (opsional)</label>
                            <input
                                type="url"
                                id="publishedCsvUrl"
                                value={publishedCsvUrl}
                                onChange={(e) => setPublishedCsvUrl(e.target.value)}
                                className="w-full px-3 py-2 form-input"
                                placeholder="https://docs.google.com/spreadsheets/d/e/.../pubhtml"
                            />
                        </div>
                    </div>

                    <div className="flex space-x-4 mt-8">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-xl hover:bg-white/5 font-semibold transition-colors"
                            disabled={isSaving}
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2.5 btn-primary"
                            disabled={isSaving}
                        >
                            {isSaving ? 'Menyimpan...' : 'Simpan Venue'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddVenueModal;
