# NEXA Authentication Pages Recreation Guide

This comprehensive guide provides everything needed to recreate the NEXA login and registration pages with identical looks and functionality.

## Overview

The NEXA authentication pages feature:
- Clean, minimalist dark-themed design
- Centered card layout with large logo
- Professional form styling with validation
- Responsive design for all screen sizes
- Smooth hover animations and transitions
- Bootstrap 5 + custom CSS styling
- Feather icons integration

## File Structure

```
/templates/auth/
  - login.html         (Login page)
  - register.html      (Registration page)
/static/
  /css/
    - style.css        (Main stylesheet - reused)
  /images/
    - nexaicon.png     (Large NEXA logo for auth pages)
```

## Complete Code Implementation

### 1. Login Page Template (login.html)

This template provides the login form with email/password fields and remember me checkbox.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign In - NEXA</title>
    
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
            max-width: 400px;
            border: 1px solid var(--border);
        }
        
        .auth-logo {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .auth-logo img {
            height: 180px;
            width: auto;
            margin-bottom: 30px;
        }
        
        .auth-logo h1 {
            color: #ffffff;
            font-size: 24px;
            font-weight: 700;
            margin: 0;
            letter-spacing: 0.5px;
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
        
        .form-check {
            margin-bottom: 20px;
        }
        
        .form-check-input {
            background-color: var(--input-bg);
            border: 1px solid var(--border);
        }
        
        .form-check-input:checked {
            background-color: var(--accent);
            border-color: var(--accent);
        }
        
        .form-check-label {
            color: #ced4da;
            font-size: 14px;
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
        
        .auth-links {
            text-align: center;
            margin-top: 20px;
        }
        
        .auth-links a {
            color: var(--accent);
            text-decoration: none;
            font-size: 14px;
        }
        
        .auth-links a:hover {
            text-decoration: underline;
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
        
        .alert-info {
            background-color: rgba(59, 130, 246, 0.1);
            border: 1px solid rgba(59, 130, 246, 0.3);
            color: #93c5fd;
        }
        
        .invalid-feedback {
            color: #fca5a5;
            font-size: 14px;
            margin-top: 5px;
        }
        
        .is-invalid {
            border-color: #ef4444;
        }
    </style>
</head>
<body>
    <div class="auth-page">
        <div class="auth-card">
            <div class="auth-logo">
                <img src="{{ url_for('static', filename='images/nexaicon.png') }}" alt="NEXA Logo">
            </div>
            
            <h2 class="auth-title">Sign In</h2>
            
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
                    {{ form.email.label(class="form-label") }}
                    {{ form.email(class="form-control" + (" is-invalid" if form.email.errors else "")) }}
                    {% if form.email.errors %}
                        <div class="invalid-feedback">
                            {% for error in form.email.errors %}
                                {{ error }}
                            {% endfor %}
                        </div>
                    {% endif %}
                </div>
                
                <div class="form-group">
                    {{ form.password.label(class="form-label") }}
                    {{ form.password(class="form-control" + (" is-invalid" if form.password.errors else "")) }}
                    {% if form.password.errors %}
                        <div class="invalid-feedback">
                            {% for error in form.password.errors %}
                                {{ error }}
                            {% endfor %}
                        </div>
                    {% endif %}
                </div>
                
                <div class="form-check">
                    {{ form.remember_me(class="form-check-input") }}
                    {{ form.remember_me.label(class="form-check-label") }}
                </div>
                
                {{ form.submit(class="btn btn-primary") }}
            </form>
            
            <div class="auth-links">
                <p>Don't have an account? <a href="{{ url_for('auth.register') }}">Sign up here</a></p>
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

### 2. Registration Page Template (register.html)

This template provides the registration form with full name, email, company, password and password confirmation fields.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign Up - NEXA</title>
    
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
        
        .auth-logo img {
            height: 180px;
            width: auto;
            margin-bottom: 30px;
        }
        
        .auth-logo h1 {
            color: #ffffff;
            font-size: 24px;
            font-weight: 700;
            margin: 0;
            letter-spacing: 0.5px;
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
        
        .auth-links {
            text-align: center;
            margin-top: 20px;
        }
        
        .auth-links a {
            color: var(--accent);
            text-decoration: none;
            font-size: 14px;
        }
        
        .auth-links a:hover {
            text-decoration: underline;
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
        
        .alert-info {
            background-color: rgba(59, 130, 246, 0.1);
            border: 1px solid rgba(59, 130, 246, 0.3);
            color: #93c5fd;
        }
        
        .invalid-feedback {
            color: #fca5a5;
            font-size: 14px;
            margin-top: 5px;
        }
        
        .is-invalid {
            border-color: #ef4444;
        }
        
        .password-strength {
            font-size: 12px;
            color: #9ca3af;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="auth-page">
        <div class="auth-card">
            <div class="auth-logo">
                <img src="{{ url_for('static', filename='images/nexaicon.png') }}" alt="NEXA Logo">
            </div>
            
            <h2 class="auth-title">Create Account</h2>
            
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
                    {{ form.full_name.label(class="form-label") }}
                    {{ form.full_name(class="form-control" + (" is-invalid" if form.full_name.errors else ""), placeholder="Enter your full name") }}
                    {% if form.full_name.errors %}
                        <div class="invalid-feedback">
                            {% for error in form.full_name.errors %}
                                {{ error }}
                            {% endfor %}
                        </div>
                    {% endif %}
                </div>
                
                <div class="form-group">
                    {{ form.email.label(class="form-label") }}
                    {{ form.email(class="form-control" + (" is-invalid" if form.email.errors else ""), placeholder="Enter your email address") }}
                    {% if form.email.errors %}
                        <div class="invalid-feedback">
                            {% for error in form.email.errors %}
                                {{ error }}
                            {% endfor %}
                        </div>
                    {% endif %}
                </div>
                
                <div class="form-group">
                    {{ form.company.label(class="form-label") }}
                    {{ form.company(class="form-control" + (" is-invalid" if form.company.errors else ""), placeholder="Enter your company name (optional)") }}
                    {% if form.company.errors %}
                        <div class="invalid-feedback">
                            {% for error in form.company.errors %}
                                {{ error }}
                            {% endfor %}
                        </div>
                    {% endif %}
                </div>
                
                <div class="form-group">
                    {{ form.password.label(class="form-label") }}
                    {{ form.password(class="form-control" + (" is-invalid" if form.password.errors else ""), placeholder="Enter your password") }}
                    <div class="password-strength">Minimum 6 characters</div>
                    {% if form.password.errors %}
                        <div class="invalid-feedback">
                            {% for error in form.password.errors %}
                                {{ error }}
                            {% endfor %}
                        </div>
                    {% endif %}
                </div>
                
                <div class="form-group">
                    {{ form.password_confirm.label(class="form-label") }}
                    {{ form.password_confirm(class="form-control" + (" is-invalid" if form.password_confirm.errors else ""), placeholder="Confirm your password") }}
                    {% if form.password_confirm.errors %}
                        <div class="invalid-feedback">
                            {% for error in form.password_confirm.errors %}
                                {{ error }}
                            {% endfor %}
                        </div>
                    {% endif %}
                </div>
                
                {{ form.submit(class="btn btn-primary") }}
            </form>
            
            <div class="auth-links">
                <p>Already have an account? <a href="{{ url_for('auth.login') }}">Sign in here</a></p>
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

### 3. Simplified Static Implementation (Without Flask/Form Dependencies)

If you want to recreate these pages without Flask dependencies, here are the static HTML versions:

#### Login Page (Static)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign In - NEXA</title>
    
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
            max-width: 400px;
            border: 1px solid var(--border);
        }
        
        .auth-logo {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .auth-logo img {
            height: 180px;
            width: auto;
            margin-bottom: 30px;
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
        
        .form-check {
            margin-bottom: 20px;
            display: flex;
            align-items: center;
        }
        
        .form-check-input {
            background-color: var(--input-bg);
            border: 1px solid var(--border);
            margin-right: 8px;
        }
        
        .form-check-input:checked {
            background-color: var(--accent);
            border-color: var(--accent);
        }
        
        .form-check-label {
            color: #ced4da;
            font-size: 14px;
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
        
        .auth-links {
            text-align: center;
            margin-top: 20px;
        }
        
        .auth-links a {
            color: var(--accent);
            text-decoration: none;
            font-size: 14px;
        }
        
        .auth-links a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="auth-page">
        <div class="auth-card">
            <div class="auth-logo">
                <img src="images/nexaicon.png" alt="NEXA Logo">
            </div>
            
            <h2 class="auth-title">Sign In</h2>
            
            <form>
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-control" placeholder="Enter your email">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Password</label>
                    <input type="password" class="form-control" placeholder="Enter your password">
                </div>
                
                <div class="form-check">
                    <input type="checkbox" class="form-check-input" id="remember">
                    <label class="form-check-label" for="remember">Remember Me</label>
                </div>
                
                <button type="submit" class="btn-primary">Sign In</button>
            </form>
            
            <div class="auth-links">
                <p>Don't have an account? <a href="register.html">Sign up here</a></p>
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

#### Registration Page (Static)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign Up - NEXA</title>
    
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
        
        .auth-logo img {
            height: 180px;
            width: auto;
            margin-bottom: 30px;
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
        
        .auth-links {
            text-align: center;
            margin-top: 20px;
        }
        
        .auth-links a {
            color: var(--accent);
            text-decoration: none;
            font-size: 14px;
        }
        
        .auth-links a:hover {
            text-decoration: underline;
        }
        
        .password-strength {
            font-size: 12px;
            color: #9ca3af;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="auth-page">
        <div class="auth-card">
            <div class="auth-logo">
                <img src="images/nexaicon.png" alt="NEXA Logo">
            </div>
            
            <h2 class="auth-title">Create Account</h2>
            
            <form>
                <div class="form-group">
                    <label class="form-label">Full Name</label>
                    <input type="text" class="form-control" placeholder="Enter your full name">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-control" placeholder="Enter your email address">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Company</label>
                    <input type="text" class="form-control" placeholder="Enter your company name (optional)">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Password</label>
                    <input type="password" class="form-control" placeholder="Enter your password">
                    <div class="password-strength">Minimum 6 characters</div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Confirm Password</label>
                    <input type="password" class="form-control" placeholder="Confirm your password">
                </div>
                
                <button type="submit" class="btn-primary">Create Account</button>
            </form>
            
            <div class="auth-links">
                <p>Already have an account? <a href="login.html">Sign in here</a></p>
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

## Required Assets

### Images Needed:

1. **NEXA Logo** (`static/images/nexaicon.png`)
   - Large PNG format for auth pages
   - Recommended size: 180px height
   - White/light colored logo for dark theme
   - Clean, professional appearance

### CDN Resources:

1. **Bootstrap 5.3.0-alpha1**
   - CSS: `https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css`
   - JS: `https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js`

2. **Feather Icons**
   - JS: `https://unpkg.com/feather-icons`

3. **Inter Font**
   - CSS: `https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap`

## Key Features Explained

### 1. **Centered Card Layout**
- Full viewport height with flexbox centering
- Responsive card with max-width constraints
- Subtle shadow and border for depth
- Consistent padding for all screen sizes

### 2. **Large Logo Prominence**
- 180px height logo for brand recognition
- Centered positioning above the form
- Clean spacing from form elements
- Professional presentation

### 3. **Form Styling**
- Dark theme input styling
- Focus states with white accent border
- Consistent spacing between form groups
- Proper label-input relationships

### 4. **Validation Support**
- Red error states for invalid inputs
- Error message styling
- Success and info alert states
- Bootstrap alert integration

### 5. **Interactive Elements**
- Hover effects on buttons and links
- Smooth transitions (0.3s ease)
- Transform animations on button hover
- Professional link styling

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

## Form Validation Colors

- **Error State**: `#ef4444` (red border)
- **Error Text**: `#fca5a5` (light red)
- **Success Alert**: `rgba(16, 185, 129, 0.1)` (green background)
- **Error Alert**: `rgba(239, 68, 68, 0.1)` (red background)
- **Info Alert**: `rgba(59, 130, 246, 0.1)` (blue background)

## Typography

- **Primary Font**: Inter (Google Fonts)
- **Weights Used**: 300, 400, 500, 600, 700, 800, 900
- **Base Size**: 16px for inputs and buttons
- **Label Size**: 14px
- **Title Size**: 20px (auth-title)
- **Brand Size**: 24px (logo text)

## Responsive Design

### Breakpoints:
- **Mobile**: Full width with 20px padding
- **Desktop**: Max-width 400px (login) / 450px (register)
- **Card adapts**: to content and screen size

### Mobile Optimizations:
- Consistent padding on all screen sizes
- Touch-friendly button sizes (12px padding)
- Readable font sizes (16px minimum)
- Accessible form elements

## Animation Details

- **Button Hover**: `translateY(-1px)` for lift effect
- **Transition Duration**: 0.3s for smooth animations
- **Easing**: `ease` for natural motion
- **Focus States**: 3px white shadow with 10% opacity
- **Shadow Effects**: 20px blur with 30% black opacity

This guide provides everything needed to recreate the NEXA authentication pages with identical appearance and functionality. The clean, professional design focuses on user experience while maintaining the consistent dark theme aesthetic throughout the application. 