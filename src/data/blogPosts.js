// Blog posts data - Phase 2 placeholder
export const blogPosts = [];
```

### Step 6: Upload Your Blog Images
1. In file explorer, right-click on `public/images/blog` folder
2. Select "Upload..."
3. Select your 4 blog images from your computer
4. Wait for upload to complete

### Step 7: Verify Everything
1. Check your file structure looks like this:
```
public/
  ├── blog/
  │   └── posts/ (empty)
  ├── images/
  │   └── blog/ (has your 4 images)
  └── downloads/ (empty)
src/
  ├── components/
  │   ├── Blog/
  │   │   ├── BlogList.js ✓
  │   │   └── BlogCard.js ✓
  │   ├── Resources/
  │   │   └── ResourcesPage.js ✓
  │   └── Newsletter/
  │       └── NewsletterSignup.js ✓
  └── data/
      └── blogPosts.js ✓