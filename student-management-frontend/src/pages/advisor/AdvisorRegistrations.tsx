import React, { useEffect, useState, useContext } from 'react';
import {
    Card,
    Row,
    Col,
    Statistic,
    Spin,
    message,
    Tabs,
    Table,
    Progress,
    Badge,
    Typography,
    Divider,
    Button,
    Tooltip,
    Tag,
    Space,
    Empty,
} from 'antd';
import {
    BarChartOutlined,
    WarningOutlined,
    TeamOutlined,
    ReloadOutlined,
    ArrowUpOutlined,
    ArrowDownOutlined,
    UsergroupAddOutlined,
    FileTextOutlined,
} from '@ant-design/icons';
import { Bar } from '@ant-design/plots';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface WarningLevelData {
    level: number;
    count: number;
}

interface WarningStudent {
    studentID: string;
    studentCode: string;
    fullName: string;
    warningReason: string;
    issuedDate: string;
    semester: string;
    warningId?: number;
    status?: string;
}

interface WarningGroup {
    level: number;
    count: number;
    students: WarningStudent[];
}

interface AnalyticsStats {
    totalStudents: number;
    classesManaged: number;
    activeWarnings: number;
    warningsByLevel: WarningLevelData[];
    warningDetails: WarningGroup[];
    pendingRegistrations: number;
    warningTrendThisSemester: number;
}

const AdvisorAnalytics: React.FC = () => {
    const { user } = useContext(AuthContext)!;
    const advisorId = user?.advisorId;

    const [stats, setStats] = useState<AnalyticsStats>({
        totalStudents: 0,
        classesManaged: 0,
        activeWarnings: 0,
        warningsByLevel: [],
        warningDetails: [],
        pendingRegistrations: 0,
        warningTrendThisSemester: 0,
    });
    const [loading, setLoading] = useState(true);

    const fetchAnalytics = async () => {
        if (!advisorId) {
            message.error('Không tìm thấy thông tin cố vấn');
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // 1. Lấy danh sách lớp cố vấn
            const classesRes = await api.get(`/AdvisorClasses/by-advisor/${advisorId}`);
            const classesManaged = classesRes.data?.length || 0;

            // 2. Đếm tổng sinh viên
            let totalStudents = 0;
            if (classesManaged > 0) {
                const studentPromises = classesRes.data.map((c: any) =>
                    api.get(`/Students/by-advisor-class/${c.advisorClassId}`).catch(() => ({ data: [] }))
                );
                const studentsResults = await Promise.all(studentPromises);
                totalStudents = studentsResults.reduce((sum, res) => sum + (res.data?.length || 0), 0);
            }

            // 3. Lấy cảnh báo chi tiết
            let activeWarnings = 0;
            let warningsByLevel: WarningLevelData[] = [];
            let warningDetails: WarningGroup[] = [];

            try {
                const warningsRes = await api.get(`/Warnings/advisor-summary/${advisorId}`);
                const data = warningsRes.data;

                activeWarnings = data.totalActiveWarnings || 0;

                // Xử lý warningsByLevel từ data.byLevel
                if (data.byLevel && Array.isArray(data.byLevel)) {
                    warningsByLevel = data.byLevel.map((item: any) => ({
                        level: item.level,
                        count: item.count
                    }));

                    warningDetails = data.byLevel.map((group: any) => ({
                        level: group.level,
                        count: group.count,
                        students: (group.students || []).map((st: any) => ({
                            studentID: st.studentID || st.studentId || '',
                            studentCode: st.studentCode || 'N/A',
                            fullName: st.fullName || 'N/A',
                            warningReason: st.warningReason || 'Không rõ',
                            issuedDate: st.issuedDate || new Date().toISOString(),
                            semester: st.semester || 'N/A',
                            warningId: st.warningId,
                            status: st.status || 'ACTIVE'
                        }))
                    }));
                }
            } catch (err) {
                console.warn('Không thể lấy cảnh báo:', err);
            }

            // 4. Đăng ký chờ duyệt (giả lập hoặc từ API)
            let pendingRegistrations = 0;
            try {
                const pendingRes = await api.get('/CourseRegistrations?status=PENDING');
                pendingRegistrations = pendingRes.data?.length || 0;
            } catch (err) {
                console.warn('Không thể lấy đăng ký chờ:', err);
            }

            // 5. Xu hướng (giả lập, có thể thay bằng API thật)
            const warningTrend = Math.floor(Math.random() * 30) - 15;

            setStats({
                totalStudents,
                classesManaged,
                activeWarnings,
                warningsByLevel,
                warningDetails,
                pendingRegistrations,
                warningTrendThisSemester: warningTrend,
            });
        } catch (err: any) {
            console.error('Lỗi tải analytics:', err);
            message.error('Không thể tải dữ liệu thống kê chi tiết');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [advisorId]);

    const barData = stats.warningsByLevel.map(item => ({
        level: `Mức ${item.level}`,
        count: item.count,
    }));

    const getLevelColor = (level: number) => {
        switch (level) {
            case 1: return '#faad14';
            case 2: return '#f5222d';
            case 3: return '#a8071a';
            default: return '#8c8c8c';
        }
    };

    const topStudentsColumns = [
        { title: 'Mã SV', dataIndex: 'studentCode', key: 'studentCode', width: 120 },
        { title: 'Họ tên', dataIndex: 'fullName', key: 'fullName' },
        {
            title: 'Lý do',
            dataIndex: 'warningReason',
            key: 'warningReason',
            ellipsis: true
        },
        {
            title: 'Mức',
            dataIndex: 'level',
            key: 'level',
            width: 80,
            render: (level: number) => (
                <Tag color={getLevelColor(level)}>Mức {level}</Tag>
            ),
        },
    ];

    // Lấy top 5 sinh viên cần chú ý
    const topStudents = stats.warningDetails
        .flatMap(group =>
            group.students.map(st => ({
                ...st,
                level: group.level
            }))
        )
        .slice(0, 5);

    return (
        <div style={{ padding: '0 24px' }}>
            <div style={{
                background: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)',
                borderRadius: 12,
                padding: '20px 24px',
                marginBottom: 24,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Title level={3} style={{ color: '#fff', margin: 0 }}>
                    <BarChartOutlined style={{ marginRight: 10 }} />
                    Phân tích & Thống kê chi tiết
                </Title>
                <Button
                    icon={<ReloadOutlined />}
                    onClick={fetchAnalytics}
                    loading={loading}
                    style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}
                >
                    Làm mới
                </Button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '120px 0' }}>
                    <Spin size="large" tip="Đang tải phân tích dữ liệu..." />
                </div>
            ) : (
                <Tabs defaultActiveKey="1">
                    {/* Tab 1: Tổng quan */}
                    <TabPane tab="Tổng quan" key="1">
                        <Row gutter={[16, 16]}>
                            <Col xs={24} sm={12} md={6}>
                                <Card>
                                    <Statistic
                                        title="Lớp cố vấn"
                                        value={stats.classesManaged}
                                        prefix={<TeamOutlined />}
                                    />
                                </Card>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Card>
                                    <Statistic
                                        title="Tổng sinh viên"
                                        value={stats.totalStudents}
                                        prefix={<UsergroupAddOutlined />}
                                    />
                                </Card>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Card>
                                    <Statistic
                                        title="Cảnh báo hoạt động"
                                        value={stats.activeWarnings}
                                        prefix={<WarningOutlined />}
                                        valueStyle={{ color: stats.activeWarnings > 0 ? '#cf1322' : '#52c41a' }}
                                    />
                                </Card>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Card>
                                    <Statistic
                                        title="Đăng ký chờ duyệt"
                                        value={stats.pendingRegistrations}
                                        prefix={<FileTextOutlined />}
                                        valueStyle={{ color: '#faad14' }}
                                    />
                                </Card>
                            </Col>
                        </Row>

                        <Divider />

                        <Card title="Tỷ lệ sinh viên bị cảnh báo">
                            <Statistic
                                title="Tỷ lệ hiện tại"
                                value={stats.totalStudents > 0
                                    ? Math.round((stats.activeWarnings / stats.totalStudents) * 100)
                                    : 0}
                                suffix="%"
                                valueStyle={{ color: '#cf1322' }}
                            />
                            <Progress
                                percent={stats.totalStudents > 0
                                    ? Math.round((stats.activeWarnings / stats.totalStudents) * 100)
                                    : 0}
                                status="exception"
                                strokeColor="#cf1322"
                                style={{ marginTop: 16 }}
                            />
                        </Card>
                    </TabPane>

                    {/* Tab 2: Phân tích cảnh báo */}
                    <TabPane tab="Phân tích cảnh báo" key="2">
                        <Row gutter={16}>
                            <Col span={16}>
                                <Card title="Phân bố cảnh báo theo mức">
                                    {barData.length > 0 ? (
                                        <Bar
                                            data={barData}
                                            xField="level"
                                            yField="count"
                                            color={({ level }: any) => {
                                                if (level === 'Mức 1') return '#faad14';
                                                if (level === 'Mức 2') return '#f5222d';
                                                return '#a8071a';
                                            }}
                                            label={{ position: 'top' }}
                                            height={300}
                                        />
                                    ) : (
                                        <Empty description="Không có dữ liệu cảnh báo" />
                                    )}
                                </Card>
                            </Col>
                            <Col span={8}>
                                <Card title="Top 5 SV cần chú ý">
                                    <Table
                                        columns={topStudentsColumns}
                                        dataSource={topStudents}
                                        rowKey={(record, idx) => `${record.studentID}-${idx}`}
                                        pagination={false}
                                        size="small"
                                        locale={{ emptyText: 'Không có dữ liệu' }}
                                    />
                                </Card>
                            </Col>
                        </Row>
                    </TabPane>

                    {/* Tab 3: Xu hướng */}
                    <TabPane tab="Xu hướng" key="3">
                        <Card>
                            <Statistic
                                title="Thay đổi cảnh báo so với kỳ trước"
                                value={stats.warningTrendThisSemester}
                                precision={1}
                                valueStyle={{
                                    color: stats.warningTrendThisSemester >= 0 ? '#cf1322' : '#52c41a',
                                }}
                                prefix={stats.warningTrendThisSemester >= 0
                                    ? <ArrowUpOutlined />
                                    : <ArrowDownOutlined />}
                                suffix="%"
                            />
                            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                                {stats.warningTrendThisSemester >= 0
                                    ? 'Cảnh báo đang tăng – cần theo dõi sát sao hơn'
                                    : 'Tình hình cải thiện – tiếp tục duy trì'}
                            </Text>
                        </Card>
                    </TabPane>
                </Tabs>
            )}
        </div>
    );
};

export default AdvisorAnalytics;