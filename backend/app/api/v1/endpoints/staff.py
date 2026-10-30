"""DRF endpoints for staff management."""

from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from app.api.v1.permissions import IsAdmin
from app.models import User
from app.serializers import UserSerializer


class StaffListView(APIView):
    """GET /api/v1/staff/ — List staff members."""

    permission_classes = [IsAdmin]

    def get(self, request):
        staff = User.objects.filter(role=User.Role.STAFF).order_by("email")
        return Response(
            UserSerializer(staff, many=True).data,
            status=status.HTTP_200_OK,
        )


class StaffDetailView(APIView):
    """GET/PUT/DELETE /api/v1/staff/<id>/ — Manage a staff member."""

    permission_classes = [IsAdmin]

    def get(self, request, staff_id):
        try:
            staff_member = User.objects.get(id=staff_id, role=User.Role.STAFF)
        except User.DoesNotExist:
            return Response(
                {"error": "Staff member not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(UserSerializer(staff_member).data, status=status.HTTP_200_OK)

    def put(self, request, staff_id):
        try:
            staff_member = User.objects.get(id=staff_id, role=User.Role.STAFF)
        except User.DoesNotExist:
            return Response(
                {"error": "Staff member not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = UserSerializer(staff_member, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, staff_id):
        try:
            staff_member = User.objects.get(id=staff_id, role=User.Role.STAFF)
        except User.DoesNotExist:
            return Response(
                {"error": "Staff member not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        staff_member.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class StaffCreateView(APIView):
    """POST /api/v1/staff/create/ — Create a new staff member (admin only)."""

    permission_classes = [IsAdmin]

    def post(self, request):
        # This is handled by AdminCreateStaffView in auth.py
        # This endpoint is for completeness
        return Response(
            {"error": "Use /api/v1/auth/staff/ to create staff accounts."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )
