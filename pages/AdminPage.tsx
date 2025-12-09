import React, { useState, useEffect, useRef } from 'react';
import { Lock, LogOut, Plus, Trash2, Database, AlertTriangle, Upload, FileText, CheckCircle2, XCircle, Users, LayoutList, Eye, X } from 'lucide-react';
import { Button } from '../components/Button';
import { getAllIps, addIpAddress, deleteIpAddress, bulkAddIpAddresses, getAppUsers, createAppUser, deleteAppUser, getUserStats, getUserLogs } from '../services/dbService';
import { IpRecord, AppUser, UserStats, AccessLog } from '../types';

interface UserWithStats extends AppUser {
  stats: UserStats;
}

export const AdminPage: React.FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState<'ips' | 'users'>('users');

  // Dashboard State (IPs)
  const [ips, setIps] = useState<IpRecord[]>([]);
  const [newIp, setNewIp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Dashboard State (Users)
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [newUserName, setNewUserName] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [userError, setUserError] = useState('');
  
  // User Details Modal State
  const [viewingUser, setViewingUser] = useState<UserWithStats | null>(null);
  const [userLogs, setUserLogs] = useState<AccessLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Bulk Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState<{ added: number; existing: number; errors: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check session on mount
  useEffect(() => {
    const session = sessionStorage.getItem('admin_session');
    if (session === 'true') {
      setIsAuthenticated(true);
      fetchAllData();
    }
  }, []);

  const fetchAllData = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      // Fetch IPs
      const ipData = await getAllIps();
      setIps(ipData);

      // Fetch Users & Stats
      const usersData = await getAppUsers();
      // Fetch stats for each user (parallel)
      const usersWithStats = await Promise.all(usersData.map(async (u) => {
        const stats = await getUserStats(u.id);
        return { ...u, stats };
      }));
      setUsers(usersWithStats);

    } catch (error: any) {
      console.error("Failed to fetch data", error);
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
      fetchAllData();
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

  // --- IP Handlers ---

  const handleAddIp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIp) return;
    
    const regex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;
    if (!regex.test(newIp)) {
      setAddError('Invalid IP format');
      return;
    }

    setIsAdding(true);
    setAddError('');
    try {
      await addIpAddress(newIp, 'admin');
      setNewIp('');
      await fetchAllData();
    } catch (error: any) {
      setAddError(error.message || 'Failed to add IP');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteIp = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this IP?')) return;
    try {
      await deleteIpAddress(id);
      await fetchAllData();
    } catch (error) {
      console.error("Failed to delete", error);
    }
  };

  // --- User Handlers ---

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;

    setIsAddingUser(true);
    setUserError('');
    try {
      await createAppUser(newUserName.trim());
      setNewUserName('');
      await fetchAllData();
    } catch (error: any) {
      console.error(error);
      setUserError('Failed to create user. Name might be duplicate.');
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Are you sure? This will delete the user and may affect logs.')) return;
    try {
      await deleteAppUser(id);
      await fetchAllData();
    } catch (error) {
      console.error("Failed to delete user", error);
    }
  };

  const handleViewUserLogs = async (user: UserWithStats) => {
    setViewingUser(user);
    setIsLoadingLogs(true);
    setUserLogs([]);
    try {
      const logs = await getUserLogs(user.id);
      setUserLogs(logs);
    } catch (err) {
      console.error("Failed to fetch logs", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const closeUserModal = () => {
    setViewingUser(null);
    setUserLogs([]);
  };

  // --- Bulk Handlers ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStats(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
        
        if (lines.length === 0) {
            alert("File appears to be empty.");
            setIsUploading(false);
            return;
        }

        const result = await bulkAddIpAddresses(lines);
        setUploadStats(result);
        if (result.added > 0) {
            await fetchAllData();
        }
      } catch (error) {
        console.error("Bulk upload failed", error);
        alert("Failed to process file");
      } finally {
        setIsUploading(false);
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
            <Button type="submit" fullWidth>Sign in</Button>
          </form>
          <div className="text-center text-xs text-slate-400"> (Hint: user=admin, pass=admin) </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600">Manage database and users</p>
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

      {/* Tabs */}
      <div className="flex space-x-1 rounded-xl bg-slate-200 p-1 mb-8 w-fit">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium leading-5 transition-all ${
            activeTab === 'users'
              ? 'bg-white text-indigo-700 shadow'
              : 'text-slate-600 hover:bg-white/[0.12] hover:text-slate-800'
          }`}
        >
          <Users className="h-4 w-4" />
          User Management
        </button>
        <button
          onClick={() => setActiveTab('ips')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium leading-5 transition-all ${
            activeTab === 'ips'
              ? 'bg-white text-indigo-700 shadow'
              : 'text-slate-600 hover:bg-white/[0.12] hover:text-slate-800'
          }`}
        >
          <Database className="h-4 w-4" />
          IP Database
        </button>
      </div>

      {activeTab === 'users' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Add User */}
            <div className="lg:col-span-1">
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Plus className="h-5 w-5 text-indigo-600" />
                        Add New User
                    </h2>
                    <form onSubmit={handleAddUser}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-1">User Name</label>
                            <input
                                type="text"
                                value={newUserName}
                                onChange={(e) => setNewUserName(e.target.value)}
                                placeholder="e.g. John Doe"
                                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border"
                            />
                            {userError && <p className="mt-2 text-xs text-red-600">{userError}</p>}
                        </div>
                        <Button type="submit" fullWidth isLoading={isAddingUser}>
                            Create User
                        </Button>
                    </form>
                 </div>
                 <div className="mt-4 p-4 bg-indigo-50 rounded-lg text-sm text-indigo-800">
                    <p>Users added here will appear in the dropdown on the "IP Check" page.</p>
                 </div>
            </div>

            {/* Right: User List */}
            <div className="lg:col-span-2">
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-200 bg-slate-50">
                        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <Users className="h-5 w-5 text-slate-500" />
                            Registered Users & Stats
                        </h2>
                    </div>
                    {users.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">No users found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">IPs Added (Fresh)</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Duplicates Found</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Total Checks</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-50 cursor-pointer group" onClick={() => handleViewUserLogs(u)}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 flex items-center gap-2">
                                           {u.name}
                                           <Eye className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-emerald-600 font-semibold">{u.stats.fresh}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-red-600 font-semibold">{u.stats.duplicate}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-slate-600">{u.stats.total}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDeleteUser(u.id); }} 
                                                className="text-red-400 hover:text-red-900 p-1"
                                                title="Delete User"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                    )}
                 </div>
            </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Actions */}
            <div className="lg:col-span-1 space-y-6">
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

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                Bulk Import
                </h2>
                <div className="space-y-4">
                <p className="text-sm text-slate-600">
                    Upload a .txt file with one IP address per line.
                </p>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".txt" className="hidden" />
                <Button type="button" variant="secondary" fullWidth onClick={triggerFileUpload} isLoading={isUploading}>
                    <Upload className="h-4 w-4 mr-2" />
                    Select File
                </Button>
                {uploadStats && (
                    <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm border border-slate-100">
                        <div className="space-y-1">
                            <div className="flex items-center text-emerald-600"><CheckCircle2 className="h-3 w-3 mr-2" /><span>{uploadStats.added} added</span></div>
                            {uploadStats.existing > 0 && <div className="flex items-center text-amber-600"><Database className="h-3 w-3 mr-2" /><span>{uploadStats.existing} skipped</span></div>}
                            {uploadStats.errors > 0 && <div className="flex items-center text-red-600"><XCircle className="h-3 w-3 mr-2" /><span>{uploadStats.errors} invalid</span></div>}
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
                <div className="p-12 text-center text-slate-500">Database is empty.</div>
                ) : (
                <ul className="divide-y divide-slate-200">
                    {ips.map((record) => (
                    <li key={record.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                        <div>
                        <div className="font-mono text-slate-900 font-medium">{record.address}</div>
                        <div className="flex items-center gap-3 mt-1">
                             <div className="text-xs text-slate-500">
                                {new Date(record.createdAt).toLocaleDateString()}
                            </div>
                             <div className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-full">
                                By: {record.addedBy}
                            </div>
                        </div>
                        </div>
                        <button onClick={() => handleDeleteIp(record.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100">
                        <Trash2 className="h-4 w-4" />
                        </button>
                    </li>
                    ))}
                </ul>
                )}
            </div>
            </div>
        </div>
      )}

      {/* User Logs Modal */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={closeUserModal}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                             <Users className="h-5 w-5 text-indigo-600" />
                             {viewingUser.name}'s History
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            Activity log and checked IP addresses
                        </p>
                    </div>
                    <button 
                        onClick={closeUserModal}
                        className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto p-0 flex-1">
                    {isLoadingLogs ? (
                        <div className="p-12 flex justify-center text-slate-500">
                            Loading records...
                        </div>
                    ) : userLogs.length === 0 ? (
                         <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                            <LayoutList className="h-8 w-8 text-slate-300 mb-2" />
                            No activity recorded for this user.
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50 sticky top-0">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">IP Address</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Result</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Time</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {userLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-3 whitespace-nowrap text-sm font-mono text-slate-900">
                                            {log.ipAddress}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-center">
                                            {log.status === 'FRESH' ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                                                    Fresh
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                                    Duplicate
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-right text-sm text-slate-500">
                                            {new Date(log.createdAt).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                 {/* Footer Stats */}
                 <div className="bg-slate-50 border-t border-slate-100 p-4 flex justify-between text-xs text-slate-500 font-medium uppercase tracking-wide">
                     <span>Total: {userLogs.length}</span>
                     <div className="space-x-4">
                         <span className="text-emerald-600">Fresh: {userLogs.filter(l => l.status === 'FRESH').length}</span>
                         <span className="text-red-600">Dupe: {userLogs.filter(l => l.status === 'DUPLICATE').length}</span>
                     </div>
                 </div>
            </div>
        </div>
      )}
    </div>
  );
};