import os

os.environ["LD_LIBRARY_PATH"] = os.getcwd()
from weasyprint import HTML
import logging
import base64
from langfuse.openai import OpenAI

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def analyze_image_with_vision_api(image_url=None, image_data=None):
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

        # Initialize LangFuse-wrapped OpenAI client
        client = OpenAI(api_key=api_key)

        # Determine content based on what was provided
        if image_url:
            # URL-based content
            logger.info(f"Analyzing image URL with OpenAI Vision: {image_url}")
            content = [{
                "type":
                "text",
                "text":
                "Analyze this software solution diagram. List all nodes and provide a brief explanation for each. Do not use any formatting such as bold, italics, or underline. Use line breaks only. Do not include any commentary or justification—only output the node names and their explanations. After listing all nodes, provide a single concluding paragraph that offers a holistic view of the entire solution."
            }, {
                "type": "image_url",
                "image_url": {
                    "url": image_url
                }
            }]
        elif image_data:
            # Base64 encoded image data
            logger.info("Analyzing image data directly with OpenAI Vision")
            base64_image = base64.b64encode(image_data).decode('utf-8')
            content = [{
                "type":
                "text",
                "text":
                "Analyze this software solution diagram. List all nodes and provide a brief explanation for each. Do not use any formatting such as bold, italics, or underline. Use line breaks only. Do not include any commentary or justification—only output the node names and their explanations. After listing all nodes, provide a single concluding paragraph that offers a holistic view of the entire solution."
            }, {
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/png;base64,{base64_image}"
                }
            }]
        else:
            logger.error("No image URL or image data provided")
            return "Error: No image provided for analysis"

        # Make the API request using OpenAI SDK with LangFuse tracing
        logger.info("Sending API request to OpenAI for image analysis")
        response = client.chat.completions.create(model="gpt-4o",
                                                  messages=[{
                                                      "role": "user",
                                                      "content": content
                                                  }],
                                                  max_tokens=1000)

        analysis = response.choices[0].message.content
        logger.info("Successfully received analysis from OpenAI Vision API")
        return analysis

    except Exception as e:
        logger.error(f"Error analyzing image with OpenAI: {str(e)}")
        return f"Error analyzing image: {str(e)}"


def enhance_text_with_openai(text):
    """Enhance text using OpenAI with LangFuse tracing."""
    try:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            logger.error("OPENAI_API_KEY environment variable not found")
            return "Error: OpenAI API key not configured"

        # Initialize LangFuse-wrapped OpenAI client
        client = OpenAI(api_key=api_key)

        # Create prompt for OpenAI
        prompt = f"""
        Please enhance the following technical explanation to make it more technical, more professional, and well-structured:

        {text}

        Your enhanced version should:
        1. Maintain all the technical details and be more comprehensive
        2. Format the text with proper paragraphs
        3. Suggest tools and technologies to use — white-labeling preferred
        4. Structure it in an 'X then Y' format
        5. Make it concise and to the point
        6. Never use fluff words, this is a technical document for the engineering team
        7. Do not use filler words, if the word is not adding value, remove it
        """

        # Make the API request using OpenAI SDK with LangFuse tracing
        logger.info("Sending API request to OpenAI for text enhancement")
        response = client.chat.completions.create(model="gpt-4o",
                                                  messages=[{
                                                      "role": "user",
                                                      "content": prompt
                                                  }],
                                                  max_tokens=1500)

        enhanced_text = response.choices[0].message.content
        logger.info("Successfully received enhanced text from OpenAI")
        return enhanced_text

    except Exception as e:
        logger.error(f"Error enhancing text: {str(e)}")
        raise


def structure_solution_with_openai(ai_analysis, solution_explanation):
    """Structure a solution using OpenAI based on AI analysis and user explanation with LangFuse tracing."""
    try:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            logger.error("OPENAI_API_KEY environment variable not found")
            return "Error: OpenAI API key not configured"

        # Initialize LangFuse-wrapped OpenAI client
        client = OpenAI(api_key=api_key)

        # Create prompt for OpenAI
        prompt = f"""
        I need to structure a technical solution based on the following information:
        
        AI ANALYSIS OF SOLUTION DIAGRAM:
        {ai_analysis}
        
        USER'S SOLUTION EXPLANATION:
        {solution_explanation}
        
        Please provide the following:
        
        1. A general title that encompasses the solution idea
        2. A numbered set of steps based on the solution items (5-10 lines)
        3. A short paragraph arguing technically why this approach is good, focusing on hours saved and reusability
        4. A difficulty percentage (most projects range from 30% to 70%) — each week adds 5% to the difficulty, so a 10 week project would be 50% difficulty    
        5. Don't make difficulty 50%, don't be afraid to make it higher or lower depending on the complexity of the solution and avoid multiples of 5   

        Format your response as JSON with the following structure:
        {{
            "title": "Your suggested title",
            "steps": "Numbered steps as text",
            "approach": "Technical justification paragraph",
            "difficulty": 50 (a number between 0 and 100)
        }}
        """

        # Make the API request using OpenAI SDK with LangFuse tracing
        logger.info("Sending API request to OpenAI for solution structuring")
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "user",
                "content": prompt
            }],
            response_format={"type": "json_object"},
            max_tokens=1500)

        structured_solution_text = response.choices[0].message.content
        logger.info("Successfully received structured solution from OpenAI")

        # Parse JSON response
        import json
        structured_solution = json.loads(structured_solution_text)

        # Ensure all expected fields are present
        required_fields = ["title", "steps", "approach", "difficulty"]
        for field in required_fields:
            if field not in structured_solution:
                structured_solution[
                    field] = "" if field != "difficulty" else 50

        # Ensure difficulty is an integer
        try:
            structured_solution["difficulty"] = int(
                structured_solution["difficulty"])
        except (ValueError, TypeError):
            structured_solution["difficulty"] = 50

        return structured_solution
    except Exception as e:
        logger.error(f"Error structuring solution: {str(e)}")
        raise Exception(f"OpenAI API request failed: {str(e)}")


def enhance_structured_content_with_openai(title, steps, approach):
    """Enhance structured content (title, steps, approach) using OpenAI with specific HTML formatting and LangFuse tracing."""
    try:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            logger.error("OPENAI_API_KEY environment variable not found")
            return {"title": title, "steps": steps, "approach": approach}

        # Initialize LangFuse-wrapped OpenAI client
        client = OpenAI(api_key=api_key)

        # Create prompt for OpenAI
        prompt = f"""
        Please enhance the following structured content by adding appropriate HTML formatting tags to make it more visually appealing and professional. 

        IMPORTANT: Only add HTML formatting tags (like <strong>, <em>, <br>, <ul>, <li>, etc.) to enhance the presentation. Do NOT change the actual text content, meaning, or structure.
        
        TITLE: {title}
        
        STEPS: {steps}
        
        APPROACH: {approach}
        
        Please return the enhanced content in JSON format with the following structure:
        {{
            "title": "Enhanced title with HTML formatting",
            "steps": "Enhanced steps with HTML formatting",
            "approach": "Enhanced approach with HTML formatting"
        }}
        
        Remember: Only add HTML formatting tags, do not change the actual text content.
        """

        # Make the API request using OpenAI SDK with LangFuse tracing
        logger.info(
            "Sending API request to OpenAI for structured content enhancement")
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "user",
                "content": prompt
            }],
            response_format={"type": "json_object"},
            max_tokens=2000)

        enhanced_content_text = response.choices[0].message.content
        logger.info(
            "Successfully received enhanced structured content from OpenAI")

        # Parse JSON response
        import json
        enhanced_content = json.loads(enhanced_content_text)

        # Ensure all expected fields are present, fallback to original if missing
        result = {
            "title": enhanced_content.get("title", title),
            "steps": enhanced_content.get("steps", steps),
            "approach": enhanced_content.get("approach", approach)
        }

        return result

    except Exception as e:
        logger.error(f"Error enhancing structured content: {str(e)}")
        # Return original content if enhancement fails
        return {"title": title, "steps": steps, "approach": approach}


def generate_stack_analysis_with_openai(ai_analysis,
                                        solution_explanation,
                                        image_link=''):
    """Generate comprehensive per-node stack analysis using OpenAI with LangFuse tracing."""
    try:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            logger.error("OPENAI_API_KEY environment variable not found")
            return "Error: OpenAI API key not configured"

        # Initialize LangFuse-wrapped OpenAI client
        client = OpenAI(api_key=api_key)

        # Prepare the context for OpenAI
        context_parts = []

        if ai_analysis.strip():
            context_parts.append(f"AI Analysis of the diagram:\n{ai_analysis}")

        context_parts.append(f"Solution Explanation:\n{solution_explanation}")

        if image_link:
            context_parts.append(
                f"Reference diagram available at: {image_link}")

        context = "\n\n".join(context_parts)

        # Create the prompt for stack analysis
        prompt = f"""Based on the following solution details, please provide a comprehensive per-node stack analysis:

{context}

Please analyze the solution and provide:

1. List all nodes/components in the architecture
2. For each node, suggest specific stacks, tools, and services that could be utilized
3. Prioritize tools that can handle multiple functions single-handedly to reduce manual engineering work
4. If a tool does all the work, it is the ideal solution - we want to delegate to third parties as much as possible
5. When suggesting whitelabel solutions, format them as "ToolName (service)" rather than explicitly mentioning whitelabeling
6. Provide well-researched recommendations

Format the response in a clear, structured manner with:
- Node Name: Re-state the node name
  - Recommended Stack: 3-5 specific tools/services with the following format: "ToolName (Tool: www.toolwebsite.com)" OR "ServiceName (Service: www.ServiceWebsite.com)"

Make sure to be thorough and specific with actual tool names, not generic categories. Do not bold, italic, underline, or any other formatting. You can line break only. Do not write justifications or comments, just the list of tools and services per node."""

        # Make the API request using OpenAI SDK with LangFuse tracing
        logger.info("Sending API request to OpenAI for stack analysis")
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role":
                "system",
                "content":
                "You are an expert software architect with deep knowledge of modern development stacks, cloud services, and automation tools. Provide detailed, practical recommendations that minimize manual engineering work."
            }, {
                "role": "user",
                "content": prompt
            }],
            max_tokens=1500,
            temperature=0.3)

        stack_analysis = response.choices[0].message.content.strip()
        logger.info("Successfully received stack analysis from OpenAI")
        return stack_analysis

    except Exception as e:
        logger.error(f"Error generating stack analysis: {str(e)}")
        raise


def generate_diagram_description_with_openai(ideation_content):
    """Generate a detailed diagram description based on ideation content using OpenAI with LangFuse tracing."""
    try:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            logger.error("OPENAI_API_KEY environment variable not found")
            return "Error: OpenAI API key not configured"

        # Initialize LangFuse-wrapped OpenAI client
        client = OpenAI(api_key=api_key)

        # Create prompt for OpenAI
        prompt = f"""
        Based on the following ideation content, generate a detailed description of how a diagram should be drawn to represent this solution:

        IDEATION CONTENT:
        {ideation_content}

        Please provide a comprehensive diagram description that includes:

        1. ALL NODES: List each node/component with:
           - Node name and purpose
           - Visual form (sharp square, rounded rectangle, diamond, database cylinder, circle, hexagon, etc.)
           - Text that should appear in/on the node

        2. CONNECTIONS: Describe how nodes connect:
           - Which nodes connect to which other nodes
           - Connection types (solid arrow, dashed arrow, bidirectional arrow, simple line, dotted line, etc.)
           - Direction of data/process flow

        3. VISUAL LAYOUT: Include relevant visual information:
           - Suggested positioning (top-to-bottom, left-to-right, circular, hierarchical, etc.)
           - Grouping of related components
           - Any color coding or visual emphasis needed

        4. LABELS AND ANNOTATIONS: Any additional text, labels, or annotations needed

        Be descriptive and include only relevant actionable details. Focus on technical accuracy and clarity. Do not include fluff or unnecessary commentary.
        """

        # Make the API request using OpenAI SDK with LangFuse tracing
        logger.info(
            "Sending API request to OpenAI for diagram description generation")
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role":
                "system",
                "content":
                "You are an expert technical diagram designer with deep knowledge of software architecture visualization, UML diagrams, and technical documentation. Provide clear, actionable diagram descriptions."
            }, {
                "role": "user",
                "content": prompt
            }],
            max_tokens=1500,
            temperature=0.3)

        diagram_description = response.choices[0].message.content.strip()
        logger.info("Successfully received diagram description from OpenAI")
        return diagram_description

    except Exception as e:
        logger.error(f"Error generating diagram description: {str(e)}")
        raise Exception(f"OpenAI API request failed: {str(e)}")


def generate_sketch_with_openai_assistant(planning_content):
    """Generate sketch content using OpenAI's assistant API based on planning content with LangFuse tracing."""
    try:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            logger.error("OPENAI_API_KEY environment variable not found")
            return "Error: OpenAI API key not configured"

        # Initialize LangFuse-wrapped OpenAI client
        client = OpenAI(api_key=api_key)

        # Assistant ID for the specific assistant
        assistant_id = "asst_uui77dmWGC629GFlP22QoSzT"

        logger.info(
            f"Creating thread and running assistant {assistant_id} for sketch generation"
        )

        # Create a thread
        thread = client.beta.threads.create()

        # Add the planning content as a message to the thread
        client.beta.threads.messages.create(thread_id=thread.id,
                                            role="user",
                                            content=planning_content)

        # Run the assistant
        run = client.beta.threads.runs.create(thread_id=thread.id,
                                              assistant_id=assistant_id)

        # Wait for the run to complete with optimized polling
        import time
        max_wait_time = 120  # Reduced from 60 to 120 seconds for better reliability
        start_time = time.time()
        poll_interval = 2  # Start with 2 second intervals
        
        logger.info(f"Assistant run started with ID: {run.id}, polling for completion...")

        while run.status in ['queued', 'in_progress', 'cancelling']:
            elapsed_time = time.time() - start_time
            
            if elapsed_time > max_wait_time:
                logger.error(f"Assistant run timed out after {max_wait_time} seconds")
                # Try to cancel the run
                try:
                    client.beta.threads.runs.cancel(thread_id=thread.id, run_id=run.id)
                    logger.info("Cancelled the timed-out assistant run")
                except Exception as cancel_error:
                    logger.warning(f"Could not cancel run: {cancel_error}")
                return "Error: Assistant run timed out. Please try again with shorter content or try again later."

            # Dynamic polling interval - start with 2s, increase to 3s after 30s
            if elapsed_time > 30:
                poll_interval = 3
            
            logger.debug(f"Assistant status: {run.status}, elapsed: {elapsed_time:.1f}s")
            time.sleep(poll_interval)
            
            try:
                run = client.beta.threads.runs.retrieve(thread_id=thread.id, run_id=run.id)
            except Exception as retrieve_error:
                logger.error(f"Error retrieving run status: {retrieve_error}")
                return f"Error: Could not check assistant status: {str(retrieve_error)}"

        logger.info(f"Assistant run completed with status: {run.status}")

        if run.status == 'completed':
            # Retrieve the messages
            try:
                messages = client.beta.threads.messages.list(thread_id=thread.id)
            except Exception as messages_error:
                logger.error(f"Error retrieving messages: {messages_error}")
                return f"Error: Could not retrieve assistant response: {str(messages_error)}"

            # Get the assistant's response (the first message should be the assistant's response)
            for message in messages.data:
                if message.role == 'assistant':
                    # Extract text content from the message
                    content = ""
                    for content_block in message.content:
                        if content_block.type == 'text':
                            content += content_block.text.value

                    if content.strip():
                        logger.info("Successfully received sketch content from OpenAI assistant")
                        return content.strip()

            logger.error("No assistant response found in thread")
            return "Error: No response received from assistant"
        
        elif run.status == 'failed':
            logger.error(f"Assistant run failed. Last error: {getattr(run, 'last_error', 'Unknown error')}")
            return "Error: Assistant run failed. Please try again."
        
        elif run.status == 'cancelled':
            logger.warning("Assistant run was cancelled")
            return "Error: Assistant run was cancelled. Please try again."
        
        elif run.status == 'expired':
            logger.error("Assistant run expired")
            return "Error: Assistant run expired. Please try again."
        
        else:
            logger.error(f"Assistant run ended with unexpected status: {run.status}")
            return f"Error: Assistant run ended with status: {run.status}. Please try again."

    except Exception as e:
        logger.error(f"Error generating sketch with OpenAI assistant: {str(e)}")
        # Provide a more user-friendly error message
        if "timeout" in str(e).lower():
            return "Error: Request timed out. Please try again with shorter content."
        elif "rate limit" in str(e).lower():
            return "Error: API rate limit exceeded. Please wait a moment and try again."
        elif "api key" in str(e).lower():
            return "Error: API configuration issue. Please contact support."
        else:
            return f"Error: Unable to generate sketch content. Please try again. ({str(e)[:100]}...)"
