// src/pages/student/Registration.tsx
import React, { useState, useEffect, useContext } from 'react';
import {
    Table,
    Button,
    Tag,
    message,
    Card,
    Input,
    Select,
    Space,
    Modal,
    Descriptions,
    Tooltip,
    Badge,
    Row,
    Col,
    Statistic,
    Typography,
    Alert,
    Spin,
    Tabs,
    Empty,
    Progress,
} from 'antd';
import {
    SearchOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    InfoCircleOutlined,
    DeleteOutlined,
    BookOutlined,
    CalendarOutlined,
    TeamOutlined,
    ReloadOutlined,
    WarningOutlined,
    ClockCircleOutlined,
    ExclamationCircleOutlined,
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
interface AvailableClass {
    classId: string;
    classCode: string;
    subjectId: string;
    subjectCode: string;
    subjectName: string;
    credits: number;
    teacherId: string;
    teacherName: string;
    semesterId: string;
    semesterName: string;
    currentStudents: number;
    maxStudents: number;
    dayOfWeek: number;
    periodStart: number;
    periodEnd: number;
    room: string;
    status: string;
}

interface RegisteredCourse {
    registrationId: number;
    classId: string;
    classCode: string;
    subjectName: string;
    credits: number;
    teacherName: string;
    semesterName: string;
    dayOfWeek: number;
    periodStart: number;
    periodEnd: number;
    room: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DROPPED';
    registeredAt: string;
}

interface EligibilityResult {
    classAvailable: boolean;
    prerequisitePassed: boolean;
    noScheduleConflict: boolean;
    withinCreditLimit: boolean;
    message: string;
    isEligible: boolean;
}

interface Semester {
    semesterId: string;
    semesterName: string;
    academicYear: number;
    semesterNumber: number;
    isRegistrationOpen: boolean;
}

interface SystemConfig {
    configKey: string;
    configValue: string;
}

// ============================================================
// Constants
// ============================================================
const MIN_CREDITS = 15;  // Tín chỉ tối thiểu
const MAX_CREDITS = 33;  // Tín chỉ tối đa

const DAY_MAP: Record<number, string> = {
    2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4',
    5: 'Thứ 5', 6: 'Thứ 6', 7: 'Thứ 7', 8: 'CN',
};

const STATUS_CONFIG = {
    PENDING: { color: 'warning', label: 'Chờ duyệt', icon: <ClockCircleOutlined /> },
    APPROVED: { color: 'success', label: 'Đã đăng ký', icon: <CheckCircleOutlined /> },
    REJECTED: { color: 'error', label: 'Từ chối', icon: <CloseCircleOutlined /> },
    DROPPED: { color: 'default', label: 'Đã hủy', icon: <DeleteOutlined /> },
};

// ============================================================
// Component
// ============================================================
const Registration: React.FC = () => {
    const { user } = useContext(AuthContext)!;
    const studentId = user?.studentId;

    // State
    const [availableClasses, setAvailableClasses] = useState<AvailableClass[]>([]);
    const [registeredCourses, setRegisteredCourses] = useState<RegisteredCourse[]>([]);
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [currentSemester, setCurrentSemester] = useState<string>('');
    const [minCredits, setMinCredits] = useState<number>(MIN_CREDITS);
    const [maxCredits, setMaxCredits] = useState<number>(MAX_CREDITS);

    const [loadingAvailable, setLoadingAvailable] = useState(false);
    const [loadingRegistered, setLoadingRegistered] = useState(false);
    const [loadingSemesters, setLoadingSemesters] = useState(true);
    const [registering, setRegistering] = useState<string | null>(null);
    const [dropping, setDropping] = useState<number | null>(null);

    const [searchText, setSearchText] = useState('');
    const [selectedSemester, setSelectedSemester] = useState<string>('');
    const [eligibilityModal, setEligibilityModal] = useState<{
        visible: boolean;
        result: EligibilityResult | null;
        classId: string;
        className: string;
    }>({
        visible: false,
        result: null,
        classId: '',
        className: '',
    });

    // ============================================================
    // Load initial data
    // ============================================================
    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        setLoadingSemesters(true);
        try {
            const configRes = await api.get('/SystemConfigs');
            const configs: SystemConfig[] = configRes.data || [];

            const currentSemesterConfig = configs.find(c => c.configKey === 'CurrentSemester');
            const maxCreditsConfig = configs.find(c => c.configKey === 'MaxCreditsPerSemester');
            const minCreditsConfig = configs.find(c => c.configKey === 'MinCreditsPerSemester');

            if (currentSemesterConfig) {
                setCurrentSemester(currentSemesterConfig.configValue);
                setSelectedSemester(currentSemesterConfig.configValue);
            }

            if (maxCreditsConfig) {
                setMaxCredits(parseInt(maxCreditsConfig.configValue) || MAX_CREDITS);
            }
            if (minCreditsConfig) {
                setMinCredits(parseInt(minCreditsConfig.configValue) || MIN_CREDITS);
            }

            const semestersRes = await api.get('/Semesters');
            setSemesters(semestersRes.data || []);

            if (studentId) {
                await Promise.all([
                    fetchAvailableClasses(),
                    fetchRegisteredCourses()
                ]);
            }

        } catch (err: any) {
            console.error('Lỗi tải dữ liệu:', err);
            const errorMessage = extractErrorMessage(err);
            message.error(errorMessage);
        } finally {
            setLoadingSemesters(false);
        }
    };

    // ============================================================
    // Fetch data functions
    // ============================================================
    const fetchAvailableClasses = async () => {
        if (!studentId || !selectedSemester) return;

        setLoadingAvailable(true);
        try {
            const params: any = {
                semesterId: selectedSemester
            };

            if (searchText.trim()) {
                params.search = searchText;
            }

            const res = await api.get(`/Classes/available-for-student/${studentId}`, { params });
            setAvailableClasses(res.data || []);
        } catch (err: any) {
            console.error('Lỗi tải lớp khả dụng:', err);
            const errorMessage = extractErrorMessage(err);
            message.error(errorMessage);
            setAvailableClasses([]);
        } finally {
            setLoadingAvailable(false);
        }
    };

    const fetchRegisteredCourses = async () => {
        if (!studentId || !selectedSemester) return;

        setLoadingRegistered(true);
        try {
            const regRes = await api.get(`/CourseRegistrations/student/${studentId}`);
            const allRegs = regRes.data || [];

            const filteredRegs = allRegs.filter((reg: any) => {
                const semesterId = reg.class?.semesterId || reg.semesterId;
                return semesterId === selectedSemester;
            });

            const registered: RegisteredCourse[] = filteredRegs.map((reg: any) => {
                const classData = reg.class || {};
                const subjectData = classData.subject || {};
                const teacherData = classData.teacher || {};
                const scheduleData = classData.schedule || {};

                let teacherName = 'N/A';
                if (teacherData.fullName) teacherName = teacherData.fullName;
                else if (teacherData.name) teacherName = teacherData.name;
                else if (classData.teacherName) teacherName = classData.teacherName;
                else if (reg.teacherName) teacherName = reg.teacherName;

                return {
                    registrationId: reg.registrationId || 0,
                    classId: reg.classId || classData.classId || '',
                    classCode: classData.classCode || reg.classCode || 'N/A',
                    subjectName: subjectData.subjectName || classData.subjectName || reg.subjectName || 'N/A',
                    credits: subjectData.credits || classData.credits || reg.credits || 0,
                    teacherName: teacherName,
                    semesterName: classData.semester?.semesterName || reg.semesterName || selectedSemester,
                    dayOfWeek: scheduleData.dayOfWeek || reg.dayOfWeek || 0,
                    periodStart: scheduleData.periodStart || reg.periodStart || 0,
                    periodEnd: scheduleData.periodEnd || reg.periodEnd || 0,
                    room: scheduleData.room || reg.room || 'N/A',
                    status: reg.status || 'APPROVED',
                    registeredAt: reg.registeredAt || new Date().toISOString(),
                };
            });

            setRegisteredCourses(registered);

        } catch (err: any) {
            console.error('Lỗi tải môn đã đăng ký:', err);
            message.warning('Không thể tải danh sách môn đã đăng ký');
            setRegisteredCourses([]);
        } finally {
            setLoadingRegistered(false);
        }
    };

    // ============================================================
    // Effects
    // ============================================================
    useEffect(() => {
        if (studentId && selectedSemester) {
            fetchAvailableClasses();
            fetchRegisteredCourses();
        }
    }, [studentId, selectedSemester]);

    // ============================================================
    // Helper functions
    // ============================================================

    // Kiểm tra trùng lịch học
    const checkScheduleConflict = (newClass: AvailableClass): { hasConflict: boolean; message: string; conflictingClass?: string } => {
        const approvedCourses = registeredCourses.filter(c => c.status === 'APPROVED');

        for (const existingCourse of approvedCourses) {
            // Kiểm tra cùng ngày trong tuần
            if (existingCourse.dayOfWeek === newClass.dayOfWeek) {
                const existingStart = existingCourse.periodStart;
                const existingEnd = existingCourse.periodEnd;
                const newStart = newClass.periodStart;
                const newEnd = newClass.periodEnd;

                // Kiểm tra khoảng thời gian trùng nhau
                const isOverlap = !(newEnd < existingStart || newStart > existingEnd);

                if (isOverlap) {
                    return {
                        hasConflict: true,
                        message: `Lịch học trùng với môn "${existingCourse.subjectName}" (${existingCourse.classCode}) vào ${DAY_MAP[existingCourse.dayOfWeek]} tiết ${existingStart}-${existingEnd}`,
                        conflictingClass: existingCourse.subjectName
                    };
                }
            }
        }

        return { hasConflict: false, message: '' };
    };

    // Kiểm tra giới hạn tín chỉ
    const checkCreditLimit = (additionalCredits: number): { isValid: boolean; message: string } => {
        const currentCredits = registeredCourses
            .filter(c => c.status === 'APPROVED')
            .reduce((sum, c) => sum + (c.credits || 0), 0);

        const newTotal = currentCredits + additionalCredits;

        if (newTotal > maxCredits) {
            return {
                isValid: false,
                message: `Vượt quá số tín chỉ tối đa (${maxCredits} tín chỉ). Hiện tại: ${currentCredits}, thêm: ${additionalCredits} → tổng: ${newTotal}`
            };
        }

        return { isValid: true, message: '' };
    };

    // ============================================================
    // Handlers
    // ============================================================
    const handleSearch = () => {
        fetchAvailableClasses();
    };

    const handleRefresh = () => {
        setSearchText('');
        fetchAvailableClasses();
        fetchRegisteredCourses();
    };

    const checkEligibility = async (classId: string, className: string) => {
        if (!studentId) return;

        try {
            const res = await api.get(`/CourseRegistrations/check-eligibility/${studentId}/${classId}`);
            setEligibilityModal({
                visible: true,
                result: res.data,
                classId,
                className,
            });
        } catch (err: any) {
            console.error('Lỗi kiểm tra điều kiện:', err);
            const errorMessage = extractErrorMessage(err);
            message.error(errorMessage);
        }
    };

    const handleRegister = async (classId: string, className: string, credits: number, classInfo?: AvailableClass) => {
        if (!studentId) return;

        // Kiểm tra học kỳ có mở đăng ký không
        const currentSemesterInfo = semesters.find(s => s.semesterId === selectedSemester);
        if (!currentSemesterInfo?.isRegistrationOpen) {
            message.error('Học kỳ này đã đóng đăng ký!');
            return;
        }

        // Kiểm tra trùng lịch trước khi gọi API
        if (classInfo) {
            const conflictCheck = checkScheduleConflict(classInfo);
            if (conflictCheck.hasConflict) {
                Modal.error({
                    title: 'Không thể đăng ký',
                    content: (
                        <div>
                            <p>{conflictCheck.message}</p>
                            <p style={{ marginTop: 8, color: '#ff4d4f' }}>
                                Vui lòng chọn lớp học vào khung giờ khác hoặc hủy môn học bị trùng.
                            </p>
                        </div>
                    ),
                    okText: 'Đã hiểu'
                });
                return;
            }
        }

        // Kiểm tra giới hạn tín chỉ
        const creditCheck = checkCreditLimit(credits);
        if (!creditCheck.isValid) {
            message.error(creditCheck.message);
            return;
        }

        const currentCredits = registeredCourses
            .filter(c => c.status === 'APPROVED')
            .reduce((sum, c) => sum + (c.credits || 0), 0);

        const newTotal = currentCredits + credits;

        Modal.confirm({
            title: 'Xác nhận đăng ký môn học',
            icon: <ExclamationCircleOutlined />,
            content: (
                <div>
                    <p>Bạn có chắc muốn đăng ký môn: <Text strong>{className}</Text>?</p>
                    {classInfo && (
                        <p>
                            <Text type="secondary">
                                Lịch học: {DAY_MAP[classInfo.dayOfWeek]} tiết {classInfo.periodStart}-{classInfo.periodEnd}<br />
                                Phòng: {classInfo.room}<br />
                                Tín chỉ: {classInfo.credits}
                            </Text>
                        </p>
                    )}
                    <p>
                        <Text type="secondary">
                            Tín chỉ hiện tại: <Text strong>{currentCredits}</Text> / {maxCredits}<br />
                            Tín chỉ sau khi đăng ký: <Text strong type={newTotal > maxCredits ? 'danger' : 'success'}>{newTotal}</Text>
                            {newTotal < minCredits && (
                                <Text type="warning" style={{ display: 'block', marginTop: 8 }}>
                                    ⚠️ Lưu ý: Bạn cần đăng ký ít nhất {minCredits} tín chỉ!
                                </Text>
                            )}
                        </Text>
                    </p>
                </div>
            ),
            okText: 'Đăng ký',
            cancelText: 'Hủy',
            onOk: async () => {
                setRegistering(classId);
                try {
                    const response = await api.post('/CourseRegistrations', {
                        studentId,
                        classId
                    });

                    if (response.data.warning) {
                        message.warning(response.data.warning);
                    } else {
                        message.success('Đăng ký thành công!');
                    }

                    await new Promise(resolve => setTimeout(resolve, 500));

                    await fetchAvailableClasses();
                    await fetchRegisteredCourses();

                } catch (err: any) {
                    console.error('Lỗi đăng ký chi tiết:', err);
                    console.error('Response data:', err.response?.data);
                    console.error('Status:', err.response?.status);

                    // Hiển thị thông báo lỗi chi tiết hơn
                    let errorMessage = 'Đăng ký thất bại. Vui lòng thử lại!';

                    if (err.response?.data) {
                        const data = err.response.data;

                        // Hiển thị lỗi từ backend
                        if (data.message) {
                            errorMessage = data.message;
                        }
                        if (data.error) {
                            errorMessage = `${errorMessage}\nChi tiết: ${data.error}`;
                        }
                    }

                    Modal.error({
                        title: 'Lỗi đăng ký',
                        content: (
                            <div>
                                <p>{errorMessage}</p>
                                {err.response?.status === 500 && (
                                    <details style={{ marginTop: 8 }}>
                                        <summary style={{ cursor: 'pointer', color: '#ff4d4f' }}>
                                            Xem chi tiết lỗi kỹ thuật
                                        </summary>
                                        <pre style={{ fontSize: 11, marginTop: 8, whiteSpace: 'pre-wrap' }}>
                                            {JSON.stringify(err.response?.data, null, 2)}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        ),
                        width: 500
                    });

                } finally {
                    setRegistering(null);
                }
            },
        });
    };

    const handleDrop = async (registration: RegisteredCourse) => {
        if (!registration.registrationId) {
            message.error('Không tìm thấy thông tin đăng ký');
            return;
        }

        const currentCredits = registeredCourses
            .filter(c => c.status === 'APPROVED')
            .reduce((sum, c) => sum + (c.credits || 0), 0);

        const newTotal = currentCredits - registration.credits;

        Modal.confirm({
            title: `Hủy đăng ký môn ${registration.subjectName}?`,
            icon: <ExclamationCircleOutlined />,
            content: (
                <div>
                    <p>Bạn có chắc muốn hủy đăng ký môn học này?</p>
                    <p>
                        <Text type="secondary">
                            Tín chỉ hiện tại: <Text strong>{currentCredits}</Text> / {maxCredits}<br />
                            Tín chỉ sau khi hủy: {' '}
                            {newTotal < minCredits ? (
                                <Text strong type="warning">{newTotal}</Text>
                            ) : (
                                <Text strong>{newTotal}</Text>
                            )}
                            {newTotal < minCredits && (
                                <Text type="warning" style={{ display: 'block', marginTop: 8 }}>
                                    ⚠️ Cảnh báo: Sau khi hủy, tổng tín chỉ của bạn sẽ thấp hơn {minCredits} tín chỉ!
                                </Text>
                            )}
                        </Text>
                    </p>
                </div>
            ),
            okText: 'Hủy đăng ký',
            okType: 'danger',
            cancelText: 'Giữ lại',
            onOk: async () => {
                setDropping(registration.registrationId);
                try {
                    await api.delete(`/CourseRegistrations/${registration.registrationId}`);
                    message.success('Đã hủy đăng ký thành công');

                    await Promise.all([
                        fetchAvailableClasses(),
                        fetchRegisteredCourses()
                    ]);

                } catch (err: any) {
                    console.error('Lỗi hủy đăng ký:', err);
                    const errorMessage = extractErrorMessage(err);
                    message.error(errorMessage);
                } finally {
                    setDropping(null);
                }
            },
        });
    };

    // ============================================================
    // Computed values
    // ============================================================
    const totalRegisteredCredits = registeredCourses
        .filter(c => c.status === 'APPROVED')
        .reduce((sum, c) => sum + (c.credits || 0), 0);

    const pendingCount = registeredCourses.filter(c => c.status === 'PENDING').length;
    const approvedCount = registeredCourses.filter(c => c.status === 'APPROVED').length;
    const creditsLeft = maxCredits - totalRegisteredCredits;
    const isBelowMin = totalRegisteredCredits < minCredits;

    // ============================================================
    // Columns
    // ============================================================
    const availableColumns: ColumnsType<AvailableClass> = [
        {
            title: 'Mã lớp',
            dataIndex: 'classCode',
            width: 110,
            fixed: 'left',
            render: (code: string) => <Text code style={{ color: '#722ed1' }}>{code}</Text>,
        },
        {
            title: 'Môn học',
            width: 250,
            render: (_, r) => (
                <Space direction="vertical" size={2}>
                    <Text strong>{r.subjectName}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>{r.subjectCode}</Text>
                    <Tag color="geekblue" style={{ fontSize: 11 }}>{r.credits} tín chỉ</Tag>
                </Space>
            ),
        },
        {
            title: 'Giảng viên',
            dataIndex: 'teacherName',
            width: 150,
        },
        {
            title: 'Lịch học',
            width: 200,
            render: (_, r) => (
                <Text style={{ fontSize: 12 }}>
                    <CalendarOutlined style={{ marginRight: 4 }} />
                    {DAY_MAP[r.dayOfWeek]} · T{r.periodStart}–{r.periodEnd}<br />
                    <Tag color="cyan" style={{ marginTop: 2 }}>Phòng {r.room}</Tag>
                </Text>
            ),
        },
        {
            title: 'Trạng thái',
            width: 100,
            render: (_, r) => {
                const conflict = checkScheduleConflict(r);
                if (conflict.hasConflict) {
                    return (
                        <Tooltip title={conflict.message}>
                            <Tag color="error" icon={<WarningOutlined />}>
                                Trùng lịch
                            </Tag>
                        </Tooltip>
                    );
                }
                if (r.currentStudents >= r.maxStudents) {
                    return (
                        <Tag color="default">
                            Đã đầy
                        </Tag>
                    );
                }
                return (
                    <Tag color="success" icon={<CheckCircleOutlined />}>
                        Có thể đăng ký
                    </Tag>
                );
            },
        },
        {
            title: 'Sĩ số',
            width: 100,
            render: (_, r) => {
                const percent = Math.round((r.currentStudents / r.maxStudents) * 100);
                const isFull = r.currentStudents >= r.maxStudents;
                return (
                    <Tooltip title={`${r.currentStudents}/${r.maxStudents} sinh viên`}>
                        <Badge
                            count={`${r.currentStudents}/${r.maxStudents}`}
                            style={{
                                backgroundColor: isFull ? '#ff4d4f' :
                                    percent > 80 ? '#faad14' : '#52c41a',
                                fontSize: 11,
                            }}
                        />
                        <Progress
                            percent={percent}
                            size="small"
                            showInfo={false}
                            strokeColor={isFull ? '#ff4d4f' : percent > 80 ? '#faad14' : '#52c41a'}
                            style={{ width: 80, marginTop: 4 }}
                        />
                    </Tooltip>
                );
            },
        },
        {
            title: 'Thao tác',
            width: 160,
            fixed: 'right',
            render: (_, r) => {
                const conflict = checkScheduleConflict(r);
                const isDisabled = r.currentStudents >= r.maxStudents || conflict.hasConflict;
                let buttonText = 'Đăng ký';
                let tooltipText = '';

                if (r.currentStudents >= r.maxStudents) {
                    buttonText = 'Đã đầy';
                    tooltipText = 'Lớp học đã đủ sĩ số';
                } else if (conflict.hasConflict) {
                    buttonText = 'Trùng lịch';
                    tooltipText = conflict.message;
                }

                return (
                    <Space size={4}>
                        <Tooltip title="Kiểm tra điều kiện">
                            <Button
                                size="small"
                                icon={<InfoCircleOutlined />}
                                onClick={() => checkEligibility(r.classId, r.subjectName)}
                            />
                        </Tooltip>
                        <Tooltip title={tooltipText}>
                            <Button
                                type="primary"
                                size="small"
                                icon={<CheckCircleOutlined />}
                                loading={registering === r.classId}
                                onClick={() => handleRegister(r.classId, r.subjectName, r.credits, r)}
                                disabled={isDisabled}
                                style={{
                                    background: isDisabled ? '#d9d9d9' : '#722ed1',
                                    borderColor: isDisabled ? '#d9d9d9' : '#722ed1'
                                }}
                            >
                                {buttonText}
                            </Button>
                        </Tooltip>
                    </Space>
                );
            },
        },
    ];

    const registeredColumns: ColumnsType<RegisteredCourse> = [
        {
            title: 'Mã lớp',
            dataIndex: 'classCode',
            width: 110,
            render: (code: string) => <Text code style={{ color: '#722ed1' }}>{code}</Text>,
        },
        {
            title: 'Môn học',
            width: 250,
            render: (_, r) => (
                <Space direction="vertical" size={2}>
                    <Text strong>{r.subjectName}</Text>
                    <Tag color="geekblue">{r.credits} TC</Tag>
                </Space>
            ),
        },
        {
            title: 'Giảng viên',
            dataIndex: 'teacherName',
            width: 150,
        },
        {
            title: 'Lịch học',
            width: 200,
            render: (_, r) => (
                <Text style={{ fontSize: 12 }}>
                    <CalendarOutlined style={{ marginRight: 4 }} />
                    {DAY_MAP[r.dayOfWeek]} · T{r.periodStart}–{r.periodEnd}<br />
                    <Tag color="cyan">Phòng {r.room}</Tag>
                </Text>
            ),
        },
        {
            title: 'Trạng thái',
            width: 120,
            render: (_, r) => {
                const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.APPROVED;
                return (
                    <Tag color={cfg.color} icon={cfg.icon}>
                        {cfg.label}
                    </Tag>
                );
            },
        },
        {
            title: 'Ngày đăng ký',
            width: 120,
            render: (_, r) => dayjs(r.registeredAt).format('DD/MM/YYYY HH:mm'),
        },
        {
            title: 'Thao tác',
            width: 100,
            fixed: 'right',
            render: (_, r) => (
                r.status === 'APPROVED' || r.status === 'PENDING' ? (
                    <Tooltip title="Hủy đăng ký">
                        <Button
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            loading={dropping === r.registrationId}
                            onClick={() => handleDrop(r)}
                        >
                            Hủy
                        </Button>
                    </Tooltip>
                ) : (
                    <Text type="secondary">—</Text>
                )
            ),
        },
    ];

    // ============================================================
    // Render
    // ============================================================
    if (loadingSemesters) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
                <Spin size="large" tip="Đang tải dữ liệu..." />
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
                        <BookOutlined style={{ marginRight: 10 }} />
                        Đăng ký môn học
                    </Title>
                    <Text style={{ color: 'rgba(255,255,255,0.85)' }}>
                        {semesters.find(s => s.semesterId === selectedSemester)?.semesterName || 'Chọn học kỳ'}
                        {' • '}
                        Yêu cầu: <Text strong style={{ color: '#fff' }}>{minCredits} - {maxCredits} tín chỉ</Text>
                    </Text>
                </div>
                <Button
                    icon={<ReloadOutlined />}
                    onClick={handleRefresh}
                    loading={loadingAvailable || loadingRegistered}
                    style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}
                >
                    Làm mới
                </Button>
            </div>

            {/* Controls */}
            <Card style={{ marginBottom: 20, borderRadius: 12 }}>
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} md={8}>
                        <Text strong>Học kỳ:</Text>
                        <Select
                            value={selectedSemester}
                            onChange={setSelectedSemester}
                            style={{ width: '100%', marginTop: 4 }}
                            placeholder="Chọn học kỳ"
                        >
                            {semesters.map(sem => (
                                <Option key={sem.semesterId} value={sem.semesterId}>
                                    {sem.semesterName} {!sem.isRegistrationOpen && '(Đã đóng)'}
                                </Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={24} md={12}>
                        <Text strong>Tìm kiếm:</Text>
                        <Input
                            placeholder="Tìm theo tên môn, mã môn, mã lớp..."
                            prefix={<SearchOutlined />}
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            onPressEnter={handleSearch}
                            style={{ width: '100%', marginTop: 4 }}
                            allowClear
                        />
                    </Col>
                    <Col xs={24} md={4}>
                        <Button
                            type="primary"
                            icon={<SearchOutlined />}
                            onClick={handleSearch}
                            loading={loadingAvailable}
                            style={{ marginTop: 24, width: '100%', background: '#722ed1', borderColor: '#722ed1' }}
                        >
                            Tìm kiếm
                        </Button>
                    </Col>
                </Row>
            </Card>

            {/* Stats Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                <Col xs={24} sm={12} md={6}>
                    <Card
                        size="small"
                        style={{
                            background: totalRegisteredCredits >= minCredits ? '#f9f0ff' : '#fff7e6',
                            borderRadius: 10,
                            border: isBelowMin ? '1px solid #faad14' : 'none'
                        }}
                    >
                        <Statistic
                            title={`Tín chỉ đã đăng ký (tối thiểu ${minCredits})`}
                            value={totalRegisteredCredits}
                            suffix={`/ ${maxCredits}`}
                            prefix={<BookOutlined style={{ color: '#722ed1' }} />}
                            valueStyle={{ color: '#722ed1' }}
                        />
                        <Progress
                            percent={Math.min(Math.round((totalRegisteredCredits / maxCredits) * 100), 100)}
                            size="small"
                            strokeColor={isBelowMin ? '#faad14' : '#722ed1'}
                            showInfo={false}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                Còn {creditsLeft} tín chỉ
                            </Text>
                            <Text type={isBelowMin ? 'warning' : 'secondary'} style={{ fontSize: 11 }}>
                                {isBelowMin ? `⚠️ Thiếu ${minCredits - totalRegisteredCredits} TC` : `✅ Đạt yêu cầu ${minCredits} TC`}
                            </Text>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card size="small" style={{ background: '#f6ffed', borderRadius: 10 }}>
                        <Statistic
                            title="Đã đăng ký"
                            value={approvedCount}
                            prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card size="small" style={{ background: '#fff7e6', borderRadius: 10 }}>
                        <Statistic
                            title="Chờ duyệt"
                            value={pendingCount}
                            prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                            valueStyle={{ color: '#faad14' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card size="small" style={{ background: '#e6f4ff', borderRadius: 10 }}>
                        <Statistic
                            title="Lớp khả dụng"
                            value={availableClasses.length}
                            prefix={<TeamOutlined style={{ color: '#1677ff' }} />}
                            valueStyle={{ color: '#1677ff' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Warning Alert khi chưa đủ tín chỉ tối thiểu */}
            {isBelowMin && totalRegisteredCredits > 0 && (
                <Alert
                    type="warning"
                    showIcon
                    icon={<WarningOutlined />}
                    message={`Bạn mới đăng ký ${totalRegisteredCredits}/${minCredits} tín chỉ tối thiểu`}
                    description={`Vui lòng đăng ký thêm ${minCredits - totalRegisteredCredits} tín chỉ nữa để đáp ứng yêu cầu của học kỳ.`}
                    style={{ marginBottom: 16, borderRadius: 8 }}
                />
            )}

            {/* Alert nếu chưa đăng ký môn nào */}
            {totalRegisteredCredits === 0 && (
                <Alert
                    type="info"
                    showIcon
                    message="Chưa đăng ký môn học nào"
                    description={`Bạn cần đăng ký ít nhất ${minCredits} tín chỉ trong học kỳ này. Hãy chọn môn học từ danh sách bên dưới.`}
                    style={{ marginBottom: 16, borderRadius: 8 }}
                />
            )}

            {/* Alert nếu học kỳ đã đóng */}
            {selectedSemester && !semesters.find(s => s.semesterId === selectedSemester)?.isRegistrationOpen && (
                <Alert
                    type="warning"
                    showIcon
                    message="Học kỳ đã đóng đăng ký"
                    description="Bạn không thể đăng ký môn mới trong học kỳ này. Vui lòng liên hệ cố vấn học tập nếu cần hỗ trợ."
                    style={{ marginBottom: 16, borderRadius: 8 }}
                />
            )}

            {/* Tabs */}
            <Tabs defaultActiveKey="available">
                <TabPane
                    tab={
                        <span>
                            <SearchOutlined /> Lớp khả dụng
                            <Badge count={availableClasses.length} style={{ marginLeft: 8, backgroundColor: '#722ed1' }} />
                        </span>
                    }
                    key="available"
                >
                    <Card style={{ borderRadius: 12 }}>
                        <Table
                            rowKey="classId"
                            columns={availableColumns}
                            dataSource={availableClasses}
                            loading={loadingAvailable}
                            pagination={{
                                pageSize: 10,
                                showTotal: t => `Tổng ${t} lớp`,
                                showSizeChanger: true
                            }}
                            scroll={{ x: 1300 }}
                            locale={{
                                emptyText: (
                                    <Empty description="Không có lớp khả dụng hoặc tất cả đã đăng ký" />
                                )
                            }}
                        />
                    </Card>
                </TabPane>

                <TabPane
                    tab={
                        <span>
                            <CheckCircleOutlined /> Môn đã đăng ký
                            <Badge
                                count={registeredCourses.length}
                                style={{
                                    marginLeft: 8,
                                    backgroundColor: isBelowMin ? '#faad14' : '#52c41a'
                                }}
                            />
                            <Button
                                type="text"
                                size="small"
                                icon={<ReloadOutlined />}
                                onClick={() => fetchRegisteredCourses()}
                                style={{ marginLeft: 8 }}
                            />
                        </span>
                    }
                    key="registered"
                >
                    <Card style={{ borderRadius: 12 }}>
                        <Table
                            rowKey="registrationId"
                            columns={registeredColumns}
                            dataSource={registeredCourses}
                            loading={loadingRegistered}
                            pagination={{
                                pageSize: 10,
                                showTotal: t => `Tổng ${t} môn`
                            }}
                            scroll={{ x: 1100 }}
                            locale={{
                                emptyText: (
                                    <Empty
                                        description={
                                            <span>
                                                Chưa đăng ký môn nào trong học kỳ này
                                                <br />
                                                <Button
                                                    type="link"
                                                    onClick={() => setSelectedSemester(currentSemester)}
                                                >
                                                    Xem học kỳ hiện tại
                                                </Button>
                                            </span>
                                        }
                                    />
                                )
                            }}
                            summary={() =>
                                registeredCourses.length > 0 ? (
                                    <Table.Summary fixed>
                                        <Table.Summary.Row>
                                            <Table.Summary.Cell index={0} colSpan={2}>
                                                <Text strong>Tổng: {registeredCourses.length} môn</Text>
                                            </Table.Summary.Cell>
                                            <Table.Summary.Cell index={2} colSpan={3}>
                                                <Text strong style={{ color: isBelowMin ? '#faad14' : '#722ed1' }}>
                                                    {totalRegisteredCredits} / {maxCredits} tín chỉ
                                                    {isBelowMin && (
                                                        <Text type="warning" style={{ marginLeft: 8 }}>
                                                            (Thiếu {minCredits - totalRegisteredCredits} TC)
                                                        </Text>
                                                    )}
                                                </Text>
                                            </Table.Summary.Cell>
                                            <Table.Summary.Cell index={5} colSpan={2}>
                                                <Text type="secondary">
                                                    {approvedCount} đã đăng ký · {pendingCount} chờ duyệt
                                                </Text>
                                            </Table.Summary.Cell>
                                        </Table.Summary.Row>
                                    </Table.Summary>
                                ) : null
                            }
                        />
                    </Card>
                </TabPane>
            </Tabs>

            {/* Eligibility Modal */}
            <Modal
                title={
                    <Space>
                        <InfoCircleOutlined style={{ color: '#722ed1' }} />
                        <span>Kiểm tra điều kiện - {eligibilityModal.className}</span>
                    </Space>
                }
                open={eligibilityModal.visible}
                onCancel={() => setEligibilityModal({ ...eligibilityModal, visible: false })}
                footer={[
                    <Button key="close" onClick={() => setEligibilityModal({ ...eligibilityModal, visible: false })}>
                        Đóng
                    </Button>,
                    eligibilityModal.result?.isEligible && (
                        <Button
                            key="register"
                            type="primary"
                            onClick={() => {
                                const classInfo = availableClasses.find(c => c.classId === eligibilityModal.classId);
                                const credits = classInfo?.credits || 0;
                                handleRegister(eligibilityModal.classId, eligibilityModal.className, credits, classInfo);
                                setEligibilityModal({ ...eligibilityModal, visible: false });
                            }}
                            style={{ background: '#722ed1', borderColor: '#722ed1' }}
                        >
                            Đăng ký ngay
                        </Button>
                    ),
                ]}
                width={600}
            >
                {eligibilityModal.result && (
                    <div>
                        {eligibilityModal.result.isEligible ? (
                            <Alert
                                type="success"
                                showIcon
                                message="Đủ điều kiện đăng ký"
                                description="Bạn có thể đăng ký môn học này."
                                style={{ marginBottom: 16 }}
                            />
                        ) : (
                            <Alert
                                type="error"
                                showIcon
                                message="Không đủ điều kiện"
                                description={eligibilityModal.result.message || 'Vui lòng kiểm tra lại các điều kiện bên dưới.'}
                                style={{ marginBottom: 16 }}
                            />
                        )}

                        <Descriptions bordered column={1} size="small">
                            <Descriptions.Item label="Lớp còn chỗ">
                                {eligibilityModal.result.classAvailable ? (
                                    <Tag color="success"><CheckCircleOutlined /> Còn chỗ</Tag>
                                ) : (
                                    <Tag color="error"><CloseCircleOutlined /> Đã đầy / Đóng</Tag>
                                )}
                            </Descriptions.Item>
                            <Descriptions.Item label="Điều kiện tiên quyết">
                                {eligibilityModal.result.prerequisitePassed ? (
                                    <Tag color="success"><CheckCircleOutlined /> Đạt</Tag>
                                ) : (
                                    <Tag color="error"><CloseCircleOutlined /> Chưa đạt</Tag>
                                )}
                            </Descriptions.Item>
                            <Descriptions.Item label="Lịch học">
                                {eligibilityModal.result.noScheduleConflict ? (
                                    <Tag color="success"><CheckCircleOutlined /> Không trùng</Tag>
                                ) : (
                                    <Tag color="error"><CloseCircleOutlined /> Trùng lịch</Tag>
                                )}
                            </Descriptions.Item>
                            <Descriptions.Item label="Giới hạn tín chỉ">
                                {eligibilityModal.result.withinCreditLimit ? (
                                    <Tag color="success"><CheckCircleOutlined /> Trong giới hạn</Tag>
                                ) : (
                                    <Tag color="error"><CloseCircleOutlined /> Vượt giới hạn</Tag>
                                )}
                            </Descriptions.Item>
                        </Descriptions>
                    </div>
                )}
            </Modal>

            {/* CSS */}
            <style>{`
                .ant-table-thead > tr > th {
                    background: #fafafa !important;
                    font-weight: 700 !important;
                }
                .ant-card-body {
                    padding: 16px;
                }
            `}</style>
        </div>
    );
};

export default Registration;