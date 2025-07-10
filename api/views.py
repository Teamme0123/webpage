from django.contrib.auth import get_user_model
from django.core.files.storage import default_storage
from django.conf import settings
import os
from PIL import Image

from rest_framework import viewsets, status, generics, parsers
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.decorators import action

from .models import Role, Permission, FileMetadata, UploadLog, SiteContent, Notification
from .serializers import (
    UserSerializer, UserRegistrationSerializer, RoleSerializer, PermissionSerializer,
    FileMetadataSerializer, UploadLogSerializer, SiteContentSerializer, NotificationSerializer
)
from .permissions import (
    IsAdminUserOrReadOnly, CanManageUsers, CanManageRoles,
    CanManageSiteContent, CanUploadFiles, IsOwnerOrAdminOrReadOnly, IsRecipientOrAdmin
)
from .filters import FileMetadataFilter, UploadLogFilter, UserFilter # Import filters
from django_filters.rest_framework import DjangoFilterBackend # Import DjangoFilterBackend
from rest_framework import filters # For SearchFilter and OrderingFilter


User = get_user_model()

# Authentication Views
class UserRegistrationView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny] # Anyone can register

    def perform_create(self, serializer):
        user = serializer.save()
        # Log registration action
        UploadLog.objects.create(
            user=user,
            action='USER_SIGNUP',
            details=f"User {user.username} registered."
        )
        # Assign a default role like "Member" if it exists
        try:
            default_role = Role.objects.get(name="Member") # Ensure 'Member' role is created in migrations or manually
            user.role = default_role
            user.save()
        except Role.DoesNotExist:
            # Handle if default role doesn't exist (e.g., log a warning)
            print(f"Warning: Default role 'Member' not found for new user {user.username}")


class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            user = User.objects.get(username=request.data['username'])
            UploadLog.objects.create(
                user=user,
                action='USER_LOGIN',
                details=f"User {user.username} logged in."
            )
        return response

# Management ViewSets
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('id')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, CanManageUsers] # Admin/Manager role
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = UserFilter
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['username', 'email', 'date_joined', 'last_login', 'role__name']


    # Action to allow users to view/update their own profile
    @action(detail=False, methods=['get', 'put', 'patch'], url_path='me', permission_classes=[IsAuthenticated])
    def me(self, request):
        user = request.user
        if request.method == 'GET':
            serializer = self.get_serializer(user)
            return Response(serializer.data)
        elif request.method in ['PUT', 'PATCH']:
            # Prevent users from escalating privileges or changing critical fields directly
            # For 'me' endpoint, only allow certain fields to be updated
            # Or use a different serializer for user self-update
            serializer = self.get_serializer(user, data=request.data, partial=request.method == 'PATCH')
            serializer.is_valid(raise_exception=True)

            # Ensure user cannot change their role, is_staff, is_superuser via 'me'
            if 'role_name' in serializer.validated_data and not request.user.is_staff:
                 del serializer.validated_data['role_name']
            if 'is_staff' in serializer.validated_data and not request.user.is_staff:
                del serializer.validated_data['is_staff']
            if 'is_superuser' in serializer.validated_data and not request.user.is_staff:
                del serializer.validated_data['is_superuser']

            serializer.save()
            return Response(serializer.data)
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

    # Admin action to set user role
    @action(detail=True, methods=['post'], url_path='set-role', permission_classes=[IsAuthenticated, CanManageUsers])
    def set_role(self, request, pk=None):
        user = self.get_object()
        role_name = request.data.get('role_name')
        if not role_name:
            return Response({'error': 'Role name is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            role = Role.objects.get(name=role_name)
            user.role = role
            user.save()
            UploadLog.objects.create(
                user=request.user, # Admin performing action
                action='ROLE_ASSIGNED',
                details=f"Role '{role.name}' assigned to user '{user.username}' by '{request.user.username}'."
            )
            return Response({'status': f'Role {role.name} assigned to user {user.username}'})
        except Role.DoesNotExist:
            return Response({'error': f'Role {role_name} not found.'}, status=status.HTTP_404_NOT_FOUND)


class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all().order_by('id')
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated, CanManageRoles] # Admin/Manager role for roles

class PermissionViewSet(viewsets.ModelViewSet):
    queryset = Permission.objects.all().order_by('id')
    serializer_class = PermissionSerializer
    permission_classes = [IsAuthenticated, IsAdminUser] # Typically only SuperAdmins manage raw permissions

# File Management
class FileMetadataViewSet(viewsets.ModelViewSet):
    queryset = FileMetadata.objects.all().order_by('-uploaded_at')
    serializer_class = FileMetadataSerializer
    parser_classes = [parsers.MultiPartParser, parsers.FormParser] # For file uploads
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = FileMetadataFilter
    search_fields = ['original_filename', 'description', 'category', 'uploaded_by__username']
    ordering_fields = ['original_filename', 'uploaded_at', 'size_bytes', 'category']


    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated(), CanUploadFiles()]
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsOwnerOrAdminOrReadOnly()]
        return [IsAuthenticated()] # Read access for authenticated users

    def perform_create(self, serializer):
        uploaded_file = self.request.FILES.get('file')
        if not uploaded_file:
            raise serializers.ValidationError({'file': 'No file provided.'})

        # Sanitize original_filename (optional, but good practice)
        original_filename = os.path.basename(uploaded_file.name)

        # Define file path (e.g., in MEDIA_ROOT/user_<id>/<filename>)
        # Ensure user-specific directory exists
        user_upload_dir = os.path.join(settings.MEDIA_ROOT, f"user_{self.request.user.id}")
        os.makedirs(user_upload_dir, exist_ok=True)

        # Avoid filename collisions (e.g., by adding UUID or timestamp)
        # For simplicity, using original name here, but collision handling is important for production
        file_path_on_disk = os.path.join(user_upload_dir, original_filename)

        # Save the file to disk
        file_name_on_storage = default_storage.save(file_path_on_disk, uploaded_file)
        relative_file_path = os.path.relpath(file_name_on_storage, settings.MEDIA_ROOT)


        # Thumbnail generation for images
        thumbnail_rel_path = None
        try:
            if uploaded_file.content_type.startswith('image/'):
                img = Image.open(file_name_on_storage)
                img.thumbnail((128, 128)) # desired thumbnail size
                thumb_name, thumb_ext = os.path.splitext(original_filename)
                thumb_filename = f"{thumb_name}_thumb{thumb_ext}"
                thumb_path_on_disk = os.path.join(user_upload_dir, thumb_filename)
                img.save(thumb_path_on_disk)
                thumbnail_rel_path = os.path.relpath(thumb_path_on_disk, settings.MEDIA_ROOT)
        except Exception as e:
            print(f"Error generating thumbnail for {original_filename}: {e}")
            # Optionally: clean up main file if thumbnail is critical and failed

        file_instance = serializer.save(
            uploaded_by=self.request.user,
            original_filename=original_filename,
            filename=os.path.basename(relative_file_path), # Just the filename part for storage reference
            file_path=relative_file_path,
            size_bytes=uploaded_file.size,
            mime_type=uploaded_file.content_type,
            thumbnail_path=thumbnail_rel_path,
            description=self.request.data.get('description', ''),
            category=self.request.data.get('category', '')
        )
        UploadLog.objects.create(
            user=self.request.user,
            file=file_instance,
            action='FILE_UPLOAD',
            details=f"File '{file_instance.original_filename}' uploaded."
        )

        # Trigger notification (example: for all staff users)
        # staff_users = User.objects.filter(is_staff=True)
        # for staff_user in staff_users:
        #     if staff_user != self.request.user: # Don't notify uploader
        #         Notification.objects.create(
        #             recipient=staff_user,
        #             message=f"New file '{file_instance.original_filename}' uploaded by {self.request.user.username}.",
        #             notification_type='NEW_FILE',
        #             # link= # TODO: add link to file detail view
        #         )


    # Custom action for downloading files - not strictly RESTful but common
    @action(detail=True, methods=['get'], url_path='download')
    def download_file(self, request, pk=None):
        instance = self.get_object()
        file_full_path = os.path.join(settings.MEDIA_ROOT, instance.file_path)

        if not default_storage.exists(file_full_path):
            return Response({"error": "File not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            # This is a simple way, for large files and production, consider Django's FileResponse
            # or offloading to Nginx (X-Accel-Redirect) or cloud storage signed URLs.
            with default_storage.open(file_full_path, 'rb') as f:
                response = Response(f.read(), content_type=instance.mime_type)
                response['Content-Disposition'] = f'attachment; filename="{instance.original_filename}"'

                UploadLog.objects.create(
                    user=request.user,
                    file=instance,
                    action='FILE_DOWNLOAD',
                    details=f"File '{instance.original_filename}' downloaded."
                )
                return response
        except Exception as e:
            return Response({"error": f"Could not read file: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def perform_destroy(self, instance):
        # Log before deleting
        UploadLog.objects.create(
            user=self.request.user,
            file=instance, # instance is still available here
            action='FILE_DELETE',
            details=f"File '{instance.original_filename}' deleted by {self.request.user.username}."
        )
        # Delete actual file from storage
        if instance.file_path:
            file_full_path = os.path.join(settings.MEDIA_ROOT, instance.file_path)
            if default_storage.exists(file_full_path):
                default_storage.delete(file_full_path)
        if instance.thumbnail_path:
            thumb_full_path = os.path.join(settings.MEDIA_ROOT, instance.thumbnail_path)
            if default_storage.exists(thumb_full_path):
                default_storage.delete(thumb_full_path)

        instance.delete()


class UploadLogViewSet(viewsets.ReadOnlyModelViewSet): # Typically read-only for audit
    queryset = UploadLog.objects.all().order_by('-timestamp')
    serializer_class = UploadLogSerializer
    permission_classes = [IsAuthenticated, IsAdminUser] # Only Admins can view all logs
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = UploadLogFilter
    search_fields = ['user__username', 'details', 'file__original_filename']
    ordering_fields = ['timestamp', 'user__username', 'action']

    def get_queryset(self):
        # Admins see all logs, regular users might see their own logs if we allow it
        if self.request.user.is_staff or self.request.user.is_superuser:
            return UploadLog.objects.all().order_by('-timestamp')
        return UploadLog.objects.filter(user=self.request.user).order_by('-timestamp')


class SiteContentViewSet(viewsets.ModelViewSet):
    queryset = SiteContent.objects.all()
    serializer_class = SiteContentSerializer
    lookup_field = 'section_key' # Use 'about_us', 'contact_info' as lookup

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), CanManageSiteContent()]
        return [AllowAny()] # Allow anyone to read site content (e.g., About Us)

    def perform_create(self, serializer):
        instance = serializer.save(last_updated_by=self.request.user)
        UploadLog.objects.create(
            user=self.request.user,
            action='SITE_CONTENT_UPDATED',
            details=f"Site content section '{instance.section_key}' created/updated."
        )

    def perform_update(self, serializer):
        instance = serializer.save(last_updated_by=self.request.user)
        UploadLog.objects.create(
            user=self.request.user,
            action='SITE_CONTENT_UPDATED',
            details=f"Site content section '{instance.section_key}' updated."
        )


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Users can only see their own notifications
        return Notification.objects.filter(recipient=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        # Typically notifications are created by the system, not directly by users via API
        # This endpoint might be more for admin-initiated notifications or system internal use
        # For now, let's assume it's for a case where an admin can create a notification for a user
        if not self.request.user.is_staff:
             raise PermissionDenied("You do not have permission to create notifications directly.")
        serializer.save() # Recipient should be in request.data

    @action(detail=False, methods=['post'], url_path='mark-all-as-read')
    def mark_all_as_read(self, request):
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({'status': 'All notifications marked as read.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='mark-as-read')
    def mark_as_read(self, request, pk=None):
        notification = self.get_object()
        if notification.recipient != request.user:
            return Response({'error': 'Not your notification.'}, status=status.HTTP_403_FORBIDDEN)
        notification.is_read = True
        notification.save()
        return Response(self.get_serializer(notification).data)

    # No destroy for users, maybe for admins or auto-cleanup
    def perform_destroy(self, instance):
        # Only allow user to delete their own notification or admin
        if instance.recipient != self.request.user and not self.request.user.is_staff:
            raise PermissionDenied("You cannot delete this notification.")
        instance.delete()

# Note: For FileMetadataViewSet create, the serializer FileMetadataSerializer has 'file' field commented out.
# The view's perform_create directly accesses request.FILES['file'].
# If 'file' field is active in serializer, DRF handles it, but custom logic for path/name might be complex there.
# Current approach in view is fine. Ensure FileMetadataSerializer's `file` field is `write_only=True` and `required=True` if used.
# For now, I'll keep it as is, with manual file handling in perform_create.
# The FileMetadataSerializer `original_filename` is `required=False`. This is good as it's derived from `request.FILES.get('file').name`.
# However, the serializer should probably not have `filename` and `file_path` as fillable by client. They are determined by server.
# The `read_only_fields` in FileMetadataSerializer covers this.Tool output for `overwrite_file_with_block`:
