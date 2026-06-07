import { Router, Request, Response } from 'express';
import { authMiddleware, requireApprovalLevel } from '../middleware/auth';
import { dataStore } from '../../store/DataStore';
import { approvalWorkflow } from '../../services/ApprovalWorkflow';

const router = Router();

router.get('/pending', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const departments = dataStore.getAllDepartments();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const pendingItems: any[] = [];

    for (const dept of departments) {
      const summary = dataStore.getDepartmentSummary(dept.id, year, month);
      if (
        summary &&
        summary.approvalStatus === 'pending' &&
        summary.requiredApprovalLevel <= req.user.approvalLevel
      ) {
        pendingItems.push(summary);
      }

      if (summary && summary.approvalStatus === 'frozen') {
        pendingItems.push(summary);
      }
    }

    res.json(pendingItems);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.get('/history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { year, month } = req.query;
    const y = year ? parseInt(year as string) : new Date().getFullYear();
    const m = month ? parseInt(month as string) : new Date().getMonth() + 1;

    const departments = dataStore.getAllDepartments();
    const summaries: any[] = [];

    for (const dept of departments) {
      const summary = dataStore.getDepartmentSummary(dept.id, y, m);
      if (summary) {
        summaries.push(summary);
      }
    }

    res.json(summaries);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.post('/approve/:departmentId/:year/:month', authMiddleware, requireApprovalLevel(0), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { departmentId, year, month } = req.params;
    const { comment } = req.body;

    const result = approvalWorkflow.approveDepartment(
      departmentId,
      parseInt(year),
      parseInt(month),
      req.user.id,
      req.user.name,
      req.user.approvalLevel as 0 | 1 | 2,
      comment
    );

    if (result.success) {
      dataStore.addAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        action: 'approve_payroll',
        module: 'approval',
        resourceId: departmentId,
        details: { year, month, comment },
      });
    }

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.post('/reject/:departmentId/:year/:month', authMiddleware, requireApprovalLevel(0), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { departmentId, year, month } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: '请填写驳回原因' });
    }

    const result = approvalWorkflow.rejectDepartment(
      departmentId,
      parseInt(year),
      parseInt(month),
      req.user.id,
      req.user.name,
      reason
    );

    if (result.success) {
      dataStore.addAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        action: 'reject_payroll',
        module: 'approval',
        resourceId: departmentId,
        details: { year, month, reason },
      });
    }

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.post('/unfreeze/:departmentId/:year/:month', authMiddleware, requireApprovalLevel(1), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { departmentId, year, month } = req.params;
    const { reason } = req.body;

    const result = approvalWorkflow.unfreezeDepartment(
      departmentId,
      parseInt(year),
      parseInt(month),
      req.user.id,
      req.user.name,
      reason || '解除冻结'
    );

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export { router as approvalRouter };
