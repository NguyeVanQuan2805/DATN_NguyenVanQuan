using Microsoft.EntityFrameworkCore;
using StudentManagementApi.DTOs;
using StudentManagementApi.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace StudentManagementApi.Services
{
    public class AcademicService : IAcademicService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<AcademicService> _logger;

        // ═══════════════════════════════════════════════════════════════
        // BẢNG QUY ĐỔI ĐIỂM CHUẨN (Thống nhất toàn hệ thống)
        // ═══════════════════════════════════════════════════════════════

        private static readonly SortedDictionary<decimal, decimal> ScoreToGpa4 = new()
        {
            [8.5m] = 4.0m,   // A - Xuất sắc
            [8.0m] = 3.5m,   // B+ - Giỏi
            [7.0m] = 3.0m,   // B - Khá giỏi
            [6.5m] = 2.5m,   // C+ - Khá
            [5.5m] = 2.0m,   // C - Trung bình
            [5.0m] = 1.5m,   // D+ - Dưới trung bình (vẫn đạt)
            [4.0m] = 1.0m,   // D - Dưới trung bình (vẫn đạt)
            [0m] = 0.0m      // F - Trượt
        };

        private static readonly List<decimal> ScoreThresholds = ScoreToGpa4.Keys.OrderByDescending(x => x).ToList();
        private const decimal PASSING_SCORE = 4.0m;
        private const decimal MIN_GRADUATION_GPA = 2.0m;

        private static readonly Dictionary<string, decimal> LetterGradeToGpa4 = new()
        {
            ["A"] = 4.0m,
            ["A-"] = 3.7m,
            ["B+"] = 3.5m,
            ["B"] = 3.0m,
            ["B-"] = 2.7m,
            ["C+"] = 2.5m,
            ["C"] = 2.0m,
            ["C-"] = 1.7m,
            ["D+"] = 1.5m,
            ["D"] = 1.0m,
            ["D-"] = 0.7m,
            ["F"] = 0.0m
        };

        public AcademicService(AppDbContext context, ILogger<AcademicService> logger)
        {
            _context = context;
            _logger = logger;
        }

        // ═══════════════════════════════════════════════════════════════
        // PRIVATE HELPER METHODS
        // ═══════════════════════════════════════════════════════════════

        private decimal ConvertScoreToGpa4(decimal score)
        {
            if (score < 0) return 0;
            foreach (var threshold in ScoreThresholds)
            {
                if (score >= threshold)
                    return ScoreToGpa4[threshold];
            }
            return 0;
        }

        private decimal ConvertLetterToGpa4(string? letterGrade)
        {
            if (string.IsNullOrEmpty(letterGrade)) return 0;
            return LetterGradeToGpa4.GetValueOrDefault(letterGrade.ToUpper(), 0);
        }

        private string GetGpaClassification(decimal gpa)
        {
            if (gpa >= 3.6m) return "Xuất sắc";
            if (gpa >= 3.2m) return "Giỏi";
            if (gpa >= 2.5m) return "Khá";
            if (gpa >= 2.0m) return "Trung bình";
            return "Yếu";
        }

        private (decimal gpa, int earnedCredits, int registeredCredits, HashSet<string> completedSubjects)
            CalculateSemesterGpa(List<Grade> grades)
        {
            decimal totalPoints = 0;
            int earnedCredits = 0;
            int registeredCredits = 0;
            var completedSubjects = new HashSet<string>();

            foreach (var grade in grades)
            {
                var credits = grade.Class?.Subject?.Credits ?? 0;
                var score = grade.TotalScore ?? 0;
                registeredCredits += credits;

                if (score >= PASSING_SCORE)
                {
                    var gpa4 = ConvertScoreToGpa4(score);
                    totalPoints += gpa4 * credits;
                    earnedCredits += credits;

                    if (grade.Class?.SubjectId != null)
                        completedSubjects.Add(grade.Class.SubjectId);
                }
            }

            decimal semesterGpa = earnedCredits > 0 ? totalPoints / earnedCredits : 0;
            return (semesterGpa, earnedCredits, registeredCredits, completedSubjects);
        }

        private async Task<Curriculum?> GetStudentCurriculum(Student student)
        {
            var curriculum = await _context.Curriculums
                .FirstOrDefaultAsync(c => c.Major == student.Major
                    && c.CohortYear == student.AdmissionYear
                    && c.Status == "ACTIVE");

            if (curriculum == null)
            {
                curriculum = await _context.Curriculums
                    .Where(c => c.Major == student.Major && c.Status == "ACTIVE")
                    .OrderByDescending(c => c.CohortYear)
                    .FirstOrDefaultAsync();
            }

            return curriculum;
        }

        private async Task<(bool completed, int missingCount)> CheckMandatorySubjectsCompleted(
            string studentId, HashSet<string> completedSubjectIds)
        {
            var mandatorySubjects = await _context.CurriculumSubjects
                .Where(cs => cs.IsRequired)
                .Select(cs => cs.SubjectId)
                .ToListAsync();

            if (!mandatorySubjects.Any())
                return (true, 0);

            var missingSubjects = mandatorySubjects
                .Where(m => !completedSubjectIds.Contains(m))
                .ToList();

            return (missingSubjects.Count == 0, missingSubjects.Count);
        }

        // ═══════════════════════════════════════════════════════════════
        // PUBLIC METHODS (IMPLEMENT IACADEMICSERVICE)
        // ═══════════════════════════════════════════════════════════════

        public async Task<AcademicSummaryDto> GetStudentAcademicSummary(string studentId, bool includeSubjectDetails = false)
        {
            _logger.LogInformation("Getting academic summary for student: {StudentId}", studentId);

            // ========== 1. Lấy thông tin cơ bản ==========
            var student = await _context.Students
                .Include(s => s.Account)
                .Include(s => s.AdvisorClass)
                .FirstOrDefaultAsync(s => s.StudentId == studentId);

            if (student == null)
                throw new KeyNotFoundException($"Student {studentId} not found");

            // ========== 2. Lấy chương trình đào tạo ==========
            var curriculum = await GetStudentCurriculum(student);
            var totalCreditsRequired = curriculum?.TotalCredits ?? 120;
            var curriculumName = curriculum?.CurriculumName ?? "Chương trình đào tạo chuẩn";

            // ========== 3. Lấy tất cả điểm ==========
            var allGrades = await _context.Grades
                .Include(g => g.Class)
                    .ThenInclude(c => c!.Subject)
                .Include(g => g.Class)
                    .ThenInclude(c => c!.Semester)
                .Where(g => g.StudentId == studentId)
                .ToListAsync();

            var approvedGrades = allGrades.Where(g => g.Status == "APPROVED").ToList();
            var submittedGrades = allGrades.Where(g => g.Status == "SUBMITTED").ToList();

            // ========== 4. Tính GPA cho từng học kỳ ==========
            var semesterGroups = approvedGrades
                .Where(g => g.Class?.Semester != null)
                .GroupBy(g => g.Class!.SemesterId)
                .Select(g => new { Semester = g.First().Class!.Semester, Grades = g.ToList() })
                .OrderBy(x => x.Semester.AcademicYear)
                .ThenBy(x => x.Semester.SemesterNumber)
                .ToList();

            var semesterGpas = new List<SemesterGpaDto>();
            var allCompletedSubjectIds = new HashSet<string>();

            decimal cumulativePointsTotal = 0;
            int cumulativeCreditsTotal = 0;

            foreach (var group in semesterGroups.OrderBy(x => x.Semester.AcademicYear).ThenBy(x => x.Semester.SemesterNumber))
            {
                var semester = group.Semester;
                var semesterGrades = group.Grades;

                var (semesterGpa, earnedCredits, registeredCredits, semesterCompletedSubjects) =
                    CalculateSemesterGpa(semesterGrades);

                decimal semesterPoints = 0;
                int semesterCredits = 0;

                foreach (var grade in semesterGrades)
                {
                    var credits = grade.Class?.Subject?.Credits ?? 0;
                    var score = grade.TotalScore ?? 0;
                    if (score >= PASSING_SCORE)
                    {
                        var gpa4 = ConvertScoreToGpa4(score);
                        semesterPoints += gpa4 * credits;
                        semesterCredits += credits;
                    }
                }

                cumulativePointsTotal += semesterPoints;
                cumulativeCreditsTotal += semesterCredits;

                decimal cumulativeGpaUpToNow = cumulativeCreditsTotal > 0
                    ? cumulativePointsTotal / cumulativeCreditsTotal
                    : 0;

                foreach (var subjectId in semesterCompletedSubjects)
                    allCompletedSubjectIds.Add(subjectId);

                semesterGpas.Add(new SemesterGpaDto
                {
                    SemesterId = semester.SemesterId,
                    SemesterName = semester.SemesterName,
                    AcademicYear = semester.AcademicYear,
                    SemesterNumber = semester.SemesterNumber,
                    Gpa = Math.Round(semesterGpa, 2),
                    CumulativeGpa = Math.Round(cumulativeGpaUpToNow, 2),  // ✅ Tính đúng
                    EarnedCredits = earnedCredits,
                    RegisteredCredits = registeredCredits,
                    StartDate = semester.StartDate.ToDateTime(TimeOnly.MinValue),
                    EndDate = semester.EndDate.ToDateTime(TimeOnly.MinValue)
                });
            }


            // ========== 5. Tính Cumulative GPA ==========
            decimal cumulativeGpa = cumulativeCreditsTotal > 0
                ? cumulativePointsTotal / cumulativeCreditsTotal
                : 0;
            cumulativeGpa = Math.Round(cumulativeGpa, 2);

            // ========== 6. Tín chỉ tích lũy ==========
            int completedCreditsRaw = approvedGrades
                .Where(g => (g.TotalScore ?? 0) >= PASSING_SCORE)
                .Sum(g => g.Class?.Subject?.Credits ?? 0);

            int completedCredits = Math.Min(completedCreditsRaw, totalCreditsRequired);
            int remainingCredits = Math.Max(0, totalCreditsRequired - completedCredits);
            int progressPercentage = totalCreditsRequired > 0
                ? (int)Math.Round((double)completedCredits / totalCreditsRequired * 100)
                : 0;

            // ========== 7. Thống kê môn học ==========
            var gradedApproved = approvedGrades.Where(g => g.TotalScore.HasValue).ToList();
            int passedCourses = gradedApproved.Count(g => g.TotalScore >= PASSING_SCORE);
            int failedCourses = gradedApproved.Count(g => g.TotalScore < PASSING_SCORE && g.TotalScore > 0);
            int pendingCourses = approvedGrades.Count(g => !g.TotalScore.HasValue);
            int submittedCount = submittedGrades.Count;

            decimal avgScore = gradedApproved.Any()
                ? gradedApproved.Average(g => g.TotalScore ?? 0)
                : 0;

            // ========== 8. Kiểm tra môn bắt buộc ==========
            var (mandatoryCompleted, missingMandatoryCount) = await CheckMandatorySubjectsCompleted(studentId, allCompletedSubjectIds);

            // ========== 9. Công nợ học phí ==========
            decimal tuitionDebt = await _context.Tuitions
                .Where(t => t.StudentId == studentId && t.Status != "PAID")
                .SumAsync(t => t.Amount - t.AmountPaid);

            // ========== 10. Kiểm tra điều kiện tốt nghiệp ==========
            var graduationIssues = new List<string>();

            if (completedCredits < totalCreditsRequired)
                graduationIssues.Add($"Còn thiếu {remainingCredits} tín chỉ (yêu cầu {totalCreditsRequired})");

            if (cumulativeGpa < MIN_GRADUATION_GPA)
                graduationIssues.Add($"GPA tích lũy {cumulativeGpa:F2} < {MIN_GRADUATION_GPA}");

            if (tuitionDebt > 0)
                graduationIssues.Add($"Còn công nợ học phí: {tuitionDebt:N0}đ");

            if (!mandatoryCompleted)
                graduationIssues.Add($"Chưa hoàn thành {missingMandatoryCount} môn bắt buộc");

            // ========== 11. Chi tiết điểm từng môn (optional) ==========
            List<SubjectGradeDetailDto> subjectDetails = new();
            if (includeSubjectDetails)
            {
                subjectDetails = approvedGrades
                    .Where(g => g.Class?.Subject != null)
                    .Select(g => new SubjectGradeDetailDto
                    {
                        SubjectId = g.Class!.Subject!.SubjectId,
                        SubjectCode = g.Class.Subject.SubjectCode,
                        SubjectName = g.Class.Subject.SubjectName,
                        Credits = g.Class.Subject.Credits,
                        ProcessScore = g.ProcessScore,
                        MidtermScore = g.MidtermScore,
                        FinalScore = g.FinalScore,
                        TotalScore = g.TotalScore,
                        LetterGrade = g.LetterGrade,
                        Gpa4Value = ConvertScoreToGpa4(g.TotalScore ?? 0),
                        IsPassed = (g.TotalScore ?? 0) >= PASSING_SCORE,
                        SemesterId = g.Class.SemesterId,
                        SemesterName = g.Class.Semester?.SemesterName ?? "N/A",
                        Status = g.Status ?? "N/A"
                    })
                    .OrderByDescending(x => x.SemesterId)
                    .ThenBy(x => x.SubjectCode)
                    .ToList();
            }

            // ========== 12. Tạo response ==========
            return new AcademicSummaryDto
            {
                StudentId = student.StudentId,
                StudentCode = student.StudentCode,
                FullName = student.Account?.FullName ?? "N/A",
                Email = student.Account?.Email ?? "N/A",
                Major = student.Major ?? "N/A",
                AdmissionYear = student.AdmissionYear,
                AdvisorClassName = student.AdvisorClass?.ClassName ?? "N/A",

                CurriculumName = curriculumName,
                CurriculumCode = curriculum?.CurriculumCode ?? "N/A",
                TotalCreditsRequired = totalCreditsRequired,
                CompletedCredits = completedCredits,
                RemainingCredits = remainingCredits,
                ProgressPercentage = progressPercentage,

                CumulativeGpa = cumulativeGpa,
                CumulativeGpaClassification = GetGpaClassification(cumulativeGpa),
                SemesterGpas = semesterGpas,

                TotalCoursesTaken = approvedGrades.Count,
                PassedCourses = passedCourses,
                FailedCourses = failedCourses,
                PendingCourses = pendingCourses,
                SubmittedCourses = submittedCount,
                AverageScore = Math.Round(avgScore, 2),

                IsEligibleToGraduate = graduationIssues.Count == 0,
                GraduationIssues = graduationIssues,
                TuitionDebt = tuitionDebt,
                MandatorySubjectsCompleted = mandatoryCompleted,
                MissingMandatorySubjects = missingMandatoryCount,

                SubjectGradeDetails = subjectDetails,

                LetterGradeToGpa4 = LetterGradeToGpa4,
                ScoreToGpa4Mapping = ScoreToGpa4.ToDictionary(kvp => kvp.Key, kvp => kvp.Value)
            };
        }

        public async Task<GraduationEligibilityDto> CheckGraduationEligibility(string studentId)
        {
            var summary = await GetStudentAcademicSummary(studentId);

            return new GraduationEligibilityDto
            {
                IsEligible = summary.IsEligibleToGraduate,
                TotalCreditsEarned = summary.CompletedCredits,
                RequiredCredits = summary.TotalCreditsRequired,
                CumulativeGpa = summary.CumulativeGpa,
                RequiredGpa = MIN_GRADUATION_GPA,
                TuitionDebt = summary.TuitionDebt,
                MandatoryCompleted = summary.MandatorySubjectsCompleted,
                Issues = summary.GraduationIssues,
                MissingCredits = summary.RemainingCredits
            };
        }

        public async Task<RecalculationResultDto> RecalculateAllGpa(string studentId)
        {
            var result = new RecalculationResultDto();
            var details = new List<string>();

            try
            {
                var semestersWithGrades = await _context.Grades
                    .Include(g => g.Class)
                    .Where(g => g.StudentId == studentId
                        && g.Status == "APPROVED"
                        && g.Class != null)
                    .Select(g => g.Class!.SemesterId)
                    .Distinct()
                    .ToListAsync();

                int recalculatedCount = 0;
                decimal lastCumulativeGpa = 0;

                foreach (var semesterId in semestersWithGrades.OrderBy(x => x))
                {
                    var semesterGrades = await _context.Grades
                        .Include(g => g.Class)
                            .ThenInclude(c => c!.Subject)
                        .Where(g => g.StudentId == studentId
                            && g.Class!.SemesterId == semesterId
                            && g.Status == "APPROVED")
                        .ToListAsync();

                    var (semesterGpa, earnedCredits, registeredCredits, _) =
                        CalculateSemesterGpa(semesterGrades);

                    var existingGpa = await _context.Gpas
                        .FirstOrDefaultAsync(g => g.StudentId == studentId && g.SemesterId == semesterId);

                    if (existingGpa == null)
                    {
                        existingGpa = new Gpa
                        {
                            StudentId = studentId,
                            SemesterId = semesterId,
                            Gpa1 = Math.Round(semesterGpa, 2),
                            TotalCreditsEarned = earnedCredits,
                            TotalCreditsRegistered = registeredCredits
                        };
                        _context.Gpas.Add(existingGpa);
                    }
                    else
                    {
                        existingGpa.Gpa1 = Math.Round(semesterGpa, 2);
                        existingGpa.TotalCreditsEarned = earnedCredits;
                        existingGpa.TotalCreditsRegistered = registeredCredits;
                        _context.Gpas.Update(existingGpa);
                    }

                    // Cập nhật cumulative GPA sau khi lưu
                    var savedGpa = existingGpa;

                    // Reload để có Semester navigation property
                    await _context.Entry(savedGpa).Reference(g => g.Semester).LoadAsync();

                    var allGradesUpToNow = await _context.Grades
                        .Include(g => g.Class)
                            .ThenInclude(c => c!.Subject)
                        .Where(g => g.StudentId == studentId
                            && g.Status == "APPROVED"
                            && g.Class != null
                            && g.Class.Semester != null
                            && (g.Class.Semester.AcademicYear < savedGpa.Semester!.AcademicYear
                                || (g.Class.Semester.AcademicYear == savedGpa.Semester.AcademicYear
                                    && g.Class.Semester.SemesterNumber <= savedGpa.Semester.SemesterNumber)))
                        .ToListAsync();

                    decimal cumulativePoints = 0;
                    int cumulativeCredits = 0;
                    foreach (var g in allGradesUpToNow)
                    {
                        var score = g.TotalScore ?? 0;
                        if (score >= PASSING_SCORE)
                        {
                            var credits = g.Class?.Subject?.Credits ?? 0;
                            cumulativePoints += ConvertScoreToGpa4(score) * credits;
                            cumulativeCredits += credits;
                        }
                    }

                    decimal cumulativeGpa = cumulativeCredits > 0
                        ? cumulativePoints / cumulativeCredits
                        : 0;

                    savedGpa.CumulativeGpa = Math.Round(cumulativeGpa, 2);
                    lastCumulativeGpa = savedGpa.CumulativeGpa;
                    recalculatedCount++;

                    details.Add($"Học kỳ {semesterId}: GPA={semesterGpa:F2}, Tích lũy={cumulativeGpa:F2}");
                }

                await _context.SaveChangesAsync();

                result.Success = true;
                result.Message = $"Đã tính lại GPA cho {recalculatedCount} học kỳ";
                result.SemestersRecalculated = recalculatedCount;
                result.NewCumulativeGpa = lastCumulativeGpa;
                result.Details = details;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error recalculating GPA for student {StudentId}", studentId);
                result.Success = false;
                result.Message = $"Lỗi: {ex.Message}";
            }

            return result;
        }
    }
}