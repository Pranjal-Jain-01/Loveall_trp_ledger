/**
 * RoleWorkspacePage - Main page for role-based workspace configuration
 */

import { useState } from 'react';
import { Shield } from 'lucide-react';
import type { UserRole } from '../config/roles';
import { getAllRoleConfigs } from '../config/roles';
import { RoleCard, RoleSelector, RoleOverviewGrid } from '../components/role';

export default function RoleWorkspacePage() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('ORG_ADMIN');

  // In a real app, this would come from auth context
  const currentUserRole: UserRole = 'ORG_ADMIN';

  const roles = getAllRoleConfigs();

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="container py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-semibold text-ink tracking-tight">Role Workspaces</h1>
              <p className="mt-1 text-sm text-muted">
                Configured for: <span className="font-medium text-ink">LoveAll Foundation</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 text-xs font-medium bg-brand-100 text-brand-700 border border-brand-200 rounded-full">
                Current: {currentUserRole.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Role Selector Tabs */}
          <RoleSelector
            selectedRole={selectedRole}
            onSelect={setSelectedRole}
            currentUserRole={currentUserRole}
          />
        </div>

        {/* Role Detail Card */}
        <div className="animate-fadeIn" role="tabpanel" id={`role-panel-${selectedRole}`} aria-labelledby={`role-tab-${selectedRole}`}>
          <RoleCard config={roles.find((r) => r.key === selectedRole)!} isActive={selectedRole === currentUserRole} />
        </div>

        {/* All Roles Overview Grid */}
        <RoleOverviewGrid
          selectedRole={selectedRole}
          currentUserRole={currentUserRole}
          onSelectRole={setSelectedRole}
        />

        {/* Footer Compliance Note */}
        <div className="mt-10 p-4 bg-surface border border-default rounded-xl">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-ink mb-1">Role-Based Access Control (RBAC)</h4>
              <p className="text-sm text-muted">
                All permissions are enforced at the API layer. UI elements respect the current user's role.
                Compliance guardrails (FCRA blocks, verified agreement gates, UTR requirements) cannot be bypassed
                by any role — they are enforced by database constraints and verified by the ledger.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}