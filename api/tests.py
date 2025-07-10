from django.urls import reverse
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.conf import settings
import os
import shutil # For cleaning up media files after tests

from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from .models import Role, Permission, FileMetadata, UploadLog

User = get_user_model()

class AuthAPITests(APITestCase):
    def setUp(self):
        self.register_url = reverse('user_register')
        self.login_url = reverse('token_obtain_pair')
        self.user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'testpassword123',
            'password_confirm': 'testpassword123',
            'first_name': 'Test',
            'last_name': 'User'
        }
        # Ensure the 'Member' role exists for the registration view to assign it
        Role.objects.get_or_create(name='Member')


    def test_user_registration(self):
        """
        Ensure new users can register.
        """
        response = self.client.post(self.register_url, self.user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(User.objects.get().username, 'testuser')
        self.assertTrue(User.objects.get().check_password('testpassword123'))
        # Check if default role "Member" was assigned (if UserRegistrationView assigns it)
        self.assertIsNotNone(User.objects.get().role)
        self.assertEqual(User.objects.get().role.name, 'Member')
        # Check if UploadLog was created for USER_SIGNUP
        self.assertTrue(UploadLog.objects.filter(user=User.objects.get(), action='USER_SIGNUP').exists())


    def test_user_login(self):
        """
        Ensure registered users can log in and get JWT tokens.
        """
        # First, register the user
        self.client.post(self.register_url, self.user_data, format='json')

        login_data = {
            'username': 'testuser',
            'password': 'testpassword123'
        }
        response = self.client.post(self.login_url, login_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        # Check if UploadLog was created for USER_LOGIN
        self.assertTrue(UploadLog.objects.filter(user__username='testuser', action='USER_LOGIN').exists())

    def test_login_invalid_credentials(self):
        """
        Ensure login fails with invalid credentials.
        """
        login_data = {'username': 'testuser', 'password': 'wrongpassword'}
        response = self.client.post(self.login_url, login_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class FileAPITests(APITestCase):
    def setUp(self):
        self.list_create_url = reverse('filemetadata-list') # DRF default name for ViewSet list/create
        self.user = User.objects.create_user(username='uploader', password='password123', email='uploader@example.com')

        # Create a role and assign CanUploadFiles permission
        self.upload_permission, _ = Permission.objects.get_or_create(codename='can_upload_files', name='Can Upload Files')
        self.uploader_role, _ = Role.objects.get_or_create(name='File Uploader')
        self.uploader_role.permissions.add(self.upload_permission)
        self.user.role = self.uploader_role
        self.user.save()

        self.client = APIClient()
        self.client.force_authenticate(user=self.user) # Authenticate requests for this test case

        # Create a dummy file for upload
        self.dummy_file = SimpleUploadedFile(
            "test_file.txt",
            b"This is some test content.",
            content_type="text/plain"
        )
        self.dummy_image = SimpleUploadedFile(
            "test_image.png",
            b"fake image data", # Replace with actual minimal image data if needed for Pillow
            content_type="image/png"
        )

        # Ensure MEDIA_ROOT for tests is set and clean
        self.test_media_root = os.path.join(settings.BASE_DIR, 'test_media_root_files')
        settings.MEDIA_ROOT = self.test_media_root
        os.makedirs(settings.MEDIA_ROOT, exist_ok=True)


    def tearDown(self):
        # Clean up media files created during tests
        if os.path.exists(settings.MEDIA_ROOT):
            shutil.rmtree(settings.MEDIA_ROOT)
        # Restore original MEDIA_ROOT if it was changed
        # (This might be better handled with Django's settings override for tests)


    def test_file_upload_authenticated_user_with_permission(self):
        """
        Ensure an authenticated user with upload permission can upload a file.
        """
        data = {
            'file': self.dummy_file,
            'description': 'A test text file',
            'category': 'Document'
        }
        response = self.client.post(self.list_create_url, data, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(FileMetadata.objects.count(), 1)
        file_meta = FileMetadata.objects.first()
        self.assertEqual(file_meta.original_filename, 'test_file.txt')
        self.assertEqual(file_meta.uploaded_by, self.user)
        self.assertEqual(file_meta.category, 'Document')
        self.assertTrue(os.path.exists(os.path.join(settings.MEDIA_ROOT, file_meta.file_path)))
        # Check log
        self.assertTrue(UploadLog.objects.filter(user=self.user, file=file_meta, action='FILE_UPLOAD').exists())


    def test_image_upload_with_thumbnail_generation(self):
        """
        Ensure an image upload generates a thumbnail.
        """
        # A minimal valid PNG (1x1 transparent pixel)
        # (Pillow needs valid image data to open and save thumbnail)
        minimal_png_data = bytes.fromhex(
            '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489'
            '0000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082'
        )
        dummy_image_for_thumb = SimpleUploadedFile(
            "test_image_thumb.png",
            minimal_png_data,
            content_type="image/png"
        )

        data = {
            'file': dummy_image_for_thumb,
            'description': 'A test image for thumbnail',
            'category': 'Image'
        }
        response = self.client.post(self.list_create_url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        file_meta = FileMetadata.objects.first()
        self.assertIsNotNone(file_meta.thumbnail_path, "Thumbnail path should not be null for an image.")
        self.assertTrue(os.path.exists(os.path.join(settings.MEDIA_ROOT, file_meta.thumbnail_path)), "Thumbnail file should exist.")


    def test_file_upload_unauthenticated_user(self):
        """
        Ensure unauthenticated users cannot upload files.
        """
        self.client.logout() # Or self.client.force_authenticate(user=None)
        data = {'file': self.dummy_file}
        response = self.client.post(self.list_create_url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


    def test_file_upload_user_without_permission(self):
        """
        Ensure users without 'can_upload_files' permission cannot upload.
        """
        # Create a user without the specific role/permission
        other_user = User.objects.create_user(username='anotheruser', password='password123')
        self.client.force_authenticate(user=other_user)

        data = {'file': self.dummy_file}
        response = self.client.post(self.list_create_url, data, format='multipart')
        # This relies on CanUploadFiles permission correctly denying access
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


    def test_list_files_authenticated(self):
        """
        Ensure authenticated users can list files.
        """
        # Upload a file first to have something to list
        self.client.post(self.list_create_url, {'file': self.dummy_file, 'category': 'Test'}, format='multipart')

        response = self.client.get(self.list_create_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data.get('results', response.data)) > 0) # Handle pagination


    def test_delete_own_file(self):
        """
        Ensure user can delete their own file.
        """
        upload_response = self.client.post(self.list_create_url, {'file': self.dummy_file}, format='multipart')
        file_id = upload_response.data['id']

        delete_url = reverse('filemetadata-detail', kwargs={'pk': file_id})
        response = self.client.delete(delete_url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(FileMetadata.objects.count(), 0)
        # Check log
        self.assertTrue(UploadLog.objects.filter(user=self.user, action='FILE_DELETE').exists())


    def test_delete_other_user_file_not_admin(self):
        """
        Ensure a non-admin user cannot delete another user's file.
        """
        # User1 uploads a file
        self.client.post(self.list_create_url, {'file': self.dummy_file}, format='multipart')
        file_meta = FileMetadata.objects.first()

        # User2 tries to delete it
        user2 = User.objects.create_user(username='user2', password='password123')
        self.client.force_authenticate(user=user2)

        delete_url = reverse('filemetadata-detail', kwargs={'pk': file_meta.id})
        response = self.client.delete(delete_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN) # IsOwnerOrAdminOrReadOnly should deny
        self.assertEqual(FileMetadata.objects.count(), 1)


    def test_delete_other_user_file_as_admin(self):
        """
        Ensure an admin user can delete another user's file.
        """
        # User1 (non-admin) uploads a file
        self.client.post(self.list_create_url, {'file': self.dummy_file}, format='multipart')
        file_meta = FileMetadata.objects.first()

        # Admin user logs in
        admin_user = User.objects.create_superuser(username='admin', password='password123', email='admin@example.com')
        self.client.force_authenticate(user=admin_user)

        delete_url = reverse('filemetadata-detail', kwargs={'pk': file_meta.id})
        response = self.client.delete(delete_url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(FileMetadata.objects.count(), 0)

# TODO: Add tests for:
# - File download endpoint
# - File search and filtering
# - Role and Permission management APIs
# - SiteContent API
# - Notification API
# - UserViewSet specific actions like /me and /set-role
# - Pagination if implemented and tested
# - More edge cases for file uploads (e.g., large files if feasible in test, file type restrictions if implemented)
# - Test that UploadLog entries are created for various actions (download, delete, role assignment etc.)
# - Test thumbnail deletion when main file is deleted.

# Note on MEDIA_ROOT for tests:
# It's good practice to use Django's @override_settings decorator or a test-specific settings file
# to manage MEDIA_ROOT to avoid polluting the main media directory or needing manual cleanup.
# The setUp/tearDown with shutil.rmtree works for this example.
