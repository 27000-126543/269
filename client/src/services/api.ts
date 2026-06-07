import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface AuthResponse {
  token: string;
  user: UserInfo;
}

export interface UserInfo {
  id: string;
  employeeNo: string;
  name: string;
  role: 'employee' | 'manager' | 'hr' | 'cfo';
  departmentId: string;
  approvalLevel: number;
}

export interface ApiResult<T = any> {
  success?: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

export const authApi = {
  login: (employeeNo: string, password: string) =>
    api.post<any, AuthResponse>('/auth/login', { employeeNo, password }),
};

export interface EmployeeInfo {
  id: string;
  employeeNo: string;
  name: string;
  email: string;
  phone: string;
  departmentId: string;
  departmentName: string;
  position: string;
  baseSalary: number;
  hireDate: string;
  status: string;
}

export const employeeApi = {
  getMe: () => api.get<any, EmployeeInfo>('/employee/me'),
  getDepartments: () => api.get<any, any[]>('/employee/departments/list'),
};

export interface PayrollRecord {
  id: string;
  employeeId: string;
  year: number;
  month: number;
  grossSalary: number;
  netSalary: number;
  taxWithheld: number;
  socialSecurityEmployee: number;
  socialSecurityEmployer: number;
  housingFundEmployee: number;
  housingFundEmployer: number;
  earnings: any[];
  deductions: any[];
  specialDeductions: any;
}

export const payrollApi = {
  getMyPayroll: (year?: number, month?: number) =>
    api.get<any, PayrollRecord[]>('/payroll/my', { params: { year, month } }),
  getDetail: (year: number, month: number) =>
    api.get<any, { payroll: PayrollRecord; employee: EmployeeInfo; departmentName: string }>(
      `/payroll/detail/${year}/${month}`
    ),
};

export interface DepartmentSummary {
  departmentId: string;
  departmentName: string;
  year: number;
  month: number;
  employeeCount: number;
  totalGross: number;
  totalNet: number;
  budget: number;
  budgetUsage: number;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'frozen';
  requiredApprovalLevel: number;
  currentApprovalLevel: number;
  frozen: boolean;
  warning?: any;
  approvalHistory: any[];
}

export const approvalApi = {
  getPending: () => api.get<any, DepartmentSummary[]>('/approval/pending'),
  getHistory: (year?: number, month?: number) =>
    api.get<any, DepartmentSummary[]>('/approval/history', { params: { year, month } }),
  approve: (departmentId: string, year: number, month: number, comment?: string) =>
    api.post<any, ApiResult>(`/approval/approve/${departmentId}/${year}/${month}`, { comment }),
  reject: (departmentId: string, year: number, month: number, reason: string) =>
    api.post<any, ApiResult>(`/approval/reject/${departmentId}/${year}/${month}`, { reason }),
};

export interface PayrollAnalysis {
  year: number;
  month: number;
  totalEmployees: number;
  totalGrossSalary: number;
  totalNetSalary: number;
  totalTax: number;
  totalSocialSecurity: { employee: number; employer: number };
  totalHousingFund: { employee: number; employer: number };
  averageGrossSalary: number;
  averageNetSalary: number;
  medianGrossSalary: number;
  averageCostPerEmployee: number;
  departmentBreakdown: any[];
  taxDistribution: any[];
  yearOverYear?: any;
  monthOverMonth?: any;
}

export const reportApi = {
  getAnalysis: (year: number, month: number) =>
    api.get<any, PayrollAnalysis>(`/report/${year}/${month}`),
  exportPdf: (year: number, month: number) =>
    api.get<any, { filePath: string; fileName: string; downloadUrl: string }>(
      `/report/export/pdf/${year}/${month}`
    ),
  exportExcel: (year: number, month: number) =>
    api.get<any, { filePath: string; fileName: string; downloadUrl: string }>(
      `/report/export/excel/${year}/${month}`
    ),
  generate: (year: number, month: number) =>
    api.post(`/report/generate/${year}/${month}`),
};

export const deductionApi = {
  getCurrent: () => api.get<any, any>('/deduction/current'),
  getMyRequests: () => api.get<any, any[]>('/deduction/my-requests'),
  submitSpecialDeduction: (changes: any) =>
    api.post<any, ApiResult>('/deduction/special-deduction', changes),
};

export default api;
