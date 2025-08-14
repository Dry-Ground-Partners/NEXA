# NEXA Dashboard Recreation Guide

This comprehensive guide provides everything needed to recreate the NEXA dashboard page with identical looks and functionality.

## Overview

The NEXA dashboard is a modern, dark-themed AI platform homepage featuring:
- Clean black/dark theme with white accents
- Interactive tool cards in a grid layout
- Collapsible navigation menu
- Professional header with logo and user actions
- Footer with links and branding
- Bootstrap 5 + custom CSS styling
- Font Awesome icons

## File Structure

```
/templates/
  - base.html          (Master template)
  - dashboard.html     (Dashboard content)
/static/
  /css/
    - style.css        (Main stylesheet)
  /images/
    - nexanonameicon.png    (NEXA logo)
    - dry_ground_ai_logo.svg (Footer logo)
```

## Complete Code Implementation

### 1. Base Template (base.html)

This is the master template that provides the overall layout, header, footer, and JavaScript functionality.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{% block title %}NEXA{% endblock %}</title>
    
    <!-- Inter Font -->
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap">
    
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- Feather Icons -->
    <script src="https://unpkg.com/feather-icons"></script>
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Custom CSS -->
    <link rel="stylesheet" href="{{ url_for('static', filename='css/style.css') }}">
    
    <style>
        /* Common Base Styles */
        body {
            font-family: 'Inter', sans-serif;
            background-color: #0a0a0a;
            color: #e9ecef;
            line-height: 1.6;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            padding: 0;
            margin: 0;
        }
        
        /* Header Styling */
        .header {
            background-color: #000;
            color: #fff;
            padding: 0;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            border-bottom: 1px solid #333;
            position: relative;
        }
        
        .header-container {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            position: relative;
        }
        
        .header-left {
            display: flex;
            align-items: center;
            flex: 0 0 auto;
        }
        
        .header-center {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
            flex: 1;
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
        }
        
        .header-right {
            display: flex;
            align-items: center;
            flex: 0 0 auto;
        }
        
        .logo-img {
            height: 40px;
            width: auto;
            cursor: pointer;
            transition: transform 0.2s ease, opacity 0.8s ease;
        }
        
        .logo-img:hover {
            transform: scale(1.05);
            opacity: 0.9;
        }
        
        .nav-item {
            color: #fff;
            text-decoration: none;
            font-weight: 500;
            font-size: 16px;
            padding: 8px 12px;
            border-radius: 6px;
            transition: all 0.3s ease;
            cursor: pointer;
            user-select: none;
        }
        
        .nav-item:hover {
            color: #fff;
            background-color: rgba(255, 255, 255, 0.1);
            transform: translateY(-1px);
        }
        
        .btn-outline-light {
            border-color: #666666;
            color: #ffffff;
        }
        
        .btn-outline-light:hover {
            background-color: rgba(255, 255, 255, 0.1);
            border-color: #888888;
            color: #ffffff;
        }
        
        .brand-text {
            font-weight: 700;
            font-size: 20px;
            color: #ffffff;
            letter-spacing: 0.5px;
        }
        
        /* Navigation Section */
        .nav-section {
            background-color: #000;
            padding: 20px 0 10px 0;
            transition: all 0.3s ease;
            width: 100%;
        }
        
        .nav-buttons {
            display: flex;
            justify-content: center;
            gap: 2rem;
            flex-wrap: wrap;
            width: 100%;
        }
        
        .nav-button {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 1rem 1.5rem;
            background-color: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 8px;
            text-decoration: none;
            color: #ffffff;
            transition: all 0.3s ease;
            min-width: 120px;
        }
        
        .nav-button:hover {
            background-color: #1a1a1a;
            border-color: #666666;
            transform: translateY(-2px);
            color: #ffffff;
            text-decoration: none;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        
        .nav-button i {
            font-size: 2rem;
            margin-bottom: 0.5rem;
            color: #ffffff;
        }
        
        .nav-button span {
            font-size: 0.9rem;
            font-weight: 500;
        }
        
        /* Responsive navigation */
        @media (max-width: 768px) {
            .nav-buttons {
                gap: 1rem;
            }
            
            .nav-button {
                min-width: 100px;
                padding: 0.8rem 1rem;
            }
            
            .nav-button i {
                font-size: 1.5rem;
            }
            
            .nav-button span {
                font-size: 0.8rem;
            }
        }

        /* Footer */
        .footer {
            background-color: #000;
            color: #fff;
            padding: 40px 0;
            margin-top: auto;
            border-top: 1px solid #333;
        }
        
        .footer .footer-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 25px;
        }
        
        .footer .footer-logo {
            display: flex;
            justify-content: center;
        }
        
        .footer .footer-logo-img {
            height: 48px;
            width: auto;
            filter: invert(1);
            transition: transform 0.3s ease;
        }
        
        .footer .footer-logo-img:hover {
            transform: scale(1.05);
        }
        
        .footer .footer-links {
            display: flex;
            gap: 30px;
            flex-wrap: wrap;
            justify-content: center;
        }
        
        .footer .footer-links a {
            color: #ffffff;
            text-decoration: none;
            font-size: 16px;
            font-weight: 500;
            transition: all 0.3s ease;
            padding: 8px 12px;
            border-radius: 6px;
        }
        
        .footer .footer-links a:hover {
            color: #ffffff;
            background-color: rgba(255, 255, 255, 0.1);
            transform: translateY(-1px);
        }
        
        .footer .footer-copyright {
            text-align: center;
        }
        
        .footer .footer-copyright p {
            color: #adb5bd;
            font-size: 14px;
            margin: 0;
        }
        
        /* Responsive footer */
        @media (max-width: 768px) {
            .footer .footer-links {
                gap: 20px;
            }
            
            .footer .footer-links a {
                font-size: 14px;
                padding: 6px 10px;
            }
            
            .footer .footer-logo-img {
                height: 40px;
            }
        }
        
        /* Main Content */
        .main-content {
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        
        /* Common headings */
        h1, h2, h3, h4, h5, h6 {
            color: #ffffff;
        }
        
        /* Common content card */
        .content-card {
            background-color: #000000;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            border: 1px solid #495057;
        }
        
        /* Page specific styles will be added by child templates */
        {% block page_specific_css %}{% endblock %}
    </style>
</head>
<body>
    <!-- Header -->
    <header class="header">
        <div class="container">
            <div class="header-container">
                <!-- Left: Page identifier -->
                <div class="header-left">
                    <span class="nav-item">{% block page_identifier %}Dashboard{% endblock %}</span>
                </div>
                
                <!-- Center: Logo -->
                <div class="header-center">
                    <div class="logo-container" onclick="toggleNavSection()" style="cursor: pointer;">
                        <img src="{{ url_for('static', filename='images/nexanonameicon.png') }}" alt="NEXA" class="logo-img">
                        <span class="brand-text">NEXA</span>
                    </div>
                </div>
                
                <!-- Right: User Actions -->
                <div class="header-right">
                    {% if user %}
                        <span class="me-3 text-muted">{{ user.full_name }}</span>
                        <a href="{{ url_for('auth.profile') }}" class="btn btn-outline-light btn-sm me-2">
                            <i class="fas fa-user"></i> Profile
                        </a>
                        <a href="{{ url_for('auth.logout') }}" class="btn btn-outline-light btn-sm">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </a>
                    {% endif %}
                </div>
            </div>
            
            <!-- Hidden Navigation Section INSIDE Header -->
            <div id="navSection" class="nav-section d-none">
                <div class="nav-buttons">
                    <a href="/structuring" class="nav-button">
                        <i class="fas fa-sitemap"></i>
                        <span>Structuring</span>
                    </a>
                    <a href="/visuals" class="nav-button">
                        <i class="fas fa-project-diagram"></i>
                        <span>Visuals</span>
                    </a>
                    <a href="/solutioning" class="nav-button">
                        <i class="fas fa-lightbulb"></i>
                        <span>Solutioning</span>
                    </a>
                    <a href="/sow" class="nav-button">
                        <i class="fas fa-file-contract"></i>
                        <span>SoW</span>
                    </a>
                    <a href="/loe" class="nav-button">
                        <i class="fas fa-calculator"></i>
                        <span>LoE</span>
                    </a>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <div class="main-content">
        {% block content %}
        <!-- Page content goes here -->
        {% endblock %}
    </div>
    
    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-logo">
                    <img src="{{ url_for('static', filename='images/dry_ground_ai_logo.svg') }}" alt="Dry Ground AI Logo" class="footer-logo-img">
                </div>
                <div class="footer-links">
                    <a href="/">Home</a>
                    <a href="/sessions">Sessions</a>
                    <a href="/training">Training</a>
                    <a href="/about">About</a>
                    <a href="/contact">Contact</a>
                </div>
                <div class="footer-copyright">
                    <p>&copy; 2024 Dry Ground AI. All rights reserved.</p>
                </div>
            </div>
        </div>
    </footer>

    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Initialize Feather icons
feather.replace();
        
        // Toggle navigation section
        function toggleNavSection() {
            const navSection = document.getElementById('navSection');
            if (navSection) {
                navSection.classList.toggle('d-none');
            }
        }
        
        // Close navigation when clicking outside
        document.addEventListener('click', function(event) {
            const navSection = document.getElementById('navSection');
            const logoContainer = document.querySelector('.logo-container');
            
            if (navSection && !navSection.classList.contains('d-none')) {
                // Check if click is outside both the nav section and logo
                if (!navSection.contains(event.target) && !logoContainer.contains(event.target)) {
                    navSection.classList.add('d-none');
                }
            }
        });
        
        // Page specific JavaScript
        {% block page_specific_js %}{% endblock %}
    </script>
</body>
</html>
```

### 2. Dashboard Template (dashboard.html)

This template extends base.html and provides the dashboard-specific content and styling.

```html
{% extends "base.html" %}

{% block title %}NEXA - Dashboard{% endblock %}

{% block page_identifier %}Dashboard{% endblock %}

{% block page_specific_css %}
        /* Dashboard specific styles */
        .tool-card {
            background-color: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 2rem;
            height: 100%;
            transition: all 0.3s ease;
            text-decoration: none;
            color: inherit;
            display: block;
        }
        
        .tool-card:hover {
            background-color: #1a1a1a;
            border-color: #666666;
            transform: translateY(-2px);
            color: inherit;
            text-decoration: none;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        }
        
        .tool-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
            display: block;
        }
        
        .placeholder-section {
            background-color: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 3rem;
            text-align: center;
            margin: 2rem 0;
        }
        
        .welcome-banner {
            background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 2rem;
            margin-bottom: 2rem;
        }
{% endblock %}

{% block content %}
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-lg-12">
                <main class="content-card">
                    <!-- Welcome Banner -->
                    <div class="welcome-banner">
                        <h2 class="h4 mb-2">🚀 Welcome to NEXA</h2>
                        <p class="mb-0 text-muted">Your AI-powered solution architecture, documentation, and project planning platform.</p>
                    </div>

                    <!-- Tools Grid -->
                    <div class="row g-4">
                        <div class="col-lg-4 col-md-6">
                            <a href="/solutioning" class="tool-card">
                                <i class="fas fa-lightbulb tool-icon text-warning"></i>
                                <h5>Solution Documents</h5>
                                <p class="text-muted mb-0">Create comprehensive solution architecture documents with AI assistance</p>
                            </a>
                        </div>
                        
                        <div class="col-lg-4 col-md-6">
                            <a href="/sow" class="tool-card">
                                <i class="fas fa-file-contract tool-icon text-success"></i>
                                <h5>Statement of Work</h5>
                                <p class="text-muted mb-0">Generate professional SoW documents for your projects</p>
                            </a>
                        </div>
                        
                        <div class="col-lg-4 col-md-6">
                            <a href="/loe" class="tool-card">
                                <i class="fas fa-calculator tool-icon text-info"></i>
                                <h5>Level of Effort</h5>
                                <p class="text-muted mb-0">Estimate project effort and resource requirements</p>
                            </a>
                        </div>
                        
                        <div class="col-lg-4 col-md-6">
                            <a href="/visuals" class="tool-card">
                                <i class="fas fa-project-diagram tool-icon text-primary"></i>
                                <h5>Visual Diagrams</h5>
                                <p class="text-muted mb-0">Create and manage architectural diagrams and sketches</p>
                            </a>
                        </div>
                        
                        <div class="col-lg-4 col-md-6">
                            <a href="/structuring" class="tool-card">
                                <i class="fas fa-sitemap tool-icon text-secondary"></i>
                                <h5>Content Structuring</h5>
                                <p class="text-muted mb-0">Organize and structure your content with AI</p>
                            </a>
                        </div>
                        
                        <div class="col-lg-4 col-md-6">
                            <a href="/sessions" class="tool-card">
                                <i class="fas fa-history tool-icon text-warning"></i>
                                <h5>Session Management</h5>
                                <p class="text-muted mb-0">View and manage all your saved sessions</p>
                            </a>
                        </div>
                    </div>

                    <!-- Placeholder Sections for Future Features -->
                    <div class="row mt-5">
                        <div class="col-md-6">
                            <div class="placeholder-section">
                                <i class="fas fa-chart-bar fa-3x text-muted mb-3"></i>
                                <h5>Recent Activity</h5>
                                <p class="text-muted">Your recent sessions and activity will appear here</p>
                            </div>
                        </div>
                        
                        <div class="col-md-6">
                            <div class="placeholder-section">
                                <i class="fas fa-users fa-3x text-muted mb-3"></i>
                                <h5>Shared Sessions</h5>
                                <p class="text-muted">Sessions shared with you by other users will appear here</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row mt-4">
                        <div class="col-12">
                            <div class="placeholder-section">
                                <i class="fas fa-bell fa-3x text-muted mb-3"></i>
                                <h5>Notifications & Updates</h5>
                                <p class="text-muted">System notifications, feature updates, and announcements will appear here</p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    </div>
{% endblock %}
```

### 3. Main CSS File (static/css/style.css)

This file contains all the CSS variables, theme styling, and component styles used throughout the application.

```css
:root {
    --primary: #FFFFFF;
    --secondary: #1F1F1F;
    --accent: #FFFFFF;
    --background: #0a0a0a;  /* Almost black but not pitch black */
    --text: #e9ecef;
    --border: #495057;
    --light-accent: #212529;
    --error: #EF4444;
    --success: #10B981;
    --card-bg: #000000;  /* Pitch black for content-card */
    --input-bg: #212529;
    --placeholder: #6c757d;
}

body {
    font-family: 'Inter', sans-serif;
    background-color: var(--background);
    color: var(--text);
    line-height: 1.6;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    padding: 0;
    margin: 0;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px;
}

/* Main Content */
.content-card {
    background-color: var(--card-bg);
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    padding: 32px;
    margin-bottom: 32px;
    border: 1px solid var(--border);
}

.page-title {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 16px;
    color: #ffffff;
    position: relative;
    padding-bottom: 16px;
}

.page-title:after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 1px;
    background-color: #495057;
}

.description {
    color: #ced4da;
    margin-bottom: 32px;
}

/* Form Styles */
.form-group {
    margin-bottom: 24px;
}

label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 600;
    color: #ced4da;
}

.form-control {
    display: block;
    width: 100%;
    padding: 12px 16px;
    font-size: 16px;
    font-weight: 400;
    line-height: 1.5;
    color: var(--text);
    background-color: var(--input-bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.form-control:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
    outline: none;
}

.form-control::placeholder {
    color: var(--placeholder);
}

.form-text {
    margin-top: 6px;
    font-size: 12px;
    color: #ced4da;
}

.form-actions {
    margin-top: 32px;
    display: flex;
    justify-content: flex-end;
}

.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 12px 24px;
    font-size: 16px;
    font-weight: 500;
    border-radius: 8px;
    transition: all 0.2s ease;
    cursor: pointer;
    gap: 8px;
}

.btn-primary {
    background-color: #ffffff;
    color: #000000;
    border: 1px solid #ffffff;
}

.btn-primary:hover {
    background-color: #f8f9fa;
    color: #000000;
}

.btn svg {
    width: 18px;
    height: 18px;
}

.btn-outline-secondary {
    background-color: transparent;
    color: #ced4da;
    border: 1px solid #6c757d;
}

.btn-outline-secondary:hover {
    background-color: #495057;
    color: #ffffff;
    border-color: #6c757d;
}

.btn-dark {
    background-color: #212529;
    color: #ffffff;
    border: 1px solid #6c757d;
}

.btn-dark:hover {
    background-color: #495057;
    color: #ffffff;
}

/* Alert Styles */
.alert {
    padding: 16px;
    border-radius: 8px;
    margin-bottom: 24px;
}

.alert-info {
    background-color: rgba(13, 202, 240, 0.1);
    color: #0dcaf0;
    border: 1px solid rgba(13, 202, 240, 0.3);
}

.alert-danger {
    background-color: rgba(239, 68, 68, 0.1);
    color: var(--error);
    border: 1px solid rgba(239, 68, 68, 0.3);
}

.alert-success {
    background-color: rgba(16, 185, 129, 0.1);
    color: var(--success);
    border: 1px solid rgba(16, 185, 129, 0.3);
}

/* Loading Overlay */
.loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.9);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    color: white;
}

.loading-overlay p {
    margin-top: 16px;
    font-weight: 500;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .content-card {
        padding: 24px 16px;
    }

    .form-actions {
        flex-direction: column;
    }
    
    .btn {
        width: 100%;
    }
}

/* Common headings */
h1, h2, h3, h4, h5, h6 {
    color: #ffffff;
}

/* Form text and help text */
.form-text, small.form-text, .text-muted {
    color: #ced4da !important;
}

/* Bootstrap class overrides for dark theme */
.bg-light {
    background-color: #212529 !important;
}

.border {
    border-color: #495057 !important;
}

.text-muted {
    color: #6c757d !important;
}
```

## Flask Route Implementation

```python
from flask import render_template
from flask_login import login_required, current_user

@app.route('/')
@login_required
def index():
    """Render the main dashboard page."""
    return render_template('dashboard.html', 
                         user=current_user,
                         current_page='dashboard')
```

## Required Assets

### Images Needed:

1. **NEXA Logo** (`static/images/nexanonameicon.png`)
   - Transparent PNG format
   - Recommended size: 40px height
   - White/light colored logo for dark theme

2. **Footer Logo** (`static/images/dry_ground_ai_logo.svg`)
   - SVG format for scalability
   - Company/brand logo
   - Light colored for dark theme

### CDN Resources:

1. **Bootstrap 5.3.0-alpha1**
   - CSS: `https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css`
   - JS: `https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js`

2. **Font Awesome 6.4.0**
   - CSS: `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css`

3. **Feather Icons**
   - JS: `https://unpkg.com/feather-icons`

4. **Inter Font**
   - CSS: `https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap`

## Key Features Explained

### 1. **Collapsible Navigation**
- Click the NEXA logo to toggle navigation menu
- Smooth transitions with CSS classes
- Click outside to close menu
- Mobile responsive design

### 2. **Tool Cards**
- 6 main tool cards in responsive grid
- Hover effects with transform and shadow
- Font Awesome icons with color coding
- Direct links to application sections

### 3. **Dark Theme Design**
- CSS variables for consistent theming
- Almost black (#0a0a0a) background
- Pure black (#000000) content cards
- Light gray (#e9ecef) text
- Subtle borders (#495057)

### 4. **Responsive Layout**
- Bootstrap 5 grid system
- Mobile-first approach
- Flexible card layouts
- Responsive navigation menu

### 5. **Interactive Elements**
- Hover effects on all clickable items
- Transform animations (translateY, scale)
- Smooth transitions (0.3s ease)
- Professional shadows and borders

## Color Palette

```css
:root {
    --primary: #FFFFFF;           /* White - Primary actions */
    --secondary: #1F1F1F;         /* Dark gray - Secondary elements */
    --accent: #FFFFFF;            /* White - Accent color */
    --background: #0a0a0a;        /* Almost black - Page background */
    --text: #e9ecef;              /* Light gray - Primary text */
    --border: #495057;            /* Medium gray - Borders */
    --light-accent: #212529;      /* Dark gray - Input backgrounds */
    --error: #EF4444;             /* Red - Error states */
    --success: #10B981;           /* Green - Success states */
    --card-bg: #000000;           /* Pure black - Card backgrounds */
    --input-bg: #212529;          /* Dark gray - Form inputs */
    --placeholder: #6c757d;       /* Gray - Placeholder text */
}
```

## Typography

- **Primary Font**: Inter (Google Fonts)
- **Weights Used**: 300, 400, 500, 600, 700, 800, 900
- **Base Size**: 16px
- **Line Height**: 1.6
- **Headings**: Bold, white color (#ffffff)

## Animation Details

- **Hover Transforms**: `translateY(-2px)` for lift effect
- **Scale Effects**: `scale(1.05)` for logo hover
- **Transition Duration**: 0.3s for most animations, 0.2s for buttons
- **Easing**: `ease` for natural motion
- **Shadow Effects**: Progressive box-shadow on hover

This guide provides everything needed to recreate the NEXA dashboard with identical appearance and functionality. The modular structure allows for easy customization while maintaining the professional dark theme aesthetic. 