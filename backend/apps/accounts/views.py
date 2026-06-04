from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, viewsets

from .serializers import RegisterSerializer, UserSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UserSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or getattr(user, "role", "") in {"admin", "staff"}:
            return User.objects.all().order_by("id")
        return User.objects.filter(id=user.id)
