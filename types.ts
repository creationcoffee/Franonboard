export interface Task {
  id: string;
  text: string;
  description?: string;
  isCustom?: boolean;
}

export interface ProcessStep {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  tasks: Task[];
}

export type UserRole = 'admin' | 'franchisee';
export type UserStatus = 'potential' | 'active' | 'onboarding' | 'archived';

export interface User {
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  status?: UserStatus;
  phone?: string;
  location?: string;
  createdAt?: string;
  invitedAt?: string;
}

export interface AdminNote {
  userId: string;
  content: string;
  updatedAt: string;
}

export type ActivityType = 'call' | 'email' | 'meeting' | 'note';

export interface ActivityLog {
  id?: string;
  userId: string;
  type: ActivityType;
  content: string;
  timestamp: string;
  adminId: string;
}

export interface CustomTask {
  id: string;
  userId: string;
  text: string;
  description?: string;
  createdAt: string;
  completed: boolean;
}
