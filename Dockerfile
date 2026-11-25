# ---------- 1) Build del frontend React ----------
FROM node:22-alpine AS frontend
WORKDIR /front
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ---------- 2) Django + gunicorn ----------
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080 \
    DJANGO_SETTINGS_MODULE=tienda.settings
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
COPY --from=frontend /front/dist ./frontend_dist
RUN useradd --create-home --uid 10001 app && chown -R app /app
USER app
EXPOSE 8080
CMD ["gunicorn", "-c", "gunicorn.conf.py", "tienda.wsgi:application"]
