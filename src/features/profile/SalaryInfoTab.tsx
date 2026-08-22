import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Calculator, Save } from 'lucide-react';
import { api } from '@/lib/api';
import { QK } from '@/lib/queryKeys';
import { useSession, useToasts } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Input, Field } from '@/components/ui/Inputs';
import { Segmented } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { computeSalary, DEFAULT_SALARY_RATES, defaultBreakdownRows } from '@/lib/salary';
import { fmtMoney } from '@/lib/utils';
import type { Employee, SalaryRates } from '@/types';
import type { SalaryComponentRow } from '@/types';

type RowKey = 'basic' | 'hra' | 'standard' | 'performance' | 'lta' | 'fixed';

const RATE_KEYS: Record<RowKey, keyof SalaryRates> = {
  basic: 'basicPct',
  hra: 'hraPctOfBasic',
  standard: 'standardPct',
  performance: 'performancePct',
  lta: 'ltaPct',
  fixed: 'basicPct',
};

function compType(rule: SalaryComponentRow['rule']): string {
  if (rule === 'percent-wage') return '% of wage';
  if (rule === 'percent-basic') return '% of Basic';
  return 'Balancing amount';
}

function clampNum(v: number, min: number, max: number, fallback: number): number {
  if (Number.isNaN(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

/**
 * §6.6 — Salary Info tab (Admin manages salary; read-only for employees).
 * Component amounts are auto-computed from wage + % drivers — users may
 * only edit drivers, never the calculated value.
 */
export function SalaryTab({ employee, editable }: { employee: Employee; editable: boolean }) {
  const qc = useQueryClient();
  const toast = useToasts((s) => s.toast);
  const setUser = useSession((s) => s.setUser);
  const ratesQ = useQuery({ queryKey: QK.salaryRates(employee.id), queryFn: () => api.getSalaryRates(employee.id) });

  const [fixed, setFixed] = useState(employee.fixedWage);
  const [wageType, setWageType] = useState<'fixed' | 'hourly'>(employee.wageType);
  const [yearly, setYearly] = useState(employee.fixedWage * 12);
  const [workingDays, setWorkingDays] = useState(employee.workingDaysPerWeek);
  const [basicHours, setBasicHours] = useState(employee.basicHoursPerDay);
  const [ratesOverride, setRatesOverride] = useState<SalaryRates | null>(null);
  const rates = ratesOverride ?? ratesQ.data ?? DEFAULT_SALARY_RATES;
  const setRates = (r: SalaryRates) => setRatesOverride(r);

  const monthly = fixed;
  const setMonthly = (v: number) => {
    setFixed(v);
    setYearly(v * 12);
  };

  const rows = useMemo(() => defaultBreakdownRows(rates), [rates]);
  const calc = useMemo(
    () => computeSalary(monthly, rows, rates.pfEmployeePct, rates.pfEmployerPct, rates.professionalTax),
    [monthly, rows, rates],
  );

  const save = useMutation({
    mutationFn: () =>
      api.updateSalary(employee.id, {
        wage: monthly,
        wageType,
        workingDaysPerWeek: workingDays,
        basicHoursPerDay: basicHours,
        ...rates,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.salaryRates(employee.id) });
      qc.invalidateQueries({ queryKey: QK.employees });
      if (useSession.getState().user?.id === employee.id) {
        const current = useSession.getState().user;
        if (current) setUser({ ...current, fixedWage: monthly, wageType });
      }
      toast('success', 'Salary structure saved — components were recalculated from the defined wage.');
    },
    onError: () => toast('error', 'Could not save salary structure.'),
  });
if (ratesQ.isLoading) {
    return (
      <div className="crew-card flex flex-col gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {!editable && (
        <p className="rounded-[var(--radius-md)] bg-[var(--color-info-soft)] px-3 py-2 text-[12.5px] text-[var(--color-info)]">
          Payroll data is read-only for employees (§PRD 3.6.1). Contact HR to request changes.
        </p>
      )}

      {/* wage definition */}
      <section className="crew-card">
        <h2 className="crew-label-track mb-4 flex items-center gap-2"><Calculator size={14} /> Wage definition</h2>
        <div className="mb-4 flex items-center gap-3">
          <span className="text-sm text-muted">Wage Type</span>
          <Segmented
            options={[
              { value: 'fixed', label: 'Fixed' },
              { value: 'hourly', label: 'Hourly' },
            ]}
            value={wageType}
            onChange={(v) => setWageType(v)}
            ariaLabel="Wage type"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Fixed Wage (₹ / month)">
            <MoneyInput value={monthly} onChange={(v) => setMonthly(clampNum(v, 0, 10_000_000, monthly))} disabled={!editable} />
          </Field>
          <Field label="Month Wage (₹)">
            <MoneyInput value={monthly} onChange={(v) => setMonthly(clampNum(v, 0, 10_000_000, monthly))} disabled={!editable} />
          </Field>
          <Field label="Yearly Wage (₹)">
            <MoneyInput value={yearly} onChange={(v) => setMonthly(clampNum(v, 0, 120_000_000, yearly) / 12)} disabled={!editable} />
          </Field>
          <Field label="No. of working days / week">
            <Input type="number" min={1} max={7} value={workingDays} disabled={!editable} onChange={(e) => setWorkingDays(clampNum(Number(e.target.value), 1, 7, employee.workingDaysPerWeek))} />
          </Field>
          <Field label="Basic time (hrs / day)">
            <Input type="number" min={1} max={12} value={basicHours} disabled={!editable} onChange={(e) => setBasicHours(clampNum(Number(e.target.value), 1, 12, employee.basicHoursPerDay))} />
          </Field>
        </div>
        <p className="mt-3 text-[12px] text-faint">
          Editing Month Wage auto-derives Yearly Wage (×12) and vice-versa. Figures carry per-month / per-year labels.
        </p>
      </section>

      {/* salary components */}
      <section>
        <h2 className="crew-label-track mb-2">Salary Components</h2>
        <div className="crew-table-wrap">
          <table className="crew-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Compensation Type</th>
                <th>Rate (%)</th>
                <th className="crew-table--num">Value (₹ / month)</th>
              </tr>
            </thead>
            <tbody>
              {calc.rows.map((row) => {
                const isBalancing = row.key === 'fixed';
                return (
                  <tr key={row.key}>
                    <td className="font-medium">{row.label}</td>
                    <td className="text-muted">{compType(row.rule)}</td>
                    <td>
                      {!editable || row.rule === 'balancing' ? (
                        <span className="text-muted">{isBalancing ? 'auto' : `${row.ratePct}%`}</span>
                      ) : (
                        <input
                          type="number"
                          step="any"
                          min={0}
                          value={rates[RATE_KEYS[row.key as RowKey]]}
                          onChange={(e) => setRates({ ...rates, [RATE_KEYS[row.key as RowKey]]: Number(e.target.value) })}
                          className="crew-input crew-input--pct"
                          aria-label={`${row.label} rate`}
                        />
                      )}
                    </td>
                    <td className="crew-table--num font-medium">{fmtMoney(row.fixedAmount)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="crew-label-track border-t border-line pt-2 pb-1">Total (gross)</td>
                <td className="crew-table--num border-t border-line pt-2 pb-1 font-bold">{fmtMoney(calc.totalComponents)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {calc.overWage && (
          <p className="mt-2 flex items-center gap-2 rounded-[var(--radius-md)] border border-[#f3c3c5] bg-[var(--color-danger-soft)] px-3 py-2 text-[13px] font-medium text-danger" role="alert">
            <AlertTriangle size={15} /> Sum of components exceeds the defined wage (₹{monthly.toLocaleString('en-IN')}/month). Lower the % rates — components must never total more than the wage.
          </p>
        )}
      </section>

      {/* PF + tax */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="crew-card">
          <h2 className="crew-label-track mb-4">Provident Fund (PF) contribution</h2>
          <div className="grid grid-cols-2 gap-4">
            <NumericField label="Employee %" value={rates.pfEmployeePct} onChange={(v) => setRates({ ...rates, pfEmployeePct: v })} disabled={!editable} />
            <NumericField label="Employer %" value={rates.pfEmployerPct} onChange={(v) => setRates({ ...rates, pfEmployerPct: v })} disabled={!editable} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <ReadOnly label="Employee contribution" figure={fmtMoney(calc.pfEmployee)} />
            <ReadOnly label="Employer contribution" figure={fmtMoney(calc.pfEmployer)} />
          </div>
        </section>

        <section className="crew-card">
          <h2 className="crew-label-track mb-4">Tax Deductions</h2>
          <NumericField label="Professional Tax (₹ / month, fixed)" value={rates.professionalTax} onChange={(v) => setRates({ ...rates, professionalTax: v })} disabled={!editable} />
          <div className="mt-3">
            <ReadOnly label="Monthly deduction" figure={fmtMoney(calc.professionalTax)} />
          </div>
        </section>
      </div>

      {/* net summary */}
      <section className="crew-card">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ReadOnly label="Gross monthly" figure={fmtMoney(calc.grossMonthly)} />
          <ReadOnly label="Monthly deductions" figure={fmtMoney(calc.monthlyDeductions)} />
          <ReadOnly label="Net pay (monthly)" figure={fmtMoney(calc.netMonthly)} />
          <ReadOnly label="Net pay (yearly)" figure={fmtMoney(calc.yearlyNet, 'year')} />
        </div>
      </section>

      {editable && (
        <div className="flex justify-end border-t border-line pt-4">
          <Button onClick={() => save.mutate()} loading={save.isPending} disabled={calc.overWage}>
            <Save size={15} /> Save Salary Structure
          </Button>
        </div>
      )}
    </div>
  );
}

function MoneyInput({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return <Input type="number" min={0} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} />;
}

function NumericField({ label, value, onChange, disabled }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div>
      <span className="crew-label">{label}</span>
      <Input type="number" min={0} step="any" value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function ReadOnly({ label, figure }: { label: string; figure: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-line bg-canvas px-3 py-2.5">
      <p className="crew-label">{label}</p>
      <p className="mt-0.5 text-[15px] font-semibold text-ink">{figure}</p>
    </div>
  );
}
