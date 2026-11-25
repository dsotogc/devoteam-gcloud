import secrets

CSP = "; ".join(
    [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
    ]
)

COOKIE_SESION = "hk_sesion"


class SeguridadMiddleware:
    """Cabeceras de seguridad + cookie de sesión hk_sesion en todas las respuestas."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        response["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
        response["X-Content-Type-Options"] = "nosniff"
        response["Content-Security-Policy"] = CSP
        response["X-Frame-Options"] = "DENY"
        response["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        for h in ("Server", "X-Powered-By"):
            if h in response:
                del response[h]

        if COOKIE_SESION not in request.COOKIES:
            response.set_cookie(
                COOKIE_SESION,
                secrets.token_urlsafe(24),
                max_age=60 * 60 * 24 * 30,
                secure=True,
                httponly=True,
                samesite="Lax",
                path="/",
            )
        return response
