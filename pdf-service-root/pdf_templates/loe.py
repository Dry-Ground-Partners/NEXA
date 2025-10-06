"""
LOE PDF Template Generator
"""

def generate_loe_html(data):
    """Generate HTML for LOE PDF"""
    # Simplified - full template should be copied from generate_loe_standalone.py
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Level of Effort</title>
        <style>
            @page {{ size: A4; margin: 2cm; }}
            body {{ font-family: Arial, sans-serif; }}
        </style>
    </head>
    <body>
        <h1>Level of Effort</h1>
        <p>Project: {data.get('basic', {}).get('project', 'N/A')}</p>
    </body>
    </html>
    """
