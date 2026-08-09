# Milestone 4 — Docker containerization for deployment
# Build: docker build -t sports-injury-backend .
# Run:   docker run -p 8000:8000 sports-injury-backend

FROM python:3.11-slim

WORKDIR /app

# System libraries OpenCV needs to run headless in a container
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p uploads app/models_data

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
