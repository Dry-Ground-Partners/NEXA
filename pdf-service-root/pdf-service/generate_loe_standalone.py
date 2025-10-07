#!/usr/bin/env python3

import json
import sys
import os
import base64
import datetime
from weasyprint import HTML
from jinja2 import Template

def generate_loe_pdf_from_json(loe_data):
    """
    Generate a professional Level of Effort PDF document from JSON data.
    Args:
        loe_data (dict): LoE session data containing all form fields.
    Returns:
        bytes: PDF file bytes, or None if generation failed.
    """
    try:
        curr_dir = os.path.dirname(os.path.abspath(__file__))

        # Logo handling: Use organization logos from database
        # mainLogo is for cover/header areas, secondLogo is for page headers
        main_logo_from_db = loe_data.get('mainLogo', '')
        second_logo_from_db = loe_data.get('secondLogo', '')
        
        # Main logo (used in header/cover)
        if main_logo_from_db:
            # Organization provided custom main logo (already base64 from DB)
            print("🎨 LOE: Using organization main logo from database", file=sys.stderr)
            main_logo_base64 = main_logo_from_db
        else:
            # Fallback to default Dry Ground AI logo
            print("📸 LOE: Using default main logo (no organization logo set)", file=sys.stderr)
            main_logo_path = os.path.join(curr_dir, '../public/Dry Ground AI_Full Logo_Black_RGB.png')
            if not os.path.exists(main_logo_path):
                main_logo_path = os.path.join(curr_dir, 'Dry Ground AI_Full Logo_Black_RGB.png')
            
            main_logo_base64 = ""
            if os.path.exists(main_logo_path):
                with open(main_logo_path, 'rb') as f:
                    main_logo_base64 = base64.b64encode(f.read()).decode('utf-8')
        
        # DG logo for page headers
        if second_logo_from_db:
            # Organization provided custom secondary logo (already base64 from DB)
            print("🎨 LOE: Using organization secondary logo from database", file=sys.stderr)
            dg_logo_base64 = second_logo_from_db
        else:
            # Fallback to default DG logo
            print("📸 LOE: Using default header logo (no organization secondary logo set)", file=sys.stderr)
            dg_logo_path = os.path.join(curr_dir, '../public/dg.png')
            if not os.path.exists(dg_logo_path):
                dg_logo_path = os.path.join(curr_dir, 'dg.png')

            dg_logo_base64 = ""
            if os.path.exists(dg_logo_path):
                with open(dg_logo_path, 'rb') as f:
                    dg_logo_data = f.read()
                    dg_logo_base64 = base64.b64encode(dg_logo_data).decode('utf-8')
            else:
                print(f"Warning: Logo file not found at {dg_logo_path}", file=sys.stderr)

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
                    margin-bottom: 10px;
                    text-decoration: underline;
                }
                
                .options-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
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
                    color: #2d6e2d;
                }
                
                .options-table .addition-row {
                    background-color: #e8f2ff;
                    font-weight: 600;
                    color: #1e4d72;
                }
                
                .options-table .adjusted-row {
                    background-color: #e9e9e9;
                    font-weight: bold;
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
                <img src="data:image/png;base64,{{ main_logo_base64 or dg_logo_base64 }}" class="loe-header-image" alt="Organization Logo">
                
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
                                    <td class="hours-cell">{{ option.hours }}</td>
                                    <td class="weeks-cell">{{ option.weeks }}</td>
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
                                    <td class="hours-cell">{{ option.hours }}</td>
                                    <td class="weeks-cell">{{ option.weeks }}</td>
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
                good_total_hours += int(option.get('hours', 0))
            good_total_weeks = round(good_total_hours / 20, 1)
        
        # Calculate Best options totals  
        best_total_hours = 0
        best_total_weeks = 0
        if loe_data.get('bestOptions'):
            for option in loe_data['bestOptions']:
                best_total_hours += int(option.get('hours', 0))
            best_total_weeks = round(best_total_hours / 20, 1)
        
        # Calculate adjusted LOE
        good_adjusted_hours = total_hours - good_total_hours
        good_adjusted_weeks = round((total_hours - good_total_hours) / 20, 1)
        
        best_adjusted_hours = total_hours + best_total_hours  
        best_adjusted_weeks = round((total_hours + best_total_hours) / 20, 1)

        template = Template(html_template)
        html_content = template.render(loe_data=loe_data,
                                       formatted_date=formatted_date,
                                       main_logo_base64=main_logo_base64,
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

        html_doc = HTML(string=html_content)
        pdf_bytes = html_doc.write_pdf()
        return pdf_bytes

    except Exception as e:
        print(f"Error generating PDF: {str(e)}", file=sys.stderr)
        return None

def main():
    """Main function to handle stdin/stdout communication."""
    try:
        # Read JSON data from stdin
        input_data = sys.stdin.read()
        if not input_data.strip():
            print("Error: No input data received", file=sys.stderr)
            sys.exit(1)
        
        loe_data = json.loads(input_data)
        
        # Generate PDF
        pdf_bytes = generate_loe_pdf_from_json(loe_data)
        
        if pdf_bytes:
            # Write PDF bytes to stdout
            sys.stdout.buffer.write(pdf_bytes)
            sys.exit(0)
        else:
            print("Error: PDF generation failed", file=sys.stderr)
            sys.exit(1)
            
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON input - {str(e)}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Script error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
