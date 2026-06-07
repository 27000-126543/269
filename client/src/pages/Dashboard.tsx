import { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, message, Spin } from 'antd';
import { DollarOutlined, TeamOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { payrollApi, employeeApi, EmployeeInfo } from '../services/api';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null);
  const [payrollCount, setPayrollCount] = useState(0);
  const [totalNet, setTotalNet] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [empData, payrollData] = await Promise.all([
        employeeApi.getMe(),
        payrollApi.getMyPayroll(),
      ]);
      setEmployee(empData);
      setPayrollCount(payrollData.length);
      const total = payrollData.reduce((sum, p) => sum + p.netSalary, 0);
      setTotalNet(total);
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '100px' }}><Spin size="large" /></div>;
  }

  return (
    <div>
      <h2 style={{ marginBottom: '24px' }}>欢迎回来，{employee?.name}！</h2>
      
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="本月工资条"
              value={payrollCount}
              suffix="条"
              prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="累计实发工资"
              value={totalNet}
              precision={2}
              prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="所在部门"
              value={employee?.departmentName || '-'}
              prefix={<TeamOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="职位"
              value={employee?.position || '-'}
              prefix={<CheckCircleOutlined style={{ color: '#fa8c16' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: '24px' }} title="员工信息">
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <p><strong>工号：</strong>{employee?.employeeNo}</p>
            <p><strong>姓名：</strong>{employee?.name}</p>
            <p><strong>邮箱：</strong>{employee?.email}</p>
          </Col>
          <Col span={12}>
            <p><strong>电话：</strong>{employee?.phone}</p>
            <p><strong>入职日期：</strong>{employee?.hireDate}</p>
            <p><strong>基本工资：</strong>¥{employee?.baseSalary?.toLocaleString()}</p>
          </Col>
        </Row>
      </Card>
    </div>
  );
}
