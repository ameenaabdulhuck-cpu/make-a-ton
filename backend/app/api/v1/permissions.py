"""Custom permission classes for role-based access control."""

from rest_framework.permissions import BasePermission

from app.models import User


class IsAdmin(BasePermission):
    """Only admin users can access."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.ADMIN
        )


class IsStaff(BasePermission):
    """Staff and admin users can access."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in (User.Role.STAFF, User.Role.ADMIN)
        )


class IsCustomer(BasePermission):
    """Only customer users can access."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.CUSTOMER
        )


class IsStaffOrCustomer(BasePermission):
    """Staff, admin, and customer users can access."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role
            in (User.Role.STAFF, User.Role.ADMIN, User.Role.CUSTOMER)
        )


class IsOwnerOrStaff(BasePermission):
    """Object-level permission: owners or staff/admin can access."""

    def has_object_permission(self, request, view, obj):
        # Staff and admin can access everything
        if request.user.role in (User.Role.STAFF, User.Role.ADMIN):
            return True
        # Customers can access their own objects
        if hasattr(obj, "customer"):
            return obj.customer.user == request.user
        if hasattr(obj, "user"):
            return obj.user == request.user
        return False
