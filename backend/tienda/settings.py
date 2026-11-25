import os
import secrets
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Build de React (copiado por el Dockerfile). En local apunta a ../frontend/dist
FRONTEND_DIST = Path(os.environ.get("FRONTEND_DIST", BASE_DIR / "frontend_dist"))
DATA_DIR = BASE_DIR / "data"

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY") or secrets.token_urlsafe(50)
DEBUG = os.environ.get("DJANGO_DEBUG") == "1"
ALLOWED_HOSTS = ["*"]

# Sin base de datos: el catálogo vive en memoria y los pedidos van al buzón / BigQuery
INSTALLED_APPS = ["django.contrib.staticfiles"]
DATABASES = {}

MIDDLEWARE = [
    "tienda.middleware.SeguridadMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "tienda.urls"
WSGI_APPLICATION = "tienda.wsgi.application"

TEMPLATES = []

USE_TZ = True
TIME_ZONE = "Europe/Madrid"
LANGUAGE_CODE = "es-es"

STATIC_URL = "/static/"
# whitenoise sirve el build de Vite en la raíz (/assets/..., /favicon.svg)
WHITENOISE_ROOT = FRONTEND_DIST
WHITENOISE_INDEX_FILE = False
WHITENOISE_IMMUTABLE_FILE_TEST = r"^/assets/"
WHITENOISE_MAX_AGE = 3600

APPEND_SLASH = False
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}
