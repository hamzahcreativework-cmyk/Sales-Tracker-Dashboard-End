import React, { useState } from 'react';
import { LaporanDatabaseEntry, OptionStatus, UserRole } from './types';
import { PlusIcon, TrashIcon, UploadIcon } from './Icons';
import { supabase } from './supabaseClient';

interface LaporanDatabaseViewProps {
    data: LaporanDatabaseEntry[];
    onDataChange: (data: LaporanDatabaseEntry[]) => void;
    venueName: string;
    marketingName: string;
    onImagePreview: (url: string) => void;
    userRole: UserRole;
}

const LaporanDatabaseView: React.FC<LaporanDatabaseViewProps> = ({ data, onDataChange, venueName, marketingName, onImagePreview, userRole }) => {
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [bulkEditField, setBulkEditField] = useState<keyof LaporanDatabaseEntry | ''>('');
    const [bulkEditValue, setBulkEditValue] = useState<string>('');
    const isReadOnly = userRole === 'Direktor';

    const handleInputChange = (index: number, field: keyof LaporanDatabaseEntry, value: string) => {
        const updatedData = data.map((row, i) =>
            i === index ? { ...row, [field]: value } : row
        );
        onDataChange(updatedData);
    };

    const addRow = () => {
        const newRow: LaporanDatabaseEntry = {
            id: -(new Date().getTime()), // Temporary negative ID for new rows
            dateIn: new Date().toISOString().split('T')[0],
            customerName: '',
            customerEmail: '',
            customerPhone: '',
            sourceData: '',
            followUp: '',
            lastFollowUpDate: '',
            lastResponse: '',
            potentialStatus: '',
            onlineMeeting: '',
            surveyLocation: '',
            closingStatus: 'Dealing',
            note: '',
            fillingStatus: 'Kosong',
            image_url: '',
        };
        onDataChange([...data, newRow]);
    };

    const deleteRow = (index: number) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus baris ini?')) {
            onDataChange(data.filter((_, i) => i !== index));
        }
    };

    const handleSelectRow = (id: number) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(data.map(row => row.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleDeleteSelected = () => {
        if (selectedIds.size === 0) return;
        if (window.confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.size} baris yang dipilih?`)) {
            onDataChange(data.filter(row => !selectedIds.has(row.id)));
            setSelectedIds(new Set());
        }
    };

    const handleBulkEdit = () => {
        if (!bulkEditField || selectedIds.size === 0) return;
        
        if (window.confirm(`Apakah Anda yakin ingin mengubah ${bulkEditField} untuk ${selectedIds.size} baris yang dipilih?`)) {
            const updatedData = data.map(row => {
                if (selectedIds.has(row.id)) {
                    return { ...row, [bulkEditField]: bulkEditValue };
                }
                return row;
            });
            onDataChange(updatedData);
            setBulkEditField('');
            setBulkEditValue('');
        }
    };

    const renderBulkEditInput = () => {
        const commonClass = "bg-transparent border border-[var(--color-border)] rounded px-2 py-1 text-sm focus:border-[var(--color-primary)] outline-none w-40 text-[var(--color-text-primary)]";
        
        if (bulkEditField === 'closingStatus') {
            return (
                <select value={bulkEditValue} onChange={(e) => setBulkEditValue(e.target.value)} className={commonClass}>
                    <option value="">Pilih Status...</option>
                    <option value="Dealing">Dealing</option>
                    <option value="On Going">On Going</option>
                    <option value="Tidak Lanjut">Tidak Lanjut</option>
                </select>
            );
        }
        if (bulkEditField === 'fillingStatus') {
            return (
                <select value={bulkEditValue} onChange={(e) => setBulkEditValue(e.target.value)} className={commonClass}>
                    <option value="">Pilih Status...</option>
                    <option value="Kosong">Kosong</option>
                    <option value="Lengkap">Lengkap</option>
                    <option value="Kurang Lengkap">Kurang Lengkap</option>
                    <option value="Sudah Mengisi">Sudah Mengisi</option>
                </select>
            );
        }
        // Default text input
        return (
            <input 
                type="text" 
                value={bulkEditValue} 
                onChange={(e) => setBulkEditValue(e.target.value)} 
                className={commonClass}
                placeholder="Nilai baru..."
            />
        );
    };
    
    const inputBaseClass = "w-full bg-transparent p-3 rounded-md border border-transparent hover:border-[var(--color-border)] focus:bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-colors duration-200 read-only:bg-transparent read-only:pointer-events-none";
    const selectBaseClass = "w-full bg-transparent p-3 rounded-md border border-transparent hover:border-[var(--color-border)] focus:bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-colors duration-200";

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-auto">
                <table className="w-full text-left min-w-[2400px]">
                    <thead className="bg-[var(--color-surface)] sticky top-0 z-10 shadow-sm">
                        <tr className="text-[var(--color-text-secondary)]">
                            <th className="p-4 font-semibold text-base w-12">
                                {!isReadOnly && (
                                    <input 
                                        type="checkbox" 
                                        checked={data.length > 0 && selectedIds.size === data.length}
                                        onChange={handleSelectAll}
                                        className="w-5 h-5 rounded border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                                    />
                                )}
                            </th>
                            <th className="p-4 font-semibold text-base w-40">Date In</th>
                            <th className="p-4 font-semibold text-base w-56">Nama</th>
                            <th className="p-4 font-semibold text-base w-56">Email</th>
                            <th className="p-4 font-semibold text-base w-40">No WA</th>
                            <th className="p-4 font-semibold text-base w-40">Sumber Data</th>
                            <th className="p-4 font-semibold text-base w-48">Follow Up</th>
                            <th className="p-4 font-semibold text-base w-40">Tgl FU Terakhir</th>
                            <th className="p-4 font-semibold text-base w-64">Respon Terakhir</th>
                            <th className="p-4 font-semibold text-base w-48">Status Potential</th>
                            <th className="p-4 font-semibold text-base w-48">Online Meeting</th>
                            <th className="p-4 font-semibold text-base w-48">Lokasi Survey</th>
                            <th className="p-4 font-semibold text-base w-48">Status Closing</th>
                            <th className="p-4 font-semibold text-base w-64">Note</th>
                            <th className="p-4 font-semibold text-base w-48">Status Pengisian</th>
                            {!isReadOnly && <th className="p-4 font-semibold text-base w-20">Aksi</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, index) => (
                            <tr key={row.id} className="border-t border-[var(--color-border)]">
                                <td className="p-4">
                                    {!isReadOnly && (
                                        <input 
                                            type="checkbox" 
                                            checked={selectedIds.has(row.id)}
                                            onChange={() => handleSelectRow(row.id)}
                                            className="w-5 h-5 rounded border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                                        />
                                    )}
                                </td>
                                <td className="p-2"><input type="date" value={row.dateIn || ''} onChange={(e) => handleInputChange(index, 'dateIn', e.target.value)} className={inputBaseClass} readOnly={isReadOnly} /></td>
                                <td className="p-2"><input type="text" value={row.customerName || ''} onChange={(e) => handleInputChange(index, 'customerName', e.target.value)} className={inputBaseClass} readOnly={isReadOnly} /></td>
                                <td className="p-2"><input type="email" value={row.customerEmail || ''} onChange={(e) => handleInputChange(index, 'customerEmail', e.target.value)} className={inputBaseClass} readOnly={isReadOnly} /></td>
                                <td className="p-2"><input type="text" value={row.customerPhone || ''} onChange={(e) => handleInputChange(index, 'customerPhone', e.target.value)} className={inputBaseClass} readOnly={isReadOnly} /></td>
                                <td className="p-2"><input type="text" value={row.sourceData || ''} onChange={(e) => handleInputChange(index, 'sourceData', e.target.value)} className={inputBaseClass} readOnly={isReadOnly} /></td>
                                <td className="p-2"><input type="text" value={row.followUp || ''} onChange={(e) => handleInputChange(index, 'followUp', e.target.value)} className={inputBaseClass} readOnly={isReadOnly} /></td>
                                <td className="p-2"><input type="text" value={row.lastFollowUpDate || ''} onChange={(e) => handleInputChange(index, 'lastFollowUpDate', e.target.value)} className={inputBaseClass} readOnly={isReadOnly} /></td>
                                <td className="p-2"><textarea value={row.lastResponse || ''} onChange={(e) => handleInputChange(index, 'lastResponse', e.target.value)} className={`${inputBaseClass} min-h-[56px]`} rows={2} readOnly={isReadOnly}></textarea></td>
                                <td className="p-2"><input type="text" value={row.potentialStatus || ''} onChange={(e) => handleInputChange(index, 'potentialStatus', e.target.value)} className={inputBaseClass} readOnly={isReadOnly} /></td>
                                <td className="p-2"><input type="text" value={row.onlineMeeting || ''} onChange={(e) => handleInputChange(index, 'onlineMeeting', e.target.value)} className={inputBaseClass} readOnly={isReadOnly} /></td>
                                <td className="p-2"><input type="text" value={row.surveyLocation || ''} onChange={(e) => handleInputChange(index, 'surveyLocation', e.target.value)} className={inputBaseClass} readOnly={isReadOnly} /></td>
                                <td className="p-2">
                                    <select value={row.closingStatus || 'Dealing'} onChange={(e) => handleInputChange(index, 'closingStatus', e.target.value)} className={selectBaseClass} disabled={isReadOnly}>
                                        <option value="Dealing">Dealing</option>
                                        <option value="On Going">On Going</option>
                                        <option value="Tidak Lanjut">Tidak Lanjut</option>
                                    </select>
                                </td>
                                <td className="p-2"><textarea value={row.note || ''} onChange={(e) => handleInputChange(index, 'note', e.target.value)} className={`${inputBaseClass} min-h-[56px]`} rows={2} readOnly={isReadOnly}></textarea></td>
                                <td className="p-2">
                                    <select value={row.fillingStatus || 'Kosong'} onChange={(e) => handleInputChange(index, 'fillingStatus', e.target.value)} className={selectBaseClass} disabled={isReadOnly}>
                                        <option value="Lengkap">Lengkap</option>
                                        <option value="Kurang Lengkap">Kurang Lengkap</option>
                                        <option value="Kosong">Kosong</option>
                                        <option value="Sudah Mengisi">Sudah Mengisi</option>
                                    </select>
                                </td>
                                {!isReadOnly && (
                                    <td className="p-4 text-center">
                                        <button onClick={() => deleteRow(index)} className="text-gray-500 hover:text-red-400 p-2 rounded-full hover:bg-red-500/10 transition-colors" aria-label="Hapus baris">
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {!isReadOnly && (
                <div className="mt-4 flex items-center gap-4 flex-shrink-0">
                    <button onClick={addRow} className="flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)] hover:underline p-2">
                        <PlusIcon className="w-5 h-5" />
                        Tambah Baris Laporan
                    </button>
                    {selectedIds.size > 0 && (
                        <>
                            <div className="h-8 w-px bg-[var(--color-border)] mx-2"></div>
                            
                            <div className="flex items-center gap-2 bg-[var(--color-surface)] p-1 rounded-lg border border-[var(--color-border)]">
                                <span className="text-sm font-medium px-2 text-[var(--color-text-secondary)]">Edit Masal:</span>
                                <select 
                                    value={bulkEditField} 
                                    onChange={(e) => {
                                        setBulkEditField(e.target.value as keyof LaporanDatabaseEntry);
                                        setBulkEditValue(''); // Reset value when field changes
                                    }}
                                    className="bg-transparent border-none text-sm focus:ring-0 text-[var(--color-text-primary)] outline-none cursor-pointer"
                                >
                                    <option value="" className="bg-[var(--color-surface)]">Pilih Field...</option>
                                    <option value="sourceData" className="bg-[var(--color-surface)]">Sumber Data</option>
                                    <option value="followUp" className="bg-[var(--color-surface)]">Follow Up</option>
                                    <option value="potentialStatus" className="bg-[var(--color-surface)]">Status Potential</option>
                                    <option value="onlineMeeting" className="bg-[var(--color-surface)]">Online Meeting</option>
                                    <option value="surveyLocation" className="bg-[var(--color-surface)]">Lokasi Survey</option>
                                    <option value="closingStatus" className="bg-[var(--color-surface)]">Status Closing</option>
                                    <option value="fillingStatus" className="bg-[var(--color-surface)]">Status Pengisian</option>
                                    <option value="note" className="bg-[var(--color-surface)]">Note</option>
                                </select>

                                {bulkEditField && (
                                    <>
                                        {renderBulkEditInput()}
                                        <button 
                                            onClick={handleBulkEdit}
                                            className="px-3 py-1 bg-[var(--color-primary)] text-white text-sm rounded hover:bg-[var(--color-primary-dark)] transition-colors"
                                        >
                                            Terapkan
                                        </button>
                                    </>
                                )}
                            </div>

                            <button onClick={handleDeleteSelected} className="flex items-center gap-2 text-sm font-semibold text-red-500 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-lg transition-colors">
                                <TrashIcon className="w-5 h-5" />
                                Hapus ({selectedIds.size}) Baris
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default LaporanDatabaseView;
