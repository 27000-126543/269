import { dataStore } from '../store/DataStore';
import { createModuleLogger } from '../utils/logger';
import {
  DepartmentPayrollSummary,
  PayrollRecord,
  ApprovalRecord,
} from '../types';
import { APPROVAL_THRESHOLDS } from '../config/policies';

const logger = createModuleLogger('ApprovalWorkflow');

export type ApprovalLevel = 0 | 1 | 2;

export interface Approver {
  id: string;
  name: string;
  level: ApprovalLevel;
  departmentId?: string;
}

export class ApprovalWorkflow {
  private approvers: Approver[] = [
    { id: 'hr_manager', name: '人力资源经理', level: 0 },
    { id: 'director', name: '总监', level: 1 },
    { id: 'cfo', name: 'CFO', level: 2 },
  ];

  getRequiredApprovalLevel(amount: number): ApprovalLevel {
    if (amount > APPROVAL_THRESHOLDS.LEVEL_2) {
      return 2;
    } else if (amount > APPROVAL_THRESHOLDS.LEVEL_1) {
      return 1;
    }
    return 0;
  }

  getApproversForLevel(level: ApprovalLevel): Approver[] {
    return this.approvers.filter((a) => a.level <= level);
  }

  submitDepartmentForApproval(
    departmentId: string,
    year: number,
    month: number,
    submitterId: string,
    submitterName: string
  ): DepartmentPayrollSummary | null {
    logger.info(`Submitting department ${departmentId} for approval`);

    const summary = dataStore.getDepartmentSummary(departmentId, year, month);
    if (!summary) {
      logger.error(`Department summary not found for ${departmentId} ${year}-${month}`);
      return null;
    }

    const payrollRecords = dataStore.getPayrollByDepartment(departmentId, year, month);

    const approvalRecord: ApprovalRecord = {
      id: dataStore.generateId(),
      approverId: submitterId,
      approverName: submitterName,
      action: 'submit',
      comment: '提交审批',
      level: 0,
      createdAt: new Date().toISOString(),
    };

    payrollRecords.forEach((record) => {
      if (record.status === 'calculated') {
        record.approvalHistory.push(approvalRecord);
        record.status = 'approved';
        record.updatedAt = new Date().toISOString();
        dataStore.savePayrollRecord(record);
      }
    });

    if (summary.approvalStatus !== 'frozen') {
      summary.approvalStatus = summary.requiredApprovalLevel === 0 ? 'approved' : 'pending';
    }

    dataStore.saveDepartmentSummary(summary);

    dataStore.addAuditLog({
      userId: submitterId,
      userName: submitterName,
      action: 'submit_approval',
      module: 'approval_workflow',
      resourceId: departmentId,
      details: {
        departmentId,
        year,
        month,
        requiredLevel: summary.requiredApprovalLevel,
      },
    });

    return summary;
  }

  approveDepartment(
    departmentId: string,
    year: number,
    month: number,
    approverId: string,
    approverName: string,
    approverLevel: ApprovalLevel,
    comment?: string
  ): { success: boolean; message: string; summary?: DepartmentPayrollSummary } {
    logger.info(`Approving department ${departmentId} by ${approverName} (level ${approverLevel})`);

    const summary = dataStore.getDepartmentSummary(departmentId, year, month);
    if (!summary) {
      return { success: false, message: '部门薪酬汇总不存在' };
    }

    if (summary.approvalStatus === 'frozen') {
      return { success: false, message: '该部门薪酬已被冻结，需先解除冻结' };
    }

    if (approverLevel < summary.requiredApprovalLevel) {
      return {
        success: false,
        message: `需要级别不足，需要级别${summary.requiredApprovalLevel}级审批`,
      };
    }

    const payrollRecords = dataStore.getPayrollByDepartment(departmentId, year, month);

    const approvalRecord: ApprovalRecord = {
      id: dataStore.generateId(),
      approverId,
      approverName,
      action: 'approve',
      comment,
      level: approverLevel,
      createdAt: new Date().toISOString(),
    };

    payrollRecords.forEach((record) => {
      if (record.status !== 'frozen') {
        record.approvalHistory.push(approvalRecord);
        record.status = 'approved';
        record.updatedAt = new Date().toISOString();
        dataStore.savePayrollRecord(record);
      }
    });

    summary.approvalStatus = 'approved';
    dataStore.saveDepartmentSummary(summary);

    dataStore.addAuditLog({
      userId: approverId,
      userName: approverName,
      action: 'approve_payroll',
      module: 'approval_workflow',
      resourceId: departmentId,
      details: {
        departmentId,
        year,
        month,
        approverLevel,
        comment,
      },
    });

    logger.info(`Department ${departmentId} approved successfully`);

    return {
      success: true,
      message: '审批通过',
      summary,
    };
  }

  rejectDepartment(
    departmentId: string,
    year: number,
    month: number,
    approverId: string,
    approverName: string,
    reason: string
  ): { success: boolean; message: string; summary?: DepartmentPayrollSummary } {
    logger.info(`Rejecting department ${departmentId} by ${approverName}`);

    const summary = dataStore.getDepartmentSummary(departmentId, year, month);
    if (!summary) {
      return { success: false, message: '部门薪酬汇总不存在' };
    }

    const payrollRecords = dataStore.getPayrollByDepartment(departmentId, year, month);

    const approvalRecord: ApprovalRecord = {
      id: dataStore.generateId(),
      approverId,
      approverName,
      action: 'reject',
      comment: reason,
      level: 0,
      createdAt: new Date().toISOString(),
    };

    payrollRecords.forEach((record) => {
      record.approvalHistory.push(approvalRecord);
      record.status = 'rejected';
      record.updatedAt = new Date().toISOString();
      dataStore.savePayrollRecord(record);
    });

    summary.approvalStatus = 'rejected';
    dataStore.saveDepartmentSummary(summary);

    dataStore.addAuditLog({
      userId: approverId,
      userName: approverName,
      action: 'reject_payroll',
      module: 'approval_workflow',
      resourceId: departmentId,
      details: {
        departmentId,
        year,
        month,
        reason,
      },
    });

    return {
      success: true,
      message: '已驳回',
      summary,
    };
  }

  unfreezeDepartment(
    departmentId: string,
    year: number,
    month: number,
    approverId: string,
    approverName: string,
    reason: string
  ): { success: boolean; message: string } {
    logger.info(`Unfreezing department ${departmentId} by ${approverName}`);

    const summary = dataStore.getDepartmentSummary(departmentId, year, month);
    if (!summary) {
      return { success: false, message: '部门薪酬汇总不存在' };
    }

    const payrollRecords = dataStore.getPayrollByDepartment(departmentId, year, month);

    payrollRecords.forEach((record) => {
      if (record.status === 'frozen') {
        record.status = 'calculated';
        record.updatedAt = new Date().toISOString();
        dataStore.savePayrollRecord(record);
      }
    });

    summary.approvalStatus = 'pending';
    dataStore.saveDepartmentSummary(summary);

    dataStore.addAuditLog({
      userId: approverId,
      userName: approverName,
      action: 'unfreeze_payroll',
      module: 'approval_workflow',
      resourceId: departmentId,
      details: {
        departmentId,
        year,
        month,
        reason,
      },
    });

    return {
      success: true,
      message: '已解除冻结',
    };
  }

  getPendingApprovals(approverLevel: ApprovalLevel): DepartmentPayrollSummary[] {
    const allSummaries: DepartmentPayrollSummary[] = [];
    const departments = dataStore.getAllDepartments();

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    for (const dept of departments) {
      const summary = dataStore.getDepartmentSummary(dept.id, year, month);
      if (
        summary &&
        summary.approvalStatus === 'pending' &&
        summary.requiredApprovalLevel <= approverLevel
      ) {
        allSummaries.push(summary);
      }
    }

    return allSummaries;
  }

  canApprove(
    summary: DepartmentPayrollSummary,
    approverLevel: ApprovalLevel
  ): boolean {
    return (
      summary.approvalStatus !== 'frozen' &&
      approverLevel >= summary.requiredApprovalLevel
    );
  }
}

export const approvalWorkflow = new ApprovalWorkflow();
