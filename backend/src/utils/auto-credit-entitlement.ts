import { prisma } from './prisma';
import { getAttendanceComponentForLeaveType } from './event-config';

export function readEntitlementDays(rule: unknown): number | null {
  if (!rule || typeof rule !== 'object') return null;
  const r = rule as Record<string, unknown>;
  const keys = ['entitlementDays', 'EntitlementDays', 'entitlement_days', 'entitlementdays'];
  for (const k of keys) {
    const v = r[k];
    const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

export function isAutoCreditApplicableToEmployee(
  s: { paygroupId: string | null; departmentId: string | null; associate: string | null },
  employee: { paygroupId: string | null; departmentId: string | null; employeeCode: string; id: string }
): boolean {
  if (s.paygroupId && s.paygroupId !== employee.paygroupId) return false;
  if (s.departmentId && s.departmentId !== employee.departmentId) return false;
  if (s.associate) {
    const a = s.associate.trim();
    if (a && a !== employee.employeeCode && a !== employee.id) return false;
  }
  return true;
}

export type EmployeeForEntitlement = {
  id: string;
  organizationId: string;
  paygroupId: string | null;
  departmentId: string | null;
  employeeCode: string;
};

export type LeaveTypeForEntitlement = {
  id: string;
  name: string;
  code: string | null;
  defaultDaysPerYear: unknown;
};

/**
 * Get entitlement days for an employee + leave type from Auto Credit settings.
 * Only settings that match the employee's department and paygroup are applied.
 * Auto credit is applied only when the event config has Allow Auto Credit Rule = true.
 * @returns { entitlement, hasAutoCreditInOrg } - use defaultDaysPerYear only when !hasAutoCreditInOrg
 */
export async function getEntitlementForEmployeeAndLeaveType(
  organizationId: string,
  employee: EmployeeForEntitlement,
  leaveType: LeaveTypeForEntitlement & { id: string },
  year: number
): Promise<{ entitlement: number; hasAutoCreditInOrg: boolean }> {
  const defaultDays =
    leaveType.defaultDaysPerYear != null ? Number(leaveType.defaultDaysPerYear) : 0;

  const component = await getAttendanceComponentForLeaveType(organizationId, leaveType);
  if (component && !component.allowAutoCreditRule) {
    return { entitlement: defaultDays, hasAutoCreditInOrg: false };
  }

  const autoCreditSettings = await prisma.autoCreditSetting.findMany({
    where: {
      organizationId,
      effectiveDate: { lte: new Date(year, 11, 31) },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date(year, 0, 1) } }],
    },
    select: {
      eventType: true,
      displayName: true,
      paygroupId: true,
      departmentId: true,
      associate: true,
      autoCreditRule: true,
    },
  });

  const nameKey = leaveType.name.toLowerCase().trim();
  const codeKey = leaveType.code ? leaveType.code.trim().toUpperCase() : '';
  let hasAutoCreditInOrg = false;
  for (const s of autoCreditSettings) {
    const matchByName = s.eventType && s.eventType.toLowerCase().trim() === nameKey;
    const matchByCode = s.displayName && s.displayName.trim().toUpperCase() === codeKey;
    if (matchByName || matchByCode) {
      hasAutoCreditInOrg = true;
      break;
    }
  }

  const applicableSettings = autoCreditSettings.filter((s) =>
    isAutoCreditApplicableToEmployee(s, employee)
  );

  for (const s of applicableSettings) {
    const n = readEntitlementDays(s.autoCreditRule);
    if (n == null) continue;
    const matchByName = s.eventType && s.eventType.toLowerCase().trim() === nameKey;
    const matchByCode = s.displayName && s.displayName.trim().toUpperCase() === codeKey;
    if (matchByName || matchByCode) {
      return { entitlement: n, hasAutoCreditInOrg: true };
    }
  }

  return {
    entitlement: hasAutoCreditInOrg ? 0 : defaultDays,
    hasAutoCreditInOrg,
  };
}
