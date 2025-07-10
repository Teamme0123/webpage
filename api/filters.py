import django_filters
from .models import FileMetadata, UploadLog, User

class FileMetadataFilter(django_filters.FilterSet):
    original_filename = django_filters.CharFilter(lookup_expr='icontains')
    category = django_filters.CharFilter(lookup_expr='iexact')
    uploaded_by_username = django_filters.CharFilter(field_name='uploaded_by__username', lookup_expr='iexact')
    uploaded_at_after = django_filters.DateTimeFilter(field_name='uploaded_at', lookup_expr='gte')
    uploaded_at_before = django_filters.DateTimeFilter(field_name='uploaded_at', lookup_expr='lte')

    class Meta:
        model = FileMetadata
        fields = ['original_filename', 'category', 'mime_type', 'uploaded_by_username', 'uploaded_at_after', 'uploaded_at_before']


class UploadLogFilter(django_filters.FilterSet):
    username = django_filters.CharFilter(field_name='user__username', lookup_expr='icontains')
    action = django_filters.ChoiceFilter(choices=UploadLog.ACTION_CHOICES)
    timestamp_after = django_filters.DateTimeFilter(field_name='timestamp', lookup_expr='gte')
    timestamp_before = django_filters.DateTimeFilter(field_name='timestamp', lookup_expr='lte')

    class Meta:
        model = UploadLog
        fields = ['username', 'action', 'timestamp_after', 'timestamp_before']

class UserFilter(django_filters.FilterSet):
    username = django_filters.CharFilter(lookup_expr='icontains')
    email = django_filters.CharFilter(lookup_expr='icontains')
    role_name = django_filters.CharFilter(field_name='role__name', lookup_expr='iexact')

    class Meta:
        model = User
        fields = ['username', 'email', 'role_name', 'is_active', 'is_staff']
