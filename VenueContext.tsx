import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Venue } from './types';
import { VENUES as FALLBACK_VENUES } from './constants';
import { supabase } from './supabaseClient';

interface VenueContextType {
    venues: Venue[];
    isLoading: boolean;
    refreshVenues: () => Promise<void>;
    addVenue: (venue: Omit<Venue, 'id'>) => Promise<{ success: boolean; error?: string }>;
    deleteVenue: (id: number) => Promise<{ success: boolean; error?: string }>;
}

const VenueContext = createContext<VenueContextType>({
    venues: FALLBACK_VENUES,
    isLoading: true,
    refreshVenues: async () => {},
    addVenue: async () => ({ success: false }),
    deleteVenue: async () => ({ success: false }),
});

export const useVenues = () => useContext(VenueContext);

export const VenueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [venues, setVenues] = useState<Venue[]>(FALLBACK_VENUES);
    const [isLoading, setIsLoading] = useState(true);

    const fetchVenues = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('venues')
                .select('*')
                .order('name');

            if (error) {
                console.warn('Could not fetch venues from Supabase, using fallback:', error.message);
                setVenues(FALLBACK_VENUES);
            } else if (data && data.length > 0) {
                const dbVenues = data as Venue[];
                const dbVenueNames = new Set(dbVenues.map(v => v.name));
                const missingVenues = FALLBACK_VENUES.filter(v => !dbVenueNames.has(v.name));
                setVenues([...dbVenues, ...missingVenues].sort((a, b) => a.name.localeCompare(b.name)));
            } else {
                setVenues(FALLBACK_VENUES);
            }
        } catch (err) {
            console.warn('Error fetching venues:', err);
            setVenues(FALLBACK_VENUES);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchVenues();
    }, [fetchVenues]);

    const addVenue = async (venue: Omit<Venue, 'id'>): Promise<{ success: boolean; error?: string }> => {
        const { data, error } = await supabase
            .from('venues')
            .insert([{
                name: venue.name,
                spreadsheetUrl: venue.spreadsheetUrl || null,
                publishedCsvUrl: venue.publishedCsvUrl || null,
            }])
            .select();

        if (error) {
            if (error.code === '23505') {
                return { success: false, error: 'Venue dengan nama tersebut sudah ada.' };
            }
            return { success: false, error: error.message };
        }

        if (data) {
            setVenues(prev => [...prev, data[0] as Venue].sort((a, b) => a.name.localeCompare(b.name)));
        }
        return { success: true };
    };

    const deleteVenue = async (id: number): Promise<{ success: boolean; error?: string }> => {
        const { error } = await supabase.from('venues').delete().eq('id', id);
        if (error) {
            return { success: false, error: error.message };
        }
        setVenues(prev => prev.filter(v => v.id !== id));
        return { success: true };
    };

    return (
        <VenueContext.Provider value={{ venues, isLoading, refreshVenues: fetchVenues, addVenue, deleteVenue }}>
            {children}
        </VenueContext.Provider>
    );
};
