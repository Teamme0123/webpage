import React, { useState, useEffect } from 'react';
import axios from 'axios';
// import { useAuth } from '../contexts/AuthContext'; // Recommended for user data and auth status

const UserProfilePage = () => {
  // const { user, tokens, loadingAuth, logout } = useAuth(); // Use from context
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true); // For profile data fetching
  const [error, setError] = useState('');

  // Simulate AuthContext for now (remove when AuthContext is fully integrated and used)
  const [authUserLocal, setAuthUserLocal] = useState(null); // Renamed to avoid conflict if useAuth is uncommented
  const [authTokenLocal, setAuthTokenLocal] = useState(null); // Renamed
  const [authLoadingLocal, setAuthLoadingLocal] = useState(true); // Renamed

  useEffect(() => {
    const storedUser = localStorage.getItem('authUser');
    const storedToken = localStorage.getItem('authToken');
    if (storedUser) setAuthUserLocal(JSON.parse(storedUser));
    if (storedToken) setAuthTokenLocal(storedToken);
    setAuthLoadingLocal(false);
  }, []);


  useEffect(() => {
    const fetchProfile = async () => {
      if (authLoadingLocal || !authTokenLocal) { // Use local state variables
        if (!authLoadingLocal && !authTokenLocal) setError("Authentication required. Please log in.");
        setLoading(false); // Not loading profile data if auth isn't ready
        return;
      }

      setLoading(true);
      setError('');
      try {
        const response = await axios.get('/api/users/me/', { // /me/ endpoint from UserViewSet
          headers: { Authorization: `Bearer ${authTokenLocal}` },
        });
        setProfileData(response.data);
      } catch (err) {
        console.error("Error fetching user profile:", err);
        if (err.response?.status === 401) {
            setError('Your session may have expired. Please log in again.');
        } else {
            setError('Failed to load user profile. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    // Only fetch profile if auth is not loading and token exists
    if (!authLoadingLocal) {
        fetchProfile();
    }
  }, [authTokenLocal, authLoadingLocal]); // Depend on local auth token and its loading state

  if (authLoadingLocal || loading) { // Check both auth loading and profile data loading
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-300px)]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-church-primary"></div>
        <p className="ml-4 text-lg text-gray-600">Loading Profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-md shadow-md my-8 max-w-md mx-auto text-center" role="alert">
        <p className="font-bold text-xl mb-2">Error</p>
        <p>{error}</p>
      </div>
    );
  }

  if (!profileData) {
    return <div className="text-center p-8 text-gray-600">User profile data could not be loaded.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 sm:p-8 bg-white rounded-xl shadow-2xl">
      <h1 className="text-3xl sm:text-4xl font-bold text-church-dark-text mb-8 text-center border-b pb-4">
        My Profile
      </h1>

      <div className="space-y-6 text-sm sm:text-base">
        <div className="flex flex-col sm:flex-row py-2 border-b border-gray-100">
          <strong className="w-full sm:w-1/3 text-gray-600 font-semibold">Username:</strong>
          <span className="w-full sm:w-2/3 text-gray-800">{profileData.username}</span>
        </div>
        <div className="flex flex-col sm:flex-row py-2 border-b border-gray-100">
          <strong className="w-full sm:w-1/3 text-gray-600 font-semibold">Email:</strong>
          <span className="w-full sm:w-2/3 text-gray-800">{profileData.email}</span>
        </div>
        <div className="flex flex-col sm:flex-row py-2 border-b border-gray-100">
          <strong className="w-full sm:w-1/3 text-gray-600 font-semibold">First Name:</strong>
          <span className="w-full sm:w-2/3 text-gray-800">{profileData.first_name || <span className="italic text-gray-500">Not set</span>}</span>
        </div>
        <div className="flex flex-col sm:flex-row py-2 border-b border-gray-100">
          <strong className="w-full sm:w-1/3 text-gray-600 font-semibold">Last Name:</strong>
          <span className="w-full sm:w-2/3 text-gray-800">{profileData.last_name || <span className="italic text-gray-500">Not set</span>}</span>
        </div>
        <div className="flex flex-col sm:flex-row py-2 border-b border-gray-100">
          <strong className="w-full sm:w-1/3 text-gray-600 font-semibold">Role:</strong>
          <span className="w-full sm:w-2/3 text-gray-800 capitalize">{profileData.role_name || <span className="italic text-gray-500">No role assigned</span>}</span>
        </div>
        <div className="flex flex-col sm:flex-row py-2 border-b border-gray-100">
          <strong className="w-full sm:w-1/3 text-gray-600 font-semibold">Joined:</strong>
          <span className="w-full sm:w-2/3 text-gray-800">{new Date(profileData.date_joined).toLocaleDateString()}</span>
        </div>
        <div className="flex flex-col sm:flex-row py-2">
          <strong className="w-full sm:w-1/3 text-gray-600 font-semibold">Last Login:</strong>
          <span className="w-full sm:w-2/3 text-gray-800">
            {profileData.last_login ? new Date(profileData.last_login).toLocaleString() : <span className="italic text-gray-500">Never</span>}
          </span>
        </div>

        {/*
        Future: Add a button to navigate to an edit profile page
        <div className="mt-10 pt-6 border-t">
          <Link
            to="/profile/edit"
            className="w-full sm:w-auto inline-block text-center bg-church-secondary hover:bg-yellow-400 text-church-primary font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Edit Profile
          </Link>
        </div>
        */}
      </div>
    </div>
  );
};

export default UserProfilePage;
