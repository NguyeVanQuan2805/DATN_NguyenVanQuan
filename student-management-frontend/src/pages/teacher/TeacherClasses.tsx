// TeacherClasses.tsx
import React, { useState, useEffect } from 'react';
import { Table, Card, Tag, Button, message, Spin, Tooltip, Space, Typography, Badge, Select, Statistic } from 'antd';
import { CalendarOutlined, ReloadOutlined, TeamOutlined, EditOutlined, CheckSquareOutlined, BookOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const { Title, Text } = Typography;
const { Option } = Select;

interface TeachingClass {
    classId: string;
    classCode: string;
    subject: { subjectCode: string; subjectName: string; credits: number };
    semester: { semesterId: string; semesterName: string; academicYear: number };
    schedule: { dayOfWeek: number; periodStart: number; periodEnd: number; room: string } | null;
    maxStudents: number;
    currentStudents: number;
    status: string;
}

const DAY_MAP: Record<number, string> = {
    2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4',
    5: 'Thứ 5', 6: 'Thứ 6', 7: 'Thứ 7', 8: 'CN',
};

const TeacherClasses: React.FC = () => {
    const navigate = useNavigate();
    const [classes, setClasses] = useState<TeachingClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSemester, setSelectedSemester] = useState<string>('all');

    useEffect(() => {
        fetchMyClasses();
    }, []);

    const fetchMyClasses = async () => {
        setLoading(true);
        try {
            const res = await api.get('/Classes/my-classes');
            console.log('Classes data:', res.data);
            setClasses(res.data || []);

            if (res.data && res.data.length > 0) {
                message.success(`Tải thành công ${res.data.length} lớp`);
            } else {
                message.info('Bạn chưa được phân công lớp nào');
            }
        } catch (err: any) {
            console.error('Lỗi tải lớp:', err);
            message.error('Không thể tải danh sách lớp: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    // Lấy danh sách học kỳ unique từ các lớp
    const semesters = Array.from(
        new Map(
            classes.map(c => [c.semester.semesterId, {
                semesterId: c.semester.semesterId,
                semesterName: c.semester.semesterName,
                academicYear: c.semester.academicYear
            }])
        ).values()
    ).sort((a, b) => b.academicYear - a.academicYear);

    // Filter classes theo học kỳ
    const filteredClasses = selectedSemester === 'all'
        ? classes
        : classes.filter(c => c.semester.semesterId === selectedSemester);

    // Thống kê
    const stats = {
        total: filteredClasses.length,
        open: filteredClasses.filter(c => c.status === 'OPEN').length,
        totalStudents: filteredClasses.reduce((sum, c) => sum + c.currentStudents, 0),
        currentSemester: filteredClasses.filter(c => c.semester.academicYear === new Date().getFullYear()).length
    };

    const goToClassDetail = (classId: string) => {
        navigate(`/teacher/class/${classId}`);
    };

    const goToAttendance = (cls: TeachingClass) => {
        navigate('/attendance', {
            state: {
                classId: cls.classId,
                classCode: cls.classCode,
                subjectName: cls.subject.subjectName,
            },
        });
    };

    const goToGrading = (cls: TeachingClass) => {
        navigate('/grading', {
            state: {
                classId: cls.classId,
                classCode: cls.classCode,
                subjectName: cls.subject.subjectName,
            },
        });
    };

    const columns = [
        {
            title: 'Mã lớp',
            dataIndex: 'classCode',
            key: 'classCode',
            width: 120,
            render: (v: string) => <Text code style={{ color: '#1677ff' }}>{v}</Text>,
        },
        {
            title: 'Môn học',
            key: 'subject',
            render: (_: any, r: TeachingClass) => (
                <div>
                    <Text strong>{r.subject.subjectCode}</Text> – {r.subject.subjectName}
                    <div>
                        <Tag color="geekblue" style={{ fontSize: 11, marginTop: 2 }}>
                            {r.subject.credits} TC
                        </Tag>
                    </div>
                </div>
            ),
        },
        {
            title: 'Học kỳ',
            key: 'semester',
            width: 150,
            render: (_: any, r: TeachingClass) => (
                <Tag color="purple">{r.semester.semesterName}</Tag>
            ),
        },
        {
            title: 'Lịch học',
            key: 'schedule',
            render: (_: any, r: TeachingClass) =>
                r.schedule ? (
                    <Text style={{ fontSize: 13 }}>
                        <CalendarOutlined style={{ marginRight: 4 }} />
                        {DAY_MAP[r.schedule.dayOfWeek]} · T{r.schedule.periodStart}–{r.schedule.periodEnd} · {r.schedule.room}
                    </Text>
                ) : (
                    <Tag color="default">Chưa có lịch</Tag>
                ),
        },
        {
            title: 'Sĩ số',
            key: 'students',
            width: 110,
            render: (_: any, r: TeachingClass) => {
                const full = r.currentStudents >= r.maxStudents;
                const percentage = Math.round((r.currentStudents / r.maxStudents) * 100);
                return (
                    <Badge
                        count={`${r.currentStudents}/${r.maxStudents}`}
                        style={{
                            backgroundColor: full ? '#ff4d4f' : percentage > 80 ? '#faad14' : '#52c41a',
                        }}
                    />
                );
            },
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 110,
            render: (status: string) => (
                <Tag color={status === 'OPEN' ? 'success' : status === 'CANCELLED' ? 'error' : 'default'}>
                    {status === 'OPEN' ? 'Đang mở' : status === 'CLOSED' ? 'Đã đóng' : 'Đã hủy'}
                </Tag>
            ),
        },
        {
            title: 'Hành động',
            key: 'action',
            width: 280,
            render: (_: any, record: TeachingClass) => (
                <Space size={8} wrap>
                    <Tooltip title="Xem chi tiết lớp & danh sách sinh viên">
                        <Button
                            type="default"
                            icon={<EyeOutlined />}
                            size="small"
                            onClick={() => goToClassDetail(record.classId)}
                        >
                            Chi tiết
                        </Button>
                    </Tooltip>
                    <Tooltip title="Điểm danh lớp này">
                        <Button
                            type="primary"
                            icon={<CheckSquareOutlined />}
                            size="small"
                            onClick={() => goToAttendance(record)}
                            style={{ background: '#722ed1', borderColor: '#722ed1' }}
                        >
                            Điểm danh
                        </Button>
                    </Tooltip>
                    <Tooltip title="Nhập điểm lớp này">
                        <Button
                            icon={<EditOutlined />}
                            size="small"
                            onClick={() => goToGrading(record)}
                        >
                            Nhập điểm
                        </Button>
                    </Tooltip>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '0 16px' }}>
            {/* Header */}
            <div style={{
                background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
                borderRadius: 12,
                padding: '20px 24px',
                marginBottom: 20,
            }}>
                <Title level={3} style={{ color: '#fff', margin: 0 }}>
                    <BookOutlined style={{ marginRight: 10 }} />
                    Lớp học phần tôi dạy
                </Title>
                <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Quản lý các lớp học được phân công giảng dạy
                </Text>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
                <Card size="small">
                    <Statistic title="Tổng số lớp" value={stats.total} prefix={<BookOutlined />} />
                </Card>
                <Card size="small">
                    <Statistic title="Đang mở" value={stats.open} prefix={<TeamOutlined />} valueStyle={{ color: '#52c41a' }} />
                </Card>
                <Card size="small">
                    <Statistic title="Tổng sinh viên" value={stats.totalStudents} prefix={<TeamOutlined />} />
                </Card>
            </div>

            {/* Filter by Semester */}
            {semesters.length > 0 && (
                <Card size="small" style={{ marginBottom: 16 }}>
                    <Space>
                        <Text strong>Lọc theo học kỳ:</Text>
                        <Select
                            value={selectedSemester}
                            onChange={setSelectedSemester}
                            style={{ width: 250 }}
                        >
                            <Option value="all">Tất cả học kỳ</Option>
                            {semesters.map(s => (
                                <Option key={s.semesterId} value={s.semesterId}>
                                    {s.semesterName}
                                </Option>
                            ))}
                        </Select>
                        <Button icon={<ReloadOutlined />} onClick={fetchMyClasses} loading={loading}>
                            Làm mới
                        </Button>
                    </Space>
                </Card>
            )}

            {/* Classes Table */}
            <Card style={{ borderRadius: 12 }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px 0' }}>
                        <Spin tip="Đang tải danh sách lớp..." />
                    </div>
                ) : filteredClasses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                        {classes.length === 0
                            ? 'Bạn chưa được phân công lớp nào trong hệ thống.'
                            : 'Không có lớp nào trong học kỳ này.'}
                    </div>
                ) : (
                    <Table
                        columns={columns}
                        dataSource={filteredClasses}
                        rowKey="classId"
                        pagination={{
                            pageSize: 10,
                            showTotal: (total) => `Tổng ${total} lớp`,
                            showSizeChanger: true
                        }}
                        scroll={{ x: 1200 }}
                    />
                )}
            </Card>
        </div>
    );
};

export default TeacherClasses;