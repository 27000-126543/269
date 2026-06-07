import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'HR System <hr@company.com>',
  },

  sms: {
    apiKey: process.env.SMS_API_KEY || '',
    apiUrl: process.env.SMS_API_URL || '',
  },

  bank: {
    name: process.env.BANK_NAME || 'ICBC',
    batchSize: parseInt(process.env.BANK_BATCH_SIZE || '1000'),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/payroll.log',
  },

  performance: {
    maxConcurrentEmployees: parseInt(process.env.MAX_CONCURRENT_EMPLOYEES || '500'),
    enableCache: process.env.ENABLE_CACHE === 'true',
  },

  paths: {
    dataDir: path.resolve(process.cwd(), 'data'),
    exportsDir: path.resolve(process.cwd(), 'exports'),
    logsDir: path.resolve(process.cwd(), 'logs'),
  },
};
