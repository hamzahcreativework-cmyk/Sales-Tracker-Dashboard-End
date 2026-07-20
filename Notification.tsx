import React from 'react';
import { NotificationItem } from './types';
import { CloseIcon } from './Icons';

interface NotificationProps {
    notification: NotificationItem;
    onClose: (id: number) => void;
    onClick?: (dealId?: number) => void;
}

const NOTIFICATION_STYLES = {
    info: {
        bg: 'bg-blue-500/10',
        iconColor: 'text-blue-400',
    },
    success: {
        bg: 'bg-green-500/10',
        iconColor: 'text-green-400',
    },
    warning: {
        bg: 'bg-yellow-500/10',
        iconColor: 'text-yellow-400',
    },
    error: {
        bg: 'bg-red-500/10',
        iconColor: 'text-red-400',
    },
};

const Notification: React.FC<NotificationProps> = ({ notification, onClose, onClick }) => {
    const { id, type, icon, title, message, time, dealId, isRead = false } = notification;
    const styles = NOTIFICATION_STYLES[type];

    const handleClick = () => {
        if (onClick && dealId) {
            onClick(dealId);
        }
    };

    return (
        <div className={`flex items-start gap-3 p-3 mb-2 transition-all duration-300 rounded-lg relative ${
            isRead 
                ? 'bg-white/5 hover:bg-white/10 opacity-75' 
                : 'bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 border-l-4 border-[var(--color-primary)]'
        } ${onClick && dealId ? 'cursor-pointer' : ''}`} onClick={handleClick}>
            {!isRead && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-[var(--color-primary)] rounded-full"></div>
            )}
            <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${styles.bg} ${!isRead ? 'ring-2 ring-[var(--color-primary)]/50' : ''}`}>
                <div className={`${styles.iconColor} w-6 h-6`}>
                    {icon}
                </div>
            </div>
            <div className="flex-grow">
                <h4 className={`font-semibold ${isRead ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-text-primary)]'}`}>{title}</h4>
                <p className={`text-sm mt-1 ${isRead ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-text-primary)]'}`}>{message}</p>
                <p className="text-xs text-gray-500 mt-2">{time}</p>
            </div>
            <button
                onClick={(e) => { e.stopPropagation(); onClose(id); }}
                className={`transition-colors p-1 rounded-full hover:bg-white/10 ${isRead ? 'text-gray-500' : 'text-[var(--color-text-secondary)] hover:text-white'}`}
                aria-label="Close notification"
            >
                <CloseIcon className="w-5 h-5" />
            </button>
        </div>
    );
};

export default Notification;
