const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

// Configure marked options
marked.setOptions({
  breaks: true,
  gfm: true
});

function convertMarkdownToHTML(markdownContent, title, slug) {
  // Convert markdown to HTML
  const contentHTML = marked(markdownContent);
  
  // Get current date
  const currentDate = new Date().toISOString();
  
  // Create full HTML document with SEO
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} | Student Loan Payoff Calculator</title>
    
    <!-- SEO Meta Tags -->
    <meta name="description" content="Your complete guide to navigating student loans in 2026. Learn about repayment options, forgiveness programs, and strategies to pay off loans faster.">
    <meta name="keywords" content="student loans, student loan repayment, loan forgiveness, PSLF, income-driven repayment, 2026 student loans">
    <meta name="author" content="Student Loan Payoff Calculator">
    <link rel="canonical" href="https://thepayoffclimb.com/blog/${slug}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="article">
    <meta property="og:url" content="https://thepayoffclimb.com/blog/${slug}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="Your complete guide to navigating student loans in 2026. Learn about repayment options and strategies.">
    <meta property="og:image" content="https://thepayoffclimb.com/images/blog/student-loan-guide-hero.jpg">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="https://thepayoffclimb.com/blog/${slug}">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="Your complete guide to navigating student loans in 2026.">
    <meta name="twitter:image" content="https://thepayoffclimb.com/images/blog/student-loan-guide-hero.jpg">
    
    <!-- Schema.org JSON-LD -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "${title}",
      "description": "Your complete guide to navigating student loans in 2026",
      "image": "https://thepayoffclimb.com/images/blog/student-loan-guide-hero.jpg",
      "author": {
        "@type": "Organization",
        "name": "Student Loan Payoff Calculator"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Student Loan Payoff Calculator",
        "logo": {
          "@type": "ImageObject",
          "url": "https://thepayoffclimb.com/logo.png"
        }
      },
      "datePublished": "${currentDate}",
      "dateModified": "${currentDate}"
    }
    </script>
    
    <!-- CSS Styles -->
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f8f9fa;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        
        h1 {
            color: #2c3e50;
            margin-bottom: 30px;
            font-size: 2.5em;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }
        
        h2 {
            color: #34495e;
            margin-top: 30px;
            margin-bottom: 20px;
            font-size: 1.8em;
        }
        
        h3 {
            color: #34495e;
            margin-top: 25px;
            margin-bottom: 15px;
            font-size: 1.4em;
        }
        
        p {
            margin-bottom: 15px;
            text-align: justify;
        }
        
        ul, ol {
            margin-bottom: 20px;
            margin-left: 30px;
        }
        
        li {
            margin-bottom: 8px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        
        table th,
        table td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        
        table th {
            background-color: #3498db;
            color: white;
            font-weight: bold;
        }
        
        table tr:nth-child(even) {
            background-color: #f2f2f2;
        }
        
        img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 20px auto;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        blockquote {
            border-left: 4px solid #3498db;
            padding-left: 20px;
            margin: 20px 0;
            font-style: italic;
            background: #ecf0f1;
            padding: 15px 20px;
            border-radius: 0 8px 8px 0;
        }
        
        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
        
        pre {
            background: #2c3e50;
            color: white;
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 20px 0;
        }
        
        pre code {
            background: none;
            color: white;
        }
        
        .back-link {
            display: inline-block;
            margin-bottom: 20px;
            color: #3498db;
            text-decoration: none;
            font-weight: 500;
        }
        
        .back-link:hover {
            text-decoration: underline;
        }
        
        .meta-info {
            color: #7f8c8d;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #ecf0f1;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 15px;
            }
            
            h1 {
                font-size: 2em;
            }
            
            h2 {
                font-size: 1.5em;
            }
            
            table {
                font-size: 14px;
            }
        }
        
        @media print {
            .back-link {
                display: none;
            }
            
            .container {
                box-shadow: none;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <a href="/blog" class="back-link">← Back to Blog</a>
        <div class="meta-info">
            Published: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        ${contentHTML}
    </div>
</body>
</html>`;
  
  return html;
}

// Main execution
function main() {
  try {
    // Read the markdown file
    const markdownPath = path.join(__dirname, '..', 'content', 'blog-post.md');
    
    // Check if markdown file exists
    if (!fs.existsSync(markdownPath)) {
      console.log('❌ Markdown file not found at: content/blog-post.md');
      console.log('📝 Please create a file at: content/blog-post.md with your blog content');
      return;
    }
    
    const markdownContent = fs.readFileSync(markdownPath, 'utf8');
    
    // Blog details
    const title = '2026 Student Loan Survival Guide';
    const slug = '2026-student-loan-survival-guide';
    
    // Convert to HTML
    const htmlContent = convertMarkdownToHTML(markdownContent, title, slug);
    
    // Save HTML file
    const outputDir = path.join(__dirname, '..', 'public', 'blog', 'posts');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, `${slug}.html`);
    fs.writeFileSync(outputPath, htmlContent);
    
    console.log('✅ Success! Blog post converted to HTML');
    console.log(`📄 File saved to: public/blog/posts/${slug}.html`);
    console.log('🔍 You can now view it in your browser');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the conversion
main();