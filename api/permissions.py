from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsAdminUserOrReadOnly(BasePermission):
    """
    Allows access only to admin users, or read-only access to anyone.
    """
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return request.user and request.user.is_staff

class IsAdminUser(BasePermission):
    """
    Allows access only to admin users (is_staff).
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_staff

class CanManageUsers(BasePermission):
    """
    Custom permission to check if the user has a role with 'can_manage_users' permission.
    Assumes user.role and role.permissions are set up.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser or request.user.is_staff: # Superusers/staff can always manage
            return True
        # Check role-based permission
        user_role = getattr(request.user, 'role', None)
        if user_role:
            return user_role.permissions.filter(codename='can_manage_users').exists()
        return False

class CanManageRoles(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True
        user_role = getattr(request.user, 'role', None)
        if user_role:
            return user_role.permissions.filter(codename='can_manage_roles').exists()
        return False

class CanManageSiteContent(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True
        user_role = getattr(request.user, 'role', None)
        if user_role:
            return user_role.permissions.filter(codename='can_edit_site_content').exists()
        return False

class CanUploadFiles(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Allow if user is admin/staff
        if request.user.is_superuser or request.user.is_staff:
            return True
        user_role = getattr(request.user, 'role', None)
        if user_role:
            # Check for a general upload permission or type-specific
            if user_role.permissions.filter(codename='can_upload_any_file').exists():
                return True
            # Example: check for specific file type upload permission based on view action or request data
            # For a generic 'can_upload_files' permission:
            if user_role.permissions.filter(codename='can_upload_files').exists():
                return True
        return False

class IsOwnerOrAdminOrReadOnly(BasePermission):
    """
    Object-level permission to only allow owners of an object or admins to edit it.
    Read-only for others.
    Assumes the model instance has an 'uploaded_by' attribute.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        # Write permissions are only allowed to the owner of the file or admin/staff.
        if hasattr(obj, 'uploaded_by'): # For FileMetadata
            return obj.uploaded_by == request.user or (request.user and request.user.is_staff)
        if hasattr(obj, 'user'): # For UploadLog, if one wanted to restrict its direct modification
             return obj.user == request.user or (request.user and request.user.is_staff)
        if hasattr(obj, 'recipient'): # For Notification
             return obj.recipient == request.user or (request.user and request.user.is_staff)
        # Fallback for other objects or if owner attribute is different
        return request.user and request.user.is_staff


class IsRecipientOrAdmin(BasePermission):
    """
    Object-level permission for Notifications. Only recipient or admin can access/modify.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        return obj.recipient == request.user or request.user.is_staff

# More specific permissions can be added, e.g., CanDeleteAnyFile, CanDeleteOwnFile, etc.
# These can be combined in views using `permission_classes = [IsAuthenticated, CanUploadFiles]`
# Or for more complex logic: `permission_classes = [IsAuthenticated, (CanUploadVideos | CanUploadImages)]`
# (using DRF's bitwise operators for permission composition if needed, or custom logic in has_permission)
