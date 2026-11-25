/**
 * RoleCard - Detailed view of a single role workspace
 */

import { Link } from 'react-router-dom';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import type { RoleConfig } from '../../config/roles';
import { getRoleColors } from '../../styles/palette';

interface RoleCardProps {
  config: RoleConfig;
  isActive?: boolean;
  onSelect?: () => void;
}

export function RoleCard({ config, isActive, onSelect }: RoleCardProps) {
  const colors = getRoleColors(config.key);
  const Icon = config.icon;

  return (
    <article
      className={`group relative p-6 rounded-2xl border transition-all duration-200 ${colors.bg} ${colors.border} ${
        isActive ? 'border-2 shadow-lg' : 'border hover:border-opacity-50 hover:shadow-md'
      }`}
      onClick={onSelect}
      style={{ cursor: onSelect ? 'pointer' : 'default' }}
    >
      {/* Role Badge */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${colors.iconBg}`}>
            <Icon className={`w-6 h-6 ${colors.iconText}`} aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-ink">{config.label}</h3>
            <p className="text-sm text-muted mt-0.5">{config.key.replace(/_/g, ' ')}</p>
          </div>
        </div>
        {isActive && (
          <div className="flex items-center gap-1 text-xs font-medium badge-success">
            <CheckCircle className="w-3.5 h-3.5" />
            Active
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-secondary mb-5 leading-relaxed">{config.description}</p>

      {/* Permissions */}
      <div className="mb-5">
        <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Permissions</h4>
        <ul className="space-y-2">
          {config.permissions.map((perm, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-secondary">
              <CheckCircle className={`w-4 h-4 shrink-0 mt-0.5 ${colors.iconText}`} />
              <span>{perm}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Primary Actions */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Primary Actions</h4>
        <div className="flex flex-wrap gap-2">
          {config.primaryActions.map((action) => (
            <Link
              key={action.href}
              to={action.href}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${colors.border} ${colors.text} hover:bg-opacity-10 ${colors.hoverBg} ${colors.hoverBorder}`}
              onClick={(e) => e.stopPropagation()}
            >
              <action.icon className="w-3.5 h-3.5" />
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Secondary Actions */}
      <div className="mb-5">
        <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Also Accessible</h4>
        <div className="flex flex-wrap gap-2">
          {config.secondaryActions.map((action) => (
            <Link
              key={action.href}
              to={action.href}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted bg-surface border border-default rounded-lg hover:bg-brand-50 hover:text-ink transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <action.icon className="w-3.5 h-3.5" />
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Compliance Notes */}
      <div className="pt-4 border-t border-default">
        <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-warning" />
          Compliance Notes
        </h4>
        <ul className="space-y-2 text-xs text-muted">
          {config.complianceNotes.map((note, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full mt-2 bg-muted/30 shrink-0" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}