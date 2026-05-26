# 📚 HỆ THỐNG QUẢN LÝ SINH VIÊN - ĐẠI HỌC KINH BẮC

## 📌 Tổng quan dự án

Hệ thống quản lý sinh viên trực tuyến dành cho Trường Đại học Kinh Bắc, được xây dựng trên nền tảng **ASP.NET Core 8 (Web API)** và **React 18 (TypeScript)**. Hệ thống hỗ trợ đầy đủ các vai trò: **Admin**, **Giảng viên (Teacher)**, **Cố vấn học tập (Advisor)** và **Sinh viên (Student)**.

### 🎯 Chức năng chính

| Vai trò | Chức năng |
|---------|-----------|
| **Admin** | Quản lý tài khoản, môn học, lớp học phần, phòng học, học kỳ, chương trình đào tạo, học phí, tốt nghiệp, thông báo |
| **Giảng viên** | Quản lý lớp đang dạy, nhập điểm, điểm danh, xem lịch giảng dạy |
| **Cố vấn** | Quản lý sinh viên, xem cảnh báo học vụ, thống kê, phân tích |
| **Sinh viên** | Đăng ký môn học, xem kết quả học tập, xem lịch học, thanh toán học phí, đăng ký tốt nghiệp, xem chương trình đào tạo |

### 🛠 Công nghệ sử dụng

| Thành phần | Công nghệ |
|------------|-----------|
| **Frontend** | React 18, TypeScript, Ant Design 5, Axios, DayJS, XLSX, JWT-Decode, QRCode.React |
| **Backend** | ASP.NET Core 8, Entity Framework Core 8, JWT Bearer, BCrypt, Swagger |
| **Database** | Microsoft SQL Server 2019+ |
| **Authentication** | JWT (JSON Web Token) |

---

## 🚀 Hướng dẫn cài đặt và chạy dự án

### Yêu cầu hệ thống

| Công cụ | Phiên bản tối thiểu |
|---------|---------------------|
| Node.js | v18.x trở lên |
| .NET SDK | 8.0 trở lên |
| SQL Server | 2019 trở lên |
| Visual Studio / VS Code | 2022 trở lên |
| Git | bất kỳ |

---

### 1. Clone dự án

```bash
git clone https://github.com/NguyeVanQuan2805/DATN_NguyenVanQuan.git
cd DATN_NguyenVanQuan
```

---

### 2. Cấu hình Backend (ASP.NET Core)

#### 2.1 Di chuyển vào thư mục backend

```bash
cd student-management-backend
```

#### 2.2 Cấu hình connection string

Mở file `appsettings.json`, sửa chuỗi kết nối SQL Server của bạn:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=YOUR_SERVER_NAME;Database=StudentManagementSystem;Trusted_Connection=True;TrustServerCertificate=True;"
  },
  "Jwt": {
    "Key": "YourSuperSecretKeyAtLeast32CharsLong1234567890",
    "Issuer": "StudentManagementApi",
    "Audience": "StudentManagementClient"
  }
}
```

> **Lưu ý:** Thay `YOUR_SERVER_NAME` bằng tên SQL Server của bạn (ví dụ: `localhost`, `DESKTOP-XXX`, `ADMIN`).

#### 2.3 Khôi phục packages và build

```bash
dotnet restore
dotnet build
```

#### 2.4 Tạo database (nếu chưa có)

**Cách 1:** Chạy script SQL đã cung cấp trong thư mục `Database/`.

**Cách 2:** Dùng Entity Framework Migrations (nếu có):

```bash
dotnet ef database update
```

#### 2.5 Chạy backend

```bash
dotnet run
```

Backend sẽ chạy tại: `https://localhost:7077`  
Swagger UI: `https://localhost:7077/swagger`

---

### 3. Cấu hình Frontend (React)

#### 3.1 Di chuyển vào thư mục frontend

```bash
cd ../student-management-frontend
```

#### 3.2 Cấu hình API URL

Mở file `src/services/api.ts`, kiểm tra URL backend:

```typescript
const API_BASE_URL = 'https://localhost:7077/api';  // Đảm bảo đúng port
```

#### 3.3 Cài đặt dependencies

```bash
npm install
```

#### 3.4 Chạy frontend

```bash
npm start
```

Frontend sẽ chạy tại: `http://localhost:3000`

---

## 🔐 Tài khoản đăng nhập mặc định

| Vai trò | Tên đăng nhập | Mật khẩu |
|---------|---------------|----------|
| **Admin** | `admin` | `123456` |
| **Giảng viên** | `teacher1` | `123456` |
| **Cố vấn** | `advisor1` | `123456` |
| **Sinh viên** | `student1` | `123456` |

> **Lưu ý:** Nếu không đăng nhập được, hãy chạy endpoint reset mật khẩu admin:  
> `GET https://localhost:7077/api/Reset/reset-admin`

---

## 📁 Cấu trúc thư mục dự án

```
DATN_NguyenVanQuan/
├── student-management-backend/          # Backend ASP.NET Core
│   ├── Controllers/                     # API Controllers
│   │   ├── AccountsController.cs
│   │   ├── AuthController.cs
│   │   ├── ClassesController.cs
│   │   ├── GradesController.cs
│   │   ├── StudentsController.cs
│   │   ├── TuitionsController.cs
│   │   └── ... (các controller khác)
│   ├── Models/                          # Entity Models + DbContext
│   │   ├── AppDbContext.cs
│   │   ├── Account.cs
│   │   ├── Student.cs
│   │   └── ... (các model khác)
│   ├── Services/                        # Business Logic Services
│   ├── Middlewares/                     # Custom Middleware (Maintenance...)
│   ├── DTOs/                            # Data Transfer Objects
│   ├── appsettings.json                 # Cấu hình (DB, JWT)
│   └── Program.cs                       # Startup configuration
│
├── student-management-frontend/         # Frontend React
│   ├── src/
│   │   ├── components/                  # React Components
│   │   │   ├── layouts/                 # Layout theo role
│   │   │   │   ├── LayoutAdmin.tsx
│   │   │   │   ├── LayoutStudent.tsx
│   │   │   │   ├── LayoutTeacher.tsx
│   │   │   │   └── LayoutAdvisor.tsx
│   │   │   ├── ProtectedRoute.tsx       # Route bảo vệ theo role
│   │   │   ├── NotificationBell.tsx
│   │   │   └── StudentHistoryModal.tsx
│   │   ├── pages/                       # Các trang chính
│   │   │   ├── Login.tsx
│   │   │   ├── admin/                   # Trang Admin
│   │   │   ├── student/                 # Trang Sinh viên
│   │   │   ├── teacher/                 # Trang Giảng viên
│   │   │   ├── advisor/                 # Trang Cố vấn
│   │   │   └── shared/                  # Trang dùng chung
│   │   ├── context/                     # React Context (Auth)
│   │   ├── hooks/                       # Custom Hooks
│   │   ├── services/                    # API services (axios)
│   │   ├── utils/                       # Utility functions
│   │   ├── App.tsx                      # Routing chính
│   │   └── index.tsx                    # Entry point
│   ├── package.json
│   └── tsconfig.json
│
└── Database/                            # Scripts SQL
    └── StudentManagementSystem.sql
```

---

## 📡 API Endpoints chính

### Authentication

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/Auth/login` | Đăng nhập, trả về JWT token |
| GET | `/api/Auth/check-maintenance` | Kiểm tra chế độ bảo trì |

### Accounts

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| GET | `/api/Accounts` | Lấy danh sách tài khoản | ADMIN |
| GET | `/api/Accounts/my-profile` | Lấy thông tin cá nhân | ALL |
| POST | `/api/Accounts` | Tạo tài khoản mới | ADMIN |
| PUT | `/api/Accounts/{id}` | Cập nhật tài khoản | ADMIN |
| PUT | `/api/Accounts/{id}/reset-password` | Reset mật khẩu | ADMIN |

### Classes

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| GET | `/api/Classes` | Danh sách lớp học phần | ADMIN |
| GET | `/api/Classes/my-classes` | Lớp của giảng viên | TEACHER |
| GET | `/api/Classes/available-for-student/{studentId}` | Lớp khả dụng | STUDENT |
| POST | `/api/Classes` | Tạo lớp mới | ADMIN |

### Grades (Điểm)

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| GET | `/api/Grades/class/{classId}` | Lấy điểm theo lớp | TEACHER, ADMIN |
| GET | `/api/Grades/student/{studentId}` | Lấy điểm theo sinh viên | STUDENT, ADVISOR |
| POST | `/api/Grades/bulk` | Nhập điểm hàng loạt | TEACHER |
| POST | `/api/Grades/submit` | Gửi duyệt điểm | TEACHER |
| POST | `/api/Grades/approve` | Duyệt điểm | ADMIN |

### Course Registrations (Đăng ký môn)

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| GET | `/api/CourseRegistrations/student/{studentId}` | Đăng ký của sinh viên | STUDENT |
| POST | `/api/CourseRegistrations` | Đăng ký môn học | STUDENT |
| PUT | `/api/CourseRegistrations/approve/{id}` | Duyệt đăng ký | ADMIN, ADVISOR |

### Tuitions (Học phí)

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| GET | `/api/Tuitions/my` | Học phí của tôi | STUDENT |
| POST | `/api/Tuitions/payment` | Gửi yêu cầu thanh toán | STUDENT |
| GET | `/api/Tuitions/payments/pending` | DS thanh toán chờ duyệt | ADMIN |

### Warnings (Cảnh báo)

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| GET | `/api/Warnings/my-warnings` | Cảnh báo của tôi | STUDENT |
| GET | `/api/Warnings/advisor-summary/{advisorId}` | Tổng hợp cảnh báo | ADVISOR |

---

## 🛠 Các lệnh hữu ích

### Backend

```bash
# Build project
dotnet build

# Chạy project
dotnet run

# Thêm migration (nếu dùng Code First)
dotnet ef migrations add MigrationName

# Cập nhật database
dotnet ef database update
```

### Frontend

```bash
# Cài đặt dependencies
npm install

# Chạy development server
npm start

# Build production
npm run build

# Kiểm tra TypeScript
npx tsc --noEmit
```

---

## 🐛 Xử lý lỗi thường gặp

### 1. Lỗi CORS khi gọi API

**Nguyên nhân:** Frontend (port 3000) và Backend (port 7077) khác port.

**Giải pháp:** Đã cấu hình CORS trong `Program.cs`:

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});
```

### 2. Lỗi token không có role claim

**Nguyên nhân:** JWT token không chứa claim role.

**Giải pháp:** Kiểm lại `GenerateJwtToken` trong `AuthController.cs`, đảm bảo có:

```csharp
claims.Add(new Claim(ClaimTypes.Role, account.Role));
claims.Add(new Claim("role", account.Role));
```

### 3. Lỗi 401 Unauthorized khi gọi API

**Nguyên nhân:** Token hết hạn hoặc không được gửi.

**Giải pháp:** Kiểm tra interceptor trong `api.ts`:

```typescript
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
```

### 4. Lỗi "Cannot read property 'map' of undefined"

**Nguyên nhân:** Dữ liệu từ API trả về `undefined` thay vì array.

**Giải pháp:** Luôn dùng fallback:

```typescript
const data = response.data || [];
```

### 5. Lỗi SQL Server connection

**Nguyên nhân:** Sai connection string hoặc SQL Server chưa bật.

**Giải pháp:**
- Kiểm tra SQL Server đã bật chưa (Services → SQL Server)
- Kiểm tra lại connection string trong `appsettings.json`
- Thử dùng `Server=localhost` hoặc `Server=.\SQLEXPRESS`

---

## 📦 Danh sách dependencies chính

### Frontend (package.json)

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "typescript": "^5.0.0",
    "axios": "^1.6.0",
    "antd": "^5.12.0",
    "@ant-design/icons": "^5.2.0",
    "@ant-design/plots": "^2.2.0",
    "dayjs": "^1.11.0",
    "jwt-decode": "^4.0.0",
    "xlsx": "^0.18.0",
    "qrcode.react": "^3.1.0"
  }
}
```

### Backend (.csproj)

```xml
<PackageReference Include="Microsoft.EntityFrameworkCore" Version="8.0.0" />
<PackageReference Include="Microsoft.EntityFrameworkCore.SqlServer" Version="8.0.0" />
<PackageReference Include="Microsoft.EntityFrameworkCore.Tools" Version="8.0.0" />
<PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="8.0.0" />
<PackageReference Include="BCrypt.Net-Next" Version="4.0.3" />
<PackageReference Include="Swashbuckle.AspNetCore" Version="6.5.0" />
```

---

## 👥 Tác giả

| | |
|---|---|
| **Sinh viên** | Nguyễn Văn Quân |
| **Mã số sinh viên** | 2022602069 |
| **Khóa** | K17 |
| **Ngành** | Công nghệ thông tin |
| **GVHD** | ThS. Ngô Thị Thanh Hòa |

---

## 📄 Giấy phép

Dự án được phát triển cho mục đích **Đồ án tốt nghiệp** — Trường Đại học Kinh Bắc.

---

## 🔗 Liên kết

| | URL |
|---|---|
| **Backend API** | `https://localhost:7077` |
| **Swagger UI** | `https://localhost:7077/swagger` |
| **Frontend** | `http://localhost:3000` |

---

*© 2026 — Hệ thống Quản lý Sinh viên Đại học Kinh Bắc*
