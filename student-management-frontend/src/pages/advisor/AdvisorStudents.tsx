// src/pages/advisor/AdvisorStudents.tsx
import React, { useEffect, useState, useContext, useCallback, useMemo } from 'react';
import {
    Card,
    Select,
    Table,
    Input,
    Tag,
    Spin,
    message,
    Space,
    Statistic,
    Row,
    Col,
    Button,
    Tooltip,
    Modal,
    Descriptions,
    Badge,
    Typography,
    Empty,
    Divider,
    Progress,
    Alert,
} from 'antd';
import {
    SearchOutlined,
    UsergroupAddOutlined,
    EyeOutlined,
    TeamOutlined,
    ReloadOutlined,
    MailOutlined,
    PhoneOutlined,
    HistoryOutlined,
    BookOutlined,
    WarningOutlined,
    CheckCircleOutlined,
    TrophyOutlined,
    ClockCircleOutlined,
    UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import StudentHistoryModal from '../../components/StudentHistoryModal';
import SendEmailModal from '../../components/SendEmailModal';

const { Title, Text } = Typography;
const { Option } = Select;

// ============================================================
// Interfaces
// ============================================================
interface AdvisorClass {
    advisorClassId: number;
    classCode: string;
    className: string;
    academicYear: number;
}

interface Student {
    studentId: string;
    studentCode: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    gender: string | null;
    major: string | null;
    admissionYear: number;
    dateOfBirth?: string | null;
}

interface StudentStats {
    totalWarnings: number;
    currentGpa: number | null;
    semesterGpa: number | null;
    registeredCredits: number;
    pendingRegistrations: number;
    completedCredits: number;
    requiredCredits: number;
    progressPercentage: number;
}

// ============================================================
// Helper Functions
// ============================================================
const formatGpa = (gpa: number | null | undefined): string => {
    if (gpa === null || gpa === undefined) return '—';
    return gpa.toFixed(2);
};

const getGpaColor = (gpa: number | null | undefined): string => {
    if (gpa === null || gpa === undefined) return '#8c8c8c';
    if (gpa >= 3.6) return '#52c41a';
    if (gpa >= 3.0) return '#1677ff';
    if (gpa >= 2.0) return '#faad14';
    return '#ff4d4f';
};

const getGpaClassification = (gpa: number | null | undefined): string => {
    if (gpa === null || gpa === undefined) return 'Chưa có';
    if (gpa >= 3.6) return 'Xuất sắc';
    if (gpa >= 3.2) return 'Giỏi';
    if (gpa >= 2.5) return 'Khá';
    if (gpa >= 2.0) return 'Trung bình';
    return 'Yếu';
};

const getWarningColor = (count: number): string => {
    if (count >= 3) return '#ff4d4f';
    if (count >= 1) return '#faad14';
    return '#52c41a';
};

const getWarningText = (count: number): string => {
    if (count >= 3) return 'Cảnh báo nghiêm trọng';
    if (count >= 1) return 'Cần theo dõi';
    return 'Không có cảnh báo';
};

// ============================================================
// Main Component
// ============================================================
const AdvisorStudents: React.FC = () => {
    const { user } = useContext(AuthContext)!;
    const advisorId = user?.advisorId;

    // State cho danh sách lớp
    const [advisorClasses, setAdvisorClasses] = useState<AdvisorClass[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
    const [selectedClassInfo, setSelectedClassInfo] = useState<AdvisorClass | null>(null);

    // State cho sinh viên
    const [students, setStudents] = useState<Student[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
    const [studentStats, setStudentStats] = useState<Map<string, StudentStats>>(new Map());

    // State loading
    const [loadingClasses, setLoadingClasses] = useState(true);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [loadingStats, setLoadingStats] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // State tìm kiếm
    const [searchText, setSearchText] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

    // State cho modal lịch sử
    const [historyModalVisible, setHistoryModalVisible] = useState(false);
    const [historyStudent, setHistoryStudent] = useState<{
        id: string;
        code: string;
        name: string;
        email?: string | null;
    } | null>(null);

    // State cho modal gửi email
    const [emailModalVisible, setEmailModalVisible] = useState(false);
    const [emailStudent, setEmailStudent] = useState<{
        email: string;
        name: string;
    } | null>(null);

    // ============================================================
    // Effects
    // ============================================================

    // 1. Load danh sách lớp cố vấn
    useEffect(() => {
        if (!advisorId) {
            message.error('Không tìm thấy thông tin cố vấn');
            setLoadingClasses(false);
            return;
        }

        const fetchAdvisorClasses = async () => {
            setLoadingClasses(true);
            try {
                const res = await api.get(`/AdvisorClasses/by-advisor/${advisorId}`);
                const classes = res.data || [];
                setAdvisorClasses(classes);

                if (classes.length > 0) {
                    setSelectedClassId(classes[0].advisorClassId);
                    setSelectedClassInfo(classes[0]);
                }
            } catch (err: any) {
                console.error('Lỗi tải lớp cố vấn:', err);
                message.error('Không thể tải danh sách lớp cố vấn');
            } finally {
                setLoadingClasses(false);
            }
        };

        fetchAdvisorClasses();
    }, [advisorId]);

    // 2. Khi chọn lớp → load sinh viên
    useEffect(() => {
        if (!selectedClassId) {
            setStudents([]);
            setFilteredStudents([]);
            setStudentStats(new Map());
            return;
        }

        const fetchStudentsByClass = async () => {
            setLoadingStudents(true);
            setStudentStats(new Map());

            try {
                const res = await api.get(`/Students/by-advisor-class/${selectedClassId}`);
                const studentList = res.data || [];
                setStudents(studentList);
                setFilteredStudents(studentList);

                if (studentList.length > 0) {
                    await fetchStudentsStats(studentList);
                }
            } catch (err: any) {
                console.error('Lỗi tải sinh viên:', err);
                message.error('Không thể tải danh sách sinh viên');
                setStudents([]);
                setFilteredStudents([]);
            } finally {
                setLoadingStudents(false);
            }
        };

        fetchStudentsByClass();
    }, [selectedClassId]);

    // 3. Tìm kiếm
    useEffect(() => {
        if (!searchText.trim()) {
            setFilteredStudents(students);
            return;
        }

        const lowerSearch = searchText.toLowerCase();
        const filtered = students.filter(
            (s) =>
                s.fullName.toLowerCase().includes(lowerSearch) ||
                s.studentCode.toLowerCase().includes(lowerSearch) ||
                (s.major && s.major.toLowerCase().includes(lowerSearch)) ||
                (s.email && s.email.toLowerCase().includes(lowerSearch)) ||
                (s.phone && s.phone.includes(lowerSearch))
        );
        setFilteredStudents(filtered);
    }, [searchText, students]);

    // ============================================================
    // Functions
    // ============================================================

    // Lấy thông tin học tập từ Academic Summary API
    const fetchAcademicSummary = async (studentId: string) => {
        try {
            const response = await api.get(`/Students/academic-summary?studentId=${studentId}`);
            return response.data;
        } catch (err) {
            console.warn(`Cannot fetch academic summary for ${studentId}:`, err);
            return null;
        }
    };

    // Lấy GPA từ API Gpas
    const fetchGpaFromAPI = async (studentId: string) => {
        try {
            const response = await api.get(`/Gpas/student/${studentId}`);
            const gpas = response.data || [];
            if (gpas.length > 0) {
                const latestGpa = gpas[gpas.length - 1];
                return {
                    currentGpa: latestGpa.cumulativeGpa || latestGpa.CumulativeGpa,
                    semesterGpa: latestGpa.gpa1 || latestGpa.Gpa1,
                };
            }
            return { currentGpa: null, semesterGpa: null };
        } catch (err) {
            console.warn(`Cannot fetch GPA for ${studentId}:`, err);
            return { currentGpa: null, semesterGpa: null };
        }
    };

    // Load thống kê cho từng sinh viên
    const fetchStudentsStats = async (studentList: Student[]) => {
        if (!studentList.length || !selectedClassId) return;

        setLoadingStats(true);
        const statsMap = new Map<string, StudentStats>();

        try {
            // Thử gọi API tổng hợp
            const statsRes = await api.get(`/Advisors/student-stats/${selectedClassId}`);
            const statsData = statsRes.data || [];

            console.log('Raw stats data from API:', statsData);

            for (const item of statsData) {
                // Lấy completedCredits từ API
                let completedCredits = item.completedCredits || item.totalCreditsEarned || 0;
                let requiredCredits = item.requiredCredits || 120;

                // Tính progress percentage dựa trên completedCredits
                let progressPercent = 0;
                if (requiredCredits > 0) {
                    progressPercent = Math.min(Math.round((completedCredits / requiredCredits) * 1000) / 10, 100);
                }

                statsMap.set(item.studentId, {
                    totalWarnings: item.totalWarnings || 0,
                    currentGpa: item.currentGpa ? parseFloat(item.currentGpa) : null,
                    semesterGpa: item.semesterGpa ? parseFloat(item.semesterGpa) : null,
                    registeredCredits: item.registeredCredits || 0,
                    pendingRegistrations: item.pendingRegistrations || 0,
                    completedCredits: completedCredits,
                    requiredCredits: requiredCredits,
                    progressPercentage: progressPercent,
                });
            }

            // Fallback cho sinh viên không có stats trong API tổng hợp
            for (const student of studentList) {
                if (!statsMap.has(student.studentId)) {
                    // Thử lấy từ Academic Summary
                    const summary = await fetchAcademicSummary(student.studentId);

                    if (summary) {
                        const completedCredits = summary.completedCredits || 0;
                        const requiredCredits = summary.totalCreditsRequired || 120;
                        const progressPercent = requiredCredits > 0
                            ? Math.min(Math.round((completedCredits / requiredCredits) * 1000) / 10, 100)
                            : 0;

                        statsMap.set(student.studentId, {
                            totalWarnings: 0,
                            currentGpa: summary.cumulativeGpa || null,
                            semesterGpa: summary.semesterGpa || null,
                            registeredCredits: summary.currentSemesterCredits || 0,
                            pendingRegistrations: 0,
                            completedCredits: completedCredits,
                            requiredCredits: requiredCredits,
                            progressPercentage: progressPercent,
                        });
                    } else {
                        // Fallback cuối cùng
                        statsMap.set(student.studentId, {
                            totalWarnings: 0,
                            currentGpa: null,
                            semesterGpa: null,
                            registeredCredits: 0,
                            pendingRegistrations: 0,
                            completedCredits: 0,
                            requiredCredits: 120,
                            progressPercentage: 0,
                        });
                    }
                }
            }
        } catch (err: any) {
            console.error('Lỗi tải thống kê sinh viên:', err);

            // Fallback: lấy từng sinh viên một
            for (const student of studentList) {
                const summary = await fetchAcademicSummary(student.studentId);

                if (summary) {
                    const completedCredits = summary.completedCredits || 0;
                    const requiredCredits = summary.totalCreditsRequired || 120;
                    const progressPercent = requiredCredits > 0
                        ? Math.min(Math.round((completedCredits / requiredCredits) * 1000) / 10, 100)
                        : 0;

                    statsMap.set(student.studentId, {
                        totalWarnings: 0,
                        currentGpa: summary.cumulativeGpa || null,
                        semesterGpa: summary.semesterGpa || null,
                        registeredCredits: summary.currentSemesterCredits || 0,
                        pendingRegistrations: 0,
                        completedCredits: completedCredits,
                        requiredCredits: requiredCredits,
                        progressPercentage: progressPercent,
                    });
                } else {
                    statsMap.set(student.studentId, {
                        totalWarnings: 0,
                        currentGpa: null,
                        semesterGpa: null,
                        registeredCredits: 0,
                        pendingRegistrations: 0,
                        completedCredits: 0,
                        requiredCredits: 120,
                        progressPercentage: 0,
                    });
                }
            }
        } finally {
            setLoadingStats(false);
            setStudentStats(statsMap);
        }
    };

    // Refresh dữ liệu
    const handleRefresh = useCallback(async () => {
        if (!selectedClassId) return;

        setRefreshing(true);
        try {
            const res = await api.get(`/Students/by-advisor-class/${selectedClassId}`);
            const studentList = res.data || [];
            setStudents(studentList);
            setFilteredStudents(studentList);
            if (studentList.length > 0) {
                await fetchStudentsStats(studentList);
            }
            message.success('Đã làm mới danh sách sinh viên');
        } catch (err: any) {
            console.error('Lỗi refresh:', err);
            message.error('Không thể làm mới dữ liệu');
        } finally {
            setRefreshing(false);
        }
    }, [selectedClassId]);

    // Lấy thống kê của sinh viên
    const getStudentStats = useCallback((studentId: string): StudentStats => {
        return studentStats.get(studentId) || {
            totalWarnings: 0,
            currentGpa: null,
            semesterGpa: null,
            registeredCredits: 0,
            pendingRegistrations: 0,
            completedCredits: 0,
            requiredCredits: 120,
            progressPercentage: 0,
        };
    }, [studentStats]);

    // Xử lý khi chọn lớp
    const handleClassChange = async (classId: number) => {
        setSelectedClassId(classId);
        const classInfo = advisorClasses.find(c => c.advisorClassId === classId);
        setSelectedClassInfo(classInfo || null);
        setSearchText('');
        setStudents([]);
        setFilteredStudents([]);
        setStudentStats(new Map());
    };

    // Xử lý mở modal lịch sử
    const openHistoryModal = (student: Student) => {
        setHistoryStudent({
            id: student.studentId,
            code: student.studentCode,
            name: student.fullName,
            email: student.email
        });
        setHistoryModalVisible(true);
    };

    // Xử lý mở modal gửi email
    const openEmailModal = (student: Student) => {
        if (student.email) {
            setEmailStudent({
                email: student.email,
                name: student.fullName
            });
            setEmailModalVisible(true);
        }
    };

    // Tính tổng thống kê
    const totalStats = useMemo(() => {
        let totalStudents = students.length;
        let warningCount = 0;
        let criticalWarningCount = 0;
        let totalPendingRegs = 0;
        let totalCompletedCredits = 0;
        let avgGpa = 0;
        let gpaSum = 0;
        let gpaCount = 0;

        for (const student of students) {
            const stats = getStudentStats(student.studentId);
            if (stats.totalWarnings > 0) {
                warningCount++;
                if (stats.totalWarnings >= 3) criticalWarningCount++;
            }
            totalPendingRegs += stats.pendingRegistrations;
            totalCompletedCredits += stats.completedCredits;
            if (stats.currentGpa) {
                gpaSum += stats.currentGpa;
                gpaCount++;
            }
        }

        avgGpa = gpaCount > 0 ? gpaSum / gpaCount : 0;

        return {
            totalStudents,
            warningCount,
            criticalWarningCount,
            totalPendingRegs,
            totalCompletedCredits,
            avgGpa
        };
    }, [students, getStudentStats]);

    // Debug: Log studentStats khi thay đổi
    useEffect(() => {
        if (studentStats.size > 0) {
            console.log('StudentStats Map contents:');
            for (const [key, value] of studentStats) {
                console.log(`${key}:`, {
                    completedCredits: value.completedCredits,
                    requiredCredits: value.requiredCredits,
                    progressPercentage: value.progressPercentage,
                    currentGpa: value.currentGpa
                });
            }
        }
    }, [studentStats]);

    // ============================================================
    // Table Columns
    // ============================================================

    const columns = useMemo(() => [
        {
            title: 'Mã SV',
            dataIndex: 'studentCode',
            key: 'studentCode',
            width: 120,
            fixed: 'left' as const,
            render: (code: string) => (
                <Badge
                    count={code}
                    style={{
                        backgroundColor: '#722ed1',
                        fontSize: 11,
                        fontWeight: 'bold'
                    }}
                />
            ),
        },
        {
            title: 'Họ và tên',
            dataIndex: 'fullName',
            key: 'fullName',
            width: 200,
            render: (name: string, record: Student) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{name}</Text>
                    {record.major && (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            {record.major}
                        </Text>
                    )}
                </Space>
            ),
        },
        {
            title: 'Liên hệ',
            key: 'contact',
            width: 200,
            render: (_: any, record: Student) => (
                <Space direction="vertical" size={2}>
                    {record.email && (
                        <Text style={{ fontSize: 12 }}>
                            <MailOutlined style={{ marginRight: 4, color: '#52c41a' }} />
                            {record.email}
                        </Text>
                    )}
                    {record.phone && (
                        <Text style={{ fontSize: 12 }}>
                            <PhoneOutlined style={{ marginRight: 4, color: '#1677ff' }} />
                            {record.phone}
                        </Text>
                    )}
                </Space>
            ),
        },
        {
            title: 'Tiến độ',
            key: 'progress',
            width: 180,
            render: (_: any, record: Student) => {
                const stats = getStudentStats(record.studentId);
                const completed = stats.completedCredits;
                const required = stats.requiredCredits;
                const percent = required > 0 ? Math.min(Math.round((completed / required) * 1000) / 10, 100) : 0;
                const strokeColor = percent >= 75 ? '#52c41a' : percent >= 50 ? '#1890ff' : '#faad14';

                return (
                    <Tooltip title={`Đã tích lũy: ${completed}/${required} TC (${percent}%)`}>
                        <Progress
                            percent={percent}
                            size="small"
                            strokeColor={strokeColor}
                            format={(p) => `${p?.toFixed(1)}%`}
                            style={{ width: 140 }}
                        />
                    </Tooltip>
                );
            },
        },
        {
            title: 'GPA',
            key: 'gpa',
            width: 100,
            render: (_: any, record: Student) => {
                const stats = getStudentStats(record.studentId);
                return (
                    <Tooltip title={`${getGpaClassification(stats.currentGpa)} - Thang điểm 4`}>
                        <Text strong style={{ color: getGpaColor(stats.currentGpa), fontSize: 16 }}>
                            {formatGpa(stats.currentGpa)}
                        </Text>
                    </Tooltip>
                );
            },
        },
        {
            title: 'Cảnh báo',
            key: 'warnings',
            width: 100,
            render: (_: any, record: Student) => {
                const stats = getStudentStats(record.studentId);
                if (stats.totalWarnings > 0) {
                    return (
                        <Tooltip title={getWarningText(stats.totalWarnings)}>
                            <Badge
                                count={stats.totalWarnings}
                                style={{ backgroundColor: getWarningColor(stats.totalWarnings) }}
                            />
                        </Tooltip>
                    );
                }
                return <Tag color="success" icon={<CheckCircleOutlined />}>0</Tag>;
            },
        },
        {
            title: 'TC tích lũy',
            key: 'completedCredits',
            width: 100,
            render: (_: any, record: Student) => {
                const stats = getStudentStats(record.studentId);
                return <Tag color="geekblue">{stats.completedCredits} / {stats.requiredCredits} TC</Tag>;
            },
        },
        {
            title: 'Hành động',
            key: 'action',
            width: 220,
            fixed: 'right' as const,
            render: (_: any, record: Student) => {
                const stats = getStudentStats(record.studentId);
                return (
                    <Space size={4} wrap>
                        <Tooltip title="Xem chi tiết">
                            <Button
                                type="primary"
                                icon={<EyeOutlined />}
                                size="small"
                                onClick={() => setSelectedStudent(record)}
                                style={{ background: '#722ed1', borderColor: '#722ed1' }}
                            />
                        </Tooltip>

                        <Tooltip title="Xem lịch sử học tập">
                            <Button
                                type="default"
                                icon={<HistoryOutlined />}
                                size="small"
                                onClick={() => openHistoryModal(record)}
                                style={{ color: '#1677ff', borderColor: '#1677ff' }}
                            />
                        </Tooltip>

                        {record.email && (
                            <Tooltip title="Gửi email">
                                <Button
                                    type="default"
                                    icon={<MailOutlined />}
                                    size="small"
                                    onClick={() => openEmailModal(record)}
                                    style={{ color: '#52c41a', borderColor: '#52c41a' }}
                                />
                            </Tooltip>
                        )}

                        {stats.pendingRegistrations > 0 && (
                            <Tooltip title={`${stats.pendingRegistrations} đăng ký chờ duyệt`}>
                                <Badge
                                    count={stats.pendingRegistrations}
                                    style={{ backgroundColor: '#faad14' }}
                                />
                            </Tooltip>
                        )}
                    </Space>
                );
            },
        },
    ], [getStudentStats]);

    // ============================================================
    // Modal chi tiết sinh viên
    // ============================================================
    const renderStudentDetailModal = () => {
        if (!selectedStudent) return null;

        const stats = getStudentStats(selectedStudent.studentId);
        const isGoodGpa = (stats.currentGpa || 0) >= 3.2;
        const isWarningGpa = (stats.currentGpa || 0) < 2.0 && stats.currentGpa !== null;
        const isCriticalWarning = stats.totalWarnings >= 3;
        const progressColor = stats.progressPercentage >= 75 ? '#52c41a' : stats.progressPercentage >= 50 ? '#1890ff' : '#faad14';
        const gpaClassification = getGpaClassification(stats.currentGpa);

        return (
            <Modal
                title={
                    <Space>
                        <EyeOutlined style={{ color: '#722ed1', fontSize: 20 }} />
                        <span style={{ fontSize: 18, fontWeight: 600 }}>Chi tiết sinh viên</span>
                        <Tag color="#722ed1" style={{ marginLeft: 8 }}>
                            {selectedStudent.studentCode}
                        </Tag>
                    </Space>
                }
                open={!!selectedStudent}
                onCancel={() => setSelectedStudent(null)}
                footer={[
                    <Button key="close" onClick={() => setSelectedStudent(null)} size="large">
                        Đóng
                    </Button>,
                    <Button
                        key="history"
                        type="default"
                        icon={<HistoryOutlined />}
                        onClick={() => {
                            openHistoryModal(selectedStudent);
                            setSelectedStudent(null);
                        }}
                        size="large"
                    >
                        Xem lịch sử học tập
                    </Button>,
                    selectedStudent.email && (
                        <Button
                            key="email"
                            type="primary"
                            icon={<MailOutlined />}
                            onClick={() => {
                                openEmailModal(selectedStudent);
                                setSelectedStudent(null);
                            }}
                            style={{ background: '#52c41a', borderColor: '#52c41a' }}
                            size="large"
                        >
                            Gửi email
                        </Button>
                    )
                ]}
                width={950}
                styles={{ body: { maxHeight: '70vh', overflowY: 'auto', padding: '20px 24px' } }}
            >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    {/* PHẦN 1: THÔNG TIN CƠ BẢN */}
                    <Card
                        size="small"
                        title={
                            <Space>
                                <UserOutlined style={{ color: '#722ed1' }} />
                                <span>Thông tin cơ bản</span>
                            </Space>
                        }
                        style={{ borderRadius: 8 }}
                    >
                        <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }} size="middle">
                            <Descriptions.Item label="Mã sinh viên">
                                <Tag color="#722ed1" style={{ fontSize: 14, padding: '2px 12px' }}>
                                    {selectedStudent.studentCode}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Họ và tên">
                                <Text strong style={{ fontSize: 15 }}>{selectedStudent.fullName}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Mã số (ID)">
                                <Text code>{selectedStudent.studentId}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Ngành học">
                                {selectedStudent.major || 'Chưa cập nhật'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Năm nhập học">
                                {selectedStudent.admissionYear}
                            </Descriptions.Item>
                            <Descriptions.Item label="Giới tính">
                                <Tag color={
                                    selectedStudent.gender === 'M' ? '#1890ff' :
                                        selectedStudent.gender === 'F' ? '#eb2f96' : '#8c8c8c'
                                }>
                                    {selectedStudent.gender === 'M' ? 'Nam' :
                                        selectedStudent.gender === 'F' ? 'Nữ' : 'Khác'}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Ngày sinh">
                                {selectedStudent.dateOfBirth ? dayjs(selectedStudent.dateOfBirth).format('DD/MM/YYYY') : 'Chưa cập nhật'}
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>

                    {/* PHẦN 2: THÔNG TIN LIÊN HỆ */}
                    <Card
                        size="small"
                        title={
                            <Space>
                                <MailOutlined style={{ color: '#52c41a' }} />
                                <span>Thông tin liên hệ</span>
                            </Space>
                        }
                        style={{ borderRadius: 8 }}
                    >
                        <Row gutter={[16, 16]}>
                            <Col span={12}>
                                <div style={{
                                    padding: 12,
                                    background: '#f6ffed',
                                    borderRadius: 8,
                                    border: '1px solid #b7eb8f'
                                }}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>📧 Email</Text>
                                    <div style={{ marginTop: 4 }}>
                                        {selectedStudent.email ? (
                                            <Button
                                                type="link"
                                                icon={<MailOutlined />}
                                                onClick={() => window.location.href = `mailto:${selectedStudent.email}`}
                                                style={{ padding: 0, fontSize: 14 }}
                                            >
                                                {selectedStudent.email}
                                            </Button>
                                        ) : (
                                            <Text type="secondary">Chưa cập nhật</Text>
                                        )}
                                    </div>
                                </div>
                            </Col>
                            <Col span={12}>
                                <div style={{
                                    padding: 12,
                                    background: '#e6f4ff',
                                    borderRadius: 8,
                                    border: '1px solid #91caff'
                                }}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>📞 Số điện thoại</Text>
                                    <div style={{ marginTop: 4 }}>
                                        {selectedStudent.phone ? (
                                            <Text style={{ fontSize: 14 }}>
                                                <PhoneOutlined style={{ marginRight: 8 }} />
                                                {selectedStudent.phone}
                                            </Text>
                                        ) : (
                                            <Text type="secondary">Chưa cập nhật</Text>
                                        )}
                                    </div>
                                </div>
                            </Col>
                        </Row>
                    </Card>

                    {/* PHẦN 3: THỐNG KÊ HỌC TẬP */}
                    <Card
                        size="small"
                        title={
                            <Space>
                                <TrophyOutlined style={{ color: '#faad14' }} />
                                <span>Thống kê học tập</span>
                            </Space>
                        }
                        style={{ borderRadius: 8 }}
                    >
                        <Row gutter={[16, 16]}>
                            <Col span={8}>
                                <div style={{
                                    textAlign: 'center',
                                    padding: '16px 12px',
                                    background: isGoodGpa ? '#f6ffed' : isWarningGpa ? '#fff1f0' : '#fafafa',
                                    borderRadius: 8,
                                    border: `1px solid ${isGoodGpa ? '#b7eb8f' : isWarningGpa ? '#ffccc7' : '#f0f0f0'}`
                                }}>
                                    <Statistic
                                        title="GPA tích lũy"
                                        value={formatGpa(stats.currentGpa)}
                                        valueStyle={{
                                            color: getGpaColor(stats.currentGpa),
                                            fontSize: 28,
                                            fontWeight: 600
                                        }}
                                        prefix={<TrophyOutlined />}
                                    />
                                    {stats.currentGpa && (
                                        <Tag color={getGpaColor(stats.currentGpa)} style={{ marginTop: 8 }}>
                                            {gpaClassification}
                                        </Tag>
                                    )}
                                    {stats.semesterGpa && (
                                        <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                                            GPA học kỳ hiện tại: {stats.semesterGpa.toFixed(2)}
                                        </div>
                                    )}
                                </div>
                            </Col>
                            <Col span={8}>
                                <div style={{
                                    textAlign: 'center',
                                    padding: '16px 12px',
                                    background: '#e6f4ff',
                                    borderRadius: 8,
                                    border: '1px solid #91caff'
                                }}>
                                    <Statistic
                                        title="Tín chỉ tích lũy"
                                        value={stats.completedCredits}
                                        suffix={`/ ${stats.requiredCredits}`}
                                        valueStyle={{ color: '#1677ff', fontSize: 28, fontWeight: 600 }}
                                        prefix={<BookOutlined />}
                                    />
                                    <Progress
                                        percent={stats.progressPercentage}
                                        size="small"
                                        strokeColor={progressColor}
                                        style={{ marginTop: 12, width: '100%' }}
                                        format={(p) => `${p?.toFixed(1)}% (${stats.completedCredits}/${stats.requiredCredits} TC)`}
                                    />
                                </div>
                            </Col>
                            <Col span={8}>
                                <div style={{
                                    textAlign: 'center',
                                    padding: '16px 12px',
                                    background: stats.totalWarnings > 0 ? '#fff1f0' : '#f6ffed',
                                    borderRadius: 8,
                                    border: `1px solid ${stats.totalWarnings > 0 ? '#ffccc7' : '#b7eb8f'}`
                                }}>
                                    <Statistic
                                        title="Cảnh báo học vụ"
                                        value={stats.totalWarnings}
                                        valueStyle={{
                                            color: stats.totalWarnings > 0 ? '#ff4d4f' : '#52c41a',
                                            fontSize: 28,
                                            fontWeight: 600
                                        }}
                                        prefix={<WarningOutlined />}
                                    />
                                    {stats.totalWarnings > 0 && (
                                        <Tag color={getWarningColor(stats.totalWarnings)} style={{ marginTop: 8 }}>
                                            {getWarningText(stats.totalWarnings)}
                                        </Tag>
                                    )}
                                </div>
                            </Col>
                        </Row>

                        <Divider style={{ margin: '16px 0' }} />

                        <Row gutter={[16, 16]}>
                            <Col span={12}>
                                <div style={{
                                    padding: 12,
                                    background: '#f9f0ff',
                                    borderRadius: 8,
                                    border: '1px solid #d3adf7'
                                }}>
                                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            <BookOutlined /> Tín chỉ đã đăng ký (học kỳ này)
                                        </Text>
                                        <Text strong style={{ fontSize: 24, color: '#722ed1' }}>
                                            {stats.registeredCredits} TC
                                        </Text>
                                    </Space>
                                </div>
                            </Col>
                            <Col span={12}>
                                <div style={{
                                    padding: 12,
                                    background: '#fff7e6',
                                    borderRadius: 8,
                                    border: '1px solid #ffd591'
                                }}>
                                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            <ClockCircleOutlined /> Đăng ký chờ duyệt
                                        </Text>
                                        <Text strong style={{ fontSize: 24, color: '#faad14' }}>
                                            {stats.pendingRegistrations}
                                        </Text>
                                    </Space>
                                </div>
                            </Col>
                        </Row>

                        {/* Hiển thị thông báo nếu dữ liệu không đầy đủ */}
                        {stats.completedCredits === 0 && stats.registeredCredits > 0 && (
                            <Alert
                                type="info"
                                showIcon
                                message="Dữ liệu đang được cập nhật"
                                description="Thông tin tín chỉ tích lũy đang được đồng bộ. Vui lòng quay lại sau."
                                style={{ marginTop: 16 }}
                            />
                        )}
                    </Card>

                    {/* PHẦN 4: CẢNH BÁO (NẾU CÓ) */}
                    {stats.totalWarnings > 0 && (
                        <Card
                            size="small"
                            title={
                                <Space>
                                    <WarningOutlined style={{ color: '#ff4d4f' }} />
                                    <span style={{ color: '#ff4d4f' }}>Cảnh báo học vụ</span>
                                </Space>
                            }
                            style={{ borderRadius: 8, borderColor: '#ffccc7', background: '#fff1f0' }}
                        >
                            <Alert
                                type={isCriticalWarning ? 'error' : 'warning'}
                                showIcon
                                message={
                                    isCriticalWarning
                                        ? `⚠️ Sinh viên có ${stats.totalWarnings} cảnh báo - Cần can thiệp khẩn cấp`
                                        : `⚠️ Sinh viên có ${stats.totalWarnings} cảnh báo - Cần theo dõi và hỗ trợ`
                                }
                                description={
                                    <ul style={{ marginBottom: 0, marginTop: 8, paddingLeft: 20 }}>
                                        <li>Điểm GPA {formatGpa(stats.currentGpa)} {stats.currentGpa && stats.currentGpa < 2.0 && '(dưới ngưỡng cho phép)'}</li>
                                        <li>Đã tích lũy {stats.completedCredits}/{stats.requiredCredits} tín chỉ</li>
                                        <li>Khuyến nghị: Họp với cố vấn học tập để xây dựng kế hoạch cải thiện kết quả học tập</li>
                                    </ul>
                                }
                                style={{ background: '#fff1f0', border: 'none' }}
                            />
                        </Card>
                    )}

                    {/* PHẦN 5: HÀNH ĐỘNG NHANH */}
                    <Card
                        size="small"
                        title={
                            <Space>
                                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                <span>Hành động</span>
                            </Space>
                        }
                        style={{ borderRadius: 8 }}
                    >
                        <Row gutter={[16, 16]}>
                            <Col span={8}>
                                <Button
                                    type="default"
                                    icon={<HistoryOutlined />}
                                    block
                                    onClick={() => openHistoryModal(selectedStudent)}
                                >
                                    Xem lịch sử học tập
                                </Button>
                            </Col>
                            {selectedStudent.email && (
                                <Col span={8}>
                                    <Button
                                        type="default"
                                        icon={<MailOutlined />}
                                        block
                                        onClick={() => openEmailModal(selectedStudent)}
                                        style={{ color: '#52c41a', borderColor: '#52c41a' }}
                                    >
                                        Gửi email
                                    </Button>
                                </Col>
                            )}
                            <Col span={8}>
                                <Button
                                    type="default"
                                    icon={<EyeOutlined />}
                                    block
                                    onClick={() => {
                                        window.open(`/students/${selectedStudent.studentId}`, '_blank');
                                    }}
                                >
                                    Xem trang cá nhân
                                </Button>
                            </Col>
                        </Row>
                    </Card>
                </Space>
            </Modal>
        );
    };

    // ============================================================
    // Main Render
    // ============================================================

    if (loadingClasses) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
                <Spin size="large" tip="Đang tải danh sách lớp cố vấn..." />
            </div>
        );
    }

    if (advisorClasses.length === 0) {
        return (
            <div style={{ padding: '0 24px' }}>
                <Card style={{ borderRadius: 12 }}>
                    <Empty
                        description="Bạn chưa được phân công quản lý lớp cố vấn nào."
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                </Card>
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
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16
            }}>
                <div>
                    <Title level={3} style={{ color: '#fff', margin: 0 }}>
                        <TeamOutlined style={{ marginRight: 10 }} />
                        Quản lý sinh viên lớp cố vấn
                    </Title>
                    {selectedClassInfo && (
                        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
                            {selectedClassInfo.classCode} - {selectedClassInfo.className} · Năm học {selectedClassInfo.academicYear}
                        </Text>
                    )}
                </div>
                <Button
                    icon={<ReloadOutlined spin={refreshing} />}
                    onClick={handleRefresh}
                    loading={refreshing}
                    style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}
                >
                    Làm mới
                </Button>
            </div>

            {/* Filter Card */}
            <Card style={{ marginBottom: 20, borderRadius: 12 }}>
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} md={8}>
                        <Text strong>Chọn lớp cố vấn:</Text>
                        <Select
                            placeholder="-- Chọn lớp --"
                            style={{ width: '100%', marginTop: 4 }}
                            value={selectedClassId}
                            onChange={handleClassChange}
                            showSearch
                            optionFilterProp="children"
                            loading={loadingClasses}
                        >
                            {advisorClasses.map(c => (
                                <Option key={c.advisorClassId} value={c.advisorClassId}>
                                    {c.classCode} - {c.className} ({c.academicYear})
                                </Option>
                            ))}
                        </Select>
                    </Col>

                    <Col xs={24} md={12}>
                        <Text strong>Tìm kiếm:</Text>
                        <Input
                            placeholder="Tìm theo tên, mã SV, ngành, email, SĐT..."
                            prefix={<SearchOutlined />}
                            style={{ width: '100%', marginTop: 4 }}
                            allowClear
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            disabled={loadingStudents || !selectedClassId}
                        />
                    </Col>

                    <Col xs={24} md={4} style={{ textAlign: 'right' }}>
                        <Text strong>Số lượng:</Text>
                        <div style={{ marginTop: 4 }}>
                            <Tag color="#722ed1" style={{ fontSize: 14, padding: '4px 12px' }}>
                                {filteredStudents.length} sinh viên
                            </Tag>
                        </div>
                    </Col>
                </Row>
            </Card>

            {/* Stats Cards */}
            {students.length > 0 && (
                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                    <Col span={6}>
                        <Card size="small" style={{ background: '#f9f0ff', borderRadius: 10 }}>
                            <Statistic
                                title="Tổng sinh viên"
                                value={totalStats.totalStudents}
                                prefix={<UsergroupAddOutlined style={{ color: '#722ed1' }} />}
                                valueStyle={{ color: '#722ed1' }}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card
                            size="small"
                            style={{
                                background: totalStats.warningCount > 0 ? '#fff7e6' : '#f6ffed',
                                borderRadius: 10,
                                cursor: 'pointer'
                            }}
                            onClick={() => {
                                if (totalStats.warningCount > 0) {
                                    const warningStudents = students.filter(s => getStudentStats(s.studentId).totalWarnings > 0);
                                    if (warningStudents.length > 0) {
                                        setSelectedStudent(warningStudents[0]);
                                    }
                                }
                            }}
                        >
                            <Statistic
                                title="Có cảnh báo"
                                value={totalStats.warningCount}
                                prefix={<WarningOutlined style={{ color: totalStats.warningCount > 0 ? '#ff4d4f' : '#52c41a' }} />}
                                valueStyle={{ color: totalStats.warningCount > 0 ? '#ff4d4f' : '#52c41a' }}
                                suffix={totalStats.criticalWarningCount > 0 ? `(${totalStats.criticalWarningCount} nghiêm trọng)` : undefined}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card size="small" style={{ background: '#e6f4ff', borderRadius: 10 }}>
                            <Statistic
                                title="Đăng ký chờ duyệt"
                                value={totalStats.totalPendingRegs}
                                prefix={<BookOutlined style={{ color: '#faad14' }} />}
                                valueStyle={{ color: '#faad14' }}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card size="small" style={{ background: '#f6ffed', borderRadius: 10 }}>
                            <Statistic
                                title="GPA trung bình"
                                value={totalStats.avgGpa.toFixed(2)}
                                prefix={<TrophyOutlined style={{ color: '#52c41a' }} />}
                                valueStyle={{ color: '#52c41a' }}
                            />
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Loading state */}
            {!selectedClassId ? (
                <Card style={{ borderRadius: 12 }}>
                    <Empty description="Vui lòng chọn một lớp cố vấn để xem danh sách sinh viên." />
                </Card>
            ) : loadingStudents ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <Spin size="large" tip="Đang tải danh sách sinh viên..." />
                </div>
            ) : filteredStudents.length === 0 ? (
                <Card style={{ borderRadius: 12 }}>
                    <Empty description="Không có sinh viên trong lớp này" />
                </Card>
            ) : (
                /* Table */
                <Card
                    style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
                    styles={{ body: { padding: 0 } }}
                >
                    <Table
                        columns={columns}
                        dataSource={filteredStudents}
                        rowKey="studentId"
                        pagination={{
                            pageSize: 15,
                            showTotal: (t) => `Tổng ${t} sinh viên`,
                            showSizeChanger: true,
                            pageSizeOptions: ['10', '15', '20', '50']
                        }}
                        scroll={{ x: 1500 }}
                        loading={loadingStats}
                        size="middle"
                        rowClassName={(record) => {
                            const stats = getStudentStats(record.studentId);
                            if (stats.totalWarnings >= 3) return 'row-danger';
                            if (stats.totalWarnings > 0) return 'row-warning';
                            return '';
                        }}
                    />
                </Card>
            )}

            {/* Modals */}
            {renderStudentDetailModal()}

            {historyStudent && (
                <StudentHistoryModal
                    visible={historyModalVisible}
                    studentId={historyStudent.id}
                    studentCode={historyStudent.code}
                    studentName={historyStudent.name}
                    onClose={() => {
                        setHistoryModalVisible(false);
                        setHistoryStudent(null);
                    }}
                />
            )}

            {emailStudent && (
                <SendEmailModal
                    visible={emailModalVisible}
                    studentEmail={emailStudent.email}
                    studentName={emailStudent.name}
                    onClose={() => {
                        setEmailModalVisible(false);
                        setEmailStudent(null);
                    }}
                />
            )}

            {/* CSS inline */}
            <style>{`
                .row-warning td {
                    background: #fff7e6 !important;
                }
                .row-warning:hover td {
                    background: #ffe7ba !important;
                }
                .row-danger td {
                    background: #fff1f0 !important;
                }
                .row-danger:hover td {
                    background: #ffccc7 !important;
                }
                .ant-table-thead > tr > th {
                    background: #fafafa !important;
                    font-weight: 700 !important;
                    border-bottom: 2px solid #f0f0f0 !important;
                }
                .ant-progress-text {
                    font-size: 11px !important;
                }
                .ant-statistic-title {
                    font-size: 13px !important;
                }
            `}</style>
        </div>
    );
};

export default AdvisorStudents;