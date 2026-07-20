import React from 'react';

// FIX: Removed self-import of `OrderStatus` which caused a conflict with the type declaration below.
export type OrderStatus = 'Delivered' | 'Pending' | 'Declined';

export interface Order {
    productName: string;
    productNumber: string;

    payment: string;
    status: OrderStatus;
}

export interface Update {
    avatar: string;
    name: string;
    message: string;
    time: string;
}

export interface User {
    avatar: string;
    name: string;
}

export type OptionStatus = 'Dealing' | 'On Going' | 'Tidak Lanjut';

export type OptionFillingStatus = 'Lengkap' | 'Kurang Lengkap' | 'Kosong' | 'Sudah Mengisi';

export interface LaporanDatabaseEntry {
    id: number;
    dateIn: Date; // Date-In
    customerName: string; // Nama
    customerEmail: string; // Email
    customerPhone: string; // No-Wa-Customer
    sourceData: string; // Sumber-Data
    followUp: string; // Follow-Up
    lastFollowUpDate: Date; // Tanggal-FU-Terakhir
    lastResponse: Date; // Respond-Terakhir
    potentialStatus: string; // Potensi-Atau-Tidak
    onlineMeeting: string; // Online-Meeting
    surveyLocation: string; // Survey-Lokasi
    closingStatus: string; // Status-Closing
    note: string; // Note
    fillingStatus?: OptionFillingStatus; // Status-Pengisian
    // Optional fields for UI logic, though not in DB currently
    marketingName?: string;
    venueName?: string;
    image_url?: string;
}

export type MarketingRole = 'Manager Sales' | 'Marketing';

export interface MarketingPerson {
    id?: number;
    name: string;
    role?: MarketingRole;
    venueName?: string;
}

export interface Venue {
    name: string;
    spreadsheetUrl?: string;
    publishedCsvUrl?: string;
}

export type UserRole = 'Admin' | 'User' | 'Manager' | 'Direktor' | 'IT';

export interface ManagedUser {
  id: string; // UUID from Supabase Auth
  name: string; // From user_metadata
  email: string;
  role: UserRole; // From user_metadata
  last_sign_in_at?: string;
  avatar_url?: string; // From user_metadata
  assigned_venue?: string | null; // From profiles table
}


export type WeddingType = 'Resepsi' | 'Akad & Resepsi' | 'Pemberkatan Resepsi' | 'Teapai' | 'Venue Only';
export type BookingStatus = 'DP' | 'Lunas' | 'Soft Booking' | 'Booking' | 'Waiting List';

export type EventTime = 'Malam' | 'Pagi' | 'Full Day';


export interface DealingEntry {
  id: number;
  namaClient: string;
  namaVenue: string;
  venueLokasi?: string; // Detail lokasi/ruangan venue (misalnya: Ballroom A, Outdoor Garden)
  namaMarketing: string;
  id_bitrix24?: string;
  namaPax: string;
  totalPax: number;
  jenisAcara: 'Wedding' | 'Non Wedding';
  waktuAcara?: EventTime;
  weddingType?: WeddingType;
  // Vendor fields
  vendorCatering?: string;
  vendorCateringNote?: string;
  vendorDekorasi?: string;
  vendorDekorasiNote?: string;
  vendorRiasBusana?: string;
  vendorRiasBusanaNote?: string;
  vendorMUA?: string;
  vendorMUANote?: string;
  vendorPhotoVideo?: string;
  vendorPhotoVideoNote?: string;
  vendorEntertainment?: string;
  vendorEntertainmentNote?: string;
  vendorMC?: string;
  vendorMCNote?: string;
  vendorPhotobooth?: string;
  vendorPhotoboothNote?: string;
  vendorProsesiAdat?: string;
  vendorProsesiAdatNote?: string;
  vendorLiveStreaming?: string;
  vendorLiveStreamingNote?: string;
  vendorFoodstallMillenial?: string;
  vendorFoodstallMillenialNote?: string;
  tanggalBooking: string;
  tanggalAcara: string;
  sumberData: string;
  jenisBooking: BookingStatus;
  tanggalPelunasan: string;
  eventOrder?: number; // Nomor urut event dalam sehari
  description?: string;
  priority?: 'Low' | 'Medium' | 'High';
  completion_status?: 'Not Started' | 'In Progress' | 'Completed';
  user_id?: string; // ID user yang membuat deal
  noteLainnya?: string; // Catatan tambahan / note lainnya
}

export interface DealComment {
  id: number;
  deal_id: number;
  user_id: string; 
  user_name: string;
  user_avatar_url?: string;
  comment: string;
  created_at: string;
}


export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationItem {
  id: number;
  type: NotificationType;
  icon: React.ReactNode;
  title: string;
  message: string;
  time: string;
  dealId?: number; // ID of the related deal for navigation
  isRead?: boolean; // Whether the notification has been read
}

export type EventStatus = 'Confirmed' | 'Tentative' | 'Cancelled' | 'Waiting List';

export interface CalendarEventEntry {
  id: number;
  eventName: string;
  venueName: string;
  venueLokasi?: string; // Detail lokasi/ruangan venue
  marketingName: string;
  paxCount: number;
  eventType: 'Wedding' | 'Non Wedding';
  waktuAcara?: EventTime;
  weddingType?: WeddingType;
  // vendors can be optionally displayed on calendar event details
  vendorCatering?: string;
  vendorDekorasi?: string;
  vendorRiasBusana?: string;
  vendorMUA?: string;
  vendorPhotoVideo?: string;
  vendorEntertainment?: string;
  vendorMC?: string;
  vendorPhotobooth?: string;
  vendorProsesiAdat?: string;
  vendorLiveStreaming?: string;
  vendorFoodstallMillenial?: string;
  bookingDate: string;
  eventDate: string;
  sumberData: string;
  status: EventStatus;
  jenisBooking: BookingStatus;
  eventOrder?: number; // Nomor urut event dalam sehari
  notes?: string;
}
