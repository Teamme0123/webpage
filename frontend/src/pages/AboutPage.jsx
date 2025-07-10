import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AboutPage = () => {
  const [pageContent, setPageContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        // 'about_us' is the section_key we defined in the backend SiteContent model/API
        const response = await axios.get('/api/site-content/about_us/');
        setPageContent(response.data);
        setError('');
      } catch (err) {
        console.error("Error fetching About Us content:", err);
        if (err.response && err.response.status === 404) {
            setError('The "About Us" content has not been configured by the site administrator yet.');
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
    // Should ideally be caught by the error state if API returns 404 or other errors
    return <div className="text-center p-8 text-gray-600 text-lg">About Us content is currently not available.</div>;
  }

  return (
    <div className="bg-white p-6 sm:p-8 md:p-10 rounded-xl shadow-xl mx-auto max-w-4xl">
      {/*
        Using Tailwind's typography plugin (@tailwindcss/typography) is recommended for rendering HTML like this.
        Add `require('@tailwindcss/typography')` to tailwind.config.js plugins array.
        Then, add the `prose` class to this div: className="... prose lg:prose-xl"
        This will provide sensible defaults for h1, p, ul, etc. from the HTML.
        Without it, you'd need to manually style or trust browser defaults.
      */}
      <article className="prose lg:prose-xl max-w-none"> {/* Add prose classes here if plugin is enabled */}
        <h1 className="text-3xl sm:text-4xl font-bold text-church-dark-text mb-6 border-b-2 border-church-primary pb-3">
          {pageContent.title || 'About CSMC ONA-ARA CHAPEL'}
        </h1>
        {/* Render HTML content fetched from the backend */}
        {/* SECURITY NOTE: Ensure that the HTML content stored in `pageContent.content_html`
            is properly sanitized on the backend before being saved, especially if it comes from
            user input (even admin input). This is crucial to prevent XSS attacks.
            React's `dangerouslySetInnerHTML` is safe IF the HTML source is trustworthy.
        */}
        <div dangerouslySetInnerHTML={{ __html: pageContent.content_html }} />
      </article>
    </div>
  );
};

export default AboutPage;
