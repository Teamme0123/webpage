import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// import { useAuth } from '../contexts/AuthContext'; // Assuming AuthContext
import axios from 'axios'; // For making API calls
import { jwtDecode } from 'jwt-decode'; // For decoding JWT

const LoginPage = () => {
  const navigate = useNavigate();
  // const { login } = useAuth(); // If using AuthContext
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.username || !formData.password) {
      setError('Both username and password are required.');
      setLoading(false);
      return;
    }

    try {
      // API endpoint for login (proxied by Vite config)
      const response = await axios.post('/api/auth/login/', formData);

      const { access, refresh } = response.data;

      // Store tokens in localStorage (or context/state management)
      localStorage.setItem('authToken', access);
      localStorage.setItem('refreshToken', refresh);

      // Decode token to get user info (optional, but useful for frontend)
      const decodedToken = jwtDecode(access);

      // A /api/users/me/ endpoint would be better for fetching full, reliable user details.
      // For now, storing what we can infer or have.
      const userDetails = {
        id: decodedToken.user_id,
        username: formData.username,
        // Attempt to get is_staff from token if backend includes it (custom claim)
        // This is NOT standard in SimpleJWT, backend needs to customize token payload.
        // is_staff: decodedToken.is_staff || false,
      };
      // Fetch full user details after login for roles/permissions
      // This is important for UI rendering based on roles.
      try {
        const meResponse = await axios.get('/api/users/me/', {
          headers: { Authorization: `Bearer ${access}` }
        });
        // Merge with meResponse.data which would have role, is_staff etc.
        // For example: userDetails.is_staff = meResponse.data.is_staff;
        // userDetails.role = meResponse.data.role_name;
        // For now, we'll just store the basic decoded token + username.
        // The Navbar uses localStorage.getItem('authUser') and JSON.parse.
        // It expects `is_staff` property.
        // Let's simulate fetching it for now or setting a default.
        // A proper solution would be to fetch from /api/users/me/
        // and then store it.
        // Placeholder:
         userDetails.is_staff = meResponse.data.is_staff; // Assuming /me returns this
         userDetails.email = meResponse.data.email;
         userDetails.role_name = meResponse.data.role_name;

      } catch (meError) {
        console.error("Could not fetch user details after login:", meError);
        // Still proceed with basic user info if /me fails
        userDetails.is_staff = false; // Default if /me fails
      }
      localStorage.setItem('authUser', JSON.stringify(userDetails));


      // If using AuthContext:
      // login(access, refresh, userDetails); // The context would handle storing userDetails

      setLoading(false);
      navigate('/'); // Redirect to homepage or dashboard after login
      // Force reload to update Navbar state. This is a workaround.
      // A proper context or state management solution (like Zustand, Redux, or even a simple React Context)
      // would update the UI without a full page reload.
      window.location.reload();

    } catch (err) {
      setLoading(false);
      if (err.response && err.response.data) {
        const errorData = err.response.data;
        if (errorData.detail) {
          setError(errorData.detail);
        } else if (typeof errorData === 'object') {
          // Handle cases where DRF returns field errors as an object
          const messages = [];
          for (const key in errorData) {
            if (Array.isArray(errorData[key])) {
              messages.push(`${key}: ${errorData[key].join(' ')}`);
            } else {
              messages.push(`${key}: ${errorData[key]}`);
            }
          }
          setError(messages.join(' '));
        } else {
          setError('Login failed. Please check your credentials and try again.');
        }
      } else {
        setError('Login failed. An unexpected error occurred.');
        console.error('Login error:', err);
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)] bg-church-light-bg py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-2xl">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-church-dark-text">
            Sign in to your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

          <div className="rounded-md shadow-sm">
            <div className="mb-4">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-church-primary focus:border-church-primary sm:text-sm"
                placeholder="Your username"
                value={formData.username}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-church-primary focus:border-church-primary sm:text-sm"
                placeholder="Your password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* <div className="flex items-center justify-between mt-6">
            <div className="text-sm">
              <a href="#" className="font-medium text-church-primary hover:text-indigo-500">
                Forgot your password?
              </a>
            </div>
          </div> */}

          <div className="mt-6">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-church-primary hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-church-primary disabled:bg-gray-400 transition-colors"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : "Sign in"}
            </button>
          </div>
        </form>
        <div className="text-sm text-center mt-6">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-church-primary hover:text-indigo-500">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
