import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { UserRole } from './types';

interface SiteSettingsViewProps {
    userRole: UserRole;
}

interface GachaPrize {
    id: number;
    name: string;
    image_url: string;
    rarity: 'common' | 'rare' | 'legendary';
    is_active: boolean;
    created_at: string;
}

const MONTHS_ID = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const HEADING_FONTS = ['Orbitron', 'Rajdhani', 'Teko', 'Oswald', 'Bebas Neue', 'Russo One', 'Chakra Petch', 'Black Ops One'];
const BODY_FONTS = ['Poppins', 'Inter', 'Roboto', 'Open Sans', 'Nunito', 'Lato', 'Montserrat', 'DM Sans', 'Quicksand'];

function adjustColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, ((num >> 16) & 0xff) + amount);
    const g = Math.min(255, ((num >> 8) & 0xff) + amount);
    const b = Math.min(255, (num & 0xff) + amount);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

const SiteSettingsView: React.FC<SiteSettingsViewProps> = ({ userRole }) => {
    const [videoUrls, setVideoUrls] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Calendar date range state
    const [dateRange, setDateRange] = useState({ startMonth: 1, startYear: 2025, endMonth: 12, endYear: 2026 });
    const [isLoadingRange, setIsLoadingRange] = useState(true);
    const [isSavingRange, setIsSavingRange] = useState(false);

    // Music state
    const [musicUrls, setMusicUrls] = useState<string[]>([]);
    const [isLoadingMusic, setIsLoadingMusic] = useState(true);
    const [isUploadingMusic, setIsUploadingMusic] = useState(false);
    const musicFileInputRef = useRef<HTMLInputElement>(null);
    const [youtubeLink, setYoutubeLink] = useState('');

    // Calendar font state
    const [calendarFonts, setCalendarFonts] = useState({ heading: 'Orbitron', body: 'Poppins' });
    const [isLoadingFonts, setIsLoadingFonts] = useState(true);
    const [isSavingFonts, setIsSavingFonts] = useState(false);
    const [customFonts, setCustomFonts] = useState<{ name: string; url: string }[]>([]);
    const [isUploadingFont, setIsUploadingFont] = useState(false);
    const fontFileInputRef = useRef<HTMLInputElement>(null);
    const fontFileInputBodyRef = useRef<HTMLInputElement>(null);

    // Logo state
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [isLoadingLogo, setIsLoadingLogo] = useState(true);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const logoFileInputRef = useRef<HTMLInputElement>(null);

    // Calendar background color state
    const [bgColor, setBgColor] = useState('#0a2e1a');
    const [isLoadingBgColor, setIsLoadingBgColor] = useState(true);
    const [isSavingBgColor, setIsSavingBgColor] = useState(false);

    // Auto switch month interval state
    const [autoSwitchMinutes, setAutoSwitchMinutes] = useState<number>(0);
    const [isLoadingAutoSwitch, setIsLoadingAutoSwitch] = useState(true);
    const [isSavingAutoSwitch, setIsSavingAutoSwitch] = useState(false);

    // Video toggle state
    const [videoEnabled, setVideoEnabled] = useState(true);
    const [videoPlaceholderText, setVideoPlaceholderText] = useState('');
    const [isLoadingVideoToggle, setIsLoadingVideoToggle] = useState(true);
    const [isSavingVideoToggle, setIsSavingVideoToggle] = useState(false);

    // Marquee text state
    const [marqueeTexts, setMarqueeTexts] = useState<string[]>([]);
    const [isLoadingMarquee, setIsLoadingMarquee] = useState(true);
    const [isSavingMarquee, setIsSavingMarquee] = useState(false);

    // Gacha prize state
    const [gachaPrizes, setGachaPrizes] = useState<GachaPrize[]>([]);
    const [isLoadingPrizes, setIsLoadingPrizes] = useState(true);
    const [newPrizeName, setNewPrizeName] = useState('');
    const [newPrizeRarity, setNewPrizeRarity] = useState<'common' | 'rare' | 'legendary'>('common');
    const [isUploadingPrize, setIsUploadingPrize] = useState(false);
    const prizeFileInputRef = useRef<HTMLInputElement>(null);

    if (userRole !== 'Admin' && userRole !== 'IT') {
        return (
            <div className="card p-6 text-center">
                <h1 className="text-2xl font-bold text-red-500">Akses Ditolak</h1>
                <p className="text-[var(--color-text-secondary)] mt-2">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
            </div>
        );
    }

    useEffect(() => {
        const fetchSettings = async () => {
            setIsLoading(true);
            // Try the new plural key first
            const { data: pluralData } = await supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'calendar_bg_video_urls')
                .maybeSingle();

            if (pluralData && pluralData.value) {
                try {
                    const parsed = JSON.parse(pluralData.value);
                    if (Array.isArray(parsed)) {
                        setVideoUrls(parsed);
                        setIsLoading(false);
                        return;
                    }
                } catch {}
            }

            // Backward compatibility: migrate from old singular key
            const { data: singularData } = await supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'calendar_bg_video_url')
                .maybeSingle();

            if (singularData && singularData.value) {
                const migrated = [singularData.value];
                setVideoUrls(migrated);
                // Save migrated value to new key
                await supabase
                    .from('site_settings')
                    .upsert({ key: 'calendar_bg_video_urls', value: JSON.stringify(migrated), updated_at: new Date().toISOString() }, { onConflict: 'key' });
            }

            setIsLoading(false);
        };
        fetchSettings();
    }, []);

    useEffect(() => {
        const fetchMusic = async () => {
            setIsLoadingMusic(true);
            const { data } = await supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'calendar_bg_music_urls')
                .maybeSingle();

            if (data && data.value) {
                try {
                    const parsed = JSON.parse(data.value);
                    if (Array.isArray(parsed)) {
                        setMusicUrls(parsed);
                    }
                } catch {}
            }
            setIsLoadingMusic(false);
        };
        fetchMusic();
    }, []);

    useEffect(() => {
        const fetchDateRange = async () => {
            setIsLoadingRange(true);
            const { data } = await supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'calendar_date_range')
                .maybeSingle();

            if (data && data.value) {
                try {
                    const parsed = JSON.parse(data.value);
                    if (parsed && typeof parsed === 'object') {
                        setDateRange({
                            startMonth: parsed.startMonth ?? 1,
                            startYear: parsed.startYear ?? 2025,
                            endMonth: parsed.endMonth ?? 12,
                            endYear: parsed.endYear ?? 2026,
                        });
                    }
                } catch {}
            }
            setIsLoadingRange(false);
        };
        fetchDateRange();
    }, []);

    useEffect(() => {
        const fetchFonts = async () => {
            setIsLoadingFonts(true);
            const { data } = await supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'calendar_fonts')
                .maybeSingle();
            if (data?.value) {
                try {
                    const parsed = JSON.parse(data.value);
                    if (parsed && typeof parsed === 'object') {
                        setCalendarFonts({
                            heading: parsed.heading ?? 'Orbitron',
                            body: parsed.body ?? 'Poppins',
                        });
                    }
                } catch {}
            }
            const { data: customData } = await supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'calendar_custom_fonts')
                .maybeSingle();
            if (customData?.value) {
                try {
                    const parsed = JSON.parse(customData.value);
                    if (Array.isArray(parsed)) setCustomFonts(parsed);
                } catch {}
            }
            setIsLoadingFonts(false);
        };
        fetchFonts();
    }, []);

    useEffect(() => {
        const fetchLogo = async () => {
            setIsLoadingLogo(true);
            const { data } = await supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'calendar_logo_url')
                .maybeSingle();
            if (data?.value) {
                setLogoUrl(data.value);
            }
            setIsLoadingLogo(false);
        };
        fetchLogo();
    }, []);

    useEffect(() => {
        const fetchBgColor = async () => {
            setIsLoadingBgColor(true);
            const { data } = await supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'calendar_bg_color')
                .maybeSingle();
            if (data?.value) {
                setBgColor(data.value);
            }
            setIsLoadingBgColor(false);
        };
        fetchBgColor();
    }, []);

    useEffect(() => {
        const fetchAutoSwitch = async () => {
            setIsLoadingAutoSwitch(true);
            const { data } = await supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'calendar_auto_switch_minutes')
                .maybeSingle();
            if (data?.value) {
                const parsed = parseInt(data.value, 10);
                if (!isNaN(parsed)) setAutoSwitchMinutes(parsed);
            }
            setIsLoadingAutoSwitch(false);
        };
        fetchAutoSwitch();
    }, []);

    useEffect(() => {
        const families = [calendarFonts.heading, calendarFonts.body]
            .filter(Boolean)
            .map(f => f.replace(/ /g, '+') + ':wght@400;600;700;800;900')
            .join('&family=');
        const href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`;

        const id = 'settings-font-preview';
        let link = document.getElementById(id) as HTMLLinkElement | null;
        if (!link) {
            link = document.createElement('link');
            link.id = id;
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
        link.href = href;
    }, [calendarFonts.heading, calendarFonts.body]);

    useEffect(() => {
        const id = 'custom-font-faces';
        let style = document.getElementById(id) as HTMLStyleElement | null;
        if (!style) {
            style = document.createElement('style');
            style.id = id;
            document.head.appendChild(style);
        }
        style.textContent = customFonts.map(f => {
            const ext = f.url.split('.').pop()?.toLowerCase();
            const format = ext === 'woff2' ? 'woff2' : ext === 'woff' ? 'woff' : ext === 'otf' ? 'opentype' : 'truetype';
            return `@font-face { font-family: '${f.name}'; src: url('${f.url}') format('${format}'); font-display: swap; }`;
        }).join('\n');
    }, [customFonts]);

    useEffect(() => {
        const fetchVideoToggle = async () => {
            setIsLoadingVideoToggle(true);
            const { data: enabledData } = await supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'calendar_video_enabled')
                .maybeSingle();
            if (enabledData?.value !== undefined && enabledData?.value !== null) {
                setVideoEnabled(enabledData.value !== 'false');
            }

            const { data: textData } = await supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'calendar_video_placeholder_text')
                .maybeSingle();
            if (textData?.value) {
                setVideoPlaceholderText(textData.value);
            }
            setIsLoadingVideoToggle(false);
        };
        fetchVideoToggle();
    }, []);

    useEffect(() => {
        const fetchMarquee = async () => {
            setIsLoadingMarquee(true);
            const { data } = await supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'calendar_marquee_text')
                .maybeSingle();
            if (data?.value) {
                try {
                    const parsed = JSON.parse(data.value);
                    if (Array.isArray(parsed)) setMarqueeTexts(parsed);
                    else setMarqueeTexts([data.value]);
                } catch {
                    setMarqueeTexts([data.value]);
                }
            }
            setIsLoadingMarquee(false);
        };
        fetchMarquee();
    }, []);

    useEffect(() => {
        const fetchPrizes = async () => {
            setIsLoadingPrizes(true);
            const { data, error } = await supabase
                .from('gacha_prizes')
                .select('*')
                .order('created_at', { ascending: false });
            if (!error && data) {
                setGachaPrizes(data as GachaPrize[]);
            }
            setIsLoadingPrizes(false);
        };
        fetchPrizes();
    }, []);

    const saveVideoUrls = async (urls: string[]) => {
        const { error } = await supabase
            .from('site_settings')
            .upsert(
                { key: 'calendar_bg_video_urls', value: JSON.stringify(urls), updated_at: new Date().toISOString() },
                { onConflict: 'key' }
            );
        if (error) {
            console.error('Save error:', error);
            alert('Gagal menyimpan daftar video: ' + error.message);
            return false;
        }
        return true;
    };

    const saveMusicUrls = async (urls: string[]) => {
        await supabase.from('site_settings').upsert(
            { key: 'calendar_bg_music_urls', value: JSON.stringify(urls), updated_at: new Date().toISOString() },
            { onConflict: 'key' }
        );
    };

    const handleUploadMusic = async () => {
        const file = musicFileInputRef.current?.files?.[0];
        if (!file) {
            alert('Pilih file audio terlebih dahulu.');
            return;
        }

        const maxSize = 20 * 1024 * 1024; // 20MB
        if (file.size > maxSize) {
            alert('Ukuran file terlalu besar. Maksimal 20MB.');
            return;
        }

        const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/aac'];
        if (!allowedTypes.includes(file.type)) {
            alert('Format file tidak didukung. Gunakan MP3, WAV, OGG, atau AAC.');
            return;
        }

        setIsUploadingMusic(true);

        const ext = file.name.split('.').pop() || 'mp3';
        const fileName = `calendar-music-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from('site-assets')
            .upload(fileName, file, { upsert: true });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            alert('Gagal mengupload musik: ' + uploadError.message);
            setIsUploadingMusic(false);
            return;
        }

        const { data: urlData } = supabase.storage
            .from('site-assets')
            .getPublicUrl(fileName);

        const publicUrl = urlData.publicUrl;
        const updatedUrls = [...musicUrls, publicUrl];

        await saveMusicUrls(updatedUrls);
        setMusicUrls(updatedUrls);
        if (musicFileInputRef.current) musicFileInputRef.current.value = '';

        setIsUploadingMusic(false);
    };

    const handleRemoveMusic = async (index: number) => {
        if (!window.confirm('Hapus musik ini?')) return;
        const urlToRemove = musicUrls[index];

        // Only delete from storage if it's not a YouTube link
        const isYouTube = /(?:youtube\.com|youtu\.be)/.test(urlToRemove);
        if (!isYouTube && urlToRemove) {
            const urlParts = urlToRemove.split('/site-assets/');
            if (urlParts.length > 1) {
                const filePath = decodeURIComponent(urlParts[1]);
                await supabase.storage.from('site-assets').remove([filePath]);
            }
        }

        const updatedUrls = musicUrls.filter((_, i) => i !== index);
        setMusicUrls(updatedUrls);
        await saveMusicUrls(updatedUrls);
    };

    const handleMoveMusic = async (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= musicUrls.length) return;

        const updatedUrls = [...musicUrls];
        [updatedUrls[index], updatedUrls[newIndex]] = [updatedUrls[newIndex], updatedUrls[index]];

        await saveMusicUrls(updatedUrls);
        setMusicUrls(updatedUrls);
    };

    const handleAddYoutubeLink = async () => {
        const url = youtubeLink.trim();
        if (!url) { alert('Masukkan link YouTube terlebih dahulu.'); return; }
        const ytPatterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
        ];
        const isYt = ytPatterns.some(p => p.test(url));
        if (!isYt) { alert('Link YouTube tidak valid. Contoh format:\nhttps://www.youtube.com/watch?v=xxxxx\nhttps://youtu.be/xxxxx'); return; }
        const updatedUrls = [...musicUrls, url];
        setMusicUrls(updatedUrls);
        await saveMusicUrls(updatedUrls);
        setYoutubeLink('');
    };

    const handleUpload = async () => {
        const file = fileInputRef.current?.files?.[0];
        if (!file) {
            alert('Pilih file video terlebih dahulu.');
            return;
        }

        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
            alert('Ukuran file terlalu besar. Maksimal 100MB.');
            return;
        }

        const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg'];
        if (!allowedTypes.includes(file.type)) {
            alert('Format file tidak didukung. Gunakan MP4, WebM, atau OGG.');
            return;
        }

        setIsUploading(true);
        setUploadProgress('Mengupload video...');

        const ext = file.name.split('.').pop() || 'mp4';
        const fileName = `calendar-bg-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from('site-assets')
            .upload(fileName, file, { upsert: true });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            alert('Gagal mengupload video: ' + uploadError.message);
            setIsUploading(false);
            setUploadProgress('');
            return;
        }

        setUploadProgress('Menyimpan pengaturan...');

        const { data: urlData } = supabase.storage
            .from('site-assets')
            .getPublicUrl(fileName);

        const publicUrl = urlData.publicUrl;
        const updatedUrls = [...videoUrls, publicUrl];

        const saved = await saveVideoUrls(updatedUrls);
        if (saved) {
            setVideoUrls(updatedUrls);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } else {
            alert('Video terupload tapi gagal menyimpan URL ke pengaturan. Pastikan tabel "site_settings" sudah dibuat via SQL migration.');
        }

        setIsUploading(false);
        setUploadProgress('');
    };

    const handleRemoveVideo = async (index: number) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus video ini?')) return;

        setIsUploading(true);
        setUploadProgress('Menghapus...');

        const urlToRemove = videoUrls[index];
        if (urlToRemove) {
            const urlParts = urlToRemove.split('/site-assets/');
            if (urlParts.length > 1) {
                const filePath = decodeURIComponent(urlParts[1]);
                await supabase.storage.from('site-assets').remove([filePath]);
            }
        }

        const updatedUrls = videoUrls.filter((_, i) => i !== index);
        const saved = await saveVideoUrls(updatedUrls);
        if (saved) {
            setVideoUrls(updatedUrls);
        }

        setIsUploading(false);
        setUploadProgress('');
    };

    const handleMoveVideo = async (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= videoUrls.length) return;

        const updatedUrls = [...videoUrls];
        [updatedUrls[index], updatedUrls[newIndex]] = [updatedUrls[newIndex], updatedUrls[index]];

        const saved = await saveVideoUrls(updatedUrls);
        if (saved) {
            setVideoUrls(updatedUrls);
        }
    };

    const handleSaveDateRange = async () => {
        setIsSavingRange(true);
        const { error } = await supabase
            .from('site_settings')
            .upsert(
                { key: 'calendar_date_range', value: JSON.stringify(dateRange), updated_at: new Date().toISOString() },
                { onConflict: 'key' }
            );
        if (error) {
            console.error('Save date range error:', error);
            alert('Gagal menyimpan rentang tanggal: ' + error.message);
        } else {
            alert('Rentang tanggal berhasil disimpan.');
        }
        setIsSavingRange(false);
    };

    const handleUploadFont = async (file: File, target: 'heading' | 'body') => {
        if (!file) return;
        setIsUploadingFont(true);
        try {
            const ext = file.name.split('.').pop()?.toLowerCase();
            if (!['woff', 'woff2', 'ttf', 'otf'].includes(ext || '')) {
                alert('Format file tidak didukung. Gunakan .woff, .woff2, .ttf, atau .otf');
                setIsUploadingFont(false);
                return;
            }
            const fontName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
            const filePath = `fonts/${Date.now()}-${file.name}`;
            const { error: uploadError } = await supabase.storage.from('site-assets').upload(filePath, file);
            if (uploadError) throw uploadError;
            const { data: urlData } = supabase.storage.from('site-assets').getPublicUrl(filePath);
            const fontUrl = urlData.publicUrl;

            const newCustomFont = { name: fontName, url: fontUrl };
            const updatedCustomFonts = [...customFonts.filter(f => f.name !== fontName), newCustomFont];
            setCustomFonts(updatedCustomFonts);

            await supabase.from('site_settings').upsert(
                { key: 'calendar_custom_fonts', value: JSON.stringify(updatedCustomFonts), updated_at: new Date().toISOString() },
                { onConflict: 'key' }
            );

            setCalendarFonts(prev => ({ ...prev, [target]: fontName }));
            alert(`Font "${fontName}" berhasil diupload!`);
        } catch (error: any) {
            console.error('Font upload error:', error);
            alert('Gagal upload font: ' + error.message);
        }
        setIsUploadingFont(false);
    };

    const handleSaveFonts = async () => {
        setIsSavingFonts(true);
        const { error } = await supabase
            .from('site_settings')
            .upsert(
                { key: 'calendar_fonts', value: JSON.stringify(calendarFonts), updated_at: new Date().toISOString() },
                { onConflict: 'key' }
            );
        if (error) {
            console.error('Save fonts error:', error);
            alert('Gagal menyimpan pengaturan font: ' + error.message);
        } else {
            alert('Pengaturan font berhasil disimpan.');
        }
        setIsSavingFonts(false);
    };

    const handleUploadLogo = async () => {
        const file = logoFileInputRef.current?.files?.[0];
        if (!file) {
            alert('Pilih file gambar terlebih dahulu.');
            return;
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        if (!allowedTypes.includes(file.type)) {
            alert('Format file tidak didukung. Gunakan JPG, PNG, GIF, WebP, atau SVG.');
            return;
        }

        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            alert('Ukuran file terlalu besar. Maksimal 5MB.');
            return;
        }

        setIsUploadingLogo(true);

        const ext = file.name.split('.').pop() || 'png';
        const fileName = `calendar-logo-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from('site-assets')
            .upload(fileName, file, { upsert: true });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            alert('Gagal mengupload logo: ' + uploadError.message);
            setIsUploadingLogo(false);
            return;
        }

        const { data: urlData } = supabase.storage
            .from('site-assets')
            .getPublicUrl(fileName);

        const publicUrl = urlData.publicUrl;

        const { error: saveError } = await supabase
            .from('site_settings')
            .upsert(
                { key: 'calendar_logo_url', value: publicUrl, updated_at: new Date().toISOString() },
                { onConflict: 'key' }
            );

        if (saveError) {
            console.error('Save error:', saveError);
            alert('Gagal menyimpan logo: ' + saveError.message);
        } else {
            setLogoUrl(publicUrl);
            if (logoFileInputRef.current) logoFileInputRef.current.value = '';
        }

        setIsUploadingLogo(false);
    };

    const handleRemoveLogo = async () => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus logo?')) return;

        setIsUploadingLogo(true);

        // Remove from storage
        if (logoUrl) {
            const urlParts = logoUrl.split('/site-assets/');
            if (urlParts.length > 1) {
                const filePath = decodeURIComponent(urlParts[1]);
                await supabase.storage.from('site-assets').remove([filePath]);
            }
        }

        // Clear the setting
        await supabase
            .from('site_settings')
            .upsert(
                { key: 'calendar_logo_url', value: '', updated_at: new Date().toISOString() },
                { onConflict: 'key' }
            );

        setLogoUrl(null);
        setIsUploadingLogo(false);
    };

    const handleSaveBgColor = async () => {
        setIsSavingBgColor(true);
        const { error } = await supabase
            .from('site_settings')
            .upsert(
                { key: 'calendar_bg_color', value: bgColor, updated_at: new Date().toISOString() },
                { onConflict: 'key' }
            );
        if (error) {
            console.error('Save bg color error:', error);
            alert('Gagal menyimpan warna background: ' + error.message);
        } else {
            alert('Warna background berhasil disimpan.');
        }
        setIsSavingBgColor(false);
    };

    const handleSaveAutoSwitch = async () => {
        setIsSavingAutoSwitch(true);
        const { error } = await supabase
            .from('site_settings')
            .upsert(
                { key: 'calendar_auto_switch_minutes', value: String(autoSwitchMinutes), updated_at: new Date().toISOString() },
                { onConflict: 'key' }
            );
        if (error) {
            console.error('Save auto switch error:', error);
            alert('Gagal menyimpan pengaturan auto switch: ' + error.message);
        } else {
            alert('Pengaturan auto switch berhasil disimpan.');
        }
        setIsSavingAutoSwitch(false);
    };

    const handleSaveMarquee = async () => {
        setIsSavingMarquee(true);
        try {
            const filtered = marqueeTexts.filter(t => t.trim());
            const { error } = await supabase
                .from('site_settings')
                .upsert(
                    { key: 'calendar_marquee_text', value: JSON.stringify(filtered), updated_at: new Date().toISOString() },
                    { onConflict: 'key' }
                );
            if (error) throw error;
            setMarqueeTexts(filtered);
            alert('Teks marquee berhasil disimpan.');
        } catch (error: any) {
            console.error('Save marquee error:', error);
            alert('Gagal menyimpan teks marquee: ' + error.message);
        }
        setIsSavingMarquee(false);
    };

    const handleSaveVideoToggle = async () => {
        setIsSavingVideoToggle(true);
        const { error: err1 } = await supabase
            .from('site_settings')
            .upsert(
                { key: 'calendar_video_enabled', value: String(videoEnabled), updated_at: new Date().toISOString() },
                { onConflict: 'key' }
            );
        const { error: err2 } = await supabase
            .from('site_settings')
            .upsert(
                { key: 'calendar_video_placeholder_text', value: videoPlaceholderText, updated_at: new Date().toISOString() },
                { onConflict: 'key' }
            );
        if (err1 || err2) {
            console.error('Save video toggle error:', err1 || err2);
            alert('Gagal menyimpan pengaturan video: ' + (err1?.message || err2?.message));
        } else {
            alert('Pengaturan video berhasil disimpan.');
        }
        setIsSavingVideoToggle(false);
    };

    const refreshPrizes = async () => {
        const { data, error } = await supabase
            .from('gacha_prizes')
            .select('*')
            .order('created_at', { ascending: false });
        if (!error && data) {
            setGachaPrizes(data as GachaPrize[]);
        }
    };

    const handleAddPrize = async () => {
        const file = prizeFileInputRef.current?.files?.[0];
        if (!file) {
            alert('Pilih gambar hadiah terlebih dahulu.');
            return;
        }
        if (!newPrizeName.trim()) {
            alert('Masukkan nama hadiah terlebih dahulu.');
            return;
        }

        const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedImageTypes.includes(file.type)) {
            alert('Format gambar tidak didukung. Gunakan JPG, PNG, GIF, atau WebP.');
            return;
        }

        setIsUploadingPrize(true);

        const ext = file.name.split('.').pop() || 'jpg';
        const fileName = `gacha-prize-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from('site-assets')
            .upload(fileName, file, { upsert: true });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            alert('Gagal mengupload gambar: ' + uploadError.message);
            setIsUploadingPrize(false);
            return;
        }

        const { data: urlData } = supabase.storage
            .from('site-assets')
            .getPublicUrl(fileName);

        const publicUrl = urlData.publicUrl;

        const { error: insertError } = await supabase
            .from('gacha_prizes')
            .insert({
                name: newPrizeName.trim(),
                image_url: publicUrl,
                rarity: newPrizeRarity,
                is_active: true,
            });

        if (insertError) {
            console.error('Insert error:', insertError);
            alert('Gagal menyimpan hadiah: ' + insertError.message);
        } else {
            setNewPrizeName('');
            setNewPrizeRarity('common');
            if (prizeFileInputRef.current) prizeFileInputRef.current.value = '';
            await refreshPrizes();
        }

        setIsUploadingPrize(false);
    };

    const handleDeletePrize = async (prize: GachaPrize) => {
        if (!window.confirm(`Hapus hadiah "${prize.name}"?`)) return;

        const { error: deleteError } = await supabase
            .from('gacha_prizes')
            .delete()
            .eq('id', prize.id);

        if (deleteError) {
            console.error('Delete error:', deleteError);
            alert('Gagal menghapus hadiah: ' + deleteError.message);
            return;
        }

        // Remove image from storage
        if (prize.image_url) {
            const urlParts = prize.image_url.split('/site-assets/');
            if (urlParts.length > 1) {
                const filePath = decodeURIComponent(urlParts[1]);
                await supabase.storage.from('site-assets').remove([filePath]);
            }
        }

        await refreshPrizes();
    };

    const handleTogglePrize = async (prize: GachaPrize) => {
        const { error } = await supabase
            .from('gacha_prizes')
            .update({ is_active: !prize.is_active })
            .eq('id', prize.id);

        if (error) {
            console.error('Toggle error:', error);
            alert('Gagal mengubah status hadiah: ' + error.message);
            return;
        }

        await refreshPrizes();
    };

    const rarityBadgeClass = (rarity: GachaPrize['rarity']) => {
        switch (rarity) {
            case 'common': return 'bg-gray-400/10 text-gray-300';
            case 'rare': return 'bg-blue-400/10 text-blue-300';
            case 'legendary': return 'bg-amber-400/10 text-amber-300';
        }
    };

    return (
        <div className="fade-in space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">Pengaturan Situs</h1>
                <p className="text-[var(--color-text-secondary)] mt-1">Kelola pengaturan untuk halaman publik</p>
            </div>

            {/* Logo Kediaman */}
            <div className="card p-6">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">Logo Kediaman</h2>
                <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                    Upload logo yang akan ditampilkan di header kalender publik (/calendar.html)
                </p>

                {isLoadingLogo ? (
                    <div className="flex items-center justify-center h-24">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Current logo preview */}
                        {logoUrl ? (
                            <div className="flex items-start gap-4">
                                <div className="shrink-0 rounded-xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] p-4" style={{ maxWidth: 200 }}>
                                    <img
                                        src={logoUrl}
                                        alt="Logo Kediaman"
                                        className="max-w-full h-auto object-contain"
                                        style={{ maxHeight: 120 }}
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <p className="text-sm text-[var(--color-text-secondary)]">Logo aktif</p>
                                    <button
                                        onClick={handleRemoveLogo}
                                        disabled={isUploadingLogo}
                                        className="text-sm text-red-400 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Hapus Logo
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="border-2 border-dashed border-[var(--color-border)] rounded-xl p-8 text-center">
                                <svg className="w-12 h-12 mx-auto text-[var(--color-text-secondary)] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-[var(--color-text-secondary)]">Belum ada logo</p>
                                <p className="text-sm text-[var(--color-text-secondary)] mt-1">Upload logo untuk ditampilkan di header kalender</p>
                            </div>
                        )}

                        {/* Upload new logo */}
                        <div className="border-t border-[var(--color-border)] pt-6">
                            <label className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-3">
                                {logoUrl ? 'Ganti Logo' : 'Upload Logo'}
                            </label>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    ref={logoFileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                                    disabled={isUploadingLogo}
                                    className="form-input flex-grow py-2 px-3 text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-primary)] file:text-white hover:file:bg-[var(--color-primary-dark)] file:cursor-pointer"
                                />
                                <button
                                    onClick={handleUploadLogo}
                                    disabled={isUploadingLogo}
                                    className="btn-primary py-2.5 px-6 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                >
                                    {isUploadingLogo ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                            <span>Mengupload...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                            <span>Upload</span>
                                        </>
                                    )}
                                </button>
                            </div>
                            <p className="text-xs text-[var(--color-text-secondary)] mt-2">
                                Format: JPG, PNG, GIF, WebP, SVG. Maksimal 5MB. Rekomendasi: latar belakang transparan (PNG/SVG).
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Warna Background Kalender */}
            <div className="card p-6">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">Warna Background Kalender</h2>
                <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                    Atur warna background utama untuk halaman kalender publik (/calendar.html)
                </p>

                {isLoadingBgColor ? (
                    <div className="flex items-center justify-center h-24">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Color picker row */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <label className="text-sm font-medium text-[var(--color-text-primary)] w-28 shrink-0">Background</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={bgColor}
                                    onChange={e => setBgColor(e.target.value)}
                                    disabled={isSavingBgColor}
                                    className="w-10 h-10 rounded-lg border border-[var(--color-border)] cursor-pointer"
                                    style={{ padding: 2 }}
                                />
                                <input
                                    type="text"
                                    value={bgColor}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (/^#[0-9a-fA-F]{0,6}$/.test(val)) setBgColor(val);
                                    }}
                                    disabled={isSavingBgColor}
                                    className="form-input py-2 px-3 text-sm w-28 font-mono"
                                    maxLength={7}
                                    placeholder="#0a2e1a"
                                />
                            </div>
                        </div>

                        {/* Preset colors */}
                        <div>
                            <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Preset Warna</p>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { color: '#0a2e1a', label: 'Hijau' },
                                    { color: '#1a1a2e', label: 'Navy' },
                                    { color: '#2e1a1a', label: 'Merah' },
                                    { color: '#1a1a1a', label: 'Hitam' },
                                    { color: '#2e2e1a', label: 'Olive' },
                                    { color: '#1a2e2e', label: 'Teal' },
                                ].map(preset => (
                                    <button
                                        key={preset.color}
                                        onClick={() => setBgColor(preset.color)}
                                        disabled={isSavingBgColor}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors text-xs font-medium ${
                                            bgColor === preset.color
                                                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                                                : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/50'
                                        }`}
                                    >
                                        <span
                                            className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                                            style={{ backgroundColor: preset.color }}
                                        />
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="border border-[var(--color-border)] rounded-xl p-4 bg-[var(--color-surface)]">
                            <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">Preview</p>
                            <div
                                className="rounded-lg p-4 border"
                                style={{
                                    backgroundColor: bgColor,
                                    borderColor: adjustColor(bgColor, 40),
                                }}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div
                                        className="rounded-md px-3 py-1.5 text-xs font-bold"
                                        style={{
                                            backgroundColor: adjustColor(bgColor, 15),
                                            color: '#FFD700',
                                            fontFamily: "'Orbitron', monospace",
                                        }}
                                    >
                                        SAMPLE HEADER
                                    </div>
                                </div>
                                <div
                                    className="rounded-md p-2 text-xs"
                                    style={{
                                        backgroundColor: adjustColor(bgColor, 8),
                                        color: '#E8F5E9',
                                        fontFamily: "'Poppins', sans-serif",
                                    }}
                                >
                                    Preview konten kalender dengan warna background ini
                                </div>
                            </div>
                        </div>

                        <p className="text-xs text-[var(--color-text-secondary)]">
                            Warna saat ini: {bgColor}
                        </p>

                        <div className="pt-2">
                            <button
                                onClick={handleSaveBgColor}
                                disabled={isSavingBgColor}
                                className="btn-primary py-2.5 px-6 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSavingBgColor ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        <span>Menyimpan...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Simpan</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Video Panel Toggle */}
            <div className="card p-6">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">Tampilan Video Kalender</h2>
                <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                    Aktifkan atau nonaktifkan panel video di halaman kalender publik (/calendar.html). Jika dinonaktifkan, akan tampil placeholder dengan teks kustom.
                </p>

                {isLoadingVideoToggle ? (
                    <div className="flex items-center justify-center h-24">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Toggle */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <label className="text-sm font-medium text-[var(--color-text-primary)] w-28 shrink-0">Status Video</label>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setVideoEnabled(true)}
                                    disabled={isSavingVideoToggle}
                                    className={`px-4 py-2 rounded-lg border transition-colors text-sm font-medium ${
                                        videoEnabled
                                            ? 'border-green-500 bg-green-500/10 text-green-400'
                                            : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-green-500/50'
                                    }`}
                                >
                                    ON — Tampilkan Video
                                </button>
                                <button
                                    onClick={() => setVideoEnabled(false)}
                                    disabled={isSavingVideoToggle}
                                    className={`px-4 py-2 rounded-lg border transition-colors text-sm font-medium ${
                                        !videoEnabled
                                            ? 'border-red-500 bg-red-500/10 text-red-400'
                                            : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-red-500/50'
                                    }`}
                                >
                                    OFF — Tampilkan Placeholder
                                </button>
                            </div>
                        </div>

                        {/* Placeholder text (only visible when OFF) */}
                        {!videoEnabled && (
                            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                                <label className="text-sm font-medium text-[var(--color-text-primary)] w-28 shrink-0 pt-2">Teks Placeholder</label>
                                <div className="flex-grow">
                                    <input
                                        type="text"
                                        value={videoPlaceholderText}
                                        onChange={e => setVideoPlaceholderText(e.target.value)}
                                        disabled={isSavingVideoToggle}
                                        className="form-input w-full py-2 px-3 text-sm"
                                        placeholder="Contoh: Segera hadir - Stay tuned!"
                                        maxLength={200}
                                    />
                                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                                        Teks ini akan ditampilkan di area video saat video dinonaktifkan. Maksimal 200 karakter.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Preview */}
                        <div className="border border-[var(--color-border)] rounded-xl p-4 bg-[var(--color-surface)]">
                            <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">Preview</p>
                            <div
                                className="rounded-lg overflow-hidden border border-[var(--color-border)]"
                                style={{ paddingBottom: '30%', position: 'relative' }}
                            >
                                {videoEnabled ? (
                                    <div style={{
                                        position: 'absolute',
                                        inset: 0,
                                        backgroundColor: '#000',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <span className="text-white/50 text-sm">Video akan ditampilkan di sini</span>
                                    </div>
                                ) : (
                                    <div style={{
                                        position: 'absolute',
                                        inset: 0,
                                        backgroundColor: '#FFFFFF',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <span style={{ color: '#6B7280', fontSize: 14, fontWeight: 600, textAlign: 'center', padding: '0 16px' }}>
                                            {videoPlaceholderText || 'Video tidak tersedia'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <p className="text-xs text-[var(--color-text-secondary)]">
                            Status saat ini: {videoEnabled ? 'Video aktif' : 'Placeholder aktif'}
                        </p>

                        <div className="pt-2">
                            <button
                                onClick={handleSaveVideoToggle}
                                disabled={isSavingVideoToggle}
                                className="btn-primary py-2.5 px-6 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSavingVideoToggle ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        <span>Menyimpan...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Simpan</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Marquee Text Settings */}
            <div className="card p-6">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">Marquee Text Kalender</h2>
                <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                    Atur teks berjalan (marquee) yang ditampilkan di halaman kalender mode compact. Bisa menambahkan beberapa teks.
                </p>

                {isLoadingMarquee ? (
                    <div className="flex items-center justify-center h-24">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {marqueeTexts.map((text, index) => (
                            <div key={index} className="flex items-center gap-3">
                                <span className="text-sm font-medium text-[var(--color-text-secondary)] w-6 shrink-0">{index + 1}.</span>
                                <input
                                    type="text"
                                    value={text}
                                    onChange={e => {
                                        const updated = [...marqueeTexts];
                                        updated[index] = e.target.value;
                                        setMarqueeTexts(updated);
                                    }}
                                    disabled={isSavingMarquee}
                                    placeholder="Masukkan teks marquee..."
                                    className="form-input py-2 px-3 text-sm flex-1"
                                />
                                <button
                                    onClick={() => setMarqueeTexts(marqueeTexts.filter((_, i) => i !== index))}
                                    disabled={isSavingMarquee}
                                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                                    title="Hapus"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        ))}

                        <button
                            onClick={() => setMarqueeTexts([...marqueeTexts, ''])}
                            disabled={isSavingMarquee}
                            className="flex items-center gap-2 text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] transition-colors disabled:opacity-50"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Tambah Teks Marquee</span>
                        </button>

                        <p className="text-xs text-[var(--color-text-secondary)]">
                            Hapus semua item untuk menyembunyikan marquee. Setiap teks akan dipisahkan dengan simbol di marquee.
                        </p>

                        <div className="pt-2">
                            <button
                                onClick={handleSaveMarquee}
                                disabled={isSavingMarquee}
                                className="btn-primary py-2.5 px-6 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSavingMarquee ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        <span>Menyimpan...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Simpan</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="card p-6">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">Video Broadcast Kalender</h2>
                <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                    Upload video yang akan ditampilkan di halaman kalender publik (/calendar.html). Urutan video dapat diatur.
                </p>

                {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Video list */}
                        {videoUrls.length === 0 ? (
                            <div className="border-2 border-dashed border-[var(--color-border)] rounded-xl p-8 text-center">
                                <svg className="w-12 h-12 mx-auto text-[var(--color-text-secondary)] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <p className="text-[var(--color-text-secondary)]">Belum ada video</p>
                                <p className="text-sm text-[var(--color-text-secondary)] mt-1">Upload video untuk ditampilkan di halaman kalender publik</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-2">
                                    Daftar Video ({videoUrls.length} item)
                                </label>
                                {videoUrls.map((url, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
                                    >
                                        {/* Video preview */}
                                        <div className="shrink-0 rounded-lg overflow-hidden border border-[var(--color-border)] bg-black" style={{ width: 150 }}>
                                            <video
                                                src={url}
                                                muted
                                                className="w-full object-contain"
                                                style={{ height: 84, backgroundColor: '#000' }}
                                            />
                                        </div>

                                        {/* URL info */}
                                        <div className="flex-grow min-w-0">
                                            <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-0.5">Video {index + 1}</p>
                                            <p className="text-xs text-[var(--color-text-secondary)] truncate" title={url}>{url}</p>
                                        </div>

                                        {/* Reorder buttons */}
                                        <div className="shrink-0 flex flex-col gap-1">
                                            <button
                                                onClick={() => handleMoveVideo(index, 'up')}
                                                disabled={isUploading || index === 0}
                                                title="Pindah ke atas"
                                                className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-interactive)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleMoveVideo(index, 'down')}
                                                disabled={isUploading || index === videoUrls.length - 1}
                                                title="Pindah ke bawah"
                                                className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-interactive)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                        </div>

                                        {/* Delete button */}
                                        <button
                                            onClick={() => handleRemoveVideo(index)}
                                            disabled={isUploading}
                                            title="Hapus video"
                                            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Upload new video */}
                        <div className="border-t border-[var(--color-border)] pt-6">
                            <label className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-3">
                                Tambah Video Baru
                            </label>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="video/mp4,video/webm,video/ogg"
                                    disabled={isUploading}
                                    className="form-input flex-grow py-2 px-3 text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-primary)] file:text-white hover:file:bg-[var(--color-primary-dark)] file:cursor-pointer"
                                />
                                <button
                                    onClick={handleUpload}
                                    disabled={isUploading}
                                    className="btn-primary py-2.5 px-6 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                >
                                    {isUploading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                            <span>{uploadProgress}</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                            <span>Upload</span>
                                        </>
                                    )}
                                </button>
                            </div>
                            <p className="text-xs text-[var(--color-text-secondary)] mt-2">
                                Format: MP4, WebM, OGG. Maksimal 100MB. Rekomendasi: resolusi 1920x1080, durasi pendek (10-30 detik).
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Calendar Date Range */}
            <div className="card p-6">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">Rentang Tanggal Kalender</h2>
                <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                    Atur rentang bulan/tahun yang ditampilkan di kalender publik
                </p>

                {isLoadingRange ? (
                    <div className="flex items-center justify-center h-24">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* From row */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <label className="text-sm font-medium text-[var(--color-text-primary)] w-16 shrink-0">Dari</label>
                            <select
                                value={dateRange.startMonth}
                                onChange={e => setDateRange(prev => ({ ...prev, startMonth: Number(e.target.value) }))}
                                disabled={isSavingRange}
                                className="form-select py-2 px-3 text-sm w-full sm:w-48"
                            >
                                {MONTHS_ID.map((name, i) => (
                                    <option key={i + 1} value={i + 1}>{name}</option>
                                ))}
                            </select>
                            <input
                                type="number"
                                value={dateRange.startYear}
                                onChange={e => setDateRange(prev => ({ ...prev, startYear: Number(e.target.value) }))}
                                disabled={isSavingRange}
                                min={2000}
                                max={2100}
                                className="form-input py-2 px-3 text-sm w-full sm:w-28"
                                placeholder="Tahun"
                            />
                        </div>

                        {/* To row */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <label className="text-sm font-medium text-[var(--color-text-primary)] w-16 shrink-0">Sampai</label>
                            <select
                                value={dateRange.endMonth}
                                onChange={e => setDateRange(prev => ({ ...prev, endMonth: Number(e.target.value) }))}
                                disabled={isSavingRange}
                                className="form-select py-2 px-3 text-sm w-full sm:w-48"
                            >
                                {MONTHS_ID.map((name, i) => (
                                    <option key={i + 1} value={i + 1}>{name}</option>
                                ))}
                            </select>
                            <input
                                type="number"
                                value={dateRange.endYear}
                                onChange={e => setDateRange(prev => ({ ...prev, endYear: Number(e.target.value) }))}
                                disabled={isSavingRange}
                                min={2000}
                                max={2100}
                                className="form-input py-2 px-3 text-sm w-full sm:w-28"
                                placeholder="Tahun"
                            />
                        </div>

                        {/* Current saved range info */}
                        <p className="text-xs text-[var(--color-text-secondary)]">
                            Rentang saat ini: {MONTHS_ID[dateRange.startMonth - 1]} {dateRange.startYear} &ndash; {MONTHS_ID[dateRange.endMonth - 1]} {dateRange.endYear}
                        </p>

                        <div className="pt-2">
                            <button
                                onClick={handleSaveDateRange}
                                disabled={isSavingRange}
                                className="btn-primary py-2.5 px-6 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSavingRange ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        <span>Menyimpan...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Simpan</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Auto Switch Bulan Kalender */}
            <div className="card p-6">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">Auto Switch Bulan Kalender</h2>
                <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                    Atur interval otomatis pergantian bulan di halaman kalender publik (/calendar.html). Set ke 0 untuk menonaktifkan.
                </p>

                {isLoadingAutoSwitch ? (
                    <div className="flex items-center justify-center h-24">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Input row */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <label className="text-sm font-medium text-[var(--color-text-primary)] w-28 shrink-0">Interval (menit)</label>
                            <input
                                type="number"
                                value={autoSwitchMinutes}
                                onChange={e => setAutoSwitchMinutes(Math.max(0, Math.min(60, parseInt(e.target.value) || 0)))}
                                disabled={isSavingAutoSwitch}
                                min={0}
                                max={60}
                                className="form-input py-2 px-3 text-sm w-full sm:w-28"
                                placeholder="0"
                            />
                        </div>

                        {/* Quick presets */}
                        <div>
                            <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Preset Interval</p>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { value: 0, label: 'Off' },
                                    { value: 1, label: '1 Menit' },
                                    { value: 2, label: '2 Menit' },
                                    { value: 3, label: '3 Menit' },
                                    { value: 5, label: '5 Menit' },
                                    { value: 10, label: '10 Menit' },
                                ].map(preset => (
                                    <button
                                        key={preset.value}
                                        onClick={() => setAutoSwitchMinutes(preset.value)}
                                        disabled={isSavingAutoSwitch}
                                        className={`px-3 py-1.5 rounded-lg border transition-colors text-xs font-medium ${
                                            autoSwitchMinutes === preset.value
                                                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                                                : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/50'
                                        }`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <p className="text-xs text-[var(--color-text-secondary)]">
                            {autoSwitchMinutes > 0
                                ? `Kalender akan otomatis berganti bulan setiap ${autoSwitchMinutes} menit.`
                                : 'Auto switch dinonaktifkan. Pergantian bulan hanya melalui klik manual.'}
                        </p>

                        <div className="pt-2">
                            <button
                                onClick={handleSaveAutoSwitch}
                                disabled={isSavingAutoSwitch}
                                className="btn-primary py-2.5 px-6 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSavingAutoSwitch ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        <span>Menyimpan...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Simpan</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Calendar Font Settings */}
            <div className="card p-6">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">Font Kalender</h2>
                <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                    Atur font heading dan body untuk halaman kalender publik
                </p>

                {isLoadingFonts ? (
                    <div className="flex items-center justify-center h-24">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Heading font */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <label className="text-sm font-medium text-[var(--color-text-primary)] w-28 shrink-0">Font Heading</label>
                            <select
                                value={calendarFonts.heading}
                                onChange={e => setCalendarFonts(prev => ({ ...prev, heading: e.target.value }))}
                                disabled={isSavingFonts}
                                className="form-select py-2 px-3 text-sm w-full sm:w-64"
                            >
                                {HEADING_FONTS.map(f => (
                                    <option key={f} value={f}>{f}</option>
                                ))}
                                {customFonts.length > 0 && <option disabled>── Custom Fonts ──</option>}
                                {customFonts.map(f => (
                                    <option key={`custom-${f.name}`} value={f.name}>{f.name} (Custom)</option>
                                ))}
                            </select>
                        </div>

                        {/* Heading font upload */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <label className="text-sm font-medium text-[var(--color-text-primary)] w-28 shrink-0"></label>
                            <div className="flex items-center gap-2">
                                <input
                                    ref={fontFileInputRef}
                                    type="file"
                                    accept=".woff,.woff2,.ttf,.otf"
                                    className="hidden"
                                    onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) handleUploadFont(file, 'heading');
                                        e.target.value = '';
                                    }}
                                />
                                <button
                                    onClick={() => fontFileInputRef.current?.click()}
                                    disabled={isUploadingFont}
                                    className="text-xs px-3 py-1.5 rounded-lg border border-dashed border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors disabled:opacity-50"
                                >
                                    {isUploadingFont ? 'Uploading...' : '📁 Upload Font Heading'}
                                </button>
                            </div>
                        </div>

                        {/* Body font */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <label className="text-sm font-medium text-[var(--color-text-primary)] w-28 shrink-0">Font Body</label>
                            <select
                                value={calendarFonts.body}
                                onChange={e => setCalendarFonts(prev => ({ ...prev, body: e.target.value }))}
                                disabled={isSavingFonts}
                                className="form-select py-2 px-3 text-sm w-full sm:w-64"
                            >
                                {BODY_FONTS.map(f => (
                                    <option key={f} value={f}>{f}</option>
                                ))}
                                {customFonts.length > 0 && <option disabled>── Custom Fonts ──</option>}
                                {customFonts.map(f => (
                                    <option key={`custom-${f.name}`} value={f.name}>{f.name} (Custom)</option>
                                ))}
                            </select>
                        </div>

                        {/* Body font upload */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <label className="text-sm font-medium text-[var(--color-text-primary)] w-28 shrink-0"></label>
                            <div className="flex items-center gap-2">
                                <input
                                    ref={fontFileInputBodyRef}
                                    type="file"
                                    accept=".woff,.woff2,.ttf,.otf"
                                    className="hidden"
                                    onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) handleUploadFont(file, 'body');
                                        e.target.value = '';
                                    }}
                                />
                                <button
                                    onClick={() => fontFileInputBodyRef.current?.click()}
                                    disabled={isUploadingFont}
                                    className="text-xs px-3 py-1.5 rounded-lg border border-dashed border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors disabled:opacity-50"
                                >
                                    {isUploadingFont ? 'Uploading...' : '📁 Upload Font Body'}
                                </button>
                            </div>
                        </div>

                        {/* Font preview */}
                        <div className="border border-[var(--color-border)] rounded-xl p-4 bg-[var(--color-surface)]">
                            <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">Preview</p>
                            <div className="space-y-2">
                                <p style={{ fontFamily: `'${calendarFonts.heading}', monospace`, fontSize: 20, fontWeight: 700 }} className="text-[var(--color-text-primary)]">
                                    LIVE CALENDAR — HEADING FONT
                                </p>
                                <p style={{ fontFamily: `'${calendarFonts.body}', sans-serif`, fontSize: 14 }} className="text-[var(--color-text-secondary)]">
                                    Ini adalah contoh teks body yang akan tampil di halaman kalender publik. The quick brown fox jumps over the lazy dog.
                                </p>
                            </div>
                        </div>

                        {/* Current info */}
                        <p className="text-xs text-[var(--color-text-secondary)]">
                            Font saat ini: Heading = {calendarFonts.heading}, Body = {calendarFonts.body}
                        </p>

                        <div className="pt-2">
                            <button
                                onClick={handleSaveFonts}
                                disabled={isSavingFonts}
                                className="btn-primary py-2.5 px-6 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSavingFonts ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        <span>Menyimpan...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Simpan</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Music Background Management */}
            <div className="card p-6">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">Musik Background Kalender</h2>
                <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                    Upload musik yang akan diputar di halaman kalender publik (/calendar.html)
                </p>

                {isLoadingMusic ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Music list */}
                        {musicUrls.length === 0 ? (
                            <div className="border-2 border-dashed border-[var(--color-border)] rounded-xl p-8 text-center">
                                <p className="text-2xl mb-3">🎵</p>
                                <p className="text-[var(--color-text-secondary)]">Belum ada musik background</p>
                                <p className="text-sm text-[var(--color-text-secondary)] mt-1">Upload musik untuk diputar di halaman kalender publik</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-2">
                                    Daftar Musik ({musicUrls.length} item)
                                </label>
                                {musicUrls.map((url, index) => {
                                    const isYouTube = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)/.test(url);
                                    const fileName = decodeURIComponent(url.split('/').pop() || url);
                                    const displayName = fileName.length > 40 ? fileName.slice(0, 37) + '...' : fileName;
                                    return (
                                        <div
                                            key={index}
                                            className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
                                        >
                                            {/* Icon */}
                                            <span className="shrink-0 text-xl" style={isYouTube ? { color: '#ef4444' } : undefined}>{isYouTube ? '▶' : '🎵'}</span>

                                            {/* File name + preview */}
                                            <div className="flex-grow min-w-0">
                                                <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1" title={isYouTube ? url : fileName}>
                                                    {isYouTube ? 'YouTube' : displayName}
                                                </p>
                                                {isYouTube ? (
                                                    <p className="text-xs text-[var(--color-text-secondary)] truncate" title={url}>{url}</p>
                                                ) : (
                                                    <audio src={url} controls className="w-full" style={{ height: 32 }} />
                                                )}
                                            </div>

                                            {/* Reorder buttons */}
                                            <div className="shrink-0 flex flex-col gap-1">
                                                <button
                                                    onClick={() => handleMoveMusic(index, 'up')}
                                                    disabled={isUploadingMusic || index === 0}
                                                    title="Pindah ke atas"
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-interactive)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleMoveMusic(index, 'down')}
                                                    disabled={isUploadingMusic || index === musicUrls.length - 1}
                                                    title="Pindah ke bawah"
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-interactive)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </button>
                                            </div>

                                            {/* Delete button */}
                                            <button
                                                onClick={() => handleRemoveMusic(index)}
                                                disabled={isUploadingMusic}
                                                title="Hapus musik"
                                                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Upload new music */}
                        <div className="border-t border-[var(--color-border)] pt-6 space-y-6">
                            {/* Upload audio file */}
                            <div>
                                <label className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-3">
                                    Upload File Audio
                                </label>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input
                                        ref={musicFileInputRef}
                                        type="file"
                                        accept="audio/mpeg,audio/wav,audio/ogg,audio/mp3,audio/aac"
                                        disabled={isUploadingMusic}
                                        className="form-input flex-grow py-2 px-3 text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-primary)] file:text-white hover:file:bg-[var(--color-primary-dark)] file:cursor-pointer"
                                    />
                                    <button
                                        onClick={handleUploadMusic}
                                        disabled={isUploadingMusic}
                                        className="btn-primary py-2.5 px-6 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                    >
                                        {isUploadingMusic ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                                <span>Mengupload...</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                </svg>
                                                <span>Upload</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                                <p className="text-xs text-[var(--color-text-secondary)] mt-2">
                                    Format: MP3, WAV, OGG, AAC. Maksimal 20MB per file.
                                </p>
                            </div>

                            {/* Divider */}
                            <div className="flex items-center gap-4">
                                <div className="flex-grow border-t border-[var(--color-border)]"></div>
                                <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Atau</span>
                                <div className="flex-grow border-t border-[var(--color-border)]"></div>
                            </div>

                            {/* YouTube link */}
                            <div>
                                <label className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-3">
                                    Tambah Link YouTube
                                </label>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input
                                        type="text"
                                        value={youtubeLink}
                                        onChange={e => setYoutubeLink(e.target.value)}
                                        placeholder="https://www.youtube.com/watch?v=xxxxx"
                                        className="form-input flex-grow py-2 px-3 text-sm"
                                        onKeyDown={e => { if (e.key === 'Enter') handleAddYoutubeLink(); }}
                                    />
                                    <button
                                        onClick={handleAddYoutubeLink}
                                        className="btn-primary py-2.5 px-6 flex items-center justify-center gap-2 shrink-0"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                        </svg>
                                        <span>Tambah</span>
                                    </button>
                                </div>
                                <p className="text-xs text-[var(--color-text-secondary)] mt-2">
                                    Contoh: https://www.youtube.com/watch?v=xxxxx atau https://youtu.be/xxxxx
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Gacha Prize Management */}
            <div className="card p-6">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">Hadiah Gachapon Doorprize</h2>
                <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                    Kelola hadiah untuk game gachapon (/gacha.html)
                </p>

                {/* Add New Prize Form */}
                <div className="border border-[var(--color-border)] rounded-xl p-4 mb-6 bg-[var(--color-surface)]">
                    <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-4">
                        Tambah Hadiah Baru
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-1">
                                Nama Hadiah
                            </label>
                            <input
                                type="text"
                                value={newPrizeName}
                                onChange={e => setNewPrizeName(e.target.value)}
                                placeholder="Contoh: Voucher Diskon 50%"
                                disabled={isUploadingPrize}
                                className="form-input w-full py-2 px-3 text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-1">
                                Rarity
                            </label>
                            <select
                                value={newPrizeRarity}
                                onChange={e => setNewPrizeRarity(e.target.value as 'common' | 'rare' | 'legendary')}
                                disabled={isUploadingPrize}
                                className="form-select w-full sm:w-48 py-2 px-3 text-sm"
                            >
                                <option value="common">Common</option>
                                <option value="rare">Rare</option>
                                <option value="legendary">Legendary</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-1">
                                Gambar Hadiah
                            </label>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    ref={prizeFileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/gif,image/webp"
                                    disabled={isUploadingPrize}
                                    className="form-input flex-grow py-2 px-3 text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-primary)] file:text-white hover:file:bg-[var(--color-primary-dark)] file:cursor-pointer"
                                />
                                <button
                                    onClick={handleAddPrize}
                                    disabled={isUploadingPrize}
                                    className="btn-primary py-2.5 px-6 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                >
                                    {isUploadingPrize ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                            <span>Mengupload...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                            </svg>
                                            <span>Upload Hadiah</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Prize List */}
                <div>
                    <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
                        Daftar Hadiah {!isLoadingPrizes && `(${gachaPrizes.length} item)`}
                    </h3>

                    {isLoadingPrizes ? (
                        <div className="flex items-center justify-center h-24">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
                        </div>
                    ) : gachaPrizes.length === 0 ? (
                        <div className="border-2 border-dashed border-[var(--color-border)] rounded-xl p-8 text-center">
                            <svg className="w-10 h-10 mx-auto text-[var(--color-text-secondary)] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                            </svg>
                            <p className="text-[var(--color-text-secondary)]">Belum ada hadiah</p>
                            <p className="text-sm text-[var(--color-text-secondary)] mt-1">Tambah hadiah menggunakan form di atas</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {gachaPrizes.map(prize => (
                                <div
                                    key={prize.id}
                                    className="flex items-center gap-4 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/30 transition-colors"
                                >
                                    {/* Thumbnail */}
                                    <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-[var(--color-border)] bg-[var(--color-interactive)]">
                                        {prize.image_url ? (
                                            <img
                                                src={prize.image_url}
                                                alt={prize.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <svg className="w-6 h-6 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-grow min-w-0">
                                        <p className="font-semibold text-[var(--color-text-primary)] truncate">{prize.name}</p>
                                        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                                            {new Date(prize.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </p>
                                    </div>

                                    {/* Rarity Badge */}
                                    <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${rarityBadgeClass(prize.rarity)}`}>
                                        {prize.rarity}
                                    </span>

                                    {/* Toggle Active */}
                                    <button
                                        onClick={() => handleTogglePrize(prize)}
                                        title={prize.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                        className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                                            prize.is_active
                                                ? 'text-green-500 hover:bg-green-500/10'
                                                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-interactive)]'
                                        }`}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </button>

                                    {/* Delete */}
                                    <button
                                        onClick={() => handleDeletePrize(prize)}
                                        title="Hapus hadiah"
                                        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SiteSettingsView;
