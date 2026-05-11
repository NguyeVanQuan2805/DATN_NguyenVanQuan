import React, { useState, useEffect } from 'react';
import {
    Card,
    Form,
    InputNumber,
    Button,
    message,
    Space,
    Typography,
    Divider,
    Table,
    Tag,
    Spin,
    Modal,
    Select,
    Alert,
    Statistic,
    Row,
    Col,
    Tooltip,
    Tabs,
    Image,
    Input,
    Descriptions,
    ConfigProvider,
} from 'antd';
import {
    DollarOutlined,
    SettingOutlined,
    CalculatorOutlined,
    ReloadOutlined,
    EyeOutlined,
    CheckCircleOutlined,
    WarningOutlined,
    BankOutlined,
    CheckOutlined,
    CloseOutlined,
    FileImageOutlined,
    FilterOutlined,
    HistoryOutlined,
    CreditCardOutlined,
    QrcodeOutlined,
    MobileOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

interface TuitionConfig {
    pricePerCredit: number;
    paymentDeadline: number;
    lateFee: number;
    currentSemester: string;
}

interface PaymentConfig {
    configId: number;
    bankName: string;
    accountNumber: string;      
    accountHolder: string;       
    branch: string;
    qrCodeUrl: string;
    description: string;
    isActive: boolean;
    momoEnabled: boolean;        
}

interface StudentTuition {
    studentId: string;
    studentCode: string;
    fullName: string;
    totalCredits: number;
    totalAmount: number;
    amountPaid: number;
    remaining: number;
    status: string;
    dueDate: string;
}

interface Semester {
    semesterId: string;
    semesterName: string;
    academicYear: number;
}

interface PendingPayment {
    paymentId: number;
    tuitionId: number;
    studentId: string;
    studentCode: string;
    studentName: string;
    semesterName: string;
    amountSubmitted: number;
    paymentDate: string;
    evidenceFile: string;
    status: string;
    transactionId?: string;
}

interface PaymentHistory {
    paymentId: number;
    tuitionId: number;
    studentCode: string;
    studentName: string;
    semesterName: string;
    amountSubmitted: number;
    paymentDate: string;
    status: string;
    reviewNote: string;
    reviewedAt: string;
    reviewedBy: string;
}

const TuitionManagement: React.FC = () => {
    const [config, setConfig] = useState<TuitionConfig>({
        pricePerCredit: 300000,
        paymentDeadline: 30,
        lateFee: 0,
        currentSemester: ''
    });
    const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
    const [loading, setLoading] = useState(false);
    const [paymentConfigLoading, setPaymentConfigLoading] = useState(false);
    const [students, setStudents] = useState<StudentTuition[]>([]);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [selectedSemester, setSelectedSemester] = useState<string>('');
    const [calculateModalVisible, setCalculateModalVisible] = useState(false);
    const [calculating, setCalculating] = useState(false);
    const [form] = Form.useForm();
    const [paymentConfigForm] = Form.useForm();

    // Payment approval states
    const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
    const [pendingLoading, setPendingLoading] = useState(false);
    const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);
    const [reviewForm] = Form.useForm();
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [activeTab, setActiveTab] = useState<string>('config');

    // Fetch tuition config
    const fetchConfig = async () => {
        setLoading(true);
        try {
            const response = await api.get('/SystemConfigs/tuition-config');
            setConfig({
                pricePerCredit: parseFloat(response.data.pricePerCredit) || 300000,
                paymentDeadline: parseInt(response.data.paymentDeadline) || 30,
                lateFee: parseFloat(response.data.lateFee) || 0,
                currentSemester: response.data.currentSemester || ''
            });
            form.setFieldsValue({
                pricePerCredit: parseFloat(response.data.pricePerCredit) || 300000,
                paymentDeadline: parseInt(response.data.paymentDeadline) || 30,
                lateFee: parseFloat(response.data.lateFee) || 0
            });
        } catch (error: any) {
            console.error('Error fetching config:', error);
            message.error(error.response?.data?.message || 'Không thể tải cấu hình học phí');
        } finally {
            setLoading(false);
        }
    };

    // Fetch payment config
    const fetchPaymentConfig = async () => {
        setPaymentConfigLoading(true);
        try {
            const response = await api.get('/SystemConfigs/payment-config');
            if (response.data) {
                setPaymentConfig(response.data);
                paymentConfigForm.setFieldsValue({
                    bankName: response.data.bankName,
                    accountNumber: response.data.accountNumber,
                    accountHolder: response.data.accountHolder,
                    branch: response.data.branch,
                    qrCodeUrl: response.data.qrCodeUrl,
                    description: response.data.description,
                    isActive: response.data.isActive,
                    momoEnabled: response.data.momoEnabled || false,
                });
            } else {
                paymentConfigForm.setFieldsValue({
                    isActive: true,
                    momoEnabled: false,
                });
            }
        } catch (error: any) {
            console.error('Error fetching payment config:', error);
            if (error.response?.status !== 404) {
                message.error('Không thể tải cấu hình thanh toán');
            }
        } finally {
            setPaymentConfigLoading(false);
        }
    };

    // Update payment config
    const handleUpdatePaymentConfig = async (values: any) => {
        setPaymentConfigLoading(true);
        try {
            if (paymentConfig) {
                await api.put(`/SystemConfigs/payment-config/${paymentConfig.configId}`, values);
            } else {
                await api.post('/SystemConfigs/payment-config', values);
            }
            message.success('Cập nhật cấu hình thanh toán thành công');
            fetchPaymentConfig();
        } catch (error: any) {
            console.error('Error updating payment config:', error);
            message.error(error.response?.data?.message || 'Cập nhật thất bại');
        } finally {
            setPaymentConfigLoading(false);
        }
    };

    // Update tuition config
    const handleUpdateConfig = async (values: any) => {
        setLoading(true);
        try {
            await api.put('/SystemConfigs/tuition-config', values);
            message.success('Cập nhật cấu hình học phí thành công');
            fetchConfig();
        } catch (error: any) {
            console.error('Error updating config:', error);
            message.error(error.response?.data?.message || 'Cập nhật thất bại');
        } finally {
            setLoading(false);
        }
    };

    // Fetch semesters
    const fetchSemesters = async () => {
        try {
            const response = await api.get('/Semesters');
            setSemesters(response.data || []);
            if (response.data?.length > 0 && !selectedSemester) {
                setSelectedSemester(response.data[0].semesterId);
            }
        } catch (error) {
            console.error('Error fetching semesters:', error);
            message.error('Không thể tải danh sách học kỳ');
        }
    };

    // Fetch student tuitions
    const fetchStudentTuitions = async () => {
        if (!selectedSemester) return;

        setStudentsLoading(true);
        try {
            const response = await api.get('/Tuitions', {
                params: { semesterId: selectedSemester }
            });

            const tuitionsData = response.data || [];
            const formattedStudents: StudentTuition[] = tuitionsData.map((tuition: any) => ({
                studentId: tuition.studentId,
                studentCode: tuition.studentCode || 'N/A',
                fullName: tuition.studentName || 'N/A',
                totalCredits: tuition.totalCredits || 0,
                totalAmount: tuition.amount || 0,
                amountPaid: tuition.amountPaid || 0,
                remaining: (tuition.amount || 0) - (tuition.amountPaid || 0),
                status: tuition.status || 'UNPAID',
                dueDate: tuition.dueDate
            }));

            setStudents(formattedStudents);
        } catch (error: any) {
            console.error('Error fetching tuitions:', error);
            if (error.response?.status === 500) {
                message.error('Lỗi server. Vui lòng kiểm tra backend API /api/Tuitions');
            } else {
                message.error(error.response?.data?.message || 'Không thể tải danh sách học phí');
            }
            setStudents([]);
        } finally {
            setStudentsLoading(false);
        }
    };

    // Fetch pending payments
    const fetchPendingPayments = async () => {
        setPendingLoading(true);
        try {
            const response = await api.get('/Tuitions/payments/pending');
            setPendingPayments(response.data || []);
        } catch (error: any) {
            console.error('Error fetching pending payments:', error);
            message.error('Không thể tải danh sách thanh toán chờ duyệt');
        } finally {
            setPendingLoading(false);
        }
    };

    // Fetch payment history
    const fetchPaymentHistory = async () => {
        setHistoryLoading(true);
        try {
            const response = await api.get('/Tuitions/payments/history');
            setPaymentHistory(response.data || []);
        } catch (error: any) {
            console.error('Error fetching payment history:', error);
            message.error('Không thể tải lịch sử thanh toán');
        } finally {
            setHistoryLoading(false);
        }
    };

    // Calculate tuition for a student
    const handleCalculateTuition = async (studentId: string) => {
        if (!selectedSemester) {
            message.warning('Vui lòng chọn học kỳ');
            return;
        }

        Modal.confirm({
            title: 'Tính học phí',
            content: 'Bạn có chắc chắn muốn tính học phí cho sinh viên này?',
            onOk: async () => {
                try {
                    await api.post(`/Tuitions/calculate/${studentId}/${selectedSemester}`);
                    message.success('Tính học phí thành công');
                    fetchStudentTuitions();
                } catch (error: any) {
                    console.error('Error calculating tuition:', error);
                    message.error(error.response?.data?.message || 'Tính học phí thất bại');
                }
            }
        });
    };

    // Calculate tuition for all students
    const handleCalculateAll = async () => {
        if (!selectedSemester) {
            message.warning('Vui lòng chọn học kỳ');
            return;
        }

        setCalculateModalVisible(false);
        setCalculating(true);

        try {
            const response = await api.post(`/Tuitions/calculate-batch/${selectedSemester}`);
            message.success(
                `Tính học phí thành công cho ${response.data.successCount}/${response.data.totalStudents} sinh viên`
            );
            fetchStudentTuitions();
        } catch (error: any) {
            console.error('Error calculating all:', error);
            message.error(error.response?.data?.message || 'Tính học phí thất bại');
        } finally {
            setCalculating(false);
        }
    };

    // Confirm or reject payment
    const handleReviewPayment = async (values: any) => {
        if (!selectedPayment) return;

        try {
            await api.put(`/Tuitions/payment/${selectedPayment.paymentId}/confirm`, {
                approved: values.approved,
                reviewNote: values.reviewNote
            });

            message.success(values.approved ? 'Đã xác nhận thanh toán' : 'Đã từ chối thanh toán');
            setReviewModalVisible(false);
            reviewForm.resetFields();
            fetchPendingPayments();
            fetchPaymentHistory();
            fetchStudentTuitions();
        } catch (error: any) {
            console.error('Error reviewing payment:', error);
            message.error(error.response?.data?.message || 'Xử lý thất bại');
        }
    };

    const getStatusTag = (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
            PAID: { color: 'green', text: 'Đã thanh toán' },
            PARTIAL: { color: 'orange', text: 'Thanh toán một phần' },
            UNPAID: { color: 'red', text: 'Chưa thanh toán' },
            OVERDUE: { color: 'red', text: 'Quá hạn' }
        };
        const info = statusMap[status] || { color: 'default', text: status };
        return <Tag color={info.color} style={{ fontSize: '13px', padding: '4px 12px' }}>{info.text}</Tag>;
    };

    const getPaymentStatusTag = (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
            PENDING: { color: 'orange', text: 'Chờ duyệt' },
            APPROVED: { color: 'green', text: 'Đã duyệt' },
            REJECTED: { color: 'red', text: 'Từ chối' }
        };
        const info = statusMap[status] || { color: 'default', text: status };
        return <Tag color={info.color} style={{ fontSize: '13px', padding: '4px 12px' }}>{info.text}</Tag>;
    };

    // Student tuition columns
    const tuitionColumns: ColumnsType<StudentTuition> = [
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Mã sinh viên</span>,
            dataIndex: 'studentCode',
            key: 'studentCode',
            width: 120,
            render: (code: string) => <Text strong style={{ fontSize: '14px', color: '#1677ff' }}>{code}</Text>,
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Họ tên</span>,
            dataIndex: 'fullName',
            key: 'fullName',
            width: 200,
            render: (name: string) => <span style={{ fontSize: '14px' }}>{name}</span>,
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Tổng học phí</span>,
            dataIndex: 'totalAmount',
            key: 'totalAmount',
            width: 150,
            align: 'right' as const,
            render: (amount: number) => (
                <Text strong style={{ color: '#f50', fontSize: '14px' }}>
                    {amount?.toLocaleString('vi-VN') || 0}đ
                </Text>
            ),
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Đã thanh toán</span>,
            dataIndex: 'amountPaid',
            key: 'amountPaid',
            width: 150,
            align: 'right' as const,
            render: (amount: number) => (
                <Text style={{ color: '#52c41a', fontSize: '14px' }}>
                    {amount?.toLocaleString('vi-VN') || 0}đ
                </Text>
            ),
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Còn lại</span>,
            dataIndex: 'remaining',
            key: 'remaining',
            width: 150,
            align: 'right' as const,
            render: (amount: number) => (
                <Text strong style={{ color: amount > 0 ? '#f50' : '#52c41a', fontSize: '14px' }}>
                    {amount?.toLocaleString('vi-VN') || 0}đ
                </Text>
            ),
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Hạn thanh toán</span>,
            dataIndex: 'dueDate',
            key: 'dueDate',
            width: 130,
            render: (date: string) => <span style={{ fontSize: '14px' }}>{date ? dayjs(date).format('DD/MM/YYYY') : 'Chưa có'}</span>,
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Trạng thái</span>,
            dataIndex: 'status',
            key: 'status',
            width: 130,
            render: (status: string) => getStatusTag(status),
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Thao tác</span>,
            key: 'action',
            width: 100,
            render: (_: any, record: StudentTuition) => (
                <Tooltip title="Tính học phí">
                    <Button
                        type="link"
                        icon={<CalculatorOutlined />}
                        onClick={() => handleCalculateTuition(record.studentId)}
                        style={{ fontSize: '14px' }}
                    >
                        Tính
                    </Button>
                </Tooltip>
            ),
        },
    ];

    // Pending payments columns
    const pendingColumns: ColumnsType<PendingPayment> = [
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Mã SV</span>,
            dataIndex: 'studentCode',
            key: 'studentCode',
            width: 110,
            render: (code: string) => <Text strong style={{ fontSize: '14px', color: '#1677ff' }}>{code}</Text>,
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Họ tên SV</span>,
            dataIndex: 'studentName',
            key: 'studentName',
            width: 180,
            render: (name: string) => <span style={{ fontSize: '14px' }}>{name}</span>,
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Học kỳ</span>,
            dataIndex: 'semesterName',
            key: 'semesterName',
            width: 160,
            render: (semester: string) => <Tag color="geekblue" style={{ fontSize: '13px', padding: '4px 12px' }}>{semester}</Tag>,
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Số tiền</span>,
            dataIndex: 'amountSubmitted',
            key: 'amountSubmitted',
            width: 140,
            align: 'right' as const,
            render: (amount: number) => (
                <Text strong style={{ color: '#52c41a', fontSize: '14px' }}>
                    {amount?.toLocaleString('vi-VN') || 0}đ
                </Text>
            ),
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Ngày gửi</span>,
            dataIndex: 'paymentDate',
            key: 'paymentDate',
            width: 160,
            render: (date: string) => <span style={{ fontSize: '14px' }}>{dayjs(date).format('DD/MM/YYYY HH:mm')}</span>,
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Minh chứng</span>,
            dataIndex: 'evidenceFile',
            key: 'evidenceFile',
            width: 100,
            render: (file: string) => file ? (
                <Image
                    src={file}
                    width={40}
                    height={40}
                    style={{ objectFit: 'cover', borderRadius: 4 }}
                    preview={{ mask: <FileImageOutlined style={{ fontSize: '16px' }} /> }}
                />
            ) : <span style={{ fontSize: '14px' }}>Chưa có</span>
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Thao tác</span>,
            key: 'action',
            width: 160,
            fixed: 'right' as const,
            render: (_: any, record: PendingPayment) => (
                <Space size="small">
                    <Button
                        type="primary"
                        size="middle"
                        icon={<CheckOutlined />}
                        onClick={() => {
                            setSelectedPayment(record);
                            reviewForm.setFieldsValue({ approved: true, reviewNote: '' });
                            setReviewModalVisible(true);
                        }}
                        style={{ fontSize: '13px' }}
                    >
                        Duyệt
                    </Button>
                    <Button
                        danger
                        size="middle"
                        icon={<CloseOutlined />}
                        onClick={() => {
                            setSelectedPayment(record);
                            reviewForm.setFieldsValue({ approved: false, reviewNote: '' });
                            setReviewModalVisible(true);
                        }}
                        style={{ fontSize: '13px' }}
                    >
                        Từ chối
                    </Button>
                </Space>
            ),
        },
    ];

    // Payment history columns
    const historyColumns: ColumnsType<PaymentHistory> = [
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Mã SV</span>,
            dataIndex: 'studentCode',
            key: 'studentCode',
            width: 110,
            render: (code: string) => <Text strong style={{ fontSize: '14px', color: '#1677ff' }}>{code}</Text>,
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Họ tên SV</span>,
            dataIndex: 'studentName',
            key: 'studentName',
            width: 180,
            render: (name: string) => <span style={{ fontSize: '14px' }}>{name}</span>,
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Học kỳ</span>,
            dataIndex: 'semesterName',
            key: 'semesterName',
            width: 160,
            render: (semester: string) => <Tag color="geekblue" style={{ fontSize: '13px', padding: '4px 12px' }}>{semester}</Tag>,
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Số tiền</span>,
            dataIndex: 'amountSubmitted',
            key: 'amountSubmitted',
            width: 140,
            align: 'right' as const,
            render: (amount: number) => (
                <Text strong style={{ color: '#52c41a', fontSize: '14px' }}>
                    {amount?.toLocaleString('vi-VN') || 0}đ
                </Text>
            ),
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Ngày gửi</span>,
            dataIndex: 'paymentDate',
            key: 'paymentDate',
            width: 160,
            render: (date: string) => <span style={{ fontSize: '14px' }}>{dayjs(date).format('DD/MM/YYYY HH:mm')}</span>,
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Trạng thái</span>,
            dataIndex: 'status',
            key: 'status',
            width: 110,
            render: (status: string) => getPaymentStatusTag(status),
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Người duyệt</span>,
            dataIndex: 'reviewedBy',
            key: 'reviewedBy',
            width: 120,
            render: (reviewer: string) => <span style={{ fontSize: '14px' }}>{reviewer || 'Chưa duyệt'}</span>,
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Ghi chú</span>,
            dataIndex: 'reviewNote',
            key: 'reviewNote',
            width: 200,
            ellipsis: true,
            render: (note: string) => <span style={{ fontSize: '14px' }}>{note || '—'}</span>,
        },
    ];

    const stats = {
        totalStudents: students.length,
        totalAmount: students.reduce((sum, s) => sum + (s.totalAmount || 0), 0),
        totalPaid: students.reduce((sum, s) => sum + (s.amountPaid || 0), 0),
        totalRemaining: students.reduce((sum, s) => sum + (s.remaining || 0), 0),
        paidCount: students.filter(s => s.status === 'PAID').length,
        unpaidCount: students.filter(s => s.status !== 'PAID').length,
        pendingCount: pendingPayments.length,
    };

    useEffect(() => {
        fetchConfig();
        fetchPaymentConfig();
        fetchSemesters();
        fetchPendingPayments();
        fetchPaymentHistory();
    }, []);

    useEffect(() => {
        if (selectedSemester) {
            fetchStudentTuitions();
        }
    }, [selectedSemester]);

    return (
        <ConfigProvider
            theme={{
                token: {
                    fontSize: 14,
                },
            }}
        >
            <div style={{ padding: '24px', background: '#f5f7fa', minHeight: '100vh' }}>
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
                    borderRadius: 12,
                    padding: '24px 28px',
                    marginBottom: 24,
                    boxShadow: '0 4px 20px rgba(22,119,255,0.25)',
                }}>
                    <Title level={2} style={{ color: '#fff', margin: 0, fontSize: '28px' }}>
                        <DollarOutlined style={{ marginRight: 12, fontSize: '28px' }} />
                        Quản lý học phí
                    </Title>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginTop: 8, display: 'block' }}>
                        Cấu hình học phí, thông tin thanh toán, quản lý và xác nhận thanh toán từ sinh viên
                    </Text>
                </div>

                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    size="large"
                    style={{ marginBottom: 0 }}
                    items={[
                        {
                            key: 'config',
                            label: <span style={{ fontSize: '15px' }}><SettingOutlined /> Cấu hình học phí</span>,
                            children: (
                                <>
                                    {/* Tuition Configuration Card */}
                                    <Card
                                        title={
                                            <Space>
                                                <DollarOutlined style={{ fontSize: '16px' }} />
                                                <span style={{ fontSize: '16px', fontWeight: 600 }}>Cấu hình học phí</span>
                                            </Space>
                                        }
                                        style={{ marginBottom: 24, borderRadius: 12 }}
                                    >
                                        <Form
                                            form={form}
                                            layout="inline"
                                            onFinish={handleUpdateConfig}
                                            initialValues={config}
                                            style={{ flexWrap: 'wrap', gap: '16px' }}
                                        >
                                            <Form.Item
                                                name="pricePerCredit"
                                                label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Giá mỗi tín chỉ</span>}
                                                rules={[{ required: true, message: 'Vui lòng nhập giá' }]}
                                            >
                                                <InputNumber
                                                    min={0}
                                                    step={10000}
                                                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                                    parser={value => value!.replace(/\$\s?|(,*)/g, '') as any}
                                                    style={{ width: 200 }}
                                                    prefix="₫"
                                                    size="large"
                                                />
                                            </Form.Item>

                                            <Form.Item
                                                name="paymentDeadline"
                                                label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Hạn thanh toán (ngày)</span>}
                                                rules={[{ required: true, message: 'Vui lòng nhập số ngày' }]}
                                            >
                                                <InputNumber
                                                    min={1}
                                                    max={90}
                                                    style={{ width: 150 }}
                                                    size="large"
                                                />
                                                <Text style={{ marginLeft: 8, fontSize: '14px' }}>ngày</Text>
                                            </Form.Item>

                                            <Form.Item
                                                name="lateFee"
                                                label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Phí phạt trễ hạn</span>}
                                                rules={[{ required: true, message: 'Vui lòng nhập phí phạt' }]}
                                            >
                                                <InputNumber
                                                    min={0}
                                                    max={100}
                                                    style={{ width: 120 }}
                                                    size="large"
                                                />
                                                <Text style={{ marginLeft: 8, fontSize: '14px' }}>%</Text>
                                            </Form.Item>

                                            <Form.Item>
                                                <Button type="primary" htmlType="submit" loading={loading} size="large">
                                                    Lưu cấu hình
                                                </Button>
                                            </Form.Item>
                                        </Form>
                                    </Card>

                                    {/* Statistics */}
                                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                                        <Col xs={24} sm={12} md={6}>
                                            <Card style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                                                <Statistic
                                                    title={<span style={{ fontSize: '14px' }}>Tổng số sinh viên</span>}
                                                    value={stats.totalStudents}
                                                    prefix={<EyeOutlined style={{ fontSize: '22px' }} />}
                                                    valueStyle={{ color: '#1890ff', fontSize: '28px', fontWeight: 600 }}
                                                />
                                            </Card>
                                        </Col>
                                        <Col xs={24} sm={12} md={6}>
                                            <Card style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                                                <Statistic
                                                    title={<span style={{ fontSize: '14px' }}>Tổng học phí</span>}
                                                    value={stats.totalAmount}
                                                    prefix={<DollarOutlined style={{ fontSize: '22px' }} />}
                                                    suffix="đ"
                                                    valueStyle={{ color: '#f50', fontSize: '28px', fontWeight: 600 }}
                                                    formatter={(value) => (value as number).toLocaleString('vi-VN')}
                                                />
                                            </Card>
                                        </Col>
                                        <Col xs={24} sm={12} md={6}>
                                            <Card style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                                                <Statistic
                                                    title={<span style={{ fontSize: '14px' }}>Đã thanh toán</span>}
                                                    value={stats.totalPaid}
                                                    prefix={<CheckCircleOutlined style={{ fontSize: '22px' }} />}
                                                    suffix="đ"
                                                    valueStyle={{ color: '#52c41a', fontSize: '28px', fontWeight: 600 }}
                                                    formatter={(value) => (value as number).toLocaleString('vi-VN')}
                                                />
                                            </Card>
                                        </Col>
                                        <Col xs={24} sm={12} md={6}>
                                            <Card style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                                                <Statistic
                                                    title={<span style={{ fontSize: '14px' }}>Còn nợ</span>}
                                                    value={stats.totalRemaining}
                                                    prefix={<WarningOutlined style={{ fontSize: '22px' }} />}
                                                    suffix="đ"
                                                    valueStyle={{ color: stats.totalRemaining > 0 ? '#f50' : '#52c41a', fontSize: '28px', fontWeight: 600 }}
                                                    formatter={(value) => (value as number).toLocaleString('vi-VN')}
                                                />
                                            </Card>
                                        </Col>
                                    </Row>

                                    {/* Student Tuition List */}
                                    <Card
                                        title={<Space><BankOutlined style={{ fontSize: '16px' }} /><span style={{ fontSize: '16px', fontWeight: 600 }}>Danh sách học phí sinh viên</span></Space>}
                                        style={{ borderRadius: 12 }}
                                        extra={
                                            <Space size="middle">
                                                <Select
                                                    style={{ width: 220 }}
                                                    value={selectedSemester}
                                                    onChange={setSelectedSemester}
                                                    placeholder="Chọn học kỳ"
                                                    loading={semesters.length === 0}
                                                    size="large"
                                                >
                                                    {semesters.map((sem: Semester) => (
                                                        <Option key={sem.semesterId} value={sem.semesterId}>
                                                            {sem.semesterName} ({sem.academicYear})
                                                        </Option>
                                                    ))}
                                                </Select>
                                                <Button
                                                    icon={<ReloadOutlined />}
                                                    onClick={fetchStudentTuitions}
                                                    size="large"
                                                >
                                                    Làm mới
                                                </Button>
                                                <Button
                                                    type="primary"
                                                    icon={<CalculatorOutlined />}
                                                    onClick={() => setCalculateModalVisible(true)}
                                                    size="large"
                                                >
                                                    Tính học phí tất cả
                                                </Button>
                                            </Space>
                                        }
                                    >
                                        <Spin spinning={studentsLoading}>
                                            {students.length === 0 && !studentsLoading ? (
                                                <Alert
                                                    message="Không có dữ liệu"
                                                    description="Chưa có học phí nào cho học kỳ này. Hãy nhấn 'Tính học phí tất cả' để tạo học phí cho sinh viên."
                                                    type="info"
                                                    showIcon
                                                />
                                            ) : (
                                                <Table
                                                    columns={tuitionColumns}
                                                    dataSource={students}
                                                    rowKey="studentId"
                                                    scroll={{ x: 1300 }}
                                                    size="middle"
                                                    pagination={{
                                                        showSizeChanger: true,
                                                        showTotal: (total) => <span style={{ fontSize: '14px' }}>Tổng số {total} sinh viên</span>,
                                                        pageSizeOptions: ['10', '20', '50'],
                                                        defaultPageSize: 10
                                                    }}
                                                />
                                            )}
                                        </Spin>
                                    </Card>
                                </>
                            ),
                        },
                        // Thay thế tab paymentConfig trong TuitionManagement bằng code sau:

                        {
                            key: 'paymentConfig',
                            label: <span style={{ fontSize: '15px' }}><CreditCardOutlined /> Cấu hình thanh toán</span>,
                            children: (
                                <Card
                                    title={
                                        <Space>
                                            <BankOutlined style={{ fontSize: '16px' }} />
                                            <span style={{ fontSize: '16px', fontWeight: 600 }}>Thông tin tài khoản thanh toán</span>
                                        </Space>
                                    }
                                    style={{ borderRadius: 12 }}
                                >
                                    <Spin spinning={paymentConfigLoading}>
                                        <Form
                                            form={paymentConfigForm}
                                            layout="vertical"
                                            onFinish={handleUpdatePaymentConfig}
                                        >
                                            <Row gutter={24}>
                                                <Col span={12}>
                                                    <Form.Item
                                                        name="bankName"
                                                        label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Tên ngân hàng</span>}
                                                        rules={[{ required: true, message: 'Vui lòng nhập tên ngân hàng' }]}
                                                    >
                                                        <Select
                                                            placeholder="Chọn ngân hàng"
                                                            size="large"
                                                            showSearch
                                                            optionFilterProp="children"
                                                        >
                                                            <Option value="Vietcombank">Vietcombank</Option>
                                                            <Option value="VietinBank">VietinBank</Option>
                                                            <Option value="BIDV">BIDV</Option>
                                                            <Option value="Agribank">Agribank</Option>
                                                            <Option value="Techcombank">Techcombank</Option>
                                                            <Option value="Sacombank">Sacombank</Option>
                                                            <Option value="ACB">ACB</Option>
                                                            <Option value="VPBank">VPBank</Option>
                                                            <Option value="MB Bank">MB Bank</Option>
                                                            <Option value="TPBank">TPBank</Option>
                                                            <Option value="HDBank">HDBank</Option>
                                                        </Select>
                                                    </Form.Item>
                                                </Col>
                                                <Col span={12}>
                                                    <Form.Item
                                                        name="accountNumber"
                                                        label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Số tài khoản</span>}
                                                        rules={[{ required: true, message: 'Vui lòng nhập số tài khoản' }]}
                                                    >
                                                        <Input placeholder="VD: 1234567890" size="large" />
                                                    </Form.Item>
                                                </Col>
                                            </Row>

                                            <Row gutter={24}>
                                                <Col span={12}>
                                                    <Form.Item
                                                        name="accountHolder"
                                                        label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Chủ tài khoản</span>}
                                                        rules={[{ required: true, message: 'Vui lòng nhập tên chủ tài khoản' }]}
                                                    >
                                                        <Input placeholder="VD: TRƯỜNG ĐẠI HỌC ABC" size="large" />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={12}>
                                                    <Form.Item
                                                        name="branch"
                                                        label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Chi nhánh</span>}
                                                    >
                                                        <Input placeholder="VD: Chi nhánh Hà Nội" size="large" />
                                                    </Form.Item>
                                                </Col>
                                            </Row>

                                            <Form.Item
                                                name="qrCodeUrl"
                                                label={<span style={{ fontSize: '14px', fontWeight: 500 }}>URL mã QR thanh toán (tùy chọn)</span>}
                                                extra="Nếu để trống, hệ thống sẽ tự động tạo QR code từ thông tin ngân hàng"
                                            >
                                                <Input placeholder="https://..." size="large" />
                                            </Form.Item>

                                            <Form.Item
                                                name="description"
                                                label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Hướng dẫn thanh toán / Nội dung chuyển khoản</span>}
                                            >
                                                <Input.TextArea
                                                    rows={3}
                                                    placeholder="VD: NOP_HOC_PHI_[Mã sinh viên]_[Họ tên]"
                                                    style={{ fontSize: '14px' }}
                                                />
                                            </Form.Item>

                                            <Row gutter={24}>
                                                <Col span={12}>
                                                    <Form.Item
                                                        name="momoEnabled"
                                                        label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Cho phép thanh toán qua MoMo</span>}
                                                        valuePropName="checked"
                                                    >
                                                        <Select size="large" style={{ width: '100%' }}>
                                                            <Option value={true}>Bật</Option>
                                                            <Option value={false}>Tắt</Option>
                                                        </Select>
                                                    </Form.Item>
                                                </Col>
                                                <Col span={12}>
                                                    <Form.Item
                                                        name="isActive"
                                                        label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Trạng thái</span>}
                                                    >
                                                        <Select size="large" style={{ width: '100%' }}>
                                                            <Option value={true}>Kích hoạt</Option>
                                                            <Option value={false}>Vô hiệu hóa</Option>
                                                        </Select>
                                                    </Form.Item>
                                                </Col>
                                            </Row>

                                            <Form.Item>
                                                <Button type="primary" htmlType="submit" size="large" loading={paymentConfigLoading}>
                                                    Lưu cấu hình thanh toán
                                                </Button>
                                            </Form.Item>
                                        </Form>

                                        {/* Hiển thị preview cấu hình hiện tại */}
                                        {paymentConfig && paymentConfig.isActive && (
                                            <>
                                                <Divider />
                                                <div style={{ marginTop: 16 }}>
                                                    <Title level={4}>Thông tin thanh toán hiện tại (Preview)</Title>
                                                    <Alert
                                                        message="Đây là thông tin sinh viên sẽ nhìn thấy khi thanh toán"
                                                        type="info"
                                                        showIcon
                                                        style={{ marginBottom: 16 }}
                                                    />
                                                    <Row gutter={16}>
                                                        <Col span={12}>
                                                            <Card title="Thông tin chuyển khoản" size="small">
                                                                <p><Text strong>Ngân hàng:</Text> {paymentConfig.bankName}</p>
                                                                <p><Text strong>Số TK:</Text> <Text copyable>{paymentConfig.accountNumber}</Text></p>
                                                                <p><Text strong>Chủ TK:</Text> {paymentConfig.accountHolder}</p>
                                                                <p><Text strong>Chi nhánh:</Text> {paymentConfig.branch || '—'}</p>
                                                                <p><Text strong>Nội dung CK:</Text> <Text code>{paymentConfig.description || 'NOP_HOC_PHI_[MaSV]_[HoTen]'}</Text></p>
                                                                <p><Text strong>Số tiền:</Text> <Text strong style={{ color: '#f50', fontSize: '16px' }}>Theo học phí từng sinh viên</Text></p>
                                                            </Card>
                                                        </Col>
                                                        <Col span={12}>
                                                            <Card title="QR Code mẫu" size="small">
                                                                <div style={{ textAlign: 'center' }}>
                                                                    {paymentConfig.qrCodeUrl ? (
                                                                        <img src={paymentConfig.qrCodeUrl} width={180} alt="QR Code" />
                                                                    ) : (
                                                                        <div style={{ padding: 20, background: '#f5f5f5', borderRadius: 8 }}>
                                                                            <QrcodeOutlined style={{ fontSize: 48, color: '#ccc' }} />
                                                                            <p style={{ color: '#999', marginTop: 8 }}>QR Code sẽ được tạo tự động</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </Card>
                                                        </Col>
                                                    </Row>
                                                    {paymentConfig.momoEnabled && (
                                                        <Card title="Thanh toán qua MoMo" size="small" style={{ marginTop: 16 }}>
                                                            <Row gutter={16}>
                                                                <Col span={12}>
                                                                    <p><Text strong>Số điện thoại:</Text> Đăng nhập MoMo để thanh toán</p>
                                                                    <p><Text strong>Số tiền:</Text> Theo học phí từng sinh viên</p>
                                                                </Col>
                                                                <Col span={12} style={{ textAlign: 'center' }}>
                                                                    <MobileOutlined style={{ fontSize: 48, color: '#52c41a' }} />
                                                                    <p>QR MoMo sẽ được tạo khi thanh toán</p>
                                                                </Col>
                                                            </Row>
                                                        </Card>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </Spin>
                                </Card>
                            ),
                        },
                        {
                            key: 'approval',
                            label: <span style={{ fontSize: '15px' }}><CheckCircleOutlined /> Duyệt thanh toán {stats.pendingCount > 0 && <Tag color="orange" style={{ marginLeft: 8 }}>{stats.pendingCount}</Tag>}</span>,
                            children: (
                                <Card
                                    title={
                                        <Space>
                                            <CheckCircleOutlined style={{ fontSize: '16px' }} />
                                            <span style={{ fontSize: '16px', fontWeight: 600 }}>Xác nhận thanh toán từ sinh viên</span>
                                        </Space>
                                    }
                                    style={{ borderRadius: 12 }}
                                    extra={
                                        <Button icon={<ReloadOutlined />} onClick={fetchPendingPayments} size="large">
                                            Làm mới
                                        </Button>
                                    }
                                >
                                    <Spin spinning={pendingLoading}>
                                        {pendingPayments.length === 0 && !pendingLoading ? (
                                            <Alert
                                                message="Không có yêu cầu nào"
                                                description="Hiện không có yêu cầu thanh toán nào đang chờ duyệt."
                                                type="info"
                                                showIcon
                                            />
                                        ) : (
                                            <Table
                                                columns={pendingColumns}
                                                dataSource={pendingPayments}
                                                rowKey="paymentId"
                                                scroll={{ x: 1200 }}
                                                size="middle"
                                                pagination={{
                                                    showSizeChanger: true,
                                                    showTotal: (total) => <span style={{ fontSize: '14px' }}>Tổng số {total} yêu cầu</span>,
                                                    pageSizeOptions: ['10', '20', '50'],
                                                    defaultPageSize: 10
                                                }}
                                            />
                                        )}
                                    </Spin>
                                </Card>
                            ),
                        },
                        {
                            key: 'history',
                            label: <span style={{ fontSize: '15px' }}><HistoryOutlined /> Lịch sử thanh toán</span>,
                            children: (
                                <Card
                                    title={<span style={{ fontSize: '16px', fontWeight: 600 }}>Lịch sử xử lý thanh toán</span>}
                                    style={{ borderRadius: 12 }}
                                    extra={
                                        <Space size="middle">
                                            <Select
                                                style={{ width: 150 }}
                                                value={filterStatus}
                                                onChange={setFilterStatus}
                                                suffixIcon={<FilterOutlined />}
                                                size="large"
                                            >
                                                <Option value="all">Tất cả</Option>
                                                <Option value="APPROVED">Đã duyệt</Option>
                                                <Option value="REJECTED">Từ chối</Option>
                                                <Option value="PENDING">Chờ duyệt</Option>
                                            </Select>
                                            <Button icon={<ReloadOutlined />} onClick={fetchPaymentHistory} size="large">
                                                Làm mới
                                            </Button>
                                        </Space>
                                    }
                                >
                                    <Spin spinning={historyLoading}>
                                        <Table
                                            columns={historyColumns}
                                            dataSource={paymentHistory.filter(p =>
                                                filterStatus === 'all' || p.status === filterStatus
                                            )}
                                            rowKey="paymentId"
                                            scroll={{ x: 1300 }}
                                            size="middle"
                                            pagination={{
                                                showSizeChanger: true,
                                                showTotal: (total) => <span style={{ fontSize: '14px' }}>Tổng số {total} giao dịch</span>,
                                                pageSizeOptions: ['10', '20', '50'],
                                                defaultPageSize: 10
                                            }}
                                        />
                                    </Spin>
                                </Card>
                            ),
                        },
                    ]}
                />

                {/* Calculate All Modal */}
                <Modal
                    title={<span style={{ fontSize: '18px', fontWeight: 600 }}>Xác nhận tính học phí</span>}
                    open={calculateModalVisible}
                    onOk={handleCalculateAll}
                    onCancel={() => setCalculateModalVisible(false)}
                    confirmLoading={calculating}
                    okText="Tính học phí"
                    cancelText="Hủy"
                    okButtonProps={{ size: 'large' }}
                    cancelButtonProps={{ size: 'large' }}
                >
                    <Alert
                        message="Xác nhận tính học phí"
                        description={`Bạn có chắc chắn muốn tính học phí cho tất cả sinh viên trong học kỳ ${semesters.find(s => s.semesterId === selectedSemester)?.semesterName || selectedSemester}?`}
                        type="warning"
                        showIcon
                    />
                    <Divider />
                    <Text type="secondary" style={{ fontSize: '14px' }}>
                        Học phí sẽ được tính dựa trên tổng số tín chỉ các môn đã đăng ký và được duyệt.
                        Giá mỗi tín chỉ: {config.pricePerCredit.toLocaleString('vi-VN')}đ
                    </Text>
                </Modal>

                {/* Review Payment Modal */}
                <Modal
                    title={
                        <Space>
                            {reviewForm.getFieldValue('approved') ? (
                                <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '18px' }} />
                            ) : (
                                <CloseOutlined style={{ color: '#ff4d4f', fontSize: '18px' }} />
                            )}
                            <span style={{ fontSize: '18px', fontWeight: 600 }}>
                                {reviewForm.getFieldValue('approved') ? 'Xác nhận thanh toán' : 'Từ chối thanh toán'}
                            </span>
                        </Space>
                    }
                    open={reviewModalVisible}
                    onCancel={() => {
                        setReviewModalVisible(false);
                        reviewForm.resetFields();
                    }}
                    footer={null}
                    width={550}
                >
                    {selectedPayment && (
                        <>
                            <Descriptions column={2} size="middle" style={{ marginBottom: 20 }}>
                                <Descriptions.Item label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Mã sinh viên</span>} span={2}>
                                    <Text strong style={{ fontSize: '15px', color: '#1677ff' }}>{selectedPayment.studentCode}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Họ tên</span>} span={2}>
                                    <span style={{ fontSize: '15px' }}>{selectedPayment.studentName}</span>
                                </Descriptions.Item>
                                <Descriptions.Item label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Học kỳ</span>} span={2}>
                                    <span style={{ fontSize: '14px' }}>{selectedPayment.semesterName}</span>
                                </Descriptions.Item>
                                <Descriptions.Item label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Số tiền</span>}>
                                    <Text strong style={{ color: '#52c41a', fontSize: '16px' }}>
                                        {selectedPayment.amountSubmitted.toLocaleString('vi-VN')}đ
                                    </Text>
                                </Descriptions.Item>
                                <Descriptions.Item label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Ngày gửi</span>}>
                                    <span style={{ fontSize: '14px' }}>{dayjs(selectedPayment.paymentDate).format('DD/MM/YYYY HH:mm')}</span>
                                </Descriptions.Item>
                            </Descriptions>

                            {selectedPayment.evidenceFile && (
                                <div style={{ marginBottom: 20, textAlign: 'center' }}>
                                    <Text type="secondary" style={{ fontSize: '14px' }}>Minh chứng thanh toán:</Text>
                                    <div style={{ marginTop: 8 }}>
                                        <Image
                                            src={selectedPayment.evidenceFile}
                                            width="100%"
                                            style={{ maxWidth: 300 }}
                                            alt="Evidence"
                                        />
                                    </div>
                                </div>
                            )}

                            <Form form={reviewForm} onFinish={handleReviewPayment} layout="vertical">
                                <Form.Item name="approved" hidden>
                                    <Input />
                                </Form.Item>

                                <Form.Item
                                    name="reviewNote"
                                    label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Ghi chú</span>}
                                    rules={[{ required: true, message: 'Vui lòng nhập ghi chú' }]}
                                >
                                    <Input.TextArea
                                        rows={3}
                                        placeholder={reviewForm.getFieldValue('approved')
                                            ? 'Nhập ghi chú xác nhận thanh toán...'
                                            : 'Nhập lý do từ chối...'}
                                        style={{ fontSize: '14px' }}
                                    />
                                </Form.Item>

                                <Form.Item>
                                    <Space style={{ width: '100%', justifyContent: 'flex-end' }} size="middle">
                                        <Button onClick={() => setReviewModalVisible(false)} size="large">
                                            Hủy
                                        </Button>
                                        <Button
                                            type="primary"
                                            htmlType="submit"
                                            danger={!reviewForm.getFieldValue('approved')}
                                            icon={reviewForm.getFieldValue('approved') ? <CheckOutlined /> : <CloseOutlined />}
                                            size="large"
                                        >
                                            {reviewForm.getFieldValue('approved') ? 'Xác nhận' : 'Từ chối'}
                                        </Button>
                                    </Space>
                                </Form.Item>
                            </Form>
                        </>
                    )}
                </Modal>
            </div>
        </ConfigProvider>
    );
};

export default TuitionManagement;