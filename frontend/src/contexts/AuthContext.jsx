import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState(() => {
    const storedAuthToken = localStorage.getItem('authToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');
    if (storedAuthToken && storedRefreshToken) {
      return { access: storedAuthToken, refresh: storedRefreshToken };
    }
    return null;
  });
  const [loadingAuth, setLoadingAuth] = useState(true); // For initial auth check and subsequent loads

  const fetchUserDetails = async (accessToken) => {
    setLoadingAuth(true);
    try {
      // Use /api/users/me/ as it's designed for the authenticated user
      const response = await axios.get('/api/users/me/', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setUser(response.data); // response.data should be the UserSerializer output
      localStorage.setItem('authUser', JSON.stringify(response.data)); // Persist for quick access by Navbar
    } catch (error) {
      console.error("Failed to fetch user details or token invalid:", error);
      // Token might be invalid/expired, so logout
      logout(); // This will clear tokens and user
    } finally {
      setLoadingAuth(false);
    }
  };

  // Effect to manage axios interceptors and initial user load
  useEffect(() => {
    if (tokens?.access) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${tokens.access}`;
      if (!user) { // If user is not set, try to fetch
        fetchUserDetails(tokens.access);
      } else {
        setLoadingAuth(false); // User already loaded
      }
    } else {
      // No token, ensure user is cleared and no auth header
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      localStorage.removeItem('authUser');
      setLoadingAuth(false);
    }

    // Axios response interceptor for token refresh (simplified example)
    const interceptor = axios.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry && tokens?.refresh) {
          originalRequest._retry = true;
          try {
            const refreshResponse = await axios.post('/api/auth/login/refresh/', { refresh: tokens.refresh });
            const newAccessToken = refreshResponse.data.access;
            localStorage.setItem('authToken', newAccessToken);
            setTokens(prevTokens => ({ ...prevTokens, access: newAccessToken }));
            axios.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
            return axios(originalRequest);
          } catch (refreshError) {
            console.error("Token refresh failed:", refreshError);
            logout(); // Refresh failed, logout user
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor); // Cleanup interceptor
  }, [tokens]); // Rerun when tokens change


  const login = async (username, password) => {
    setLoadingAuth(true);
    try {
      const response = await axios.post('/api/auth/login/', { username, password });
      const { access, refresh } = response.data;

      localStorage.setItem('authToken', access);
      localStorage.setItem('refreshToken', refresh);
      setTokens({ access, refresh }); // This will trigger the useEffect to set headers and fetch user
      // fetchUserDetails will be called by the useEffect due to token change
      return true;
    } catch (error) {
      console.error("Login failed in AuthContext:", error);
      logout();
      setLoadingAuth(false);
      throw error;
    }
  };

  const register = async (userData) => {
    setLoadingAuth(true);
    try {
        await axios.post('/api/auth/register/', userData);
        // No automatic login after register, user should go to login page
        setLoadingAuth(false);
        return true;
    } catch (error) {
        console.error("Registration failed in AuthContext:", error);
        setLoadingAuth(false);
        throw error;
    }
  };

  const logout = () => {
    // Optional: Call backend logout to blacklist refresh token
    // if (tokens?.refresh) {
    //   axios.post('/api/auth/logout/', { refresh: tokens.refresh })
    //     .catch(err => console.error("Backend logout failed", err));
    // }
    setUser(null);
    setTokens(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('authUser');
    delete axios.defaults.headers.common['Authorization'];
    setLoadingAuth(false); // Not strictly necessary here unless something depends on it after logout
    // Could navigate to login page here: navigate('/login'); but context shouldn't handle navigation.
  };

  const value = {
    user,
    tokens,
    isAuthenticated: !!user, // User object is the source of truth for authentication status
    login,
    register,
    logout,
    loadingAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
