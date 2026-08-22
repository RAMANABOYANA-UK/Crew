import { queryGet } from '../database/init.js';

/**
 * Generate a unique Login ID
 * Format: [2-char company prefix] + [2-char first name] + [2-char last name] + [4-digit year] + [4-digit serial]
 * Example: Company "Odea India", employee "John Doe", year 2026, 1st hire → "ODJD20260001"
 */
export function generateLoginId(companyName, firstName, lastName, joiningYear) {
    const companyPrefix = (companyName || 'XX').substring(0, 2).toUpperCase();
    const firstPrefix = (firstName || 'XX').substring(0, 2).toUpperCase();
    const lastPrefix = (lastName || 'XX').substring(0, 2).toUpperCase();
    const yearStr = String(joiningYear);

    // Find the max serial for this company + year
    const pattern = `${companyPrefix}%${yearStr}%`;
    const existing = queryGet(
        `SELECT login_id FROM users WHERE login_id LIKE ? ORDER BY login_id DESC LIMIT 1`,
        [pattern]
    );

    let serial = 1;
    if (existing && existing.login_id) {
        // Extract the last 4 digits as serial
        const lastSerial = parseInt(existing.login_id.slice(-4));
        if (!isNaN(lastSerial)) serial = lastSerial + 1;
    }

    const serialStr = String(serial).padStart(4, '0');
    return `${companyPrefix}${firstPrefix}${lastPrefix}${yearStr}${serialStr}`;
}
