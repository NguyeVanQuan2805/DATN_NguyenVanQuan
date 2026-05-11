// src/pages/shared/ProfilePage.tsx
import React, { useContext, useEffect, useState } from 'react';
import {
    Card,
    Form,
    Input,
    Select,
    DatePicker,
    Button,
    message,
    Spin,
    Avatar,
    Typography,
    Row,
    Col,
    Space,
    Tag,
    Divider,
    Descriptions,
    Alert,
    Modal,
    Tabs,
    Table,
    Badge,
    Statistic,
    Tooltip,
    Progress,
} from 'antd';
import {
    UserOutlined,
    MailOutlined,
    PhoneOutlined,
    SaveOutlined,
    ReloadOutlined,
    LockOutlined,
    EditOutlined,
    IdcardOutlined,
    BookOutlined,
    TeamOutlined,
    TrophyOutlined,
    WarningOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    SolutionOutlined,
    ClockCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const { Option } = Select;

// Interfaces
interface AccountInfo {
    accountId: string;
    username: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    gender: string | null;
    dateOfBirth: string | null;
    role: string;
    isActive: boolean;
    createdAt: string;
}

interface StudentInfo {
    studentId: string;
    studentCode: string;
    major: string;
    admissionYear: number;
    advisorClassName: string;
    advisorName: string;
    advisorId: string;
    currentGpa: number | null;
    semesterGpa: number | null;
    totalCreditsEarned: number;
    totalCreditsRegistered: number;
    warningsCount: number;
    warnings: Array<{ warningId: number; warningLevel: number; warningReason: string; issuedDate: string }>;
    graduationStatus: string;
    programProgress: number;
}

interface TeacherInfo {
    teacherId: string;
    accountId: string;
    position: string;
    departmentName: string;
    departmentId: string;
    totalClasses: number;
    totalStudents: number;
    currentSemesterClasses: number;
    pendingGradesCount: number;
}

interface AdvisorInfo {
    advisorId: string;
    accountId: string;
    departmentName: string;
    departmentId: string;
    managedClasses: Array<{ advisorClassId: number; className: string; classCode: string; studentCount: number }>;
    totalStudents: number;
    activeWarningsCount: number;
    pendingRegistrationsCount: number;
}

interface ClassSummary {
    classId: string;
    classCode: string;
    subjectName: string;
    credits: number;
    semesterName: string;
    currentStudents: number;
    maxStudents: number;
    status: string;
    schedule: string;
}

const ProfilePage: React.FC = () => {
    const { user, logout } = useContext(AuthContext)!;
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
    const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
    const [teacherInfo, setTeacherInfo] = useState<TeacherInfo | null>(null);
    const [advisorInfo, setAdvisorInfo] = useState<AdvisorInfo | null>(null);
    const [myClasses, setMyClasses] = useState<ClassSummary[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [roleDataError, setRoleDataError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('info');

    useEffect(() => {
        fetchProfileData();
    }, []);

    useEffect(() => {
        if (accountInfo) {
            fetchRoleSpecificData();
        }
    }, [accountInfo]);

    const fetchProfileData = async () => {
        setLoading(true);
        setError(null);

        try {
            console.log('User context hiện tại:', user);

            const profileRes = await api.get('/Accounts/my-profile');
            const profileData = profileRes.data;
            console.log('Dữ liệu từ /Accounts/my-profile:', profileData);

            const normalized = {
                accountId: profileData.accountId || profileData.AccountId,
                username: profileData.username || profileData.Username,
                fullName: profileData.fullName || profileData.FullName,
                email: profileData.email || profileData.Email,
                phone: profileData.phone || profileData.Phone,
                gender: profileData.gender || profileData.Gender,
                dateOfBirth: profileData.dateOfBirth || profileData.DateOfBirth,
                role: profileData.role || profileData.Role,
                isActive: profileData.isActive ?? profileData.IsActive ?? true,
                createdAt: profileData.createdAt || profileData.CreatedAt,
            };

            if (!normalized.accountId) {
                throw new Error('Không tìm thấy AccountId trong response /my-profile');
            }

            setAccountInfo(normalized);

            form.setFieldsValue({
                fullName: normalized.fullName,
                email: normalized.email,
                phone: normalized.phone,
                gender: normalized.gender,
                dateOfBirth: normalized.dateOfBirth ? dayjs(normalized.dateOfBirth) : null,
            });

        } catch (err: any) {
            console.error('Lỗi khi tải profile:', err);

            let errorMsg = 'Không thể tải thông tin cá nhân';

            if (err.response) {
                const { status, data } = err.response;

                if (status === 401 || status === 403) {
                    errorMsg = 'Phiên đăng nhập không hợp lệ hoặc không có quyền. Vui lòng đăng nhập lại.';
                    setTimeout(() => {
                        logout();
                        navigate('/login');
                    }, 2000);
                } else if (status === 404) {
                    errorMsg = 'Không tìm thấy thông tin tài khoản.';
                } else if (data?.message) {
                    errorMsg = data.message;
                }
            } else if (err.message) {
                errorMsg = err.message;
            }

            setError(errorMsg);
            message.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const fetchRoleSpecificData = async () => {
        const role = accountInfo?.role;
        setRoleDataError(null);

        try {
            if (role === 'STUDENT') {
                await fetchStudentData();
            } else if (role === 'TEACHER') {
                await fetchTeacherData();
            } else if (role === 'ADVISOR') {
                await fetchAdvisorData();
            }
        } catch (err: any) {
            console.error('Lỗi khi tải thông tin role-specific:', err);
        }
    };

    // === FETCH STUDENT DATA ===
    const fetchStudentData = async () => {
        const accountId = accountInfo?.accountId;
        if (!accountId) return;

        try {
            // Tìm student theo accountId
            let studentId = user?.studentId;

            if (!studentId) {
                const studentsRes = await api.get(`/Students?accountId=${accountId}`);
                const students = studentsRes.data || [];
                if (students.length > 0) {
                    studentId = students[0].studentId;
                }
            }

            if (!studentId) {
                setRoleDataError('Không tìm thấy thông tin sinh viên. Vui lòng liên hệ quản trị viên.');
                return;
            }

            // Lấy thông tin sinh viên chi tiết
            const studentRes = await api.get(`/Students/${studentId}`);
            const student = studentRes.data;

            // Lấy GPA
            let currentGpa = null;
            let semesterGpa = null;
            let totalCredits = 0;
            let totalRegistered = 0;

            try {
                const gpaRes = await api.get(`/Gpas/student/${studentId}`);
                const gpas = gpaRes.data || [];
                const latestGpa = gpas[gpas.length - 1];
                currentGpa = latestGpa?.cumulativeGpa || latestGpa?.CumulativeGpa || null;
                semesterGpa = latestGpa?.gpa1 || latestGpa?.Gpa1 || null;
                totalCredits = latestGpa?.totalCreditsEarned || latestGpa?.TotalCreditsEarned || 0;
                totalRegistered = latestGpa?.totalCreditsRegistered || latestGpa?.TotalCreditsRegistered || 0;
            } catch (e) {
                console.warn('Không thể lấy GPA:', e);
            }

            // Lấy danh sách cảnh báo
            let warnings: Array<any> = [];
            let warningsCount = 0;
            try {
                const warningsRes = await api.get(`/Warnings?studentId=${studentId}`);
                warnings = warningsRes.data || [];
                warningsCount = warnings.filter((w: any) => w.status === 'ACTIVE' || w.Status === 'ACTIVE').length;
            } catch (e) {
                console.warn('Không thể lấy warnings:', e);
            }

            // Tính phần trăm hoàn thành chương trình (giả sử tổng 120TC)
            const programProgress = Math.min(Math.round((totalCredits / 120) * 100), 100);

            // Xác định tình trạng tốt nghiệp
            let graduationStatus = 'Chưa đủ điều kiện';
            if (currentGpa && currentGpa >= 2.0 && totalCredits >= 120) {
                graduationStatus = 'Đủ điều kiện tốt nghiệp';
            } else if (currentGpa && currentGpa >= 2.0 && totalCredits >= 100) {
                graduationStatus = 'Gần đủ điều kiện';
            } else if (currentGpa && currentGpa < 2.0 && totalCredits > 0) {
                graduationStatus = 'Cảnh báo GPA';
            }

            setStudentInfo({
                studentId: student.studentId || student.StudentId,
                studentCode: student.studentCode || student.StudentCode,
                major: student.major || student.Major || 'Chưa cập nhật',
                admissionYear: student.admissionYear || student.AdmissionYear || new Date().getFullYear(),
                advisorClassName: student.advisorClass?.className || student.AdvisorClass?.ClassName || 'Chưa có lớp',
                advisorName: student.advisorClass?.advisor?.account?.fullName || student.AdvisorClass?.Advisor?.Account?.FullName || 'Chưa phân công',
                advisorId: student.advisorClass?.advisor?.advisorId || student.AdvisorClass?.Advisor?.AdvisorId || '',
                currentGpa: currentGpa,
                semesterGpa: semesterGpa,
                totalCreditsEarned: totalCredits,
                totalCreditsRegistered: totalRegistered,
                warningsCount: warningsCount,
                warnings: warnings,
                graduationStatus: graduationStatus,
                programProgress: programProgress,
            });

        } catch (err: any) {
            console.error('Lỗi khi tải thông tin sinh viên:', err);
            setRoleDataError('Không thể tải thông tin sinh viên. Vui lòng thử lại sau.');
        }
    };

    // === FETCH TEACHER DATA ===
    const fetchTeacherData = async () => {
        const accountId = accountInfo?.accountId;
        if (!accountId) return;

        try {
            // Tìm teacher theo accountId hoặc teacherId
            let teacherId = user?.teacherId;

            if (!teacherId) {
                // Thử tìm theo accountId
                const teachersRes = await api.get(`/Teachers?accountId=${accountId}`);
                const teachers = teachersRes.data || [];
                if (teachers.length > 0) {
                    teacherId = teachers[0].teacherId;
                }
            }

            if (!teacherId) {
                setRoleDataError('Không tìm thấy thông tin giảng viên. Vui lòng liên hệ quản trị viên.');
                return;
            }

            // Lấy thông tin giảng viên
            const teacherRes = await api.get(`/Teachers/${teacherId}`);
            const teacher = teacherRes.data;

            // Lấy danh sách lớp đang dạy
            let classes: any[] = [];
            try {
                const classesRes = await api.get('/Classes/my-classes');
                classes = classesRes.data || [];
            } catch (e) {
                console.warn('Không thể lấy danh sách lớp:', e);
            }

            // Đếm số lượng điểm chờ duyệt
            let pendingGradesCount = 0;
            for (const cls of classes) {
                try {
                    const pendingRes = await api.get(`/Grades/pending/${cls.classId}`);
                    pendingGradesCount += (pendingRes.data || []).length;
                } catch (e) {
                    console.warn(`Không thể lấy điểm chờ duyệt cho lớp ${cls.classId}:`, e);
                }
            }

            const currentSemesterClasses = classes.filter((c: any) => c.status === 'OPEN' || c.Status === 'OPEN').length;
            const totalStudents = classes.reduce((sum: number, c: any) => sum + (c.currentStudents || c.CurrentStudents || 0), 0);

            setTeacherInfo({
                teacherId: teacher.teacherId || teacher.TeacherId,
                accountId: teacher.accountId || teacher.AccountId,
                position: teacher.position || teacher.Position || 'Giảng viên',
                departmentName: teacher.department?.departmentName || teacher.Department?.DepartmentName || 'Chưa có khoa',
                departmentId: teacher.departmentId || teacher.DepartmentId,
                totalClasses: classes.length,
                totalStudents: totalStudents,
                currentSemesterClasses: currentSemesterClasses,
                pendingGradesCount: pendingGradesCount,
            });

            setMyClasses(classes.map((c: any) => ({
                classId: c.classId || c.ClassId,
                classCode: c.classCode || c.ClassCode,
                subjectName: c.subject?.subjectName || c.Subject?.SubjectName || 'N/A',
                credits: c.subject?.credits || c.Subject?.Credits || 0,
                semesterName: c.semester?.semesterName || c.Semester?.SemesterName || 'N/A',
                currentStudents: c.currentStudents || c.CurrentStudents || 0,
                maxStudents: c.maxStudents || c.MaxStudents || 0,
                status: c.status || c.Status || 'UNKNOWN',
                schedule: c.schedule ? `${c.schedule.dayOfWeek} - T${c.schedule.periodStart}-${c.schedule.periodEnd} - ${c.schedule.room}` : 'Chưa có lịch',
            })));

        } catch (err: any) {
            console.error('Lỗi khi tải thông tin giảng viên:', err);
            if (err.response?.status === 404) {
                setRoleDataError(`Chưa có thông tin giảng viên. Vui lòng liên hệ quản trị viên để cập nhật.`);
            } else {
                setRoleDataError('Không thể tải thông tin giảng viên. Vui lòng thử lại sau.');
            }
        }
    };

    // === FETCH ADVISOR DATA ===
    const fetchAdvisorData = async () => {
        const accountId = accountInfo?.accountId;
        if (!accountId) return;

        try {
            // Tìm advisor theo accountId hoặc advisorId
            let advisorId = user?.advisorId;

            if (!advisorId) {
                // Thử tìm theo accountId
                const advisorsRes = await api.get(`/Advisors?accountId=${accountId}`);
                const advisors = advisorsRes.data || [];
                if (advisors.length > 0) {
                    advisorId = advisors[0].advisorId;
                }
            }

            if (!advisorId) {
                setRoleDataError('Không tìm thấy thông tin cố vấn. Vui lòng liên hệ quản trị viên.');
                return;
            }

            // Lấy thông tin cố vấn
            const advisorRes = await api.get(`/Advisors/${advisorId}`);
            const advisor = advisorRes.data;

            // Lấy danh sách lớp quản lý
            let managedClasses: Array<any> = [];
            let totalStudents = 0;
            let pendingRegistrations = 0;

            try {
                const classesRes = await api.get(`/AdvisorClasses/by-advisor/${advisorId}`);
                managedClasses = classesRes.data || [];

                for (const cls of managedClasses) {
                    try {
                        const studentsRes = await api.get(`/Students/by-advisor-class/${cls.advisorClassId || cls.AdvisorClassId}`);
                        const students = studentsRes.data || [];
                        cls.studentCount = students.length;
                        totalStudents += students.length;

                        // Lấy số lượng đăng ký chờ duyệt của sinh viên trong lớp
                        for (const student of students) {
                            try {
                                const registrationsRes = await api.get(`/CourseRegistrations/student/${student.studentId}`);
                                const registrations = registrationsRes.data || [];
                                pendingRegistrations += registrations.filter((r: any) => r.status === 'PENDING').length;
                            } catch (e) {
                                console.warn('Không thể lấy đăng ký của sinh viên:', e);
                            }
                        }
                    } catch (e) {
                        console.warn('Không thể lấy danh sách sinh viên cho lớp:', cls);
                    }
                }
            } catch (e) {
                console.warn('Không thể lấy danh sách lớp quản lý:', e);
            }

            // Lấy cảnh báo đang hoạt động
            let activeWarnings = 0;
            try {
                const warningsRes = await api.get(`/Warnings/advisor-summary/${advisorId}`);
                activeWarnings = warningsRes.data?.totalActiveWarnings || warningsRes.data?.TotalActiveWarnings || 0;
            } catch (e) {
                console.warn('Không thể lấy warnings:', e);
            }

            setAdvisorInfo({
                advisorId: advisor.advisorId || advisor.AdvisorId,
                accountId: advisor.accountId || advisor.AccountId,
                departmentName: advisor.department?.departmentName || advisor.Department?.DepartmentName || 'Chưa có khoa',
                departmentId: advisor.departmentId || advisor.DepartmentId,
                managedClasses: managedClasses.map((cls: any) => ({
                    advisorClassId: cls.advisorClassId || cls.AdvisorClassId,
                    className: cls.className || cls.ClassName,
                    classCode: cls.classCode || cls.ClassCode,
                    studentCount: cls.studentCount || 0,
                })),
                totalStudents: totalStudents,
                activeWarningsCount: activeWarnings,
                pendingRegistrationsCount: pendingRegistrations,
            });

        } catch (err: any) {
            console.error('Lỗi khi tải thông tin cố vấn:', err);
            if (err.response?.status === 404) {
                setRoleDataError(`Chưa có thông tin cố vấn. Vui lòng liên hệ quản trị viên để cập nhật.`);
            } else {
                setRoleDataError('Không thể tải thông tin cố vấn. Vui lòng thử lại sau.');
            }
        }
    };

    const onFinish = async (values: any) => {
        if (!accountInfo) return;

        setSaving(true);
        try {
            const payload = {
                fullName: values.fullName,
                email: values.email || null,
                phone: values.phone || null,
                gender: values.gender || null,
                dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : null,
            };

            await api.put(`/Accounts/${accountInfo.accountId}`, payload);
            message.success('Cập nhật thông tin thành công!');

            if (values.fullName !== accountInfo.fullName) {
                setTimeout(() => window.location.reload(), 1500);
            } else {
                fetchProfileData();
            }
        } catch (err: any) {
            console.error('Lỗi cập nhật profile:', err);
            let errorMsg = 'Cập nhật thất bại. Vui lòng thử lại!';
            if (err.response?.data?.message) {
                errorMsg = err.response.data.message;
            }
            message.error(errorMsg);
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = () => {
        Modal.confirm({
            title: 'Đổi mật khẩu',
            content: 'Chức năng này đang được phát triển. Vui lòng liên hệ quản trị viên nếu cần hỗ trợ.',
            okText: 'Đóng',
            cancelButtonProps: { style: { display: 'none' } },
        });
    };

    const handleLogout = () => {
        Modal.confirm({
            title: 'Đăng xuất',
            content: 'Bạn có chắc muốn đăng xuất?',
            okText: 'Đăng xuất',
            cancelText: 'Hủy',
            onOk: () => {
                logout();
                navigate('/login');
            },
        });
    };

    // === RENDER STUDENT INFO ===
    const renderStudentInfo = () => {
        if (!studentInfo) return null;

        return (
            <>
                <Card
                    title={
                        <Space>
                            <SolutionOutlined style={{ color: '#1890ff' }} />
                            <span>Thông tin sinh viên</span>
                        </Space>
                    }
                    style={{ borderRadius: 12, marginTop: 16 }}
                >
                    <Row gutter={[16, 16]}>
                        <Col span={24}>
                            <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }}>
                                <Descriptions.Item label="Mã sinh viên">
                                    <Tag color="blue">{studentInfo.studentCode}</Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="Mã số (ID)">
                                    <Text code>{studentInfo.studentId}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Ngành học">
                                    <Text strong>{studentInfo.major}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Khóa nhập học">
                                    {studentInfo.admissionYear}
                                </Descriptions.Item>
                                <Descriptions.Item label="Lớp cố vấn">
                                    {studentInfo.advisorClassName}
                                </Descriptions.Item>
                                <Descriptions.Item label="Cố vấn học tập">
                                    {studentInfo.advisorName}
                                </Descriptions.Item>
                                <Descriptions.Item label="GPA học kỳ">
                                    <Tag color={studentInfo.semesterGpa && studentInfo.semesterGpa >= 2.0 ? 'processing' : 'warning'}>
                                        {studentInfo.semesterGpa?.toFixed(2) || 'Chưa có'}
                                    </Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="GPA tích lũy">
                                    <Tag color={studentInfo.currentGpa && studentInfo.currentGpa >= 2.0 ? 'success' : 'warning'}>
                                        {studentInfo.currentGpa?.toFixed(2) || 'Chưa có'}
                                    </Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="Tín chỉ đã tích lũy">
                                    {studentInfo.totalCreditsEarned} / 120 TC
                                </Descriptions.Item>
                                <Descriptions.Item label="Cảnh báo học vụ">
                                    <Badge
                                        count={studentInfo.warningsCount}
                                        style={{ backgroundColor: studentInfo.warningsCount > 0 ? '#ff4d4f' : '#52c41a' }}
                                    />
                                </Descriptions.Item>
                                <Descriptions.Item label="Tình trạng tốt nghiệp" span={2}>
                                    <Tag color={studentInfo.graduationStatus === 'Đủ điều kiện tốt nghiệp' ? 'success' : 'default'}>
                                        {studentInfo.graduationStatus}
                                    </Tag>
                                </Descriptions.Item>
                            </Descriptions>
                        </Col>
                    </Row>
                </Card>

                {/* Tiến độ học tập */}
                <Card
                    title="Tiến độ học tập"
                    style={{ borderRadius: 12, marginTop: 16 }}
                >
                    <Progress
                        percent={studentInfo.programProgress}
                        status={studentInfo.programProgress >= 100 ? 'success' : 'active'}
                        strokeColor={studentInfo.programProgress >= 80 ? '#52c41a' : '#1890ff'}
                        format={(percent) => `${percent}% (${studentInfo.totalCreditsEarned}/120 TC)`}
                    />
                </Card>

                {/* Danh sách cảnh báo */}
                {studentInfo.warnings.length > 0 && (
                    <Card
                        title={
                            <Space>
                                <WarningOutlined style={{ color: '#faad14' }} />
                                <span>Danh sách cảnh báo học vụ</span>
                            </Space>
                        }
                        style={{ borderRadius: 12, marginTop: 16 }}
                    >
                        <Table
                            dataSource={studentInfo.warnings}
                            rowKey="warningId"
                            pagination={false}
                            size="small"
                            columns={[
                                {
                                    title: 'Mức độ', dataIndex: 'warningLevel', width: 100, render: (level) => (
                                        <Tag color={level >= 3 ? 'error' : level >= 2 ? 'warning' : 'default'}>
                                            Cấp {level}
                                        </Tag>
                                    )
                                },
                                { title: 'Lý do', dataIndex: 'warningReason', width: 300 },
                                { title: 'Ngày cảnh báo', dataIndex: 'issuedDate', width: 120, render: (date) => dayjs(date).format('DD/MM/YYYY') },
                                {
                                    title: 'Trạng thái', dataIndex: 'status', width: 100, render: (status) => (
                                        <Tag color={status === 'ACTIVE' ? 'error' : 'success'}>
                                            {status === 'ACTIVE' ? 'Đang hiệu lực' : 'Đã xử lý'}
                                        </Tag>
                                    )
                                },
                            ]}
                        />
                    </Card>
                )}
            </>
        );
    };

    // === RENDER TEACHER INFO ===
    const renderTeacherInfo = () => {
        if (!teacherInfo) return null;

        return (
            <>
                <Card
                    title={
                        <Space>
                            <TeamOutlined style={{ color: '#52c41a' }} />
                            <span>Thông tin giảng viên</span>
                        </Space>
                    }
                    style={{ borderRadius: 12, marginTop: 16 }}
                >
                    <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }}>
                        <Descriptions.Item label="Mã giảng viên">
                            <Tag color="green">{teacherInfo.teacherId}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Chức vụ">
                            {teacherInfo.position}
                        </Descriptions.Item>
                        <Descriptions.Item label="Khoa/Viện">
                            {teacherInfo.departmentName}
                        </Descriptions.Item>
                        <Descriptions.Item label="Tổng số lớp đã dạy">
                            {teacherInfo.totalClasses}
                        </Descriptions.Item>
                        <Descriptions.Item label="Tổng số sinh viên">
                            {teacherInfo.totalStudents}
                        </Descriptions.Item>
                        <Descriptions.Item label="Lớp đang dạy trong học kỳ này">
                            <Badge count={teacherInfo.currentSemesterClasses} style={{ backgroundColor: '#52c41a' }} />
                        </Descriptions.Item>
                        <Descriptions.Item label="Điểm chờ duyệt">
                            <Badge count={teacherInfo.pendingGradesCount} style={{ backgroundColor: teacherInfo.pendingGradesCount > 0 ? '#faad14' : '#52c41a' }} />
                        </Descriptions.Item>
                    </Descriptions>
                </Card>

                {myClasses.length > 0 && (
                    <Card
                        title={
                            <Space>
                                <BookOutlined style={{ color: '#1890ff' }} />
                                <span>Danh sách lớp đang dạy ({myClasses.length} lớp)</span>
                            </Space>
                        }
                        style={{ borderRadius: 12, marginTop: 16 }}
                    >
                        <Table
                            dataSource={myClasses}
                            rowKey="classId"
                            pagination={{ pageSize: 5 }}
                            size="small"
                            columns={[
                                { title: 'Mã lớp', dataIndex: 'classCode', width: 120, render: (code) => <Text code>{code}</Text> },
                                { title: 'Môn học', dataIndex: 'subjectName', width: 200 },
                                { title: 'TC', dataIndex: 'credits', width: 60, align: 'center' },
                                { title: 'Học kỳ', dataIndex: 'semesterName', width: 150 },
                                { title: 'Lịch học', dataIndex: 'schedule', width: 200, ellipsis: true },
                                {
                                    title: 'Sĩ số',
                                    dataIndex: 'currentStudents',
                                    width: 120,
                                    render: (val, record) => (
                                        <Tooltip title={`${val}/${record.maxStudents}`}>
                                            <Progress
                                                percent={Math.round((val / record.maxStudents) * 100)}
                                                size="small"
                                                showInfo={false}
                                                strokeColor={val >= record.maxStudents ? '#ff4d4f' : '#52c41a'}
                                            />
                                            <span style={{ fontSize: 12 }}>{val}/{record.maxStudents}</span>
                                        </Tooltip>
                                    )
                                },
                                {
                                    title: 'Trạng thái',
                                    dataIndex: 'status',
                                    width: 100,
                                    render: (status) => (
                                        <Tag color={status === 'OPEN' ? 'success' : 'default'}>
                                            {status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
                                        </Tag>
                                    )
                                }
                            ]}
                        />
                    </Card>
                )}
            </>
        );
    };

    // === RENDER ADVISOR INFO ===
    const renderAdvisorInfo = () => {
        if (!advisorInfo) return null;

        return (
            <>
                <Card
                    title={
                        <Space>
                            <WarningOutlined style={{ color: '#faad14' }} />
                            <span>Thông tin cố vấn học tập</span>
                        </Space>
                    }
                    style={{ borderRadius: 12, marginTop: 16 }}
                >
                    <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }}>
                        <Descriptions.Item label="Mã cố vấn">
                            <Tag color="orange">{advisorInfo.advisorId}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Khoa/Viện">
                            {advisorInfo.departmentName}
                        </Descriptions.Item>
                        <Descriptions.Item label="Lớp đang quản lý">
                            {advisorInfo.managedClasses.length}
                        </Descriptions.Item>
                        <Descriptions.Item label="Tổng số sinh viên">
                            <TeamOutlined /> {advisorInfo.totalStudents}
                        </Descriptions.Item>
                        <Descriptions.Item label="Cảnh báo đang hoạt động">
                            <Badge
                                count={advisorInfo.activeWarningsCount}
                                style={{ backgroundColor: advisorInfo.activeWarningsCount > 0 ? '#faad14' : '#52c41a' }}
                            />
                        </Descriptions.Item>
                        <Descriptions.Item label="Đăng ký chờ duyệt">
                            <Badge
                                count={advisorInfo.pendingRegistrationsCount}
                                style={{ backgroundColor: advisorInfo.pendingRegistrationsCount > 0 ? '#faad14' : '#52c41a' }}
                            />
                        </Descriptions.Item>
                    </Descriptions>
                </Card>

                {advisorInfo.managedClasses.length > 0 && (
                    <Card
                        title={
                            <Space>
                                <SolutionOutlined style={{ color: '#1890ff' }} />
                                <span>Danh sách lớp cố vấn quản lý</span>
                            </Space>
                        }
                        style={{ borderRadius: 12, marginTop: 16 }}
                    >
                        <Table
                            dataSource={advisorInfo.managedClasses}
                            rowKey="advisorClassId"
                            pagination={{ pageSize: 5 }}
                            size="small"
                            columns={[
                                { title: 'Mã lớp', dataIndex: 'classCode', width: 120 },
                                { title: 'Tên lớp', dataIndex: 'className', width: 200 },
                                {
                                    title: 'Số sinh viên',
                                    dataIndex: 'studentCount',
                                    width: 120,
                                    align: 'center',
                                    render: (count) => <Badge count={count} style={{ backgroundColor: '#1890ff' }} />
                                },
                            ]}
                        />
                    </Card>
                )}
            </>
        );
    };

    // === RENDER QUICK STATS ===
    const renderQuickStats = () => {
        const role = accountInfo?.role;

        if (role === 'STUDENT' && studentInfo) {
            return (
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12} md={6}>
                        <Card size="small" style={{ textAlign: 'center' }}>
                            <Statistic
                                title="GPA tích lũy"
                                value={studentInfo.currentGpa?.toFixed(2) || 'Chưa có'}
                                prefix={<TrophyOutlined />}
                                valueStyle={{ color: studentInfo.currentGpa && studentInfo.currentGpa >= 2.0 ? '#3f8600' : '#cf1322' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card size="small" style={{ textAlign: 'center' }}>
                            <Statistic
                                title="Tín chỉ tích lũy"
                                value={studentInfo.totalCreditsEarned}
                                suffix="/ 120 TC"
                                prefix={<BookOutlined />}
                                valueStyle={{ color: '#1890ff' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card size="small" style={{ textAlign: 'center' }}>
                            <Statistic
                                title="Cảnh báo"
                                value={studentInfo.warningsCount}
                                prefix={<WarningOutlined />}
                                valueStyle={{ color: studentInfo.warningsCount > 0 ? '#cf1322' : '#3f8600' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card size="small" style={{ textAlign: 'center' }}>
                            <Statistic
                                title="Tiến độ"
                                value={studentInfo.programProgress}
                                suffix="%"
                                prefix={<CheckCircleOutlined />}
                                valueStyle={{ color: studentInfo.programProgress >= 80 ? '#52c41a' : '#faad14' }}
                            />
                        </Card>
                    </Col>
                </Row>
            );
        }

        if (role === 'TEACHER' && teacherInfo) {
            return (
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12} md={6}>
                        <Card size="small" style={{ textAlign: 'center' }}>
                            <Statistic
                                title="Lớp đang dạy"
                                value={teacherInfo.currentSemesterClasses}
                                prefix={<BookOutlined />}
                                valueStyle={{ color: '#1890ff' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card size="small" style={{ textAlign: 'center' }}>
                            <Statistic
                                title="Tổng sinh viên"
                                value={teacherInfo.totalStudents}
                                prefix={<TeamOutlined />}
                                valueStyle={{ color: '#52c41a' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card size="small" style={{ textAlign: 'center' }}>
                            <Statistic
                                title="Tổng lớp đã dạy"
                                value={teacherInfo.totalClasses}
                                prefix={<CalendarOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card size="small" style={{ textAlign: 'center' }}>
                            <Statistic
                                title="Điểm chờ duyệt"
                                value={teacherInfo.pendingGradesCount}
                                prefix={<ClockCircleOutlined />}
                                valueStyle={{ color: teacherInfo.pendingGradesCount > 0 ? '#faad14' : '#52c41a' }}
                            />
                        </Card>
                    </Col>
                </Row>
            );
        }

        if (role === 'ADVISOR' && advisorInfo) {
            return (
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12} md={6}>
                        <Card size="small" style={{ textAlign: 'center' }}>
                            <Statistic
                                title="Lớp quản lý"
                                value={advisorInfo.managedClasses.length}
                                prefix={<TeamOutlined />}
                                valueStyle={{ color: '#1890ff' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card size="small" style={{ textAlign: 'center' }}>
                            <Statistic
                                title="Sinh viên"
                                value={advisorInfo.totalStudents}
                                prefix={<UserOutlined />}
                                valueStyle={{ color: '#52c41a' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card size="small" style={{ textAlign: 'center' }}>
                            <Statistic
                                title="Cảnh báo"
                                value={advisorInfo.activeWarningsCount}
                                prefix={<WarningOutlined />}
                                valueStyle={{ color: advisorInfo.activeWarningsCount > 0 ? '#cf1322' : '#3f8600' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card size="small" style={{ textAlign: 'center' }}>
                            <Statistic
                                title="Đăng ký chờ duyệt"
                                value={advisorInfo.pendingRegistrationsCount}
                                prefix={<ClockCircleOutlined />}
                                valueStyle={{ color: advisorInfo.pendingRegistrationsCount > 0 ? '#faad14' : '#52c41a' }}
                            />
                        </Card>
                    </Col>
                </Row>
            );
        }

        return null;
    };

    // === RENDER ROLE DETAILS ===
    const renderRoleDetails = () => {
        const role = accountInfo?.role;

        if (role === 'STUDENT') {
            return renderStudentInfo();
        }
        if (role === 'TEACHER') {
            return renderTeacherInfo();
        }
        if (role === 'ADVISOR') {
            return renderAdvisorInfo();
        }

        return null;
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
                <Spin size="large" tip="Đang tải thông tin cá nhân..." />
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
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 16,
                }}
            >
                <div>
                    <Space align="center" size="middle">
                        <Avatar
                            size={64}
                            icon={<UserOutlined />}
                            style={{ backgroundColor: '#fff', color: '#722ed1' }}
                        />
                        <div>
                            <Title level={3} style={{ color: '#fff', margin: 0 }}>
                                Thông tin cá nhân
                            </Title>
                            <Space wrap style={{ marginTop: 8 }}>
                                <Tag color="purple">
                                    {accountInfo?.role === 'ADMIN' && 'Quản trị viên'}
                                    {accountInfo?.role === 'STUDENT' && 'Sinh viên'}
                                    {accountInfo?.role === 'TEACHER' && 'Giảng viên'}
                                    {accountInfo?.role === 'ADVISOR' && 'Cố vấn học tập'}
                                </Tag>
                                <Tag color="geekblue">{accountInfo?.username || user?.username || 'N/A'}</Tag>
                            </Space>
                        </div>
                    </Space>
                </div>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={fetchProfileData} loading={loading}>
                        Tải lại
                    </Button>
                    <Button icon={<LockOutlined />} onClick={handleChangePassword}>
                        Đổi mật khẩu
                    </Button>
                    <Button danger onClick={handleLogout}>
                        Đăng xuất
                    </Button>
                </Space>
            </div>

            {/* Error */}
            {error && (
                <Alert
                    type="error"
                    showIcon
                    message="Lỗi"
                    description={error}
                    style={{ marginBottom: 16, borderRadius: 8 }}
                    closable
                    onClose={() => setError(null)}
                    action={
                        <Button size="small" type="primary" onClick={fetchProfileData}>
                            Thử lại
                        </Button>
                    }
                />
            )}

            {/* Role Data Error Warning */}
            {roleDataError && (
                <Alert
                    type="warning"
                    showIcon
                    message="Cảnh báo"
                    description={roleDataError}
                    style={{ marginBottom: 16, borderRadius: 8 }}
                    closable
                    onClose={() => setRoleDataError(null)}
                />
            )}

            {/* Thống kê nhanh theo Role */}
            {renderQuickStats()}

            {/* Main Content - Tabs */}
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                    {
                        key: 'info',
                        label: <span><EditOutlined /> Cập nhật thông tin</span>,
                        children: (
                            <Row gutter={[24, 24]}>
                                <Col xs={24} md={16}>
                                    <Card
                                        title={
                                            <Space>
                                                <EditOutlined style={{ color: '#722ed1' }} />
                                                <span>Cập nhật thông tin</span>
                                            </Space>
                                        }
                                        style={{ borderRadius: 12 }}
                                    >
                                        <Form form={form} layout="vertical" onFinish={onFinish}>
                                            <Row gutter={16}>
                                                <Col xs={24} md={12}>
                                                    <Form.Item
                                                        name="fullName"
                                                        label="Họ và tên"
                                                        rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}
                                                    >
                                                        <Input prefix={<UserOutlined />} placeholder="Nhập họ và tên" />
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24} md={12}>
                                                    <Form.Item name="email" label="Email">
                                                        <Input prefix={<MailOutlined />} placeholder="Nhập email" />
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24} md={12}>
                                                    <Form.Item name="phone" label="Số điện thoại">
                                                        <Input prefix={<PhoneOutlined />} placeholder="Nhập số điện thoại" />
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24} md={12}>
                                                    <Form.Item name="gender" label="Giới tính">
                                                        <Select placeholder="Chọn giới tính" allowClear>
                                                            <Option value="M">Nam</Option>
                                                            <Option value="F">Nữ</Option>
                                                            <Option value="O">Khác</Option>
                                                        </Select>
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24} md={12}>
                                                    <Form.Item name="dateOfBirth" label="Ngày sinh">
                                                        <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Chọn ngày sinh" />
                                                    </Form.Item>
                                                </Col>
                                            </Row>
                                            <Form.Item>
                                                <Button
                                                    type="primary"
                                                    htmlType="submit"
                                                    loading={saving}
                                                    icon={<SaveOutlined />}
                                                    size="large"
                                                    style={{ background: '#722ed1', borderColor: '#722ed1' }}
                                                >
                                                    {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                                                </Button>
                                            </Form.Item>
                                        </Form>
                                    </Card>
                                </Col>

                                <Col xs={24} md={8}>
                                    <Card
                                        title={
                                            <Space>
                                                <UserOutlined style={{ color: '#722ed1' }} />
                                                <span>Thông tin tài khoản</span>
                                            </Space>
                                        }
                                        style={{ borderRadius: 12 }}
                                    >
                                        {accountInfo ? (
                                            <Descriptions bordered column={1} size="small">
                                                <Descriptions.Item label="Tên đăng nhập">
                                                    <Text code>{accountInfo.username}</Text>
                                                </Descriptions.Item>
                                                <Descriptions.Item label="Vai trò">
                                                    <Tag color={accountInfo.role === 'ADMIN' ? 'red' : 'blue'}>
                                                        {accountInfo.role === 'ADMIN' && 'Quản trị viên'}
                                                        {accountInfo.role === 'STUDENT' && 'Sinh viên'}
                                                        {accountInfo.role === 'TEACHER' && 'Giảng viên'}
                                                        {accountInfo.role === 'ADVISOR' && 'Cố vấn học tập'}
                                                    </Tag>
                                                </Descriptions.Item>
                                                <Descriptions.Item label="Trạng thái">
                                                    <Tag color={accountInfo.isActive ? 'success' : 'error'}>
                                                        {accountInfo.isActive ? 'Hoạt động' : 'Đã khóa'}
                                                    </Tag>
                                                </Descriptions.Item>
                                                <Descriptions.Item label="Ngày tạo">
                                                    {accountInfo.createdAt ? dayjs(accountInfo.createdAt).format('DD/MM/YYYY HH:mm') : 'N/A'}
                                                </Descriptions.Item>
                                            </Descriptions>
                                        ) : (
                                            <Text type="secondary">Không có dữ liệu tài khoản</Text>
                                        )}
                                    </Card>
                                </Col>
                            </Row>
                        ),
                    },
                    {
                        key: 'role-detail',
                        label: <span><IdcardOutlined /> Thông tin chi tiết</span>,
                        children: renderRoleDetails(),
                        disabled: accountInfo?.role === 'ADMIN',
                    },
                ]}
            />
        </div>
    );
};

export default ProfilePage;