import { useEffect, useState } from 'react';
import { Form, InputNumber, Button, Card, message, Tabs, List, Tag, Spin } from 'antd';
import { deductionApi } from '../services/api';

export default function DeductionSubmit() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [current, setCurrent] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [currentData, requestsData] = await Promise.all([
        deductionApi.getCurrent(),
        deductionApi.getMyRequests(),
      ]);
      setCurrent(currentData);
      setRequests(requestsData);
      if (currentData?.specialDeductions) {
        form.setFieldsValue(currentData.specialDeductions);
      }
    } catch (error) {
      message.error('加载数据失败');
    }
  };

  const onSubmit = async (values: any) => {
    setLoading(true);
    try {
      const result = await deductionApi.submitSpecialDeduction(values);
      if (result.success) {
        message.success('提交成功，请等待HR审核');
        loadData();
      } else {
        message.error(result.message || '提交失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '提交失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'approved': return 'green';
      case 'rejected': return 'red';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待审核';
      case 'approved': return '已通过';
      case 'rejected': return '已驳回';
      default: return status;
    }
  };

  return (
    <div>
      <Card title="专项附加扣除变更申请">
        <p style={{ marginBottom: '20px', color: '#666' }}>
          当前专项扣除金额（月度），修改后需HR审核通过后生效
        </p>
        <Form
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          style={{ maxWidth: '600px' }}
        >
          <Form.Item name="childEducation" label="子女教育（元/月）" initialValue={0}>
            <InputNumber min={0} max={2000} step={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="continuingEducation" label="继续教育（元/月）" initialValue={0}>
            <InputNumber min={0} max={400} step={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="housingLoanInterest" label="住房贷款利息（元/月）" initialValue={0}>
            <InputNumber min={0} max={1000} step={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="housingRent" label="住房租金（元/月）" initialValue={0}>
            <InputNumber min={0} max={1500} step={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="elderlySupport" label="赡养老人（元/月）" initialValue={0}>
            <InputNumber min={0} max={3000} step={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="infantCare" label="婴幼儿照护（元/月）" initialValue={0}>
            <InputNumber min={0} max={2000} step={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              提交变更申请
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="申请记录" style={{ marginTop: '24px' }}>
        <List
          dataSource={requests}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <span>
                    {new Date(item.createdAt).toLocaleDateString()} 提交的变更申请
                    <Tag color={getStatusColor(item.status)} style={{ marginLeft: '12px' }}>
                      {getStatusText(item.status)}
                    </Tag>
                  </span>
                }
                description={
                  <div>
                    {item.changes && Object.entries(item.changes).map(([key, value]) => (
                      <span key={key} style={{ marginRight: '12px' }}>
                        {key}: {String(value)}
                      </span>
                    ))}
                    {item.reviewComment && (
                      <p style={{ marginTop: '8px', color: '#666' }}>
                        审核意见：{item.reviewComment}
                      </p>
                    )}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
}
