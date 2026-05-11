import React, { useContext, useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Button, Typography, Tag, Progress, Badge, Divider, Spin, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';  // Đảm bảo file api.ts đã config axios + token
import {
    DashboardOutlined, BookOutlined, TeamOutlined, UserOutlined, SettingOutlined,
    BarChartOutlined, WarningOutlined, CheckCircleOutlined, ArrowUpOutlined, ArrowDownOutlined,
    ScheduleOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface DashboardStats {
    totalSubjects: number;
    totalClasses: number;
    totalAccounts: number;
    activeClasses: number;
    pendingRegistrations: number;
    warningsActive: number;
    maintenanceMode: boolean;
}

const DashboardAdmin: React.FC = () => {
    const { user } = useContext(AuthContext)!;
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/dashboard-stats');
            setStats(response.data);
            message.success('Dữ liệu dashboard đã được cập nhật');
        } catch (err: any) {
            console.error('Lỗi tải dashboard stats:', err);
            message.error(err.response?.data?.message || 'Không thể tải dữ liệu dashboard. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    // Dữ liệu fallback nếu API lỗi
    const fallbackStats: DashboardStats = {
        totalSubjects: 0,
        totalClasses: 0,
        totalAccounts: 0,
        activeClasses: 0,
        pendingRegistrations: 0,
        warningsActive: 0,
        maintenanceMode: false,
    };

    const displayStats = stats || fallbackStats;

    return (
        <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
            {/* Header chào mừng */}
            <div style={{ marginBottom: 32, textAlign: 'center' }}>
                <Title level={2}>
                    Xin chào, {user?.name || user?.username || 'Quản trị viên'}! 👋
                </Title>
                <Text type="secondary">
                    Hệ thống quản lý học vụ • <Tag color="red">ADMIN</Tag> • {new Date().toLocaleDateString('vi-VN')}
                </Text>
                <Button
                    icon={<ReloadOutlined />}
                    onClick={fetchStats}
                    loading={loading}
                    style={{ marginLeft: 16 }}
                >
                    Làm mới dữ liệu
                </Button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '100px 0' }}>
                    <Spin size="large" tip="Đang tải dữ liệu dashboard..." />
                </div>
            ) : (
                <>
                    {/* Thống kê nhanh */}
                    <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
                        <Col xs={24} sm={12} md={6}>
                            <Card hoverable style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                <Statistic
                                    title="Tổng môn học"
                                    value={displayStats.totalSubjects}
                                    prefix={<BookOutlined style={{ color: '#1890ff' }} />}
                                    valueStyle={{ color: '#1890ff' }}
                                />
                                <Progress percent={Math.min(100, (displayStats.totalSubjects / 100) * 100)} size="small" showInfo={false} strokeColor="#1890ff" />
                            </Card>
                        </Col>

                        <Col xs={24} sm={12} md={6}>
                            <Card hoverable style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                <Statistic
                                    title="Tổng lớp học phần"
                                    value={displayStats.totalClasses}
                                    prefix={<TeamOutlined style={{ color: '#52c41a' }} />}
                                    valueStyle={{ color: '#52c41a' }}
                                />
                            </Card>
                        </Col>

                        <Col xs={24} sm={12} md={6}>
                            <Card hoverable style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                <Statistic
                                    title="Tổng tài khoản"
                                    value={displayStats.totalAccounts}
                                    prefix={<UserOutlined style={{ color: '#faad14' }} />}
                                    valueStyle={{ color: '#faad14' }}
                                />
                            </Card>
                        </Col>

                        <Col xs={24} sm={12} md={6}>
                            <Card hoverable style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                <Statistic
                                    title="Chế độ bảo trì"
                                    value={displayStats.maintenanceMode ? 'BẬT' : 'TẮT'}
                                    prefix={<SettingOutlined style={{ color: displayStats.maintenanceMode ? '#ff4d4f' : '#52c41a' }} />}
                                    valueStyle={{ color: displayStats.maintenanceMode ? '#ff4d4f' : '#52c41a' }}
                                />
                                <div style={{ marginTop: 8 }}>
                                    <Badge
                                        status={displayStats.maintenanceMode ? 'error' : 'success'}
                                        text={displayStats.maintenanceMode ? 'Hệ thống đang bảo trì' : 'Hoạt động bình thường'}
                                    />
                                </div>
                            </Card>
                        </Col>
                    </Row>

                    <Divider >Các chức năng chính</Divider>

                    <Row gutter={[16, 16]}>
                        {/* Card Quản lý môn học */}
                        <Col xs={24} md={8}>
                            <Card hoverable style={{ height: '100%', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                                    <BookOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                                </div>
                                <Title level={4} style={{ textAlign: 'center' }}>Quản lý môn học</Title>
                                <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 16 }}>
                                    Thêm, sửa, xóa môn học và điều kiện tiên quyết
                                </Text>
                                <Link to="/subjects">
                                    <Button type="primary" block size="large">
                                        Truy cập ngay
                                    </Button>
                                </Link>
                            </Card>
                        </Col>

                        {/* Card Quản lý lớp học phần */}
                        <Col xs={24} md={8}>
                            <Card hoverable style={{ height: '100%', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                                    <TeamOutlined style={{ fontSize: 48, color: '#52c41a' }} />
                                </div>
                                <Title level={4} style={{ textAlign: 'center' }}>Quản lý lớp học phần</Title>
                                <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 16 }}>
                                    Tạo lớp, phân giảng viên, theo dõi sĩ số
                                </Text>
                                <Link to="/classes">
                                    <Button type="primary" block size="large">
                                        Truy cập ngay
                                    </Button>
                                </Link>
                            </Card>
                        </Col>

                        {/* Card Quản lý tài khoản */}
                        <Col xs={24} md={8}>
                            <Card hoverable style={{ height: '100%', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                                    <UserOutlined style={{ fontSize: 48, color: '#faad14' }} />
                                </div>
                                <Title level={4} style={{ textAlign: 'center' }}>Quản lý tài khoản</Title>
                                <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 16 }}>
                                    Quản lý người dùng, phân quyền, reset mật khẩu
                                </Text>
                                <Link to="/accounts">
                                    <Button type="primary" block size="large">
                                        Truy cập ngay
                                    </Button>
                                </Link>
                            </Card>
                        </Col>

                        {/* Thêm card bảo trì */}
                        <Col xs={24} md={8}>
                            <Card hoverable style={{ height: '100%', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                                    <SettingOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />
                                </div>
                                <Title level={4} style={{ textAlign: 'center' }}>Bảo trì hệ thống</Title>
                                <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 16 }}>
                                    Bật/tắt chế độ bảo trì toàn hệ thống
                                </Text>
                                <Link to="/maintenance">
                                    <Button danger block size="large">
                                        Cấu hình ngay
                                    </Button>
                                </Link>
                            </Card>
                        </Col>
                    </Row>

                    {/* Thống kê bổ sung */}
                    <Card style={{ marginTop: 32, borderRadius: 12 }}>
                        <Row gutter={16} justify="center">
                            <Col xs={24} sm={8}>
                                <Statistic
                                    title="Lớp đang mở"
                                    value={displayStats.activeClasses}
                                    prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                                />
                            </Col>
                            <Col xs={24} sm={8}>
                                <Statistic
                                    title="Đăng ký chờ duyệt"
                                    value={displayStats.pendingRegistrations}
                                    prefix={<ScheduleOutlined style={{ color: '#faad14' }} />}
                                />
                            </Col>
                            <Col xs={24} sm={8}>
                                <Statistic
                                    title="Cảnh báo đang hoạt động"
                                    value={displayStats.warningsActive}
                                    prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />}
                                />
                            </Col>
                        </Row>
                    </Card>
                </>
            )}
        </div>
    );
};

export default DashboardAdmin;