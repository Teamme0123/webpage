import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings

class Role(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

class Permission(models.Model):
    codename = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=255)

    def __str__(self):
        return self.name

class User(AbstractUser):
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    # Add any other custom fields for User here if needed in the future

    # Add related_name to avoid clashes with default User model's groups and user_permissions
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name='groups',
        blank=True,
        help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.',
        related_name="csmc_user_groups",  # Unique related_name
        related_query_name="user",
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name='user permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        related_name="csmc_user_permissions",  # Unique related_name
        related_query_name="user",
    )

class FileMetadata(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    filename = models.CharField(max_length=255) # Name on storage
    original_filename = models.CharField(max_length=255) # Original uploaded name
    file_path = models.CharField(max_length=1024) # Path or key in storage
    size_bytes = models.BigIntegerField()
    mime_type = models.CharField(max_length=100)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='uploaded_files')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    description = models.TextField(blank=True, null=True)
    thumbnail_path = models.CharField(max_length=1024, blank=True, null=True)
    category = models.CharField(max_length=100, blank=True, null=True) # Consider a Category model if management is needed

    def __str__(self):
        return self.original_filename

class UploadLog(models.Model):
    ACTION_CHOICES = [
        ('USER_SIGNUP', 'User Signup'),
        ('USER_LOGIN', 'User Login'),
        ('FILE_UPLOAD', 'File Upload'),
        ('FILE_DOWNLOAD', 'File Download'),
        ('FILE_DELETE', 'File Delete'),
        ('ROLE_ASSIGNED', 'Role Assigned'),
        ('SITE_CONTENT_UPDATED', 'Site Content Updated'),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='activity_logs')
    file = models.ForeignKey(FileMetadata, on_delete=models.SET_NULL, null=True, blank=True, related_name='logs')
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    details = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.user.username} - {self.action} at {self.timestamp.strftime('%Y-%m-%d %H:%M')}"

class SiteContent(models.Model):
    section_key = models.CharField(max_length=100, unique=True, primary_key=True) # e.g., 'about_us', 'contact_info'
    title = models.CharField(max_length=255)
    content_html = models.TextField()
    last_updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='updated_site_content')
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('NEW_FILE', 'New File Uploaded'),
        ('SYSTEM_ANNOUNCEMENT', 'System Announcement'),
        # Add more types as needed
    ]
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    message = models.TextField()
    link = models.URLField(blank=True, null=True) # Optional link to the relevant content
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)

    def __str__(self):
        return f"Notification for {self.recipient.username}: {self.message[:50]}"

# Add Role-Permission ManyToMany relationship through Role's field if not using Django's built-in Group/Permission system directly for app-specific roles.
# If we want to use Django's built-in Group for roles and Permission for permissions, we would map our Role concept to Group.
# For simplicity and directness with the schema, explicitly defining Role and Permission and linking them:
Role.add_to_class('permissions', models.ManyToManyField(Permission, blank=True, related_name='roles'))

# To make Django use our custom User model
# AUTH_USER_MODEL = 'api.User' needs to be set in settings.py
# This should be done BEFORE the first migration or after clearing the database.
# Since we are just starting, this is the right time.
