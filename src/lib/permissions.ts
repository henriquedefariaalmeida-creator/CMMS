import { UserProfile } from '../types';

export type Action = 
  | 'manage_checklist_structure' 
  | 'execute_checklist'
  | 'view_checklist';

export const hasPermission = (role: UserProfile['role'] | undefined, action: Action): boolean => {
  if (!role) return false;
  if (role === 'admin') return true;

  switch (action) {
    case 'manage_checklist_structure':
      return role === 'planejador';
    case 'execute_checklist':
      return role === 'planejador' || role === 'manutentor';
    case 'view_checklist':
      return true;
    default:
      return false;
  }
};
