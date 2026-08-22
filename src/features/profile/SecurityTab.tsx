import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { PasswordStrength } from '@/features/auth/PasswordStrength';
import { Field, PasswordInput } from '@/components/ui/Inputs';
import { Button } from '@/components/ui/Button';
import { useSession, useToasts } from '@/lib/store';

const passwordSchema = z
  .string()
  .min(8, 'At least 8 characters')
  .regex(/[a-z]/, 'Add a lowercase letter')
  .regex(/[A-Z]/, 'Add an uppercase letter')
  .regex(/\d/, 'Add a number')
  .regex(/[^A-Za-z0-9]/, 'Add a symbol');

const schema = z.object({
  current: z.string().min(1, 'Enter your current password.'),
  next: passwordSchema,
  confirm: z.string(),
}).refine((d) => d.next === d.confirm, { message: 'Passwords do not match.', path: ['confirm'] });

type FormVals = z.infer<typeof schema>;

/**
 * §6.7 — Security tab (own profile only): the mechanism by which an
 * employee changes their system-generated temporary password.
 */
export function SecurityTab() {
  const toast = useToasts((s) => s.toast);
  const user = useSession((s) => s.user);
  const [saved, setSaved] = useState(false);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormVals>({
    resolver: zodResolver(schema),
  });
  const pw = watch('next') ?? '';

  async function onSubmit(v: FormVals) {
    if (v.current !== 'Crew@1234') {
      toast('error', 'Current password is incorrect.');
      return;
    }
    // Mock: real backend would re-hash & persist. Demo accepts the change.
    setSaved(true);
    toast('success', 'Password updated. Use your new password next time you sign in.');
  }

  return (
    <div className="crew-card max-w-xl">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent-soft)] text-[#4b33c9]">
          <KeyRound size={16} />
        </span>
        <div>
          <h2 className="text-[13px] font-semibold">Change password</h2>
          <p className="text-[12.5px] text-muted">{user?.loginId} · resets your system-generated password</p>
        </div>
      </div>

      {saved ? (
        <div className="flex flex-col items-center gap-3 rounded-[var(--radius-md)] bg-[var(--color-success-soft)] px-4 py-8 text-center">
          <ShieldCheck size={26} className="text-success" />
          <p className="text-sm font-semibold">Password updated</p>
          <p className="max-w-xs text-[13px] text-muted">Use your new password the next time you sign in.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Field label="Current Password" required error={errors.current?.message}>
            <PasswordInput {...register('current')} autoComplete="current-password" invalid={!!errors.current} />
          </Field>
          <Field label="New Password" required error={errors.next?.message}>
            <PasswordInput {...register('next')} autoComplete="new-password" invalid={!!errors.next} />
          </Field>
          <PasswordStrength value={pw} />
          <Field label="Confirm New Password" required error={errors.confirm?.message}>
            <PasswordInput {...register('confirm')} autoComplete="new-password" invalid={!!errors.confirm} />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" loading={isSubmitting}>Update Password</Button>
          </div>
        </form>
      )}
    </div>
  );
}