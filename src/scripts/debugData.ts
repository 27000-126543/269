import { dataStore } from '../store/DataStore';

console.log('Checking DataStore...');
console.log('DataStore initialized:', !!dataStore);

const employees = dataStore.getActiveEmployees();
console.log('Active employees count:', employees.length);

if (employees.length > 0) {
  console.log('First 3 employees:');
  employees.slice(0, 3).forEach((e) => {
    console.log(`  - ${e.employeeNo}: ${e.name} (${e.position})`);
  });
}

const e001 = dataStore.getEmployeeByNo('E001');
console.log('\nEmployee E001:', e001 ? `${e001.name} - ${e001.position}` : 'NOT FOUND');

if (e001) {
  console.log('Employee status:', e001.status);
}
