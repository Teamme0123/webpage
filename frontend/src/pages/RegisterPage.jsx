import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    setSuccessMessage('');

    // Basic client-side validation for password match
    if (formData.password !== formData.password_confirm) {
      setErrors({ password_confirm: ["Passwords do not match."] }); // Keep error format consistent (array)
      setLoading(false);
      return;
    }
    // Basic client-side validation for password length
    if (formData.password.length < 8) {
        setErrors({ password: ["Password must be at least 8 characters long."] });
        setLoading(false);
        return;
    }


    try {
      // Data matches UserRegistrationSerializer: username, email, password, password_confirm, first_name, last_name
      await axios.post('/api/auth/register/', {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        password_confirm: formData.password_confirm,
        first_name: formData.first_name,
        last_name: formData.last_name,
      });

      setLoading(false);
      setSuccessMessage('Registration successful! Please log in.');
      setTimeout(() => {
        navigate('/login');
      }, 3000); // Increased delay for user to read success message

    } catch (err) {
      setLoading(false);
      if (err.response && err.response.data) {
        setErrors(err.response.data); // DRF validation errors are typically field-keyed
      } else {
        setErrors({ general: ['Registration failed. An unexpected error occurred.'] }); // Use array for consistency
        console.error('Registration error:', err);
      }
    }
  };

  // Helper to display field errors
  const displayError = (fieldName) => {
    if (errors && errors[fieldName]) {
      // DRF errors are arrays of strings
      return <p className="text-red-500 text-xs mt-1">{errors[fieldName].join(' ')}</p>;
    }
    return null;
  };

  // Helper to display non-field errors (from DRF non_field_errors or custom general errors)
   const displayGeneralError = () => {
    if (errors && errors.general) {
      return <div className="form-error-general" role="alert">{errors.general.join(' ')}</div>;
    }
    if (errors && errors.detail) { // Sometimes DRF uses 'detail' for general errors
        return <div className="form-error-general" role="alert">{errors.detail}</div>;
    }
    return null;
  };


  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)] bg-church-light-bg py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8 bg-white p-10 rounded-xl shadow-2xl">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-church-dark-text">
            Create your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {displayGeneralError()}
          {successMessage && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">{successMessage}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username <span className="text-red-500">*</span></label>
              <input id="username" name="username" type="text" required className="input-field" placeholder="Choose a username" value={formData.username} onChange={handleChange} />
              {displayError('username')}
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email address <span className="text-red-500">*</span></label>
              <input id="email" name="email" type="email" autoComplete="email" required className="input-field" placeholder="Your email" value={formData.email} onChange={handleChange} />
              {displayError('email')}
            </div>

            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input id="first_name" name="first_name" type="text" className="input-field" placeholder="Your first name" value={formData.first_name} onChange={handleChange} />
              {displayError('first_name')}
            </div>
            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input id="last_name" name="last_name" type="text" className="input-field" placeholder="Your last name" value={formData.last_name} onChange={handleChange} />
              {displayError('last_name')}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
              <input id="password" name="password" type="password" autoComplete="new-password" required className="input-field" placeholder="Create a password (min. 8 chars)" value={formData.password} onChange={handleChange} />
              {displayError('password')}
            </div>
            <div>
              <label htmlFor="password_confirm" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password <span className="text-red-500">*</span></label>
              <input id="password_confirm" name="password_confirm" type="password" autoComplete="new-password" required className="input-field" placeholder="Confirm your password" value={formData.password_confirm} onChange={handleChange} />
              {displayError('password_confirm')}
            </div>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={loading || !!successMessage}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-church-primary hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-church-primary disabled:bg-gray-400 transition-colors"
            >
              {loading ? (
                 <svg className="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
              ) : "Create Account"}
            </button>
          </div>
        </form>
        <div className="text-sm text-center mt-6">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-church-primary hover:text-indigo-500">
              Sign in
            </Link>
          </p>
        </div>
      </div>
      {/* Global styles for input-field and form-error-general for this component */}
      <style jsx global>{`
        .input-field {
          @apply appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-church-primary focus:border-church-primary sm:text-sm;
        }
        .form-error-general {
            @apply bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4;
        }
      `}</style>
    </div>
  );
};

export default RegisterPage;
