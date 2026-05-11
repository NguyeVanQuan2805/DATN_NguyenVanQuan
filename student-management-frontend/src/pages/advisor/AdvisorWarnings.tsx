import React, { useEffect, useState, useContext } from 'react';
import {
    Card,
    Table,
    Tag,
    Badge,
    Spin,
    message,
    Input,
    Space,
    Statistic,
    Row,
    Col,
    Button,
    Tooltip,
    Modal,
    Descriptions,
    Typography,
    Empty,
    Tabs,
    Alert,
} from 'antd';
import {
    WarningOutlined,
    UsergroupAddOutlined,
    CheckCircleOutlined,
    EyeOutlined,
    ReloadOutlined,
    SearchOutlined,
    ClockCircleOutlined,
    ExclamationCircleOutlined,
} from '@ant-design/icons';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface WarningDetail {
    studentID: string;
    studentCode: string;
    fullName: string;
    warningReason: string;
    issuedDate: string;
    semester: string;
    warningId: number;
    status: string;
    warningLevel: number;
}

interface WarningGroup {
    level: number;
    count: number;
    students: WarningDetail[];
}

const AdvisorWarnings: React.FC = () => {
    const { user } = useContext(AuthContext)!;
    const advisorId = user?.advisorId;

    const [activeGroups, setActiveGroups] = useState<WarningGroup[]>([]);
    const [resolvedGroups, setResolvedGroups] = useState<WarningGroup[]>([]);
    const [totalActive, setTotalActive] = useState(0);
    const [totalResolved, setTotalResolved] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [filteredActive, setFilteredActive] = useState<WarningGroup[]>([]);
    const [filteredResolved, setFilteredResolved] = useState<WarningGroup[]>([]);
    const [selectedWarning, setSelectedWarning] = useState<WarningDetail | null>(null);
    const [activeTab, setActiveTab] = useState('active');
    const [processingId, setProcessingId] = useState<number | null>(null);

    // Load dữ liệu từ API
    const fetchWarnings = async () => {
        if (!advisorId) {
            message.error('Không tìm thấy thông tin cố vấn');
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const res = await api.get(`/Warnings/advisor-summary/${advisorId}`);
            console.log('API Response:', res.data);

            setTotalActive(res.data.totalActiveWarnings || 0);
            setTotalResolved(res.data.totalResolvedWarnings || 0);

            // Xử lý active warnings
            const activeRaw = res.data.byLevel || [];
            const activeEnriched = activeRaw.map((group: any) => ({
                level: group.level,
                count: group.count,
                students: (group.students || []).map((st: any) => ({
                    studentID: st.studentID || '',
                    studentCode: st.studentCode || 'N/A',
                    fullName: st.fullName || 'N/A',
                    warningReason: st.warningReason || 'Không rõ lý do',
                    issuedDate: st.issuedDate || new Date().toISOString(),
                    semester: st.semester || 'N/A',
                    warningId: st.warningId,
                    status: st.status || 'ACTIVE',
                    warningLevel: group.level
                }))
            }));
            setActiveGroups(activeEnriched);
            setFilteredActive(activeEnriched);

            // Xử lý resolved warnings
            const resolvedRaw = res.data.resolvedByLevel || [];
            const resolvedEnriched = resolvedRaw.map((group: any) => ({
                level: group.level,
                count: group.count,
                students: (group.students || []).map((st: any) => ({
                    studentID: st.studentID || '',
                    studentCode: st.studentCode || 'N/A',
                    fullName: st.fullName || 'N/A',
                    warningReason: st.warningReason || 'Không rõ lý do',
                    issuedDate: st.issuedDate || new Date().toISOString(),
                    semester: st.semester || 'N/A',
                    warningId: st.warningId,
                    status: st.status || 'RESOLVED',
                    warningLevel: group.level
                }))
            }));
            setResolvedGroups(resolvedEnriched);
            setFilteredResolved(resolvedEnriched);

        } catch (err: any) {
            console.error('Lỗi tải cảnh báo:', err);
            message.error('Không thể tải danh sách cảnh báo học vụ');
            setActiveGroups([]);
            setResolvedGroups([]);
            setFilteredActive([]);
            setFilteredResolved([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWarnings();
    }, [advisorId]);

    // Tìm kiếm
    useEffect(() => {
        if (!searchText.trim()) {
            setFilteredActive(activeGroups);
            setFilteredResolved(resolvedGroups);
            return;
        }

        const lowerSearch = searchText.toLowerCase();

        const filteredActiveGroups = activeGroups
            .map((group) => ({
                ...group,
                students: group.students.filter(
                    (st) =>
                        st.fullName.toLowerCase().includes(lowerSearch) ||
                        st.studentCode.toLowerCase().includes(lowerSearch) ||
                        (st.warningReason && st.warningReason.toLowerCase().includes(lowerSearch))
                ),
            }))
            .filter((group) => group.students.length > 0);
        setFilteredActive(filteredActiveGroups);

        const filteredResolvedGroups = resolvedGroups
            .map((group) => ({
                ...group,
                students: group.students.filter(
                    (st) =>
                        st.fullName.toLowerCase().includes(lowerSearch) ||
                        st.studentCode.toLowerCase().includes(lowerSearch) ||
                        (st.warningReason && st.warningReason.toLowerCase().includes(lowerSearch))
                ),
            }))
            .filter((group) => group.students.length > 0);
        setFilteredResolved(filteredResolvedGroups);

    }, [searchText, activeGroups, resolvedGroups]);

    // Xử lý giải quyết cảnh báo
    const handleResolve = async (warning: WarningDetail) => {
        if (!warning.warningId) {
            message.error('Không tìm thấy ID cảnh báo. Vui lòng kiểm tra lại dữ liệu!');
            return;
        }

        Modal.confirm({
            title: `Giải quyết cảnh báo cho SV ${warning.studentCode}?`,
            icon: <ExclamationCircleOutlined />,
            content: (
                <div>
                    <p>Sinh viên: <strong>{warning.fullName}</strong></p>
                    <p>Lý do: {warning.warningReason}</p>
                    <p>Sau khi giải quyết, cảnh báo sẽ chuyển sang trạng thái <Tag color="success">ĐÃ GIẢI QUYẾT</Tag></p>
                </div>
            ),
            okText: 'Xác nhận giải quyết',
            okType: 'primary',
            cancelText: 'Hủy',
            onOk: async () => {
                setProcessingId(warning.warningId);
                try {
                    await api.put(`/Warnings/${warning.warningId}`, {
                        status: 'RESOLVED',
                        resolutionNotes: 'Đã gặp và hướng dẫn sinh viên cải thiện',
                    });

                    message.success('Cảnh báo đã được giải quyết thành công!');
                    fetchWarnings();

                } catch (err: any) {
                    console.error('Lỗi cập nhật cảnh báo:', err);
                    const errorMsg = err.response?.data?.message || err.response?.data || 'Không thể cập nhật trạng thái cảnh báo';
                    message.error(errorMsg);
                } finally {
                    setProcessingId(null);
                }
            },
        });
    };

    const getColorByLevel = (level: number) => {
        switch (level) {
            case 1: return 'warning';
            case 2: return 'orange';
            case 3: return 'error';
            default: return 'default';
        }
    };

    const getLevelText = (level: number) => {
        switch (level) {
            case 1: return 'Mức 1 - Nhẹ';
            case 2: return 'Mức 2 - Trung bình';
            case 3: return 'Mức 3 - Nghiêm trọng';
            default: return `Mức ${level}`;
        }
    };

    // Component hiển thị bảng cảnh báo
    const renderWarningTable = (groups: WarningGroup[], showActions: boolean) => {
        if (groups.length === 0) {
            return (
                <Card style={{ borderRadius: 12, marginTop: 16 }}>
                    <Empty
                        description={searchText
                            ? 'Không tìm thấy cảnh báo nào phù hợp'
                            : 'Không có cảnh báo nào'}
                    />
                </Card>
            );
        }

        return groups.map((group) => (
            <Card
                key={group.level}
                title={
                    <Space>
                        <Tag color={getColorByLevel(group.level)} style={{ fontSize: 14, padding: '4px 12px' }}>
                            {getLevelText(group.level)}
                        </Tag>
                        <Badge
                            count={group.count}
                            style={{ backgroundColor: getColorByLevel(group.level) }}
                            showZero
                        />
                    </Space>
                }
                style={{ marginBottom: 24, borderRadius: 12 }}
            >
                <Table
                    columns={[
                        {
                            title: 'Mã SV',
                            dataIndex: 'studentCode',
                            key: 'studentCode',
                            width: 120,
                            render: (code: string) => <Text code style={{ color: '#722ed1' }}>{code}</Text>
                        },
                        { title: 'Họ tên', dataIndex: 'fullName', key: 'fullName' },
                        {
                            title: 'Lý do',
                            dataIndex: 'warningReason',
                            key: 'warningReason',
                            ellipsis: true
                        },
                        {
                            title: 'Học kỳ',
                            dataIndex: 'semester',
                            key: 'semester',
                            width: 140,
                        },
                        {
                            title: 'Ngày',
                            dataIndex: 'issuedDate',
                            key: 'issuedDate',
                            render: (date: string) => new Date(date).toLocaleDateString('vi-VN'),
                            width: 100,
                        },
                        {
                            title: 'Hành động',
                            key: 'action',
                            width: 160,
                            render: (_, record: WarningDetail) => (
                                <Space>
                                    <Tooltip title="Xem chi tiết">
                                        <Button
                                            type="primary"
                                            icon={<EyeOutlined />}
                                            size="small"
                                            onClick={() => setSelectedWarning(record)}
                                            style={{ background: '#722ed1', borderColor: '#722ed1' }}
                                        />
                                    </Tooltip>
                                    {showActions && (
                                        <Tooltip title="Giải quyết cảnh báo">
                                            <Button
                                                type="primary"
                                                size="small"
                                                icon={<CheckCircleOutlined />}
                                                loading={processingId === record.warningId}
                                                onClick={() => handleResolve(record)}
                                                style={{ background: '#52c41a', borderColor: '#52c41a' }}
                                            >
                                                Giải quyết
                                            </Button>
                                        </Tooltip>
                                    )}
                                </Space>
                            ),
                        },
                    ]}
                    dataSource={group.students}
                    rowKey={(record) => `${record.studentID}-${record.warningId}`}
                    pagination={{ pageSize: 10 }}
                    size="middle"
                />
            </Card>
        ));
    };

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
                <Title level={3} style={{ color: '#fff', margin: 0 }}>
                    <WarningOutlined style={{ marginRight: 10 }} />
                    Cảnh báo học vụ
                </Title>
                <Button
                    icon={<ReloadOutlined />}
                    onClick={fetchWarnings}
                    loading={loading}
                    style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}
                >
                    Làm mới
                </Button>
            </div>

            {/* Stats */}
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                <Col span={8}>
                    <Card size="small" style={{ background: '#f9f0ff', borderRadius: 10 }}>
                        <Statistic
                            title="Cảnh báo đang hoạt động"
                            value={totalActive}
                            valueStyle={{ color: totalActive > 0 ? '#cf1322' : '#52c41a' }}
                            prefix={<WarningOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card size="small" style={{ background: '#fff7e6', borderRadius: 10 }}>
                        <Statistic
                            title="Sinh viên bị cảnh báo"
                            value={new Set([
                                ...activeGroups.flatMap(g => g.students.map(s => s.studentID)),
                                ...resolvedGroups.flatMap(g => g.students.map(s => s.studentID))
                            ]).size}
                            prefix={<UsergroupAddOutlined style={{ color: '#d46b08' }} />}
                            valueStyle={{ color: '#d46b08' }}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card size="small" style={{ background: '#e6f4ff', borderRadius: 10 }}>
                        <Statistic
                            title="Đã giải quyết"
                            value={totalResolved}
                            valueStyle={{ color: '#52c41a' }}
                            prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Search */}
            <Card style={{ marginBottom: 20, borderRadius: 10 }}>
                <Input
                    placeholder="Tìm theo tên SV, mã SV, lý do cảnh báo..."
                    prefix={<SearchOutlined />}
                    allowClear
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: '100%' }}
                />
            </Card>

            {/* Debug: Hiển thị nếu không có warningId */}
            {activeGroups.some(g => g.students.some(s => !s.warningId)) && (
                <Alert
                    type="warning"
                    showIcon
                    message="Dữ liệu cảnh báo thiếu ID"
                    description="Một số cảnh báo không có warningId, chức năng giải quyết sẽ không hoạt động. Vui lòng kiểm tra API backend."
                    style={{ marginBottom: 16, borderRadius: 8 }}
                />
            )}

            {/* Tabs */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <Spin size="large" tip="Đang tải danh sách cảnh báo..." />
                </div>
            ) : (
                <Tabs activeKey={activeTab} onChange={setActiveTab} type="card">
                    <TabPane
                        tab={<span><WarningOutlined /> Đang hoạt động ({totalActive})</span>}
                        key="active"
                    >
                        {renderWarningTable(filteredActive, true)}
                    </TabPane>
                    <TabPane
                        tab={<span><CheckCircleOutlined /> Đã giải quyết ({totalResolved})</span>}
                        key="resolved"
                    >
                        {renderWarningTable(filteredResolved, false)}
                    </TabPane>
                </Tabs>
            )}

            {/* Modal chi tiết cảnh báo - ĐÃ XÓA NÚT "Xem chi tiết" thừa */}
            <Modal
                title={selectedWarning ? `Chi tiết cảnh báo - ${selectedWarning.fullName}` : ''}
                open={!!selectedWarning}
                onCancel={() => setSelectedWarning(null)}
                footer={[
                    <Button key="close" onClick={() => setSelectedWarning(null)}>
                        Đóng
                    </Button>,
                    selectedWarning?.status === 'ACTIVE' && (
                        <Button
                            key="resolve"
                            type="primary"
                            icon={<CheckCircleOutlined />}
                            onClick={() => {
                                if (selectedWarning) {
                                    const warning = selectedWarning;
                                    setSelectedWarning(null);
                                    handleResolve(warning);
                                }
                            }}
                            style={{ background: '#52c41a', borderColor: '#52c41a' }}
                        >
                            Giải quyết ngay
                        </Button>
                    )
                ]}
                width={700}
            >
                {selectedWarning && (
                    <Descriptions bordered column={2}>
                        <Descriptions.Item label="Mã SV" span={2}>
                            <Text strong style={{ color: '#722ed1' }}>{selectedWarning.studentCode}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Họ tên">{selectedWarning.fullName}</Descriptions.Item>
                        <Descriptions.Item label="Mức">
                            <Tag color={getColorByLevel(selectedWarning.warningLevel)}>
                                {getLevelText(selectedWarning.warningLevel)}
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Lý do" span={2}>
                            <Text>{selectedWarning.warningReason}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Học kỳ">{selectedWarning.semester}</Descriptions.Item>
                        <Descriptions.Item label="Ngày phát hành">
                            {new Date(selectedWarning.issuedDate).toLocaleString('vi-VN')}
                        </Descriptions.Item>
                        <Descriptions.Item label="Trạng thái">
                            <Tag color={selectedWarning.status === 'ACTIVE' ? 'error' : 'success'}>
                                {selectedWarning.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã giải quyết'}
                            </Tag>
                        </Descriptions.Item>
                        {selectedWarning.warningId && (
                            <Descriptions.Item label="ID Cảnh báo">
                                <Text code>{selectedWarning.warningId}</Text>
                            </Descriptions.Item>
                        )}
                    </Descriptions>
                )}
            </Modal>
        </div>
    );
};

export default AdvisorWarnings;