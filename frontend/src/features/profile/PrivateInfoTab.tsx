import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Save } from 'lucide-react';
import { api } from '@/lib/api';
import { QK } from '@/lib/queryKeys';
import { useSession, useToasts } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Inputs';
import { Avatar } from '@/components/ui/Avatar';
import type { Employee } from '@/types';

const PERSONAL_STATUS = ['', 'Single', 'Married', 'Divorced', 'Widowed'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * §6.5 — Private Info tab, two-column label-above-value layout.
 * Employees edit limited fields (address, phone, profile picture);
 * Admins can edit all fields when viewing their own profile.
 */
export function PrivateInfoTab({ employee, readOnly }: { employee: Employee; readOnly: boolean }) {
  const { role } = useSession();
  const editable = !readOnly;
  const limited = role === 'employee';
  const qc = useQueryClient();
  const toast = useToasts((s) => s.toast);
  const setUser = useSession((s) => s.setUser);

  const [draft, setDraft] = useState({
    dob: employee.personal.dob,
    personalEmail: employee.personal.personalEmail,
    address: employee.personal.address,
    city: employee.personal.city,
    pincode: employee.personal.pincode,
    maritalStatus: employee.personal.maritalStatus,
    bloodGroup: employee.personal.bloodGroup,
    phone: employee.phone,
  });
  const [photo, setPhoto] = useState<string | null>(employee.photo);

  const save = useMutation({
    mutationFn: () =>
      api.updateEmployeeProfile(employee.id, {
        phone: draft.phone,
        photo,
        personal: {
          dob: draft.dob,
          personalEmail: draft.personalEmail,
          address: draft.address,
          city: draft.city,
          pincode: draft.pincode,
          maritalStatus: draft.maritalStatus,
          bloodGroup: draft.bloodGroup,
        },
      }),
    onSuccess: (updated) => {
      qc.setQueryData(QK.employee(employee.id), updated);
      qc.invalidateQueries({ queryKey: QK.employees });
      if (useSession.getState().user?.id === employee.id) setUser(updated);
      toast('success', 'Private info saved.');
    },
        onError: () => toast('error', 'Could not save changes.'),
  });

  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(file);
  }

  const onChange =
    (k: keyof typeof draft) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setDraft((d) => ({ ...d, [k]: e.target.value }));

  return (
    <div className="crew-card flex flex-col gap-6">
      {/* photo + restricted-note */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative">
          <Avatar name={`${employee.firstName} ${employee.lastName}`} photo={photo} color={employee.avatarColor} size={64} />
          {editable && (
            <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-line bg-cloud text-muted shadow-sm hover:text-ink crew-focusable" aria-label="Change profile photo">
              <input type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
              <Camera size={13} />
            </label>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold">{employee.firstName} {employee.lastName}</p>
          <p className="text-[12.5px] text-muted">
            {readOnly ? 'Read-only view (admin browsing).' : limited ? 'You can edit your contact details here.' : 'Full edit access as HR.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <Field label="Date of Birth">
          {editable && !limited ? <Input type="date" value={draft.dob} onChange={onChange('dob')} /> : <ReadOnlyValue value={fmtOr(draft.dob)} />}
        </Field>
        <Field label="Personal Email">
          {editable ? <Input type="email" value={draft.personalEmail} onChange={onChange('personalEmail')} /> : <ReadOnlyValue value={draft.personalEmail || '—'} />}
        </Field>
        <Field label="Phone">
          {editable ? <Input value={draft.phone} onChange={onChange('phone')} /> : <ReadOnlyValue value={draft.phone || '—'} />}
        </Field>
        <Field label="Blood Group">
          {editable && !limited ? <Input value={draft.bloodGroup} onChange={onChange('bloodGroup')} placeholder="A+" /> : <ReadOnlyValue value={draft.bloodGroup || '—'} />}
        </Field>
        <Field label="Personal Address" className="sm:col-span-2">
          {editable ? <Input value={draft.address} onChange={onChange('address')} /> : <ReadOnlyValue value={draft.address || '—'} />}
        </Field>
        <Field label="City">
          {editable && !limited ? <Input value={draft.city} onChange={onChange('city')} /> : <ReadOnlyValue value={draft.city || '—'} />}
        </Field>
        <Field label="Pincode">
          {editable && !limited ? <Input value={draft.pincode} onChange={onChange('pincode')} /> : <ReadOnlyValue value={draft.pincode || '—'} />}
        </Field>
        <Field label="Marital Status">
          {editable && !limited ? (
            <Select value={draft.maritalStatus} onChange={onChange('maritalStatus')}>
              {PERSONAL_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          ) : (
            <ReadOnlyValue value={draft.maritalStatus || '—'} />
          )}
        </Field>
      </div>

      {editable && (
        <div className="flex justify-end border-t border-line pt-4">
          <Button onClick={() => save.mutate()} loading={save.isPending}>
            <Save size={15} /> Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}

function ReadOnlyValue({ value }: { value: string }) {
    return <p className="rounded-[var(--radius-md)] border border-line bg-canvas px-3 py-2.5 text-sm text-ink">{value}</p>;
}

function fmtOr(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d} ${MONTHS[Number(m) - 1] ?? ''} ${y}`;
}