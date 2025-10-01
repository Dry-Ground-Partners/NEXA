import os
import json
import tempfile
import datetime
import psycopg2
import psycopg2.extras
import logging
import atexit
import re
import io
import base64
import random
import string
import time
import uuid

# Set library path for WeasyPrint
os.environ["LD_LIBRARY_PATH"] = os.getcwd()
from weasyprint import HTML

# Flask imports
from flask import Flask, render_template, request, send_file, jsonify, session, redirect, url_for
from flask_login import LoginManager, login_required, current_user

# Import auth blueprint
from auth import auth

# Import User model
from models import User

# Utility imports
from utils.pdf_generator import generate_pdf, generate_sow_pdf_document, generate_loe_pdf_document
from utils.image_analysis import upload_to_imgbb, analyze_image_with_openai
from utils.vision_api import analyze_image_with_vision_api, generate_stack_analysis_with_openai

# Environment and OpenAI
from dotenv import load_dotenv
from psycopg2 import sql
import openai
from openai import OpenAI

# LangFuse imports
from langfuse import Langfuse
from langfuse.openai import openai as langfuse_openai

# Load environment variables from .env file if it exists
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize LangFuse client
try:
    langfuse = Langfuse(
        secret_key=os.environ.get("LANGFUSE_SECRET_KEY"),
        public_key=os.environ.get("LANGFUSE_PUBLIC_KEY"),
        host=os.environ.get("LANGFUSE_HOST", "https://cloud.langfuse.com")
    )
    
    # Register cleanup handler for graceful shutdown
    atexit.register(lambda: langfuse.flush())
    
    logger.info("LangFuse initialized successfully")
    logger.info(f"LangFuse host: {os.environ.get('LANGFUSE_HOST', 'https://cloud.langfuse.com')}")
    
except Exception as e:
    logger.error(f"Failed to initialize LangFuse: {str(e)}")
    langfuse = None

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key")

# Configure Flask-WTF
app.config['WTF_CSRF_ENABLED'] = True
app.config['WTF_CSRF_TIME_LIMIT'] = None  # No time limit for CSRF tokens

# Configure Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth.login'
login_manager.login_message = 'Please log in to access this page.'
login_manager.login_message_category = 'info'
login_manager.session_protection = 'strong'

@login_manager.user_loader
def load_user(user_id):
    """Load user by ID for Flask-Login."""
    return User.find_by_id(int(user_id))

# Register auth blueprint
app.register_blueprint(auth)

# Global solution session dictionary to store user data
solution_session = {}

# Global SoW session dictionary to store SoW data
sow_session = {}

# Global structuring session dictionary to store structuring data
structuring_session = {}

# Global visuals session dictionary to store visuals data
visuals_session = {}

# Global LoE session dictionary to store LoE data
loe_session = {}

# Global sessions dictionary to store session data
global_sessions = {}

# Function to generate a random session identifier
def generate_session_id():
    """Generate a random session identifier with letters and timestamp"""
    timestamp = int(time.time())
    letters = ''.join(random.choices(string.ascii_uppercase + string.ascii_lowercase, k=8))
    return f"{letters}{timestamp}"

# Database connection function
def get_db_connection():
    """Get PostgreSQL database connection"""
    try:
        # Try to get database URL from environment, fallback to default Replit PostgreSQL
        database_url = os.environ.get("DATABASE_URL")
        if database_url:
            conn = psycopg2.connect(database_url)
        else:
            # Default Replit PostgreSQL connection
            conn = psycopg2.connect(
                host=os.environ.get("PGHOST", "localhost"),
                database=os.environ.get("PGDATABASE", "postgres"),
                user=os.environ.get("PGUSER", "postgres"),
                password=os.environ.get("PGPASSWORD", ""),
                port=os.environ.get("PGPORT", "5432")
            )
        return conn
    except Exception as e:
        logger.error(f"Database connection error: {str(e)}")
        return None

# Log API key status
logger.info(f"OPENAI_API_KEY configured: {'Yes' if os.environ.get('OPENAI_API_KEY') else 'No'}")
logger.info(f"IMGBB_API_KEY configured: {'Yes' if os.environ.get('IMGBB_API_KEY') else 'No'}")

@app.route('/solutioning')
@login_required
def index():
    """Render the main page with the report form."""
    # Check for loaded session parameters
    session_id_param = request.args.get('session_id')
    loaded_param = request.args.get('loaded')
    
    if session_id_param and loaded_param == 'true':
        # This is a loaded session, use the provided session ID
        session_id = session_id_param
        
        # Verify the session exists in our global dictionary
        if session_id not in solution_session:
            logger.error(f"Loaded session {session_id} not found in global dictionary")
            # Fall back to creating a new session
            session_id = generate_session_id()
            solution_session[session_id] = {
                "badge": {
                    "created-at": datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    "row": 0,
                    "glyph": session_id
                },
                "basic": {},
                "current_solution": 1,
                "solution_count": 1,
                "solution_1": {
                    "additional": {},
                    "variables": {},
                    "structure": {
                        "stack": ""
                    }
                }
            }
        else:
            logger.info(f"Using loaded session: {session_id}")
    else:
        # Generate a new session identifier for normal flow
        session_id = generate_session_id()
        
        # Initialize the session in the global dictionary with new multi-solution structure
        solution_session[session_id] = {
            "badge": {
                "created-at": datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                "row": 0,
                "glyph": session_id
            },
            "basic": {},
            "current_solution": 1,
            "solution_count": 1,
            "solution_1": {
                "additional": {},
                "variables": {},
                "structure": {
                    "stack": ""
                }
            }
        }
        
        logger.info(f"New session created: {session_id}")
        logger.info(f"Initial multi-solution session structure: {json.dumps(solution_session[session_id], indent=2)}")
    
    today = datetime.datetime.now().strftime('%Y-%m-%d')
    
    # Pass additional context for loaded sessions
    is_loaded_session = loaded_param == 'true'
    
    return render_template('index.html', 
                         today=today, 
                         session_id=session_id,
                         is_loaded_session=is_loaded_session)

@app.route('/main')
@login_required
def main_dashboard():
    """Render the main NEXA dashboard page."""
    try:
        return render_template('dashboard.html', 
                             user=current_user,
                             current_page='dashboard')
    except Exception as e:
        logger.error(f"Error rendering dashboard: {e}")
        return "Error loading dashboard", 500

@app.route('/auth/login', methods=['GET', 'POST'])
def auth_login():
    """Render the login page."""
    if request.method == 'POST':
        # For now, just show a message that backend auth isn't implemented yet
        return render_template('auth/login.html'), 200
    
    return render_template('auth/login.html')

@app.route('/auth/register', methods=['GET', 'POST']) 
def auth_register():
    """Render the registration page."""
    if request.method == 'POST':
        # For now, just show a message that backend auth isn't implemented yet
        return render_template('auth/register.html'), 200
    
    return render_template('auth/register.html')

@app.route('/auth/logout')
def auth_logout():
    """Handle logout (placeholder for now)."""
    # This will redirect to login when we implement full auth
    return redirect(url_for('auth_login'))

# Root route - redirect to login for now (will be updated when auth is complete)
@app.route('/')
def root():
    """Root route - redirect based on authentication status."""
    if current_user.is_authenticated:
        return redirect(url_for('main_dashboard'))
    else:
        return redirect(url_for('auth.login'))

@app.route('/enhance-explanation', methods=['POST'])
@login_required
def enhance_explanation():
    """Enhance explanation text using OpenAI."""
    # Start a LangFuse trace for this request
    if langfuse:
        try:
            with langfuse.start_as_current_span(
                name="enhance-explanation",
                metadata={
                    "route": "/enhance-explanation",
                    "method": "POST",
                    "user_agent": request.headers.get('User-Agent', ''),
                    "ip_address": request.remote_addr
                }
            ) as span:
                span.update_trace(user_id=request.headers.get('X-User-ID', 'anonymous'))
                
                try:
                    # Get the explanation text from the request
                    explanation = request.json.get('explanation', '')
                    
                    if not explanation.strip():
                        span.update(
                            output={"success": False, "message": "No explanation text provided"},
                            level="ERROR"
                        )
                        return jsonify({
                            'success': False,
                            'message': 'No explanation text provided'
                        }), 400
                        
                    # Import here to avoid circular imports
                    from utils.vision_api import enhance_text_with_openai
                    
                    # Send to OpenAI for enhancement
                    logger.info("Enhancing explanation with OpenAI")
                    enhanced_explanation = enhance_text_with_openai(explanation)
                    
                    span.update(
                        input={"explanation": explanation[:500] + "..." if len(explanation) > 500 else explanation},
                        output={"success": True, "enhanced_explanation": enhanced_explanation[:500] + "..." if len(enhanced_explanation) > 500 else enhanced_explanation},
                        metadata={"input_length": len(explanation), "output_length": len(enhanced_explanation)}
                    )
                    
                    return jsonify({
                        'success': True,
                        'enhanced_explanation': enhanced_explanation
                    })
                    
                except Exception as e:
                    logger.error(f"Error in enhance_explanation span: {str(e)}")
                    span.update(
                        output={"success": False, "error": str(e)},
                        level="ERROR"
                    )
                    raise e
                    
        except Exception as e:
            logger.error(f"Error enhancing explanation: {str(e)}")
            return jsonify({
                'success': False,
                'message': f"Error enhancing explanation: {str(e)}"
            }), 500
    else:
        # Fallback when LangFuse is not available
        try:
            # Get the explanation text from the request
            explanation = request.json.get('explanation', '')
            
            if not explanation.strip():
                return jsonify({
                    'success': False,
                    'message': 'No explanation text provided'
                }), 400
                
            # Import here to avoid circular imports
            from utils.vision_api import enhance_text_with_openai
            
            # Send to OpenAI for enhancement
            logger.info("Enhancing explanation with OpenAI")
            enhanced_explanation = enhance_text_with_openai(explanation)
            
            return jsonify({
                'success': True,
                'enhanced_explanation': enhanced_explanation
            })
            
        except Exception as e:
            logger.error(f"Error enhancing explanation: {str(e)}")
            return jsonify({
                'success': False,
                'message': f"Error enhancing explanation: {str(e)}"
            }), 500

@app.route('/enhance-structured-content', methods=['POST'])
@login_required
def enhance_structured_content():
    """Enhance structured content (title, steps, approach) using OpenAI with specific HTML formatting."""
    # Start a LangFuse trace for this request
    if langfuse:
        try:
            with langfuse.start_as_current_span(
                name="enhance-structured-content",
                metadata={
                    "route": "/enhance-structured-content",
                    "method": "POST",
                    "user_agent": request.headers.get('User-Agent', ''),
                    "ip_address": request.remote_addr
                }
            ) as span:
                span.update_trace(user_id=request.headers.get('X-User-ID', 'anonymous'))
                
                try:
                    # Get the content from the request
                    data = request.get_json()
                    title = data.get('title', '').strip()
                    steps = data.get('steps', '').strip()
                    approach = data.get('approach', '').strip()
                    
                    if not title and not steps and not approach:
                        span.update(
                            output={"success": False, "message": "No content provided for enhancement"},
                            level="ERROR"
                        )
                        return jsonify({
                            'success': False,
                            'message': 'No content provided for enhancement'
                        }), 400
                        
                    # Import here to avoid circular imports
                    from utils.vision_api import enhance_structured_content_with_openai
                    
                    # Send to OpenAI for enhancement
                    logger.info("Enhancing structured content with OpenAI")
                    enhanced_content = enhance_structured_content_with_openai(title, steps, approach)
                    
                    span.update(
                        input={"title": title, "steps": steps[:200] + "..." if len(steps) > 200 else steps, "approach": approach[:200] + "..." if len(approach) > 200 else approach},
                        output={"success": True, "enhanced_content": enhanced_content},
                        metadata={
                            "title_length": len(title),
                            "steps_length": len(steps),
                            "approach_length": len(approach)
                        }
                    )
                    
                    return jsonify({
                        'success': True,
                        'enhanced_title': enhanced_content.get('title', ''),
                        'enhanced_steps': enhanced_content.get('steps', ''),
                        'enhanced_approach': enhanced_content.get('approach', '')
                    })
                    
                except Exception as e:
                    logger.error(f"Error in enhance_structured_content span: {str(e)}")
                    span.update(
                        output={"success": False, "error": str(e)},
                        level="ERROR"
                    )
                    raise e
                    
        except Exception as e:
            logger.error(f"Error enhancing structured content: {str(e)}")
            return jsonify({
                'success': False,
                'message': f"Error enhancing structured content: {str(e)}"
            }), 500
    else:
        # Fallback when LangFuse is not available
        try:
            # Get the content from the request
            data = request.get_json()
            title = data.get('title', '').strip()
            steps = data.get('steps', '').strip()
            approach = data.get('approach', '').strip()
            
            if not title and not steps and not approach:
                return jsonify({
                    'success': False,
                    'message': 'No content provided for enhancement'
                }), 400
                
            # Import here to avoid circular imports
            from utils.vision_api import enhance_structured_content_with_openai
            
            # Send to OpenAI for enhancement
            logger.info("Enhancing structured content with OpenAI")
            enhanced_content = enhance_structured_content_with_openai(title, steps, approach)
            
            return jsonify({
                'success': True,
                'enhanced_title': enhanced_content.get('title', ''),
                'enhanced_steps': enhanced_content.get('steps', ''),
                'enhanced_approach': enhanced_content.get('approach', '')
            })
            
        except Exception as e:
            logger.error(f"Error enhancing structured content: {str(e)}")
            return jsonify({
                'success': False,
                'message': f"Error enhancing structured content: {str(e)}"
            }), 500

@app.route('/generate-stack-analysis', methods=['POST'])
@login_required
def generate_stack_analysis():
    # Start a LangFuse trace for this request
    if langfuse:
        try:
            with langfuse.start_as_current_span(
                name="generate-stack-analysis",
                metadata={
                    "route": "/generate-stack-analysis",
                    "method": "POST",
                    "user_agent": request.headers.get('User-Agent', ''),
                    "ip_address": request.remote_addr
                }
            ) as span:
                span.update_trace(user_id=request.headers.get('X-User-ID', 'anonymous'))
                
                try:
                    data = request.get_json()
                    session_id = data.get('sessionId')
                    ai_analysis = data.get('aiAnalysis', '')
                    solution_explanation = data.get('solutionExplanation', '')
                    image_link = data.get('imageLink', '')
                    
                    if not session_id:
                        span.update(
                            output={"success": False, "message": "Session ID is required"},
                            level="ERROR"
                        )
                        return jsonify({
                            'success': False,
                            'message': 'Session ID is required'
                        })
                    
                    if not solution_explanation.strip():
                        span.update(
                            output={"success": False, "message": "Solution explanation is required"},
                            level="ERROR"
                        )
                        return jsonify({
                            'success': False,
                            'message': 'Solution explanation is required'
                        })
                    
                    # Update span with session information
                    span.update_trace(session_id=session_id)
                    span.update(
                        input={
                            "session_id": session_id,
                            "ai_analysis": ai_analysis[:200] + "..." if len(ai_analysis) > 200 else ai_analysis,
                            "solution_explanation": solution_explanation[:200] + "..." if len(solution_explanation) > 200 else solution_explanation,
                            "has_image_link": bool(image_link)
                        },
                        metadata={
                            "ai_analysis_length": len(ai_analysis),
                            "solution_explanation_length": len(solution_explanation),
                            "has_image_link": bool(image_link)
                        }
                    )
                    
                    # Get current solution number
                    current_solution = solution_session[session_id].get('current_solution', 1)
                    solution_key = f'solution_{current_solution}'
                    
                    # Import the utility function
                    from utils.vision_api import generate_stack_analysis_with_openai
                    
                    # Generate stack analysis using the utility function
                    logger.info("Generating stack analysis with OpenAI")
                    stack_analysis = generate_stack_analysis_with_openai(ai_analysis, solution_explanation, image_link)
                    
                    # Save the stack analysis to the session
                    if 'structure' not in solution_session[session_id][solution_key]:
                        solution_session[session_id][solution_key]['structure'] = {
                            "stack": ""
                        }
                    
                    solution_session[session_id][solution_key]['structure']['stack'] = stack_analysis
                    
                    span.update(
                        output={"success": True, "stack_analysis": stack_analysis[:500] + "..." if len(stack_analysis) > 500 else stack_analysis},
                        metadata={"stack_analysis_length": len(stack_analysis)}
                    )
                    
                    return jsonify({
                        'success': True,
                        'stack_analysis': stack_analysis,
                        'message': 'Stack analysis generated successfully'
                    })
                    
                except Exception as e:
                    logger.error(f"Error in generate_stack_analysis span: {str(e)}")
                    span.update(
                        output={"success": False, "error": str(e)},
                        level="ERROR"
                    )
                    raise e
                    
        except Exception as e:
            logger.error(f"Error generating stack analysis: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Error generating stack analysis: {str(e)}'
            }), 500
    else:
        # Fallback when LangFuse is not available
        try:
            data = request.get_json()
            session_id = data.get('sessionId')
            ai_analysis = data.get('aiAnalysis', '')
            solution_explanation = data.get('solutionExplanation', '')
            image_link = data.get('imageLink', '')
            
            if not session_id:
                return jsonify({
                    'success': False,
                    'message': 'Session ID is required'
                })
            
            if not solution_explanation.strip():
                return jsonify({
                    'success': False,
                    'message': 'Solution explanation is required'
                })
            
            # Get current solution number
            current_solution = solution_session[session_id].get('current_solution', 1)
            solution_key = f'solution_{current_solution}'
            
            # Import the utility function
            from utils.vision_api import generate_stack_analysis_with_openai
            
            # Generate stack analysis using the utility function
            logger.info("Generating stack analysis with OpenAI")
            stack_analysis = generate_stack_analysis_with_openai(ai_analysis, solution_explanation, image_link)
            
            # Save the stack analysis to the session
            if 'structure' not in solution_session[session_id][solution_key]:
                solution_session[session_id][solution_key]['structure'] = {
                    "stack": ""
                }
            
            solution_session[session_id][solution_key]['structure']['stack'] = stack_analysis
            
            return jsonify({
                'success': True,
                'stack_analysis': stack_analysis,
                'message': 'Stack analysis generated successfully'
            })
            
        except Exception as e:
            logger.error(f"Error generating stack analysis: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Error generating stack analysis: {str(e)}'
            }), 500

@app.route('/structure-solution', methods=['POST'])
@login_required
def structure_solution():
    """Structure a solution based on AI analysis and user explanation."""
    # Start a LangFuse trace for this request
    if langfuse:
        try:
            with langfuse.start_as_current_span(
                name="structure-solution",
                metadata={
                    "route": "/structure-solution",
                    "method": "POST",
                    "user_agent": request.headers.get('User-Agent', ''),
                    "ip_address": request.remote_addr
                }
            ) as span:
                span.update_trace(user_id=request.headers.get('X-User-ID', 'anonymous'))
                
                try:
                    # Get data from request
                    data = request.get_json()
                    session_id = data.get('sessionId', '')
                    ai_analysis = data.get('aiAnalysis', '')
                    solution_explanation = data.get('solutionExplanation', '')
                    
                    # Validate inputs
                    if not solution_explanation.strip():
                        span.update(
                            output={"success": False, "message": "Solution explanation is required"},
                            level="ERROR"
                        )
                        return jsonify({
                            'success': False,
                            'message': 'Solution explanation is required'
                        }), 400
                        
                    if not session_id or session_id not in solution_session:
                        span.update(
                            output={"success": False, "message": "Invalid session ID"},
                            level="ERROR"
                        )
                        return jsonify({
                            'success': False,
                            'message': 'Invalid session ID'
                        }), 400
                    
                    # Update span with session information
                    span.update_trace(session_id=session_id)
                    span.update(
                        input={
                            "session_id": session_id,
                            "ai_analysis": ai_analysis[:200] + "..." if len(ai_analysis) > 200 else ai_analysis,
                            "solution_explanation": solution_explanation[:200] + "..." if len(solution_explanation) > 200 else solution_explanation
                        },
                        metadata={
                            "ai_analysis_length": len(ai_analysis),
                            "solution_explanation_length": len(solution_explanation)
                        }
                    )
                    
                    # Get current solution number
                    current_solution = solution_session[session_id].get('current_solution', 1)
                    solution_key = f'solution_{current_solution}'
                    
                    logger.info(f"Structuring solution for session {session_id}, solution {current_solution}")
                    
                    # Import OpenAI utilities
                    from utils.vision_api import structure_solution_with_openai, generate_stack_analysis_with_openai
                    
                    # Send to OpenAI for structuring
                    logger.info("Structuring solution with OpenAI")
                    response = structure_solution_with_openai(ai_analysis, solution_explanation)
                    
                    # Generate stack analysis automatically
                    logger.info("Generating stack analysis with OpenAI")
                    try:
                        # Get image link if available
                        image_link = ''
                        if 'additional' in solution_session[session_id][solution_key] and 'image_link' in solution_session[session_id][solution_key]['additional']:
                            image_link = solution_session[session_id][solution_key]['additional']['image_link']
                        
                        stack_analysis = generate_stack_analysis_with_openai(ai_analysis, solution_explanation, image_link)
                    except Exception as e:
                        logger.error(f"Error generating stack analysis: {str(e)}")
                        stack_analysis = ""  # Set empty if generation fails
                    
                    # Save variables to session
                    solution_session[session_id][solution_key]['variables'] = {
                        'ai_analysis': ai_analysis,
                        'solution_explanation': solution_explanation
                    }
                    
                    # Save structured solution to session
                    solution_session[session_id][solution_key]['structure'] = {
                        'title': response['title'],
                        'steps': response['steps'],
                        'approach': response['approach'],
                        'difficulty': response['difficulty'],
                        'layout': 1,  # Default layout
                        'stack': stack_analysis
                    }
                    
                    # Log the updated session
                    logger.info(f"Updated structured solution for session {session_id}, solution {current_solution}")
                    logger.info(f"solution_session['{session_id}']: {json.dumps(solution_session[session_id], indent=2)}")
                    
                    span.update(
                        output={
                            "success": True,
                            "title": response['title'],
                            "steps": response['steps'][:200] + "..." if len(response['steps']) > 200 else response['steps'],
                            "approach": response['approach'][:200] + "..." if len(response['approach']) > 200 else response['approach'],
                            "difficulty": response['difficulty']
                        },
                        metadata={
                            "title_length": len(response['title']),
                            "steps_length": len(response['steps']),
                            "approach_length": len(response['approach']),
                            "stack_analysis_length": len(stack_analysis)
                        }
                    )
                    
                    # Return structured data
                    return jsonify({
                        'success': True,
                        'title': response['title'],
                        'steps': response['steps'],
                        'approach': response['approach'],
                        'difficulty': response['difficulty']
                    })
                    
                except Exception as e:
                    logger.error(f"Error in structure_solution span: {str(e)}")
                    span.update(
                        output={"success": False, "error": str(e)},
                        level="ERROR"
                    )
                    raise e
                    
        except Exception as e:
            logger.error(f"Error structuring solution: {str(e)}")
            return jsonify({
                'success': False,
                'message': f"Error structuring solution: {str(e)}"
            }), 500
    else:
        # Fallback when LangFuse is not available
        try:
            # Get data from request
            data = request.get_json()
            session_id = data.get('sessionId', '')
            ai_analysis = data.get('aiAnalysis', '')
            solution_explanation = data.get('solutionExplanation', '')
            
            # Validate inputs
            if not solution_explanation.strip():
                return jsonify({
                    'success': False,
                    'message': 'Solution explanation is required'
                }), 400
                
            if not session_id or session_id not in solution_session:
                return jsonify({
                    'success': False,
                    'message': 'Invalid session ID'
                }), 400
            
            # Get current solution number
            current_solution = solution_session[session_id].get('current_solution', 1)
            solution_key = f'solution_{current_solution}'
            
            logger.info(f"Structuring solution for session {session_id}, solution {current_solution}")
            
            # Import OpenAI utilities
            from utils.vision_api import structure_solution_with_openai, generate_stack_analysis_with_openai
            
            # Send to OpenAI for structuring
            logger.info("Structuring solution with OpenAI")
            response = structure_solution_with_openai(ai_analysis, solution_explanation)
            
            # Generate stack analysis automatically
            logger.info("Generating stack analysis with OpenAI")
            try:
                # Get image link if available
                image_link = ''
                if 'additional' in solution_session[session_id][solution_key] and 'image_link' in solution_session[session_id][solution_key]['additional']:
                    image_link = solution_session[session_id][solution_key]['additional']['image_link']
                
                stack_analysis = generate_stack_analysis_with_openai(ai_analysis, solution_explanation, image_link)
            except Exception as e:
                logger.error(f"Error generating stack analysis: {str(e)}")
                stack_analysis = ""  # Set empty if generation fails
            
            # Save variables to session
            solution_session[session_id][solution_key]['variables'] = {
                'ai_analysis': ai_analysis,
                'solution_explanation': solution_explanation
            }
            
            # Save structured solution to session
            solution_session[session_id][solution_key]['structure'] = {
                'title': response['title'],
                'steps': response['steps'],
                'approach': response['approach'],
                'difficulty': response['difficulty'],
                'layout': 1,  # Default layout
                'stack': stack_analysis
            }
            
            # Log the updated session
            logger.info(f"Updated structured solution for session {session_id}, solution {current_solution}")
            logger.info(f"solution_session['{session_id}']: {json.dumps(solution_session[session_id], indent=2)}")
            
            # Return structured data
            return jsonify({
                'success': True,
                'title': response['title'],
                'steps': response['steps'],
                'approach': response['approach'],
                'difficulty': response['difficulty']
            })
            
        except Exception as e:
            logger.error(f"Error structuring solution: {str(e)}")
            return jsonify({
                'success': False,
                'message': f"Error structuring solution: {str(e)}"
            }), 500

@app.route('/analyze-image', methods=['POST'])
@login_required
def analyze_image():
    """Analyze an uploaded image using OpenAI Vision API."""
    # Start a LangFuse trace for this request
    trace = None
    if langfuse:
        try:
            with langfuse.start_as_current_span(
                name="analyze-image",
                metadata={
                    "route": "/analyze-image",
                    "method": "POST",
                    "user_agent": request.headers.get('User-Agent', ''),
                    "ip_address": request.remote_addr
                }
            ) as span:
                span.update_trace(user_id=request.headers.get('X-User-ID', 'anonymous'))
                
                try:
                    # Check if an image file was uploaded
                    if 'image' not in request.files:
                        span.update(
                            output={"success": False, "message": "No image file uploaded"},
                            level="ERROR"
                        )
                        return jsonify({
                            'success': False,
                            'message': 'No image file uploaded'
                        }), 400
                        
                    image_file = request.files['image']
                    session_id = request.form.get('sessionId', '')
                    
                    if image_file.filename == '':
                        span.update(
                            output={"success": False, "message": "No image file selected"},
                            level="ERROR"
                        )
                        return jsonify({
                            'success': False,
                            'message': 'No image file selected'
                        }), 400
                    
                    # Update span with session information
                    span.update_trace(session_id=session_id if session_id else None)
                    span.update(
                        input={
                            "session_id": session_id,
                            "filename": image_file.filename,
                            "content_type": image_file.content_type
                        },
                        metadata={
                            "file_size": len(image_file.read()),
                            "content_type": image_file.content_type
                        }
                    )
                    # Reset file pointer after reading for size
                    image_file.seek(0)
                    
                    logger.info(f"Analyzing image: {image_file.filename}")
                    
                    # Upload image to ImgBB
                    image_url = upload_to_imgbb(image_file)
                    
                    if not image_url:
                        span.update(
                            output={"success": False, "message": "Failed to upload image"},
                            level="ERROR"
                        )
                        return jsonify({
                            'success': False,
                            'message': 'Failed to upload image'
                        }), 500
                        
                    # Analyze the image using OpenAI Vision API
                    analysis = analyze_image_with_vision_api(image_url=image_url)
                    
                    if analysis.startswith("Error"):
                        span.update(
                            output={"success": False, "message": analysis},
                            level="ERROR"
                        )
                        return jsonify({
                            'success': False,
                            'message': analysis
                        }), 500
                    
                    span.update(
                        output={
                            "success": True,
                            "image_url": image_url,
                            "analysis": analysis[:500] + "..." if len(analysis) > 500 else analysis
                        },
                        metadata={
                            "image_url": image_url,
                            "analysis_length": len(analysis)
                        }
                    )
                    
                    return jsonify({
                        'success': True,
                        'image_url': image_url,
                        'analysis': analysis
                    })
                    
                except Exception as e:
                    logger.error(f"Error handling request /analyze-image: {str(e)}")
                    span.update(
                        output={"success": False, "error": str(e)},
                        level="ERROR"
                    )
                    return jsonify({
                        'success': False,
                        'message': f'Error analyzing image: {str(e)}'
                    }), 500
        except Exception as langfuse_error:
            logger.error(f"LangFuse error: {str(langfuse_error)}")
            # Continue without tracing if LangFuse fails
    
    # Fallback execution without tracing if LangFuse is not available or fails
    try:
        # Check if an image file was uploaded
        if 'image' not in request.files:
            return jsonify({
                'success': False,
                'message': 'No image file uploaded'
            }), 400
            
        image_file = request.files['image']
        session_id = request.form.get('sessionId', '')
        
        if image_file.filename == '':
            return jsonify({
                'success': False,
                'message': 'No image file selected'
            }), 400
        
        logger.info(f"Analyzing image: {image_file.filename}")
        
        # Upload image to ImgBB
        image_url = upload_to_imgbb(image_file)
        
        if not image_url:
            return jsonify({
                'success': False,
                'message': 'Failed to upload image'
            }), 500
            
        # Analyze the image using OpenAI Vision API
        analysis = analyze_image_with_vision_api(image_url=image_url)
        
        if analysis.startswith("Error"):
            return jsonify({
                'success': False,
                'message': analysis
            }), 500
        
        return jsonify({
            'success': True,
            'image_url': image_url,
            'analysis': analysis
        })
        
    except Exception as e:
        logger.error(f"Error handling request /analyze-image: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Error analyzing image: {str(e)}'
        }), 500

@app.route('/generate-pdf', methods=['POST'])
@login_required
def create_pdf():
    """Generate a PDF based on form data with support for multiple solutions."""
    try:
        # Get session ID
        session_id = request.form.get('sessionId', '')
        
        if not session_id or session_id not in solution_session:
            return jsonify({
                'success': False,
                'message': 'Invalid session ID'
            }), 400
        
        session_data = solution_session[session_id]
        logger.info(f"Generating multi-solution PDF for session: {session_id}")
        logger.info(f"Session data: {json.dumps(session_data, indent=2)}")
        
        # Extract basic information
        basic_info = session_data.get('basic', {})
        date = basic_info.get('date', datetime.datetime.now().strftime('%Y-%m-%d'))
        title = basic_info.get('title', 'Solution Overview Report')
        recipient = basic_info.get('prepared_for', 'Client')
        engineer = basic_info.get('engineer', 'Engineer')
        
        # Validate required fields
        if not title or not recipient or not engineer:
            return jsonify({
                'success': False, 
                'message': 'All basic information fields are required'
            }), 400
        
        # Collect all solutions from the session
        solutions_data = []
        for key, value in session_data.items():
            if key.startswith('solution_'):
                try:
                    solution_num = int(key.split('_')[1])
                    
                    # Extract solution data
                    structure = value.get('structure', {})
                    variables = value.get('variables', {})
                    additional = value.get('additional', {})
                    
                    # Extract image data
                    solution_image_data = None
                    image_link = additional.get('image_link', '')
                    if image_link and image_link.startswith('data:image'):
                        # Extract base64 data from data URL
                        solution_image_data = image_link.split(',')[1] if ',' in image_link else None
                    
                    # Get solution explanation (prefer variables over additional)
                    solution_explanation = variables.get('solution_explanation', additional.get('explanation', ''))
                    ai_analysis = variables.get('ai_analysis', '')
                    
                    # Combine explanation and AI analysis if both exist
                    if ai_analysis and solution_explanation:
                        combined_explanation = f"{solution_explanation}\n\nAI Analysis of Diagram:\n{ai_analysis}"
                    elif ai_analysis and not solution_explanation.strip():
                        combined_explanation = ai_analysis
                    else:
                        combined_explanation = solution_explanation
                    
                    solutions_data.append({
                        'number': solution_num,
                        'title': structure.get('title', f'Solution {solution_num}'),
                        'steps': structure.get('steps', ''),
                        'approach': structure.get('approach', ''),
                        'difficulty': structure.get('difficulty', 50),
                        'layout': structure.get('layout', 1),
                        'explanation': combined_explanation,
                        'image_data': solution_image_data,
                        'ai_analysis': ai_analysis
                    })
                    
                except (ValueError, IndexError) as e:
                    logger.warning(f"Skipping invalid solution key {key}: {e}")
                    continue
        
        # Sort solutions by number
        solutions_data.sort(key=lambda x: x['number'])
        
        if not solutions_data:
            return jsonify({
                'success': False,
                'message': 'No solutions found in session'
            }), 400
        
        logger.info(f"Found {len(solutions_data)} solutions for PDF generation")
        for sol in solutions_data:
            logger.info(f"Solution {sol['number']}: {sol['title']} (Layout {sol['layout']})")
        
        # Create a temporary file for the PDF
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            temp_filename = temp_file.name
        
        # Generate the multi-solution PDF
        generate_pdf(temp_filename, {
            'basic_info': {
                'date': date,
                'title': title,
                'recipient': recipient,
                'engineer': engineer
            },
            'solutions': solutions_data,
            'total_solutions': len(solutions_data),
            'is_multi_solution': len(solutions_data) > 1
        })
        
        # Determine filename
        if len(solutions_data) > 1:
            download_name = f"{title.replace(' ', '_')}_Multi_Solution_Report.pdf"
        else:
            download_name = f"{title.replace(' ', '_')}_Report.pdf"
        
        logger.info(f"PDF generated successfully: {download_name}")
        
        # Send the file
        return send_file(
            temp_filename,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=download_name
        )
    
    except Exception as e:
        logger.error(f"Error generating PDF: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error generating PDF: {str(e)}"
        }), 500

@app.route('/preview-pdf', methods=['GET'])
def preview_pdf():
    """Generate a PDF for browser preview (not download) based on session data."""
    try:
        # Get session ID from query parameters
        session_id = request.args.get('sessionId', '')
        
        if not session_id or session_id not in solution_session:
            return jsonify({
                'success': False,
                'message': 'Invalid session ID'
            }), 400
        
        session_data = solution_session[session_id]
        logger.info(f"Generating PDF preview for session: {session_id}")
        
        # Extract basic information
        basic_info = session_data.get('basic', {})
        date = basic_info.get('date', datetime.datetime.now().strftime('%Y-%m-%d'))
        title = basic_info.get('title', 'Solution Overview Report')
        recipient = basic_info.get('prepared_for', 'Client')
        engineer = basic_info.get('engineer', 'Engineer')
        
        # Validate required fields
        if not title or not recipient or not engineer:
            return jsonify({
                'success': False, 
                'message': 'All basic information fields are required'
            }), 400
        
        # Collect all solutions from the session
        solutions_data = []
        for key, value in session_data.items():
            if key.startswith('solution_'):
                try:
                    solution_num = int(key.split('_')[1])
                    
                    # Extract solution data
                    structure = value.get('structure', {})
                    variables = value.get('variables', {})
                    additional = value.get('additional', {})
                    
                    # Extract image data
                    solution_image_data = None
                    image_link = additional.get('image_link', '')
                    if image_link and image_link.startswith('data:image'):
                        # Extract base64 data from data URL
                        solution_image_data = image_link.split(',')[1] if ',' in image_link else None
                    
                    # Get solution explanation (prefer variables over additional)
                    solution_explanation = variables.get('solution_explanation', additional.get('explanation', ''))
                    ai_analysis = variables.get('ai_analysis', '')
                    
                    # Combine explanation and AI analysis if both exist
                    if ai_analysis and solution_explanation:
                        combined_explanation = f"{solution_explanation}\n\nAI Analysis of Diagram:\n{ai_analysis}"
                    elif ai_analysis and not solution_explanation.strip():
                        combined_explanation = ai_analysis
                    else:
                        combined_explanation = solution_explanation
                    
                    solutions_data.append({
                        'number': solution_num,
                        'title': structure.get('title', f'Solution {solution_num}'),
                        'steps': structure.get('steps', ''),
                        'approach': structure.get('approach', ''),
                        'difficulty': structure.get('difficulty', 50),
                        'layout': structure.get('layout', 1),
                        'explanation': combined_explanation,
                        'image_data': solution_image_data,
                        'ai_analysis': ai_analysis
                    })
                    
                except (ValueError, IndexError) as e:
                    logger.warning(f"Skipping invalid solution key {key}: {e}")
                    continue
        
        # Sort solutions by number
        solutions_data.sort(key=lambda x: x['number'])
        
        if not solutions_data:
            return jsonify({
                'success': False,
                'message': 'No solutions found in session'
            }), 400
        
        logger.info(f"Found {len(solutions_data)} solutions for PDF preview")
        
        # Create a temporary file for the PDF
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            temp_filename = temp_file.name
        
        # Generate the multi-solution PDF
        generate_pdf(temp_filename, {
            'basic_info': {
                'date': date,
                'title': title,
                'recipient': recipient,
                'engineer': engineer
            },
            'solutions': solutions_data,
            'total_solutions': len(solutions_data),
            'is_multi_solution': len(solutions_data) > 1
        })
        
        logger.info(f"PDF preview generated successfully")
        
        # Send the file for browser viewing (not download)
        return send_file(
            temp_filename,
            mimetype='application/pdf',
            as_attachment=False  # This makes it open in browser instead of download
        )
    
    except Exception as e:
        logger.error(f"Error generating PDF preview: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error generating PDF preview: {str(e)}"
        }), 500

@app.route('/save-basic-info', methods=['POST'])
@login_required
def save_basic_info():
    """Save basic information to the session."""
    try:
        # Get data from request
        data = request.get_json()
        session_id = data.get('sessionId', '')
        
        if not session_id or session_id not in solution_session:
            return jsonify({
                'success': False,
                'message': 'Invalid session ID'
            }), 400
            
        # Get form values
        date = data.get('date', '')
        title = data.get('title', '')
        recipient = data.get('recipient', '')
        engineer = data.get('engineer', '')
        
        # Save to solution_session
        solution_session[session_id]['basic'] = {
            'date': date,
            'title': title,
            'prepared_for': recipient,
            'engineer': engineer
        }
        
        # Log the updated session
        logger.info(f"Updated basic info for session {session_id}")
        logger.info(f"solution_session['{session_id}']: {json.dumps(solution_session[session_id], indent=2)}")
        
        return jsonify({
            'success': True,
            'message': 'Basic information saved successfully'
        })
        
    except Exception as e:
        logger.error(f"Error saving basic information: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error saving basic information: {str(e)}"
        }), 500

@app.route('/save-additional-info', methods=['POST'])
@login_required
def save_additional_info():
    """Save additional information to the session."""
    try:
        # Get data from request
        data = request.get_json()
        session_id = data.get('sessionId', '')
        image_link = data.get('imageLink', '')
        explanation = data.get('explanation', '')
        
        if not session_id or session_id not in solution_session:
            return jsonify({
                'success': False,
                'message': 'Invalid session ID'
            }), 400
        
        # Get current solution number
        current_solution = solution_session[session_id].get('current_solution', 1)
        solution_key = f'solution_{current_solution}'
        
        logger.info(f"Saving additional info for session {session_id}, solution {current_solution}")
            
        # Save to solution_session
        solution_session[session_id][solution_key]['additional'] = {
            'image_link': image_link,
            'explanation': explanation
        }
        
        # Log the updated session
        logger.info(f"Updated additional info for session {session_id}, solution {current_solution}")
        logger.info(f"solution_session['{session_id}']: {json.dumps(solution_session[session_id], indent=2)}")
        
        return jsonify({
            'success': True,
            'message': 'Additional information saved successfully'
        })
        
    except Exception as e:
        logger.error(f"Error saving additional information: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error saving additional information: {str(e)}"
        }), 500

@app.route('/save-layout', methods=['POST'])
@login_required
def save_layout():
    """Save layout selection to the session."""
    try:
        # Get data from request
        data = request.get_json()
        session_id = data.get('sessionId', '')
        layout = data.get('layout', 1)
        
        if not session_id or session_id not in solution_session:
            return jsonify({
                'success': False,
                'message': 'Invalid session ID'
            }), 400
        
        # Get current solution number
        current_solution = solution_session[session_id].get('current_solution', 1)
        solution_key = f'solution_{current_solution}'
        
        logger.info(f"Saving layout for session {session_id}, solution {current_solution}: {layout}")
            
        # Save layout to session
        if 'structure' not in solution_session[session_id][solution_key]:
            solution_session[session_id][solution_key]['structure'] = {
                "stack": ""
            }
        
        solution_session[session_id][solution_key]['structure']['layout'] = layout
        
        # Log the updated session
        logger.info(f"Updated layout for session {session_id}, solution {current_solution}: {layout}")
        logger.info(f"solution_session['{session_id}']: {json.dumps(solution_session[session_id], indent=2)}")
        
        return jsonify({
            'success': True,
            'message': 'Layout saved successfully'
        })
        
    except Exception as e:
        logger.error(f"Error saving layout: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error saving layout: {str(e)}"
        }), 500

@app.route('/update-solution-data', methods=['POST'])
@login_required
def update_solution_data():
    """Update solution variables and structure in the session."""
    try:
        # Get data from request
        data = request.get_json()
        session_id = data.get('sessionId', '')
        
        # Get form values
        structured_title = data.get('title', '')
        structured_steps = data.get('steps', '')
        structured_approach = data.get('approach', '')
        difficulty = data.get('difficulty', 50)
        layout = data.get('layout', 1)
        ai_analysis = data.get('aiAnalysis', '')
        solution_explanation = data.get('solutionExplanation', '')
        
        if not session_id or session_id not in solution_session:
            return jsonify({
                'success': False,
                'message': 'Invalid session ID'
            }), 400
        
        # Get current solution number
        current_solution = solution_session[session_id].get('current_solution', 1)
        solution_key = f'solution_{current_solution}'
        
        logger.info(f"Updating solution data for session {session_id}, solution {current_solution}")
            
        # Update variables in session
        solution_session[session_id][solution_key]['variables'] = {
            'ai_analysis': ai_analysis,
            'solution_explanation': solution_explanation
        }
        
        # Get existing structure to preserve stack content
        existing_structure = solution_session[session_id][solution_key].get('structure', {})
        existing_stack = existing_structure.get('stack', '')
        
        # Update structure in session - preserve existing stack
        solution_session[session_id][solution_key]['structure'] = {
            'title': structured_title,
            'steps': structured_steps,
            'approach': structured_approach,
            'difficulty': difficulty,
            'layout': layout,
            'stack': existing_stack  # Preserve existing stack instead of setting to ""
        }
        
        # Log the updated session
        logger.info(f"Updated solution data for session {session_id}, solution {current_solution}")
        logger.info(f"solution_session['{session_id}']: {json.dumps(solution_session[session_id], indent=2)}")
        
        return jsonify({
            'success': True,
            'message': 'Solution data updated successfully'
        })
        
    except Exception as e:
        logger.error(f"Error updating solution data: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error updating solution data: {str(e)}"
        }), 500

@app.route('/next-solution', methods=['POST'])
def next_solution():
    """Create a new solution and increment the solution counter."""
    try:
        # Get data from request
        data = request.get_json()
        session_id = data.get('sessionId', '')
        
        if not session_id or session_id not in solution_session:
            return jsonify({
                'success': False,
                'message': 'Invalid session ID'
            }), 400
        
        # Get current session data
        session_data = solution_session[session_id]
        current_solution = session_data.get('current_solution', 1)
        solution_count = session_data.get('solution_count', 1)
        
        logger.info(f"Starting next solution process for session {session_id}")
        logger.info(f"Current solution: {current_solution}, Current count: {solution_count}")
        
        # Increment counters
        new_solution_number = solution_count + 1
        solution_session[session_id]['current_solution'] = new_solution_number
        solution_session[session_id]['solution_count'] = new_solution_number
        
        # Create new solution object
        new_solution_key = f'solution_{new_solution_number}'
        solution_session[session_id][new_solution_key] = {
            "additional": {},
            "variables": {},
            "structure": {
                "stack": ""
            }
        }
        
        logger.info(f"Created new solution: {new_solution_key}")
        logger.info(f"Updated session counters - current_solution: {new_solution_number}, solution_count: {new_solution_number}")
        logger.info(f"Full session structure: {json.dumps(solution_session[session_id], indent=2)}")
        
        return jsonify({
            'success': True,
            'message': f'Started solution {new_solution_number}',
            'current_solution': new_solution_number,
            'solution_count': new_solution_number
        })
        
    except Exception as e:
        logger.error(f"Error creating next solution: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error creating next solution: {str(e)}"
        }), 500

@app.route('/get-session-info', methods=['POST'])
def get_session_info():
    """Get session information including current solution and total solutions"""
    try:
        data = request.get_json()
        session_id = data.get('sessionId')
        
        logger.info(f"Getting session info for session: {session_id}")
        
        if not session_id or session_id not in solution_session:
            logger.warning(f"Invalid session ID: {session_id}")
            return jsonify({
                'success': False,
                'message': 'Invalid session ID'
            }), 400
        
        session_data = solution_session[session_id]
        current_solution = session_data.get('current_solution', 1)
        
        # Count total solutions by counting solution_X keys (excluding solution_count)
        total_solutions = len([key for key in session_data.keys() if key.startswith('solution_') and key != 'solution_count'])
        
        logger.info(f"Session info - Current: {current_solution}, Total: {total_solutions}")
        
        return jsonify({
            'success': True,
            'current_solution': current_solution,
            'total_solutions': total_solutions,
            'session_id': session_id
        })
        
    except Exception as e:
        logger.error(f"Error getting session info: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error getting session info: {str(e)}"
        }), 500

@app.route('/switch-solution', methods=['POST'])
def switch_solution():
    """Switch to a specific solution and return its data"""
    try:
        data = request.get_json()
        session_id = data.get('sessionId')
        target_solution = data.get('targetSolution')
        
        logger.info(f"Switching to solution {target_solution} for session: {session_id}")
        
        if not session_id or session_id not in solution_session:
            logger.warning(f"Invalid session ID: {session_id}")
            return jsonify({
                'success': False,
                'message': 'Invalid session ID'
            }), 400
        
        if target_solution == 'basic':
            # Switch to basic info (Step 1)
            solution_session[session_id]['current_solution'] = 'basic'
            basic_data = solution_session[session_id].get('basic', {})
            
            return jsonify({
                'success': True,
                'target': 'basic',
                'data': basic_data
            })
        else:
            # Switch to specific solution number
            try:
                solution_num = int(target_solution)
                solution_key = f'solution_{solution_num}'
                
                # Check if solution exists
                if solution_key not in solution_session[session_id]:
                    return jsonify({
                        'success': False,
                        'message': f'Solution {solution_num} does not exist'
                    }), 400
                
                # Update current solution
                solution_session[session_id]['current_solution'] = solution_num
                
                # Get solution data
                solution_data = solution_session[session_id][solution_key]
                
                logger.info(f"Switched to solution {solution_num} for session {session_id}")
                
                return jsonify({
                    'success': True,
                    'target': 'solution',
                    'solution_number': solution_num,
                    'data': solution_data
                })
                
            except ValueError:
                return jsonify({
                    'success': False,
                    'message': 'Invalid solution number'
                }), 400
        
    except Exception as e:
        logger.error(f"Error switching solution: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error switching solution: {str(e)}"
        }), 500

@app.route('/get-solution-data', methods=['POST'])
def get_solution_data():
    """Get specific solution data without switching current_solution"""
    try:
        data = request.get_json()
        session_id = data.get('sessionId')
        solution_number = data.get('solutionNumber')
        
        logger.info(f"Getting data for solution {solution_number} in session: {session_id}")
        
        if not session_id or session_id not in solution_session:
            return jsonify({
                'success': False,
                'message': 'Invalid session ID'
            }), 400
        
        if solution_number == 'basic':
            basic_data = solution_session[session_id].get('basic', {})
            return jsonify({
                'success': True,
                'data': basic_data
            })
        else:
            try:
                solution_num = int(solution_number)
                solution_key = f'solution_{solution_num}'
                
                if solution_key not in solution_session[session_id]:
                    return jsonify({
                        'success': False,
                        'message': f'Solution {solution_num} does not exist'
                    }), 400
                
                solution_data = solution_session[session_id][solution_key]
                return jsonify({
                    'success': True,
                    'data': solution_data
                })
                
            except ValueError:
                return jsonify({
                    'success': False,
                    'message': 'Invalid solution number'
                }), 400
        
    except Exception as e:
        logger.error(f"Error getting solution data: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error getting solution data: {str(e)}"
        }), 500

@app.route('/delete-solution', methods=['POST'])
def delete_solution():
    """Delete a specific solution"""
    try:
        data = request.get_json()
        session_id = data.get('sessionId')
        solution_number = data.get('solutionNumber')
        
        logger.info(f"Deleting solution {solution_number} for session: {session_id}")
        
        if not session_id or session_id not in solution_session:
            return jsonify({
                'success': False,
                'message': 'Invalid session ID'
            }), 400
        
        if not solution_number:
            return jsonify({
                'success': False,
                'message': 'Solution number is required'
            }), 400
        
        try:
            solution_num = int(solution_number)
        except ValueError:
            return jsonify({
                'success': False,
                'message': 'Invalid solution number'
            }), 400
        
        solution_key = f'solution_{solution_num}'
        
        # Check if solution exists
        if solution_key not in solution_session[session_id]:
            return jsonify({
                'success': False,
                'message': f'Solution {solution_num} does not exist'
            }), 400
        
        # Count total solutions
        total_solutions = sum(1 for key in solution_session[session_id].keys() if key.startswith('solution_'))
        
        # Prevent deletion if it's the last solution
        if total_solutions <= 1:
            return jsonify({
                'success': False,
                'message': 'Cannot delete the last remaining solution'
            }), 400
        
        # Delete the solution
        del solution_session[session_id][solution_key]
        
        # Renumber solutions to maintain sequential numbering
        solutions_to_renumber = []
        for key in list(solution_session[session_id].keys()):
            if key.startswith('solution_'):
                try:
                    # Extract the part after 'solution_' and validate it's numeric
                    key_suffix = key.split('_')[1]
                    sol_num = int(key_suffix)
                    if sol_num > solution_num:
                        solutions_to_renumber.append((key, sol_num))
                except (IndexError, ValueError):
                    # Skip keys that don't have a valid numeric suffix
                    continue
        
        # Sort by solution number and renumber
        solutions_to_renumber.sort(key=lambda x: x[1])
        for old_key, old_num in solutions_to_renumber:
            new_num = old_num - 1
            new_key = f'solution_{new_num}'
            solution_session[session_id][new_key] = solution_session[session_id][old_key]
            del solution_session[session_id][old_key]
        
        # Update current_solution if needed
        current_solution = solution_session[session_id].get('current_solution', 1)
        if isinstance(current_solution, int):
            if current_solution == solution_num:
                # If we deleted the current solution, switch to solution 1
                solution_session[session_id]['current_solution'] = 1
            elif current_solution > solution_num:
                # If current solution number is higher, decrement it
                solution_session[session_id]['current_solution'] = current_solution - 1
        
        # Update solution_count to reflect the deletion
        current_count = solution_session[session_id].get('solution_count', total_solutions)
        new_count = current_count - 1
        solution_session[session_id]['solution_count'] = new_count
        
        logger.info(f"Successfully deleted solution {solution_num} for session {session_id}")
        logger.info(f"Updated solution count from {current_count} to {new_count}")
        
        return jsonify({
            'success': True,
            'message': f'Solution {solution_num} deleted successfully',
            'new_total': new_count,
            'solution_count': new_count
        })
        
    except Exception as e:
        logger.error(f"Error deleting solution: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error deleting solution: {str(e)}"
        }), 500

@app.route('/save-session', methods=['POST'])
@login_required
def save_session():
    """Save session data to the database"""
    try:
        data = request.get_json()
        session_id = data.get('sessionId')
        
        if not session_id or session_id not in solution_session:
            return jsonify({
                'success': False,
                'message': 'Invalid session ID'
            }), 400
        
        session_data = solution_session[session_id]
        logger.info(f"💾 Saving session {session_id} to database")
        logger.info(f"📊 Complete Session Object Structure:")
        logger.info(f"Session Data: {json.dumps(session_data, indent=2)}")
        
        # Get database connection
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        try:
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            # Get the current row value from badge
            badge = session_data.get('badge', {})
            current_row = badge.get('row', 0)
            
            # Check if row exists in database
            cursor.execute("SELECT id FROM ai_architecture_sessions WHERE id = %s", (current_row,))
            existing_row = cursor.fetchone()
            
            if existing_row and current_row > 0:
                # Row exists - update session_objects
                logger.info(f"🔄 Updating existing row {current_row} with session data")
                cursor.execute(
                    "UPDATE ai_architecture_sessions SET session_objects = %s WHERE id = %s",
                    (json.dumps(session_data), current_row)
                )
                row_id = current_row
                
            else:
                # Row doesn't exist - create new row
                logger.info("🆕 Creating new row for session data")
                
                # Extract title and client from session data
                basic_info = session_data.get('basic', {})
                title = basic_info.get('title', '')
                client = basic_info.get('prepared_for', '')
                
                logger.info(f"📝 Extracted metadata - Title: '{title}', Client: '{client}'")
                
                # Insert new row and get the generated ID
                cursor.execute(
                    """INSERT INTO ai_architecture_sessions (session_objects, title, client) 
                       VALUES (%s, %s, %s) RETURNING id""",
                    (json.dumps(session_data), title, client)
                )
                
                new_row = cursor.fetchone()
                row_id = new_row['id']
                
                # Update the badge row value in the session with the new row ID
                solution_session[session_id]['badge']['row'] = row_id
                
                # Update the database with the corrected session data (with updated badge)
                cursor.execute(
                    "UPDATE ai_architecture_sessions SET session_objects = %s WHERE id = %s",
                    (json.dumps(solution_session[session_id]), row_id)
                )
                
                logger.info(f"✅ Created new row {row_id} and updated badge row value")
            
            # Commit the transaction
            conn.commit()
            
            logger.info(f"🎉 Successfully saved session {session_id} to database row {row_id}")
            
            return jsonify({
                'success': True,
                'message': f'Session saved successfully to row {row_id}',
                'row_id': row_id
            })
            
        except Exception as db_error:
            conn.rollback()
            logger.error(f"💥 Database operation error: {str(db_error)}")
            return jsonify({
                'success': False,
                'message': f'Database error: {str(db_error)}'
            }), 500
            
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        logger.error(f"💥 Error saving session: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error saving session: {str(e)}"
        }), 500

@app.route('/sessions')
@login_required
def sessions_page():
    """Render the sessions management page."""
    return render_template('sessions.html')

@app.route('/structuring')
@login_required
def structuring_page():
    """Render the structuring page."""
    # Check for loaded session parameters
    session_id_param = request.args.get('session_id')
    loaded_param = request.args.get('loaded')
    
    logger.info(f"🔍 Structuring page called with session_id_param='{session_id_param}', loaded_param='{loaded_param}'")
    
    if session_id_param and loaded_param == 'true':
        # This is a loaded session, use the provided session ID
        session_id = session_id_param
        
        logger.info(f"📋 Loading existing structuring session: {session_id}")
        
        # Verify the session exists in our global dictionary
        if session_id not in structuring_session:
            logger.error(f"Loaded structuring session {session_id} not found in global dictionary")
            logger.info(f"Available structuring sessions: {list(structuring_session.keys())}")
            # Fall back to creating a new session
            session_id = generate_session_id()
            structuring_session[session_id] = {
                "badge": {
                    "created-at": datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    "row": 0,
                    "glyph": session_id
                },
                "basic": {
                    "title": "",
                    "client": ""
                },
                "content": [],
                "solution": []
            }
            logger.info(f"🚫 Created fallback structuring session: {session_id}")
        else:
            logger.info(f"✅ Using loaded structuring session: {session_id}")
            logger.info(f"📊 Session data keys: {list(structuring_session[session_id].keys())}")
            logger.info(f"📄 Title: {structuring_session[session_id].get('basic', {}).get('title', 'N/A')}")
            logger.info(f"👤 Client: {structuring_session[session_id].get('basic', {}).get('client', 'N/A')}")
    else:
        # Generate a new session identifier for normal flow
        session_id = generate_session_id()
        
        logger.info(f"🆕 Creating new structuring session: {session_id}")
        
        # Initialize the structuring session in the global dictionary
        structuring_session[session_id] = {
            "badge": {
                "created-at": datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                "row": 0,
                "glyph": session_id
            },
            "basic": {
                "title": "",
                "client": ""
            },
            "content": [],
            "solution": []
        }
        
        logger.info(f"New structuring session created: {session_id}")
        logger.info(f"Initial structuring session structure: {json.dumps(structuring_session[session_id], indent=2)}")
    
    # Pass additional context for loaded sessions
    is_loaded_session = loaded_param == 'true'
    
    logger.info(f"🎯 Rendering structuring template with session_id='{session_id}', is_loaded_session={is_loaded_session}")
    
    return render_template('structuring.html', 
                         session_id=session_id,
                         is_loaded_session=is_loaded_session)

@app.route('/arsenal')
def arsenal_page():
    """Render the arsenal page."""
    return render_template('arsenal.html')

@app.route('/sow')
@login_required
def sow_page():
    """Render the SoW (Statement of Work) page."""
    # Check for loaded session parameters
    session_id_param = request.args.get('session_id')
    loaded_param = request.args.get('loaded')
    
    logger.info(f"🔍 SoW page called with session_id_param='{session_id_param}', loaded_param='{loaded_param}'")
    
    if session_id_param and loaded_param == 'true':
        # This is a loaded session, use the provided session ID
        session_id = session_id_param
        
        logger.info(f"📋 Loading existing SoW session: {session_id}")
        
        # Verify the session exists in our global dictionary
        if session_id not in sow_session:
            logger.error(f"Loaded SoW session {session_id} not found in global dictionary")
            logger.info(f"Available SoW sessions: {list(sow_session.keys())}")
            # Fall back to creating a new session
            session_id = generate_session_id()
            sow_session[session_id] = {
                "badge": {
                    "created-at": datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    "row": 0,
                    "glyph": session_id
                },
                "project": "",
                "client": "",
                "prepared_by": "Dry Ground Partners",
                "date": datetime.datetime.now().strftime('%Y-%m-%d'),
                "project_purpose_background": "",
                "objectives": [],
                "in_scope_deliverables": [],
                "out_of_scope": [],
                "functional_requirements": [],
                "non_functional_requirements": [],
                "project_phases_timeline": {
                    "timeline_weeks": "",
                    "phases": []
                }
            }
            logger.info(f"🚫 Created fallback session: {session_id}")
        else:
            logger.info(f"✅ Using loaded SoW session: {session_id}")
            logger.info(f"📊 Session data keys: {list(sow_session[session_id].keys())}")
            logger.info(f"📄 Project: {sow_session[session_id].get('project', 'N/A')}")
            logger.info(f"👤 Client: {sow_session[session_id].get('client', 'N/A')}")
    else:
        # Generate a new session identifier for normal flow
        session_id = generate_session_id()
        
        logger.info(f"🆕 Creating new SoW session: {session_id}")
        
        # Initialize the SoW session in the global dictionary
        sow_session[session_id] = {
            "badge": {
                "created-at": datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                "row": 0,
                "glyph": session_id
            },
            "project": "",
            "client": "",
            "prepared_by": "Dry Ground Partners",
            "date": datetime.datetime.now().strftime('%Y-%m-%d'),
            "project_purpose_background": "",
            "objectives": [],
            "in_scope_deliverables": [],
            "out_of_scope": [],
            "functional_requirements": [],
            "non_functional_requirements": [],
            "project_phases_timeline": {
                "timeline_weeks": "",
                "phases": []
            }
        }
        
        logger.info(f"New SoW session created: {session_id}")
        logger.info(f"Initial SoW session structure: {json.dumps(sow_session[session_id], indent=2)}")
    
    today = datetime.datetime.now().strftime('%Y-%m-%d')
    
    # Pass additional context for loaded sessions
    is_loaded_session = loaded_param == 'true'
    
    logger.info(f"🎯 Rendering SoW template with session_id='{session_id}', is_loaded_session={is_loaded_session}")
    
    return render_template('sow.html', 
                         today=today, 
                         session_id=session_id,
                         is_loaded_session=is_loaded_session)

@app.route('/sow/debug/<session_id>')
def sow_debug(session_id):
    """Debug route to view SoW session data."""
    if session_id in sow_session:
        return jsonify({
            'success': True,
            'session_id': session_id,
            'data': sow_session[session_id]
        })
    else:
        return jsonify({
            'success': False,
            'message': f'SoW session {session_id} not found',
            'available_sessions': list(sow_session.keys())
        }), 404

@app.route('/structuring/debug/<session_id>')
def structuring_debug(session_id):
    """Debug route to view structuring session data."""
    if session_id in structuring_session:
        return jsonify({
            'success': True,
            'session_id': session_id,
            'data': structuring_session[session_id]
        })
    else:
        return jsonify({
            'success': False,
import os
import json
import tempfile
import datetime
import psycopg2
import psycopg2.extras
import logging
import atexit
import re
import io
import base64
import random
import string
import time
import uuid

# Set library path for WeasyPrint
os.environ["LD_LIBRARY_PATH"] = os.getcwd()
from weasyprint import HTML

# Flask imports
from flask import Flask, render_template, request, send_file, jsonify, session, redirect, url_for
from flask_login import LoginManager, login_required, current_user

# Import auth blueprint
from auth import auth

# Import User model
from models import User

# Utility imports
from utils.pdf_generator import generate_pdf, generate_sow_pdf_document, generate_loe_pdf_document
from utils.image_analysis import upload_to_imgbb, analyze_image_with_openai
from utils.vision_api import analyze_image_with_vision_api, generate_stack_analysis_with_openai

# Environment and OpenAI
from dotenv import load_dotenv
from psycopg2 import sql
import openai
from openai import OpenAI

# LangFuse imports
from langfuse import Langfuse
from langfuse.openai import openai as langfuse_openai

# Load environment variables from .env file if it exists
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize LangFuse client
try:
    langfuse = Langfuse(
        secret_key=os.environ.get("LANGFUSE_SECRET_KEY"),
        public_key=os.environ.get("LANGFUSE_PUBLIC_KEY"),
        host=os.environ.get("LANGFUSE_HOST", "https://cloud.langfuse.com")
    )
    
    # Register cleanup handler for graceful shutdown
    atexit.register(lambda: langfuse.flush())
    
    logger.info("LangFuse initialized successfully")
    logger.info(f"LangFuse host: {os.environ.get('LANGFUSE_HOST', 'https://cloud.langfuse.com')}")
    
except Exception as e:
    logger.error(f"Failed to initialize LangFuse: {str(e)}")
    langfuse = None

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key")

# Configure Flask-WTF
app.config['WTF_CSRF_ENABLED'] = True
app.config['WTF_CSRF_TIME_LIMIT'] = None  # No time limit for CSRF tokens

# Configure Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth.login'
login_manager.login_message = 'Please log in to access this page.'
login_manager.login_message_category = 'info'
login_manager.session_protection = 'strong'

@login_manager.user_loader
def load_user(user_id):
    """Load user by ID for Flask-Login."""
    return User.find_by_id(int(user_id))

# Register auth blueprint
app.register_blueprint(auth)

# Global solution session dictionary to store user data
solution_session = {}

# Global SoW session dictionary to store SoW data
sow_session = {}

# Global structuring session dictionary to store structuring data
structuring_session = {}

# Global visuals session dictionary to store visuals data
visuals_session = {}

# Global LoE session dictionary to store LoE data
loe_session = {}

# Global sessions dictionary to store session data
global_sessions = {}

# Function to generate a random session identifier
def generate_session_id():
    """Generate a random session identifier with letters and timestamp"""
    timestamp = int(time.time())
    letters = ''.join(random.choices(string.ascii_uppercase + string.ascii_lowercase, k=8))
    return f"{letters}{timestamp}"

# Database connection function
def get_db_connection():
    """Get PostgreSQL database connection"""
    try:
        # Try to get database URL from environment, fallback to default Replit PostgreSQL
        database_url = os.environ.get("DATABASE_URL")
        if database_url:
            conn = psycopg2.connect(database_url)
        else:
            # Default Replit PostgreSQL connection
            conn = psycopg2.connect(
                host=os.environ.get("PGHOST", "localhost"),
                database=os.environ.get("PGDATABASE", "postgres"),
                user=os.environ.get("PGUSER", "postgres"),
                password=os.environ.get("PGPASSWORD", ""),
                port=os.environ.get("PGPORT", "5432")
            )
        return conn
    except Exception as e:
        logger.error(f"Database connection error: {str(e)}")
        return None

# Log API key status
logger.info(f"OPENAI_API_KEY configured: {'Yes' if os.environ.get('OPENAI_API_KEY') else 'No'}")
logger.info(f"IMGBB_API_KEY configured: {'Yes' if os.environ.get('IMGBB_API_KEY') else 'No'}")

@app.route('/solutioning')
@login_required
def index():
    """Render the main page with the report form."""
    # Check for loaded session parameters
    session_id_param = request.args.get('session_id')
    loaded_param = request.args.get('loaded')
    
    if session_id_param and loaded_param == 'true':
        # This is a loaded session, use the provided session ID
        session_id = session_id_param
        
        # Verify the session exists in our global dictionary
        if session_id not in solution_session:
            logger.error(f"Loaded session {session_id} not found in global dictionary")
            # Fall back to creating a new session
            session_id = generate_session_id()
            solution_session[session_id] = {
                "badge": {
                    "created-at": datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    "row": 0,
                    "glyph": session_id
                },
                "basic": {},
                "current_solution": 1,
                "solution_count": 1,
                "solution_1": {
                    "additional": {},
                    "variables": {},
                    "structure": {
                        "stack": ""
                    }
                }
            }
        else:
            logger.info(f"Using loaded session: {session_id}")
    else:
        # Generate a new session identifier for normal flow
        session_id = generate_session_id()
        
        # Initialize the session in the global dictionary with new multi-solution structure
        solution_session[session_id] = {
            "badge": {
                "created-at": datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                "row": 0,
                "glyph": session_id
            },
            "basic": {},
            "current_solution": 1,
            "solution_count": 1,
            "solution_1": {
                "additional": {},
                "variables": {},
                "structure": {
                    "stack": ""
                }
            }
        }
        
        logger.info(f"New session created: {session_id}")
        logger.info(f"Initial multi-solution session structure: {json.dumps(solution_session[session_id], indent=2)}")
    
    today = datetime.datetime.now().strftime('%Y-%m-%d')
    
    # Pass additional context for loaded sessions
    is_loaded_session = loaded_param == 'true'
    
    return render_template('index.html', 
                         today=today, 
                         session_id=session_id,
                         is_loaded_session=is_loaded_session)

@app.route('/main')
@login_required
def main_dashboard():
    """Render the main NEXA dashboard page."""
    try:
        return render_template('dashboard.html', 
                             user=current_user,
                             current_page='dashboard')
    except Exception as e:
        logger.error(f"Error rendering dashboard: {e}")
        return "Error loading dashboard", 500

@app.route('/auth/login', methods=['GET', 'POST'])
def auth_login():
    """Render the login page."""
    if request.method == 'POST':
        # For now, just show a message that backend auth isn't implemented yet
        return render_template('auth/login.html'), 200
    
    return render_template('auth/login.html')

@app.route('/auth/register', methods=['GET', 'POST']) 
def auth_register():
    """Render the registration page."""
    if request.method == 'POST':
        # For now, just show a message that backend auth isn't implemented yet
        return render_template('auth/register.html'), 200
    
    return render_template('auth/register.html')

@app.route('/auth/logout')
def auth_logout():
    """Handle logout (placeholder for now)."""
    # This will redirect to login when we implement full auth
    return redirect(url_for('auth_login'))

# Root route - redirect to login for now (will be updated when auth is complete)
@app.route('/')
def root():
    """Root route - redirect based on authentication status."""
    if current_user.is_authenticated:
        return redirect(url_for('main_dashboard'))
    else:
        return redirect(url_for('auth.login'))

@app.route('/enhance-explanation', methods=['POST'])
@login_required
def enhance_explanation():
    """Enhance explanation text using OpenAI."""
    # Start a LangFuse trace for this request
    if langfuse:
        try:
            with langfuse.start_as_current_span(
                name="enhance-explanation",
                metadata={
                    "route": "/enhance-explanation",
                    "method": "POST",
                    "user_agent": request.headers.get('User-Agent', ''),
                    "ip_address": request.remote_addr
                }
            ) as span:
                span.update_trace(user_id=request.headers.get('X-User-ID', 'anonymous'))
                
                try:
                    # Get the explanation text from the request
                    explanation = request.json.get('explanation', '')
                    
                    if not explanation.strip():
                        span.update(
                            output={"success": False, "message": "No explanation text provided"},
                            level="ERROR"
                        )
                        return jsonify({
                            'success': False,
                            'message': 'No explanation text provided'
                        }), 400
                        
                    # Import here to avoid circular imports
                    from utils.vision_api import enhance_text_with_openai
                    
                    # Send to OpenAI for enhancement
                    logger.info("Enhancing explanation with OpenAI")
                    enhanced_explanation = enhance_text_with_openai(explanation)
                    
                    span.update(
                        input={"explanation": explanation[:500] + "..." if len(explanation) > 500 else explanation},
                        output={"success": True, "enhanced_explanation": enhanced_explanation[:500] + "..." if len(enhanced_explanation) > 500 else enhanced_explanation},
                        metadata={"input_length": len(explanation), "output_length": len(enhanced_explanation)}
                    )
                    
                    return jsonify({
                        'success': True,
                        'enhanced_explanation': enhanced_explanation
                    })
                    
                except Exception as e:
                    logger.error(f"Error in enhance_explanation span: {str(e)}")
                    span.update(
                        output={"success": False, "error": str(e)},
                        level="ERROR"
                    )
                    raise e
                    
        except Exception as e:
            logger.error(f"Error enhancing explanation: {str(e)}")
            return jsonify({
                'success': False,
                'message': f"Error enhancing explanation: {str(e)}"
            }), 500
    else:
        # Fallback when LangFuse is not available
        try:
            # Get the explanation text from the request
            explanation = request.json.get('explanation', '')
            
            if not explanation.strip():
                return jsonify({
                    'success': False,
                    'message': 'No explanation text provided'
                }), 400
                
            # Import here to avoid circular imports
            from utils.vision_api import enhance_text_with_openai
            
            # Send to OpenAI for enhancement
            logger.info("Enhancing explanation with OpenAI")
            enhanced_explanation = enhance_text_with_openai(explanation)
            
            return jsonify({
                'success': True,
                'enhanced_explanation': enhanced_explanation
            })
            
        except Exception as e:
            logger.error(f"Error enhancing explanation: {str(e)}")
            return jsonify({
                'success': False,
                'message': f"Error enhancing explanation: {str(e)}"
            }), 500

@app.route('/enhance-structured-content', methods=['POST'])
@login_required
def enhance_structured_content():
    """Enhance structured content (title, steps, approach) using OpenAI with specific HTML formatting."""
    # Start a LangFuse trace for this request
    if langfuse:
        try:
            with langfuse.start_as_current_span(
                name="enhance-structured-content",
                metadata={
                    "route": "/enhance-structured-content",
                    "method": "POST",
                    "user_agent": request.headers.get('User-Agent', ''),
                    "ip_address": request.remote_addr
                }
            ) as span:
                span.update_trace(user_id=request.headers.get('X-User-ID', 'anonymous'))
                
                try:
                    # Get the content from the request
                    data = request.get_json()
                    title = data.get('title', '').strip()
                    steps = data.get('steps', '').strip()
                    approach = data.get('approach', '').strip()
                    
                    if not title and not steps and not approach:
                        span.update(
                            output={"success": False, "message": "No content provided for enhancement"},
                            level="ERROR"
                        )
                        return jsonify({
                            'success': False,
                            'message': 'No content provided for enhancement'
                        }), 400
                        
                    # Import here to avoid circular imports
                    from utils.vision_api import enhance_structured_content_with_openai
                    
                    # Send to OpenAI for enhancement
                    logger.info("Enhancing structured content with OpenAI")
                    enhanced_content = enhance_structured_content_with_openai(title, steps, approach)
                    
                    span.update(
                        input={"title": title, "steps": steps[:200] + "..." if len(steps) > 200 else steps, "approach": approach[:200] + "..." if len(approach) > 200 else approach},
                        output={"success": True, "enhanced_content": enhanced_content},
                        metadata={
                            "title_length": len(title),
                            "steps_length": len(steps),
                            "approach_length": len(approach)
                        }
                    )
                    
                    return jsonify({
                        'success': True,
                        'enhanced_title': enhanced_content.get('title', ''),
                        'enhanced_steps': enhanced_content.get('steps', ''),
                        'enhanced_approach': enhanced_content.get('approach', '')
                    })
                    
                except Exception as e:
                    logger.error(f"Error in enhance_structured_content span: {str(e)}")
                    span.update(
                        output={"success": False, "error": str(e)},
                        level="ERROR"
                    )
                    raise e
                    
        except Exception as e:
            logger.error(f"Error enhancing structured content: {str(e)}")
            return jsonify({
                'success': False,
                'message': f"Error enhancing structured content: {str(e)}"
            }), 500
    else:
        # Fallback when LangFuse is not available
        try:
            # Get the content from the request
            data = request.get_json()
            title = data.get('title', '').strip()
            steps = data.get('steps', '').strip()
            approach = data.get('approach', '').strip()
            
            if not title and not steps and not approach:
                return jsonify({
                    'success': False,
                    'message': 'No content provided for enhancement'
                }), 400
                
            # Import here to avoid circular imports
            from utils.vision_api import enhance_structured_content_with_openai
            
            # Send to OpenAI for enhancement
            logger.info("Enhancing structured content with OpenAI")
            enhanced_content = enhance_structured_content_with_openai(title, steps, approach)
            
            return jsonify({
                'success': True,
                'enhanced_title': enhanced_content.get('title', ''),
                'enhanced_steps': enhanced_content.get('steps', ''),
                'enhanced_approach': enhanced_content.get('approach', '')
            })
            
        except Exception as e:
            logger.error(f"Error enhancing structured content: {str(e)}")
            return jsonify({
                'success': False,
                'message': f"Error enhancing structured content: {str(e)}"
            }), 500

@app.route('/generate-stack-analysis', methods=['POST'])
@login_required
def generate_stack_analysis():
    # Start a LangFuse trace for this request
    if langfuse:
        try:
            with langfuse.start_as_current_span(
                name="generate-stack-analysis",
                metadata={
                    "route": "/generate-stack-analysis",
                    "method": "POST",
                    "user_agent": request.headers.get('User-Agent', ''),
                    "ip_address": request.remote_addr
                }
            ) as span:
                span.update_trace(user_id=request.headers.get('X-User-ID', 'anonymous'))
                
                try:
                    data = request.get_json()
                    session_id = data.get('sessionId')
                    ai_analysis = data.get('aiAnalysis', '')
                    solution_explanation = data.get('solutionExplanation', '')
                    image_link = data.get('imageLink', '')
                    
                    if not session_id:
                        span.update(
                            output={"success": False, "message": "Session ID is required"},
                            level="ERROR"
                        )
                        return jsonify({
                            'success': False,
                            'message': 'Session ID is required'
                        })
                    
                    if not solution_explanation.strip():
                        span.update(
                            output={"success": False, "message": "Solution explanation is required"},
                            level="ERROR"
                        )
                        return jsonify({
                            'success': False,
                            'message': 'Solution explanation is required'
                        })
                    
                    # Update span with session information
                    span.update_trace(session_id=session_id)
                    span.update(
                        input={
                            "session_id": session_id,
                            "ai_analysis": ai_analysis[:200] + "..." if len(ai_analysis) > 200 else ai_analysis,
                            "solution_explanation": solution_explanation[:200] + "..." if len(solution_explanation) > 200 else solution_explanation,
                            "has_image_link": bool(image_link)
                        },
                        metadata={
                            "ai_analysis_length": len(ai_analysis),
                            "solution_explanation_length": len(solution_explanation),
                            "has_image_link": bool(image_link)
                        }
                    )
                    
                    # Get current solution number
                    current_solution = solution_session[session_id].get('current_solution', 1)
                    solution_key = f'solution_{current_solution}'
                    
                    # Import the utility function
                    from utils.vision_api import generate_stack_analysis_with_openai
                    
                    # Generate stack analysis using the utility function
                    logger.info("Generating stack analysis with OpenAI")
                    stack_analysis = generate_stack_analysis_with_openai(ai_analysis, solution_explanation, image_link)
                    
                    # Save the stack analysis to the session
                    if 'structure' not in solution_session[session_id][solution_key]:
                        solution_session[session_id][solution_key]['structure'] = {
                            "stack": ""
                        }
                    
                    solution_session[session_id][solution_key]['structure']['stack'] = stack_analysis
                    
                    span.update(
                        output={"success": True, "stack_analysis": stack_analysis[:500] + "..." if len(stack_analysis) > 500 else stack_analysis},
                        metadata={"stack_analysis_length": len(stack_analysis)}
                    )
                    
                    return jsonify({
                        'success': True,
                        'stack_analysis': stack_analysis,
                        'message': 'Stack analysis generated successfully'
                    })
                    
                except Exception as e:
                    logger.error(f"Error in generate_stack_analysis span: {str(e)}")
                    span.update(
                        output={"success": False, "error": str(e)},
                        level="ERROR"
                    )
                    raise e
                    
        except Exception as e:
            logger.error(f"Error generating stack analysis: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Error generating stack analysis: {str(e)}'
            }), 500
    else:
        # Fallback when LangFuse is not available
        try:
            data = request.get_json()
            session_id = data.get('sessionId')
            ai_analysis = data.get('aiAnalysis', '')
            solution_explanation = data.get('solutionExplanation', '')
            image_link = data.get('imageLink', '')
            
            if not session_id:
                return jsonify({
                    'success': False,
                    'message': 'Session ID is required'
                })
            
            if not solution_explanation.strip():
                return jsonify({
                    'success': False,
                    'message': 'Solution explanation is required'
                })
            
            # Get current solution number
            current_solution = solution_session[session_id].get('current_solution', 1)
            solution_key = f'solution_{current_solution}'
            
            # Import the utility function
            from utils.vision_api import generate_stack_analysis_with_openai
            
            # Generate stack analysis using the utility function
            logger.info("Generating stack analysis with OpenAI")
            stack_analysis = generate_stack_analysis_with_openai(ai_analysis, solution_explanation, image_link)
            
            # Save the stack analysis to the session
            if 'structure' not in solution_session[session_id][solution_key]:
                solution_session[session_id][solution_key]['structure'] = {
                    "stack": ""
                }
            
            solution_session[session_id][solution_key]['structure']['stack'] = stack_analysis
            
            return jsonify({
                'success': True,
                'stack_analysis': stack_analysis,
                'message': 'Stack analysis generated successfully'
            })
            
        except Exception as e:
            logger.error(f"Error generating stack analysis: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Error generating stack analysis: {str(e)}'
            }), 500

@app.route('/structure-solution', methods=['POST'])
@login_required
def structure_solution():
    """Structure a solution based on AI analysis and user explanation."""
    # Start a LangFuse trace for this request
    if langfuse:
        try:
            with langfuse.start_as_current_span(
                name="structure-solution",
                metadata={
                    "route": "/structure-solution",
                    "method": "POST",
                    "user_agent": request.headers.get('User-Agent', ''),
                    "ip_address": request.remote_addr
                }
            ) as span:
                span.update_trace(user_id=request.headers.get('X-User-ID', 'anonymous'))
                
                try:
                    # Get data from request
                    data = request.get_json()
                    session_id = data.get('sessionId', '')
                    ai_analysis = data.get('aiAnalysis', '')
                    solution_explanation = data.get('solutionExplanation', '')
                    
                    # Validate inputs
                    if not solution_explanation.strip():
                        span.update(
                            output={"success": False, "message": "Solution explanation is required"},
                            level="ERROR"
                        )
                        return jsonify({
                            'success': False,
                            'message': 'Solution explanation is required'
                        }), 400
                        
                    if not session_id or session_id not in solution_session:
                        span.update(
                            output={"success": False, "message": "Invalid session ID"},
                            level="ERROR"
                        )
                        return jsonify({
                            'success': False,
                            'message': 'Invalid session ID'
                        }), 400
                    
                    # Update span with session information
                    span.update_trace(session_id=session_id)
                    span.update(
                        input={
                            "session_id": session_id,
                            "ai_analysis": ai_analysis[:200] + "..." if len(ai_analysis) > 200 else ai_analysis,
                            "solution_explanation": solution_explanation[:200] + "..." if len(solution_explanation) > 200 else solution_explanation
                        },
                        metadata={
                            "ai_analysis_length": len(ai_analysis),
                            "solution_explanation_length": len(solution_explanation)
                        }
                    )
                    
                    # Get current solution number
                    current_solution = solution_session[session_id].get('current_solution', 1)
                    solution_key = f'solution_{current_solution}'
                    
                    logger.info(f"Structuring solution for session {session_id}, solution {current_solution}")
                    
                    # Import OpenAI utilities
                    from utils.vision_api import structure_solution_with_openai, generate_stack_analysis_with_openai
                    
                    # Send to OpenAI for structuring
                    logger.info("Structuring solution with OpenAI")
                    response = structure_solution_with_openai(ai_analysis, solution_explanation)
                    
                    # Generate stack analysis automatically
                    logger.info("Generating stack analysis with OpenAI")
                    try:
                        # Get image link if available
                        image_link = ''
                        if 'additional' in solution_session[session_id][solution_key] and 'image_link' in solution_session[session_id][solution_key]['additional']:
                            image_link = solution_session[session_id][solution_key]['additional']['image_link']
                        
                        stack_analysis = generate_stack_analysis_with_openai(ai_analysis, solution_explanation, image_link)
                    except Exception as e:
                        logger.error(f"Error generating stack analysis: {str(e)}")
                        stack_analysis = ""  # Set empty if generation fails
                    
                    # Save variables to session
                    solution_session[session_id][solution_key]['variables'] = {
                        'ai_analysis': ai_analysis,
                        'solution_explanation': solution_explanation
                    }
                    
                    # Save structured solution to session
                    solution_session[session_id][solution_key]['structure'] = {
                        'title': response['title'],
                        'steps': response['steps'],
                        'approach': response['approach'],
                        'difficulty': response['difficulty'],
                        'layout': 1,  # Default layout
                        'stack': stack_analysis
                    }
                    
                    # Log the updated session
                    logger.info(f"Updated structured solution for session {session_id}, solution {current_solution}")
                    logger.info(f"solution_session['{session_id}']: {json.dumps(solution_session[session_id], indent=2)}")
                    
                    span.update(
                        output={
                            "success": True,
                            "title": response['title'],
                            "steps": response['steps'][:200] + "..." if len(response['steps']) > 200 else response['steps'],
                            "approach": response['approach'][:200] + "..." if len(response['approach']) > 200 else response['approach'],
                            "difficulty": response['difficulty']
                        },
                        metadata={
                            "title_length": len(response['title']),
                            "steps_length": len(response['steps']),
                            "approach_length": len(response['approach']),
                            "stack_analysis_length": len(stack_analysis)
                        }
                    )
                    
                    # Return structured data
                    return jsonify({
                        'success': True,
                        'title': response['title'],
                        'steps': response['steps'],
                        'approach': response['approach'],
                        'difficulty': response['difficulty']
                    })
                    
                except Exception as e:
                    logger.error(f"Error in structure_solution span: {str(e)}")
                    span.update(
                        output={"success": False, "error": str(e)},
                        level="ERROR"
                    )
                    raise e
                    
        except Exception as e:
            logger.error(f"Error structuring solution: {str(e)}")
            return jsonify({
                'success': False,
                'message': f"Error structuring solution: {str(e)}"
            }), 500
    else:
        # Fallback when LangFuse is not available
        try:
            # Get data from request
            data = request.get_json()
            session_id = data.get('sessionId', '')
            ai_analysis = data.get('aiAnalysis', '')
            solution_explanation = data.get('solutionExplanation', '')
            
            # Validate inputs
            if not solution_explanation.strip():
                return jsonify({
                    'success': False,
                    'message': 'Solution explanation is required'
                }), 400
                
            if not session_id or session_id not in solution_session:
                return jsonify({
                    'success': False,
                    'message': 'Invalid session ID'
                }), 400
            
            # Get current solution number
            current_solution = solution_session[session_id].get('current_solution', 1)
            solution_key = f'solution_{current_solution}'
            
            logger.info(f"Structuring solution for session {session_id}, solution {current_solution}")
            
            # Import OpenAI utilities
            from utils.vision_api import structure_solution_with_openai, generate_stack_analysis_with_openai
            
            # Send to OpenAI for structuring
            logger.info("Structuring solution with OpenAI")
            response = structure_solution_with_openai(ai_analysis, solution_explanation)
            
            # Generate stack analysis automatically
            logger.info("Generating stack analysis with OpenAI")
            try:
                # Get image link if available
                image_link = ''
                if 'additional' in solution_session[session_id][solution_key] and 'image_link' in solution_session[session_id][solution_key]['additional']:
                    image_link = solution_session[session_id][solution_key]['additional']['image_link']
                
                stack_analysis = generate_stack_analysis_with_openai(ai_analysis, solution_explanation, image_link)
            except Exception as e:
                logger.error(f"Error generating stack analysis: {str(e)}")
                stack_analysis = ""  # Set empty if generation fails
            
            # Save variables to session
            solution_session[session_id][solution_key]['variables'] = {
                'ai_analysis': ai_analysis,
                'solution_explanation': solution_explanation
            }
            
            # Save structured solution to session
            solution_session[session_id][solution_key]['structure'] = {
                'title': response['title'],
                'steps': response['steps'],
                'approach': response['approach'],
                'difficulty': response['difficulty'],
                'layout': 1,  # Default layout
                'stack': stack_analysis
            }
            
            # Log the updated session
            logger.info(f"Updated structured solution for session {session_id}, solution {current_solution}")
            logger.info(f"solution_session['{session_id}']: {json.dumps(solution_session[session_id], indent=2)}")
            
            # Return structured data
            return jsonify({
                'success': True,
                'title': response['title'],
                'steps': response['steps'],
                'approach': response['approach'],
                'difficulty': response['difficulty']
            })
            
        except Exception as e:
            logger.error(f"Error structuring solution: {str(e)}")
            return jsonify({
                'success': False,
                'message': f"Error structuring solution: {str(e)}"
            }), 500

@app.route('/analyze-image', methods=['POST'])
@login_required
def analyze_image():
    """Analyze an uploaded image using OpenAI Vision API."""
    # Start a LangFuse trace for this request
    trace = None
    if langfuse:
        try:
            with langfuse.start_as_current_span(
                name="analyze-image",
                metadata={
                    "route": "/analyze-image",
                    "method": "POST",
                    "user_agent": request.headers.get('User-Agent', ''),
                    "ip_address": request.remote_addr
                }
            ) as span:
                span.update_trace(user_id=request.headers.get('X-User-ID', 'anonymous'))
                
                try:
                    # Check if an image file was uploaded
                    if 'image' not in request.files:
                        span.update(
                            output={"success": False, "message": "No image file uploaded"},
                            level="ERROR"
                        )
                        return jsonify({
                            'success': False,
                            'message': 'No image file uploaded'
                        }), 400
                        
                    image_file = request.files['image']
                    session_id = request.form.get('sessionId', '')
                    
                    if image_file.filename == '':
                        span.update(
                            output={"success": False, "message": "No image file selected"},
                            level="ERROR"
                        )
                        return jsonify({
                            'success': False,
                            'message': 'No image file selected'
                        }), 400
                    
                    # Update span with session information
                    span.update_trace(session_id=session_id if session_id else None)
                    span.update(
                        input={
                            "session_id": session_id,
                            "filename": image_file.filename,
                            "content_type": image_file.content_type
                        },
                        metadata={
                            "file_size": len(image_file.read()),
                            "content_type": image_file.content_type
                        }
                    )
                    # Reset file pointer after reading for size
                    image_file.seek(0)
                    
                    logger.info(f"Analyzing image: {image_file.filename}")
                    
                    # Upload image to ImgBB
                    image_url = upload_to_imgbb(image_file)
                    
                    if not image_url:
                        span.update(
                            output={"success": False, "message": "Failed to upload image"},
                            level="ERROR"
                        )
                        return jsonify({
                            'success': False,
                            'message': 'Failed to upload image'
                        }), 500
                        
                    # Analyze the image using OpenAI Vision API
                    analysis = analyze_image_with_vision_api(image_url=image_url)
                    
                    if analysis.startswith("Error"):
                        span.update(
                            output={"success": False, "message": analysis},
                            level="ERROR"
                        )
                        return jsonify({
                            'success': False,
                            'message': analysis
                        }), 500
                    
                    span.update(
                        output={
                            "success": True,
                            "image_url": image_url,
                            "analysis": analysis[:500] + "..." if len(analysis) > 500 else analysis
                        },
                        metadata={
                            "image_url": image_url,
                            "analysis_length": len(analysis)
                        }
                    )
                    
                    return jsonify({
                        'success': True,
                        'image_url': image_url,
                        'analysis': analysis
                    })
                    
                except Exception as e:
                    logger.error(f"Error handling request /analyze-image: {str(e)}")
                    span.update(
                        output={"success": False, "error": str(e)},
                        level="ERROR"
                    )
                    return jsonify({
                        'success': False,
                        'message': f'Error analyzing image: {str(e)}'
                    }), 500
        except Exception as langfuse_error:
            logger.error(f"LangFuse error: {str(langfuse_error)}")
            # Continue without tracing if LangFuse fails
    
    # Fallback execution without tracing if LangFuse is not available or fails
    try:
        # Check if an image file was uploaded
        if 'image' not in request.files:
            return jsonify({
                'success': False,
                'message': 'No image file uploaded'
            }), 400
            
        image_file = request.files['image']
        session_id = request.form.get('sessionId', '')
        
        if image_file.filename == '':
            return jsonify({
                'success': False,
                'message': 'No image file selected'
            }), 400
        
        logger.info(f"Analyzing image: {image_file.filename}")
        
        # Upload image to ImgBB
        image_url = upload_to_imgbb(image_file)
        
        if not image_url:
            return jsonify({
                'success': False,
                'message': 'Failed to upload image'
            }), 500
            
        # Analyze the image using OpenAI Vision API
        analysis = analyze_image_with_vision_api(image_url=image_url)
        
        if analysis.startswith("Error"):
            return jsonify({
                'success': False,
                'message': analysis
            }), 500
        
        return jsonify({
            'success': True,
            'image_url': image_url,
            'analysis': analysis
        })
        
    except Exception as e:
        logger.error(f"Error handling request /analyze-image: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Error analyzing image: {str(e)}'
        }), 500

@app.route('/generate-pdf', methods=['POST'])
@login_required
def create_pdf():
    """Generate a PDF based on form data with support for multiple solutions."""
    try:
        # Get session ID
        session_id = request.form.get('sessionId', '')
        
        if not session_id or session_id not in solution_session:
            return jsonify({
                'success': False,
                'message': 'Invalid session ID'
            }), 400
        
        session_data = solution_session[session_id]
        logger.info(f"Generating multi-solution PDF for session: {session_id}")
        logger.info(f"Session data: {json.dumps(session_data, indent=2)}")
        
        # Extract basic information
        basic_info = session_data.get('basic', {})
        date = basic_info.get('date', datetime.datetime.now().strftime('%Y-%m-%d'))
        title = basic_info.get('title', 'Solution Overview Report')
        recipient = basic_info.get('prepared_for', 'Client')
        engineer = basic_info.get('engineer', 'Engineer')
        
        # Validate required fields
        if not title or not recipient or not engineer:
            return jsonify({
                'success': False, 
                'message': 'All basic information fields are required'
            }), 400
        
        # Collect all solutions from the session
        solutions_data = []
        for key, value in session_data.items():
            if key.startswith('solution_'):
                try:
                    solution_num = int(key.split('_')[1])
                    
                    # Extract solution data
                    structure = value.get('structure', {})
                    variables = value.get('variables', {})
                    additional = value.get('additional', {})
                    
                    # Extract image data
                    solution_image_data = None
                    image_link = additional.get('image_link', '')
                    if image_link and image_link.startswith('data:image'):
                        # Extract base64 data from data URL
                        solution_image_data = image_link.split(',')[1] if ',' in image_link else None
                    
                    # Get solution explanation (prefer variables over additional)
                    solution_explanation = variables.get('solution_explanation', additional.get('explanation', ''))
                    ai_analysis = variables.get('ai_analysis', '')
                    
                    # Combine explanation and AI analysis if both exist
                    if ai_analysis and solution_explanation:
                        combined_explanation = f"{solution_explanation}\n\nAI Analysis of Diagram:\n{ai_analysis}"
                    elif ai_analysis and not solution_explanation.strip():
                        combined_explanation = ai_analysis
                    else:
                        combined_explanation = solution_explanation
                    
                    solutions_data.append({
                        'number': solution_num,
                        'title': structure.get('title', f'Solution {solution_num}'),
                        'steps': structure.get('steps', ''),
                        'approach': structure.get('approach', ''),
                        'difficulty': structure.get('difficulty', 50),
                        'layout': structure.get('layout', 1),
                        'explanation': combined_explanation,
                        'image_data': solution_image_data,
                        'ai_analysis': ai_analysis
                    })
                    
                except (ValueError, IndexError) as e:
                    logger.warning(f"Skipping invalid solution key {key}: {e}")
                    continue
        
        # Sort solutions by number
        solutions_data.sort(key=lambda x: x['number'])
        
        if not solutions_data:
            return jsonify({
                'success': False,
                'message': 'No solutions found in session'
            }), 400
        
        logger.info(f"Found {len(solutions_data)} solutions for PDF generation")
        for sol in solutions_data:
            logger.info(f"Solution {sol['number']}: {sol['title']} (Layout {sol['layout']})")
        
        # Create a temporary file for the PDF
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            temp_filename = temp_file.name
        
        # Generate the multi-solution PDF
        generate_pdf(temp_filename, {
            'basic_info': {
                'date': date,
                'title': title,
                'recipient': recipient,
                'engineer': engineer
            },
            'solutions': solutions_data,
            'total_solutions': len(solutions_data),
            'is_multi_solution': len(solutions_data) > 1
        })
        
        # Determine filename
        if len(solutions_data) > 1:
            download_name = f"{title.replace(' ', '_')}_Multi_Solution_Report.pdf"
        else:
            download_name = f"{title.replace(' ', '_')}_Report.pdf"
        
        logger.info(f"PDF generated successfully: {download_name}")
        
        # Send the file
        return send_file(
            temp_filename,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=download_name
        )
    
    except Exception as e:
        logger.error(f"Error generating PDF: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error generating PDF: {str(e)}"
        }), 500

@app.route('/preview-pdf', methods=['GET'])
def preview_pdf():
    """Generate a PDF for browser preview (not download) based on session data."""
    try:
        # Get session ID from query parameters
        session_id = request.args.get('sessionId', '')
        
        if not session_id or session_id not in solution_session:
            return jsonify({
                'success': False,
                'message': 'Invalid session ID'
            }), 400
        
        session_data = solution_session[session_id]
        logger.info(f"Generating PDF preview for session: {session_id}")
        
        # Extract basic information
        basic_info = session_data.get('basic', {})
        date = basic_info.get('date', datetime.datetime.now().strftime('%Y-%m-%d'))
        title = basic_info.get('title', 'Solution Overview Report')
        recipient = basic_info.get('prepared_for', 'Client')
        engineer = basic_info.get('engineer', 'Engineer')
        
        # Validate required fields
        if not title or not recipient or not engineer:
            return jsonify({
                'success': False, 
                'message': 'All basic information fields are required'
            }), 400
        
        # Collect all solutions from the session
        solutions_data = []
        for key, value in session_data.items():
            if key.startswith('solution_'):
                try:
                    solution_num = int(key.split('_')[1])
                    
                    # Extract solution data
                    structure = value.get('structure', {})
                    variables = value.get('variables', {})
                    additional = value.get('additional', {})
                    
                    # Extract image data
                    solution_image_data = None
                    image_link = additional.get('image_link', '')
                    if image_link and image_link.startswith('data:image'):
                        # Extract base64 data from data URL
                        solution_image_data = image_link.split(',')[1] if ',' in image_link else None
                    
                    # Get solution explanation (prefer variables over additional)
                    solution_explanation = variables.get('solution_explanation', additional.get('explanation', ''))
                    ai_analysis = variables.get('ai_analysis', '')
                    
                    # Combine explanation and AI analysis if both exist
                    if ai_analysis and solution_explanation:
                        combined_explanation = f"{solution_explanation}\n\nAI Analysis of Diagram:\n{ai_analysis}"
                    elif ai_analysis and not solution_explanation.strip():
                        combined_explanation = ai_analysis
                    else:
                        combined_explanation = solution_explanation
                    
                    solutions_data.append({
                        'number': solution_num,
                        'title': structure.get('title', f'Solution {solution_num}'),
                        'steps': structure.get('steps', ''),
                        'approach': structure.get('approach', ''),
                        'difficulty': structure.get('difficulty', 50),
                        'layout': structure.get('layout', 1),
                        'explanation': combined_explanation,
                        'image_data': solution_image_data,
                        'ai_analysis': ai_analysis
                    })
                    
                except (ValueError, IndexError) as e:
                    logger.warning(f"Skipping invalid solution key {key}: {e}")
                    continue
        
        # Sort solutions by number
        solutions_data.sort(key=lambda x: x['number'])
        
        if not solutions_data:
            return jsonify({
                'success': False,
                'message': 'No solutions found in session'
            }), 400
        
        logger.info(f"Found {len(solutions_data)} solutions for PDF preview")
        
        # Create a temporary file for the PDF
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            temp_filename = temp_file.name
        
        # Generate the multi-solution PDF
        generate_pdf(temp_filename, {
            'basic_info': {
                'date': date,
                'title': title,
                'recipient': recipient,
                'engineer': engineer
            },
            'solutions': solutions_data,
            'total_solutions': len(solutions_data),
            'is_multi_solution': len(solutions_data) > 1
        })
        
        logger.info(f"PDF preview generated successfully")
        
        # Send the file for browser viewing (not download)
        return send_file(
            temp_filename,
            mimetype='application/pdf',
            as_attachment=False  # This makes it open in browser instead of download
        )
    
    except Exception as e:
        logger.error(f"Error generating PDF preview: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error generating PDF preview: {str(e)}"
        }), 500

@app.route('/save-basic-info', methods=['POST'])
@login_required
def save_basic_info():
    """Save basic information to the session."""
    try:
        # Get data from request
        data = request.get_json()
        session_id = data.get('sessionId', '')
        
        if not session_id or session_id not in solution_session:
            return jsonify({
                'success': False,
                'message': 'Invalid session ID'
            }), 400
            
        # Get form values
        date = data.get('date', '')
        title = data.get('title', '')
        recipient = data.get('recipient', '')
        engineer = data.get('engineer', '')
        
        # Save to solution_session
        solution_session[session_id]['basic'] = {
            'date': date,
            'title': title,
            'prepared_for': recipient,
            'engineer': engineer
        }
        
        # Log the updated session
        logger.info(f"Updated basic info for session {session_id}")
        logger.info(f"solution_session['{session_id}']: {json.dumps(solution_session[session_id], indent=2)}")
        
        return jsonify({
            'success': True,
            'message': 'Basic information saved successfully'
        })
        
    except Exception as e:
        logger.error(f"Error saving basic information: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error saving basic information: {str(e)}"
        }), 500

@app.route('/save-additional-info', methods=['POST'])
@login_required
def save_additional_info():
    """Save additional information to the session."""
    try:
        # Get data from request
        data = request.get_json()
        session_id = data.get('sessionId', '')
        image_link = data.get('imageLink', '')
        explanation = data.get('explanation', '')
        
        if not session_id or session_id not in solution_session:
            return jsonify({
                'success': False,
                'message': 'Invalid session ID'
            }), 400
        
        # Get current solution number
        current_solution = solution_session[session_id].get('current_solution', 1)
        solution_key = f'solution_{current_solution}'
        
        logger.info(f"Saving additional info for session {session_id}, solution {current_solution}")
            
        # Save to solution_session
        solution_session[session_id][solution_key]['additional'] = {
            'image_link': image_link,
            'explanation': explanation
        }
        
        # Log the updated session
        logger.info(f"Updated additional info for session {session_id}, solution {current_solution}")
        logger.info(f"solution_session['{session_id}']: {json.dumps(solution_session[session_id], indent=2)}")
        
        return jsonify({
            'success': True,
            'message': 'Additional information saved successfully'
        })
        
    except Exception as e:
        logger.error(f"Error saving additional information: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error saving additional information: {str(e)}"
        }), 500

@app.route('/save-layout', methods=['POST'])
@login_required
def save_layout():
    """Save layout selection to the session."""
    try:
        # Get data from request
        data = request.get_json()
        session_id = data.get('sessionId', '')
        layout = data.get('layout', 1)
        
        if not session_id or session_id not in solution_session:
            return jsonify({
                'success': False,
                'message': 'Invalid session ID'
            }), 400
        
        # Get current solution number
        current_solution = solution_session[session_id].get('current_solution', 1)
        solution_key = f'solution_{current_solution}'
        
        logger.info(f"Saving layout for session {session_id}, solution {current_solution}: {layout}")
            
        # Save layout to session
        if 'structure' not in solution_session[session_id][solution_key]:
            solution_session[session_id][solution_key]['structure'] = {
                "stack": ""
            }
        
        solution_session[session_id][solution_key]['structure']['layout'] = layout
        
        # Log the updated session
        logger.info(f"Updated layout for session {session_id}, solution {current_solution}: {layout}")
        logger.info(f"solution_session['{session_id}']: {json.dumps(solution_session[session_id], indent=2)}")
        
        return jsonify({
            'success': True,
            'message': 'Layout saved successfully'
        })
        
    except Exception as e:
        logger.error(f"Error saving layout: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error saving layout: {str(e)}"
        }), 500

@app.route('/update-solution-data', methods=['POST'])
def update_solution_data():
    """Update solution variables and structure in the session."""
    try:
        # Get data from request
        data = request.get_json()
        session_id = data.get('sessionId', '')
        
        # Get form values
        structured_title = data.get('title', '')
        structured_steps = data.get('steps', '')
        structured_approach = data.get('approach', '')
        difficulty = data.get('difficulty', 50)
        layout = data.get('layout', 1)
        ai_analysis = data.get('aiAnalysis', '')
        solution_explanation = data.get('solutionExplanation', '')
        
        if not session_id or session_id not in solution_session:
            return jsonify({
                'success': False,
                'message': 'Invalid session ID'
            }), 400
        
        # Get current solution number
        current_solution = solution_session[session_id].get('current_solution', 1)
        solution_key = f'solution_{current_solution}'
        
        logger.info(f"Updating solution data for session {session_id}, solution {current_solution}")
            
        # Update variables in session
        solution_session[session_id][solution_key]['variables'] = {
            'ai_analysis': ai_analysis,
            'solution_explanation': solution_explanation
        }
        
        # Get existing structure to preserve stack content
        existing_structure = solution_session[session_id][solution_key].get('structure', {})
        existing_stack = existing_structure.get('stack', '')
        
        # Update structure in session - preserve existing stack
        solution_session[session_id][solution_key]['structure'] = {
            'title': structured_title,
            'steps': structured_steps,
            'approach': structured_approach,
            'difficulty': difficulty,
            'layout': layout,
            'stack': existing_stack  # Preserve existing stack instead of setting to ""
        }
        
        # Log the updated session
        logger.info(f"Updated solution data for session {session_id}, solution {current_solution}")
        logger.info(f"solution_session['{session_id}']: {json.dumps(solution_session[session_id], indent=2)}")
        
        return jsonify({
            'success': True,
            'message': 'Solution data updated successfully'
        })
        
    except Exception as e:
        logger.error(f"Error updating solution data: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error updating solution data: {str(e)}"
        }), 500

@app.route('/next-solution', methods=['POST'])
def next_solution():
    """Create a new solution and increment the solution counter."""
    try:
        # Get data from request
        data = request.get_json()
        session_id = data.get('sessionId', '')
        
        if not session_id or session_id not in solution_session:
            return jsonify({
                'success': False,
                'message': 'Invalid session ID'
            }), 400
        
        # Get current session data
        session_data = solution_session[session_id]
        current_solution = session_data.get('current_solution', 1)
        solution_count = session_data.get('solution_count', 1)
        
        logger.info(f"Starting next solution process for session {session_id}")
        logger.info(f"Current solution: {current_solution}, Current count: {solution_count}")
        
        # Increment counters
        new_solution_number = solution_count + 1
        solution_session[session_id]['current_solution'] = new_solution_number
        solution_session[session_id]['solution_count'] = new_solution_number
        
        # Create new solution object
        new_solution_key = f'solution_{new_solution_number}'
        solution_session[session_id][new_solution_key] = {
            "additional": {},
            "variables": {},
            "structure": {
                "stack": ""
            }
        }
        
        logger.info(f"Created new solution: {new_solution_key}")
        logger.info(f"Updated session counters - current_solution: {new_solution_number}, solution_count: {new_solution_number}")
        logger.info(f"Full session structure: {json.dumps(solution_session[session_id], indent=2)}")
        
        return jsonify({
            'success': True,
            'message': f'Started solution {new_solution_number}',
            'current_solution': new_solution_number,
            'solution_count': new_solution_number
        })
        
    except Exception as e:
        logger.error(f"Error creating next solution: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error creating next solution: {str(e)}"
        }), 500

@app.route('/get-session-info', methods=['POST'])
def get_session_info():
    """Get session information including current solution and total solutions"""
    try:
        data = request.get_json()
        session_id = data.get('sessionId')
        
        logger.info(f"Getting session info for session: {session_id}")
        
        if not session_id or session_id not in solution_session:
            logger.warning(f"Invalid session ID: {session_id}")
            return jsonify({
                'success': False,
                'message': 'Invalid session ID'
            }), 400
        
        session_data = solution_session[session_id]
        current_solution = session_data.get('current_solution', 1)
        
        # Count total solutions by counting solution_X keys (excluding solution_count)
        total_solutions = len([key for key in session_data.keys() if key.startswith('solution_') and key != 'solution_count'])
        
        logger.info(f"Session info - Current: {current_solution}, Total: {total_solutions}")
        
        return jsonify({
            'success': True,
            'current_solution': current_solution,
            'total_solutions': total_solutions,
            'session_id': session_id
        })
        
    except Exception as e:
        logger.error(f"Error getting session info: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error getting session info: {str(e)}"
        }), 500

@app.route('/switch-solution', methods=['POST'])
def switch_solution():
    """Switch to a specific solution and return its data"""
    try:
        data = request.get_json()
        session_id = data.get('sessionId')
        target_solution = data.get('targetSolution')
        
        logger.info(f"Switching to solution {target_solution} for session: {session_id}")
        
        if not session_id or session_id not in solution_session:
            logger.warning(f"Invalid session ID: {session_id}")
            return jsonify({
                'success': False,
                'message': 'Invalid session ID'
            }), 400
        
        if target_solution == 'basic':
            # Switch to basic info (Step 1)
            solution_session[session_id]['current_solution'] = 'basic'
            basic_data = solution_session[session_id].get('basic', {})
            
            return jsonify({
                'success': True,
                'target': 'basic',
                'data': basic_data
            })
        else:
            # Switch to specific solution number
            try:
                solution_num = int(target_solution)
                solution_key = f'solution_{solution_num}'
                
                # Check if solution exists
                if solution_key not in solution_session[session_id]:
                    return jsonify({
                        'success': False,
                        'message': f'Solution {solution_num} does not exist'
                    }), 400
                
                # Update current solution
                solution_session[session_id]['current_solution'] = solution_num
                
                # Get solution data
                solution_data = solution_session[session_id][solution_key]
                
                logger.info(f"Switched to solution {solution_num} for session {session_id}")
                
                return jsonify({
                    'success': True,
                    'target': 'solution',
                    'solution_number': solution_num,
                    'data': solution_data
                })
                
            except ValueError:
                return jsonify({
                    'success': False,
                    'message': 'Invalid solution number'
                }), 400
        
    except Exception as e:
        logger.error(f"Error switching solution: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error switching solution: {str(e)}"
        }), 500

@app.route('/get-solution-data', methods=['POST'])
def get_solution_data():
    """Get specific solution data without switching current_solution"""
    try:
        data = request.get_json()
        session_id = data.get('sessionId')
        solution_number = data.get('solutionNumber')
        
        logger.info(f"Getting data for solution {solution_number} in session: {session_id}")
        
        if not session_id or session_id not in solution_session:
            return jsonify({
                'success': False,
                'message': 'Invalid session ID'
            }), 400
        
        if solution_number == 'basic':
            basic_data = solution_session[session_id].get('basic', {})
            return jsonify({
                'success': True,
                'data': basic_data
            })
        else:
            try:
                solution_num = int(solution_number)
                solution_key = f'solution_{solution_num}'
                
                if solution_key not in solution_session[session_id]:
                    return jsonify({
                        'success': False,
                        'message': f'Solution {solution_num} does not exist'
                    }), 400
                
                solution_data = solution_session[session_id][solution_key]
                return jsonify({
                    'success': True,
                    'data': solution_data
                })
                
            except ValueError:
                return jsonify({
                    'success': False,
                    'message': 'Invalid solution number'
                }), 400
        
    except Exception as e:
        logger.error(f"Error getting solution data: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error getting solution data: {str(e)}"
        }), 500

@app.route('/delete-solution', methods=['POST'])
def delete_solution():
    """Delete a specific solution"""
    try:
        data = request.get_json()
        session_id = data.get('sessionId')
        solution_number = data.get('solutionNumber')
        
        logger.info(f"Deleting solution {solution_number} for session: {session_id}")
        
        if not session_id or session_id not in solution_session:
            return jsonify({
                'success': False,
                'message': 'Invalid session ID'
            }), 400
        
        if not solution_number:
            return jsonify({
                'success': False,
                'message': 'Solution number is required'
            }), 400
        
        try:
            solution_num = int(solution_number)
        except ValueError:
            return jsonify({
                'success': False,
                'message': 'Invalid solution number'
            }), 400
        
        solution_key = f'solution_{solution_num}'
        
        # Check if solution exists
        if solution_key not in solution_session[session_id]:
            return jsonify({
                'success': False,
                'message': f'Solution {solution_num} does not exist'
            }), 400
        
        # Count total solutions
        total_solutions = sum(1 for key in solution_session[session_id].keys() if key.startswith('solution_'))
        
        # Prevent deletion if it's the last solution
        if total_solutions <= 1:
            return jsonify({
                'success': False,
                'message': 'Cannot delete the last remaining solution'
            }), 400
        
        # Delete the solution
        del solution_session[session_id][solution_key]
        
        # Renumber solutions to maintain sequential numbering
        solutions_to_renumber = []
        for key in list(solution_session[session_id].keys()):
            if key.startswith('solution_'):
                try:
                    # Extract the part after 'solution_' and validate it's numeric
                    key_suffix = key.split('_')[1]
                    sol_num = int(key_suffix)
                    if sol_num > solution_num:
                        solutions_to_renumber.append((key, sol_num))
                except (IndexError, ValueError):
                    # Skip keys that don't have a valid numeric suffix
                    continue
        
        # Sort by solution number and renumber
        solutions_to_renumber.sort(key=lambda x: x[1])
        for old_key, old_num in solutions_to_renumber:
            new_num = old_num - 1
            new_key = f'solution_{new_num}'
            solution_session[session_id][new_key] = solution_session[session_id][old_key]
            del solution_session[session_id][old_key]
        
        # Update current_solution if needed
        current_solution = solution_session[session_id].get('current_solution', 1)
        if isinstance(current_solution, int):
            if current_solution == solution_num:
                # If we deleted the current solution, switch to solution 1
                solution_session[session_id]['current_solution'] = 1
            elif current_solution > solution_num:
                # If current solution number is higher, decrement it
                solution_session[session_id]['current_solution'] = current_solution - 1
        
        # Update solution_count to reflect the deletion
        current_count = solution_session[session_id].get('solution_count', total_solutions)
        new_count = current_count - 1
        solution_session[session_id]['solution_count'] = new_count
        
        logger.info(f"Successfully deleted solution {solution_num} for session {session_id}")
        logger.info(f"Updated solution count from {current_count} to {new_count}")
        
        return jsonify({
            'success': True,
            'message': f'Solution {solution_num} deleted successfully',
            'new_total': new_count,
            'solution_count': new_count
        })
        
    except Exception as e:
        logger.error(f"Error deleting solution: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error deleting solution: {str(e)}"
        }), 500

@app.route('/save-session', methods=['POST'])
@login_required
def save_session():
    """Save session data to the database"""
    try:
        data = request.get_json()
        session_id = data.get('sessionId')
        
        if not session_id or session_id not in solution_session:
            return jsonify({
                'success': False,
                'message': 'Invalid session ID'
            }), 400
        
        session_data = solution_session[session_id]
        logger.info(f"💾 Saving session {session_id} to database")
        logger.info(f"📊 Complete Session Object Structure:")
        logger.info(f"Session Data: {json.dumps(session_data, indent=2)}")
        
        # Get database connection
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        try:
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            # Get the current row value from badge
            badge = session_data.get('badge', {})
            current_row = badge.get('row', 0)
            
            # Check if row exists in database
            cursor.execute("SELECT id FROM ai_architecture_sessions WHERE id = %s", (current_row,))
            existing_row = cursor.fetchone()
            
            if existing_row and current_row > 0:
                # Row exists - update session_objects
                logger.info(f"🔄 Updating existing row {current_row} with session data")
                cursor.execute(
                    "UPDATE ai_architecture_sessions SET session_objects = %s WHERE id = %s",
                    (json.dumps(session_data), current_row)
                )
                row_id = current_row
                
            else:
                # Row doesn't exist - create new row
                logger.info("🆕 Creating new row for session data")
                
                # Extract title and client from session data
                basic_info = session_data.get('basic', {})
                title = basic_info.get('title', '')
                client = basic_info.get('prepared_for', '')
                
                logger.info(f"📝 Extracted metadata - Title: '{title}', Client: '{client}'")
                
                # Insert new row and get the generated ID
                cursor.execute(
                    """INSERT INTO ai_architecture_sessions (session_objects, title, client) 
                       VALUES (%s, %s, %s) RETURNING id""",
                    (json.dumps(session_data), title, client)
                )
                
                new_row = cursor.fetchone()
                row_id = new_row['id']
                
                # Update the badge row value in the session with the new row ID
                solution_session[session_id]['badge']['row'] = row_id
                
                # Update the database with the corrected session data (with updated badge)
                cursor.execute(
                    "UPDATE ai_architecture_sessions SET session_objects = %s WHERE id = %s",
                    (json.dumps(solution_session[session_id]), row_id)
                )
                
                logger.info(f"✅ Created new row {row_id} and updated badge row value")
            
            # Commit the transaction
            conn.commit()
            
            logger.info(f"🎉 Successfully saved session {session_id} to database row {row_id}")
            
            return jsonify({
                'success': True,
                'message': f'Session saved successfully to row {row_id}',
                'row_id': row_id
            })
            
        except Exception as db_error:
            conn.rollback()
            logger.error(f"💥 Database operation error: {str(db_error)}")
            return jsonify({
                'success': False,
                'message': f'Database error: {str(db_error)}'
            }), 500
            
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        logger.error(f"💥 Error saving session: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error saving session: {str(e)}"
        }), 500

@app.route('/sessions')
@login_required
def sessions_page():
    """Render the sessions management page."""
    return render_template('sessions.html')

@app.route('/structuring')
@login_required
def structuring_page():
    """Render the structuring page."""
    # Check for loaded session parameters
    session_id_param = request.args.get('session_id')
    loaded_param = request.args.get('loaded')
    
    logger.info(f"🔍 Structuring page called with session_id_param='{session_id_param}', loaded_param='{loaded_param}'")
    
    if session_id_param and loaded_param == 'true':
        # This is a loaded session, use the provided session ID
        session_id = session_id_param
        
        logger.info(f"📋 Loading existing structuring session: {session_id}")
        
        # Verify the session exists in our global dictionary
        if session_id not in structuring_session:
            logger.error(f"Loaded structuring session {session_id} not found in global dictionary")
            logger.info(f"Available structuring sessions: {list(structuring_session.keys())}")
            # Fall back to creating a new session
            session_id = generate_session_id()
            structuring_session[session_id] = {
                "badge": {
                    "created-at": datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    "row": 0,
                    "glyph": session_id
                },
                "basic": {
                    "title": "",
                    "client": ""
                },
                "content": [],
                "solution": []
            }
            logger.info(f"🚫 Created fallback structuring session: {session_id}")
        else:
            logger.info(f"✅ Using loaded structuring session: {session_id}")
            logger.info(f"📊 Session data keys: {list(structuring_session[session_id].keys())}")
            logger.info(f"📄 Title: {structuring_session[session_id].get('basic', {}).get('title', 'N/A')}")
            logger.info(f"👤 Client: {structuring_session[session_id].get('basic', {}).get('client', 'N/A')}")
    else:
        # Generate a new session identifier for normal flow
        session_id = generate_session_id()
        
        logger.info(f"🆕 Creating new structuring session: {session_id}")
        
        # Initialize the structuring session in the global dictionary
        structuring_session[session_id] = {
            "badge": {
                "created-at": datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                "row": 0,
                "glyph": session_id
            },
            "basic": {
                "title": "",
                "client": ""
            },
            "content": [],
            "solution": []
        }
        
        logger.info(f"New structuring session created: {session_id}")
        logger.info(f"Initial structuring session structure: {json.dumps(structuring_session[session_id], indent=2)}")
    
    # Pass additional context for loaded sessions
    is_loaded_session = loaded_param == 'true'
    
    logger.info(f"🎯 Rendering structuring template with session_id='{session_id}', is_loaded_session={is_loaded_session}")
    
    return render_template('structuring.html', 
                         session_id=session_id,
                         is_loaded_session=is_loaded_session)

@app.route('/arsenal')
def arsenal_page():
    """Render the arsenal page."""
    return render_template('arsenal.html')

@app.route('/sow')
@login_required
def sow_page():
    """Render the SoW (Statement of Work) page."""
    # Check for loaded session parameters
    session_id_param = request.args.get('session_id')
    loaded_param = request.args.get('loaded')
    
    logger.info(f"🔍 SoW page called with session_id_param='{session_id_param}', loaded_param='{loaded_param}'")
    
    if session_id_param and loaded_param == 'true':
        # This is a loaded session, use the provided session ID
        session_id = session_id_param
        
        logger.info(f"📋 Loading existing SoW session: {session_id}")
        
        # Verify the session exists in our global dictionary
        if session_id not in sow_session:
            logger.error(f"Loaded SoW session {session_id} not found in global dictionary")
            logger.info(f"Available SoW sessions: {list(sow_session.keys())}")
            # Fall back to creating a new session
            session_id = generate_session_id()
            sow_session[session_id] = {
                "badge": {
                    "created-at": datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    "row": 0,
                    "glyph": session_id
                },
                "project": "",
                "client": "",
                "prepared_by": "Dry Ground Partners",
                "date": datetime.datetime.now().strftime('%Y-%m-%d'),
                "project_purpose_background": "",
                "objectives": [],
                "in_scope_deliverables": [],
                "out_of_scope": [],
                "functional_requirements": [],
                "non_functional_requirements": [],
                "project_phases_timeline": {
                    "timeline_weeks": "",
                    "phases": []
                }
            }
            logger.info(f"🚫 Created fallback session: {session_id}")
        else:
            logger.info(f"✅ Using loaded SoW session: {session_id}")
            logger.info(f"📊 Session data keys: {list(sow_session[session_id].keys())}")
            logger.info(f"📄 Project: {sow_session[session_id].get('project', 'N/A')}")
            logger.info(f"👤 Client: {sow_session[session_id].get('client', 'N/A')}")
    else:
        # Generate a new session identifier for normal flow
        session_id = generate_session_id()
        
        logger.info(f"🆕 Creating new SoW session: {session_id}")
        
        # Initialize the SoW session in the global dictionary
        sow_session[session_id] = {
            "badge": {
                "created-at": datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                "row": 0,
                "glyph": session_id
            },
            "project": "",
            "client": "",
            "prepared_by": "Dry Ground Partners",
            "date": datetime.datetime.now().strftime('%Y-%m-%d'),
            "project_purpose_background": "",
            "objectives": [],
            "in_scope_deliverables": [],
            "out_of_scope": [],
            "functional_requirements": [],
            "non_functional_requirements": [],
            "project_phases_timeline": {
                "timeline_weeks": "",
                "phases": []
            }
        }
        
        logger.info(f"New SoW session created: {session_id}")
        logger.info(f"Initial SoW session structure: {json.dumps(sow_session[session_id], indent=2)}")
    
    today = datetime.datetime.now().strftime('%Y-%m-%d')
    
    # Pass additional context for loaded sessions
    is_loaded_session = loaded_param == 'true'
    
    logger.info(f"🎯 Rendering SoW template with session_id='{session_id}', is_loaded_session={is_loaded_session}")
    
    return render_template('sow.html', 
                         today=today, 
                         session_id=session_id,
                         is_loaded_session=is_loaded_session)

@app.route('/sow/debug/<session_id>')
def sow_debug(session_id):
    """Debug route to view SoW session data."""
    if session_id in sow_session:
        return jsonify({
            'success': True,
            'session_id': session_id,
            'data': sow_session[session_id]
        })
    else:
        return jsonify({
            'success': False,
            'message': f'SoW session {session_id} not found',
            'available_sessions': list(sow_session.keys())
        }), 404

@app.route('/structuring/debug/<session_id>')
def structuring_debug(session_id):
    """Debug route to view structuring session data."""
    if session_id in structuring_session:
        return jsonify({
            'success': True,
            'session_id': session_id,
            'data': structuring_session[session_id]
        })
    else:
        return jsonify({
            'success': False,
            'message': f'Structuring session {session_id} not found',
            'available_sessions': list(structuring_session.keys())
        }), 404

@app.route('/update-structuring-session', methods=['POST'])
def update_structuring_session():
    """Update structuring session data."""
    try:
        data = request.get_json()
        session_id = data.get('sessionId', '')
        session_data = data.get('data', {})
        
        if not session_id:
            return jsonify({
                'success': False,
                'message': 'Session ID is required'
            }), 400
        
        logger.info(f"📝 Updating structuring session: {session_id}")
        logger.info(f"📝 Session data: {session_data}")
        
        # Initialize session if it doesn't exist
        if session_id not in structuring_session:
            logger.info(f"🆕 Creating new structuring session: {session_id}")
            structuring_session[session_id] = {
                "badge": {
                    "created-at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "row": 0,
                    "glyph": generate_session_id()
                },
                "basic": {
                    "title": "",
                    "client": ""
                },
                "content": [],
                "solution": []
            }
        
        # Update the session data
        current_session = structuring_session[session_id]
        
        # Update basic info if provided
        if 'basic' in session_data:
            current_session['basic'].update(session_data['basic'])
            logger.info(f"📝 Updated basic info: {current_session['basic']}")
        
        # Update other sections if provided
        if 'content' in session_data:
            current_session['content'] = session_data['content']
            logger.info(f"📝 Updated content: {len(session_data['content'])} items")
        
        if 'solution' in session_data:
            current_session['solution'] = session_data['solution']
            logger.info(f"📝 Updated solution: {len(session_data['solution'])} items")
        
        logger.info(f"✅ Structuring session {session_id} updated successfully")
        
        return jsonify({
            'success': True,
            'message': 'Structuring session updated successfully',
            'session_id': session_id,
            'data': current_session
        })
        
    except Exception as e:
        logger.error(f"❌ Error updating structuring session: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Error updating structuring session: {str(e)}'
        }), 500

@app.route('/update-sow-session', methods=['POST'])
def update_sow_session():
    """Update SoW session data for a specific step."""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        session_id = data.get('sessionId')
        step = data.get('step')
        step_data = data.get('data', {})
        
        if not session_id:
            return jsonify({
                'success': False,
                'message': 'Session ID is required'
            }), 400
        
        if step is None:
            return jsonify({
                'success': False,
                'message': 'Step number is required'
            }), 400
        
        # Check if session exists
        if session_id not in sow_session:
            return jsonify({
                'success': False,
                'message': f'SoW session {session_id} not found'
            }), 404
        
        # Update session data based on step
        if step == 1:
            # Update Step 1 fields
            sow_session[session_id]['project'] = step_data.get('project', '')
            sow_session[session_id]['client'] = step_data.get('client', '')
            sow_session[session_id]['prepared_by'] = step_data.get('prepared_by', '')
            sow_session[session_id]['date'] = step_data.get('date', '')
            sow_session[session_id]['project_purpose_background'] = step_data.get('project_purpose_background', '')
            sow_session[session_id]['objectives'] = step_data.get('objectives', [])
            
        elif step == 2:
            # Update Step 2 fields
            sow_session[session_id]['in_scope_deliverables'] = step_data.get('in_scope_deliverables', [])
            sow_session[session_id]['out_of_scope'] = step_data.get('out_of_scope', '')
            sow_session[session_id]['functional_requirements'] = step_data.get('functional_requirements', [])
        
        elif step == 3:
            # Update Step 3 fields
            sow_session[session_id]['non_functional_requirements'] = step_data.get('non_functional_requirements', [])
            sow_session[session_id]['project_phases_timeline'] = step_data.get('project_phases_timeline', {
                "timeline_weeks": "",
                "phases": []
            })
        
        else:
            return jsonify({
                'success': False,
                'message': f'Invalid step number: {step}'
            }), 400
        
        logger.info(f"✅ Updated SoW session {session_id} for step {step}")
        logger.info(f"Updated session data: {json.dumps(sow_session[session_id], indent=2)}")
        
        return jsonify({
            'success': True,
            'message': f'Step {step} data updated successfully',
            'session_id': session_id
        })
        
    except Exception as e:
        logger.error(f"💥 Error updating SoW session: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Error updating SoW session: {str(e)}'
        }), 500

@app.route('/api/sessions', methods=['GET'])
@login_required
def get_sessions():
    """Get all sessions from the database."""
    try:
        # Get database connection
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        try:
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            # Fetch all sessions
            cursor.execute("""
                SELECT id, title, client, created_at, 
                       diagram_texts_json, visual_assets_json, 
                       session_objects, sow_objects, loe_objects
                FROM ai_architecture_sessions 
                ORDER BY created_at DESC
            """)
            
            sessions = cursor.fetchall()
            
            # Convert to list of dictionaries and check if fields are empty
            sessions_list = []
            for session in sessions:
                session_dict = dict(session)
                
                # Check if each field is empty (null or empty JSON)
                def is_empty(field_value):
                    if field_value is None:
                        return True
                    if isinstance(field_value, (dict, list)) and len(field_value) == 0:
                        return True
                    if isinstance(field_value, str) and field_value.strip() == '':
                        return True
                    return False
                
                session_dict['status'] = {
                    'diagram_texts': not is_empty(session_dict.get('diagram_texts_json')),
                    'visual_assets': not is_empty(session_dict.get('visual_assets_json')),
                    'solution_document': not is_empty(session_dict.get('session_objects')),
                    'sow': not is_empty(session_dict.get('sow_objects')),
                    'loe': not is_empty(session_dict.get('loe_objects'))
                }
                
                # Format created_at for display
                if session_dict['created_at']:
                    session_dict['created_at_formatted'] = session_dict['created_at'].strftime('%Y-%m-%d %H:%M')
                else:
                    session_dict['created_at_formatted'] = 'Unknown'
                
                sessions_list.append(session_dict)
            
            logger.info(f"📋 Retrieved {len(sessions_list)} sessions from database")
            
            return jsonify({
                'success': True,
                'sessions': sessions_list
            })
            
        except Exception as db_error:
            logger.error(f"💥 Database query error: {str(db_error)}")
            return jsonify({
                'success': False,
                'message': f'Database error: {str(db_error)}'
            }), 500
            
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        logger.error(f"💥 Error fetching sessions: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error fetching sessions: {str(e)}"
        }), 500

@app.route('/load-session/<int:session_id>')
def load_session(session_id):
    """Load a session from database and redirect to main page with pre-filled data."""
    try:
        logger.info(f"🔄 Loading session {session_id} from database")
        
        # Get database connection
        conn = get_db_connection()
        if not conn:
            logger.error("Database connection failed")
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        try:
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            # Fetch session data from database
            cursor.execute(
                "SELECT session_objects FROM ai_architecture_sessions WHERE id = %s",
                (session_id,)
            )
            
            result = cursor.fetchone()
            
            if not result or not result['session_objects']:
                logger.warning(f"Session {session_id} not found or has no session objects")
                return jsonify({
                    'success': False,
                    'message': f'Session {session_id} not found or has no data'
                }), 404
            
            # Get the session object from database
            loaded_session_data = result['session_objects']
            
            # Generate a new session ID for in-memory storage
            new_session_id = generate_session_id()
            
            # Copy the loaded session data to the global session dictionary
            solution_session[new_session_id] = loaded_session_data.copy()
            
            logger.info(f"✅ Successfully loaded session {session_id} as new session {new_session_id}")
            logger.info(f"📊 Loaded session structure: {json.dumps(loaded_session_data, indent=2)}")
            
            # Redirect to main page with the new session ID and a flag indicating it's loaded
            return redirect(f'/solutioning?session_id={new_session_id}&loaded=true')
            
        except Exception as db_error:
            logger.error(f"💥 Database error loading session: {str(db_error)}")
            return jsonify({
                'success': False,
                'message': f'Database error: {str(db_error)}'
            }), 500
            
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        logger.error(f"💥 Error loading session: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error loading session: {str(e)}"
        }), 500

@app.route('/generate-sow-pdf', methods=['POST'])
def generate_sow_pdf():
    """Generate a professional Statement of Work PDF."""
    try:
        # Get session ID from form data
        session_id = request.form.get('sessionId', '')
        
        if not session_id or session_id not in sow_session:
            return jsonify({
                'success': False,
                'message': 'Invalid session ID'
            }), 400
        
        session_data = sow_session[session_id]
        logger.info(f"Generating SoW PDF for session: {session_id}")
        logger.info(f"SoW session data: {json.dumps(session_data, indent=2)}")
        
        # Validate required fields
        if not session_data.get('project') or not session_data.get('client'):
            return jsonify({
                'success': False, 
                'message': 'Project name and client are required'
            }), 400
        
        # Create a temporary file for the PDF
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            temp_filename = temp_file.name
        
        # Generate the SoW PDF using the existing PDF generator with SoW template
        generate_sow_pdf_document(temp_filename, session_data)
        
        # Determine filename
        project_name = session_data.get('project', 'Statement_of_Work').replace(' ', '_')
        download_name = f"SoW_{project_name}.pdf"
        
        logger.info(f"SoW PDF generated successfully: {download_name}")
        
        # Send the file
        return send_file(
            temp_filename,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=download_name
        )
    
    except Exception as e:
        logger.error(f"Error generating SoW PDF: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error generating SoW PDF: {str(e)}"
        }), 500

@app.route('/preview-sow-pdf', methods=['GET'])
def preview_sow_pdf():
    """Generate a SoW PDF for browser preview (not download)."""
    try:
        # Get session ID from query parameters
        session_id = request.args.get('sessionId', '')
        
        if not session_id or session_id not in sow_session:
            return jsonify({
                'success': False,
                'message': 'Invalid session ID'
            }), 400
        
        session_data = sow_session[session_id]
        logger.info(f"Generating SoW PDF preview for session: {session_id}")
        
        # Validate required fields
        if not session_data.get('project') or not session_data.get('client'):
            return jsonify({
                'success': False, 
                'message': 'Project name and client are required'
            }), 400
        
        # Create a temporary file for the PDF
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            temp_filename = temp_file.name
        
        # Generate the SoW PDF
        generate_sow_pdf_document(temp_filename, session_data)
        
        logger.info(f"SoW PDF preview generated successfully")
        
        # Send the file for browser viewing (not download)
        return send_file(
            temp_filename,
            mimetype='application/pdf',
            as_attachment=False  # This makes it open in browser instead of download
        )
    
    except Exception as e:
        logger.error(f"Error generating SoW PDF preview: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error generating SoW PDF preview: {str(e)}"
        }), 500

@app.route('/delete-sow-session', methods=['POST'])
def delete_sow_session():
    """Delete a SoW session from memory and database."""
    try:
        data = request.get_json()
        session_id = data.get('sessionId', '')
        
        if not session_id:
            return jsonify({
                'success': False,
                'message': 'Session ID is required'
            }), 400
        
        # Check if session exists
        if session_id not in sow_session:
            return jsonify({
                'success': False,
                'message': 'Session not found'
            }), 404
        
        # Get the session data to check for database row ID
        session_data = sow_session[session_id]
        badge = session_data.get('badge', {})
        row_id = badge.get('row', 0)
        
        # Delete from database if row ID exists
        if row_id and row_id > 0:
            logger.info(f"🗑️ Deleting SoW session {session_id} from database row {row_id}")
            
            conn = get_db_connection()
            if conn:
                try:
                    cursor = conn.cursor()
                    
                    # Delete the row from database
                    cursor.execute("DELETE FROM ai_architecture_sessions WHERE id = %s", (row_id,))
                    deleted_rows = cursor.rowcount
                    
                    conn.commit()
                    
                    if deleted_rows > 0:
                        logger.info(f"✅ Successfully deleted database row {row_id} for SoW session {session_id}")
                    else:
                        logger.warning(f"⚠️ No database row found with ID {row_id} for SoW session {session_id}")
                    
                except Exception as db_error:
                    conn.rollback()
                    logger.error(f"💥 Database error deleting SoW session: {str(db_error)}")
                    return jsonify({
                        'success': False,
                        'message': f'Database error: {str(db_error)}'
                    }), 500
                    
                finally:
                    cursor.close()
                    conn.close()
            else:
                logger.warning("Database connection failed during SoW session deletion")
        else:
            logger.info(f"🗑️ No database row ID found for SoW session {session_id}, skipping database deletion")
        
        # Delete the session from memory
        del sow_session[session_id]
        
        logger.info(f"✅ SoW session deleted successfully: {session_id}")
        
        return jsonify({
            'success': True,
            'message': 'SoW session deleted successfully'
        })
    
    except Exception as e:
        logger.error(f"💥 Error deleting SoW session: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error deleting SoW session: {str(e)}"
        }), 500

@app.route('/save-sow-session', methods=['POST'])
def save_sow_session():
    """Save SoW session data to the database"""
    try:
        data = request.get_json()
        session_id = data.get('sessionId')
        
        if not session_id or session_id not in sow_session:
            return jsonify({
                'success': False,
                'message': 'Invalid session ID'
            }), 400
        
        session_data = sow_session[session_id]
        logger.info(f"💾 Saving SoW session {session_id} to database")
        logger.info(f"📊 Complete SoW Session Object Structure:")
        logger.info(f"SoW Session Data: {json.dumps(session_data, indent=2)}")
        
        # Get database connection
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        try:
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            # Get the current row value from badge
            badge = session_data.get('badge', {})
            current_row = badge.get('row', 0)
            
            # Check if row exists in database
            cursor.execute("SELECT id FROM ai_architecture_sessions WHERE id = %s", (current_row,))
            existing_row = cursor.fetchone()
            
            if existing_row and current_row > 0:
                # Row exists - update sow_objects
                logger.info(f"🔄 Updating existing row {current_row} with SoW session data")
                cursor.execute(
                    "UPDATE ai_architecture_sessions SET sow_objects = %s WHERE id = %s",
                    (json.dumps(session_data), current_row)
                )
                row_id = current_row
                
            else:
                # Row doesn't exist - create new row
                logger.info("🆕 Creating new row for SoW session data")
                
                # Extract title and client from session data
                project = session_data.get('project', '')
                client = session_data.get('client', '')
                
                logger.info(f"📝 Extracted SoW metadata - Project: '{project}', Client: '{client}'")
                
                # Insert new row and get the generated ID
                cursor.execute(
                    """INSERT INTO ai_architecture_sessions (sow_objects, title, client) 
                       VALUES (%s, %s, %s) RETURNING id""",
                    (json.dumps(session_data), project, client)
                )
                
                new_row = cursor.fetchone()
                row_id = new_row['id']
                
                # Update the badge row value in the session with the new row ID
                sow_session[session_id]['badge']['row'] = row_id
                
                # Update the database with the corrected session data (with updated badge)
                cursor.execute(
                    "UPDATE ai_architecture_sessions SET sow_objects = %s WHERE id = %s",
                    (json.dumps(sow_session[session_id]), row_id)
                )
                
                logger.info(f"✅ Created new row {row_id} and updated SoW badge row value")
            
            # Commit the transaction
            conn.commit()
            
            logger.info(f"🎉 Successfully saved SoW session {session_id} to database row {row_id}")
            
            return jsonify({
                'success': True,
                'message': f'SoW session saved successfully to row {row_id}',
                'row_id': row_id
            })
            
        except Exception as db_error:
            conn.rollback()
            logger.error(f"💥 Database operation error: {str(db_error)}")
            return jsonify({
                'success': False,
                'message': f'Database error: {str(db_error)}'
            }), 500
            
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        logger.error(f"💥 Error saving SoW session: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error saving SoW session: {str(e)}"
        }), 500

@app.route('/load-sow-session/<int:session_id>')
def load_sow_session(session_id):
    """Load a SoW session from database and redirect to SoW page with pre-filled data."""
    try:
        logger.info(f"🔄 Loading SoW session {session_id} from database")
        
        # Get database connection
        conn = get_db_connection()
        if not conn:
            logger.error("Database connection failed")
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        try:
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            # Fetch SoW session data from database
            cursor.execute(
                "SELECT sow_objects FROM ai_architecture_sessions WHERE id = %s",
                (session_id,)
            )
            
            result = cursor.fetchone()
            
            if not result or not result['sow_objects']:
                logger.warning(f"SoW session {session_id} not found or has no sow objects")
                return jsonify({
                    'success': False,
                    'message': f'SoW session {session_id} not found or has no data'
                }), 404
            
            # Get the SoW session object from database
            loaded_sow_session_data = result['sow_objects']
            
            # Generate a new session ID for in-memory storage
            new_session_id = generate_session_id()
            
            # Copy the loaded SoW session data to the global sow_session dictionary
            sow_session[new_session_id] = loaded_sow_session_data.copy()
            
            logger.info(f"✅ Successfully loaded SoW session {session_id} as new session {new_session_id}")
            logger.info(f"📊 Loaded SoW session structure: {json.dumps(loaded_sow_session_data, indent=2)}")
            
            # Redirect to SoW page with the new session ID and a flag indicating it's loaded
            return redirect(f'/sow?session_id={new_session_id}&loaded=true')
            
        except Exception as db_error:
            logger.error(f"💥 Database error loading SoW session: {str(db_error)}")
            return jsonify({
                'success': False,
                'message': f'Database error: {str(db_error)}'
            }), 500
            
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        logger.error(f"💥 Error loading SoW session: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error loading SoW session: {str(e)}"
        }), 500

@app.route('/test-sow-debug/<session_id>')
def test_sow_debug(session_id):
    """Simple test route for debugging SoW session loading."""
    # Check if session exists in memory
    if session_id in sow_session:
        return f"""
        <html>
        <body>
        <h1>SoW Session Debug</h1>
        <p><strong>Session ID:</strong> {session_id}</p>
        <p><strong>Session exists in memory:</strong> YES</p>
        <p><strong>Project:</strong> {sow_session[session_id].get('project', 'N/A')}</p>
        <p><strong>Client:</strong> {sow_session[session_id].get('client', 'N/A')}</p>
        <p><strong>Objectives:</strong> {sow_session[session_id].get('objectives', [])}</p>
        <pre>{json.dumps(sow_session[session_id], indent=2)}</pre>
        <script>
        console.log('Session data from server:', {json.dumps(sow_session[session_id])});
        </script>
        </body>
        </html>
        """
    else:
        return f"""
        <html>
        <body>
        <h1>SoW Session Debug</h1>
        <p><strong>Session ID:</strong> {session_id}</p>
        <p><strong>Session exists in memory:</strong> NO</p>
        <p><strong>Available sessions:</strong> {list(sow_session.keys())}</p>
        </body>
        </html>
        """

@app.route('/diagnose-pain-points', methods=['POST'])
def diagnose_pain_points():
    """Analyze content and identify pain points that could be solved with AI, Automation, or Software."""
    try:
        data = request.get_json()
        content = data.get('content', '')
        session_id = data.get('sessionId', '')
        
        if not content.strip():
            return jsonify({
                'success': False,
                'message': 'Content is required for pain point analysis'
            }), 400
        
        logger.info(f"🔍 Analyzing pain points for session: {session_id}")
        logger.info(f"🔍 Content length: {len(content)} characters")
        
        # Prepare the prompt for OpenAI
        prompt = f"""
You are an expert business analyst specializing in identifying pain points that can be solved through AI, Automation, and Software solutions.

Analyze the following content and identify specific pain points that could be addressed with technology solutions. Focus on:

1. **Manual Processes**: Tasks that are repetitive, time-consuming, or prone to human error
2. **Data Management Issues**: Problems with data collection, processing, analysis, or reporting
3. **Communication Gaps**: Issues with information flow, collaboration, or customer interaction
4. **Efficiency Bottlenecks**: Processes that slow down operations or waste resources
5. **Scalability Challenges**: Areas where growth is limited by current manual processes
6. **Customer Experience Issues**: Problems that affect customer satisfaction or engagement

For each pain point identified, provide a clear description of the problem, being highly specific and NEVER using generic terms, instead use specific terms that could help searchability. Should be specific about the technology solution areas it lacks, like where it lacks AI/Automation/Software.

EACH PAIN POINT SHOULD BE AT LEAST A PARAGRAPH LONG, AND SHOULD BE VERY SPECIFIC AND DETAILED.

IMPORTANT: You must respond with ONLY valid JSON in exactly this format (no markdown, no explanations, no additional text):

{{
    "pain_points": [
        "Detailed paragraph describing the first specific problem and need...",
        "Detailed paragraph describing the second specific problem and need...",
        "Detailed paragraph describing the third specific problem and need..."
    ]
}}

Content to analyze:
{content}

Identify real, specific problems that exist in the content. Each pain point should be a detailed paragraph that clearly explains what is broken, inefficient, or missing. Focus on actionable problems that can be solved with technology. Return ONLY the JSON response.
"""

        # Call OpenAI API using LangFuse-wrapped client
        try:
            # Truncate content if it's too long to prevent context length issues
            max_content_length = 16384  # Conservative limit to leave room for prompt and response
            if len(content) > max_content_length:
                content = content[:max_content_length] + "... [Content truncated due to length]"
                logger.info(f"⚠️ Content truncated to {max_content_length} characters")
            
            # Initialize LangFuse-wrapped OpenAI client
            client = langfuse_openai.OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
            
            response = client.chat.completions.create(
                model="gpt-4o",  # Use gpt-4o which has a larger context window
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert business analyst specializing in identifying pain points that can be solved through AI, Automation, and Software solutions. You provide detailed, actionable insights about client needs and challenges."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=16384,  # Reduced to be more reasonable
                temperature=0.4
            )
            
            ai_response = response.choices[0].message.content.strip()
            logger.info(f"🤖 OpenAI response: {ai_response}")
            
            # Parse the JSON response with robust extraction
            import json
            import re
            
            def extract_json_from_response(text):
                """Extract JSON from OpenAI response that might contain markdown or other text."""
                # First, try to parse the entire response as JSON
                try:
                    return json.loads(text)
                except json.JSONDecodeError:
                    pass
                
                # If that fails, try to find JSON within the text
                # Look for JSON blocks wrapped in ```json or ``` or just find JSON-like structures
                json_patterns = [
                    r'```json\s*(\{.*?\})\s*```',  # JSON in markdown code blocks
                    r'```\s*(\{.*?\})\s*```',      # JSON in generic code blocks
                    r'(\{[^{}]*"pain_points"[^{}]*\[.*?\][^{}]*\})',  # Look for JSON with pain_points array
                    r'(\{.*?\})'  # Any JSON-like structure
                ]
                
                for pattern in json_patterns:
                    matches = re.findall(pattern, text, re.DOTALL | re.IGNORECASE)
                    for match in matches:
                        try:
                            parsed = json.loads(match)
                            if isinstance(parsed, dict) and 'pain_points' in parsed:
                                return parsed
                        except json.JSONDecodeError:
                            continue
                
                # If no JSON found, create a fallback structure
                logger.warning("⚠️ Could not extract valid JSON from response, creating fallback")
                return {
                    "pain_points": [
                        f"Analysis completed but response format was not parseable. Raw AI response: {text[:1000]}..."
                    ]
                }
            
            try:
                parsed_response = extract_json_from_response(ai_response)
                
                # Validate the response structure
                if 'pain_points' not in parsed_response:
                    raise ValueError("Response missing 'pain_points' field")
                
                # Ensure pain_points is a list
                if not isinstance(parsed_response['pain_points'], list):
                    raise ValueError("'pain_points' field must be a list")
                
                # Convert all pain points to strings
                pain_points_text = []
                for pain_point in parsed_response['pain_points']:
                    if isinstance(pain_point, str):
                        pain_points_text.append(pain_point)
                    else:
                        # If it's not a string, convert it
                        pain_points_text.append(str(pain_point))
                
                logger.info(f"✅ Successfully identified {len(pain_points_text)} pain points")
                
                return jsonify({
                    'success': True,
                    'painPoints': pain_points_text,  # Frontend expects 'painPoints' (camelCase)
                    'message': 'Pain points analyzed successfully'
                })
                
            except (json.JSONDecodeError, ValueError) as e:
                logger.error(f"❌ Failed to parse or validate JSON response: {str(e)}")
                logger.error(f"❌ Raw response: {ai_response}")
                
                # Fallback: return the raw response as a single pain point
                return jsonify({
                    'success': True,
                    'painPoints': [ai_response],  # Return raw response as single item
                    'message': 'Pain points analyzed (manual formatting applied)'
                })
                
        except Exception as openai_error:
            logger.error(f"❌ OpenAI API error: {str(openai_error)}")
            return jsonify({
                'success': False,
                'message': f'AI analysis failed: {str(openai_error)}'
            }), 500
        
    except Exception as e:
        logger.error(f"❌ Error in diagnose_pain_points: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Error diagnosing pain points: {str(e)}'
        }), 500

@app.route('/generate-ai-solution', methods=['POST'])
def generate_ai_solution():
    """Generate AI/Automation/Software solutions based on solution text."""
    try:
        data = request.get_json()
        solution_text = data.get('solutionText', '')
        session_id = data.get('sessionId', '')
        
        if not solution_text.strip():
            return jsonify({
                'success': False,
                'message': 'Solution text is required for generation'
            }), 400
        
        logger.info(f"🤖 Generating AI solution for session: {session_id}")
        logger.info(f"🤖 Solution text length: {len(solution_text)} characters")
        
        # Truncate content if it's too long to prevent context length issues
        max_content_length = 8000  # Conservative limit to leave room for prompt and response
        if len(solution_text) > max_content_length:
            solution_text = solution_text[:max_content_length] + "... [Content truncated due to length]"
            logger.info(f"⚠️ Solution text truncated to {max_content_length} characters")
        
        # Prepare the prompt for OpenAI
        prompt = f"""
You are an expert solution architect specializing in AI, Automation, and Software solutions. Your goal is to provide the quickest, easiest, and most seamless solution for the client.

Analyze the following problem/need and provide a comprehensive AI/Automation/Software solution that focuses on:

OUR CURRENT STACK IS: 
- Cursor for code generation
- Replit for code execution and hosting
- OpenAI for AI (assistants, threads, models)
- ElevenLabs for voice generation
- n8n for automation
- Lang (langchain, langgraph, langfuse) for AI/Automation
- ScraperAPI for web scraping
- Others: Vapi, Zapier, Windsurf, Tixae Agents, Synthflow, Make, Lovable, Lix It, GoHighLevel, 2Captcha
(We can build custom software with these tools)

1. **Quickest Implementation**: Prioritize solutions that can be deployed rapidly (days/weeks, not months)
2. **Easiest Setup**: Favor third-party services, SaaS platforms, or white-label solutions over custom development
3. **Maximum Automation**: The solution should minimize human intervention and maximize AI/automation
4. **Seamless Integration**: Should integrate smoothly with existing workflows and systems
5. **Cost-Effective**: Prefer solutions that provide immediate ROI and low ongoing costs
6. **Custom Software**: If the solution requires a software, like a CRM, ERP, or other, suggest building a custom software solution tailored to the client's needs by our team
7. NEVER SUGGEST EXISTING CRMs OR ERP SYSTEMS, ONLY SUGGEST CUSTOM SOFTWARE SOLUTIONS IF THERE IS A SOFTWARE NEED
8. WE ARE NOT GOING TO BUILD IF THERE IS THE OPTION TO USE AN EXISTING TOOL OR SERVICE

For your solution, include:
- **Primary Solution**: The main technology/service/platform to use
- **Implementation Approach**: Step-by-step how to deploy this quickly
- **Automation Features**: What will be automated and how
- **Integration Points**: How it connects to existing systems
- **Expected Timeline**: Realistic timeframe for deployment (consider we use tools like Replit and Cursor for code generation)
- **Key Benefits**: Immediate value the client will see

Focus on real, actionable solutions using existing technologies, APIs, and services rather than custom development.

Problem/Need to solve:
{solution_text}

Provide a detailed, practical solution that can be implemented immediately:
"""

        # Call OpenAI API using LangFuse-wrapped client
        try:
            # Initialize LangFuse-wrapped OpenAI client
            client = langfuse_openai.OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
            
            response = client.chat.completions.create(
                model="gpt-4o",  # Use gpt-4o which has a larger context window
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert solution architect who specializes in rapid deployment of AI, Automation, and Software solutions. You always recommend the fastest, most cost-effective approach using existing tools and services."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=4000,  # Generous limit for detailed solutions
                temperature=0.3  # Lower temperature for more focused, practical solutions
            )
            
            ai_response = response.choices[0].message.content.strip()
            logger.info(f"🤖 OpenAI solution response length: {len(ai_response)} characters")
            
            if not ai_response:
                return jsonify({
                    'success': False,
                    'message': 'No solution generated by AI'
                })
            
            logger.info(f"✅ AI solution generated successfully")
            
            return jsonify({
                'success': True,
                'generatedSolution': ai_response,
                'message': 'AI solution generated successfully'
            })
                
        except Exception as openai_error:
            logger.error(f"❌ OpenAI API error: {str(openai_error)}")
            return jsonify({
                'success': False,
                'message': f'AI solution generation failed: {str(openai_error)}'
            }), 500
        
    except Exception as e:
        logger.error(f"❌ Error in generate_ai_solution: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Error generating AI solution: {str(e)}'
        }), 500

@app.route('/save-structuring-session', methods=['POST'])
def save_structuring_session():
    """Save structuring session data to the database"""
    try:
        data = request.get_json()
        session_id = data.get('sessionId')
        
        if not session_id or session_id not in structuring_session:
            return jsonify({
                'success': False,
                'message': 'Invalid session ID'
            }), 400
        
        session_data = structuring_session[session_id]
        logger.info(f"💾 Saving structuring session {session_id} to database")
        logger.info(f"📊 Complete Structuring Session Object Structure:")
        logger.info(f"Structuring Session Data: {json.dumps(session_data, indent=2)}")
        
        # Get database connection
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        try:
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            # Get the current row value from badge
            badge = session_data.get('badge', {})
            current_row = badge.get('row', 0)
            
            # Check if row exists in database
            cursor.execute("SELECT id FROM ai_architecture_sessions WHERE id = %s", (current_row,))
            existing_row = cursor.fetchone()
            
            if existing_row and current_row > 0:
                # Row exists - update diagram_texts_json
                logger.info(f"🔄 Updating existing row {current_row} with structuring session data")
                cursor.execute(
                    "UPDATE ai_architecture_sessions SET diagram_texts_json = %s WHERE id = %s",
                    (json.dumps(session_data), current_row)
                )
                row_id = current_row
                
            else:
                # Row doesn't exist - create new row
                logger.info("🆕 Creating new row for structuring session data")
                
                # Extract title and client from session data
                basic_info = session_data.get('basic', {})
                title = basic_info.get('title', '')
                client = basic_info.get('client', '')
                
                logger.info(f"📝 Extracted structuring metadata - Title: '{title}', Client: '{client}'")
                
                # Insert new row and get the generated ID
                cursor.execute(
                    """INSERT INTO ai_architecture_sessions (diagram_texts_json, title, client) 
                       VALUES (%s, %s, %s) RETURNING id""",
                    (json.dumps(session_data), title, client)
                )
                
                new_row = cursor.fetchone()
                row_id = new_row['id']
                
                # Update the badge row value in the session with the new row ID
                structuring_session[session_id]['badge']['row'] = row_id
                
                # Update the database with the corrected session data (with updated badge)
                cursor.execute(
                    "UPDATE ai_architecture_sessions SET diagram_texts_json = %s WHERE id = %s",
                    (json.dumps(structuring_session[session_id]), row_id)
                )
                
                logger.info(f"✅ Created new row {row_id} and updated structuring badge row value")
            
            # Commit the transaction
            conn.commit()
            
            logger.info(f"🎉 Successfully saved structuring session {session_id} to database row {row_id}")
            
            return jsonify({
                'success': True,
                'message': f'Structuring session saved successfully to row {row_id}',
                'row_id': row_id
            })
            
        except Exception as db_error:
            conn.rollback()
            logger.error(f"💥 Database operation error: {str(db_error)}")
            return jsonify({
                'success': False,
                'message': f'Database error: {str(db_error)}'
            }), 500
            
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        logger.error(f"💥 Error saving structuring session: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error saving structuring session: {str(e)}"
        }), 500

@app.route('/delete-structuring-session', methods=['POST'])
def delete_structuring_session():
    """Delete a structuring session from memory and database."""
    try:
        data = request.get_json()
        session_id = data.get('sessionId', '')
        
        if not session_id:
            return jsonify({
                'success': False,
                'message': 'Session ID is required'
            }), 400
        
        # Check if session exists
        if session_id not in structuring_session:
            return jsonify({
                'success': False,
                'message': 'Session not found'
            }), 404
        
        # Get the session data to check for database row ID
        session_data = structuring_session[session_id]
        badge = session_data.get('badge', {})
        row_id = badge.get('row', 0)
        
        # Delete from database if row ID exists
        if row_id and row_id > 0:
            logger.info(f"🗑️ Deleting structuring session {session_id} from database row {row_id}")
            
            conn = get_db_connection()
            if conn:
                try:
                    cursor = conn.cursor()
                    
                    # Delete the row from database
                    cursor.execute("DELETE FROM ai_architecture_sessions WHERE id = %s", (row_id,))
                    deleted_rows = cursor.rowcount
                    
                    conn.commit()
                    
                    if deleted_rows > 0:
                        logger.info(f"✅ Successfully deleted database row {row_id} for structuring session {session_id}")
                    else:
                        logger.warning(f"⚠️ No database row found with ID {row_id} for structuring session {session_id}")
                    
                except Exception as db_error:
                    conn.rollback()
                    logger.error(f"💥 Database error deleting structuring session: {str(db_error)}")
                    return jsonify({
                        'success': False,
                        'message': f'Database error: {str(db_error)}'
                    }), 500
                    
                finally:
                    cursor.close()
                    conn.close()
            else:
                logger.warning("Database connection failed during structuring session deletion")
        else:
            logger.info(f"🗑️ No database row ID found for structuring session {session_id}, skipping database deletion")
        
        # Delete the session from memory
        del structuring_session[session_id]
        
        logger.info(f"✅ Structuring session deleted successfully: {session_id}")
        
        return jsonify({
            'success': True,
            'message': 'Structuring session deleted successfully'
        })
        
    except Exception as e:
        logger.error(f"💥 Error deleting structuring session: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error deleting structuring session: {str(e)}"
        }), 500

@app.route('/load-structuring-session/<int:session_id>')
def load_structuring_session(session_id):
    """Load a structuring session from database and redirect to structuring page with pre-filled data."""
    try:
        logger.info(f"🔄 Loading structuring session {session_id} from database")
        
        # Get database connection
        conn = get_db_connection()
        if not conn:
            logger.error("Database connection failed")
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        try:
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            # Fetch structuring session data from database
            cursor.execute(
                "SELECT diagram_texts_json FROM ai_architecture_sessions WHERE id = %s",
                (session_id,)
            )
            
            result = cursor.fetchone()
            
            if not result or not result['diagram_texts_json']:
                logger.warning(f"Structuring session {session_id} not found or has no diagram texts")
                return jsonify({
                    'success': False,
                    'message': f'Structuring session {session_id} not found or has no data'
                }), 404
            
            # Get the structuring session object from database
            loaded_structuring_session_data = result['diagram_texts_json']
            
            # Generate a new session ID for in-memory storage
            new_session_id = generate_session_id()
            
            # Copy the loaded structuring session data to the global structuring_session dictionary
            structuring_session[new_session_id] = loaded_structuring_session_data.copy()
            
            logger.info(f"✅ Successfully loaded structuring session {session_id} as new session {new_session_id}")
            logger.info(f"📊 Loaded structuring session structure: {json.dumps(loaded_structuring_session_data, indent=2)}")
            
            # Redirect to structuring page with the new session ID and a flag indicating it's loaded
            return redirect(f'/structuring?session_id={new_session_id}&loaded=true')
            
        except Exception as db_error:
            logger.error(f"💥 Database error loading structuring session: {str(db_error)}")
            return jsonify({
                'success': False,
                'message': f'Database error: {str(db_error)}'
            }), 500
            
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        logger.error(f"💥 Error loading structuring session: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error loading structuring session: {str(e)}"
        }), 500

@app.route('/visuals')
@login_required
def visuals_page():
    """Render the Visuals page."""
    # Check for loaded session parameters
    session_id_param = request.args.get('session_id')
    loaded_param = request.args.get('loaded')
    
    logger.info(f"🔍 Visuals page called with session_id_param='{session_id_param}', loaded_param='{loaded_param}'")
    
    if session_id_param and loaded_param == 'true':
        # This is a loaded session, use the provided session ID
        session_id = session_id_param
        
        logger.info(f"📋 Loading existing Visuals session: {session_id}")
        
        # Verify the session exists in our global dictionary
        if session_id not in visuals_session:
            logger.error(f"Loaded Visuals session {session_id} not found in global dictionary")
            logger.info(f"Available Visuals sessions: {list(visuals_session.keys())}")
            # Fall back to creating a new session
            session_id = generate_session_id()
            visuals_session[session_id] = {
                "badge": {
                    "row": 0,
                    "glyph": "lcttRgRL1750204485",
                    "created-at": datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                },
                "basic": {
                    "title": "",
                    "client": ""
                },
                "diagrams": [
                    {
                        "id": 1,
                        "ideation": "",
                        "planning": "",
                        "sketch": ""
                    }
                ]
            }
            logger.info(f"🚫 Created fallback session: {session_id}")
        else:
            logger.info(f"✅ Using loaded Visuals session: {session_id}")
            logger.info(f"📊 Session data keys: {list(visuals_session[session_id].keys())}")
            logger.info(f"📄 Title: {visuals_session[session_id].get('basic', {}).get('title', 'N/A')}")
            logger.info(f"👤 Client: {visuals_session[session_id].get('basic', {}).get('client', 'N/A')}")
    else:
        # Generate a new session identifier for normal flow
        session_id = generate_session_id()
        
        logger.info(f"🆕 Creating new Visuals session: {session_id}")
        
        # Initialize the Visuals session in the global dictionary
        visuals_session[session_id] = {
            "badge": {
                "row": 0,
                "glyph": "lcttRgRL1750204485",
                "created-at": datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            },
            "basic": {
                "title": "",
                "client": ""
            },
            "diagrams": [
                {
                    "id": 1,
                    "ideation": "",
                    "planning": "",
                    "sketch": ""
                }
            ]
        }
        
        logger.info(f"New Visuals session created: {session_id}")
        logger.info(f"Initial Visuals session structure: {json.dumps(visuals_session[session_id], indent=2)}")
    
    # Pass additional context for loaded sessions
    is_loaded_session = loaded_param == 'true'
    
    logger.info(f"🎯 Rendering Visuals template with session_id='{session_id}', is_loaded_session={is_loaded_session}")
    
    return render_template('visuals.html', 
                         session_id=session_id,
                         is_loaded_session=is_loaded_session)

@app.route('/update-visuals-session', methods=['POST'])
def update_visuals_session():
    """Update visuals session data."""
    try:
        data = request.get_json()
        session_id = data.get('sessionId', '')
        session_data = data.get('data', {})
        
        if not session_id:
            return jsonify({
                'success': False,
                'message': 'Session ID is required'
            }), 400
        
        logger.info(f"📝 Updating visuals session: {session_id}")
        logger.info(f"📝 Session data: {session_data}")
        
        # Initialize session if it doesn't exist
        if session_id not in visuals_session:
            logger.info(f"🆕 Creating new visuals session: {session_id}")
            visuals_session[session_id] = {
                "badge": {
                    "row": 0,
                    "glyph": "lcttRgRL1750204485",
                    "created-at": datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                },
                "basic": {
                    "title": "",
                    "client": ""
                },
                "diagrams": [
                    {
                        "id": 1,
                        "ideation": "",
                        "planning": "",
                        "sketch": ""
                    }
                ]
            }
        
        # Update the session data
        current_session = visuals_session[session_id]
        
        # Update badge info if provided
        if 'badge' in session_data:
            current_session['badge'].update(session_data['badge'])
            logger.info(f"📝 Updated badge info: {current_session['badge']}")
        
        # Update basic info if provided
        if 'basic' in session_data:
            current_session['basic'].update(session_data['basic'])
            logger.info(f"📝 Updated basic info: {current_session['basic']}")
        
        # Update other sections if provided (for future expansion)
        for key, value in session_data.items():
            if key not in ['badge', 'basic']:
                current_session[key] = value
                logger.info(f"📝 Updated {key}: {value}")
        
        logger.info(f"✅ Visuals session {session_id} updated successfully")
        
        return jsonify({
            'success': True,
            'message': 'Visuals session updated successfully',
            'session_id': session_id,
            'data': current_session
        })
        
    except Exception as e:
        logger.error(f"❌ Error updating visuals session: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Error updating visuals session: {str(e)}'
        }), 500

@app.route('/visuals/debug/<session_id>')
def visuals_debug(session_id):
    """Debug route to view visuals session data."""
    if session_id in visuals_session:
        return jsonify({
            'success': True,
            'session_id': session_id,
            'data': visuals_session[session_id]
        })
    else:
        return jsonify({
            'success': False,
            'message': f'Visuals session {session_id} not found',
            'available_sessions': list(visuals_session.keys())
        }), 404

@app.route('/save-visuals-session', methods=['POST'])
def save_visuals_session():
    """Save visuals session data to the database"""
    try:
        data = request.get_json()
        session_id = data.get('sessionId')
        
        if not session_id or session_id not in visuals_session:
            return jsonify({
                'success': False,
                'message': 'Invalid session ID'
            }), 400
        
        session_data = visuals_session[session_id]
        logger.info(f"💾 Saving visuals session {session_id} to database")
        logger.info(f"📊 Complete Visuals Session Object Structure:")
        logger.info(f"Visuals Session Data: {json.dumps(session_data, indent=2)}")
        
        # Get database connection
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        try:
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            # Get the current row value from badge
            badge = session_data.get('badge', {})
            current_row = badge.get('row', 0)
            
            # Check if row exists in database
            cursor.execute("SELECT id FROM ai_architecture_sessions WHERE id = %s", (current_row,))
            existing_row = cursor.fetchone()
            
            if existing_row and current_row > 0:
                # Row exists - update visual_assets_json
                logger.info(f"🔄 Updating existing row {current_row} with visuals session data")
                cursor.execute(
                    "UPDATE ai_architecture_sessions SET visual_assets_json = %s WHERE id = %s",
                    (json.dumps(session_data), current_row)
                )
                row_id = current_row
                
            else:
                # Row doesn't exist - create new row
                logger.info("🆕 Creating new row for visuals session data")
                
                # Extract title and client from session data
                basic_info = session_data.get('basic', {})
                title = basic_info.get('title', '')
                client = basic_info.get('client', '')
                
                logger.info(f"📝 Extracted visuals metadata - Title: '{title}', Client: '{client}'")
                
                # Insert new row and get the generated ID
                cursor.execute(
                    """INSERT INTO ai_architecture_sessions (visual_assets_json, title, client) 
                       VALUES (%s, %s, %s) RETURNING id""",
                    (json.dumps(session_data), title, client)
                )
                
                new_row = cursor.fetchone()
                row_id = new_row['id']
                
                # Update the badge row value in the session with the new row ID
                visuals_session[session_id]['badge']['row'] = row_id
                
                # Update the database with the corrected session data (with updated badge)
                cursor.execute(
                    "UPDATE ai_architecture_sessions SET visual_assets_json = %s WHERE id = %s",
                    (json.dumps(visuals_session[session_id]), row_id)
                )
                
                logger.info(f"✅ Created new row {row_id} and updated visuals badge row value")
            
            # Commit the transaction
            conn.commit()
            
            logger.info(f"🎉 Successfully saved visuals session {session_id} to database row {row_id}")
            
            return jsonify({
                'success': True,
                'message': f'Visuals session saved successfully to row {row_id}',
                'row_id': row_id
            })
            
        except Exception as db_error:
            conn.rollback()
            logger.error(f"💥 Database operation error: {str(db_error)}")
            return jsonify({
                'success': False,
                'message': f'Database error: {str(db_error)}'
            }), 500
            
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        logger.error(f"💥 Error saving visuals session: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error saving visuals session: {str(e)}"
        }), 500

@app.route('/delete-visuals-session', methods=['POST'])
def delete_visuals_session():
    """Delete a visuals session from memory and database."""
    try:
        data = request.get_json()
        session_id = data.get('sessionId', '')
        
        if not session_id:
            return jsonify({
                'success': False,
                'message': 'Session ID is required'
            }), 400
        
        # Check if session exists
        if session_id not in visuals_session:
            return jsonify({
                'success': False,
                'message': 'Session not found'
            }), 404
        
        # Get the session data to check for database row ID
        session_data = visuals_session[session_id]
        badge = session_data.get('badge', {})
        row_id = badge.get('row', 0)
        
        # Delete from database if row ID exists
        if row_id and row_id > 0:
            logger.info(f"🗑️ Deleting visuals session {session_id} from database row {row_id}")
            
            conn = get_db_connection()
            if conn:
                try:
                    cursor = conn.cursor()
                    
                    # Delete the row from database
                    cursor.execute("DELETE FROM ai_architecture_sessions WHERE id = %s", (row_id,))
                    deleted_rows = cursor.rowcount
                    
                    conn.commit()
                    
                    if deleted_rows > 0:
                        logger.info(f"✅ Successfully deleted database row {row_id} for visuals session {session_id}")
                    else:
                        logger.warning(f"⚠️ No database row found with ID {row_id} for visuals session {session_id}")
                    
                except Exception as db_error:
                    conn.rollback()
                    logger.error(f"💥 Database error deleting visuals session: {str(db_error)}")
                    return jsonify({
                        'success': False,
                        'message': f'Database error: {str(db_error)}'
                    }), 500
                    
                finally:
                    cursor.close()
                    conn.close()
            else:
                logger.warning("Database connection failed during visuals session deletion")
        else:
            logger.info(f"🗑️ No database row ID found for visuals session {session_id}, skipping database deletion")
        
        # Delete the session from memory
        del visuals_session[session_id]
        
        logger.info(f"✅ Visuals session deleted successfully: {session_id}")
        
        return jsonify({
            'success': True,
            'message': 'Visuals session deleted successfully'
        })
        
    except Exception as e:
        logger.error(f"💥 Error deleting visuals session: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error deleting visuals session: {str(e)}"
        }), 500

@app.route('/load-visuals-session/<int:session_id>')
def load_visuals_session(session_id):
    """Load a visuals session from database and redirect to visuals page with pre-filled data."""
    try:
        logger.info(f"🔄 Loading visuals session {session_id} from database")
        
        # Get database connection
        conn = get_db_connection()
        if not conn:
            logger.error("Database connection failed")
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        try:
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            # Fetch visuals session data from database
            cursor.execute(
                "SELECT visual_assets_json FROM ai_architecture_sessions WHERE id = %s",
                (session_id,)
            )
            
            result = cursor.fetchone()
            
            if not result or not result['visual_assets_json']:
                logger.warning(f"Visuals session {session_id} not found or has no visual assets")
                return jsonify({
                    'success': False,
                    'message': f'Visuals session {session_id} not found or has no data'
                }), 404
            
            # Get the visuals session object from database
            loaded_visuals_session_data = result['visual_assets_json']
            
            # Generate a new session ID for in-memory storage
            new_session_id = generate_session_id()
            
            # Copy the loaded visuals session data to the global visuals_session dictionary
            visuals_session[new_session_id] = loaded_visuals_session_data.copy()
            
            logger.info(f"✅ Successfully loaded visuals session {session_id} as new session {new_session_id}")
            logger.info(f"📊 Loaded visuals session structure: {json.dumps(loaded_visuals_session_data, indent=2)}")
            
            # Redirect to visuals page with the new session ID and a flag indicating it's loaded
            return redirect(f'/visuals?session_id={new_session_id}&loaded=true')
            
        except Exception as db_error:
            logger.error(f"💥 Database error loading visuals session: {str(db_error)}")
            return jsonify({
                'success': False,
                'message': f'Database error: {str(db_error)}'
            }), 500
            
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        logger.error(f"💥 Error loading visuals session: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error loading visuals session: {str(e)}"
        }), 500

@app.route('/generate-diagram-description', methods=['POST'])
def generate_diagram_description():
    """Generate diagram description based on ideation content using OpenAI."""
    # Start a LangFuse trace for this request
    if langfuse:
        try:
            with langfuse.start_as_current_span(
                name="generate-diagram-description",
                metadata={
                    "route": "/generate-diagram-description",
                    "method": "POST",
                    "user_agent": request.headers.get('User-Agent', ''),
                    "ip_address": request.remote_addr
                }
            ) as span:
                span.update_trace(user_id=request.headers.get('X-User-ID', 'anonymous'))
                
                try:
                    # Get data from request
                    data = request.get_json()
                    session_id = data.get('sessionId', '')
                    diagram_id = data.get('diagramId', '')
                    ideation_content = data.get('ideationContent', '').strip()
                    
                    # Validate inputs
                    if not ideation_content:
                        span.update(
                            output={"success": False, "message": "Ideation content is required"},
                            level="ERROR"
                        )
                        return jsonify({
                            'success': False,
                            'message': 'Ideation content is required'
                        }), 400
                        
                    if not session_id:
                        span.update(
                            output={"success": False, "message": "Session ID is required"},
                            level="ERROR"
                        )
                        return jsonify({
                            'success': False,
                            'message': 'Session ID is required'
                        }), 400
                    
                    # Update span with session information
                    span.update_trace(session_id=session_id)
                    span.update(
                        input={
                            "session_id": session_id,
                            "diagram_id": diagram_id,
                            "ideation_content": ideation_content[:200] + "..." if len(ideation_content) > 200 else ideation_content
                        },
                        metadata={
                            "ideation_content_length": len(ideation_content),
                            "diagram_id": diagram_id
                        }
                    )
                    
                    logger.info(f"Generating diagram description for session {session_id}, diagram {diagram_id}")
                    
                    # Import the utility function
                    from utils.vision_api import generate_diagram_description_with_openai
                    
                    # Generate diagram description using OpenAI
                    logger.info("Generating diagram description with OpenAI")
                    diagram_description = generate_diagram_description_with_openai(ideation_content)
                    
                    # Update the visuals session with the generated description
                    if session_id in visuals_session:
                        # Find the diagram with the matching ID and update the planning field
                        diagrams = visuals_session[session_id].get('diagrams', [])
                        for diagram in diagrams:
                            if str(diagram.get('id')) == str(diagram_id):
                                diagram['planning'] = diagram_description
                                logger.info(f"Updated planning field for diagram {diagram_id}")
                                break
                        else:
                            logger.warning(f"Diagram with ID {diagram_id} not found in session {session_id}")
                    else:
                        logger.warning(f"Session {session_id} not found in visuals_session")
                    
                    span.update(
                        output={
                            "success": True,
                            "diagram_description": diagram_description[:200] + "..." if len(diagram_description) > 200 else diagram_description
                        },
                        metadata={
                            "diagram_description_length": len(diagram_description)
                        }
                    )
                    
                    return jsonify({
                        'success': True,
                        'diagram_description': diagram_description,
                        'message': 'Diagram description generated successfully'
                    })
                    
                except Exception as e:
                    logger.error(f"Error generating diagram description: {str(e)}")
                    span.update(
                        output={"success": False, "message": f"Error generating diagram description: {str(e)}"},
                        level="ERROR"
                    )
                    return jsonify({
                        'success': False,
                        'message': f"Error generating diagram description: {str(e)}"
                    }), 500
                    
        except Exception as trace_error:
            logger.error(f"Error in LangFuse tracing for /generate-diagram-description: {str(trace_error)}")
            # Fall through to non-traced execution
    
    # Fallback execution without tracing if LangFuse is not available or fails
    try:
        # Get data from request
        data = request.get_json()
        session_id = data.get('sessionId', '')
        diagram_id = data.get('diagramId', '')
        ideation_content = data.get('ideationContent', '').strip()
        
        # Validate inputs
        if not ideation_content:
            return jsonify({
                'success': False,
                'message': 'Ideation content is required'
            }), 400
            
        if not session_id:
            return jsonify({
                'success': False,
                'message': 'Session ID is required'
            }), 400
        
        logger.info(f"Generating diagram description for session {session_id}, diagram {diagram_id}")
        
        # Import the utility function
        from utils.vision_api import generate_diagram_description_with_openai
        
        # Generate diagram description using OpenAI
        logger.info("Generating diagram description with OpenAI")
        diagram_description = generate_diagram_description_with_openai(ideation_content)
        
        # Update the visuals session with the generated description
        if session_id in visuals_session:
            # Find the diagram with the matching ID and update the planning field
            diagrams = visuals_session[session_id].get('diagrams', [])
            for diagram in diagrams:
                if str(diagram.get('id')) == str(diagram_id):
                    diagram['planning'] = diagram_description
                    logger.info(f"Updated planning field for diagram {diagram_id}")
                    break
            else:
                logger.warning(f"Diagram with ID {diagram_id} not found in session {session_id}")
        else:
            logger.warning(f"Session {session_id} not found in visuals_session")
        
        return jsonify({
            'success': True,
            'diagram_description': diagram_description,
            'message': 'Diagram description generated successfully'
        })
        
    except Exception as e:
        logger.error(f"Error handling request /generate-diagram-description: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Error generating diagram description: {str(e)}'
        }), 500

@app.route('/generate-sketch-content', methods=['POST'])
def generate_sketch_content():
    """Generate sketch content based on planning content using OpenAI's assistant API."""
    # Start a LangFuse trace for this request
    if langfuse:
        try:
            with langfuse.start_as_current_span(
                name="generate-sketch-content",
                metadata={
                    "route": "/generate-sketch-content",
                    "method": "POST",
                    "user_agent": request.headers.get('User-Agent', ''),
                    "ip_address": request.remote_addr
                }
            ) as span:
                span.update_trace(user_id=request.headers.get('X-User-ID', 'anonymous'))
                
                try:
                    # Get data from request
                    data = request.get_json()
                    session_id = data.get('sessionId', '')
                    diagram_id = data.get('diagramId', '')
                    planning_content = data.get('planningContent', '').strip()
                    
                    # Validate inputs
                    if not planning_content:
                        span.update(
                            output={"success": False, "message": "Planning content is required"},
                            level="ERROR"
                        )
                        return jsonify({
                            'success': False,
                            'message': 'Planning content is required'
                        }), 400
                        
                    if not session_id:
                        span.update(
                            output={"success": False, "message": "Session ID is required"},
                            level="ERROR"
                        )
                        return jsonify({
                            'success': False,
                            'message': 'Session ID is required'
                        }), 400
                    
                    # Update span with session information
                    span.update_trace(session_id=session_id)
                    span.update(
                        input={
                            "session_id": session_id,
                            "diagram_id": diagram_id,
                            "planning_content": planning_content[:200] + "..." if len(planning_content) > 200 else planning_content
                        },
                        metadata={
                            "planning_content_length": len(planning_content),
                            "diagram_id": diagram_id,
                            "assistant_id": "asst_uui77dmWGC629GFlP22QoSzT"
                        }
                    )
                    
                    logger.info(f"Generating sketch content for session {session_id}, diagram {diagram_id}")
                    
                    # Import the utility function
                    from utils.vision_api import generate_sketch_with_openai_assistant
                    
                    # Generate sketch content using OpenAI assistant
                    logger.info("Generating sketch content with OpenAI assistant")
                    sketch_content = generate_sketch_with_openai_assistant(planning_content)
                    
                    # Check if the response indicates an error
                    if isinstance(sketch_content, str) and sketch_content.startswith("Error:"):
                        logger.warning(f"Assistant returned error: {sketch_content}")
                        span.update(
                            output={"success": False, "message": sketch_content},
                            level="ERROR"
                        )
                        return jsonify({
                            'success': False,
                            'message': sketch_content
                        }), 400
                    
                    # Validate the response
                    if not sketch_content or not sketch_content.strip():
                        error_msg = "Assistant returned empty response. Please try again."
                        logger.error(error_msg)
                        span.update(
                            output={"success": False, "message": error_msg},
                            level="ERROR"
                        )
                        return jsonify({
                            'success': False,
                            'message': error_msg
                        }), 500
                    
                    # Update the visuals session with the generated sketch content
                    if session_id in visuals_session:
                        # Find the diagram with the matching ID and update the sketch field
                        diagrams = visuals_session[session_id].get('diagrams', [])
                        for diagram in diagrams:
                            if str(diagram.get('id')) == str(diagram_id):
                                diagram['sketch'] = sketch_content
                                logger.info(f"Updated sketch field for diagram {diagram_id}")
                                break
                        else:
                            logger.warning(f"Diagram with ID {diagram_id} not found in session {session_id}")
                    else:
                        logger.warning(f"Session {session_id} not found in visuals_session")
                    
                    span.update(
                        output={
                            "success": True,
                            "sketch_content": sketch_content[:200] + "..." if len(sketch_content) > 200 else sketch_content
                        },
                        metadata={
                            "sketch_content_length": len(sketch_content)
                        }
                    )
                    
                    return jsonify({
                        'success': True,
                        'sketch_content': sketch_content,
                        'message': 'Sketch content generated successfully'
                    })
                    
                except Exception as e:
                    logger.error(f"Error generating sketch content: {str(e)}")
                    span.update(
                        output={"success": False, "message": f"Error generating sketch content: {str(e)}"},
                        level="ERROR"
                    )
                    return jsonify({
                        'success': False,
                        'message': f"Error generating sketch content: {str(e)}"
                    }), 500
                    
        except Exception as trace_error:
            logger.error(f"Error in LangFuse tracing for /generate-sketch-content: {str(trace_error)}")
            # Fall through to non-traced execution
    
    # Fallback execution without tracing if LangFuse is not available or fails
    try:
        # Get data from request
        data = request.get_json()
        session_id = data.get('sessionId', '')
        diagram_id = data.get('diagramId', '')
        planning_content = data.get('planningContent', '').strip()
        
        # Validate inputs
        if not planning_content:
            return jsonify({
                'success': False,
                'message': 'Planning content is required'
            }), 400
            
        if not session_id:
            return jsonify({
                'success': False,
                'message': 'Session ID is required'
            }), 400
        
        logger.info(f"Generating sketch content for session {session_id}, diagram {diagram_id}")
        
        # Import the utility function
        from utils.vision_api import generate_sketch_with_openai_assistant
        
        # Generate sketch content using OpenAI assistant
        logger.info("Generating sketch content with OpenAI assistant")
        sketch_content = generate_sketch_with_openai_assistant(planning_content)
        
        # Check if the response indicates an error
        if isinstance(sketch_content, str) and sketch_content.startswith("Error:"):
            logger.warning(f"Assistant returned error: {sketch_content}")
            return jsonify({
                'success': False,
                'message': sketch_content
            }), 400
        
        # Validate the response
        if not sketch_content or not sketch_content.strip():
            error_msg = "Assistant returned empty response. Please try again."
            logger.error(error_msg)
            return jsonify({
                'success': False,
                'message': error_msg
            }), 500
        
        # Update the visuals session with the generated sketch content
        if session_id in visuals_session:
            # Find the diagram with the matching ID and update the sketch field
            diagrams = visuals_session[session_id].get('diagrams', [])
            for diagram in diagrams:
                if str(diagram.get('id')) == str(diagram_id):
                    diagram['sketch'] = sketch_content
                    logger.info(f"Updated sketch field for diagram {diagram_id}")
                    break
            else:
                logger.warning(f"Diagram with ID {diagram_id} not found in session {session_id}")
        else:
            logger.warning(f"Session {session_id} not found in visuals_session")
        
        return jsonify({
            'success': True,
            'sketch_content': sketch_content,
            'message': 'Sketch content generated successfully'
        })
        
    except Exception as e:
        logger.error(f"Error handling request /generate-sketch-content: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Error generating sketch content: {str(e)}'
        }), 500

@app.route('/visuals/sketch-<glyph>-<int:diagram_id>.XML')
def serve_sketch_xml(glyph, diagram_id):
    """Serve sketch XML file for Draw.io integration."""
    try:
        # Find the session with the matching glyph (which is the session ID or part of it)
        session_id = None
        session_data = None
        
        # First try to find exact match in visuals_session keys
        for sid, data in visuals_session.items():
            if sid.endswith(glyph) or glyph in sid:
                session_id = sid
                session_data = data
                break
        
        # If not found, try to find by glyph in badge (if available)
        if not session_data:
            for sid, data in visuals_session.items():
                badge = data.get('badge', {})
                badge_glyph = badge.get('glyph', '')
                if badge_glyph.endswith(glyph) or glyph in badge_glyph:
                    session_id = sid
                    session_data = data
                    break
        
        if not session_data:
            logger.error(f"Session with glyph '{glyph}' not found")
            logger.info(f"Available sessions: {list(visuals_session.keys())}")
            return "Session not found", 404
        
        # Find the diagram with the specified ID
        diagrams = session_data.get('diagrams', [])
        target_diagram = None
        
        for diagram in diagrams:
            if diagram.get('id') == diagram_id:
                target_diagram = diagram
                break
        
        if not target_diagram:
            logger.error(f"Diagram {diagram_id} not found in session")
            return "Diagram not found", 404
        
        # Get the sketch content (XML)
        sketch_content = target_diagram.get('sketch', '').strip()
        
        if not sketch_content:
            logger.error(f"No sketch content found for diagram {diagram_id}")
            return "No sketch content available", 404
        
        # Validate that it's XML content and wrap if needed
        if not sketch_content.startswith('<?xml') and not sketch_content.startswith('<mxfile'):
            # If it's not proper XML, wrap it in basic mxfile structure
            sketch_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="dry-ground-ai" modified="{datetime.datetime.now().isoformat()}Z" agent="DryGround AI" version="1.0" type="device">
  <diagram name="Sketch-{diagram_id}" id="sketch-{diagram_id}">
    <mxGraphModel dx="1000" dy="1000" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1100" pageHeight="850" background="#ffffff" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <!-- Sketch Content -->
        {sketch_content}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>"""
        
        logger.info(f"Serving sketch XML file: sketch-{glyph}-{diagram_id}.XML")
        
        # Return the XML content with proper headers
        response = app.response_class(
            sketch_content,
            mimetype='application/xml',
            headers={
                'Content-Disposition': f'inline; filename="sketch-{glyph}-{diagram_id}.XML"',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Error serving sketch XML: {str(e)}")
        return f"Error serving sketch XML: {str(e)}", 500

@app.route('/convert-text-to-visual', methods=['POST'])
def convert_text_to_visual():
    """Convert a diagram_texts_json session to visual_assets_json format."""
    try:
        data = request.get_json()
        session_id = data.get('sessionId')
        
        if not session_id:
            return jsonify({
                'success': False,
                'message': 'Session ID is required'
            }), 400
        
        logger.info(f"🔄 Converting Text → Visual for session: {session_id}")
        
        # Get database connection
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        try:
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            # Fetch the diagram_texts_json data
            cursor.execute(
                "SELECT diagram_texts_json FROM ai_architecture_sessions WHERE id = %s",
                (session_id,)
            )
            
            result = cursor.fetchone()
            
            if not result or not result['diagram_texts_json']:
                return jsonify({
                    'success': False,
                    'message': f'No diagram texts found for session {session_id}'
                }), 404
            
            source_data = result['diagram_texts_json']
            logger.info(f"📊 Source diagram_texts_json structure: {json.dumps(source_data, indent=2)}")
            
            # Transform the data according to specifications
            visual_data = {}
            
            # 1. Copy badge identifier and update its date
            if 'badge' in source_data:
                visual_data['badge'] = source_data['badge'].copy()
                # Update the date to current time
                visual_data['badge']['created-at'] = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            # 2. Copy basic identifier
            if 'basic' in source_data:
                visual_data['basic'] = source_data['basic'].copy()
            
            # 3. Transform solution identifier: 'solution' → 'diagrams', 'text' → 'ideation'
            visual_data['diagrams'] = []
            
            # Look for solution data - check both 'solution' array and individual solution items
            solutions_to_process = []
            
            # Check if there's a 'solution' array
            if 'solution' in source_data and isinstance(source_data['solution'], list):
                solutions_to_process = source_data['solution']
                logger.info(f"📋 Found solution array with {len(solutions_to_process)} items")
            else:
                # Look for individual solution objects
                for key, value in source_data.items():
                    if key.startswith('solution') and isinstance(value, dict):
                        solutions_to_process.append(value)
                        logger.info(f"📋 Found individual solution object: {key}")
            
            # Process each solution
            for idx, solution_item in enumerate(solutions_to_process):
                if isinstance(solution_item, dict):
                    # Create new diagram object
                    diagram = {
                        'id': idx + 1,  # Sequential ID starting from 1
                        'ideation': '',  # Will be populated from 'text' field
                        'planning': '',  # Empty as specified
                        'sketch': ''     # Empty as specified
                    }
                    
                    # Extract ideation content from 'text' field
                    if 'text' in solution_item:
                        diagram['ideation'] = solution_item['text']
                        logger.info(f"📝 Extracted ideation content for diagram {diagram['id']}: {len(diagram['ideation'])} characters")
                    
                    # Copy other fields (excluding 'content' as specified)
                    for key, value in solution_item.items():
                        if key not in ['text', 'content']:  # Skip text (already processed) and content (excluded)
                            diagram[key] = value
                    
                    visual_data['diagrams'].append(diagram)
                    logger.info(f"✅ Created diagram {diagram['id']} with ideation content")
            
            # If no solutions were found in the expected format, log available keys
            if not visual_data['diagrams']:
                logger.warning(f"⚠️ No solution data found to convert. Available keys: {list(source_data.keys())}")
                # Create at least one empty diagram
                visual_data['diagrams'] = [{
                    'id': 1,
                    'ideation': '',
                    'planning': '',
                    'sketch': ''
                }]
            
            logger.info(f"📊 Transformed visual_assets_json structure: {json.dumps(visual_data, indent=2)}")
            
            # Update the database with the new visual_assets_json
            cursor.execute(
                "UPDATE ai_architecture_sessions SET visual_assets_json = %s WHERE id = %s",
                (json.dumps(visual_data), session_id)
            )
            
            # Commit the transaction
            conn.commit()
            
            logger.info(f"✅ Successfully converted Text → Visual for session {session_id}")
            logger.info(f"📊 Created {len(visual_data['diagrams'])} diagrams")
            
            return jsonify({
                'success': True,
                'message': f'Successfully converted Text → Visual for session {session_id}',
                'visual_data': visual_data
            })
            
        except Exception as db_error:
            conn.rollback()
            logger.error(f"💥 Database error in Text → Visual conversion: {str(db_error)}")
            return jsonify({
                'success': False,
                'message': f'Database error: {str(db_error)}'
            }), 500
            
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        logger.error(f"💥 Error in Text → Visual conversion: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error in Text → Visual conversion: {str(e)}"
        }), 500

# Convert Solution to SoW route
@app.route('/convert-solution-to-sow', methods=['POST'])
def convert_solution_to_sow():
    """Convert session solutions to SoW using OpenAI assistant."""
    try:
        data = request.get_json()
        session_id = data.get('sessionId')
        
        if not session_id:
            return jsonify({
                'success': False,
                'message': 'Session ID is required'
            }), 400
        
        logger.info(f"🔄 Converting Solution → SoW for session {session_id}")
        
        # Get session data from database
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        try:
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            cursor.execute(
                "SELECT session_objects FROM ai_architecture_sessions WHERE id = %s",
                (session_id,)
            )
            
            result = cursor.fetchone()
            if not result or not result['session_objects']:
                return jsonify({
                    'success': False,
                    'message': f'Session {session_id} not found or has no data'
                }), 404
            
            session_objects = result['session_objects']
            logger.info(f"📊 Retrieved session objects for conversion")
            
            # Extract solution data
            solution_variables = extract_solution_variables(session_objects)
            
            if not solution_variables:
                return jsonify({
                    'success': False,
                    'message': 'No solution data found with ai_analysis or solution_explanation'
                }), 400
            
            logger.info(f"📝 Extracted {len(solution_variables)} solution variables")
            
            # Generate SoW using OpenAI assistant
            logger.info("🤖 Generating SoW with OpenAI assistant...")
            sow_content = generate_sow_with_openai_assistant(solution_variables)
            
            # Create SoW JSON structure
            sow_objects = create_sow_structure(session_objects, sow_content)
            
            # Save to database
            logger.info(f"💾 Saving SoW objects to database for session {session_id}")
            cursor.execute(
                "UPDATE ai_architecture_sessions SET sow_objects = %s WHERE id = %s",
                (json.dumps(sow_objects), session_id)
            )
            conn.commit()
            
            logger.info(f"✅ Successfully converted Solution → SoW for session {session_id}")
            
            return jsonify({
                'success': True,
                'message': 'Successfully converted Solution → SoW',
                'sow_data': sow_objects
            })
            
        except Exception as db_error:
            logger.error(f"💥 Database error during Solution → SoW conversion: {str(db_error)}")
            return jsonify({
                'success': False,
                'message': f'Database error: {str(db_error)}'
            }), 500
            
        finally:
            cursor.close()
            conn.close()
        
    except Exception as e:
        logger.error(f"💥 Error converting Solution → SoW: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500


def extract_solution_variables(session_objects):
    """Extract ai_analysis and solution_explanation from all solutions."""
    variables = []
    
    for key, value in session_objects.items():
        if key.startswith('solution_') and isinstance(value, dict):
            solution_vars = value.get('variables', {})
            ai_analysis = solution_vars.get('ai_analysis', '')
            solution_explanation = solution_vars.get('solution_explanation', '')
            
            if ai_analysis or solution_explanation:
                variables.append({
                    'solution_key': key,
                    'ai_analysis': ai_analysis,
                    'solution_explanation': solution_explanation
                })
                logger.info(f"📋 Extracted variables from {key}: ai_analysis={len(ai_analysis)} chars, solution_explanation={len(solution_explanation)} chars")
    
    return variables


def compile_solution_content(solution_variables):
    """Compile all solution variables into a structured prompt."""
    compiled_parts = []
    
    for i, solution in enumerate(solution_variables, 1):
        solution_key = solution['solution_key']
        ai_analysis = solution['ai_analysis']
        solution_explanation = solution['solution_explanation']
        
        part = f"SOLUTION {i} ({solution_key}):\n"
        
        if ai_analysis:
            part += f"AI Analysis:\n{ai_analysis}\n\n"
        
        if solution_explanation:
            part += f"Solution Explanation:\n{solution_explanation}\n\n"
        
        compiled_parts.append(part)
    
    return "\n" + "="*80 + "\n".join(compiled_parts) + "="*80 + "\n"


def generate_sow_with_openai_assistant(solution_variables):
    """Generate SoW using OpenAI assistant with high token limit."""
    try:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            logger.error("OPENAI_API_KEY environment variable not found")
            raise Exception("OpenAI API key not configured")
        
        # Initialize OpenAI client
        client = OpenAI(api_key=api_key)
        
        # Compile all solution data into prompt
        compiled_content = compile_solution_content(solution_variables)
        
        logger.info(f"📝 Compiled content length: {len(compiled_content)} characters")
        
        # Assistant ID for SoW generation
        assistant_id = "asst_IqS6WRHNbe6OAgvXGlYrE8PX"
        
        logger.info(f"🤖 Creating thread and running assistant {assistant_id} for SoW generation")
        
        # Create thread
        thread = client.beta.threads.create()
        
        # Create comprehensive prompt for SoW generation
        sow_prompt = f"""Generate a comprehensive Statement of Work based on these solution analyses:

{compiled_content}

Please analyze all the provided solution data and create a professional Statement of Work. Return a JSON object with this exact structure:

{{
    "project": "Generated project title based on the solutions",
    "client": "Client name extracted from context or 'Client Name'",
    "prepared_by": "Dry Ground Partners",
    "date": "{datetime.datetime.now().strftime('%Y-%m-%d')}",
    "project_purpose_background": "Detailed background text explaining the project purpose based on the solutions",
    "objectives": ["Objective 1", "Objective 2", "Objective 3"],
    "in_scope_deliverables": [
        {{
            "deliverable": "Deliverable Name",
            "key_features": "Key features description",
            "primary_artifacts": "Primary artifacts description"
        }}
    ],
    "out_of_scope": "Detailed out of scope description",
    "functional_requirements": ["Functional requirement 1", "Functional requirement 2"],
    "non_functional_requirements": ["Non-functional requirement 1", "Non-functional requirement 2"],
    "project_phases_timeline": {{
        "timeline_weeks": "12",
        "phases": [
            {{
                "phase": "Phase 1: Analysis & Planning",
                "key_activities": "Key activities for this phase",
                "weeks_display": "1-4"
            }},
            {{
                "phase": "Phase 2: Development",
                "key_activities": "Development activities",
                "weeks_display": "5-8"
            }},
            {{
                "phase": "Phase 3: Testing & Deployment",
                "key_activities": "Testing and deployment activities",
                "weeks_display": "9-12"
            }}
        ]
    }}
}}

Requirements:
1. Generate comprehensive, professional content based on the solution analyses
2. Include at least 3-5 objectives
3. Include 3-5 in-scope deliverables with detailed descriptions
4. Include 5-8 functional requirements
5. Include 3-5 non-functional requirements
6. Create a realistic 3-phase timeline
7. Make the content detailed and specific to the solutions provided
8. Return ONLY the JSON object, no additional text"""
        
        # Add message to thread
        client.beta.threads.messages.create(
            thread_id=thread.id,
            role="user",
            content=sow_prompt
        )
        
        # Run assistant
        run = client.beta.threads.runs.create(
            thread_id=thread.id,
            assistant_id=assistant_id
        )
        
        # Wait for completion with extended timeout
        logger.info(f"⏳ Assistant run started with ID: {run.id}, waiting for completion...")
        sow_content = wait_for_sow_completion(client, thread.id, run.id, max_wait_time=300)
        
        logger.info("✅ Successfully generated SoW content with OpenAI assistant")
        return sow_content
        
    except Exception as e:
        logger.error(f"💥 Error generating SoW with assistant: {str(e)}")
        raise Exception(f"SoW generation failed: {str(e)}")


def wait_for_sow_completion(client, thread_id, run_id, max_wait_time=300):
    """Wait for assistant run completion and extract SoW content."""
    import time
    
    start_time = time.time()
    poll_interval = 3  # Start with 3 second intervals
    
    while True:
        elapsed_time = time.time() - start_time
        
        if elapsed_time > max_wait_time:
            logger.error(f"Assistant run timed out after {max_wait_time} seconds")
            try:
                client.beta.threads.runs.cancel(thread_id=thread_id, run_id=run_id)
                logger.info("Cancelled the timed-out assistant run")
            except Exception as cancel_error:
                logger.warning(f"Could not cancel run: {cancel_error}")
            raise Exception(f"Assistant run timed out after {max_wait_time} seconds. Please try again.")
        
        # Increase polling interval after 60 seconds
        if elapsed_time > 60:
            poll_interval = 5
        
        try:
            run = client.beta.threads.runs.retrieve(thread_id=thread_id, run_id=run_id)
            logger.debug(f"Assistant status: {run.status}, elapsed: {elapsed_time:.1f}s")
            
            if run.status == 'completed':
                logger.info(f"🎉 Assistant run completed successfully after {elapsed_time:.1f}s")
                break
            elif run.status in ['failed', 'cancelled', 'expired']:
                error_msg = f"Assistant run ended with status: {run.status}"
                if hasattr(run, 'last_error') and run.last_error:
                    error_msg += f". Error: {run.last_error}"
                logger.error(error_msg)
                raise Exception(error_msg)
            elif run.status in ['queued', 'in_progress', 'cancelling']:
                time.sleep(poll_interval)
                continue
            else:
                logger.warning(f"Unknown run status: {run.status}, continuing to wait...")
                time.sleep(poll_interval)
                continue
                
        except Exception as retrieve_error:
            logger.error(f"Error retrieving run status: {retrieve_error}")
            raise Exception(f"Could not check assistant status: {str(retrieve_error)}")
    
    # Retrieve and extract the response
    try:
        messages = client.beta.threads.messages.list(thread_id=thread_id)
        
        for message in messages.data:
            if message.role == 'assistant':
                content = ""
                for content_block in message.content:
                    if content_block.type == 'text':
                        content += content_block.text.value
                
                if content.strip():
                    logger.info("📄 Successfully extracted SoW content from assistant response")
                    return parse_sow_json(content.strip())
        
        raise Exception("No assistant response found in thread")
        
    except Exception as messages_error:
        logger.error(f"Error retrieving messages: {messages_error}")
        raise Exception(f"Could not retrieve assistant response: {str(messages_error)}")


def parse_sow_json(content):
    """Parse and validate the SoW JSON content from assistant response."""
    try:
        # Try to extract JSON from the content if it's wrapped in text
        content = content.strip()
        
        # Look for JSON object in the content
        start_idx = content.find('{')
        end_idx = content.rfind('}')
        
        if start_idx != -1 and end_idx != -1:
            json_content = content[start_idx:end_idx + 1]
            sow_data = json.loads(json_content)
            
            # Validate required fields
            required_fields = ['project', 'client', 'prepared_by', 'date', 'project_purpose_background']
            for field in required_fields:
                if field not in sow_data:
                    logger.warning(f"Missing required field: {field}")
                    sow_data[field] = f"Generated {field}"
            
            logger.info("✅ Successfully parsed and validated SoW JSON")
            return sow_data
        else:
            raise ValueError("No valid JSON object found in response")
            
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error: {str(e)}")
        logger.error(f"Content that failed to parse: {content[:500]}...")
        raise Exception(f"Failed to parse SoW JSON: {str(e)}")
    except Exception as e:
        logger.error(f"Error parsing SoW content: {str(e)}")
        raise Exception(f"Failed to process SoW content: {str(e)}")


def create_sow_structure(session_objects, sow_content):
    """Create final SoW structure with preserved badge and basic."""
    try:
        # Ensure sow_content is a dictionary
        if isinstance(sow_content, str):
            sow_data = json.loads(sow_content)
        else:
            sow_data = sow_content
        
        # Preserve badge and basic from original session
        sow_objects = {
            "badge": session_objects.get("badge", {
                "created-at": datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                "row": 0,
                "glyph": "generated"
            }),
            "basic": session_objects.get("basic", {}),
        }
        
        # Merge generated SoW content
        sow_objects.update(sow_data)
        
        # Update badge date to current timestamp
        sow_objects["badge"]["created-at"] = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        logger.info("✅ Successfully created SoW structure with preserved metadata")
        return sow_objects
        
    except Exception as e:
        logger.error(f"Error creating SoW structure: {str(e)}")
        raise Exception(f"Failed to create SoW structure: {str(e)}")

@app.route('/loe')
@login_required
def loe_page():
    """Render the LoE (Level of Effort) page."""
    # Check for loaded session parameters
    session_id_param = request.args.get('session_id')
    loaded_param = request.args.get('loaded')
    
    logger.info(f"🔍 LoE page called with session_id_param='{session_id_param}', loaded_param='{loaded_param}'")
    
    if session_id_param and loaded_param == 'true':
        # This is a loaded session, use the provided session ID
        session_id = session_id_param
        
        logger.info(f"📋 Loading existing LoE session: {session_id}")
        
        # Verify the session exists in our global dictionary
        if session_id not in loe_session:
            logger.error(f"Loaded LoE session {session_id} not found in global dictionary")
            logger.info(f"Available LoE sessions: {list(loe_session.keys())}")
            # Fall back to creating a new session
            session_id = generate_session_id()
            loe_session[session_id] = {
                "badge": {
                    "created-at": datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    "row": 0,
                    "glyph": session_id
                },
                "basic": {
                    "project": "",
                    "client": "",
                    "prepared_by": "Dry Ground Partners",
                    "date": datetime.datetime.now().strftime('%Y-%m-%d')
                }
            }
            logger.info(f"🚫 Created fallback LoE session: {session_id}")
        else:
            logger.info(f"✅ Using loaded LoE session: {session_id}")
            logger.info(f"📊 Session data keys: {list(loe_session[session_id].keys())}")
            basic_info = loe_session[session_id].get('basic', {})
            logger.info(f"📄 Project: {basic_info.get('project', 'N/A')}")
            logger.info(f"👤 Client: {basic_info.get('client', 'N/A')}")
    else:
        # Generate a new session identifier for normal flow
        session_id = generate_session_id()
        
        logger.info(f"🆕 Creating new LoE session: {session_id}")
        
        # Initialize the LoE session in the global dictionary
        loe_session[session_id] = {
            "badge": {
                "created-at": datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                "row": 0,
                "glyph": session_id
            },
            "basic": {
                "project": "",
                "client": "",
                "prepared_by": "Dry Ground Partners",
                "date": datetime.datetime.now().strftime('%Y-%m-%d')
            }
        }
        
        logger.info(f"New LoE session created: {session_id}")
        logger.info(f"Initial LoE session structure: {json.dumps(loe_session[session_id], indent=2)}")
    
    today = datetime.datetime.now().strftime('%Y-%m-%d')
    
    # Pass additional context for loaded sessions
    is_loaded_session = loaded_param == 'true'
    
    logger.info(f"🎯 Rendering LoE template with session_id='{session_id}', is_loaded_session={is_loaded_session}")
    
    return render_template('loe.html', 
                         today=today, 
                         session_id=session_id,
                         is_loaded_session=is_loaded_session)

@app.route('/update-loe-session', methods=['POST'])
def update_loe_session():
    """Update LoE session data."""
    try:
        data = request.get_json()
        session_id = data.get('sessionId')
        
        logger.info(f"🔄 Updating LoE session: {session_id}")
        logger.info(f"📋 Received data keys: {list(data.keys())}")
        
        if not session_id:
            logger.error("No session ID provided")
            return jsonify({'success': False, 'error': 'Session ID is required'}), 400
        
        # Initialize session if it doesn't exist
        if session_id not in loe_session:
            logger.warning(f"Session {session_id} not found, creating new one")
            loe_session[session_id] = {
                "badge": {
                    "created-at": datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    "row": 0,
                    "glyph": session_id
                },
                "basic": {
                    "project": "",
                    "client": "",
                    "prepared_by": "Dry Ground Partners",
                    "date": datetime.datetime.now().strftime('%Y-%m-%d')
                }
            }
        
        # Update basic information
        if 'projectName' in data:
            loe_session[session_id]['basic']['project'] = data['projectName']
        if 'client' in data:
            loe_session[session_id]['basic']['client'] = data['client']
        if 'preparedBy' in data:
            loe_session[session_id]['basic']['prepared_by'] = data['preparedBy']
        if 'date' in data:
            loe_session[session_id]['basic']['date'] = data['date']
        
        logger.info(f"📝 Updated basic info: {loe_session[session_id]['basic']}")
        
        # Update project overview
        if 'overview' in data:
            loe_session[session_id]['overview'] = data['overview']
            logger.info(f"📄 Updated overview: {data['overview'][:100]}...")
        
        # Update workstreams
        if 'workstreams' in data:
            loe_session[session_id]['workstreams'] = data['workstreams']
            logger.info(f"🏗️ Updated workstreams: {len(data['workstreams'])} items")
            for i, ws in enumerate(data['workstreams']):
                logger.info(f"  Workstream {i+1}: {ws.get('workstream', 'N/A')} - {ws.get('duration', 0)} weeks")
        
        # Update resources
        if 'resources' in data:
            loe_session[session_id]['resources'] = data['resources']
            logger.info(f"👥 Updated resources: {len(data['resources'])} roles")
            for i, res in enumerate(data['resources']):
                logger.info(f"  Role {i+1}: {res.get('role', 'N/A')} - {res.get('personWeeks', 0)} weeks")
        
        # Update buffer
        if 'buffer' in data:
            loe_session[session_id]['buffer'] = data['buffer']
            logger.info(f"🛡️ Updated buffer: {data['buffer'].get('weeks', 0)} weeks")
        
        # Update assumptions
        if 'assumptions' in data:
            loe_session[session_id]['assumptions'] = data['assumptions']
            logger.info(f"📋 Updated assumptions: {len(data['assumptions'])} items")
        
        # Update goodOptions
        if 'goodOptions' in data:
            loe_session[session_id]['goodOptions'] = data['goodOptions']
            logger.info(f"✅ Updated goodOptions: {len(data['goodOptions'])} items")
            for i, option in enumerate(data['goodOptions']):
                logger.info(f"  Good Option {i+1}: {option.get('feature', 'N/A')[:50]} - {option.get('personHours', 0)} hours")
        
        # Update bestOptions
        if 'bestOptions' in data:
            loe_session[session_id]['bestOptions'] = data['bestOptions']
            logger.info(f"🚀 Updated bestOptions: {len(data['bestOptions'])} items")
            for i, option in enumerate(data['bestOptions']):
                logger.info(f"  Best Option {i+1}: {option.get('feature', 'N/A')[:50]} - {option.get('personHours', 0)} hours")
        
        # Update badge timestamp
        loe_session[session_id]['badge']['created-at'] = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # Log the complete session structure
        logger.info(f"✅ Complete LoE session structure:")
        logger.info(json.dumps(loe_session[session_id], indent=2))
        
        return jsonify({
            'success': True,
            'message': 'LoE session updated successfully',
            'sessionId': session_id
        })
        
    except Exception as e:
        logger.error(f"❌ Error updating LoE session: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/generate-loe-pdf', methods=['POST'])
def generate_loe_pdf():
    """Generate a professional Level of Effort PDF."""
    try:
        # Get session ID from form data
        session_id = request.form.get('sessionId', '')
        
        if not session_id or session_id not in loe_session:
            return jsonify({
                'success': False,
                'message': 'Invalid session ID'
            }), 400
        
        session_data = loe_session[session_id]
        logger.info(f"Generating LoE PDF for session: {session_id}")
        logger.info(f"LoE session data: {json.dumps(session_data, indent=2)}")
        
        # Validate required fields
        basic_info = session_data.get('basic', {})
        if not basic_info.get('project') or not basic_info.get('client'):
            return jsonify({
                'success': False, 
                'message': 'Project name and client are required'
            }), 400
        
        # Create a temporary file for the PDF
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            temp_filename = temp_file.name
        
        # Generate the LoE PDF using the new PDF generator
        generate_loe_pdf_document(temp_filename, session_data)
        
        # Determine filename
        project_name = basic_info.get('project', 'Level_of_Effort').replace(' ', '_')
        download_name = f"LoE_{project_name}.pdf"
        
        logger.info(f"LoE PDF generated successfully: {download_name}")
        
        # Send the file
        return send_file(
            temp_filename,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=download_name
        )
    
    except Exception as e:
        logger.error(f"Error generating LoE PDF: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error generating LoE PDF: {str(e)}"
        }), 500

@app.route('/preview-loe-pdf', methods=['GET'])
def preview_loe_pdf():
    """Generate a LoE PDF for browser preview (not download)."""
    try:
        # Get session ID from query parameters
        session_id = request.args.get('sessionId', '')
        
        if not session_id or session_id not in loe_session:
            return jsonify({
                'success': False,
                'message': 'Invalid session ID'
            }), 400
        
        session_data = loe_session[session_id]
        logger.info(f"Generating LoE PDF preview for session: {session_id}")
        
        # Validate required fields
        basic_info = session_data.get('basic', {})
        if not basic_info.get('project') or not basic_info.get('client'):
            return jsonify({
                'success': False, 
                'message': 'Project name and client are required'
            }), 400
        
        # Create a temporary file for the PDF
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            temp_filename = temp_file.name
        
        # Generate the LoE PDF
        generate_loe_pdf_document(temp_filename, session_data)
        
        logger.info(f"LoE PDF preview generated successfully")
        
        # Send the file for browser viewing (not download)
        return send_file(
            temp_filename,
            mimetype='application/pdf',
            as_attachment=False  # This makes it open in browser instead of download
        )
    
    except Exception as e:
        logger.error(f"Error generating LoE PDF preview: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error generating LoE PDF preview: {str(e)}"
        }), 500

@app.route('/delete-loe-session', methods=['POST'])
def delete_loe_session():
    """Delete a LoE session from memory and database."""
    try:
        data = request.get_json()
        session_id = data.get('sessionId', '')
        
        if not session_id:
            return jsonify({
                'success': False,
                'message': 'Session ID is required'
            }), 400
        
        # Check if session exists
        if session_id not in loe_session:
            return jsonify({
                'success': False,
                'message': 'Session not found'
            }), 404
        
        # Get the session data to check for database row ID
        session_data = loe_session[session_id]
        badge = session_data.get('badge', {})
        row_id = badge.get('row', 0)
        
        # Delete from database if row ID exists
        if row_id and row_id > 0:
            logger.info(f"🗑️ Deleting LoE session {session_id} from database row {row_id}")
            
            conn = get_db_connection()
            if conn:
                try:
                    cursor = conn.cursor()
                    
                    # Delete the row from database
                    cursor.execute("DELETE FROM ai_architecture_sessions WHERE id = %s", (row_id,))
                    deleted_rows = cursor.rowcount
                    
                    conn.commit()
                    
                    if deleted_rows > 0:
                        logger.info(f"✅ Successfully deleted database row {row_id} for LoE session {session_id}")
                    else:
                        logger.warning(f"⚠️ No database row found with ID {row_id} for LoE session {session_id}")
                    
                except Exception as db_error:
                    conn.rollback()
                    logger.error(f"💥 Database error deleting LoE session: {str(db_error)}")
                    return jsonify({
                        'success': False,
                        'message': f'Database error: {str(db_error)}'
                    }), 500
                    
                finally:
                    cursor.close()
                    conn.close()
            else:
                logger.warning("Database connection failed during LoE session deletion")
        else:
            logger.info(f"🗑️ No database row ID found for LoE session {session_id}, skipping database deletion")
        
        # Delete the session from memory
        del loe_session[session_id]
        
        logger.info(f"✅ LoE session deleted successfully: {session_id}")
        
        return jsonify({
            'success': True,
            'message': 'LoE session deleted successfully'
        })
    
    except Exception as e:
        logger.error(f"💥 Error deleting LoE session: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error deleting LoE session: {str(e)}"
        }), 500

@app.route('/save-loe-session', methods=['POST'])
def save_loe_session():
    """Save LoE session data to the database"""
    try:
        data = request.get_json()
        session_id = data.get('sessionId')
        
        if not session_id or session_id not in loe_session:
            return jsonify({
                'success': False,
                'message': 'Invalid session ID'
            }), 400
        
        session_data = loe_session[session_id]
        logger.info(f"💾 Saving LoE session {session_id} to database")
        logger.info(f"📊 Complete LoE Session Object Structure:")
        logger.info(f"LoE Session Data: {json.dumps(session_data, indent=2)}")
        
        # Get database connection
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        try:
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            # Get the current row value from badge
            badge = session_data.get('badge', {})
            current_row = badge.get('row', 0)
            
            # Check if row exists in database
            cursor.execute("SELECT id FROM ai_architecture_sessions WHERE id = %s", (current_row,))
            existing_row = cursor.fetchone()
            
            if existing_row and current_row > 0:
                # Row exists - update loe_objects
                logger.info(f"🔄 Updating existing row {current_row} with LoE session data")
                cursor.execute(
                    "UPDATE ai_architecture_sessions SET loe_objects = %s WHERE id = %s",
                    (json.dumps(session_data), current_row)
                )
                row_id = current_row
                
            else:
                # Row doesn't exist - create new row
                logger.info("🆕 Creating new row for LoE session data")
                
                # Extract title and client from session data
                basic_info = session_data.get('basic', {})
                project = basic_info.get('project', '')
                client = basic_info.get('client', '')
                
                logger.info(f"📝 Extracted LoE metadata - Project: '{project}', Client: '{client}'")
                
                # Insert new row and get the generated ID
                cursor.execute(
                    """INSERT INTO ai_architecture_sessions (loe_objects, title, client) 
                       VALUES (%s, %s, %s) RETURNING id""",
                    (json.dumps(session_data), project, client)
                )
                
                new_row = cursor.fetchone()
                row_id = new_row['id']
                
                # Update the badge row value in the session with the new row ID
                loe_session[session_id]['badge']['row'] = row_id
                
                # Update the database with the corrected session data (with updated badge)
                cursor.execute(
                    "UPDATE ai_architecture_sessions SET loe_objects = %s WHERE id = %s",
                    (json.dumps(loe_session[session_id]), row_id)
                )
                
                logger.info(f"✅ Created new row {row_id} and updated LoE badge row value")
            
            # Commit the transaction
            conn.commit()
            
            logger.info(f"🎉 Successfully saved LoE session {session_id} to database row {row_id}")
            
            return jsonify({
                'success': True,
                'message': f'LoE session saved successfully to row {row_id}',
                'row_id': row_id
            })
            
        except Exception as db_error:
            conn.rollback()
            logger.error(f"💥 Database operation error: {str(db_error)}")
            return jsonify({
                'success': False,
                'message': f'Database error: {str(db_error)}'
            }), 500
            
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        logger.error(f"💥 Error saving LoE session: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error saving LoE session: {str(e)}"
        }), 500

@app.route('/load-loe-session/<int:session_id>')
def load_loe_session(session_id):
    """Load a LoE session from database and redirect to LoE page with pre-filled data."""
    try:
        logger.info(f"🔄 Loading LoE session {session_id} from database")
        
        # Get database connection
        conn = get_db_connection()
        if not conn:
            logger.error("Database connection failed")
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        try:
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            # Fetch LoE session data from database
            cursor.execute(
                "SELECT loe_objects FROM ai_architecture_sessions WHERE id = %s",
                (session_id,)
            )
            
            result = cursor.fetchone()
            
            if not result or not result['loe_objects']:
                logger.warning(f"LoE session {session_id} not found or has no loe objects")
                return jsonify({
                    'success': False,
                    'message': f'LoE session {session_id} not found or has no data'
                }), 404
            
            # Get the LoE session object from database
            loaded_loe_session_data = result['loe_objects']
            
            # Generate a new session ID for in-memory storage
            new_session_id = generate_session_id()
            
            # Copy the loaded LoE session data to the global loe_session dictionary
            loe_session[new_session_id] = loaded_loe_session_data.copy()
            
            logger.info(f"✅ Successfully loaded LoE session {session_id} as new session {new_session_id}")
            logger.info(f"📊 Loaded LoE session structure: {json.dumps(loaded_loe_session_data, indent=2)}")
            
            # Redirect to LoE page with the new session ID and a flag indicating it's loaded
            return redirect(f'/loe?session_id={new_session_id}&loaded=true')
            
        except Exception as db_error:
            logger.error(f"💥 Database error loading LoE session: {str(db_error)}")
            return jsonify({
                'success': False,
                'message': f'Database error: {str(db_error)}'
            }), 500
            
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        logger.error(f"💥 Error loading LoE session: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error loading LoE session: {str(e)}"
        }), 500

@app.route('/loe/debug/<session_id>')
def loe_debug(session_id):
    """Debug route to view LoE session data."""
    if session_id in loe_session:
        return jsonify({
            'success': True,
            'session_id': session_id,
            'data': loe_session[session_id]
        })
    else:
        return jsonify({
            'success': False,
            'message': f'LoE session {session_id} not found',
            'available_sessions': list(loe_session.keys())
        }), 404

# Convert SoW to LoE route
@app.route('/convert-sow-to-loe', methods=['POST'])
def convert_sow_to_loe():
    """Convert SoW session to LoE using OpenAI assistant."""
    try:
        data = request.get_json()
        session_id = data.get('sessionId')
        
        if not session_id:
            return jsonify({
                'success': False,
                'message': 'Session ID is required'
            }), 400
        
        logger.info(f"🔄 Converting SoW → LoE for session {session_id}")
        
        # Get session data from database
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        try:
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            cursor.execute(
                "SELECT sow_objects FROM ai_architecture_sessions WHERE id = %s",
                (session_id,)
            )
            
            result = cursor.fetchone()
            if not result or not result['sow_objects']:
                return jsonify({
                    'success': False,
                    'message': f'Session {session_id} not found or has no SoW data'
                }), 404
            
            sow_objects = result['sow_objects']
            logger.info(f"📊 Retrieved SoW objects for LoE conversion")
            
            # Extract all SoW data for LoE generation
            sow_content = extract_sow_content(sow_objects)
            
            if not sow_content:
                return jsonify({
                    'success': False,
                    'message': 'No SoW content found for LoE conversion'
                }), 400
            
            logger.info(f"📝 Extracted SoW content for LoE generation")
            
            # Generate LoE using OpenAI assistant
            logger.info("🤖 Generating LoE with OpenAI assistant...")
            loe_content = generate_loe_with_openai_assistant(sow_content)
            
            # Create LoE JSON structure
            loe_objects = create_loe_structure(sow_objects, loe_content)
            
            # Save to database
            logger.info(f"💾 Saving LoE objects to database for session {session_id}")
            cursor.execute(
                "UPDATE ai_architecture_sessions SET loe_objects = %s WHERE id = %s",
                (json.dumps(loe_objects), session_id)
            )
            conn.commit()
            
            logger.info(f"✅ Successfully converted SoW → LoE for session {session_id}")
            
            return jsonify({
                'success': True,
                'message': 'Successfully converted SoW → LoE',
                'loe_data': loe_objects
            })
            
        except Exception as db_error:
            logger.error(f"💥 Database error during SoW → LoE conversion: {str(db_error)}")
            return jsonify({
                'success': False,
                'message': f'Database error: {str(db_error)}'
            }), 500
            
        finally:
            cursor.close()
            conn.close()
        
    except Exception as e:
        logger.error(f"💥 Error converting SoW → LoE: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500


def extract_sow_content(sow_objects):
    """Extract all relevant content from SoW objects for LoE generation."""
    try:
        # Extract all SoW data except badge and basic (which will be preserved)
        sow_content = {}
        
        # Copy all fields except badge and basic
        for key, value in sow_objects.items():
            if key not in ['badge', 'basic']:
                sow_content[key] = value
        
        logger.info(f"📋 Extracted SoW content fields: {list(sow_content.keys())}")
        return sow_content
        
    except Exception as e:
        logger.error(f"💥 Error extracting SoW content: {str(e)}")
        return None


def compile_sow_content_for_loe(sow_content):
    """Compile all SoW content into a structured prompt for LoE generation."""
    try:
        compiled_parts = []
        
        # Project Information
        if sow_content.get('project'):
            compiled_parts.append(f"PROJECT: {sow_content['project']}")
        
        if sow_content.get('client'):
            compiled_parts.append(f"CLIENT: {sow_content['client']}")
        
        if sow_content.get('project_purpose_background'):
            compiled_parts.append(f"PROJECT PURPOSE & BACKGROUND:\n{sow_content['project_purpose_background']}")
        
        # Objectives
        if sow_content.get('objectives'):
            objectives_text = "\n".join([f"- {obj}" for obj in sow_content['objectives']])
            compiled_parts.append(f"OBJECTIVES:\n{objectives_text}")
        
        # In-Scope Deliverables
        if sow_content.get('in_scope_deliverables'):
            deliverables_text = ""
            for i, deliv in enumerate(sow_content['in_scope_deliverables'], 1):
                deliverables_text += f"{i}. {deliv.get('deliverable', 'N/A')}\n"
                if deliv.get('key_features'):
                    deliverables_text += f"   Key Features: {deliv['key_features']}\n"
                if deliv.get('primary_artifacts'):
                    deliverables_text += f"   Primary Artifacts: {deliv['primary_artifacts']}\n"
            compiled_parts.append(f"IN-SCOPE DELIVERABLES:\n{deliverables_text}")
        
        # Out of Scope
        if sow_content.get('out_of_scope'):
            compiled_parts.append(f"OUT OF SCOPE:\n{sow_content['out_of_scope']}")
        
        # Functional Requirements
        if sow_content.get('functional_requirements'):
            func_req_text = "\n".join([f"- {req}" for req in sow_content['functional_requirements']])
            compiled_parts.append(f"FUNCTIONAL REQUIREMENTS:\n{func_req_text}")
        
        # Non-Functional Requirements
        if sow_content.get('non_functional_requirements'):
            non_func_req_text = "\n".join([f"- {req}" for req in sow_content['non_functional_requirements']])
            compiled_parts.append(f"NON-FUNCTIONAL REQUIREMENTS:\n{non_func_req_text}")
        
        # Project Phases Timeline
        if sow_content.get('project_phases_timeline'):
            timeline = sow_content['project_phases_timeline']
            timeline_text = f"Timeline: {timeline.get('timeline_weeks', 'N/A')} weeks\n"
            
            if timeline.get('phases'):
                timeline_text += "Phases:\n"
                for phase in timeline['phases']:
                    timeline_text += f"- {phase.get('phase', 'N/A')} ({phase.get('weeks_display', 'N/A')})\n"
                    if phase.get('key_activities'):
                        timeline_text += f"  Activities: {phase['key_activities']}\n"
            
            compiled_parts.append(f"PROJECT PHASES TIMELINE:\n{timeline_text}")
        
        # Combine all parts
        compiled_content = "\n" + "="*80 + "\n" + "\n\n".join(compiled_parts) + "\n" + "="*80 + "\n"
        
        logger.info(f"📝 Compiled SoW content length: {len(compiled_content)} characters")
        return compiled_content
        
    except Exception as e:
        logger.error(f"💥 Error compiling SoW content: {str(e)}")
        return ""


def generate_loe_with_openai_assistant(sow_content):
    """Generate LoE using OpenAI assistant with high token limit."""
    try:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            logger.error("OPENAI_API_KEY environment variable not found")
            raise Exception("OpenAI API key not configured")
        
        # Initialize OpenAI client
        client = OpenAI(api_key=api_key)
        
        # Compile all SoW data into prompt
        compiled_content = compile_sow_content_for_loe(sow_content)
        
        logger.info(f"📝 Compiled SoW content length: {len(compiled_content)} characters")
        
        # Assistant ID for LoE generation
        assistant_id = "asst_GcLCuJFtYj3CmUlwjISK4XW5"
        
        logger.info(f"🤖 Creating thread and running assistant {assistant_id} for LoE generation")
        
        # Create thread
        thread = client.beta.threads.create()
        
        # Create comprehensive prompt for LoE generation
        loe_prompt = f"""Generate a comprehensive Level of Effort (LoE) based on this Statement of Work:

{compiled_content}

Please analyze all the provided SoW data and create a detailed Level of Effort estimation. Return a JSON object with this exact structure:

{{
    "basic": {{
        "project": "Project name from SoW",
        "client": "Client name from SoW", 
        "prepared_by": "Dry Ground Partners",
        "date": "{datetime.datetime.now().strftime('%Y-%m-%d')}"
    }},
    "overview": "Detailed project overview based on the SoW purpose and background",
    "workstreams": [
        {{
            "workstream": "Workstream Name",
            "activities": "Key activities description",
            "duration": 4
        }}
    ],
    "resources": [
        {{
            "role": "Role Name",
            "personWeeks": 2.5,
            "personHours": 100
        }}
    ],
    "buffer": {{
        "weeks": 1.0,
        "hours": 40
    }},
    "assumptions": [
        "Key assumption 1",
        "Key assumption 2"
    ]
}}

Requirements:
1. Generate realistic workstreams based on the SoW deliverables and phases
2. Include 4-8 workstreams with specific activities and durations
3. Create resource allocation for 5-10 different roles
4. Calculate person-weeks and person-hours realistically (20 hours per week)
5. Include buffer margin of 10-20% of total effort
6. Add 5-8 key project assumptions
7. Make the content detailed and specific to the SoW provided
8. Ensure all durations and efforts are realistic for the project scope
9. Return ONLY the JSON object, no additional text

Base the LoE on the SoW timeline of {sow_content.get('project_phases_timeline', {}).get('timeline_weeks', '12')} weeks and scale accordingly."""
        
        # Log the prompt for debugging
        logger.info("🔍 LoE Generation Prompt:")
        logger.info("="*80)
        logger.info(loe_prompt)
        logger.info("="*80)
        
        # Add message to thread
        client.beta.threads.messages.create(
            thread_id=thread.id,
            role="user",
            content=loe_prompt
        )
        
        # Run assistant
        run = client.beta.threads.runs.create(
            thread_id=thread.id,
            assistant_id=assistant_id
        )
        
        # Wait for completion with extended timeout
        logger.info(f"⏳ Assistant run started with ID: {run.id}, waiting for completion...")
        loe_content = wait_for_loe_completion(client, thread.id, run.id, max_wait_time=300)
        
        logger.info("✅ Successfully generated LoE content with OpenAI assistant")
        return loe_content
        
    except Exception as e:
        logger.error(f"💥 Error generating LoE with assistant: {str(e)}")
        raise Exception(f"LoE generation failed: {str(e)}")


def wait_for_loe_completion(client, thread_id, run_id, max_wait_time=300):
    """Wait for assistant run completion and extract LoE content."""
    import time
    
    start_time = time.time()
    poll_interval = 3  # Start with 3 second intervals
    
    while True:
        elapsed_time = time.time() - start_time
        
        if elapsed_time > max_wait_time:
            logger.error(f"Assistant run timed out after {max_wait_time} seconds")
            try:
                client.beta.threads.runs.cancel(thread_id=thread_id, run_id=run_id)
                logger.info("Cancelled the timed-out assistant run")
            except Exception as cancel_error:
                logger.warning(f"Could not cancel run: {cancel_error}")
            raise Exception(f"Assistant run timed out after {max_wait_time} seconds. Please try again.")
        
        # Increase polling interval after 60 seconds
        if elapsed_time > 60:
            poll_interval = 5
        
        try:
            run = client.beta.threads.runs.retrieve(thread_id=thread_id, run_id=run_id)
            logger.debug(f"Assistant status: {run.status}, elapsed: {elapsed_time:.1f}s")
            
            if run.status == 'completed':
                logger.info(f"🎉 Assistant run completed successfully after {elapsed_time:.1f}s")
                break
            elif run.status in ['failed', 'cancelled', 'expired']:
                error_msg = f"Assistant run ended with status: {run.status}"
                if hasattr(run, 'last_error') and run.last_error:
                    error_msg += f". Error: {run.last_error}"
                logger.error(error_msg)
                raise Exception(error_msg)
            elif run.status in ['queued', 'in_progress', 'cancelling']:
                time.sleep(poll_interval)
                continue
            else:
                logger.warning(f"Unknown run status: {run.status}, continuing to wait...")
                time.sleep(poll_interval)
                continue
                
        except Exception as retrieve_error:
            logger.error(f"Error retrieving run status: {retrieve_error}")
            raise Exception(f"Could not check assistant status: {str(retrieve_error)}")
    
    # Retrieve and extract the response
    try:
        messages = client.beta.threads.messages.list(thread_id=thread_id)
        
        for message in messages.data:
            if message.role == 'assistant':
                content = ""
                for content_block in message.content:
                    if content_block.type == 'text':
                        content += content_block.text.value
                
                if content.strip():
                    logger.info("📄 Successfully extracted LoE content from assistant response")
                    return parse_loe_json(content.strip())
        
        raise Exception("No assistant response found in thread")
        
    except Exception as messages_error:
        logger.error(f"Error retrieving messages: {messages_error}")
        raise Exception(f"Could not retrieve assistant response: {str(messages_error)}")


def parse_loe_json(content):
    """Parse and validate the LoE JSON content from assistant response."""
    try:
        # Try to extract JSON from the content if it's wrapped in text
        content = content.strip()
        
        # Look for JSON object in the content
        start_idx = content.find('{')
        end_idx = content.rfind('}')
        
        if start_idx != -1 and end_idx != -1:
            json_content = content[start_idx:end_idx + 1]
            loe_data = json.loads(json_content)
            
            # Validate required fields
            required_fields = ['basic', 'overview', 'workstreams', 'resources']
            for field in required_fields:
                if field not in loe_data:
                    logger.warning(f"Missing required field: {field}")
                    if field == 'basic':
                        loe_data[field] = {
                            "project": "Generated Project",
                            "client": "Client Name",
                            "prepared_by": "Dry Ground Partners",
                            "date": datetime.datetime.now().strftime('%Y-%m-%d')
                        }
                    elif field == 'overview':
                        loe_data[field] = "Generated project overview"
                    elif field == 'workstreams':
                        loe_data[field] = []
                    elif field == 'resources':
                        loe_data[field] = []
            
            logger.info("✅ Successfully parsed and validated LoE JSON")
            return loe_data
        else:
            raise ValueError("No valid JSON object found in response")
            
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error: {str(e)}")
        logger.error(f"Content that failed to parse: {content[:500]}...")
        raise Exception(f"Failed to parse LoE JSON: {str(e)}")
    except Exception as e:
        logger.error(f"Error parsing LoE content: {str(e)}")
        raise Exception(f"Failed to process LoE content: {str(e)}")


def create_loe_structure(sow_objects, loe_content):
    """Create final LoE structure with preserved badge and basic from SoW."""
    try:
        # Ensure loe_content is a dictionary
        if isinstance(loe_content, str):
            loe_data = json.loads(loe_content)
        else:
            loe_data = loe_content
        
        # Preserve badge from original SoW session
        loe_objects = {
            "badge": sow_objects.get("badge", {
                "created-at": datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                "row": 0,
                "glyph": "generated"
            })
        }
        
        # Use basic info from generated LoE content (which should match SoW)
        # but preserve original basic if LoE doesn't have it
        if loe_data.get('basic'):
            loe_objects["basic"] = loe_data['basic']
        else:
            loe_objects["basic"] = sow_objects.get("basic", {})
        
        # Merge generated LoE content (excluding basic since we handled it above)
        for key, value in loe_data.items():
            if key != 'basic':
                loe_objects[key] = value
        
        # Update badge date to current timestamp
        loe_objects["badge"]["created-at"] = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        logger.info("✅ Successfully created LoE structure with preserved metadata")
        return loe_objects
        
    except Exception as e:
        logger.error(f"Error creating LoE structure: {str(e)}")
        raise Exception(f"Failed to create LoE structure: {str(e)}")

@app.route('/convert-visual-to-solution', methods=['POST'])
def convert_visual_to_solution():
    """Convert a visual session to solution session format."""
    try:
        data = request.get_json()
        session_id = data.get('sessionId')
        
        if not session_id:
            return jsonify({
                'success': False,
                'message': 'Session ID is required'
            }), 400
        
        logger.info(f"🔄 Converting Visual → Solution for session: {session_id}")
        
        # Get database connection
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        try:
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            # Fetch the visual_assets_json data
            cursor.execute(
                "SELECT visual_assets_json FROM ai_architecture_sessions WHERE id = %s",
                (session_id,)
            )
            
            result = cursor.fetchone()
            
            if not result or not result['visual_assets_json']:
                return jsonify({
                    'success': False,
                    'message': f'No visual assets found for session {session_id}'
                }), 404
            
            visual_data = result['visual_assets_json']
            logger.info(f"📊 Source visual_assets_json structure: {json.dumps(visual_data, indent=2)}")
            
            # Validate visual data has required fields
            if not visual_data.get('basic', {}).get('title'):
                return jsonify({
                    'success': False,
                    'message': 'Visual session must have a title'
                }), 400
            
            if not visual_data.get('diagrams') or len(visual_data['diagrams']) == 0:
                return jsonify({
                    'success': False,
                    'message': 'Visual session must have at least one diagram'
                }), 400
            
            # Start building solution session data
            solution_data = {}
            
            # 1. Copy and update badge identifier
            solution_data['badge'] = visual_data.get('badge', {}).copy()
            solution_data['badge']['created-at'] = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            # 2. Build basic information
            visual_basic = visual_data.get('basic', {})
            solution_data['basic'] = {
                'date': datetime.datetime.now().strftime('%Y-%m-%d'),
                'title': visual_basic.get('title', ''),
                'engineer': 'John Rockstar Engineer',
                'prepared_for': visual_basic.get('client', '')
            }
            
            # 3. Set solution counters
            diagrams = visual_data.get('diagrams', [])
            solution_data['current_solution'] = 1
            solution_data['solution_count'] = len(diagrams)
            
            logger.info(f"🔄 Processing {len(diagrams)} diagrams into solutions")
            
            # 4. Process each diagram into a solution
            for i, diagram in enumerate(diagrams, 1):
                solution_key = f'solution_{i}'
                logger.info(f"📋 Processing diagram {diagram.get('id', i)} into {solution_key}")
                
                try:
                    # Process this diagram into a solution
                    solution_data[solution_key] = process_diagram_to_solution(diagram, i)
                    logger.info(f"✅ Successfully processed {solution_key}")
                    
                except Exception as diagram_error:
                    logger.error(f"❌ Error processing diagram {i}: {str(diagram_error)}")
                    # Create a fallback solution structure
                    solution_data[solution_key] = {
                        "additional": {},
                        "variables": {
                            "ai_analysis": f"Error processing diagram {i}: {str(diagram_error)}",
                            "solution_explanation": diagram.get('ideation', '')
                        },
                        "structure": {
                            "title": f"Solution {i}",
                            "steps": "Error occurred during processing",
                            "approach": "Manual review required",
                            "difficulty": 50,
                            "layout": 1,
                            "stack": ""
                        }
                    }
            
            # Update the database with the new solution session data
            cursor.execute(
                "UPDATE ai_architecture_sessions SET session_objects = %s WHERE id = %s",
                (json.dumps(solution_data), session_id)
            )
            
            # Commit the transaction
            conn.commit()
            
            logger.info(f"✅ Successfully converted Visual → Solution for session {session_id}")
            logger.info(f"📊 Created {len(diagrams)} solutions")
            
            return jsonify({
                'success': True,
                'message': f'Successfully converted Visual → Solution for session {session_id}',
                'solution_count': len(diagrams),
                'solution_data': solution_data
            })
            
        except Exception as db_error:
            conn.rollback()
            logger.error(f"💥 Database error in Visual → Solution conversion: {str(db_error)}")
            return jsonify({
                'success': False,
                'message': f'Database error: {str(db_error)}'
            }), 500
            
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        logger.error(f"💥 Error in Visual → Solution conversion: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Error in Visual → Solution conversion: {str(e)}"
        }), 500


def process_diagram_to_solution(diagram, solution_number):
    """Process a single diagram into a solution object."""
    from utils.image_analysis import analyze_image_with_openai
    from utils.vision_api import structure_solution_with_openai, generate_stack_analysis_with_openai
    
    logger.info(f"🔄 Processing diagram {diagram.get('id', solution_number)} into solution")
    
    # Initialize solution structure
    solution = {
        "additional": {},
        "variables": {},
        "structure": {
            "stack": ""
        }
    }
    
    # Get ideation content as solution explanation
    ideation_content = diagram.get('ideation', '')
    if not ideation_content:
        ideation_content = f"Solution {solution_number} from visual diagram"
    
    ai_analysis = ""
    image_data_url = ""
    
    # Process image if available
    image_data = diagram.get('image', '')
    if image_data and image_data.strip():
        try:
            logger.info(f"📸 Processing image for solution {solution_number}")
            
            # Create base64 data URL (ensure proper format)
            if image_data.startswith('data:image'):
                # Already a data URL
                image_data_url = image_data
            else:
                # Raw base64, add data URL prefix
                image_data_url = f"data:image/png;base64,{image_data}"
            
            # Store the base64 data URL in additional.image_link
            solution["additional"]["image_link"] = image_data_url
            
            # Analyze the image using base64 data URL directly
            ai_analysis = analyze_image_with_openai(image_url=image_data_url)
            
            if ai_analysis and not ai_analysis.startswith("Error"):
                logger.info(f"✅ Image analyzed successfully for solution {solution_number}")
            else:
                logger.warning(f"⚠️ Image analysis failed for solution {solution_number}: {ai_analysis}")
                ai_analysis = f"Image analysis failed: {ai_analysis}"
                
        except Exception as image_error:
            logger.error(f"❌ Error processing image for solution {solution_number}: {str(image_error)}")
            ai_analysis = f"Error processing image: {str(image_error)}"
    
    # Store ideation in additional.explanation (following the normal pattern)
    solution["additional"]["explanation"] = ideation_content
    
    # If no image or image processing failed, use ideation as analysis
    if not ai_analysis:
        ai_analysis = ideation_content
    
    # Store variables (solution_explanation uses ideation, ai_analysis from image)
    solution["variables"] = {
        "ai_analysis": ai_analysis,
        "solution_explanation": ideation_content
    }
    
    # Structure the solution using OpenAI
    try:
        logger.info(f"🤖 Structuring solution {solution_number} with OpenAI")
        structured_response = structure_solution_with_openai(ai_analysis, ideation_content)
        
        # Generate stack analysis
        stack_analysis = ""
        try:
            # Pass the base64 data URL for stack analysis if available
            stack_analysis = generate_stack_analysis_with_openai(ai_analysis, ideation_content, image_data_url)
        except Exception as stack_error:
            logger.error(f"Error generating stack analysis for solution {solution_number}: {str(stack_error)}")
            stack_analysis = ""
        
        # Build structure
        solution["structure"] = {
            "title": structured_response.get('title', f'Solution {solution_number}'),
            "steps": structured_response.get('steps', ''),
            "approach": structured_response.get('approach', ''),
            "difficulty": structured_response.get('difficulty', 50),
            "layout": 1,  # Default layout
            "stack": stack_analysis
        }
        
        logger.info(f"✅ Successfully structured solution {solution_number}")
        
    except Exception as structure_error:
        logger.error(f"❌ Error structuring solution {solution_number}: {str(structure_error)}")
        
        # Fallback structure
        solution["structure"] = {
            "title": f"Solution {solution_number}",
            "steps": ideation_content,
            "approach": "Manual review required due to processing error",
            "difficulty": 50,
            "layout": 1,
            "stack": ""
        }
    
    return solution


def convert_base64_to_file(base64_data):
    """Convert base64 image data to file-like object."""
    try:
        # Remove data URL prefix if present
        if ',' in base64_data:
            base64_data = base64_data.split(',')[1]
        
        # Decode base64
        image_bytes = base64.b64decode(base64_data)
        
        # Create file-like object
        image_file = io.BytesIO(image_bytes)
        
        # Set required attributes for upload_to_imgbb
        image_file.filename = 'diagram_image.png'
        image_file.content_type = 'image/png'
        
        # Reset file pointer to beginning
        image_file.seek(0)
        
        return image_file
        
    except Exception as e:
        logger.error(f"Error converting base64 to file: {str(e)}")
        return None

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
