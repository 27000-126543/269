export interface Department {
  id: string;
  name: string;
  managerId?: string;
  parentDepartmentId?: string;
  budget: number;
  level: number;
}

export interface Employee {
  id: string;
  employeeNo: string;
  name: string;
  gender: 'male' | 'female';
  idCard: string;
  phone: string;
  email: string;
  departmentId: string;
  position: string;
  hireDate: string;
  baseSalary: number;
  bankAccount: string;
  bankName: string;
  socialSecurityCity: string;
  housingFundCity: string;
  socialSecurityBase: number;
  housingFundBase: number;
  housingFundRatio: number;
  isTaxResident: boolean;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  year: number;
  month: number;
  workDays: number;
  standardWorkDays: number;
  overtimeHours: {
    weekday: number;
    weekend: number;
    holiday: number;
  };
  leaveDays: {
    personal: number;
    sick: number;
    annual: number;
    maternity: number;
    other: number;
  };
  lateCount: number;
  earlyLeaveCount: number;
  absentDays: number;
}

export interface PerformanceRecord {
  id: string;
  employeeId: string;
  year: number;
  month: number;
  score: number;
  level: 'S' | 'A' | 'B' | 'C' | 'D';
  bonus: number;
  comments?: string;
}

export interface SalesCommission {
  id: string;
  employeeId: string;
  year: number;
  month: number;
  salesAmount: number;
  commissionRate: number;
  commissionAmount: number;
  orderIds: string[];
}

export interface DeductionItem {
  id: string;
  name: string;
  type: 'social_security' | 'housing_fund' | 'tax' | 'fine' | 'other';
  amount: number;
  description?: string;
}

export interface EarningItem {
  id: string;
  name: string;
  type: 'base_salary' | 'overtime' | 'bonus' | 'commission' | 'allowance' | 'subsidy' | 'other';
  amount: number;
  description?: string;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  year: number;
  month: number;
  earnings: EarningItem[];
  deductions: DeductionItem[];
  grossSalary: number;
  netSalary: number;
  taxableIncome: number;
  taxWithheld: number;
  socialSecurityEmployee: number;
  socialSecurityEmployer: number;
  housingFundEmployee: number;
  housingFundEmployer: number;
  specialDeductions: SpecialDeduction;
  yearEndBonus?: YearEndBonus;
  status: 'draft' | 'calculated' | 'approved' | 'rejected' | 'frozen' | 'paid';
  approvalHistory: ApprovalRecord[];
  warnings: WarningItem[];
  createdAt: string;
  updatedAt: string;
  calculatedAt?: string;
  paidAt?: string;
}

export interface SpecialDeduction {
  childEducation: number;
  continuingEducation: number;
  housingLoanInterest: number;
  housingRent: number;
  elderlySupport: number;
  infantCare: number;
  total: number;
}

export interface YearEndBonus {
  amount: number;
  taxableAmount: number;
  tax: number;
  separateTaxation: boolean;
}

export interface ApprovalRecord {
  id: string;
  approverId: string;
  approverName: string;
  action: 'approve' | 'reject' | 'submit';
  comment?: string;
  level: number;
  createdAt: string;
}

export interface WarningItem {
  id: string;
  type: 'tax_variance' | 'social_security_variance' | 'budget_exceeded' | 'data_inconsistency' | 'other';
  severity: 'low' | 'medium' | 'high';
  message: string;
  data?: Record<string, any>;
}

export interface DepartmentPayrollSummary {
  departmentId: string;
  departmentName: string;
  year: number;
  month: number;
  employeeCount: number;
  totalGross: number;
  totalNet: number;
  totalTax: number;
  totalSocialSecurity: number;
  totalHousingFund: number;
  budget: number;
  budgetUsage: number;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'frozen';
  requiredApprovalLevel: number;
}

export interface BankPaymentRecord {
  id: string;
  batchId: string;
  employeeId: string;
  employeeName: string;
  bankAccount: string;
  bankName: string;
  amount: number;
  status: 'pending' | 'processed' | 'failed';
  processedAt?: string;
  errorMessage?: string;
}

export interface Payslip {
  id: string;
  payrollRecordId: string;
  employeeId: string;
  year: number;
  month: number;
  sendStatus: 'pending' | 'sent' | 'failed';
  emailSent: boolean;
  smsSent: boolean;
  sentAt?: string;
  errorMessage?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
}

export interface CityPolicy {
  city: string;
  socialSecurity: {
    pension: { employee: number; employer: number };
    medical: { employee: number; employer: number };
    unemployment: { employee: number; employer: number };
    workInjury: { employee: number; employer: number };
    maternity: { employee: number; employer: number };
    baseMin: number;
    baseMax: number;
  };
  housingFund: {
    minRatio: number;
    maxRatio: number;
    baseMin: number;
    baseMax: number;
  };
}

export interface TaxBracket {
  min: number;
  max: number;
  rate: number;
  deduction: number;
}

export interface MonthlyTaxBracket {
  min: number;
  max: number;
  rate: number;
  deduction: number;
}

export interface DeductionChangeRequest {
  id: string;
  employeeId: string;
  requestType: 'special_deduction' | 'housing_fund' | 'social_security';
  changes: Partial<SpecialDeduction> | { housingFundBase: number; housingFundRatio: number };
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  validationErrors: string[];
}
