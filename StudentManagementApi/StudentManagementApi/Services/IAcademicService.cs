using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using StudentManagementApi.DTOs;

namespace StudentManagementApi.Services
{
    public interface IAcademicService
    {

        Task<AcademicSummaryDto> GetStudentAcademicSummary(string studentId, bool includeSubjectDetails = false);

        /// Kiểm tra nhanh điều kiện tốt nghiệp
        Task<GraduationEligibilityDto> CheckGraduationEligibility(string studentId);

        /// Tính lại GPA cho tất cả học kỳ của sinh viên (force recalc)
        Task<RecalculationResultDto> RecalculateAllGpa(string studentId);
    }

    public class GraduationEligibilityDto
    {
        public bool IsEligible { get; set; }
        public int TotalCreditsEarned { get; set; }
        public int RequiredCredits { get; set; }
        public decimal CumulativeGpa { get; set; }
        public decimal RequiredGpa { get; set; }
        public decimal TuitionDebt { get; set; }
        public bool MandatoryCompleted { get; set; }
        public List<string> Issues { get; set; } = new();
        public int MissingCredits { get; set; }
    }

    public class RecalculationResultDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public int SemestersRecalculated { get; set; }
        public decimal NewCumulativeGpa { get; set; }
        public List<string> Details { get; set; } = new();
    }
}
