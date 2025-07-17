FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY main.py .
# vault.db is bind-mounted at runtime
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
