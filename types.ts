export interface IpRecord {
  id: string;
  address: string;
  createdAt: string;
  addedBy: string;
}

export interface AppUser {
  id: string;
  name: string;
  createdAt: string;
}

export interface UserStats {
  fresh: number;
  duplicate: number;
  total: number;
}

export interface AccessLog {
  id: string;
  ipAddress: string;
  status: 'FRESH' | 'DUPLICATE';
  createdAt: string;
}

export enum CheckStatus {
  IDLE = 'IDLE',
  CHECKING = 'CHECKING',
  FRESH = 'FRESH',
  DUPLICATE = 'DUPLICATE',
  ERROR = 'ERROR'
}

export interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
}