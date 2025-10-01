# NEXA Platform - Technical Documentation

## Architecture Overview

**NEXA** is built as a modern, scalable Flask web application with PostgreSQL persistence, AI integration, and comprehensive session management. The platform follows a modular architecture with clear separation between frontend, backend, AI services, and data persistence layers.

### Core Technology Stack

```
Frontend:    Bootstrap 5 + Custom CSS + JavaScript + Feather Icons
Backend:     Flask (Python 3.11) + Gunicorn WSGI Server
Database:    PostgreSQL 16 with JSON document storage
AI/ML:       OpenAI GPT-4o + LangFuse tracking + Computer Vision API
PDF:         WeasyPrint with Cairo/Pango rendering engine
Hosting:     Replit with Nix package management
```

---

## Application Structure

### File Organization
```
/
├── app.py                      # Main Flask application (6013 lines)
├── main.py                     # WSGI entry point
├── requirements.txt            # Python dependencies
├── .replit                     # Replit configuration
├── pyproject.toml             # Python project configuration
├── utils/
│   ├── pdf_generator.py       # PDF generation utilities (1683 lines)
│   ├── image_analysis.py      # Image upload and analysis
│   └── vision_api.py          # OpenAI vision and text processing
├── templates/
│   ├── base.html              # Base template
│   ├── dashboard.html         # Main dashboard
│   ├── index.html             # Solution documents UI (1266 lines)
│   ├── structuring.html       # Structuring interface (1923 lines)
│   ├── visuals.html           # Visuals management (2766 lines)
│   ├── sow.html               # Statement of Work UI (2419 lines)
│   ├── loe.html               # Level of Effort interface (2372 lines)
│   ├── sessions.html          # Session management (1370 lines)
│   └── auth/                  # Authentication templates
├── static/
│   ├── css/style.css          # Custom styling
│   └── images/                # Static assets and logos
└── auth/                      # Authentication module (partial implementation)
```

---

## Database Architecture

### PostgreSQL Schema

**Primary Table: `ai_architecture_sessions`**
```sql
CREATE TABLE ai_architecture_sessions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    client VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- JSON Document Storage for different workflows
    session_objects JSONB,        -- Solution Documents data
    sow_objects JSONB,            -- Statement of Work data  
    loe_objects JSONB,            -- Level of Effort data
    diagram_texts_json JSONB,     -- Structuring data
    visual_assets_json JSONB      -- Visuals data
);
```

### JSON Document Structure

**Solution Documents (`session_objects`)**:
```json
{
  "badge": {
    "created-at": "2024-01-15 10:30:00",
    "row": 123,
    "glyph": "sessionId123"
  },
  "basic": {
    "title": "Project Title",
    "prepared_for": "Client Name",
    "date": "2024-01-15",
    "engineer": "Engineer Name"
  },
  "current_solution": 1,
  "solution_count": 2,
  "solution_1": {
    "additional": {},
    "variables": {
      "title": "Solution Title",
      "steps": "Implementation steps",
      "approach": "Technical approach",
      "difficulty": 65
    },
    "structure": {
      "stack": "Technology stack analysis"
    }
  }
}
```

**Statement of Work (`sow_objects`)**:
```json
{
  "badge": { "created-at": "...", "row": 123 },
  "basic": { "title": "...", "client": "..." },
  "project": "Project Name",
  "client": "Client Name", 
  "prepared_by": "Dry Ground Partners",
  "date": "2024-01-15",
  "project_purpose_background": "...",
  "objectives": ["Objective 1", "Objective 2"],
  "in_scope_deliverables": [
    {
      "deliverable": "Deliverable Name",
      "key_features": "Features description",
      "primary_artifacts": "Artifacts description"
    }
  ],
  "out_of_scope": "Out of scope items",
  "functional_requirements": ["Req 1", "Req 2"],
  "non_functional_requirements": ["NFR 1", "NFR 2"],
  "project_phases_timeline": {
    "timeline_weeks": "12",
    "phases": [
      {
        "phase": "Phase 1: Analysis & Planning",
        "key_activities": "Phase activities",
        "weeks_display": "1-4"
      }
    ]
  }
}
```

---

## Backend Implementation

### Flask Application Structure

**Core Application (`app.py`)**:
```python
# Global session storage (in-memory)
solution_session = {}      # Solution Documents sessions
sow_session = {}          # Statement of Work sessions  
structuring_session = {}  # Structuring sessions
visuals_session = {}     # Visuals sessions
loe_session = {}         # Level of Effort sessions

# Database connection with fallback
def get_db_connection():
    database_url = os.environ.get("DATABASE_URL")
    if database_url:
        return psycopg2.connect(database_url)
    else:
        return psycopg2.connect(
            host=os.environ.get("PGHOST", "localhost"),
            database=os.environ.get("PGDATABASE", "postgres"),
            user=os.environ.get("PGUSER", "postgres"),
            password=os.environ.get("PGPASSWORD", ""),
            port=os.environ.get("PGPORT", "5432")
        )
```

### Session Management System

**Session ID Generation**:
```python
def generate_session_id():
    timestamp = int(time.time())
    letters = ''.join(random.choices(string.ascii_uppercase + string.ascii_lowercase, k=8))
    return f"{letters}{timestamp}"
```

**Session Lifecycle**:
1. **Creation**: Generate unique session ID
2. **In-Memory Storage**: Store in global dictionaries during active use
3. **Database Persistence**: Save to PostgreSQL on user action
4. **Loading**: Restore from database to memory when needed
5. **Cross-Tool Integration**: Sessions can be converted between tool types

---

## AI Integration Architecture

### OpenAI GPT-4o Integration

**LangFuse-Wrapped Client**:
```python
# Initialize LangFuse for AI observability
langfuse = Langfuse(
    secret_key=os.environ.get("LANGFUSE_SECRET_KEY"),
    public_key=os.environ.get("LANGFUSE_PUBLIC_KEY"),
    host=os.environ.get("LANGFUSE_HOST", "https://cloud.langfuse.com")
)

# Wrapped OpenAI client for tracking
client = langfuse_openai.OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# API call with tracing
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "system", "content": "..."}, {"role": "user", "content": "..."}],
    max_tokens=4000,
    temperature=0.3
)
```

### AI Prompting Strategy

**Solution Generation Prompt Structure**:
```python
prompt_template = f"""
You are an expert solution architect specializing in AI, Automation, and Software solutions.

OUR CURRENT STACK IS: 
- Cursor for code generation
- Replit for code execution and hosting
- OpenAI for AI (assistants, threads, models)
- ElevenLabs for voice generation
- n8n for automation
- Lang (langchain, langgraph, langfuse) for AI/Automation
- ScraperAPI for web scraping
- Others: Vapi, Zapier, Windsurf, Tixae Agents, Synthflow, Make, Lovable, etc.

Requirements:
1. Quickest Implementation: Days/weeks, not months
2. Easiest Setup: Favor third-party services over custom development
3. Maximum Automation: Minimize human intervention
4. Seamless Integration: Connect to existing workflows
5. Cost-Effective: Immediate ROI and low ongoing costs

Problem/Need to solve: {solution_text}
"""
```

### Computer Vision Integration

**Image Analysis Pipeline**:
```python
# Upload to ImgBB for hosting
def upload_to_imgbb(image_file):
    api_key = os.environ.get("IMGBB_API_KEY")
    response = requests.post("https://api.imgbb.com/1/upload", 
                           data={"key": api_key}, 
                           files={"image": image_file})

# Analyze with OpenAI Vision
def analyze_image_with_vision_api(image_url):
    response = openai.chat.completions.create(
        model="gpt-4-vision-preview",
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": "Analyze this solution diagram..."},
                {"type": "image_url", "image_url": {"url": image_url}}
            ]
        }],
        max_tokens=1500
    )
```

---

## PDF Generation System

### WeasyPrint Architecture

**Environment Setup**:
```python
# Set library path for WeasyPrint dependencies
os.environ["LD_LIBRARY_PATH"] = os.getcwd()
from weasyprint import HTML

# Nix packages for PDF rendering (from .replit):
packages = [
    "cairo", "freetype", "fontconfig", "ghostscript",
    "pango", "pangoft2", "harfbuzz", "graphite2",
    "python311Packages.pycairo", "python311Packages.cairocffi"
]
```

**PDF Generation Pipeline**:
```python
def generate_pdf(output_path, data):
    # Load and encode logos as base64
    logo_path = os.path.join(curr_dir, 'Dry Ground AI_Full Logo_Black_RGB.png')
    with open(logo_path, 'rb') as f:
        logo_base64 = base64.b64encode(f.read()).decode('utf-8')
    
    # Generate HTML from template
    template = Template(html_template)
    html_content = template.render(data=data, logo_base64=logo_base64)
    
    # Convert to PDF
    HTML(string=html_content).write_pdf(output_path)
```

**Template System**:
- **Solution Documents**: Multi-page layout with cover page and solution sections
- **Statement of Work**: Professional business document format
- **Level of Effort**: Technical estimation report with effort calculations

---

## Frontend Architecture

### UI Framework Stack
```
Bootstrap 5.3.0         # Responsive grid and components
Feather Icons          # Modern icon library
Inter Font Family      # Professional typography
Custom CSS             # Dark theme and branding
JavaScript (Vanilla)   # Dynamic interactions and API calls
```

### Design System

**Color Scheme**:
```css
:root {
    --bg-primary: #000000;        /* Header background */
    --bg-secondary: #1a1a1a;      /* Card backgrounds */
    --text-primary: #ffffff;      /* Primary text */
    --text-secondary: #9ca3af;    /* Secondary text */
    --accent-warning: #f59e0b;    /* Solution documents */
    --accent-success: #10b981;    /* Statement of Work */
    --accent-info: #3b82f6;       /* Level of Effort */
}
```

**Component Architecture**:
- **Header**: Fixed navigation with logo and tool switcher
- **Content Cards**: Consistent card-based layouts
- **Tool Cards**: Interactive navigation tiles
- **Form Components**: Standardized input styling
- **Session Management**: Save/load/delete controls

### JavaScript API Integration

**Session Management**:
```javascript
// Update session data
async function updateSession(sessionId, data) {
    const response = await fetch('/update-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, data })
    });
    return response.json();
}

// Save to database
async function saveSessionToDatabase(sessionId) {
    const response = await fetch('/save-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
    });
    return response.json();
}
```

**AI API Calls**:
```javascript
// Generate AI solution
async function generateAISolution(solutionText) {
    const response = await fetch('/generate-ai-solution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solutionText })
    });
    return response.json();
}
```

---

## API Endpoints

### Core Routes Structure

**Main Dashboard**:
```python
@app.route('/')                    # Root redirect to dashboard
@app.route('/main')                # Main NEXA dashboard
```

**Tool Interfaces**:
```python
@app.route('/solutioning')         # Solution Documents interface
@app.route('/structuring')         # Content Structuring interface  
@app.route('/visuals')             # Visual Assets interface
@app.route('/sow')                 # Statement of Work interface
@app.route('/loe')                 # Level of Effort interface
@app.route('/sessions')            # Session management interface
```

**AI Processing Endpoints**:
```python
@app.route('/generate-ai-solution', methods=['POST'])
@app.route('/structure-solution', methods=['POST'])
@app.route('/generate-stack-analysis', methods=['POST'])
@app.route('/enhance-explanation', methods=['POST'])
@app.route('/enhance-structured-content', methods=['POST'])
@app.route('/analyze-image', methods=['POST'])
@app.route('/diagnose-pain-points', methods=['POST'])
```

**Visual Processing**:
```python
@app.route('/generate-diagram-description', methods=['POST'])
@app.route('/generate-sketch-content', methods=['POST'])
@app.route('/convert-text-to-visual', methods=['POST'])
```

**Session Management**:
```python
@app.route('/save-<tool>-session', methods=['POST'])         # Save sessions
@app.route('/load-<tool>-session/<int:session_id>')         # Load sessions
@app.route('/delete-<tool>-session', methods=['POST'])      # Delete sessions
@app.route('/update-<tool>-session', methods=['POST'])      # Update sessions
@app.route('/api/sessions', methods=['GET'])                # List all sessions
```

**Document Generation**:
```python
@app.route('/generate-pdf', methods=['POST'])               # Solution PDFs
@app.route('/generate-sow-pdf', methods=['POST'])          # SoW PDFs
@app.route('/generate-loe-pdf', methods=['POST'])          # LoE PDFs
@app.route('/preview-<document>-pdf', methods=['GET'])     # PDF previews
```

**Cross-Tool Conversion**:
```python
@app.route('/convert-solution-to-sow', methods=['POST'])
@app.route('/convert-sow-to-loe', methods=['POST'])
@app.route('/convert-visual-to-solution', methods=['POST'])
```

---

## Environment Configuration

### Required Environment Variables

**Core Application**:
```bash
# Flask Configuration
SESSION_SECRET=your-session-secret-key

# Database Configuration  
DATABASE_URL=postgresql://user:pass@host:port/db    # Primary option
# OR individual PostgreSQL settings:
PGHOST=localhost
PGDATABASE=postgres
PGUSER=postgres
PGPASSWORD=your-password
PGPORT=5432
```

**AI Services**:
```bash
# OpenAI Integration
OPENAI_API_KEY=sk-your-openai-api-key

# LangFuse Observability
LANGFUSE_SECRET_KEY=sk-your-langfuse-secret
LANGFUSE_PUBLIC_KEY=pk-your-langfuse-public  
LANGFUSE_HOST=https://cloud.langfuse.com      # Optional, defaults to cloud

# Image Services
IMGBB_API_KEY=your-imgbb-api-key
```

**Deployment Configuration (.replit)**:
```toml
[deployment]
deploymentTarget = "autoscale"
run = ["gunicorn", "--bind", "0.0.0.0:5000", "--timeout", "180", "main:app"]

[env]
LD_LIBRARY_PATH = "${FONTCONFIG_LIBDIR}:${PANGO_LIBDIR}${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
```

---

## Deployment Architecture

### Replit Hosting Stack

**Runtime Environment**:
```
Platform: Replit Autoscale
Runtime: Python 3.11 + PostgreSQL 16
Package Manager: Nix (stable-24_05 channel)
Process Manager: Gunicorn WSGI server
Port Configuration: 5000 (internal) → 80/5000 (external)
```

**Nix Package Dependencies**:
```nix
# PDF Generation Stack
"cairo", "freetype", "fontconfig", "ghostscript"
"pango", "pangoft2", "harfbuzz", "graphite2"
"python311Packages.pycairo", "python311Packages.cairocffi"

# Development Tools  
"pkg-config", "libffi", "glib", "gobject-introspection"

# Database
"postgresql"
```

**Gunicorn Configuration**:
```bash
gunicorn --bind 0.0.0.0:5000 --reuse-port --reload --timeout 180 main:app
```

### Scalability Considerations

**Session Storage Strategy**:
- **In-Memory**: Active sessions stored in global dictionaries for performance
- **Database Persistence**: PostgreSQL for long-term storage and recovery
- **JSON Document Storage**: Flexible schema for evolving data structures

**Performance Optimizations**:
- **Lazy Loading**: Sessions loaded on-demand from database
- **Connection Pooling**: PostgreSQL connection management
- **PDF Caching**: Generated documents cached temporarily
- **Image Optimization**: ImgBB CDN for image hosting

---

## Security Implementation

### Data Protection

**Environment Variables**:
- API keys stored in secure environment variables
- Database credentials isolated from codebase
- Session secrets for Flask session management

**Input Validation**:
```python
# Session ID validation
if not session_id or session_id not in solution_session:
    return jsonify({'success': False, 'message': 'Invalid session ID'}), 400

# Content length limits
max_content_length = 50000
if len(solution_text) > max_content_length:
    solution_text = solution_text[:max_content_length]
    logger.info(f"Content truncated to {max_content_length} characters")
```

**SQL Injection Prevention**:
```python
# Parameterized queries with psycopg2
cursor.execute(
    "UPDATE ai_architecture_sessions SET session_objects = %s WHERE id = %s",
    (json.dumps(session_data), row_id)
)
```

### Authentication Framework

**Current State**: Basic session management implemented
**Future Implementation**: Flask-Login integration prepared
```python
# Prepared authentication imports (in app_broken_backup.py)
from flask_login import LoginManager, login_required, current_user
from auth import auth  # Authentication blueprint
from models import User  # User model
```

---

## Monitoring & Observability

### LangFuse Integration

**AI Conversation Tracking**:
```python
# Trace AI interactions
with langfuse.start_as_current_span(
    name="generate-ai-solution",
    metadata={
        "route": "/generate-ai-solution",
        "method": "POST",
        "user_agent": request.headers.get('User-Agent'),
        "ip_address": request.remote_addr
    }
) as span:
    span.update_trace(user_id=request.headers.get('X-User-ID', 'anonymous'))
    # AI processing...
    span.update(
        input={"solution_text": solution_text[:200] + "..."},
        output={"success": True, "response_length": len(ai_response)},
        metadata={"model": "gpt-4o", "tokens_used": response.usage.total_tokens}
    )
```

**Logging Strategy**:
```python
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Structured logging throughout application
logger.info(f"🤖 OpenAI solution response length: {len(ai_response)} characters")
logger.info(f"💾 Saving session {session_id} to database")
logger.error(f"Database connection error: {str(e)}")
```

### Performance Monitoring

**API Response Tracking**:
- Request/response logging for all endpoints
- Session lifecycle monitoring
- Database query performance tracking
- PDF generation timing metrics

**Error Handling**:
```python
try:
    # Operations...
except Exception as e:
    logger.error(f"Error in operation: {str(e)}")
    return jsonify({
        'success': False,
        'message': f'Operation failed: {str(e)}'
    }), 500
```

---

## Development Workflow

### Code Organization Principles

**Separation of Concerns**:
- **`app.py`**: Flask routes and request handling
- **`utils/`**: Business logic and external API integration
- **`templates/`**: Frontend presentation layer
- **`static/`**: Assets and styling

**Error Handling Strategy**:
- Graceful fallbacks for AI service failures
- Database connection error recovery
- User-friendly error messages
- Comprehensive logging for debugging

### Testing Infrastructure

**LangFuse Testing**:
```python
# test_langfuse.py - Integration testing
def test_langfuse_integration():
    required_vars = ["OPENAI_API_KEY", "LANGFUSE_SECRET_KEY", "LANGFUSE_PUBLIC_KEY"]
    # Test environment configuration and API connectivity
```

**Assistant API Testing**:
```python
# test_assistant.py - OpenAI Assistant testing
def test_assistant_api():
    # Test OpenAI assistant functionality for SoW generation
```

---

This technical documentation provides a comprehensive overview of the NEXA platform's implementation, from high-level architecture to specific code patterns and deployment configurations. The platform demonstrates modern web application development practices with AI integration, scalable data persistence, and professional document generation capabilities. 