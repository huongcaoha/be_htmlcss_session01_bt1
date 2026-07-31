# BỘ TÀI NGUYÊN THỰC HÀNH HACKATHON DEVOPS — ĐỀ SỐ 002

Đây là bộ tài nguyên chính thức kèm theo bài thi **HACKATHON MÔN DEVOPS FUNDAMENTALS — ĐỀ 002 (Python FastAPI + PostgreSQL + Nginx Reverse Proxy)**.

## 1. Cấu trúc thư mục

```text
hackathon/
├── backend-app/
│   ├── app.py              ← Mã nguồn chính của API Backend Python FastAPI
│   ├── init.sql            ← Script DDL khởi tạo Database PostgreSQL & tài khoản user
│   ├── requirements.txt    ← Danh sách thư viện Python cần cài đặt (fastapi, uvicorn, psycopg2-binary, pydantic)
│   └── .gitignore          ← Cấu hình gitignore cho Python
├── submission-content/
│   ├── README.md           ← Nơi chứa các tệp minh chứng bài làm trước khi nộp
│   └── (các file nộp: history.log, [user]-web.conf, [user]-fastapi.service, report.enc, init-check-report.enc)
├── init-check.js           ← Script kiểm tra môi trường VPS sạch đầu giờ (bắt buộc chạy trước khi làm bài)
└── vps-inspector.js        ← Script tự động quét, kiểm tra điểm số và mã hóa báo cáo cuối giờ
```

## 2. Hướng dẫn nhanh quy trình làm bài

1. **Bước 1: Kiểm tra VPS sạch đầu giờ**
   - Mở terminal trên VPS, di chuyển vào thư mục `hackathon/`:
     ```bash
     cd ~/hackathon
     node init-check.js
     ```
   - *Đảm bảo sinh ra file `submission-content/init-check-report.enc`.*

2. **Bước 2: Khởi tạo cơ sở dữ liệu PostgreSQL**
   - Chỉnh sửa `hackathon/backend-app/init.sql` (điền tên user là tên viết tắt của bạn và mật khẩu).
   - Import vào PostgreSQL:
     ```bash
     sudo -u postgres psql -f hackathon/backend-app/init.sql
     ```

3. **Bước 3: Cấu hình Backend Python FastAPI**
   - Chỉnh sửa `hackathon/backend-app/app.py` (điền thông tin kết nối database `DB_CONFIG` vừa tạo ở bước 2).
   - Cài đặt thư viện:
     ```bash
     cd ~/hackathon/backend-app
     pip3 install -r requirements.txt
     ```
   - Tạo file Systemd Service mang tên `[tên_viết_tắt]-fastapi.service` trong `/etc/systemd/system/`, phân quyền `644`, kích hoạt và chạy ngầm trên cổng `8000`.

4. **Bước 4: Cấu hình Web Server Nginx & Reverse Proxy**
   - Tạo Virtual Host mang tên `[tên_viết_tắt]-web.conf` trong `/etc/nginx/sites-available/`, symlink sang `/etc/nginx/sites-enabled/`.
   - Cấu hình lắng nghe cổng `8080`, phục vụ trang tĩnh `/` với thông tin cá nhân hóa, reverse proxy `/v1/service/` chuyển tiếp về `http://127.0.0.1:8000/`.
   - Mở tường lửa UFW cho cổng `8080`, `22` và chặn `5432`.

5. **Bước 5: Kiểm định cuối giờ & Nộp bài**
   - Xuất lịch sử terminal: `history > submission-content/history.log`.
   - Copy file cấu hình Nginx (`[user]-web.conf`) và Systemd (`[user]-fastapi.service`) vào `submission-content/`.
   - Chạy kiểm định tự động:
     ```bash
     cd ~/hackathon
     node vps-inspector.js
     ```
   - *Đảm bảo sinh ra file `submission-content/report.enc`.*
   - Dùng SFTP tải toàn bộ thư mục `hackathon/` về máy tính và nộp bài lên RAIA.
