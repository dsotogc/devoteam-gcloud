from django.urls import path, re_path

from . import views

handler400 = "tienda.views.error_400"
handler404 = "tienda.views.error_404"
handler500 = "tienda.views.error_500"

urlpatterns = [
    path("", views.spa),
    path("catalogo.json", views.catalogo),
    path("api/asistente", views.asistente),
    path("api/asistente/", views.asistente),
    path("api/recomendaciones", views.recomendaciones),
    path("api/pedido", views.crear_pedido),
    path("salud", views.salud),
    # Rutas de la SPA (React Router)
    path("condiciones", views.spa),
    re_path(r"^(?:categoria|producto)/[\w\-]+/?$", views.spa),
    re_path(r"^(?:carrito|checkout|pedido|buscar)/?(?:[\w\-]+/?)?$", views.spa),
]
