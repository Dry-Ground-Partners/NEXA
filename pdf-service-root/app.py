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
        
        # Use ORIGINAL PDF generation function
        pdf_bytes = generate_solutioning_pdf_from_json(data)
        
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
