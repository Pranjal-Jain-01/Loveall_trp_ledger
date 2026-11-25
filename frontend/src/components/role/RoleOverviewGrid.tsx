/**
 * RoleOverviewGrid - Grid of all role cards for quick overview
 */

import { Link } from 'react-router-dom';
import { FileText, ChevronRight } from 'lucide-react';
import type { UserRole } from '../../config/roles';
import { getAllRoleConfigs } from '../../config/roles';
import { getRoleColors } from '../../styles/palette';

interface RoleOverviewGridProps {
  selectedRole: UserRole;
  currentUserRole: UserRole;
  onSelectRole: (role: UserRole) => void;
}

export function RoleOverviewGrid({ selectedRole, currentUserRole, onSelectRole }: RoleOverviewGridProps) {
  const roles = getAllRoleConfigs();

  return (
    <div className="mt-10">
      <h2 className="text-xl font-semibold text-ink mb-6">All Role Workspaces</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {roles.map((config) => {
          const Icon = config.icon;
          const colors = getRoleColors(config.key);
          const isCurrent = config.key === currentUserRole;
          const isSelected = selectedRole === config.key;

          return (
            <Link
              key={config.key}
              to="#"
              onClick={(e) => {
                e.preventDefault();
                onSelectRole(config.key);
              }}
              className={`group p-5 rounded-xl border transition-all duration-200 ${colors.bg} ${colors.border} hover:shadow-lg hover:border-opacity-50 ${isSelected ? 'border-2' : ''}`}
              aria-current={isSelected ? 'true' : 'false'}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg ${colors.iconBg}`}>
                    <Icon className={`w-5 h-5 ${colors.iconText}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink">{config.label}</h3>
                    <p className="text-xs text-muted">{config.key.replace(/_/g, ' ')}</p>
                  </div>
                </div>
                {isCurrent && (
                  <span className="text-xs font-medium badge-success">Current</span>
                )}
              </div>
              <p className="text-sm text-muted mb-4 line-clamp-2">{config.description}</p>
              <div className="flex items-center gap-2 text-xs text-muted">
                <FileText className="w-3.5 h-3.5" />
                <span>{config.permissions.length} permissions</span>
                <span className="text-muted/50">•</span>
                <span>{config.primaryActions.length} primary actions</span>
              </div>
              {isSelected && (
                <div className="mt-3 pt-3 border-t border-current/20 flex items-center justify-between">
                  <span className="text-sm font-medium text-brand-600">Viewing details →</span>
                  <ChevronRight className="w-4 h-4 text-brand-600" />
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}