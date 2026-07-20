import React, { useMemo, useState, useEffect, useRef } from 'react';
import { BellIcon, SearchIcon, InfoIcon, SuccessIcon, WarningIcon, ErrorIcon, UserCircleIcon, LogoutIcon } from './Icons';
import { supabase } from './supabaseClient';
import type { User } from '@supabase/supabase-js';
import Notification from './Notification';
import { NotificationItem } from './types';
import { ActiveView } from './App';
import { Resend } from 'resend';

// Start with an empty notifications list; we'll populate from DB and realtime updates
const initialNotifications: NotificationItem[] = [];

// Initialize Resend (replace 'your-resend-api-key-here' with your actual Resend API key)
const resend = new Resend('PLACEHOLDER_RESEND_KEY');

interface HeaderProps {
    setActiveView: (view: ActiveView) => void;
    onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ setActiveView, onLogout }) => {
    const [user, setUser] = useState<User | null>(null);
    const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const notificationsRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const [assignedVenue, setAssignedVenue] = useState<string | null>(null);
    const [readNotificationIds, setReadNotificationIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        fetchUser();
    }, []);

    // After we have the auth user, fetch profile (role + assigned_venue) to apply venue-level filtering
    useEffect(() => {
        if (!user) return;
        let mounted = true;
        const fetchProfile = async () => {
            try {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('role, assigned_venue, read_notifications')
                    .eq('id', user.id)
                    .single();
                if (error) {
                    console.warn('Failed to fetch profile:', error.message);
                } else if (mounted && profile) {
                    setCurrentUserRole(profile.role || null);
                    setAssignedVenue(profile.assigned_venue || null);
                    // Load read notification IDs
                    if (profile.read_notifications && Array.isArray(profile.read_notifications)) {
                        setReadNotificationIds(new Set(profile.read_notifications.map((id: any) => Number(id))));
                    }
                }
            } catch (err) {
                console.error('Error fetching profile:', err);
            }
        };
        fetchProfile();
        return () => { mounted = false; };
    }, [user]);

    // Load recent notifications from DB (deals + comments)
    useEffect(() => {
        // run only after we know user role/assignedVenue (if any)
        if (currentUserRole === null) {
            console.log('Skipping notifications fetch - currentUserRole is null');
            return;
        }
        // Only show notifications for Direktor role
        if (currentUserRole !== 'Direktor') {
            console.log('Skipping notifications fetch - user role is not Direktor:', currentUserRole);
            return;
        }
        console.log('Fetching notifications for Direktor role');
        let mounted = true;

        const fetchInitialNotifications = async () => {
            try {
                console.log('Fetching notifications for role:', currentUserRole);
                
                // Build base deals query
                let dealsQuery = supabase
                    .from('deals')
                    .select('id, namaClient, namaVenue, jenisBooking, created_at')
                    .order('created_at', { ascending: false })
                    .limit(8);

                const { data: dealsData, error: dealsError } = await dealsQuery;
                console.log('Deals query result:', { dealsData, dealsError });
                
                if (dealsError) {
                    console.warn('Error fetching recent deals for notifications:', dealsError.message);
                }

                // Fetch recent comments (we'll filter by deal's venue for restricted users)
                const { data: commentsData, error: commentsError } = await supabase
                    .from('deal_comments')
                    .select('id, deal_id, user_name, comment, created_at')
                    .order('created_at', { ascending: false })
                    .limit(8);

                console.log('Comments query result:', { commentsData, commentsError });
                
                if (commentsError) {
                    console.warn('Error fetching recent comments for notifications:', commentsError.message);
                }

                const items: NotificationItem[] = [];

                if (dealsData && dealsData.length) {
                    for (const d of dealsData as any[]) {
                        const notificationId = Number(d.id);
                        items.push({
                            id: notificationId,
                            type: d.jenisBooking === 'Lunas' || d.jenisBooking === 'Booking' ? 'success' : 'info',
                            icon: <SuccessIcon />,
                            title: `Booking Created`,
                            message: `${d.namaClient || 'Client'} at ${d.namaVenue || ''} - Status: ${d.jenisBooking || ''}`.trim(),
                            time: d.created_at ? new Date(d.created_at).toISOString() : new Date().toISOString(),
                            dealId: notificationId,
                            isRead: readNotificationIds.has(notificationId)
                        });
                    }
                }

                if (commentsData && commentsData.length) {
                    for (const c of commentsData as any[]) {
                        const notificationId = Number(c.id) + 1000000;
                        items.push({
                            id: notificationId,
                            type: 'info',
                            icon: <InfoIcon />,
                            title: `Comment Added`,
                            message: `On booking #${c.deal_id} by ${c.user_name}: ${String(c.comment).slice(0, 100)}`,
                            time: c.created_at ? new Date(c.created_at).toISOString() : new Date().toISOString(),
                            dealId: Number(c.deal_id),
                            isRead: readNotificationIds.has(notificationId)
                        });
                    }
                }

                // sort by time desc
                items.sort((a, b) => Date.parse(b.time) - Date.parse(a.time));

                console.log('Final notifications items:', items.length, items);
                if (mounted) setNotifications(items.slice(0, 20));
            } catch (err) {
                console.error('Failed to load initial notifications:', err);
            }
        };

        fetchInitialNotifications();

        return () => { mounted = false; };
    }, [currentUserRole, assignedVenue, readNotificationIds]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
                setIsNotificationsOpen(false);
            }
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Realtime notifications: subscribe to Supabase realtime changes for deals and deal_comments
    useEffect(() => {
        // Only show notifications for Direktor role
        if (currentUserRole !== 'Direktor') return;
        // Guard: supabase should be available
        try {
            const dealsChannel = supabase.channel('realtime-deals')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'deals' }, async (payload: any) => {
                    const record = payload.new || payload.record || payload;
                    const notif: NotificationItem = {
                        id: record.id ? Number(record.id) : Date.now(),
                        type: 'success',
                        icon: <SuccessIcon />,
                        title: `New Booking Created`,
                        message: `${record.namaClient || 'Client'} at ${record.namaVenue || ''} - Status: ${record.jenisBooking || ''}`.trim(),
                        time: 'Baru saja',
                        dealId: record.id ? Number(record.id) : undefined,
                        isRead: readNotificationIds.has(record.id ? Number(record.id) : Date.now())
                    };
                        setNotifications(prev => {
                            if (prev.some(n => n.id === notif.id)) return prev;
                            sendNotificationEmail(notif); // Send email notification
                            return [notif, ...prev].slice(0, 20);
                        });
                })
                    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'deals' }, async (payload: any) => {
                    const record = payload.new || payload.record || payload;
                    const notif: NotificationItem = {
                        id: record.id ? Number(record.id) + 2000000 : Date.now(),
                        type: 'info',
                        icon: <InfoIcon />,
                        title: `Booking Updated`,
                        message: `${record.namaClient || 'Client'} at ${record.namaVenue || ''} - Status: ${record.jenisBooking || ''} (data booking, vendor, atau field lainnya diperbarui)`.trim(),
                        time: 'Baru saja',
                        dealId: record.id ? Number(record.id) : undefined,
                        isRead: readNotificationIds.has(record.id ? Number(record.id) + 2000000 : Date.now())
                    };
                        setNotifications(prev => {
                            if (prev.some(n => n.id === notif.id)) return prev;
                            sendNotificationEmail(notif); // Send email notification
                            return [notif, ...prev].slice(0, 20);
                        });
                })
                .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'deals' }, async (payload: any) => {
                    const record = payload.old || payload.record || payload;
                    const notif: NotificationItem = {
                        id: record.id ? Number(record.id) + 3000000 : Date.now(),
                        type: 'warning',
                        icon: <WarningIcon />,
                        title: `Booking Deleted`,
                        message: `${record.namaClient || 'Client'} at ${record.namaVenue || ''} has been removed.`,
                        time: 'Baru saja',
                        dealId: record.id ? Number(record.id) : undefined,
                        isRead: readNotificationIds.has(record.id ? Number(record.id) + 3000000 : Date.now())
                    };
                        setNotifications(prev => {
                            if (prev.some(n => n.id === notif.id)) return prev;
                            sendNotificationEmail(notif); // Send email notification
                            return [notif, ...prev].slice(0, 20);
                        });
                })
                .subscribe();

            const commentsChannel = supabase.channel('realtime-comments')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'deal_comments' }, async (payload: any) => {
                    const record = payload.new || payload.record || payload;
                    const notif: NotificationItem = {
                        id: record.id ? Number(record.id) + 1000000 : Date.now(),
                        type: 'info',
                        icon: <InfoIcon />,
                        title: `New Comment Added`,
                        message: `On booking #${record.deal_id} by ${record.user_name}: ${String(record.comment).slice(0, 80)}`,
                        time: 'Baru saja',
                        dealId: record.deal_id ? Number(record.deal_id) : undefined,
                        isRead: readNotificationIds.has(record.id ? Number(record.id) + 1000000 : Date.now())
                    };
                    setNotifications(prev => {
                        if (prev.some(n => n.id === notif.id)) return prev;
                        sendNotificationEmail(notif); // Send email notification
                        return [notif, ...prev].slice(0, 20);
                    });
                })
                .subscribe();

            return () => {
                try { supabase.removeChannel(dealsChannel); } catch (e) { /* ignore */ }
                try { supabase.removeChannel(commentsChannel); } catch (e) { /* ignore */ }
            };
        } catch (err) {
            console.warn('Realtime subscription failed:', err);
            return () => {};
        }
    }, [currentUserRole, readNotificationIds]);

    const saveReadStatusToDatabase = async (notificationId: number) => {
        if (!user) return;
        
        try {
            const newReadIds = Array.from(new Set([...readNotificationIds, notificationId]));
            const { error } = await supabase
                .from('profiles')
                .update({ read_notifications: newReadIds })
                .eq('id', user.id);
            
            if (error) {
                console.error('Failed to save read status:', error);
            } else {
                setReadNotificationIds(new Set(newReadIds));
            }
        } catch (err) {
            console.error('Error saving read status:', err);
        }
    };

    const handleNotificationClick = (dealId?: number) => {
        if (dealId) {
            // Find the notification ID for this deal
            const notification = notifications.find(n => n.dealId === dealId);
            if (notification && !notification.isRead) {
                // Mark as read in local state immediately for UI responsiveness
                setNotifications(prev => prev.map(n => 
                    n.id === notification.id ? { ...n, isRead: true } : n
                ));
                // Save to database
                saveReadStatusToDatabase(notification.id);
            }
            setActiveView({ type: 'CalendarEvent', selectedEventId: dealId });
            setIsNotificationsOpen(false);
        }
    };

    const sendNotificationEmail = async (notification: NotificationItem) => {
        try {
            // Get director's email - you can fetch from profiles table where role = 'Direktor'
            // For now, using current user's email if they are director
            const directorEmail = user?.email || 'financehisjakarta@gmail.com'; // Replace with actual director email fetching logic

            const { data, error } = await resend.emails.send({
                from: 'admin@kediaman.co', // Replace with your verified domain in Resend
                to: directorEmail,
                subject: `Notifikasi: ${notification.title}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">${notification.title}</h2>
                        <p style="color: #666; font-size: 16px;">${notification.message}</p>
                        <p style="color: #999; font-size: 12px;">Waktu: ${notification.time}</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="color: #666;">Ini adalah notifikasi otomatis dari sistem Calendar Tracking.</p>
                    </div>
                `,
            });

            if (error) {
                console.error('Error sending email:', error);
            } else {
                console.log('Email sent successfully:', data);
            }
        } catch (err) {
            console.error('Failed to send notification email:', err);
        }
    };

    const handleRemoveNotification = (id: number) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const handleMarkAllAsRead = async () => {
        if (!user) return;
        
        try {
            const allNotificationIds = notifications.map(n => n.id);
            const newReadIds = Array.from(new Set([...readNotificationIds, ...allNotificationIds]));
            
            const { error } = await supabase
                .from('profiles')
                .update({ read_notifications: newReadIds })
                .eq('id', user.id);
            
            if (error) {
                console.error('Failed to mark all as read:', error);
            } else {
                setReadNotificationIds(new Set(newReadIds));
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            }
        } catch (err) {
            console.error('Error marking all as read:', err);
        }
    };

    const handleClearAll = () => {
        setNotifications([]);
        setIsNotificationsOpen(false);
    };

    const displayName = user?.user_metadata?.full_name || 'Muhammad Hamzah Rahmatulloh';
    const displayEmail = user?.email || 'hamzahmuhammad238@gmail.com';
    const avatarUrl = user?.user_metadata?.avatar_url || `https://i.pravatar.cc/150?u=hamzah`;

    return (
        <header className="flex items-center justify-end py-4 mb-4">
            <div className="flex items-center gap-2 sm:gap-3">
                <div className="relative" ref={notificationsRef}>
                    <button
                        onClick={() => setIsNotificationsOpen(prev => !prev)}
                        className="w-11 h-11 flex items-center justify-center text-[var(--color-text-secondary)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-interactive)] transition-colors relative"
                        aria-haspopup="true"
                        aria-expanded={isNotificationsOpen}
                    >
                        <BellIcon className="w-6 h-6"/>
                        {notifications.filter(n => !n.isRead).length > 0 && (
                            <span className="bg-rose-500 text-white text-[10px] w-4 h-4 rounded-full absolute top-1 right-1 flex items-center justify-center border-2 border-[var(--color-surface)]">
                                {notifications.filter(n => !n.isRead).length}
                            </span>
                        )}
                    </button>

                    {isNotificationsOpen && (
                        <div className="absolute top-full right-0 mt-3 w-80 md:w-96 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-lg z-50 fade-in">
                            <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center">
                                <h4 className="font-semibold text-lg text-[var(--color-text-primary)]">Notifications</h4>
                                {notifications.length > 0 && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleMarkAllAsRead}
                                            className="text-sm text-[var(--color-primary)] hover:underline"
                                        >
                                            Mark all as read
                                        </button>
                                        <button
                                            onClick={handleClearAll}
                                            className="text-sm text-red-400 hover:underline"
                                        >
                                            Clear all
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="p-2 max-h-96 overflow-y-auto">
                                {notifications.length > 0 ? (
                                    notifications.map(notification => (
                                        <Notification
                                            key={notification.id}
                                            notification={notification}
                                            onClose={handleRemoveNotification}
                                            onClick={handleNotificationClick}
                                        />
                                    ))
                                ) : (
                                    <div className="text-center py-12 px-4">
                                        <div className="w-16 h-16 mx-auto bg-[var(--color-background)] rounded-full flex items-center justify-center">
                                            <BellIcon className="w-8 h-8 text-[var(--color-text-secondary)]" />
                                        </div>
                                        <p className="mt-4 font-semibold text-[var(--color-text-primary)]">No new notifications</p>
                                        <p className="text-sm text-[var(--color-text-secondary)]">You're all caught up!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="relative" ref={profileRef}>
                    <button onClick={() => setIsProfileOpen(prev => !prev)} className="flex items-center gap-4 text-right bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-2 transition-colors hover:bg-[var(--color-interactive)]">
                         <img src={avatarUrl} alt="Admin" className="w-10 h-10 rounded-md" />
                        <div className="hidden md:block">
                            <p className="font-bold text-sm text-[var(--color-text-primary)]">{displayName}</p>
                            <small className="text-[var(--color-text-secondary)] text-xs">{displayEmail}</small>
                        </div>
                    </button>
                    {isProfileOpen && (
                         <div className="absolute top-full right-0 mt-3 w-64 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-lg z-50 fade-in p-2">
                            <div className="px-3 py-2 border-b border-[var(--color-border)]">
                                <p className="font-bold text-sm text-[var(--color-text-primary)]">{displayName}</p>
                                <p className="text-[var(--color-text-secondary)] text-xs truncate">{displayEmail}</p>
                            </div>
                            <div className="py-2">
                                <a href="#" onClick={(e) => { e.preventDefault(); setActiveView({ type: 'Profile' }); setIsProfileOpen(false); }} className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-white/5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
                                    <UserCircleIcon className="w-5 h-5" />
                                    <span>Profile Settings</span>
                                </a>
                            </div>
                            <div className="py-2 border-t border-[var(--color-border)]">
                                <a href="#" onClick={(e) => { e.preventDefault(); onLogout(); }} className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-rose-500/10 text-rose-400 transition-colors">
                                    <LogoutIcon className="w-5 h-5" />
                                    <span>Logout</span>
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
