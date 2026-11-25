/**
 * RoleSelector - Tab-based role navigation
 */

import { useMemo } from 'react';
import type { UserRole } from '../../config/roles';
import { getAllRoleConfigs } from '../../config/roles';
import { getRoleColors } from '../../styles/palette';

interface RoleSelectorProps {
  selectedRole: UserRole;
  onSelect: (role: UserRole) => void;
  currentUserRole: UserRole;
}

export function RoleSelector({ selectedRole, onSelect, currentUserRole }: RoleSelectorProps) {
  const roles = useMemo(() => getAllRoleConfigs(), []);

  return (
    <div className="flex flex-wrap gap-2 mb-8 p-1 bg-surface border border-default rounded-xl" role="tablist" aria-label="Role workspaces">
      {roles.map((config) => {
        const Icon = config.icon;
        const colors = getRoleColors(config.key);
        const isActive = selectedRole === config.key;
        const isCurrent = config.key === currentUserRole;

        return (
          <button
            key={config.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`role-panel-${config.key}`}
            id={`role-tab-${config.key}`}
            onClick={() => onSelect(config.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
              isActive
                ? `${colors.bg} ${colors.text} shadow-sm`
                : 'text-muted hover:text-ink hover:bg-brand-50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {config.label}
            {isCurrent && !isActive && (
              <span className="ml-1 px-1.5 py-0.5 text-xs font-medium badge-success">
                Current
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}