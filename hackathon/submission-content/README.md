# THƯ MỤC NỘP BÀI (SUBMISSION CONTENT) — ĐỀ 002

Sinh viên đặt toàn bộ các tệp minh chứng vào thư mục này trước khi nộp bài lên hệ thống RAIA.

## Danh sách tệp tin cần có trong thư mục này khi nộp bài:
1. `init-check-report.enc`: Tệp minh chứng mã hóa chứng minh VPS đạt trạng thái sạch đầu giờ (sinh tự động bằng lệnh `node init-check.js`).
2. `history.log`: Lịch sử gõ lệnh terminal của sinh viên (chạy lệnh `history > submission-content/history.log`).
3. `[tên_viết_tắt]-fastapi.service`: Tệp cấu hình Systemd Service chạy API Backend Python trên cổng 8000 (Ví dụ: `nvan-fastapi.service`).
4. `[tên_viết_tắt]-web.conf`: Tệp cấu hình Virtual Host Nginx lắng nghe cổng 8080 & reverse proxy `/v1/service/` (Ví dụ: `nvan-web.conf`).
5. `report.enc`: Tệp báo cáo kiểm định mã hóa cuối giờ (sinh tự động bằng lệnh `node vps-inspector.js`).
