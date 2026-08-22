// =============================================================
// Crew HRMS — Login ID auto-generation  (§4.3)
//
// Format: [Company Code][First 2 letters of first name + first 2
// letters of last name][Year of Joining][Serial Number of Joining]
// Example: 0C303C42020001  → company code = 0C30, name = 3C42
// (first 2 of "3" + "4"? no — first & last name initials pair),
// 2002 = year of joining, 0001 = serial no. for that year.
// =============================================================

export function companyCodeFromName(companyName: string): string {
  const clean = companyName.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (clean.length >= 4) return `0${clean.slice(-4)}`;
  if (clean.length >= 3) return `0${clean.padEnd(3, 'X')}0`;
  return `0C${clean.padEnd(2, 'X')}`;
}

export function nameSegment(firstName: string, lastName: string): string {
  const f = (firstName || 'XX').replace(/[^A-Za-z]/g, '').toUpperCase().padEnd(2, 'X');
  const l = (lastName || 'XX').replace(/[^A-Za-z]/g, '').toUpperCase().padEnd(2, 'X');
  return `${f.slice(0, 2)}${l.slice(0, 2)}`;
}

/**
 * Build a Login ID. `joinYear` is the "year of joining" (4 digits).
 * `serial` is the sequence of joining within that year (1-based).
 */
export function generateLoginId(
  companyName: string,
  firstName: string,
  lastName: string,
  joinYear: number,
  serial: number,
): string {
  const code = companyCodeFromName(companyName);
  const seg = nameSegment(firstName, lastName);
  const year = String(joinYear).padStart(4, '0');
  const seq = String(serial).padStart(4, '0');
  return `${code}${seg}${year}${seq}`;
}

/** System-generated temp password for newly created employees. */
export function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const nums = '23456789';
  const syms = '@#$%&*';
  const r = (s: string, n: number) =>
    Array.from({ length: n }, () => s[Math.floor(Math.random() * s.length)]).join('');
  return `${r(chars, 4)}${r(nums, 3)}${r(syms, 1)}`;
}