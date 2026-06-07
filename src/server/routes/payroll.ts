import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { dataStore } from '../../store/DataStore';
import { payrollEngine } from '../../services/PayrollEngine';
import { historyQueryService } from '../../services/HistoryQueryService';

const router = Router();

router.get('/my', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { year, month } = req.query;
    const y = year ? parseInt(year as string) : new Date().getFullYear();
    const m = month ? parseInt(month as string) : new Date().getMonth() + 1;

    const records = payrollEngine.getPayrollHistory({
      employeeId: req.user.id,
      startYear: y,
      startMonth: 1,
      endYear: y,
      endMonth: m,
    });

    res.json(records);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.get('/detail/:year/:month', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);

    const payroll = dataStore.getPayrollRecord(req.user.id, year, month);

    if (!payroll) {
      return res.status(404).json({ error: 'Payroll record not found' });
    }

    const employee = dataStore.getEmployee(req.user.id);
    const department = employee ? dataStore.getDepartment(employee.departmentId) : null;

    res.json({
      payroll,
      employee,
      departmentName: department?.name,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.get('/by-department/:departmentId/:year/:month', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { departmentId, year, month } = req.params;
    const records = dataStore.getPayrollByDepartment(
      departmentId,
      parseInt(year),
      parseInt(month)
    );

    const result = records.map((r) => {
      const emp = dataStore.getEmployee(r.employeeId);
      return {
        ...r,
        employeeName: emp?.name,
        employeeNo: emp?.employeeNo,
      };
    });

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.get('/summary/:departmentId/:year/:month', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { departmentId, year, month } = req.params;
    const summary = dataStore.getDepartmentSummary(
      departmentId,
      parseInt(year),
      parseInt(month)
    );

    if (!summary) {
      return res.status(404).json({ error: 'Department summary not found' });
    }

    res.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.post('/query', authMiddleware, async (req: Request, res: Response) => {
  try {
    const filters = req.body;
    const records = historyQueryService.queryPayrollRecords(filters);
    
    const result = records.map((r) => {
      const emp = dataStore.getEmployee(r.employeeId);
      const dept = emp ? dataStore.getDepartment(emp.departmentId) : null;
      return {
        ...r,
        employeeName: emp?.name,
        employeeNo: emp?.employeeNo,
        departmentName: dept?.name,
      };
    });

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.post('/export', authMiddleware, async (req: Request, res: Response) => {
  try {
    const filters = req.body;
    const result = await historyQueryService.batchExportToExcel(filters);
    
    res.json({
      filePath: result.filePath,
      recordCount: result.recordCount,
      downloadUrl: `/exports/${result.filePath.split('/').pop()}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export { router as payrollRouter };
