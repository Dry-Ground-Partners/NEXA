#!/usr/bin/env python3
"""
Test script to verify LangFuse integration is working correctly.
Run this script to test the OpenAI + LangFuse integration.
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_langfuse_integration():
    """Test the LangFuse integration with OpenAI."""
    print("🧪 Testing LangFuse integration...")
    
    # Check environment variables
    required_vars = [
        "OPENAI_API_KEY",
        "LANGFUSE_SECRET_KEY", 
        "LANGFUSE_PUBLIC_KEY"
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.environ.get(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        return False
    
    print("✅ Environment variables configured")
    
    try:
        # Test LangFuse initialization
        from langfuse import Langfuse
        
        langfuse = Langfuse(
            secret_key=os.environ.get("LANGFUSE_SECRET_KEY"),
            public_key=os.environ.get("LANGFUSE_PUBLIC_KEY"),
            host=os.environ.get("LANGFUSE_HOST", "https://cloud.langfuse.com")
        )
        
        print("✅ LangFuse client initialized")
        
        # Test authentication
        print("🔐 Testing LangFuse authentication...")
        auth_result = langfuse.auth_check()
        if auth_result:
            print("✅ LangFuse authentication successful")
        else:
            print("❌ LangFuse authentication failed")
            return False
        
        # Test OpenAI with LangFuse wrapper
        from langfuse.openai import OpenAI
        
        client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        
        print("✅ LangFuse-wrapped OpenAI client created")
        
        # Test multiple OpenAI completions with automatic LangFuse tracing
        print("🤖 Testing OpenAI completions with automatic LangFuse tracing...")
        
        # First completion
        response1 = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "user", "content": "Say 'Hello from LangFuse integration test #1!'"}
            ],
            max_tokens=50
        )
        
        result1 = response1.choices[0].message.content
        print(f"🤖 OpenAI Response 1: {result1}")
        
        # Second completion
        response2 = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "user", "content": "Say 'Hello from LangFuse integration test #2!'"}
            ],
            max_tokens=50
        )
        
        result2 = response2.choices[0].message.content
        print(f"🤖 OpenAI Response 2: {result2}")
        
        # Test vision API call (similar to your Flask app)
        print("👁️ Testing OpenAI Vision API with LangFuse tracing...")
        
        vision_response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "What's in this image?"},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"
                            }
                        }
                    ]
                }
            ],
            max_tokens=100
        )
        
        vision_result = vision_response.choices[0].message.content
        print(f"👁️ Vision API Response: {vision_result[:100]}...")
        
        # Flush to ensure all traces are sent
        langfuse.flush()
        print("✅ All traces flushed to LangFuse")
        
        print("\n🎉 LangFuse integration test completed successfully!")
        print(f"📊 Check your LangFuse dashboard at: {os.environ.get('LANGFUSE_HOST', 'https://cloud.langfuse.com')}")
        print("🔍 You should see 3 separate traces for the OpenAI API calls")
        print("💡 The automatic tracing is working perfectly - your Flask app will trace all OpenAI calls!")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_langfuse_integration()
    sys.exit(0 if success else 1) 