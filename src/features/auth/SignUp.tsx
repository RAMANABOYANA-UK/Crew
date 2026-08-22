import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Upload, UserPlus } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { PasswordStrength } from './PasswordStrength';
import { Segmented } from '@/components/ui/Tabs';
import { Field, Input, PasswordInput } from '@/components/ui/Inputs';
import { GlowButton } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { useSession, useToasts } from '@/lib/store';

const passwordSchema = z
  .string()
  .min(8, 'At least 8 characters')
  .regex(/[a-z]/, 'Add a lowercase letter')
  .regex(/[A-Z]/, 'Add an uppercase letter')
  .regex(/\d/, 'Add a number')
  .regex(/[^A-Za-z0-9]/, 'Add a symbol');

const schema = z
  .object({
    companyName: z.string().min(2, 'Company name is required.'),
    fullName: z.string().min(3, 'Full name is required.'),
    email: z.string().email('Valid email required.'),
    phone: z.string().min(7, 'Valid phone required.'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { message: 'Passwords do not match.', path: ['confirmPassword'] });

type FormVals = z.infer<typeof schema>;

export function SignUp() {
  const [mode, setMode] = useState<'app' | 'web'>('app');
  const [logo, setLogo] = useState<string | null>(null);
  const [logoName, setLogoName] = useState('');
  const navigate = useNavigate();
  const toast = useToasts((s) => s.toast);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormVals>({
    resolver: zodResolver(schema),
  });
  const pw = watch('password') ?? '';

  async function onSubmit(v: FormVals) {
    const [firstName, ...rest] = v.fullName.trim().split(/\s+/);
    try {
      const { emp, company } = await api.signup({
        companyName: v.companyName, logo, firstName: firstName ?? v.fullName,
        lastName: (rest.length ? rest.join(' ') : '-'), email: v.email, phone: v.phone, password: v.password,
      });
      useSession.getState().setSession(emp, company);
      toast('success', 'Account created — check your inbox to verify your email.');
      navigate('/signup/verify-email', { replace: true });
    } catch (e) {
      toast('error', (e as Error).message || 'Sign up failed.');
    }
  }

  function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setLogo(String(reader.result)); setLogoName(file.name); };
    reader.readAsDataURL(file);
  }

  return (
    <AuthLayout title="Create your company" subtitle="First Admin / company registration. Employees are added by HR — not self-service.">
      <Segmented
        options={[
          { value: 'app', label: 'App Login' },
          { value: 'web', label: 'Web Login' },
        ]}
        value={mode}
        onChange={setMode}
        className="mb-5 w-full"
        ariaLabel="Sign-up method"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div className="flex items-end gap-3">
          <Field label="Company Name" required error={errors.companyName?.message} className="flex-1">
            <Input {...register('companyName')} placeholder="Acme Corp" invalid={!!errors.companyName} />
          </Field>
          <div>
            <span className="crew-label" style={{ display: 'block', marginBottom: 6 }}>Logo</span>
            <label className="flex h-10 cursor-pointer flex-col items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[#cfd3da] px-3 transition hover:border-accent crew-focusable">
              <input type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-muted">
                <Upload size={13} /> {logoName ? 'Change' : 'Upload'}
              </span>
            </label>
          </div>
        </div>
        {logo && (
          <div className="flex items-center gap-2">
            <img src={logo} alt="Company logo preview" className="h-9 w-9 rounded-[var(--radius-md)] object-cover" />
            <span className="text-xs text-muted">{logoName}</span>
          </div>
        )}

        <Field label="Name" required error={errors.fullName?.message}>
          <Input {...register('fullName')} placeholder="Full name" autoComplete="name" invalid={!!errors.fullName} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Email" required error={errors.email?.message}>
            <Input {...register('email')} type="email" placeholder="you@company.com" invalid={!!errors.email} />
          </Field>
          <Field label="Phone" required error={errors.phone?.message}>
            <Input {...register('phone')} placeholder="+91 …" invalid={!!errors.phone} />
          </Field>
        </div>

        <Field label="Password" required error={errors.password?.message}>
          <PasswordInput {...register('password')} placeholder="Set a strong password" invalid={!!errors.password} />
        </Field>
        <PasswordStrength value={pw} />

        <Field label="Confirm Password" required error={errors.confirmPassword?.message}>
          <PasswordInput {...register('confirmPassword')} placeholder="Repeat password" invalid={!!errors.confirmPassword} />
        </Field>

        <GlowButton
          type="submit"
          block
          disabled={isSubmitting}
          label="Sign Up"
          secondaryLabel="Creating…"
          icon={<UserPlus size={18} />}
        />
        <p className="text-center text-[13px] text-muted">
          Already have an account? <Link to="/signin" className="font-medium text-accent hover:underline">Sign In</Link>
        </p>
      </form>
    </AuthLayout>
  );
}