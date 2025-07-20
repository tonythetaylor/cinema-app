FROM python:3.10-slim
WORKDIR /app

# install deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# copy your code
COPY app app
COPY alembic alembic
COPY alembic.ini .

# vault.db will be bind-mounted at runtime

# production entrypoint: Gunicorn with 4 workers
CMD ["gunicorn", "app.main:app", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8000", "-w", "4"]