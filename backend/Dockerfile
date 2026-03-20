FROM python:3.11-slim
WORKDIR /app

# Install backend dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy everything from current folder (backend/) into /app
COPY . .

# Expose port (Cloud Run sets PORT env var automatically)
ENV PORT=8080
EXPOSE 8080

# Run the FastAPI app
# uvicorn main:app (since main.py is in the root of the source directory)
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
