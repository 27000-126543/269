import { reportGenerator } from '../services/ReportGenerator';

async function test() {
  try {
    console.log('Testing report generation...');
    const analysis = await reportGenerator.generatePayrollAnalysis(2024, 6);
    console.log('Analysis done:');
    console.log('  totalGrossSalary:', analysis.totalGrossSalary);
    console.log('  totalSocialSecurity.employer:', analysis.totalSocialSecurity.employer);
    console.log('  totalHousingFund.employer:', analysis.totalHousingFund.employer);
    console.log('  department count:', analysis.departmentBreakdown.length);
    
    console.log('\nTesting PDF export...');
    const pdfPath = await reportGenerator.exportToPDF(analysis);
    console.log('PDF generated at:', pdfPath);
    console.log('Success!');
  } catch (e) {
    console.error('Error:', e);
    if (e instanceof Error) {
      console.error('Stack:', e.stack);
    }
  }
}

test();
