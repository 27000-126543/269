import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { dataStore } from '../../store/DataStore';
import { generateToken, AuthUser } from '../middleware/auth';
import { Employee } from '../../types';

const router = Router();

const DEFAULT_PASSWORD_HASH = bcrypt.hashSync('123456', 10);

const getUserRole = (employee: Employee): { role: AuthUser['role']; approvalLevel: number } => {
  const position = employee.position.toLowerCase();
  
  if (position.includes('cfo') || position.includes('首席') || position.includes('财务总监')) {
    return { role: 'cfo', approvalLevel: 2 };
  }
  if (position.includes('总监') || position.includes('director')) {
    return { role: 'manager', approvalLevel: 1 };
  }
  if (position.includes('hr') || position.includes('人力资源') || position.includes('人事')) {
    return { role: 'hr', approvalLevel: 0 };
  }
  if (position.includes('经理') || position.includes('manager')) {
    return { role: 'manager', approvalLevel: 1 };
  }
  return { role: 'employee', approvalLevel: 0 };
};

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { employeeNo, password } = req.body;

    if (!employeeNo || !password) {
      return res.status(400).json({ error: '员工号和密码不能为空' });
    }

    const employee = dataStore.getEmployeeByNo(employeeNo);

    if (!employee || employee.status !== 'active') {
      return res.status(401).json({ error: '员工不存在或已离职' });
    }

    const isValid = password === '123456' || bcrypt.compareSync(password, DEFAULT_PASSWORD_HASH);

    if (!isValid) {
      return res.status(401).json({ error: '密码错误' });
    }

    const { role, approvalLevel } = getUserRole(employee);

    const user: AuthUser = {
      id: employee.id,
      employeeNo: employee.employeeNo,
      name: employee.name,
      role,
      departmentId: employee.departmentId,
      approvalLevel,
    };

    const token = generateToken(user);

    res.json({
      token,
      user,
    });

    dataStore.addAuditLog({
      userId: employee.id,
      userName: employee.name,
      action: 'login',
      module: 'auth',
      details: { ip: req.ip },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

export { router as authRouter };
