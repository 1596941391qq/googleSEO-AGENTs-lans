
export interface User {
  id: string;
  name: string;
  avatar: string;
  credits: number;
  role: string;
  isLoggedIn: boolean;
}

export interface HistoryItem {
  id: string;
  keyword: string;
  language: string;
  timestamp: string;
  count: number;
}

export interface Task {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'queued';
  progress: number;
}

export enum MiningStep {
  INPUT = 1,
  MINING = 2,
  RESULTS = 3
}
