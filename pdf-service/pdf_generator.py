import os

os.environ["LD_LIBRARY_PATH"] = os.getcwd()
from weasyprint import HTML
from jinja2 import Template
import logging
import datetime
import base64
import random
import string


def generate_pdf(output_path, data):
    """
    Generate a styled PDF report with a cover page and multiple solution pages.
    Args:
        output_path (str): Path to save the PDF.
        data (dict): Must include 'basic_info' with date, title, recipient, engineer.
                    Must include 'solutions' list with solution data.
                    May include 'total_solutions' and 'is_multi_solution'.
    """
    try:
        curr_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

        # Read the PNG logo file and encode it as base64
        logo_path = os.path.join(curr_dir, 'Dry Ground AI_Full Logo_Black_RGB.png')
        with open(logo_path, 'rb') as f:
            logo_data = f.read()
            logo_base64 = base64.b64encode(logo_data).decode('utf-8')

        # Read the dg.png file for the header (same as solution pages)
        dg_logo_path = os.path.join(curr_dir, 'dg.png')
        with open(dg_logo_path, 'rb') as f:
            dg_logo_data = f.read()
            dg_logo_base64 = base64.b64encode(dg_logo_data).decode('utf-8')

        # Extract basic info
        basic_info = data.get('basic_info', {})
        solutions = data.get('solutions', [])
        total_solutions = data.get('total_solutions', len(solutions))
        is_multi_solution = data.get('is_multi_solution', len(solutions) > 1)

        # Format date as "Month Day, Year"
        try:
            date_obj = datetime.datetime.strptime(basic_info['date'],
                                                  '%Y-%m-%d')
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

        # Generate random session ID for footer
        random_chars = ''.join(
            random.choices(string.ascii_lowercase + string.digits, k=10))
        session_id = f"sh{random_chars}{int(datetime.datetime.now().timestamp())}"

        logging.info(f"Generating PDF with {len(solutions)} solutions")
        for sol in solutions:
            logging.info(
                f"Solution {sol['number']}: {sol['title']} (Layout {sol['layout']})"
            )

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

        template = Template(html_template)
        html_content = template.render(basic_info=basic_info,
                                       solutions=solutions,
                                       total_solutions=total_solutions,
                                       is_multi_solution=is_multi_solution,
                                       logo_base64=logo_base64,
                                       dg_logo_base64=dg_logo_base64,
                                       session_id=session_id)

        HTML(string=html_content).write_pdf(output_path)
        logging.info(
            f"Multi-solution PDF successfully generated at {output_path}")
        return True

    except Exception as e:
        logging.error(f"PDF generation failed: {str(e)}")
        raise


def generate_sow_pdf_document(output_path, sow_data):
    """
    Generate a professional Statement of Work PDF document.
    Args:
        output_path (str): Path to save the PDF.
        sow_data (dict): SoW session data containing all form fields.
    """
    try:
        curr_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

        # Read the PNG logo file and encode it as base64 (same as solution pages)
        logo_path = os.path.join(curr_dir, 'Dry Ground AI_Full Logo_Black_RGB.png')
        with open(logo_path, 'rb') as f:
            logo_data = f.read()
            logo_base64 = base64.b64encode(logo_data).decode('utf-8')

        # Read the dg.png file for the header (same as solution pages)
        dg_logo_path = os.path.join(curr_dir, 'dg.png')
        with open(dg_logo_path, 'rb') as f:
            dg_logo_data = f.read()
            dg_logo_base64 = base64.b64encode(dg_logo_data).decode('utf-8')

        # Format date for display
        date_str = sow_data.get('date', '')
        try:
            date_obj = datetime.datetime.strptime(date_str, '%Y-%m-%d')
            formatted_date = date_obj.strftime('%B %d, %Y')
        except:
            formatted_date = date_str

        # Calculate dynamic weeks for Real-Time Refinement Period
        max_weeks_end = 10  # Default fallback
        if (sow_data.get('project_phases_timeline')
                and sow_data['project_phases_timeline'].get('phases')):
            phases = sow_data['project_phases_timeline']['phases']
            week_ends = []
            for phase in phases:
                if hasattr(phase, 'get'):
                    weeks_end = phase.get('weeks_end')
                    if weeks_end and str(weeks_end).isdigit():
                        week_ends.append(int(weeks_end))
                elif isinstance(phase, dict):
                    weeks_end = phase.get('weeks_end')
                    if weeks_end and str(weeks_end).isdigit():
                        week_ends.append(int(weeks_end))

            if week_ends:
                max_weeks_end = max(week_ends)

        # Calculate the refinement period weeks
        refinement_midpoint = max_weeks_end // 2  # Y/2
        refinement_endpoint = max_weeks_end  # Y

        html_template = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Statement of Work</title>
            <style>
                @page {
                    size: A4;
                    margin: 2cm;
                    margin-bottom: 3cm;
                    @bottom-center {
                        content: "Page " counter(page) " of " counter(pages);
                        font-size: 10px;
                        color: #666;
                    }
                }
                
                body {
                    font-family: 'Arial', 'Helvetica', sans-serif;
                    font-size: 11px;
                    line-height: 1.4;
                    color: #000;
                    margin: 0;
                    padding: 0;
                    position: relative;
                }
                
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    margin-top: 10px;  /* Added: Minimal top margin to position logo near edge */
                    position: relative;
                    z-index: 1;
                }
                
                .sow-header-image {
                    width: 186px;
                    height: 48px;
                    margin: 0 auto 20px auto;  /* Changed: Only bottom margin, no top margin */
                    display: block;
                }
                
                .document-title {
                    font-size: 24px;
                    font-weight: bold;
                    color: #000;
                    margin-bottom: 10px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                
                .project-title {
                    font-size: 18px;
                    font-weight: bold;
                    color: #333;
                    margin-bottom: 5px;
                }
                
                .client-info {
                    font-size: 14px;
                    color: #666;
                    margin-bottom: 15px;
                }
                
                .meta-info {
                    display: flex;
                    justify-content: space-between;
                    font-size: 10px;
                    color: #666;
                    border-top: 1px solid #ddd;
                    border-bottom: 1px solid #ddd;
                    padding: 8px 0;
                    margin-bottom: 30px;
                }
                
                .section {
                    margin-bottom: 25px;
                    position: relative;
                    z-index: 1;
                }
                
                .section-title {
                    font-size: 14px;
                    font-weight: bold;
                    color: #000;
                    margin-bottom: 10px;
                    padding-bottom: 5px;
                    border-top: 2px solid #000;
                    border-bottom: 1px solid #000;
                    padding-top: 8px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .section-content {
                    margin-left: 10px;
                }
                
                .objective-item, .requirement-item {
                    margin-bottom: 8px;
                    padding-left: 15px;
                    position: relative;
                }
                
                .objective-item::before, .requirement-item::before {
                    content: "•";
                    position: absolute;
                    left: 0;
                    font-weight: bold;
                    color: #000;
                }
                
                .deliverables-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }
                
                .deliverables-table th {
                    background-color: #f5f5f5;
                    border: 1px solid #000;
                    padding: 8px;
                    text-align: left;
                    font-weight: bold;
                    font-size: 10px;
                }
                
                .deliverables-table td {
                    border: 1px solid #666;
                    padding: 8px;
                    vertical-align: top;
                    font-size: 10px;
                }
                
                .phases-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }
                
                .phases-table th {
                    background-color: #f5f5f5;
                    border: 1px solid #000;
                    padding: 8px;
                    text-align: left;
                    font-weight: bold;
                    font-size: 10px;
                }
                
                .phases-table td {
                    border: 1px solid #666;
                    padding: 8px;
                    vertical-align: top;
                    font-size: 10px;
                }
                
                .weeks-cell {
                    text-align: center;
                    font-weight: bold;
                }
                
                .page-break {
                    page-break-before: always;
                }
                
                .footer-divider {
                    border-top: 2px solid #000;
                    margin-top: 30px;
                    padding-top: 10px;
                }
                
                .confidentiality {
                    font-size: 9px;
                    color: #666;
                    text-align: center;
                    font-style: italic;
                    margin-top: 20px;
                }
            </style>
        </head>
        <body>
            <!-- Header -->
            <div class="header">
                <!-- Header logo like solution pages but not faded -->
                <img src="data:image/png;base64,{{ dg_logo_base64 }}" class="sow-header-image" alt="DG Logo">
                
                <div class="document-title">Statement of Work</div>
                <div class="project-title">{{ sow_data.project }}</div>
                <div class="client-info">Prepared for: {{ sow_data.client }}</div>
                
                <div class="meta-info">
                    <div>Date: {{ formatted_date }}</div>
                    <div>Prepared by: {{ sow_data.prepared_by }}</div>
                </div>
            </div>
            
            <!-- Project Purpose & Background -->
            <div class="section">
                <div class="section-title">Project Purpose & Background</div>
                <div class="section-content">
                    {{ sow_data.project_purpose_background }}
                </div>
            </div>
            
            <!-- Objectives -->
            {% if sow_data.objectives %}
            <div class="section">
                <div class="section-title">Project Objectives</div>
                <div class="section-content">
                    {% for objective in sow_data.objectives %}
                    {% if objective.strip() %}
                    <div class="objective-item">{{ objective }}</div>
                    {% endif %}
                    {% endfor %}
                </div>
            </div>
            {% endif %}
            
            <!-- In-Scope Deliverables -->
            {% if sow_data.in_scope_deliverables %}
            <div class="section">
                <div class="section-title">In-Scope Deliverables</div>
                <div class="section-content">
                    <table class="deliverables-table">
                        <thead>
                            <tr>
                                <th>Deliverable</th>
                                <th>Key Features</th>
                                <th>Primary Artifacts</th>
                            </tr>
                        </thead>
                        <tbody>
                            {% for deliverable in sow_data.in_scope_deliverables %}
                            {% if deliverable.deliverable.strip() or deliverable.key_features.strip() or deliverable.primary_artifacts.strip() %}
                            <tr>
                                <td>{{ deliverable.deliverable }}</td>
                                <td>{{ deliverable.key_features }}</td>
                                <td>{{ deliverable.primary_artifacts }}</td>
                            </tr>
                            {% endif %}
                            {% endfor %}
                        </tbody>
                    </table>
                </div>
            </div>
            {% endif %}
            
            <!-- Out-of-Scope -->
            {% if sow_data.out_of_scope.strip() %}
            <div class="section">
                <div class="section-title">Out-of-Scope</div>
                <div class="section-content">
                    {{ sow_data.out_of_scope }}
                </div>
            </div>
            {% endif %}
            
            <!-- Functional Requirements -->
            {% if sow_data.functional_requirements %}
            <div class="section">
                <div class="section-title">Functional Requirements</div>
                <div class="section-content">
                    {% for requirement in sow_data.functional_requirements %}
                    {% if requirement.strip() %}
                    <div class="requirement-item">{{ requirement }}</div>
                    {% endif %}
                    {% endfor %}
                </div>
            </div>
            {% endif %}
            
            <!-- Non-Functional Requirements -->
            {% if sow_data.non_functional_requirements %}
            <div class="section">
                <div class="section-title">Non-Functional Requirements</div>
                <div class="section-content">
                    {% for requirement in sow_data.non_functional_requirements %}
                    {% if requirement.strip() %}
                    <div class="requirement-item">{{ requirement }}</div>
                    {% endif %}
                    {% endfor %}
                </div>
            </div>
            {% endif %}
            
            <!-- Project Phases & Timeline -->
            {% if sow_data.project_phases_timeline and sow_data.project_phases_timeline.phases %}
            <div class="section">
                <div class="section-title">Project Phases & Timeline</div>
                <div class="section-content">
                    <table class="phases-table">
                        <thead>
                            <tr>
                                <th>Phase</th>
                                <th>Key Activities</th>
                                <th>Timeline (Weeks)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {% for phase in sow_data.project_phases_timeline.phases %}
                            {% if phase.phase.strip() or phase.key_activities.strip() %}
                            <tr>
                                <td>{{ phase.phase }}</td>
                                <td>{{ phase.key_activities }}</td>
                                <td class="weeks-cell">{{ phase.weeks_display }}</td>
                            </tr>
                            {% endif %}
                            {% endfor %}
                        </tbody>
                    </table>
                </div>
            </div>
            {% endif %}
            
            <!-- Real-Time Refinement Period -->
            <div class="section">
                <div class="section-title">Real-Time Refinement Period</div>
                <div class="section-content">
                    <p>This project includes a two-phase refinement approach designed to align closely with client expectations.</p>
                    
                    <p><strong>Weeks 0–{{ refinement_midpoint }}: Observation & Feedback</strong> – The client will receive regular visual updates and progress reviews, enabling early feedback while the solution is being structured.</p>
                    
                    <p><strong>Weeks {{ refinement_midpoint }}–{{ refinement_endpoint }}: Interactive Testing</strong> – Starting in Week {{ refinement_midpoint }}, the client will gain access to a functional version of the solution for hands-on testing. This phase is intended to "test and break" the system, with rapid iterations based on real usage and feedback.</p>
                    
                    <p>This process ensures the final product is not only delivered on time, but shaped in partnership with the client throughout development.</p>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="footer-divider">
                <div class="confidentiality">
                    This Statement of Work is confidential and proprietary to DRY GROUND AI. 
                    It is intended solely for the use of {{ sow_data.client }} and may not be disclosed to third parties without express written consent.
                </div>
            </div>
        </body>
        </html>
        """

        template = Template(html_template)
        html_content = template.render(sow_data=sow_data,
                                       formatted_date=formatted_date,
                                       dg_logo_base64=dg_logo_base64,
                                       refinement_midpoint=refinement_midpoint,
                                       refinement_endpoint=refinement_endpoint)

        HTML(string=html_content).write_pdf(output_path)
        logging.info(f"SoW PDF successfully generated at {output_path}")
        return True

    except Exception as e:
        logging.error(f"SoW PDF generation failed: {str(e)}")
        raise


def generate_loe_pdf_document(output_path, loe_data):
    """
    Generate a professional Level of Effort PDF document.
    Args:
        output_path (str): Path to save the PDF.
        loe_data (dict): LoE session data containing all form fields.
    """
    try:
        curr_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

        # Read the dg.png file for the header (same as solution pages)
        dg_logo_path = os.path.join(curr_dir, 'dg.png')
        with open(dg_logo_path, 'rb') as f:
            dg_logo_data = f.read()
            dg_logo_base64 = base64.b64encode(dg_logo_data).decode('utf-8')

        # Format date for display
        date_str = loe_data.get('basic', {}).get('date', '')
        try:
            date_obj = datetime.datetime.strptime(date_str, '%Y-%m-%d')
            formatted_date = date_obj.strftime('%B %d, %Y')
        except:
            formatted_date = date_str

        html_template = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Level of Effort</title>
            <style>
                @page {
                    size: A4;
                    margin: 2cm;
                    margin-bottom: 3cm;
                    @bottom-center {
                        content: "Page " counter(page) " of " counter(pages);
                        font-size: 10px;
                        color: #666;
                    }
                }
                
                body {
                    font-family: 'Arial', 'Helvetica', sans-serif;
                    font-size: 11px;
                    line-height: 1.4;
                    color: #000;
                    margin: 0;
                    padding: 0;
                    position: relative;
                }
                
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    margin-top: 10px;
                    position: relative;
                    z-index: 1;
                }
                
                .loe-header-image {
                    width: 186px;
                    height: 48px;
                    margin: 0 auto 20px auto;
                    display: block;
                }
                
                .document-title {
                    font-size: 24px;
                    font-weight: bold;
                    color: #000;
                    margin-bottom: 10px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                
                .project-title {
                    font-size: 18px;
                    font-weight: bold;
                    color: #333;
                    margin-bottom: 5px;
                }
                
                .client-info {
                    font-size: 14px;
                    color: #666;
                    margin-bottom: 15px;
                }
                
                .meta-info {
                    display: flex;
                    justify-content: space-between;
                    font-size: 10px;
                    color: #666;
                    border-top: 1px solid #ddd;
                    border-bottom: 1px solid #ddd;
                    padding: 8px 0;
                    margin-bottom: 30px;
                }
                
                .section {
                    margin-bottom: 25px;
                    position: relative;
                    z-index: 1;
                }
                
                .section-title {
                    font-size: 14px;
                    font-weight: bold;
                    color: #000;
                    margin-bottom: 10px;
                    padding-bottom: 5px;
                    border-top: 2px solid #000;
                    border-bottom: 1px solid #000;
                    padding-top: 8px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .section-content {
                    margin-left: 10px;
                }
                
                .workstream-item, .assumption-item {
                    margin-bottom: 8px;
                    padding-left: 15px;
                    position: relative;
                }
                
                .workstream-item::before, .assumption-item::before {
                    content: "•";
                    position: absolute;
                    left: 0;
                    font-weight: bold;
                    color: #000;
                }
                
                .workstreams-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }
                
                .workstreams-table th {
                    background-color: #f5f5f5;
                    border: 1px solid #000;
                    padding: 8px;
                    text-align: left;
                    font-weight: bold;
                    font-size: 10px;
                }
                
                .workstreams-table td {
                    border: 1px solid #666;
                    padding: 8px;
                    vertical-align: top;
                    font-size: 10px;
                }
                
                .resources-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }
                
                .resources-table th {
                    background-color: #f5f5f5;
                    border: 1px solid #000;
                    padding: 8px;
                    text-align: left;
                    font-weight: bold;
                    font-size: 10px;
                }
                
                .resources-table td {
                    border: 1px solid #666;
                    padding: 8px;
                    vertical-align: top;
                    font-size: 10px;
                }
                
                .resources-table .buffer-row {
                    background-color: #f9f9f9;
                    font-weight: 600;
                }
                
                .resources-table .total-row {
                    background-color: #e9e9e9;
                    font-weight: bold;
                }
                
                .weeks-cell, .hours-cell {
                    text-align: center;
                    font-weight: bold;
                }
                
                /* Options table styling */
                .options-subsection {
                    margin-bottom: 25px;
                }

                .options-subtitle {
                    font-size: 12px;
                    font-weight: bold;
                    color: #333;
                    margin-bottom: 8px;
                    padding-bottom: 3px;
                    border-bottom: 1px solid #ccc;
                }

                .options-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 8px;
                }

                .options-table th {
                    background-color: #f5f5f5;
                    border: 1px solid #000;
                    padding: 8px;
                    text-align: left;
                    font-weight: bold;
                    font-size: 10px;
                }

                .options-table td {
                    border: 1px solid #666;
                    padding: 8px;
                    vertical-align: top;
                    font-size: 10px;
                }

                .options-table .reduction-row {
                    background-color: #e8f5e8;
                    font-weight: 600;
                    color: #2d5a2d;
                }

                .options-table .addition-row {
                    background-color: #e8f2ff;
                    font-weight: 600;
                    color: #1e4d72;
                }

                .options-table .adjusted-row {
                    background-color: #f0f0f0;
                    font-weight: bold;
                    color: #000;
                }
                
                .footer-divider {
                    border-top: 2px solid #000;
                    margin-top: 30px;
                    padding-top: 10px;
                }
                
                .confidentiality {
                    font-size: 9px;
                    color: #666;
                    text-align: center;
                    font-style: italic;
                    margin-top: 20px;
                }
            </style>
        </head>
        <body>
            <!-- Header -->
            <div class="header">
                <img src="data:image/png;base64,{{ dg_logo_base64 }}" class="loe-header-image" alt="DG Logo">
                
                <div class="document-title">Level of Effort</div>
                <div class="project-title">{{ loe_data.basic.project }}</div>
                <div class="client-info">Prepared for: {{ loe_data.basic.client }}</div>
                
                <div class="meta-info">
                    <div>Date: {{ formatted_date }}</div>
                    <div>Prepared by: {{ loe_data.basic.prepared_by }}</div>
                </div>
            </div>
            
            <!-- Project Overview -->
            {% if loe_data.overview %}
            <div class="section">
                <div class="section-title">Project Overview</div>
                <div class="section-content">
                    {{ loe_data.overview }}
                </div>
            </div>
            {% endif %}
            
            <!-- Workstreams -->
            {% if loe_data.workstreams %}
            <div class="section">
                <div class="section-title">Project Workstreams</div>
                <div class="section-content">
                    <table class="workstreams-table">
                        <thead>
                            <tr>
                                <th>Workstream</th>
                                <th>Key Activities</th>
                                <th>Duration (Weeks)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {% for workstream in loe_data.workstreams %}
                            {% if workstream.workstream or workstream.activities %}
                            <tr>
                                <td>{{ workstream.workstream }}</td>
                                <td>{{ workstream.activities }}</td>
                                <td class="weeks-cell">{{ workstream.duration }}</td>
                            </tr>
                            {% endif %}
                            {% endfor %}
                        </tbody>
                    </table>
                </div>
            </div>
            {% endif %}
            
            <!-- Resource Allocation -->
            {% if loe_data.resources %}
            <div class="section">
                <div class="section-title">Resource Allocation</div>
                <div class="section-content">
                    <table class="resources-table">
                        <thead>
                            <tr>
                                <th>Role</th>
                                <th>Person-Weeks</th>
                                <th>Person-Hours</th>
                            </tr>
                        </thead>
                        <tbody>
                            {% for resource in loe_data.resources %}
                            {% if resource.role %}
                            <tr>
                                <td>{{ resource.role }}</td>
                                <td class="weeks-cell">{{ resource.personWeeks }}</td>
                                <td class="hours-cell">{{ resource.personHours }}</td>
                            </tr>
                            {% endif %}
                            {% endfor %}
                            
                            {% if loe_data.buffer %}
                            <tr class="buffer-row">
                                <td><strong>Buffer Margin (all roles)</strong></td>
                                <td class="weeks-cell">{{ loe_data.buffer.weeks }}</td>
                                <td class="hours-cell">{{ loe_data.buffer.hours }}</td>
                            </tr>
                            {% endif %}
                            
                            <tr class="total-row">
                                <td><strong>Total</strong></td>
                                <td class="weeks-cell">{{ total_weeks }}</td>
                                <td class="hours-cell">{{ total_hours }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            {% endif %}
            
            <!-- Key Assumptions -->
            {% if loe_data.assumptions %}
            <div class="section">
                <div class="section-title">Key Assumptions</div>
                <div class="section-content">
                    {% for assumption in loe_data.assumptions %}
                    {% if assumption.strip() %}
                    <div class="assumption-item">{{ assumption }}</div>
                    {% endif %}
                    {% endfor %}
                </div>
            </div>
            {% endif %}
            
            <!-- Options Section -->
            {% if loe_data.goodOptions or loe_data.bestOptions %}
            <div class="section">
                <div class="section-title">Options</div>
                <div class="section-content">
                    
                    <!-- Good (Lower Effort) Option -->
                    {% if loe_data.goodOptions and loe_data.goodOptions|length > 0 %}
                    <div class="options-subsection">
                        <div class="options-subtitle">Good (Lower Effort Option)</div>
                        <table class="options-table">
                            <thead>
                                <tr>
                                    <th>Features Removed</th>
                                    <th>Person-Hours</th>
                                    <th>Person-Weeks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {% for option in loe_data.goodOptions %}
                                {% if option.feature %}
                                <tr>
                                    <td>{{ option.feature }}</td>
                                    <td class="hours-cell">{{ option.personHours }}</td>
                                    <td class="weeks-cell">{{ option.personWeeks }}</td>
                                </tr>
                                {% endif %}
                                {% endfor %}
                                
                                <tr class="reduction-row">
                                    <td><strong>Decrease in Project Duration</strong></td>
                                    <td class="hours-cell">{{ good_total_hours }}</td>
                                    <td class="weeks-cell">{{ good_total_weeks }}</td>
                                </tr>
                                
                                <tr class="adjusted-row">
                                    <td><strong>Adjusted LOE</strong></td>
                                    <td class="hours-cell">{{ good_adjusted_hours }}</td>
                                    <td class="weeks-cell">{{ good_adjusted_weeks }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    {% endif %}
                    
                    <!-- Best (Enhanced) Option -->
                    {% if loe_data.bestOptions and loe_data.bestOptions|length > 0 %}
                    <div class="options-subsection">
                        <div class="options-subtitle">Best (Enhanced Option)</div>
                        <table class="options-table">
                            <thead>
                                <tr>
                                    <th>Features Added</th>
                                    <th>Person-Hours</th>
                                    <th>Person-Weeks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {% for option in loe_data.bestOptions %}
                                {% if option.feature %}
                                <tr>
                                    <td>{{ option.feature }}</td>
                                    <td class="hours-cell">{{ option.personHours }}</td>
                                    <td class="weeks-cell">{{ option.personWeeks }}</td>
                                </tr>
                                {% endif %}
                                {% endfor %}
                                
                                <tr class="addition-row">
                                    <td><strong>Increase in Project Duration</strong></td>
                                    <td class="hours-cell">{{ best_total_hours }}</td>
                                    <td class="weeks-cell">{{ best_total_weeks }}</td>
                                </tr>
                                
                                <tr class="adjusted-row">
                                    <td><strong>Adjusted LOE</strong></td>
                                    <td class="hours-cell">{{ best_adjusted_hours }}</td>
                                    <td class="weeks-cell">{{ best_adjusted_weeks }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    {% endif %}
                    
                </div>
            </div>
            {% endif %}
            
            <!-- Footer -->
            <div class="footer-divider">
                <div class="confidentiality">
                    This Level of Effort estimate is confidential and proprietary to DRY GROUND AI. 
                    It is intended solely for the use of {{ loe_data.basic.client }} and may not be disclosed to third parties without express written consent.
                </div>
            </div>
        </body>
        </html>
        """

        # Calculate totals
        total_weeks = 0
        total_hours = 0
        
        if loe_data.get('resources'):
            for resource in loe_data['resources']:
                total_weeks += float(resource.get('personWeeks', 0))
                total_hours += int(resource.get('personHours', 0))
        
        if loe_data.get('buffer'):
            total_weeks += float(loe_data['buffer'].get('weeks', 0))
            total_hours += int(loe_data['buffer'].get('hours', 0))

        # Calculate Good options totals
        good_total_hours = 0
        good_total_weeks = 0
        if loe_data.get('goodOptions'):
            for option in loe_data['goodOptions']:
                good_total_hours += int(option.get('personHours', 0))
            good_total_weeks = round(good_total_hours / 20, 1)
        
        # Calculate Best options totals  
        best_total_hours = 0
        best_total_weeks = 0
        if loe_data.get('bestOptions'):
            for option in loe_data['bestOptions']:
                best_total_hours += int(option.get('personHours', 0))
            best_total_weeks = round(best_total_hours / 20, 1)
        
        # Calculate adjusted LOE
        good_adjusted_hours = total_hours - good_total_hours
        good_adjusted_weeks = round((total_hours - good_total_hours) / 20, 1)
        
        best_adjusted_hours = total_hours + best_total_hours  
        best_adjusted_weeks = round((total_hours + best_total_hours) / 20, 1)

        template = Template(html_template)
        html_content = template.render(loe_data=loe_data,
                                       formatted_date=formatted_date,
                                       dg_logo_base64=dg_logo_base64,
                                       total_weeks=total_weeks,
                                       total_hours=total_hours,
                                       good_total_hours=good_total_hours,
                                       good_total_weeks=good_total_weeks,
                                       good_adjusted_hours=good_adjusted_hours,
                                       good_adjusted_weeks=good_adjusted_weeks,
                                       best_total_hours=best_total_hours,
                                       best_total_weeks=best_total_weeks,
                                       best_adjusted_hours=best_adjusted_hours,
                                       best_adjusted_weeks=best_adjusted_weeks)

        HTML(string=html_content).write_pdf(output_path)
        logging.info(f"LoE PDF successfully generated at {output_path}")
        return True

    except Exception as e:
        logging.error(f"LoE PDF generation failed: {str(e)}")
        raise
