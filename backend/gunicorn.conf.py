import os

import gunicorn.http.wsgi

# No anunciar el servidor ("Server: gunicorn")
gunicorn.http.wsgi.SERVER = "web"

bind = f"0.0.0.0:{os.environ.get('PORT', '8080')}"
worker_class = "gthread"
workers = int(os.environ.get("WEB_WORKERS", "2"))
threads = int(os.environ.get("WEB_THREADS", "16"))
timeout = 60
keepalive = 75
preload_app = True
accesslog = None
errorlog = "-"
loglevel = "warning"
