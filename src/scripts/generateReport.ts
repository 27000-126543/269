import { reportGenerator, historyQueryService, logger } from '../index';

async function main() {
  const year = 2024;
  const month = 6;

  logger.info(`Generating reports for ${year}-${month}`);

  try {
    const result = await reportGenerator.generateMonthlyReport(year, month);

    logger.info('Reports generated successfully!');
    logger.info(`Excel: ${result.excelPath}`);
    logger.info(`PDF: ${result.pdfPath}`);

    const a = result.analysis;
    logger.info('');
    logger.info('=== Analysis Summary ===');
    logger.info(`Total employees: ${a.totalEmployees}`);
    logger.info(`Total gross salary: ¥${a.totalGrossSalary.toLocaleString()}`);
    logger.info(`Total net salary: ¥${a.totalNetSalary.toLocaleString()}`);
    logger.info(`Average gross: ¥${a.averageGrossSalary.toLocaleString()}`);
    logger.info(`Average cost: ¥${a.averageCostPerEmployee.toLocaleString()}`);
    if (a.yearOverYear) {
      logger.info(`YoY growth: ${a.yearOverYear.growthRate}%`);
    }
    if (a.monthOverMonth) {
      logger.info(`MoM growth: ${a.monthOverMonth.growthRate}%`);
    }

    logger.info('');
    logger.info('=== Department Breakdown ===');
    a.departmentBreakdown.forEach((d) => {
      logger.info(`  ${d.departmentName}: ${d.employeeCount}人, ¥${d.totalGross.toLocaleString()}, 人均¥${d.averageGross.toLocaleString()}`);
    });

    const warningSummary = historyQueryService.getWarningSummary(year, month);
    logger.info('');
    logger.info('=== Warnings ===');
    logger.info(`Total warnings: ${warningSummary.totalWarnings}`);
    logger.info(`Frozen records: ${warningSummary.frozenCount}`);
    if (Object.keys(warningSummary.byType).length > 0) {
      logger.info('By type:');
      Object.entries(warningSummary.byType).forEach(([type, count]) => {
        logger.info(`  ${type}: ${count}`);
      });
    }

    logger.info('');
    logger.info('Exporting batch records...');
    const exportResult = await historyQueryService.batchExportToExcel({
      startYear: year,
      startMonth: month,
      endYear: year,
      endMonth: month,
    });
    logger.info(`Batch export: ${exportResult.filePath} (${exportResult.recordCount} records)`);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Report generation failed: ${message}`);
    process.exit(1);
  }
}

main();
