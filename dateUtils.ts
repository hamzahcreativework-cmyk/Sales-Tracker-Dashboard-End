// Utility functions for consistent date handling
export const dateUtils = {
    // Convert Date to YYYY-MM-DD format in local timezone
    toLocalDateString: (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    // Get today's date in local timezone as YYYY-MM-DD
    getTodayString: (): string => {
        return dateUtils.toLocalDateString(new Date());
    },

    // Parse YYYY-MM-DD string to Date object in local timezone
    parseLocalDate: (dateString: string): Date => {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
    },

    // Check if a date string is today or in the future
    isTodayOrFuture: (dateString: string): boolean => {
        const today = dateUtils.getTodayString();
        return dateString >= today;
    },

    // Format date for display in Indonesian locale
    formatForDisplay: (date: Date): string => {
        return date.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
};