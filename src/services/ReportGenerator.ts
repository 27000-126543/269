import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { dataStore } from '../store/DataStore';
import { createModuleLogger } from '../utils/logger';
import { config } from '../config';
import { PayrollRecord, DepartmentPayrollSummary, Employee } from '../types';

const logger = createModuleLogger('ReportGenerator');

export interface PayrollAnalysis {
  year: number;
  month: number;
  totalEmployees: number;
  totalGrossSalary: number;
  totalNetSalary: number;
  totalTax: number;
  totalSocialSecurity: {
    employee: number;
    employer: number;
  };
  totalHousingFund: {
    employee: number;
    employer: number;
  };
  averageGrossSalary: number;
  averageNetSalary: number;
  medianGrossSalary: number;
  averageCostPerEmployee: number;
  departmentBreakdown: {
    departmentId: string;
    departmentName: string;
    employeeCount: number;
    totalGross: number;
    averageGross: number;
    budgetUsage: number;
  }[];
  taxDistribution: {
    bracket: string;
    count: number;
    totalTax: number;
    averageTax: number;
  }[];
  yearOverYear: {
    current: number;
    previous: number;
    growthRate: number;
  } | null;
  monthOverMonth: {
    current: number;
    previous: number;
    growthRate: number;
  } | null;
}

export class ReportGenerator {
  async generatePayrollAnalysis(
    year: number,
    month: number
  ): Promise<PayrollAnalysis> {
    logger.info(`Generating payroll analysis for ${year}-${month}`);

    const payrollRecords = dataStore.getPayrollByMonth(year, month);
    const departments = dataStore.getAllDepartments();

    let totalGrossSalary = 0;
    let totalNetSalary = 0;
    let totalTax = 0;
    let totalSSEmployee = 0;
    let totalSSEmployer = 0;
    let totalHFEmployee = 0;
    let totalHFEmployer = 0;

    const grossSalaries: number[] = [];

    for (const record of payrollRecords) {
      totalGrossSalary += record.grossSalary;
      totalNetSalary += record.netSalary;
      totalTax += record.taxWithheld;
      totalSSEmployee += record.socialSecurityEmployee;
      totalSSEmployer += record.socialSecurityEmployer;
      totalHFEmployee += record.housingFundEmployee;
      totalHFEmployer += record.housingFundEmployer;
      grossSalaries.push(record.grossSalary);
    }

    grossSalaries.sort((a, b) => a - b);
    const medianGrossSalary =
      grossSalaries.length > 0
        ? grossSalaries[Math.floor(grossSalaries.length / 2)]
        : 0;

    const departmentBreakdown = departments.map((dept) => {
      const deptRecords = payrollRecords.filter((r) => {
        const emp = dataStore.getEmployee(r.employeeId);
        return emp?.departmentId === dept.id;
      });
      const deptTotalGross = deptRecords.reduce((sum, r) => sum + r.grossSalary, 0);
      const summary = dataStore.getDepartmentSummary(dept.id, year, month);

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        employeeCount: deptRecords.length,
        totalGross: Math.round(deptTotalGross * 100) / 100,
        averageGross: deptRecords.length > 0
          ? Math.round((deptTotalGross / deptRecords.length) * 100) / 100
          : 0,
        budgetUsage: summary?.budgetUsage || 0,
      };
    });

    const taxBrackets = [
      { label: '0-3k', min: 0, max: 3000 },
      { label: '3k-12k', min: 3000, max: 12000 },
      { label: '12k-25k', min: 12000, max: 25000 },
      { label: '25k-35k', min: 25000, max: 35000 },
      { label: '35k-55k', min: 35000, max: 55000 },
      { label: '55k-80k', min: 55000, max: 80000 },
      { label: '80k+', min: 80000, max: Infinity },
    ];

    const taxDistribution = taxBrackets.map((bracket) => {
      const records = payrollRecords.filter(
        (r) => r.taxableIncome >= bracket.min && r.taxableIncome < bracket.max
      );
      const totalBracketTax = records.reduce((sum, r) => sum + r.taxWithheld, 0);

      return {
        bracket: bracket.label,
        count: records.length,
        totalTax: Math.round(totalBracketTax * 100) / 100,
        averageTax: records.length > 0
          ? Math.round((totalBracketTax / records.length) * 100) / 100
          : 0,
      };
    });

    let yearOverYear = null;
    const prevYearRecords = dataStore.getPayrollByMonth(year - 1, month);
    if (prevYearRecords.length > 0) {
      const prevTotal = prevYearRecords.reduce((sum, r) => sum + r.grossSalary, 0);
      yearOverYear = {
        current: Math.round(totalGrossSalary * 100) / 100,
        previous: Math.round(prevTotal * 100) / 100,
        growthRate: prevTotal > 0
          ? Math.round(((totalGrossSalary - prevTotal) / prevTotal) * 10000) / 100
          : 0,
      };
    }

    let monthOverMonth = null;
    let prevMonth = month - 1;
    let prevMonthYear = year;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevMonthYear = year - 1;
    }
    const prevMonthRecords = dataStore.getPayrollByMonth(prevMonthYear, prevMonth);
    if (prevMonthRecords.length > 0) {
      const prevTotal = prevMonthRecords.reduce((sum, r) => sum + r.grossSalary, 0);
      monthOverMonth = {
        current: Math.round(totalGrossSalary * 100) / 100,
        previous: Math.round(prevTotal * 100) / 100,
        growthRate: prevTotal > 0
          ? Math.round(((totalGrossSalary - prevTotal) / prevTotal) * 10000) / 100
          : 0,
      };
    }

    const analysis: PayrollAnalysis = {
      year,
      month,
      totalEmployees: payrollRecords.length,
      totalGrossSalary: Math.round(totalGrossSalary * 100) / 100,
      totalNetSalary: Math.round(totalNetSalary * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      totalSocialSecurity: {
        employee: Math.round(totalSSEmployee * 100) / 100,
        employer: Math.round(totalSSEmployer * 100) / 100,
      },
      totalHousingFund: {
        employee: Math.round(totalHFEmployee * 100) / 100,
        employer: Math.round(totalHFEmployer * 100) / 100,
      },
      averageGrossSalary: payrollRecords.length > 0
        ? Math.round((totalGrossSalary / payrollRecords.length) * 100) / 100
        : 0,
      averageNetSalary: payrollRecords.length > 0
        ? Math.round((totalNetSalary / payrollRecords.length) * 100) / 100
        : 0,
      medianGrossSalary: Math.round(medianGrossSalary * 100) / 100,
      averageCostPerEmployee: payrollRecords.length > 0
        ? Math.round(
            ((totalGrossSalary + totalSSEmployer + totalHFEmployer) / payrollRecords.length) * 100
          ) / 100
        : 0,
      departmentBreakdown,
      taxDistribution,
      yearOverYear,
      monthOverMonth,
    };

    dataStore.addAuditLog({
      userId: 'system',
      userName: 'System',
      action: 'generate_analysis',
      module: 'report_generator',
      details: { year, month, employeeCount: payrollRecords.length },
    });

    return analysis;
  }

  async exportToExcel(
    analysis: PayrollAnalysis,
    payrollRecords: PayrollRecord[]
  ): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = '薪酬管理系统';
    workbook.created = new Date();

    const summarySheet = workbook.addWorksheet('汇总分析');
    summarySheet.columns = [
      { header: '指标', key: 'metric', width: 30 },
      { header: '数值', key: 'value', width: 20 },
    ];

    const a = analysis;
    summarySheet.addRows([
      { metric: '月份', value: `${a.year}年${a.month}月` },
      { metric: '员工总数', value: a.totalEmployees },
      { metric: '应发工资总额', value: a.totalGrossSalary },
      { metric: '实发工资总额', value: a.totalNetSalary },
      { metric: '个税总额', value: a.totalTax },
      { metric: '社保-个人部分', value: a.totalSocialSecurity.employee },
      { metric: '社保-企业部分', value: a.totalSocialSecurity.employer },
      { metric: '公积金-个人部分', value: a.totalHousingFund.employee },
      { metric: '公积金-企业部分', value: a.totalHousingFund.employer },
      { metric: '人均应发工资', value: a.averageGrossSalary },
      { metric: '人均实发工资', value: a.averageNetSalary },
      { metric: '应发工资中位数', value: a.medianGrossSalary },
      { metric: '人均总成本', value: a.averageCostPerEmployee },
    ]);

    if (a.yearOverYear) {
      summarySheet.addRow({ metric: '同比增长率', value: `${a.yearOverYear.growthRate}%` });
    }
    if (a.monthOverMonth) {
      summarySheet.addRow({ metric: '环比增长率', value: `${a.monthOverMonth.growthRate}%` });
    }

    const deptSheet = workbook.addWorksheet('部门对比');
    deptSheet.columns = [
      { header: '部门', key: 'name', width: 20 },
      { header: '人数', key: 'count', width: 10 },
      { header: '应发总额', key: 'total', width: 15 },
      { header: '人均应发', key: 'avg', width: 15 },
      { header: '预算使用率', key: 'budget', width: 15 },
    ];

    a.departmentBreakdown.forEach((dept) => {
      deptSheet.addRow({
        name: dept.departmentName,
        count: dept.employeeCount,
        total: dept.totalGross,
        avg: dept.averageGross,
        budget: `${dept.budgetUsage}%`,
      });
    });

    const taxSheet = workbook.addWorksheet('个税分布');
    taxSheet.columns = [
      { header: '应纳税所得额区间', key: 'bracket', width: 15 },
      { header: '人数', key: 'count', width: 10 },
      { header: '个税总额', key: 'totalTax', width: 15 },
      { header: '平均个税', key: 'avgTax', width: 15 },
    ];

    a.taxDistribution.forEach((d) => {
      taxSheet.addRow(d);
    });

    const detailSheet = workbook.addWorksheet('工资明细');
    detailSheet.columns = [
      { header: '工号', key: 'employeeNo', width: 12 },
      { header: '姓名', key: 'name', width: 10 },
      { header: '部门', key: 'department', width: 15 },
      { header: '应发工资', key: 'gross', width: 12 },
      { header: '社保', key: 'ss', width: 10 },
      { header: '公积金', key: 'hf', width: 10 },
      { header: '个税', key: 'tax', width: 10 },
      { header: '实发工资', key: 'net', width: 12 },
    ];

    for (const record of payrollRecords) {
      const emp = dataStore.getEmployee(record.employeeId);
      const dept = emp ? dataStore.getDepartment(emp.departmentId) : null;
      detailSheet.addRow({
        employeeNo: emp?.employeeNo || '',
        name: emp?.name || '',
        department: dept?.name || '',
        gross: record.grossSalary,
        ss: record.socialSecurityEmployee,
        hf: record.housingFundEmployee,
        tax: record.taxWithheld,
        net: record.netSalary,
      });
    }

    const exportDir = config.paths.exportsDir;
    const fileName = `payroll_analysis_${a.year}${a.month.toString().padStart(2, '0')}.xlsx`;
    const filePath = path.join(exportDir, fileName);

    await workbook.xlsx.writeFile(filePath);

    logger.info(`Excel report exported to ${filePath}`);

    return filePath;
  }

  private drawBarChart(
    doc: typeof PDFDocument.prototype,
    x: number,
    y: number,
    width: number,
    height: number,
    data: { label: string; value: number; color?: string }[],
    title: string
  ): void {
    const validData = data.filter((d) => isFinite(d.value) && d.value > 0);
    
    if (validData.length === 0) {
      doc.fontSize(10).font('Helvetica-Bold').text(title, x, y - 20, { width });
      doc.font('Helvetica').fontSize(8).fillColor('#999').text('暂无数据', x, y + 50, { width, align: 'center' });
      doc.fillColor('#333');
      return;
    }

    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding - 20;
    const maxValue = Math.max(...validData.map((d) => d.value), 1);
    const barWidth = (chartWidth / validData.length) * 0.7;
    const barGap = (chartWidth / validData.length) * 0.3;

    doc.fontSize(10).font('Helvetica-Bold').text(title, x, y - 20, { width });
    doc.font('Helvetica');

    validData.forEach((item, i) => {
      const barHeight = (item.value / maxValue) * chartHeight;
      const barX = x + padding + i * (barWidth + barGap);
      const barY = y + padding + chartHeight - barHeight;

      const color = item.color || this.getChartColor(i);
      doc.fillColor(color).rect(barX, barY, barWidth, barHeight).fill();

      doc.fillColor('#333').fontSize(8);
      doc.text(item.label, barX, y + padding + chartHeight + 5, { width: barWidth, align: 'center' });
      doc.text(`¥${Math.round(item.value).toLocaleString()}`, barX, barY - 12, { width: barWidth, align: 'center' });
    });

    doc.strokeColor('#ccc').lineWidth(0.5);
    doc.moveTo(x + padding, y + padding);
    doc.lineTo(x + padding, y + padding + chartHeight);
    doc.lineTo(x + padding + chartWidth, y + padding + chartHeight);
    doc.stroke();

    doc.fillColor('#333');
  }

  private drawPieChart(
    doc: typeof PDFDocument.prototype,
    x: number,
    y: number,
    radius: number,
    data: { label: string; value: number; color?: string }[],
    title: string
  ): void {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    
    if (total <= 0) {
      doc.fontSize(10).font('Helvetica-Bold').text(title, x - radius, y, { width: radius * 2, align: 'center' });
      doc.font('Helvetica').fontSize(8).fillColor('#999').text('暂无数据', x - radius, y + radius, { width: radius * 2, align: 'center' });
      doc.fillColor('#333');
      return;
    }

    let startAngle = -Math.PI / 2;
    const centerX = x + radius;
    const centerY = y + radius + 20;

    doc.fontSize(10).font('Helvetica-Bold').text(title, x - radius, y, { width: radius * 2, align: 'center' });
    doc.font('Helvetica');

    data.forEach((item, i) => {
      if (item.value <= 0) return;

      const sliceAngle = (item.value / total) * Math.PI * 2;
      const color = item.color || this.getChartColor(i);

      doc.fillColor(color);
      doc.moveTo(centerX, centerY);
      doc.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      doc.lineTo(centerX, centerY);
      doc.fill();

      const midAngle = startAngle + sliceAngle / 2;
      const labelX = centerX + Math.cos(midAngle) * (radius + 20);
      const labelY = centerY + Math.sin(midAngle) * (radius + 20);

      doc.fillColor('#333').fontSize(8);
      const percentage = ((item.value / total) * 100).toFixed(1);
      doc.text(`${item.label} ${percentage}%`, labelX - 30, labelY, { width: 60, align: 'center' });

      startAngle += sliceAngle;
    });

    doc.fillColor('#333');
  }

  private getChartColor(index: number): string {
    const colors = [
      '#4472C4',
      '#ED7D31',
      '#A5A5A5',
      '#FFC000',
      '#5B9BD5',
      '#70AD47',
      '#7030A0',
      '#C00000',
      '#00B050',
      '#00B0F0',
    ];
    return colors[index % colors.length];
  }

  async exportToPDF(analysis: PayrollAnalysis): Promise<string> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const exportDir = config.paths.exportsDir;
      const fileName = `payroll_analysis_${analysis.year}${analysis.month.toString().padStart(2, '0')}.pdf`;
      const filePath = path.join(exportDir, fileName);
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      doc.fontSize(24).font('Helvetica-Bold').fillColor('#2c5aa0').text('薪酬分析报告', { align: 'center' });
      doc.moveDown();
      doc.fontSize(16).fillColor('#666').text(`${analysis.year}年${analysis.month}月`, { align: 'center' });
      doc.moveDown(2);
      doc.fillColor('#333').font('Helvetica');

      doc.fontSize(14).font('Helvetica-Bold').text('一、总体概况', { underline: true });
      doc.moveDown();
      doc.fontSize(11).font('Helvetica');

      const summaryItems = [
        { label: '员工总数', value: `${analysis.totalEmployees} 人` },
        { label: '应发工资总额', value: `¥${analysis.totalGrossSalary.toLocaleString()}` },
        { label: '实发工资总额', value: `¥${analysis.totalNetSalary.toLocaleString()}` },
        { label: '个税总额', value: `¥${analysis.totalTax.toLocaleString()}` },
        { label: '人均应发工资', value: `¥${analysis.averageGrossSalary.toLocaleString()}` },
        { label: '人均实发工资', value: `¥${analysis.averageNetSalary.toLocaleString()}` },
        { label: '人均总成本', value: `¥${analysis.averageCostPerEmployee.toLocaleString()}` },
      ];

      summaryItems.forEach((item) => {
        doc.text(`• ${item.label}: ${item.value}`);
      });

      if (analysis.yearOverYear) {
        doc.text(`• 同比增长率: ${analysis.yearOverYear.growthRate}%`);
      }
      if (analysis.monthOverMonth) {
        doc.text(`• 环比增长率: ${analysis.monthOverMonth.growthRate}%`);
      }

      doc.moveDown(2);

      const costBreakdown = [
        { label: '应发工资', value: analysis.totalGrossSalary, color: '#4472C4' },
        { label: '社保企业', value: analysis.totalSocialSecurity.employer, color: '#ED7D31' },
        { label: '公积金企业', value: analysis.totalHousingFund.employer, color: '#70AD47' },
      ];

      const pageWidth = 500;
      this.drawPieChart(doc, 100, doc.y, 80, costBreakdown, '人力成本构成');

      doc.moveDown(5);
      doc.fontSize(14).font('Helvetica-Bold').text('二、部门对比', { underline: true });
      doc.moveDown();
      doc.font('Helvetica');

      const deptChartData = analysis.departmentBreakdown
        .filter((d) => d.totalGross > 0)
        .map((d) => ({
          label: d.departmentName.slice(0, 4),
          value: d.totalGross,
        }));

      if (deptChartData.length > 0) {
        this.drawBarChart(doc, 50, doc.y, 480, 180, deptChartData, '各部门薪酬总额对比');
      }

      doc.moveDown(6);
      doc.fontSize(11);
      analysis.departmentBreakdown.forEach((dept) => {
        doc.text(
          `• ${dept.departmentName}: ${dept.employeeCount}人, 总额¥${dept.totalGross.toLocaleString()}, 人均¥${dept.averageGross.toLocaleString()}, 预算使用率${dept.budgetUsage}%`
        );
      });

      doc.addPage();
      doc.fontSize(14).font('Helvetica-Bold').text('三、个税分布', { underline: true });
      doc.moveDown();
      doc.font('Helvetica');

      const taxChartData = analysis.taxDistribution
        .filter((d) => d.count > 0)
        .map((d) => ({
          label: d.bracket,
          value: d.count,
        }));

      if (taxChartData.length > 0) {
        this.drawBarChart(doc, 50, doc.y, 480, 180, taxChartData, '各税级人数分布');
      }

      doc.moveDown(6);
      doc.fontSize(11);
      analysis.taxDistribution.forEach((d) => {
        if (d.count > 0) {
          doc.text(
            `• ${d.bracket}区间: ${d.count}人, 个税总额¥${d.totalTax.toLocaleString()}, 人均¥${d.averageTax.toLocaleString()}`
          );
        }
      });

      doc.moveDown(2);

      const avgChartData = analysis.departmentBreakdown
        .filter((d) => d.averageGross > 0)
        .map((d) => ({
          label: d.departmentName.slice(0, 4),
          value: d.averageGross,
        }));

      if (avgChartData.length > 0) {
        this.drawBarChart(doc, 50, doc.y, 480, 180, avgChartData, '各部门人均薪酬对比');
      }

      doc.moveDown(10);
      doc.fontSize(10).fillColor('#999').text('--- 报告由企业薪酬管理系统自动生成 ---', { align: 'center' });

      doc.end();

      stream.on('finish', () => {
        logger.info(`PDF report exported to ${filePath}`);
        resolve(filePath);
      });

      stream.on('error', reject);
    });
  }

  async generateMonthlyReport(
    year: number,
    month: number
  ): Promise<{
    analysis: PayrollAnalysis;
    excelPath: string;
    pdfPath: string;
  }> {
    const analysis = await this.generatePayrollAnalysis(year, month);
    const payrollRecords = dataStore.getPayrollByMonth(year, month);

    const excelPath = await this.exportToExcel(analysis, payrollRecords);
    const pdfPath = await this.exportToPDF(analysis);

    dataStore.addAuditLog({
      userId: 'system',
      userName: 'System',
      action: 'generate_monthly_report',
      module: 'report_generator',
      details: {
        year,
        month,
        excelPath,
        pdfPath,
      },
    });

    return { analysis, excelPath, pdfPath };
  }
}

export const reportGenerator = new ReportGenerator();
