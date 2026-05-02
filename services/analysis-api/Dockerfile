FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# ---------------------------------------------------------------------------
# Test stage — runs the full pytest suite inside the container
# Build with: docker build --target test -t analysis-api-test .
# Run with:   docker run --rm analysis-api-test
# ---------------------------------------------------------------------------
FROM base AS test

COPY tests ./tests

CMD ["python", "-m", "pytest", "tests/", "-v"]

# ---------------------------------------------------------------------------
# Production stage (default)
# ---------------------------------------------------------------------------
FROM base AS production

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
