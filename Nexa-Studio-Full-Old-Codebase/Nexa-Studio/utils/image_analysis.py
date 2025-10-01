import os
import requests
import logging
import base64
from langfuse.openai import OpenAI
from io import BytesIO

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def upload_to_imgbb(image_file):
    """
    Upload an image to ImgBB and return the URL
    Args:
        image_file: The image file object from request.files
    Returns:
        str: URL of the uploaded image or None if upload fails
    """
    try:
        api_key = os.environ.get("IMGBB_API_KEY")
        if not api_key:
            logger.error("IMGBB_API_KEY environment variable not found")
            return None

        # Reset file pointer to beginning
        image_file.seek(0)
        
        # Create form data with the image
        files = {'image': (image_file.filename, image_file, image_file.content_type)}
        
        # Set up the payload
        payload = {'key': api_key}
        
        # Log the upload attempt
        logger.info(f"Uploading image to ImgBB: {image_file.filename}")
        
        # Send the request to ImgBB API
        response = requests.post(
            'https://api.imgbb.com/1/upload',
            files=files,
            data=payload,
            timeout=30  # 30 second timeout for image upload
        )
        
        # Check response
        if response.status_code == 200:
            response_data = response.json()
            if response_data.get('success'):
                image_url = response_data['data']['url']
                logger.info(f"Image successfully uploaded to ImgBB. URL: {image_url}")
                return image_url
            else:
                logger.error(f"ImgBB upload failed: {response_data}")
                return None
        else:
            logger.error(f"ImgBB API request failed: Status {response.status_code}")
            return None
            
    except Exception as e:
        logger.error(f"Error uploading to ImgBB: {str(e)}")
        return None

def analyze_image_with_openai(image_url=None, image_data=None):
    """
    Analyze an image using OpenAI Vision API with LangFuse tracing
    Args:
        image_url (str, optional): URL of the image
        image_data (bytes, optional): Raw image data
    Returns:
        str: Analysis text from OpenAI
    """
    try:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            logger.error("OPENAI_API_KEY environment variable not found")
            return "Error: OpenAI API key not configured"

        # Initialize the LangFuse-wrapped OpenAI client
        client = OpenAI(api_key=api_key)
        
        # Prepare the content based on whether we have a URL or raw data
        if image_url:
            logger.info(f"Analyzing image URL with OpenAI Vision: {image_url}")
            content = [
                {"type": "text", "text": "What does this diagram represent? Please analyze this software solution diagram and explain its purpose, components, and how they interact."},
                {"type": "image_url", "image_url": {"url": image_url}}
            ]
        elif image_data:
            logger.info("Analyzing image data with OpenAI Vision")
            # If we have raw image data, encode it as base64
            if isinstance(image_data, bytes):
                base64_image = base64.b64encode(image_data).decode('utf-8')
            else:
                # Assume it's already base64 encoded if not bytes
                base64_image = image_data
                
            content = [
                {"type": "text", "text": "What does this diagram represent? Please analyze this software solution diagram and explain its purpose, components, and how they interact."},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
            ]
        else:
            logger.error("Neither image URL nor image data provided")
            return "Error: No image provided for analysis"
        
        # Make the API call with LangFuse tracing
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": content
                }
            ],
            max_tokens=1000
        )
        
        # Extract and return the analysis
        analysis = response.choices[0].message.content
        logger.info("Successfully received analysis from OpenAI Vision")
        logger.info(f"Analysis: {analysis}")
        
        return analysis
        
    except Exception as e:
        logger.error(f"Error analyzing image with OpenAI: {str(e)}")
        return f"Error analyzing image: {str(e)}" 