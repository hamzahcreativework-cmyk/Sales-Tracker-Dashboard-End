

import { Order, Update, User, LaporanDatabaseEntry, Venue } from './types';

export const RECENT_ORDERS: Order[] = [
    {
        productName: 'Foldable Mini Drone',
        productNumber: '85631',
        payment: 'Due',
        status: 'Pending',
    },
    {
        productName: 'LARVENDER KF102 Drone',
        productNumber: '36378',
        payment: 'Refunded',
        status: 'Declined',
    },
    {
        productName: 'Ruko F11 Pro Drone',
        productNumber: '49347',
        payment: 'Due',
        status: 'Pending',
    },
    {
        productName: 'Drone with Camera Drone',
        productNumber: '96996',
        payment: 'Paid',
        status: 'Delivered',
    },
    {
        productName: 'GPS 4k Drone',
        productNumber: '22821',
        payment: 'Paid',
        status: 'Delivered',
    },
];

export const RECENT_UPDATES: Update[] = [
    {
        avatar: 'https://i.pravatar.cc/150?img=1',
        name: 'Mike Tyson',
        message: 'received his order of Night lion tech GPS drone.',
        time: '2 Minutes Ago',
    },
    {
        avatar: 'https://i.pravatar.cc/150?img=2',
        name: 'Diana Ayi',
        message: 'declined her order of 2 DJI Air 2S.',
        time: '5 Minutes Ago',
    },
    {
        avatar: 'https://i.pravatar.cc/150?img=3',
        name: 'Mandy Roy',
        message: 'received her order of Ruko F11 Pro Drone.',
        time: '6 Minutes Ago',
    },
];


export const NEW_USERS: User[] = [
    { avatar: 'https://i.pravatar.cc/150?img=4', name: 'John' },
    { avatar: 'https://i.pravatar.cc/150?img=5', name: 'Amir' },
    { avatar: 'https://i.pravatar.cc/150?img=6', name: 'Sandra' },
];

// ===================================================================================
// !! PENTING: KONFIGURASI SPREADSHEET !!
// ===================================================================================
// Agar aplikasi dapat menampilkan data laporan secara langsung, Anda WAJIB
// mempublikasikan setiap Google Sheet ke web sebagai file CSV dan menempelkan URL-nya di sini.
//
// Langkah-langkah:
// 1. Buka Google Sheet Anda.
// 2. Klik `File` -> `Bagikan` -> `Publikasikan ke web`.
// 3. Di jendela pop-up:
//    - Pada bagian `Link`, pilih sheet yang relevan (misalnya, 'Sheet1').
//    - Ubah format dari 'Halaman Web' menjadi 'Nilai yang dipisahkan koma (.csv)'.
// 4. Klik tombol `Publikasikan`.
// 5. Salin (Copy) URL yang dihasilkan.
// 6. Tempel (Paste) URL tersebut untuk menggantikan placeholder `URL_CSV_PUBLIKASI_ANDA_DISINI`
//    di bawah ini untuk setiap venue yang sesuai.
//
// CONTOH URL YANG SALAH: https://docs.google.com/spreadsheets/d/18IYzn.../edit
// CONTOH URL YANG BENAR:  https://docs.google.com/spreadsheets/d/e/2PACX-1v.../pub?output=csv
// ===================================================================================
export const VENUES: Venue[] = [
    {
        name: 'Swasana Grand Slipi',
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/18IYznIAeduPa0pYwvpklmARytnR7y1RVlUll_su0Fww/edit?usp=sharing',
        publishedCsvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQfR6pZ1hBa1lrWumpqjmIhZjliCb5V4OV9y_ItAS4Q1I7ygO-hehs7td4n7eFgxL2R-aOfrcbYu0Az/pubhtml',
    },
    { 
        name: 'Swasana Brin Gatsu',
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1NFSl2CtrXaI8ZaJzUCmOO-LDBSrW5LIjLyndpbFdi6E/edit?usp=sharing',
        publishedCsvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQsuUpX3nkZ2fHCnVOwm_o8Mfihfp0iN6LK06r0rCUgX7mS6LEDR_nS5vvH-A6nieJws6mOXlBTCoJ4/pubhtml',
    },
    { 
        name: 'Swasana Brin Thamrin',
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/137HvRzJ0hl1FS2gphKkulbQQMzNVDiX3WqPtCZt4JDs/edit?usp=sharing',
        publishedCsvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSIcANmhyTiJKvJ3b1NnJ3JzvDAaYQjLyaqK-0DPaqzc26Qzlnu-MN-vBsX8dU3jSpche9RU8hfTHcn/pubhtml',
    },
    { 
        name: 'Swasana Patrajasa',
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1BTsP9XetrfsrORzU9ooK2-hYVouyUbi0bDXg3q6ats0/edit?usp=sharing',
        publishedCsvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vScQcwWrNK4w-HNnx4Hd4FV2yNt4ZPBMkQmIiRJEP8c3qn05gwqMcYbQqL2tUd_Q1uk0jzkd8a6x-FZ/pubhtml',
    },
    { 
        name: 'Swasana Lippo Kuningan',
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1YnY3qa8t248iY_NL1JwUwWVrYLUobUxmCipfsuqYoCc/edit?usp=sharing',
        publishedCsvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSR0Yjcqwj8BxFOt5RElWvbnOpcvyHCHOhrgiLdp79Jmj0UhzNQdsDSd2-bE3GJKWCLMMibuW0U8Q2V/pubhtml',
    },
    { 
        name: 'Swasana Dharmagati',
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1WmC_HKuLr0dvDvJG_I78TfX6PKsGmiLaP9kREQHQjsM/edit?usp=sharing',
        publishedCsvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTL2Jd00-9geQekQdyHgS0DygBd-pP_RpD3RrnbY9e_rI3PhvY0ugljPrYXOJfDXGf4jeF5gfTSz4fd/pubhtml',
    },
    { 
        name: 'Swasana Seskoad',
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1wLFLCTGRYzKvLNitpnnUYfrM56zdvcLN1E3uyly2NdU/edit?usp=sharing',
        publishedCsvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSnIBQUQPLMz7Pl71WT2oiDA-BKGj-X2612WjvsToZ3pTw3g0ig_LKFiR4b344SqyvCJ76RqFgOme1U/pubhtml',
    },
    { 
        name: 'Gunawarman Bripens',
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/10sBda1gGjtqAnBzmiPlZz2cPcGpYy_fO7Do9bi-fPbA/edit?usp=sharing',
        publishedCsvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRGuWi-s4KmFwYPPcHPD_0oCKjayx3M-yoKqKIST4uINWm4w1KLCFO96fjIDuml9edwKUGk45zmJFX3/pubhtml',
    },
    { 
        name: 'Gunawarman Samisara',
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1uWcIUhoinRnXB8m1i6TtGgmC6TbqSp7PWX3XFw8jFGM/edit?usp=sharing',
        publishedCsvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTSeQ4tWFS4pNCMTMhrVcxbR-GBlx5ud1iP_wk0sG9rr3H5AxTLm4o3lPcNURRVevEdysdfQbD7YZ5W/pubhtml',
    },
    { 
        name: 'Pakubuwono',
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1SP1kId9tPv78lbUdg3XnfQpsK_jNczhxzH5fGIbq0gc/edit?usp=sharing',
        publishedCsvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQjvxeeXlUrEiFstebxbxGnHiZWSaHZ6fEDglgxi8YM-va4SlTuapNEO3373sku58EESg6ftod20tfK/pubhtml',
    },
    { 
        name: 'Swasana Granadi',
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit?usp=sharing',
        publishedCsvUrl: 'https://docs.google.com/spreadsheets/d/e/YOUR_PUBLISHED_CSV_URL/pubhtml',
    }
];
