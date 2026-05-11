// pages/student/StudentCurriculum.tsx
import React, { useState, useEffect } from 'react';
import {
    Card,
    Table,
    Tag,
    Space,
    Spin,
    Empty,
    message,
    Badge,
    Typography,
    Divider,
    Descriptions,
    Progress,
    Collapse,
    Alert,
    Statistic,
    Row,
    Col
} from 'antd';
import {
    BookOutlined,
    CalendarOutlined,
    PieChartOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useAcademicSummary, getGpaColor, getGpaClassification } from '../../hooks/useAcademicSummary';

const { Title, Text } = Typography;

interface Curriculum {
    curriculumId: number;
    curriculumCode: string;
    curriculumName: string;
    major: string;
    cohortYear: number;
    totalCredits: number;
    status: string;
}

interface Subject {
    subjectCode: string;
    subjectName: string;
    credits: number;
    subjectType: string;
    recommendedSemester: number;
    isRequired: boolean;
}

const StudentCurriculum: React.FC = () => {
    const { user } = useAuth();

    // 🔥 DÙNG HOOK MỚI CHO GPA VÀ TÍN CHỈ
    const { data: summary, loading: summaryLoading, refresh: refreshSummary } = useAcademicSummary({ autoFetch: true });

    const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [groupedSubjects, setGroupedSubjects] = useState<any[]>([]);
    const [loadingCurriculum, setLoadingCurriculum] = useState(false);

    // Fetch curriculum data (giữ nguyên logic cũ)
    const fetchCurriculum = async () => {
        if (!user?.studentId) return;
        setLoadingCurriculum(true);
        try {
            const response = await api.get(`/Curriculum/student/${user.studentId}`);
            setCurriculum(response.data.curriculum);
            setSubjects(response.data.subjects);
            setGroupedSubjects(response.data.groupedBySemester || []);
        } catch (error: any) {
            if (error.response?.status === 404) {
                message.warning('Chưa có chương trình đào tạo cho ngành của bạn');
            } else {
                message.error('Không thể tải chương trình đào tạo');
            }
            setCurriculum(null);
            setSubjects([]);
            setGroupedSubjects([]);
        } finally {
            setLoadingCurriculum(false);
        }
    };

    useEffect(() => {
        if (user?.studentId) {
            fetchCurriculum();
        }
    }, [user]);

    const isLoading = summaryLoading || loadingCurriculum;

    // 🔥 Dữ liệu từ summary
    const totalCreditsRequired = summary?.totalCreditsRequired || 0;
    const completedCredits = summary?.completedCredits || 0;
    const remainingCredits = summary?.remainingCredits || 0;
    const progressPercentage = summary?.progressPercentage || 0;
    const cumulativeGpa = summary?.cumulativeGpa || 0;
    const gpaColor = getGpaColor(cumulativeGpa);
    const gpaClassification = getGpaClassification(cumulativeGpa);
    const isEligibleToGraduate = summary?.isEligibleToGraduate || false;

    const subjectColumns: ColumnsType<Subject> = [
        {
            title: 'Mã môn',
            dataIndex: 'subjectCode',
            key: 'subjectCode',
            width: 100,
        },
        {
            title: 'Tên môn học',
            dataIndex: 'subjectName',
            key: 'subjectName',
            width: 250,
        },
        {
            title: 'TC',
            dataIndex: 'credits',
            key: 'credits',
            width: 60,
            align: 'center',
        },
        {
            title: 'Loại',
            dataIndex: 'subjectType',
            key: 'subjectType',
            width: 100,
            render: (type) => {
                const typeMap: Record<string, { color: string; label: string }> = {
                    CORE: { color: 'blue', label: 'Chuyên ngành' },
                    ELECTIVE: { color: 'green', label: 'Tự chọn' },
                    GENERAL: { color: 'orange', label: 'Đại cương' }
                };
                const info = typeMap[type] || { color: 'default', label: type };
                return <Tag color={info.color}>{info.label}</Tag>;
            }
        },
        {
            title: 'Bắt buộc',
            dataIndex: 'isRequired',
            key: 'isRequired',
            width: 80,
            align: 'center',
            render: (required) => (
                required ? <Tag color="red">Bắt buộc</Tag> : <Tag color="default">Tự chọn</Tag>
            ),
        },
    ];

    return (
        <div>
            {/* Card tổng quan - GIỮ NGUYÊN UI CŨ, CHỈ THAY DỮ LIỆU */}
            <Card style={{ marginBottom: 24 }}>
                <Row gutter={16}>
                    <Col span={16}>
                        <Title level={4}>
                            <BookOutlined /> Chương trình đào tạo
                        </Title>
                        {curriculum ? (
                            <Descriptions column={2} size="small">
                                <Descriptions.Item label="Chương trình">
                                    <Tag color="blue">{curriculum.curriculumCode}</Tag>
                                    <Text strong> {curriculum.curriculumName}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Ngành">{curriculum.major}</Descriptions.Item>
                                <Descriptions.Item label="Khóa">{curriculum.cohortYear}</Descriptions.Item>
                                <Descriptions.Item label="Tổng tín chỉ">
                                    <Badge count={`${curriculum.totalCredits} TC`} style={{ backgroundColor: '#1890ff' }} />
                                </Descriptions.Item>
                            </Descriptions>
                        ) : (
                            <Alert
                                message="Chưa có chương trình đào tạo"
                                description="Hiện tại chưa có chương trình đào tạo cho ngành của bạn."
                                type="warning"
                                showIcon
                            />
                        )}
                    </Col>
                    <Col span={8}>
                        {/* 🔥 THAY THẾ PHẦN TÍNH TOÁN BẰNG DỮ LIỆU TỪ SUMMARY */}
                        {isLoading ? (
                            <Card size="small" style={{ textAlign: 'center', padding: 20 }}>
                                <Spin />
                                <div style={{ marginTop: 8 }}>Đang tính tiến độ...</div>
                            </Card>
                        ) : curriculum ? (
                            <Card size="small">
                                <Statistic
                                    title="Tiến độ học tập"
                                    value={progressPercentage.toFixed(1)}
                                    suffix="%"
                                    prefix={<PieChartOutlined />}
                                    valueStyle={{ color: progressPercentage >= 100 ? '#52c41a' : '#1890ff' }}
                                />
                                <Progress
                                    percent={Math.min(progressPercentage, 100)}
                                    size="small"
                                    status={progressPercentage >= 100 ? 'success' : 'active'}
                                    strokeColor={progressPercentage >= 100 ? '#52c41a' : '#1890ff'}
                                />
                                <Divider style={{ margin: '12px 0' }} />
                                <Space split={<Divider type="vertical" />}>
                                    <div>
                                        <Text type="secondary">Đã tích lũy</Text>
                                        <br />
                                        <Text strong style={{ fontSize: 18, color: completedCredits >= totalCreditsRequired ? '#52c41a' : '#1890ff' }}>
                                            {completedCredits}
                                        </Text>
                                        <Text type="secondary"> / {totalCreditsRequired} TC</Text>
                                    </div>
                                    <div>
                                        <Text type="secondary">Còn lại</Text>
                                        <br />
                                        <Text strong style={{ fontSize: 18, color: remainingCredits > 0 ? '#ff4d4f' : '#52c41a' }}>
                                            {remainingCredits}
                                        </Text>
                                        <Text type="secondary"> TC</Text>
                                    </div>
                                    <div>
                                        <Text type="secondary">GPA</Text>
                                        <br />
                                        <Text strong style={{ fontSize: 18, color: gpaColor }}>
                                            {cumulativeGpa.toFixed(2)}
                                        </Text>
                                    </div>
                                </Space>
                                {isEligibleToGraduate ? (
                                    <div style={{ marginTop: 12, textAlign: 'center' }}>
                                        <Tag color="success" icon={<CheckCircleOutlined />}>Đủ điều kiện tốt nghiệp</Tag>
                                    </div>
                                ) : (
                                    <div style={{ marginTop: 12, textAlign: 'center' }}>
                                        <Tag color="warning" icon={<CloseCircleOutlined />}>Chưa đủ điều kiện tốt nghiệp</Tag>
                                    </div>
                                )}
                            </Card>
                        ) : curriculum && !summary ? (
                            <Card size="small" style={{ textAlign: 'center', padding: 20 }}>
                                <Text type="secondary">Chưa có dữ liệu điểm để tính tiến độ</Text>
                            </Card>
                        ) : null}
                    </Col>
                </Row>
            </Card>

            {/* Phần hiển thị các môn học theo học kỳ - GIỮ NGUYÊN */}
            <Card>
                <Spin spinning={loadingCurriculum}>
                    {groupedSubjects.length === 0 && !loadingCurriculum ? (
                        <Empty description="Chưa có dữ liệu chương trình đào tạo" />
                    ) : (
                        <Collapse
                            defaultActiveKey={groupedSubjects.map((_, idx) => idx.toString())}
                            items={groupedSubjects.map((group: any, idx: number) => ({
                                key: idx.toString(),
                                label: (
                                    <Space>
                                        <CalendarOutlined />
                                        <strong>{group.semesterName}</strong>
                                        <Tag color="cyan">{group.totalCredits} tín chỉ</Tag>
                                        <Badge count={`${group.subjects.length} môn`} />
                                    </Space>
                                ),
                                children: (
                                    <Table
                                        columns={subjectColumns}
                                        dataSource={group.subjects}
                                        rowKey="subjectCode"
                                        size="middle"
                                        pagination={false}
                                    />
                                )
                            }))}
                        />
                    )}
                </Spin>
            </Card>
        </div>
    );
};

export default StudentCurriculum;