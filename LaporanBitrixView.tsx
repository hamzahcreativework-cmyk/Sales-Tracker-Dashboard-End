import React, { useState, useEffect } from 'react';
import { UserRole } from './types';
import { supabase } from './supabaseClient';
import { TrashIcon, EditIcon, CloseIcon, SuccessIcon } from './Icons';
import * as bitrixClient from './bitrixClient';

interface LaporanBitrixViewProps {
    userRole: UserRole;
    assignedVenue: string | null;
}

const LaporanBitrixView: React.FC<LaporanBitrixViewProps> = ({ userRole, assignedVenue }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [userName, setUserName] = useState<string>('');

    // Form States (Bulk Entry)
    const createEmptyEntry = () => ({
        id_bitrix: '',
        nama: '',
        no_telp: '',
        status: '',
        keterangan: ''
    });

    const [entries, setEntries] = useState<any[]>(
        Array.from({ length: 10 }, createEmptyEntry)
    );

    // Modal State
    const [isInputModalOpen, setIsInputModalOpen] = useState(false);

    // History & Filter States
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedItem, setSelectedItem] = useState<any | null>(null);

    // Bulk Actions States
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [editingIds, setEditingIds] = useState<Set<string>>(new Set());
    const [editValues, setEditValues] = useState<Record<string, any>>({});
    const isEditingMode = editingIds.size > 0;

    // Director View States
    const [userMap, setUserMap] = useState<Record<string, string>>({});

    // Bitrix24 Integration States
    const [bitrixConnectionStatus, setBitrixConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'disconnected'>('idle');
    const [bitrixError, setBitrixError] = useState<string | null>(null);
    const [isSyncingBitrix, setIsSyncingBitrix] = useState(false);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserName(user.user_metadata?.full_name || user.email || 'User');
            }
        };
        getUser();
    }, []);

    // Fetch User Map for Director
    useEffect(() => {
        const fetchUserMap = async () => {
            if (userRole === 'Direktor') {
                try {
                    const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_names');
                    if (!rpcError && rpcData) {
                        const map: Record<string, string> = {};
                        rpcData.forEach((u: any) => {
                            map[u.id] = u.name || u.email || 'Unknown';
                        });
                        setUserMap(map);
                        return;
                    }

                    // Fallback
                    const { data, error } = await supabase.functions.invoke('list-users');
                    if (!error && data?.users) {
                        const map: Record<string, string> = {};
                        data.users.forEach((u: any) => {
                            map[u.id] = u.user_metadata?.full_name || u.email;
                        });
                        setUserMap(map);
                    }
                } catch (error) {
                    console.error('Error fetching user map:', error);
                }
            }
        };
        fetchUserMap();
    }, [userRole]);

    const fetchHistory = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            let query = supabase
                .from('laporan_bitrix')
                .select('*')
                .order('created_at', { ascending: false });

            if (userRole !== 'Direktor') {
                query = query.eq('user_id', user.id);
            }

            if (startDate) query = query.gte('submission_date', startDate);
            if (endDate) query = query.lte('submission_date', endDate);

            const { data, error } = await query;
            if (error) throw error;
            setHistoryData(data || []);
            setSelectedIds(new Set());
            setEditingIds(new Set());
        } catch (error: any) {
            console.error('Error fetching history:', error);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [startDate, endDate, userRole]);

    // Test Bitrix24 Connection on mount
    useEffect(() => {
        const testConnection = async () => {
            setBitrixConnectionStatus('testing');
            try {
                const isConnected = await bitrixClient.testBitrixConnection();
                if (isConnected) {
                    setBitrixConnectionStatus('connected');
                    setBitrixError(null);
                } else {
                    setBitrixConnectionStatus('disconnected');
                    setBitrixError('Gagal terhubung ke Bitrix24. Periksa konfigurasi di bitrixClient.ts');
                }
            } catch (error: any) {
                setBitrixConnectionStatus('disconnected');
                setBitrixError(error.message || 'Error menghubungkan ke Bitrix24');
            }
        };

        // Delay test to avoid blocking initial render
        const timer = setTimeout(testConnection, 1000);
        return () => clearTimeout(timer);
    }, []);

    const handleEntryChange = (index: number, field: string, value: string) => {
        const newEntries = [...entries];
        newEntries[index] = { ...newEntries[index], [field]: value };
        setEntries(newEntries);
    };

    const handleAddRow = () => {
        setEntries([...entries, createEmptyEntry()]);
    };

    const handleRemoveRow = (index: number) => {
        const newEntries = entries.filter((_: any, i: number) => i !== index);
        setEntries(newEntries);
    };

    const handleSave = async () => {
        const validEntries = entries.filter((e: any) => e.nama?.trim() || e.no_telp?.trim());

        if (validEntries.length === 0) {
            alert('Mohon isi setidaknya satu data (Nama atau No. Telp)');
            return;
        }

        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const payload = validEntries.map((entry: any) => ({
                user_id: user.id,
                id_bitrix: entry.id_bitrix,
                nama: entry.nama,
                no_telp: entry.no_telp,
                status: entry.status,
                keterangan: entry.keterangan,
                submission_date: new Date().toISOString().split('T')[0]
            }));

            const { error } = await supabase.from('laporan_bitrix').insert(payload);

            if (error) throw error;
            alert(`${validEntries.length} data berhasil disimpan!`);

            setEntries(Array.from({ length: 10 }, createEmptyEntry));
            setIsInputModalOpen(false);
            fetchHistory();
        } catch (error: any) {
            console.error('Error saving data:', error);
            alert(`Gagal menyimpan: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(historyData.map((d: any) => d.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectRow = (id: string) => {
        if (isEditingMode) return;
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Yakin ingin menghapus ${selectedIds.size} data terpilih?`)) return;

        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('laporan_bitrix')
                .delete()
                .in('id', Array.from(selectedIds));

            if (error) throw error;
            alert('Data berhasil dihapus');
            fetchHistory();
        } catch (error: any) {
            alert('Gagal hapus: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartBulkEdit = () => {
        setEditingIds(new Set(selectedIds));
        const initialValues: Record<string, any> = {};
        selectedIds.forEach((id: string) => {
            const item = historyData.find((d: any) => d.id === id);
            if (item) initialValues[id] = { ...item };
        });
        setEditValues(initialValues);
    };

    const handleCancelEdit = () => {
        setEditingIds(new Set());
        setEditValues({});
    };

    const handleEditValueChange = (id: string, field: string, value: string) => {
        setEditValues((prev: any) => ({
            ...prev,
            [id]: { ...prev[id], [field]: value }
        }));
    };

    const handleSaveBulkEdit = async () => {
        setIsLoading(true);
        try {
            const updates = Object.values(editValues).map((item: any) => ({
                id: item.id,
                user_id: item.user_id,
                id_bitrix: item.id_bitrix,
                nama: item.nama,
                no_telp: item.no_telp,
                status: item.status,
                keterangan: item.keterangan,
                submission_date: item.submission_date
            }));

            const { error } = await supabase.from('laporan_bitrix').upsert(updates);
            if (error) throw error;

            alert('Data berhasil diperbarui');
            setEditingIds(new Set());
            setEditValues({});
            setSelectedIds(new Set());
            fetchHistory();
        } catch (error: any) {
            alert('Gagal update: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // ============== BITRIX24 INTEGRATION FUNCTIONS ==============

    /**
     * Sinkronisasi data dari Bitrix24
     */
    const handleSyncFromBitrix = async () => {
        if (bitrixConnectionStatus !== 'connected') {
            alert('Bitrix24 belum terhubung. Silakan konfigurasi di bitrixClient.ts');
            return;
        }

        setIsSyncingBitrix(true);
        try {
            // Get deals from Bitrix24
            const deals = await bitrixClient.getDeals();

            if (deals.length === 0) {
                alert('Tidak ada deals ditemukan di Bitrix24');
                setIsSyncingBitrix(false);
                return;
            }

            // Map deals to local format with phone fetching from contacts
            const newEntries = await Promise.all(deals.map(async (deal: any) => {
                let phone = '';
                
                // Fetch nomor telepon dari contact jika ada
                if (deal.CONTACT_ID) {
                    try {
                        const contact = await bitrixClient.getContactById(deal.CONTACT_ID);
                        if (contact && contact.PHONE && Array.isArray(contact.PHONE)) {
                            phone = contact.PHONE[0]?.VALUE || '';
                        }
                    } catch (error) {
                        console.warn(`Failed to fetch contact ${deal.CONTACT_ID}:`, error);
                    }
                }
                
                return {
                    id_bitrix: deal.ID,
                    nama: deal.TITLE,
                    no_telp: phone,
                    status: deal.STAGE_ID || '',
                    keterangan: deal.OPPORTUNITY || ''
                };
            }));

            // Replace existing entries with synced data
            setEntries(newEntries);
            alert(`${deals.length} deal berhasil disinkronisasi dari Bitrix24!\n✓ ID Bitrix: ${newEntries.filter((e: any) => e.id_bitrix).length} deal\n✓ Nomor telpon: ${newEntries.filter((e: any) => e.no_telp).length} contact`);
        } catch (error: any) {
            console.error('Bitrix sync error:', error);
            alert(`Gagal sinkronisasi: ${error.message}`);
        } finally {
            setIsSyncingBitrix(false);
        }
    };

    /**
     * Test connection ke Bitrix24
     */
    const handleTestBitrixConnection = async () => {
        setBitrixConnectionStatus('testing');
        try {
            const isConnected = await bitrixClient.testBitrixConnection();
            if (isConnected) {
                setBitrixConnectionStatus('connected');
                setBitrixError(null);
                alert('✓ Terhubung ke Bitrix24!');
            } else {
                setBitrixConnectionStatus('disconnected');
                setBitrixError('Gagal terhubung ke Bitrix24');
                alert('✗ Gagal terhubung ke Bitrix24');
            }
        } catch (error: any) {
            setBitrixConnectionStatus('disconnected');
            setBitrixError(error.message);
            alert(`✗ Error: ${error.message}`);
        }
    };

    // Filter data based on search query
    const filteredHistoryData = historyData.filter((item: any) => {
        const searchLower = searchQuery.toLowerCase();
        return (
            (item.nama?.toLowerCase().includes(searchLower) || false) ||
            (item.no_telp?.toLowerCase().includes(searchLower) || false) ||
            (item.status?.toLowerCase().includes(searchLower) || false) ||
            (item.keterangan?.toLowerCase().includes(searchLower) || false)
        );
    });

    return (
        <div className="fade-in space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                    Laporan Data Bitrix24 {assignedVenue ? `- ${assignedVenue}` : ''}
                </h1>
                <button
                    onClick={() => setIsInputModalOpen(true)}
                    className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors shadow-sm font-medium flex items-center gap-2"
                >
                    <span className="text-lg">+</span> Tambah Laporan
                </button>
            </div>

                {/* Bitrix24 Connection Status */}
                <div className={`p-4 rounded-lg border ${
                    bitrixConnectionStatus === 'connected'
                        ? 'bg-green-50 border-green-200 text-green-900'
                        : bitrixConnectionStatus === 'disconnected'
                        ? 'bg-red-50 border-red-200 text-red-900'
                        : 'bg-yellow-50 border-yellow-200 text-yellow-900'
                }`}>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                                bitrixConnectionStatus === 'connected'
                                    ? 'bg-green-500'
                                    : bitrixConnectionStatus === 'disconnected'
                                    ? 'bg-red-500'
                                    : 'bg-yellow-500'
                            }`}></div>
                            <div>
                                <p className="font-semibold text-sm">
                                    {bitrixConnectionStatus === 'connected' && '✓ Bitrix24 Terhubung'}
                                    {bitrixConnectionStatus === 'disconnected' && '✗ Bitrix24 Tidak Terhubung'}
                                    {bitrixConnectionStatus === 'testing' && '⟳ Menguji Koneksi...'}
                                    {bitrixConnectionStatus === 'idle' && '⟳ Memeriksa Koneksi...'}
                                </p>
                                {bitrixError && <p className="text-xs mt-1">{bitrixError}</p>}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleTestBitrixConnection}
                                disabled={bitrixConnectionStatus === 'testing' || isSyncingBitrix}
                                className={`px-3 py-1 text-sm rounded font-medium transition-colors ${
                                    bitrixConnectionStatus === 'testing' || isSyncingBitrix
                                        ? 'opacity-50 cursor-not-allowed'
                                        : 'hover:opacity-80'
                                }`}
                                style={{
                                    backgroundColor: bitrixConnectionStatus === 'connected' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'
                                }}
                            >
                                Tes Koneksi
                            </button>
                            {bitrixConnectionStatus === 'connected' && (
                                <button
                                    onClick={handleSyncFromBitrix}
                                    disabled={isSyncingBitrix || isLoading}
                                    className="px-3 py-1 text-sm rounded font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSyncingBitrix ? '⟳ Sinkronisasi...' : '↓ Ambil Data dari Bitrix24'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Filter & Search Section */}
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                    <div className="flex-1">
                        <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-2">
                            Cari Data
                        </label>
                        <input
                            type="text"
                            placeholder="Cari nama, telepon, status..."
                            value={searchQuery}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                            className="w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-text-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none"
                        />
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
                            className="text-sm border border-[var(--color-border)] rounded-md px-2 py-1 bg-[var(--color-background)] text-[var(--color-text-primary)]"
                        />
                        <span className="text-[var(--color-text-secondary)]">-</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
                            className="text-sm border border-[var(--color-border)] rounded-md px-2 py-1 bg-[var(--color-background)] text-[var(--color-text-primary)]"
                        />
                    </div>
                </div>

                {selectedIds.size > 0 && (
                    <div className="bg-[var(--color-primary)]/10 p-3 rounded-lg flex items-center justify-between border border-[var(--color-primary)]/20 animate-in fade-in slide-in-from-top-2 duration-200">
                        <span className="text-sm font-semibold text-[var(--color-primary)]">{selectedIds.size} data terpilih</span>
                        <div className="flex gap-2">
                            {isEditingMode ? (
                                <>
                                    <button
                                        onClick={handleSaveBulkEdit}
                                        disabled={isLoading}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary)]/90 text-sm font-medium"
                                    >
                                        <SuccessIcon className="w-4 h-4" /> Simpan
                                    </button>
                                    <button
                                        onClick={handleCancelEdit}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm font-medium"
                                    >
                                        <CloseIcon className="w-4 h-4" /> Batal
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={handleStartBulkEdit}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-medium"
                                    >
                                        <EditIcon className="w-4 h-4" /> Edit ({selectedIds.size})
                                    </button>
                                    <button
                                        onClick={handleBulkDelete}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-medium"
                                    >
                                        <TrashIcon className="w-4 h-4" /> Hapus ({selectedIds.size})
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-sm overflow-x-auto">
                    <table className="w-full text-sm text-left min-w-[800px]">
                        <thead className="text-xs uppercase bg-[var(--color-background)] text-[var(--color-text-secondary)]">
                            <tr>
                                <th className="px-4 py-3 w-10 text-center">
                                    <input
                                        type="checkbox"
                                        checked={filteredHistoryData.length > 0 && selectedIds.size === filteredHistoryData.length}
                                        onChange={handleSelectAll}
                                        disabled={isEditingMode}
                                        className="rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                                    />
                                </th>
                                <th className="px-4 py-3">Tanggal</th>
                                {userRole === 'Direktor' && <th className="px-4 py-3">Diinput Oleh</th>}
                                <th className="px-4 py-3">ID Bitrix</th>
                                <th className="px-4 py-3">Nama</th>
                                <th className="px-4 py-3">No. Telp</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Keterangan</th>
                                <th className="px-4 py-3 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredHistoryData.length === 0 && (
                                <tr>
                                    <td colSpan={userRole === 'Direktor' ? 9 : 8} className="text-center py-8 text-[var(--color-text-secondary)] border-dashed">
                                        Belum ada data laporan.
                                    </td>
                                </tr>
                            )}
                            {filteredHistoryData.map((item: any) => (
                                <tr key={item.id} className={`border-b border-[var(--color-border)] hover:bg-[var(--color-background)] transition-colors ${selectedIds.has(item.id) ? 'bg-[var(--color-primary)]/5' : ''}`}>
                                    <td className="px-4 py-3 text-center">
                                        <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => handleSelectRow(item.id)} disabled={isEditingMode} className="rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]" />
                                    </td>
                                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                                        {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                    {userRole === 'Direktor' && (
                                        <td className="px-4 py-3 text-[var(--color-text-secondary)]">{userMap[item.user_id] || item.user_id}</td>
                                    )}
                                    <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{item.id_bitrix || '-'}</td>
                                    <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{item.nama}</td>
                                    <td className="px-4 py-3 text-[var(--color-text-secondary)] font-mono">{item.no_telp}</td>
                                    <td className="px-4 py-3"><span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">{item.status || '-'}</span></td>
                                    <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)] max-w-xs truncate">{item.keterangan || '-'}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => setSelectedItem(item)} className="text-[var(--color-primary)] hover:underline text-xs font-medium">
                                            Detail
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="bg-[var(--color-surface)] rounded-xl shadow-xl border border-[var(--color-border)] w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-surface)] rounded-t-xl">
                            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Detail Laporan</h2>
                            <button
                                onClick={() => setSelectedItem(null)}
                                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {userRole === 'Direktor' && (
                                <div>
                                    <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">Diinput Oleh</label>
                                    <p className="text-[var(--color-text-primary)] font-medium">{userMap[selectedItem.user_id] || selectedItem.user_id}</p>
                                </div>
                            )}
                            <div>
                                <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">ID Bitrix</label>
                                <p className="text-[var(--color-text-primary)] font-mono">{selectedItem.id_bitrix || '-'}</p>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">Nama</label>
                                <p className="text-[var(--color-text-primary)] font-medium text-lg">{selectedItem.nama}</p>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">No. Telp</label>
                                <p className="text-[var(--color-text-primary)] font-mono">{selectedItem.no_telp}</p>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">Status</label>
                                <p className="text-[var(--color-text-primary)]">{selectedItem.status || '-'}</p>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">Keterangan</label>
                                <p className="text-[var(--color-text-primary)] whitespace-pre-wrap">{selectedItem.keterangan || '-'}</p>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">Tanggal Submit</label>
                                <p className="text-[var(--color-text-primary)]">
                                    {new Date(selectedItem.created_at).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
                                </p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-[var(--color-border)] bg-[var(--color-surface)] rounded-b-xl flex justify-end">
                            <button
                                onClick={() => setSelectedItem(null)}
                                className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors shadow-sm font-medium"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isInputModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="bg-[var(--color-surface)] rounded-xl shadow-xl border border-[var(--color-border)] w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-surface)] sticky top-0 z-10">
                            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Input Data Baru</h2>
                            <button
                                onClick={() => setIsInputModalOpen(false)}
                                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left min-w-[800px]">
                                    <thead className="text-xs uppercase bg-[var(--color-background)] text-[var(--color-text-secondary)]">
                                        <tr>
                                            <th className="px-4 py-3 rounded-l-lg w-12 text-center">No</th>
                                            <th className="px-4 py-3">ID Bitrix</th>
                                            <th className="px-4 py-3">Nama</th>
                                            <th className="px-4 py-3">No. Telp</th>
                                            <th className="px-4 py-3 w-32">Status</th>
                                            <th className="px-4 py-3">Keterangan</th>
                                            <th className="px-4 py-3 rounded-r-lg w-16 text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {entries.map((entry: any, index: number) => (
                                            <tr key={index} className="border-b border-[var(--color-border)] hover:bg-[var(--color-background)] transition-colors">
                                                <td className="px-4 py-2 font-medium text-center">{index + 1}</td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="text"
                                                        value={entry.id_bitrix}
                                                        onChange={(e) => handleEntryChange(index, 'id_bitrix', e.target.value)}
                                                        className="w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-[var(--color-text-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none"
                                                        placeholder="ID Bitrix"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="text"
                                                        value={entry.nama}
                                                        onChange={(e) => handleEntryChange(index, 'nama', e.target.value)}
                                                        className="w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-[var(--color-text-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none"
                                                        placeholder="Nama"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="tel"
                                                        value={entry.no_telp}
                                                        onChange={(e) => handleEntryChange(index, 'no_telp', e.target.value)}
                                                        className="w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-[var(--color-text-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none"
                                                        placeholder="No. Telp"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <select
                                                        value={entry.status}
                                                        onChange={(e) => handleEntryChange(index, 'status', e.target.value)}
                                                        className="w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-[var(--color-text-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none"
                                                    >
                                                        <option value="">Pilih Status</option>
                                                        <option value="Prospek">Prospek</option>
                                                        <option value="Tidak Prospek">Tidak Prospek</option>
                                                    </select>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="text"
                                                        value={entry.keterangan}
                                                        onChange={(e) => handleEntryChange(index, 'keterangan', e.target.value)}
                                                        className="w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-[var(--color-text-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none"
                                                        placeholder="Keterangan"
                                                    />
                                                </td>
                                                <td className="px-4 py-2 text-center">
                                                    <button
                                                        onClick={() => handleRemoveRow(index)}
                                                        className="text-red-500 hover:text-red-700 w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 transition-colors"
                                                        title="Hapus Baris"
                                                    >
                                                        ✕
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 flex justify-between items-center">
                                <button
                                    onClick={handleAddRow}
                                    className="text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 font-medium text-sm flex items-center px-3 py-2 rounded hover:bg-[var(--color-surface)] border border-transparent hover:border-[var(--color-border)] transition-all"
                                >
                                    <span className="mr-1 text-lg">+</span> Tambah Baris
                                </button>
                            </div>
                        </div>
                        <div className="p-6 border-t border-[var(--color-border)] bg-[var(--color-surface)] rounded-b-xl flex justify-end gap-3">
                            <button
                                onClick={() => setIsInputModalOpen(false)}
                                className="px-6 py-2 bg-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--color-interactive)] transition-colors font-medium"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isLoading}
                                className={`px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors shadow-sm font-medium ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isLoading ? 'Menyimpan...' : 'Simpan Semua Data'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LaporanBitrixView;
