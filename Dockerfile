# ── Stage 1: Build the React frontend ────────────────────────────────────
FROM node:20-slim AS frontend-builder

WORKDIR /frontend

# Copy package files first for better layer caching
COPY frontend/package.json frontend/package-lock.json ./

RUN npm ci --prefer-offline

# Copy all frontend source
COPY frontend/ ./

# Build the production bundle
RUN npm run build

# ── Stage 2: Python backend + bundled frontend ────────────────────────────
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Optional heavyweight model dependency for GPU builds.
ARG INSTALL_TRIBEV2=false
RUN if [ "$INSTALL_TRIBEV2" = "true" ]; then \
    pip install --no-cache-dir git+https://github.com/facebookresearch/tribev2.git ; \
    fi

# Copy all backend source
COPY . .

# Copy the built frontend into the static directory served by FastAPI
COPY --from=frontend-builder /frontend/dist /app/static

# Install staticfiles serving support
RUN pip install --no-cache-dir aiofiles

# Expose the port used by Hugging Face Spaces (must be 7860)
EXPOSE 7860

# Start uvicorn — serves both the API and the static frontend
CMD ["uvicorn", "backend.src.app:app", "--host", "0.0.0.0", "--port", "7860"]