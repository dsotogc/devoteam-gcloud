import json
import logging

from django.conf import settings
from django.http import HttpResponse, JsonResponse

from .asistente import obtener_recomendaciones, responder_pregunta
from .pedidos import BuzonError, PedidoInvalido, construir_pedido, enviar_al_buzon, guardar_en_bigquery

log = logging.getLogger(__name__)

_INDEX_HTML = None
_CATALOGO_BYTES = None
_RECOMENDACIONES_BYTES = None


def _index_html():
    global _INDEX_HTML
    if _INDEX_HTML is None or settings.DEBUG:
        _INDEX_HTML = (settings.FRONTEND_DIST / "index.html").read_bytes()
    return _INDEX_HTML


def _catalogo_bytes():
    global _CATALOGO_BYTES
    if _CATALOGO_BYTES is None:
        ruta = settings.DATA_DIR / "catalogo.json"
        datos = json.loads(ruta.read_text("utf-8")) if ruta.exists() else {"productos": []}
        _CATALOGO_BYTES = json.dumps(datos, ensure_ascii=False).encode("utf-8")
    return _CATALOGO_BYTES


def _recomendaciones_bytes():
    global _RECOMENDACIONES_BYTES
    if _RECOMENDACIONES_BYTES is None:
        _RECOMENDACIONES_BYTES = json.dumps(obtener_recomendaciones(), ensure_ascii=False).encode("utf-8")
    return _RECOMENDACIONES_BYTES


def spa(request, **kwargs):
    """Sirve la app React. Solo para rutas conocidas: el resto da 404 real."""
    resp = HttpResponse(_index_html(), content_type="text/html; charset=utf-8")
    resp["Cache-Control"] = "no-cache"
    return resp


def catalogo(request):
    resp = HttpResponse(_catalogo_bytes(), content_type="application/json; charset=utf-8")
    resp["Cache-Control"] = "public, max-age=60"
    return resp


def recomendaciones(request):
    resp = HttpResponse(_recomendaciones_bytes(), content_type="application/json; charset=utf-8")
    resp["Cache-Control"] = "public, max-age=300"
    return resp


def asistente(request):
    if request.method != "POST":
        return JsonResponse({"error": "Método no permitido"}, status=405)

    try:
        cuerpo = json.loads(request.body.decode("utf-8") or "{}")
    except (UnicodeDecodeError, json.JSONDecodeError):
        return JsonResponse({"error": "JSON no válido"}, status=400)

    if not isinstance(cuerpo, dict):
        return JsonResponse({"error": "Formato de petición no válido"}, status=400)

    pregunta = cuerpo.get("pregunta", "")
    respuesta = responder_pregunta(pregunta if isinstance(pregunta, str) else "")
    log.warning("ASISTENTE pregunta=%r respuesta=%r", str(pregunta)[:300], respuesta[:300])
    resp = JsonResponse({"respuesta": respuesta}, status=200, json_dumps_params={"ensure_ascii": False})
    resp["Cache-Control"] = "no-store"
    return resp


def crear_pedido(request):
    if request.method != "POST":
        return JsonResponse({"error": "Método no permitido"}, status=405)
    try:
        cuerpo = json.loads(request.body.decode("utf-8") or "{}")
    except (UnicodeDecodeError, json.JSONDecodeError):
        return JsonResponse({"error": "JSON no válido"}, status=400)

    try:
        pedido = construir_pedido(cuerpo)
    except PedidoInvalido as e:
        return JsonResponse({"error": str(e)}, status=422, json_dumps_params={"ensure_ascii": False})

    try:
        enviar_al_buzon(pedido)
    except BuzonError:
        return JsonResponse(
            {"error": "No hemos podido registrar el pedido. Pulsa «Pagar» de nuevo en unos segundos."},
            status=502,
            json_dumps_params={"ensure_ascii": False},
        )

    guardar_en_bigquery(pedido, request.COOKIES.get("hk_sesion", ""))
    resp = JsonResponse(
        {"ok": True, "order_id": pedido["order_id"], "total": pedido["total"], "items": pedido["items"]},
        status=201,
        json_dumps_params={"ensure_ascii": False},
    )
    resp["Cache-Control"] = "no-store"
    return resp


def salud(request):
    return JsonResponse({"ok": True})


def error_404(request, exception=None):
    return HttpResponse(
        '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Página no encontrada</title></head>'
        '<body><p>Página no encontrada. <a href="/">Volver a la tienda</a></p></body></html>',
        status=404,
        content_type="text/html; charset=utf-8",
    )


def error_500(request):
    return HttpResponse(
        '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Error</title></head>'
        '<body><p>Ha ocurrido un error. <a href="/">Volver a la tienda</a></p></body></html>',
        status=500,
        content_type="text/html; charset=utf-8",
    )


def error_400(request, exception=None):
    return JsonResponse({"error": "Petición no válida"}, status=400)
