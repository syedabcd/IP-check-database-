import { supabase } from './supabaseClient';
import { IpRecord, AppUser, UserStats, AccessLog } from '../types';

// Helper to ensure client exists before usage
const getClient = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please open "services/supabaseClient.ts" and replace the placeholders with your actual Supabase Project URL and Anon Key.');
  }
  return supabase;
};

// --- IP Operations ---

export const checkIpAvailability = async (ip: string): Promise<boolean> => {
  const client = getClient();
  
  // We check if the IP exists in the database
  const { data, error } = await client
    .from('ip_records')
    .select('address')
    .eq('address', ip)
    .maybeSingle();

  if (error) {
    console.error('Error checking IP:', error);
    throw error;
  }

  // If data is null, the IP is NOT in the DB, so it is "Fresh" (Availability = true)
  return !data;
};

export const getAllIps = async (): Promise<IpRecord[]> => {
  const client = getClient();

  const { data, error } = await client
    .from('ip_records')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching IPs:', error);
    return [];
  }

  // Map Supabase snake_case columns to our CamelCase TypeScript interface
  return data.map((record: any) => ({
    id: record.id,
    address: record.address,
    createdAt: record.created_at,
    addedBy: record.added_by || 'admin'
  }));
};

export const addIpAddress = async (ip: string, addedBy: string = 'admin'): Promise<IpRecord> => {
  const client = getClient();

  const exists = await checkIpAvailability(ip);
  if (!exists) {
     throw new Error('IP address already exists in the database.');
  }

  const { data, error } = await client
    .from('ip_records')
    .insert([
      { 
        address: ip, 
        added_by: addedBy 
      }
    ])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') { 
       throw new Error('IP address already exists in the database.');
    }
    throw error;
  }

  return {
    id: data.id,
    address: data.address,
    createdAt: data.created_at,
    addedBy: data.added_by
  };
};

export const bulkAddIpAddresses = async (ips: string[]): Promise<{ added: number; existing: number; errors: number }> => {
  const client = getClient();
  
  let added = 0;
  let existing = 0;
  let errors = 0;
  
  const regex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;
  const uniqueInputIps = Array.from(new Set(ips));
  const validIps: string[] = [];

  for (const ip of uniqueInputIps) {
    if (!regex.test(ip)) {
      errors++;
    } else {
      validIps.push(ip);
    }
  }

  if (validIps.length === 0) {
    return { added, existing, errors };
  }

  const { data: existingRecords, error: fetchError } = await client
    .from('ip_records')
    .select('address')
    .in('address', validIps);

  if (fetchError) {
    console.error("Bulk check failed", fetchError);
    throw new Error("Database connection failed during bulk check");
  }

  const existingSet = new Set(existingRecords?.map((r: any) => r.address));

  const newRecords = validIps
    .filter(ip => {
      if (existingSet.has(ip)) {
        existing++;
        return false;
      }
      return true;
    })
    .map(ip => ({
      address: ip,
      added_by: 'admin'
    }));

  if (newRecords.length > 0) {
    const { error: insertError } = await client
      .from('ip_records')
      .insert(newRecords);

    if (insertError) {
      console.error("Bulk insert failed", insertError);
      throw new Error("Failed to insert records");
    }
    added = newRecords.length;
  }

  return { added, existing, errors };
};

export const deleteIpAddress = async (id: string): Promise<void> => {
  const client = getClient();

  const { error } = await client
    .from('ip_records')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Delete failed", error);
    throw error;
  }
};

// --- User Operations ---

export const getAppUsers = async (): Promise<AppUser[]> => {
  const client = getClient();
  
  const { data, error } = await client
    .from('app_users')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.warn("Failed to fetch users (Table might not exist yet)", error);
    return [];
  }

  return data.map((u: any) => ({
    id: u.id,
    name: u.name,
    createdAt: u.created_at
  }));
};

export const createAppUser = async (name: string): Promise<AppUser> => {
  const client = getClient();
  
  const { data, error } = await client
    .from('app_users')
    .insert([{ name }])
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    createdAt: data.created_at
  };
};

export const deleteAppUser = async (id: string): Promise<void> => {
  const client = getClient();
  
  // Note: This might fail if logs reference this user. 
  // In a real app we'd cascade delete or soft delete.
  const { error } = await client
    .from('app_users')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// --- Logging Operations ---

export const logAccess = async (userId: string, ip: string, status: 'FRESH' | 'DUPLICATE') => {
  const client = getClient();
  
  const { error } = await client
    .from('access_logs')
    .insert([{
      user_id: userId,
      ip_address: ip,
      status: status
    }]);

  if (error) console.error("Failed to log access", error);
};

export const getUserStats = async (userId: string): Promise<UserStats> => {
  const client = getClient();
  
  // We can use count queries for efficiency
  
  // Count Fresh
  const { count: freshCount, error: freshError } = await client
    .from('access_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'FRESH');

  // Count Duplicate
  const { count: dupCount, error: dupError } = await client
    .from('access_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'DUPLICATE');
    
  if (freshError || dupError) {
    console.error("Error fetching stats", freshError || dupError);
    return { fresh: 0, duplicate: 0, total: 0 };
  }

  const fresh = freshCount || 0;
  const duplicate = dupCount || 0;

  return {
    fresh,
    duplicate,
    total: fresh + duplicate
  };
};

export const getUserLogs = async (userId: string): Promise<AccessLog[]> => {
  const client = getClient();

  const { data, error } = await client
    .from('access_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching user logs", error);
    return [];
  }

  return data.map((log: any) => ({
    id: log.id,
    ipAddress: log.ip_address,
    status: log.status,
    createdAt: log.created_at
  }));
};