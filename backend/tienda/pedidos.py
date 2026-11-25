"""Checkout: valida el carrito contra el catálogo, envía el pedido v1.0 al buzón y (opcional) a BigQuery."""
import json
import logging
import os
import re
import time
import urllib.error
import urllib.request
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings

log = logging.getLogger(__name__)

BUZON_URL = os.environ.get(
    "BUZON_URL", "https://hk-buzon-168798369712.europe-southwest1.run.app/api/pedido"
)
MAX_LINEAS = 200
MAX_CANTIDAD = 99
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_CENT = Decimal("0.01")

_productos_por_sku = None
_bq_pool = ThreadPoolExecutor(max_workers=2)
_bq_cliente = None


class PedidoInvalido(Exception):
    pass


class BuzonError(Exception):
    pass


def _catalogo():
    global _productos_por_sku
    if _productos_por_sku is None:
        datos = json.loads((settings.DATA_DIR / "catalogo.json").read_text("utf-8"))
        _productos_por_sku = {p["sku"]: p for p in datos.get("productos", [])}
    return _productos_por_sku


def _texto(valor, campo, maximo=300):
    if not isinstance(valor, str) or not valor.strip():
        raise PedidoInvalido(f"Falta {campo}")
    return valor.strip()[:maximo]


def construir_pedido(cuerpo: dict) -> dict:
    """Crea el pedido v1.0 con precios y nombres tomados SIEMPRE del catálogo (no del navegador)."""
    if not isinstance(cuerpo, dict):
        raise PedidoInvalido("Formato de pedido no válido")

    cliente = cuerpo.get("cliente") or {}
    if not isinstance(cliente, dict):
        raise PedidoInvalido("Faltan los datos del cliente")
    nombre = _texto(cliente.get("nombre"), "el nombre")
    email = _texto(cliente.get("email"), "el email", 200)
    direccion = _texto(cliente.get("direccion"), "la dirección", 500)
    if not _EMAIL.match(email):
        raise PedidoInvalido("El email no es válido")

    lineas = cuerpo.get("items")
    if not isinstance(lineas, list) or not lineas:
        raise PedidoInvalido("El carrito está vacío")

    catalogo = _catalogo()
    cantidades: dict[str, int] = {}
    for linea in lineas:
        if not isinstance(linea, dict):
            raise PedidoInvalido("Línea de carrito no válida")
        sku = linea.get("sku")
        cantidad = linea.get("cantidad")
        if sku not in catalogo:
            raise PedidoInvalido("Hay un producto en el carrito que ya no está disponible")
        if not isinstance(cantidad, int) or isinstance(cantidad, bool) or cantidad < 1:
            raise PedidoInvalido("Cantidad no válida")
        cantidades[sku] = min(cantidades.get(sku, 0) + cantidad, MAX_CANTIDAD)
    if len(cantidades) > MAX_LINEAS:
        raise PedidoInvalido("Demasiados productos distintos en un pedido")

    items, total = [], Decimal("0")
    for sku, cantidad in cantidades.items():
        p = catalogo[sku]
        precio = Decimal(str(p["precio"])).quantize(_CENT, ROUND_HALF_UP)
        total += precio * cantidad
        items.append({"sku": sku, "name": p["nombre"], "quantity": cantidad, "unit_price": float(precio)})

    return {
        "schema_version": "1.0",
        "order_id": str(uuid.uuid4()),
        "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "customer": {"name": nombre, "email": email, "address": direccion},
        "items": items,
        "currency": "EUR",
        "total": float(total.quantize(_CENT, ROUND_HALF_UP)),
    }


def enviar_al_buzon(pedido: dict) -> None:
    clave = os.environ.get("CLAVE_EQUIPO", "").strip()
    if not clave:
        log.error("CLAVE_EQUIPO no configurada: no se puede enviar el pedido al buzón")
        raise BuzonError("config")

    cuerpo = json.dumps(pedido, ensure_ascii=False).encode("utf-8")
    for intento in range(3):
        req = urllib.request.Request(
            BUZON_URL,
            data=cuerpo,
            method="POST",
            headers={"x-clave": clave, "content-type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=8) as r:
                if 200 <= r.status < 300:
                    return
        except urllib.error.HTTPError as e:
            detalle = e.read()[:500].decode("utf-8", "replace")
            log.error("Buzón respondió %s: %s", e.code, detalle)
            # 4xx (salvo 429) no se arregla reintentando
            if e.code < 500 and e.code != 429:
                raise BuzonError(str(e.code)) from e
        except (urllib.error.URLError, TimeoutError) as e:
            log.warning("Buzón inaccesible (intento %s): %s", intento + 1, e)
        time.sleep(0.5 * (intento + 1))
    raise BuzonError("sin respuesta")


# ---------- BigQuery (opcional: solo si BQ_TABLA = "proyecto.dataset.tabla") ----------

def _fila_bigquery(pedido: dict, sesion: str) -> dict:
    return {
        "order_id": pedido["order_id"],
        "created_at": pedido["created_at"],
        "customer_name": pedido["customer"]["name"],
        "customer_email": pedido["customer"]["email"],
        "customer_address": pedido["customer"]["address"],
        "currency": pedido["currency"],
        "total": pedido["total"],
        "num_unidades": sum(i["quantity"] for i in pedido["items"]),
        "sesion": sesion,
        "items": pedido["items"],
    }


def _insertar_bigquery(tabla: str, fila: dict) -> None:
    global _bq_cliente
    try:
        if _bq_cliente is None:
            from google.cloud import bigquery

            _bq_cliente = bigquery.Client()
        errores = _bq_cliente.insert_rows_json(tabla, [fila], row_ids=[fila["order_id"]])
        if errores:
            log.error("BigQuery rechazó el pedido %s: %s", fila["order_id"], errores)
    except Exception:
        log.exception("No se pudo guardar el pedido %s en BigQuery", fila["order_id"])


def guardar_en_bigquery(pedido: dict, sesion: str = "") -> None:
    """Se espera como máximo 3 s: Cloud Run congela la CPU tras responder, así que no puede quedar
    en segundo plano. Si BigQuery tarda o falla, la compra sigue (el buzón ya tiene el pedido)."""
    tabla = os.environ.get("BQ_TABLA", "").strip()
    if not tabla:
        return
    futuro = _bq_pool.submit(_insertar_bigquery, tabla, _fila_bigquery(pedido, sesion))
    try:
        futuro.result(timeout=3)
    except Exception:
        log.warning("BigQuery no respondió a tiempo para el pedido %s", pedido["order_id"])
