// hooks/useAcademicSummary.ts
import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { message } from 'antd';

// ========== Interfaces ==========
export interface SemesterGpa {
    semesterId: string;
    semesterName: string;
    academicYear: number;
    semesterNumber: number;
    gpa: number;
    cumulativeGpa: number;
    earnedCredits: number;
    registeredCredits: number;
    startDate: string;
    endDate: string;
}

export interface SubjectGradeDetail {
    subjectId: string;
    subjectCode: string;
    subjectName: string;
    credits: number;
    processScore: number | null;
    midtermScore: number | null;
    finalScore: number | null;
    totalScore: number | null;
    letterGrade: string | null;
    gpa4Value: number;
    isPassed: boolean;
    semesterId: string;
    semesterName: string;
    status: string;
}

export interface AcademicSummary {
    // Thông tin sinh viên
    studentId: string;
    studentCode: string;
    fullName: string;
    email: string;
    major: string;
    admissionYear: number;
    advisorClassName: string;

    // Chương trình đào tạo
    curriculumName: string;
    curriculumCode: string;
    totalCreditsRequired: number;
    completedCredits: number;
    remainingCredits: number;
    progressPercentage: number;

    // GPA
    cumulativeGpa: number;
    cumulativeGpaClassification: string;
    semesterGpas: SemesterGpa[];


    // Thống kê
    totalCoursesTaken: number;
    passedCourses: number;
    failedCourses: number;
    pendingCourses: number;
    submittedCourses: number;
    averageScore: number;

    // Tốt nghiệp
    isEligibleToGraduate: boolean;
    graduationIssues: string[];
    tuitionDebt: number;
    mandatorySubjectsCompleted: boolean;
    missingMandatorySubjects: number;

    // Chi tiết (optional)
    subjectGradeDetails?: SubjectGradeDetail[];

    // Bảng quy đổi
    letterGradeToGpa4: Record<string, number>;
    scoreToGpa4Mapping: Record<string, number>;
}

interface UseAcademicSummaryOptions {
    autoFetch?: boolean;
    includeDetails?: boolean;
}

interface UseAcademicSummaryReturn {
    data: AcademicSummary | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    refresh: () => Promise<void>;
}

export const useAcademicSummary = (
    options: UseAcademicSummaryOptions = { autoFetch: true, includeDetails: false }
): UseAcademicSummaryReturn => {
    const [data, setData] = useState<AcademicSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/Students/academic-summary', {
                params: { includeDetails: options.includeDetails }
            });
            setData(response.data);
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || 'Không thể tải dữ liệu học tập';
            setError(errorMsg);
            message.error(errorMsg);
        } finally {
            setLoading(false);
        }
    }, [options.includeDetails]);

    useEffect(() => {
        if (options.autoFetch) {
            fetchData();
        }
    }, [fetchData, options.autoFetch]);

    return {
        data,
        loading,
        error,
        refetch: fetchData,
        refresh: fetchData,
    };
};

// Helper: Lấy màu sắc theo GPA
export const getGpaColor = (gpa: number | null): string => {
    if (gpa === null) return '#9e9e9e';
    if (gpa >= 3.6) return '#00c853';
    if (gpa >= 3.2) return '#2979ff';
    if (gpa >= 2.5) return '#7c4dff';
    if (gpa >= 2.0) return '#ff9100';
    return '#ff1744';
};

// Helper: Lấy xếp loại theo GPA
export const getGpaClassification = (gpa: number | null): string => {
    if (gpa === null) return 'Chưa có dữ liệu';
    if (gpa >= 3.6) return 'Xuất sắc';
    if (gpa >= 3.2) return 'Giỏi';
    if (gpa >= 2.5) return 'Khá';
    if (gpa >= 2.0) return 'Trung bình';
    return 'Yếu';
};

// Helper: Lấy màu sắc theo điểm số
export const getScoreColor = (score: number | null): string => {
    if (score === null) return '#8c8c8c';
    if (score >= 8.5) return '#00c853';
    if (score >= 7.0) return '#52c41a';
    if (score >= 5.0) return '#faad14';
    if (score >= 4.0) return '#ff9100';
    return '#ff4d4f';
};