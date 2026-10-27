from fastapi import FastAPI

# Khởi tạo ứng dụng FastAPI
app = FastAPI(
    title="Weather Dashboard Backend",
    description="API server for Weather Dashboard project",
    version="1.0.0"
)

# Endpoint đầu tiên (Root endpoint)
@app.get("/")
def read_root():
    return {
        "status": "success",
        "message": "Welcome to Weather Dashboard FastAPI Backend!"
    }

# Endpoint mẫu kiểm tra thời tiết (sẽ mở rộng ở các tuần tiếp theo)
@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "weather-api"}