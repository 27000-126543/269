import { Router, Request, Response } from 'express';
import { authMiddleware, requireApprovalLevel } from '../middleware/auth';
import { reportGenerator } from '../../services/ReportGenerator';

const router = Router();

router.get('/:year/:month', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { year, month } = req.params;
    const analysis = await reportGenerator.generatePayrollAnalysis(
      parseInt(year),
      parseInt(month)
    );

    res.json(analysis);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.get('/export/excel/:year/:month', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { year, month } = req.params;
    const analysis = await reportGenerator.generatePayrollAnalysis(
      parseInt(year),
      parseInt(month)
    );
    const payrollRecords = await reportGenerator['payrollEngine']['getPayrollHistory']({
      startYear: parseInt(year),
      startMonth: parseInt(month),
      endYear: parseInt(year),
      endMonth: parseInt(month),
    });

    const filePath = await reportGenerator.exportToExcel(analysis, payrollRecords);
    const fileName = filePath.split('/').pop();

    res.json({
      filePath,
      fileName,
      downloadUrl: `/exports/${fileName}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.get('/export/pdf/:year/:month', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { year, month } = req.params;
    const analysis = await reportGenerator.generatePayrollAnalysis(
      parseInt(year),
      parseInt(month)
    );
    const filePath = await reportGenerator.exportToPDF(analysis);
    const fileName = filePath.split('/').pop();

    res.json({
      filePath,
      fileName,
      downloadUrl: `/exports/${fileName}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.post('/generate/:year/:month', authMiddleware, requireApprovalLevel(0), async (req: Request, res: Response) => {
  try {
    const { year, month } = req.params;
    const result = await reportGenerator.generateMonthlyReport(
      parseInt(year),
      parseInt(month)
    );

    res.json({
      analysis: result.analysis,
      excelPath: result.excelPath,
      pdfPath: result.pdfPath,
      excelUrl: `/exports/${result.excelPath.split('/').pop()}`,
      pdfUrl: `/exports/${result.pdfPath.split('/').pop()}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export { router as reportRouter };
