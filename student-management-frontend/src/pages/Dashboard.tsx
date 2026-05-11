import React, { useContext } from 'react';
import { Card, Row, Col, Button, Typography, Tag } from 'antd';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
    DashboardOutlined,
    BookOutlined,
    CalendarOutlined,
    UserOutlined,
    LogoutOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

// Định nghĩa type cho role (Cách 1 - sạch sẽ và an toàn nhất)
type UserRole = 'STUDENT' | 'ADMIN' | 'ADVISOR' | 'TEACHER';

// Mapping role → tên hiển thị (dùng Record để TypeScript kiểm tra key hợp lệ)
const roleDisplay: Record<UserRole, string> = {
    STUDENT: 'Sinh viên',
    ADMIN: 'Quản trị viên',
    ADVISOR: 'Cố vấn học tập',
    TEACHER: 'Giảng viên',
};

const Dashboard: React.FC = () => {
    const { user, logout } = useContext(AuthContext)!;

    // Lấy tên người dùng (ưu tiên FullName từ claim 'name', fallback về username)
    const fullName = user?.name || user?.username || 'Người dùng';

    // Ép kiểu role an toàn + fallback nếu không khớp
    const role = (user?.role as UserRole | undefined) ?? ('UNKNOWN' as UserRole);
    const displayRole = roleDisplay[role] || role || 'Không xác định';

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2}>
                Xin chào, {fullName}! <Tag color="blue">{displayRole}</Tag>
            </Title>

            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                Chào mừng bạn đến với Hệ thống Quản lý Sinh viên
            </Text>

            <Row gutter={[16, 16]}>
                {/* Card chung cho mọi role */}
                <Col xs={24} sm={12} md={8}>
                    <Card
                        hoverable
                        title={<><DashboardOutlined /> Tổng quan</>}
                        style={{ height: '100%' }}
                    >
                        <p>Truy cập nhanh các chức năng chính của hệ thống.</p>
                    </Card>
                </Col>

                {/* Chỉ hiển thị cho Sinh viên */}
                {user?.role === 'STUDENT' && (
                    <>
                        <Col xs={24} sm={12} md={8}>
                            <Card
                                hoverable
                                title={<><BookOutlined /> Đăng ký môn học</>}
                            >
                                <p>Xem danh sách lớp mở và đăng ký học phần cho học kỳ hiện tại.</p>
                                <Link to="/registration">
                                    <Button type="primary" block>
                                        Đăng ký ngay
                                    </Button>
                                </Link>
                            </Card>
                        </Col>

                        <Col xs={24} sm={12} md={8}>
                            <Card
                                hoverable
                                title={<><CalendarOutlined /> Lịch học cá nhân</>}
                            >
                                <p>Xem thời khóa biểu và lịch học chi tiết của bạn.</p>
                                <Link to="/schedule">
                                    <Button type="primary" block>
                                        Xem lịch học
                                    </Button>
                                </Link>
                            </Card>
                        </Col>
                    </>
                )}

                {/* Cho ADMIN hoặc ADVISOR */}
                {['ADMIN', 'ADVISOR'].includes(user?.role ?? '') && (
                    <Col xs={24} sm={12} md={8}>
                        <Card
                            hoverable
                            title={<><UserOutlined /> Quản lý sinh viên</>}
                        >
                            <p>Xem danh sách sinh viên, lớp cố vấn và các thông tin liên quan.</p>
                            <Link to="/students">
                                <Button type="primary" block>
                                    Quản lý sinh viên
                                </Button>
                            </Link>
                        </Card>
                    </Col>
                )}
            </Row>

            {/* Nút đăng xuất */}
            <div style={{ marginTop: 32, textAlign: 'center' }}>
                <Button
                    danger
                    icon={<LogoutOutlined />}
                    size="large"
                    onClick={() => {
                        logout();
                    }}
                >
                    Đăng xuất
                </Button>
            </div>
        </div>
    );
};

export default Dashboard;