import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Edit3, Save, X } from 'lucide-react';
import { api } from '@/lib/api';
import { QK } from '@/lib/queryKeys';
import { useSession, useToasts } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Inputs';
import type { Employee } from '@/types';

const PERSONAL_STATUS = ['', 'Single', 'Married', 'Divorced', 'Widowed'];

export function PrivateInfoTab({ employee, readOnly }: { employee: Employee; readOnly: boolean }) {
  const { role } = useSession();
  const editable = !readOnly;
  const qc = useQueryClient();
  const toast = useToasts((s) => s.toast);
  const setUser = useSession((s) => s.setUser);

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({
    dob: employee.personal.dob || '2006-05-03',
    personalEmail: employee.personal.personalEmail,
    address: employee.personal.address || 'D.NO 14/702-1-3 NAKASH STREET, KADAPA',
    city: employee.personal.city || 'Kadapa',
    pincode: employee.personal.pincode || '516001',
    maritalStatus: employee.personal.maritalStatus || 'Single',
    bloodGroup: employee.personal.bloodGroup || 'O+',
    phone: employee.phone,
    fatherName: 'SHAIK ALTAF',
    motherName: 'SHAIK HASEENA',
    gender: 'Male',
    state: 'Andhra Pradesh',
    title: 'Mr.',
  });

  const save = useMutation({
    mutationFn: () =>
      api.updateEmployeeProfile(employee.id, {
        phone: draft.phone,
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
      setIsEditing(false);
      toast('success', 'Profile information saved.');
    },
    onError: () => toast('error', 'Could not save changes.'),
  });

  const onChange =
    (k: keyof typeof draft) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setDraft((d) => ({ ...d, [k]: e.target.value }));

  // Calculate age from DOB
  const age = draft.dob ? Math.floor((new Date().getTime() - new Date(draft.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : '—';

  return (
    <div className="flex flex-col gap-6">
      {/* Header controls for edit mode */}
      <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3">
        <span className="text-xs font-bold text-[#475569] uppercase tracking-wide">Personal Details</span>
        {editable && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="portal-btn-action text-[#0284c7] border-[#0284c7]/40 hover:bg-[#e0f2fe]"
          >
            <Edit3 size={13} /> Edit Personal Information
          </button>
        )}
      </div>

      {isEditing ? (
        /* Edit Mode Form */
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <Field label="Title">
            <Select value={draft.title} onChange={onChange('title')}>
              <option value="Mr.">Mr.</option>
              <option value="Ms.">Ms.</option>
              <option value="Mrs.">Mrs.</option>
              <option value="Dr.">Dr.</option>
            </Select>
          </Field>
          <Field label="Date of Birth">
            <Input type="date" value={draft.dob} onChange={onChange('dob')} />
          </Field>
          <Field label="Gender">
            <Select value={draft.gender} onChange={onChange('gender')}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </Select>
          </Field>
          <Field label="Blood Group">
            <Input value={draft.bloodGroup} onChange={onChange('bloodGroup')} placeholder="O+" />
          </Field>
          <Field label="Father's Name">
            <Input value={draft.fatherName} onChange={onChange('fatherName')} />
          </Field>
          <Field label="Mother's Name">
            <Input value={draft.motherName} onChange={onChange('motherName')} />
          </Field>
          <Field label="Personal Email">
            <Input type="email" value={draft.personalEmail} onChange={onChange('personalEmail')} />
          </Field>
          <Field label="Phone Number">
            <Input value={draft.phone} onChange={onChange('phone')} />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Input value={draft.address} onChange={onChange('address')} />
          </Field>
          <Field label="City">
            <Input value={draft.city} onChange={onChange('city')} />
          </Field>
          <Field label="State">
            <Input value={draft.state} onChange={onChange('state')} />
          </Field>

          <div className="sm:col-span-2 flex items-center justify-end gap-2 border-t border-[#f1f5f9] pt-4">
            <Button variant="secondary" onClick={() => setIsEditing(false)}>
              <X size={14} /> Cancel
            </Button>
            <Button onClick={() => save.mutate()} loading={save.isPending}>
              <Save size={14} /> Save Profile
            </Button>
          </div>
        </div>
      ) : (
        /* Read-Only Portal Table View (matching reference image) */
        <div className="flex flex-col space-y-1">
          <PortalRow label="Title" value={draft.title} />
          <PortalRow label="First Name" value={employee.firstName} />
          <PortalRow label="Last Name" value={employee.lastName} />
          <PortalRow label="Date of Birth" value={formatDisplayDate(draft.dob)} />
          <PortalRow label="Age" value={`${age} Years`} />
          <PortalRow label="Gender" value={draft.gender} />
          <PortalRow label="Emergency Contact (Father)" value={draft.fatherName} />
          <PortalRow label="Emergency Contact (Mother)" value={draft.motherName} />
          <PortalRow label="Permanent Address" value={`${draft.address}, ${draft.city}, ${draft.state}, India`} />
          <PortalRow label="City" value={draft.city} />
          <PortalRow label="State" value={draft.state} />
        </div>
      )}
    </div>
  );
}

function PortalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="portal-table-row py-1">
      <span className="portal-table-label text-[13px]">{label}</span>
      <span className="portal-table-colon">:</span>
      <span className="portal-table-value text-[13px]">{value || ''}</span>
    </div>
  );
}

function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return '—';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return isoDate;
}