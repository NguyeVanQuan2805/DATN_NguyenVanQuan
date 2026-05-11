// components/student/AcademicSummaryCard.tsx
import React from 'react';
import { Card, Row, Col, Progress, Tag, Space, Tooltip } from 'antd';
import {
    TrophyOutlined,
    BookOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    ClockCircleOutlined,
    DollarOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import { AcademicSummary, getGpaColor, getGpaClassification } from '../hooks/useAcademicSummary';

const { Meta } = Card;

interface AcademicSummaryCardProps {
    summary: AcademicSummary | null;
    loading?: boolean;
    compact?: boolean;
}

export const AcademicSummaryCard: React.FC<AcademicSummaryCardProps> = ({
    summary,
    loading = false,
    compact = false,
}) => {
    if (loading || !summary) {
        return (
            <Card loading={loading} style={{ borderRadius: 16 }}>
                <div style={{ height: 200 }} />
            </Card>
        );
    }

    const gpaColor = getGpaColor(summary.cumulativeGpa);
    const gpaClassification = getGpaClassification(summary.cumulativeGpa);

    if (compact) {
        return (
            <Card
                style={{
                    borderRadius: 16,
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                    color: '#fff',
                }}
            >
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={12} sm={6}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 12, opacity: 0.7 }}>GPA tích lũy</div>
                            <div style={{ fontSize: 28, fontWeight: 800, color: gpaColor }}>
                                {summary.cumulativeGpa.toFixed(2)}
                            </div>
                            <Tag color={gpaColor} style={{ marginTop: 4 }}>
                                {gpaClassification}
                            </Tag>
                        </div>
                    </Col>
                    <Col xs={12} sm={6}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 12, opacity: 0.7 }}>Tín chỉ</div>
                            <div style={{ fontSize: 24, fontWeight: 700 }}>
                                {summary.completedCredits}/{summary.totalCreditsRequired}
                            </div>
                            <Progress
                                percent={summary.progressPercentage}
                                size="small"
                                strokeColor="#52c41a"
                                trailColor="rgba(255,255,255,0.2)"
                                showInfo={false}
                            />
                        </div>
                    </Col>
                    <Col xs={12} sm={6}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 12, opacity: 0.7 }}>Môn đạt/trượt</div>
                            <div>
                                <span style={{ color: '#52c41a', fontWeight: 700 }}>
                                    {summary.passedCourses}
                                </span>
                                <span style={{ margin: '0 4px', opacity: 0.5 }}>/</span>
                                <span style={{ color: '#ff4d4f', fontWeight: 700 }}>
                                    {summary.failedCourses}
                                </span>
                            </div>
                        </div>
                    </Col>
                    <Col xs={12} sm={6}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 12, opacity: 0.7 }}>Tình trạng</div>
                            {summary.isEligibleToGraduate ? (
                                <Tag color="success" icon={<CheckCircleOutlined />}>
                                    Đủ điều kiện TN
                                </Tag>
                            ) : (
                                <Tag color="warning" icon={<WarningOutlined />}>
                                    Chưa đủ điều kiện
                                </Tag>
                            )}
                        </div>
                    </Col>
                </Row>
            </Card>
        );
    }

    return (
        <Card
            style={{ borderRadius: 16, marginBottom: 24 }}
            title={
                <Space>
                    <TrophyOutlined style={{ color: '#ffd700' }} />
                    <span>Tổng quan học tập</span>
                </Space>
            }
        >
            <Row gutter={[24, 24]}>
                {/* GPA */}
                <Col xs={24} sm={12} md={6}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#8c8c8c', marginBottom: 8 }}>GPA tích lũy</div>
                        <div style={{ fontSize: 48, fontWeight: 800, color: gpaColor }}>
                            {summary.cumulativeGpa.toFixed(2)}
                        </div>
                        <Tag color={gpaColor} style={{ marginTop: 8 }}>
                            {gpaClassification}
                        </Tag>
                    </div>
                </Col>

                {/* Tín chỉ */}
                <Col xs={24} sm={12} md={6}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#8c8c8c', marginBottom: 8 }}>
                            <BookOutlined /> Tín chỉ
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 700 }}>
                            {summary.completedCredits}
                            <span style={{ fontSize: 18, color: '#8c8c8c' }}>
                                /{summary.totalCreditsRequired}
                            </span>
                        </div>
                        <Progress
                            percent={summary.progressPercentage}
                            size="small"
                            strokeColor="#1890ff"
                            style={{ marginTop: 8 }}
                        />
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                            {summary.progressPercentage}% hoàn thành
                        </div>
                    </div>
                </Col>

                {/* Môn học */}
                <Col xs={24} sm={12} md={6}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#8c8c8c', marginBottom: 8 }}>Môn học</div>
                        <Space size="large">
                            <Tooltip title="Số môn đã đạt">
                                <div>
                                    <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                                    <div style={{ fontSize: 24, fontWeight: 700 }}>
                                        {summary.passedCourses}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>Đạt</div>
                                </div>
                            </Tooltip>
                            <Tooltip title="Số môn trượt">
                                <div>
                                    <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
                                    <div style={{ fontSize: 24, fontWeight: 700 }}>
                                        {summary.failedCourses}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>Trượt</div>
                                </div>
                            </Tooltip>
                            <Tooltip title="Môn chờ điểm">
                                <div>
                                    <ClockCircleOutlined style={{ color: '#faad14', fontSize: 20 }} />
                                    <div style={{ fontSize: 24, fontWeight: 700 }}>
                                        {summary.pendingCourses}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>Chờ</div>
                                </div>
                            </Tooltip>
                        </Space>
                    </div>
                </Col>

                {/* Tốt nghiệp */}
                <Col xs={24} sm={12} md={6}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#8c8c8c', marginBottom: 8 }}>
                            <DollarOutlined /> Công nợ & TN
                        </div>
                        {summary.tuitionDebt > 0 ? (
                            <div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: '#ff4d4f' }}>
                                    {summary.tuitionDebt.toLocaleString('vi-VN')}đ
                                </div>
                                <Tag color="error">Còn nợ học phí</Tag>
                            </div>
                        ) : (
                            <div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: '#52c41a' }}>
                                    0đ
                                </div>
                                <Tag color="success">Đã thanh toán</Tag>
                            </div>
                        )}
                    </div>
                </Col>
            </Row>

            {/* Cảnh báo nếu chưa đủ điều kiện tốt nghiệp */}
            {!summary.isEligibleToGraduate && summary.graduationIssues.length > 0 && (
                <div
                    style={{
                        marginTop: 16,
                        padding: 12,
                        background: '#fff7e6',
                        borderRadius: 8,
                        border: '1px solid #ffd591',
                    }}
                >
                    <Space direction="vertical" size={4}>
                        <strong style={{ color: '#d46b08' }}>
                            <WarningOutlined /> Chưa đủ điều kiện tốt nghiệp:
                        </strong>
                        {summary.graduationIssues.map((issue, idx) => (
                            <div key={idx} style={{ fontSize: 13, color: '#d46b08' }}>
                                • {issue}
                            </div>
                        ))}
                    </Space>
                </div>
            )}
        </Card>
    );
};