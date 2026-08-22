import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Paperclip, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { QK } from '@/lib/queryKeys';
import { useSession, useToasts } from '@/lib/store';
import { countWorkingDays } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select, TextArea } from '@/components/ui/Inputs';
import { Button } from '@/components/ui/Button';
import type { TimeOffType } from '@/types';

export const TIME_OFF_TYPES: TimeOffType[] = ['Paid Time Off', 'Sick Leave', 'Unpaid Leave'];

const schema = z
  .object({
    type: z.enum(['Paid Time Off', 'Sick Leave', 'Unpaid Leave']),
    startDate: z.string().min(1, 'Start date required.'),
    endDate: z.string().min(1, 'End date required.'),
    days: z.coerce.number().min(1, 'At least 1 day.'),
    remarks: z.string().optional(),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: 'End date cannot be before start date.',
    path: ['endDate'],
  });
type FormVals = z.infer<typeof schema>;

/**
 * §8.2 — Time Off Type Request modal.
 * - Employee pre-filled read-only (current user)
 * - Validity period + auto-computed allocation days
 * - Attachment surfaced only for Sick Leave (certificate)
 * - Remarks free-text (PRD §3.5.1)
 * Footer: Submit (primary) + Cancel (labelled "Reject" in wireframe →
 * treated as Cancel/Discard for the requester's own draft).
 */
export function TimeOffRequestModal({ open, onClose, defaultDate }: { open: boolean; onClose: () => void; defaultDate?: string }) {
  const { user } = useSession();
  const toast = useToasts((s) => s.toast);
  const qc = useQueryClient();
  const [attach, setAttach] = useState<string | null>(null);

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<FormVals>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'Paid Time Off', startDate: defaultDate ?? '', endDate: defaultDate ?? '', days: 1, remarks: '' },
  });
  const [type, start, end] = watch(['type', 'startDate', 'endDate']);
  const autoDays = useMemo(() => {
    if (!start || !end || end < start) return 0;
    return countWorkingDays(start, end) || 1;
  }, [start, end]);

  // §8.2 — Allocation auto-computes from the date range (editable for half-days).
  useEffect(() => {
    if (autoDays > 0) setValue('days', autoDays);
  }, [autoDays, setValue]);

  const submit = useMutation({
    mutationFn: (v: FormVals) =>
      api.submitTimeOff({ employeeId: user!.id, type: v.type, startDate: v.startDate, endDate: v.endDate, remarks: v.remarks ?? '', attachment: v.type === 'Sick Leave' ? attach : null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.timeOff(user!.id) });
      qc.invalidateQueries({ queryKey: QK.timeOff() });
      qc.invalidateQueries({ queryKey: QK.activities });
      toast('success', 'Time-off request submitted. HR will review it shortly.');
      reset();
      setAttach(null);
      onClose();
    },
    onError: (e) => toast('error', (e as Error).message || 'Could not submit request.'),
  });

  function onSubmit(v: FormVals) {
    if (v.type === 'Sick Leave' && !attach) {
      toast('error', 'A sick-leave certificate attachment is required.');
      return;
    }
    submit.mutate(v);
  }

  return (
    <Modal
      open={open}
      title="Time Off Type Request"
      onClose={onClose}
      closeOnBackdrop={!submit.isPending}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submit.isPending}>Cancel</Button>
          <Button onClick={() => handleSubmit(onSubmit)()} loading={submit.isPending}>
            <Send size={15} /> Submit
          </Button>
        </>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()} noValidate>
        <Field label="Employee" required>
          <Input value={`${user?.firstName} ${user?.lastName}`} readOnly disabled />
        </Field>
        <Field label="Time Off Type" required error={errors.type?.message}>
          <Select {...register('type')}>
            {TIME_OFF_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="From (validity)" required error={errors.startDate?.message}>
            <Input type="date" {...register('startDate')} invalid={!!errors.startDate} />
          </Field>
          <Field label="To (validity)" required error={errors.endDate?.message}>
            <Input type="date" {...register('endDate')} invalid={!!errors.endDate} />
          </Field>
        </div>
        <Field label="Allocation (days)" required hint="Auto-computed from the date range (working days); edit only for half-days." error={errors.days?.message}>
          <Input type="number" min={1} {...register('days')} invalid={!!errors.days} />
        </Field>
        {type === 'Sick Leave' && (
          <Field label="Attachment — sick leave certificate" required hint="Only your HR Officer can view this.">
            <label className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[#cfd3da] px-3 py-2.5 text-[13px] text-muted transition hover:border-accent crew-focusable">
              <input type="file" className="hidden" onChange={(e) => setAttach(e.target.files?.[0]?.name ?? null)} />
              <Paperclip size={14} />
              {attach ?? 'Upload certificate (PDF / image)'}
            </label>
          </Field>
        )}
        <Field label="Remarks / reason" error={errors.remarks?.message}>
          <TextArea rows={2} {...register('remarks')} placeholder="Optional note for the approver…" />
        </Field>
      </form>
    </Modal>
  );
}