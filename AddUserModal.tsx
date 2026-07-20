import React, { useState } from 'react';
import { ManagedUser, UserRole } from './types';
import { CloseIcon } from './Icons';
import { VENUES } from './constants';

interface AddUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (user: { name: string, email: string, password: string, role: UserRole, assigned_venue: string }) => void;
    isSaving: boolean;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose, onSave, isSaving }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>('User');
    const [assignedVenue, setAssignedVenue] = useState('');

    if (!isOpen) return null;
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() === '' || email.trim() === '' || password.trim() === '') {
            alert('Nama, Email, dan Password harus diisi.');
            return;
        }
         if (password.length < 6) {
            alert('Password minimal harus 6 karakter.');
            return;
        }
        
        onSave({ name, email, password, role, assigned_venue: assignedVenue });
    };
    
    const handleClose = () => {
        if (isSaving) return;
        setName('');
        setEmail('');
        setPassword('');
        setRole('User');
        setAssignedVenue('');
        onClose();
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 fade-in">
            <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl max-w-md w-full p-6 sm:p-8 relative border border-[var(--color-border)]">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Tambah User Baru</h2>
                    </div>
                    <button onClick={handleClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] p-2 rounded-full hover:bg-white/10 transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="userName" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Nama Lengkap</label>
                            <input
                                type="text"
                                id="userName"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 form-input"
                                placeholder="Masukkan nama lengkap"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="userEmail" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Email</label>
                            <input
                                type="email"
                                id="userEmail"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-3 py-2 form-input"
                                placeholder="user@example.com"
                                required
                            />
                        </div>
                         <div>
                            <label htmlFor="userPassword" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Password</label>
                            <input
                                type="password"
                                id="userPassword"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 form-input"
                                placeholder="Minimal 6 karakter"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="userRole" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Role</label>
                            <select
                                id="userRole"
                                value={role}
                                onChange={(e) => setRole(e.target.value as UserRole)}
                                className="w-full px-3 py-2 form-select"
                            >
                                <option value="User">User (Hanya Lihat)</option>
                                <option value="Manager">Manager (Edit & Tambah)</option>
                                <option value="Admin">Admin (Full Access)</option>
                                <option value="Direktor">Direktor</option>
                                <option value="IT">IT</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="assignedVenue" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Tetapkan Venue</label>
                            <select
                                id="assignedVenue"
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
                            {isSaving ? 'Menyimpan...' : 'Simpan User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddUserModal;
