# agents/coding_agent.py
# Coding Agent for Neo smart contract code generation and analysis

import os
import json
from typing import Optional
from spoon_ai.agents.toolcall import ToolCallAgent
from spoon_ai.chat import ChatBot
from spoon_ai.tools import ToolManager

# Import MCP tools
try:
    from spoon_toolkits import StorageTool
    STORAGE_TOOL_AVAILABLE = True
except ImportError:
    StorageTool = None
    STORAGE_TOOL_AVAILABLE = False


class CodingAgent(ToolCallAgent):
    """Agent specialized in generating and analyzing Neo smart contract code"""
    
    name: str = "coding_agent"
    description: str = "Generates, analyzes, and refactors Neo smart contract code (Python Boa or C#)"
    
    system_prompt: str = """
    You are an expert Neo blockchain smart contract developer specializing in code generation and analysis.
    
    Your responsibilities:
    - Generate clean, production-ready Neo smart contract code (Python Boa or C#)
    - Analyze existing code for issues, security vulnerabilities, and improvements
    - Refactor code to follow Neo N3 best practices
    - Explain code functionality to users
    - Validate code against specifications
    
    Code Generation Guidelines:
    - Use proper Neo Boa syntax for Python contracts
    - Include @public decorator for public methods
    - Import from boa3.builtin.* for Neo-specific functionality
    - Follow Neo N3 smart contract patterns and conventions
    - Include proper error handling and validation
    - Add comments for complex logic
    
    Always return clean, executable code without markdown formatting unless specifically requested.
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
    
    async def generate_code(self, spec: dict, language: str = "python") -> str:
        """Generate smart contract code from specification"""
        spec_json = json.dumps(spec, indent=2) if isinstance(spec, dict) else str(spec)
        
        prompt = f"""
        Generate Neo smart contract code ({language}) based on this specification:
        
        {spec_json}
        
        Return ONLY the code, no markdown, no explanations. Use proper Neo Boa syntax:
        - Use @public decorator for public methods
        - Import from boa3.builtin.*
        - Follow Neo N3 smart contract patterns
        - Include proper error handling
        """
        
        response = await self.run(prompt)
        code = str(response).strip()
        
        # Clean up code (remove markdown if present)
        if code.startswith("```"):
            lines = code.split("\n")
            code = "\n".join(lines[1:-1]) if len(lines) > 2 else code
        
        return code
    
    async def analyze_code(self, code: str, language: str = "python") -> dict:
        """Analyze code for issues and improvements"""
        prompt = f"""
        Analyze this Neo smart contract code ({language}):
        
        {code}
        
        Provide analysis including:
        - Code quality and best practices
        - Potential security issues
        - Neo-specific pattern compliance
        - Suggestions for improvement
        - Any missing error handling or validation
        """
        
        response = await self.run(prompt)
        return {
            "analysis": str(response),
            "language": language
        }

