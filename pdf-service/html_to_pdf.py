#!/usr/bin/env python3

import sys
import os
from weasyprint import HTML, CSS

def main():
    """Convert HTML template from stdin to PDF and output to stdout."""
    try:
        # Read HTML template from stdin
        html_content = sys.stdin.read()
        
        if not html_content.strip():
            print("🐍 No HTML content received", file=sys.stderr)
            sys.exit(1)
        
        print(f"🐍 Processing HTML template, length: {len(html_content)} characters", file=sys.stderr)
        
        # Basic CSS for better PDF rendering
        base_css = CSS(string="""
            @page {
                margin: 40px;
                size: A4;
            }
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
            }
            h1, h2, h3 {
                color: #2c3e50;
                margin-top: 20px;
                margin-bottom: 10px;
            }
            .solution {
                margin: 20px 0;
                padding: 15px;
                border-left: 3px solid #007bff;
                background-color: #f8f9fa;
            }
            .meta {
                color: #666;
                font-size: 14px;
                margin-bottom: 20px;
            }
        """)
        
        # Convert HTML to PDF
        html_doc = HTML(string=html_content)
        pdf_bytes = html_doc.write_pdf(stylesheets=[base_css])
        
        print(f"✅ PDF generated successfully, size: {len(pdf_bytes)} bytes", file=sys.stderr)
        
        # Write PDF bytes to stdout
        sys.stdout.buffer.write(pdf_bytes)
        
    except Exception as e:
        print(f"❌ Error converting HTML to PDF: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()

