import React from 'react';
import { Link } from 'react-router-dom';
// import { useAuth } from '../contexts/AuthContext'; // For checking admin role

// Example: Icons for dashboard links
import { FaUsers, FaFileAlt, FaCogs, FaEdit, FaChartBar } from 'react-icons/fa';

const AdminDashboardPage = () => {
  // const { user } = useAuth(); // Get user to check if is_staff or has admin role

  // Placeholder for auth check (replace with AuthContext)
  const authUser = JSON.parse(localStorage.getItem('authUser'));
  if (!authUser || !authUser.is_staff) {
    // This check should ideally be handled by a ProtectedRoute/AdminRoute component in App.jsx
    return (
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p className="text-gray-700 mt-2">You do not have permission to view this page.</p>
        <Link to="/" className="text-church-primary hover:underline mt-4 inline-block">Go to Homepage</Link>
      </div>
    );
  }

  // Dashboard items - these would link to actual admin functionalities
  const dashboardItems = [
    { name: 'User Management', link: '/admin/users', icon: <FaUsers className="mr-3 text-xl group-hover:text-church-secondary" />, description: 'View, edit, and manage user accounts and roles.' },
    { name: 'File Management', link: '/admin/files', icon: <FaFileAlt className="mr-3 text-xl group-hover:text-church-secondary" />, description: 'Oversee all uploaded files, manage categories, and view logs.' },
    { name: 'Site Content', link: '/admin/site-content', icon: <FaEdit className="mr-3 text-xl group-hover:text-church-secondary" />, description: 'Edit content for About Us, Contact Us, and other site pages.' },
    { name: 'Role & Permissions', link: '/admin/roles', icon: <FaCogs className="mr-3 text-xl group-hover:text-church-secondary" />, description: 'Define user roles and their associated permissions.' },
    { name: 'View Activity Logs', link: '/admin/logs', icon: <FaChartBar className="mr-3 text-xl group-hover:text-church-secondary" />, description: 'Monitor site activity and user actions.' },
    // Add more items as needed, e.g., System Settings, Backup Management
  ];

  return (
    <div className="max-w-5xl mx-auto p-6 sm:p-8">
      <h1 className="text-3xl sm:text-4xl font-bold text-church-dark-text mb-10 text-center border-b pb-4">
        Administrator Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardItems.map((item) => (
          <Link
            key={item.name}
            to={item.link}
            className="group bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl hover:bg-church-primary transition-all duration-300 flex flex-col"
          >
            <div className="flex items-center text-2xl font-semibold text-church-primary group-hover:text-white mb-3">
              {item.icon}
              {item.name}
            </div>
            <p className="text-gray-600 group-hover:text-gray-200 text-sm flex-grow">
              {item.description}
            </p>
            <div className="mt-4 text-right text-church-primary group-hover:text-church-secondary font-medium">
                Manage &rarr;
            </div>
          </Link>
        ))}
      </div>

      {/* Placeholder for quick stats or summaries */}
      {/*
      <div className="mt-12 p-6 bg-white rounded-xl shadow-lg">
        <h2 className="text-2xl font-semibold text-church-dark-text mb-4">Quick Stats</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-3xl font-bold text-church-primary">120</p>
            <p className="text-gray-600">Registered Users</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-3xl font-bold text-church-primary">560</p>
            <p className="text-gray-600">Files Uploaded</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-3xl font-bold text-church-primary">24</p>
            <p className="text-gray-600">New Logs Today</p>
          </div>
        </div>
      </div>
      */}
    </div>
  );
};

export default AdminDashboardPage;
