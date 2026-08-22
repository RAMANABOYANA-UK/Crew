import { queryGet, queryAll } from '../database/init.js';

export function computeSalaryComponents(config) {
    const {
        month_wage = 0,
        basic_salary_type,
        basic_salary_value = 0,
        standard_allowance_type,
        standard_allowance_value = 0,
        performance_bonus_type,
        performance_bonus_value = 0,
        lta_type,
        lta_value = 0,
        fixed_allowance_type,
        fixed_allowance_value = 0,
        hra_type,
        hra_value = 0,
        pf_employer_pct = 0,
        pf_employee_pct = 0,
        professional_tax = 0
    } = config;

    const calcAmount = (type, value, base) => {
        if (type === 'percentage') return (value / 100) * base;
        return value;
    };

    const basic_salary_amount = calcAmount(basic_salary_type, basic_salary_value, month_wage);
    const standard_allowance_amount = calcAmount(standard_allowance_type, standard_allowance_value, month_wage);
    const performance_bonus_amount = calcAmount(performance_bonus_type, performance_bonus_value, month_wage);
    const lta_amount = calcAmount(lta_type, lta_value, month_wage);
    const fixed_allowance_amount = calcAmount(fixed_allowance_type, fixed_allowance_value, month_wage);
    const hra_amount = calcAmount(hra_type, hra_value, basic_salary_amount);

    const pf_employer_amount = (pf_employer_pct / 100) * basic_salary_amount;
    const pf_employee_amount = (pf_employee_pct / 100) * basic_salary_amount;

    const total_earnings = basic_salary_amount + standard_allowance_amount + 
                           performance_bonus_amount + lta_amount + 
                           hra_amount + fixed_allowance_amount;

    const total_deductions = pf_employee_amount + professional_tax;
    const net_salary = total_earnings - total_deductions;

    return {
        basic_salary_amount,
        standard_allowance_amount,
        performance_bonus_amount,
        lta_amount,
        fixed_allowance_amount,
        hra_amount,
        pf_employer_amount,
        pf_employee_amount,
        total_earnings,
        total_deductions,
        professional_tax,
        net_salary
    };
}

export function validateSalaryConfig(config) {
    const computed = computeSalaryComponents(config);
    const errors = [];
    const wage = parseFloat(config.month_wage) || 0;

    // The sum of all earnings components must not exceed the defined wage
    if (computed.total_earnings > wage) {
        errors.push(
            `Total earnings (${computed.total_earnings.toFixed(2)}) exceed the monthly wage (${wage.toFixed(2)}). Reduce the component amounts or increase the wage.`
        );
    }

    return { valid: errors.length === 0, errors };
}

export function computePayableDays(userId, month, year) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    const records = queryAll(`
        SELECT status, count(*) as count 
        FROM attendance 
        WHERE user_id = ? AND date >= ? AND date <= ?
        GROUP BY status
    `, [userId, startDate, endDate]);

    let payableDays = 0;
    records.forEach(r => {
        if (r.status === 'present') payableDays += r.count;
        if (r.status === 'half-day') payableDays += (r.count * 0.5);
    });

    return payableDays;
}

export function computeMonthlyPayroll(userId, month, year) {
    const config = queryGet('SELECT * FROM salary_config WHERE user_id = ?', [userId]);

    if (!config) {
        throw new Error('Salary configuration not found for user');
    }

    const payableDays = computePayableDays(userId, month, year);
    const assumedWorkingDays = 22; 
    const prorateRatio = Math.min(payableDays / assumedWorkingDays, 1);

    const components = computeSalaryComponents(config);
    
    return {
        payableDays,
        assumedWorkingDays,
        prorated_net_salary: components.net_salary * prorateRatio,
        base_net_salary: components.net_salary,
        components
    };
}
