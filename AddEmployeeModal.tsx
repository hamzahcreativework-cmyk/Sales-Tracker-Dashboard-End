import React, { useState } from 'react';
import { MarketingPerson, MarketingRole } from './types';
import { CloseIcon } from './Icons';

interface AddEmployeeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (employee: Omit<MarketingPerson, 'id' | 'venueName'>) => void;
    venueName: string;
}

const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({ isOpen, onClose, onSave, venueName }) => {
    const [name, setName] = useState('');
    const [role, setRole] = useState<MarketingRole>('Marketing');

    if (!isOpen) return null;
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() === '') {
            alert('Nama tidak boleh kosong.');
            return;
        }
        
        const newEmployee: Omit<MarketingPerson, 'id' | 'venueName'> = {
            name: name.trim(),
            role: role
        };
        
        onSave(newEmployee);
        setName('');
        setRole('Marketing');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 fade-in">
            <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl max-w-md w-full p-6 sm:p-8 relative border border-[var(--color-border)]">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Tambah Karyawan</h2>
                        <p className="text-md text-[var(--color-text-secondary)]">Untuk Venue: {venueName}</p>
                    </div>
                    <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] p-2 rounded-full hover:bg-white/10 transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="employeeName" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Nama Karyawan</label>
                            <input
                                type="text"
                                id="employeeName"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 form-input"
                                placeholder="Masukkan nama lengkap"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="employeeRole" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Jabatan</label>
                            <select
                                id="employeeRole"
                                value={role}
                                onChange={(e) => setRole(e.target.value as MarketingRole)}
                                className="w-full px-3 py-2 form-select"
                            >
                                <option value="Marketing">Marketing</option>
                                <option value="Manager Sales">Manager Sales</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="flex space-x-4 mt-8">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="flex-1 px-4 py-2.5 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-xl hover:bg-white/5 font-semibold transition-colors"
                        >
                            Batal
                        </button>
                        <button 
                            type="submit" 
                            className="flex-1 px-4 py-2.5 btn-primary"
                        >
                            Simpan Karyawan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddEmployeeModal;
