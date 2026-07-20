import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import type { User } from '@supabase/supabase-js';

const ProfileView: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Feedback state
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const fetchUser = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                setFullName(user.user_metadata?.full_name || '');
                setEmail(user.email || '');
            }
            setLoading(false);
        };
        fetchUser();
    }, []);
    
    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) {
            return;
        }
        if (!user) {
            setError('User not found. Cannot upload avatar.');
            return;
        }

        const file = e.target.files[0];
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file.');
            return;
        }

        setIsUploading(true);
        setError('');
        setSuccess('');

        const filePath = `public/${user.id}`; // Stable path to allow overwriting

        // Upload new avatar
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, {
                upsert: true, // Overwrite existing file
            });

        if (uploadError) {
            setError(`Failed to upload avatar: ${uploadError.message}`);
            setIsUploading(false);
            return;
        }

        // Get public URL
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);

        if (!urlData.publicUrl) {
            setError('Could not get public URL for the new avatar.');
            setIsUploading(false);
            return;
        }

        // Add a cache-busting parameter to the URL to ensure the browser fetches the new image.
        const newAvatarUrl = `${urlData.publicUrl}?t=${new Date().getTime()}`;

        // Update user metadata
        const { data: updatedUserData, error: updateError } = await supabase.auth.updateUser({
            data: { avatar_url: newAvatarUrl },
        });

        if (updateError) {
            setError(`Failed to update profile: ${updateError.message}`);
        } else {
            setSuccess('Avatar updated successfully!');
            // Refresh user state to show new avatar
            if (updatedUserData.user) {
                setUser(updatedUserData.user);
            }
        }
        
        setIsUploading(false);
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsSaving(true);

        if (password && password !== confirmPassword) {
            setError('Passwords do not match.');
            setIsSaving(false);
            return;
        }

        const updates: { email?: string; password?: string; data?: { [key: string]: any } } = {};
        let needsUpdate = false;

        if (email !== user?.email) {
            updates.email = email;
            needsUpdate = true;
        }
        if (fullName !== user?.user_metadata?.full_name) {
            updates.data = { ...user?.user_metadata, full_name: fullName };
            needsUpdate = true;
        }
        if (password) {
            updates.password = password;
            needsUpdate = true;
        }

        if (!needsUpdate) {
            setSuccess('No changes to save.');
            setIsSaving(false);
            return;
        }

        const { data: updatedUser, error: updateError } = await supabase.auth.updateUser(updates);

        if (updateError) {
            setError(updateError.message);
        } else {
            setSuccess('Profile updated successfully!');
            // Refresh user state
            if (updatedUser.user) {
                setUser(updatedUser.user);
                setFullName(updatedUser.user.user_metadata?.full_name || '');
                setEmail(updatedUser.user.email || '');
                setPassword('');
                setConfirmPassword('');
            }
        }

        setIsSaving(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-primary)]"></div>
                <p className="ml-4 text-[var(--color-text-secondary)]">Loading Profile...</p>
            </div>
        );
    }
    
    if (!user) {
        return <p>Could not load user profile.</p>;
    }
    
    const avatarUrl = user?.user_metadata?.avatar_url || `https://i.pravatar.cc/150?u=${user.email}`;

    return (
        <div className="fade-in max-w-4xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] mb-6">My Profile</h1>
            <div className="card p-6 md:p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 border-b border-[var(--color-border)] pb-8">
                        <div className="relative w-24 h-24">
                            <img src={avatarUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover" />
                            {isUploading && (
                                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                                </div>
                            )}
                        </div>
                        <div className="text-center sm:text-left">
                            <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">{fullName}</h2>
                            <p className="text-[var(--color-text-secondary)]">{user.email}</p>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="mt-3 text-sm font-semibold text-[var(--color-primary)] hover:underline disabled:opacity-50"
                                disabled={isUploading}
                            >
                                {isUploading ? 'Uploading...' : 'Change Photo'}
                            </button>
                             <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleAvatarChange}
                                style={{ display: 'none' }} 
                                accept="image/png, image/jpeg, image/gif"
                                disabled={isUploading}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="fullName" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Full Name</label>
                            <input
                                id="fullName"
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full form-input py-3 px-4"
                                placeholder="Enter your full name"
                            />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Email Address</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full form-input py-3 px-4"
                                placeholder="Enter your email address"
                            />
                        </div>
                    </div>

                    <div className="border-t border-[var(--color-border)] pt-8">
                        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">Change Password</h3>
                        <p className="text-sm text-[var(--color-text-secondary)] mb-4">Leave blank to keep your current password.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="password"className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">New Password</label>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full form-input py-3 px-4"
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                />
                            </div>
                            <div>
                                <label htmlFor="confirmPassword"className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Confirm New Password</label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full form-input py-3 px-4"
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                />
                            </div>
                        </div>
                    </div>
                    
                    {error && <p className="text-sm text-center text-red-500 bg-red-500/10 p-3 rounded-lg">{error}</p>}
                    {success && <p className="text-sm text-center text-green-500 bg-green-500/10 p-3 rounded-lg">{success}</p>}

                    <div className="flex justify-end pt-4 border-t border-[var(--color-border)]">
                        <button
                            type="submit"
                            className="btn-primary py-3 px-8 disabled:opacity-70 disabled:cursor-not-allowed"
                            disabled={isSaving}
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfileView;
