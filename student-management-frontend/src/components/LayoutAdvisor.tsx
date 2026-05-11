// src/components/LayoutAdvisor.tsx
import React, { useContext } from 'react';
import { Layout, Menu, Avatar, Dropdown, theme, Space } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import {
    DashboardOutlined,
    TeamOutlined,
    WarningOutlined,
    LineChartOutlined,
    UserOutlined,
    LogoutOutlined,
    ProfileOutlined,  
} from '@ant-design/icons';


const { Header, Sider, Content } = Layout;

const LayoutAdvisor: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, logout } = useContext(AuthContext)!;
    const navigate = useNavigate();
    const location = useLocation();
    const { token } = theme.useToken();

    const menuItems = [
        { key: '/', icon: <DashboardOutlined />, label: <Link to="/">Dashboard</Link> },
        { key: '/students', icon: <TeamOutlined />, label: <Link to="/students">Quản lý sinh viên</Link> },
        { key: '/warnings', icon: <WarningOutlined />, label: <Link to="/warnings">Cảnh báo học vụ</Link> },
        { key: '/analytics', icon: <LineChartOutlined />, label: <Link to="/analytics">Thống kê & Phân tích</Link> },
    ];

    // Dropdown menu cho avatar - THÊM ITEM PROFILE
    const dropdownItems = [
        {
            key: 'profile',
            icon: <ProfileOutlined />,
            label: 'Thông tin cá nhân',
            onClick: () => navigate('/profile'),
        },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'Đăng xuất',
            onClick: () => { logout(); navigate('/login'); },
        },
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider collapsible theme="dark">
                <div style={{ height: 64, background: token.colorPrimary, color: 'white', textAlign: 'center', lineHeight: '64px', fontWeight: 'bold' }}>
                    Cố vấn - Hệ thống
                </div>
                <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} items={menuItems} />
            </Sider>

            <Layout>
                <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <Space size="middle">
                        <NotificationBell />
                        <Dropdown menu={{ items: dropdownItems }} trigger={['click']}>
                            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Avatar icon={<UserOutlined />} />
                                <span>{user?.fullName || user?.username}</span>
                            </div>
                        </Dropdown>
                    </Space>
                </Header>

                <Content style={{ margin: '24px', padding: 24, background: '#fff', borderRadius: 8 }}>
                    {children}
                </Content>
            </Layout>
        </Layout>
    );
};

export default LayoutAdvisor;