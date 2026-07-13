# Use a lightweight official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables to optimize Python execution in container
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

# Set working directory
WORKDIR /app

# Install basic system build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code, templates, and static directories
COPY api/ ./api/
COPY src/ ./src/
COPY templates/ ./templates/
COPY static/ ./static/

# Copy ML weights and metadata for serving recommendations
COPY models/ ./models/
COPY data/cleaned_styles.csv ./data/cleaned_styles.csv

# Note: For production deployments, large image datasets (data/images) are typically
# hosted on Object Storage (AWS S3, Google Cloud Storage) behind a CDN (CloudFront/Cloudflare).
# If you wish to package local images inside the container, uncomment the line below:
# COPY data/images/ ./data/images/

# Expose the serving port
EXPOSE 8000

# Start FastAPI server using Uvicorn
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
