// src/pages/teacher/Attendance.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Card,
    Row,
    Col,
    Select,
    DatePicker,
    Button,
    Table,
    Tag,
    Spin,
    message,
    Typography,
    Space,
    Alert,
    Badge,
    Empty,
    Radio,
    Divider,
    Modal,
    DatePickerProps
} from 'antd';
import type { Dayjs } from 'dayjs';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    MinusCircleOutlined,
    SaveOutlined,
    ReloadOutlined,
    CalendarOutlined,
    TeamOutlined,
    ExclamationCircleOutlined,
    DownloadOutlined,
    ClockCircleOutlined,
    HistoryOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;
const { Option } = Select;

// ============================================================
// Interfaces
// ============================================================
interface TeachingClass {
    classId: string;
    classCode: string;
    subject: { subjectCode: string; subjectName: string; credits: number };
    semester: { semesterId: string; semesterName: string; startDate?: string; endDate?: string };
    schedule: { dayOfWeek: number; periodStart: number; periodEnd: number; room: string } | null;
    maxStudents: number;
    currentStudents: number;
    status: string;
}

interface Student {
    studentId: string;
    studentCode: string;
    fullName: string;
    email: string;
    phone?: string;
    gender?: string;
}

interface AttendanceRecord {
    attendanceId?: number;
    studentId: string;
    studentCode: string;
    fullName: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
    note?: string;
}

interface AttendanceSession {
    id: string;
    date: string;
    periodStart: number;
    periodEnd: number;
    room: string;
    isSaved: boolean;
}

interface AttendanceHistory {
    date: string;
    periodStart: number;
    periodEnd: number;
    room: string;
    totalStudents: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    excusedCount: number;
}

const STATUS_CONFIG = {
    PRESENT: { label: 'Có mặt', color: 'success', icon: <CheckCircleOutlined />, bg: '#f6ffed' },
    ABSENT: { label: 'Vắng mặt', color: 'error', icon: <CloseCircleOutlined />, bg: '#fff2f0' },
    LATE: { label: 'Đi muộn', color: 'warning', icon: <ExclamationCircleOutlined />, bg: '#fffbe6' },
    EXCUSED: { label: 'Có phép', color: 'processing', icon: <MinusCircleOutlined />, bg: '#e6f4ff' },
};

const DAY_MAP: Record<number, string> = {
    2: 'Thứ 2',
    3: 'Thứ 3',
    4: 'Thứ 4',
    5: 'Thứ 5',
    6: 'Thứ 6',
    7: 'Thứ 7',
    8: 'CN',
};

// ============================================================
// Main Component
// ============================================================
const Attendance: React.FC = () => {
    const [searchParams] = useSearchParams();
    const preSelectedClassId = searchParams.get('classId');

    const [myClasses, setMyClasses] = useState<TeachingClass[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string | null>(preSelectedClassId);
    const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
    const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
    const [availableSessions, setAvailableSessions] = useState<AttendanceSession[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loadingClasses, setLoadingClasses] = useState(true);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [saving, setSaving] = useState(false);
    const [hasUnsaved, setHasUnsaved] = useState(false);
    const [attendanceHistory, setAttendanceHistory] = useState<AttendanceHistory[]>([]);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [attendedDates, setAttendedDates] = useState<Set<string>>(new Set());

    // Load danh sách lớp đang dạy
    useEffect(() => {
        const fetchClasses = async () => {
            setLoadingClasses(true);
            try {
                const res = await api.get('/Classes/my-classes');
                const classList: TeachingClass[] = res.data || [];
                setMyClasses(classList);

                if (preSelectedClassId && classList.some((c) => c.classId === preSelectedClassId)) {
                    setSelectedClassId(preSelectedClassId);
                } else if (classList.length > 0 && !selectedClassId) {
                    setSelectedClassId(classList[0].classId);
                }
            } catch (err: any) {
                message.error('Không thể tải danh sách lớp đang dạy');
            } finally {
                setLoadingClasses(false);
            }
        };
        fetchClasses();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Tạo danh sách các buổi học có thể điểm danh
    const generateSessions = useCallback(async (classId: string, date: Dayjs) => {
        const cls = myClasses.find(c => c.classId === classId);
        if (!cls?.schedule) {
            setAvailableSessions([]);
            setSelectedSession(null);
            return;
        }

        setLoadingSessions(true);

        const selectedDayOfWeek = date.day(); // 0=CN, 1=T2, ..., 6=T7
        const selectedDayNum = selectedDayOfWeek === 0 ? 8 : selectedDayOfWeek + 1;

        if (selectedDayNum !== cls.schedule.dayOfWeek) {
            setAvailableSessions([]);
            setSelectedSession(null);
            setLoadingSessions(false);
            message.warning(`Ngày ${date.format('DD/MM/YYYY')} không phải ngày học của lớp này`);
            return;
        }

        const session: AttendanceSession = {
            id: `${classId}_${date.format('YYYY-MM-DD')}_${cls.schedule.periodStart}`,
            date: date.format('YYYY-MM-DD'),
            periodStart: cls.schedule.periodStart,
            periodEnd: cls.schedule.periodEnd,
            room: cls.schedule.room,
            isSaved: false,
        };

        setAvailableSessions([session]);
        setSelectedSession(session);
        setLoadingSessions(false);
    }, [myClasses]);

    // Load sinh viên + điểm danh đã có cho buổi học
    // Dùng GET /api/Attendances/class/{classId}?date=... (endpoint mới trên backend)
    const loadStudentsAndAttendance = useCallback(async () => {
        if (!selectedClassId || !selectedSession) {
            setStudents([]);
            setRecords([]);
            return;
        }

        setLoadingStudents(true);
        try {
            // 1. Load danh sách sinh viên trong lớp
            const studRes = await api.get(`/Classes/${selectedClassId}/students`);
            const studentList: Student[] = studRes.data.students || [];
            setStudents(studentList);

            // 2. Load điểm danh đã có của lớp theo ngày
            //    GET /api/Attendances/class/{classId}?date=yyyy-MM-dd
            const attendanceMap = new Map<string, AttendanceRecord>();
            let hasSavedRecords = false;

            try {
                const attRes = await api.get(`/Attendances/class/${selectedClassId}`, {
                    params: { date: selectedSession.date },
                });
                const savedRecords: any[] = attRes.data || [];

                savedRecords.forEach(a => {
                    attendanceMap.set(a.studentId, {
                        attendanceId: a.attendanceId,
                        studentId: a.studentId,
                        studentCode: a.studentCode,
                        fullName: a.studentFullName,
                        status: a.status as AttendanceRecord['status'],
                        note: a.notes || '',
                    });
                });

                hasSavedRecords = savedRecords.length > 0;
            } catch (err: any) {
                if (err.response?.status !== 404) {
                    console.warn('Lỗi tải điểm danh cũ:', err);
                }
            }

            // 3. Map từng sinh viên: dùng dữ liệu đã lưu nếu có, mặc định PRESENT
            const initialRecords: AttendanceRecord[] = studentList.map(s => {
                const existing = attendanceMap.get(s.studentId);
                if (existing) {
                    return { ...existing, studentCode: s.studentCode, fullName: s.fullName };
                }
                return {
                    studentId: s.studentId,
                    studentCode: s.studentCode,
                    fullName: s.fullName,
                    status: 'PRESENT' as const,
                    note: '',
                };
            });

            setRecords(initialRecords);
            setHasUnsaved(false);

            if (hasSavedRecords) {
                setAvailableSessions(prev => prev.map(s =>
                    s.id === selectedSession.id ? { ...s, isSaved: true } : s
                ));
            }
        } catch (err: any) {
            let errorMsg = 'Không thể tải danh sách sinh viên';
            if (err.response?.status === 403) errorMsg = 'Bạn không có quyền truy cập lớp này';
            else if (err.response?.status === 404) errorMsg = 'Không tìm thấy lớp học phần';
            message.error(errorMsg);
            setStudents([]);
            setRecords([]);
        } finally {
            setLoadingStudents(false);
        }
    }, [selectedClassId, selectedSession]);

    // Load lịch sử điểm danh — GET /api/Attendances/history/{classId}
    const loadAttendanceHistory = useCallback(async () => {
        if (!selectedClassId) return;
        try {
            const res = await api.get(`/Attendances/history/${selectedClassId}`);
            const history: AttendanceHistory[] = (res.data || []).map((h: any) => ({
                date: h.date,
                periodStart: 0,
                periodEnd: 0,
                room: '',
                totalStudents: h.totalStudents,
                presentCount: h.presentCount,
                absentCount: h.absentCount,
                lateCount: h.lateCount,
                excusedCount: h.excusedCount,
            }));
            setAttendanceHistory(history);
            setAttendedDates(new Set(history.map(h => h.date)));
        } catch (err: any) {
            console.warn('Không thể tải lịch sử điểm danh:', err);
        }
    }, [selectedClassId]);

    // Khi chọn lớp hoặc ngày thay đổi, tạo lại sessions
    useEffect(() => {
        if (selectedClassId && selectedDate) {
            generateSessions(selectedClassId, selectedDate);
            loadAttendanceHistory();
        }
    }, [selectedClassId, selectedDate, generateSessions, loadAttendanceHistory]);

    // FIX: Khi session thay đổi, load sinh viên và điểm danh;
    // Nếu session là null thì clear dữ liệu
    useEffect(() => {
        if (selectedSession) {
            loadStudentsAndAttendance();
        } else {
            setStudents([]);
            setRecords([]);
            setHasUnsaved(false);
        }
    }, [selectedSession, loadStudentsAndAttendance]);

    // Cập nhật trạng thái một sinh viên
    const updateStatus = (studentId: string, status: AttendanceRecord['status']) => {
        setRecords((prev) =>
            prev.map((r) => (r.studentId === studentId ? { ...r, status } : r))
        );
        setHasUnsaved(true);
    };

    // Cập nhật ghi chú
    const updateNote = (studentId: string, note: string) => {
        setRecords((prev) =>
            prev.map((r) => (r.studentId === studentId ? { ...r, note } : r))
        );
        setHasUnsaved(true);
    };

    // Đánh dấu tất cả có mặt
    const markAllPresent = () => {
        setRecords((prev) => prev.map((r) => ({ ...r, status: 'PRESENT' as const })));
        setHasUnsaved(true);
        message.success('Đã đánh dấu tất cả có mặt');
    };

    // Lưu điểm danh — POST /api/Attendances/bulk (upsert hàng loạt)
    const handleSave = async () => {
        if (!selectedClassId || !selectedSession) return;
        if (records.length === 0) {
            message.warning('Không có dữ liệu để lưu');
            return;
        }

        setSaving(true);
        try {
            const res = await api.post('/Attendances/bulk', {
                classId: selectedClassId,
                date: selectedSession.date,
                records: records.map(r => ({
                    studentId: r.studentId,
                    status: r.status,
                    note: r.note || '',
                })),
            });

            const { created = 0, updated = 0 } = res.data || {};
            message.success(
                `Đã lưu điểm danh: ${created} tạo mới, ${updated} cập nhật`
            );
            setHasUnsaved(false);
            setAvailableSessions(prev => prev.map(s =>
                s.id === selectedSession.id ? { ...s, isSaved: true } : s
            ));

            await loadStudentsAndAttendance();
            await loadAttendanceHistory();
        } catch (err: any) {
            // Hien thi chi tiet loi tu backend de de debug
            const errMsg =
                err.response?.data?.error ||
                err.response?.data?.message ||
                err.message ||
                'Lỗi không xác định';
            const innerMsg = err.response?.data?.inner;
            message.error(
                `Lưu điểm danh thất bại: ${errMsg}${innerMsg ? ' — ' + innerMsg : ''}`,
                8  // hien thi 8 giay
            );
        } finally {
            setSaving(false);
        }
    };

    // Xuất Excel
    const handleExport = () => {
        if (records.length === 0) {
            message.warning('Không có dữ liệu để xuất');
            return;
        }

        const cls = myClasses.find((c) => c.classId === selectedClassId);
        const dateStr = selectedDate.format('DD/MM/YYYY');
        const periodStr = selectedSession
            ? `Tiết ${selectedSession.periodStart}-${selectedSession.periodEnd}`
            : '';

        const data = records.map((r, i) => ({
            'STT': i + 1,
            'MSSV': r.studentCode,
            'Họ và tên': r.fullName,
            'Trạng thái': STATUS_CONFIG[r.status]?.label || r.status,
            'Ghi chú': r.note || '',
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'DiemDanh');
        XLSX.writeFile(wb, `DiemDanh_${cls?.classCode || 'unknown'}_${dateStr}_${periodStr}.xlsx`);
        message.success('Đã xuất file Excel!');
    };

    // dateCellRender — chỉ hiển thị dấu chấm trong phạm vi học kỳ
    const dateCellRender: DatePickerProps['cellRender'] = (current, info) => {
        if (info.type !== 'date') return info.originNode;

        const currentDate = current as Dayjs;
        const cls = myClasses.find(c => c.classId === selectedClassId);
        if (!cls?.schedule) return info.originNode;

        // Giới hạn trong phạm vi học kỳ + không vượt hôm nay
        const semStart = cls.semester.startDate ? dayjs(cls.semester.startDate) : null;
        const semEnd = cls.semester.endDate ? dayjs(cls.semester.endDate) : dayjs();
        const inSemester =
            (!semStart || !currentDate.isBefore(semStart, 'day')) &&
            !currentDate.isAfter(semEnd, 'day') &&
            !currentDate.isAfter(dayjs(), 'day');

        const dayNum = currentDate.day() === 0 ? 8 : currentDate.day() + 1;
        const dateStr = currentDate.format('YYYY-MM-DD');

        if (dayNum === cls.schedule.dayOfWeek && inSemester) {
            const hasAttended = attendedDates.has(dateStr);
            return (
                <div style={{ position: 'relative' }}>
                    {info.originNode}
                    <div style={{
                        position: 'absolute',
                        bottom: 2,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: hasAttended ? '#52c41a' : '#722ed1',
                    }} />
                </div>
            );
        }
        return info.originNode;
    };

    // Thống kê
    const presentCount = records.filter((r) => r.status === 'PRESENT').length;
    const absentCount = records.filter((r) => r.status === 'ABSENT').length;
    const lateCount = records.filter((r) => r.status === 'LATE').length;
    const excusedCount = records.filter((r) => r.status === 'EXCUSED').length;

    const selectedClass = myClasses.find((c) => c.classId === selectedClassId);

    // Columns bảng điểm danh
    const columns = [
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>STT</span>,
            key: 'index',
            width: 80,
            render: (_: any, __: any, idx: number) => <span style={{ fontSize: '14px' }}>{idx + 1}</span>,
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>MSSV</span>,
            dataIndex: 'studentCode',
            width: 140,
            render: (code: string) => <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 500 }}>{code}</span>,
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Họ và tên</span>,
            dataIndex: 'fullName',
            width: 220,
            render: (name: string) => <span style={{ fontSize: '15px' }}>{name}</span>,
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Trạng thái</span>,
            dataIndex: 'status',
            width: 480,
            render: (status: AttendanceRecord['status'], row: AttendanceRecord) => (
                <Radio.Group
                    value={status}
                    onChange={(e) => updateStatus(row.studentId, e.target.value)}
                    size="middle"
                >
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <Radio.Button
                            key={key}
                            value={key}
                            style={{
                                background: status === key ? cfg.bg : undefined,
                                fontSize: '14px',
                                padding: '0 16px',
                                height: '38px',
                                lineHeight: '36px',
                            }}
                        >
                            {cfg.icon} {cfg.label}
                        </Radio.Button>
                    ))}
                </Radio.Group>
            ),
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Ghi chú</span>,
            dataIndex: 'note',
            width: 220,
            render: (note: string, row: AttendanceRecord) => (
                <input
                    type="text"
                    value={note || ''}
                    onChange={(e) => updateNote(row.studentId, e.target.value)}
                    placeholder="Nhập ghi chú..."
                    style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d9d9d9',
                        borderRadius: '8px',
                        fontSize: '14px',
                    }}
                />
            ),
        },
    ];

    return (
        <div style={{ padding: '0 24px' }}>
            {/* Header */}
            <div
                style={{
                    background: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)',
                    borderRadius: 16,
                    padding: '28px 32px',
                    marginBottom: 28,
                    boxShadow: '0 6px 24px rgba(114,46,209,0.3)',
                }}
            >
                <Row justify="space-between" align="middle" wrap>
                    <Col>
                        <Title level={2} style={{ color: '#fff', margin: 0, fontSize: '28px' }}>
                            <CheckCircleOutlined style={{ marginRight: 14, fontSize: '28px' }} />
                            Điểm danh sinh viên
                        </Title>
                        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: '16px', marginTop: 8, display: 'block' }}>
                            Ghi nhận sự tham dự từng buổi học
                        </Text>
                    </Col>
                    <Col>
                        <Space size="middle" wrap>
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={loadStudentsAndAttendance}
                                loading={loadingStudents}
                                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', height: 42 }}
                                size="large"
                            >
                                Tải lại
                            </Button>
                            <Button
                                icon={<DownloadOutlined />}
                                onClick={handleExport}
                                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', height: 42 }}
                                size="large"
                            >
                                Xuất Excel
                            </Button>
                            <Button
                                icon={<HistoryOutlined />}
                                onClick={() => setShowHistoryModal(true)}
                                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', height: 42 }}
                                size="large"
                            >
                                Lịch sử
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </div>

            {/* Controls */}
            <Card style={{ borderRadius: 16, marginBottom: 24 }}>
                <Row gutter={[24, 16]} align="bottom">
                    <Col xs={24} md={7}>
                        <div style={{ marginBottom: 8 }}>
                            <Text strong style={{ fontSize: '15px' }}>Chọn lớp</Text>
                        </div>
                        {loadingClasses ? (
                            <Spin size="small" />
                        ) : (
                            <Select
                                placeholder="-- Chọn lớp --"
                                style={{ width: '100%' }}
                                value={selectedClassId}
                                onChange={(val) => {
                                    setSelectedClassId(val);
                                    setHasUnsaved(false);
                                    setSelectedSession(null);
                                }}
                                showSearch
                                optionFilterProp="children"
                                loading={loadingClasses}
                                size="large"
                            >
                                {myClasses.map((cls) => (
                                    <Option key={cls.classId} value={cls.classId}>
                                        <Space>
                                            <span style={{ fontWeight: 600, fontSize: '14px' }}>{cls.classCode}</span>
                                            <Text type="secondary" style={{ fontSize: '13px' }}>
                                                {cls.subject.subjectName}
                                            </Text>
                                        </Space>
                                    </Option>
                                ))}
                            </Select>
                        )}
                    </Col>

                    <Col xs={24} md={7}>
                        <div style={{ marginBottom: 8 }}>
                            <Text strong style={{ fontSize: '15px' }}>Ngày điểm danh</Text>
                        </div>
                        <DatePicker
                            style={{ width: '100%' }}
                            value={selectedDate}
                            onChange={(d) => {
                                if (d) {
                                    setSelectedDate(d);
                                    setSelectedSession(null);
                                    setHasUnsaved(false);
                                }
                            }}
                            format="DD/MM/YYYY"
                            disabledDate={(d) => {
                                const cls = myClasses.find(c => c.classId === selectedClassId);
                                const semStart = cls?.semester.startDate ? dayjs(cls.semester.startDate) : null;
                                const semEnd = cls?.semester.endDate ? dayjs(cls.semester.endDate) : dayjs();
                                // Disable nếu ngoài học kỳ HOẶC trong tương lai
                                const beforeSem = semStart ? d.isBefore(semStart, 'day') : false;
                                const afterSem = d.isAfter(semEnd, 'day');
                                const future = d.isAfter(dayjs(), 'day');
                                return beforeSem || afterSem || future;
                            }}
                            size="large"
                            cellRender={dateCellRender}
                        />
                        {/* Chú thích dấu chấm lịch */}
                        {selectedClassId && (
                            <div style={{ marginTop: 6, display: 'flex', gap: 16 }}>
                                <span style={{ fontSize: 12, color: '#595959', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#722ed1' }} />
                                    Chưa điểm danh
                                </span>
                                <span style={{ fontSize: 12, color: '#595959', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#52c41a' }} />
                                    Đã điểm danh
                                </span>
                            </div>
                        )}
                    </Col>

                    <Col xs={24} md={5}>
                        <div style={{ marginBottom: 8 }}>
                            <Text strong style={{ fontSize: '15px' }}>
                                <ClockCircleOutlined style={{ marginRight: 6 }} />
                                Buổi học
                            </Text>
                        </div>
                        <Select
                            placeholder="Chọn buổi học"
                            style={{ width: '100%' }}
                            value={selectedSession?.id}
                            onChange={(sessionId) => {
                                const session = availableSessions.find(s => s.id === sessionId);
                                setSelectedSession(session || null);
                                setHasUnsaved(false);
                            }}
                            disabled={availableSessions.length === 0}
                            loading={loadingSessions}
                            size="large"
                        >
                            {availableSessions.map((session) => (
                                <Option key={session.id} value={session.id}>
                                    <Space>
                                        <ClockCircleOutlined />
                                        <span style={{ fontSize: '14px' }}>Tiết {session.periodStart} - {session.periodEnd}</span>
                                        <span style={{ fontSize: '14px' }}>Phòng {session.room}</span>
                                        {session.isSaved && (
                                            <Tag color="green" style={{ marginLeft: 8, fontSize: '13px' }}>Đã điểm danh</Tag>
                                        )}
                                    </Space>
                                </Option>
                            ))}
                        </Select>
                    </Col>

                    <Col xs={24} md={5}>
                        <div style={{ marginBottom: 8 }}>
                            <Text strong style={{ fontSize: '15px' }}>&nbsp;</Text>
                        </div>
                        <Button
                            onClick={markAllPresent}
                            disabled={!selectedSession || records.length === 0}
                            icon={<CheckCircleOutlined />}
                            size="large"
                            style={{ height: 42 }}
                        >
                            Tất cả có mặt
                        </Button>
                    </Col>
                </Row>

                {/* Thông tin lớp được chọn */}
                {selectedClass && (
                    <div
                        style={{
                            marginTop: 24,
                            padding: '14px 20px',
                            background: '#f9f0ff',
                            borderRadius: 12,
                            borderLeft: '5px solid #722ed1',
                            display: 'flex',
                            gap: 32,
                            flexWrap: 'wrap',
                        }}
                    >
                        <Text style={{ fontSize: '15px' }}>
                            <CalendarOutlined style={{ color: '#722ed1', marginRight: 8, fontSize: '16px' }} />
                            {selectedClass.schedule
                                ? `${DAY_MAP[selectedClass.schedule.dayOfWeek]} · Tiết ${selectedClass.schedule.periodStart}–${selectedClass.schedule.periodEnd} · Phòng ${selectedClass.schedule.room}`
                                : 'Chưa có lịch'}
                        </Text>
                        <Text style={{ fontSize: '15px' }}>
                            <TeamOutlined style={{ color: '#722ed1', marginRight: 8, fontSize: '16px' }} />
                            {selectedClass.currentStudents}/{selectedClass.maxStudents} sinh viên
                        </Text>
                        <Tag color={selectedClass.status === 'OPEN' ? 'success' : 'default'} style={{ fontSize: '13px', padding: '4px 12px' }}>
                            {selectedClass.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
                        </Tag>
                        {/* Phạm vi học kỳ */}
                        {(selectedClass.semester.startDate || selectedClass.semester.endDate) && (
                            <Text style={{ fontSize: '14px', color: '#722ed1' }}>
                                <CalendarOutlined style={{ marginRight: 6 }} />
                                {selectedClass.semester.semesterName}
                                {selectedClass.semester.startDate && selectedClass.semester.endDate && (
                                    <span style={{ marginLeft: 8, color: '#595959', fontWeight: 400 }}>
                                        ({dayjs(selectedClass.semester.startDate).format('DD/MM/YYYY')}
                                        {' – '}
                                        {dayjs(selectedClass.semester.endDate).format('DD/MM/YYYY')})
                                    </span>
                                )}
                            </Text>
                        )}
                    </div>
                )}

                {/* Cảnh báo chưa lưu */}
                {hasUnsaved && selectedSession && (
                    <Alert
                        type="warning"
                        showIcon
                        message={<span style={{ fontSize: '14px' }}>Có thay đổi chưa được lưu</span>}
                        description={<span style={{ fontSize: '13px' }}>Nhấn 'Lưu điểm danh' để lưu các thay đổi.</span>}
                        style={{ marginTop: 20, borderRadius: 10 }}
                        action={
                            <Button size="middle" type="primary" onClick={handleSave} loading={saving}>
                                Lưu ngay
                            </Button>
                        }
                        closable
                    />
                )}
            </Card>

            {/* Thống kê nhanh */}
            {records.length > 0 && selectedSession && (
                <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
                    {[
                        { label: 'Có mặt', value: presentCount, color: '#52c41a', bg: '#f6ffed', icon: <CheckCircleOutlined /> },
                        { label: 'Vắng mặt', value: absentCount, color: '#ff4d4f', bg: '#fff2f0', icon: <CloseCircleOutlined /> },
                        { label: 'Đi muộn', value: lateCount, color: '#d46b08', bg: '#fffbe6', icon: <ExclamationCircleOutlined /> },
                        { label: 'Có phép', value: excusedCount, color: '#1677ff', bg: '#e6f4ff', icon: <MinusCircleOutlined /> },
                    ].map((s) => (
                        <Col xs={12} sm={6} key={s.label}>
                            <Card
                                size="small"
                                style={{ borderRadius: 12, background: s.bg, border: 'none' }}
                                bodyStyle={{ padding: '16px' }}
                            >
                                <div style={{ fontSize: 32, fontWeight: 700, color: s.color }}>{s.value}</div>
                                <div style={{ fontSize: 15, color: '#595959', marginTop: 6 }}>
                                    {s.icon} {s.label}
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}

            {/* Bảng điểm danh */}
            {!selectedClassId ? (
                <Card style={{ borderRadius: 16, textAlign: 'center', padding: 80 }}>
                    <CalendarOutlined style={{ fontSize: 64, color: '#d9d9d9', marginBottom: 20 }} />
                    <Title level={3} style={{ color: '#8c8c8c' }}>
                        Chọn lớp để bắt đầu điểm danh
                    </Title>
                </Card>
            ) : !selectedSession ? (
                <Card style={{ borderRadius: 16, textAlign: 'center', padding: 80 }}>
                    <ClockCircleOutlined style={{ fontSize: 64, color: '#d9d9d9', marginBottom: 20 }} />
                    <Title level={3} style={{ color: '#8c8c8c' }}>
                        {availableSessions.length === 0
                            ? `Ngày ${selectedDate.format('DD/MM/YYYY')} không phải ngày học của lớp này`
                            : 'Vui lòng chọn buổi học để điểm danh'}
                    </Title>
                </Card>
            ) : loadingStudents ? (
                <Card style={{ borderRadius: 16, textAlign: 'center', padding: 100 }}>
                    <Spin size="large" tip={<span style={{ fontSize: '15px' }}>Đang tải danh sách sinh viên...</span>} />
                </Card>
            ) : records.length === 0 ? (
                <Card style={{ borderRadius: 16 }}>
                    <Empty description={<span style={{ fontSize: '15px' }}>Lớp này chưa có sinh viên đăng ký</span>} />
                </Card>
            ) : (
                <Card
                    style={{ borderRadius: 16 }}
                    title={
                        <Space size="middle">
                            <TeamOutlined style={{ fontSize: '20px' }} />
                            <span style={{ fontSize: '18px', fontWeight: 600 }}>
                                Danh sách điểm danh — {selectedDate.format('DD/MM/YYYY')}
                            </span>
                            <Badge count={records.length} style={{ backgroundColor: '#722ed1' }} />
                            {selectedSession.isSaved && (
                                <Tag color="green" icon={<CheckCircleOutlined />} style={{ fontSize: '14px', padding: '4px 12px' }}>
                                    Đã điểm danh
                                </Tag>
                            )}
                        </Space>
                    }
                    extra={
                        <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            onClick={handleSave}
                            loading={saving}
                            disabled={!hasUnsaved}
                            style={{ background: '#722ed1', borderColor: '#722ed1', height: 44 }}
                            size="large"
                        >
                            {saving ? 'Đang lưu...' : 'Lưu điểm danh'}
                        </Button>
                    }
                >
                    <Table
                        dataSource={records}
                        columns={columns}
                        rowKey="studentId"
                        pagination={false}
                        size="middle"
                        scroll={{ x: 1100 }}
                        rowClassName={(row) => {
                            if (row.status === 'ABSENT') return 'row-absent';
                            if (row.status === 'LATE') return 'row-late';
                            return '';
                        }}
                    />

                    <Divider style={{ margin: '20px 0' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <Text type="secondary" style={{ fontSize: '14px' }}>
                                <HistoryOutlined style={{ marginRight: 8, fontSize: '16px' }} />
                                Buổi học: Tiết {selectedSession.periodStart} - {selectedSession.periodEnd}, Phòng {selectedSession.room}
                            </Text>
                        </div>
                        <Button
                            type="primary"
                            size="large"
                            icon={<SaveOutlined />}
                            onClick={handleSave}
                            loading={saving}
                            disabled={!hasUnsaved}
                            style={{ background: '#722ed1', borderColor: '#722ed1', minWidth: 200, height: 48 }}
                        >
                            {hasUnsaved ? 'Lưu điểm danh (có thay đổi)' : 'Lưu điểm danh'}
                        </Button>
                    </div>
                </Card>
            )}

            {/* Modal lịch sử điểm danh */}
            <Modal
                title={
                    <Space>
                        <HistoryOutlined style={{ fontSize: '20px' }} />
                        <span style={{ fontSize: '18px', fontWeight: 600 }}>Lịch sử điểm danh</span>
                    </Space>
                }
                open={showHistoryModal}
                onCancel={() => setShowHistoryModal(false)}
                footer={null}
                width={900}
            >
                {attendanceHistory.length === 0 ? (
                    <Empty description="Chưa có lịch sử điểm danh" style={{ padding: 40 }} />
                ) : (
                    <Table
                        dataSource={attendanceHistory}
                        rowKey="date"
                        pagination={{ pageSize: 5 }}
                        columns={[
                            {
                                title: 'Ngày',
                                dataIndex: 'date',
                                width: 120,
                                render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
                            },
                            {
                                title: 'Buổi học',
                                width: 120,
                                render: (_: any, r: AttendanceHistory) => `Tiết ${r.periodStart} - ${r.periodEnd}`,
                            },
                            {
                                title: 'Phòng',
                                dataIndex: 'room',
                                width: 100,
                            },
                            {
                                title: 'Có mặt',
                                dataIndex: 'presentCount',
                                width: 100,
                                render: (v: number) => <Tag color="success" style={{ fontSize: '13px' }}>{v}</Tag>,
                            },
                            {
                                title: 'Vắng mặt',
                                dataIndex: 'absentCount',
                                width: 100,
                                render: (v: number) => <Tag color="error" style={{ fontSize: '13px' }}>{v}</Tag>,
                            },
                            {
                                title: 'Đi muộn',
                                dataIndex: 'lateCount',
                                width: 100,
                                render: (v: number) => <Tag color="warning" style={{ fontSize: '13px' }}>{v}</Tag>,
                            },
                            {
                                title: 'Có phép',
                                dataIndex: 'excusedCount',
                                width: 100,
                                render: (v: number) => <Tag color="processing" style={{ fontSize: '13px' }}>{v}</Tag>,
                            },
                        ]}
                    />
                )}
            </Modal>

            {/* CSS inline */}
            <style>{`
                .row-absent td { background: #fff2f0 !important; }
                .row-late td { background: #fffbe6 !important; }
                .ant-table-thead > tr > th {
                    background: #fafafa !important;
                    font-weight: 700 !important;
                    font-size: 15px !important;
                    padding: 16px 12px !important;
                }
                .ant-table-tbody > tr > td {
                    padding: 14px 12px !important;
                }
                .ant-radio-button-wrapper {
                    font-size: 14px !important;
                    padding: 0 16px !important;
                    height: 38px !important;
                    line-height: 36px !important;
                }
                .ant-btn {
                    font-size: 14px !important;
                }
                .ant-picker-cell {
                    position: relative !important;
                }
            `}</style>
        </div>
    );
};

export default Attendance;