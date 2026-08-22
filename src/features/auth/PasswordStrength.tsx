export function passwordScore(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: 'Too weak', color: 'var(--color-danger)' },
    { label: 'Weak', color: 'var(--color-warning)' },
    { label: 'Fair', color: 'var(--color-warning)' },
    { label: 'Good', color: 'var(--color-info)' },
    { label: 'Strong', color: 'var(--color-success)' },
  ];
  return { score: score as 0 | 1 | 2 | 3 | 4, ...map[score] };
}

const RULES = [
  { test: (p: string) => p.length >= 8, label: '8+ characters' },
  { test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p), label: 'Uppercase & lowercase' },
  { test: (p: string) => /\d/.test(p), label: 'A number' },
  { test: (p: string) => /[^A-Za-z0-9]/.test(p), label: 'A symbol' },
];

export function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;
  const { score, label, color } = passwordScore(value);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="h-1 flex-1 rounded-full transition-colors" style={{ background: i < score ? color : 'var(--color-line)' }} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color }}>{label}</span>
        <span className="max-w-[220px] text-right text-[11px] text-faint">Requires: {RULES.filter((r) => !r.test(value)).map((r) => r.label).join(' · ') || 'all met ✓'}</span>
      </div>
    </div>
  );
}