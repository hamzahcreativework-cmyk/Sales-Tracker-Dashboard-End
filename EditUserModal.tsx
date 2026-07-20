import React, { useState, useEffect } from 'react';
import { ManagedUser, UserRole } from './types';
import { CloseIcon } from './Icons';
import type { User } from '@supabase/supabase-js';
import { VENUES } from './constants';


interface EditUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (user: { id: string; name: string; role: UserRole; assigned_venue: string | null; }) => void;
    user: ManagedUser | null;
    isSaving: boolean;
    currentUser: User | null;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, onSave, user, isSaving, currentUser }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<UserRole>('User');
    const [assignedVenue, setAssignedVenue] = useState<string>('');

    useEffect(() => {
        if (user) {
            setName(user.name);
            setEmail(user.email);
            setRole(user.role);
            setAssignedVenue(user.assigned_venue || '');
        }
    }, [user]);

    if (!isOpen || !user) return null;
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() === '') {
            alert('Nama harus diisi.');
            return;
        }
        
        onSave({ id: user.id, name, role, assigned_venue: assignedVenue || null });
    };
    
    const handleClose = () => {
        if (isSaving) return;
        onClose();
    }
    
    const isEditingSelf = currentUser?.id === user.id;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 fade-in">
            <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl max-w-md w-full p-6 sm:p-8 relative border border-[var(--color-border)]">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Edit User</h2>
                        <p className="text-md text-[var(--color-text-secondary)]">{user.name}</p>
                    </div>
                    <button onClick={handleClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] p-2 rounded-full hover:bg-white/10 transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="editUserName" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Nama Lengkap</label>
                            <input
                                type="text"
                                id="editUserName"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 form-input"
                                placeholder="Masukkan nama lengkap"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="editUserEmail" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Email</label>
                            <input
                                type="email"
                                id="editUserEmail"
                                value={email}
                                readOnly
                                className="w-full px-3 py-2 form-input bg-slate-100/10 cursor-not-allowed"
                                title="Email tidak dapat diubah."
                            />
                        </div>
                        <div>
                            <label htmlFor="editUserRole" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Role</label>
                            <select
                                id="editUserRole"
                                value={role}
                                onChange={(e) => setRole(e.target.value as UserRole)}
                                className="w-full px-3 py-2 form-select disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isEditingSelf}
                                title={isEditingSelf ? "Anda tidak dapat mengubah role Anda sendiri." : "Pilih role"}
                            >
                                <option value="User">User (Hanya Lihat)</option>
                                <option value="Manager">Manager (Edit & Tambah)</option>
                                <option value="Admin">Admin (Full Access)</option>
                                <option value="Direktor">Direktor</option>
                                <option value="IT">IT</option>
                            </select>
                             {isEditingSelf && <p className="text-xs text-[var(--color-text-secondary)] mt-1">Anda tidak dapat mengubah role Anda sendiri.</p>}
                        </div>
                        <div>
                            <label htmlFor="editAssignedVenue" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Tetapkan Venue</label>
                            <select
                                id="editAssignedVenue"
                                value={assignedVenue}
                                onChange={(e) => setAssignedVenue(e.target.value)}
                                className="w-full px-3 py-2 form-select"
                            >
                                <option value="">Semua Venue (Akses Penuh)</option>
                                {VENUES.map(venue => (
                                    <option key={venue.name} value={venue.name}>{venue.name}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Venue restriction hanya berlaku untuk role 'User' (read-only access).</p>
                        </div>
                    </div>
                    
                    <div className="flex space-x-4 mt-8">
                        <button 
                            type="button" 
                            onClick={handleClose} 
                            className="flex-1 px-4 py-2.5 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-xl hover:bg-white/5 font-semibold transition-colors disabled:opacity-50"
                            disabled={isSaving}
                        >
                            Batal
                        </button>
                        <button 
                            type="submit" 
                            className="flex-1 px-4 py-2.5 btn-primary disabled:opacity-50"
                            disabled={isSaving}
                        >
                            {isSaving ? 'Menyimpan...' : 'Update User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditUserModal;
