import React, { useState, useEffect } from 'react';
import LaporanDatabaseView from './LaporanDatabaseView';
import { CloseIcon } from './Icons';
import { LaporanDatabaseEntry, UserRole } from './types';
import { supabase } from './supabaseClient';

const normalizeDate = (dateStr: any): string => {
    if (!dateStr || typeof dateStr !== 'string') return '';
    // Check for DD/MM/YYYY or D/M/YYYY
    const dmyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmyMatch) {
        const [_, day, month, year] = dmyMatch;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateStr;
};

interface LaporanModalProps {
    isOpen: boolean;
    onClose: () => void;
    marketingName: string;
    venueName: string;
    onImagePreview: (url: string) => void;
    userRole: UserRole;
}

const LaporanModal: React.FC<LaporanModalProps> = ({ isOpen, onClose, marketingName, venueName, onImagePreview, userRole }) => {
    if (!isOpen) return null;

    const [reports, setReports] = useState<LaporanDatabaseEntry[]>([]);
    const [initialReports, setInitialReports] = useState<LaporanDatabaseEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            const fetchReports = async () => {
                setIsLoading(true);
                // Note: venueName and marketingName columns are missing in the current DB schema, so filtering is disabled for now.
                const { data, error } = await supabase
                    .from('laporan')
                    .select('*')
                    // .eq('venueName', venueName)
                    .eq('Nama-Marketing', marketingName)
                    .order('id', { ascending: true });
                
                if (error) {
                    console.error('Error fetching reports:', error.message);
                    alert(`Gagal memuat laporan untuk ${marketingName}`);
                    setReports([]);
                    setInitialReports([]);
                } else {
                    // Manually map the database columns to the frontend interface
                    const typedData = (data || []).map((row: any) => ({
                        id: row.id,
                        dateIn: normalizeDate(row['Date-In']),
                        customerName: row['Nama'],
                        customerEmail: row['Email'],
                        customerPhone: row['No-Wa-Customer'],
                        sourceData: row['Sumber-Data'],
                        followUp: row['Follow-Up'],
                        lastFollowUpDate: normalizeDate(row['Tanggal-FU-Terakhir']),
                        lastResponse: row['Respond-Terakhir'],
                        potentialStatus: row['Potensi-Atau-Tidak'],
                        onlineMeeting: row['Online-Meeting'],
                        surveyLocation: row['Survey-Lokasi'],
                        closingStatus: row['Status-Closing'],
                        note: row['Note'],
                        fillingStatus: row['Status-Pengisian'],
                        image_url: row['image_url'], // Assuming this might exist or be added later
                        marketingName: row['Nama-Marketing']
                    })) as LaporanDatabaseEntry[];

                    setReports(typedData);
                    setInitialReports(typedData);
                }
                setIsLoading(false);
            };
            fetchReports();
        }
    }, [isOpen, venueName, marketingName]);

    const handleSave = async (updatedData: LaporanDatabaseEntry[]) => {
        const originalIds = new Set(initialReports.map(r => r.id));
        const currentIds = new Set(updatedData.map(r => r.id).filter(id => id > 0));

        // FIX: Explicitly type `id` as `number` to resolve potential type inference issues in the filter callback.
        const toDeleteIds = [...originalIds].filter((id: number) => !currentIds.has(id));

        const mapToDb = (row: LaporanDatabaseEntry) => ({
            'Date-In': normalizeDate(row.dateIn),
            'Nama': row.customerName,
            'Email': row.customerEmail,
            'No-Wa-Customer': row.customerPhone,
            'Sumber-Data': row.sourceData,
            'Follow-Up': row.followUp,
            'Tanggal-FU-Terakhir': normalizeDate(row.lastFollowUpDate),
            'Respond-Terakhir': row.lastResponse,
            'Potensi-Atau-Tidak': row.potentialStatus,
            'Online-Meeting': row.onlineMeeting,
            'Survey-Lokasi': row.surveyLocation,
            'Status-Closing': row.closingStatus,
            'Note': row.note,
            'Status-Pengisian': row.fillingStatus,
            'Nama-Marketing': marketingName
        });

        const toUpdate = updatedData
            .filter(row => row.id > 0)
            .map(row => ({
                id: row.id,
                ...mapToDb(row)
            }));

        const toInsert = updatedData
            .filter(row => row.id < 0)
            .map(row => mapToDb(row));

        let hasError = false;
        let errorMessage = '';

        if (toDeleteIds.length > 0) {
            const { error: deleteError } = await supabase.from('laporan').delete().in('id', toDeleteIds);
            if (deleteError) {
                console.error('Error deleting reports:', deleteError.message);
                hasError = true;
                errorMessage += `Gagal menghapus data. `;
            }
        }

        if (toInsert.length > 0) {
            const { error: insertError } = await supabase.from('laporan').insert(toInsert);
            if (insertError) {
                console.error('Error inserting new reports:', insertError.message);
                hasError = true;
                errorMessage += `Gagal menambahkan data baru. `;
            }
        }
        
        if (toUpdate.length > 0) {
            const { error: updateError } = await supabase.from('laporan').upsert(toUpdate);
            if (updateError) {
                console.error('Error updating reports:', updateError.message);
                hasError = true;
                errorMessage += `Gagal memperbarui data. `;
            }
        }
        
        if (hasError) {
            alert(`Terjadi kesalahan saat menyimpan data: ${errorMessage}`);
            const { data: refreshedData } = await supabase
                .from('laporan')
                .select('*')
                // .eq('venueName', venueName)
                .eq('Nama-Marketing', marketingName)
                .order('id', { ascending: true });
                
            const typedRefreshedData = (refreshedData || []).map((row: any) => ({
                id: row.id,
                dateIn: normalizeDate(row['Date-In']),
                customerName: row['Nama'],
                customerEmail: row['Email'],
                customerPhone: row['No-Wa-Customer'],
                sourceData: row['Sumber-Data'],
                followUp: row['Follow-Up'],
                lastFollowUpDate: normalizeDate(row['Tanggal-FU-Terakhir']),
                lastResponse: row['Respond-Terakhir'],
                potentialStatus: row['Potensi-Atau-Tidak'],
                onlineMeeting: row['Online-Meeting'],
                surveyLocation: row['Survey-Lokasi'],
                closingStatus: row['Status-Closing'],
                note: row['Note'],
                fillingStatus: row['Status-Pengisian'],
                image_url: row['image_url'],
                marketingName: row['Nama-Marketing']
            })) as LaporanDatabaseEntry[];

            setReports(typedRefreshedData);
            setInitialReports(typedRefreshedData);
        }
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-primary)]"></div>
                    <p className="ml-4 text-[var(--color-text-secondary)]">Memuat laporan...</p>
                </div>
            );
        }
        return <LaporanDatabaseView 
            data={reports} 
            onDataChange={setReports}
            venueName={venueName} 
            marketingName={marketingName}
            onImagePreview={onImagePreview}
            userRole={userRole}
        />;
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 fade-in">
            <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl max-w-7xl w-full p-6 sm:p-8 relative max-h-[90vh] flex flex-col border border-[var(--color-border)]">
                {/* Header */}
                <div className="flex justify-between items-start mb-6 flex-shrink-0">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">{`Laporan: ${marketingName}`}</h2>
                        <p className="text-base sm:text-lg text-[var(--color-text-secondary)]">{venueName}</p>
                    </div>
                    <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                
                {/* Content */}
                <div className="overflow-y-auto pr-2 -mr-4">
                    {renderContent()}
                </div>

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-[var(--color-border)] flex justify-end items-center gap-4 flex-shrink-0">
                     <button 
                        onClick={onClose}
                        className="w-full sm:w-auto px-8 py-2.5 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-xl hover:bg-[var(--color-interactive)] font-semibold transition-colors"
                    >
                        Kembali
                    </button>
                    {userRole !== 'Direktor' && (
                        <button 
                            onClick={() => handleSave(reports)}
                            className="btn-primary py-2.5 px-8"
                        >
                            Simpan Perubahan
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LaporanModal;
