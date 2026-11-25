import json
import logging

from django.conf import settings
from django.http import HttpResponse, JsonResponse

log = logging.getLogger(__name__)

_INDEX_HTML = None
_CATALOGO_BYTES = None


def _index_html():
    global _INDEX_HTML
    if _INDEX_HTML is None or settings.DEBUG:
        _INDEX_HTML = (settings.FRONTEND_DIST / "index.html").read_bytes()
    return _INDEX_HTML


def _catalogo_bytes():
    global _CATALOGO_BYTES
    if _CATALOGO_BYTES is None:
        ruta = settings.DATA_DIR / "catalogo.json"
        datos = json.loads(ruta.read_text("utf-8")) if ruta.exists() else []
        _CATALOGO_BYTES = json.dumps(datos, ensure_ascii=False).encode("utf-8")
    return _CATALOGO_BYTES


def spa(request, **kwargs):
    """Sirve la app React. Solo para rutas conocidas: el resto da 404 real."""
    resp = HttpResponse(_index_html(), content_type="text/html; charset=utf-8")
    resp["Cache-Control"] = "no-cache"
    return resp


def catalogo(request):
    resp = HttpResponse(_catalogo_bytes(), content_type="application/json; charset=utf-8")
    resp["Cache-Control"] = "public, max-age=60"
    return resp


def salud(request):
    return JsonResponse({"ok": True})


def error_404(request, exception=None):
    return HttpResponse(
        "<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\"><title>Página no encontrada</title></head>"
        "<body><p>Página no encontrada. <a href=\"/\">Volver a la tienda</a></p></body></html>",
        status=404,
        content_type="text/html; charset=utf-8",
    )


def error_500(request):
    return HttpResponse(
        "<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\"><title>Error</title></head>"
        "<body><p>Ha ocurrido un error. <a href=\"/\">Volver a la tienda</a></p></body></html>",
        status=500,
        content_type="text/html; charset=utf-8",
    )


def error_400(request, exception=None):
    return JsonResponse({"error": "Petición no válida"}, status=400)
