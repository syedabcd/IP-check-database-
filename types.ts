export interface IpRecord {
  id: string;
  address: string;
  createdAt: string;
  addedBy: string;
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