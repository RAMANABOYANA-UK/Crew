import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, PartyPopper, UserPlus, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { QK } from '@/lib/queryKeys';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/Inputs';
import { Button } from '@/components/ui/Button';
import { useToasts } from '@/lib/store';
import { todayISO } from '@/lib/utils';

const schema = z.object({
  firstName: z.string().min(1, 'First name required.'),
  lastName: z.string().min(1, 'Last name required.'),
  email: z.string().email('Valid email required.'),
  phone: z.string().min(7, 'Valid phone required.'),
  department: z.string().min(1, 'Department required.'),
  designation: z.string().min(1, 'Role / title required.'),
  managerRole: z.string(),
  role: z.enum(['admin', 'employee']),
  dateOfJoining: z.string().min(1, 'Joining date required.'),
  wage: z.coerce.number().min(1, 'Wage required.'),
});
type FormVals = z.infer<typeof schema>;

export function AddEmployeeModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToasts((s) => s.toast);
  const employeesQ = useQuery({ queryKey: QK.employees, queryFn: () => api.getEmployees() });
  const [photo, setPhoto] = useState<string | null>(null);
  const [result, setResult] = useState<{ loginId: string; tempPassword: string; name: string } | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormVals>({
    resolver: zodResolver(schema),
    defaultValues: { dateOfJoining: todayISO(), role: 'employee', managerRole: '' },
  });

  const addEmp = useMutation({
    mutationFn: (v: FormVals) =>
      api.addEmployee({
        firstName: v.firstName, lastName: v.lastName, email: v.email, phone: v.phone,
        department: v.department, designation: v.designation,
        managerId: v.managerRole || null, role: v.role, dateOfJoining: v.dateOfJoining,
        wage: v.wage, photo,
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: QK.employees });
      qc.invalidateQueries({ queryKey: QK.activities });
      setResult({ loginId: res.emp.loginId, tempPassword: res.tempPassword, name: `${res.emp.firstName} ${res.emp.lastName}` });
      toast('success', `${res.emp.firstName} ${res.emp.lastName} was added to the team.`);
    },
    onError: (e) => toast('error', (e as Error).message || 'Could not create employee.'),
  });

  const managers = employeesQ.data ?? [];
  const jobPrefix = 'You are about to auto-generate an account for this employee:';

  return (
    <Modal
      open
      title={result ? 'Employee created 🎉' : 'Add Employee'}
      onClose={() => { if (!addEmp.isPending) onClose(); }}
      width="lg"
      closeOnBackdrop={!addEmp.isPending}
      footer={
        result ? (
          <Button data-checkout onClick={onClose}><CheckCircle2 size={15} /> Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={addEmp.isPending}>Cancel</Button>
            <Button onClick={() => handleSubmit((v) => addEmp.mutate(v))()} loading={addEmp.isPending}>
              <UserPlus size={15} /> Create Employee
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full text-cloud" style={{ background: 'var(--color-success)' }}>
            <PartyPopper size={26} />
          </div>
          <p className="text-sm text-muted">
            {jobPrefix} Their sign-in credentials were <span className="font-semibold text-ink">sent to {result.name}’s email</span>.
          </p>
          <div className="w-full rounded-[var(--radius-md)] border border-line bg-canvas p-4 text-left">
            <p className="crew-label">Login ID (system-generated)</p>
            <p className="crew-mono text-sm font-semibold">{result.loginId}</p>
            <p className="crew-label mt-3">Temporary password</p>
            <p className="crew-mono text-sm font-semibold">{result.tempPassword}</p>
          </div>
          <p className="max-w-sm text-[12.5px] text-muted">
            The employee signs in with these credentials and can change the password from the <b>Security</b> tab in their profile.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="rounded-[var(--radius-md)] bg-[var(--color-section)] px-3 py-2 text-[12.5px] text-muted">
            Submitting creates the employee record and <b>auto-generates their Login ID + temporary password</b> (sent to their email).
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="First Name" required error={errors.firstName?.message}>
              <Input {...register('firstName')} invalid={!!errors.firstName} placeholder="First name" />
            </Field>
            <Field label="Last Name" required error={errors.lastName?.message}>
              <Input {...register('lastName')} invalid={!!errors.lastName} placeholder="Last name" />
            </Field>
            <Field label="Email" required error={errors.email?.message}>
              <Input {...register('email')} type="email" invalid={!!errors.email} placeholder="employee@company.com" />
            </Field>
            <Field label="Phone" required error={errors.phone?.message}>
              <Input {...register('phone')} invalid={!!errors.phone} placeholder="+91 …" />
            </Field>
            <Field label="Department" required error={errors.department?.message}>
              <Input {...register('department')} invalid={!!errors.department} placeholder="Engineering" />
            </Field>
            <Field label="Role / Title" required error={errors.designation?.message}>
              <Input {...register('designation')} invalid={!!errors.designation} placeholder="Software Engineer" />
            </Field>
            <Field label="Manager" error={errors.managerRole?.message}>
              <Select {...register('managerRole')} invalid={!!errors.managerRole}>
                <option value="">No manager</option>
                {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName} — {m.designation}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Access Role" required error={errors.role?.message}>
              <Select {...register('role')} invalid={!!errors.role}>
                <option value="employee">Employee</option>
                <option value="admin">HR Officer / Admin</option>
              </Select>
            </Field>
            <Field label="Date of Joining" required error={errors.dateOfJoining?.message}>
              <Input {...register('dateOfJoining')} type="date" invalid={!!errors.dateOfJoining} />
            </Field>
            <Field label="Wage (₹ / month)" required error={errors.wage?.message}>
              <Input {...register('wage')} type="number" min={1} invalid={!!errors.wage} placeholder="50000" />
            </Field>
          </div>
          <PhotoUpload photo={photo} onChange={setPhoto} />
        </div>
      )}
    </Modal>
  );
}
function PhotoUpload({ photo, onChange }: { photo: string | null; onChange: (dataUrl: string) => void }) {
  return (
    <div>
      <span className="crew-label">Profile photo</span>
      <label className="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[#cfd3da] px-4 py-4 transition hover:border-accent crew-focusable">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => onChange(String(reader.result));
            reader.readAsDataURL(file);
          }}
        />
        <Upload size={15} className="text-muted" />
        <span className="text-[13px] font-medium text-muted">{photo ? 'Change photo' : 'Upload employee photo (optional)'}</span>
      </label>
    </div>
  );
}