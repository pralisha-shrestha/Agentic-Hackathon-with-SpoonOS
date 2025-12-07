# conversation_storage.py
# AIOZ-backed conversation storage for NeoStudio

import os
import json
import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime
import tempfile

# AIOZ Storage Tools
AIOZ_AVAILABLE = False
UploadFileToAiozTool = None
DownloadFileFromAiozTool = None
DeleteAiozObjectTool = None
AiozListBucketsTool = None

try:
    # Workaround: The storage __init__.py has issues, so we need to bypass it
    # by setting up the module structure manually before importing
    import sys
    import importlib.util
    import os
    import types
    
    # Find spoon_toolkits installation
    try:
        import spoon_toolkits
        spoon_base = os.path.dirname(spoon_toolkits.__file__)
    except ImportError:
        spoon_base = None
    
    if spoon_base:
        storage_path = os.path.join(spoon_base, 'storage')
        base_tool_path = os.path.join(storage_path, 'base_storge_tool.py')
        aioz_tools_path = os.path.join(storage_path, 'aioz', 'aioz_tools.py')
        
        if os.path.exists(base_tool_path) and os.path.exists(aioz_tools_path):
            # Create module structure
            if 'spoon_toolkits.storage' not in sys.modules:
                sys.modules['spoon_toolkits.storage'] = types.ModuleType('spoon_toolkits.storage')
            if 'spoon_toolkits.storage.aioz' not in sys.modules:
                sys.modules['spoon_toolkits.storage.aioz'] = types.ModuleType('spoon_toolkits.storage.aioz')
            
            # Load base_storge_tool first
            spec = importlib.util.spec_from_file_location(
                "spoon_toolkits.storage.base_storge_tool",
                base_tool_path
            )
            if spec and spec.loader:
                base_module = importlib.util.module_from_spec(spec)
                sys.modules['spoon_toolkits.storage.base_storge_tool'] = base_module
                # Execute in the context of the storage package
                spec.loader.exec_module(base_module)
                
                # Now load aioz_tools
                spec = importlib.util.spec_from_file_location(
                    "spoon_toolkits.storage.aioz.aioz_tools",
                    aioz_tools_path
                )
                if spec and spec.loader:
                    aioz_module = importlib.util.module_from_spec(spec)
                    sys.modules['spoon_toolkits.storage.aioz.aioz_tools'] = aioz_module
                    spec.loader.exec_module(aioz_module)
                    
                    # Extract classes
                    UploadFileToAiozTool = getattr(aioz_module, 'UploadFileToAiozTool', None)
                    DownloadFileFromAiozTool = getattr(aioz_module, 'DownloadFileFromAiozTool', None)
                    DeleteAiozObjectTool = getattr(aioz_module, 'DeleteAiozObjectTool', None)
                    AiozListBucketsTool = getattr(aioz_module, 'AiozListBucketsTool', None)
                    
                    if UploadFileToAiozTool and DownloadFileFromAiozTool:
                        AIOZ_AVAILABLE = True
                    else:
                        raise ImportError("AIOZ tool classes not found in module")
                else:
                    raise ImportError("Could not create spec for aioz_tools")
            else:
                raise ImportError("Could not create spec for base_storge_tool")
        else:
            raise ImportError(f"Required files not found: base_tool={os.path.exists(base_tool_path)}, aioz_tools={os.path.exists(aioz_tools_path)}")
    else:
        raise ImportError("Could not find spoon_toolkits installation")
        
except Exception as e:
    # Try standard import as fallback
    try:
        from spoon_toolkits.storage.aioz.aioz_tools import (
            UploadFileToAiozTool,
            DownloadFileFromAiozTool,
            DeleteAiozObjectTool,
            AiozListBucketsTool,
        )
        AIOZ_AVAILABLE = True
    except ImportError:
        print(f"Warning: AIOZ storage tools not available. Error: {e}")
        print("Conversations will not be persisted. Please ensure spoon-toolkits is installed and AIOZ tools are available.")
        print("Note: This may be due to a package configuration issue. The tools exist but cannot be imported due to module structure conflicts.")

# Default bucket name
DEFAULT_BUCKET = os.getenv("AIOZ_BUCKET_NAME", "spoonos-conversations")

# Conversation data schema
class ConversationData:
    """Represents a full conversation with all metadata"""
    def __init__(
        self,
        id: str,
        title: str,
        preview: str,
        createdAt: str,
        updatedAt: str,
        messages: List[Dict[str, str]],
        spec: Optional[Dict[str, Any]] = None,
        code: Optional[str] = None,
        language: Optional[str] = None,
    ):
        self.id = id
        self.title = title
        self.preview = preview
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.messages = messages
        self.spec = spec
        self.code = code
        self.language = language
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "id": self.id,
            "title": self.title,
            "preview": self.preview,
            "createdAt": self.createdAt,
            "updatedAt": self.updatedAt,
            "messages": self.messages,
            "spec": self.spec,
            "code": self.code,
            "language": self.language,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ConversationData":
        """Create from dictionary"""
        return cls(
            id=data.get("id", str(uuid.uuid4())),
            title=data.get("title", "Untitled Contract"),
            preview=data.get("preview", ""),
            createdAt=data.get("createdAt", datetime.now().isoformat()),
            updatedAt=data.get("updatedAt", datetime.now().isoformat()),
            messages=data.get("messages", []),
            spec=data.get("spec"),
            code=data.get("code"),
            language=data.get("language"),
        )
    
    def to_summary(self) -> Dict[str, str]:
        """Convert to summary format for list views"""
        # Prefer description from contract spec metadata if available
        description = None
        if self.spec and isinstance(self.spec, dict):
            metadata = self.spec.get("metadata", {})
            if isinstance(metadata, dict):
                description = metadata.get("description")
                # Only use description if it's a non-empty string
                if not description or not isinstance(description, str) or not description.strip():
                    description = None
        
        # Use description if available, otherwise fall back to preview
        preview_text = description if description else (self.preview or "")
        
        return {
            "id": self.id,
            "title": self.title,
            "preview": preview_text,
            "updatedAt": self.updatedAt,
        }


class ConversationStorage:
    """AIOZ-backed storage for conversations"""
    
    def __init__(self, bucket_name: str = DEFAULT_BUCKET):
        self.bucket_name = bucket_name
        self.uploader = UploadFileToAiozTool() if AIOZ_AVAILABLE else None
        self.downloader = DownloadFileFromAiozTool() if AIOZ_AVAILABLE else None
        self.deleter = DeleteAiozObjectTool() if AIOZ_AVAILABLE else None
    
    def _get_object_key(self, conversation_id: str) -> str:
        """Generate object key for a conversation"""
        return f"conversations/{conversation_id}.json"
    
    async def save_conversation(self, conversation: ConversationData) -> bool:
        """Save a conversation to AIOZ storage"""
        if not AIOZ_AVAILABLE or not self.uploader:
            print("Warning: AIOZ not available, conversation not saved")
            return False
        
        try:
            # Update timestamp
            conversation.updatedAt = datetime.now().isoformat()
            
            # Convert to JSON
            data = conversation.to_dict()
            json_str = json.dumps(data, indent=2)
            
            # Write to temporary file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
                f.write(json_str)
                temp_path = f.name
            
            try:
                # Upload to AIOZ using _put_object to specify full object_key path
                object_key = self._get_object_key(conversation.id)
                
                # Read file content as bytes
                with open(temp_path, 'rb') as f:
                    file_content = f.read()
                
                # Use the tool's internal _put_object method to specify full object_key
                # Note: _put_object is synchronous, not async
                result = self.uploader._put_object(
                    bucket_name=self.bucket_name,
                    object_key=object_key,
                    body=file_content
                )
                
                # Check if upload succeeded (result should start with ✅)
                success = result.startswith("✅") if isinstance(result, str) else False
                return success
            finally:
                # Clean up temp file
                try:
                    os.unlink(temp_path)
                except:
                    pass
        except Exception as e:
            print(f"Error saving conversation to AIOZ: {e}")
            return False
    
    async def load_conversation(self, conversation_id: str) -> Optional[ConversationData]:
        """Load a conversation from AIOZ storage"""
        if not AIOZ_AVAILABLE or not self.downloader:
            return None
        
        try:
            object_key = self._get_object_key(conversation_id)
            
            # Download to temporary file
            with tempfile.NamedTemporaryFile(mode='r', suffix='.json', delete=False) as f:
                temp_path = f.name
            
            try:
                # Download from AIOZ
                result = await self.downloader.execute(
                    bucket_name=self.bucket_name,
                    object_key=object_key,
                    download_path=temp_path
                )
                
                # Check if download succeeded
                if not (isinstance(result, str) and result.startswith("✅")):
                    return None
                
                # Read and parse JSON
                with open(temp_path, 'r') as f:
                    data = json.load(f)
                
                return ConversationData.from_dict(data)
            finally:
                # Clean up temp file
                try:
                    os.unlink(temp_path)
                except:
                    pass
        except Exception as e:
            print(f"Error loading conversation from AIOZ: {e}")
            return None
    
    async def _load_index(self) -> Dict[str, Dict[str, str]]:
        """Load the conversations index from AIOZ"""
        if not AIOZ_AVAILABLE or not self.downloader:
            return {}
        
        try:
            with tempfile.NamedTemporaryFile(mode='r', suffix='.json', delete=False) as f:
                temp_path = f.name
            
            try:
                result = await self.downloader.execute(
                    bucket_name=self.bucket_name,
                    object_key="conversations/index.json",
                    download_path=temp_path
                )
                
                if isinstance(result, str) and result.startswith("✅"):
                    with open(temp_path, 'r') as f:
                        return json.load(f)
            except:
                # Index doesn't exist yet, return empty
                pass
            finally:
                try:
                    os.unlink(temp_path)
                except:
                    pass
        except:
            pass
        
        return {}
    
    async def _save_index(self, index: Dict[str, Dict[str, str]]) -> bool:
        """Save the conversations index to AIOZ"""
        if not AIOZ_AVAILABLE or not self.uploader:
            return False
        
        try:
            json_str = json.dumps(index, indent=2)
            
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
                f.write(json_str)
                temp_path = f.name
            
            try:
                # Upload index using _put_object to specify full object_key path
                object_key = "conversations/index.json"
                
                # Read file content as bytes
                with open(temp_path, 'rb') as f:
                    file_content = f.read()
                
                # Use the tool's internal _put_object method (synchronous)
                result = self.uploader._put_object(
                    bucket_name=self.bucket_name,
                    object_key=object_key,
                    body=file_content
                )
                return isinstance(result, str) and result.startswith("✅")
            finally:
                # Clean up temp file
                try:
                    os.unlink(temp_path)
                except:
                    pass
        except Exception as e:
            print(f"Error saving index: {e}")
            return False
    
    async def list_conversations(self) -> List[ConversationData]:
        """List all conversations using the index"""
        if not AIOZ_AVAILABLE:
            return []
        
        try:
            index = await self._load_index()
            conversations = []
            
            # Load each conversation from the index
            for conv_id, summary in index.items():
                conv = await self.load_conversation(conv_id)
                if conv:
                    conversations.append(conv)
            
            # Sort by updatedAt descending
            conversations.sort(key=lambda x: x.updatedAt, reverse=True)
            return conversations
        except Exception as e:
            print(f"Error listing conversations: {e}")
            return []
    
    async def delete_conversation(self, conversation_id: str) -> bool:
        """Delete a conversation from AIOZ storage"""
        if not AIOZ_AVAILABLE or not self.deleter:
            return False
        
        try:
            object_key = self._get_object_key(conversation_id)
            result = await self.deleter.execute(
                bucket_name=self.bucket_name,
                object_key=object_key
            )
            
            # Check if delete succeeded
            success = isinstance(result, str) and result.startswith("✅")
            
            # Update index
            if success:
                try:
                    index = await self._load_index()
                    if conversation_id in index:
                        del index[conversation_id]
                        await self._save_index(index)
                except Exception as e:
                    print(f"Warning: Failed to update index after delete: {e}")
            
            return success
        except Exception as e:
            print(f"Error deleting conversation from AIOZ: {e}")
            return False
    
    async def create_or_update_conversation(
        self,
        conversation_id: Optional[str] = None,
        title: Optional[str] = None,
        messages: Optional[List[Dict[str, str]]] = None,
        spec: Optional[Dict[str, Any]] = None,
        code: Optional[str] = None,
        language: Optional[str] = None,
    ) -> ConversationData:
        """Create or update a conversation"""
        # Load existing if ID provided
        if conversation_id:
            existing = await self.load_conversation(conversation_id)
            if existing:
                # Update existing
                if title:
                    existing.title = title
                if messages is not None:
                    existing.messages = messages
                if spec is not None:
                    existing.spec = spec
                if code is not None:
                    existing.code = code
                if language is not None:
                    existing.language = language
                
                # Generate preview from last message or spec
                if not existing.preview:
                    if messages and len(messages) > 0:
                        last_msg = messages[-1].get("content", "")
                        existing.preview = last_msg[:150] + ("..." if len(last_msg) > 150 else "")
                    elif spec and spec.get("metadata", {}).get("description"):
                        existing.preview = spec["metadata"]["description"][:150]
                
                conversation = existing
            else:
                # Create new with provided ID
                conversation = ConversationData(
                    id=conversation_id,
                    title=title or "Untitled Contract",
                    preview="",
                    createdAt=datetime.now().isoformat(),
                    updatedAt=datetime.now().isoformat(),
                    messages=messages or [],
                    spec=spec,
                    code=code,
                    language=language,
                )
        else:
            # Create new
            conversation = ConversationData(
                id=str(uuid.uuid4()),
                title=title or "Untitled Contract",
                preview="",
                createdAt=datetime.now().isoformat(),
                updatedAt=datetime.now().isoformat(),
                messages=messages or [],
                spec=spec,
                code=code,
                language=language,
            )
        
        # Generate preview if not set
        if not conversation.preview:
            if messages and len(messages) > 0:
                last_msg = messages[-1].get("content", "")
                conversation.preview = last_msg[:150] + ("..." if len(last_msg) > 150 else "")
            elif spec and spec.get("metadata", {}).get("description"):
                conversation.preview = spec["metadata"]["description"][:150]
            elif spec and spec.get("metadata", {}).get("name"):
                conversation.preview = f"Contract: {spec['metadata']['name']}"
        
        # Save to storage
        await self.save_conversation(conversation)
        
        # Update index
        try:
            index = await self._load_index()
            index[conversation.id] = {
                "id": conversation.id,
                "title": conversation.title,
                "preview": conversation.preview,
                "updatedAt": conversation.updatedAt,
            }
            await self._save_index(index)
        except Exception as e:
            print(f"Warning: Failed to update index: {e}")
        
        return conversation


# Global storage instance
_storage_instance: Optional[ConversationStorage] = None

def get_storage() -> ConversationStorage:
    """Get or create the global storage instance"""
    global _storage_instance
    if _storage_instance is None:
        _storage_instance = ConversationStorage()
    return _storage_instance

