import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ContactPage = () => {
  const [pageContent, setPageContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        // 'contact_info' is the section_key for contact page content
        const response = await axios.get('/api/site-content/contact_info/');
        setPageContent(response.data);
        setError('');
      } catch (err) {
        console.error("Error fetching Contact Info content:", err);
        if (err.response && err.response.status === 404) {
            setError('The "Contact Information" has not been configured by the site administrator yet.');
        } else {
            setError('Failed to load content due to a network or server issue. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-300px)]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-church-primary"></div>
        <p className="ml-4 text-lg text-gray-600">Loading Content...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-md shadow-md my-8 max-w-2xl mx-auto" role="alert">
        <p className="font-bold text-xl mb-2">Unable to Load Page</p>
        <p>{error}</p>
      </div>
    );
  }

  if (!pageContent) {
    return <div className="text-center p-8 text-gray-600 text-lg">Contact information is currently not available.</div>;
  }

  return (
    <div className="bg-white p-6 sm:p-8 md:p-10 rounded-xl shadow-xl mx-auto max-w-4xl">
      <article className="prose lg:prose-xl max-w-none"> {/* Add prose classes here if typography plugin is enabled */}
        <h1 className="text-3xl sm:text-4xl font-bold text-church-dark-text mb-6 border-b-2 border-church-primary pb-3">
          {pageContent.title || 'Contact Us'}
        </h1>
        {/* Render HTML content fetched from the backend */}
        {/* SECURITY NOTE: Ensure backend sanitizes this HTML. */}
        <div dangerouslySetInnerHTML={{ __html: pageContent.content_html }} />

        {/* You could also add a simple contact form here if desired, separate from the CMS content */}
        {/*
        <div className="mt-10 pt-8 border-t border-gray-200">
          <h2 className="text-2xl font-semibold text-church-dark-text mb-4">Send us a Message</h2>
          <form>
            // Form fields here ...
          </form>
        </div>
        */}
      </article>
    </div>
  );
};

export default ContactPage;
