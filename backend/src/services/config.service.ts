import { prisma } from '../utils/prisma';

/** Default hierarchy types for workflow approval levels */
const DEFAULT_HIERARCHY_TYPES = [
  { id: 'reporting_manager', name: 'Reporting Manager' },
  { id: 'department_head', name: 'Department Head' },
  { id: 'hr_manager', name: 'HR Manager' },
];

/** Default approval level types (for backward compatibility when no workflows exist) */
const DEFAULT_APPROVAL_LEVEL_TYPES = [
  { id: 'employee_approval', name: 'Employee Approval' },
  { id: 'manager_approval', name: 'Manager Approval' },
  { id: 'hr_approval', name: 'HR Approval' },
];

export class ConfigService {
  /**
   * Get workflow approval options for Approval Levels table:
   * - hierarchyTypes: dynamic (defaults; can be extended from org settings later)
   * - approvalLevelTypes: defaults + organization's ApprovalWorkflows (shortName)
   */
  async getWorkflowApprovalOptions(organizationId?: string) {
    const hierarchyTypes = [...DEFAULT_HIERARCHY_TYPES];

    let approvalLevelTypes = [...DEFAULT_APPROVAL_LEVEL_TYPES];

    if (organizationId) {
      const workflows = await prisma.approvalWorkflow.findMany({
        where: { organizationId },
        select: { id: true, shortName: true, longName: true },
      });
      const fromWorkflows = workflows.map((w) => ({
        id: w.id,
        name: w.shortName || w.longName || w.id,
      }));
      // Merge: avoid duplicates by id; prepend org workflows
      const seen = new Set(approvalLevelTypes.map((a) => a.id));
      for (const w of fromWorkflows) {
        if (!seen.has(w.id)) {
          seen.add(w.id);
          approvalLevelTypes = [w, ...approvalLevelTypes];
        }
      }
    }

    return {
      hierarchyTypes,
      approvalLevelTypes,
    };
  }
}
