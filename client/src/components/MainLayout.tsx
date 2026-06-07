import { Layout, Menu, Button, Dropdown, Avatar } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  FileTextOutlined,
  FormOutlined,
  CheckCircleOutlined,
  BarChartOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { UserInfo } from '../services/api';

const { Header, Content, Sider } = Layout;

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const userStr = localStorage.getItem('user');
  const user: UserInfo | null = userStr ? JSON.parse(userStr) : null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '工作台',
    },
    {
      key: '/payslip',
      icon: <FileTextOutlined />,
      label: '工资条',
    },
    {
      key: '/deduction',
      icon: <FormOutlined />,
      label: '专项扣除',
    },
    ...(user?.approvalLevel && user.approvalLevel >= 0
      ? [
          {
            key: '/approval',
            icon: <CheckCircleOutlined />,
            label: '审批中心',
          },
        ]
      : []),
    {
      key: '/report',
      icon: <BarChartOutlined />,
      label: '薪酬报告',
    },
  ];

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header className="layout-header" style={{ background: '#001529', padding: '0 24px' }}>
        <div className="logo">
          <span style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>
            企业薪酬管理系统
          </span>
        </div>
        <div className="user-info">
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <span>{user?.name}</span>
            </div>
          </Dropdown>
        </div>
      </Header>
      <Layout>
        <Sider width={200} style={{ background: '#fff' }}>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            style={{ height: '100%', borderRight: 0 }}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
          />
        </Sider>
        <Layout style={{ padding: '0' }}>
          <Content className="page-content">
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}
