import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, message, Spin, Card } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { payrollApi } from '../services/api';

export default function PayslipDetail() {
  const { year, month } = useParams<{ year: string; month: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [year, month]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await payrollApi.getDetail(parseInt(year!), parseInt(month!));
      setData(result);
    } catch (error) {
      message.error('加载工资条详情失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '100px' }}><Spin size="large" /></div>;
  }

  if (!data) return null;

  const { payroll, employee, departmentName } = data;

  const formatMoney = (amount: number) => amount.toFixed(2);

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/payslip')}
        style={{ marginBottom: '16px' }}
      >
        返回列表
      </Button>

      <div className="payslip-container">
        <div className="payslip-header">
          <h2>企业薪酬管理系统</h2>
          <p style={{ color: '#666' }}>{year}年{month}月 工资条</p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <p><strong>员工姓名：</strong>{employee.name}</p>
          <p><strong>工号：</strong>{employee.employeeNo}</p>
          <p><strong>部门：</strong>{departmentName}</p>
          <p><strong>职位：</strong>{employee.position}</p>
        </div>

        <h4 style={{ marginBottom: '12px' }}>收入明细</h4>
        <table className="payslip-table">
          <thead>
            <tr>
              <th>项目</th>
              <th style={{ textAlign: 'right', width: '120px' }}>金额</th>
            </tr>
          </thead>
          <tbody>
            {payroll.earnings.map((e: any, i: number) => (
              <tr key={i}>
                <td>{e.name}</td>
                <td style={{ textAlign: 'right' }}>{formatMoney(e.amount)}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td>应发工资合计</td>
              <td style={{ textAlign: 'right' }}>{formatMoney(payroll.grossSalary)}</td>
            </tr>
          </tbody>
        </table>

        <h4 style={{ marginBottom: '12px' }}>扣除明细</h4>
        <table className="payslip-table">
          <thead>
            <tr>
              <th>项目</th>
              <th style={{ textAlign: 'right', width: '120px' }}>金额</th>
            </tr>
          </thead>
          <tbody>
            {payroll.deductions.map((d: any, i: number) => (
              <tr key={i}>
                <td>{d.name}</td>
                <td style={{ textAlign: 'right' }}>{formatMoney(d.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h4 style={{ marginBottom: '12px' }}>专项附加扣除</h4>
        <table className="payslip-table">
          <tbody>
            <tr>
              <td>子女教育</td>
              <td style={{ textAlign: 'right', width: '120px' }}>{formatMoney(payroll.specialDeductions.childEducation)}</td>
            </tr>
            <tr>
              <td>继续教育</td>
              <td style={{ textAlign: 'right' }}>{formatMoney(payroll.specialDeductions.continuingEducation)}</td>
            </tr>
            <tr>
              <td>住房贷款利息</td>
              <td style={{ textAlign: 'right' }}>{formatMoney(payroll.specialDeductions.housingLoanInterest)}</td>
            </tr>
            <tr>
              <td>住房租金</td>
              <td style={{ textAlign: 'right' }}>{formatMoney(payroll.specialDeductions.housingRent)}</td>
            </tr>
            <tr>
              <td>赡养老人</td>
              <td style={{ textAlign: 'right' }}>{formatMoney(payroll.specialDeductions.elderlySupport)}</td>
            </tr>
            <tr>
              <td>婴幼儿照护</td>
              <td style={{ textAlign: 'right' }}>{formatMoney(payroll.specialDeductions.infantCare)}</td>
            </tr>
          </tbody>
        </table>

        <div className="net-salary">
          实发工资：¥{formatMoney(payroll.netSalary)}
        </div>
      </div>
    </div>
  );
}
