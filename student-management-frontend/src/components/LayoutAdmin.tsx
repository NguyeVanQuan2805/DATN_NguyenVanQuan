// src/components/LayoutAdmin.tsx
import React, { useContext } from 'react';
import { Layout, Menu, Avatar, Dropdown, theme, Space, Badge } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import {
    DashboardOutlined,
    UserOutlined,
    BookOutlined,
    SettingOutlined,
    TeamOutlined,
    LogoutOutlined,
    ProfileOutlined,
    AppstoreOutlined,
    CalendarOutlined,
    TrophyOutlined,
    NotificationOutlined,
    DollarOutlined,
    QrcodeOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

const LayoutAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, logout } = useContext(AuthContext)!;
    const navigate = useNavigate();
    const location = useLocation();
    const { token } = theme.useToken();

    const menuItems = [
        { key: '/', icon: <DashboardOutlined />, label: <Link to="/">Dashboard</Link> },
        { key: '/accounts', icon: <UserOutlined />, label: <Link to="/accounts">Quản lý người dùng</Link> },
        { key: '/subjects', icon: <BookOutlined />, label: <Link to="/subjects">Quản lý môn học</Link> },
        { key: '/classes', icon: <TeamOutlined />, label: <Link to="/classes">Quản lý lớp học phần</Link> },
        { key: '/maintenance-page', icon: <SettingOutlined />, label: <Link to="/maintenance-page">Cấu hình hệ thống</Link> },
        { key: '/room-schedule', icon: <AppstoreOutlined />, label: <Link to="/room-schedule">Quản lý phòng & lịch</Link> },
        { key: '/curriculums', icon: <AppstoreOutlined />, label: <Link to="/admin/curriculums">Quản lý chương trình đào tạo</Link> },
        { key: '/semesters', icon: <CalendarOutlined />, label: <Link to="/admin/semesters">Quản lý học kỳ</Link> },
        { key: '/admin/graduation', icon: <TrophyOutlined />, label: <Link to="/admin/graduation">Quản lý tốt nghiệp</Link> },
        { key: '/admin/notifications', icon: <NotificationOutlined />, label: <Link to="/admin/notifications">Thông báo</Link> },
        { key: '/admin/tuitions', icon: <DollarOutlined />, label: <Link to="/admin/tuitions">Quản lý học phí</Link> },
    ];

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
                    Quản trị - Hệ thống
                </div>
                <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} items={menuItems} />
            </Sider>

            <Layout>
                <Header style={{
                    background: '#fff',
                    padding: '0 24px',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    position: 'relative',
                    zIndex: 1
                }}>
                    <Space size="middle" align="center">
                        {}
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <NotificationBell />
                        </div>

                        <Dropdown menu={{ items: dropdownItems }} trigger={['click']} placement="bottomRight">
                            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 8, transition: 'background 0.3s' }}>
                                <Avatar
                                    icon={<UserOutlined />}
                                    style={{ backgroundColor: token.colorPrimary }}
                                />
                                <span style={{ fontWeight: 500, color: '#333' }}>{user?.fullName || user?.username || 'Quản trị viên'}</span>
                            </div>
                        </Dropdown>
                    </Space>
                </Header>

                <Content style={{ margin: '24px', padding: 24, background: '#fff', borderRadius: 8, minHeight: 280 }}>
                    {children}
                </Content>
            </Layout>
        </Layout>
    );
};

export default LayoutAdmin;