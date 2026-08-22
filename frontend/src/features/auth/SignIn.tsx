import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { LogIn, ShieldCheck } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Segmented } from '@/components/ui/Tabs';
import { Field, Input, PasswordInput } from '@/components/ui/Inputs';
import { GlowButton } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { useSession, useToasts } from '@/lib/store';

const schema = z.object({
  identifier: z.string().min(3, 'Enter your Login ID or email.'),
  password: z.string().min(1, 'Password is required.'),
});
type FormVals = z.infer<typeof schema>;

export function SignIn() {
  const [mode, setMode] = useState<'app' | 'web'>('app');
  const [apiError, setApiError] = useState('');
  const navigate = useNavigate();
  const toast = useToasts((s) => s.toast);
  const setSession = useSession((s) => s.setSession);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormVals>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(v: FormVals) {
    setApiError('');
    try {
      const emp = await api.login(v.identifier, v.password);
      const company = await api.getCompany();
      setSession(emp, company);
      toast('success', `Welcome back, ${emp.firstName}!`);
      navigate('/', { replace: true });
    } catch (e) {
      setApiError((e as Error).message || 'Sign in failed.');
    }
  }

  return (
    <AuthLayout title="Sign In">
      <Segmented
        options={[
          { value: 'app', label: 'App Login' },
          { value: 'web', label: 'Web Login' },
        ]}
        value={mode}
        onChange={setMode}
        className="mb-5 w-full"
        ariaLabel="Login method"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {apiError && (
          <div className="rounded-[var(--radius-md)] border border-[#f3c3c5] bg-[var(--color-danger-soft)] px-3 py-2.5 text-[13px] font-medium text-danger" role="alert">
            {apiError}
          </div>
        )}
        <Field label={mode === 'app' ? 'Login ID' : 'Email'} required error={errors.identifier?.message}>
          <Input {...register('identifier')} placeholder={mode === 'app' ? 'e.g. 0CLTPRSH20240003' : 'you@company.com'} autoComplete="username" invalid={!!errors.identifier} />
        </Field>
        <Field label="Password" required error={errors.password?.message}>
          <PasswordInput {...register('password')} placeholder="••••••••" autoComplete="current-password" invalid={!!errors.password} />
        </Field>
        <div className="flex items-center justify-between">
          <span className="cursor-pointer text-[13px] font-medium text-accent hover:underline">Forgot password?</span>
          <Link to="/signup" className="text-[13px] font-medium text-muted hover:text-ink">
            Don’t have an account? <span className="text-accent">Sign Up</span>
          </Link>
        </div>
        <GlowButton
          type="submit"
          block
          disabled={isSubmitting}
          label="Sign In"
          secondaryLabel="Welcome!"
          icon={<LogIn size={18} />}
        />
      </form>

      <div className="mt-5 border-t border-line pt-4">
        <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted">
          <ShieldCheck size={14} /> Demo accounts
        </p>
        <div className="flex flex-col gap-1.5 text-[12.5px]">
          <p><span className="font-semibold">Admin/HR</span> · aarav@crewline.com</p>
          <p><span className="font-semibold">Employee</span> · priya@company.com</p>
          <p className="text-faint">Password for both: <code className="crew-mono">Crew@1234</code></p>
        </div>
      </div>
    </AuthLayout>
  );
}