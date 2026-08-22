/** Centralized React Query keys so optimistic updates/invalidations
 * stay consistent across features. */
export const QK = {
  company: ['company'] as const,
  employees: ['employees'] as const,
  employee: (id: string) => ['employee', id] as const,
  today: (id: string) => ['today', id] as const,
  attendance: (employeeId: string | undefined, from: string, to: string) => ['attendance', employeeId ?? 'all', from, to] as const,
  timeOff: (employeeId?: string) => ['timeoff', employeeId ?? 'all'] as const,
  activities: ['activities'] as const,
  allocations: ['allocations'] as const,
  salaryRates: (id: string) => ['salaryRates', id] as const,
  payslips: (id: string) => ['payslips', id] as const,
  report: ['report'] as const,
};