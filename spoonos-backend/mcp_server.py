# mcp_server.py
# MCP Server with tools for Neo blockchain, code generation, and storage

import os
import json
import uuid
from typing import Optional, List, Dict, Any
from fastmcp import FastMCP
import requests
from conversation_storage import get_storage

# Initialize MCP server
mcp = FastMCP("NeoStudio MCP Server")

# ============================================================================
# Neo Blockchain Tools
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
        raise Exception(f"Neo RPC connection error: {str(e)}")

@mcp.tool()
async def get_neo_status() -> Dict[str, Any]:
    """Get Neo network status via RPC"""
    try:
        result = await neo_rpc_call("getblockcount", [])
        block_height = result if isinstance(result, int) else result.get("count", 0)
        
        return {
            "network": "Neo N3 TestNet",
            "block_height": block_height,
            "rpc_url": get_neo_rpc_url(),
            "status": "connected"
        }
    except Exception as e:
        return {
            "network": "Neo N3 TestNet",
            "status": "error",
            "error": str(e)
        }

@mcp.tool()
async def simulate_deploy(spec: Optional[Dict[str, Any]] = None, code: Optional[str] = None) -> Dict[str, Any]:
    """Simulate contract deployment by making a real Neo RPC call"""
    try:
        result = await neo_rpc_call("getblockcount", [])
        block_height = result if isinstance(result, int) else result.get("count", 0)
        
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

# ============================================================================
# Storage Tools
# ============================================================================

@mcp.tool()
async def save_draft(
    conversation_id: str,
    title: Optional[str] = None,
    messages: Optional[List[Dict[str, Any]]] = None,
    spec: Optional[Dict[str, Any]] = None,
    code: Optional[str] = None,
    language: Optional[str] = None
) -> Dict[str, Any]:
    """Save or update a conversation draft"""
    try:
        storage = get_storage()
        conversation = await storage.create_or_update_conversation(
            conversation_id=conversation_id,
            title=title,
            messages=messages,
            spec=spec,
            code=code,
            language=language,
        )
        return {
            "success": True,
            "conversation_id": conversation.id,
            "message": "Draft saved successfully"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@mcp.tool()
async def load_draft(conversation_id: str) -> Dict[str, Any]:
    """Load a conversation draft by ID"""
    try:
        storage = get_storage()
        conversation = await storage.load_conversation(conversation_id)
        
        if not conversation:
            return {
                "success": False,
                "error": "Conversation not found"
            }
        
        return {
            "success": True,
            "conversation": conversation.to_dict()
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@mcp.tool()
async def list_drafts() -> Dict[str, Any]:
    """List all saved conversation drafts"""
    try:
        storage = get_storage()
        conversations = await storage.list_conversations()
        summaries = [conv.to_summary() for conv in conversations]
        
        return {
            "success": True,
            "conversations": summaries
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "conversations": []
        }

# ============================================================================
# Code Generation Tools
# ============================================================================

@mcp.tool()
async def analyze_code(code: str, language: str = "python") -> Dict[str, Any]:
    """Analyze smart contract code for issues, improvements, and Neo-specific patterns"""
    # This is a placeholder - in production, this could use static analysis tools
    # For now, return basic analysis structure
    return {
        "language": language,
        "lines_of_code": len(code.split("\n")),
        "has_public_methods": "@public" in code or "public" in code.lower(),
        "has_imports": "import" in code or "using" in code.lower(),
        "analysis": "Code analysis would be performed here",
        "suggestions": []
    }

# ============================================================================
# Task Planning Tools
# ============================================================================

@mcp.tool()
async def break_down_task(user_prompt: str, existing_spec: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Break down a user request into actionable steps"""
    steps = []
    
    # Analyze the prompt to determine what needs to be done
    prompt_lower = user_prompt.lower()
    
    if "create" in prompt_lower or "new" in prompt_lower or "build" in prompt_lower:
        steps.append({
            "step": 1,
            "action": "generate_spec",
            "description": "Generate contract specification from requirements"
        })
        steps.append({
            "step": 2,
            "action": "generate_code",
            "description": "Generate smart contract code from specification"
        })
    elif "modify" in prompt_lower or "update" in prompt_lower or "change" in prompt_lower:
        if existing_spec:
            steps.append({
                "step": 1,
                "action": "update_spec",
                "description": "Update existing specification based on changes"
            })
        else:
            steps.append({
                "step": 1,
                "action": "generate_spec",
                "description": "Generate new specification (no existing spec found)"
            })
        steps.append({
            "step": 2,
            "action": "regenerate_code",
            "description": "Regenerate code with updated specification"
        })
    elif "explain" in prompt_lower or "what" in prompt_lower or "how" in prompt_lower:
        steps.append({
            "step": 1,
            "action": "explain",
            "description": "Provide explanation of contract or code"
        })
    else:
        steps.append({
            "step": 1,
            "action": "analyze",
            "description": "Analyze the request and determine appropriate action"
        })
    
    return {
        "steps": steps,
        "requires_code_generation": any(step["action"] in ["generate_code", "regenerate_code"] for step in steps),
        "requires_spec_generation": any(step["action"] in ["generate_spec", "update_spec"] for step in steps)
    }

# Export the MCP server instance
__all__ = ["mcp"]

