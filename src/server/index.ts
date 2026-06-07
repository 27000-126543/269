import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { createModuleLogger } from '../utils/logger';
import { config } from '../config';
import { authRouter } from './routes/auth';
import { employeeRouter } from './routes/employee';
import { payrollRouter } from './routes/payroll';
import { approvalRouter } from './routes/approval';
import { reportRouter } from './routes/report';
import { deductionRouter } from './routes/deduction';

const logger = createModuleLogger('Server');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/auth', authRouter);
app.use('/api/employee', employeeRouter);
app.use('/api/payroll', payrollRouter);
app.use('/api/approval', approvalRouter);
app.use('/api/report', reportRouter);
app.use('/api/deduction', deductionRouter);

app.use('/exports', express.static(config.paths.exportsDir));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`Unhandled error: ${err.message}`, err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  logger.info(`API docs available at http://localhost:${PORT}/api/health`);
});

export default app;
