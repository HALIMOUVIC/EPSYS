from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import bcrypt
import jwt
import aiofiles
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

# Create the main app
app = FastAPI(title="EPSys Document Management", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# JWT Configuration
SECRET_KEY = os.environ.get("JWT_SECRET", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Security
security = HTTPBearer()

# Enums
class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"

class DocumentStatus(str, Enum):
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"

class DocumentType(str, Enum):
    OUTGOING_MAIL = "outgoing_mail"
    INCOMING_MAIL = "incoming_mail"
    OM_APPROVAL = "om_approval"
    DRI_DEPORT = "dri_deport"
    GENERAL = "general"

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.USER
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str
    role: UserRole = UserRole.USER

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Document(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    reference: Optional[str] = None  # Auto-generated reference like DEP-2025-001
    title: str
    description: Optional[str] = None
    document_type: DocumentType
    status: DocumentStatus = DocumentStatus.DRAFT
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    created_by: str  # user_id
    assigned_to: Optional[str] = None  # user_id
    tags: List[str] = []
    metadata: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    due_date: Optional[datetime] = None

class DocumentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    document_type: DocumentType
    assigned_to: Optional[str] = None
    tags: List[str] = []
    metadata: Dict[str, Any] = {}
    due_date: Optional[datetime] = None

class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[DocumentStatus] = None
    assigned_to: Optional[str] = None
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None
    due_date: Optional[datetime] = None

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    subject: str
    content: str
    sender_id: str
    recipient_id: str
    document_id: Optional[str] = None
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class MessageCreate(BaseModel):
    subject: str
    content: str
    recipient_id: str
    document_id: Optional[str] = None

class DocumentCounter(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    document_type: str
    year: int
    counter: int = 1
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Employee(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    matricule: str
    full_name: str
    full_name1: str
    job_title: str
    division: str
    itineraire: str
    service: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Utility Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

async def generate_reference(document_type: str) -> str:
    """Generate reference number like DEP-2025-001"""
    current_year = datetime.now().year
    
    # Define prefixes for each document type
    prefixes = {
        'outgoing_mail': 'DEP',
        'incoming_mail': 'ARR', 
        'dri_depart': 'DRI',
        'om_approval': 'OM'
    }
    
    prefix = prefixes.get(document_type, 'DOC')
    
    # Find or create counter for this document type and year
    counter_doc = await db.document_counters.find_one({
        "document_type": document_type,
        "year": current_year
    })
    
    if not counter_doc:
        # Create new counter for this type and year
        counter = DocumentCounter(
            document_type=document_type,
            year=current_year,
            counter=1
        )
        await db.document_counters.insert_one(counter.dict())
        current_counter = 1
    else:
        # Increment existing counter
        current_counter = counter_doc["counter"] + 1
        await db.document_counters.update_one(
            {"document_type": document_type, "year": current_year},
            {"$set": {"counter": current_counter}}
        )
    
    # Format reference: PREFIX-YYYY-001
    reference = f"{prefix}-{current_year}-{current_counter:03d}"
    return reference

def get_upload_folder(document_type: str) -> Path:
    """Get appropriate upload folder based on document type"""
    folders = {
        'outgoing_mail': 'depart',
        'incoming_mail': 'arrive',
        'dri_depart': 'dri_depart',
        'om_approval': 'om_approval',
        'file_manager': 'file_manager',
        'general': 'general'
    }
    
    folder_name = folders.get(document_type, 'general')
    folder_path = UPLOADS_DIR / folder_name
    folder_path.mkdir(exist_ok=True)
    return folder_path

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception:  # Catch all JWT-related exceptions
        raise credentials_exception
    
    user = await db.users.find_one({"username": username})
    if user is None:
        raise credentials_exception
    
    return User(**user)

async def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

# Authentication Routes
@api_router.post("/register", response_model=User)
async def register(user_data: UserCreate):
    # Check if username exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email exists
    existing_email = await db.users.find_one({"email": user_data.email})
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password and create user
    hashed_password = hash_password(user_data.password)
    user_dict = user_data.dict()
    del user_dict["password"]
    
    user = User(**user_dict)
    user_doc = {**user.dict(), "password": hashed_password}
    
    await db.users.insert_one(user_doc)
    return user

@api_router.post("/login", response_model=Token)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"username": user_data.username})
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    
    user_obj = User(**user)
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.get("/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

# Document Routes
@api_router.post("/documents", response_model=Document)
async def create_document(
    document_data: DocumentCreate,
    current_user: User = Depends(get_current_user)
):
    # Generate reference number
    reference = await generate_reference(document_data.document_type)
    
    document = Document(
        **document_data.dict(), 
        created_by=current_user.id,
        reference=reference
    )
    await db.documents.insert_one(document.dict())
    return document

@api_router.get("/documents", response_model=List[Document])
async def get_documents(
    document_type: Optional[DocumentType] = None,
    status: Optional[DocumentStatus] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if document_type:
        query["document_type"] = document_type
    if status:
        query["status"] = status
    
    # Users can only see their own documents unless they're admin
    if current_user.role != UserRole.ADMIN:
        query["$or"] = [
            {"created_by": current_user.id},
            {"assigned_to": current_user.id}
        ]
    
    documents = await db.documents.find(query).sort("created_at", -1).to_list(100)
    return [Document(**doc) for doc in documents]

@api_router.get("/documents/{document_id}", response_model=Document)
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    document = await db.documents.find_one({"id": document_id})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc_obj = Document(**document)
    
    # Check permissions
    if current_user.role != UserRole.ADMIN and current_user.id != doc_obj.created_by and current_user.id != doc_obj.assigned_to:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return doc_obj

@api_router.put("/documents/{document_id}", response_model=Document)
async def update_document(
    document_id: str,
    document_data: DocumentUpdate,
    current_user: User = Depends(get_current_user)
):
    document = await db.documents.find_one({"id": document_id})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc_obj = Document(**document)
    
    # Check permissions
    if current_user.role != UserRole.ADMIN and current_user.id != doc_obj.created_by:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    update_data = {k: v for k, v in document_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.documents.update_one({"id": document_id}, {"$set": update_data})
    
    updated_document = await db.documents.find_one({"id": document_id})
    return Document(**updated_document)

@api_router.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    document = await db.documents.find_one({"id": document_id})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc_obj = Document(**document)
    
    # Check permissions
    if current_user.role != UserRole.ADMIN and current_user.id != doc_obj.created_by:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    await db.documents.delete_one({"id": document_id})
    
    # Delete file if exists
    if doc_obj.file_path and os.path.exists(doc_obj.file_path):
        os.remove(doc_obj.file_path)
    
    return {"message": "Document deleted successfully"}

# File Upload Route - Updated to handle multiple files with organized folders
@api_router.post("/documents/{document_id}/upload")
async def upload_files(
    document_id: str,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user)
):
    document = await db.documents.find_one({"id": document_id})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc_obj = Document(**document)
    
    # Check permissions
    if current_user.role != UserRole.ADMIN and current_user.id != doc_obj.created_by:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Get appropriate upload folder based on document type
    upload_folder = get_upload_folder(doc_obj.document_type)
    
    uploaded_files = []
    total_size = 0
    
    for file in files:
        # Check file size (10MB limit per file)
        content = await file.read()
        if len(content) > 10 * 1024 * 1024:  # 10MB
            raise HTTPException(status_code=400, detail=f"File {file.filename} is too large (max 10MB)")
        
        total_size += len(content)
        
        # Create file path in appropriate folder
        file_extension = file.filename.split(".")[-1] if "." in file.filename else ""
        unique_filename = f"{document_id}_{uuid.uuid4()}.{file_extension}"
        file_path = upload_folder / unique_filename
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
        
        uploaded_files.append({
            "original_name": file.filename,
            "file_path": str(file_path),
            "file_size": len(content),
            "mime_type": file.content_type
        })
    
    # Update document with file info (for now, we'll store the first file for compatibility)
    if uploaded_files:
        first_file = uploaded_files[0]
        update_data = {
            "file_path": first_file["file_path"],
            "file_name": first_file["original_name"],
            "file_size": first_file["file_size"],
            "mime_type": first_file["mime_type"],
            "updated_at": datetime.utcnow()
        }
        
        # Store all files in metadata
        current_metadata = doc_obj.metadata or {}
        current_metadata["uploaded_files"] = uploaded_files
        update_data["metadata"] = current_metadata
        
        await db.documents.update_one({"id": document_id}, {"$set": update_data})
    
# File Manager Upload Route - Separate from documents
@api_router.post("/file-manager/upload")
async def upload_file_manager_files(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user)
):
    # Get file manager upload folder
    upload_folder = get_upload_folder('file_manager')
    
    uploaded_files = []
    
    for file in files:
        # Check file size (10MB limit per file)
        content = await file.read()
        if len(content) > 10 * 1024 * 1024:  # 10MB
            raise HTTPException(status_code=400, detail=f"File {file.filename} is too large (max 10MB)")
        
        # Create unique filename
        file_extension = file.filename.split(".")[-1] if "." in file.filename else ""
        unique_filename = f"fm_{uuid.uuid4()}.{file_extension}"
        file_path = upload_folder / unique_filename
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
        
        # Create a general document entry for file manager files
        document = Document(
            title=file.filename,
            description=f"File Manager upload: {file.filename}",
            document_type='general',
            created_by=current_user.id,
            file_path=str(file_path),
            file_name=file.filename,
            file_size=len(content),
            mime_type=file.content_type,
            metadata={"source": "file_manager"}
        )
        
        await db.documents.insert_one(document.dict())
        uploaded_files.append(document)
    
    return {
        "message": f"Successfully uploaded {len(uploaded_files)} file(s) to File Manager", 
        "files": [doc.dict() for doc in uploaded_files]
    }

# Dashboard Statistics Route
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    # Query based on user role
    if current_user.role == UserRole.ADMIN:
        query = {}
    else:
        query = {"$or": [{"created_by": current_user.id}, {"assigned_to": current_user.id}]}
    
    # Get document counts by type
    outgoing_count = await db.documents.count_documents({**query, "document_type": DocumentType.OUTGOING_MAIL})
    incoming_count = await db.documents.count_documents({**query, "document_type": DocumentType.INCOMING_MAIL})
    om_approval_count = await db.documents.count_documents({**query, "document_type": DocumentType.OM_APPROVAL})
    dri_deport_count = await db.documents.count_documents({**query, "document_type": DocumentType.DRI_DEPORT})
    
    # Get completion stats
    total_docs = await db.documents.count_documents(query)
    completed_docs = await db.documents.count_documents({**query, "status": DocumentStatus.COMPLETED})
    efficiency = round((completed_docs / total_docs * 100) if total_docs > 0 else 0, 1)
    
    # Get unread messages
    unread_messages = await db.messages.count_documents({"recipient_id": current_user.id, "is_read": False})
    
    return {
        "outgoing_mail": outgoing_count,
        "incoming_mail": incoming_count,
        "om_approval": om_approval_count,
        "dri_deport": dri_deport_count,
        "efficiency": efficiency,
        "unread_messages": unread_messages,
        "total_documents": total_docs
    }

# Messages Routes
@api_router.post("/messages", response_model=Message)
async def create_message(
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user)
):
    message = Message(**message_data.dict(), sender_id=current_user.id)
    await db.messages.insert_one(message.dict())
    return message

@api_router.get("/messages", response_model=List[Message])
async def get_messages(
    current_user: User = Depends(get_current_user)
):
    messages = await db.messages.find({
        "$or": [
            {"sender_id": current_user.id},
            {"recipient_id": current_user.id}
        ]
    }).sort("created_at", -1).to_list(100)
    
    return [Message(**msg) for msg in messages]

@api_router.put("/messages/{message_id}/read")
async def mark_message_read(
    message_id: str,
    current_user: User = Depends(get_current_user)
):
    message = await db.messages.find_one({"id": message_id, "recipient_id": current_user.id})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    await db.messages.update_one({"id": message_id}, {"$set": {"is_read": True}})
    return {"message": "Message marked as read"}

# Employee Lookup Route
@api_router.get("/employees/{matricule}")
async def get_employee_by_matricule(
    matricule: str,
    current_user: User = Depends(get_current_user)
):
    """Get employee data by matricule for auto-populating OM Approval form"""
    employee = await db.employees.find_one({"matricule": matricule})
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Return the employee data in the format expected by the form
    return {
        "fullName": f"{employee['full_name']} {employee['full_name1']}",
        "jobTitle": employee['job_title'],
        "division": employee['division'],
        "itineraire": employee['itineraire'],
        "service": employee['service']
    }

# Users Management Routes (Admin only)
@api_router.get("/users", response_model=List[User])
async def get_users(admin_user: User = Depends(get_admin_user)):
    users = await db.users.find().to_list(100)
    return [User(**user) for user in users]

# Include the router in the main app
app.include_router(api_router)

# Serve uploaded files
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()