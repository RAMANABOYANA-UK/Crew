import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck, RefreshCw } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Button } from '@/components/ui/Button';
import { useToasts } from '@/lib/store';

/** §4.2 — post-signup "check your inbox" confirmation state. */
export function VerifyEmail() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const toast = useToasts((s) => s.toast);

  function resend() {
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
      toast('info', 'Verification email re-sent to your inbox.');
    }, 800);
  }

  return (
    <AuthLayout title="Check your inbox" subtitle="We emailed you a verification link.">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full text-cloud" style={{ background: 'var(--color-success)' }}>
          <MailCheck size={26} />
        </div>
        <p className="max-w-[300px] text-sm text-muted">
          Click the link in the email we just sent to activate your account. You can close this window in the meantime.
        </p>
        {sent && (
          <p className="rounded-[var(--radius-md)] bg-[var(--color-success-soft)] px-3 py-2 text-[13px] font-medium text-success">
            ✓ Email re-sent — check your inbox (and spam).
          </p>
        )}
        <div className="flex w-full flex-col gap-2">
          <Button variant="secondary" block loading={sending} onClick={resend}>
            <RefreshCw size={15} /> Resend email
          </Button>
          <Link to="/signin" className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-md)] text-sm font-semibold text-accent transition hover:bg-[var(--color-accent-soft)] crew-focusable">
            Back to Sign In
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}