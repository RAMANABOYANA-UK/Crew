import express from 'express';
import { queryGet, queryRun } from '../database/init.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validateSalaryConfig } from '../utils/payrollEngine.js';

const router = express.Router();

function computeSalary(config) {
    const wage = parseFloat(config.month_wage) || 0;
    
    const compute = (type, value, base) => {
        const v = parseFloat(value) || 0;
        return type === 'percentage' ? (base * v / 100) : v;
    };

    const basic = compute(config.basic_salary_type, config.basic_salary_value, wage);
    const hra = compute(config.hra_type, config.hra_value, basic); // HRA is % of basic, not wage
    const stdAllow = compute(config.standard_allowance_type, config.standard_allowance_value, wage);
    const perfBonus = compute(config.performance_bonus_type, config.performance_bonus_value, wage);
    const lta = compute(config.lta_type, config.lta_value, wage);
    const fixedAllow = parseFloat(config.fixed_allowance_value) || 0;

    const pfEmployee = basic * (parseFloat(config.pf_employee_pct) || 0) / 100;
    const pfEmployer = basic * (parseFloat(config.pf_employer_pct) || 0) / 100;
    const profTax = parseFloat(config.professional_tax) || 0;

    const totalEarnings = basic + hra + stdAllow + perfBonus + lta + fixedAllow;
    const totalDeductions = pfEmployee + profTax;
    const netSalary = totalEarnings - totalDeductions;

    return {
        basic, hra, stdAllow, perfBonus, lta, fixedAllow,
        pfEmployee, pfEmployer, profTax,
        totalEarnings, totalDeductions, netSalary
    };
}

// GET /:userId — get salary config + computed
router.get('/:userId', requireAuth, (req, res) => {
    try {
        const userId = req.params.userId;
        if (req.user.role !== 'admin' && req.user.id != userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const config = queryGet('SELECT * FROM salary_config WHERE user_id = ?', [userId]);
        if (!config) return res.status(404).json({ error: 'Salary config not found' });

        const computed = computeSalary(config);
        res.json({ config, salary: config, computed });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /:userId — admin updates salary config
router.put('/:userId', requireAdmin, (req, res) => {
    try {
        const userId = req.params.userId;
        const fields = req.body;

        // Build dynamic update
        const allowedFields = [
            'month_wage', 'yearly_wage', 'working_days_per_week', 'break_hours_per_day',
            'basic_salary_type', 'basic_salary_value', 'standard_allowance_type', 'standard_allowance_value',
            'performance_bonus_type', 'performance_bonus_value', 'lta_type', 'lta_value',
            'fixed_allowance_type', 'fixed_allowance_value', 'hra_type', 'hra_value',
            'pf_employer_pct', 'pf_employee_pct', 'pf_rate', 'professional_tax'
        ];

        const updates = [];
        const params = [];
        for (const [key, val] of Object.entries(fields)) {
            if (allowedFields.includes(key) && val !== undefined) {
                updates.push(`${key} = ?`);
                params.push(val);
            }
        }

        if (updates.length > 0) {
            params.push(userId);
            queryRun(`UPDATE salary_config SET ${updates.join(', ')} WHERE user_id = ?`, params);
        }

        const config = queryGet('SELECT * FROM salary_config WHERE user_id = ?', [userId]);

        // Validate: sum of earnings components must not exceed the wage
        const validation = validateSalaryConfig(config);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.errors.join(' ') });
        }

        const computed = computeSalary(config);

        res.json({ config, salary: config, computed });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET /:userId/payroll/:month/:year
router.get('/:userId/payroll/:month/:year', requireAuth, (req, res) => {
    try {
        const { userId, month, year } = req.params;
        if (req.user.role !== 'admin' && req.user.id != userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const config = queryGet('SELECT * FROM salary_config WHERE user_id = ?', [userId]);
        if (!config) return res.status(404).json({ error: 'Salary config not found' });

        const computed = computeSalary(config);

        // Calculate payable days from attendance
        const monthStr = String(month).padStart(2, '0');
        const datePrefix = `${year}-${monthStr}`;
        const daysInMonth = new Date(year, month, 0).getDate();
        const workingDaysPerWeek = config.working_days_per_week || 5;

        let totalWorkingDays = 0;
        for (let d = 1; d <= daysInMonth; d++) {
            const day = new Date(year, month - 1, d).getDay();
            if (day !== 0 && day !== 6) totalWorkingDays++;
        }

        // Count present + half-day days
        const presentDays = queryGet(`
            SELECT 
                COUNT(CASE WHEN status = 'present' THEN 1 END) as full_days,
                COUNT(CASE WHEN status = 'half-day' THEN 1 END) as half_days
            FROM attendance 
            WHERE user_id = ? AND date LIKE ?
        `, [userId, `${datePrefix}%`]);

        const payableDays = (presentDays?.full_days || 0) + (presentDays?.half_days || 0) * 0.5;
        const proRatedSalary = totalWorkingDays > 0 ? (computed.netSalary * payableDays / totalWorkingDays) : 0;

        res.json({
            config, computed,
            payroll: {
                month: parseInt(month), year: parseInt(year),
                total_working_days: totalWorkingDays,
                payable_days: payableDays,
                gross_salary: computed.totalEarnings,
                total_deductions: computed.totalDeductions,
                net_salary: computed.netSalary,
                pro_rated_salary: Math.round(proRatedSalary * 100) / 100
            }
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
