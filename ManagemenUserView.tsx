import React, { useState, useMemo, useEffect } from 'react';
import { ManagedUser, UserRole } from './types';
import { PlusIcon, TrashIcon, EditIcon, SearchIcon } from './Icons';
import { supabase } from './supabaseClient';
import AddUserModal from './AddUserModal';
import EditUserModal from './EditUserModal';
import { FunctionsHttpError, FunctionsFetchError, User } from '@supabase/supabase-js';

const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
    const roleClasses = role === 'Admin'
        ? 'bg-violet-400/10 text-violet-300'
        : role === 'Direktor'
        ? 'bg-sky-400/10 text-sky-300'
        : role === 'IT'
        ? 'bg-emerald-400/10 text-emerald-300'
        : 'bg-gray-400/10 text-gray-300';
    
    return (
        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${roleClasses}`}>
            {role}
        </span>
    );
};


const ManagemenUserView: React.FC<{ userRole: UserRole }> = ({ userRole }) => {
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Check if user has access to manage users
    if (userRole !== 'Admin' && userRole !== 'IT') {
        return (
            <div className="card p-6 text-center">
                <h1 className="text-2xl font-bold text-red-500">Akses Ditolak</h1>
                <p className="text-[var(--color-text-secondary)] mt-2">Anda tidak memiliki izin untuk mengelola user.</p>
            </div>
        );
    }

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const { data, error: functionError } = await supabase.functions.invoke('list-users');

            if (functionError) {
                throw new Error(functionError.message || 'Fungsi mengembalikan payload error.');
            }
            
            if (!data || !Array.isArray(data.users)) {
                throw new Error("Format respons tidak valid dari Edge Function. Seharusnya objek dengan array 'users'.");
            }

            const mappedUsers = data.users.map((user: any) => ({
                id: user.id,
                name: user.user_metadata?.full_name || 'No Name Provided',
                email: user.email,
                role: user.user_metadata?.role || 'User',
                last_sign_in_at: user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('id-ID') : 'Never',
                avatar_url: user.user_metadata?.avatar_url || `https://i.pravatar.cc/150?u=${user.email}`,
                assigned_venue: user.assigned_venue || null,
            }));
            setUsers(mappedUsers);

        } catch (error) {
            console.error("Full error object from invoke:", error);
            let alertTitle = "Gagal Memuat Data User";
            let alertDetails = "Terjadi kesalahan yang tidak diketahui.";

            if (error instanceof FunctionsHttpError) {
                try {
                    const errorJson = await error.context.json();
                    alertDetails = errorJson.error || `Server Error: ${error.context.status} ${error.context.statusText}`;
                } catch (e) {
                    alertDetails = `Server Error: ${error.context.status} ${error.context.statusText}`;
                }
                alertDetails += "\n\nIni adalah error dari sisi server. Pastikan Anda memiliki role 'Admin' dan periksa kode Edge Function Anda.";

            } else if (error instanceof FunctionsFetchError) {
                console.error("Original fetch error context:", error.context);
                alertTitle = "Gagal Terhubung ke Server";
                alertDetails = "Aplikasi web tidak dapat mengirim permintaan ke Edge Function. Ini biasanya disebabkan oleh masalah konfigurasi, bukan bug pada aplikasi.\n\n" +
                               "Kemungkinan Penyebab:\n" +
                               "1. Masalah CORS: Pastikan Edge Function Anda sudah menangani pre-flight 'OPTIONS' request.\n" +
                               "2. Fungsi Belum Di-deploy: Pastikan Edge Function `list-users` sudah berhasil di-deploy.\n" +
                               "3. Masalah Jaringan: Periksa koneksi internet Anda.\n\n" +
                               `Pesan Error Asli: ${error.message}`;

            } else if (error instanceof Error) {
                alertDetails = error.message;
            }
            
            console.error("Error fetching users:", alertDetails);
            alert(`${alertTitle}\n\n${alertDetails}\n\nTips: Periksa log Edge Function di dashboard Supabase untuk diagnosis lebih lanjut.`);
            setUsers([]);
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);
            await fetchUsers();
        };
        init();
    }, []);

    const handleAddUser = async (newUser: { name: string, email: string, password: string, role: UserRole, assigned_venue: string }) => {
        setIsSaving(true);
        try {
            const { error: functionError } = await supabase.functions.invoke('create-user', {
                body: {
                    email: newUser.email,
                    password: newUser.password,
                    full_name: newUser.name,
                    role: newUser.role,
                    assigned_venue: newUser.assigned_venue || null,
                },
            });

            if (functionError) {
                throw new Error(functionError.message || "Edge function mengembalikan payload error.");
            }
            
            alert("User berhasil ditambahkan!");
            await fetchUsers(); // Refresh the user list
            setIsAddModalOpen(false);

        } catch (error) {
            console.error("Full error object from create-user invoke:", error);
            let alertTitle = "Gagal Menambahkan User";
            let alertDetails = "Terjadi kesalahan yang tidak diketahui.";

            if (error instanceof FunctionsHttpError) {
                try {
                    const errorJson = await error.context.json();
                    alertDetails = errorJson.error || `Server Error: ${error.context.status} ${error.context.statusText}`;
                } catch (e) {
                    alertDetails = `Server Error: ${error.context.status} ${error.context.statusText}`;
                }
                alertDetails += "\n\nIni kemungkinan error dari sisi server. Periksa kode Edge Function 'create-user' dan pastikan role Anda memiliki izin.";
            } else if (error instanceof FunctionsFetchError) {
                alertTitle = "Gagal Terhubung ke Server";
                alertDetails = "Gagal mengirim permintaan untuk membuat user. Ini bisa disebabkan oleh masalah CORS, jaringan, atau karena Edge Function 'create-user' belum di-deploy.";
                alertDetails += `\n\nPesan Error Asli: ${error.message}`;
            } else if (error instanceof Error) {
                alertDetails = error.message;
            }

            alert(`${alertTitle}\n\n${alertDetails}\n\nTips: Periksa log Edge Function 'create-user' di dashboard Supabase untuk diagnosis lebih lanjut.`);
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleUpdateUser = async (updatedData: { id: string; name: string; role: UserRole, assigned_venue: string | null; }) => {
        setIsSavingEdit(true);
        try {
            const { error: functionError } = await supabase.functions.invoke('update-user', {
                body: {
                    userId: updatedData.id,
                    full_name: updatedData.name,
                    role: updatedData.role,
                    assigned_venue: updatedData.assigned_venue || null,
                },
            });

            if (functionError) {
                throw new Error(functionError.message || "Edge function returned an error payload.");
            }

            alert("User updated successfully!");
            setUsers(users.map(u => u.id === updatedData.id ? { ...u, name: updatedData.name, role: updatedData.role, assigned_venue: updatedData.assigned_venue } : u));
            setEditingUser(null);

        } catch (error) {
            console.error("Full error object from update-user invoke:", error);
            let alertTitle = "Failed to Update User";
            let alertDetails = "An unknown error occurred.";

            if (error instanceof FunctionsHttpError) {
                 try {
                    const errorJson = await error.context.json();
                    alertDetails = errorJson.error || `Server Error: ${error.context.status} ${error.context.statusText}`;
                } catch (e) {
                    alertDetails = `Server Error: ${error.context.status} ${error.context.statusText}`;
                }
            } else if (error instanceof FunctionsFetchError) {
                 alertDetails = `Could not connect to the server. This might be a CORS or network issue. Original message: ${error.message}`;
            } else if (error instanceof Error) {
                alertDetails = error.message;
            }
            
            alert(`${alertTitle}\n\n${alertDetails}\n\nTips: Check the 'update-user' Edge Function logs in your Supabase dashboard for more details.`);
        } finally {
            setIsSavingEdit(false);
        }
    };
    
    const handleDeleteUser = async (userId: string, userName: string) => {
        if (window.confirm(`Apakah Anda yakin ingin menghapus user "${userName}"? Tindakan ini tidak dapat dibatalkan.`)) {
            try {
                const { error: functionError } = await supabase.functions.invoke('delete-user', {
                    body: { userId },
                });
    
                if (functionError) {
                    throw new Error(functionError.message || 'Fungsi mengembalikan payload error.');
                }
    
                alert(`User "${userName}" telah berhasil dihapus.`);
                setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
    
            } catch (error) {
                console.error("Full error object from delete-user invoke:", error);
                let alertTitle = "Gagal Menghapus User";
                let alertDetails = "Terjadi kesalahan yang tidak diketahui.";
    
                if (error instanceof FunctionsHttpError) {
                    try {
                        const errorJson = await error.context.json();
                        alertDetails = errorJson.error || `Server Error: ${error.context.status} ${error.context.statusText}`;
                    } catch (e) {
                        alertDetails = `Server Error: ${error.context.status} ${error.context.statusText}`;
                    }
                    alertDetails += "\n\nIni adalah error dari sisi server. Pastikan Anda memiliki role 'Admin' dan periksa kode Edge Function 'delete-user' Anda.";
                } else if (error instanceof FunctionsFetchError) {
                    alertTitle = "Gagal Terhubung ke Server";
                    alertDetails = "Aplikasi web tidak dapat mengirim permintaan ke Edge Function 'delete-user'. Ini biasanya disebabkan oleh masalah konfigurasi (CORS, fungsi belum di-deploy) atau masalah jaringan.";
                    alertDetails += `\n\nPesan Error Asli: ${error.message}`;
                } else if (error instanceof Error) {
                    alertDetails = error.message;
                }
                
                alert(`${alertTitle}\n\n${alertDetails}\n\nTips: Periksa log Edge Function di dashboard Supabase untuk diagnosis lebih lanjut.`);
            }
        }
    };
    
    const filteredUsers = useMemo(() => {
        if (!searchTerm) return users;
        return users.filter(user =>
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    return (
        <div className="fade-in">
            <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">Manajemen User</h1>
            </div>

            <div className="card p-4 sm:p-6">
                 <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative w-full sm:max-w-xs">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                             <SearchIcon className="w-5 h-5 text-[var(--color-text-secondary)]" />
                        </div>
                        <input
                            type="search"
                            placeholder="Cari user..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full form-input py-2.5 pl-10"
                        />
                    </div>
                    {(userRole === 'Admin' || userRole === 'IT') && (
                        <button 
                            onClick={() => setIsAddModalOpen(true)}
                            className="btn-primary py-2.5 px-5 flex items-center justify-center"
                        >
                            <PlusIcon className="w-5 h-5 mr-2" />
                            Tambah User
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[var(--color-text-secondary)]">
                                <th className="p-3 sm:p-4 font-semibold text-sm">User</th>
                                <th className="p-3 sm:p-4 font-semibold text-sm">Role</th>
                                <th className="p-3 sm:p-4 font-semibold text-sm">Venue Ditetapkan</th>
                                <th className="p-3 sm:p-4 font-semibold text-sm">Last Sign In</th>
                                {(userRole === 'Admin' || userRole === 'IT') && <th className="p-3 sm:p-4 font-semibold text-sm text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={(userRole === 'Admin' || userRole === 'IT') ? 5 : 4} className="text-center p-16">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)] mx-auto"></div>
                                        <p className="mt-4 text-[var(--color-text-secondary)]">Memuat data user...</p>
                                    </td>
                                </tr>
                            ) : filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <tr
                                        key={user.id}
                                        className="border-t border-[var(--color-border)] hover:bg-white/5"
                                    >
                                        <td className="p-3 sm:p-4">
                                            <div className="flex items-center gap-4">
                                                <img src={user.avatar_url} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                                                <div>
                                                    <div className="font-semibold text-[var(--color-text-primary)]">{user.name}</div>
                                                    <div className="text-sm text-[var(--color-text-secondary)]">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-3 sm:p-4">
                                           <RoleBadge role={user.role} />
                                        </td>
                                         <td className="p-3 sm:p-4 text-[var(--color-text-secondary)]">{user.assigned_venue || 'Semua Venue'}</td>
                                        <td className="p-3 sm:p-4 text-[var(--color-text-secondary)]">{user.last_sign_in_at}</td>
                                        {(userRole === 'Admin' || userRole === 'IT') && (
                                            <td className="p-3 sm:p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setEditingUser(user)}
                                                        className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] p-2 rounded-full hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-[var(--color-text-secondary)] disabled:hover:bg-transparent"
                                                        aria-label={`Edit ${user.name}`}
                                                        title={"Edit User"}
                                                    >
                                                        <EditIcon className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id, user.name)}
                                                        className="text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] p-2 rounded-full hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-[var(--color-text-secondary)] disabled:hover:bg-transparent"
                                                        aria-label={`Hapus ${user.name}`}
                                                        disabled={user.id === currentUser?.id}
                                                        title={user.id === currentUser?.id ? "Anda tidak dapat menghapus akun Anda sendiri" : "Hapus User"}
                                                    >
                                                        <TrashIcon className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={(userRole === 'Admin' || userRole === 'IT') ? 5 : 4} className="text-center py-16">
                                        <p className="text-[var(--color-text-secondary)]">
                                            {searchTerm ? 'Tidak ada user yang cocok dengan pencarian Anda.' : 'Tidak ada data user yang ditemukan.'}
                                        </p>
                                        {!searchTerm && (userRole === 'Admin' || userRole === 'IT') && (
                                             <button onClick={() => setIsAddModalOpen(true)} className="mt-4 text-[var(--color-primary)] font-semibold hover:underline">
                                                Tambah User Baru
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
             </div>
             <AddUserModal 
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSave={handleAddUser}
                isSaving={isSaving}
            />
             <EditUserModal 
                isOpen={!!editingUser}
                onClose={() => setEditingUser(null)}
                onSave={handleUpdateUser}
                user={editingUser}
                isSaving={isSavingEdit}
                currentUser={currentUser}
            />
        </div>
    );
};

export default ManagemenUserView;
