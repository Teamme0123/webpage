from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Role, Permission, FileMetadata, UploadLog, SiteContent, Notification

# Custom UserAdmin to include 'role'
class UserAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Custom Fields', {'fields': ('role',)}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Custom Fields', {'fields': ('role',)}),
    )
    list_display = BaseUserAdmin.list_display + ('role_display',) # Use a method for display
    list_filter = BaseUserAdmin.list_filter + ('role',)


    @admin.display(description='Role')
    def role_display(self, obj):
        return obj.role.name if obj.role else None

admin.site.register(User, UserAdmin)

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name',)
    filter_horizontal = ('permissions',) # For easier M2M selection

@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ('name', 'codename')
    search_fields = ('name', 'codename')

@admin.register(FileMetadata)
class FileMetadataAdmin(admin.ModelAdmin):
    list_display = ('original_filename', 'category', 'uploaded_by_username', 'uploaded_at', 'size_bytes_display', 'mime_type')
    list_filter = ('category', 'mime_type', 'uploaded_at', 'uploaded_by__username')
    search_fields = ('original_filename', 'description', 'uploaded_by__username')
    readonly_fields = ('filename', 'file_path', 'thumbnail_path', 'size_bytes', 'mime_type', 'uploaded_at', 'uploaded_by')

    def uploaded_by_username(self, obj):
        return obj.uploaded_by.username if obj.uploaded_by else None
    uploaded_by_username.short_description = 'Uploaded By'
    uploaded_by_username.admin_order_field = 'uploaded_by__username'


    def size_bytes_display(self, obj):
        # Convert bytes to a more readable format, e.g., KB, MB
        if obj.size_bytes is None:
            return "N/A"
        if obj.size_bytes < 1024:
            return f"{obj.size_bytes} B"
        elif obj.size_bytes < 1024**2:
            return f"{obj.size_bytes/1024:.2f} KB"
        elif obj.size_bytes < 1024**3:
            return f"{obj.size_bytes/(1024**2):.2f} MB"
        else:
            return f"{obj.size_bytes/(1024**3):.2f} GB"
    size_bytes_display.short_description = 'Size'
    size_bytes_display.admin_order_field = 'size_bytes'


    def get_readonly_fields(self, request, obj=None):
        if obj: # Editing an existing object
            # Prevent changing file identity fields after creation
            return self.readonly_fields + ('original_filename', 'uploaded_by')
        return self.readonly_fields

@admin.register(UploadLog)
class UploadLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'user_username', 'action', 'file_display', 'details_summary')
    list_filter = ('action', 'timestamp', 'user__username')
    search_fields = ('user__username', 'details', 'file__original_filename')
    readonly_fields = ('timestamp', 'user', 'action', 'file', 'details') # Logs should be immutable

    def user_username(self, obj):
        return obj.user.username
    user_username.short_description = 'User'
    user_username.admin_order_field = 'user__username'

    def file_display(self, obj):
        return obj.file.original_filename if obj.file else "N/A"
    file_display.short_description = "File"
    file_display.admin_order_field = 'file__original_filename'

    def details_summary(self, obj):
        return (obj.details[:75] + '...') if obj.details and len(obj.details) > 75 else obj.details
    details_summary.short_description = "Details"

    def has_add_permission(self, request):
        return False # Logs are created by the system

    def has_change_permission(self, request, obj=None):
        return False # Logs should not be changed


@admin.register(SiteContent)
class SiteContentAdmin(admin.ModelAdmin):
    list_display = ('section_key', 'title', 'updated_at', 'last_updated_by_username')
    search_fields = ('title', 'section_key', 'content_html')
    readonly_fields = ('updated_at', 'last_updated_by')

    def last_updated_by_username(self, obj):
        return obj.last_updated_by.username if obj.last_updated_by else None
    last_updated_by_username.short_description = 'Last Updated By'
    last_updated_by_username.admin_order_field = 'last_updated_by__username'


    def save_model(self, request, obj, form, change):
        if not obj.pk: # If creating new
             # You might want to set created_by here if you add such a field
            pass
        obj.last_updated_by = request.user
        super().save_model(request, obj, form, change)

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('recipient_username', 'message_summary', 'notification_type', 'created_at', 'is_read')
    list_filter = ('notification_type', 'is_read', 'created_at', 'recipient__username')
    search_fields = ('recipient__username', 'message')
    readonly_fields = ('created_at',)
    actions = ['mark_as_read', 'mark_as_unread']

    def recipient_username(self, obj):
        return obj.recipient.username
    recipient_username.short_description = 'Recipient'
    recipient_username.admin_order_field = 'recipient__username'

    def message_summary(self, obj):
        return (obj.message[:75] + '...') if obj.message and len(obj.message) > 75 else obj.message
    message_summary.short_description = "Message"

    def mark_as_read(self, request, queryset):
        queryset.update(is_read=True)
    mark_as_read.short_description = "Mark selected notifications as read"

    def mark_as_unread(self, request, queryset):
        queryset.update(is_read=False)
    mark_as_unread.short_description = "Mark selected notifications as unread"

# Reminder: The superuser creation failed in the sandbox.
# These admin configurations will be usable once a superuser can log in.
# For local development, `python manage.py createsuperuser` should be run.
