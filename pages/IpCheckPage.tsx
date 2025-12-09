import React, { useState, useEffect } from 'react';
import { Search, AlertTriangle, User as UserIcon, Activity } from 'lucide-react';
import { Button } from '../components/Button';
import { IpStatusCard } from '../components/IpStatusCard';
import { CheckStatus, AppUser, UserStats } from '../types';
import { checkIpAvailability, addIpAddress, getAppUsers, logAccess, getUserStats } from '../services/dbService';

export const IpCheckPage: React.FC = () => {
  const [ip, setIp] = useState('');
  const [status, setStatus] = useState<CheckStatus>(CheckStatus.IDLE);
  const [loading, setLoading] = useState(false);
  const [searchedIp, setSearchedIp] = useState('');
  const [configError, setConfigError] = useState<string | null>(null);

  // User State
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await getAppUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadStats = async (userId: string) => {
    if (!userId) return;
    try {
      const stats = await getUserStats(userId);
      setUserStats(stats);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedUserId(newId);
    if (newId) {
      loadStats(newId);
    } else {
      setUserStats(null);
    }
  };

  const validateIp = (ip: string) => {
    const regex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;
    return regex.test(ip);
  };

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigError(null);
    if (!ip.trim()) return;

    if (!selectedUserId) {
      alert("Please select your name first.");
      return;
    }

    if (!validateIp(ip)) {
      alert("Please enter a valid IPv4 address (e.g., 192.168.1.1)");
      return;
    }

    setLoading(true);
    setStatus(CheckStatus.CHECKING);
    setSearchedIp(ip);

    try {
      const isFresh = await checkIpAvailability(ip);
      const currentUser = users.find(u => u.id === selectedUserId);
      
      if (isFresh) {
        // Automatically add to database if fresh
        await addIpAddress(ip, currentUser?.name || 'unknown');
        await logAccess(selectedUserId, ip, 'FRESH');
        setStatus(CheckStatus.FRESH);
      } else {
        await logAccess(selectedUserId, ip, 'DUPLICATE');
        setStatus(CheckStatus.DUPLICATE);
      }
      // Refresh stats
      await loadStats(selectedUserId);

    } catch (error: any) {
      console.error(error);
      if (error.message && error.message.includes('Supabase is not configured')) {
        setConfigError(error.message);
        setStatus(CheckStatus.IDLE);
      } else {
        setStatus(CheckStatus.ERROR);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Verify IP Address
        </h1>
        <p className="mt-2 text-lg text-slate-600">
          Select your identity and check IPs against the sentinel database.
        </p>
      </div>

      {configError && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold">Configuration Required</p>
            <p className="mt-1">{configError}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8">
        <form onSubmit={handleCheck} className="space-y-4">
          
          {/* User Selection */}
          <div>
            <label htmlFor="user-select" className="block text-sm font-medium text-slate-700 mb-2">
              Select Your Name
            </label>
            <div className="relative">
              <select
                id="user-select"
                value={selectedUserId}
                onChange={handleUserChange}
                className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-3 pl-4 pr-10 text-base"
              >
                <option value="">-- Choose User --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                <UserIcon className="h-5 w-5 mr-2" />
              </div>
            </div>
            {users.length === 0 && !configError && (
               <p className="mt-2 text-xs text-amber-600">No users found. Please ask Admin to add users.</p>
            )}
          </div>

          {/* Stats for Selected User */}
          {selectedUserId && userStats && (
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100 text-center text-sm animate-in fade-in">
                <div>
                    <span className="block text-slate-500 text-xs uppercase">Total</span>
                    <span className="font-bold text-slate-900">{userStats.total}</span>
                </div>
                <div>
                    <span className="block text-emerald-600 text-xs uppercase">Fresh</span>
                    <span className="font-bold text-emerald-700">{userStats.fresh}</span>
                </div>
                <div>
                    <span className="block text-red-500 text-xs uppercase">Dupe</span>
                    <span className="font-bold text-red-600">{userStats.duplicate}</span>
                </div>
            </div>
          )}

          {/* IP Input */}
          <div>
             <label htmlFor="ip-input" className="block text-sm font-medium text-slate-700 mb-2">
              Enter IP Address
            </label>
            <div className="relative flex items-center">
                <input
                id="ip-input"
                type="text"
                value={ip}
                onChange={(e) => {
                    setIp(e.target.value);
                    if (status !== CheckStatus.IDLE) setStatus(CheckStatus.IDLE);
                    if (configError) setConfigError(null);
                }}
                placeholder="e.g. 192.168.1.100"
                className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 pl-4 pr-12 py-3 text-lg"
                />
                <div className="absolute right-2">
                <div className="text-slate-400">
                    <Search className="h-5 w-5" />
                </div>
                </div>
            </div>
          </div>
          
          <Button 
            type="submit" 
            fullWidth 
            className="mt-4" 
            isLoading={loading}
            disabled={!selectedUserId}
          >
            Check Status & Auto-Add
          </Button>
        </form>

        <IpStatusCard status={status} ip={searchedIp} />
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
        <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="text-2xl font-bold text-indigo-600">Real-time</div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">Updates</div>
        </div>
        <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="text-2xl font-bold text-indigo-600">Logged</div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">User Activity</div>
        </div>
        <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="text-2xl font-bold text-indigo-600">Secure</div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">Database</div>
        </div>
      </div>
    </div>
  );
};