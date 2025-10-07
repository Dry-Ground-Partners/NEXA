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
    
    # Extract solutions - handle both dict and list formats
    solutions = []
    solutions_data = session_data.get('solutions', {})
    
    if isinstance(solutions_data, dict):
        # Convert dict to list
        for sol_id, solution in solutions_data.items():
            if not isinstance(solution, dict):
                continue
            
            structure = solution.get('structure', {})
            additional = solution.get('additional', {})
            
            # Handle imageData that might have data URI prefix
            image_data = additional.get('imageData', '')
            if image_data and image_data.startswith('data:image/'):
                # Keep full data URI for img src
                pass
            
            solutions.append({
                'number': len(solutions) + 1,
                'title': structure.get('title', 'Untitled Solution'),
                'steps': structure.get('steps', ''),
                'approach': structure.get('approach', ''),
                'difficulty': structure.get('difficulty', 0),
                'layout': structure.get('layout', 1),
                'image_data': image_data
            })
    elif isinstance(solutions_data, list):
        # Already a list
        for i, solution in enumerate(solutions_data):
            image_data = solution.get('imageData', '')
            solutions.append({
                'number': i + 1,
                'title': solution.get('title', 'Untitled Solution'),
                'steps': solution.get('steps', ''),
                'approach': solution.get('approach', ''),
                'difficulty': solution.get('difficulty', 0),
                'layout': solution.get('layout', 1),
                'image_data': image_data
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
    
    # Escape HTML entities in text content
    def escape_html(text):
        if not text:
            return ''
        return (str(text)
                .replace('&', '&amp;')
                .replace('<', '&lt;')
                .replace('>', '&gt;')
                .replace('"', '&quot;')
                .replace('\n', '<br>'))
    
    # Build solutions HTML
    solutions_html = []
    for sol in solutions:
        sol_html = f'''
        <div class="solution" style="page-break-before: {'always' if sol['number'] > 1 else 'auto'};">
            <div class="solution-title">Solution {sol['number']}: {escape_html(sol['title'])}</div>
            <div class="solution-content">
                <strong>Steps:</strong>
                <p>{escape_html(sol['steps'])}</p>
            </div>
            <div class="solution-content">
                <strong>Approach:</strong>
                <p>{escape_html(sol['approach'])}</p>
            </div>
            <div class="solution-content">
                <strong>Difficulty:</strong> {sol['difficulty']}%
            </div>
        '''
        
        # Add image if present
        if sol['image_data']:
            sol_html += f'''
            <div class="solution-image">
                <img src="{sol['image_data']}" style="max-width: 100%; height: auto; margin-top: 20px;">
            </div>
            '''
        
        sol_html += '</div>'
        solutions_html.append(sol_html)
    
    # Logo HTML
    logo_html = ''
    if main_logo_base64:
        logo_src = main_logo_base64 if main_logo_base64.startswith('data:') else f'data:image/png;base64,{main_logo_base64}'
        logo_html = f'<img src="{logo_src}" style="max-width: 200px; max-height: 80px; margin-bottom: 20px;">'
    
    # Build complete HTML
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
                line-height: 1.6;
            }}
            .header {{
                text-align: center;
                margin-bottom: 40px;
            }}
            .title {{
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 20px;
                color: #2c3e50;
            }}
            .meta {{
                font-size: 12px;
                color: #666;
                margin-bottom: 10px;
            }}
            .solution {{
                margin: 30px 0;
            }}
            .solution-title {{
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 15px;
                color: #2c3e50;
                border-bottom: 2px solid #3498db;
                padding-bottom: 5px;
            }}
            .solution-content {{
                margin-bottom: 15px;
            }}
            .solution-content p {{
                margin: 5px 0;
                white-space: pre-wrap;
            }}
            .solution-image {{
                margin-top: 20px;
                text-align: center;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            {logo_html}
            <div class="title">{formatted_title}</div>
            <div class="meta">Prepared for: {escape_html(recipient)}</div>
            <div class="meta">Date: {formatted_date}</div>
            <div class="meta">Engineer: {escape_html(engineer)}</div>
        </div>
        
        {''.join(solutions_html)}
        
        <div style="margin-top: 50px; text-align: center; font-size: 10px; color: #999;">
            Session ID: {session_protocol} | Generated by NEXA Platform
        </div>
    </body>
    </html>
    """
    
    return html_template
