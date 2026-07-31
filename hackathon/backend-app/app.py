#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
PTIT DevOps Lab — API Backend (Python FastAPI for Exam 002)
Dịch vụ chạy ngầm trên cổng 8000, kết nối cơ sở dữ liệu PostgreSQL (port 5432).
"""

import time
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel
from typing import Optional
import uvicorn

app = FastAPI(
    title="PTIT DevOps Lab API Backend",
    description="Backend Service (Python FastAPI) cho bài thi Hackathon DevOps Đề 002",
    version="1.0.0"
)

# =======================================
# Cấu hình kết nối PostgreSQL
# Sinh viên tự điền tài khoản & mật khẩu PostgreSQL đã tạo ở bước 2.1
# =======================================
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "dbname": "ptit_devops_db",
    "user": "nchuong",
    "password": "12345678"
}

START_TIME = time.time()


def get_db_connection():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Lỗi kết nối PostgreSQL: {str(err)}"
        )


class StudentCreate(BaseModel):
    name: str
    student_code: str
    class_name: Optional[str] = None


# =======================================
# API Routes (Hỗ trợ cả path gốc và path proxy /v1/service/)
# =======================================

@app.get("/")
def root():
    return {
        "status": "running",
        "service": "PTIT DevOps API Backend (FastAPI)",
        "version": "1.0.0"
    }


@app.get("/health")
@app.get("/v1/service/health")
def health_check():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.close()
        conn.close()
        return {
            "healthy": True,
            "db": "connected (PostgreSQL)",
            "uptime": round(time.time() - START_TIME, 2)
        }
    except Exception as err:
        return {
            "healthy": False,
            "db": "disconnected",
            "error": str(err)
        }


@app.get("/students")
@app.get("/v1/service/students")
def get_students():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT id, name, student_code, class_name, created_at FROM students ORDER BY id ASC;")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return {"data": rows}
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


@app.post("/students", status_code=status.HTTP_201_CREATED)
@app.post("/v1/service/students", status_code=status.HTTP_201_CREATED)
def create_student(student: StudentCreate):
    if not student.name or not student.student_code:
        raise HTTPException(status_code=400, detail="name và student_code là bắt buộc")
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO students (name, student_code, class_name)
            VALUES (%s, %s, %s)
            RETURNING id;
            """,
            (student.name, student.student_code, student.class_name)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return {"message": "Đã thêm sinh viên", "id": new_id}
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


# =======================================
# Start Server trên cổng 8000
# =======================================
if __name__ == "__main__":
    print("[PTIT DevOps API] Server FastAPI đang khởi chạy tại http://127.0.0.1:8000")
    uvicorn.run(app, host="127.0.0.1", port=8000)
