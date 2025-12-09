import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '../components/Button';
import { IpStatusCard } from '../components/IpStatusCard';
import { CheckStatus } from '../types';
import { checkIpAvailability } from '../services/dbService';

export const IpCheckPage: React.FC = () => {
  const [ip, setIp] = useState('');
  const [status, setStatus] = useState<CheckStatus>(CheckStatus.IDLE);
  const [loading, setLoading] = useState(false);
  const [searchedIp, setSearchedIp] = useState('');

  const validateIp = (ip: string) => {
    // Basic regex for IPv4
    const regex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;
    return regex.test(ip);
  };

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ip.trim()) return;

    if (!validateIp(ip)) {
      alert("Please enter a valid IPv4 address (e.g., 192.168.1.1)");
      return;
    }

    setLoading(true);
    setStatus(CheckStatus.CHECKING);
    setSearchedIp(ip);

    try {
      const isFresh = await checkIpAvailability(ip);
      setStatus(isFresh ? CheckStatus.FRESH : CheckStatus.DUPLICATE);
    } catch (error) {
      console.error(error);
      setStatus(CheckStatus.ERROR);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Verify IP Address
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Check if an IP address exists in our database immediately. 
          Fast, secure, and reliable verification.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8">
        <form onSubmit={handleCheck} className="relative">
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
          
          <Button 
            type="submit" 
            fullWidth 
            className="mt-6" 
            isLoading={loading}
          >
            Check Status
          </Button>
        </form>

        <IpStatusCard status={status} ip={searchedIp} />
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
        <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="text-2xl font-bold text-indigo-600">100%</div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">Uptime</div>
        </div>
        <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="text-2xl font-bold text-indigo-600">Fast</div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">Response</div>
        </div>
        <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="text-2xl font-bold text-indigo-600">Secure</div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">Database</div>
        </div>
      </div>
    </div>
  );
};