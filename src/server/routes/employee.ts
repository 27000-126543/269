import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { dataStore } from '../../store/DataStore';

const router = Router();

router.get('/me', authMiddleware, (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const employee = dataStore.getEmployee(req.user.id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const department = dataStore.getDepartment(employee.departmentId);

    res.json({
      ...employee,
      departmentName: department?.name,
      role: req.user.role,
      approvalLevel: req.user.approvalLevel,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.get('/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const employee = dataStore.getEmployee(id);

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const department = dataStore.getDepartment(employee.departmentId);

    res.json({
      ...employee,
      departmentName: department?.name,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.get('/', authMiddleware, (req: Request, res: Response) => {
  try {
    const { departmentId } = req.query;
    let employees = dataStore.getActiveEmployees();

    if (departmentId) {
      employees = employees.filter((e) => e.departmentId === departmentId);
    }

    const result = employees.map((emp) => {
      const dept = dataStore.getDepartment(emp.departmentId);
      return {
        ...emp,
        departmentName: dept?.name,
      };
    });

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.get('/departments/list', authMiddleware, (req: Request, res: Response) => {
  try {
    const departments = dataStore.getAllDepartments();
    res.json(departments);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export { router as employeeRouter };
