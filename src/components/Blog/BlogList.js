import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import BlogCard from './BlogCard';
import { blogPosts, getStructuredData } from '../../data/blogPosts';

const BlogList = () => {
  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  // Generate structured data for blog listing page
  const listingStructuredData = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "Student Loan Resources & Guides",
    "description": "Expert guides to help you navigate student loan repayment, consolidation, and forgiveness programs in 2026",
    "url": "https://thepayoffclimb.com/blog",
    "publisher": {
      "@type": "Organization",
      "name": "The Payoff Climb",
      "url": "https://thepayoffclimb.com"
    },
    "blogPost": blogPosts.map(post => ({
      "@type": "BlogPosting",
      "headline": post.title,
      "description": post.description,
      "url": `https://thepayoffclimb.com/blog/${post.slug}`,
      "datePublished": post.date,
      "author": {
        "@type": "Organization",
        "name": post.author
      }
    }))
  };

  return (
    <>
      {/* SEO Meta Tags */}
      <Helmet>
        <title>Student Loan Guides & Resources 2026 | Expert Repayment Strategies</title>
        <meta name="description" content="Navigate 2026 student loan changes: SAVE plan blockage, IBR strategies, consolidation deadlines. Expert guides for 8 million affected borrowers." />
        <meta name="keywords" content="student loan guides 2026, SAVE plan alternatives, IBR repayment, loan consolidation deadlines, Parent PLUS strategies, income-driven repayment 2026" />
        <link rel="canonical" href="https://thepayoffclimb.com/blog" />
        
        {/* Open Graph Tags */}
        <meta property="og:title" content="Student Loan Resources & Expert Guides 2026" />
        <meta property="og:description" content="Critical guides for 8M borrowers: SAVE blockage solutions, IBR enrollment, July 2026 consolidation deadline. Get your action plan." />
        <meta property="og:url" content="https://thepayoffclimb.com/blog" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="The Payoff Climb" />
        <meta property="og:image" content="https://thepayoffclimb.com/images/blog/student-loan-repayment-2026.webp" />
        
        {/* Twitter Card Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Student Loan Guides 2026 | Navigate SAVE Blockage & New Rules" />
        <meta name="twitter:description" content="Expert strategies for 8M affected borrowers. Critical deadlines approaching." />
        <meta name="twitter:image" content="https://thepayoffclimb.com/images/blog/student-loan-repayment-2026.webp" />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(listingStructuredData)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Student Loan Resources & Guides
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl">
              Expert guides to help you navigate the 2026 student loan changes, 
              protect your repayment options, and make informed decisions about your financial future
            </p>
            
            {/* Key Stats Banner */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <div className="text-3xl font-bold">8M+</div>
                <div className="text-sm text-blue-100">Borrowers Affected</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <div className="text-3xl font-bold">July 2026</div>
                <div className="text-sm text-blue-100">Critical Deadline</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <div className="text-3xl font-bold">Aug 2025</div>
                <div className="text-sm text-blue-100">Interest Resumes</div>
              </div>
            </div>
          </div>
        </header>

        {/* Breadcrumb Navigation for SEO */}
        <nav aria-label="Breadcrumb" className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <ol className="flex items-center space-x-2 text-sm" itemScope itemType="https://schema.org/BreadcrumbList">
              <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                <a href="/" className="text-gray-500 hover:text-gray-700" itemProp="item">
                  <span itemProp="name">Home</span>
                </a>
                <meta itemProp="position" content="1" />
              </li>
              <li className="text-gray-400">/</li>
              <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                <span className="text-gray-900 font-medium" itemProp="name">Blog</span>
                <meta itemProp="position" content="2" />
              </li>
            </ol>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Section Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Latest Guides</h2>
            <p className="text-gray-600">
              Stay informed about the latest student loan policy changes and repayment strategies
            </p>
          </div>

          {/* Blog Grid */}
          {blogPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogPosts.map(post => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No blog posts available yet. Check back soon!</p>
            </div>
          )}

          {/* Newsletter CTA Section */}
          <section className="mt-16 bg-blue-50 rounded-lg p-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Stay Updated on Student Loan Changes
              </h2>
              <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
                Get alerts about critical deadlines, policy updates, and new repayment strategies 
                delivered directly to your inbox
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                <input 
                  type="email" 
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Email for newsletter"
                />
                <button className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
                  Subscribe Free
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-3">
                No spam, unsubscribe anytime. Join 50,000+ borrowers staying informed.
              </p>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="bg-gray-900 text-white mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <p className="text-center text-gray-400">
              © 2025 The Payoff Climb. Empowering borrowers with knowledge and tools.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default BlogList;