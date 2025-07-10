import React from 'react';
import { Link } from 'react-router-dom';
// import { FaChurch, FaFileUpload, FaUsers } from 'react-icons/fa'; // Example icons

const HomePage = () => {
  // Placeholder: Check if user is logged in
  const isAuthenticated = !!localStorage.getItem('authToken');

  return (
    <div className="text-center">
      <header className="bg-church-primary text-white py-12 sm:py-20 rounded-lg shadow-xl">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4">
            Welcome to CSMC ONA-ARA CHAPEL
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl mb-8 text-gray-200">
            A place of worship, community, and large file management.
          </p>
          {!isAuthenticated && (
            <Link
              to="/register"
              className="bg-church-secondary hover:bg-yellow-400 text-church-primary font-bold py-3 px-8 rounded-lg text-lg transition-colors duration-300 shadow-md"
            >
              Join Our Community
            </Link>
          )}
        </div>
      </header>

      <section className="py-12 sm:py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-semibold text-church-dark-text mb-10">
            Our Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
              {/* <FaChurch className="text-5xl text-church-primary mb-4 mx-auto" /> */}
              <div className="text-5xl text-church-primary mb-4 mx-auto">⛪</div> {/* Emoji placeholder */}
              <h3 className="text-2xl font-semibold text-church-dark-text mb-3">Worship With Us</h3>
              <p className="text-gray-600">
                Join our services and experience spiritual growth. Access sermon videos, audio, and notes.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
              {/* <FaFileUpload className="text-5xl text-church-primary mb-4 mx-auto" /> */}
              <div className="text-5xl text-church-primary mb-4 mx-auto">📤</div> {/* Emoji placeholder */}
              <h3 className="text-2xl font-semibold text-church-dark-text mb-3">Secure File Uploads</h3>
              <p className="text-gray-600">
                Easily upload and manage large church files, from media to important documents, with role-based access.
              </p>
              {isAuthenticated && (
                 <Link to="/upload" className="mt-4 inline-block text-church-primary hover:text-church-secondary font-semibold">
                   Upload Now &rarr;
                 </Link>
              )}
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
              {/* <FaUsers className="text-5xl text-church-primary mb-4 mx-auto" /> */}
              <div className="text-5xl text-church-primary mb-4 mx-auto">👥</div> {/* Emoji placeholder */}
              <h3 className="text-2xl font-semibold text-church-dark-text mb-3">Community & Roles</h3>
              <p className="text-gray-600">
                Connect with church members, manage user roles, and stay updated with notifications.
              </p>
               {isAuthenticated && (
                 <Link to="/profile" className="mt-4 inline-block text-church-primary hover:text-church-secondary font-semibold">
                   View Your Profile &rarr;
                 </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {isAuthenticated && (
        <section className="py-12 sm:py-16 bg-gray-200 rounded-lg">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl sm:text-4xl font-semibold text-church-dark-text mb-6">
              Quick Access
            </h2>
            <div className="space-x-0 space-y-4 sm:space-x-4 sm:space-y-0">
              <Link
                to="/files"
                className="bg-church-primary hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-md transition-colors duration-300 shadow-md"
              >
                View All Files
              </Link>
              <Link
                to="/upload"
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-md transition-colors duration-300 shadow-md"
              >
                Upload a New File
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default HomePage;
