#!/usr/bin/env python3

import json
import sys
import os
import base64
import datetime
from weasyprint import HTML
from jinja2 import Template

def generate_solutioning_pdf_from_json(solutioning_data):
    """Generate Solutioning PDF from JSON data and return PDF bytes."""
    try:
        # Logo handling - PHASE 4: Use organization logos from database
        curr_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Check if organization logos are provided in the JSON
        # mainLogo is for cover page, secondLogo is for page headers
        main_logo_from_db = solutioning_data.get('mainLogo', '')
        second_logo_from_db = solutioning_data.get('secondLogo', '')
        
        # Main logo for cover page
        if main_logo_from_db:
            # Organization provided custom main logo (already base64 from DB)
            print("🎨 Using organization main logo from database", file=sys.stderr)
            logo_base64 = main_logo_from_db
        else:
            # Fallback to default Dry Ground AI logo
            print("📸 Using default main logo (no organization logo set)", file=sys.stderr)
            logo_path = os.path.join(curr_dir, '../public/Dry Ground AI_Full Logo_Black_RGB.png')
            if not os.path.exists(logo_path):
                logo_path = os.path.join(curr_dir, 'Dry Ground AI_Full Logo_Black_RGB.png')
            
            logo_base64 = ""
            if os.path.exists(logo_path):
                with open(logo_path, 'rb') as f:
                    logo_base64 = base64.b64encode(f.read()).decode('utf-8')
        
        # DG logo for page headers
        if second_logo_from_db:
            # Organization provided custom secondary logo (already base64 from DB)
            print("🎨 Using organization secondary logo from database", file=sys.stderr)
            dg_logo_base64 = second_logo_from_db
        else:
            # Fallback to default DG logo
            print("📸 Using default header logo (no organization secondary logo set)", file=sys.stderr)
            dg_logo_path = os.path.join(curr_dir, '../public/dg.png')
            if not os.path.exists(dg_logo_path):
                dg_logo_path = os.path.join(curr_dir, 'dg.png')
            
            dg_logo_base64 = ""
            if os.path.exists(dg_logo_path):
                with open(dg_logo_path, 'rb') as f:
                    dg_logo_base64 = base64.b64encode(f.read()).decode('utf-8')
        
        # Extract and transform data
        basic_info = {
            'date': solutioning_data.get('basic', {}).get('date', ''),
            'title': solutioning_data.get('basic', {}).get('title', 'Solution Overview Report'),
            'recipient': solutioning_data.get('basic', {}).get('recipient', 'Unknown Client'),
            'engineer': solutioning_data.get('basic', {}).get('engineer', 'Unknown Engineer')
        }
        
        # Format date as "Month Day, Year"
        try:
            date_obj = datetime.datetime.strptime(basic_info['date'], '%Y-%m-%d')
            formatted_date = date_obj.strftime('%B %d, %Y')
            basic_info['formatted_date'] = formatted_date
        except:
            basic_info['formatted_date'] = basic_info['date']
        
        # Format title with line breaks if it contains a colon
        title = basic_info.get('title', 'Report')
        if ':' in title:
            parts = title.split(':', 1)
            formatted_title = f"{parts[0]}:<br>{parts[1].strip()}"
        else:
            formatted_title = title
        basic_info['formatted_title'] = formatted_title
        
        # Transform solutions from current format to old format
        solutions = []
        solution_number = 1
        
        print(f"🐍 DEBUG: Received {len(solutioning_data.get('solutions', []))} solutions", file=sys.stderr)
        
        for solution_data in solutioning_data.get('solutions', []):
            print(f"🐍 DEBUG: Processing solution {solution_number}: {solution_data.get('title', 'NO TITLE')}", file=sys.stderr)
            print(f"🐍 DEBUG: Raw layout value: {repr(solution_data.get('layout'))} (type: {type(solution_data.get('layout')).__name__})", file=sys.stderr)
            
            # Handle image data - remove data:image prefix if present
            image_data = solution_data.get('imageData', '')
            if image_data and image_data.startswith('data:image/'):
                # Extract base64 part after the comma
                image_data = image_data.split(',', 1)[1] if ',' in image_data else ''
            
            layout_value = solution_data.get('layout', 1)
            print(f"🐍 DEBUG: Layout value after get: {repr(layout_value)} (type: {type(layout_value).__name__})", file=sys.stderr)
            
            solution = {
                'number': solution_number,
                'title': solution_data.get('title', 'Untitled Solution'),
                'steps': solution_data.get('steps', ''),
                'approach': solution_data.get('approach', ''),
                'difficulty': solution_data.get('difficulty', 0),
                'layout': layout_value,
                'image_data': image_data if image_data else None
            }
            print(f"🐍 DEBUG: Created solution dict with layout: {solution['layout']}", file=sys.stderr)
            solutions.append(solution)
            solution_number += 1
        
        total_solutions = len(solutions)
        is_multi_solution = total_solutions > 1
        
        # Generate session ID for footer (extract from sessionProtocol or generate)
        session_id = solutioning_data.get('sessionProtocol', 'SH123')
        
        print(f"🐍 Processing {len(solutions)} solutions", file=sys.stderr)
        for sol in solutions:
            print(f"🐍 Solution {sol['number']}: {sol['title']} (Layout {sol['layout']}, type: {type(sol['layout']).__name__})", file=sys.stderr)
        
        # HTML Template - EXACT COPY from old system
        html_template = """
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="utf-8">
        <title>PDF Report</title>
        <style>
            @page {
                size: A4;
                margin: 0;
            }
            @page :first {
                margin: 0;
                @bottom-center {
                    content: element(footer);
                    vertical-align: bottom;
                }
            }
            @page solution-page {
                margin: 0;
                @bottom-center {
                    content: element(solution-footer);
                    vertical-align: bottom;
                }
            }
            html, body {
                font-family: Arial, Helvetica, sans-serif;
                margin: 0;
                padding: 0;
                color: #000;
            }
            .cover-container {
                position: relative;
                width: 794px;  /* A4 width in pixels at 96 DPI */
                height: 1122px; /* A4 height in pixels at 96 DPI */
                min-height: 1122px;
                min-width: 794px;
                box-sizing: border-box;
                background: #fff;
                display: flex;
                flex-direction: column;
                align-items: center;
                page-break-after: always;
                padding-bottom: 80px;
            }
            .sol-overview-container {
                margin-top: 200px;
                margin-bottom: 80px;  /* Increased from 40px: More space before main content */
                width: 350px;
                text-align: center;
                position: relative;
            }
            .sol-overview {
                font-size: 20px;
                font-weight: 800;
                text-align: center;
                letter-spacing: 0.02em;
                position: relative;
                display: inline-block;
                padding: 2px 0;
            }
            .sol-overview-top-line {
                width: 300px;
                border-top: 2px solid #000;
                position: absolute;
                top: 0;
                left: 25px;
            }
            .sol-overview-bottom-line {
                width: 300px;
                border-top: 2px solid #000;
                position: absolute;
                bottom: 0;
                right: 25px;
            }
            .content-section {
                width: 100%;
                position: relative;
                margin-top: 10px;
            }
            .headline-wrapper {
                position: relative;
                width: 100%;
                max-width: 800px;
                margin: 0 auto;
            }
            .meta-prepared-for {
                position: absolute;
                right: 97px;  /* Fixed: calc(50% - 300px) + 100px = 97px for 794px width */
                bottom: 100%;
                margin-bottom: 10px;
                font-size: 14px;
                font-weight: bold;
                line-height: 1.2;
                text-align: right;
                z-index: 2;
                width: 300px;
            }
            .meta-prepared-for-value {
                font-weight: normal;
                margin-top: 3px;
            }
            .date {
                position: absolute;
                left: 97px;  /* Fixed: align with left side of content area */
                bottom: 100%;
                margin-bottom: 10px;
                font-size: 12px;
                font-weight: normal;
                color: #000;
                z-index: 2;
                text-align: left;
                padding: 0;
                white-space: nowrap;
            }
            .headline-block {
                width: 100%;
                text-align: center;
                margin: 30px auto 0;
                position: relative;
                padding: 35px 0;
            }
            .top-line {
                width: 600px;
                border-top: 4px solid #000;
                position: absolute;
                top: 0;
                left: 50%;
                margin-left: -300px;  /* Fixed: translateX(-50%) replacement */
            }
            .bottom-line {
                width: 600px;
                border-top: 4px solid #000;
                position: absolute;
                bottom: 0;
                left: 50%;
                margin-left: -300px;  /* Fixed: translateX(-50%) replacement */
            }
            .headline {
                font-size: 42px;
                font-weight: bold;
                line-height: 1.1;
                letter-spacing: 0.01em;
                color: #000;
                margin: 0;
                padding: 0;
                max-width: 90%;
                margin-left: auto;
                margin-right: auto;
                width: auto;
                display: inline-block;
            }
            .meta-prepared-by {
                position: absolute;
                right: 97px;  /* Fixed: calc(50% - 300px) + 100px = 97px */
                top: 100%;
                margin-top: 10px;
                font-size: 12px;
                text-align: right;
                font-weight: normal;
                line-height: 1.4;
                z-index: 2;
                width: 300px;
            }
            .meta-prepared-by-name {
                margin-bottom: 0;
                margin-top: 3px;
            }
            .meta-prepared-by-title {
                margin-top: 0;
                margin-bottom: 3px;
            }
            .meta-prepared-by-company {
                font-weight: bold;
                font-size: 13px;
                letter-spacing: 0.02em;
                margin-top: 0;
            }
            .logo-section {
                margin-top: 100px;
                text-align: center;
                width: 100%;
            }
            .logo {
                width: 300px;
                max-width: 100%;
                height: auto;
                display: block;
                margin: 0 auto;
            }
            .footer-container {
                position: running(footer);
                width: 100%;
                text-align: center;
                bottom: 0;
                padding-bottom: 30px;
                box-sizing: border-box;
            }
            .footer-line {
                width: 98%;
                margin: 0 auto 20px;
                border-top: 1px solid #d1d1d1;
            }
            .footer-disclaimer {
                width: 98%;
                min-width: 750px;
                margin: 0 auto;
                text-align: justify;
                font-size: 8px;
                color: #7d7d7d;
                font-family: Arial, Helvetica, sans-serif;
                letter-spacing: 0.01em;
                line-height: 1.3;
                font-style: italic;
                box-sizing: border-box;
                max-width: 780px;
                white-space: normal;
                word-wrap: normal;
                padding: 0 5px;
            }
            
            /* Layout styles */
            .layout-page {
                padding: 20px;
                height: 1042px;  /* Fixed: A4 height minus padding */
                width: 754px;    /* Fixed: A4 width minus padding */
                box-sizing: border-box;
                page-break-before: always;
                margin: 0 auto;  /* Center the page content */
                position: relative;
                page: solution-page;  /* Added: Use the custom page rule for solution pages */
            }
            
            /* Header styling integrated into layout page */
            .page-header {
                width: 100%;
                text-align: center;
                padding: 10px 0 20px 0;
                box-sizing: border-box;
            }
            
            .page-header-image {
                width: 186px;
                height: 48px;
                opacity: 0.4;
                margin: 0 auto;
            }
            
            /* Layout 1 Styles */
            .layout-1-container {
                display: flex;
                flex-direction: column;
                min-height: calc(962px - 60px);  /* Changed: Use min-height instead of fixed height */
                max-width: 100%;
                margin: 0 auto;
            }
            
            .solution-title {
                font-family: Verdana, sans-serif;
                font-size: 40px;
                font-weight: normal;
                text-align: center;
                margin: 20px 0 10px 0;
                color: #000;
            }
            
            .solution-divider {
                width: 80%;
                margin: 15px auto;
                text-align: center;
            }
            
            .solution-divider-line {
                width: 100%;
                border-top: 1px solid #888888;
                margin: 0 auto;
            }
            
            .solution-divider-text {
                font-size: 8px;
                font-style: italic;
                color: #555555;
                margin-top: 2px;
                text-align: center;
                line-height: 1.2;
            }
            
            .layout-1-image-container {
                width: 100%;
                margin: 20px auto;
                border: 1px solid #000;
                border-radius: 15px;
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 300px;
                box-sizing: border-box;
            }
            
            .layout-1-image {
                width: 90%;
                height: auto;
                object-fit: contain;
                display: block;
                margin: 0 auto;
            }
            
            .layout-1-boxes-container-image {
                border: 1px solid #000;
                border-radius: 42px;
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                margin-top: 20px;
                height: 300px;
                box-sizing: border-box;
            }
            
            .layout-1-boxes-container {
                display: flex;
                justify-content: space-between;
                margin-top: 20px;
                align-items: flex-start;  /* Added: Align boxes to top */
            }
            
            .layout-1-box {
                width: 48%;  /* Increased from 45%: Wider boxes = less space between them */
                border: 1px solid #000;
                border-radius: 30px;
                padding: 20px;
                box-sizing: border-box;
                white-space: pre-line;
                font-size: 12px;
                line-height: 1.5;
                text-align: justify;
                word-wrap: break-word;  /* Added: Ensure text wraps properly */
                overflow-wrap: break-word;  /* Added: Handle long words */
            }

            .layout-1-spacer {
                width: 1%;  /* Reduced to minimal: Almost no space between boxes */
            }
            
            /* Layout 3 Styles - No fixed height for boxes */
            .layout-3-boxes-container {
                display: flex;
                justify-content: space-between;
                margin-top: 20px;
                align-items: flex-start;  /* Added: Align boxes to top */
            }
            
            /* Layout 2 Styles - White borders variant */
            .layout-2-boxes-container-image {
                border: 1px solid #fff;
                border-radius: 30px;
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                margin-top: 20px;
                height: 300px;
                box-sizing: border-box;
            }
            
            .layout-2-box {
                width: 48%;  /* Increased from 45%: Wider boxes = less space between them */
                border: 1px solid #fff;
                border-radius: 30px;
                padding: 20px;
                box-sizing: border-box;
                overflow: auto;
                white-space: pre-line;
                font-size: 12px;
                line-height: 1.5;
                text-align: justify;
            }
            
            .layout-divisor-line {
                width: 100%;
                height: 3px;
                background-color: #000;
                margin: 20px 0;
            }
            
            /* Layout 4 Styles - Full width stacked boxes */
            .layout-4-container {
                display: flex;
                flex-direction: column;
                min-height: calc(962px - 60px);  /* Changed: Use min-height instead of fixed height */
                max-width: 100%;
                margin: 0 auto;
            }
            
            .layout-4-full-width-box {
                width: 714px;  /* Fixed: 754px - 40px = 714px */
                border: 1px solid #000;
                border-radius: 30px;
                padding: 20px;
                box-sizing: border-box;
                margin: 10px auto;  /* Changed: Use auto margins for proper centering */
                text-align: justify;
                font-size: 12px;
                line-height: 1.5;
                white-space: pre-line;
                word-wrap: break-word;  /* Added: Ensure text wraps properly */
                overflow-wrap: break-word;  /* Added: Handle long words */
            }
            
            /* Layout 5 Styles - White borders with sharp (non-rounded) boxes */
            .layout-5-box {
                width: 48%;  /* Increased from 45%: Wider boxes = less space between them */
                border: 1px solid #000;
                border-radius: 0;
                padding: 20px;
                box-sizing: border-box;
                overflow: auto;
                white-space: pre-line;
                font-size: 12px;
                line-height: 1.5;
                text-align: justify;
            }
            
            /* Solution page footer */
            .solution-footer {
                position: running(solution-footer);  /* Changed: Use running element for page-specific positioning */
                width: 100%;
                text-align: center;
                bottom: 0;
                padding-bottom: 20px;
                box-sizing: border-box;
            }
            
            .solution-footer-line {
                width: 98%;
                margin: 0 auto 20px;
                border-top: 1px solid #888888;
            }
            
            .solution-footer-text {
                width: 98%;
                min-width: 750px;
                margin: 0 auto;
                text-align: center;
                font-size: 8px;
                color: #1a1a1a;
                font-family: Arial, Helvetica, sans-serif;
                letter-spacing: 0.01em;
                line-height: 1.3;
                font-style: italic;
                box-sizing: border-box;
                max-width: 780px;
                white-space: normal;
                word-wrap: normal;
                padding: 0 5px;
            }
        </style>
        </head>
        <body>
        <!-- Cover Page -->
        <div class="cover-container">
            <div class="sol-overview-container">
                <div class="sol-overview">
                    <div class="sol-overview-top-line"></div>
                    {% if is_multi_solution %}
                    Multi-Solution Overview
                    {% else %}
                    Solution Overview
                    {% endif %}
                    <div class="sol-overview-bottom-line"></div>
                </div>
            </div>
            
            <div class="content-section">
                <div class="headline-wrapper">
                    <div class="headline-block">
                        <div class="date">{{ basic_info.formatted_date }}</div>
                        
                        <div class="meta-prepared-for">
                            Prepared For:<br>
                            <div class="meta-prepared-for-value">{{ basic_info.recipient }}</div>
                        </div>
                        
                        <div class="top-line"></div>
                        <div class="headline">
                            {{ basic_info.formatted_title|safe }}
                        </div>
                        <div class="bottom-line"></div>
                        
                        <div class="meta-prepared-by">
                            Prepared By:<br>
                            <p class="meta-prepared-by-name">{{ basic_info.engineer }}</p>
                            <p class="meta-prepared-by-title">Solutions Engineer</p>
                        </div>
                    </div>
                </div>
            </div>
            <br><br><br>
            <div class="logo-section">
                <img src="data:image/png;base64,{{ logo_base64 }}" class="logo" alt="Dry Ground AI Logo">
            </div>
            <br><br>
            <!-- Primary footer that uses running element positioning -->
            <div class="footer-container">
                <div class="footer-line"></div>
                <div class="footer-disclaimer">
                    This document and the information contained herein are the confidential and proprietary property of Dry Ground AI. It is intended solely for the use of the recipient(s) and may not be copied, distributed, reproduced, or disclosed—whether in whole or in part—without the express written consent of Dry Ground AI. Unauthorized use, disclosure, or duplication is strictly prohibited. All rights reserved © {{ basic_info.date[-4:] }}.
                </div>
            </div>
        </div>

        <!-- Solution Pages -->
        {% for solution in solutions %}
        <div class="layout-page">
            <!-- DG.png Header integrated into the page -->
            <div class="page-header">
                <img src="data:image/png;base64,{{ dg_logo_base64 }}" class="page-header-image" alt="DG Logo">
            </div>
            
            <div class="solution-divider">
                <div class="solution-divider-line"></div>
                <div class="solution-divider-text">
                    Solution {{ solution.number }} of {{ total_solutions }} developed by the engineer {{ basic_info.engineer }} with the estimated difficulty of {{ solution.difficulty }}%.
                </div>
            </div>
            
            {% if solution.layout == 2 or solution.layout == "2" %}
            <!-- Layout 2: White borders with divisor line -->
            <div class="layout-1-container">
                <div class="solution-title">
                    {{ solution.title }}
                </div>
                
                <div class="layout-2-boxes-container-image">
                    {% if solution.image_data %}
                    <img src="data:image/png;base64,{{ solution.image_data }}" class="layout-1-image" alt="Solution Image">
                    {% else %}
                    <div style="text-align: center; color: #777;">No image available</div>
                    {% endif %}
                </div>
                
                <div class="layout-1-boxes-container">
                    <div class="layout-2-box">{{ solution.steps }}</div>
                    <div class="layout-1-spacer"></div>
                    <div class="layout-2-box">{{ solution.approach }}</div>
                </div>
            </div>
            
                {% elif solution.layout == 3 or solution.layout == "3" %}
                <!-- Layout 3: Boxes first, then image -->
            <div class="layout-1-container">
                <div class="solution-title">
                    {{ solution.title }}
                </div>
                
                <div class="layout-3-boxes-container">
                    <div class="layout-1-box">{{ solution.steps }}</div>
                    <div class="layout-1-spacer"></div>
                    <div class="layout-1-box">{{ solution.approach }}</div>
                </div>
                
                <div class="layout-1-boxes-container-image">
                    {% if solution.image_data %}
                    <img src="data:image/png;base64,{{ solution.image_data }}" class="layout-1-image" alt="Solution Image">
                    {% else %}
                    <div style="text-align: center; color: #777;">No image available</div>
                    {% endif %}
                </div>
            </div>
            
                {% elif solution.layout == 4 or solution.layout == "4" %}
                <!-- Layout 4: Image first (white border), then full-width stacked boxes -->
            <div class="layout-4-container">
                <div class="solution-title">
                    {{ solution.title }}
                </div>
                
                <div class="layout-2-boxes-container-image">
                    {% if solution.image_data %}
                    <img src="data:image/png;base64,{{ solution.image_data }}" class="layout-1-image" alt="Solution Image">
                    {% else %}
                    <div style="text-align: center; color: #777;">No image available</div>
                    {% endif %}
            </div>
            
            <div class="layout-4-full-width-box">{{ solution.steps }}</div>
            
            <div class="layout-4-full-width-box">{{ solution.approach }}</div>
            </div>
            
                {% elif solution.layout == 5 or solution.layout == "5" %}
                <!-- Layout 5: Layout 1 structure with white borders and sharp boxes -->
            <div class="layout-1-container">
                <div class="solution-title">
                    {{ solution.title }}
                </div>
                
                <div class="layout-2-boxes-container-image">
                    {% if solution.image_data %}
                    <img src="data:image/png;base64,{{ solution.image_data }}" class="layout-1-image" alt="Solution Image">
                    {% else %}
                    <div style="text-align: center; color: #777;">No image available</div>
                    {% endif %}
                </div>
                <br>
                <div class="layout-1-boxes-container">
                    <div class="layout-5-box">{{ solution.steps }}</div>
                    <div class="layout-1-spacer"></div>
                    <div class="layout-5-box">{{ solution.approach }}</div>
                </div>
            </div>
            
                {% else %}
                <!-- Layout 1: Default black borders -->
            <div class="layout-1-container">
                <div class="solution-title">
                    {{ solution.title }}
                </div>
                
                <div class="layout-1-boxes-container-image">
                    {% if solution.image_data %}
                    <img src="data:image/png;base64,{{ solution.image_data }}" class="layout-1-image" alt="Solution Image">
                    {% else %}
                    <div style="text-align: center; color: #777;">No image available</div>
                    {% endif %}
                </div>
                <br>
                <div class="layout-1-boxes-container">
                    <div class="layout-1-box">{{ solution.steps }}</div>
                    <div class="layout-1-spacer"></div>
                    <div class="layout-1-box">{{ solution.approach }}</div>
                </div>
            </div>
            {% endif %}
            
            <!-- Solution page footer -->
            <div class="solution-footer">
                <div class="solution-footer-line"></div>
                <div class="solution-footer-text">
                    Dry Ground AI — {{ basic_info.title }} — Protocol {{ session_id }} Glyph — LS{{ solution.layout }}DL{{ solution.difficulty }} at {{ basic_info.formatted_date }}
                </div>
            </div>
        </div>
        {% endfor %}
        </body>
        </html>
        """

        print(f"🐍 DEBUG: About to render Jinja template with {len(solutions)} solutions", file=sys.stderr)
        template = Template(html_template)
        
        try:
            print(f"🐍 DEBUG: Rendering template...", file=sys.stderr)
            html_content = template.render(
                basic_info=basic_info,
                solutions=solutions,
                total_solutions=total_solutions,
                is_multi_solution=is_multi_solution,
                logo_base64=logo_base64,
                dg_logo_base64=dg_logo_base64,
                session_id=session_id
            )
            print(f"🐍 DEBUG: Template rendered successfully, HTML length: {len(html_content)}", file=sys.stderr)
        except Exception as e:
            print(f"🐍 ERROR in template.render(): {type(e).__name__}: {str(e)}", file=sys.stderr)
            raise

        try:
            print(f"🐍 DEBUG: Converting HTML to PDF with WeasyPrint...", file=sys.stderr)
            html_doc = HTML(string=html_content)
            pdf_bytes = html_doc.write_pdf()
            print(f"🐍 DEBUG: PDF generated successfully, size: {len(pdf_bytes) if pdf_bytes else 0}", file=sys.stderr)
        except Exception as e:
            print(f"🐍 ERROR in WeasyPrint conversion: {type(e).__name__}: {str(e)}", file=sys.stderr)
            raise
        
        return pdf_bytes
        
    except Exception as e:
        print(f"🐍 Error generating PDF: {str(e)}", file=sys.stderr)
        return None

def main():
    try:
        input_data = sys.stdin.read()
        if not input_data.strip():
            print("🐍 No input data received", file=sys.stderr)
            sys.exit(1)
        
        print(f"🐍 Received input data length: {len(input_data)}", file=sys.stderr)
        
        solutioning_data = json.loads(input_data)
        print(f"🐍 Parsed JSON successfully", file=sys.stderr)
        
        pdf_bytes = generate_solutioning_pdf_from_json(solutioning_data)
        
        if pdf_bytes:
            print(f"🐍 Generated PDF successfully, size: {len(pdf_bytes)} bytes", file=sys.stderr)
            sys.stdout.buffer.write(pdf_bytes)
            sys.exit(0)
        else:
            print("🐍 Failed to generate PDF", file=sys.stderr)
            sys.exit(1)
            
    except json.JSONDecodeError as e:
        print(f"🐍 JSON parsing error: {str(e)}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"🐍 Script error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()




