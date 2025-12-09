import { IpRecord } from '../types';

const STORAGE_KEY = 'ip_sentinel_db';

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getDb = (): IpRecord[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return [];
  }
  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error("Error parsing DB from storage", error);
    return [];
  }
};

const saveDb = (data: IpRecord[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const checkIpAvailability = async (ip: string): Promise<boolean> => {
  await delay(400); // Simulate backend processing
  const db = getDb();
  return !db.some(record => record.address === ip);
};

export const getAllIps = async (): Promise<IpRecord[]> => {
  await delay(300);
  return getDb().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const addIpAddress = async (ip: string): Promise<IpRecord> => {
  await delay(400);
  const db = getDb();
  
  if (db.some(record => record.address === ip)) {
    throw new Error('IP address already exists in the database.');
  }

  const newRecord: IpRecord = {
    id: crypto.randomUUID(),
    address: ip,
    createdAt: new Date().toISOString(),
    addedBy: 'admin'
  };

  db.push(newRecord);
  saveDb(db);
  return newRecord;
};

export const bulkAddIpAddresses = async (ips: string[]): Promise<{ added: number; existing: number; errors: number }> => {
  await delay(800);
  const db = getDb();
  let added = 0;
  let existing = 0;
  let errors = 0;
  
  // IPv4 Regex
  const regex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;

  // Dedup input list within itself
  const uniqueInputIps = Array.from(new Set(ips));

  for (const ip of uniqueInputIps) {
    if (!regex.test(ip)) {
      errors++;
      continue;
    }

    if (db.some(record => record.address === ip)) {
      existing++;
    } else {
      const newRecord: IpRecord = {
        id: crypto.randomUUID(),
        address: ip,
        createdAt: new Date().toISOString(),
        addedBy: 'admin'
      };
      db.push(newRecord);
      added++;
    }
  }

  if (added > 0) {
    saveDb(db);
  }

  return { added, existing, errors };
};

export const deleteIpAddress = async (id: string): Promise<void> => {
  await delay(300);
  const db = getDb();
  const newDb = db.filter(record => record.id !== id);
  saveDb(newDb);
};