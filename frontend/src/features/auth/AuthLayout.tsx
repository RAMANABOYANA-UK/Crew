import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';

export function AuthLayout({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 flex flex-col items-center gap-1 text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] text-cloud" style={{ background: 'var(--color-accent)' }}>
            <Layers size={22} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Crew</h1>
          <p className="text-[13px] text-muted">Every workday, perfectly aligned.</p>
        </div>
        <div className="crew-card" style={{ padding: '24px' }}>
          <h2 className="mb-1 text-xl font-semibold">{title}</h2>
          {subtitle && <p className="mb-4 text-[13px] text-muted">{subtitle}</p>}
          <div className="mt-4">{children}</div>
        </div>
        <p className="mt-6 text-center text-[13px] text-muted">
          © {new Date().getFullYear()} Crew HRMS · <Link to="/signin" className="font-medium text-accent hover:underline">Help</Link>
        </p>
      </div>
    </div>
  );
}