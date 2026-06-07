import { useEffect, useState } from 'react';
import { Table, Card, Tag, Button, Space, Modal, Input, message, Spin, Tabs } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { approvalApi, DepartmentSummary } from '../services/api';
import dayjs from 'dayjs';

const { TextArea } = Input;

export default function ApprovalList() {
  const [loading, setLoading] = useState(true);
  const [pendingList, setPendingList] = useState<DepartmentSummary[]>([]);
  const [historyList, setHistoryList] = useState<DepartmentSummary[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'approve' | 'reject'>('approve');
  const [selectedItem, setSelectedItem] = useState<DepartmentSummary | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pending, history] = await Promise.all([
        approvalApi.getPending(),
        approvalApi.getHistory(),
      ]);
      setPendingList(pending);
      setHistoryList(history);
    } catch (error) {
      message.error('加载审批数据失败');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type: 'approve' | 'reject', item: DepartmentSummary) => {
    setModalType(type);
    setSelectedItem(item);
    setComment('');
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!selectedItem) return;

    if (modalType === 'reject' && !comment.trim()) {
      message.error('请填写驳回原因');
      return;
    }

    setSubmitting(true);
    try {
      let result;
      if (modalType === 'approve') {
        result = await approvalApi.approve(
          selectedItem.departmentId,
          selectedItem.year,
          selectedItem.month,
          comment
        );
      } else {
        result = await approvalApi.reject(
          selectedItem.departmentId,
          selectedItem.year,
          selectedItem.month,
          comment
        );
      }

      if (result.success) {
        message.success(modalType === 'approve' ? '审批通过' : '已驳回');
        setModalVisible(false);
        loadData();
      } else {
        message.error(result.message || '操作失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string, frozen?: boolean) => {
    if (frozen) return 'red';
    switch (status) {
      case 'pending': return 'orange';
      case 'approved': return 'green';
      case 'rejected': return 'red';
      case 'frozen': return 'red';
      default: return 'default';
    }
  };

  const getStatusText = (status: string, frozen?: boolean) => {
    if (frozen) return '已冻结';
    switch (status) {
      case 'pending': return '待审批';
      case 'approved': return '已通过';
      case 'rejected': return '已驳回';
      case 'frozen': return '已冻结';
      default: return status;
    }
  };

  const columns = [
    {
      title: '部门',
      dataIndex: 'departmentName',
      key: 'departmentName',
    },
    {
      title: '月份',
      key: 'month',
      render: (_: any, record: DepartmentSummary) => `${record.year}年${record.month}月`,
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
      title: '预算',
      dataIndex: 'budget',
      key: 'budget',
      render: (v: number) => `¥${v.toLocaleString()}`,
    },
    {
      title: '预算使用率',
      dataIndex: 'budgetUsage',
      key: 'budgetUsage',
      render: (v: number) => `${v}%`,
    },
    {
      title: '状态',
      key: 'status',
      render: (_: any, record: DepartmentSummary) => (
        <Tag color={getStatusColor(record.approvalStatus, record.frozen)}>
          {getStatusText(record.approvalStatus, record.frozen)}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: DepartmentSummary) => {
        if (record.approvalStatus === 'pending' || record.frozen) {
          return (
            <Space>
              <Button
                type="primary"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => openModal('approve', record)}
              >
                通过
              </Button>
              <Button
                danger
                size="small"
                icon={<CloseOutlined />}
                onClick={() => openModal('reject', record)}
              >
                驳回
              </Button>
            </Space>
          );
        }
        return null;
      },
    },
  ];

  return (
    <div>
      <Card title="审批中心">
        <Tabs
          items={[
            {
              key: 'pending',
              label: `待我审批 (${pendingList.length})`,
              children: (
                <Table
                  columns={columns}
                  dataSource={pendingList}
                  rowKey={(r) => `${r.departmentId}-${r.year}-${r.month}`}
                  loading={loading}
                  pagination={false}
                />
              ),
            },
            {
              key: 'history',
              label: '审批历史',
              children: (
                <Table
                  columns={columns}
                  dataSource={historyList}
                  rowKey={(r) => `${r.departmentId}-${r.year}-${r.month}`}
                  loading={loading}
                  pagination
                />
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={modalType === 'approve' ? '确认通过' : '确认驳回'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={submitting}
        okText={modalType === 'approve' ? '确认通过' : '确认驳回'}
        okButtonProps={{ danger: modalType === 'reject' }}
      >
        <p>
          确定要{modalType === 'approve' ? '通过' : '驳回'}{' '}
          <strong>{selectedItem?.departmentName}</strong>{' '}
          {selectedItem?.year}年{selectedItem?.month}月的薪酬发放吗？
        </p>
        <p style={{ marginTop: '16px' }}>
          {modalType === 'reject' ? '驳回原因（必填）：' : '审批意见（选填）：'}
        </p>
        <TextArea
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={modalType === 'reject' ? '请输入驳回原因' : '请输入审批意见'}
        />
      </Modal>
    </div>
  );
}
