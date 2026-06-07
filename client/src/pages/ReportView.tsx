import { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Space,
  Select,
  message,
  Spin,
  Table,
  Progress,
} from 'antd';
import { DownloadOutlined, FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import { reportApi, PayrollAnalysis } from '../services/api';
import dayjs from 'dayjs';

const { Option } = Select;

export default function ReportView() {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<PayrollAnalysis | null>(null);
  const [year, setYear] = useState(dayjs().year());
  const [month, setMonth] = useState(dayjs().month() + 1);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  const years = Array.from({ length: 5 }, (_, i) => dayjs().year() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  useEffect(() => {
    loadData();
  }, [year, month]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await reportApi.getAnalysis(year, month);
      setAnalysis(data);
    } catch (error) {
      message.error('加载报告数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type: 'pdf' | 'excel') => {
    setExporting(type);
    try {
      let result;
      if (type === 'pdf') {
        result = await reportApi.exportPdf(year, month);
      } else {
        result = await reportApi.exportExcel(year, month);
      }
      window.open(result.downloadUrl, '_blank');
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '100px' }}><Spin size="large" /></div>;
  }

  if (!analysis) return null;

  const deptColumns = [
    {
      title: '部门',
      dataIndex: 'departmentName',
      key: 'departmentName',
    },
    {
      title: '人数',
      dataIndex: 'employeeCount',
      key: 'employeeCount',
    },
    {
      title: '薪酬总额',
      dataIndex: 'totalGross',
      key: 'totalGross',
      render: (v: number) => `¥${v.toLocaleString()}`,
    },
    {
      title: '人均薪酬',
      dataIndex: 'averageGross',
      key: 'averageGross',
      render: (v: number) => `¥${v.toLocaleString()}`,
    },
    {
      title: '预算使用率',
      key: 'budgetUsage',
      render: (_: any, record: any) => (
        <Progress
          percent={Math.min(record.budgetUsage, 100)}
          size="small"
          status={record.budgetUsage > 100 ? 'exception' : 'normal'}
          format={(percent) => `${record.budgetUsage}%`}
        />
      ),
    },
  ];

  const taxColumns = [
    {
      title: '税级区间',
      dataIndex: 'bracket',
      key: 'bracket',
    },
    {
      title: '人数',
      dataIndex: 'count',
      key: 'count',
    },
    {
      title: '个税总额',
      dataIndex: 'totalTax',
      key: 'totalTax',
      render: (v: number) => `¥${v.toLocaleString()}`,
    },
    {
      title: '人均个税',
      dataIndex: 'averageTax',
      key: 'averageTax',
      render: (v: number) => `¥${v.toLocaleString()}`,
    },
  ];

  return (
    <div>
      <Card
        title={`${year}年${month}月 薪酬分析报告`}
        extra={
          <Space>
            <Select value={year} onChange={setYear} style={{ width: 100 }}>
              {years.map((y) => (
                <Option key={y} value={y}>{y}年</Option>
              ))}
            </Select>
            <Select value={month} onChange={setMonth} style={{ width: 80 }}>
              {months.map((m) => (
                <Option key={m} value={m}>{m}月</Option>
              ))}
            </Select>
            <Button
              icon={<FilePdfOutlined />}
              onClick={() => handleExport('pdf')}
              loading={exporting === 'pdf'}
            >
              导出PDF
            </Button>
            <Button
              icon={<FileExcelOutlined />}
              onClick={() => handleExport('excel')}
              loading={exporting === 'excel'}
            >
              导出Excel
            </Button>
          </Space>
        }
      >
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic title="员工总数" value={analysis.totalEmployees} suffix="人" />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="应发总额"
                value={analysis.totalGrossSalary}
                precision={0}
                prefix="¥"
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="实发总额"
                value={analysis.totalNetSalary}
                precision={0}
                prefix="¥"
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="个税总额"
                value={analysis.totalTax}
                precision={0}
                prefix="¥"
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={12} sm={8}>
            <Card size="small">
              <Statistic
                title="人均应发"
                value={analysis.averageGrossSalary}
                precision={0}
                prefix="¥"
              />
            </Card>
          </Col>
          <Col xs={12} sm={8}>
            <Card size="small">
              <Statistic
                title="人均实发"
                value={analysis.averageNetSalary}
                precision={0}
                prefix="¥"
              />
            </Card>
          </Col>
          <Col xs={12} sm={8}>
            <Card size="small">
              <Statistic
                title="人均总成本"
                value={analysis.averageCostPerEmployee}
                precision={0}
                prefix="¥"
              />
            </Card>
          </Col>
        </Row>

        {(analysis.yearOverYear || analysis.monthOverMonth) && (
          <Card size="small" title="趋势分析" style={{ marginBottom: '24px' }}>
            <Row gutter={16}>
              {analysis.yearOverYear && (
                <Col span={12}>
                  <p>
                    同比（{year - 1}年{month}月）：
                    <strong style={{
                      color: analysis.yearOverYear.growthRate >= 0 ? '#52c41a' : '#ff4d4f'
                    }}>
                      {analysis.yearOverYear.growthRate >= 0 ? '+' : ''}
                      {analysis.yearOverYear.growthRate}%
                    </strong>
                  </p>
                  <p style={{ color: '#999', fontSize: '12px' }}>
                    去年同期：¥{analysis.yearOverYear.previous.toLocaleString()}
                  </p>
                </Col>
              )}
              {analysis.monthOverMonth && (
                <Col span={12}>
                  <p>
                    环比（上月）：
                    <strong style={{
                      color: analysis.monthOverMonth.growthRate >= 0 ? '#52c41a' : '#ff4d4f'
                    }}>
                      {analysis.monthOverMonth.growthRate >= 0 ? '+' : ''}
                      {analysis.monthOverMonth.growthRate}%
                    </strong>
                  </p>
                  <p style={{ color: '#999', fontSize: '12px' }}>
                    上月：¥{analysis.monthOverMonth.previous.toLocaleString()}
                  </p>
                </Col>
              )}
            </Row>
          </Card>
        )}

        <Card title="部门薪酬对比" style={{ marginBottom: '24px' }}>
          <Table
            columns={deptColumns}
            dataSource={analysis.departmentBreakdown}
            rowKey="departmentId"
            pagination={false}
          />
        </Card>

        <Card title="个税分布">
          <Table
            columns={taxColumns}
            dataSource={analysis.taxDistribution.filter((d) => d.count > 0)}
            rowKey="bracket"
            pagination={false}
          />
        </Card>
      </Card>
    </div>
  );
}
