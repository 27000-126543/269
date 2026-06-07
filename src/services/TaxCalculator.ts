import { Employee, SpecialDeduction, DeductionItem, YearEndBonus } from '../types';
import {
  CITY_POLICIES,
  DEFAULT_CITY,
  TAX_THRESHOLD,
  ANNUAL_TAX_BRACKETS,
  YEAR_END_BONUS_TAX_BRACKETS,
  SPECIAL_DEDUCTION_LIMITS,
} from '../config/policies';
import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('TaxCalculator');

export class TaxCalculator {
  getCityPolicy(city: string) {
    return CITY_POLICIES[city.toLowerCase()] || CITY_POLICIES[DEFAULT_CITY];
  }

  clampBase(base: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, base));
  }

  calculateSocialSecurity(
    employee: Employee
  ): {
    employeePortion: number;
    employerPortion: number;
    items: DeductionItem[];
    breakdown: {
      pension: { employee: number; employer: number };
      medical: { employee: number; employer: number };
      unemployment: { employee: number; employer: number };
      workInjury: { employee: number; employer: number };
      maternity: { employee: number; employer: number };
    };
  } {
    const policy = this.getCityPolicy(employee.socialSecurityCity);
    const ss = policy.socialSecurity;
    const base = this.clampBase(
      employee.socialSecurityBase,
      ss.baseMin,
      ss.baseMax
    );

    const breakdown = {
      pension: {
        employee: Math.round(base * ss.pension.employee * 100) / 100,
        employer: Math.round(base * ss.pension.employer * 100) / 100,
      },
      medical: {
        employee: Math.round(base * ss.medical.employee * 100) / 100,
        employer: Math.round(base * ss.medical.employer * 100) / 100,
      },
      unemployment: {
        employee: Math.round(base * ss.unemployment.employee * 100) / 100,
        employer: Math.round(base * ss.unemployment.employer * 100) / 100,
      },
      workInjury: {
        employee: Math.round(base * ss.workInjury.employee * 100) / 100,
        employer: Math.round(base * ss.workInjury.employer * 100) / 100,
      },
      maternity: {
        employee: Math.round(base * ss.maternity.employee * 100) / 100,
        employer: Math.round(base * ss.maternity.employer * 100) / 100,
      },
    };

    const employeePortion =
      breakdown.pension.employee +
      breakdown.medical.employee +
      breakdown.unemployment.employee +
      breakdown.workInjury.employee +
      breakdown.maternity.employee;

    const employerPortion =
      breakdown.pension.employer +
      breakdown.medical.employer +
      breakdown.unemployment.employer +
      breakdown.workInjury.employer +
      breakdown.maternity.employer;

    const items: DeductionItem[] = [
      {
        id: `ss_pension_${Date.now()}`,
        name: '养老保险',
        type: 'social_security',
        amount: breakdown.pension.employee,
        description: `个人缴纳部分，基数: ${base}`,
      },
      {
        id: `ss_medical_${Date.now()}`,
        name: '医疗保险',
        type: 'social_security',
        amount: breakdown.medical.employee,
        description: `个人缴纳部分，基数: ${base}`,
      },
      {
        id: `ss_unemployment_${Date.now()}`,
        name: '失业保险',
        type: 'social_security',
        amount: breakdown.unemployment.employee,
        description: `个人缴纳部分，基数: ${base}`,
      },
    ];

    return {
      employeePortion: Math.round(employeePortion * 100) / 100,
      employerPortion: Math.round(employerPortion * 100) / 100,
      items,
      breakdown,
    };
  }

  calculateHousingFund(
    employee: Employee
  ): {
    employeePortion: number;
    employerPortion: number;
    items: DeductionItem[];
  } {
    const policy = this.getCityPolicy(employee.housingFundCity);
    const hf = policy.housingFund;
    const base = this.clampBase(
      employee.housingFundBase,
      hf.baseMin,
      hf.baseMax
    );
    const ratio = Math.max(hf.minRatio, Math.min(hf.maxRatio, employee.housingFundRatio));

    const employeePortion = Math.round(base * ratio * 100) / 100;
    const employerPortion = Math.round(base * ratio * 100) / 100;

    const items: DeductionItem[] = [
      {
        id: `hf_${Date.now()}`,
        name: '住房公积金',
        type: 'housing_fund',
        amount: employeePortion,
        description: `个人缴纳部分，基数: ${base}, 比例: ${(ratio * 100).toFixed(1)}%`,
      },
    ];

    return {
      employeePortion,
      employerPortion,
      items,
    };
  }

  validateSpecialDeduction(deduction: Partial<SpecialDeduction>): { valid: boolean; errors: string[]; validated: SpecialDeduction } {
    const errors: string[] = [];
    const validated: SpecialDeduction = {
      childEducation: 0,
      continuingEducation: 0,
      housingLoanInterest: 0,
      housingRent: 0,
      elderlySupport: 0,
      infantCare: 0,
      total: 0,
    };

    if (deduction.childEducation !== undefined) {
      if (deduction.childEducation < 0) {
        errors.push('子女教育扣除不能为负数');
      } else if (deduction.childEducation > SPECIAL_DEDUCTION_LIMITS.childEducation) {
        errors.push(`子女教育扣除不能超过${SPECIAL_DEDUCTION_LIMITS.childEducation}元/月`);
        validated.childEducation = SPECIAL_DEDUCTION_LIMITS.childEducation;
      } else {
        validated.childEducation = deduction.childEducation;
      }
    }

    if (deduction.continuingEducation !== undefined) {
      if (deduction.continuingEducation < 0) {
        errors.push('继续教育扣除不能为负数');
      } else if (deduction.continuingEducation > SPECIAL_DEDUCTION_LIMITS.continuingEducation) {
        errors.push(`继续教育扣除不能超过${SPECIAL_DEDUCTION_LIMITS.continuingEducation}元/月`);
        validated.continuingEducation = SPECIAL_DEDUCTION_LIMITS.continuingEducation;
      } else {
        validated.continuingEducation = deduction.continuingEducation;
      }
    }

    if (deduction.housingLoanInterest !== undefined) {
      if (deduction.housingLoanInterest < 0) {
        errors.push('住房贷款利息扣除不能为负数');
      } else if (deduction.housingLoanInterest > SPECIAL_DEDUCTION_LIMITS.housingLoanInterest) {
        errors.push(`住房贷款利息扣除不能超过${SPECIAL_DEDUCTION_LIMITS.housingLoanInterest}元/月`);
        validated.housingLoanInterest = SPECIAL_DEDUCTION_LIMITS.housingLoanInterest;
      } else {
        validated.housingLoanInterest = deduction.housingLoanInterest;
      }
    }

    if (deduction.housingRent !== undefined) {
      if (deduction.housingRent < 0) {
        errors.push('住房租金扣除不能为负数');
      } else if (deduction.housingRent > SPECIAL_DEDUCTION_LIMITS.housingRent.tier1) {
        errors.push(`住房租金扣除不能超过${SPECIAL_DEDUCTION_LIMITS.housingRent.tier1}元/月`);
        validated.housingRent = SPECIAL_DEDUCTION_LIMITS.housingRent.tier1;
      } else {
        validated.housingRent = deduction.housingRent;
      }
    }

    if (deduction.elderlySupport !== undefined) {
      if (deduction.elderlySupport < 0) {
        errors.push('赡养老人扣除不能为负数');
      } else if (deduction.elderlySupport > SPECIAL_DEDUCTION_LIMITS.elderlySupport) {
        errors.push(`赡养老人扣除不能超过${SPECIAL_DEDUCTION_LIMITS.elderlySupport}元/月`);
        validated.elderlySupport = SPECIAL_DEDUCTION_LIMITS.elderlySupport;
      } else {
        validated.elderlySupport = deduction.elderlySupport;
      }
    }

    if (deduction.infantCare !== undefined) {
      if (deduction.infantCare < 0) {
        errors.push('3岁以下婴幼儿照护扣除不能为负数');
      } else if (deduction.infantCare > SPECIAL_DEDUCTION_LIMITS.infantCare) {
        errors.push(`3岁以下婴幼儿照护扣除不能超过${SPECIAL_DEDUCTION_LIMITS.infantCare}元/月`);
        validated.infantCare = SPECIAL_DEDUCTION_LIMITS.infantCare;
      } else {
        validated.infantCare = deduction.infantCare;
      }
    }

    if (deduction.housingLoanInterest && deduction.housingLoanInterest > 0 && deduction.housingRent && deduction.housingRent > 0) {
      errors.push('住房贷款利息和住房租金不能同时扣除');
    }

    validated.total =
      validated.childEducation +
      validated.continuingEducation +
      validated.housingLoanInterest +
      validated.housingRent +
      validated.elderlySupport +
      validated.infantCare;

    return { valid: errors.length === 0, errors, validated };
  }

  calculateTaxableIncome(
    grossSalary: number,
    socialSecurityEmployee: number,
    housingFundEmployee: number,
    specialDeductions: SpecialDeduction
  ): number {
    const taxableIncome =
      grossSalary -
      socialSecurityEmployee -
      housingFundEmployee -
      TAX_THRESHOLD -
      specialDeductions.total;

    return Math.max(0, Math.round(taxableIncome * 100) / 100);
  }

  calculateMonthlyTax(
    cumulativeTaxableIncome: number,
    cumulativeTaxPaid: number
  ): { monthlyTax: number; annualTax: number } {
    let annualTax = 0;

    for (const bracket of ANNUAL_TAX_BRACKETS) {
      if (cumulativeTaxableIncome > bracket.min) {
        const taxableInBracket = Math.min(cumulativeTaxableIncome, bracket.max) - bracket.min;
        annualTax += taxableInBracket * bracket.rate;
      } else {
        break;
      }
    }

    annualTax = Math.round(annualTax * 100) / 100;
    const monthlyTax = Math.max(0, Math.round((annualTax - cumulativeTaxPaid) * 100) / 100);

    return { monthlyTax, annualTax };
  }

  calculateYearEndBonusTax(
    bonusAmount: number,
    separateTaxation: boolean = true,
    monthlySalaryForTax: number = 0
  ): YearEndBonus {
    if (separateTaxation) {
      const monthlyEquivalent = bonusAmount / 12;
      let taxRate = 0;
      let quickDeduction = 0;

      for (const bracket of YEAR_END_BONUS_TAX_BRACKETS) {
        if (monthlyEquivalent > bracket.min) {
          taxRate = bracket.rate;
          quickDeduction = bracket.deduction;
        } else {
          break;
        }
      }

      const tax = Math.round((bonusAmount * taxRate - quickDeduction) * 100) / 100;

      return {
        amount: bonusAmount,
        taxableAmount: bonusAmount,
        tax: Math.max(0, tax),
        separateTaxation: true,
      };
    } else {
      return {
        amount: bonusAmount,
        taxableAmount: bonusAmount,
        tax: 0,
        separateTaxation: false,
      };
    }
  }

  calculateAllDeductions(
    employee: Employee,
    grossSalary: number,
    specialDeductions: SpecialDeduction,
    cumulativeTaxableIncome: number = 0,
    cumulativeTaxPaid: number = 0,
    yearEndBonus?: YearEndBonus
  ): {
    socialSecurityItems: DeductionItem[];
    housingFundItems: DeductionItem[];
    taxItem: DeductionItem;
    allDeductions: DeductionItem[];
    socialSecurityEmployee: number;
    socialSecurityEmployer: number;
    housingFundEmployee: number;
    housingFundEmployer: number;
    taxableIncome: number;
    taxWithheld: number;
    totalEmployeeDeductions: number;
  } {
    logger.info(`Calculating all deductions for employee ${employee.id}`);

    const ssResult = this.calculateSocialSecurity(employee);
    const hfResult = this.calculateHousingFund(employee);

    const taxableIncome = this.calculateTaxableIncome(
      grossSalary,
      ssResult.employeePortion,
      hfResult.employeePortion,
      specialDeductions
    );

    const totalCumulativeTaxable = cumulativeTaxableIncome + taxableIncome;
    const { monthlyTax } = this.calculateMonthlyTax(totalCumulativeTaxable, cumulativeTaxPaid);

    let totalTax = monthlyTax;
    if (yearEndBonus && yearEndBonus.separateTaxation) {
      totalTax += yearEndBonus.tax;
    }

    const taxItem: DeductionItem = {
      id: `tax_${Date.now()}`,
      name: '个人所得税',
      type: 'tax',
      amount: Math.round(totalTax * 100) / 100,
      description: `应纳税所得额: ${taxableIncome}, 累计: ${totalCumulativeTaxable}`,
    };

    const allDeductions = [...ssResult.items, ...hfResult.items, taxItem];
    const totalEmployeeDeductions =
      ssResult.employeePortion + hfResult.employeePortion + totalTax;

    logger.info(`Deductions calculated for employee ${employee.id}: total ${totalEmployeeDeductions.toFixed(2)}`);

    return {
      socialSecurityItems: ssResult.items,
      housingFundItems: hfResult.items,
      taxItem,
      allDeductions,
      socialSecurityEmployee: ssResult.employeePortion,
      socialSecurityEmployer: ssResult.employerPortion,
      housingFundEmployee: hfResult.employeePortion,
      housingFundEmployer: hfResult.employerPortion,
      taxableIncome,
      taxWithheld: Math.round(totalTax * 100) / 100,
      totalEmployeeDeductions: Math.round(totalEmployeeDeductions * 100) / 100,
    };
  }
}

export const taxCalculator = new TaxCalculator();
