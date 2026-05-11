// components/Layout.tsx (cập nhật)
import React, { useContext } from 'react';
import { Layout, Menu, Avatar, Dropdown, message } from 'antd';
import { Link, useNavigate, Outlet } from 'react-router-dom'; 
import { AuthContext } from '../context/AuthContext';
import {
    DashboardOutlined,
    UserOutlined,
    BookOutlined,
    CalendarOutlined,
    LogoutOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

const LayoutWrapper: React.FC = () => { 
    const { user, logout } = useContext(AuthContext)!;
    const navigate = useNavigate();

    const menuItems = [
        { key: '/', icon: <DashboardOutlined />, label: <Link to="/">Dashboard</Link> },
    ];

    if (user?.role === 'STUDENT') {
        menuItems.push(
            { key: '/registration', icon: <BookOutlined />, label: <Link to="/registration">Đăng ký môn học</Link> },
            { key: '/schedule', icon: <CalendarOutlined />, label: <Link to="/schedule">Lịch học cá nhân</Link> },
        );
    }

    if (['ADMIN', 'ADVISOR'].includes(user?.role)) {
        menuItems.push(
            { key: '/students', icon: <UserOutlined />, label: <Link to="/students">Quản lý sinh viên</Link> },
        );
    }

    const dropdownMenu = {
        items: [
            {
                key: 'logout',
                icon: <LogoutOutlined />,
                label: 'Đăng xuất',
                onClick: () => {
                    logout();
                    message.success('Đăng xuất thành công');
                    navigate('/login');
                }
            }
        ]
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider collapsible theme="dark">
                <div style={{ height: 64, background: '#001529', color: 'white', textAlign: 'center', lineHeight: '64px' }}>
                    Quản lý Sinh viên
                </div>
                <Menu theme="dark" mode="inline" defaultSelectedKeys={['/']}>
                    {menuItems.map(item => (
                        <Menu.Item key={item.key} icon={item.icon}>
                            {item.label}
                        </Menu.Item>
                    ))}
                </Menu>
            </Sider>

            <Layout>
                <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <Dropdown menu={dropdownMenu} trigger={['click']}>
                        <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Avatar icon={<UserOutlined />} />
                            <span style={{ marginLeft: 8 }}>{user?.username || 'Người dùng'}</span>
                        </div>
                    </Dropdown>
                </Header>

                <Content style={{ margin: '24px', background: '#fff', padding: 24, minHeight: 280 }}>
                    {}
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
};

export default LayoutWrapper;