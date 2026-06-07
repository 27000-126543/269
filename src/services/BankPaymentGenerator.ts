import fs from 'fs';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { dataStore } from '../store/DataStore';
import { createModuleLogger } from '../utils/logger';
import { config } from '../config';
import { BankPaymentRecord, PayrollRecord, Employee } from '../types';

const logger = createModuleLogger('BankPaymentGenerator');

export class BankPaymentGenerator {
  generateBatchId(year: number, month: number): string {
    return `PAY_${year}${month.toString().padStart(2, '0')}_${Date.now()}`;
  }

  async generateBankFile(
    year: number,
    month: number,
    departmentId?: string
  ): Promise<{
    batchId: string;
    filePath: string;
    recordCount: number;
    totalAmount: number;
  }> {
    logger.info(`Generating bank payment file for ${year}-${month}`);

    const batchId = this.generateBatchId(year, month);
    let payrollRecords: PayrollRecord[];

    if (departmentId) {
      payrollRecords = dataStore.getPayrollByDepartment(departmentId, year, month);
    } else {
      payrollRecords = dataStore.getPayrollByMonth(year, month);
    }

    const approvedRecords = payrollRecords.filter(
      (r) => r.status === 'approved' && r.netSalary > 0
    );

    if (approvedRecords.length === 0) {
      throw new Error('No approved payroll records found for payment');
    }

    const paymentRecords: BankPaymentRecord[] = [];
    let totalAmount = 0;

    for (const payroll of approvedRecords) {
      const employee = dataStore.getEmployee(payroll.employeeId);
      if (!employee) continue;

      const payment: BankPaymentRecord = {
        id: dataStore.generateId(),
        batchId,
        employeeId: employee.id,
        employeeName: employee.name,
        bankAccount: employee.bankAccount,
        bankName: employee.bankName,
        amount: payroll.netSalary,
        status: 'pending',
      };

      paymentRecords.push(payment);
      totalAmount += payroll.netSalary;
      dataStore.saveBankPayment(payment);
    }

    totalAmount = Math.round(totalAmount * 100) / 100;

    const filePath = await this.generateCsvFile(batchId, paymentRecords, year, month);

    dataStore.addAuditLog({
      userId: 'system',
      userName: 'System',
      action: 'generate_bank_file',
      module: 'bank_payment',
      details: {
        batchId,
        year,
        month,
        recordCount: paymentRecords.length,
        totalAmount,
        filePath,
      },
    });

    logger.info(
      `Bank file generated: ${filePath}, ${paymentRecords.length} records, total ${totalAmount}`
    );

    return {
      batchId,
      filePath,
      recordCount: paymentRecords.length,
      totalAmount,
    };
  }

  private async generateCsvFile(
    batchId: string,
    records: BankPaymentRecord[],
    year: number,
    month: number
  ): Promise<string> {
    const exportDir = config.paths.exportsDir;
    const fileName = `bank_payment_${year}${month.toString().padStart(2, '0')}_${batchId.slice(-6)}.csv`;
    const filePath = path.join(exportDir, fileName);

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'batchId', title: '批次号' },
        { id: 'employeeName', title: '员工姓名' },
        { id: 'bankAccount', title: '银行账号' },
        { id: 'bankName', title: '开户行' },
        { id: 'amount', title: '金额' },
        { id: 'currency', title: '币种' },
        { id: 'remark', title: '备注' },
      ],
    });

    const csvRecords = records.map((r) => ({
      batchId: r.batchId,
      employeeName: r.employeeName,
      bankAccount: r.bankAccount,
      bankName: r.bankName,
      amount: r.amount.toFixed(2),
      currency: 'CNY',
      remark: `${year}年${month}月工资`,
    }));

    await csvWriter.writeRecords(csvRecords);

    return filePath;
  }

  markBatchAsProcessed(batchId: string): void {
    const records = dataStore.getBankPaymentsByBatch(batchId);
    records.forEach((record) => {
      record.status = 'processed';
      record.processedAt = new Date().toISOString();
      dataStore.saveBankPayment(record);
    });

    dataStore.addAuditLog({
      userId: 'system',
      userName: 'System',
      action: 'process_bank_batch',
      module: 'bank_payment',
      resourceId: batchId,
      details: { batchId, recordCount: records.length },
    });

    logger.info(`Batch ${batchId} marked as processed`);
  }

  getBatchSummary(batchId: string): {
    batchId: string;
    totalRecords: number;
    totalAmount: number;
    processedCount: number;
    failedCount: number;
    pendingCount: number;
  } {
    const records = dataStore.getBankPaymentsByBatch(batchId);
    const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);

    return {
      batchId,
      totalRecords: records.length,
      totalAmount: Math.round(totalAmount * 100) / 100,
      processedCount: records.filter((r) => r.status === 'processed').length,
      failedCount: records.filter((r) => r.status === 'failed').length,
      pendingCount: records.filter((r) => r.status === 'pending').length,
    };
  }
}

export const bankPaymentGenerator = new BankPaymentGenerator();
