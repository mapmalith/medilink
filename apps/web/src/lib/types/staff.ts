export type StaffDepartment = 'ADMIN' | 'CALL_CENTER';

export interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  department: string | null;
  user: {
    email: string;
    phone: string | null;
    role: string;
    isActive: boolean;
  };
  lastLogin: string | null;
  createdAt: string;
}

export const DEPARTMENT_LABEL: Record<StaffDepartment, string> = {
  ADMIN: 'Admin',
  CALL_CENTER: 'Call Center',
};
