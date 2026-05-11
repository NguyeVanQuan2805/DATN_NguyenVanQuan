// components/student/GpaChart.tsx
import React from 'react';
import { Card, Space, Tag, Progress, Row, Col } from 'antd';
import { LineChartOutlined, RiseOutlined, FallOutlined } from '@ant-design/icons';
import { SemesterGpa, getGpaColor, getGpaClassification } from '../hooks/useAcademicSummary';

interface GpaChartProps {
    semesterGpas: SemesterGpa[];
    cumulativeGpa: number;
}

export const GpaChart: React.FC<GpaChartProps> = ({ semesterGpas, cumulativeGpa }) => {
    if (!semesterGpas.length) {
        return (
            <Card style={{ textAlign: 'center', padding: 40 }}>
                <LineChartOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                <div style={{ marginTop: 16, color: '#8c8c8c' }}>Chưa có dữ liệu GPA</div>
            </Card>
        );
    }

    // Tính xu hướng
    const firstGpa = semesterGpas[0]?.gpa || 0;
    const lastGpa = semesterGpas[semesterGpas.length - 1]?.gpa || 0;
    const trend = lastGpa - firstGpa;
    const isUp = trend > 0;

    // Thống kê
    const maxGpa = Math.max(...semesterGpas.map(s => s.gpa));
    const minGpa = Math.min(...semesterGpas.map(s => s.gpa));
    const avgGpa = semesterGpas.reduce((sum, s) => sum + s.gpa, 0) / semesterGpas.length;

    return (
        <Card
            title={
                <Space>
                    <LineChartOutlined />
                    <span>Lịch sử GPA theo học kỳ</span>
                </Space>
            }
        >
            {/* Thống kê nhanh */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={12} sm={6}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 12, color: '#8c8c8c' }}>GPA cao nhất</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: getGpaColor(maxGpa) }}>
                            {maxGpa.toFixed(2)}
                        </div>
                    </div>
                </Col>
                <Col xs={12} sm={6}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 12, color: '#8c8c8c' }}>GPA thấp nhất</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: getGpaColor(minGpa) }}>
                            {minGpa.toFixed(2)}
                        </div>
                    </div>
                </Col>
                <Col xs={12} sm={6}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 12, color: '#8c8c8c' }}>GPA trung bình</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: getGpaColor(avgGpa) }}>
                            {avgGpa.toFixed(2)}
                        </div>
                    </div>
                </Col>
                <Col xs={12} sm={6}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 12, color: '#8c8c8c' }}>Xu hướng</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: isUp ? '#52c41a' : '#ff4d4f' }}>
                            {isUp ? <RiseOutlined /> : <FallOutlined />} {Math.abs(trend).toFixed(2)}
                        </div>
                    </div>
                </Col>
            </Row>

            {/* Danh sách GPA từng học kỳ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {semesterGpas.map((semester, idx) => {
                    const gpaColor = getGpaColor(semester.gpa);
                    const classification = getGpaClassification(semester.gpa);
                    const percent = (semester.gpa / 4) * 100;

                    return (
                        <div
                            key={semester.semesterId}
                            style={{
                                padding: '12px 16px',
                                background: idx % 2 === 0 ? '#fafafa' : '#fff',
                                borderRadius: 8,
                                border: '1px solid #f0f0f0',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 8,
                                    flexWrap: 'wrap',
                                    gap: 8,
                                }}
                            >
                                <Space>
                                    <strong>{semester.semesterName}</strong>
                                    <Tag color="blue">{semester.academicYear}</Tag>
                                </Space>
                                <Space>
                                    <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                                        TC đạt: {semester.earnedCredits}/{semester.registeredCredits}
                                    </span>
                                    <Tag color={gpaColor} style={{ fontWeight: 700 }}>
                                        {semester.gpa.toFixed(2)}
                                    </Tag>
                                    <span style={{ fontSize: 12, color: '#8c8c8c' }}>{classification}</span>
                                </Space>
                            </div>
                            <Progress
                                percent={percent}
                                strokeColor={gpaColor}
                                showInfo={false}
                                size="small"
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                <span style={{ fontSize: 10, color: '#bfbfbf' }}>0.0</span>
                                <span style={{ fontSize: 10, color: '#bfbfbf' }}>4.0</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Cumulative GPA */}
            <div
                style={{
                    marginTop: 24,
                    padding: 16,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: 12,
                    color: '#fff',
                    textAlign: 'center',
                }}
            >
                <div style={{ fontSize: 14, opacity: 0.8 }}>GPA TÍCH LŨY TOÀN KHÓA</div>
                <div style={{ fontSize: 36, fontWeight: 800 }}>{cumulativeGpa.toFixed(2)}</div>
                <div style={{ fontSize: 14, marginTop: 4 }}>{getGpaClassification(cumulativeGpa)}</div>
            </div>
        </Card>
    );
};