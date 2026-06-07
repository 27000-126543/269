import { sampleDataGenerator, logger } from '../index';

async function main() {
  const employeeCount = 200;
  const year = 2024;
  const month = 6;

  logger.info(`Starting sample data generation: ${employeeCount} employees for ${year}-${month}`);

  try {
    await sampleDataGenerator.generateAllSampleData(employeeCount, year, month);
    logger.info('Sample data generation completed successfully!');
    logger.info(`Generated:`);
    logger.info(`  - Departments: 7`);
    logger.info(`  - Employees: ${employeeCount}`);
    logger.info(`  - Attendance records: ${employeeCount}`);
    logger.info(`  - Performance records: ${employeeCount}`);
    logger.info(`  - Sales commission records: For sales employees`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Sample data generation failed: ${message}`);
    process.exit(1);
  }
}

main();
