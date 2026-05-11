import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Card,
    Descriptions,
    Table,
    Button,
    Spin,
    message,
    Tag,
    Space,
    Typography,
    Badge,
    Empty,
    Alert,
    Row,
    Col,
} from 'antd';
import {
    ArrowLeftOutlined,
    ReloadOutlined,
    TeamOutlined,
    CalendarOutlined,
    BookOutlined,
    DownloadOutlined,
} from '@ant-design/icons';
import api from '../../services/api';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;

// ============================================================
// Interfaces
// ============================================================
interface ClassDetailInfo {
    classId: string;
    classCode: string;
    subjectCode: string;
    subjectName: string;
    credits: number;
    teacherName: string;
    semesterName: string;
    schedule: {
        dayOfWeek: number;
        periodStart: number;
        periodEnd: number;
        room: string;
    } | null;
    maxStudents: number;
    currentStudents: number;
    status: string;
}

interface StudentInClass {
    studentId: string;
    studentCode: string;
    fullName: string;
    email: string;
    phone?: string;
    gender?: string;
}

// ============================================================
// Helpers
// ============================================================
const DAY_MAP: Record<number, string> = {
    2: 'Thứ 2',
    3: 'Thứ 3',
    4: 'Thứ 4',
    5: 'Thứ 5',
    6: 'Thứ 6',
    7: 'Thứ 7',
    8: 'CN',
};

const getScheduleText = (schedule: ClassDetailInfo['schedule']) => {
    if (!schedule) return 'Chưa có lịch học';
    return `${DAY_MAP[schedule.dayOfWeek] || 'Không xác định'} · Tiết ${schedule.periodStart}–${schedule.periodEnd} · Phòng ${schedule.room || 'Chưa xác định'}`;
};

const ClassDetail: React.FC = () => {
    const { classId } = useParams<{ classId: string }>();
    const navigate = useNavigate();

    const [classInfo, setClassInfo] = useState<ClassDetailInfo | null>(null);
    const [students, setStudents] = useState<StudentInClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchClassDetail = async () => {
        if (!classId) {
            setError('Không tìm thấy mã lớp');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 1. Gọi API chi tiết lớp (đầy đủ thông tin)
            const classRes = await api.get(`/Classes/${classId}`);
            console.log('API /Classes/{classId} response:', classRes.data);

            const detail = classRes.data;

            // Gán thông tin lớp từ API chi tiết
            setClassInfo({
                classId,
                classCode: detail.classCode || detail.ClassCode || 'Chưa xác định',
                subjectCode: detail.subject?.subjectCode || detail.Subject?.SubjectCode || '',
                subjectName: detail.subject?.subjectName || detail.Subject?.SubjectName || 'Chưa xác định',
                credits: detail.subject?.credits || detail.Subject?.Credits || 0,
                teacherName: detail.teacher?.fullName || detail.Teacher?.FullName || 'Chưa phân công',
                semesterName: detail.semester?.semesterName || detail.Semester?.SemesterName || 'Chưa xác định',
                schedule: detail.schedule
                    ? {
                        dayOfWeek: detail.schedule.dayOfWeek || detail.Schedule?.DayOfWeek,
                        periodStart: detail.schedule.periodStart || detail.Schedule?.PeriodStart,
                        periodEnd: detail.schedule.periodEnd || detail.Schedule?.PeriodEnd,
                        room: detail.schedule.room || detail.Schedule?.Room || 'Chưa xác định',
                    }
                    : null,
                maxStudents: detail.maxStudents || detail.MaxStudents || 0,
                currentStudents: detail.currentStudents || detail.CurrentStudents || 0,
                status: detail.status || detail.Status || 'OPEN',
            });

            // 2. Gọi API danh sách sinh viên (nếu cần riêng biệt)
            try {
                const studRes = await api.get(`/Classes/${classId}/students`);
                console.log('API /Classes/{classId}/students response:', studRes.data);
                setStudents(studRes.data.students || []);
            } catch (studErr) {
                console.warn('Không lấy được danh sách SV từ endpoint students:', studErr);
                // Không báo lỗi nặng, chỉ để trống danh sách SV nếu thất bại
                setStudents([]);
            }
        } catch (err: any) {
            console.error('Lỗi tải chi tiết lớp:', err);
            let msg = 'Không thể tải thông tin lớp học phần';

            if (err.response) {
                const { status, data } = err.response;
                if (status === 403) msg = 'Bạn không có quyền xem chi tiết lớp này';
                else if (status === 404) msg = 'Không tìm thấy lớp học phần';
                else if (data?.message) msg = data.message;
            }

            setError(msg);
            message.error(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClassDetail();
    }, [classId]);

    // Xuất Excel danh sách sinh viên
    const exportExcel = () => {
        if (students.length === 0) {
            message.warning('Không có sinh viên để xuất');
            return;
        }

        const data = students.map((s, i) => ({
            STT: i + 1,
            'Mã SV': s.studentCode,
            'Họ và tên': s.fullName,
            Email: s.email || 'Chưa cập nhật',
            'SĐT': s.phone || 'Chưa cập nhật',
            'Giới tính': s.gender === 'M' ? 'Nam' : s.gender === 'F' ? 'Nữ' : 'Khác/N/A',
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'DanhSachSinhVien');
        XLSX.writeFile(wb, `DS_SV_${classId || 'unknown'}.xlsx`);
        message.success('Đã xuất file Excel!');
    };

    // Columns bảng sinh viên (giữ nguyên)
    const studentColumns = [
        {
            title: 'STT',
            width: 60,
            render: (_: any, __: any, idx: number) => <Text type="secondary">{idx + 1}</Text>,
        },
        {
            title: 'Mã SV',
            dataIndex: 'studentCode',
            width: 120,
            render: (code: string) => <Text strong style={{ fontFamily: 'monospace' }}>{code}</Text>,
        },
        {
            title: 'Họ và tên',
            dataIndex: 'fullName',
            render: (name: string) => <Text>{name}</Text>,
        },
        {
            title: 'Email',
            dataIndex: 'email',
            render: (email: string) => email || <Text type="secondary">Chưa cập nhật</Text>,
        },
        {
            title: 'SĐT',
            dataIndex: 'phone',
            render: (phone: string) => phone || <Text type="secondary">Chưa cập nhật</Text>,
        },
        {
            title: 'Giới tính',
            dataIndex: 'gender',
            width: 100,
            render: (g?: string) => (
                <Tag color={g === 'M' ? 'blue' : g === 'F' ? 'pink' : 'default'}>
                    {g === 'M' ? 'Nam' : g === 'F' ? 'Nữ' : 'Khác/N/A'}
                </Tag>
            ),
        },
    ];

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
                <Spin size="large" tip="Đang tải thông tin lớp học phần..." />
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <Alert
                    message="Lỗi"
                    description={error}
                    type="error"
                    showIcon
                    action={
                        <Button type="primary" onClick={fetchClassDetail}>
                            Thử lại
                        </Button>
                    }
                />
            </div>
        );
    }

    return (
        <div style={{ padding: '0 24px' }}>
            {/* Header */}
            <div
                style={{
                    background: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)',
                    borderRadius: 12,
                    padding: '24px 28px',
                    marginBottom: 24,
                    boxShadow: '0 4px 20px rgba(114,46,209,0.25)',
                }}
            >
                <Row justify="space-between" align="middle" wrap>
                    <Col>
                        <Title level={3} style={{ color: '#fff', margin: 0 }}>
                            <BookOutlined style={{ marginRight: 10 }} />
                            Chi tiết lớp học phần
                        </Title>
                        {classInfo && (
                            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15 }}>
                                {classInfo.classCode} - {classInfo.subjectName}
                            </Text>
                        )}
                    </Col>
                    <Col>
                        <Space wrap>
                            <Button
                                icon={<ArrowLeftOutlined />}
                                onClick={() => navigate('/teacher-classes')}
                                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
                            >
                                Quay lại
                            </Button>
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={fetchClassDetail}
                                loading={loading}
                                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
                            >
                                Tải lại
                            </Button>
                            {students.length > 0 && (
                                <Button
                                    icon={<DownloadOutlined />}
                                    onClick={exportExcel}
                                    style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
                                >
                                    Xuất DS SV
                                </Button>
                            )}
                        </Space>
                    </Col>
                </Row>
            </div>

            {/* Thông tin lớp */}
            {classInfo && (
                <Card style={{ borderRadius: 12, marginBottom: 24 }}>
                    <Descriptions bordered column={2} size="middle">
                        <Descriptions.Item label="Mã lớp">
                            <Text strong>{classInfo.classCode}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Môn học">
                            <Text strong>
                                {classInfo.subjectName} ({classInfo.subjectCode || 'N/A'})
                            </Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Số tín chỉ">
                            <Text>{classInfo.credits} tín chỉ</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Giảng viên">
                            <Text>{classInfo.teacherName}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Học kỳ">
                            <Text>{classInfo.semesterName}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Lịch học" span={2}>
                            <Text>{getScheduleText(classInfo.schedule)}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Sĩ số">
                            <Badge
                                count={`${classInfo.currentStudents}/${classInfo.maxStudents}`}
                                style={{
                                    backgroundColor:
                                        classInfo.currentStudents >= classInfo.maxStudents ? '#ff4d4f' : '#52c41a',
                                }}
                            />
                        </Descriptions.Item>
                        <Descriptions.Item label="Trạng thái">
                            <Tag color={classInfo.status === 'OPEN' ? 'success' : 'default'}>
                                {classInfo.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
                            </Tag>
                        </Descriptions.Item>
                    </Descriptions>
                </Card>
            )}

            {/* Danh sách sinh viên */}
            <Card
                title={
                    <Space>
                        <TeamOutlined />
                        Danh sách sinh viên ({students.length} SV)
                    </Space>
                }
                extra={
                    students.length > 0 && (
                        <Button icon={<DownloadOutlined />} onClick={exportExcel}>
                            Xuất Excel
                        </Button>
                    )
                }
                style={{ borderRadius: 12 }}
            >
                {students.length === 0 ? (
                    <Empty description="Lớp này chưa có sinh viên đăng ký hoặc chưa được duyệt" />
                ) : (
                    <Table
                        columns={[
                            { title: 'STT', width: 60, render: (_, __, i) => i + 1 },
                            { title: 'Mã SV', dataIndex: 'studentCode', width: 120 },
                            { title: 'Họ và tên', dataIndex: 'fullName' },
                            { title: 'Email', dataIndex: 'email' },
                            { title: 'SĐT', dataIndex: 'phone' },
                            {
                                title: 'Giới tính',
                                dataIndex: 'gender',
                                render: (g) => (g === 'M' ? 'Nam' : g === 'F' ? 'Nữ' : 'Khác'),
                            },
                        ]}
                        dataSource={students}
                        rowKey="studentId"
                        pagination={{ pageSize: 15 }}
                    />
                )}
            </Card>
        </div>
    );
};

export default ClassDetail;