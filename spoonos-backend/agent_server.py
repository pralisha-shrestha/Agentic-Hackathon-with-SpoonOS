# agent_server.py
# NeoStudio Backend - AI-assisted Neo Smart Contract Builder

import os
import json
import uuid
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import requests
import asyncio
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# SpoonOS imports
from spoon_ai.agents.toolcall import ToolCallAgent
from spoon_ai.chat import ChatBot
from spoon_ai.tools import ToolManager

# StorageTool is optional - import only if available
try:
    from spoon_toolkits import StorageTool
    STORAGE_TOOL_AVAILABLE = True
except ImportError:
    StorageTool = None
    STORAGE_TOOL_AVAILABLE = False

# Conversation storage
from conversation_storage import get_storage

# Import new agents
from agents import TaskingAgent, CodingAgent

# ============================================================================
# Data Models
# ============================================================================

class ContractMetadata(BaseModel):
    name: str
    symbol: Optional[str] = None
    description: Optional[str] = None
    shortName: Optional[str] = None

class ContractMethodParam(BaseModel):
    name: str
    type: str

class ContractVariable(BaseModel):
    id: str
    name: str
    type: str
    # Allow any JSON-serializable initial value (str, number, bool, object)
    initialValue: Optional[Any] = None
    description: Optional[str] = None

class ContractMethod(BaseModel):
    id: str
    name: str
    visibility: str = Field(default="public")  # "public" | "private" | "admin"
    params: List[ContractMethodParam] = Field(default_factory=list)
    returns: Optional[str] = None
    description: Optional[str] = None
    steps: Optional[List[str]] = None

class ContractEvent(BaseModel):
    id: str
    name: str
    params: List[ContractMethodParam] = Field(default_factory=list)
    description: Optional[str] = None

class PermissionRule(BaseModel):
    id: str
    name: str
    description: Optional[str] = None

class ContractSpec(BaseModel):
    id: str
    metadata: ContractMetadata
    variables: List[ContractVariable] = Field(default_factory=list)
    methods: List[ContractMethod] = Field(default_factory=list)
    events: List[ContractEvent] = Field(default_factory=list)
    permissions: List[PermissionRule] = Field(default_factory=list)
    language: str = Field(default="python")  # "python" | "csharp"

# API Request/Response Models
class PromptRequest(BaseModel):
    prompt: str

class ContractSpecRequest(BaseModel):
    userPrompt: str
    existingSpec: Optional[ContractSpec] = None
    conversationId: Optional[str] = None

class ContractCodeRequest(BaseModel):
    spec: ContractSpec
    conversationId: Optional[str] = None

class SimulateDeployRequest(BaseModel):
    spec: Optional[ContractSpec] = None
    code: Optional[str] = None

class ChatMessageRequest(BaseModel):
    message: str
    conversationId: Optional[str] = None
    existingSpec: Optional[ContractSpec] = None
    existingCode: Optional[str] = None

# ============================================================================
# Neo RPC Helper Functions
# ============================================================================

def get_neo_rpc_url() -> str:
    """Get Neo RPC URL from environment or use default"""
    return os.getenv("NEO_RPC_URL", "https://testnet1.neo.org:20332")

async def neo_rpc_call(method: str, params: List[Any] = None) -> Dict[str, Any]:
    """Make a JSON-RPC call to Neo node"""
    if params is None:
        params = []
    
    rpc_url = get_neo_rpc_url()
    payload = {
        "jsonrpc": "2.0",
        "method": method,
        "params": params,
        "id": 1
    }
    
    try:
        response = requests.post(rpc_url, json=payload, timeout=10)
        response.raise_for_status()
        result = response.json()
        
        if "error" in result:
            raise Exception(f"Neo RPC error: {result['error']}")
        
        return result.get("result", {})
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Neo RPC connection error: {str(e)}")

# ============================================================================
# SpoonOS Agent Setup
# ============================================================================

class ContractSpecAgent(ToolCallAgent):
    """Agent for generating structured contract specifications"""
    name: str = "contract_spec_agent"
    description: str = "Generates structured Neo smart contract specifications from natural language"
    
    system_prompt: str = """
    You are an expert Neo blockchain smart contract architect. Your job is to analyze user requirements
    and generate a structured contract specification in JSON format.
    
    The specification should include:
    - Metadata: name, symbol (optional), description
    - Variables: storage variables with types and initial values
    - Methods: public/private/admin methods with parameters and return types
    - Events: contract events with parameters
    - Permissions: access control rules
    
    Always return valid JSON that matches the ContractSpec schema.
    Focus on Neo N3 smart contract patterns (Python Boa or C#).
    """
    
    def __init__(self, llm_provider: str = "openai", model_name: Optional[str] = None):
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
        
        # Initialize tools (use StorageTool from spoon-toolkits if available)
        tools_list = []
        if STORAGE_TOOL_AVAILABLE and StorageTool:
            try:
                tools_list.append(StorageTool())
            except Exception:
                pass  # Continue without storage tool if initialization fails
        tools = ToolManager(tools_list)
        
        # Initialize LLM
        llm = ChatBot(
            llm_provider=llm_provider,
            model_name=model_name
        )
        
        super().__init__(llm=llm, available_tools=tools)

# ============================================================================
# FastAPI Application Setup
# ============================================================================

app = FastAPI(title="NeoStudio - Neo Smart Contract Builder")

# Configure CORS
# Get allowed origins from environment or use defaults
cors_origins_env = os.getenv("CORS_ORIGINS", "")
if cors_origins_env:
    # Parse comma-separated origins from environment
    origins = [origin.strip() for origin in cors_origins_env.split(",")]
else:
    # Default origins for development and Docker
    origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:80",
        "http://127.0.0.1:80",
        "http://frontend:80",
        "http://frontend",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/api/neo/status")
async def get_neo_status():
    """Get Neo network status via RPC"""
    try:
        # Make real RPC call to get block count
        result = await neo_rpc_call("getblockcount", [])
        block_height = result if isinstance(result, int) else result.get("count", 0)
        
        return {
            "network": "Neo N3 TestNet",
            "block_height": block_height,
            "rpc_url": get_neo_rpc_url()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get Neo status: {str(e)}")

@app.post("/api/neo/simulate_deploy")
async def simulate_deploy(request: SimulateDeployRequest):
    """Simulate contract deployment by making a real Neo RPC call"""
    try:
        # Make a real RPC call to demonstrate blockchain interaction
        # We'll call getblockcount as a demonstration, but in production
        # this could call invokescript or other contract-related methods
        result = await neo_rpc_call("getblockcount", [])
        block_height = result if isinstance(result, int) else result.get("count", 0)
        
        # Also try to get version info
        version_info = {}
        try:
            version_result = await neo_rpc_call("getversion", [])
            version_info = version_result if isinstance(version_result, dict) else {}
        except:
            pass
        
        return {
            "ok": True,
            "action": "simulated_deploy_via_blockcount",
            "neoResponse": {
                "block_height": block_height,
                "version": version_info,
                "message": "Successfully connected to Neo N3 TestNet"
            }
        }
    except Exception as e:
        return {
            "ok": False,
            "action": "simulate_deploy",
            "neoResponse": {"error": str(e)}
        }

@app.post("/api/contract/spec")
async def generate_contract_spec(request: ContractSpecRequest):
    """Generate structured contract specification from user prompt"""
    try:
        # Initialize agent
        agent = ContractSpecAgent()
        
        # Build prompt for the agent
        prompt = f"""
        Generate a structured Neo smart contract specification based on this user requirement:
        
        {request.userPrompt}
        
        """
        
        if request.existingSpec:
            prompt += f"""
            Existing specification (modify or extend this):
            {request.existingSpec.model_dump_json(indent=2)}
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
        
        # Generate session ID for tracking
        session_id = str(uuid.uuid4())
        
        # Use storage tool to save conversation context if available (demonstrates spoon-toolkit usage)
        # The StorageTool is available in the agent's tools and can be used by the agent
        # For direct usage, we'll use it to persist session data
        if STORAGE_TOOL_AVAILABLE and StorageTool:
            try:
                storage = StorageTool()
                # Storage tool usage - demonstrates spoon-toolkit integration
                storage_result = await storage.execute("set", f"session:{session_id}:prompt", request.userPrompt)
            except Exception as storage_error:
                # If storage fails, continue without it (tool is still integrated in agent)
                print(f"Storage tool warning: {storage_error}")
        
        # Run agent (agent has access to StorageTool through its tools)
        response = await agent.run(prompt)
        
        # Parse the response to extract JSON
        # Handle different response types
        if hasattr(response, 'content'):
            response_text = response.content
        elif hasattr(response, 'text'):
            response_text = response.text
        elif isinstance(response, str):
            response_text = response
        else:
            response_text = str(response)
        
        print(f"DEBUG: Agent response type: {type(response)}")
        print(f"DEBUG: Agent response text: {response_text[:500]}...")  # Log first 500 chars
        
        # Try to extract JSON from the response
        import re
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            try:
                json_str = json_match.group()
                print(f"DEBUG: Extracted JSON string: {json_str[:500]}...")
                spec_json = json.loads(json_str)
                print(f"DEBUG: Parsed JSON successfully")
                # Generate shortName if not provided (max 12 characters)
                if 'metadata' in spec_json and 'shortName' not in spec_json.get('metadata', {}):
                    contract_name = spec_json.get('metadata', {}).get('name', 'Contract')
                    short_name = contract_name[:12] if len(contract_name) <= 12 else contract_name[:12]
                    spec_json['metadata']['shortName'] = short_name
                spec = ContractSpec(**spec_json)
                print(f"DEBUG: Created ContractSpec successfully")
            except json.JSONDecodeError as json_err:
                print(f"DEBUG: JSON decode error: {json_err}")
                # Try to fix common JSON issues
                try:
                    cleaned_json = json_match.group().replace("'", '"')
                    spec_json = json.loads(cleaned_json)
                    spec = ContractSpec(**spec_json)
                    print(f"DEBUG: Created ContractSpec after cleaning")
                except Exception as clean_err:
                    print(f"DEBUG: Failed to clean and parse JSON: {clean_err}")
                    # Fallback: create a basic spec
                    contract_name = "GeneratedContract"
                    spec = ContractSpec(
                        id=str(uuid.uuid4()),
                        metadata=ContractMetadata(
                            name=contract_name,
                            description=request.userPrompt,
                            shortName=contract_name[:12]
                        ),
                        language="python"
                    )
            except Exception as validation_err:
                print(f"DEBUG: ContractSpec validation error: {validation_err}")
                print(f"DEBUG: JSON that failed validation: {json.dumps(spec_json, indent=2) if 'spec_json' in locals() else 'N/A'}")
                # Fallback: create a basic spec
                contract_name = "GeneratedContract"
                spec = ContractSpec(
                    id=str(uuid.uuid4()),
                    metadata=ContractMetadata(
                        name=contract_name,
                        description=request.userPrompt,
                        shortName=contract_name[:12]
                    ),
                    language="python"
                )
        else:
            print(f"DEBUG: No JSON match found in response")
            # Fallback: create a basic spec
            contract_name = "GeneratedContract"
            spec = ContractSpec(
                id=str(uuid.uuid4()),
                metadata=ContractMetadata(
                    name=contract_name,
                    description=request.userPrompt,
                    shortName=contract_name[:12]
                ),
                language="python"
            )
        
        # Save spec to storage (demonstrates spoon-toolkit usage) if available
        if STORAGE_TOOL_AVAILABLE and StorageTool:
            try:
                storage = StorageTool()
                await storage.execute("set", f"session:{session_id}:spec", spec.model_dump_json())
            except Exception as storage_err:
                print(f"DEBUG: Storage save error (non-fatal): {storage_err}")
        
        return {
            "spec": spec.model_dump(),
            "agentMessage": response_text
        }
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"ERROR: Exception in generate_contract_spec: {str(e)}")
        print(f"ERROR: Traceback: {error_trace}")
        raise HTTPException(status_code=500, detail=f"Failed to generate contract spec: {str(e)}")

@app.post("/api/contract/code")
async def generate_contract_code(request: ContractCodeRequest):
    """Generate Neo smart contract code from specification"""
    try:
        # Initialize agent
        agent = ContractSpecAgent()
        
        # Build prompt for code generation
        spec_json = request.spec.model_dump_json(indent=2)
        prompt = f"""
        Generate Neo smart contract code (Python Boa style) based on this specification:
        
        {spec_json}
        
        Return ONLY the Python code, no markdown, no explanations. Use proper Neo Boa syntax:
        - Use @public decorator for public methods
        - Import from boa3.builtin.*
        - Follow Neo N3 smart contract patterns
        """
        
        # Run agent
        response = await agent.run(prompt)
        code = str(response).strip()
        
        # Clean up code (remove markdown if present)
        if code.startswith("```"):
            lines = code.split("\n")
            code = "\n".join(lines[1:-1]) if len(lines) > 2 else code
        
        language = request.spec.language or "python"
        
        return {
            "code": code,
            "language": language
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate contract code: {str(e)}")

@app.post("/api/speech-to-text")
async def transcribe_audio(audio: UploadFile = File(...)):
    """Transcribe audio using ElevenLabs Speech-to-Text API (secure proxy)"""
    elevenlabs_api_key = os.getenv("ELEVENLABS_API_KEY")
    
    if not elevenlabs_api_key:
        # Check if it's an empty string
        if elevenlabs_api_key == "":
            raise HTTPException(
                status_code=500,
                detail="ElevenLabs API key is empty. Please set ELEVENLABS_API_KEY in your .env file with a valid API key."
            )
        raise HTTPException(
            status_code=500,
            detail="ElevenLabs API key not configured. Please add ELEVENLABS_API_KEY=your_api_key_here to your .env file in the project root, then restart the backend server."
        )
    
    try:
        # Read audio file content
        audio_content = await audio.read()
        
        # Prepare form data for ElevenLabs API
        # Note: ElevenLabs API expects 'file' parameter, not 'audio'
        files = {
            'file': (audio.filename or 'recording.webm', audio_content, audio.content_type or 'audio/webm')
        }
        data = {
            'model_id': 'scribe_v2'
        }
        
        # Proxy request to ElevenLabs API
        headers = {
            'xi-api-key': elevenlabs_api_key
        }
        
        response = requests.post(
            'https://api.elevenlabs.io/v1/speech-to-text',
            files=files,
            data=data,
            headers=headers,
            timeout=30
        )
        
        if not response.ok:
            error_detail = response.json().get('detail', 'Unknown error') if response.headers.get('content-type', '').startswith('application/json') else response.text
            raise HTTPException(
                status_code=response.status_code,
                detail=f"ElevenLabs API error: {error_detail}"
            )
        
        result = response.json()
        return {
            "text": result.get("text", ""),
            "status": "success"
        }
        
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to connect to ElevenLabs API: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to transcribe audio: {str(e)}"
        )

@app.get("/api/conversations")
async def get_conversations():
    """Get list of existing conversations from AIOZ storage"""
    try:
        storage = get_storage()
        conversations = await storage.list_conversations()
        
        # Convert to summary format for list view
        summaries = [conv.to_summary() for conv in conversations]
        
        return {
            "conversations": summaries
        }
    except Exception as e:
        print(f"Error fetching conversations: {e}")
        # Return empty list on error rather than failing
        return {
            "conversations": []
        }

@app.get("/api/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Get a specific conversation by ID"""
    try:
        storage = get_storage()
        conversation = await storage.load_conversation(conversation_id)
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        return {
            "conversation": conversation.to_dict()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load conversation: {str(e)}")

class SaveConversationRequest(BaseModel):
    conversationId: Optional[str] = None
    title: Optional[str] = None
    messages: Optional[List[Dict[str, str]]] = None
    spec: Optional[ContractSpec] = None
    code: Optional[str] = None
    language: Optional[str] = None

@app.post("/api/conversations")
async def save_conversation(request: SaveConversationRequest):
    """Save or update a conversation"""
    try:
        storage = get_storage()
        
        # Convert spec to dict if provided
        spec_dict = None
        if request.spec:
            spec_dict = request.spec.model_dump()
        
        conversation = await storage.create_or_update_conversation(
            conversation_id=request.conversationId,
            title=request.title,
            messages=request.messages,
            spec=spec_dict,
            code=request.code,
            language=request.language,
        )
        
        return {
            "conversation": conversation.to_dict()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save conversation: {str(e)}")

@app.delete("/api/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete a conversation"""
    try:
        storage = get_storage()
        success = await storage.delete_conversation(conversation_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Conversation not found or failed to delete")
        
        return {
            "success": True,
            "message": "Conversation deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete conversation: {str(e)}")

@app.post("/api/chat/message")
async def chat_message(request: ChatMessageRequest):
    """Unified chat endpoint using TaskingAgent orchestrator"""
    try:
        # Initialize TaskingAgent
        tasking_agent = TaskingAgent()
        
        # Convert existing spec to dict if provided
        existing_spec_dict = None
        if request.existingSpec:
            existing_spec_dict = request.existingSpec.model_dump()
        
        # Process message through TaskingAgent
        result = await tasking_agent.process_message(
            user_message=request.message,
            existing_spec=existing_spec_dict,
            existing_code=request.existingCode,
            conversation_id=request.conversationId
        )
        
        # Convert spec dict back to ContractSpec if present
        spec = None
        if result.get("spec"):
            try:
                spec = ContractSpec(**result["spec"])
            except Exception as e:
                print(f"Warning: Failed to validate spec: {e}")
                # Return as dict if validation fails
                spec = result["spec"]
        
        # Prepare response
        response_data = {
            "agentMessage": result.get("agent_message", ""),
            "spec": spec.model_dump() if isinstance(spec, ContractSpec) else result.get("spec"),
            "code": result.get("code"),
            "language": result.get("language", "python")
        }
        
        # Save conversation if conversationId is provided
        if request.conversationId or result.get("spec"):
            try:
                title = None
                if isinstance(spec, ContractSpec) and spec.metadata:
                    title = spec.metadata.name
                elif result.get("spec") and isinstance(result["spec"], dict):
                    title = result["spec"].get("metadata", {}).get("name")
                
                storage = get_storage()
                await storage.create_or_update_conversation(
                    conversation_id=request.conversationId,
                    title=title,
                    messages=None,  # Messages are managed separately
                    spec=result.get("spec"),
                    code=result.get("code"),
                    language=result.get("language", "python"),
                )
            except Exception as save_error:
                print(f"Warning: Failed to save conversation: {save_error}")
                # Continue even if save fails
        
        return response_data
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"ERROR: Exception in chat_message: {str(e)}")
        print(f"ERROR: Traceback: {error_trace}")
        raise HTTPException(status_code=500, detail=f"Failed to process chat message: {str(e)}")

# Legacy endpoint for backward compatibility
@app.post("/generate-contract", response_model=dict)
async def generate_contract_legacy(request_data: PromptRequest):
    """Legacy endpoint - redirects to new spec generation"""
    try:
        spec_request = ContractSpecRequest(userPrompt=request_data.prompt)
        spec_result = await generate_contract_spec(spec_request)
        
        code_request = ContractCodeRequest(spec=spec_result["spec"])
        code_result = await generate_contract_code(code_request)
        
        return {
            "status": "success",
            "contractCode": code_result["code"],
            "contractHash": None,
            "message": "Contract generated successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))