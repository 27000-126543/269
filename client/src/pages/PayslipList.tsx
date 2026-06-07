import { useEffect, useState } from 'react';
import { Table, Card, Tag, Button, Space, message, Spin, Select } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { payrollApi, PayrollRecord } from '../services/api';
import dayjs from 'dayjs';

const { Option } = Select;

export default function PayslipList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [year, setYear] = useState(dayjs().year());

  const years = Array.from({ length: 5 }, (_, i) => dayjs().year() - i);

  useEffect(() => {
    loadData();
  }, [year]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await payrollApi.getMyPayroll(year);
      setPayrolls(data);
    } catch (error) {
      message.error('加载工资条失败');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '月份',
      dataIndex: 'month',
      key: 'month',
      render: (m: number, record: PayrollRecord) => `${record.year}年${m}月`,
    },
    {
      title: '应发工资',
      dataIndex: 'grossSalary',
      key: 'grossSalary',
      render: (v: number) => `¥${v.toFixed(2)}`,
    },
    {
      title: '社保(个人)',
      dataIndex: 'socialSecurityEmployee',
      key: 'socialSecurityEmployee',
      render: (v: number) => `¥${v.toFixed(2)}`,
    },
    {
      title: '公积金(个人)',
      dataIndex: 'housingFundEmployee',
      key: 'housingFundEmployee',
      render: (v: number) => `¥${v.toFixed(2)}`,
    },
    {
      title: '个税',
      dataIndex: 'taxWithheld',
      key: 'taxWithheld',
      render: (v: number) => `¥${v.toFixed(2)}`,
    },
    {
      title: '实发工资',
      dataIndex: 'netSalary',
      key: 'netSalary',
      render: (v: number) => <strong style={{ color: '#2c5aa0' }}>¥{v.toFixed(2)}</strong>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: PayrollRecord) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/payslip/${record.year}/${record.month}`)}
        >
          查看详情
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="我的工资条"
        extra={
          <Space>
            <span>年份：</span>
            <Select value={year} onChange={setYear} style={{ width: 120 }}>
              {years.map((y) => (
                <Option key={y} value={y}>
                  {y}年
                </Option>
              ))}
            </Select>
          </Space>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={payrolls}
            rowKey="id"
            pagination={false}
          />
        )}
      </Card>
    </div>
  );
}
