import React, { useState, useEffect } from 'react';
import {
    Modal,
    Button,
    Space,
    Typography,
    Alert,
    Input,
    Form,
    message,
    Tabs,
    Spin,
    Row,
    Col,
    Card,
    Divider,
    Tag,
    Tooltip,
} from 'antd';
import {
    CopyOutlined,
    CheckOutlined,
    QrcodeOutlined,
    BankOutlined,
    MobileOutlined,
    WalletOutlined
} from '@ant-design/icons';
import { QRCodeCanvas } from 'qrcode.react'; 
import api from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface QRPaymentModalProps {
    visible: boolean;
    onCancel: () => void;
    amount: number;
    tuitionId: number;
    semesterName: string;
    onSuccess: () => void;
}

interface PaymentConfig {
    bankName: string;
    bankAccountNo: string;
    bankAccountName: string;
    momoEnabled: boolean;
    qrCodeType: string;
    momoPartnerCode?: string; // ✅ FIX TYPE
}

const QRPaymentModal: React.FC<QRPaymentModalProps> = ({
    visible,
    onCancel,
    amount,
    tuitionId,
    semesterName,
    onSuccess
}) => {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
    const [copied, setCopied] = useState(false);
    const [form] = Form.useForm();
    const [activeTab, setActiveTab] = useState('bank');

    const fetchPaymentConfig = async () => {
        setLoading(true);
        try {
            const response = await api.get('/SystemConfigs/payment-config');
            setPaymentConfig(response.data);
        } catch (error) {
            message.error('Không thể tải cấu hình thanh toán');
        } finally {
            setLoading(false);
        }
    };

    const generateVietQRData = () => {
        if (!paymentConfig) return '';
        const bankCode = getBankCode(paymentConfig.bankName);
        const accountNo = paymentConfig.bankAccountNo;
        const description = `THANHTOAN_HOCPHI_${tuitionId}_${Date.now()}`;

        return `https://img.vietqr.io/image/${bankCode}-${accountNo}-compact2.png?amount=${amount}&addInfo=${description}&accountName=${encodeURIComponent(paymentConfig.bankAccountName)}`;
    };

    const generateMomoQRData = () => {
        const orderId = `TUITION_${tuitionId}_${Date.now()}`;
        return `https://api.momo.vn/v2/create-qr?amount=${amount}&orderId=${orderId}`;
    };

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
            'SHB': 'SHB'
        };
        return bankMap[bankName] || 'VCB';
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        message.success('Đã sao chép');
    };

    //const handleSubmitPayment = async (values: any) => {
    //    setSubmitting(true);

    //    const formData = new FormData();
    //    formData.append('tuitionId', tuitionId.toString());
    //    formData.append('amount', amount.toString());
    //    formData.append('paymentMethod', activeTab === 'bank' ? 'BANK_TRANSFER' : 'MOMO');
    //    formData.append('transactionId', values.transactionId || '');

    //    try {
    //        await api.post('/Tuitions/payment', formData, {
    //            headers: { 'Content-Type': 'multipart/form-data' }
    //        });
    //        message.success('Gửi yêu cầu thanh toán thành công!');
    //        onSuccess();
    //        onCancel();
    //        form.resetFields();
    //    } catch (error: any) {
    //        message.error(error.response?.data?.message || 'Gửi yêu cầu thất bại');
    //    } finally {
    //        setSubmitting(false);
    //    }
    //};

    const handleSubmitPayment = async (values: any) => {
        setSubmitting(true);

        try {
            await api.post('/Tuitions/payment', {
                tuitionId: tuitionId,
                amount: amount,
                evidenceFile: values.transactionId || null
            });

            message.success('Gửi yêu cầu thanh toán thành công!');
            onSuccess();
            onCancel();
            form.resetFields();
        } catch (error: any) {
            console.error('Payment error:', error);
            message.error(error.response?.data?.message || 'Gửi yêu cầu thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        if (visible) {
            fetchPaymentConfig();
            form.resetFields();
            setActiveTab('bank');
        }
    }, [visible]);

    return (
        <Modal
            title={
                <Space>
                    <QrcodeOutlined />
                    <span>Thanh toán học phí</span>
                </Space>
            }
            open={visible}
            onCancel={onCancel}
            footer={null}
            width={700}
        >
            <Spin spinning={loading}>
                {paymentConfig && (
                    <Tabs activeKey={activeTab} onChange={setActiveTab}>

                        {/* BANK */}
                        <TabPane tab={<span><BankOutlined />Ngân hàng</span>} key="bank">
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Card title="Thông tin">
                                        <Text strong>{paymentConfig.bankName}</Text><br />
                                        <Text copyable>{paymentConfig.bankAccountNo}</Text><br />
                                        <Text>{paymentConfig.bankAccountName}</Text><br />
                                        <Text strong>{amount.toLocaleString()}đ</Text>
                                    </Card>
                                </Col>

                                <Col span={12}>
                                    <Card title="QR Code">
                                        <div style={{ textAlign: 'center' }}>
                                            <img src={generateVietQRData()} width={200} />
                                        </div>
                                    </Card>
                                </Col>
                            </Row>
                        </TabPane>

                        {/* MOMO */}
                        {paymentConfig.momoEnabled && (
                            <TabPane tab={<span><MobileOutlined />Momo</span>} key="momo">
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Card>
                                            <Title level={4}>{amount.toLocaleString()}đ</Title>
                                        </Card>
                                    </Col>

                                    <Col span={12}>
                                        <Card title="QR Momo">
                                            <div style={{ textAlign: 'center' }}>
                                                <QRCodeCanvas
                                                    value={generateMomoQRData()}
                                                    size={200}
                                                />
                                            </div>
                                        </Card>
                                    </Col>
                                </Row>
                            </TabPane>
                        )}

                    </Tabs>
                )}
            </Spin>
        </Modal>
    );
};

export default QRPaymentModal;