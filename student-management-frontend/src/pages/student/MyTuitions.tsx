// src/pages/student/MyTuitions.tsx
import React, { useState, useEffect } from 'react';
import {
    Card,
    Table,
    Button,
    message,
    Space,
    Typography,
    Tag,
    Modal,
    Form,
    InputNumber,
    Upload,
    Descriptions,
    Alert,
    Spin,
    Row,
    Col,
    Statistic,
    Tabs,
    Input,
    Divider,
    QRCode
} from 'antd';
import {
    DollarOutlined,
    PayCircleOutlined,
    HistoryOutlined,
    UploadOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    WarningOutlined,
    FileImageOutlined,
    QrcodeOutlined,
    BankOutlined,
    MobileOutlined,
    CopyOutlined,
    CloseOutlined
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { QRCodeCanvas } from 'qrcode.react';
import api from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface Tuition {
    tuitionId: number;
    semesterId: string;
    semesterName: string;
    feeType: string;
    amount: number;
    amountPaid: number;
    remaining: number;
    dueDate: string;
    status: string;
    notes: string;
    createdAt: string;
}

interface Payment {
    paymentId: number;
    tuitionId: number;
    amountSubmitted: number;
    paymentDate: string;
    evidenceFile: string;
    status: string;
    reviewNote: string;
    semesterName?: string;
    transactionId?: string;
}

interface PaymentConfig {
    bankName: string;
    bankAccountNo: string;
    bankAccountName: string;
    momoEnabled: boolean;
    qrCodeType: string;
}

const MyTuitions: React.FC = () => {
    const [tuitions, setTuitions] = useState<Tuition[]>([]);
    const [loading, setLoading] = useState(false);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [qrModalVisible, setQrModalVisible] = useState(false);
    const [selectedTuition, setSelectedTuition] = useState<Tuition | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
    const [configLoading, setConfigLoading] = useState(false);
    const [form] = Form.useForm();
    const [qrForm] = Form.useForm();
    const [copied, setCopied] = useState(false);
    const [activePaymentTab, setActivePaymentTab] = useState('bank');

    // Fetch my tuitions
    const fetchMyTuitions = async () => {
        setLoading(true);
        try {
            const response = await api.get('/Tuitions/my');
            setTuitions(response.data || []);
        } catch (error: any) {
            console.error('Error fetching tuitions:', error);
            message.error(error.response?.data?.message || 'Không thể tải học phí');
        } finally {
            setLoading(false);
        }
    };

    // Fetch my payments
    const fetchMyPayments = async () => {
        try {
            const response = await api.get('/Tuitions/my-payments');
            setPayments(response.data || []);
        } catch (error) {
            console.error('Error fetching payments:', error);
        }
    };

    // Fetch payment config - PUBLIC endpoint
    const fetchPaymentConfig = async () => {
        setConfigLoading(true);
        try {
            const response = await api.get('/SystemConfigs/payment-config/public');
            console.log('Payment config response:', response.data);

            if (response.data) {
                setPaymentConfig({
                    bankName: response.data.bankName || 'Vietcombank',
                    bankAccountNo: response.data.bankAccountNo || '',
                    bankAccountName: response.data.bankAccountName || '',
                    momoEnabled: response.data.momoEnabled === true,
                    qrCodeType: response.data.qrCodeType || 'VIETQR'
                });
            } else {
                // Set default config
                setPaymentConfig({
                    bankName: 'Vietcombank',
                    bankAccountNo: '',
                    bankAccountName: '',
                    momoEnabled: false,
                    qrCodeType: 'VIETQR'
                });
            }
        } catch (error: any) {
            console.error('Error fetching payment config:', error);
            // Set default config nếu lỗi
            setPaymentConfig({
                bankName: 'Vietcombank',
                bankAccountNo: '',
                bankAccountName: '',
                momoEnabled: false,
                qrCodeType: 'VIETQR'
            });
        } finally {
            setConfigLoading(false);
        }
    };

    // Submit payment (traditional)
    const handleSubmitPayment = async (values: any) => {
        if (!selectedTuition) return;

        if (values.amount <= 0) {
            message.error('Số tiền thanh toán phải lớn hơn 0');
            return;
        }

        if (values.amount > selectedTuition.remaining) {
            message.error('Số tiền thanh toán vượt quá số tiền còn lại');
            return;
        }

        setSubmitting(true);

        try {
            await api.post('/Tuitions/payment', {
                tuitionId: selectedTuition.tuitionId,
                amount: values.amount,
                evidenceFile: values.transactionId || null
            });

            message.success('Gửi yêu cầu thanh toán thành công, chờ xác nhận');
            setPaymentModalVisible(false);
            form.resetFields();
            setFileList([]);
            fetchMyTuitions();
            fetchMyPayments();
        } catch (error: any) {
            console.error('Payment error:', error);
            message.error(error.response?.data?.message || 'Gửi yêu cầu thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    // Submit QR payment
    //const handleSubmitQRPayment = async (values: any) => {
    //    if (!selectedTuition) return;

    //    setSubmitting(true);

    //    const formData = new FormData();
    //    formData.append('tuitionId', selectedTuition.tuitionId.toString());
    //    formData.append('amount', selectedTuition.remaining.toString());
    //    formData.append('paymentMethod', activePaymentTab === 'bank' ? 'BANK_TRANSFER' : 'MOMO');
    //    formData.append('transactionId', values.transactionId || '');

    //    try {
    //        await api.post('/Tuitions/payment', formData, {
    //            headers: { 'Content-Type': 'multipart/form-data' }
    //        });
    //        message.success('Gửi yêu cầu thanh toán thành công! Vui lòng chờ xác nhận.');
    //        setQrModalVisible(false);
    //        qrForm.resetFields();
    //        fetchMyTuitions();
    //        fetchMyPayments();
    //    } catch (error: any) {
    //        message.error(error.response?.data?.message || 'Gửi yêu cầu thất bại');
    //    } finally {
    //        setSubmitting(false);
    //    }
    //};

    const handleSubmitQRPayment = async (values: any) => {
        if (!selectedTuition) return;

        setSubmitting(true);

        try {
            await api.post('/Tuitions/payment', {
                tuitionId: selectedTuition.tuitionId,
                amount: selectedTuition.remaining,
                evidenceFile: values.transactionId || null
            });

            message.success('Gửi yêu cầu thanh toán thành công! Vui lòng chờ xác nhận.');
            setQrModalVisible(false);
            qrForm.resetFields();
            fetchMyTuitions();
            fetchMyPayments();
        } catch (error: any) {
            console.error('QR Payment error:', error);
            message.error(error.response?.data?.message || 'Gửi yêu cầu thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    // Generate bank transfer QR code data (VietQR)
    const generateVietQRData = () => {
        if (!paymentConfig || !selectedTuition) {
            console.log('Missing config or tuition:', { paymentConfig, selectedTuition });
            return '';
        }

        const bankCode = getBankCode(paymentConfig.bankName);
        const accountNo = paymentConfig.bankAccountNo;

        if (!accountNo) {
            console.log('Missing bank account number');
            return '';
        }

        const description = `THANHTOAN_HOCPHI_${selectedTuition.tuitionId}_${Date.now()}`;
        const amount = selectedTuition.remaining;

        // VietQR URL format
        const qrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(paymentConfig.bankAccountName)}`;

        console.log('Generated VietQR URL:', qrUrl);
        return qrUrl;
    };

    // Get bank code from bank name
    const getBankCode = (bankName: string) => {
        const bankMap: Record<string, string> = {
            'Vietcombank': 'VCB',
            'VietinBank': 'ICB',
            'BIDV': 'BIDV',
            'Agribank': 'VBA',
            'Techcombank': 'TCB',
            'Sacombank': 'STB',
            'ACB': 'ACB',
            'VPBank': 'VPB',
            'MB Bank': 'MB',
            'SHB': 'SHB',
        };
        return bankMap[bankName] || 'VCB';
    };

    // Handle copy account info
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        message.success('Đã sao chép');
    };

    const getStatusTag = (status: string) => {
        const statusMap: Record<string, { color: string; text: string; icon: any }> = {
            PAID: { color: 'green', text: 'Đã thanh toán', icon: <CheckCircleOutlined /> },
            PARTIAL: { color: 'orange', text: 'Thanh toán một phần', icon: <ClockCircleOutlined /> },
            UNPAID: { color: 'red', text: 'Chưa thanh toán', icon: <WarningOutlined /> },
            OVERDUE: { color: 'red', text: 'Quá hạn', icon: <WarningOutlined /> }
        };
        const info = statusMap[status] || { color: 'default', text: status, icon: null };
        return <Tag color={info.color} icon={info.icon}>{info.text}</Tag>;
    };

    const getPaymentStatusTag = (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
            PENDING: { color: 'orange', text: 'Chờ xác nhận' },
            APPROVED: { color: 'green', text: 'Đã xác nhận' },
            REJECTED: { color: 'red', text: 'Từ chối' }
        };
        const info = statusMap[status] || { color: 'default', text: status };
        return <Tag color={info.color}>{info.text}</Tag>;
    };

    const isOverdue = (dueDate: string) => {
        if (!dueDate) return false;
        return dayjs(dueDate).isBefore(dayjs(), 'day');
    };

    const tuitionColumns = [
        {
            title: 'Học kỳ',
            dataIndex: 'semesterName',
            key: 'semesterName',
            width: 150,
        },
        {
            title: 'Loại phí',
            dataIndex: 'feeType',
            key: 'feeType',
            width: 120,
            render: (type: string) => {
                const typeMap: Record<string, string> = {
                    TUITION: 'Học phí',
                    LATE_FEE: 'Phí phạt',
                    OTHER: 'Khác'
                };
                return typeMap[type] || type;
            }
        },
        {
            title: 'Tổng học phí',
            dataIndex: 'amount',
            key: 'amount',
            width: 150,
            align: 'right' as const,
            render: (amount: number) => (
                <Text strong style={{ color: '#f50' }}>
                    {amount?.toLocaleString('vi-VN') || 0}đ
                </Text>
            ),
        },
        {
            title: 'Đã thanh toán',
            dataIndex: 'amountPaid',
            key: 'amountPaid',
            width: 150,
            align: 'right' as const,
            render: (amount: number) => (
                <Text style={{ color: '#52c41a' }}>
                    {amount?.toLocaleString('vi-VN') || 0}đ
                </Text>
            ),
        },
        {
            title: 'Còn lại',
            dataIndex: 'remaining',
            key: 'remaining',
            width: 150,
            align: 'right' as const,
            render: (amount: number, record: Tuition) => (
                <Text strong style={{ color: amount > 0 ? (isOverdue(record.dueDate) ? '#f50' : '#fa8c16') : '#52c41a' }}>
                    {amount?.toLocaleString('vi-VN') || 0}đ
                </Text>
            ),
        },
        {
            title: 'Hạn thanh toán',
            dataIndex: 'dueDate',
            key: 'dueDate',
            width: 120,
            render: (date: string, record: Tuition) => (
                <Space direction="vertical" size={0}>
                    <Text>{date ? dayjs(date).format('DD/MM/YYYY') : 'Chưa có'}</Text>
                    {isOverdue(date) && record.remaining > 0 && (
                        <Tag color="red" style={{ marginTop: 4 }}>Quá hạn</Tag>
                    )}
                </Space>
            ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 150,
            render: (status: string) => getStatusTag(status),
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 200,
            render: (_: any, record: Tuition) => (
                record.status !== 'PAID' && record.remaining > 0 && (
                    <Space>
                        <Button
                            type="primary"
                            icon={<QrcodeOutlined />}
                            onClick={async () => {
                                setSelectedTuition(record);
                                await fetchPaymentConfig();
                                setQrModalVisible(true);
                            }}
                        >
                            Thanh toán QR
                        </Button>
                        <Button
                            icon={<PayCircleOutlined />}
                            onClick={() => {
                                setSelectedTuition(record);
                                setPaymentModalVisible(true);
                            }}
                        >
                            Truyền thống
                        </Button>
                    </Space>
                )
            ),
        },
    ];

    const paymentColumns = [
        {
            title: 'Học kỳ',
            dataIndex: 'semesterName',
            key: 'semesterName',
            width: 150,
        },
        {
            title: 'Mã giao dịch',
            dataIndex: 'transactionId',
            key: 'transactionId',
            width: 150,
        },
        {
            title: 'Ngày thanh toán',
            dataIndex: 'paymentDate',
            key: 'paymentDate',
            width: 160,
            render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
        },
        {
            title: 'Số tiền',
            dataIndex: 'amountSubmitted',
            key: 'amountSubmitted',
            width: 150,
            align: 'right' as const,
            render: (amount: number) => (
                <Text strong style={{ color: '#52c41a' }}>
                    {amount?.toLocaleString('vi-VN') || 0}đ
                </Text>
            ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status: string) => getPaymentStatusTag(status),
        },
        {
            title: 'Ghi chú',
            dataIndex: 'reviewNote',
            key: 'reviewNote',
            width: 200,
            ellipsis: true,
            render: (note: string) => note || 'Chưa có',
        },
    ];

    const stats = {
        totalAmount: tuitions.reduce((sum, t) => sum + (t.amount || 0), 0),
        totalPaid: tuitions.reduce((sum, t) => sum + (t.amountPaid || 0), 0),
        totalRemaining: tuitions.reduce((sum, t) => sum + (t.remaining || 0), 0),
        overdueCount: tuitions.filter(t => t.status === 'OVERDUE' || (isOverdue(t.dueDate) && t.remaining > 0)).length,
    };

    // Upload props
    const uploadProps: UploadProps = {
        fileList,
        onChange: ({ fileList }) => setFileList(fileList),
        beforeUpload: () => false,
        maxCount: 1,
        accept: 'image/*,.pdf',
        listType: 'picture',
    };

    useEffect(() => {
        fetchMyTuitions();
        fetchMyPayments();
    }, []);

    // Tạo transaction ID mới khi mở modal QR
    const getTransactionId = () => {
        return `THANHTOAN_HOCPHI_${selectedTuition?.tuitionId}_${Date.now()}`;
    };

    return (
        <div>
            <Title level={2}>Quản lý học phí</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                Xem và thanh toán học phí theo từng học kỳ
            </Text>

            {/* Statistics */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Tổng học phí"
                            value={stats.totalAmount}
                            prefix={<DollarOutlined />}
                            suffix="đ"
                            valueStyle={{ color: '#f50' }}
                            formatter={(value) => (value as number).toLocaleString('vi-VN')}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Đã thanh toán"
                            value={stats.totalPaid}
                            prefix={<CheckCircleOutlined />}
                            suffix="đ"
                            valueStyle={{ color: '#52c41a' }}
                            formatter={(value) => (value as number).toLocaleString('vi-VN')}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Còn nợ"
                            value={stats.totalRemaining}
                            prefix={<WarningOutlined />}
                            suffix="đ"
                            valueStyle={{ color: stats.totalRemaining > 0 ? '#f50' : '#52c41a' }}
                            formatter={(value) => (value as number).toLocaleString('vi-VN')}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Khoản quá hạn"
                            value={stats.overdueCount}
                            prefix={<WarningOutlined />}
                            valueStyle={{ color: '#f50' }}
                        />
                    </Card>
                </Col>
            </Row>

            <Card>
                <Tabs defaultActiveKey="tuitions">
                    <TabPane
                        tab={
                            <span>
                                <DollarOutlined />
                                Học phí
                            </span>
                        }
                        key="tuitions"
                    >
                        <Spin spinning={loading}>
                            <Table
                                columns={tuitionColumns}
                                dataSource={tuitions}
                                rowKey="tuitionId"
                                pagination={false}
                                expandable={{
                                    expandedRowRender: (record) => (
                                        <Descriptions size="small" column={2}>
                                            <Descriptions.Item label="Ghi chú" span={2}>
                                                {record.notes || 'Không có ghi chú'}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Ngày tạo">
                                                {dayjs(record.createdAt).format('DD/MM/YYYY')}
                                            </Descriptions.Item>
                                        </Descriptions>
                                    ),
                                }}
                            />
                        </Spin>
                    </TabPane>

                    <TabPane
                        tab={
                            <span>
                                <HistoryOutlined />
                                Lịch sử thanh toán
                            </span>
                        }
                        key="payments"
                    >
                        <Table
                            columns={paymentColumns}
                            dataSource={payments}
                            rowKey="paymentId"
                            pagination={{ pageSize: 10, showTotal: (total) => `Tổng số ${total} giao dịch` }}
                        />
                    </TabPane>
                </Tabs>
            </Card>

            {/* Traditional Payment Modal */}
            <Modal
                title="Thanh toán học phí (Chuyển khoản thủ công)"
                open={paymentModalVisible}
                onCancel={() => {
                    setPaymentModalVisible(false);
                    form.resetFields();
                    setFileList([]);
                }}
                footer={null}
                width={500}
            >
                {selectedTuition && (
                    <>
                        <Alert
                            message="Thông tin thanh toán"
                            description={
                                <div>
                                    <p><strong>Học kỳ:</strong> {selectedTuition.semesterName}</p>
                                    <p><strong>Tổng học phí:</strong> {selectedTuition.amount.toLocaleString('vi-VN')}đ</p>
                                    <p><strong>Đã thanh toán:</strong> {selectedTuition.amountPaid.toLocaleString('vi-VN')}đ</p>
                                    <p><strong>Còn lại:</strong> <span style={{ color: '#f50', fontWeight: 'bold' }}>{selectedTuition.remaining.toLocaleString('vi-VN')}đ</span></p>
                                    <p><strong>Hạn thanh toán:</strong> {dayjs(selectedTuition.dueDate).format('DD/MM/YYYY')}</p>
                                    <p><strong>Tài khoản nhận thanh toán: 100877669016</strong></p>
                                </div>
                            }
                            type="info"
                            showIcon
                            style={{ marginBottom: 16 }}
                        />

                        <Form form={form} onFinish={handleSubmitPayment} layout="vertical">
                            <Form.Item
                                name="amount"
                                label="Số tiền thanh toán"
                                rules={[
                                    { required: true, message: 'Vui lòng nhập số tiền' },
                                    { type: 'number', min: 1, message: 'Số tiền phải lớn hơn 0' }
                                ]}
                            >
                                <InputNumber
                                    style={{ width: '100%' }}
                                    min={1}
                                    max={selectedTuition.remaining}
                                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    parser={value => value!.replace(/\$\s?|(,*)/g, '') as any}
                                    addonAfter="đ"
                                    placeholder="Nhập số tiền cần thanh toán"
                                />
                            </Form.Item>

                            <Form.Item
                                name="transactionId"
                                label="Mã giao dịch"
                                rules={[{ required: true, message: 'Vui lòng nhập mã giao dịch' }]}
                            >
                                <Input placeholder="Nhập mã giao dịch từ ngân hàng" />
                            </Form.Item>

                            <Form.Item
                                label="Minh chứng thanh toán (ảnh chụp màn hình, biên lai)"
                                name="evidence"
                            >
                                <Upload {...uploadProps}>
                                    <Button icon={<UploadOutlined />}>Tải lên minh chứng</Button>
                                </Upload>
                            </Form.Item>

                            <Alert
                                message="Lưu ý"
                                description="Sau khi gửi yêu cầu thanh toán, vui lòng chờ admin xác nhận. Bạn có thể theo dõi trạng thái trong lịch sử thanh toán."
                                type="warning"
                                showIcon
                                style={{ marginBottom: 16 }}
                            />

                            <Form.Item>
                                <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                                    <Button onClick={() => setPaymentModalVisible(false)}>
                                        Hủy
                                    </Button>
                                    <Button type="primary" htmlType="submit" loading={submitting}>
                                        Gửi yêu cầu thanh toán
                                    </Button>
                                </Space>
                            </Form.Item>
                        </Form>
                    </>
                )}
            </Modal>

            {/* QR Payment Modal */}
            <Modal
                title={
                    <Space>
                        <QrcodeOutlined />
                        <span>Thanh toán bằng QR Code</span>
                    </Space>
                }
                open={qrModalVisible}
                onCancel={() => {
                    setQrModalVisible(false);
                    setSelectedTuition(null);
                    qrForm.resetFields();
                    setActivePaymentTab('bank');
                }}
                footer={null}
                width={750}
                destroyOnClose
            >
                {selectedTuition && (
                    <Spin spinning={configLoading}>
                        {paymentConfig ? (
                            <>
                                <Alert
                                    message="Thông tin thanh toán"
                                    description={
                                        <Row gutter={16}>
                                            <Col span={12}>
                                                <div><strong>Học kỳ:</strong> {selectedTuition.semesterName}</div>
                                                <div><strong>Số tiền cần thanh toán:</strong> <span style={{ color: '#f50', fontWeight: 'bold' }}>{selectedTuition.remaining.toLocaleString('vi-VN')}đ</span></div>
                                            </Col>
                                            <Col span={12}>
                                                <div><strong>Hạn thanh toán:</strong> {dayjs(selectedTuition.dueDate).format('DD/MM/YYYY')}</div>
                                                <div><strong>Trạng thái:</strong> {getStatusTag(selectedTuition.status)}</div>
                                            </Col>
                                        </Row>
                                    }
                                    type="info"
                                    showIcon
                                    style={{ marginBottom: 16 }}
                                />

                                <Tabs activeKey={activePaymentTab} onChange={setActivePaymentTab}>
                                    {/* Bank Transfer Tab */}
                                    <TabPane
                                        tab={
                                            <span>
                                                <BankOutlined />
                                                Chuyển khoản ngân hàng
                                            </span>
                                        }
                                        key="bank"
                                    >
                                        <Row gutter={[16, 16]}>
                                            <Col span={12}>
                                                <Card title="Thông tin chuyển khoản" size="small">
                                                    <div style={{ marginBottom: 12 }}>
                                                        <Text type="secondary">Ngân hàng:</Text>
                                                        <div><Text strong>{paymentConfig.bankName || 'Chưa cấu hình'}</Text></div>
                                                    </div>

                                                    <div style={{ marginBottom: 12 }}>
                                                        <Text type="secondary">Số tài khoản:</Text>
                                                        <div>
                                                            <Text strong copyable>
                                                                {paymentConfig.bankAccountNo || 'Chưa cấu hình'}
                                                            </Text>
                                                        </div>
                                                    </div>

                                                    <div style={{ marginBottom: 12 }}>
                                                        <Text type="secondary">Chủ tài khoản:</Text>
                                                        <div><Text strong>{paymentConfig.bankAccountName || 'Chưa cấu hình'}</Text></div>
                                                    </div>

                                                    <div style={{ marginBottom: 12 }}>
                                                        <Text type="secondary">Số tiền:</Text>
                                                        <div>
                                                            <Text strong style={{ fontSize: 16, color: '#f50' }}>
                                                                {selectedTuition.remaining.toLocaleString('vi-VN')}đ
                                                            </Text>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <Text type="secondary">Nội dung chuyển khoản:</Text>
                                                        <Input.TextArea
                                                            value={getTransactionId()}
                                                            autoSize={{ minRows: 2 }}
                                                            readOnly
                                                            style={{ fontFamily: 'monospace', fontSize: 12, marginTop: 4 }}
                                                        />
                                                        <Button
                                                            size="small"
                                                            icon={copied ? <CheckCircleOutlined /> : <CopyOutlined />}
                                                            onClick={() => handleCopy(getTransactionId())}
                                                            style={{ marginTop: 8 }}
                                                        >
                                                            {copied ? 'Đã sao chép' : 'Sao chép nội dung'}
                                                        </Button>
                                                    </div>
                                                </Card>
                                            </Col>

                                            <Col span={12}>
                                                <Card title="Quét mã QR thanh toán" size="small">
                                                    <div style={{ textAlign: 'center' }}>
                                                        {paymentConfig.bankAccountNo ? (
                                                            <>
                                                                <div style={{
                                                                    padding: 16,
                                                                    backgroundColor: '#fff',
                                                                    display: 'inline-block',
                                                                    borderRadius: 8,
                                                                    border: '1px solid #e8e8e8'
                                                                }}>
                                                                    <img
                                                                        src={generateVietQRData()}
                                                                        alt="VietQR Code"
                                                                        style={{ width: 200, height: 200 }}
                                                                        onError={(e) => {
                                                                            console.error('QR Image load error');
                                                                            e.currentTarget.style.display = 'none';
                                                                            const parent = e.currentTarget.parentElement;
                                                                            if (parent) {
                                                                                parent.innerHTML = '<div style="padding: 20px; text-align: center;"><WarningOutlined style="font-size: 48px; color: #f50;" /><p>Không thể tải mã QR. Vui lòng sử dụng thông tin chuyển khoản bên cạnh.</p></div>';
                                                                            }
                                                                        }}
                                                                    />
                                                                </div>
                                                                <Paragraph style={{ marginTop: 16 }}>
                                                                    <Text type="secondary">
                                                                        Quét mã QR bằng ứng dụng ngân hàng để chuyển khoản nhanh
                                                                    </Text>
                                                                </Paragraph>
                                                            </>
                                                        ) : (
                                                            <Alert
                                                                message="Chưa cấu hình thông tin ngân hàng"
                                                                description="Vui lòng liên hệ admin để cập nhật thông tin tài khoản ngân hàng."
                                                                type="warning"
                                                                showIcon
                                                            />
                                                        )}
                                                    </div>
                                                </Card>
                                            </Col>
                                        </Row>

                                        <Divider />

                                        <Alert
                                            message="Hướng dẫn thanh toán"
                                            description={
                                                <ol style={{ margin: '8px 0 0 20px', padding: 0 }}>
                                                    <li>Mở ứng dụng ngân hàng trên điện thoại</li>
                                                    <li>Chọn tính năng "Quét mã QR"</li>
                                                    <li>Quét mã QR bên cạnh, thông tin sẽ tự động điền</li>
                                                    <li>Kiểm tra lại số tiền và nội dung chuyển khoản</li>
                                                    <li>Xác nhận chuyển khoản</li>
                                                    <li>Nhập mã giao dịch bên dưới để xác nhận</li>
                                                </ol>
                                            }
                                            type="info"
                                            showIcon
                                            style={{ marginBottom: 16 }}
                                        />

                                        <Form form={qrForm} onFinish={handleSubmitQRPayment}>
                                            <Form.Item
                                                name="transactionId"
                                                label="Mã giao dịch"
                                                rules={[{ required: true, message: 'Vui lòng nhập mã giao dịch từ ngân hàng' }]}
                                            >
                                                <Input placeholder="VD: 1234567890" />
                                            </Form.Item>

                                            <Form.Item>
                                                <Button
                                                    type="primary"
                                                    htmlType="submit"
                                                    loading={submitting}
                                                    block
                                                    size="large"
                                                    icon={<CheckCircleOutlined />}
                                                >
                                                    Xác nhận đã chuyển khoản
                                                </Button>
                                            </Form.Item>
                                        </Form>
                                    </TabPane>

                                    {/* Momo Payment Tab */}
                                    {paymentConfig.momoEnabled && (
                                        <TabPane
                                            tab={
                                                <span>
                                                    <MobileOutlined />
                                                    Ví Momo
                                                </span>
                                            }
                                            key="momo"
                                        >
                                            <Row gutter={[16, 16]}>
                                                <Col span={12}>
                                                    <Card title="Thanh toán qua Momo" size="small">
                                                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                                            <div style={{ fontSize: 48 }}>💜</div>
                                                            <Title level={3} style={{ marginTop: 16, color: '#d82c2c' }}>
                                                                {selectedTuition.remaining.toLocaleString('vi-VN')}đ
                                                            </Title>
                                                            <Tag color="blue">{selectedTuition.semesterName}</Tag>
                                                            <Divider />
                                                            <Button
                                                                type="primary"
                                                                block
                                                                size="large"
                                                                icon={<MobileOutlined />}
                                                                onClick={() => {
                                                                    window.open('https://momo.vn', '_blank');
                                                                }}
                                                                style={{ backgroundColor: '#d82c2c', borderColor: '#d82c2c' }}
                                                            >
                                                                Mở ứng dụng Momo
                                                            </Button>
                                                        </div>
                                                    </Card>
                                                </Col>

                                                <Col span={12}>
                                                    <Card title="Quét mã QR Momo" size="small">
                                                        <div style={{ textAlign: 'center' }}>
                                                            <div style={{
                                                                padding: 16,
                                                                backgroundColor: '#fff',
                                                                display: 'inline-block',
                                                                borderRadius: 8,
                                                                border: '1px solid #e8e8e8'
                                                            }}>
                                                                <QRCode
                                                                    value={`MOMO|${selectedTuition.tuitionId}|${selectedTuition.remaining}|${Date.now()}`}
                                                                    size={200}
                                                                    level="H"
                                                                />
                                                            </div>
                                                            <Paragraph style={{ marginTop: 16 }}>
                                                                <Text type="secondary">
                                                                    Mở ứng dụng Momo, chọn "Quét mã" để thanh toán nhanh
                                                                </Text>
                                                            </Paragraph>
                                                        </div>
                                                    </Card>
                                                </Col>
                                            </Row>

                                            <Divider />

                                            <Alert
                                                message="Thanh toán qua Momo"
                                                description="Sau khi thanh toán thành công trên ứng dụng Momo, vui lòng nhập mã giao dịch để xác nhận."
                                                type="info"
                                                showIcon
                                                style={{ marginBottom: 16 }}
                                            />

                                            <Form form={qrForm} onFinish={handleSubmitQRPayment}>
                                                <Form.Item
                                                    name="transactionId"
                                                    label="Mã giao dịch Momo"
                                                    rules={[{ required: true, message: 'Vui lòng nhập mã giao dịch từ Momo' }]}
                                                >
                                                    <Input placeholder="Nhập mã giao dịch" />
                                                </Form.Item>

                                                <Form.Item>
                                                    <Button
                                                        type="primary"
                                                        htmlType="submit"
                                                        loading={submitting}
                                                        block
                                                        size="large"
                                                        icon={<CheckCircleOutlined />}
                                                    >
                                                        Xác nhận thanh toán
                                                    </Button>
                                                </Form.Item>
                                            </Form>
                                        </TabPane>
                                    )}
                                </Tabs>
                            </>
                        ) : (
                            <Alert
                                message="Đang tải thông tin thanh toán..."
                                type="info"
                                showIcon
                            />
                        )}
                    </Spin>
                )}
            </Modal>
        </div>
    );
};

export default MyTuitions;