// src/pages/student/DashboardStudent.tsx
import React, { useContext, useEffect, useState } from 'react';
import {
    Card,
    Row,
    Col,
    Button,
    Typography,
    Tag,
    Statistic,
    Progress,
    Spin,
    message,
    Alert,
    Space,
    Divider,
    Tooltip,
    List,
    Avatar,
    Empty,
    Modal
} from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import {
    BookOutlined,
    CalendarOutlined,
    TrophyOutlined,
    WarningOutlined,
    ReloadOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    UserOutlined,
    FileTextOutlined,
    RightOutlined,
    ExperimentOutlined,
    FireOutlined,
    LineChartOutlined,
} from '@ant-design/icons';
import api from '../../services/api';
import { extractErrorMessage } from '../../utils/errorHandler';
import dayjs from 'dayjs';
import { useAcademicSummary, getGpaColor, getGpaClassification } from '../../hooks/useAcademicSummary';

const { Title, Text } = Typography;

// ============================================================
// Interfaces
// ============================================================
interface UpcomingClass {
    classId: string;
    classCode: string;
    subjectName: string;
    teacherName: string;
    dayOfWeek: number;
    periodStart: number;
    periodEnd: number;
    room: string;
}

interface RecentActivity {
    id: string;
    type: 'registration' | 'grade' | 'warning' | 'schedule';
    title: string;
    description: string;
    time: string;
    status?: string;
}

// ============================================================
// Constants
// ============================================================
const DAY_MAP: Record<number, string> = {
    2: 'Thứ 2',
    3: 'Thứ 3',
    4: 'Thứ 4',
    5: 'Thứ 5',
    6: 'Thứ 6',
    7: 'Thứ 7',
    8: 'Chủ nhật',
};

const WARNING_LEVEL_CONFIG = {
    0: { color: 'success', text: 'Không có cảnh báo', icon: <CheckCircleOutlined /> },
    1: { color: 'warning', text: 'Cảnh báo mức 1', icon: <WarningOutlined /> },
    2: { color: 'orange', text: 'Cảnh báo mức 2', icon: <WarningOutlined /> },
    3: { color: 'error', text: 'Cảnh báo mức 3', icon: <FireOutlined /> },
};

// ============================================================
// Component
// ============================================================
const DashboardStudent: React.FC = () => {
    const { user } = useContext(AuthContext)!;
    const navigate = useNavigate();
    const studentId = user?.studentId;

    const { data: summary, loading: summaryLoading, refresh: refreshSummary } = useAcademicSummary({
        autoFetch: true,
        includeDetails: false,
    });

    // State riêng cho các dữ liệu không có trong summary
    const [registeredCredits, setRegisteredCredits] = useState(0);
    const [registeredCourses, setRegisteredCourses] = useState(0);
    const [pendingCourses, setPendingCourses] = useState(0);
    const [maxCredits, setMaxCredits] = useState(22);
    const [upcomingClasses, setUpcomingClasses] = useState<UpcomingClass[]>([]);
    const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
    const [warningLevel, setWarningLevel] = useState(0);
    const [currentTime, setCurrentTime] = useState(dayjs().format('HH:mm:ss'));
    const [loadingExtra, setLoadingExtra] = useState(true);
    const [advisorInfo, setAdvisorInfo] = useState<any>(null);

    // ============================================================
    // Load extra data (registrations, upcoming classes, warnings)
    // ============================================================
    useEffect(() => {
        if (studentId) {
            fetchExtraData();
            fetchAdvisorInfo();
        }

        const timer = setInterval(() => {
            setCurrentTime(dayjs().format('HH:mm:ss'));
        }, 1000);

        return () => clearInterval(timer);
    }, [studentId]);

    // Fetch thông tin cố vấn
    const fetchAdvisorInfo = async () => {
        if (!studentId) return;
        try {
            const response = await api.get(`/Students/${studentId}/advisor`);
            setAdvisorInfo(response.data);
        } catch (error) {
            console.warn('Không thể tải thông tin cố vấn:', error);
            setAdvisorInfo(null);
        }
    };

    // Hiển thị modal thông tin cố vấn
    const showAdvisorInfo = () => {
        if (!advisorInfo) {
            message.warning('Chưa có cố vấn học tập được gán. Vui lòng liên hệ phòng đào tạo.');
            return;
        }

        Modal.info({
            title: 'Thông tin cố vấn học tập',
            icon: <WarningOutlined />,
            content: (
                <div>
                    <p><strong>Tên cố vấn:</strong> {advisorInfo.fullName}</p>
                    <p><strong>Email:</strong> <a href={`mailto:${advisorInfo.email}`}>{advisorInfo.email}</a></p>
                    <p><strong>Số điện thoại:</strong> <a href={`tel:${advisorInfo.phone}`}>{advisorInfo.phone}</a></p>
                    {advisorInfo.office && <p><strong>Văn phòng:</strong> {advisorInfo.office}</p>}
                </div>
            ),
            width: 450,
        });
    };

    const fetchExtraData = async () => {
        if (!studentId) return;

        setLoadingExtra(true);
        try {
            // 1. Lấy cấu hình học kỳ hiện tại và giới hạn tín chỉ
            const [configRes, semestersRes] = await Promise.all([
                api.get('/SystemConfigs'),
                api.get('/Semesters')
            ]);

            const configs = configRes.data || [];
            const currentSemester = configs.find((c: any) => c.configKey === 'CurrentSemester')?.configValue || 'HK2024_2';
            const maxCreditsValue = parseInt(configs.find((c: any) => c.configKey === 'MaxCreditsPerSemester')?.configValue || '22');
            setMaxCredits(maxCreditsValue);

            // 2. Lấy đăng ký môn của sinh viên
            try {
                const scheduleRes = await api.get(`/CourseRegistrations/student/${studentId}`);
                const registrations = scheduleRes.data || [];

                // Lọc các đăng ký APPROVED trong học kỳ hiện tại
                const approvedRegs = registrations.filter((r: any) =>
                    r.status === 'APPROVED' &&
                    (r.class?.semesterId === currentSemester || r.semesterId === currentSemester)
                );

                setRegisteredCourses(approvedRegs.length);
                const totalCredits = approvedRegs.reduce((sum: number, r: any) => {
                    return sum + (r.class?.subject?.credits || r.credits || 0);
                }, 0);
                setRegisteredCredits(totalCredits);

                // Đếm đăng ký PENDING
                const pendingCount = registrations.filter((r: any) => r.status === 'PENDING').length;
                setPendingCourses(pendingCount);

                // Lấy 3 lớp sắp tới
                const now = dayjs();
                const currentDay = now.day();
                const jsDayToSystemDay: Record<number, number> = {
                    1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 0: 8,
                };
                const systemCurrentDay = jsDayToSystemDay[currentDay] || 2;

                const upcoming = approvedRegs
                    .filter((r: any) => {
                        const schedule = r.class?.schedule;
                        if (!schedule) return false;
                        const classDay = schedule.dayOfWeek;
                        if (classDay === systemCurrentDay) return true;
                        return classDay > systemCurrentDay;
                    })
                    .sort((a: any, b: any) => {
                        const dayA = a.class?.schedule?.dayOfWeek || 0;
                        const dayB = b.class?.schedule?.dayOfWeek || 0;
                        if (dayA !== dayB) return dayA - dayB;
                        return (a.class?.schedule?.periodStart || 0) - (b.class?.schedule?.periodStart || 0);
                    })
                    .slice(0, 3)
                    .map((r: any) => ({
                        classId: r.classId,
                        classCode: r.class?.classCode || '',
                        subjectName: r.class?.subject?.subjectName || '',
                        teacherName: r.class?.teacher?.account?.fullName || 'N/A',
                        dayOfWeek: r.class?.schedule?.dayOfWeek || 0,
                        periodStart: r.class?.schedule?.periodStart || 0,
                        periodEnd: r.class?.schedule?.periodEnd || 0,
                        room: r.class?.schedule?.room || '',
                    }));

                setUpcomingClasses(upcoming);

                // Tạo hoạt động gần đây từ đăng ký PENDING
                const activities: RecentActivity[] = [];

                if (pendingCount > 0) {
                    activities.push({
                        id: 'pending-1',
                        type: 'registration',
                        title: 'Đăng ký chờ duyệt',
                        description: `Có ${pendingCount} môn đang chờ duyệt`,
                        time: dayjs().format('DD/MM/YYYY'),
                        status: 'pending',
                    });
                }

                setRecentActivities(activities);

            } catch (err) {
                console.warn('Không thể tải đăng ký:', err);
            }

            // 3. Lấy cảnh báo
            try {
                const warningsRes = await api.get('/Warnings/my-warnings');
                const myWarnings = warningsRes.data || [];
                if (myWarnings.length > 0) {
                    const maxLevel = Math.max(...myWarnings.map((w: any) => w.warningLevel || 0));
                    setWarningLevel(maxLevel);

                    // Thêm hoạt động cảnh báo
                    setRecentActivities(prev => [
                        {
                            id: 'warning-1',
                            type: 'warning',
                            title: `Cảnh báo học vụ mức ${maxLevel}`,
                            description: 'Bạn có cảnh báo học vụ cần xử lý',
                            time: dayjs().format('DD/MM/YYYY'),
                            status: 'warning',
                        },
                        ...prev
                    ]);
                }
            } catch (err) {
                console.warn('Không thể tải cảnh báo:', err);
            }

        } catch (err: any) {
            console.error('Lỗi tải dữ liệu bổ sung:', err);
            const errorMessage = extractErrorMessage(err);
            message.error(errorMessage);
        } finally {
            setLoadingExtra(false);
        }
    };

    const handleRefresh = async () => {
        await Promise.all([refreshSummary(), fetchExtraData(), fetchAdvisorInfo()]);
        message.success('Đã làm mới dữ liệu');
    };

    const getGreeting = (): string => {
        const hour = dayjs().hour();
        if (hour < 12) return 'Chào buổi sáng';
        if (hour < 18) return 'Chào buổi chiều';
        return 'Chào buổi tối';
    };

    const cumulativeGpa = summary?.cumulativeGpa ?? null;
    const semesterGpa = summary?.semesterGpas?.length && summary.semesterGpas.length > 0
        ? summary.semesterGpas[summary.semesterGpas.length - 1]?.gpa ?? null
        : null;
    const totalCourses = summary?.totalCoursesTaken ?? 0;
    const passedCourses = summary?.passedCourses ?? 0;
    const failedCourses = summary?.failedCourses ?? 0;
    const completedCredits = summary?.completedCredits ?? 0;
    const totalCreditsRequired = summary?.totalCreditsRequired ?? 120;
    const classification = getGpaClassification(cumulativeGpa);
    const gpaColor = getGpaColor(cumulativeGpa);

    const isLoading = summaryLoading || loadingExtra;

    if (isLoading && !summary) {
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
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16,
            }}>
                <div>
                    <Space align="center" size="middle">
                        <Avatar
                            size={64}
                            icon={<UserOutlined />}
                            style={{ backgroundColor: '#fff', color: '#722ed1' }}
                        />
                        <div>
                            <Title level={2} style={{ color: '#fff', margin: 0 }}>
                                {getGreeting()}, {user?.fullName || user?.username}! 👋
                            </Title>
                            <Space wrap style={{ marginTop: 8 }}>
                                <Tag color="purple" style={{ fontSize: 13, padding: '2px 12px' }}>
                                    <UserOutlined /> Sinh viên
                                </Tag>
                                <Tag color="geekblue" style={{ fontSize: 13, padding: '2px 12px' }}>
                                    <BookOutlined /> {summary?.studentCode || studentId}
                                </Tag>
                                <Tag color="cyan" style={{ fontSize: 13, padding: '2px 12px' }}>
                                    <ClockCircleOutlined /> {currentTime}
                                </Tag>
                            </Space>
                        </div>
                    </Space>
                </div>
                <Space>
                    <Button
                        type="primary"
                        onClick={showAdvisorInfo}
                        style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}
                    >
                        Liên hệ cố vấn
                    </Button>
                    <Button
                        type="primary"
                        icon={<ReloadOutlined />}
                        onClick={handleRefresh}
                        loading={isLoading}
                        style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}
                    >
                        Làm mới
                    </Button>
                </Space>
            </div>

            {/* Warning Alert */}
            {warningLevel > 0 && (
                <Alert
                    type={warningLevel >= 3 ? 'error' : warningLevel === 2 ? 'warning' : 'info'}
                    showIcon
                    title={`Cảnh báo học vụ mức ${warningLevel}`}
                    description={
                        <span>
                            Bạn đang có cảnh báo học vụ. Vui lòng liên hệ cố vấn học tập để được hỗ trợ.
                            <Button
                                type="link"
                                onClick={() => navigate('/st_warnings')}
                                style={{ padding: 0, marginLeft: 8 }}
                            >
                                Xem chi tiết <RightOutlined />
                            </Button>
                        </span>
                    }
                    style={{ marginBottom: 24, borderRadius: 8 }}
                />
            )}

            {/* Stats Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {/* Tín chỉ đã đăng ký */}
                <Col xs={24} sm={12} md={6}>
                    <Card
                        hoverable
                        style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                        onClick={() => navigate('/registration')}
                    >
                        <Statistic
                            title="Tín chỉ đã đăng ký"
                            value={registeredCredits}
                            suffix={`/ ${maxCredits}`}
                            prefix={<BookOutlined style={{ color: '#722ed1' }} />}
                            valueStyle={{ color: '#722ed1' }}
                        />
                        <Progress
                            percent={maxCredits > 0 ? Math.round((registeredCredits / maxCredits) * 100) : 0}
                            size="small"
                            strokeColor="#722ed1"
                            showInfo={false}
                            style={{ marginTop: 8 }}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Còn {Math.max(0, maxCredits - registeredCredits)} tín chỉ
                        </Text>
                    </Card>
                </Col>

                {/* GPA tích lũy */}
                <Col xs={24} sm={12} md={6}>
                    <Card
                        hoverable
                        style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                        onClick={() => navigate('/grades')}
                    >
                        <Statistic
                            title="GPA tích lũy"
                            value={cumulativeGpa !== null ? cumulativeGpa.toFixed(2) : '—'}
                            prefix={<TrophyOutlined style={{ color: gpaColor }} />}
                            valueStyle={{ color: gpaColor, fontSize: 24 }}
                        />
                        <div style={{ marginTop: 8 }}>
                            <Tag color={gpaColor}>
                                {classification}
                            </Tag>
                        </div>
                        {semesterGpa !== null && (
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                                GPA học kỳ này: {semesterGpa.toFixed(2)}
                            </Text>
                        )}
                    </Card>
                </Col>

                {/* Kết quả học tập */}
                <Col xs={24} sm={12} md={6}>
                    <Card
                        hoverable
                        style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                        onClick={() => navigate('/grades')}
                    >
                        <Statistic
                            title="Kết quả học tập"
                            value={passedCourses}
                            suffix={`/ ${totalCourses}`}
                            prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                            valueStyle={{ color: '#52c41a' }}
                        />
                        <div style={{ marginTop: 8 }}>
                            <Progress
                                percent={totalCourses > 0 ? Math.round((passedCourses / totalCourses) * 100) : 0}
                                size="small"
                                strokeColor="#52c41a"
                                format={() => `${passedCourses} đạt / ${failedCourses} không đạt`}
                            />
                        </div>
                    </Card>
                </Col>

                {/* Đăng ký môn */}
                <Col xs={24} sm={12} md={6}>
                    <Card
                        hoverable
                        style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                        onClick={() => navigate('/registration')}
                    >
                        <Statistic
                            title="Đăng ký môn"
                            value={registeredCourses}
                            suffix={pendingCourses > 0 ? `/ ${pendingCourses} chờ` : ''}
                            prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                            valueStyle={{ color: '#faad14' }}
                        />
                        {pendingCourses > 0 && (
                            <Alert
                                type="warning"
                                showIcon={false}
                                message={`${pendingCourses} môn chờ duyệt`}
                                style={{ marginTop: 8, fontSize: 12, padding: '4px 8px' }}
                            />
                        )}
                    </Card>
                </Col>
            </Row>

            {/* Main Content */}
            <Row gutter={[16, 16]}>
                {/* Left Column - Upcoming Classes */}
                <Col xs={24} lg={12}>
                    <Card
                        title={
                            <Space>
                                <CalendarOutlined style={{ color: '#722ed1' }} />
                                <span>Lịch học sắp tới</span>
                            </Space>
                        }
                        extra={
                            <Button type="link" onClick={() => navigate('/schedule')}>
                                Xem tất cả <RightOutlined />
                            </Button>
                        }
                        style={{ borderRadius: 12, height: '100%' }}
                    >
                        {upcomingClasses.length === 0 ? (
                            <Empty
                                description="Chưa có lịch học trong tuần này"
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                            />
                        ) : (
                            <List
                                itemLayout="horizontal"
                                dataSource={upcomingClasses}
                                renderItem={(item) => (
                                    <List.Item
                                        actions={[
                                            <Button
                                                key="view"
                                                type="link"
                                                size="small"
                                                onClick={() => navigate('/schedule')}
                                            >
                                                Xem
                                            </Button>
                                        ]}
                                    >
                                        <List.Item.Meta
                                            avatar={
                                                <Avatar
                                                    style={{ backgroundColor: '#722ed1' }}
                                                    icon={<BookOutlined />}
                                                />
                                            }
                                            title={
                                                <Space>
                                                    <Text strong>{item.subjectName}</Text>
                                                    <Tag color="purple">{item.classCode}</Tag>
                                                </Space>
                                            }
                                            description={
                                                <Space direction="vertical" size={2}>
                                                    <Text type="secondary">
                                                        <CalendarOutlined /> {DAY_MAP[item.dayOfWeek]} ·
                                                        Tiết {item.periodStart}-{item.periodEnd} ·
                                                        Phòng {item.room}
                                                    </Text>
                                                    <Text type="secondary">
                                                        <UserOutlined /> {item.teacherName}
                                                    </Text>
                                                </Space>
                                            }
                                        />
                                    </List.Item>
                                )}
                            />
                        )}
                    </Card>
                </Col>

                {/* Right Column - Recent Activities */}
                <Col xs={24} lg={12}>
                    <Card
                        title={
                            <Space>
                                <FileTextOutlined style={{ color: '#722ed1' }} />
                                <span>Hoạt động gần đây</span>
                            </Space>
                        }
                        style={{ borderRadius: 12, height: '100%' }}
                    >
                        {recentActivities.length === 0 ? (
                            <Empty
                                description="Chưa có hoạt động nào"
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                            />
                        ) : (
                            <List
                                itemLayout="horizontal"
                                dataSource={recentActivities}
                                renderItem={(item) => (
                                    <List.Item>
                                        <List.Item.Meta
                                            avatar={
                                                <Avatar
                                                    style={{
                                                        backgroundColor:
                                                            item.type === 'warning' ? '#ff4d4f' :
                                                                item.type === 'grade' ? '#52c41a' :
                                                                    item.type === 'registration' ? '#faad14' : '#722ed1'
                                                    }}
                                                    icon={
                                                        item.type === 'warning' ? <WarningOutlined /> :
                                                            item.type === 'grade' ? <TrophyOutlined /> :
                                                                item.type === 'registration' ? <BookOutlined /> : <FileTextOutlined />
                                                    }
                                                />
                                            }
                                            title={item.title}
                                            description={
                                                <Space direction="vertical" size={2}>
                                                    <Text type="secondary">{item.description}</Text>
                                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                                        {item.time}
                                                    </Text>
                                                </Space>
                                            }
                                        />
                                    </List.Item>
                                )}
                            />
                        )}
                    </Card>
                </Col>
            </Row>

            {/* Quick Actions */}
            <Divider style={{ margin: '24px 0 16px' }}>
                <Space>
                    <ExperimentOutlined style={{ color: '#722ed1' }} />
                    <Text strong>Chức năng nhanh</Text>
                </Space>
            </Divider>

            <Row gutter={[16, 16]}>
                <Col xs={24} sm={8}>
                    <Card
                        hoverable
                        style={{ borderRadius: 12, textAlign: 'center', height: '100%' }}
                        onClick={() => navigate('/registration')}
                    >
                        <BookOutlined style={{ fontSize: 40, color: '#722ed1', marginBottom: 12 }} />
                        <Title level={5} style={{ marginBottom: 4 }}>Đăng ký môn học</Title>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Đăng ký môn mới, xem các lớp khả dụng
                        </Text>
                    </Card>
                </Col>

                <Col xs={24} sm={8}>
                    <Card
                        hoverable
                        style={{ borderRadius: 12, textAlign: 'center', height: '100%' }}
                        onClick={() => navigate('/schedule')}
                    >
                        <CalendarOutlined style={{ fontSize: 40, color: '#1677ff', marginBottom: 12 }} />
                        <Title level={5} style={{ marginBottom: 4 }}>Lịch học</Title>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Xem thời khóa biểu chi tiết theo tuần
                        </Text>
                    </Card>
                </Col>

                <Col xs={24} sm={8}>
                    <Card
                        hoverable
                        style={{ borderRadius: 12, textAlign: 'center', height: '100%' }}
                        onClick={() => navigate('/grades')}
                    >
                        <TrophyOutlined style={{ fontSize: 40, color: '#52c41a', marginBottom: 12 }} />
                        <Title level={5} style={{ marginBottom: 4 }}>Kết quả học tập</Title>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Xem điểm, GPA và bảng điểm chi tiết
                        </Text>
                    </Card>
                </Col>
            </Row>

            {/* Footer Stats */}
            <Card style={{ marginTop: 24, borderRadius: 12, background: '#f9f0ff' }}>
                <Row gutter={[16, 16]} justify="space-around">
                    <Col xs={12} sm={6}>
                        <Statistic
                            title="Tổng số môn đã học"
                            value={totalCourses}
                            prefix={<BookOutlined />}
                        />
                    </Col>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title="Tỷ lệ đạt"
                            value={totalCourses > 0 ? Math.round((passedCourses / totalCourses) * 100) : 0}
                            suffix="%"
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Col>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title="Xếp loại"
                            value={classification}
                            valueStyle={{ color: gpaColor }}
                        />
                    </Col>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title="Tín chỉ tích lũy"
                            value={`${completedCredits}/${totalCreditsRequired}`}
                            prefix={<LineChartOutlined />}
                            valueStyle={{ color: '#722ed1' }}
                        />
                    </Col>
                </Row>
            </Card>

            <style>{`
                .ant-card-hoverable {
                    transition: all 0.3s;
                }
                .ant-card-hoverable:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 8px 24px rgba(114, 46, 209, 0.15) !important;
                }
            `}</style>
        </div>
    );
};

export default DashboardStudent;