// src/pages/student/PersonalSchedule.tsx
import React, { useState, useEffect, useContext } from 'react';
import {
    Table,
    Spin,
    message,
    Card,
    Tag,
    Typography,
    Empty,
    Row,
    Col,
    Statistic,
    Select,
    Button,
    Space,
    Badge,
    Alert,
    Tabs,
    Progress,
} from 'antd';
import {
    CalendarOutlined,
    ReloadOutlined,
    BookOutlined,
    ClockCircleOutlined,
    TeamOutlined,
    EnvironmentOutlined,
    UserOutlined,
    CheckCircleOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import dayjs from 'dayjs';
import { extractErrorMessage } from '../../utils/errorHandler';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

// ============================================================
// Interfaces
// ============================================================
interface ScheduleItem {
    classId: string;
    classCode: string;
    subjectName: string;
    credits: number;
    teacherName: string;
    dayOfWeek: number;
    periodStart: number;
    periodEnd: number;
    room: string;
    status: string;
    registeredAt?: string;
}

interface Semester {
    semesterId: string;
    semesterName: string;
    academicYear: number;
    semesterNumber: number;
    isRegistrationOpen: boolean;
}

interface GroupedSchedule {
    [key: string]: ScheduleItem[];
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

const DAYS_ORDER = [2, 3, 4, 5, 6, 7, 8];

const PERIODS = [
    { start: 1, end: 3, time: '07:30 - 09:30' },
    { start: 4, end: 6, time: '09:45 - 11:45' },
    { start: 7, end: 9, time: '13:00 - 15:00' },
    { start: 10, end: 12, time: '15:15 - 17:15' },
    { start: 13, end: 14, time: '17:30 - 19:00' },
];

const getPeriodTime = (start: number, end: number): string => {
    const period = PERIODS.find(p => p.start === start && p.end === end);
    return period ? period.time : `${start}:00 - ${end}:00`;
};

// ============================================================
// Component
// ============================================================
const PersonalSchedule: React.FC = () => {
    const { user } = useContext(AuthContext)!;
    const studentId = user?.studentId;

    const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSemester, setSelectedSemester] = useState<string>('');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

    // ============================================================
    // Load initial data
    // ============================================================
    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            // 1. Load danh sách học kỳ
            const semestersRes = await api.get('/Semesters');
            const semestersData = semestersRes.data || [];
            setSemesters(semestersData);

            // 2. Lấy học kỳ hiện tại từ SystemConfig
            const configRes = await api.get('/SystemConfigs');
            const configs = configRes.data || [];
            const currentSemesterConfig = configs.find((c: any) => c.configKey === 'CurrentSemester');

            if (currentSemesterConfig) {
                setSelectedSemester(currentSemesterConfig.configValue);
            } else if (semestersData.length > 0) {
                setSelectedSemester(semestersData[0].semesterId);
            }

            // 3. Load lịch học nếu có studentId
            if (studentId) {
                await fetchSchedule();
            }

        } catch (err: any) {
            console.error('Lỗi tải dữ liệu:', err);
            message.error('Không thể tải dữ liệu học kỳ');
        } finally {
            setLoading(false);
        }
    };

    // ============================================================
    // Fetch schedule
    // ============================================================
    const fetchSchedule = async () => {
        if (!studentId || !selectedSemester) {
            setSchedules([]);
            return;
        }

        setLoading(true);
        try {
            console.log('Đang tải lịch học cho sinh viên:', studentId, 'học kỳ:', selectedSemester);

            // CÁCH 1: Lấy từ personal-schedule
            const response = await api.get(`/CourseRegistrations/personal-schedule/${studentId}`, {
                params: { semesterId: selectedSemester }
            });

            console.log('Dữ liệu lịch học từ API:', response.data);

            let scheduleData: ScheduleItem[] = [];

            // Xử lý response theo nhiều format khác nhau
            if (response.data?.data && Array.isArray(response.data.data)) {
                scheduleData = response.data.data;
            } else if (Array.isArray(response.data)) {
                scheduleData = response.data;
            } else if (response.data?.items && Array.isArray(response.data.items)) {
                scheduleData = response.data.items;
            }

            console.log('Dữ liệu sau khi xử lý:', scheduleData);

            // Sắp xếp theo ngày và tiết
            const sorted = scheduleData.sort((a, b) => {
                if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
                return a.periodStart - b.periodStart;
            });

            setSchedules(sorted);

        } catch (err: any) {
            console.error('Lỗi tải lịch học:', err);

            // CÁCH 2: Thử lấy từ CourseRegistrations/student
            try {
                console.log('Thử cách 2: Lấy từ CourseRegistrations/student');
                const regRes = await api.get(`/CourseRegistrations/student/${studentId}`);
                const registrations = regRes.data || [];

                // Lọc theo học kỳ và status APPROVED
                const filteredRegs = registrations.filter((reg: any) => {
                    const semesterId = reg.class?.semesterId || reg.semesterId;
                    return semesterId === selectedSemester &&
                        (reg.status === 'APPROVED' || reg.status === 'PENDING');
                });

                // Transform thành ScheduleItem
                const scheduleFromRegs: ScheduleItem[] = filteredRegs.map((reg: any) => {
                    const classData = reg.class || {};
                    const subjectData = classData.subject || {};
                    const teacherData = classData.teacher || {};
                    const scheduleData = classData.schedule || {};

                    return {
                        classId: reg.classId || classData.classId || '',
                        classCode: classData.classCode || reg.classCode || 'N/A',
                        subjectName: subjectData.subjectName || classData.subjectName || 'N/A',
                        credits: subjectData.credits || classData.credits || 0,
                        teacherName: teacherData.fullName || teacherData.name || classData.teacherName || 'N/A',
                        dayOfWeek: scheduleData.dayOfWeek || 0,
                        periodStart: scheduleData.periodStart || 0,
                        periodEnd: scheduleData.periodEnd || 0,
                        room: scheduleData.room || 'N/A',
                        status: reg.status || 'APPROVED',
                        registeredAt: reg.registeredAt,
                    };
                });

                const sorted = scheduleFromRegs.sort((a, b) => {
                    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
                    return a.periodStart - b.periodStart;
                });

                setSchedules(sorted);

            } catch (secondErr) {
                console.error('Cả 2 cách đều thất bại:', secondErr);

                // CÁCH 3: Mock data cho development
                if (process.env.NODE_ENV === 'development') {
                    console.log('Dùng mock data cho development');
                    const mockData: ScheduleItem[] = [
                        {
                            classId: 'C001',
                            classCode: 'IT101_01',
                            subjectName: 'Lập trình cơ bản',
                            credits: 3,
                            teacherName: 'Nguyễn Văn A',
                            dayOfWeek: 2,
                            periodStart: 1,
                            periodEnd: 3,
                            room: 'P301',
                            status: 'APPROVED',
                        },
                        {
                            classId: 'C002',
                            classCode: 'IT102_01',
                            subjectName: 'Cấu trúc dữ liệu',
                            credits: 3,
                            teacherName: 'Trần Thị B',
                            dayOfWeek: 4,
                            periodStart: 4,
                            periodEnd: 6,
                            room: 'P302',
                            status: 'APPROVED',
                        },
                        {
                            classId: 'C003',
                            classCode: 'IT201_01',
                            subjectName: 'Cơ sở dữ liệu',
                            credits: 3,
                            teacherName: 'Lê Văn C',
                            dayOfWeek: 6,
                            periodStart: 7,
                            periodEnd: 9,
                            room: 'P401',
                            status: 'APPROVED',
                        },
                    ];
                    setSchedules(mockData);
                } else {
                    message.warning('Không thể tải lịch học');
                    setSchedules([]);
                }
            }
        } finally {
            setLoading(false);
        }
    };

    // ============================================================
    // Effects
    // ============================================================
    useEffect(() => {
        if (studentId && selectedSemester) {
            fetchSchedule();
        }
    }, [studentId, selectedSemester]);

    // ============================================================
    // Computed values
    // ============================================================
    const totalCredits = schedules.reduce((sum, s) => sum + (s.credits || 0), 0);
    const totalCourses = schedules.length;

    const groupedByDay = schedules.reduce((acc, item) => {
        const day = item.dayOfWeek;
        if (!acc[day]) acc[day] = [];
        acc[day].push(item);
        return acc;
    }, {} as GroupedSchedule);

    const daysWithSchedule = Object.keys(groupedByDay).map(Number).sort();

    // ============================================================
    // Columns
    // ============================================================
    const columns: ColumnsType<ScheduleItem> = [
        {
            title: 'Thứ',
            dataIndex: 'dayOfWeek',
            width: 90,
            render: (day: number) => (
                <Tag color="purple" style={{ minWidth: 60, textAlign: 'center' }}>
                    {DAY_MAP[day] || `Thứ ${day}`}
                </Tag>
            ),
            sorter: (a, b) => a.dayOfWeek - b.dayOfWeek,
        },
        {
            title: 'Tiết',
            width: 100,
            render: (_, r) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{r.periodStart} – {r.periodEnd}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        {getPeriodTime(r.periodStart, r.periodEnd)}
                    </Text>
                </Space>
            ),
        },
        {
            title: 'Phòng',
            dataIndex: 'room',
            width: 100,
            render: (room: string) => (
                <Tag icon={<EnvironmentOutlined />} color="cyan">
                    {room || '—'}
                </Tag>
            ),
        },
        {
            title: 'Mã lớp',
            dataIndex: 'classCode',
            width: 110,
            render: (code: string) => <Text code style={{ color: '#722ed1' }}>{code}</Text>,
        },
        {
            title: 'Môn học',
            render: (_, r) => (
                <Space direction="vertical" size={2}>
                    <Text strong>{r.subjectName}</Text>
                    <Tag color="geekblue" style={{ fontSize: 11 }}>{r.credits} TC</Tag>
                </Space>
            ),
        },
        {
            title: 'Giảng viên',
            dataIndex: 'teacherName',
            width: 160,
            render: (name: string) => (
                <Space>
                    <UserOutlined style={{ color: '#722ed1' }} />
                    <Text>{name}</Text>
                </Space>
            ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            width: 120,
            render: (status: string) => {
                const config = {
                    APPROVED: { color: 'success', text: '✅ Đã đăng ký' },
                    PENDING: { color: 'warning', text: '⏳ Chờ duyệt' },
                    REJECTED: { color: 'error', text: '❌ Từ chối' },
                    DROPPED: { color: 'default', text: '🚫 Đã hủy' },
                };
                const cfg = config[status as keyof typeof config] || { color: 'default', text: status };
                return <Tag color={cfg.color}>{cfg.text}</Tag>;
            },
        },
    ];

    // ============================================================
    // Render grid view
    // ============================================================
    const renderGridView = () => {
        if (schedules.length === 0) {
            return <Empty description="Không có lịch học trong học kỳ này" />;
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {DAYS_ORDER.map(day => {
                    const daySchedules = schedules.filter(s => s.dayOfWeek === day);
                    if (daySchedules.length === 0) return null;

                    return (
                        <Card key={day} size="small" title={DAY_MAP[day]} style={{ borderRadius: 8 }}>
                            {daySchedules.map((item, index) => (
                                <div
                                    key={item.classId}
                                    style={{
                                        padding: '12px',
                                        marginBottom: index < daySchedules.length - 1 ? 8 : 0,
                                        background: '#f9f9f9',
                                        borderRadius: 6,
                                        border: '1px solid #f0f0f0',
                                    }}
                                >
                                    <Row gutter={[16, 8]} align="middle">
                                        <Col span={4}>
                                            <Tag color="purple" style={{ fontWeight: 'bold' }}>
                                                Tiết {item.periodStart}-{item.periodEnd}
                                            </Tag>
                                            <div>
                                                <Text type="secondary" style={{ fontSize: 11 }}>
                                                    {getPeriodTime(item.periodStart, item.periodEnd)}
                                                </Text>
                                            </div>
                                        </Col>
                                        <Col span={5}>
                                            <Text code style={{ color: '#722ed1' }}>{item.classCode}</Text>
                                        </Col>
                                        <Col span={6}>
                                            <Text strong>{item.subjectName}</Text>
                                            <Tag color="geekblue" style={{ marginLeft: 8 }}>{item.credits} TC</Tag>
                                        </Col>
                                        <Col span={4}>
                                            <Tag icon={<EnvironmentOutlined />} color="cyan">
                                                {item.room}
                                            </Tag>
                                        </Col>
                                        <Col span={5}>
                                            <Space>
                                                <UserOutlined style={{ color: '#722ed1' }} />
                                                <Text>{item.teacherName}</Text>
                                            </Space>
                                        </Col>
                                    </Row>
                                </div>
                            ))}
                        </Card>
                    );
                })}
            </div>
        );
    };

    // ============================================================
    // Render
    // ============================================================
    if (loading && schedules.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
                <Spin size="large" tip="Đang tải lịch học..." />
            </div>
        );
    }

    return (
        <div style={{ padding: '0 24px' }}>
            {/* Header */}
            <div style={{
                background: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)',
                borderRadius: 12,
                padding: '20px 24px',
                marginBottom: 20,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <Title level={3} style={{ color: '#fff', margin: 0 }}>
                        <CalendarOutlined style={{ marginRight: 10 }} />
                        Lịch học cá nhân
                    </Title>
                    <Text style={{ color: 'rgba(255,255,255,0.85)' }}>
                        {semesters.find(s => s.semesterId === selectedSemester)?.semesterName || 'Chọn học kỳ'}
                    </Text>
                </div>
                <Button
                    icon={<ReloadOutlined />}
                    onClick={fetchSchedule}
                    loading={loading}
                    style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}
                >
                    Làm mới
                </Button>
            </div>

            {/* Controls */}
            <Card style={{ marginBottom: 20, borderRadius: 12 }}>
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} md={10}>
                        <Text strong>Chọn học kỳ:</Text>
                        <Select
                            value={selectedSemester}
                            onChange={setSelectedSemester}
                            style={{ width: '100%', marginTop: 4 }}
                            placeholder="Chọn học kỳ"
                            loading={loading}
                        >
                            {semesters.map(sem => (
                                <Option key={sem.semesterId} value={sem.semesterId}>
                                    {sem.semesterName} {!sem.isRegistrationOpen && '(Đã đóng)'}
                                </Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={24} md={8}>
                        <Text strong>Chế độ xem:</Text>
                        <div style={{ marginTop: 4 }}>
                            <Button.Group>
                                <Button
                                    type={viewMode === 'table' ? 'primary' : 'default'}
                                    onClick={() => setViewMode('table')}
                                >
                                    Bảng
                                </Button>
                                <Button
                                    type={viewMode === 'grid' ? 'primary' : 'default'}
                                    onClick={() => setViewMode('grid')}
                                >
                                    Theo ngày
                                </Button>
                            </Button.Group>
                        </div>
                    </Col>
                    <Col xs={24} md={6}>
                        <Text strong>Thống kê:</Text>
                        <div style={{ marginTop: 4 }}>
                            <Badge
                                count={`${totalCourses} môn`}
                                style={{ backgroundColor: '#722ed1', marginRight: 8 }}
                            />
                            <Badge
                                count={`${totalCredits} TC`}
                                style={{ backgroundColor: '#52c41a' }}
                            />
                        </div>
                    </Col>
                </Row>
            </Card>

            {/* Stats Cards */}
            {schedules.length > 0 && (
                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                    <Col xs={24} sm={8}>
                        <Card size="small" style={{ background: '#f9f0ff', borderRadius: 10 }}>
                            <Statistic
                                title="Tổng số môn"
                                value={totalCourses}
                                prefix={<BookOutlined style={{ color: '#722ed1' }} />}
                                styles={{ content: { color: '#722ed1' } }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card size="small" style={{ background: '#f6ffed', borderRadius: 10 }}>
                            <Statistic
                                title="Tổng tín chỉ"
                                value={totalCredits}
                                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                                styles={{ content: { color: '#52c41a' } }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card size="small" style={{ background: '#e6f4ff', borderRadius: 10 }}>
                            <Statistic
                                title="Số ngày học"
                                value={daysWithSchedule.length}
                                prefix={<CalendarOutlined style={{ color: '#1677ff' }} />}
                                styles={{ content: { color: '#1677ff' } }}
                            />
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Alert nếu chưa có lịch học */}
            {!loading && schedules.length === 0 && selectedSemester && (
                <Alert
                    type="info"
                    showIcon
                    message="Chưa có lịch học"
                    description={
                        <span>
                            Bạn chưa đăng ký môn học nào trong học kỳ này.
                            <Button
                                type="link"
                                href="/registration"
                                style={{ padding: 0, marginLeft: 8 }}
                            >
                                Đăng ký ngay
                            </Button>
                        </span>
                    }
                    style={{ marginBottom: 16, borderRadius: 8 }}
                />
            )}

            {/* Schedule Display */}
            <Card
                style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
                bodyStyle={{ padding: viewMode === 'grid' ? 16 : 0 }}
            >
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 60 }}>
                        <Spin tip="Đang tải lịch học..." />
                    </div>
                ) : schedules.length === 0 ? (
                    <Empty
                        description={
                            <span>
                                Không có lịch học trong học kỳ này
                                <br />
                                <Text type="secondary">Vui lòng chọn học kỳ khác hoặc đăng ký môn học</Text>
                            </span>
                        }
                    />
                ) : (
                    <>
                        {viewMode === 'table' ? (
                            <Table
                                columns={columns}
                                dataSource={schedules}
                                rowKey="classId"
                                pagination={false}
                                scroll={{ x: 1000 }}
                                rowClassName={(r) =>
                                    r.dayOfWeek % 2 === 0 ? 'row-even' : 'row-odd'
                                }
                            />
                        ) : (
                            renderGridView()
                        )}
                    </>
                )}
            </Card>

            {/* CSS */}
            <style>{`
                .row-even td {
                    background: #fafafa;
                }
                .row-even:hover td {
                    background: #f0f5ff !important;
                }
                .row-odd td {
                    background: #fff;
                }
                .row-odd:hover td {
                    background: #f0f5ff !important;
                }
                .ant-table-thead > tr > th {
                    background: #f0f5ff !important;
                    font-weight: 700 !important;
                    border-bottom: 2px solid #722ed1 !important;
                }
            `}</style>
        </div>
    );
};

export default PersonalSchedule;