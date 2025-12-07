# agents/tasking_agent.py
# Tasking Agent (Orchestrator) for coordinating work and delegating to CodingAgent

import os
import json
import uuid
import re
from typing import Optional, Dict, Any
from spoon_ai.agents.toolcall import ToolCallAgent
from spoon_ai.chat import ChatBot
from spoon_ai.tools import ToolManager

# Import StorageTool if available
try:
    from spoon_toolkits import StorageTool
    STORAGE_TOOL_AVAILABLE = True
except ImportError:
    StorageTool = None
    STORAGE_TOOL_AVAILABLE = False

# Import CodingAgent for delegation
from .coding_agent import CodingAgent


class TaskingAgent(ToolCallAgent):
    """Orchestrator agent that coordinates tasks and delegates to CodingAgent"""
    
    name: str = "tasking_agent"
    description: str = "Orchestrates smart contract development tasks and delegates code work to CodingAgent"
    
    system_prompt: str = """
    You are a Neo blockchain smart contract development orchestrator. Your job is to:
    
    1. Analyze user requirements and generate structured contract specifications
    2. Break down complex tasks into manageable steps
    3. Delegate code generation tasks to the CodingAgent when needed
    4. Manage conversation context and coordinate between different agents
    5. Provide clear, helpful responses to users
    
    When you need to generate code:
    - First, create or update the contract specification (JSON format)
    - Then delegate to CodingAgent to generate the actual code
    - Return both the spec and code to the user
    
    Always be helpful, ask clarifying questions when needed, and ensure specifications
    are complete before generating code.
    
    The specification should include:
    - Metadata: name, symbol (optional), description
    - Variables: storage variables with types and initial values
    - Methods: public/private/admin methods with parameters and return types
    - Events: contract events with parameters
    - Permissions: access control rules
    - Language: "python" or "csharp"
    """
    
    def __init__(self, llm_provider: Optional[str] = None, model_name: Optional[str] = None):
        # Determine LLM provider from environment
        if not llm_provider:
            if os.getenv("OPENAI_API_KEY"):
                llm_provider = "openai"
                model_name = model_name or "gpt-4o"
            elif os.getenv("ANTHROPIC_API_KEY"):
                llm_provider = "anthropic"
                model_name = model_name or "claude-sonnet-4-20250514"
            elif os.getenv("GEMINI_API_KEY"):
                llm_provider = "gemini"
                model_name = model_name or "gemini-2.0-flash-exp"
            else:
                raise ValueError("No LLM provider API key found. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY")
        
        # Initialize tools
        tools_list = []
        
        # Add StorageTool if available
        if STORAGE_TOOL_AVAILABLE and StorageTool:
            try:
                tools_list.append(StorageTool())
            except Exception:
                pass
        
        tools = ToolManager(tools_list)
        
        # Initialize LLM
        llm = ChatBot(
            llm_provider=llm_provider,
            model_name=model_name
        )
        
        super().__init__(llm=llm, available_tools=tools)
        
        # Initialize CodingAgent for delegation
        self.coding_agent = CodingAgent(llm_provider=llm_provider, model_name=model_name)
    
    async def generate_spec(self, user_prompt: str, existing_spec: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate contract specification from user prompt"""
        prompt = f"""
        Generate a structured Neo smart contract specification based on this user requirement:
        
        {user_prompt}
        
        """
        
        if existing_spec:
            prompt += f"""
            Existing specification (modify or extend this):
            {json.dumps(existing_spec, indent=2)}
            """
        
        prompt += """
        Return ONLY a valid JSON object matching this schema:
        {
            "id": "unique-id",
            "metadata": {
                "name": "ContractName",
                "symbol": "SYMBOL",
                "description": "Description"
            },
            "variables": [
                {"id": "var1", "name": "variableName", "type": "str", "initialValue": "default"}
            ],
            "methods": [
                {
                    "id": "method1",
                    "name": "methodName",
                    "visibility": "public",
                    "params": [{"name": "param1", "type": "str"}],
                    "returns": "bool",
                    "description": "Method description"
                }
            ],
            "events": [],
            "permissions": [],
            "language": "python"
        }
        """
        
        response = await self.run(prompt)
        
        # Parse the response to extract JSON
        if hasattr(response, 'content'):
            response_text = response.content
        elif hasattr(response, 'text'):
            response_text = response.text
        elif isinstance(response, str):
            response_text = response
        else:
            response_text = str(response)
        
        # Try to extract JSON from the response
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            try:
                json_str = json_match.group()
                spec_json = json.loads(json_str)
                
                # Generate shortName if not provided
                if 'metadata' in spec_json and 'shortName' not in spec_json.get('metadata', {}):
                    contract_name = spec_json.get('metadata', {}).get('name', 'Contract')
                    short_name = contract_name[:12] if len(contract_name) <= 12 else contract_name[:12]
                    spec_json['metadata']['shortName'] = short_name
                
                # Ensure id is present
                if 'id' not in spec_json:
                    spec_json['id'] = str(uuid.uuid4())
                
                return spec_json
            except json.JSONDecodeError:
                # Try to fix common JSON issues
                try:
                    cleaned_json = json_match.group().replace("'", '"')
                    spec_json = json.loads(cleaned_json)
                    if 'id' not in spec_json:
                        spec_json['id'] = str(uuid.uuid4())
                    return spec_json
                except Exception:
                    pass
        
        # Fallback: create a basic spec
        contract_name = "GeneratedContract"
        return {
            "id": str(uuid.uuid4()),
            "metadata": {
                "name": contract_name,
                "description": user_prompt,
                "shortName": contract_name[:12]
            },
            "variables": [],
            "methods": [],
            "events": [],
            "permissions": [],
            "language": "python"
        }
    
    async def process_message(
        self,
        user_message: str,
        existing_spec: Optional[Dict[str, Any]] = None,
        existing_code: Optional[str] = None,
        conversation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process a user message and coordinate with CodingAgent as needed.
        Returns a dict with spec, code, and agent_message.
        """
        # Analyze the message to determine what needs to be done
        message_lower = user_message.lower()
        needs_code = False
        needs_spec = False
        
        # Determine what's needed
        if "create" in message_lower or "new" in message_lower or "build" in message_lower:
            needs_spec = True
            needs_code = True
        elif "modify" in message_lower or "update" in message_lower or "change" in message_lower:
            if existing_spec:
                needs_spec = True
                needs_code = True
            else:
                needs_spec = True
                needs_code = True
        elif "code" in message_lower or "generate code" in message_lower:
            if existing_spec:
                needs_code = True
            else:
                needs_spec = True
                needs_code = True
        elif "explain" in message_lower or "what" in message_lower:
            # Just explanation, no code generation needed
            needs_spec = False
            needs_code = False
        else:
            # Default: assume they want a spec and code
            needs_spec = True
            needs_code = True
        
        spec = existing_spec
        code = existing_code
        agent_message = ""
        
        # Generate spec if needed
        if needs_spec:
            spec = await self.generate_spec(user_message, existing_spec)
            agent_message = f"Generated contract specification for: {spec.get('metadata', {}).get('name', 'Contract')}"
        
        # Generate code if needed and we have a spec
        if needs_code and spec:
            try:
                language = spec.get('language', 'python')
                code = await self.coding_agent.generate_code(spec, language)
                if agent_message:
                    agent_message += f"\n\nGenerated {language} code for the contract."
                else:
                    agent_message = f"Generated {language} code for the contract."
            except Exception as e:
                agent_message = f"Generated specification, but encountered an error generating code: {str(e)}"
        
        # If no spec/code generation, just provide a conversational response
        if not needs_spec and not needs_code:
            response = await self.run(f"""
            User message: {user_message}
            
            Provide a helpful response about the contract or code. Be conversational and helpful.
            """)
            agent_message = str(response)
        
        return {
            "spec": spec,
            "code": code,
            "agent_message": agent_message,
            "language": spec.get('language', 'python') if spec else 'python'
        }

