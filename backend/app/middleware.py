"""Custom middleware for the billing app."""

from django.utils.deprecation import MiddlewareMixin


class CSRFExemptMiddleware(MiddlewareMixin):
    """Exempt API routes from CSRF protection.

    The React frontend on a different origin uses CORS with credentials.
    CSRF tokens are not practical for cross-origin SPA requests.
    CORS_ALLOWED_ORIGINS and SameSite cookies provide the security boundary.
    """

    def process_request(self, request):
        if request.path.startswith("/api/"):
            request.csrf_processing_done = True
        return None
