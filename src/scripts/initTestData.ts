import { dataStore } from '../store/DataStore';
import { Employee } from '../types';
import { payrollEngine } from '../index';
import { approvalWorkflow } from '../services/ApprovalWorkflow';
import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('InitTestData');

async function main() {
  logger.info('Initializing test data...');

  const departments = dataStore.getAllDepartments();
  
  if (departments.length === 0) {
    logger.error('No departments found. Please run generateSampleData first.');
    process.exit(1);
  }

  const hrDept = departments.find(d => d.name === '人力资源部') || departments[0];

  let testEmployee = dataStore.getEmployeeByNo('E001');

  if (!testEmployee) {
    logger.info('Creating test account E001...');
    
    const employee: Employee = {
      id: dataStore.generateId(),
      employeeNo: 'E001',
      name: '张三',
      gender: 'male',
      idCard: '110101199001011234',
      phone: '13800138000',
      email: 'zhangsan@company.com',
      departmentId: hrDept.id,
      position: 'HR经理',
      hireDate: '2020-01-01T00:00:00.000Z',
      baseSalary: 25000,
      bankAccount: '6222000000000001',
      bankName: '中国工商银行',
      socialSecurityCity: 'beijing',
      housingFundCity: 'beijing',
      socialSecurityBase: 25000,
      housingFundBase: 25000,
      housingFundRatio: 0.12,
      isTaxResident: true,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dataStore.saveEmployee(employee);
    testEmployee = employee;
    logger.info('Test account E001 created successfully!');
  } else {
    logger.info('Test account E001 already exists.');
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  logger.info(`Running payroll calculation for ${year}-${month}...`);

  try {
    const result = await payrollEngine.runPayrollCalculation(year, month);
    logger.info(`Payroll calculation completed: ${result.successCount} success, ${result.failedCount} failed, ${result.frozenCount} frozen`);

    logger.info('Submitting departments for approval...');
    for (const dept of departments) {
      approvalWorkflow.submitDepartmentForApproval(
        dept.id,
        year,
        month,
        testEmployee.id,
        testEmployee.name
      );
    }
    logger.info('Departments submitted for approval');

    logger.info('Test data initialization completed!');
    logger.info('You can now login with:');
    logger.info('  Employee No: E001');
    logger.info('  Password: 123456');

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to initialize test data: ${message}`);
    if (error instanceof Error) {
      logger.error(error.stack);
    }
    process.exit(1);
  }
}

main();
