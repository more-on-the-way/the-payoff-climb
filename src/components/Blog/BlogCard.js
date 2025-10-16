import React from 'react';

const BlogCard = ({ post }) => {
  const handleClick = () => {
    // Navigate to the HTML file
    window.location.href = post.htmlFile;
  };

  return (
    <article 
      className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden cursor-pointer"
      onClick={handleClick}
      itemScope 
      itemType="https://schema.org/Article"
    >
      {/* Featured Image with SEO optimization */}
      <div className="relative h-48 overflow-hidden bg-gray-100">
        <img 
          src={post.image} 
          alt={post.imageAlt}
          loading="lazy"
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          itemProp="image"
        />
        {post.featured && (
          <span className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
            Featured
          </span>
        )}
      </div>
      
      {/* Content */}
      <div className="p-6">
        {/* Category and Read Time */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <span className="text-blue-600 font-medium">{post.category}</span>
          <span>{post.readTime}</span>
        </div>
        
        {/* Title with proper heading hierarchy */}
        <h2 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 hover:text-blue-600 transition-colors">
          <span itemProp="headline">{post.title}</span>
        </h2>
        
        {/* Excerpt/Description */}
        <p className="text-gray-600 mb-4 line-clamp-3" itemProp="description">
          {post.excerpt}
        </p>
        
        {/* Meta Information */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            <span itemProp="author" itemScope itemType="https://schema.org/Organization">
              <span itemProp="name">{post.author}</span>
            </span>
          </div>
          <time 
            dateTime={post.date} 
            itemProp="datePublished"
            className="text-sm text-gray-500"
          >
            {new Date(post.date).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })}
          </time>
        </div>
        
        {/* Call to Action */}
        <div className="mt-4">
          <button 
            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors"
            aria-label={`Read full article: ${post.title}`}
          >
            Read Guide 
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Hidden structured data helpers */}
      <meta itemProp="url" content={`https://thepayoffclimb.com/blog/${post.slug}`} />
      <meta itemProp="dateModified" content={post.lastModified} />
    </article>
  );
};

export default BlogCard;