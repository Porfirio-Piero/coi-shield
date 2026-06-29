/**
 * COI Shield — IndexedDB Database Layer
 * Client-side storage for vendors, COIs, and request links
 */

export interface Vendor {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  trade: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface COIDocument {
  id: string;
  vendorId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  insurer: string;
  policyType: string;
  policyNumber: string;
  effectiveDate: string;
  expiryDate: string;
  blobKey: string; // key into IndexedDB blob store
  uploadedAt: string;
  uploadedBy: 'contractor' | 'subcontractor';
}

export interface RequestLink {
  id: string;
  vendorId: string;
  token: string;
  status: 'sent' | 'opened' | 'uploaded' | 'expired';
  createdAt: string;
  expiresAt: string;
  openedAt?: string;
  uploadedAt?: string;
}

export interface AlertConfig {
  id: string;
  vendorId: string;
  coIdocId: string;
  alertDays: number[]; // e.g., [90, 60, 30, 7]
  sentAlerts: string[]; // ISO dates of sent alerts
  emailTo: string;
}

export interface Settings {
  id: string;
  alertEmail: string;
  alertDays: number[];
  companyName: string;
  enableDigest: boolean;
  lastBackupDate?: string;
}

const DB_NAME = 'coi-shield';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('vendors')) {
        const vendorStore = db.createObjectStore('vendors', { keyPath: 'id' });
        vendorStore.createIndex('name', 'name', { unique: false });
        vendorStore.createIndex('company', 'company', { unique: false });
      }

      if (!db.objectStoreNames.contains('coi-documents')) {
        const coiStore = db.createObjectStore('coi-documents', { keyPath: 'id' });
        coiStore.createIndex('vendorId', 'vendorId', { unique: false });
        coiStore.createIndex('expiryDate', 'expiryDate', { unique: false });
      }

      if (!db.objectStoreNames.contains('request-links')) {
        const linkStore = db.createObjectStore('request-links', { keyPath: 'id' });
        linkStore.createIndex('vendorId', 'vendorId', { unique: false });
        linkStore.createIndex('token', 'token', { unique: true });
      }

      if (!db.objectStoreNames.contains('blobs')) {
        db.createObjectStore('blobs', { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('alerts')) {
        const alertStore = db.createObjectStore('alerts', { keyPath: 'id' });
        alertStore.createIndex('vendorId', 'vendorId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Generic CRUD operations
async function dbGet<T>(storeName: string, id: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

async function dbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

async function dbPut<T>(storeName: string, item: T): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(item);
    request.onsuccess = () => resolve(item);
    request.onerror = () => reject(request.error);
  });
}

async function dbDelete(storeName: string, id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function dbGetByIndex<T>(storeName: string, indexName: string, value: IDBValidKey): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

// ===== Vendor Operations =====

export const vendors = {
  getAll: () => dbGetAll<Vendor>('vendors'),
  getById: (id: string) => dbGet<Vendor>('vendors', id),
  create: (vendor: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    return dbPut<Vendor>('vendors', { ...vendor, id, createdAt: now, updatedAt: now });
  },
  update: (vendor: Vendor) => dbPut<Vendor>('vendors', { ...vendor, updatedAt: new Date().toISOString() }),
  delete: (id: string) => dbDelete('vendors', id),
};

// ===== COI Document Operations =====

export const coiDocuments = {
  getAll: () => dbGetAll<COIDocument>('coi-documents'),
  getByVendorId: (vendorId: string) => dbGetByIndex<COIDocument>('coi-documents', 'vendorId', vendorId),
  getById: (id: string) => dbGet<COIDocument>('coi-documents', id),
  create: (doc: Omit<COIDocument, 'id' | 'uploadedAt'>) => {
    const id = crypto.randomUUID();
    return dbPut<COIDocument>('coi-documents', { ...doc, id, uploadedAt: new Date().toISOString() });
  },
  update: (doc: COIDocument) => dbPut<COIDocument>('coi-documents', doc),
  delete: (id: string) => dbDelete('coi-documents', id),
};

// ===== Request Link Operations =====

export const requestLinks = {
  getAll: () => dbGetAll<RequestLink>('request-links'),
  getByVendorId: (vendorId: string) => dbGetByIndex<RequestLink>('request-links', 'vendorId', vendorId),
  getByToken: async (token: string) => {
    const db = await openDB();
    return new Promise<RequestLink | undefined>((resolve, reject) => {
      const tx = db.transaction('request-links', 'readonly');
      const store = tx.objectStore('request-links');
      const index = store.index('token');
      const request = index.get(token);
      request.onsuccess = () => resolve(request.result as RequestLink | undefined);
      request.onerror = () => reject(request.error);
    });
  },
  create: (link: Omit<RequestLink, 'id'>) => {
    const id = crypto.randomUUID();
    return dbPut<RequestLink>('request-links', { ...link, id });
  },
  update: (link: RequestLink) => dbPut<RequestLink>('request-links', link),
  delete: (id: string) => dbDelete('request-links', id),
};

// ===== Blob Operations (for file storage) =====

export const blobs = {
  put: (key: string, data: Blob) => dbPut('blobs', { key, data }),
  get: async (key: string): Promise<Blob | undefined> => {
    const result = await dbGet<{ key: string; data: Blob }>('blobs', key);
    return result?.data;
  },
  delete: (key: string) => dbDelete('blobs', key),
};

// ===== Settings Operations =====

export const settings = {
  get: () => dbGet<Settings>('settings', 'default'),
  save: (s: Omit<Settings, 'id'>) => dbPut<Settings>('settings', { ...s, id: 'default' }),
};

// ===== Alert Operations =====

export const alerts = {
  getAll: () => dbGetAll<AlertConfig>('alerts'),
  getByVendorId: (vendorId: string) => dbGetByIndex<AlertConfig>('alerts', 'vendorId', vendorId),
  create: (alert: Omit<AlertConfig, 'id'>) => {
    const id = crypto.randomUUID();
    return dbPut<AlertConfig>('alerts', { ...alert, id });
  },
  update: (alert: AlertConfig) => dbPut<AlertConfig>('alerts', alert),
  delete: (id: string) => dbDelete('alerts', id),
};

// ===== Utility Functions =====

export type ComplianceStatus = 'compliant' | 'expiring_soon' | 'expired' | 'no_coi';

export function getComplianceStatus(coi: COIDocument | undefined): ComplianceStatus {
  if (!coi) return 'no_coi';
  
  const now = new Date();
  const expiry = new Date(coi.expiryDate);
  const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 30) return 'expiring_soon';
  return 'compliant';
}

export function getDaysUntilExpiry(coi: COIDocument | undefined): number | null {
  if (!coi) return null;
  const now = new Date();
  const expiry = new Date(coi.expiryDate);
  return Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ===== Export/Import =====

export async function exportAllData(): Promise<string> {
  const data = {
    vendors: await vendors.getAll(),
    coiDocuments: await coiDocuments.getAll(),
    requestLinks: await requestLinks.getAll(),
    settings: await settings.get(),
    exportDate: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export async function importAllData(jsonStr: string): Promise<void> {
  const data = JSON.parse(jsonStr);
  
  // Clear existing data
  const db = await openDB();
  const storeNames = ['vendors', 'coi-documents', 'request-links', 'settings'];
  const tx = db.transaction(storeNames, 'readwrite');
  
  for (const storeName of storeNames) {
    const store = tx.objectStore(storeName);
    store.clear();
  }
  
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  
  // Import new data
  if (data.vendors) {
    for (const vendor of data.vendors) {
      await dbPut('vendors', vendor);
    }
  }
  if (data.coiDocuments) {
    for (const doc of data.coiDocuments) {
      await dbPut('coi-documents', doc);
    }
  }
  if (data.requestLinks) {
    for (const link of data.requestLinks) {
      await dbPut('request-links', link);
    }
  }
  if (data.settings) {
    await dbPut('settings', data.settings);
  }
}