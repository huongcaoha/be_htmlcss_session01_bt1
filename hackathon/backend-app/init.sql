-- ================================================================
-- init.sql — Khởi tạo PostgreSQL Database cho bài thi Hackathon (ĐỀ 002)
-- Chạy với quyền postgres: sudo -u postgres psql -f init.sql
-- ================================================================

-- 1. Tạo user (Sinh viên tự thay thế các trường gạch dưới bằng thông tin của mình)
--    Yêu cầu: Tên user là tên viết tắt của sinh viên (ví dụ: nvan)
CREATE USER nchuong WITH PASSWORD '12345678';

-- 2. Tạo database
CREATE DATABASE ptit_devops_db OWNER nchuong;

-- 3. Cấp quyền cho user
GRANT ALL PRIVILEGES ON DATABASE ptit_devops_db TO nchuong;

-- 4. Kết nối vào database vừa tạo
\c ptit_devops_db;

-- 5. Tạo bảng students
CREATE TABLE IF NOT EXISTS students (
  id           SERIAL       PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  student_code VARCHAR(20)  NOT NULL UNIQUE,
  class_name   VARCHAR(50)  DEFAULT NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Gán quyền cho bảng students trong database ptit_devops_db
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO nchuong;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO nchuong;

-- 7. Chèn dữ liệu mẫu
INSERT INTO students (name, student_code, class_name) VALUES
  ('Nguyen Van An',    'B21DCCN001', 'CNTT1'),
  ('Tran Thi Bich',    'B21DCCN002', 'CNTT1'),
  ('Le Minh Duc',      'B21DCCN003', 'CNTT2'),
  ('Pham Thi Hang',    'B21DCCN004', 'CNTT2'),
  ('Hoang Van Khoa',   'B21DCCN005', 'CNTT3')
ON CONFLICT (student_code) DO NOTHING;

-- 8. Kiểm tra kết quả
SELECT '✔ Đã tạo bảng students và chèn bản ghi mẫu thành công trong PostgreSQL.' AS result;
