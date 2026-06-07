import { dataStore } from '../store/DataStore';
import { taxCalculator } from './TaxCalculator';
import { createModuleLogger } from '../utils/logger';
import {
  DeductionChangeRequest,
  SpecialDeduction,
} from '../types';

const logger = createModuleLogger('EmployeeSelfService');

export class EmployeeSelfService {
  submitSpecialDeductionChange(
    employeeId: string,
    changes: Partial<SpecialDeduction>
  ): {
    success: boolean;
    request?: DeductionChangeRequest;
    errors: string[];
  } {
    logger.info(`Employee ${employeeId} submitting special deduction change`);

    const employee = dataStore.getEmployee(employeeId);
    if (!employee) {
      return { success: false, errors: ['员工不存在'] };
    }

    const { valid, errors, validated } = taxCalculator.validateSpecialDeduction(changes);

    const request: DeductionChangeRequest = {
      id: dataStore.generateId(),
      employeeId,
      requestType: 'special_deduction',
      changes: validated,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      validationErrors: errors,
    };

    dataStore.saveDeductionRequest(request);

    dataStore.addAuditLog({
      userId: employeeId,
      userName: employee.name,
      action: 'submit_deduction_change',
      module: 'employee_self_service',
      resourceId: request.id,
      details: {
        employeeId,
        changes,
        validationErrors: errors,
      },
    });

    if (!valid) {
      logger.warn(`Deduction change for employee ${employeeId} has validation errors: ${errors.join(', ')}`);
    }

    return {
      success: valid,
      request,
      errors,
    };
  }

  submitHousingFundChange(
    employeeId: string,
    newBase: number,
    newRatio: number
  ): {
    success: boolean;
    request?: DeductionChangeRequest;
    errors: string[];
  } {
    logger.info(`Employee ${employeeId} submitting housing fund change`);

    const employee = dataStore.getEmployee(employeeId);
    if (!employee) {
      return { success: false, errors: ['员工不存在'] };
    }

    const errors: string[] = [];
    const policy = taxCalculator.getCityPolicy(employee.housingFundCity);
    const hf = policy.housingFund;

    if (newBase < hf.baseMin || newBase > hf.baseMax) {
      errors.push(`公积金基数需在 ${hf.baseMin} - ${hf.baseMax} 之间`);
    }

    if (newRatio < hf.minRatio || newRatio > hf.maxRatio) {
      errors.push(`公积金比例需在 ${(hf.minRatio * 100).toFixed(0)}% - ${(hf.maxRatio * 100).toFixed(0)}% 之间`);
    }

    const request: DeductionChangeRequest = {
      id: dataStore.generateId(),
      employeeId,
      requestType: 'housing_fund',
      changes: { housingFundBase: newBase, housingFundRatio: newRatio },
      status: 'pending',
      submittedAt: new Date().toISOString(),
      validationErrors: errors,
    };

    dataStore.saveDeductionRequest(request);

    dataStore.addAuditLog({
      userId: employeeId,
      userName: employee.name,
      action: 'submit_housing_fund_change',
      module: 'employee_self_service',
      resourceId: request.id,
      details: {
        employeeId,
        newBase,
        newRatio,
        validationErrors: errors,
      },
    });

    return {
      success: errors.length === 0,
      request,
      errors,
    };
  }

  reviewDeductionRequest(
    requestId: string,
    reviewerId: string,
    reviewerName: string,
    approved: boolean,
    reviewComment?: string
  ): { success: boolean; message: string } {
    logger.info(`Reviewing deduction request ${requestId} by ${reviewerName}`);

    const request = dataStore.getDeductionRequest(requestId);
    if (!request) {
      return { success: false, message: '申请记录不存在' };
    }

    if (request.status !== 'pending') {
      return { success: false, message: '该申请已处理' };
    }

    if (approved && request.validationErrors.length > 0) {
      return {
        success: false,
        message: `存在校验错误: ${request.validationErrors.join(', ')}`,
      };
    }

    request.status = approved ? 'approved' : 'rejected';
    request.reviewedBy = reviewerId;
    request.reviewedAt = new Date().toISOString();

    dataStore.saveDeductionRequest(request);

    if (approved) {
      const employee = dataStore.getEmployee(request.employeeId);
      if (employee) {
        if (request.requestType === 'housing_fund') {
          const changes = request.changes as { housingFundBase: number; housingFundRatio: number };
          employee.housingFundBase = changes.housingFundBase;
          employee.housingFundRatio = changes.housingFundRatio;
          employee.updatedAt = new Date().toISOString();
          dataStore.saveEmployee(employee);
        }
      }
    }

    dataStore.addAuditLog({
      userId: reviewerId,
      userName: reviewerName,
      action: approved ? 'approve_deduction_request' : 'reject_deduction_request',
      module: 'employee_self_service',
      resourceId: requestId,
      details: {
        requestId,
        approved,
        comment: reviewComment,
      },
    });

    return {
      success: true,
      message: approved ? '已通过' : '已驳回',
    };
  }

  getEmployeeRequests(employeeId: string): DeductionChangeRequest[] {
    return dataStore.getDeductionRequestsByEmployee(employeeId);
  }

  getPendingRequests(): DeductionChangeRequest[] {
    return dataStore.getPendingDeductionRequests();
  }

  getPayrollHistory(
    employeeId: string,
    startYear?: number,
    startMonth?: number,
    endYear?: number,
    endMonth?: number
  ) {
    const allRecords = dataStore.getPayrollByEmployee(employeeId);
    let records = allRecords;

    if (startYear && startMonth) {
      const startKey = startYear * 100 + startMonth;
      records = records.filter((r) => r.year * 100 + r.month >= startKey);
    }
    if (endYear && endMonth) {
      const endKey = endYear * 100 + endMonth;
      records = records.filter((r) => r.year * 100 + r.month <= endKey);
    }

    return records;
  }
}

export const employeeSelfService = new EmployeeSelfService();
