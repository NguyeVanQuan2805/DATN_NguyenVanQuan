using System;
using System.Collections.Generic;

namespace StudentManagementApi.DTOs
{
    /// Thông tin GPA theo từng học kỳ
    public class SemesterGpaDto
    {
        public string SemesterId { get; set; } = string.Empty;
        public string SemesterName { get; set; } = string.Empty;
        public int AcademicYear { get; set; }
        public int SemesterNumber { get; set; }
        public decimal Gpa { get; set; }
        public decimal CumulativeGpa { get; set; }  

        public int EarnedCredits { get; set; }
        public int RegisteredCredits { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
    }

    /// Chi tiết điểm một môn học 
    public class SubjectGradeDetailDto
    {
        public string SubjectId { get; set; } = string.Empty;
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public int Credits { get; set; }
        public decimal? ProcessScore { get; set; }
        public decimal? MidtermScore { get; set; }
        public decimal? FinalScore { get; set; }
        public decimal? TotalScore { get; set; }
        public string? LetterGrade { get; set; }
        public decimal Gpa4Value { get; set; }
        public bool IsPassed { get; set; }
        public string SemesterId { get; set; } = string.Empty;
        public string SemesterName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }

    /// Tổng hợp học tập của sinh viên 
    public class AcademicSummaryDto
    {
        // ========== THÔNG TIN SINH VIÊN ==========
        public string StudentId { get; set; } = string.Empty;
        public string StudentCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Major { get; set; } = string.Empty;
        public int AdmissionYear { get; set; }
        public string AdvisorClassName { get; set; } = string.Empty;

        // ========== CHƯƠNG TRÌNH ĐÀO TẠO ==========
        public string CurriculumName { get; set; } = string.Empty;
        public string CurriculumCode { get; set; } = string.Empty;
        public int TotalCreditsRequired { get; set; }
        public int CompletedCredits { get; set; }
        public int RemainingCredits { get; set; }
        public int ProgressPercentage { get; set; }

        // ========== GPA ==========
        public decimal CumulativeGpa { get; set; }
        public string CumulativeGpaClassification { get; set; } = string.Empty;
        public List<SemesterGpaDto> SemesterGpas { get; set; } = new();

        // ========== THỐNG KÊ MÔN HỌC ==========
        public int TotalCoursesTaken { get; set; }
        public int PassedCourses { get; set; }
        public int FailedCourses { get; set; }
        public int PendingCourses { get; set; }
        public int SubmittedCourses { get; set; }
        public decimal AverageScore { get; set; }

        // ========== ĐIỀU KIỆN TỐT NGHIỆP ==========
        public bool IsEligibleToGraduate { get; set; }
        public List<string> GraduationIssues { get; set; } = new();
        public decimal TuitionDebt { get; set; }
        public bool MandatorySubjectsCompleted { get; set; }
        public int MissingMandatorySubjects { get; set; }

        // ========== CHI TIẾT ĐIỂM TỪNG MÔN (OPTIONAL, cho trang Curriculum) ==========
        public List<SubjectGradeDetailDto> SubjectGradeDetails { get; set; } = new();

        // ========== BẢNG QUY ĐỔI (CHO FRONTEND) ==========
        public Dictionary<string, decimal> LetterGradeToGpa4 { get; set; } = new();
        public Dictionary<decimal, decimal> ScoreToGpa4Mapping { get; set; } = new();
    }
}