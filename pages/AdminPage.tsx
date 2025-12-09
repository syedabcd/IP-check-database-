import React, { useState, useEffect, useRef } from 'react';
import { Lock, LogOut, Plus, Trash2, Database, AlertTriangle, Upload, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../components/Button';
import { getAllIps, addIpAddress, deleteIpAddress, bulkAddIpAddresses } from '../services/dbService';
import { IpRecord } from '../types';

export const AdminPage: React.FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Dashboard State
  const [ips, setIps] = useState<IpRecord[]>([]);
  const [newIp, setNewIp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Bulk Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState<{ added: number; existing: number; errors: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check session on mount (simple in-memory persistence for this demo)
  useEffect(() => {
    const session = sessionStorage.getItem('admin_session');
    if (session === 'true') {
      setIsAuthenticated(true);
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await getAllIps();
      setIps(data);
    } catch (error: any) {
      console.error("Failed to fetch IPs", error);
      if (error.message && error.message.includes('Supabase is not configured')) {
        setFetchError(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      setIsAuthenticated(true);
      setAuthError('');
      sessionStorage.setItem('admin_session', 'true');
      fetchData();
    } else {
      setAuthError('Invalid credentials. Please try again.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
    sessionStorage.removeItem('admin_session');
  };

  const handleAddIp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIp) return;
    
    // Basic Regex
    const regex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;
    if (!regex.test(newIp)) {
      setAddError('Invalid IP format');
      return;
    }

    setIsAdding(true);
    setAddError('');
    try {
      await addIpAddress(newIp);
      setNewIp('');
      await fetchData();
    } catch (error: any) {
      setAddError(error.message || 'Failed to add IP');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this IP?')) return;
    
    try {
      await deleteIpAddress(id);
      await fetchData();
    } catch (error) {
      console.error("Failed to delete", error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStats(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        // Split by new line, trim, remove empty lines
        const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
        
        if (lines.length === 0) {
            alert("File appears to be empty.");
            setIsUploading(false);
            return;
        }

        const result = await bulkAddIpAddresses(lines);
        setUploadStats(result);
        
        if (result.added > 0) {
            await fetchData();
        }
      } catch (error) {
        console.error("Bulk upload failed", error);
        alert("Failed to process file");
      } finally {
        setIsUploading(false);
        // Reset file input so same file can be selected again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
              <Lock className="h-6 w-6 text-indigo-600" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-slate-900">Admin Login</h2>
            <p className="mt-2 text-sm text-slate-600">
              Access the IP database management console
            </p>
          </div>
          
          <form className="mt-8 space-y-6 bg-white p-8 rounded-xl shadow-lg border border-slate-200" onSubmit={handleLogin}>
            {authError && (
              <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {authError}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <Button type="submit" fullWidth>
              Sign in
            </Button>
          </form>
          
          <div className="text-center text-xs text-slate-400">
             (Hint: user=admin, pass=admin)
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600">Manage your IP database</p>
        </div>
        <Button variant="secondary" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
      
      {fetchError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">
            <p className="font-semibold">Configuration Error</p>
            <p className="mt-1">{fetchError}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Actions */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Add Single IP */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-600" />
              Add New IP
            </h2>
            <form onSubmit={handleAddIp}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">IP Address</label>
                <input
                  type="text"
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  placeholder="0.0.0.0"
                  className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border"
                />
                {addError && <p className="mt-2 text-xs text-red-600">{addError}</p>}
              </div>
              <Button type="submit" fullWidth isLoading={isAdding}>
                Add to Database
              </Button>
            </form>
          </div>

          {/* Bulk Import */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              Bulk Import
            </h2>
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Upload a .txt file with one IP address per line to add multiple records at once.
              </p>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".txt"
                className="hidden"
              />
              
              <Button 
                type="button" 
                variant="secondary" 
                fullWidth 
                onClick={triggerFileUpload}
                isLoading={isUploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Select File
              </Button>

              {uploadStats && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm border border-slate-100">
                  <div className="font-medium text-slate-900 mb-2">Import Results:</div>
                  <div className="space-y-1">
                    <div className="flex items-center text-emerald-600">
                      <CheckCircle2 className="h-3 w-3 mr-2" />
                      <span>{uploadStats.added} added</span>
                    </div>
                    {uploadStats.existing > 0 && (
                       <div className="flex items-center text-amber-600">
                        <Database className="h-3 w-3 mr-2" />
                        <span>{uploadStats.existing} duplicates skipped</span>
                      </div>
                    )}
                    {uploadStats.errors > 0 && (
                      <div className="flex items-center text-red-600">
                        <XCircle className="h-3 w-3 mr-2" />
                        <span>{uploadStats.errors} invalid format</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: IP List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Database className="h-5 w-5 text-slate-500" />
                Database Records
              </h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                {ips.length} Total
              </span>
            </div>
            
            {isLoading ? (
              <div className="p-12 text-center text-slate-500">Loading database...</div>
            ) : ips.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                {fetchError ? 'Unable to load records.' : 'Database is empty. Add an IP to get started.'}
              </div>
            ) : (
              <ul className="divide-y divide-slate-200">
                {ips.map((record) => (
                  <li key={record.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                    <div>
                      <div className="font-mono text-slate-900 font-medium">{record.address}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        Added: {new Date(record.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Delete IP"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};