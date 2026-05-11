import React, { useContext, useEffect, useState } from 'react';
import { Card, Row, Col, Button, Typography, Tag, Statistic, Spin, message, Space } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import {
    UsergroupAddOutlined,
    WarningOutlined,
    CheckCircleOutlined,
    DashboardOutlined,
    ReloadOutlined,
    TeamOutlined,
    FileTextOutlined
} from '@ant-design/icons';
import api from '../../services/api';

const { Title, Text } = Typography;

interface DashboardStats {
    totalStudents: number;
    classesManaged: number;
    activeWarnings: number;
    studentsByClass: {
        className: string;
        count: number;
    }[];
}

const DashboardAdvisor: React.FC = () => {
    const { user } = useContext(AuthContext)!;
    const advisorId = user?.advisorId;
    const navigate = useNavigate();

    const [stats, setStats] = useState<DashboardStats>({
        totalStudents: 0,
        classesManaged: 0,
        activeWarnings: 0,
        studentsByClass: []
    });
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = async () => {
        if (!advisorId) {
            message.error('Không tìm thấy thông tin cố vấn');
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // 1. Lấy danh sách lớp cố vấn
            const classesRes = await api.get(`/AdvisorClasses/by-advisor/${advisorId}`);
            const classes = classesRes.data || [];
            const classesManaged = classes.length;

            // 2. Lấy tổng sinh viên từ các lớp
            let totalStudents = 0;
            const studentsByClass = [];

            for (const cls of classes) {
                try {
                    const studentsRes = await api.get(`/Students/by-advisor-class/${cls.advisorClassId}`);
                    const studentCount = studentsRes.data?.length || 0;
                    totalStudents += studentCount;

                    studentsByClass.push({
                        className: cls.className || cls.classCode,
                        count: studentCount
                    });
                } catch (err) {
                    console.warn(`Không thể lấy sinh viên cho lớp ${cls.classCode}:`, err);
                }
            }

            // 3. Lấy cảnh báo đang hoạt động
            let activeWarnings = 0;
            try {
                const warningsRes = await api.get(`/Warnings/advisor-summary/${advisorId}`);
                activeWarnings = warningsRes.data?.totalActiveWarnings || 0;
            } catch (err) {
                console.warn('Không thể lấy cảnh báo:', err);
            }

           

            setStats({
                totalStudents,
                classesManaged,
                activeWarnings,
                studentsByClass
            });

        } catch (err: any) {
            console.error('Lỗi tải dashboard:', err);
            message.error('Không thể tải dữ liệu dashboard. Vui lòng thử lại!');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [advisorId]);

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
                <Spin size="large" tip="Đang tải dữ liệu dashboard..." />
            </div>
        );
    }

    return (
        <div style={{ padding: '0 24px' }}>
            {/* Header */}
            <div style={{
                background: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)',
                borderRadius: 12,
                padding: '24px 28px',
                marginBottom: 24,
                boxShadow: '0 4px 20px rgba(114,46,209,0.25)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <Title level={2} style={{ color: '#fff', margin: 0 }}>
                        <DashboardOutlined style={{ marginRight: 10 }} />
                        Xin chào, {user?.fullName || user?.username}!
                    </Title>
                    <Text style={{ color: 'rgba(255,255,255,0.85)' }}>
                        <Tag color="purple" style={{ marginRight: 8 }}>Cố vấn học tập</Tag>
                        {new Date().toLocaleDateString('vi-VN', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </Text>
                </div>
                <Button
                    icon={<ReloadOutlined />}
                    onClick={fetchDashboardData}
                    style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}
                >
                    Làm mới
                </Button>
            </div>

            {/* Thống kê nhanh */}
            <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
                <Col xs={24} sm={12} md={6}>
                    <Card hoverable style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                        <Statistic
                            title="Lớp cố vấn"
                            value={stats.classesManaged}
                            prefix={<TeamOutlined style={{ color: '#722ed1' }} />}
                            valueStyle={{ color: '#722ed1' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card hoverable style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                        <Statistic
                            title="Sinh viên quản lý"
                            value={stats.totalStudents}
                            prefix={<UsergroupAddOutlined style={{ color: '#1677ff' }} />}
                            valueStyle={{ color: '#1677ff' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card hoverable style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                        <Statistic
                            title="Cảnh báo đang hoạt động"
                            value={stats.activeWarnings}
                            prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />}
                            valueStyle={{ color: '#ff4d4f' }}
                        />
                    </Card>
                </Col>           
            </Row>

            {/* Chức năng chính */}
            <Title level={4} style={{ marginBottom: 16 }}>Chức năng chính</Title>
            <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                    <Link to="/students">
                        <Card hoverable style={{ borderRadius: 12, height: '100%', borderColor: '#722ed1', borderWidth: 2 }}>
                            <div style={{ textAlign: 'center', padding: '12px 0' }}>
                                <TeamOutlined style={{ fontSize: 40, color: '#722ed1', marginBottom: 12 }} />
                                <Title level={4} style={{ marginBottom: 8 }}>Quản lý sinh viên</Title>
                                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                                    Xem danh sách, thông tin chi tiết sinh viên theo lớp cố vấn
                                </Text>
                                <Button type="primary" block size="large" style={{ background: '#722ed1', borderColor: '#722ed1' }}>
                                    Xem ngay
                                </Button>
                            </div>
                        </Card>
                    </Link>
                </Col>

                <Col xs={24} md={8}>
                    <Link to="/warnings">
                        <Card hoverable style={{ borderRadius: 12, height: '100%' }}>
                            <div style={{ textAlign: 'center', padding: '12px 0' }}>
                                <WarningOutlined style={{ fontSize: 40, color: '#ff4d4f', marginBottom: 12 }} />
                                <Title level={4} style={{ marginBottom: 8 }}>Cảnh báo học vụ</Title>
                                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                                    Theo dõi, xử lý sinh viên có nguy cơ học tập kém
                                </Text>
                                <Button type="primary" danger block size="large">
                                    Xem cảnh báo
                                </Button>
                            </div>
                        </Card>
                    </Link>
                </Col>

                <Col xs={24} md={8}>
                    <Link to="/analytics">
                        <Card hoverable style={{ borderRadius: 12, height: '100%' }}>
                            <div style={{ textAlign: 'center', padding: '12px 0' }}>
                                <FileTextOutlined style={{ fontSize: 40, color: '#1677ff', marginBottom: 12 }} />
                                <Title level={4} style={{ marginBottom: 8 }}>Thống kê & Phân tích</Title>
                                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                                    Xem báo cáo, thống kê chi tiết theo từng lớp
                                </Text>
                                <Button block size="large" style={{ borderColor: '#1677ff', color: '#1677ff' }}>
                                    Xem thống kê
                                </Button>
                            </div>
                        </Card>
                    </Link>
                </Col>
            </Row>

            {/* Phân bố sinh viên theo lớp */}
            {stats.studentsByClass.length > 0 && (
                <Card title="Phân bố sinh viên theo lớp cố vấn" style={{ marginTop: 24, borderRadius: 12 }}>
                    <Row gutter={[16, 16]}>
                        {stats.studentsByClass.map((item, index) => (
                            <Col xs={24} sm={12} md={8} key={index}>
                                <Card size="small" style={{ background: '#f9f0ff', borderRadius: 8 }}>
                                    <Statistic
                                        title={item.className}
                                        value={item.count}
                                        prefix={<UsergroupAddOutlined style={{ color: '#722ed1' }} />}
                                        valueStyle={{ color: '#722ed1' }}
                                    />
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </Card>
            )}
        </div>
    );
};

export default DashboardAdvisor;