// Blog posts data with comprehensive SEO optimization
export const blogPosts = [
  {
    id: 1,
    title: "2026 Student Loan Survival Guide: Navigate SAVE Blockage, IBR Switch & Critical Deadlines",
    slug: "2026-student-loan-survival-guide",
    excerpt: "8 million borrowers stuck in SAVE forbearance face rising interest starting August 2025. Learn your escape routes before the July 2026 consolidation deadline locks you out of affordable repayment options forever.",
    description: "Comprehensive guide for 8 million SAVE borrowers facing interest resumption. Critical deadlines: August 2025 interest restart, July 2026 consolidation cutoff, July 2028 plan sunset. Actionable strategies for IBR enrollment, double consolidation for Parent PLUS loans, and protection against servicer errors.",
    author: "Student Loan Expert Team",
    date: "2025-10-16",
    readTime: "25 min read",
    featured: true,
    image: "/images/blog/student-loan-repayment-2026.webp",
    imageAlt: "Visual representation of overwhelming student loan paperwork symbolizing the complexity of 2026 student loan changes",
    category: "Repayment Strategies",
    tags: ["SAVE plan", "IBR", "student loans 2026", "loan consolidation", "Parent PLUS", "income-driven repayment"],
    keywords: [
      "SAVE plan blocked 2026",
      "student loan IBR switch",
      "July 2026 consolidation deadline", 
      "Parent PLUS double consolidation",
      "student loan repayment 2026",
      "Income-Based Repayment eligibility",
      "SAVE to IBR transition",
      "student loan interest resumption August 2025",
      "One Big Beautiful Bill Act student loans",
      "Repayment Assistance Plan RAP"
    ],
    metaTitle: "2026 Student Loan Guide: SAVE Blockage, IBR Switch, Critical Deadlines",
    metaDescription: "Essential guide for 8M SAVE borrowers: Navigate interest resumption Aug 2025, consolidation deadline July 2026, IBR enrollment. Protect your repayment options now.",
    ogTitle: "2026 Student Loan Survival Guide: Your Action Plan for SAVE Blockage",
    ogDescription: "8 million borrowers face critical deadlines. Learn IBR switching, consolidation strategies, and Parent PLUS solutions before July 2026 locks you out.",
    twitterTitle: "🚨 8M Student Loan Borrowers: Critical 2026 Deadlines Approaching",
    twitterDescription: "SAVE blocked. Interest resumes Aug 2025. July 2026 consolidation deadline. Get your action plan now.",
    htmlFile: "/blog/posts/2026-student-loan-survival-guide.html",
    lastModified: "2025-10-16",
    priority: 1.0,
    updateFrequency: "monthly"
  }
  // Future posts will be added here
];

// Helper function to get featured posts
export const getFeaturedPosts = () => {
  return blogPosts.filter(post => post.featured);
};

// Helper function to get posts by category
export const getPostsByCategory = (category) => {
  return blogPosts.filter(post => post.category === category);
};

// Helper function to get post by slug
export const getPostBySlug = (slug) => {
  return blogPosts.find(post => post.slug === slug);
};

// Helper function for structured data
export const getStructuredData = (post) => {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.description,
    "image": `https://thepayoffclimb.com${post.image}`,
    "author": {
      "@type": "Organization",
      "name": post.author
    },
    "publisher": {
      "@type": "Organization", 
      "name": "The Payoff Climb",
      "logo": {
        "@type": "ImageObject",
        "url": "https://thepayoffclimb.com/logo.png"
      }
    },
    "datePublished": post.date,
    "dateModified": post.lastModified,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://thepayoffclimb.com/blog/${post.slug}`
    }
  };
};