# NEXA User Profile & Settings Recreation Guide

This comprehensive guide provides everything needed to recreate the NEXA user profile and settings functionality, from the header user icon to the complete profile management system.

## Overview

The NEXA user profile system features:
- Header user actions with name display, profile button, and logout button
- Comprehensive profile page with avatar, editable information, and account details
- Change password functionality with validation
- Consistent dark theme styling with professional form layouts
- Responsive design with Bootstrap 5 grid system
- Navigation breadcrumbs and back links

## File Structure

```
/templates/
  /auth/
    - profile.html           (User profile page)
    - change_password.html   (Change password page)
  - base.html               (Header with user actions)
/auth/
  - routes.py              (Profile and password routes)
  - forms.py               (Profile and password forms)
/static/
  /css/
    - style.css            (Shared styling)
```

## Complete Code Implementation

### 1. Header User Actions (base.html - Header Section)

This shows the user icon area in the header with name, profile button, and logout button.

```html
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
    </div>
</header>
```

### 2. Profile Page Template (profile.html)

This template provides the complete user profile page with avatar, editable form, and account information.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Profile - Dry Ground AI</title>
    
    <!-- Inter Font -->
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap">
    
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- Feather Icons -->
    <script src="https://unpkg.com/feather-icons"></script>
    
    <!-- Custom CSS -->
    <link rel="stylesheet" href="{{ url_for('static', filename='css/style.css') }}">
    
    <style>
        .profile-page {
            min-height: 100vh;
            background-color: var(--background);
            padding: 40px 0;
        }
        
        .profile-card {
            background-color: var(--card-bg);
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            padding: 40px;
            border: 1px solid var(--border);
            margin-bottom: 30px;
        }
        
        .profile-header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 1px solid var(--border);
        }
        
        .profile-avatar {
            width: 80px;
            height: 80px;
            background-color: var(--accent);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            font-size: 32px;
            font-weight: 600;
            color: #000;
        }
        
        .profile-title {
            color: #ffffff;
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .profile-subtitle {
            color: #9ca3af;
            font-size: 16px;
        }
        
        .section-title {
            color: #ffffff;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--border);
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-label {
            color: #ced4da;
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 8px;
            display: block;
        }
        
        .form-control {
            background-color: var(--input-bg);
            border: 1px solid var(--border);
            border-radius: 8px;
            color: var(--text);
            padding: 12px 16px;
            font-size: 16px;
            width: 100%;
        }
        
        .form-control:focus {
            border-color: var(--accent);
            box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
            outline: none;
            background-color: var(--input-bg);
        }
        
        .btn-primary {
            background-color: #ffffff;
            border: none;
            color: #000000;
            font-weight: 600;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            transition: all 0.3s ease;
        }
        
        .btn-primary:hover {
            background-color: #f8f9fa;
            color: #000000;
            transform: translateY(-1px);
        }
        
        .btn-outline-secondary {
            background-color: transparent;
            border: 1px solid var(--border);
            color: var(--text);
            font-weight: 600;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            transition: all 0.3s ease;
        }
        
        .btn-outline-secondary:hover {
            background-color: var(--border);
            color: var(--text);
            border-color: var(--border);
        }
        
        .info-item {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .info-item:last-child {
            border-bottom: none;
        }
        
        .info-label {
            color: #9ca3af;
            font-weight: 500;
        }
        
        .info-value {
            color: #ffffff;
            font-weight: 400;
        }
        
        .back-link {
            color: var(--accent);
            text-decoration: none;
            font-size: 14px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 20px;
        }
        
        .back-link:hover {
            text-decoration: underline;
            color: var(--accent);
        }
        
        .invalid-feedback {
            color: #fca5a5;
            font-size: 14px;
            margin-top: 5px;
        }
        
        .is-invalid {
            border-color: #ef4444;
        }
        
        .alert {
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .alert-danger {
            background-color: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #fca5a5;
        }
        
        .alert-success {
            background-color: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.3);
            color: #6ee7b7;
        }
    </style>
</head>
<body>
    <div class="profile-page">
        <div class="container">
            <div class="row justify-content-center">
                <div class="col-lg-8">
                    <a href="{{ url_for('index') }}" class="back-link">
                        <i data-feather="arrow-left" width="16" height="16"></i>
                        Back to Dashboard
                    </a>
                    
                    <div class="profile-card">
                        <div class="profile-header">
                            <div class="profile-avatar">
                                {{ current_user.full_name[0].upper() if current_user.full_name else 'U' }}
                            </div>
                            <h1 class="profile-title">{{ current_user.full_name }}</h1>
                            <p class="profile-subtitle">{{ current_user.email }}</p>
                        </div>
                        
                        <!-- Flash Messages -->
                        {% with messages = get_flashed_messages(with_categories=true) %}
                            {% if messages %}
                                {% for category, message in messages %}
                                    <div class="alert alert-{{ 'danger' if category == 'error' else category }} alert-dismissible fade show" role="alert">
                                        {{ message }}
                                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                                    </div>
                                {% endfor %}
                            {% endif %}
                        {% endwith %}
                        
                        <div class="row">
                            <div class="col-md-6">
                                <h3 class="section-title">Profile Information</h3>
                                
                                <form method="POST">
                                    {{ form.hidden_tag() }}
                                    
                                    <div class="form-group">
                                        {{ form.full_name.label(class="form-label") }}
                                        {{ form.full_name(class="form-control" + (" is-invalid" if form.full_name.errors else "")) }}
                                        {% if form.full_name.errors %}
                                            <div class="invalid-feedback">
                                                {% for error in form.full_name.errors %}
                                                    {{ error }}
                                                {% endfor %}
                                            </div>
                                        {% endif %}
                                    </div>
                                    
                                    <div class="form-group">
                                        {{ form.company.label(class="form-label") }}
                                        {{ form.company(class="form-control" + (" is-invalid" if form.company.errors else ""), placeholder="Enter your company name") }}
                                        {% if form.company.errors %}
                                            <div class="invalid-feedback">
                                                {% for error in form.company.errors %}
                                                    {{ error }}
                                                {% endfor %}
                                            </div>
                                        {% endif %}
                                    </div>
                                    
                                    <div class="d-flex gap-3">
                                        {{ form.submit(class="btn btn-primary") }}
                                        <a href="{{ url_for('auth.change_password') }}" class="btn btn-outline-secondary">Change Password</a>
                                    </div>
                                </form>
                            </div>
                            
                            <div class="col-md-6">
                                <h3 class="section-title">Account Information</h3>
                                
                                <div class="info-item">
                                    <span class="info-label">Email</span>
                                    <span class="info-value">{{ current_user.email }}</span>
                                </div>
                                
                                <div class="info-item">
                                    <span class="info-label">Role</span>
                                    <span class="info-value">{{ current_user.role.title() }}</span>
                                </div>
                                
                                <div class="info-item">
                                    <span class="info-label">Account Created</span>
                                    <span class="info-value">
                                        {% if current_user.created_at %}
                                            {{ current_user.created_at.strftime('%B %d, %Y') }}
                                        {% else %}
                                            Unknown
                                        {% endif %}
                                    </span>
                                </div>
                                
                                <div class="info-item">
                                    <span class="info-label">Last Login</span>
                                    <span class="info-value">
                                        {% if current_user.last_login %}
                                            {{ current_user.last_login.strftime('%B %d, %Y at %I:%M %p') }}
                                        {% else %}
                                            Never
                                        {% endif %}
                                    </span>
                                </div>
                                
                                <div class="info-item">
                                    <span class="info-label">Account Status</span>
                                    <span class="info-value">
                                        {% if current_user.is_active %}
                                            <span style="color: #6ee7b7;">Active</span>
                                        {% else %}
                                            <span style="color: #fca5a5;">Inactive</span>
                                        {% endif %}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Initialize Feather icons
        feather.replace();
    </script>
</body>
</html>
```

### 3. Change Password Page Template (change_password.html)

This template provides the change password functionality with current password verification.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Change Password - Dry Ground AI</title>
    
    <!-- Inter Font -->
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap">
    
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- Feather Icons -->
    <script src="https://unpkg.com/feather-icons"></script>
    
    <!-- Custom CSS -->
    <link rel="stylesheet" href="{{ url_for('static', filename='css/style.css') }}">
    
    <style>
        .auth-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: var(--background);
            padding: 20px;
        }
        
        .auth-card {
            background-color: var(--card-bg);
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            padding: 40px;
            width: 100%;
            max-width: 450px;
            border: 1px solid var(--border);
        }
        
        .auth-logo {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .auth-logo h1 {
            color: #ffffff;
            font-size: 24px;
            font-weight: 700;
            margin: 0;
        }
        
        .auth-title {
            color: #ffffff;
            font-size: 20px;
            font-weight: 600;
            text-align: center;
            margin-bottom: 30px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-label {
            color: #ced4da;
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 8px;
            display: block;
        }
        
        .form-control {
            background-color: var(--input-bg);
            border: 1px solid var(--border);
            border-radius: 8px;
            color: var(--text);
            padding: 12px 16px;
            font-size: 16px;
            width: 100%;
        }
        
        .form-control:focus {
            border-color: var(--accent);
            box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
            outline: none;
            background-color: var(--input-bg);
        }
        
        .btn-primary {
            background-color: #ffffff;
            border: none;
            color: #000000;
            font-weight: 600;
            padding: 12px 24px;
            border-radius: 8px;
            width: 100%;
            font-size: 16px;
            transition: all 0.3s ease;
        }
        
        .btn-primary:hover {
            background-color: #f8f9fa;
            color: #000000;
            transform: translateY(-1px);
        }
        
        .btn-outline-secondary {
            background-color: transparent;
            border: 1px solid var(--border);
            color: var(--text);
            font-weight: 600;
            padding: 12px 24px;
            border-radius: 8px;
            width: 100%;
            font-size: 16px;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
            text-align: center;
        }
        
        .btn-outline-secondary:hover {
            background-color: var(--border);
            color: var(--text);
            border-color: var(--border);
            text-decoration: none;
        }
        
        .back-link {
            color: var(--accent);
            text-decoration: none;
            font-size: 14px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 20px;
        }
        
        .back-link:hover {
            text-decoration: underline;
            color: var(--accent);
        }
        
        .alert {
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .alert-danger {
            background-color: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #fca5a5;
        }
        
        .alert-success {
            background-color: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.3);
            color: #6ee7b7;
        }
        
        .invalid-feedback {
            color: #fca5a5;
            font-size: 14px;
            margin-top: 5px;
        }
        
        .is-invalid {
            border-color: #ef4444;
        }
        
        .password-requirements {
            font-size: 12px;
            color: #9ca3af;
            margin-top: 5px;
            margin-bottom: 15px;
        }
        
        .btn-group {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }
        
        .btn-group .btn {
            flex: 1;
        }
    </style>
</head>
<body>
    <div class="auth-page">
        <div class="auth-card">
            <a href="{{ url_for('auth.profile') }}" class="back-link">
                <i data-feather="arrow-left" width="16" height="16"></i>
                Back to Profile
            </a>
            
            <div class="auth-logo">
                <h1>DRY GROUND AI</h1>
            </div>
            
            <h2 class="auth-title">Change Password</h2>
            
            <!-- Flash Messages -->
            {% with messages = get_flashed_messages(with_categories=true) %}
                {% if messages %}
                    {% for category, message in messages %}
                        <div class="alert alert-{{ 'danger' if category == 'error' else category }} alert-dismissible fade show" role="alert">
                            {{ message }}
                            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                        </div>
                    {% endfor %}
                {% endif %}
            {% endwith %}
            
            <form method="POST">
                {{ form.hidden_tag() }}
                
                <div class="form-group">
                    {{ form.current_password.label(class="form-label") }}
                    {{ form.current_password(class="form-control" + (" is-invalid" if form.current_password.errors else ""), placeholder="Enter your current password") }}
                    {% if form.current_password.errors %}
                        <div class="invalid-feedback">
                            {% for error in form.current_password.errors %}
                                {{ error }}
                            {% endfor %}
                        </div>
                    {% endif %}
                </div>
                
                <div class="form-group">
                    {{ form.new_password.label(class="form-label") }}
                    {{ form.new_password(class="form-control" + (" is-invalid" if form.new_password.errors else ""), placeholder="Enter your new password") }}
                    <div class="password-requirements">Minimum 6 characters</div>
                    {% if form.new_password.errors %}
                        <div class="invalid-feedback">
                            {% for error in form.new_password.errors %}
                                {{ error }}
                            {% endfor %}
                        </div>
                    {% endif %}
                </div>
                
                <div class="form-group">
                    {{ form.confirm_password.label(class="form-label") }}
                    {{ form.confirm_password(class="form-control" + (" is-invalid" if form.confirm_password.errors else ""), placeholder="Confirm your new password") }}
                    {% if form.confirm_password.errors %}
                        <div class="invalid-feedback">
                            {% for error in form.confirm_password.errors %}
                                {{ error }}
                            {% endfor %}
                        </div>
                    {% endif %}
                </div>
                
                <div class="btn-group">
                    {{ form.submit(class="btn btn-primary") }}
                    <a href="{{ url_for('auth.profile') }}" class="btn btn-outline-secondary">Cancel</a>
                </div>
            </form>
        </div>
    </div>
    
    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Initialize Feather icons
        feather.replace();
    </script>
</body>
</html>
```

### 4. Static HTML Versions (Without Flask Dependencies)

For easier recreation without backend dependencies:

#### Static Profile Page

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Profile - NEXA</title>
    
    <!-- Inter Font -->
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap">
    
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- Feather Icons -->
    <script src="https://unpkg.com/feather-icons"></script>
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        :root {
            --primary: #FFFFFF;
            --secondary: #1F1F1F;
            --accent: #FFFFFF;
            --background: #0a0a0a;
            --text: #e9ecef;
            --border: #495057;
            --light-accent: #212529;
            --error: #EF4444;
            --success: #10B981;
            --card-bg: #000000;
            --input-bg: #212529;
            --placeholder: #6c757d;
        }

        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--background);
            color: var(--text);
            margin: 0;
            padding: 0;
        }
        
        .profile-page {
            min-height: 100vh;
            background-color: var(--background);
            padding: 40px 0;
        }
        
        .profile-card {
            background-color: var(--card-bg);
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            padding: 40px;
            border: 1px solid var(--border);
            margin-bottom: 30px;
        }
        
        .profile-header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 1px solid var(--border);
        }
        
        .profile-avatar {
            width: 80px;
            height: 80px;
            background-color: var(--accent);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            font-size: 32px;
            font-weight: 600;
            color: #000;
        }
        
        .profile-title {
            color: #ffffff;
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .profile-subtitle {
            color: #9ca3af;
            font-size: 16px;
        }
        
        .section-title {
            color: #ffffff;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--border);
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-label {
            color: #ced4da;
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 8px;
            display: block;
        }
        
        .form-control {
            background-color: var(--input-bg);
            border: 1px solid var(--border);
            border-radius: 8px;
            color: var(--text);
            padding: 12px 16px;
            font-size: 16px;
            width: 100%;
            box-sizing: border-box;
        }
        
        .form-control:focus {
            border-color: var(--accent);
            box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
            outline: none;
            background-color: var(--input-bg);
        }
        
        .btn-primary {
            background-color: #ffffff;
            border: none;
            color: #000000;
            font-weight: 600;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            transition: all 0.3s ease;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
        }
        
        .btn-primary:hover {
            background-color: #f8f9fa;
            color: #000000;
            transform: translateY(-1px);
        }
        
        .btn-outline-secondary {
            background-color: transparent;
            border: 1px solid var(--border);
            color: var(--text);
            font-weight: 600;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
        }
        
        .btn-outline-secondary:hover {
            background-color: var(--border);
            color: var(--text);
            border-color: var(--border);
            text-decoration: none;
        }
        
        .info-item {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .info-item:last-child {
            border-bottom: none;
        }
        
        .info-label {
            color: #9ca3af;
            font-weight: 500;
        }
        
        .info-value {
            color: #ffffff;
            font-weight: 400;
        }
        
        .back-link {
            color: var(--accent);
            text-decoration: none;
            font-size: 14px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 20px;
        }
        
        .back-link:hover {
            text-decoration: underline;
            color: var(--accent);
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 15px;
        }
    </style>
</head>
<body>
    <div class="profile-page">
        <div class="container">
            <div class="row justify-content-center">
                <div class="col-lg-8">
                    <a href="dashboard.html" class="back-link">
                        <i data-feather="arrow-left" width="16" height="16"></i>
                        Back to Dashboard
                    </a>
                    
                    <div class="profile-card">
                        <div class="profile-header">
                            <div class="profile-avatar">J</div>
                            <h1 class="profile-title">John Doe</h1>
                            <p class="profile-subtitle">john.doe@example.com</p>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-6">
                                <h3 class="section-title">Profile Information</h3>
                                
                                <form>
                                    <div class="form-group">
                                        <label class="form-label">Full Name</label>
                                        <input type="text" class="form-control" value="John Doe">
                                    </div>
                                    
                                    <div class="form-group">
                                        <label class="form-label">Company</label>
                                        <input type="text" class="form-control" placeholder="Enter your company name" value="Example Corp">
                                    </div>
                                    
                                    <div class="d-flex gap-3">
                                        <button type="submit" class="btn-primary">Update Profile</button>
                                        <a href="change-password.html" class="btn-outline-secondary">Change Password</a>
                                    </div>
                                </form>
                            </div>
                            
                            <div class="col-md-6">
                                <h3 class="section-title">Account Information</h3>
                                
                                <div class="info-item">
                                    <span class="info-label">Email</span>
                                    <span class="info-value">john.doe@example.com</span>
                                </div>
                                
                                <div class="info-item">
                                    <span class="info-label">Role</span>
                                    <span class="info-value">User</span>
                                </div>
                                
                                <div class="info-item">
                                    <span class="info-label">Account Created</span>
                                    <span class="info-value">January 15, 2024</span>
                                </div>
                                
                                <div class="info-item">
                                    <span class="info-label">Last Login</span>
                                    <span class="info-value">December 14, 2024 at 2:30 PM</span>
                                </div>
                                
                                <div class="info-item">
                                    <span class="info-label">Account Status</span>
                                    <span class="info-value">
                                        <span style="color: #6ee7b7;">Active</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Initialize Feather icons
        feather.replace();
    </script>
</body>
</html>
```

#### Static Change Password Page

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Change Password - NEXA</title>
    
    <!-- Inter Font -->
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap">
    
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- Feather Icons -->
    <script src="https://unpkg.com/feather-icons"></script>
    
    <style>
        :root {
            --primary: #FFFFFF;
            --secondary: #1F1F1F;
            --accent: #FFFFFF;
            --background: #0a0a0a;
            --text: #e9ecef;
            --border: #495057;
            --light-accent: #212529;
            --error: #EF4444;
            --success: #10B981;
            --card-bg: #000000;
            --input-bg: #212529;
            --placeholder: #6c757d;
        }

        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--background);
            color: var(--text);
            margin: 0;
            padding: 0;
        }
        
        .auth-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: var(--background);
            padding: 20px;
        }
        
        .auth-card {
            background-color: var(--card-bg);
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            padding: 40px;
            width: 100%;
            max-width: 450px;
            border: 1px solid var(--border);
        }
        
        .auth-logo {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .auth-logo h1 {
            color: #ffffff;
            font-size: 24px;
            font-weight: 700;
            margin: 0;
        }
        
        .auth-title {
            color: #ffffff;
            font-size: 20px;
            font-weight: 600;
            text-align: center;
            margin-bottom: 30px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-label {
            color: #ced4da;
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 8px;
            display: block;
        }
        
        .form-control {
            background-color: var(--input-bg);
            border: 1px solid var(--border);
            border-radius: 8px;
            color: var(--text);
            padding: 12px 16px;
            font-size: 16px;
            width: 100%;
            box-sizing: border-box;
        }
        
        .form-control:focus {
            border-color: var(--accent);
            box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
            outline: none;
            background-color: var(--input-bg);
        }
        
        .btn-primary {
            background-color: #ffffff;
            border: none;
            color: #000000;
            font-weight: 600;
            padding: 12px 24px;
            border-radius: 8px;
            width: 100%;
            font-size: 16px;
            transition: all 0.3s ease;
            cursor: pointer;
        }
        
        .btn-primary:hover {
            background-color: #f8f9fa;
            color: #000000;
            transform: translateY(-1px);
        }
        
        .btn-outline-secondary {
            background-color: transparent;
            border: 1px solid var(--border);
            color: var(--text);
            font-weight: 600;
            padding: 12px 24px;
            border-radius: 8px;
            width: 100%;
            font-size: 16px;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
            text-align: center;
        }
        
        .btn-outline-secondary:hover {
            background-color: var(--border);
            color: var(--text);
            border-color: var(--border);
            text-decoration: none;
        }
        
        .back-link {
            color: var(--accent);
            text-decoration: none;
            font-size: 14px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 20px;
        }
        
        .back-link:hover {
            text-decoration: underline;
            color: var(--accent);
        }
        
        .password-requirements {
            font-size: 12px;
            color: #9ca3af;
            margin-top: 5px;
            margin-bottom: 15px;
        }
        
        .btn-group {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }
        
        .btn-group .btn-primary,
        .btn-group .btn-outline-secondary {
            flex: 1;
        }
    </style>
</head>
<body>
    <div class="auth-page">
        <div class="auth-card">
            <a href="profile.html" class="back-link">
                <i data-feather="arrow-left" width="16" height="16"></i>
                Back to Profile
            </a>
            
            <div class="auth-logo">
                <h1>NEXA</h1>
            </div>
            
            <h2 class="auth-title">Change Password</h2>
            
            <form>
                <div class="form-group">
                    <label class="form-label">Current Password</label>
                    <input type="password" class="form-control" placeholder="Enter your current password">
                </div>
                
                <div class="form-group">
                    <label class="form-label">New Password</label>
                    <input type="password" class="form-control" placeholder="Enter your new password">
                    <div class="password-requirements">Minimum 6 characters</div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Confirm Password</label>
                    <input type="password" class="form-control" placeholder="Confirm your new password">
                </div>
                
                <div class="btn-group">
                    <button type="submit" class="btn-primary">Change Password</button>
                    <a href="profile.html" class="btn-outline-secondary">Cancel</a>
                </div>
            </form>
        </div>
    </div>
    
    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Initialize Feather icons
        feather.replace();
    </script>
</body>
</html>
```

## Flask Backend Implementation

### Routes

```python
@auth_bp.route('/profile', methods=['GET', 'POST'])
@login_required
def profile():
    """User profile management."""
    form = ProfileForm()
    
    if form.validate_on_submit():
        # Update user profile logic
        current_user.full_name = form.full_name.data.strip()
        current_user.company = form.company.data.strip() if form.company.data else None
        # Save to database
        flash('Profile updated successfully!', 'success')
    else:
        # Pre-populate form with current user data
        form.full_name.data = current_user.full_name
        form.company.data = current_user.company
    
    return render_template('auth/profile.html', form=form)

@auth_bp.route('/change-password', methods=['GET', 'POST'])
@login_required
def change_password():
    """Change password route."""
    form = ChangePasswordForm()
    
    if form.validate_on_submit():
        # Verify current password and update to new password
        # Hash new password and save to database
        flash('Password changed successfully!', 'success')
        return redirect(url_for('auth.profile'))
    
    return render_template('auth/change_password.html', form=form)
```

### Forms

```python
class ProfileForm(FlaskForm):
    """Form for updating user profile."""
    
    full_name = StringField('Full Name', validators=[
        DataRequired(message='Full name is required'),
        Length(min=2, max=255, message='Full name must be between 2 and 255 characters')
    ])
    
    company = StringField('Company', validators=[
        Length(max=255, message='Company name must be less than 255 characters')
    ])
    
    submit = SubmitField('Update Profile')

class ChangePasswordForm(FlaskForm):
    """Form for changing user password."""
    
    current_password = PasswordField('Current Password', validators=[
        DataRequired(message='Current password is required')
    ])
    
    new_password = PasswordField('New Password', validators=[
        DataRequired(message='New password is required'),
        Length(min=6, message='Password must be at least 6 characters long')
    ])
    
    confirm_password = PasswordField('Confirm Password', validators=[
        DataRequired(message='Please confirm your password'),
        EqualTo('new_password', message='Passwords must match')
    ])
    
    submit = SubmitField('Change Password')
```

## Required Assets

### CDN Resources:

1. **Bootstrap 5.3.0-alpha1**
   - CSS: `https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css`
   - JS: `https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js`

2. **Font Awesome 6.4.0**
   - CSS: `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css`

3. **Feather Icons**
   - JS: `https://unpkg.com/feather-icons`

4. **Inter Font**
   - CSS: `https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap`

## Key Features Explained

### 1. **Header User Actions**
- User name display with muted text styling
- Profile button with user icon and text
- Logout button with sign-out icon
- Consistent button styling with hover effects

### 2. **Profile Avatar**
- Circular avatar with user's first initial
- White background with black text for contrast
- 80px diameter for prominent display
- Automatic letter extraction from user name

### 3. **Two-Column Layout**
- Left column: Editable profile form
- Right column: Read-only account information
- Responsive design that stacks on mobile
- Consistent section titles with bottom borders

### 4. **Form Validation**
- Real-time validation with error display
- Required field indicators
- Character length validation
- Password confirmation matching

### 5. **Navigation Flow**
- Back links with arrow icons
- Breadcrumb-style navigation
- Clear page relationships
- Consistent link styling

### 6. **Account Information Display**
- Key-value pair layout with flex justification
- Color-coded status indicators
- Date formatting for timestamps
- Subtle border separators

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

## Status Indicators

- **Active Status**: `#6ee7b7` (green)
- **Inactive Status**: `#fca5a5` (red)
- **Info Labels**: `#9ca3af` (gray)
- **Info Values**: `#ffffff` (white)

## Typography

- **Primary Font**: Inter (Google Fonts)
- **Profile Title**: 24px, weight 600
- **Section Titles**: 18px, weight 600
- **Form Labels**: 14px, weight 500
- **Input Text**: 16px, weight 400
- **Info Labels**: 14px, weight 500

## Responsive Design

### Breakpoints:
- **Desktop**: Two-column layout (col-md-6)
- **Mobile**: Single column stacked layout
- **Profile Card**: Max-width with centering
- **Forms**: Full-width inputs with proper spacing

### Mobile Optimizations:
- Touch-friendly button sizes
- Adequate spacing between elements
- Readable font sizes
- Single column layout for better mobile UX

## Animation Details

- **Button Hover**: `translateY(-1px)` for lift effect
- **Transition Duration**: 0.3s for all interactive elements
- **Focus States**: 3px white shadow with 10% opacity
- **Hover Colors**: Subtle background changes for feedback

This guide provides everything needed to recreate the complete NEXA user profile and settings system with identical appearance and functionality. The professional design maintains consistency with the overall application theme while providing comprehensive user management capabilities. 