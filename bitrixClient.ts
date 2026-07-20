/**
 * Bitrix24 REST API Client
 * Documentation: https://apidocs.bitrix24.com/
 * 
 * SETUP INSTRUCTIONS:
 * 1. Ganti PLACEHOLDER_BITRIX_URL dengan URL Bitrix24 Anda (contoh: https://yourdomain.bitrix24.com)
 * 2. Ganti PLACEHOLDER_WEBHOOK_KEY dengan webhook key Anda dari Bitrix24
 * 3. Dapatkan webhook key dari: Settings > Integration > Webhooks > Incoming webhooks
 */

// ============== CONFIGURATION FROM ENV ==============
const BITRIX_API_URL = import.meta.env.VITE_BITRIX_API_URL || '';
const BITRIX_WEBHOOK_KEY = import.meta.env.VITE_BITRIX_WEBHOOK_KEY || '';

if (!BITRIX_API_URL || !BITRIX_WEBHOOK_KEY) {
    console.warn('Bitrix24 credentials belum dikonfigurasi. Pastikan VITE_BITRIX_API_URL dan VITE_BITRIX_WEBHOOK_KEY ada di file .env');
}

// ============== TYPES ==============
interface BitrixDeal {
    ID: string;
    TITLE: string;
    STAGE_ID: string;
    COMPANY_ID?: string;
    CONTACT_ID?: string;
    OPPORTUNITY?: string;
    [key: string]: any;
}

interface BitrixContact {
    ID: string;
    NAME: string;
    LAST_NAME?: string;
    PHONE?: Array<{ VALUE: string }>;
    EMAIL?: Array<{ VALUE: string }>;
    [key: string]: any;
}

interface BitrixLead {
    ID: string;
    TITLE: string;
    STATUS_ID: string;
    SOURCE_ID?: string;
    PHONE?: Array<{ VALUE: string }>;
    EMAIL?: Array<{ VALUE: string }>;
    [key: string]: any;
}

interface BitrixAPIResponse<T> {
    result?: T | T[];
    error?: string;
    error_description?: string;
}

// ============== HELPER FUNCTIONS ==============

/**
 * Memvalidasi konfigurasi Bitrix24
 */
function validateConfig(): boolean {
    if (!BITRIX_API_URL || !BITRIX_WEBHOOK_KEY) {
        throw new Error(
            'Bitrix24 belum dikonfigurasi. Pastikan variabel berikut ada di file .env:\n' +
            '1. VITE_BITRIX_API_URL (contoh: https://yourdomain.bitrix24.com)\n' +
            '2. VITE_BITRIX_WEBHOOK_KEY (dari Bitrix24 Settings > Integration > Webhooks)'
        );
    }
    return true;
}

/**
 * Generic Bitrix24 API call
 */
async function callBitrixAPI<T>(
    method: string,
    params: Record<string, any> = {}
): Promise<BitrixAPIResponse<T>> {
    try {
        validateConfig();

        const url = `${BITRIX_API_URL}/rest/${BITRIX_WEBHOOK_KEY}/${method}/`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        const data: BitrixAPIResponse<T> = await response.json();

        if (data.error) {
            throw new Error(`Bitrix24 Error: ${data.error_description || data.error}`);
        }

        return data;
    } catch (error) {
        console.error('Bitrix24 API Error:', error);
        throw error;
    }
}

// ============== DEALS (DEALS) ==============

/**
 * Mendapatkan daftar deals dari Bitrix24
 * @param filter - Filter untuk deals (opsional)
 * @param limit - Jumlah hasil maksimal
 */
export async function getDeals(
    filter: Record<string, any> = {},
    limit: number = 50
): Promise<BitrixDeal[]> {
    const params = {
        order: { ID: 'DESC' },
        filter,
        select: [
            'ID', 'TITLE', 'STAGE_ID', 'COMPANY_ID', 'CONTACT_ID',
            'OPPORTUNITY', 'DATE_CREATE', 'DATE_MODIFY', 'CREATED_BY'
        ],
        limit,
    };

    const response = await callBitrixAPI<BitrixDeal[]>('crm.deal.list', params);
    return response.result as BitrixDeal[] || [];
}

/**
 * Membuat deal baru di Bitrix24
 */
export async function createDeal(dealData: {
    TITLE: string;
    COMPANY_ID?: string;
    CONTACT_ID?: string;
    STAGE_ID?: string;
    OPPORTUNITY?: string;
    [key: string]: any;
}): Promise<{ ID: string }> {
    const params = {
        fields: dealData,
    };

    const response = await callBitrixAPI<{ ID: string }>('crm.deal.add', params);
    return response.result as { ID: string } || { ID: '' };
}

/**
 * Mendapatkan detail deal berdasarkan ID
 */
export async function getDealById(dealId: string): Promise<BitrixDeal | null> {
    const params = {
        id: dealId,
    };

    const response = await callBitrixAPI<BitrixDeal>('crm.deal.get', params);
    return response.result as BitrixDeal || null;
}

/**
 * Mengupdate deal di Bitrix24
 */
export async function updateDeal(
    dealId: string,
    dealData: Record<string, any>
): Promise<boolean> {
    const params = {
        id: dealId,
        fields: dealData,
    };

    const response = await callBitrixAPI<boolean>('crm.deal.update', params);
    return response.result === true;
}

// ============== CONTACTS (KONTAK) ==============

/**
 * Mendapatkan daftar kontak dari Bitrix24
 */
export async function getContacts(
    filter: Record<string, any> = {},
    limit: number = 50
): Promise<BitrixContact[]> {
    const params = {
        order: { ID: 'DESC' },
        filter,
        select: [
            'ID', 'NAME', 'LAST_NAME', 'PHONE', 'EMAIL', 'TYPE_ID',
            'DATE_CREATE', 'DATE_MODIFY'
        ],
        limit,
    };

    const response = await callBitrixAPI<BitrixContact[]>('crm.contact.list', params);
    return response.result as BitrixContact[] || [];
}

/**
 * Mendapatkan detail kontak berdasarkan ID
 */
export async function getContactById(contactId: string): Promise<BitrixContact | null> {
    const params = {
        id: contactId,
    };

    const response = await callBitrixAPI<BitrixContact>('crm.contact.get', params);
    return response.result as BitrixContact || null;
}

/**
 * Membuat kontak baru di Bitrix24
 */
export async function createContact(contactData: {
    NAME: string;
    LAST_NAME?: string;
    PHONE?: string[];
    EMAIL?: string[];
    [key: string]: any;
}): Promise<{ ID: string }> {
    const params = {
        fields: contactData,
    };

    const response = await callBitrixAPI<{ ID: string }>('crm.contact.add', params);
    return response.result as { ID: string } || { ID: '' };
}

// ============== LEADS (LEADS) ==============

/**
 * Mendapatkan daftar leads dari Bitrix24
 */
export async function getLeads(
    filter: Record<string, any> = {},
    limit: number = 50
): Promise<BitrixLead[]> {
    const params = {
        order: { ID: 'DESC' },
        filter,
        select: [
            'ID', 'TITLE', 'STATUS_ID', 'SOURCE_ID', 'PHONE', 'EMAIL',
            'DATE_CREATE', 'DATE_MODIFY'
        ],
        limit,
    };

    const response = await callBitrixAPI<BitrixLead[]>('crm.lead.list', params);
    return response.result as BitrixLead[] || [];
}

/**
 * Membuat lead baru di Bitrix24
 */
export async function createLead(leadData: {
    TITLE: string;
    PHONE?: string[];
    EMAIL?: string[];
    SOURCE_ID?: string;
    [key: string]: any;
}): Promise<{ ID: string }> {
    const params = {
        fields: leadData,
    };

    const response = await callBitrixAPI<{ ID: string }>('crm.lead.add', params);
    return response.result as { ID: string } || { ID: '' };
}

// ============== COMPANIES (PERUSAHAAN) ==============

/**
 * Mendapatkan daftar perusahaan dari Bitrix24
 */
export async function getCompanies(
    filter: Record<string, any> = {},
    limit: number = 50
): Promise<any[]> {
    const params = {
        order: { ID: 'DESC' },
        filter,
        select: ['ID', 'TITLE', 'PHONE', 'WEB', 'DATE_CREATE'],
        limit,
    };

    const response = await callBitrixAPI<any[]>('crm.company.list', params);
    return response.result as any[] || [];
}

// ============== UTILITY FUNCTIONS ==============

/**
 * Extract nomor telepon dari format Bitrix contact
 */
function extractPhoneFromContact(contact: BitrixContact): string {
    if (contact.PHONE && Array.isArray(contact.PHONE) && contact.PHONE.length > 0) {
        return contact.PHONE[0].VALUE || '';
    }
    return '';
}

/**
 * Test koneksi ke Bitrix24
 */
export async function testBitrixConnection(): Promise<boolean> {
    try {
        validateConfig();
        const deals = await getDeals({}, 1);
        return true;
    } catch (error) {
        console.error('Bitrix24 Connection Test Failed:', error);
        return false;
    }
}

/**
 * Sinkronisasi data dari Bitrix24 dengan format laporan lokal
 * Termasuk fetch nomor telepon dari contact yang terkait
 */
export async function syncBitrixDealsToLocalFormat(): Promise<any[]> {
    try {
        const deals = await getDeals();
        
        const syncedDeals = await Promise.all(
            deals.map(async (deal) => {
                let phone = '';
                
                // Fetch nomor telepon dari contact jika ada
                if (deal.CONTACT_ID) {
                    try {
                        const contact = await getContactById(deal.CONTACT_ID);
                        if (contact) {
                            phone = extractPhoneFromContact(contact);
                        }
                    } catch (error) {
                        console.warn(`Failed to fetch contact ${deal.CONTACT_ID}:`, error);
                    }
                }
                
                return {
                    id_bitrix: deal.ID,
                    nama: deal.TITLE,
                    no_telp: phone,
                    status: deal.STAGE_ID,
                    keterangan: deal.OPPORTUNITY || '',
                };
            })
        );
        
        return syncedDeals;
    } catch (error) {
        console.error('Error syncing Bitrix data:', error);
        return [];
    }
}

export default {
    getDeals,
    createDeal,
    updateDeal,
    getContacts,
    createContact,
    getLeads,
    createLead,
    getCompanies,
    testBitrixConnection,
    syncBitrixDealsToLocalFormat,
};
