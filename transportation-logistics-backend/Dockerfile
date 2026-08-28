FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# System libraries needed by ortools runtime (wheels are pre-compiled)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglpk40 \
    && rm -rf /var/lib/apt/lists/*

# Copy only requirements first for Docker layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend application code
COPY backend/ ./backend/
COPY seed.py .

# Railway injects $PORT; default to 8000 if unset
ENV PORT=8000

EXPOSE ${PORT}

# Run with uvicorn, listening on all interfaces
CMD uvicorn backend.main:app --host 0.0.0.0 --port ${PORT}
