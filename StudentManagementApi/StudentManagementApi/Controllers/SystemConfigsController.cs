using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.Models;

namespace StudentManagementApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SystemConfigsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SystemConfigsController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/SystemConfigs
        [HttpGet]
        public async Task<ActionResult<IEnumerable<SystemConfig>>> GetSystemConfigs()
        {
            return await _context.SystemConfigs.ToListAsync();
        }

        // GET: api/SystemConfigs/MaintenanceMode
        [HttpGet("{key}")]
        public async Task<ActionResult<SystemConfig>> GetSystemConfig(string key)
        {
            var config = await _context.SystemConfigs.FindAsync(key);
            if (config == null) return NotFound();
            return config;
        }

        // Trong SystemConfigsController.cs, thêm các method sau:

        // GET: api/SystemConfigs/tuition-config
        [HttpGet("tuition-config")]
        [Authorize(Roles = "ADMIN")]
        public async Task<ActionResult<object>> GetTuitionConfig()
        {
            var configs = await _context.SystemConfigs
                .Where(c => c.ConfigKey.StartsWith("Tuition_"))
                .ToListAsync();

            var result = new
            {
                PricePerCredit = configs.FirstOrDefault(c => c.ConfigKey == "Tuition_PricePerCredit")?.ConfigValue ?? "0",
                CurrentSemester = configs.FirstOrDefault(c => c.ConfigKey == "CurrentSemester")?.ConfigValue ?? "",
                PaymentDeadline = configs.FirstOrDefault(c => c.ConfigKey == "Tuition_PaymentDeadline")?.ConfigValue ?? "30",
                LateFee = configs.FirstOrDefault(c => c.ConfigKey == "Tuition_LateFee")?.ConfigValue ?? "0"
            };

            return Ok(result);
        }

        // Trong SystemConfigsController.cs, thêm vào method GetSystemConfigs hoặc thêm method mới:

        [HttpGet("credit-limits")]
        [Authorize(Roles = "ADMIN")]
        public async Task<ActionResult<object>> GetCreditLimits()
        {
            var minCreditsConfig = await _context.SystemConfigs
                .FirstOrDefaultAsync(c => c.ConfigKey == "MinCreditsPerSemester");

            var maxCreditsConfig = await _context.SystemConfigs
                .FirstOrDefaultAsync(c => c.ConfigKey == "MaxCreditsPerSemester");

            return Ok(new
            {
                minCredits = minCreditsConfig != null ? int.Parse(minCreditsConfig.ConfigValue) : 22,
                maxCredits = maxCreditsConfig != null ? int.Parse(maxCreditsConfig.ConfigValue) : 33
            });
        }

        [HttpPut("credit-limits")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> UpdateCreditLimits([FromBody] CreditLimitsDto dto)
        {
            if (dto.MinCredits <= 0 || dto.MaxCredits <= 0)
                return BadRequest("Giới hạn tín chỉ phải lớn hơn 0");

            if (dto.MinCredits > dto.MaxCredits)
                return BadRequest("Tín chỉ tối thiểu không được lớn hơn tín chỉ tối đa");

            // Update Min Credits
            var minConfig = await _context.SystemConfigs
                .FirstOrDefaultAsync(c => c.ConfigKey == "MinCreditsPerSemester");

            if (minConfig == null)
            {
                _context.SystemConfigs.Add(new SystemConfig
                {
                    ConfigKey = "MinCreditsPerSemester",
                    ConfigValue = dto.MinCredits.ToString(),
                    Description = "Số tín chỉ tối thiểu mỗi học kỳ"
                });
            }
            else
            {
                minConfig.ConfigValue = dto.MinCredits.ToString();
            }

            // Update Max Credits
            var maxConfig = await _context.SystemConfigs
                .FirstOrDefaultAsync(c => c.ConfigKey == "MaxCreditsPerSemester");

            if (maxConfig == null)
            {
                _context.SystemConfigs.Add(new SystemConfig
                {
                    ConfigKey = "MaxCreditsPerSemester",
                    ConfigValue = dto.MaxCredits.ToString(),
                    Description = "Số tín chỉ tối đa mỗi học kỳ"
                });
            }
            else
            {
                maxConfig.ConfigValue = dto.MaxCredits.ToString();
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Cập nhật giới hạn tín chỉ thành công" });
        }


        // PUT: api/SystemConfigs/tuition-config
        [HttpPut("tuition-config")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> UpdateTuitionConfig([FromBody] TuitionConfigDto dto)
        {
            // Update Price Per Credit
            var priceConfig = await _context.SystemConfigs
                .FirstOrDefaultAsync(c => c.ConfigKey == "Tuition_PricePerCredit");
            if (priceConfig == null)
            {
                _context.SystemConfigs.Add(new SystemConfig
                {
                    ConfigKey = "Tuition_PricePerCredit",
                    ConfigValue = dto.PricePerCredit.ToString(),
                    Description = "Giá mỗi tín chỉ"
                });
            }
            else
            {
                priceConfig.ConfigValue = dto.PricePerCredit.ToString();
            }

            // Update Payment Deadline
            var deadlineConfig = await _context.SystemConfigs
                .FirstOrDefaultAsync(c => c.ConfigKey == "Tuition_PaymentDeadline");
            if (deadlineConfig == null)
            {
                _context.SystemConfigs.Add(new SystemConfig
                {
                    ConfigKey = "Tuition_PaymentDeadline",
                    ConfigValue = dto.PaymentDeadline.ToString(),
                    Description = "Số ngày hạn thanh toán sau khi đăng ký"
                });
            }
            else
            {
                deadlineConfig.ConfigValue = dto.PaymentDeadline.ToString();
            }

            // Update Late Fee
            var lateFeeConfig = await _context.SystemConfigs
                .FirstOrDefaultAsync(c => c.ConfigKey == "Tuition_LateFee");
            if (lateFeeConfig == null)
            {
                _context.SystemConfigs.Add(new SystemConfig
                {
                    ConfigKey = "Tuition_LateFee",
                    ConfigValue = dto.LateFee.ToString(),
                    Description = "Phí phạt trễ hạn (%)"
                });
            }
            else
            {
                lateFeeConfig.ConfigValue = dto.LateFee.ToString();
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Cập nhật cấu hình học phí thành công" });
        }

        public class TuitionConfigDto
        {
            public decimal PricePerCredit { get; set; }
            public int PaymentDeadline { get; set; }
            public decimal LateFee { get; set; }
        }

        // GET: api/SystemConfigs/payment-config
        [HttpGet("payment-config")]
        [Authorize(Roles = "ADMIN")]
        public async Task<ActionResult<object>> GetPaymentConfig()
        {
            try
            {
                var configs = await _context.SystemConfigs
                    .Where(c => c.ConfigKey.StartsWith("Payment_"))
                    .ToListAsync();

                var result = new
                {
                    BankName = configs.FirstOrDefault(c => c.ConfigKey == "Payment_BankName")?.ConfigValue ?? "",
                    BankAccountNo = configs.FirstOrDefault(c => c.ConfigKey == "Payment_BankAccountNo")?.ConfigValue ?? "",
                    BankAccountName = configs.FirstOrDefault(c => c.ConfigKey == "Payment_BankAccountName")?.ConfigValue ?? "",
                    MomoEnabled = configs.FirstOrDefault(c => c.ConfigKey == "Payment_MomoEnabled")?.ConfigValue ?? "false",
                    MomoPartnerCode = configs.FirstOrDefault(c => c.ConfigKey == "Payment_MomoPartnerCode")?.ConfigValue ?? "",
                    MomoAccessKey = configs.FirstOrDefault(c => c.ConfigKey == "Payment_MomoAccessKey")?.ConfigValue ?? "",
                    MomoSecretKey = configs.FirstOrDefault(c => c.ConfigKey == "Payment_MomoSecretKey")?.ConfigValue ?? "",
                    QRCodeType = configs.FirstOrDefault(c => c.ConfigKey == "Payment_QRCodeType")?.ConfigValue ?? "VIETQR"
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetPaymentConfig: {ex.Message}");
                return StatusCode(500, new { message = "Lỗi khi tải cấu hình thanh toán", error = ex.Message });
            }
        }

        // PUT: api/SystemConfigs/payment-config
        [HttpPut("payment-config")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> UpdatePaymentConfig([FromBody] PaymentConfigDto dto)
        {
            try
            {
                var configs = new List<(string Key, string Value, string Description)>
        {
            ("Payment_BankName", dto.BankName ?? "", "Tên ngân hàng"),
            ("Payment_BankAccountNo", dto.BankAccountNo ?? "", "Số tài khoản"),
            ("Payment_BankAccountName", dto.BankAccountName ?? "", "Chủ tài khoản"),
            ("Payment_MomoEnabled", dto.MomoEnabled.ToString(), "Bật thanh toán Momo"),
            ("Payment_MomoPartnerCode", dto.MomoPartnerCode ?? "", "Momo Partner Code"),
            ("Payment_MomoAccessKey", dto.MomoAccessKey ?? "", "Momo Access Key"),
            ("Payment_MomoSecretKey", dto.MomoSecretKey ?? "", "Momo Secret Key"),
            ("Payment_QRCodeType", dto.QRCodeType ?? "VIETQR", "Loại QR code (VIETQR/MOMO)")
        };

                foreach (var (key, value, description) in configs)
                {
                    var existing = await _context.SystemConfigs.FirstOrDefaultAsync(c => c.ConfigKey == key);
                    if (existing == null)
                    {
                        _context.SystemConfigs.Add(new SystemConfig
                        {
                            ConfigKey = key,
                            ConfigValue = value,
                            Description = description
                        });
                    }
                    else
                    {
                        existing.ConfigValue = value;
                    }
                }

                await _context.SaveChangesAsync();

                return Ok(new { message = "Cập nhật cấu hình thanh toán thành công" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UpdatePaymentConfig: {ex.Message}");
                return StatusCode(500, new { message = "Lỗi khi cập nhật cấu hình thanh toán", error = ex.Message });
            }
        }

        // GET: api/SystemConfigs/payment-config/public - Cho phép sinh viên xem thông tin thanh toán
        [HttpGet("payment-config/public")]
        [AllowAnonymous]
        public async Task<ActionResult<object>> GetPublicPaymentConfig()
        {
            try
            {
                var configs = await _context.SystemConfigs
                    .Where(c => c.ConfigKey == "Payment_BankName"
                             || c.ConfigKey == "Payment_BankAccountNo"
                             || c.ConfigKey == "Payment_BankAccountName"
                             || c.ConfigKey == "Payment_MomoEnabled"
                             || c.ConfigKey == "Payment_QRCodeType")
                    .ToListAsync();

                var result = new
                {
                    BankName = configs.FirstOrDefault(c => c.ConfigKey == "Payment_BankName")?.ConfigValue ?? "",
                    BankAccountNo = configs.FirstOrDefault(c => c.ConfigKey == "Payment_BankAccountNo")?.ConfigValue ?? "",
                    BankAccountName = configs.FirstOrDefault(c => c.ConfigKey == "Payment_BankAccountName")?.ConfigValue ?? "",
                    MomoEnabled = configs.FirstOrDefault(c => c.ConfigKey == "Payment_MomoEnabled")?.ConfigValue ?? "false",
                    QRCodeType = configs.FirstOrDefault(c => c.ConfigKey == "Payment_QRCodeType")?.ConfigValue ?? "VIETQR"
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetPublicPaymentConfig: {ex.Message}");
                return StatusCode(500, new { message = "Lỗi khi tải cấu hình thanh toán" });
            }
        }

        // POST: api/SystemConfigs
        [HttpPost]
        [Authorize(Roles = "ADMIN")]
        public async Task<ActionResult<SystemConfig>> PostSystemConfig(SystemConfig config)
        {
            _context.SystemConfigs.Add(config);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetSystemConfig), new { key = config.ConfigKey }, config);
        }

        // PUT: api/SystemConfigs/MaintenanceMode
        [HttpPut("{key}")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> PutSystemConfig(string key, SystemConfig config)
        {
            if (key != config.ConfigKey) return BadRequest();
            _context.Entry(config).State = EntityState.Modified;
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!SystemConfigExists(key)) return NotFound();
                throw;
            }
            return NoContent();
        }

        // DELETE: api/SystemConfigs/MaintenanceMode
        [HttpDelete("{key}")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> DeleteSystemConfig(string key)
        {
            var config = await _context.SystemConfigs.FindAsync(key);
            if (config == null) return NotFound();
            _context.SystemConfigs.Remove(config);
            await _context.SaveChangesAsync();
            return NoContent();
        }
     
        // DTO cho Payment Config
        public class PaymentConfigDto
        {
            public string BankName { get; set; } = "";
            public string BankAccountNo { get; set; } = "";
            public string BankAccountName { get; set; } = "";
            public bool MomoEnabled { get; set; }
            public string MomoPartnerCode { get; set; } = "";
            public string MomoAccessKey { get; set; } = "";
            public string MomoSecretKey { get; set; } = "";
            public string QRCodeType { get; set; } = "VIETQR";
        }

        public class CreditLimitsDto
        {
            public int MinCredits { get; set; }
            public int MaxCredits { get; set; }
        }

        private bool SystemConfigExists(string key)
        {
            return _context.SystemConfigs.Any(e => e.ConfigKey == key);
        }
    }
}