from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    UserRegistrationView, CustomTokenObtainPairView,
    UserViewSet, RoleViewSet, PermissionViewSet,
    FileMetadataViewSet, UploadLogViewSet, SiteContentViewSet, NotificationViewSet
)

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'roles', RoleViewSet)
router.register(r'permissions', PermissionViewSet)
router.register(r'files', FileMetadataViewSet)
router.register(r'logs', UploadLogViewSet)
router.register(r'site-content', SiteContentViewSet, basename='sitecontent') # basename if lookup_field is not pk
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    # Auth
    path('auth/register/', UserRegistrationView.as_view(), name='user_register'),
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # todo: Add logout (requires token blacklisting if using refresh tokens extensively)
    # path('auth/logout/', LogoutView.as_view(), name='user_logout'),

    # ViewSet routes
    path('', include(router.urls)),
]
