import React, { useState, useEffect } from 'react';
import { UserRole } from './types';
import { supabase } from './supabaseClient';
import { TrashIcon, EditIcon, CloseIcon, SuccessIcon } from './Icons';

interface MarketingViewProps {
    userRole: UserRole;
    assignedVenue: string | null;
}

type TabType = 'bank_database' | 'referal' | 'venue_only_ph';

const MarketingView: React.FC<MarketingViewProps> = ({ userRole, assignedVenue }) => {
    const [activeTab, setActiveTab] = useState<TabType>('bank_database');
    const [isLoading, setIsLoading] = useState(false);
    const [userName, setUserName] = useState<string>('');

    // Form States (Bulk Entry)
    const createEmptyEntry = () => ({
        client_name: '',
        client_phone: '',
        vendor_name: '',
        status: 'Prospek'
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
                    // Attempt to use secure RPC function first
                    const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_names');

                    if (!rpcError && rpcData) {
                        const map: Record<string, string> = {};
                        rpcData.forEach((u: any) => {
                            map[u.id] = u.name || u.email || 'Unknown';
                        });
                        setUserMap(map);
                        return; // Successfully loaded from RPC
                    }

                    // Fallback to Edge Function (allows legacy support)
                    console.log('RPC get_user_names failed, falling back to list-users edge function');
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
                .from('marketing_clients_status')
                .select('*')
                .eq('category', activeTab)
                .order('created_at', { ascending: false });

            // Only filter by user_id if NOT Direktor
            if (userRole !== 'Direktor') {
                query = query.eq('user_id', user.id);
            }

            if (startDate) query = query.gte('submission_date', startDate);
            if (endDate) query = query.lte('submission_date', endDate);

            const { data, error } = await query;
            if (error) throw error;
            setHistoryData(data || []);
            // Reset selection on data refresh
            setSelectedIds(new Set());
            setEditingIds(new Set());
        } catch (error: any) {
            console.error('Error fetching history:', error);
        }
    };

    useEffect(() => {
        fetchHistory();
        // Reset selection when filters change
        setSelectedIds(new Set());
        setEditingIds(new Set());
    }, [activeTab, startDate, endDate, userRole]); // Added userRole dependency

    // Reset form when tab changes
    useEffect(() => {
        setEntries(Array.from({ length: 10 }, createEmptyEntry));
    }, [activeTab]);

    const handleEntryChange = (index: number, field: string, value: string) => {
        const newEntries = [...entries];
        newEntries[index] = { ...newEntries[index], [field]: value };
        setEntries(newEntries);
    };

    const handleAddRow = () => {
        setEntries([...entries, createEmptyEntry()]);
    };

    const handleRemoveRow = (index: number) => {
        const newEntries = entries.filter((_, i) => i !== index);
        setEntries(newEntries);
    };

    const handleSave = async () => {
        // Filter entries that have at least a name or phone
        const validEntries = entries.filter(e => e.client_name?.trim() || e.client_phone?.trim());

        if (validEntries.length === 0) {
            alert('Mohon isi setidaknya satu data (Nama atau No. Telepon)');
            return;
        }

        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const payload = validEntries.map(entry => ({
                user_id: user.id,
                category: activeTab,
                client_name: entry.client_name,
                client_phone: entry.client_phone,
                status: entry.status,
                vendor_name: activeTab === 'venue_only_ph' ? entry.vendor_name : null,
                submission_date: new Date().toISOString().split('T')[0]
            }));

            const { error } = await supabase.from('marketing_clients_status').insert(payload);

            if (error) throw error;
            alert(`${validEntries.length} data berhasil disimpan!`);

            // Reset form to 10 empty rows
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

    // Bulk Action Handlers
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(historyData.map(d => d.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectRow = (id: string) => {
        if (isEditingMode) return; // Disable selection change during edit
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
                .from('marketing_clients_status')
                .delete()
                .in('id', Array.from(selectedIds));

            if (error) throw error;
            alert('Data berhasil dihapus');
            fetchHistory(); // will verify reset selection
        } catch (error: any) {
            alert('Gagal hapus: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartBulkEdit = () => {
        setEditingIds(new Set(selectedIds));
        const initialValues: Record<string, any> = {};
        selectedIds.forEach(id => {
            const item = historyData.find(d => d.id === id);
            if (item) initialValues[id] = { ...item };
        });
        setEditValues(initialValues);
    };

    const handleCancelEdit = () => {
        setEditingIds(new Set());
        setEditValues({});
    };

    const handleEditValueChange = (id: string, field: string, value: string) => {
        setEditValues(prev => ({
            ...prev,
            [id]: { ...prev[id], [field]: value }
        }));
    };

    const handleSaveBulkEdit = async () => {
        setIsLoading(true);
        try {
            const updates = Object.values(editValues).map(item => ({
                id: item.id,
                user_id: item.user_id,
                category: item.category,
                client_name: item.client_name,
                client_phone: item.client_phone,
                vendor_name: item.vendor_name,
                status: item.status,
                submission_date: item.submission_date
            }));

            const { error } = await supabase.from('marketing_clients_status').upsert(updates);
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

    // Filter data based on search query
    const filteredHistoryData = historyData.filter(item => {
        const searchLower = searchQuery.toLowerCase();
        return (
            (item.client_name?.toLowerCase().includes(searchLower) || false) ||
            (item.client_phone?.toLowerCase().includes(searchLower) || false) ||
            (item.vendor_name?.toLowerCase().includes(searchLower) || false) ||
            (item.status?.toLowerCase().includes(searchLower) || false)
        );
    });

    const getTabLabel = (tab: TabType) => {
        switch (tab) {
            case 'bank_database': return 'Bank Database';
            case 'referal': return 'Referal';
            case 'venue_only_ph': return 'Venue Only Public Holiday';
            default: return '';
        }
    };

    return (
        <div className="fade-in space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                    Marketing Menu {assignedVenue ? `- ${assignedVenue}` : ''}
                </h1>
                <button
                    onClick={() => setIsInputModalOpen(true)}
                    className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors shadow-sm font-medium flex items-center gap-2"
                >
                    <span className="text-lg">+</span> Tambah Data
                </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-4 border-b border-[var(--color-border)] overflow-x-auto">
                {(['bank_database', 'referal', 'venue_only_ph'] as TabType[]).map((tab) => (
                    <button
                        key={tab}
                        className={`pb-2 px-4 font-semibold text-sm whitespace-nowrap transition-colors ${activeTab === tab ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {getTabLabel(tab)}
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Riwayat {getTabLabel(activeTab)}</h3>
                    <div className="flex gap-2 items-center flex-wrap">
                        <input
                            type="text"
                            placeholder="Cari nama, telp, vendor..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="text-sm border border-[var(--color-border)] rounded-md px-3 py-2 bg-[var(--color-background)] text-[var(--color-text-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none w-48"
                        />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="text-sm border border-[var(--color-border)] rounded-md px-2 py-1 bg-[var(--color-background)] text-[var(--color-text-primary)]"
                        />
                        <span className="text-[var(--color-text-secondary)]">-</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="text-sm border border-[var(--color-border)] rounded-md px-2 py-1 bg-[var(--color-background)] text-[var(--color-text-primary)]"
                        />
                    </div>
                </div>

                {/* Bulk Actions Toolbar */}
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
                                {activeTab === 'venue_only_ph' && <th className="px-4 py-3">Vendor</th>}
                                <th className="px-4 py-3">Nama Client</th>
                                <th className="px-4 py-3">No. Telepon</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredHistoryData.length > 0 ? (
                                filteredHistoryData.map((item) => {
                                    const isEditing = editingIds.has(item.id);
                                    const editData = editValues[item.id] || {};

                                    return (
                                        <tr key={item.id} className={`border-b border-[var(--color-border)] hover:bg-[var(--color-background)] transition-colors ${selectedIds.has(item.id) ? 'bg-[var(--color-primary)]/5' : ''}`}>
                                            <td className="px-4 py-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(item.id)}
                                                    onChange={() => handleSelectRow(item.id)}
                                                    disabled={isEditingMode}
                                                    className="rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                                                {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </td>

                                            {userRole === 'Direktor' && (
                                                <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                                                    {userMap[item.user_id] || '-'}
                                                </td>
                                            )}

                                            {activeTab === 'venue_only_ph' && (
                                                <td className="px-4 py-3">
                                                    {isEditing ? (
                                                        <input
                                                            type="text"
                                                            value={editData.vendor_name || ''}
                                                            onChange={(e) => handleEditValueChange(item.id, 'vendor_name', e.target.value)}
                                                            className="w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-[var(--color-text-primary)]"
                                                        />
                                                    ) : (
                                                        item.vendor_name || '-'
                                                    )}
                                                </td>
                                            )}

                                            <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={editData.client_name || ''}
                                                        onChange={(e) => handleEditValueChange(item.id, 'client_name', e.target.value)}
                                                        className="w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-[var(--color-text-primary)]"
                                                    />
                                                ) : item.client_name}
                                            </td>

                                            <td className="px-4 py-3 text-[var(--color-text-secondary)] font-mono">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={editData.client_phone || ''}
                                                        onChange={(e) => handleEditValueChange(item.id, 'client_phone', e.target.value)}
                                                        className="w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-[var(--color-text-primary)]"
                                                    />
                                                ) : item.client_phone}
                                            </td>

                                            <td className="px-4 py-3">
                                                {isEditing ? (
                                                    <select
                                                        value={editData.status || 'Prospek'}
                                                        onChange={(e) => handleEditValueChange(item.id, 'status', e.target.value)}
                                                        className="w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-[var(--color-text-primary)]"
                                                    >
                                                        <option value="Prospek">Prospek</option>
                                                        <option value="Tidak Prospek">Tidak Prospek</option>
                                                    </select>
                                                ) : (
                                                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${item.status === 'Prospek' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                                                        {item.status}
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-4 py-3 text-right">
                                                {!isEditingMode && (
                                                    <button
                                                        onClick={() => setSelectedItem(item)}
                                                        className="text-[var(--color-primary)] hover:underline text-xs font-medium"
                                                    >
                                                        Detail
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={userRole === 'Direktor' ? (activeTab === 'venue_only_ph' ? 8 : 7) : (activeTab === 'venue_only_ph' ? 7 : 6)} className="text-center py-8 text-[var(--color-text-secondary)] border-dashed">
                                        Belum ada data riwayat.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="bg-[var(--color-surface)] rounded-xl shadow-xl border border-[var(--color-border)] w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-surface)] rounded-t-xl">
                            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Detail Client</h2>
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
                                <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">Kategori</label>
                                <p className="text-[var(--color-text-primary)] font-medium">{getTabLabel(selectedItem.category)}</p>
                            </div>
                            {selectedItem.vendor_name && (
                                <div>
                                    <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">Nama WO / Vendor</label>
                                    <p className="text-[var(--color-text-primary)] font-medium text-lg">{selectedItem.vendor_name}</p>
                                </div>
                            )}
                            <div>
                                <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">Nama Client</label>
                                <p className="text-[var(--color-text-primary)] font-medium text-lg">{selectedItem.client_name}</p>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">No. Telepon</label>
                                <p className="text-[var(--color-text-primary)] font-mono">{selectedItem.client_phone}</p>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">Status</label>
                                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${selectedItem.status === 'Prospek' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                                    {selectedItem.status}
                                </span>
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
                            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Input Data {getTabLabel(activeTab)}</h2>
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
                                            {activeTab === 'venue_only_ph' && <th className="px-4 py-3 w-1/4">Nama WO / Vendor</th>}
                                            <th className="px-4 py-3">Nama Client</th>
                                            <th className="px-4 py-3">No. Telepon</th>
                                            <th className="px-4 py-3 w-32">Status</th>
                                            <th className="px-4 py-3 rounded-r-lg w-16 text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {entries.map((entry, index) => (
                                            <tr key={index} className="border-b border-[var(--color-border)] hover:bg-[var(--color-background)] transition-colors">
                                                <td className="px-4 py-2 font-medium text-center">{index + 1}</td>
                                                {activeTab === 'venue_only_ph' && (
                                                    <td className="px-4 py-2">
                                                        <input
                                                            type="text"
                                                            value={entry.vendor_name}
                                                            onChange={(e) => handleEntryChange(index, 'vendor_name', e.target.value)}
                                                            className="w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-[var(--color-text-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none"
                                                            placeholder="Vendor"
                                                        />
                                                    </td>
                                                )}
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="text"
                                                        value={entry.client_name}
                                                        onChange={(e) => handleEntryChange(index, 'client_name', e.target.value)}
                                                        className="w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-[var(--color-text-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none"
                                                        placeholder="Nama Client"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="tel"
                                                        value={entry.client_phone}
                                                        onChange={(e) => handleEntryChange(index, 'client_phone', e.target.value)}
                                                        className="w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-[var(--color-text-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none"
                                                        placeholder="Telepon"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <select
                                                        value={entry.status}
                                                        onChange={(e) => handleEntryChange(index, 'status', e.target.value)}
                                                        className="w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-[var(--color-text-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none"
                                                    >
                                                        <option value="Prospek">Prospek</option>
                                                        <option value="Tidak Prospek">Tidak Prospek</option>
                                                    </select>
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

export default MarketingView;
