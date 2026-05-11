// src/pages/teacher/DashboardTeacher.tsx
// FIX: Dùng /Classes/my-classes thay vì /Classes + filter client-side
import React, { useEffect, useState, useContext } from 'react';
import {
    Card, Row, Col, Statistic, Tag, Progress,
    Spin, message, Button, Typography, Badge,
} from 'antd';
import {
    BookOutlined, TeamOutlined, EditOutlined,
    WarningOutlined, ReloadOutlined, CalendarOutlined,
    CheckCircleOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

const { Title, Text } = Typography;

interface ClassSummary {
    classId: string;
    classCode: string;
    subject: { subjectName: string; credits: number };
    semester: { semesterName: string };
    schedule: { dayOfWeek: number; periodStart: number; periodEnd: number; room: string } | null;
    maxStudents: number;
    currentStudents: number;
    status: string;
}

const DAY_MAP: Record<number, string> = {
    2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4',
    5: 'Thứ 5', 6: 'Thứ 6', 7: 'Thứ 7', 8: 'CN',
};

const DashboardTeacher: React.FC = () => {
    const { user } = useContext(AuthContext)!;
    const [classes, setClasses] = useState<ClassSummary[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMyClasses = async () => {
        setLoading(true);
        try {
            // FIX: Dùng endpoint riêng cho giảng viên, không cần filter client-side
            const res = await api.get<ClassSummary[]>('/Classes/my-classes');
            setClasses(res.data || []);
        } catch (err: any) {
            message.error('Không thể tải danh sách lớp: ' + (err.response?.data || err.message));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMyClasses();
    }, []);

    const totalStudents = classes.reduce((sum, c) => sum + (c.currentStudents || 0), 0);
    const openClasses = classes.filter(c => c.status === 'OPEN').length;

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
                <Spin size="large" tip="Đang tải dashboard..." />
            </div>
        );
    }

    return (
        <div style={{ padding: '0 16px' }}>
            {/* Header */}
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Title level={2} style={{ marginBottom: 4 }}>
                        Xin chào, {user?.fullName || user?.username}! 👋
                    </Title>
                    <Text type="secondary">
                        <Tag color="green">Giảng viên</Tag>&nbsp;
                        {new Date().toLocaleDateString('vi-VN', {
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                        })}
                    </Text>
                </div>
                <Button icon={<ReloadOutlined />} onClick={fetchMyClasses} loading={loading}>
                    Làm mới
                </Button>
            </div>

            {/* Thống kê nhanh */}
            <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
                <Col xs={24} sm={8}>
                    <Card style={{ borderRadius: 12, background: '#f6ffed', borderColor: '#b7eb8f' }}>
                        <Statistic
                            title="Lớp đang dạy"
                            value={classes.length}
                            prefix={<BookOutlined style={{ color: '#52c41a' }} />}
                            valueStyle={{ color: '#52c41a' }}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {openClasses} lớp đang mở đăng ký
                        </Text>
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card style={{ borderRadius: 12, background: '#e6f4ff', borderColor: '#91caff' }}>
                        <Statistic
                            title="Tổng sinh viên"
                            value={totalStudents}
                            prefix={<TeamOutlined style={{ color: '#1677ff' }} />}
                            valueStyle={{ color: '#1677ff' }}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Tổng sinh viên tất cả lớp
                        </Text>
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card style={{ borderRadius: 12 }}>
                        <Statistic
                            title="Học kỳ hiện tại"
                            value={classes[0]?.semester?.semesterName || 'HK2024-2'}
                            prefix={<CalendarOutlined style={{ color: '#722ed1' }} />}
                            valueStyle={{ color: '#722ed1', fontSize: 16 }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Danh sách lớp */}
            <Title level={4} style={{ marginBottom: 16 }}>Lớp học phần đang dạy</Title>

            {classes.length === 0 ? (
                <Card style={{ textAlign: 'center', padding: 40, borderRadius: 12 }}>
                    <Text type="secondary">Bạn chưa được phân công lớp nào trong học kỳ này.</Text>
                </Card>
            ) : (
                <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
                    {classes.map(cls => {
                        const pct = Math.round(((cls.currentStudents || 0) / cls.maxStudents) * 100);
                        return (
                            <Col xs={24} md={12} lg={8} key={cls.classId}>
                                <Card
                                    hoverable
                                    style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                                    title={
                                        <span>
                                            <Text code>{cls.classCode}</Text>
                                            &nbsp;
                                            <Tag color={cls.status === 'OPEN' ? 'success' : 'default'}>
                                                {cls.status}
                                            </Tag>
                                        </span>
                                    }
                                >
                                    <Text strong>{cls.subject.subjectName}</Text>
                                    <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
                                        {cls.subject.credits} tín chỉ
                                    </div>

                                    {cls.schedule && (
                                        <div style={{ marginTop: 8, fontSize: 13, color: '#595959' }}>
                                            <CalendarOutlined style={{ marginRight: 4 }} />
                                            {DAY_MAP[cls.schedule.dayOfWeek]} · Tiết {cls.schedule.periodStart}–{cls.schedule.periodEnd} · {cls.schedule.room}
                                        </div>
                                    )}

                                    <div style={{ marginTop: 12 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                            <span>Sĩ số</span>
                                            <span style={{ color: pct >= 100 ? '#ff4d4f' : '#52c41a' }}>
                                                {cls.currentStudents}/{cls.maxStudents}
                                            </span>
                                        </div>
                                        <Progress
                                            percent={pct}
                                            size="small"
                                            strokeColor={pct >= 100 ? '#ff4d4f' : pct > 80 ? '#faad14' : '#52c41a'}
                                            showInfo={false}
                                            style={{ marginTop: 4 }}
                                        />
                                    </div>
                                </Card>
                            </Col>
                        );
                    })}
                </Row>
            )}

            {/* Hành động nhanh */}
            <Title level={4} style={{ marginBottom: 16 }}>Chức năng chính</Title>
            <Row gutter={16}>
                <Col xs={24} md={8}>
                    <Card hoverable style={{ borderRadius: 12, height: '100%' }}>
                        <div style={{ textAlign: 'center', padding: '8px 0' }}>
                            <BookOutlined style={{ fontSize: 40, color: '#1677ff', marginBottom: 12 }} />
                            <Title level={4} style={{ marginBottom: 8 }}>Lớp đang dạy</Title>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                                Xem danh sách lớp, sinh viên, lịch dạy
                            </Text>
                            <Link to="/teacher-classes">
                                <Button type="primary" block>Xem ngay</Button>
                            </Link>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} md={8}>
                    <Card hoverable style={{ borderRadius: 12, height: '100%' }}>
                        <div style={{ textAlign: 'center', padding: '8px 0' }}>
                            <EditOutlined style={{ fontSize: 40, color: '#52c41a', marginBottom: 12 }} />
                            <Title level={4} style={{ marginBottom: 8 }}>Nhập điểm</Title>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                                Chấm điểm quá trình, giữa kỳ, cuối kỳ
                            </Text>
                            <Link to="/grading">
                                <Button block style={{ borderColor: '#52c41a', color: '#52c41a' }}>
                                    Chấm điểm
                                </Button>
                            </Link>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} md={8}>
                    <Card hoverable style={{ borderRadius: 12, height: '100%' }}>
                        <div style={{ textAlign: 'center', padding: '8px 0' }}>
                            <CheckCircleOutlined style={{ fontSize: 40, color: '#722ed1', marginBottom: 12 }} />
                            <Title level={4} style={{ marginBottom: 8 }}>Điểm danh</Title>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                                Ghi nhận điểm danh từng buổi học
                            </Text>
                            <Link to="/attendance">
                                <Button block style={{ borderColor: '#722ed1', color: '#722ed1' }}>
                                    Điểm danh
                                </Button>
                            </Link>
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default DashboardTeacher;