import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { employeeSelfService } from '../../services/EmployeeSelfService';
import { dataStore } from '../../store/DataStore';
import { SpecialDeduction } from '../../types';

const router = Router();

router.get('/my-requests', authMiddleware, (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const requests = employeeSelfService.getEmployeeRequests(req.user.id);
    res.json(requests);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.get('/pending', authMiddleware, (req: Request, res: Response) => {
  try {
    const requests = employeeSelfService.getPendingRequests();
    res.json(requests);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.post('/special-deduction', authMiddleware, (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const changes = req.body as Partial<SpecialDeduction>;
    const result = employeeSelfService.submitSpecialDeductionChange(req.user.id, changes);

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.post('/housing-fund', authMiddleware, (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { base, ratio } = req.body;
    const result = employeeSelfService.submitHousingFundChange(req.user.id, base, ratio);

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.post('/approve/:requestId', authMiddleware, (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { requestId } = req.params;
    const { comment } = req.body;

    const result = employeeSelfService.reviewDeductionRequest(
      requestId,
      req.user.id,
      req.user.name,
      true,
      comment
    );

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.post('/reject/:requestId', authMiddleware, (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { requestId } = req.params;
    const { comment } = req.body;

    const result = employeeSelfService.reviewDeductionRequest(
      requestId,
      req.user.id,
      req.user.name,
      false,
      comment
    );

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.get('/current', authMiddleware, (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const employee = dataStore.getEmployee(req.user.id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({
      specialDeductions: {
        childEducation: 0,
        continuingEducation: 0,
        housingLoanInterest: 0,
        housingRent: 0,
        elderlySupport: 0,
        infantCare: 0,
        total: 0,
      },
      housingFund: {
        base: employee.housingFundBase,
        ratio: employee.housingFundRatio,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export { router as deductionRouter };
