# --- Stage 1: Build Frontend ---
FROM node:18 AS frontend-builder
WORKDIR /app/frontend

# Install dependencies
COPY frontend/package*.json ./
RUN npm install

# Copy source and build
COPY frontend/ ./
RUN npm run build


# --- Stage 2: Build Backend & Serve ---
FROM python:3.11-slim

# Hugging Face Spaces requires running as a non-root user
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

# Copy backend requirements and install
COPY --chown=user backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source
COPY --chown=user backend/ ./backend/

# Copy the built frontend static files from Stage 1
COPY --chown=user --from=frontend-builder /app/frontend/dist ./frontend/dist

# Set working directory to backend so uvicorn runs correctly
WORKDIR /app/backend

# Expose the default Hugging Face Spaces port
EXPOSE 7860

# Run the FastAPI server on port 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
