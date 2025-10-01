#!/usr/bin/env python3
"""
Test script to verify OpenAI Assistant API is working correctly.
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_assistant_api():
    """Test the OpenAI Assistant API."""
    print("🧪 Testing OpenAI Assistant API...")
    
    # Check environment variables
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("❌ OPENAI_API_KEY environment variable not found")
        return False
    
    print("✅ OpenAI API key configured")
    
    try:
        from langfuse.openai import OpenAI
        
        # Initialize client
        client = OpenAI(api_key=api_key)
        
        # Assistant ID that's being used in the app
        assistant_id = "asst_uui77dmWGC629GFlP22QoSzT"
        
        print(f"📋 Testing assistant: {assistant_id}")
        
        # Test planning content
        test_content = """
        Create a simple diagram showing:
        1. User Authentication System
        2. Database Storage
        3. API Gateway
        4. Frontend Application
        
        The user logs in through the frontend, which connects to the API gateway,
        which authenticates through the auth system and stores data in the database.
        """
        
        print("🔧 Creating thread...")
        thread = client.beta.threads.create()
        print(f"✅ Thread created: {thread.id}")
        
        print("📝 Adding message to thread...")
        client.beta.threads.messages.create(
            thread_id=thread.id,
            role="user",
            content=test_content
        )
        
        print("🚀 Starting assistant run...")
        run = client.beta.threads.runs.create(
            thread_id=thread.id,
            assistant_id=assistant_id
        )
        print(f"✅ Run started: {run.id}")
        
        # Poll for completion
        import time
        max_wait = 60  # 1 minute for test
        start_time = time.time()
        
        print("⏳ Polling for completion...")
        while run.status in ['queued', 'in_progress', 'cancelling']:
            elapsed = time.time() - start_time
            print(f"   Status: {run.status} (elapsed: {elapsed:.1f}s)")
            
            if elapsed > max_wait:
                print(f"⏰ Test timeout after {max_wait}s")
                return False
            
            time.sleep(2)
            run = client.beta.threads.runs.retrieve(thread_id=thread.id, run_id=run.id)
        
        print(f"🏁 Final status: {run.status}")
        
        if run.status == 'completed':
            # Get the response
            messages = client.beta.threads.messages.list(thread_id=thread.id)
            
            for message in messages.data:
                if message.role == 'assistant':
                    content = ""
                    for content_block in message.content:
                        if content_block.type == 'text':
                            content += content_block.text.value
                    
                    print("✅ Assistant response received!")
                    print(f"📄 Content length: {len(content)} characters")
                    print(f"📝 First 200 characters: {content[:200]}...")
                    return True
            
            print("❌ No assistant response found")
            return False
        
        elif run.status == 'failed':
            print(f"❌ Assistant run failed: {getattr(run, 'last_error', 'Unknown error')}")
            return False
        
        else:
            print(f"❌ Unexpected status: {run.status}")
            return False
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_assistant_api()
    if success:
        print("\n🎉 Assistant API test completed successfully!")
    else:
        print("\n💥 Assistant API test failed!")
    sys.exit(0 if success else 1) 