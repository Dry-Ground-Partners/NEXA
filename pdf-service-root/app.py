#!/usr/bin/env python3
"""
NEXA PDF Generation Microservice
Uses ORIGINAL PDF generation modules from pdf-service/
Deployed as separate Render Web Service
"""

from flask import Flask, request, jsonify, send_file
from weasyprint import HTML, CSS
import os
import sys
import json
import datetime
import logging
from io import BytesIO

# Add pdf-service to path to import original modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'pdf-service'))

# Import ORIGINAL PDF generation functions
from generate_solutioning_standalone import generate_solutioning_pdf_from_json
from generate_loe_standalone import generate_loe_pdf_from_json
from generate_sow_standalone import generate_sow_pdf_from_json
from generate_solutioning_html import generate_solutioning_html_from_json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# CORS handling for Next.js app
@app.after_request
def after_request(response):
    origin = request.headers.get('Origin')
    # Allow requests from your Next.js app domain
    allowed_origins = [
        'http://localhost:3000',
        'https://nexa-tlje.onrender.com',  # Your main app
        os.getenv('ALLOWED_ORIGIN', '')
    ]
    
    if origin in allowed_origins:
        response.headers.add('Access-Control-Allow-Origin', origin)
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
    
    return response

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for Render"""
    return jsonify({
        'status': 'healthy',
        'service': 'nexa-pdf-generator',
        'weasyprint_version': '62.3',
        'timestamp': datetime.datetime.now().isoformat()
    }), 200

@app.route('/api/generate-pdf', methods=['POST', 'OPTIONS'])
def generate_pdf():
    """
    Generate PDF from HTML template
    Accepts: { "htmlTemplate": "<html>...</html>" }
    Returns: PDF binary
    """
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.get_json()
        
        if not data or 'htmlTemplate' not in data:
            logger.error('Missing htmlTemplate in request')
            return jsonify({'error': 'Missing htmlTemplate field'}), 400
        
        html_template = data['htmlTemplate']
        logger.info(f'Generating PDF from HTML template, length: {len(html_template)} characters')
        
        # Sanitize HTML to fix WeasyPrint compatibility issues
        # Remove problematic CSS properties that cause "Layout for TextBox" errors
        import re
        
        # Save original for debugging
        if len(html_template) < 50000:
            with open('/tmp/maestro_modified_original.html', 'w', encoding='utf-8') as f:
                f.write(html_template)
            logger.info('Saved original modified HTML to /tmp/maestro_modified_original.html')
        
        # Replace problematic display modes
        html_template = html_template.replace('display: inline;', 'display: block;')
        html_template = html_template.replace('display: table-cell;', 'display: block;')
        html_template = html_template.replace('display: inline-flex;', 'display: flex;')
        
        # Remove any orphaned TextBox-like elements (shouldn't exist, but just in case)
        html_template = re.sub(r'<textbox[^>]*>.*?</textbox>', '', html_template, flags=re.IGNORECASE | re.DOTALL)
        
        # Save sanitized for debugging
        if len(html_template) < 50000:
            with open('/tmp/maestro_modified_sanitized.html', 'w', encoding='utf-8') as f:
                f.write(html_template)
            logger.info('Saved sanitized HTML to /tmp/maestro_modified_sanitized.html')
        
        logger.info(f'Sanitized HTML template for WeasyPrint compatibility')
        
        # Convert HTML to PDF using WeasyPrint
        html_doc = HTML(string=html_template)
        pdf_bytes = html_doc.write_pdf()
        
        logger.info(f'PDF generated successfully, size: {len(pdf_bytes)} bytes')
        
        # Return PDF as binary
        return send_file(
            BytesIO(pdf_bytes),
            mimetype='application/pdf',
            as_attachment=False,
            download_name='document.pdf'
        )
        
    except Exception as e:
        logger.error(f'Error generating PDF: {str(e)}', exc_info=True)
        return jsonify({'error': f'PDF generation failed: {str(e)}'}), 500

@app.route('/api/generate-solutioning-html', methods=['POST', 'OPTIONS'])
def generate_solutioning_html():
    """
    Generate Solutioning HTML from structured data (for Maestro editing)
    Uses generate_solutioning_html.py module
    Returns: HTML template as text
    """
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.get_json()
        logger.info('Generating Solutioning HTML from structured data')
        
        # Same transformation as PDF endpoint
        session_data = data.get('sessionData', {})
        session_id = data.get('sessionId', 'UNKNOWN')
        
        solutions = session_data.get('solutions', {})
        if isinstance(solutions, dict):
            solutions_array = []
            for sol_id, solution in solutions.items():
                if not isinstance(solution, dict):
                    continue
                
                structure = solution.get('structure', {})
                additional = solution.get('additional', {})
                
                layout = structure.get('layout', 1)
                if isinstance(layout, str):
                    layout = 1 if layout == 'TextBox' else int(layout) if layout.isdigit() else 1
                
                image_data = additional.get('imageData', '')
                if image_data and image_data.startswith('data:image/'):
                    image_data = image_data.split(',', 1)[1] if ',' in image_data else image_data
                
                solutions_array.append({
                    'title': structure.get('title', 'Untitled Solution'),
                    'steps': structure.get('steps', ''),
                    'approach': structure.get('approach', ''),
                    'difficulty': structure.get('difficulty', 0),
                    'layout': layout,
                    'imageData': image_data
                })
            
            solutions = solutions_array
        
        merged_data = {
            'basic': session_data.get('basic', {}),
            'solutions': solutions,
            'sessionProtocol': session_id.split('-')[0].upper() if '-' in session_id else 'SH123'
        }
        
        logger.info(f'Generating HTML for {len(solutions)} solutions')
        
        # Generate HTML using the same function as the standalone script
        html_content = generate_solutioning_html_from_json(merged_data)
        
        if not html_content:
            raise Exception('HTML generation returned empty content')
        
        logger.info(f'HTML generated successfully, length: {len(html_content)} characters')
        
        # Return HTML as plain text
        return html_content, 200, {'Content-Type': 'text/html; charset=utf-8'}
        
    except Exception as e:
        logger.error(f'Error generating HTML: {str(e)}', exc_info=True)
        return jsonify({'error': f'HTML generation failed: {str(e)}'}), 500


@app.route('/api/generate-solutioning-pdf', methods=['POST', 'OPTIONS'])
def generate_solutioning_pdf():
    """
    Generate Solutioning PDF from structured data
    Uses ORIGINAL generate_solutioning_standalone.py module
    """
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.get_json()
        logger.info('Generating Solutioning PDF from structured data')
        
        # Transform data format: Client sends separate, module expects merged
        session_data = data.get('sessionData', {})
        session_id = data.get('sessionId', 'UNKNOWN')
        main_logo = data.get('mainLogo', '')
        second_logo = data.get('secondLogo', '')
        
        # Fix duplicate data URI prefix
        if main_logo and main_logo.startswith('data:image/'):
            # Extract just base64 part after comma
            main_logo = main_logo.split(',', 1)[1] if ',' in main_logo else main_logo
        
        if second_logo and second_logo.startswith('data:image/'):
            # Extract just base64 part after comma
            second_logo = second_logo.split(',', 1)[1] if ',' in second_logo else second_logo
        
        # Transform solutions from dict to array if needed
        solutions = session_data.get('solutions', {})
        if isinstance(solutions, dict):
            # Convert dict to array format expected by module
            solutions_array = []
            for sol_id, solution in solutions.items():
                if not isinstance(solution, dict):
                    continue
                
                structure = solution.get('structure', {})
                additional = solution.get('additional', {})
                
                # Fix layout: convert "TextBox" or other strings to numeric
                layout = structure.get('layout', 1)
                if isinstance(layout, str):
                    if layout == 'TextBox':
                        layout = 1  # Default to layout 1
                    else:
                        try:
                            layout = int(layout)
                        except:
                            layout = 1
                
                # Fix imageData: strip data URI prefix if present
                image_data = additional.get('imageData', '')
                if image_data and image_data.startswith('data:image/'):
                    # Extract just base64 part after comma
                    image_data = image_data.split(',', 1)[1] if ',' in image_data else image_data
                
                solutions_array.append({
                    'title': structure.get('title', 'Untitled Solution'),
                    'steps': structure.get('steps', ''),
                    'approach': structure.get('approach', ''),
                    'difficulty': structure.get('difficulty', 0),
                    'layout': layout,
                    'imageData': image_data  # Base64 only, no prefix
                })
            
            solutions = solutions_array
        
        # Merge into format expected by original module
        merged_data = {
            'basic': session_data.get('basic', {}),
            'solutions': solutions,
            'sessionProtocol': session_id.split('-')[0].upper() if '-' in session_id else 'SH123',
            'sessionId': session_id,  # Full session ID for footer
            'mainLogo': main_logo,  # Base64 only, no data URI prefix
            'secondLogo': second_logo  # Base64 only, no data URI prefix
        }
        
        logger.info(f'Transformed data: {len(solutions)} solutions, layout types: {[s.get("layout") for s in solutions[:5]]}')
        
        # DEBUG: Log full merged data structure (truncated)
        logger.info(f'DEBUG - Full merged data structure:')
        logger.info(f'  - basic: {merged_data.get("basic")}')
        logger.info(f'  - sessionProtocol: {merged_data.get("sessionProtocol")}')
        logger.info(f'  - mainLogo length: {len(merged_data.get("mainLogo", ""))}')
        logger.info(f'  - secondLogo length: {len(merged_data.get("secondLogo", ""))}')
        logger.info(f'  - solutions count: {len(merged_data.get("solutions", []))}')
        
        for i, sol in enumerate(merged_data.get("solutions", [])[:3]):
            logger.info(f'  - Solution {i+1}:')
            logger.info(f'      title: {sol.get("title")}')
            logger.info(f'      layout: {sol.get("layout")} (type: {type(sol.get("layout")).__name__})')
            logger.info(f'      difficulty: {sol.get("difficulty")}')
            logger.info(f'      imageData length: {len(sol.get("imageData", ""))}')
            logger.info(f'      imageData starts with: {sol.get("imageData", "")[:50]}...')
        
        # Use ORIGINAL PDF generation function with detailed error catching
        try:
            logger.info('Calling generate_solutioning_pdf_from_json...')
            pdf_bytes = generate_solutioning_pdf_from_json(merged_data)
            logger.info(f'generate_solutioning_pdf_from_json returned: {type(pdf_bytes)} with length {len(pdf_bytes) if pdf_bytes else 0}')
        except Exception as e:
            logger.error(f'EXCEPTION in generate_solutioning_pdf_from_json: {type(e).__name__}: {str(e)}')
            logger.error(f'Exception details:', exc_info=True)
            raise
        
        if not pdf_bytes:
            raise Exception('PDF generation returned None')
        
        logger.info(f'Solutioning PDF generated successfully, size: {len(pdf_bytes)} bytes')
        
        return send_file(
            BytesIO(pdf_bytes),
            mimetype='application/pdf',
            as_attachment=False,
            download_name='solutioning.pdf'
        )
        
    except Exception as e:
        logger.error(f'Error generating Solutioning PDF: {str(e)}', exc_info=True)
        return jsonify({'error': f'PDF generation failed: {str(e)}'}), 500

@app.route('/api/generate-sow-pdf', methods=['POST', 'OPTIONS'])
def generate_sow_pdf():
    """
    Generate SOW PDF from structured data
    Uses ORIGINAL generate_sow_standalone.py module
    """
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.get_json()
        logger.info('Generating SOW PDF from structured data')
        
        # Use ORIGINAL PDF generation function
        pdf_bytes = generate_sow_pdf_from_json(data)
        
        if not pdf_bytes:
            raise Exception('PDF generation returned None')
        
        logger.info(f'SOW PDF generated successfully, size: {len(pdf_bytes)} bytes')
        
        return send_file(
            BytesIO(pdf_bytes),
            mimetype='application/pdf',
            as_attachment=False,
            download_name='sow.pdf'
        )
        
    except Exception as e:
        logger.error(f'Error generating SOW PDF: {str(e)}', exc_info=True)
        return jsonify({'error': f'PDF generation failed: {str(e)}'}), 500

@app.route('/api/generate-loe-pdf', methods=['POST', 'OPTIONS'])
def generate_loe_pdf():
    """
    Generate LOE PDF from structured data
    Uses ORIGINAL generate_loe_standalone.py module
    """
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.get_json()
        logger.info('Generating LOE PDF from structured data')
        
        # Use ORIGINAL PDF generation function
        pdf_bytes = generate_loe_pdf_from_json(data)
        
        if not pdf_bytes:
            raise Exception('PDF generation returned None')
        
        logger.info(f'LOE PDF generated successfully, size: {len(pdf_bytes)} bytes')
        
        return send_file(
            BytesIO(pdf_bytes),
            mimetype='application/pdf',
            as_attachment=False,
            download_name='loe.pdf'
        )
        
    except Exception as e:
        logger.error(f'Error generating LOE PDF: {str(e)}', exc_info=True)
        return jsonify({'error': f'PDF generation failed: {str(e)}'}), 500

@app.route('/', methods=['GET'])
def index():
    """Root endpoint"""
    return jsonify({
        'service': 'NEXA PDF Generation Microservice',
        'status': 'running',
        'endpoints': {
            '/health': 'Health check',
            '/api/generate-pdf': 'Generate PDF from HTML template',
            '/api/generate-solutioning-pdf': 'Generate Solutioning PDF (ORIGINAL MODULE)',
            '/api/generate-sow-pdf': 'Generate SOW PDF (ORIGINAL MODULE)',
            '/api/generate-loe-pdf': 'Generate LOE PDF (ORIGINAL MODULE)'
        }
    }), 200

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    logger.info(f'Starting NEXA PDF Microservice on port {port}')
    logger.info(f'Using ORIGINAL PDF generation modules from pdf-service/')
    app.run(host='0.0.0.0', port=port, debug=False)
