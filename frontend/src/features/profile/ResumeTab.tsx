import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Award, Plus, Target, UserRound, X } from 'lucide-react';
import { api } from '@/lib/api';
import { QK } from '@/lib/queryKeys';
import { useSession, useToasts } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Input, TextArea } from '@/components/ui/Inputs';
import { EmptyState } from '@/components/ui/Feedback';
import type { Employee } from '@/types';

/** §6.4 — Resume tab: about / love-job / hobbies / skills / certifications. */
export function ResumeTab({ employee, readOnly }: { employee: Employee; readOnly: boolean }) {
  const qc = useQueryClient();
  const toast = useToasts((s) => s.toast);
  const setUser = useSession((s) => s.setUser);
  const [draft, setDraft] = useState({
    about: employee.about,
    loveJob: employee.loveJob,
    hobbies: employee.hobbies,
    skills: [...employee.skills],
    certifications: [...employee.certifications],
  });
  const [newSkill, setNewSkill] = useState('');
  const [newCert, setNewCert] = useState('');

  const save = useMutation({
    mutationFn: () =>
      api.updateEmployeeProfile(employee.id, {
        about: draft.about,
        loveJob: draft.loveJob,
        hobbies: draft.hobbies,
        skills: draft.skills,
        certifications: draft.certifications,
      }),
    onSuccess: (updated) => {
      qc.setQueryData(QK.employee(employee.id), updated);
      qc.invalidateQueries({ queryKey: QK.employees });
      if (useSession.getState().user?.id === employee.id) setUser(updated);
      toast('success', 'Resume saved.');
    },
  });

  function addSkill() {
    const v = newSkill.trim();
    if (!v) return;
    setDraft((d) => ({ ...d, skills: [...d.skills, v] }));
    setNewSkill('');
  }
  function addCert() {
    const v = newCert.trim();
    if (!v) return;
    setDraft((d) => ({ ...d, certifications: [...d.certifications, v] }));
    setNewCert('');
  }

  return (
    <div className="flex flex-col gap-5">
      <Section title="About" icon={<UserRound size={15} />}>
        {readOnly ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{draft.about || '—'}</p>
        ) : (
          <TextArea rows={3} value={draft.about} onChange={(e) => setDraft((d) => ({ ...d, about: e.target.value }))} placeholder="A short professional summary…" />
        )}
      </Section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Section title="What I love about my job" icon={<Target size={15} />}>
          {readOnly ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{draft.loveJob || '—'}</p>
          ) : (
            <TextArea rows={3} value={draft.loveJob} onChange={(e) => setDraft((d) => ({ ...d, loveJob: e.target.value }))} placeholder="What energises you at work…" />
          )}
        </Section>
        <Section title="My interests and hobbies" icon={<Target size={15} />}>
          {readOnly ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{draft.hobbies || '—'}</p>
          ) : (
            <TextArea rows={3} value={draft.hobbies} onChange={(e) => setDraft((d) => ({ ...d, hobbies: e.target.value }))} placeholder="Outside the office…" />
          )}
        </Section>
      </div>

      <Section title="Skills" icon={<Award size={15} />}>
        <ChipList
          items={draft.skills}
          empty={readOnly ? 'No skills added yet.' : 'Add your first skill below.'}
          onRemove={readOnly ? undefined : (i) => setDraft((d) => ({ ...d, skills: d.skills.filter((_, idx) => idx !== i) }))}
        />
        {!readOnly && (
          <AddNew value={newSkill} onChange={setNewSkill} onAdd={addSkill} placeholder="e.g. Project Management" label="Add Skill" />
        )}
      </Section>

      <Section title="Certification" icon={<Award size={15} />}>
        <ChipList
          items={draft.certifications}
          empty={readOnly ? 'No certifications listed yet.' : 'Add credentials like AWS Certified, PMP…'}
          onRemove={readOnly ? undefined : (i) => setDraft((d) => ({ ...d, certifications: d.certifications.filter((_, idx) => idx !== i) }))}
          neutral
        />
        {!readOnly && (
          <AddNew value={newCert} onChange={setNewCert} onAdd={addCert} placeholder="e.g. AWS Certified Developer" label="Add Certification" />
        )}
      </Section>

      {!readOnly && (
        <div className="flex justify-end border-t border-line pt-4">
          <Button onClick={() => save.mutate()} loading={save.isPending}>Save Resume</Button>
        </div>
      )}
    </div>
  );
}
function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="crew-card flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
        <span className="text-muted" aria-hidden>{icon}</span> {title}
      </h2>
      {children}
    </section>
  );
}

function ChipList({
  items,
  empty,
  onRemove,
  neutral,
}: {
  items: string[];
  empty: string;
  onRemove?: (index: number) => void;
  neutral?: boolean;
}) {
  if (items.length === 0) {
    return <EmptyState icon={<Award size={18} />} title={empty} />;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span key={`${item}-${i}`} className={`crew-chip ${neutral ? 'crew-chip--neutral' : ''}`}>
          {item}
          {onRemove && (
            <button type="button" aria-label={`Remove ${item}`} onClick={() => onRemove(i)}>
              <X size={12} />
            </button>
          )}
        </span>
      ))}
    </div>
  );
}

function AddNew({
  value, onChange, onAdd, placeholder, label,
}: { value: string; onChange: (v: string) => void; onAdd: () => void; placeholder: string; label: string }) {
  return (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAdd(); } }}
      />
      <Button variant="secondary" type="button" onClick={onAdd} disabled={!value.trim()}>
        <Plus size={14} /> {label}
      </Button>
    </div>
  );
}