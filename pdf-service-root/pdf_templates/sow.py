"""
SOW PDF Template Generator
"""

def generate_sow_html(data):
    """Generate HTML for SOW PDF"""
    # Simplified - full template should be copied from generate_sow_standalone.py
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Statement of Work</title>
        <style>
            @page {{ size: A4; margin: 2cm; }}
            body {{ font-family: Arial, sans-serif; }}
        </style>
    </head>
    <body>
        <h1>Statement of Work</h1>
        <p>Project: {data.get('project', 'N/A')}</p>
        <p>Client: {data.get('client', 'N/A')}</p>
    </body>
    </html>
    """
