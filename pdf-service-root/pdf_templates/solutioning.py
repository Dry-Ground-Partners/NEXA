"""
Solutioning PDF Template Generator
Extracts HTML generation logic for Flask microservice
"""

import base64
import datetime
import os
from jinja2 import Template


def generate_solutioning_html(data):
    """
    Generate HTML for solutioning PDF
    Args:
        data: Dict with sessionData, sessionId, and optional logos
    Returns:
        HTML string ready for WeasyPrint
    """
    session_data = data.get('sessionData', {})
    session_id = data.get('sessionId', 'UNKNOWN')
    
    # Extract logos if provided (from organization preferences)
    main_logo_base64 = data.get('mainLogo', '')
    dg_logo_base64 = data.get('secondLogo', '')
    
    # If no logos provided, use placeholders
    if not main_logo_base64:
        # TODO: Load default logo from filesystem if needed
        main_logo_base64 = ''
    
    if not dg_logo_base64:
        dg_logo_base64 = ''
    
    # Extract basic info
    basic = session_data.get('basic', {})
    title = basic.get('title', 'Untitled Project')
    engineer = basic.get('engineer', 'Unknown Engineer')
    recipient = basic.get('recipient', 'Unknown Client')
    date = basic.get('date', datetime.datetime.now().strftime('%Y-%m-%d'))
    
    # Format date
    try:
        date_obj = datetime.datetime.strptime(date, '%Y-%m-%d')
        formatted_date = date_obj.strftime('%B %d, %Y')
    except:
        formatted_date = date
    
    # Extract solutions
    solutions = []
    solutions_data = session_data.get('solutions', {})
    
    for sol_id, solution in solutions_data.items():
        if not isinstance(solution, dict):
            continue
        
        structure = solution.get('structure', {})
        additional = solution.get('additional', {})
        
        solutions.append({
            'number': len(solutions) + 1,
            'title': structure.get('title', 'Untitled Solution'),
            'steps': structure.get('steps', ''),
            'approach': structure.get('approach', ''),
            'difficulty': structure.get('difficulty', 0),
            'layout': structure.get('layout', 1),
            'image_data': additional.get('imageData', '')
        })
    
    total_solutions = len(solutions)
    is_multi_solution = total_solutions > 1
    
    # Format title with line breaks
    if ':' in title:
        parts = title.split(':', 1)
        formatted_title = f"{parts[0]}:<br>{parts[1].strip()}"
    else:
        formatted_title = title
    
    # Generate session protocol
    session_protocol = session_id.split('-')[0].upper() if '-' in session_id else 'SH123'
    
    # Render template (using simplified inline template for now)
    # Full template logic from generate_solutioning_standalone.py should be here
    # For brevity, using simplified version - EXPAND THIS WITH FULL TEMPLATE
    
    html_template = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>PDF Report - {title}</title>
        <style>
            @page {{
                size: A4;
                margin: 2cm;
            }}
            body {{
                font-family: Arial, Helvetica, sans-serif;
                margin: 0;
                padding: 0;
                color: #000;
            }}
            .header {{
                text-align: center;
                margin-bottom: 30px;
            }}
            .title {{
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 20px;
            }}
            .meta {{
                font-size: 12px;
                color: #666;
                margin-bottom: 10px;
            }}
            .solution {{
                margin: 30px 0;
                page-break-before: always;
            }}
            .solution-title {{
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 15px;
            }}
            .solution-content {{
                margin-bottom: 15px;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <div class="title">{formatted_title}</div>
            <div class="meta">Prepared for: {recipient}</div>
            <div class="meta">Date: {formatted_date}</div>
            <div class="meta">Engineer: {engineer}</div>
        </div>
        
        {''.join([f'''
        <div class="solution">
            <div class="solution-title">Solution {sol['number']}: {sol['title']}</div>
            <div class="solution-content">
                <strong>Steps:</strong>
                <p>{sol['steps']}</p>
            </div>
            <div class="solution-content">
                <strong>Approach:</strong>
                <p>{sol['approach']}</p>
            </div>
            <div class="solution-content">
                <strong>Difficulty:</strong> {sol['difficulty']}%
            </div>
        </div>
        ''' for sol in solutions])}
    </body>
    </html>
    """
    
    return html_template


# NOTE: This is a simplified version. The full template from
# generate_solutioning_standalone.py (800+ lines) should be copied here
# for production use to maintain pixel-perfect formatting
