import { IpRecord } from '../types';

const STORAGE_KEY = 'ip_sentinel_db';

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getDb = (): IpRecord[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    // Seed with some initial data if empty
    const initialData: IpRecord[] = [
      { id: '1', address: '192.168.1.1', createdAt: new Date().toISOString(), addedBy: 'admin' },
      { id: '2', address: '10.0.0.1', createdAt: new Date().toISOString(), addedBy: 'admin' },
      { id: '3', address: '8.8.8.8', createdAt: new Date().toISOString(), addedBy: 'admin' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
    return initialData;
  }
  return JSON.parse(stored);
};

const saveDb = (data: IpRecord[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const checkIpAvailability = async (ip: string): Promise<boolean> => {
  await delay(600); // Simulate backend processing
  const db = getDb();
  return !db.some(record => record.address === ip);
};

export const getAllIps = async (): Promise<IpRecord[]> => {
  await delay(300);
  return getDb().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const addIpAddress = async (ip: string): Promise<IpRecord> => {
  await delay(500);
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

export const deleteIpAddress = async (id: string): Promise<void> => {
  await delay(300);
  const db = getDb();
  const newDb = db.filter(record => record.id !== id);
  saveDb(newDb);
};