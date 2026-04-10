using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using StudentManagementApi.Models;

namespace StudentManagementApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ClassScheduleManagementController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ClassScheduleManagementController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/ClassScheduleManagement/schedules
        [HttpGet("schedules")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> GetAllSchedules()
        {
            try
            {
                // Lấy dữ liệu từ ClassSchedule
                var schedules = await _context.ClassSchedules
                    .OrderBy(s => s.DayOfWeek)
                    .ThenBy(s => s.PeriodStart)
                    .Select(s => new
                    {
                        s.ScheduleId,
                        s.DayOfWeek,
                        s.PeriodStart,
                        s.PeriodEnd,
                        RoomCode = s.Room,  // Room trong database là string
                        s.RoomId
                    })
                    .ToListAsync();

                // Lấy thông tin Room riêng
                var roomIds = schedules.Where(s => s.RoomId.HasValue).Select(s => s.RoomId.Value).Distinct().ToList();
                var roomDict = new Dictionary<int, Room>();

                if (roomIds.Any())
                {
                    var rooms = await _context.Set<Room>()
                        .Where(r => roomIds.Contains(r.RoomId))
                        .ToListAsync();

                    roomDict = rooms.ToDictionary(r => r.RoomId, r => r);
                }

                // Kết hợp dữ liệu
                var result = schedules.Select(s => {
                    string roomDisplay = "Chưa có phòng";
                    string building = null;
                    object roomInfo = null;

                    if (s.RoomId.HasValue && roomDict.ContainsKey(s.RoomId.Value))
                    {
                        var room = roomDict[s.RoomId.Value];
                        roomDisplay = $"{room.RoomCode} - {room.RoomName} ({room.Building})";
                        building = room.Building;
                        roomInfo = new
                        {
                            room.RoomCode,
                            room.RoomName,
                            room.Building,
                            room.Capacity,
                            room.RoomType
                        };
                    }
                    else if (!string.IsNullOrEmpty(s.RoomCode))
                    {
                        roomDisplay = s.RoomCode;
                    }

                    return new
                    {
                        s.ScheduleId,
                        s.DayOfWeek,
                        DayName = GetDayName(s.DayOfWeek),
                        s.PeriodStart,
                        s.PeriodEnd,
                        PeriodDisplay = $"Tiết {s.PeriodStart} - {s.PeriodEnd}",
                        Room = s.RoomCode,
                        s.RoomId,
                        RoomDisplay = roomDisplay,
                        Building = building,
                        RoomInfo = roomInfo
                    };
                });

                return Ok(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error: {ex.Message}");
                Console.WriteLine($"Stack: {ex.StackTrace}");
                return StatusCode(500, new { message = ex.Message, stack = ex.StackTrace });
            }
        }

        // GET: api/ClassScheduleManagement/schedules/{id}
        [HttpGet("schedules/{id}")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> GetScheduleById(int id)
        {
            try
            {
                var schedule = await _context.ClassSchedules
                    .FirstOrDefaultAsync(s => s.ScheduleId == id);

                if (schedule == null)
                    return NotFound(new { message = "Không tìm thấy lịch học" });

                // Lấy thông tin room nếu có
                Room room = null;
                if (schedule.RoomId.HasValue)
                {
                    room = await _context.Set<Room>().FirstOrDefaultAsync(r => r.RoomId == schedule.RoomId.Value);
                }

                string roomDisplay = "Chưa có phòng";
                string building = null;
                object roomInfo = null;

                if (room != null)
                {
                    roomDisplay = $"{room.RoomCode} - {room.RoomName} ({room.Building})";
                    building = room.Building;
                    roomInfo = new
                    {
                        room.RoomCode,
                        room.RoomName,
                        room.Building,
                        room.Capacity,
                        room.RoomType,
                        room.IsAvailable
                    };
                }
                else if (!string.IsNullOrEmpty(schedule.Room))
                {
                    roomDisplay = schedule.Room;
                }

                var result = new
                {
                    schedule.ScheduleId,
                    schedule.DayOfWeek,
                    DayName = GetDayName(schedule.DayOfWeek),
                    schedule.PeriodStart,
                    schedule.PeriodEnd,
                    PeriodDisplay = $"Tiết {schedule.PeriodStart} - {schedule.PeriodEnd}",
                    Room = schedule.Room,
                    schedule.RoomId,
                    RoomDisplay = roomDisplay,
                    Building = building,
                    RoomInfo = roomInfo
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // POST: api/ClassScheduleManagement/schedules
        [HttpPost("schedules")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> CreateSchedule([FromBody] CreateScheduleDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                // Kiểm tra dữ liệu đầu vào
                if (dto.DayOfWeek < 2 || dto.DayOfWeek > 8)
                    return BadRequest(new { message = "Thứ không hợp lệ (2-8)" });

                if (dto.PeriodStart < 1 || dto.PeriodStart > 12)
                    return BadRequest(new { message = "Tiết bắt đầu không hợp lệ (1-12)" });

                if (dto.PeriodEnd < 1 || dto.PeriodEnd > 12)
                    return BadRequest(new { message = "Tiết kết thúc không hợp lệ (1-12)" });

                if (dto.PeriodStart >= dto.PeriodEnd)
                    return BadRequest(new { message = "Tiết bắt đầu phải nhỏ hơn tiết kết thúc" });

                // Lấy Room từ RoomCode
                int? roomId = null;
                if (!string.IsNullOrEmpty(dto.RoomCode))
                {
                    var room = await _context.Set<Room>()
                        .FirstOrDefaultAsync(r => r.RoomCode == dto.RoomCode);

                    if (room != null)
                    {
                        roomId = room.RoomId;
                    }
                }

                // Kiểm tra trùng lịch
                var existing = await _context.ClassSchedules
                    .AnyAsync(s => s.DayOfWeek == dto.DayOfWeek
                                && s.PeriodStart == dto.PeriodStart
                                && s.PeriodEnd == dto.PeriodEnd);

                if (existing)
                    return BadRequest(new { message = "Lịch học này đã tồn tại" });

                var schedule = new ClassSchedule
                {
                    DayOfWeek = dto.DayOfWeek,
                    PeriodStart = dto.PeriodStart,
                    PeriodEnd = dto.PeriodEnd,
                    Room = dto.RoomCode,
                    RoomId = roomId
                };

                _context.ClassSchedules.Add(schedule);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Thêm lịch học thành công",
                    scheduleId = schedule.ScheduleId
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi thêm lịch học", error = ex.Message });
            }
        }

        // PUT: api/ClassScheduleManagement/schedules/{id}
        [HttpPut("schedules/{id}")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> UpdateSchedule(int id, [FromBody] UpdateScheduleDto dto)
        {
            try
            {
                var schedule = await _context.ClassSchedules.FindAsync(id);
                if (schedule == null)
                    return NotFound(new { message = "Không tìm thấy lịch học" });

                if (dto.DayOfWeek.HasValue)
                    schedule.DayOfWeek = dto.DayOfWeek.Value;

                if (dto.PeriodStart.HasValue)
                    schedule.PeriodStart = dto.PeriodStart.Value;

                if (dto.PeriodEnd.HasValue)
                    schedule.PeriodEnd = dto.PeriodEnd.Value;

                if (!string.IsNullOrEmpty(dto.RoomCode))
                {
                    // Tìm room theo RoomCode
                    var room = await _context.Set<Room>()
                        .FirstOrDefaultAsync(r => r.RoomCode == dto.RoomCode);

                    schedule.Room = dto.RoomCode;
                    schedule.RoomId = room?.RoomId;
                }

                await _context.SaveChangesAsync();

                return Ok(new { message = "Cập nhật lịch học thành công" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi cập nhật lịch học", error = ex.Message });
            }
        }

        // DELETE: api/ClassScheduleManagement/schedules/{id}
        [HttpDelete("schedules/{id}")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> DeleteSchedule(int id)
        {
            try
            {
                var schedule = await _context.ClassSchedules.FindAsync(id);
                if (schedule == null)
                    return NotFound(new { message = "Không tìm thấy lịch học" });

                _context.ClassSchedules.Remove(schedule);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Xóa lịch học thành công" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi xóa lịch học", error = ex.Message });
            }
        }

        // GET: api/ClassScheduleManagement/check-conflict
        [HttpGet("check-conflict")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> CheckScheduleConflict(
            [FromQuery] int scheduleId,
            [FromQuery] string semesterId,
            [FromQuery] string? excludeClassId = null)
        {
            try
            {
                if (scheduleId == 0)
                {
                    return Ok(new { hasConflict = false, conflictingClasses = new List<object>() });
                }

                var conflictingClasses = await _context.Classes
                    .Where(c => c.SemesterId == semesterId && c.ScheduleId == scheduleId)
                    .Select(c => new
                    {
                        c.ClassId,
                        c.ClassCode,
                        SubjectName = c.Subject != null ? c.Subject.SubjectName : "N/A"
                    })
                    .ToListAsync();

                return Ok(new
                {
                    hasConflict = conflictingClasses.Any(),
                    conflictingClasses
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi kiểm tra xung đột", error = ex.Message });
            }
        }

        // GET: api/ClassScheduleManagement/test
        [HttpGet("test")]
        [AllowAnonymous]
        public async Task<IActionResult> Test()
        {
            try
            {
                var count = await _context.ClassSchedules.CountAsync();
                var schedules = await _context.ClassSchedules
                    .Take(5)
                    .Select(s => new
                    {
                        s.ScheduleId,
                        s.DayOfWeek,
                        s.PeriodStart,
                        s.PeriodEnd,
                        s.Room,
                        s.RoomId
                    })
                    .ToListAsync();

                return Ok(new
                {
                    success = true,
                    totalRecords = count,
                    sampleData = schedules
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    error = ex.Message,
                    stackTrace = ex.StackTrace
                });
            }
        }

        private string GetDayName(int dayOfWeek)
        {
            return dayOfWeek switch
            {
                2 => "Thứ 2",
                3 => "Thứ 3",
                4 => "Thứ 4",
                5 => "Thứ 5",
                6 => "Thứ 6",
                7 => "Thứ 7",
                8 => "Chủ nhật",
                _ => $"Thứ {dayOfWeek}"
            };
        }
    }

    public class CreateScheduleDto
    {
        public int DayOfWeek { get; set; }
        public int PeriodStart { get; set; }
        public int PeriodEnd { get; set; }
        public string RoomCode { get; set; } = null!;
    }

    public class UpdateScheduleDto
    {
        public int? DayOfWeek { get; set; }
        public int? PeriodStart { get; set; }
        public int? PeriodEnd { get; set; }
        public string? RoomCode { get; set; }
    }
}