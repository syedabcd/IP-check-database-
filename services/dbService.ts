import { supabase } from './supabaseClient';
import { IpRecord } from '../types';

// Helper to ensure client exists before usage
const getClient = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please open "services/supabaseClient.ts" and replace the placeholders with your actual Supabase Project URL and Anon Key.');
  }
  return supabase;
};

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

export const addIpAddress = async (ip: string): Promise<IpRecord> => {
  const client = getClient();

  // Check existence first to avoid 409 error logs if possible, 
  // though RLS/constraints handle this too.
  const exists = await checkIpAvailability(ip);
  if (!exists) {
     throw new Error('IP address already exists in the database.');
  }

  const { data, error } = await client
    .from('ip_records')
    .insert([
      { 
        address: ip, 
        added_by: 'admin' // In a real app with Auth, this would be the user's ID
      }
    ])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') { // Postgres unique_violation code
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
  
  // IPv4 Regex
  const regex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;

  // Dedup input list within itself
  const uniqueInputIps = Array.from(new Set(ips));
  const validIps: string[] = [];

  // 1. Filter locally for valid syntax
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

  // 2. Check which ones already exist in Supabase
  // We fetch all IPs from DB that match our input list
  const { data: existingRecords, error: fetchError } = await client
    .from('ip_records')
    .select('address')
    .in('address', validIps);

  if (fetchError) {
    console.error("Bulk check failed", fetchError);
    // Fallback: treat all valid IPs as potential additions (slow path) or abort
    throw new Error("Database connection failed during bulk check");
  }

  const existingSet = new Set(existingRecords?.map((r: any) => r.address));

  // 3. Prepare new records
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
    // 4. Bulk Insert
    const { error: insertError } = await client
      .from('ip_records')
      .insert(newRecords);

    if (insertError) {
      console.error("Bulk insert failed", insertError);
      // In a real scenario, you might want to retry or handle partial failures
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