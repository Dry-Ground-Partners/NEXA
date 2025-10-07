#!/usr/bin/env python3

import json
import sys
import os
import base64
import datetime
from weasyprint import HTML
from jinja2 import Template

def generate_sow_pdf_from_json(sow_data):
    """
    Generate SOW PDF from JSON data and return PDF bytes.
    """
    try:
        # Get current directory for assets
        curr_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Logo handling: Use organization logos from database
        # mainLogo is for cover/header areas, secondLogo is for page headers
        main_logo_from_db = sow_data.get('mainLogo', '')
        second_logo_from_db = sow_data.get('secondLogo', '')
        
        # Main logo (used in header/cover)
        if main_logo_from_db:
            # Organization provided custom main logo (already base64 from DB)
            # Strip data URI prefix if present (logos from DB include it)
            print("🎨 SOW: Using organization main logo from database", file=sys.stderr)
            if main_logo_from_db.startswith('data:image/'):
                # Extract just base64 part after comma
                main_logo_base64 = main_logo_from_db.split(',', 1)[1] if ',' in main_logo_from_db else main_logo_from_db
            else:
                main_logo_base64 = main_logo_from_db
        else:
            # Fallback to default Dry Ground AI logo
            print("📸 SOW: Using default main logo (no organization logo set)", file=sys.stderr)
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
            # Strip data URI prefix if present (logos from DB include it)
            print("🎨 SOW: Using organization secondary logo from database", file=sys.stderr)
            if second_logo_from_db.startswith('data:image/'):
                # Extract just base64 part after comma
                dg_logo_base64 = second_logo_from_db.split(',', 1)[1] if ',' in second_logo_from_db else second_logo_from_db
            else:
                dg_logo_base64 = second_logo_from_db
        else:
            # Fallback to default DG logo
            print("📸 SOW: Using default header logo (no organization secondary logo set)", file=sys.stderr)
            dg_logo_path = os.path.join(curr_dir, '../public/dg.png')
            if not os.path.exists(dg_logo_path):
                # Fallback to pdf-service directory
                dg_logo_path = os.path.join(curr_dir, 'dg.png')
            
            if os.path.exists(dg_logo_path):
                with open(dg_logo_path, 'rb') as f:
                    dg_logo_data = f.read()
                    dg_logo_base64 = base64.b64encode(dg_logo_data).decode('utf-8')
            else:
                # Fallback to empty base64 if logo not found
                dg_logo_base64 = ""
        
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

        # HTML Template (exact copy from old SOW system)
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
                <!-- Header logo - use mainLogo if available, otherwise dg logo -->
                <img src="data:image/png;base64,{{ main_logo_base64 or dg_logo_base64 }}" class="sow-header-image" alt="Organization Logo">
                
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
        
        # Render template
        template = Template(html_template)
        html_content = template.render(
            sow_data=sow_data,
            formatted_date=formatted_date,
            main_logo_base64=main_logo_base64,
            dg_logo_base64=dg_logo_base64,
            refinement_midpoint=refinement_midpoint,
            refinement_endpoint=refinement_endpoint
        )
        
        # Generate PDF and return bytes
        try:
            html_doc = HTML(string=html_content)
            pdf_bytes = html_doc.write_pdf()
            return pdf_bytes
        except Exception as pdf_error:
            print(f"WeasyPrint error: {str(pdf_error)}", file=sys.stderr)
            return None
        
    except Exception as e:
        print(f"Error generating PDF: {str(e)}", file=sys.stderr)
        return None

def main():
    """
    Main function: Read JSON from stdin, generate PDF, output to stdout
    """
    try:
        # Read JSON data from stdin
        input_data = sys.stdin.read()
        sow_data = json.loads(input_data)
        
        # Generate PDF
        pdf_bytes = generate_sow_pdf_from_json(sow_data)
        
        if pdf_bytes:
            # Output PDF bytes to stdout
            sys.stdout.buffer.write(pdf_bytes)
            sys.exit(0)
        else:
            print("Failed to generate PDF", file=sys.stderr)
            sys.exit(1)
            
    except Exception as e:
        print(f"Script error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
