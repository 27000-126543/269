import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { dataStore } from '../store/DataStore';
import { createModuleLogger } from '../utils/logger';
import { config } from '../config';
import { PayrollRecord, Employee, Payslip, DeductionItem, EarningItem } from '../types';

const logger = createModuleLogger('PayslipGenerator');

export class PayslipGenerator {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    if (config.smtp.host && config.smtp.user) {
      this.transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass,
        },
      });
    }
  }

  generatePayslipHtml(
    employee: Employee,
    payroll: PayrollRecord
  ): string {
    const formatMoney = (amount: number) => amount.toFixed(2);

    const earningsHtml = payroll.earnings
      .map(
        (e: EarningItem) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${e.name}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatMoney(e.amount)}</td>
        <td style="padding: 8px; border: 1px solid #ddd; font-size: 12px; color: #666;">${e.description || ''}</td>
      </tr>
    `
      )
      .join('');

    const deductionsHtml = payroll.deductions
      .map(
        (d: DeductionItem) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${d.name}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatMoney(d.amount)}</td>
        <td style="padding: 8px; border: 1px solid #ddd; font-size: 12px; color: #666;">${d.description || ''}</td>
      </tr>
    `
      )
      .join('');

    const sd = payroll.specialDeductions;
    const specialDeductionsHtml = `
      <tr><td style="padding: 8px; border: 1px solid #ddd;">子女教育</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatMoney(sd.childEducation)}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd;">继续教育</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatMoney(sd.continuingEducation)}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd;">住房贷款利息</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatMoney(sd.housingLoanInterest)}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd;">住房租金</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatMoney(sd.housingRent)}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd;">赡养老人</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatMoney(sd.elderlySupport)}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd;">婴幼儿照护</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatMoney(sd.infantCare)}</td></tr>
    `;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; }
          .company-name { font-size: 24px; font-weight: bold; color: #2c5aa0; }
          .payslip-title { font-size: 18px; margin-top: 10px; color: #666; }
          .info-section { margin-bottom: 20px; }
          .info-row { display: flex; margin-bottom: 8px; }
          .info-label { width: 120px; color: #666; }
          .info-value { font-weight: 500; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background-color: #2c5aa0; color: white; padding: 10px; text-align: left; }
          .summary-row { background-color: #f5f5f5; font-weight: bold; }
          .net-salary { font-size: 20px; color: #2c5aa0; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">企业薪酬管理系统</div>
          <div class="payslip-title">${payroll.year}年${payroll.month}月 工资条</div>
        </div>

        <div class="info-section">
          <div class="info-row">
            <span class="info-label">员工姓名：</span>
            <span class="info-value">${employee.name}</span>
          </div>
          <div class="info-row">
            <span class="info-label">工号：</span>
            <span class="info-value">${employee.employeeNo}</span>
          </div>
          <div class="info-row">
            <span class="info-label">部门：</span>
            <span class="info-value">${dataStore.getDepartment(employee.departmentId)?.name || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">职位：</span>
            <span class="info-value">${employee.position}</span>
          </div>
          <div class="info-row">
            <span class="info-label">发放日期：</span>
            <span class="info-value">${payroll.year}-${payroll.month}-05</span>
          </div>
        </div>

        <h3>收入明细</h3>
        <table>
          <tr>
            <th>项目</th>
            <th style="text-align: right;">金额（元）</th>
            <th>说明</th>
          </tr>
          ${earningsHtml}
          <tr class="summary-row">
            <td style="padding: 10px;">应发工资合计</td>
            <td style="padding: 10px; text-align: right;">${formatMoney(payroll.grossSalary)}</td>
            <td></td>
          </tr>
        </table>

        <h3>扣除明细</h3>
        <table>
          <tr>
            <th>项目</th>
            <th style="text-align: right;">金额（元）</th>
            <th>说明</th>
          </tr>
          ${deductionsHtml}
          <tr class="summary-row">
            <td style="padding: 10px;">扣除合计</td>
            <td style="padding: 10px; text-align: right;">${formatMoney(payroll.grossSalary - payroll.netSalary)}</td>
            <td></td>
          </tr>
        </table>

        <h3>专项附加扣除</h3>
        <table>
          <tr>
            <th>项目</th>
            <th style="text-align: right;">金额（元）</th>
          </tr>
          ${specialDeductionsHtml}
          <tr class="summary-row">
            <td style="padding: 10px;">专项附加扣除合计</td>
            <td style="padding: 10px; text-align: right;">${formatMoney(sd.total)}</td>
          </tr>
        </table>

        <div style="margin-top: 30px; padding: 15px; background-color: #e8f4fd; border-radius: 5px;">
          <div class="info-row">
            <span class="info-label">应纳税所得额：</span>
            <span class="info-value">${formatMoney(payroll.taxableIncome)} 元</span>
          </div>
          <div class="info-row">
            <span class="info-label">个人所得税：</span>
            <span class="info-value">${formatMoney(payroll.taxWithheld)} 元</span>
          </div>
          <div class="info-row" style="margin-top: 10px;">
            <span class="info-label">实发工资：</span>
            <span class="net-salary">${formatMoney(payroll.netSalary)} 元</span>
          </div>
        </div>

        <div class="footer">
          <p>本工资条为系统自动生成，如有疑问请联系人力资源部</p>
          <p>企业薪酬管理系统 © ${new Date().getFullYear()}</p>
        </div>
      </body>
      </html>
    `;
  }

  async sendEmailPayslip(
    employee: Employee,
    payroll: PayrollRecord
  ): Promise<boolean> {
    if (!this.transporter) {
      logger.warn('SMTP not configured, skipping email send');
      return false;
    }

    try {
      const html = this.generatePayslipHtml(employee, payroll);

      await this.transporter.sendMail({
        from: config.smtp.from,
        to: employee.email,
        subject: `${payroll.year}年${payroll.month}月工资条 - ${employee.name}`,
        html,
      });

      logger.info(`Payslip email sent to ${employee.email}`);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to send payslip email to ${employee.email}: ${message}`);
      return false;
    }
  }

  async sendSmsPayslip(
    employee: Employee,
    payroll: PayrollRecord
  ): Promise<boolean> {
    if (!config.sms.apiUrl || !config.sms.apiKey) {
      logger.warn('SMS not configured, skipping SMS send');
      return false;
    }

    try {
      const message = `【薪酬系统】${payroll.year}年${payroll.month}月工资已发放，应发${payroll.grossSalary.toFixed(2)}元，实发${payroll.netSalary.toFixed(2)}元。详情请查收邮件或登录系统查看。`;

      const response = await fetch(config.sms.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.sms.apiKey}`,
        },
        body: JSON.stringify({
          phone: employee.phone,
          message,
        }),
      });

      if (response.ok) {
        logger.info(`Payslip SMS sent to ${employee.phone}`);
        return true;
      }
      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to send payslip SMS to ${employee.phone}: ${message}`);
      return false;
    }
  }

  async sendPayslips(
    year: number,
    month: number,
    departmentId?: string
  ): Promise<{
    totalCount: number;
    emailSent: number;
    smsSent: number;
    failed: number;
  }> {
    logger.info(`Sending payslips for ${year}-${month}`);

    let payrollRecords: PayrollRecord[];
    if (departmentId) {
      payrollRecords = dataStore.getPayrollByDepartment(departmentId, year, month);
    } else {
      payrollRecords = dataStore.getPayrollByMonth(year, month);
    }

    const approvedRecords = payrollRecords.filter((r) => r.status === 'approved');

    let emailSent = 0;
    let smsSent = 0;
    let failed = 0;

    for (const payroll of approvedRecords) {
      const employee = dataStore.getEmployee(payroll.employeeId);
      if (!employee) continue;

      const payslip: Payslip = {
        id: dataStore.generateId(),
        payrollRecordId: payroll.id,
        employeeId: employee.id,
        year,
        month,
        sendStatus: 'pending',
        emailSent: false,
        smsSent: false,
      };

      const emailSuccess = await this.sendEmailPayslip(employee, payroll);
      if (emailSuccess) {
        payslip.emailSent = true;
        emailSent++;
      }

      const smsSuccess = await this.sendSmsPayslip(employee, payroll);
      if (smsSuccess) {
        payslip.smsSent = true;
        smsSent++;
      }

      if (emailSuccess || smsSuccess) {
        payslip.sendStatus = 'sent';
        payslip.sentAt = new Date().toISOString();
      } else {
        payslip.sendStatus = 'failed';
        failed++;
      }

      dataStore.savePayslip(payslip);
    }

    dataStore.addAuditLog({
      userId: 'system',
      userName: 'System',
      action: 'send_payslips',
      module: 'payslip',
      details: {
        year,
        month,
        totalCount: approvedRecords.length,
        emailSent,
        smsSent,
        failed,
      },
    });

    logger.info(
      `Payslips sent: total ${approvedRecords.length}, email ${emailSent}, sms ${smsSent}, failed ${failed}`
    );

    return {
      totalCount: approvedRecords.length,
      emailSent,
      smsSent,
      failed,
    };
  }

  savePayslipHtml(year: number, month: number, employeeId: string): string {
    const employee = dataStore.getEmployee(employeeId);
    const payroll = dataStore.getPayrollRecord(employeeId, year, month);

    if (!employee || !payroll) {
      throw new Error('Employee or payroll record not found');
    }

    const html = this.generatePayslipHtml(employee, payroll);
    const exportDir = config.paths.exportsDir;
    const fileName = `payslip_${year}${month.toString().padStart(2, '0')}_${employee.employeeNo}.html`;
    const filePath = path.join(exportDir, fileName);

    fs.writeFileSync(filePath, html, 'utf-8');

    return filePath;
  }
}

export const payslipGenerator = new PayslipGenerator();
