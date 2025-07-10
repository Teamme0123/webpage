from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Role, Permission, FileMetadata, UploadLog, SiteContent, Notification
from django.contrib.auth.hashers import make_password

User = get_user_model()

class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'codename', 'name']

class RoleSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(many=True, read_only=True)
    permission_ids = serializers.PrimaryKeyRelatedField(
        many=True, write_only=True, queryset=Permission.objects.all(), source='permissions'
    )

    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'permissions', 'permission_ids']

class UserSerializer(serializers.ModelSerializer):
    role = serializersSlugRelatedField(slug_field='name', queryset=Role.objects.all(), allow_null=True, required=False)
    # role_id = serializers.PrimaryKeyRelatedField(queryset=Role.objects.all(), source='role', write_only=True, allow_null=True, required=False)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', #'role_id',
            'is_active', 'is_staff', 'is_superuser',
            'date_joined', 'last_login', 'password'
        ]
        extra_kwargs = {
            'password': {'write_only': True, 'required': False}, # Password is not required for updates, required for creation handled in view
            'date_joined': {'read_only': True},
            'last_login': {'read_only': True},
        }

    def create(self, validated_data):
        # Ensure password is hashed upon user creation
        if 'password' in validated_data:
            validated_data['password'] = make_password(validated_data['password'])
        else:
            # Set an unusable password if not provided, or handle as an error
            # For user creation via API, password should typically be required.
            # This can be enforced in the view or by setting required=True in extra_kwargs for create operations.
            raise serializers.ValidationError({"password": "Password is required for user creation."})

        role_data = validated_data.pop('role', None)
        user = User.objects.create(**validated_data)
        if role_data:
            user.role = role_data
            user.save()
        return user

    def update(self, instance, validated_data):
        # Hash password if it's being updated
        if 'password' in validated_data:
            instance.password = make_password(validated_data['password'])
            validated_data.pop('password') # remove it from validated_data to prevent default update mechanism from trying to set it again

        role_data = validated_data.pop('role', None)
        if role_data is not None: # Allows setting role to None or a new role
            instance.role = role_data

        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password_confirm', 'first_name', 'last_name')

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        # Basic password strength (example, can be expanded)
        if len(attrs['password']) < 8:
            raise serializers.ValidationError({"password": "Password must be at least 8 characters long."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        # Default role can be assigned here if needed, e.g., 'Member'
        # try:
        #     default_role = Role.objects.get(name='Member')
        #     user.role = default_role
        #     user.save()
        # except Role.DoesNotExist:
        #     # Handle case where default role doesn't exist
        #     pass
        return user


class FileMetadataSerializer(serializers.ModelSerializer):
    uploaded_by = serializers.SlugRelatedField(slug_field='username', read_only=True)
    # Use FileField for upload, but it's usually handled separately in views for large files
    # For metadata representation, file_path is fine.
    # file = serializers.FileField(write_only=True, required=False) # For actual upload

    class Meta:
        model = FileMetadata
        fields = [
            'id', 'original_filename', 'filename', 'file_path', 'size_bytes', 'mime_type',
            'uploaded_by', 'uploaded_at', 'description', 'thumbnail_path', 'category'
        ]
        read_only_fields = ['id', 'filename', 'file_path', 'size_bytes', 'mime_type', 'uploaded_at', 'thumbnail_path', 'uploaded_by']

    # If using 'file' field for upload in the serializer:
    # def create(self, validated_data):
    #     uploaded_file = validated_data.pop('file', None)
    #     instance = super().create(validated_data)
    #     if uploaded_file:
    #         # Logic to save file and update instance.file_path, instance.filename etc.
    #         # This is typically better handled in the view for large files.
    #         pass
    #     return instance


class UploadLogSerializer(serializers.ModelSerializer):
    user = serializers.SlugRelatedField(slug_field='username', read_only=True)
    file_original_name = serializers.CharField(source='file.original_filename', read_only=True, allow_null=True)

    class Meta:
        model = UploadLog
        fields = ['id', 'user', 'file', 'file_original_name', 'action', 'timestamp', 'details']
        read_only_fields = ['id', 'timestamp']


class SiteContentSerializer(serializers.ModelSerializer):
    last_updated_by = serializers.SlugRelatedField(slug_field='username', read_only=True)

    class Meta:
        model = SiteContent
        fields = ['section_key', 'title', 'content_html', 'last_updated_by', 'updated_at']
        read_only_fields = ['last_updated_by', 'updated_at']


class NotificationSerializer(serializers.ModelSerializer):
    recipient = serializers.SlugRelatedField(slug_field='username', read_only=True)

    class Meta:
        model = Notification
        fields = ['id', 'recipient', 'message', 'link', 'created_at', 'is_read', 'notification_type']
        read_only_fields = ['id', 'created_at', 'recipient'] # Recipient is set by system
        extra_kwargs = {
            'is_read': {'required': False} # Allow partial update for marking as read
        }

# For UserSerializer, role field needs serializers.SlugRelatedField
# from rest_framework.relations import SlugRelatedField
# UserSerializer.fields['role'] = SlugRelatedField(slug_field='name', queryset=Role.objects.all(), allow_null=True, required=False)
# This was producing an error. Corrected by defining it directly in the class.

class UserLiteSerializer(serializers.ModelSerializer): # For embedding in other serializers if full user detail is not needed
    class Meta:
        model = User
        fields = ['id', 'username', 'email']
FileMetadataSerializer.Meta.fields.insert(6, 'uploaded_by_details') # Add a placeholder
FileMetadataSerializer.uploaded_by_details = UserLiteSerializer(source='uploaded_by', read_only=True)

UploadLogSerializer.Meta.fields.insert(1, 'user_details')
UploadLogSerializer.user_details = UserLiteSerializer(source='user', read_only=True)

SiteContentSerializer.Meta.fields.insert(3, 'last_updated_by_details')
SiteContentSerializer.last_updated_by_details = UserLiteSerializer(source='last_updated_by', read_only=True)
NotificationSerializer.Meta.fields.insert(1, 'recipient_details')
NotificationSerializer.recipient_details = UserLiteSerializer(source='recipient', read_only=True)

# Correction for UserSerializer role field:
# It was serializersSlugRelatedField which is not a standard DRF field.
# Should be serializers.SlugRelatedField
from rest_framework.relations import SlugRelatedField
UserSerializer.role = SlugRelatedField(slug_field='name', queryset=Role.objects.all(), allow_null=True, required=False)
# This is a bit hacky to redefine outside. Better to define it correctly inside the class.
# The initial definition inside UserSerializer was:
# role = serializers.SlugRelatedField(slug_field='name', queryset=Role.objects.all(), allow_null=True, required=False)
# This seems correct. The error might have been a typo like `serializersSlugRelatedField`.
# I'll ensure the class definition is correct.
# Re-checking UserSerializer: `role = serializersSlugRelatedField(slug_field='name', ...)` was indeed the typo.
# Corrected to `role = serializers.SlugRelatedField(slug_field='name', ...)`

# Final check on UserSerializer for role assignment on create/update:
# The source for role_id was 'role', which is fine.
# Using `role = serializers.SlugRelatedField(...)` for representation and
# `role_id = serializers.PrimaryKeyRelatedField(..., source='role', write_only=True)` for input is a common pattern.
# Or, handle the role object directly in create/update if using SlugRelatedField for input.
# The current UserSerializer.create/update methods handle a 'role' object coming from validated_data if SlugRelatedField is used for input.
# Let's adjust UserSerializer to use SlugRelatedField for both read and write for simplicity if the role name is unique and sufficient.

# Correcting UserSerializer for role handling:
# Use SlugRelatedField for readable role name, and allow it to be used for writing.
# The `to_internal_value` of SlugRelatedField will fetch the Role instance.
# The `create` and `update` methods already expect a Role instance for `validated_data['role']`.

# The typo `serializersSlugRelatedField` was the main issue.
# I have corrected it in the UserSerializer definition.
# The rest of the serializers seem okay for a first pass.
# File upload handling in FileMetadataSerializer is commented out as it's better done in views.
# Password handling in UserSerializer and UserRegistrationSerializer is included.
# Read-only fields are set.
# Nested/related object representations are basic (slug related or primary key).
# UserLiteSerializer is added for leaner nested user info.
# Dynamically adding fields like `uploaded_by_details` is a bit unusual; defining them directly in Meta.fields is cleaner.
# I'll refine that.

# Refined Serializers (removing dynamic field additions at the end and ensuring correct definitions)
# This block will be the actual content of the file.
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Role, Permission, FileMetadata, UploadLog, SiteContent, Notification
from django.contrib.auth.hashers import make_password

User = get_user_model()

class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'codename', 'name']

class RoleSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(many=True, read_only=True)
    permission_ids = serializers.PrimaryKeyRelatedField(
        many=True, write_only=True, queryset=Permission.objects.all(), source='permissions', required=False
    )

    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'permissions', 'permission_ids']

class UserLiteSerializer(serializers.ModelSerializer): # For embedding
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']

class UserSerializer(serializers.ModelSerializer):
    role_name = serializers.SlugRelatedField(source='role', slug_field='name', queryset=Role.objects.all(), allow_null=True, required=False)
    # Use role_name for representation and input. The source='role' maps it to the 'role' model field.

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role_name', # Changed from 'role' to 'role_name' for clarity
            'is_active', 'is_staff', 'is_superuser',
            'date_joined', 'last_login', 'password'
        ]
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
            'date_joined': {'read_only': True},
            'last_login': {'read_only': True},
        }

    def create(self, validated_data):
        if 'password' not in validated_data:
            raise serializers.ValidationError({"password": "Password is required for user creation."})
        validated_data['password'] = make_password(validated_data['password'])

        # The role object is already resolved by SlugRelatedField if 'role_name' was in validated_data and source='role'
        # validated_data will contain 'role': <Role instance> if 'role_name' was provided.
        return User.objects.create(**validated_data)

    def update(self, instance, validated_data):
        if 'password' in validated_data:
            instance.password = make_password(validated_data.pop('password'))

        # Role update is handled by default ModelSerializer update if 'role' is in validated_data
        return super().update(instance, validated_data)


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, required=True, label="Confirm password", style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password_confirm', 'first_name', 'last_name')

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "Password fields didn't match."})
        if len(attrs['password']) < 8: # Basic check
            raise serializers.ValidationError({"password": "Password must be at least 8 characters long."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        # We are creating a User instance directly, so role assignment, is_staff etc defaults from AbstractUser
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        # Assign a default role, e.g., "Member" after creation if desired
        # try:
        #     member_role = Role.objects.get(name="Member") # Ensure "Member" role exists
        #     user.role = member_role
        #     user.save()
        # except Role.DoesNotExist:
        #     pass # Or log a warning
        return user


class FileMetadataSerializer(serializers.ModelSerializer):
    uploaded_by_details = UserLiteSerializer(source='uploaded_by', read_only=True)
    # file = serializers.FileField(write_only=True, required=True) # For uploads, make required

    class Meta:
        model = FileMetadata
        fields = [
            'id', 'original_filename', #'file', # Add 'file' if handling upload directly via serializer
            'filename', 'file_path', 'size_bytes', 'mime_type',
            'uploaded_by', 'uploaded_by_details', 'uploaded_at',
            'description', 'thumbnail_path', 'category'
        ]
        read_only_fields = [
            'id', 'filename', 'file_path', 'size_bytes', 'mime_type',
            'uploaded_by', 'uploaded_by_details', 'uploaded_at', 'thumbnail_path'
        ]
        extra_kwargs = {
            'original_filename': {'required': False}, # Will be set from uploaded file name
            'description': {'required': False},
            'category': {'required': False}
        }

class UploadLogSerializer(serializers.ModelSerializer):
    user_details = UserLiteSerializer(source='user', read_only=True)
    file_original_name = serializers.CharField(source='file.original_filename', read_only=True, allow_null=True)

    class Meta:
        model = UploadLog
        fields = ['id', 'user', 'user_details', 'file', 'file_original_name', 'action', 'timestamp', 'details']
        read_only_fields = ['id', 'user', 'user_details', 'file', 'file_original_name', 'timestamp']


class SiteContentSerializer(serializers.ModelSerializer):
    last_updated_by_details = UserLiteSerializer(source='last_updated_by', read_only=True)

    class Meta:
        model = SiteContent
        fields = ['section_key', 'title', 'content_html', 'last_updated_by', 'last_updated_by_details', 'updated_at']
        read_only_fields = ['last_updated_by', 'last_updated_by_details', 'updated_at']


class NotificationSerializer(serializers.ModelSerializer):
    recipient_details = UserLiteSerializer(source='recipient', read_only=True)

    class Meta:
        model = Notification
        fields = ['id', 'recipient', 'recipient_details', 'message', 'link', 'created_at', 'is_read', 'notification_type']
        read_only_fields = ['id', 'created_at', 'recipient', 'recipient_details']
        extra_kwargs = {
            'is_read': {'required': False}
        }
