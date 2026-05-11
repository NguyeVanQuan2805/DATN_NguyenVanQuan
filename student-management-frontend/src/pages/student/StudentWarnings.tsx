// pages/student/StudentWarnings.tsx
import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Modal, Descriptions, message, Spin } from 'antd';
import { WarningOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface Warning {
    warningId: number;
    warningLevel: number;
    warningReason: string;
    semesterName: string;
    issuedDate: string;
    status: string;
    resolutionNotes: string;
}

interface Advisor {
    fullName: string;
    email: string;
    phone: string;
    office?: string;
}

const StudentWarnings: React.FC = () => {
    const { user } = useAuth();
    const [warnings, setWarnings] = useState<Warning[]>([]);
    const [advisor, setAdvisor] = useState<Advisor | null>(null);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Lấy danh sách cảnh báo
            const warningsRes = await api.get('/Warnings/my-warnings');
            setWarnings(warningsRes.data || []);

            // Lấy thông tin cố vấn
            try {
                const advisorRes = await api.get(`/Students/${user?.studentId}/advisor`);
                setAdvisor(advisorRes.data);
            } catch (err) {
                console.warn('Không lấy được thông tin cố vấn:', err);
                setAdvisor(null);
            }
        } catch (error) {
            console.error('Lỗi tải dữ liệu:', error);
            message.error('Không thể tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    const showAdvisorInfo = () => {
        if (!advisor) {
            message.warning('Chưa có cố vấn học tập được gán. Vui lòng liên hệ phòng đào tạo.');
            return;
        }

        Modal.info({
            title: 'Thông tin cố vấn học tập',
            icon: <WarningOutlined />,
            content: (
                <div>
                    <Descriptions column={1} bordered>
                        <Descriptions.Item label="Họ tên">
                            {advisor.fullName}
                        </Descriptions.Item>
                        <Descriptions.Item label="Email">
                            <a href={`mailto:${advisor.email}`}>
                                <MailOutlined /> {advisor.email}
                            </a>
                        </Descriptions.Item>
                        <Descriptions.Item label="Số điện thoại">
                            <a href={`tel:${advisor.phone}`}>
                                <PhoneOutlined /> {advisor.phone}
                            </a>
                        </Descriptions.Item>
                        {advisor.office && (
                            <Descriptions.Item label="Văn phòng">
                                {advisor.office}
                            </Descriptions.Item>
                        )}
                    </Descriptions>
                    <div style={{ marginTop: 16, padding: 12, background: '#fff7e6', borderRadius: 8 }}>
                        <strong>Lưu ý:</strong> Vui lòng liên hệ cố vấn học tập để được tư vấn và hỗ trợ.
                    </div>
                </div>
            ),
            width: 500,
        });
    };

    const columns = [
        {
            title: 'Mức độ',
            dataIndex: 'warningLevel',
            key: 'warningLevel',
            render: (level: number) => {
                const colors = { 1: 'orange', 2: '#ff7a45', 3: 'red' };
                return <Tag color={colors[level as keyof typeof colors] || 'default'}>Mức {level}</Tag>;
            },
        },
        {
            title: 'Lý do',
            dataIndex: 'warningReason',
            key: 'warningReason',
        },
        {
            title: 'Học kỳ',
            dataIndex: 'semesterName',
            key: 'semesterName',
        },
        {
            title: 'Ngày cảnh báo',
            dataIndex: 'issuedDate',
            key: 'issuedDate',
            render: (date: string) => new Date(date).toLocaleDateString('vi-VN'),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag color={status === 'ACTIVE' ? 'red' : 'green'}>
                    {status === 'ACTIVE' ? 'Đang cảnh báo' : 'Đã xử lý'}
                </Tag>
            ),
        },
    ];

    return (
        <div>
            <Card
                title={
                    <span>
                        <WarningOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                        Cảnh báo học vụ
                    </span>
                }
                extra={
                    <Button type="primary" onClick={showAdvisorInfo}>
                        Liên hệ cố vấn
                    </Button>
                }
            >
                <Spin spinning={loading}>
                    {warnings.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                            <WarningOutlined style={{ fontSize: 48, color: '#52c41a' }} />
                            <p style={{ marginTop: 16 }}>Chúc mừng! Bạn không có cảnh báo học vụ nào.</p>
                        </div>
                    ) : (
                        <Table
                            columns={columns}
                            dataSource={warnings}
                            rowKey="warningId"
                            pagination={false}
                        />
                    )}
                </Spin>
            </Card>
        </div>
    );
};

export default StudentWarnings;