import nodemailer from 'nodemailer';
import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('EmailService');

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  fromName: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
    contentType?: string;
  }>;
  cc?: string;
  bcc?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig;

  constructor() {
    this.config = this.loadConfig();
    this.initializeTransporter();
  }

  private loadConfig(): EmailConfig {
    return {
      host: process.env.SMTP_HOST || 'smtp.qq.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE !== 'false',
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
      fromName: process.env.SMTP_FROM_NAME || '企业薪酬管理系统',
    };
  }

  private initializeTransporter(): void {
    if (!this.config.user || !this.config.pass) {
      logger.warn('SMTP credentials not configured, email service will be disabled');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.user,
          pass: this.config.pass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      logger.info(`Email service initialized with host: ${this.config.host}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to initialize email service: ${message}`);
    }
  }

  public isConfigured(): boolean {
    return this.transporter !== null;
  }

  public async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      logger.warn('Cannot test connection: email service not configured');
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info('SMTP connection verified successfully');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`SMTP connection test failed: ${message}`);
      return false;
    }
  }

  public async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.transporter) {
      const msg = 'Email service not configured. Please set SMTP environment variables.';
      logger.warn(msg);
      return { success: false, error: msg };
    }

    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: `"${this.config.fromName}" <${this.config.from}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      logger.info(`Email sent successfully to ${options.to}, messageId: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to send email to ${options.to}: ${message}`);
      return {
        success: false,
        error: message,
      };
    }
  }

  public async sendPayslipEmail(
    toEmail: string,
    employeeName: string,
    year: number,
    month: number,
    payslipHtml: string,
    pdfAttachment?: Buffer
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const subject = `【工资条】${year}年${month}月 ${employeeName} 工资明细`;
    
    const attachments = pdfAttachment
      ? [
          {
            filename: `${employeeName}_${year}${month.toString().padStart(2, '0')}_工资条.pdf`,
            content: pdfAttachment,
            contentType: 'application/pdf',
          },
        ]
      : undefined;

    return this.sendEmail({
      to: toEmail,
      subject,
      html: payslipHtml,
      attachments,
    });
  }

  public async sendApprovalNotification(
    toEmail: string,
    employeeName: string,
    departmentName: string,
    year: number,
    month: number,
    approved: boolean,
    comment?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const status = approved ? '已通过' : '已驳回';
    const subject = `【审批通知】${year}年${month}月 ${departmentName} 薪酬审批${status}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          .header { font-size: 18px; font-weight: bold; color: #2c5aa0; margin-bottom: 20px; }
          .status { font-size: 16px; padding: 10px; border-radius: 4px; margin-bottom: 20px; }
          .approved { background-color: #e8f5e9; color: #2e7d32; }
          .rejected { background-color: #ffebee; color: #c62828; }
          .info-row { margin-bottom: 10px; }
          .label { color: #666; width: 100px; display: inline-block; }
          .comment { margin-top: 20px; padding: 10px; background: #f5f5f5; border-radius: 4px; }
          .footer { margin-top: 30px; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">薪酬审批通知</div>
        <div class="status ${approved ? 'approved' : 'rejected'}">
          ${year}年${month}月 ${departmentName} 薪酬发放审批${status}
        </div>
        <div class="info-row"><span class="label">部门：</span>${departmentName}</div>
        <div class="info-row"><span class="label">月份：</span>${year}年${month}月</div>
        <div class="info-row"><span class="label">审批人：</span>${employeeName}</div>
        ${comment ? `<div class="comment"><strong>审批意见：</strong>${comment}</div>` : ''}
        <div class="footer">此邮件由系统自动发送，请勿直接回复</div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: toEmail,
      subject,
      html,
    });
  }
}

export const emailService = new EmailService();
