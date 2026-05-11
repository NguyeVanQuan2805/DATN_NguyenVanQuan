import React, { useEffect, useState, useCallback } from 'react';
import {
    Table,
    Button,
    Modal,
    Form,
    Input,
    Select,
    InputNumber,
    message,
    Tag,
    Tooltip,
    Space,
    Badge,
    Popconfirm,
    Row,
    Col,
    Typography,
    Card,
    Statistic,
    Divider,
    Spin,
    Alert,
    Checkbox,
    Tabs,
    Empty,
    Progress,
    ConfigProvider,
} from 'antd';
import {
    EditOutlined,
    DeleteOutlined,
    PlusOutlined,
    ReloadOutlined,
    TeamOutlined,
    UnlockOutlined,
    LockOutlined,
    UserOutlined,
    CalendarOutlined,
    BookOutlined,
    FileTextOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    ClockCircleOutlined,
    DownloadOutlined,
    LoadingOutlined,
    TrophyOutlined,
    StarOutlined,
    ExclamationCircleOutlined,
    WarningOutlined,
    BellOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

/* ===================== INTERFACES ===================== */
interface SubjectItem {
    subjectId: string;
    subjectCode: string;
    subjectName: string;
    credits: number;
}

interface TeacherItem {
    teacherId: string;
    fullName: string;
    position?: string;
}

interface SemesterItem {
    semesterId: string;
    semesterName: string;
    academicYear: number;
    semesterNumber: number;
}

interface ScheduleItem {
    scheduleId: number;
    dayOfWeek: number;
    periodStart: number;
    periodEnd: number;
    room: string;
}

interface ClassItem {
    classId: string;
    classCode: string;
    subject: SubjectItem;
    teacher?: TeacherItem | null;
    semester: SemesterItem;
    schedule?: ScheduleItem | null;
    maxStudents: number;
    currentStudents: number;
    status: 'OPEN' | 'CLOSED' | 'CANCELLED';
}

// Interface cho sinh viên từ API
interface StudentApiItem {
    studentId: string;
    studentCode: string;
    fullName: string;
    email?: string;
    phone?: string;
    gender?: string;
}

// Interface cho điểm từ API
interface GradeApiItem {
    gradeId: number;
    studentId: string;
    processScore: number | null;
    midtermScore: number | null;
    finalScore: number | null;
    totalScore: number | null;
    letterGrade: string | null;
    status: 'SAVED' | 'SUBMITTED' | 'APPROVED';
}

// Interface cho sinh viên (dùng chung cho cả chờ duyệt và đã duyệt)
interface StudentGradeItem {
    gradeId: number;
    studentId: string;
    studentCode: string;
    fullName: string;
    processScore: number | null;
    midtermScore: number | null;
    finalScore: number | null;
    totalScore: number | null;
    letterGrade: string | null;
    status: 'SAVED' | 'SUBMITTED' | 'APPROVED';
    isSelected?: boolean;
}

// Interface cho số lượng điểm chờ duyệt
interface PendingCountMap {
    [classId: string]: number;
}

/* ===================== HELPERS ===================== */
const DAY_MAP: Record<number, string> = {
    2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4',
    5: 'Thứ 5', 6: 'Thứ 6', 7: 'Thứ 7', 8: 'CN',
};

const fmtSchedule = (s?: ScheduleItem | null): string =>
    s ? `${DAY_MAP[s.dayOfWeek]} · T${s.periodStart}–${s.periodEnd} · ${s.room}` : '—';

const STATUS_CFG: Record<string, { color: string; label: string }> = {
    OPEN: { color: 'success', label: 'Đang mở' },
    CLOSED: { color: 'default', label: 'Đã đóng' },
    CANCELLED: { color: 'error', label: 'Đã hủy' },
};

const LETTER_CONFIG: Record<string, string> = {
    A: 'success',
    'B+': 'processing',
    B: 'processing',
    'C+': 'warning',
    C: 'warning',
    'D+': 'default',
    D: 'default',
    F: 'error',
};

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
    SAVED: { color: 'purple', label: 'Đã lưu', icon: <FileTextOutlined /> },
    SUBMITTED: { color: 'orange', label: 'Chờ duyệt', icon: <ClockCircleOutlined /> },
    APPROVED: { color: 'green', label: 'Đã duyệt', icon: <CheckCircleOutlined /> },
};

// Hàm lấy màu cho điểm
const getScoreColor = (score: number | null): string => {
    if (score === null) return '#8c8c8c';
    if (score >= 8.5) return '#00c853';
    if (score >= 7.0) return '#52c41a';
    if (score >= 5.0) return '#faad14';
    return '#ff4d4f';
};

// Hàm tính thống kê
const calculateStats = (students: StudentGradeItem[]) => {
    const total = students.length;
    const passed = students.filter(s => s.totalScore !== null && s.totalScore >= 5).length;
    const failed = students.filter(s => s.totalScore !== null && s.totalScore < 5).length;
    const avgScore = students.filter(s => s.totalScore !== null).length > 0
        ? students.filter(s => s.totalScore !== null).reduce((sum, s) => sum + (s.totalScore || 0), 0) / students.filter(s => s.totalScore !== null).length
        : 0;
    const gradeDistribution = {
        A: students.filter(s => s.totalScore !== null && s.totalScore >= 8.5).length,
        B: students.filter(s => s.totalScore !== null && s.totalScore >= 7.0 && s.totalScore < 8.5).length,
        C: students.filter(s => s.totalScore !== null && s.totalScore >= 5.5 && s.totalScore < 7.0).length,
        D: students.filter(s => s.totalScore !== null && s.totalScore >= 4.0 && s.totalScore < 5.5).length,
        F: students.filter(s => s.totalScore !== null && s.totalScore < 4.0).length,
    };
    return { total, passed, failed, avgScore, gradeDistribution };
};

/* ===================== COMPONENT ===================== */
const ClassesManagement: React.FC = () => {
    const navigate = useNavigate();

    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [subjects, setSubjects] = useState<SubjectItem[]>([]);
    const [teachers, setTeachers] = useState<TeacherItem[]>([]);
    const [semesters, setSemesters] = useState<SemesterItem[]>([]);
    const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    // State cho modal thêm/sửa lớp
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<ClassItem | null>(null);
    const [form] = Form.useForm();

    // State cho modal duyệt điểm
    const [approvalModalVisible, setApprovalModalVisible] = useState(false);
    const [selectedClassForApproval, setSelectedClassForApproval] = useState<ClassItem | null>(null);
    const [pendingStudents, setPendingStudents] = useState<StudentGradeItem[]>([]);
    const [approvedStudents, setApprovedStudents] = useState<StudentGradeItem[]>([]);
    const [loadingPending, setLoadingPending] = useState(false);
    const [loadingApproved, setLoadingApproved] = useState(false);
    const [approving, setApproving] = useState(false);
    const [selectAll, setSelectAll] = useState(false);
    const [activeTab, setActiveTab] = useState('pending');

    // ==================== THÊM STATE CHO ĐIỂM CHỜ DUYỆT ====================
    const [pendingCounts, setPendingCounts] = useState<PendingCountMap>({});
    const [isLoadingPendingCounts, setIsLoadingPendingCounts] = useState(false);
    const [lastFetched, setLastFetched] = useState<Date | null>(null);

    /* ---------- fetch ---------- */
    const fetchAll = async () => {
        setLoading(true);
        try {
            const classesRes = await api.get('/Classes');
            const classList: ClassItem[] = classesRes.data || [];
            setClasses(classList);

            const [subjectsRes, teachersRes, semestersRes, schedulesRes] = await Promise.all([
                api.get('/Subjects'),
                api.get('/Teachers'),
                api.get('/Semesters'),
                api.get('/ClassSchedules'),
            ]);

            setSubjects(subjectsRes.data || []);
            setTeachers(teachersRes.data || []);
            setSemesters(semestersRes.data || []);
            setSchedules(schedulesRes.data || []);
        } catch (err: any) {
            console.error('Lỗi tải dữ liệu:', err);
            message.error('Không thể tải dữ liệu: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    // ==================== HÀM LẤY SỐ LƯỢNG ĐIỂM CHỜ DUYỆT ====================
    const fetchPendingApprovalCounts = useCallback(async () => {
        if (classes.length === 0) return;

        setIsLoadingPendingCounts(true);
        try {
            const counts: PendingCountMap = {};
            let totalPending = 0;

            // Chỉ fetch cho các lớp không phải CANCELLED
            const activeClasses = classes.filter(c => c.status !== 'CANCELLED');

            // Fetch song song để tăng tốc
            const promises = activeClasses.map(async (cls) => {
                try {
                    const response = await api.get(`/Grades/pending/${cls.classId}`);
                    const pendingList = response.data || [];
                    if (pendingList.length > 0) {
                        counts[cls.classId] = pendingList.length;
                        totalPending += pendingList.length;
                    }
                } catch (err) {
                    console.warn(`Không thể lấy điểm chờ duyệt cho lớp ${cls.classId}:`, err);
                }
            });

            await Promise.all(promises);
            setPendingCounts(counts);
            setLastFetched(new Date());

            const classesWithPending = Object.keys(counts).length;
            if (classesWithPending > 0) {
                console.log(`📋 Có ${classesWithPending} lớp có điểm chờ duyệt, tổng ${totalPending} sinh viên`);
                message.info(`🔔 Có ${classesWithPending} lớp có điểm chờ duyệt`, 3);
            }
        } catch (err) {
            console.error('Lỗi khi lấy số lượng điểm chờ duyệt:', err);
        } finally {
            setIsLoadingPendingCounts(false);
        }
    }, [classes]);

    // Lấy số lượng điểm chờ duyệt khi classes thay đổi
    useEffect(() => {
        fetchPendingApprovalCounts();
    }, [fetchPendingApprovalCounts]);

    // Tự động refresh mỗi 30 giây
    useEffect(() => {
        const interval = setInterval(() => {
            if (classes.length > 0) {
                fetchPendingApprovalCounts();
            }
        }, 30000); // 30 giây

        return () => clearInterval(interval);
    }, [classes.length, fetchPendingApprovalCounts]);

    useEffect(() => {
        fetchAll();

        // Lắng nghe sự kiện thay đổi trạng thái học kỳ từ SemesterManagement
        const handleSemesterStatusChange = (event: CustomEvent) => {
            const { semesterId, isOpen } = event.detail;
            console.log(`Semester ${semesterId} status changed to: ${isOpen ? 'OPEN' : 'CLOSED'}`);
            fetchAll();
            message.info(`Trạng thái học kỳ đã được cập nhật`);
        };

        window.addEventListener('semesterStatusChanged', handleSemesterStatusChange as EventListener);

        return () => {
            window.removeEventListener('semesterStatusChanged', handleSemesterStatusChange as EventListener);
        };
    }, []);

    /* ---------- modal thêm/sửa ---------- */
    const openAdd = () => {
        setEditing(null);
        form.resetFields();
        form.setFieldValue('status', 'OPEN');
        setModalOpen(true);
    };

    const openEdit = (r: ClassItem) => {
        setEditing(r);
        form.setFieldsValue({
            classCode: r.classCode,
            subjectId: r.subject.subjectId,
            teacherId: r.teacher?.teacherId,
            semesterId: r.semester.semesterId,
            scheduleId: r.schedule?.scheduleId,
            maxStudents: r.maxStudents,
            status: r.status,
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditing(null);
        form.resetFields();
    };

    /* ---------- CRUD ---------- */
    interface ClassFormValues {
        classCode: string;
        subjectId: string;
        teacherId?: string;
        semesterId: string;
        scheduleId: number;
        maxStudents: number;
        status: string;
    }

    const onFinish = async (values: ClassFormValues) => {
        try {
            if (editing) {
                await api.put(`/Classes/${editing.classId}`, {
                    ...values,
                    classId: editing.classId,
                });
                message.success('Cập nhật lớp thành công');
            } else {
                await api.post('/Classes', values);
                message.success('Tạo lớp mới thành công');
            }
            closeModal();
            fetchAll();
        } catch (err: any) {
            console.error('Lỗi lưu lớp:', err);
            message.error('Lưu thất bại: ' + (err.response?.data?.message || err.message));
        }
    };

    // Hàm xóa lớp - cho phép xóa lớp có trạng thái CANCELLED
    const handleDelete = async (r: ClassItem) => {
        if (r.status === 'OPEN' && r.currentStudents > 0) {
            Modal.warning({
                title: 'Không thể xóa lớp',
                content: `Lớp ${r.classCode} đang có ${r.currentStudents} sinh viên đăng ký. Vui lòng chuyển trạng thái lớp thành "Đã hủy" trước khi xóa.`,
                okText: 'Đóng',
            });
            return;
        }

        Modal.confirm({
            title: 'Xác nhận xóa lớp học phần',
            icon: <ExclamationCircleOutlined />,
            content: (
                <div>
                    <p>Bạn có chắc chắn muốn xóa lớp <strong>{r.classCode}</strong>?</p>
                    {r.status === 'CANCELLED' && (
                        <p style={{ color: '#ff4d4f' }}>
                            <WarningOutlined /> Đây là lớp đã bị hủy. Hành động này sẽ xóa vĩnh viễn lớp khỏi hệ thống.
                        </p>
                    )}
                    <p>Thao tác này không thể hoàn tác.</p>
                </div>
            ),
            okText: 'Xóa lớp',
            okType: 'danger',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    await api.delete(`/Classes/${r.classId}`);
                    message.success(`Đã xóa lớp ${r.classCode} thành công`);
                    fetchAll();
                } catch (err: any) {
                    message.error('Không thể xóa lớp này: ' + (err.response?.data?.message || err.message));
                }
            },
        });
    };

    /* ========== Xử lý duyệt điểm ========== */
    const openApprovalModal = async (cls: ClassItem) => {
        setSelectedClassForApproval(cls);
        setApprovalModalVisible(true);
        setSelectAll(false);
        setActiveTab('pending');
        await Promise.all([
            loadPendingGrades(cls.classId),
            loadApprovedGrades(cls.classId)
        ]);
    };

    // Load danh sách sinh viên chờ duyệt điểm (status = SUBMITTED)
    const loadPendingGrades = async (classId: string) => {
        setLoadingPending(true);
        try {
            const studentsRes = await api.get(`/Classes/${classId}/students`);
            const studentList: StudentApiItem[] = studentsRes.data.students || [];

            let gradeList: GradeApiItem[] = [];
            try {
                const gradesRes = await api.get(`/Grades/pending/${classId}`);
                gradeList = gradesRes.data || [];
            } catch (gradeErr: any) {
                console.warn('Lỗi khi lấy điểm chờ duyệt:', gradeErr);
            }

            const gradeMap = new Map<string, GradeApiItem>();
            for (const g of gradeList) {
                gradeMap.set(g.studentId, g);
            }

            const pending: StudentGradeItem[] = [];
            for (const student of studentList) {
                const grade = gradeMap.get(student.studentId);
                if (grade && grade.status === 'SUBMITTED') {
                    pending.push({
                        gradeId: grade.gradeId,
                        studentId: student.studentId,
                        studentCode: student.studentCode,
                        fullName: student.fullName,
                        processScore: grade.processScore,
                        midtermScore: grade.midtermScore,
                        finalScore: grade.finalScore,
                        totalScore: grade.totalScore,
                        letterGrade: grade.letterGrade,
                        status: grade.status,
                        isSelected: false,
                    });
                }
            }

            setPendingStudents(pending);
        } catch (err: any) {
            console.error('Lỗi tải sinh viên chờ duyệt:', err);
            message.error('Không thể tải danh sách sinh viên chờ duyệt');
            setPendingStudents([]);
        } finally {
            setLoadingPending(false);
        }
    };

    // Load danh sách sinh viên đã duyệt điểm (status = APPROVED)
    const loadApprovedGrades = async (classId: string) => {
        setLoadingApproved(true);
        try {
            const studentsRes = await api.get(`/Classes/${classId}/students`);
            const studentList: StudentApiItem[] = studentsRes.data.students || [];

            let gradeList: GradeApiItem[] = [];
            try {
                const gradesRes = await api.get(`/Grades/class/${classId}`);
                gradeList = gradesRes.data || [];
            } catch (gradeErr: any) {
                console.warn('Lỗi khi lấy điểm:', gradeErr);
            }

            const gradeMap = new Map<string, GradeApiItem>();
            for (const g of gradeList) {
                gradeMap.set(g.studentId, g);
            }

            const approved: StudentGradeItem[] = [];
            for (const student of studentList) {
                const grade = gradeMap.get(student.studentId);
                if (grade && grade.status === 'APPROVED') {
                    approved.push({
                        gradeId: grade.gradeId,
                        studentId: student.studentId,
                        studentCode: student.studentCode,
                        fullName: student.fullName,
                        processScore: grade.processScore,
                        midtermScore: grade.midtermScore,
                        finalScore: grade.finalScore,
                        totalScore: grade.totalScore,
                        letterGrade: grade.letterGrade,
                        status: grade.status,
                        isSelected: false,
                    });
                }
            }

            setApprovedStudents(approved);
        } catch (err: any) {
            console.error('Lỗi tải sinh viên đã duyệt:', err);
            message.error('Không thể tải danh sách sinh viên đã duyệt');
            setApprovedStudents([]);
        } finally {
            setLoadingApproved(false);
        }
    };

    const handleSelectAll = (checked: boolean) => {
        setSelectAll(checked);
        setPendingStudents(prev =>
            prev.map((s: StudentGradeItem) => ({ ...s, isSelected: checked }))
        );
    };

    const handleSelectStudent = (studentId: string, checked: boolean) => {
        setPendingStudents(prev =>
            prev.map((s: StudentGradeItem) =>
                s.studentId === studentId ? { ...s, isSelected: checked } : s
            )
        );

        const allSelected = pendingStudents.length > 0 && pendingStudents.every((s: StudentGradeItem) =>
            s.studentId === studentId ? checked : s.isSelected
        );
        setSelectAll(allSelected);
    };

    const handleApproveGrades = async () => {
        if (!selectedClassForApproval) return;

        const selectedStudents = pendingStudents.filter((s: StudentGradeItem) => s.isSelected);
        if (selectedStudents.length === 0) {
            message.warning('Vui lòng chọn ít nhất một sinh viên để duyệt');
            return;
        }

        Modal.confirm({
            title: 'Xác nhận duyệt điểm',
            content: (
                <div>
                    <p>Bạn có chắc muốn duyệt điểm cho <Text strong style={{ fontSize: '15px' }}>{selectedStudents.length}</Text> sinh viên?</p>
                    <p>Sau khi duyệt, điểm sẽ chính thức và không thể chỉnh sửa.</p>
                </div>
            ),
            okText: 'Duyệt điểm',
            okType: 'primary',
            cancelText: 'Hủy',
            onOk: async () => {
                setApproving(true);
                try {
                    await api.post('/Grades/approve', {
                        classId: selectedClassForApproval.classId,
                        studentIds: selectedStudents.map((s: StudentGradeItem) => s.studentId),
                    });

                    message.success(`Đã duyệt điểm thành công cho ${selectedStudents.length} sinh viên!`);

                    // Refresh lại số lượng điểm chờ duyệt
                    await fetchPendingApprovalCounts();
                    await Promise.all([
                        loadPendingGrades(selectedClassForApproval.classId),
                        loadApprovedGrades(selectedClassForApproval.classId)
                    ]);
                    setSelectAll(false);
                } catch (err: any) {
                    message.error('Duyệt điểm thất bại: ' + (err.response?.data?.message || err.message));
                } finally {
                    setApproving(false);
                }
            },
        });
    };

    const handleRejectGrades = async () => {
        if (!selectedClassForApproval) return;

        const selectedStudents = pendingStudents.filter((s: StudentGradeItem) => s.isSelected);
        if (selectedStudents.length === 0) {
            message.warning('Vui lòng chọn ít nhất một sinh viên để từ chối');
            return;
        }

        Modal.confirm({
            title: 'Từ chối duyệt điểm',
            content: (
                <div>
                    <p>Bạn có chắc muốn từ chối điểm cho <Text strong style={{ fontSize: '15px' }}>{selectedStudents.length}</Text> sinh viên?</p>
                    <p>Giảng viên sẽ nhận được thông báo và có thể chỉnh sửa lại điểm.</p>
                </div>
            ),
            okText: 'Từ chối',
            okType: 'danger',
            cancelText: 'Hủy',
            onOk: async () => {
                setApproving(true);
                try {
                    await api.post('/Grades/reject', {
                        classId: selectedClassForApproval.classId,
                        studentIds: selectedStudents.map((s: StudentGradeItem) => s.studentId),
                    });

                    message.success(`Đã từ chối điểm cho ${selectedStudents.length} sinh viên!`);

                    // Refresh lại số lượng điểm chờ duyệt
                    await fetchPendingApprovalCounts();
                    await Promise.all([
                        loadPendingGrades(selectedClassForApproval.classId),
                        loadApprovedGrades(selectedClassForApproval.classId)
                    ]);
                    setSelectAll(false);
                } catch (err: any) {
                    message.error('Từ chối thất bại: ' + (err.response?.data?.message || err.message));
                } finally {
                    setApproving(false);
                }
            },
        });
    };

    const exportPendingList = () => {
        if (pendingStudents.length === 0) {
            message.warning('Không có dữ liệu để xuất');
            return;
        }

        const data = pendingStudents.map((s: StudentGradeItem, i: number) => ({
            STT: i + 1,
            'Mã SV': s.studentCode,
            'Họ và tên': s.fullName,
            'Điểm QT': s.processScore ?? '',
            'Điểm GK': s.midtermScore ?? '',
            'Điểm CK': s.finalScore ?? '',
            'Tổng điểm': s.totalScore?.toFixed(1) ?? '',
            'Điểm chữ': s.letterGrade ?? '',
            'Kết quả': s.totalScore !== null ? (s.totalScore >= 5 ? 'Đạt' : 'Không đạt') : '',
            'Trạng thái': STATUS_CONFIG[s.status]?.label ?? s.status,
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'ChoDuyetDiem');
        XLSX.writeFile(
            wb,
            `ChoDuyetDiem_${selectedClassForApproval?.classCode}_${dayjs().format('YYYYMMDD')}.xlsx`
        );
        message.success('Đã xuất file Excel!');
    };

    const exportApprovedList = () => {
        if (approvedStudents.length === 0) {
            message.warning('Không có dữ liệu để xuất');
            return;
        }

        const data = approvedStudents.map((s: StudentGradeItem, i: number) => ({
            STT: i + 1,
            'Mã SV': s.studentCode,
            'Họ và tên': s.fullName,
            'Điểm QT': s.processScore ?? '',
            'Điểm GK': s.midtermScore ?? '',
            'Điểm CK': s.finalScore ?? '',
            'Tổng điểm': s.totalScore?.toFixed(1) ?? '',
            'Điểm chữ': s.letterGrade ?? '',
            'Kết quả': s.totalScore !== null ? (s.totalScore >= 5 ? 'Đạt' : 'Không đạt') : '',
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'DaDuyetDiem');
        XLSX.writeFile(
            wb,
            `DaDuyetDiem_${selectedClassForApproval?.classCode}_${dayjs().format('YYYYMMDD')}.xlsx`
        );
        message.success('Đã xuất file Excel!');
    };

    const goToRegistration = (cls: ClassItem) => {
        navigate(`/classes/${cls.classId}/registrations`, {
            state: {
                classId: cls.classId,
                classCode: cls.classCode,
                subjectName: cls.subject.subjectName,
                semesterName: cls.semester.semesterName,
                teacherName: cls.teacher?.fullName ?? 'Chưa phân công',
                maxStudents: cls.maxStudents,
                currentStudents: cls.currentStudents,
                status: cls.status,
                schedule: fmtSchedule(cls.schedule),
            },
        });
    };

    // Lọc lớp theo search
    const filtered = classes.filter((c: ClassItem) =>
        c.classCode.toLowerCase().includes(search.toLowerCase()) ||
        c.subject.subjectName.toLowerCase().includes(search.toLowerCase()) ||
        (c.teacher?.fullName?.toLowerCase().includes(search.toLowerCase()) ?? false)
    );

    // Thống kê
    const stats = {
        total: classes.length,
        open: classes.filter((c: ClassItem) => c.status === 'OPEN').length,
        closed: classes.filter((c: ClassItem) => c.status === 'CLOSED').length,
        cancelled: classes.filter((c: ClassItem) => c.status === 'CANCELLED').length,
        studs: classes.reduce((a: number, c: ClassItem) => a + c.currentStudents, 0),
    };

    // Thống kê điểm chờ duyệt
    const totalPendingApprovals = Object.values(pendingCounts).reduce((a, b) => a + b, 0);
    const classesWithPending = Object.keys(pendingCounts).length;

    // Columns cho bảng lớp - ĐÃ CẬP NHẬT NÚT DUYỆT ĐIỂM
    const columns: ColumnsType<ClassItem> = [
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Mã lớp</span>,
            dataIndex: 'classCode',
            width: 130,
            render: (v: string, record: ClassItem) => (
                <Text code
                    style={{
                        color: record.status === 'CANCELLED' ? '#ff4d4f' : '#1677ff',
                        fontSize: '14px',
                        textDecoration: record.status === 'CANCELLED' ? 'line-through' : 'none'
                    }}
                >
                    {v}
                </Text>
            ),
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Môn học</span>,
            render: (_: unknown, r: ClassItem) => (
                <div>
                    <Text strong style={{ fontSize: '14px' }}>{r.subject.subjectCode}</Text>
                    <Text type="secondary" style={{ fontSize: '13px' }}> – {r.subject.subjectName}</Text>
                    <div style={{ marginTop: 2 }}>
                        <Tag color="geekblue" style={{ fontSize: '12px' }}>
                            {r.subject.credits} TC
                        </Tag>
                    </div>
                </div>
            ),
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Giảng viên</span>,
            width: 200,
            render: (_: unknown, r: ClassItem) =>
                r.teacher?.fullName ? (
                    <span style={{ fontSize: '14px' }}><UserOutlined style={{ marginRight: 5, color: '#52c41a' }} />{r.teacher.fullName}</span>
                ) : (
                    <Text type="secondary" italic style={{ fontSize: '14px' }}>Chưa phân công</Text>
                ),
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Lịch học</span>,
            width: 220,
            render: (_: unknown, r: ClassItem) => (
                <Text style={{ fontSize: '13px', color: '#595959' }}>
                    <CalendarOutlined style={{ marginRight: 4 }} />
                    {fmtSchedule(r.schedule)}
                </Text>
            ),
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Sĩ số</span>,
            width: 130,
            render: (_: unknown, r: ClassItem) => {
                const pct = r.maxStudents > 0 ? Math.round((r.currentStudents / r.maxStudents) * 100) : 0;
                const full = r.currentStudents >= r.maxStudents;
                const isLowEnrollment = r.status === 'OPEN' && pct < 10 && r.currentStudents > 0;
                return (
                    <div>
                        <Badge
                            count={`${r.currentStudents}/${r.maxStudents}`}
                            style={{
                                backgroundColor: full ? '#ff4d4f' : isLowEnrollment ? '#faad14' : pct > 80 ? '#faad14' : '#52c41a',
                                fontSize: '12px',
                            }}
                        />
                        <div style={{ fontSize: '12px', color: '#999', marginTop: 3 }}>
                            {pct}% ({r.currentStudents} SV)
                            {isLowEnrollment && (
                                <Tag color="warning" style={{ marginLeft: 8, fontSize: '10px' }}>
                                    Sĩ số thấp
                                </Tag>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Trạng thái</span>,
            dataIndex: 'status',
            width: 120,
            render: (s: keyof typeof STATUS_CFG) => (
                <Tag color={STATUS_CFG[s]?.color} style={{ fontSize: '13px', padding: '4px 12px' }}>
                    {STATUS_CFG[s]?.label}
                </Tag>
            ),
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Hành động</span>,
            width: 380,
            fixed: 'right' as const,
            render: (_: unknown, r: ClassItem) => {
                const pendingCount = pendingCounts[r.classId] || 0;
                const hasPending = pendingCount > 0;

                return (
                    <Space size={8} wrap>
                        {r.status !== 'CANCELLED' && (
                            <Tooltip title={
                                hasPending
                                    ? `${pendingCount} sinh viên đã gửi điểm chờ duyệt`
                                    : "Duyệt điểm cho lớp này"
                            }>
                                <Button
                                    type="primary"
                                    size="middle"
                                    icon={<CheckCircleOutlined />}
                                    onClick={() => openApprovalModal(r)}
                                    style={{
                                        background: hasPending ? '#eb2f96' : '#722ed1',
                                        borderColor: hasPending ? '#eb2f96' : '#722ed1',
                                        fontSize: '13px',
                                        position: 'relative'
                                    }}
                                >
                                    Duyệt điểm
                                    {hasPending && (
                                        <Badge
                                            count={pendingCount}
                                            style={{
                                                marginLeft: 8,
                                                backgroundColor: '#ff4d4f',
                                                boxShadow: '0 0 0 2px #eb2f96'
                                            }}
                                        />
                                    )}
                                </Button>
                            </Tooltip>
                        )}

                        {r.status !== 'CANCELLED' && (
                            <Tooltip title="Danh sách đăng ký lớp học phần">
                                <Button
                                    type="primary"
                                    size="middle"
                                    icon={<FileTextOutlined />}
                                    onClick={() => goToRegistration(r)}
                                    style={{ background: '#1677ff', borderColor: '#1677ff', fontSize: '13px' }}
                                >
                                    DS Đăng ký
                                </Button>
                            </Tooltip>
                        )}

                        <Tooltip title="Sửa thông tin lớp">
                            <Button
                                size="middle"
                                icon={<EditOutlined />}
                                onClick={() => openEdit(r)}
                            />
                        </Tooltip>

                        <Tooltip title={
                            r.status === 'CANCELLED'
                                ? 'Xóa lớp đã hủy'
                                : r.status === 'OPEN' && r.currentStudents > 0
                                    ? 'Không thể xóa lớp đang có sinh viên. Vui lòng hủy lớp trước.'
                                    : 'Xóa lớp'
                        }>
                            <Button
                                danger
                                size="middle"
                                icon={<DeleteOutlined />}
                                onClick={() => handleDelete(r)}
                                disabled={r.status === 'OPEN' && r.currentStudents > 0}
                            />
                        </Tooltip>
                    </Space>
                );
            },
        },
    ];

    // Columns cho bảng sinh viên chờ duyệt trong modal
    const pendingColumns: ColumnsType<StudentGradeItem> = [
        {
            title: <Checkbox checked={selectAll && pendingStudents.length > 0} onChange={(e) => handleSelectAll(e.target.checked)} />,
            key: 'select',
            width: 50,
            render: (_: unknown, record: StudentGradeItem) => (
                <Checkbox
                    checked={record.isSelected}
                    onChange={(e) => handleSelectStudent(record.studentId, e.target.checked)}
                />
            ),
        },
        {
            title: <span style={{ fontSize: '14px', fontWeight: 600 }}>STT</span>,
            width: 60,
            render: (_: unknown, __: StudentGradeItem, idx: number) => <span style={{ fontSize: '14px' }}>{idx + 1}</span>,
        },
        {
            title: <span style={{ fontSize: '14px', fontWeight: 600 }}>Mã SV</span>,
            dataIndex: 'studentCode',
            width: 130,
            render: (code: string) => <Text code style={{ color: '#722ed1', fontSize: '14px' }}>{code}</Text>,
        },
        {
            title: <span style={{ fontSize: '14px', fontWeight: 600 }}>Họ và tên</span>,
            dataIndex: 'fullName',
            width: 200,
            render: (name: string) => <span style={{ fontSize: '14px' }}>{name}</span>,
        },
        {
            title: <span style={{ fontSize: '14px', fontWeight: 600 }}>Điểm QT</span>,
            dataIndex: 'processScore',
            width: 100,
            align: 'center' as const,
            render: (s: number | null) => (
                <Text style={{ color: getScoreColor(s), fontWeight: 500, fontSize: '14px' }}>
                    {s?.toFixed(1) || '—'}
                </Text>
            ),
        },
        {
            title: <span style={{ fontSize: '14px', fontWeight: 600 }}>Điểm GK</span>,
            dataIndex: 'midtermScore',
            width: 100,
            align: 'center' as const,
            render: (s: number | null) => (
                <Text style={{ color: getScoreColor(s), fontWeight: 500, fontSize: '14px' }}>
                    {s?.toFixed(1) || '—'}
                </Text>
            ),
        },
        {
            title: <span style={{ fontSize: '14px', fontWeight: 600 }}>Điểm CK</span>,
            dataIndex: 'finalScore',
            width: 100,
            align: 'center' as const,
            render: (s: number | null) => (
                <Text style={{ color: getScoreColor(s), fontWeight: 500, fontSize: '14px' }}>
                    {s?.toFixed(1) || '—'}
                </Text>
            ),
        },
        {
            title: <span style={{ fontSize: '14px', fontWeight: 600 }}>Tổng điểm</span>,
            dataIndex: 'totalScore',
            width: 110,
            align: 'center' as const,
            sorter: (a: StudentGradeItem, b: StudentGradeItem) => (a.totalScore ?? 0) - (b.totalScore ?? 0),
            render: (s: number | null) => (
                <Text strong style={{ color: getScoreColor(s), fontSize: '18px' }}>
                    {s?.toFixed(1) || '—'}
                </Text>
            ),
        },
        {
            title: <span style={{ fontSize: '14px', fontWeight: 600 }}>Điểm chữ</span>,
            dataIndex: 'letterGrade',
            width: 100,
            align: 'center' as const,
            render: (g: string | null) =>
                g ? <Tag color={LETTER_CONFIG[g] || 'default'} style={{ fontSize: '13px' }}>{g}</Tag> : <span style={{ fontSize: '14px' }}>—</span>,
        },
        {
            title: <span style={{ fontSize: '14px', fontWeight: 600 }}>Kết quả</span>,
            width: 110,
            align: 'center' as const,
            render: (_: unknown, r: StudentGradeItem) => {
                if (r.totalScore === null) return <Tag style={{ fontSize: '13px' }}>Chưa có</Tag>;
                return r.totalScore >= 5
                    ? <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontSize: '13px' }}>Đạt</Tag>
                    : <Tag color="error" icon={<CloseCircleOutlined />} style={{ fontSize: '13px' }}>Không đạt</Tag>;
            },
        },
        {
            title: <span style={{ fontSize: '14px', fontWeight: 600 }}>Trạng thái</span>,
            dataIndex: 'status',
            width: 120,
            align: 'center' as const,
            render: (status: string) => {
                const cfg = STATUS_CONFIG[status];
                return cfg ? <Tag color={cfg.color} icon={cfg.icon} style={{ fontSize: '13px' }}>{cfg.label}</Tag> : <Tag style={{ fontSize: '13px' }}>{status}</Tag>;
            },
        },
    ];

    // Columns cho bảng sinh viên đã duyệt trong modal
    const approvedColumns: ColumnsType<StudentGradeItem> = [
        {
            title: <span style={{ fontSize: '14px', fontWeight: 600 }}>STT</span>,
            width: 60,
            render: (_: unknown, __: StudentGradeItem, idx: number) => <span style={{ fontSize: '14px' }}>{idx + 1}</span>,
        },
        {
            title: <span style={{ fontSize: '14px', fontWeight: 600 }}>Mã SV</span>,
            dataIndex: 'studentCode',
            width: 130,
            render: (code: string) => <Text code style={{ color: '#52c41a', fontSize: '14px' }}>{code}</Text>,
        },
        {
            title: <span style={{ fontSize: '14px', fontWeight: 600 }}>Họ và tên</span>,
            dataIndex: 'fullName',
            width: 200,
            render: (name: string) => <span style={{ fontSize: '14px' }}>{name}</span>,
        },
        {
            title: <span style={{ fontSize: '14px', fontWeight: 600 }}>Điểm QT</span>,
            dataIndex: 'processScore',
            width: 100,
            align: 'center' as const,
            render: (s: number | null) => (
                <Text style={{ color: getScoreColor(s), fontWeight: 500, fontSize: '14px' }}>
                    {s?.toFixed(1) || '—'}
                </Text>
            ),
        },
        {
            title: <span style={{ fontSize: '14px', fontWeight: 600 }}>Điểm GK</span>,
            dataIndex: 'midtermScore',
            width: 100,
            align: 'center' as const,
            render: (s: number | null) => (
                <Text style={{ color: getScoreColor(s), fontWeight: 500, fontSize: '14px' }}>
                    {s?.toFixed(1) || '—'}
                </Text>
            ),
        },
        {
            title: <span style={{ fontSize: '14px', fontWeight: 600 }}>Điểm CK</span>,
            dataIndex: 'finalScore',
            width: 100,
            align: 'center' as const,
            render: (s: number | null) => (
                <Text style={{ color: getScoreColor(s), fontWeight: 500, fontSize: '14px' }}>
                    {s?.toFixed(1) || '—'}
                </Text>
            ),
        },
        {
            title: <span style={{ fontSize: '14px', fontWeight: 600 }}>Tổng điểm</span>,
            dataIndex: 'totalScore',
            width: 110,
            align: 'center' as const,
            sorter: (a: StudentGradeItem, b: StudentGradeItem) => (a.totalScore ?? 0) - (b.totalScore ?? 0),
            render: (s: number | null) => (
                <Text strong style={{ color: getScoreColor(s), fontSize: '18px' }}>
                    {s?.toFixed(1) || '—'}
                </Text>
            ),
        },
        {
            title: <span style={{ fontSize: '14px', fontWeight: 600 }}>Điểm chữ</span>,
            dataIndex: 'letterGrade',
            width: 100,
            align: 'center' as const,
            render: (g: string | null) =>
                g ? <Tag color={LETTER_CONFIG[g] || 'default'} style={{ fontSize: '13px' }}>{g}</Tag> : <span style={{ fontSize: '14px' }}>—</span>,
        },
        {
            title: <span style={{ fontSize: '14px', fontWeight: 600 }}>Kết quả</span>,
            width: 110,
            align: 'center' as const,
            render: (_: unknown, r: StudentGradeItem) => {
                if (r.totalScore === null) return <Tag style={{ fontSize: '13px' }}>Chưa có</Tag>;
                return r.totalScore >= 5
                    ? <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontSize: '13px' }}>Đạt</Tag>
                    : <Tag color="error" icon={<CloseCircleOutlined />} style={{ fontSize: '13px' }}>Không đạt</Tag>;
            },
        },
    ];

    // Tính thống kê cho tab đã duyệt
    const approvedStats = calculateStats(approvedStudents);

    // Modal duyệt điểm
    const renderApprovalModal = () => {
        if (!selectedClassForApproval) return null;

        const selectedCount = pendingStudents.filter((s: StudentGradeItem) => s.isSelected).length;

        return (
            <Modal
                title={
                    <Space>
                        <CheckCircleOutlined style={{ color: '#722ed1', fontSize: '18px' }} />
                        <span style={{ fontSize: '18px', fontWeight: 600 }}>Quản lý điểm - {selectedClassForApproval.classCode}</span>
                        {pendingCounts[selectedClassForApproval.classId] > 0 && (
                            <Badge
                                count={`${pendingCounts[selectedClassForApproval.classId]} chờ`}
                                style={{ backgroundColor: '#faad14' }}
                            />
                        )}
                    </Space>
                }
                open={approvalModalVisible}
                onCancel={() => setApprovalModalVisible(false)}
                footer={null}
                width={1300}
                styles={{ body: { maxHeight: '75vh', overflowY: 'auto', padding: '20px 24px' } }}
            >
                {/* Thông tin lớp */}
                <Card size="small" style={{ marginBottom: 20, background: '#f9f0ff' }}>
                    <Row gutter={[16, 8]}>
                        <Col span={8}>
                            <Text type="secondary" style={{ fontSize: '14px' }}>Môn học:</Text>
                            <div><Text strong style={{ fontSize: '15px' }}>{selectedClassForApproval.subject.subjectName}</Text></div>
                        </Col>
                        <Col span={8}>
                            <Text type="secondary" style={{ fontSize: '14px' }}>Giảng viên:</Text>
                            <div style={{ fontSize: '15px' }}>{selectedClassForApproval.teacher?.fullName || 'Chưa phân công'}</div>
                        </Col>
                        <Col span={8}>
                            <Text type="secondary" style={{ fontSize: '14px' }}>Học kỳ:</Text>
                            <div style={{ fontSize: '15px' }}>{selectedClassForApproval.semester.semesterName}</div>
                        </Col>
                    </Row>
                </Card>

                {/* Tabs */}
                <Tabs activeKey={activeTab} onChange={setActiveTab} size="large">
                    {/* Tab CHỜ DUYỆT */}
                    <TabPane
                        tab={
                            <span style={{ fontSize: '15px' }}>
                                <ClockCircleOutlined /> Chờ duyệt
                                <Badge count={pendingStudents.length} style={{ marginLeft: 8, backgroundColor: '#faad14' }} />
                            </span>
                        }
                        key="pending"
                    >
                        {loadingPending ? (
                            <div style={{ textAlign: 'center', padding: 50 }}>
                                <Spin indicator={<LoadingOutlined spin />} size="large" />
                                <div style={{ marginTop: 16, fontSize: '15px' }}>Đang tải danh sách...</div>
                            </div>
                        ) : pendingStudents.length === 0 ? (
                            <Empty description="Không có sinh viên nào chờ duyệt điểm" />
                        ) : (
                            <>
                                <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                    <Space size="middle">
                                        <Checkbox
                                            checked={selectAll && pendingStudents.length > 0}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                        >
                                            <span style={{ fontSize: '14px' }}>Chọn tất cả</span>
                                        </Checkbox>
                                        <Text type="secondary" style={{ fontSize: '14px' }}>
                                            Đã chọn <Text strong style={{ color: '#722ed1', fontSize: '15px' }}>{selectedCount}</Text> sinh viên
                                        </Text>
                                    </Space>
                                    <Space size="middle">
                                        <Button
                                            icon={<DownloadOutlined />}
                                            onClick={exportPendingList}
                                            size="middle"
                                            style={{ fontSize: '14px' }}
                                        >
                                            Xuất Excel
                                        </Button>
                                        <Button
                                            danger
                                            icon={<CloseCircleOutlined />}
                                            onClick={handleRejectGrades}
                                            disabled={selectedCount === 0 || approving}
                                            size="middle"
                                            style={{ fontSize: '14px' }}
                                        >
                                            Từ chối
                                        </Button>
                                        <Button
                                            type="primary"
                                            icon={<CheckCircleOutlined />}
                                            onClick={handleApproveGrades}
                                            disabled={selectedCount === 0 || approving}
                                            loading={approving}
                                            style={{ background: '#722ed1', borderColor: '#722ed1', fontSize: '14px' }}
                                            size="middle"
                                        >
                                            Duyệt điểm ({selectedCount})
                                        </Button>
                                    </Space>
                                </div>

                                <Table
                                    rowKey="studentId"
                                    dataSource={pendingStudents}
                                    pagination={{ pageSize: 10, showTotal: (total) => <span style={{ fontSize: '14px' }}>Tổng {total} sinh viên</span> }}
                                    scroll={{ x: 1300 }}
                                    columns={pendingColumns}
                                    size="middle"
                                />
                            </>
                        )}
                    </TabPane>

                    {/* Tab ĐÃ DUYỆT */}
                    <TabPane
                        tab={
                            <span style={{ fontSize: '15px' }}>
                                <CheckCircleOutlined /> Đã duyệt
                                <Badge count={approvedStudents.length} style={{ marginLeft: 8, backgroundColor: '#52c41a' }} />
                            </span>
                        }
                        key="approved"
                    >
                        {loadingApproved ? (
                            <div style={{ textAlign: 'center', padding: 50 }}>
                                <Spin indicator={<LoadingOutlined spin />} size="large" />
                                <div style={{ marginTop: 16, fontSize: '15px' }}>Đang tải danh sách...</div>
                            </div>
                        ) : approvedStudents.length === 0 ? (
                            <Empty description="Chưa có sinh viên nào được duyệt điểm" />
                        ) : (
                            <>
                                <Card size="small" style={{ marginBottom: 20, background: '#f6ffed' }}>
                                    <Row gutter={[24, 16]}>
                                        <Col span={6}>
                                            <Statistic
                                                title={<span style={{ fontSize: '14px' }}>Tổng số SV</span>}
                                                value={approvedStats.total}
                                                prefix={<TeamOutlined style={{ fontSize: '20px' }} />}
                                                valueStyle={{ color: '#1677ff', fontSize: '28px', fontWeight: 600 }}
                                            />
                                        </Col>
                                        <Col span={6}>
                                            <Statistic
                                                title={<span style={{ fontSize: '14px' }}>Đạt</span>}
                                                value={approvedStats.passed}
                                                prefix={<CheckCircleOutlined style={{ fontSize: '20px' }} />}
                                                valueStyle={{ color: '#52c41a', fontSize: '28px', fontWeight: 600 }}
                                            />
                                        </Col>
                                        <Col span={6}>
                                            <Statistic
                                                title={<span style={{ fontSize: '14px' }}>Không đạt</span>}
                                                value={approvedStats.failed}
                                                prefix={<CloseCircleOutlined style={{ fontSize: '20px' }} />}
                                                valueStyle={{ color: '#ff4d4f', fontSize: '28px', fontWeight: 600 }}
                                            />
                                        </Col>
                                        <Col span={6}>
                                            <Statistic
                                                title={<span style={{ fontSize: '14px' }}>Điểm TB</span>}
                                                value={approvedStats.avgScore.toFixed(2)}
                                                prefix={<StarOutlined style={{ fontSize: '20px' }} />}
                                                valueStyle={{ color: '#faad14', fontSize: '28px', fontWeight: 600 }}
                                            />
                                        </Col>
                                    </Row>
                                </Card>

                                <Card size="small" style={{ marginBottom: 20 }}>
                                    <div style={{ marginBottom: 16 }}>
                                        <Text strong style={{ fontSize: '15px' }}>Phân bố điểm</Text>
                                    </div>
                                    <Row gutter={[16, 8]}>
                                        <Col span={4}>
                                            <div style={{ textAlign: 'center' }}>
                                                <Tag color="success" style={{ fontSize: '13px' }}>A (8.5-10)</Tag>
                                                <div><Text strong style={{ fontSize: '24px' }}>{approvedStats.gradeDistribution.A}</Text></div>
                                            </div>
                                        </Col>
                                        <Col span={5}>
                                            <div style={{ textAlign: 'center' }}>
                                                <Tag color="processing" style={{ fontSize: '13px' }}>B (7.0-8.4)</Tag>
                                                <div><Text strong style={{ fontSize: '24px' }}>{approvedStats.gradeDistribution.B}</Text></div>
                                            </div>
                                        </Col>
                                        <Col span={5}>
                                            <div style={{ textAlign: 'center' }}>
                                                <Tag color="warning" style={{ fontSize: '13px' }}>C (5.5-6.9)</Tag>
                                                <div><Text strong style={{ fontSize: '24px' }}>{approvedStats.gradeDistribution.C}</Text></div>
                                            </div>
                                        </Col>
                                        <Col span={5}>
                                            <div style={{ textAlign: 'center' }}>
                                                <Tag color="default" style={{ fontSize: '13px' }}>D (4.0-5.4)</Tag>
                                                <div><Text strong style={{ fontSize: '24px' }}>{approvedStats.gradeDistribution.D}</Text></div>
                                            </div>
                                        </Col>
                                        <Col span={5}>
                                            <div style={{ textAlign: 'center' }}>
                                                <Tag color="error" style={{ fontSize: '13px' }}>F (&lt;4.0)</Tag>
                                                <div><Text strong style={{ fontSize: '24px' }}>{approvedStats.gradeDistribution.F}</Text></div>
                                            </div>
                                        </Col>
                                    </Row>
                                    <Divider style={{ margin: '16px 0' }} />
                                    <Progress
                                        percent={Math.round((approvedStats.passed / approvedStats.total) * 100)}
                                        strokeColor="#52c41a"
                                        format={(percent) => <span style={{ fontSize: '14px' }}>Tỉ lệ đạt: {percent}%</span>}
                                    />
                                </Card>

                                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                                    <Button
                                        icon={<DownloadOutlined />}
                                        onClick={exportApprovedList}
                                        size="middle"
                                        style={{ fontSize: '14px' }}
                                    >
                                        Xuất Excel danh sách đã duyệt
                                    </Button>
                                </div>

                                <Table
                                    rowKey="studentId"
                                    dataSource={approvedStudents}
                                    pagination={{ pageSize: 10, showTotal: (total) => <span style={{ fontSize: '14px' }}>Tổng {total} sinh viên</span> }}
                                    scroll={{ x: 1200 }}
                                    columns={approvedColumns}
                                    size="middle"
                                />
                            </>
                        )}
                    </TabPane>
                </Tabs>

                <Divider />
                <div style={{ textAlign: 'right' }}>
                    <Button onClick={() => setApprovalModalVisible(false)} size="middle" style={{ fontSize: '14px' }}>
                        Đóng
                    </Button>
                </div>
            </Modal>
        );
    };

    return (
        <ConfigProvider
            theme={{
                token: {
                    fontSize: 14,
                },
            }}
        >
            <div style={{ padding: 24, background: '#f5f7fa', minHeight: '100vh' }}>
                {/* === HEADER === */}
                <div style={{
                    background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
                    borderRadius: 12,
                    padding: '28px 32px',
                    marginBottom: 24,
                    boxShadow: '0 4px 20px rgba(22,119,255,0.25)',
                }}>
                    <Row justify="space-between" align="middle">
                        <Col>
                            <Title level={2} style={{ color: '#fff', margin: 0, fontSize: '28px' }}>
                                <BookOutlined style={{ marginRight: 12, fontSize: '28px' }} />
                                Quản lý lớp học phần
                            </Title>
                            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginTop: 8, display: 'block' }}>
                                Thêm, sửa, xóa lớp học phần và quản lý duyệt điểm
                            </Text>
                        </Col>
                        <Col>
                            <Space size="middle">
                                <Search
                                    placeholder="Tìm mã lớp, môn, giảng viên..."
                                    allowClear
                                    style={{ width: 300 }}
                                    onSearch={setSearch}
                                    onChange={(e) => setSearch(e.target.value)}
                                    size="large"
                                />
                                <Button
                                    icon={<ReloadOutlined />}
                                    onClick={fetchAll}
                                    size="large"
                                    style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', fontSize: '14px' }}
                                >
                                    Làm mới
                                </Button>
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={openAdd}
                                    size="large"
                                    style={{ background: '#fff', color: '#1677ff', fontWeight: 600, border: 'none', fontSize: '14px' }}
                                >
                                    Tạo lớp mới
                                </Button>
                            </Space>
                        </Col>
                    </Row>
                </div>

                {/* === STATS === */}
                <Row gutter={16} style={{ marginBottom: 24 }}>
                    {[
                        { label: 'Tổng lớp', value: stats.total, icon: <BookOutlined />, bg: '#e6f4ff', border: '#91caff', vc: '#1677ff' },
                        { label: 'Đang mở đăng ký', value: stats.open, icon: <UnlockOutlined />, bg: '#f6ffed', border: '#b7eb8f', vc: '#52c41a' },
                        { label: 'Đã đóng', value: stats.closed, icon: <LockOutlined />, bg: '#f5f5f5', border: '#d9d9d9', vc: '#8c8c8c' },
                        { label: 'Đã hủy', value: stats.cancelled, icon: <CloseCircleOutlined />, bg: '#fff1f0', border: '#ffccc7', vc: '#ff4d4f' },
                        { label: 'Số lượt đăng ký', value: stats.studs, icon: <TeamOutlined />, bg: '#fff7e6', border: '#ffd591', vc: '#d46b08' },
                    ].map((s) => (
                        <Col span={Math.floor(24 / 5)} key={s.label}>
                            <Card
                                size="small"
                                style={{
                                    background: s.bg,
                                    borderColor: s.border,
                                    borderRadius: 10,
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                }}
                            >
                                <Statistic
                                    title={<span style={{ fontSize: '13px' }}>{s.label}</span>}
                                    value={s.value}
                                    styles={{ content: { color: s.vc, fontSize: '28px', fontWeight: 700 } }}
                                    prefix={React.cloneElement(s.icon, { style: { color: s.vc, fontSize: '22px' } })}
                                />
                            </Card>
                        </Col>
                    ))}
                </Row>

                {/* === CARD THÔNG BÁO ĐIỂM CHỜ DUYỆT === */}
                {classesWithPending > 0 && (
                    <Card
                        size="small"
                        style={{
                            marginBottom: 16,
                            background: '#fff0f6',
                            borderColor: '#ffadd2',
                            borderRadius: 10,
                            cursor: 'pointer',
                            animation: 'pulse-border 1.5s infinite'
                        }}
                        onClick={() => {
                            const firstPendingClass = classes.find(c => pendingCounts[c.classId]);
                            if (firstPendingClass) {
                                openApprovalModal(firstPendingClass);
                                message.info(`Đang mở lớp ${firstPendingClass.classCode} để duyệt điểm`);
                            }
                        }}
                        hoverable
                    >
                        <Row align="middle" justify="space-between">
                            <Col>
                                <Space size="middle">
                                    <BellOutlined style={{ fontSize: 24, color: '#eb2f96' }} />
                                    <div>
                                        <Text strong style={{ fontSize: '15px', color: '#eb2f96' }}>
                                            🔔 Thông báo điểm chờ duyệt
                                        </Text>
                                        <div>
                                            <Text style={{ fontSize: '13px', color: '#666' }}>
                                                Có <Text strong style={{ color: '#eb2f96', fontSize: '16px' }}>{classesWithPending}</Text> lớp có điểm chờ duyệt,
                                                tổng số <Text strong style={{ color: '#eb2f96', fontSize: '16px' }}>{totalPendingApprovals}</Text> sinh viên
                                            </Text>
                                        </div>
                                    </div>
                                </Space>
                            </Col>
                            <Col>
                                <Button type="link" style={{ color: '#eb2f96' }}>
                                    Xem ngay →
                                </Button>
                            </Col>
                        </Row>
                    </Card>
                )}

                {/* === TABLE === */}
                <Card
                    style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
                    styles={{ body: { padding: 0 } }}
                >
                    <Table
                        rowKey="classId"
                        columns={columns}
                        dataSource={filtered}
                        loading={loading}
                        scroll={{ x: 1500 }}
                        pagination={{
                            pageSize: 10,
                            showTotal: (total: number) => <span style={{ fontSize: '14px' }}>Tổng {total} lớp</span>,
                            showSizeChanger: true,
                            size: 'middle',
                        }}
                        rowClassName={(r: ClassItem) =>
                            r.status === 'OPEN' ? 'row-open' : r.status === 'CANCELLED' ? 'row-cancelled' : ''
                        }
                        style={{ borderRadius: 12, overflow: 'hidden' }}
                        size="middle"
                    />
                </Card>

                {/* === MODAL THÊM / SỬA === */}
                <Modal
                    open={modalOpen}
                    title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 8,
                                background: editing ? '#fff7e6' : '#e6f4ff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {editing
                                    ? <EditOutlined style={{ color: '#d46b08', fontSize: '18px' }} />
                                    : <PlusOutlined style={{ color: '#1677ff', fontSize: '18px' }} />}
                            </div>
                            <span style={{ fontWeight: 700, fontSize: '18px' }}>
                                {editing ? 'Sửa lớp học phần' : 'Tạo lớp học phần mới'}
                            </span>
                        </div>
                    }
                    onCancel={closeModal}
                    footer={null}
                    width={800}
                    styles={{ body: { padding: '24px 28px' } }}
                >
                    <Form form={form} layout="vertical" onFinish={onFinish}>
                        <Row gutter={20}>
                            <Col span={12}>
                                <Form.Item
                                    name="classCode"
                                    label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Mã lớp học phần</span>}
                                    rules={[{ required: true, message: 'Vui lòng nhập mã lớp' }]}
                                >
                                    <Input placeholder="VD: IT101_01" size="large" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="maxStudents"
                                    label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Sĩ số tối đa</span>}
                                    rules={[{ required: true, message: 'Vui lòng nhập sĩ số' }]}
                                >
                                    <InputNumber min={1} max={500} style={{ width: '100%' }} placeholder="VD: 50" size="large" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item
                            name="subjectId"
                            label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Môn học</span>}
                            rules={[{ required: true, message: 'Vui lòng chọn môn học' }]}
                        >
                            <Select
                                showSearch
                                optionFilterProp="children"
                                placeholder="Chọn môn học..."
                                size="large"
                            >
                                {subjects.map((s: SubjectItem) => (
                                    <Option key={s.subjectId} value={s.subjectId}>
                                        {s.subjectCode} – {s.subjectName} ({s.credits} TC)
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="teacherId"
                            label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Giảng viên phụ trách</span>}
                        >
                            <Select allowClear showSearch optionFilterProp="children" placeholder="Chọn giảng viên..." size="large">
                                {teachers.map((t: TeacherItem) => (
                                    <Option key={t.teacherId} value={t.teacherId}>
                                        {t.fullName}{t.position ? ` – ${t.position}` : ''}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Row gutter={20}>
                            <Col span={12}>
                                <Form.Item
                                    name="semesterId"
                                    label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Học kỳ</span>}
                                    rules={[{ required: true, message: 'Vui lòng chọn học kỳ' }]}
                                >
                                    <Select placeholder="Chọn học kỳ..." size="large">
                                        {semesters.map((s: SemesterItem) => (
                                            <Option key={s.semesterId} value={s.semesterId}>
                                                {s.semesterName}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="scheduleId"
                                    label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Lịch học</span>}
                                    rules={[{ required: true, message: 'Vui lòng chọn lịch học' }]}
                                >
                                    <Select placeholder="Chọn lịch học..." size="large">
                                        {schedules.map((s: ScheduleItem) => (
                                            <Option key={s.scheduleId} value={s.scheduleId}>
                                                {DAY_MAP[s.dayOfWeek]} – T{s.periodStart}→{s.periodEnd} – {s.room}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item name="status" label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Trạng thái lớp</span>} initialValue="OPEN">
                            <Select size="large">
                                <Option value="OPEN">
                                    <Tag color="success">OPEN</Tag> Đang mở – Sinh viên có thể đăng ký
                                </Option>
                                <Option value="CLOSED">
                                    <Tag color="default">CLOSED</Tag> Đã đóng – Không nhận đăng ký mới
                                </Option>
                                <Option value="CANCELLED">
                                    <Tag color="error">CANCELLED</Tag> Đã hủy lớp
                                </Option>
                            </Select>
                        </Form.Item>

                        <Divider style={{ margin: '16px 0' }} />

                        <Row justify="end">
                            <Space size="middle">
                                <Button onClick={closeModal} size="large">Hủy</Button>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    icon={editing ? <EditOutlined /> : <PlusOutlined />}
                                    size="large"
                                >
                                    {editing ? 'Lưu thay đổi' : 'Tạo lớp'}
                                </Button>
                            </Space>
                        </Row>
                    </Form>
                </Modal>

                {/* === MODAL DUYỆT ĐIỂM === */}
                {renderApprovalModal()}

                {/* === CSS === */}
                <style>{`
                    .row-open td { background: #f6ffed !important; }
                    .row-open:hover td { background: #d9f7be !important; }
                    .row-cancelled td { background: #fff1f0 !important; opacity: 0.7; }
                    .row-cancelled td:first-child { text-decoration: line-through; }
                    .ant-table-thead > tr > th {
                        background: #fafafa !important;
                        font-weight: 700 !important;
                        border-bottom: 2px solid #e8e8e8 !important;
                        font-size: 15px !important;
                    }
                    .ant-table-tbody > tr > td {
                        font-size: 14px !important;
                    }
                    .ant-tabs-tab {
                        padding: 12px 24px !important;
                        font-size: 15px !important;
                    }
                    .ant-statistic-title {
                        font-size: 13px !important;
                    }
                    .ant-statistic-content {
                        font-size: 28px !important;
                    }
                    .ant-modal-title {
                        font-size: 18px !important;
                    }
                    .ant-form-item-label > label {
                        font-size: 14px !important;
                        font-weight: 500 !important;
                    }
                    .ant-btn {
                        font-size: 14px !important;
                    }
                    .ant-tag {
                        font-size: 13px !important;
                    }
                    
                    @keyframes pulse-border {
                        0% {
                            box-shadow: 0 0 0 0 rgba(235, 47, 150, 0.4);
                        }
                        70% {
                            box-shadow: 0 0 0 10px rgba(235, 47, 150, 0);
                        }
                        100% {
                            box-shadow: 0 0 0 0 rgba(235, 47, 150, 0);
                        }
                    }
                `}</style>
            </div>
        </ConfigProvider>
    );
};

export default ClassesManagement;