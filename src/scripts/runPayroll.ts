import { payrollEngine, logger, dataStore, approvalWorkflow, reportGenerator, payslipGenerator, bankPaymentGenerator } from '../index';

async function main() {
  const year = 2024;
  const month = 6;

  logger.info(`Starting payroll calculation for ${year}-${month}`);

  try {
    const result = await payrollEngine.runPayrollCalculation(year, month);

    logger.info(`Payroll calculation completed!`);
    logger.info(`  Success: ${result.successCount}`);
    logger.info(`  Failed: ${result.failedCount}`);
    logger.info(`  Frozen: ${result.frozenCount}`);

    if (result.errors.length > 0) {
      logger.warn(`Errors encountered:`);
      result.errors.slice(0, 5).forEach((err) => {
        logger.warn(`  ${err.employeeId}: ${err.error}`);
      });
    }

    logger.info('');
    logger.info('Submitting departments for approval...');
    const departments = dataStore.getAllDepartments();
    for (const dept of departments) {
      approvalWorkflow.submitDepartmentForApproval(
        dept.id,
        year,
        month,
        'hr_manager',
        '人力资源经理'
      );
    }
    logger.info('Departments submitted for approval');

    logger.info('');
    logger.info('Approving payrolls...');
    for (const dept of departments) {
      const summary = dataStore.getDepartmentSummary(dept.id, year, month);
      if (summary && summary.approvalStatus === 'pending') {
        const approvalLevel = summary.requiredApprovalLevel;
        const approverId = approvalLevel >= 2 ? 'cfo' : approvalLevel >= 1 ? 'director' : 'hr_manager';
        const approverName = approvalLevel >= 2 ? 'CFO' : approvalLevel >= 1 ? '总监' : '人力资源经理';

        approvalWorkflow.approveDepartment(
          dept.id,
          year,
          month,
          approverId,
          approverName,
          approvalLevel as 0 | 1 | 2,
          '审批通过'
        );
      }
    }
    logger.info('Payrolls approved');

    logger.info('');
    logger.info('Generating reports...');
    const reportResult = await reportGenerator.generateMonthlyReport(year, month);
    logger.info(`Reports generated:`);
    logger.info(`  Excel: ${reportResult.excelPath}`);
    logger.info(`  PDF: ${reportResult.pdfPath}`);

    logger.info('');
    logger.info('Generating bank payment file...');
    const bankResult = await bankPaymentGenerator.generateBankFile(year, month);
    logger.info(`Bank file generated: ${bankResult.filePath}`);
    logger.info(`  Records: ${bankResult.recordCount}`);
    logger.info(`  Total amount: ¥${bankResult.totalAmount.toLocaleString()}`);

    logger.info('');
    logger.info('Payroll process completed successfully!');

    const analysis = reportResult.analysis;
    logger.info('');
    logger.info('=== Payroll Summary ===');
    logger.info(`Total employees: ${analysis.totalEmployees}`);
    logger.info(`Total gross salary: ¥${analysis.totalGrossSalary.toLocaleString()}`);
    logger.info(`Total net salary: ¥${analysis.totalNetSalary.toLocaleString()}`);
    logger.info(`Total tax: ¥${analysis.totalTax.toLocaleString()}`);
    logger.info(`Average gross salary: ¥${analysis.averageGrossSalary.toLocaleString()}`);
    logger.info(`Average cost per employee: ¥${analysis.averageCostPerEmployee.toLocaleString()}`);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Payroll calculation failed: ${message}`);
    if (error instanceof Error) {
      logger.error(error.stack);
    }
    process.exit(1);
  }
}

main();
