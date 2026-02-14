import { AdminUser, ProductionLineConfig } from '../../types';

export interface AdminPanelProps {
  onClose: () => void;
  onLinesChanged?: () => void;
}

export interface UsersTabProps {
  users: AdminUser[];
  setUsers: React.Dispatch<React.SetStateAction<AdminUser[]>>;
  lines: ProductionLineConfig[];
  setLines: React.Dispatch<React.SetStateAction<ProductionLineConfig[]>>;
}

export interface LinesTabProps {
  lines: ProductionLineConfig[];
  setLines: React.Dispatch<React.SetStateAction<ProductionLineConfig[]>>;
  onLinesChanged?: () => void;
}

export interface UserFormProps {
  onUserCreated: (user: AdminUser) => void;
  onCancel: () => void;
}

export interface LineFormProps {
  onLineCreated: (line: ProductionLineConfig) => void;
  onCancel: () => void;
  onLinesChanged?: () => void;
}

export interface ResetPasswordModalProps {
  user: AdminUser;
  onClose: () => void;
}

export interface LineAccessModalProps {
  user: AdminUser;
  lines: ProductionLineConfig[];
  onClose: () => void;
}

export type TabType = 'users' | 'lines' | 'database';
