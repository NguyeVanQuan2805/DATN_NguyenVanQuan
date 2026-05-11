// src/pages/admin/MaintenancePage.tsx
import { Card, Switch, Typography, message, Spin, Button, Space } from 'antd';
import { useEffect, useState } from 'react';
import api from '../../services/api';
import { PoweroffOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const MaintenancePage = () => {
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await api.get('/SystemConfigs/MaintenanceMode');
            setMaintenanceMode(res.data.configValue === '1');
        } catch {
            message.error('Không thể tải trạng thái bảo trì');
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (checked: boolean) => {
        try {
            await api.put('/SystemConfigs/MaintenanceMode', {
                configKey: 'MaintenanceMode',
                configValue: checked ? '1' : '0',
                description: '0: Tắt bảo trì, 1: Bật bảo trì',
            });
            setMaintenanceMode(checked);
            message.success(`Hệ thống đã ${checked ? 'bật' : 'tắt'} chế độ bảo trì`);

            // Thông báo thêm về tác dụng
            if (checked) {
                message.info('Lưu ý: Chỉ tài khoản ADMIN mới có thể đăng nhập khi bật bảo trì');
            }
        } catch {
            message.error('Không thể cập nhật trạng thái bảo trì');
        }
    };

    if (loading) return <Spin tip="Đang tải..." />;

    return (
        <div style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
            <Title level={2}>Bảo trì hệ thống </Title>
            <Card>
                <Text strong>Trạng thái hiện tại: </Text>
                <Text type={maintenanceMode ? 'danger' : 'success'}>
                    {maintenanceMode ? 'ĐANG BẢO TRÌ' : 'Hoạt động bình thường'}
                </Text>

                <div style={{ marginTop: 24 }}>
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        <Switch
                            checked={maintenanceMode}
                            onChange={handleToggle}
                            checkedChildren={<PoweroffOutlined />}
                            unCheckedChildren={<PoweroffOutlined />}
                            style={{
                                backgroundColor: maintenanceMode ? '#ff4d4f' : '#52c41a'
                            }}
                        />

                        <Card size="small" style={{ background: '#f5f5f5' }}>
                            <Text type="secondary">
                                {maintenanceMode
                                    ? '🔴 Khi bật: Chỉ ADMIN đăng nhập được. Các vai trò khác sẽ nhận lỗi 503 và bị chuyển hướng.'
                                    : '🟢 Khi tắt: Tất cả người dùng đều đăng nhập bình thường.'}
                            </Text>
                        </Card>

                        <Button
                            type="primary"
                            href="/login"
                            target="_blank"
                            style={{ background: '#722ed1', borderColor: '#722ed1' }}
                        >
                            Mở trang đăng nhập (test)
                        </Button>
                    </Space>
                </div>
            </Card>
        </div>
    );
};

export default MaintenancePage;