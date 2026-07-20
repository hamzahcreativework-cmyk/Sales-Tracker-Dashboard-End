# 💻 Advanced Integration Examples

## 📚 Use Cases & Code Examples

### Use Case 1: Auto-sync saat Page Load

**Requirement:** Automatically fetch latest deals from Bitrix24 saat halaman dibuka

**Code di `LaporanBitrixView.tsx`:**

```typescript
// Add ini ke useEffect yang ada
useEffect(() => {
    const autoSync = async () => {
        if (bitrixConnectionStatus === 'connected' && entries.every(e => !e.nama)) {
            // Only auto-sync if entries are empty
            await handleSyncFromBitrix();
        }
    };

    const timer = setTimeout(autoSync, 2000); // Wait 2 seconds after connection test
    return () => clearTimeout(timer);
}, [bitrixConnectionStatus]);
```

---

### Use Case 2: Push Updated Data Back to Bitrix24

**Requirement:** Simpan perubahan lokal kembali ke Bitrix24

**Code di `bitrixClient.ts` (tambahkan):**

```typescript
/**
 * Sinkronisasi data lokal back ke Bitrix24
 */
export async function pushLocalDataToBitrix(
    localData: Array<{
        id_bitrix: string;
        nama: string;
        status: string;
    }>
): Promise<boolean> {
    try {
        for (const item of localData) {
            if (item.id_bitrix) {
                await updateDeal(item.id_bitrix, {
                    TITLE: item.nama,
                    STAGE_ID: item.status,
                });
            }
        }
        return true;
    } catch (error) {
        console.error('Error pushing data to Bitrix:', error);
        throw error;
    }
}
```

**Cara Menggunakan:**

```typescript
import * as bitrixClient from './bitrixClient';

// Di component
const handlePushToBitrix = async () => {
    try {
        const validEntries = entries.filter(e => e.id_bitrix && e.nama);
        await bitrixClient.pushLocalDataToBitrix(validEntries);
        alert('Data berhasil dipush ke Bitrix24!');
    } catch (error) {
        alert('Gagal push data: ' + error.message);
    }
};
```

---

### Use Case 3: Create New Deal dari Form Input

**Requirement:** Buat deal baru di Bitrix24 dari form

**Code di `LaporanBitrixView.tsx` (tambahkan):**

```typescript
const handleCreateBitrixDeal = async (entryData: any) => {
    if (!entryData.nama) {
        alert('Nama deal harus diisi!');
        return;
    }

    try {
        const result = await bitrixClient.createDeal({
            TITLE: entryData.nama,
            STAGE_ID: entryData.status || 'NEW',
        });

        // Update entry dengan ID dari Bitrix
        const newEntries = entries.map((e, i) => 
            e === entryData ? { ...e, id_bitrix: result.ID } : e
        );
        setEntries(newEntries);

        alert(`Deal berhasil dibuat di Bitrix24! (ID: ${result.ID})`);
    } catch (error: any) {
        alert('Gagal buat deal: ' + error.message);
    }
};
```

---

### Use Case 4: Filter & Sinkronisasi Deals Tertentu

**Requirement:** Ambil hanya deals dengan stage tertentu

**Code di `bitrixClient.ts` (update):**

```typescript
/**
 * Get deals dengan stage filter
 */
export async function getDealsByStage(
    stageId: string,
    limit: number = 50
): Promise<BitrixDeal[]> {
    return getDeals({ STAGE_ID: stageId }, limit);
}

/**
 * Get deals yang baru dibuat (hari ini)
 */
export async function getTodaysDeals(): Promise<BitrixDeal[]> {
    const today = new Date().toISOString().split('T')[0];
    return getDeals({
        '>=DATE_CREATE': today,
    });
}
```

**Cara Menggunakan:**

```typescript
// Di component
const handleSyncStage = async (stage: string) => {
    try {
        const deals = await bitrixClient.getDealsByStage(stage);
        const newEntries = deals.map(deal => ({
            id_bitrix: deal.ID,
            nama: deal.TITLE,
            no_telp: '',
            status: deal.STAGE_ID,
            keterangan: ''
        }));
        setEntries(newEntries);
    } catch (error) {
        alert('Error: ' + error.message);
    }
};

// Gunakan
<button onClick={() => handleSyncStage('WON')}>
    Ambil Deal yang Won
</button>
```

---

### Use Case 5: Sync dengan Contact Info

**Requirement:** Ambil deals beserta nomor telepon dari contact

**Code di `bitrixClient.ts` (tambahkan):**

```typescript
interface DealWithContact extends BitrixDeal {
    contact?: BitrixContact;
    contactPhone?: string;
}

/**
 * Get deals dengan contact information
 */
export async function getDealsWithContacts(
    filter: Record<string, any> = {},
    limit: number = 50
): Promise<DealWithContact[]> {
    const deals = await getDeals(filter, limit);

    // Enhance dengan contact info
    const dealsWithContact = await Promise.all(
        deals.map(async (deal) => {
            if (deal.CONTACT_ID) {
                try {
                    const [contact] = await getContacts({ ID: deal.CONTACT_ID }, 1);
                    const phone = contact?.PHONE?.[0]?.VALUE;
                    return {
                        ...deal,
                        contact,
                        contactPhone: phone || '',
                    };
                } catch (err) {
                    return deal;
                }
            }
            return deal;
        })
    );

    return dealsWithContact;
}
```

**Cara Menggunakan:**

```typescript
const handleSyncWithContacts = async () => {
    try {
        const dealsWithContacts = await bitrixClient.getDealsWithContacts();
        
        const newEntries = dealsWithContacts.map(deal => ({
            id_bitrix: deal.ID,
            nama: deal.TITLE,
            no_telp: deal.contactPhone || '',
            status: deal.STAGE_ID,
            keterangan: ''
        }));

        setEntries(newEntries);
        alert('Data termasuk nomor telepon berhasil disinkronisasi!');
    } catch (error: any) {
        alert('Error: ' + error.message);
    }
};
```

---

### Use Case 6: Search & Filter Deals

**Requirement:** Search deals berdasarkan nama

**Code di `bitrixClient.ts` (tambahkan):**

```typescript
/**
 * Search deals by title
 */
export async function searchDeals(searchQuery: string): Promise<BitrixDeal[]> {
    if (!searchQuery.trim()) return [];

    return getDeals({
        'TITLE': searchQuery,
    }, 100);
}
```

**Cara Menggunakan:**

```typescript
const [searchBitrixQuery, setSearchBitrixQuery] = useState('');

const handleBitrixSearch = async () => {
    if (!searchBitrixQuery.trim()) {
        alert('Masukkan query pencarian!');
        return;
    }

    try {
        const deals = await bitrixClient.searchDeals(searchBitrixQuery);
        if (deals.length === 0) {
            alert('Tidak ada deals ditemukan');
            return;
        }

        const newEntries = deals.map(deal => ({
            id_bitrix: deal.ID,
            nama: deal.TITLE,
            no_telp: '',
            status: deal.STAGE_ID,
            keterangan: ''
        }));

        setEntries(newEntries);
        alert(`${deals.length} deals ditemukan!`);
    } catch (error: any) {
        alert('Error: ' + error.message);
    }
};

// UI
<div className="flex gap-2 mb-4">
    <input
        type="text"
        placeholder="Cari deal di Bitrix24..."
        value={searchBitrixQuery}
        onChange={(e) => setSearchBitrixQuery(e.target.value)}
    />
    <button onClick={handleBitrixSearch}>
        Cari
    </button>
</div>
```

---

### Use Case 7: Error Handling & Retry Logic

**Code di `bitrixClient.ts` (tambahkan):**

```typescript
/**
 * Call API dengan retry logic
 */
async function callBitrixAPIWithRetry<T>(
    method: string,
    params: Record<string, any> = {},
    maxRetries: number = 3
): Promise<BitrixAPIResponse<T>> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await callBitrixAPI<T>(method, params);
        } catch (error) {
            lastError = error;
            console.warn(`Attempt ${attempt}/${maxRetries} failed:`, error);

            // Wait before retry (exponential backoff)
            if (attempt < maxRetries) {
                await new Promise(resolve => 
                    setTimeout(resolve, 1000 * Math.pow(2, attempt - 1))
                );
            }
        }
    }

    throw new Error(
        `Failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
    );
}
```

---

### Use Case 8: Batch Operations

**Requirement:** Operate pada multiple deals sekaligus

**Code di `bitrixClient.ts` (tambahkan):**

```typescript
/**
 * Update multiple deals
 */
export async function updateMultipleDeals(
    updates: Array<{ id: string; fields: Record<string, any> }>
): Promise<{ successful: number; failed: number }> {
    let successful = 0;
    let failed = 0;

    for (const update of updates) {
        try {
            await updateDeal(update.id, update.fields);
            successful++;
        } catch (error) {
            console.error(`Failed to update deal ${update.id}:`, error);
            failed++;
        }
    }

    return { successful, failed };
}
```

---

## 🧪 Testing

### Unit Test Example

```typescript
// Contoh test dengan Jest
import * as bitrix from './bitrixClient';

describe('Bitrix Client', () => {
    test('Should connect to Bitrix24', async () => {
        const result = await bitrix.testBitrixConnection();
        expect(result).toBe(true);
    });

    test('Should get deals', async () => {
        const deals = await bitrix.getDeals();
        expect(Array.isArray(deals)).toBe(true);
    });

    test('Should handle errors gracefully', async () => {
        expect(async () => {
            await bitrix.getDeals({ INVALID_FILTER: true });
        }).rejects.toThrow();
    });
});
```

---

## 📊 Monitoring & Logging

**Add logging di `bitrixClient.ts`:**

```typescript
// Add di setiap function
function logAPICall(method: string, params: any, result: any) {
    console.log(`[Bitrix API] ${method}`, {
        params: JSON.stringify(params).substring(0, 100),
        resultCount: Array.isArray(result) ? result.length : '1',
        timestamp: new Date().toISOString()
    });
}

// Call setelah setiap API call
logAPICall(method, params, response.result);
```

---

**Need more examples?** Check the [Bitrix24 API Documentation](https://apidocs.bitrix24.com/)
