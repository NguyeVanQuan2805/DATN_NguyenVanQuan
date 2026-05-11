// src/utils/errorHandler.ts
/**
 * Hàm xử lý lỗi từ API, trả về string message an toàn để hiển thị
 * @param error - Error object từ axios hoặc any
 * @returns string message
 */
export const extractErrorMessage = (error: any): string => {
    if (!error) return 'Lỗi không xác định';

    // Nếu có response từ axios
    if (error.response) {
        const data = error.response.data;
        const status = error.response.status;

        // Trường hợp 1: Lỗi validation của ASP.NET Core
        if (data.errors) {
            const firstKey = Object.keys(data.errors)[0];
            const firstError = data.errors[firstKey];
            if (Array.isArray(firstError) && firstError.length > 0) {
                return firstError[0];
            }
            if (typeof firstError === 'string') {
                return firstError;
            }
            return 'Dữ liệu không hợp lệ';
        }

        // Trường hợp 2: Lỗi có message
        if (data.message) {
            return data.message;
        }

        // Trường hợp 3: Lỗi có title
        if (data.title) {
            return data.title;
        }

        // Trường hợp 4: Data là string
        if (typeof data === 'string') {
            return data;
        }

        // Trường hợp 5: Xử lý theo status code
        switch (status) {
            case 400:
                return 'Yêu cầu không hợp lệ';
            case 401:
                return 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!';
            case 403:
                return 'Bạn không có quyền thực hiện hành động này';
            case 404:
                return 'Không tìm thấy tài nguyên';
            case 500:
                return 'Lỗi server. Vui lòng thử lại sau!';
            default:
                return `Lỗi ${status}: ${data.title || 'Không xác định'}`;
        }
    }

    // Trường hợp error message thông thường
    if (error.message) {
        // Tránh hiển thị object error
        if (error.message.includes('Object') && error.message.includes('keys')) {
            return 'Đã xảy ra lỗi. Vui lòng thử lại!';
        }
        return error.message;
    }

    return 'Lỗi không xác định';
};