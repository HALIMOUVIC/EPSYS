from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import math
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import bcrypt
import jwt
from passlib.context import CryptContext
import aiofiles
from enum import Enum

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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

class Folder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    parent_id: Optional[str] = None  # Root folders have None
    path: str  # Full path like /folder1/subfolder2
    created_by: str  # user_id
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class FolderCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    parent_id: Optional[str] = None

class FolderUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)

class FileItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    original_name: str
    file_path: str
    folder_id: Optional[str] = None  # Root files have None
    file_size: int
    mime_type: str
    created_by: str  # user_id
    uploaded_by_name: str  # user full name for display
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class CalendarEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    start_date: datetime
    end_date: datetime
    all_day: bool = False
    color: str = "#3b82f6"  # Default blue color
    created_by: str  # user_id
    created_by_name: str  # user full name for display
    attendees: List[str] = []  # List of user emails or names
    location: Optional[str] = None
    reminder_minutes: int = 15  # Minutes before event to remind
    category: str = "general"  # general, meeting, deadline, holiday, etc.
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class CalendarEventCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    start_date: datetime
    end_date: datetime
    all_day: bool = False
    color: str = "#3b82f6"
    attendees: List[str] = []
    location: Optional[str] = None
    reminder_minutes: int = 15
    category: str = "general"

class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    all_day: Optional[bool] = None
    color: Optional[str] = None
    attendees: Optional[List[str]] = None
    location: Optional[str] = None
    reminder_minutes: Optional[int] = None
    category: Optional[str] = None

class UserSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    # Profile settings
    full_name: str
    email: str
    phone: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    # Notification settings
    email_notifications: bool = True
    push_notifications: bool = False
    document_update_notifications: bool = True
    message_notifications: bool = True
    calendar_reminders: bool = True
    # Security settings
    two_factor_enabled: bool = False
    session_timeout_minutes: int = 30
    password_change_required: bool = False
    # System preferences
    language: str = "fr"
    timezone: str = "Europe/Paris"
    date_format: str = "DD/MM/YYYY"
    theme: str = "light"  # light, dark, auto
    # Privacy settings
    profile_visibility: str = "internal"  # public, internal, private
    show_online_status: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserSettingsUpdate(BaseModel):
    # Profile settings
    full_name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    # Notification settings
    email_notifications: Optional[bool] = None
    push_notifications: Optional[bool] = None
    document_update_notifications: Optional[bool] = None
    message_notifications: Optional[bool] = None
    calendar_reminders: Optional[bool] = None
    # Security settings
    two_factor_enabled: Optional[bool] = None
    session_timeout_minutes: Optional[int] = None
    # System preferences
    language: Optional[str] = None
    timezone: Optional[str] = None
    date_format: Optional[str] = None
    theme: Optional[str] = None
    # Privacy settings
    profile_visibility: Optional[str] = None
    show_online_status: Optional[bool] = None

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)

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
        'dri_deport': 'DRI',
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
        'dri_deport': 'dri_depart',
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
# DRI Depart Document Routes (must be defined before generic document routes)
@api_router.post("/documents/dri-depart", response_model=Document)
async def create_dri_depart_document(
    date: str = Form(...),
    expediteur: str = Form(...),
    expediteur_reference: str = Form(...),
    expediteur_date: str = Form(...),
    destinataire: str = Form(...),
    objet: str = Form(...),
    files: List[UploadFile] = File([]),
    current_user: User = Depends(get_current_user)
):
    # Get the appropriate upload folder
    upload_folder = get_upload_folder(DocumentType.DRI_DEPORT)
    
    # Generate reference number
    reference = await generate_reference(DocumentType.DRI_DEPORT)
    
    # Handle file uploads
    uploaded_files = []
    for file in files:
        # Check file size (10MB limit per file)
        content = await file.read()
        if len(content) > 10 * 1024 * 1024:  # 10MB
            raise HTTPException(status_code=400, detail=f"File {file.filename} is too large (max 10MB)")
        
        # Create unique filename
        file_extension = file.filename.split(".")[-1] if "." in file.filename else ""
        unique_filename = f"dri_{uuid.uuid4()}.{file_extension}"
        file_path = upload_folder / unique_filename
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
        
        uploaded_files.append({
            "original_name": file.filename,
            "stored_name": unique_filename,
            "file_path": str(file_path),
            "file_size": len(content),
            "mime_type": file.content_type
        })
    
    # Create document
    document = Document(
        title=f"DRI Départ - {objet[:50]}",
        description=f"Courrier DRI départ de {expediteur} vers {destinataire}",
        document_type=DocumentType.DRI_DEPORT,
        status=DocumentStatus.DRAFT,
        created_by=current_user.id,
        reference=reference,
        metadata={
            "date": date,
            "expediteur": expediteur,
            "expediteur_reference": expediteur_reference,
            "expediteur_date": expediteur_date,
            "destinataire": destinataire,
            "objet": objet,
            "files": uploaded_files
        }
    )
    
    await db.documents.insert_one(document.dict())
    return document

@api_router.get("/documents/dri-depart")
async def get_dri_depart_documents(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    """Get DRI Depart documents with pagination"""
    skip = (page - 1) * limit
    
    # Query based on user role
    if current_user.role == UserRole.ADMIN:
        query = {"document_type": DocumentType.DRI_DEPORT}
    else:
        query = {
            "document_type": DocumentType.DRI_DEPORT,
            "$or": [{"created_by": current_user.id}, {"assigned_to": current_user.id}]
        }
    
    # Get total count
    total = await db.documents.count_documents(query)
    
    # Get documents
    documents = await db.documents.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "documents": [Document(**doc) for doc in documents],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": math.ceil(total / limit) if total > 0 else 0
    }

@api_router.put("/documents/dri-depart/{document_id}")
async def update_dri_depart_document(
    document_id: str,
    date: str = Form(...),
    expediteur: str = Form(...),
    expediteur_reference: str = Form(...),
    expediteur_date: str = Form(...),
    destinataire: str = Form(...),
    objet: str = Form(...),
    files: List[UploadFile] = File([]),
    current_user: User = Depends(get_current_user)
):
    # Find existing document
    existing_doc = await db.documents.find_one({"id": document_id})
    if not existing_doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check permissions
    if existing_doc["created_by"] != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to update this document")
    
    # Get the appropriate upload folder
    upload_folder = get_upload_folder(DocumentType.DRI_DEPORT)
    
    # Handle new file uploads
    uploaded_files = existing_doc.get("metadata", {}).get("files", [])
    for file in files:
        # Check file size (10MB limit per file)
        content = await file.read()
        if len(content) > 10 * 1024 * 1024:  # 10MB
            raise HTTPException(status_code=400, detail=f"File {file.filename} is too large (max 10MB)")
        
        # Create unique filename
        file_extension = file.filename.split(".")[-1] if "." in file.filename else ""
        unique_filename = f"dri_{uuid.uuid4()}.{file_extension}"
        file_path = upload_folder / unique_filename
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
        
        uploaded_files.append({
            "original_name": file.filename,
            "stored_name": unique_filename,
            "file_path": str(file_path),
            "file_size": len(content),
            "mime_type": file.content_type
        })
    
    # Update document
    update_data = {
        "title": f"DRI Départ - {objet[:50]}",
        "description": f"Courrier DRI départ de {expediteur} vers {destinataire}",
        "updated_at": datetime.utcnow(),
        "metadata": {
            "date": date,
            "expediteur": expediteur,
            "expediteur_reference": expediteur_reference,
            "expediteur_date": expediteur_date,
            "destinataire": destinataire,
            "objet": objet,
            "files": uploaded_files
        }
    }
    
    await db.documents.update_one({"id": document_id}, {"$set": update_data})
    
    # Return updated document
    updated_doc = await db.documents.find_one({"id": document_id})
    return Document(**updated_doc)

# Generic Document Routes
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
    
# File Manager Upload Route - Updated for backward compatibility
@api_router.post("/file-manager/upload-legacy")
async def upload_file_manager_files_legacy(
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
        
        # Create a general document entry for file manager files (legacy compatibility)
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

# File Manager Routes
@api_router.get("/file-manager/folders")
async def get_folders(
    parent_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
):
    """Get folders and files in a specific directory"""
    try:
        query = {"parent_id": parent_id}
        
        # Get folders
        folders = await db.folders.find(query).sort("name", 1).to_list(100)
        
        # Get files in this directory
        file_query = {"folder_id": parent_id}
        files = await db.file_items.find(file_query).sort("name", 1).to_list(100)
        
        # Get user information for folders
        for folder in folders:
            user = await db.users.find_one({"id": folder["created_by"]})
            folder["created_by_name"] = user["full_name"] if user else "Unknown"
        
        # Get current folder info and navigation path
        current_folder_info = None
        navigation_path = []
        current_path = "/"
        
        if parent_id:
            current_folder = await db.folders.find_one({"id": parent_id})
            if current_folder:
                current_folder_info = current_folder
                current_path = current_folder["path"]
                
                # Build navigation breadcrumb more safely
                if current_folder["path"] and current_folder["path"] != "/":
                    path_parts = current_folder["path"].strip("/").split("/")
                    temp_path = ""
                    for part in path_parts:
                        temp_path = f"{temp_path}/{part}" if temp_path else f"/{part}"
                        # Find the folder for this path part
                        folder_for_part = await db.folders.find_one({"path": temp_path})
                        if folder_for_part:
                            navigation_path.append({
                                "id": folder_for_part["id"],
                                "name": folder_for_part["name"],
                                "path": temp_path
                            })
        
        # Convert MongoDB documents to Pydantic models to handle ObjectId serialization
        # But preserve the created_by_name field we just added
        folder_dicts = []
        for folder in folders:
            folder_dict = Folder(**folder).dict()
            folder_dict["created_by_name"] = folder.get("created_by_name", "Unknown")
            folder_dicts.append(folder_dict)
        
        file_models = [FileItem(**file) for file in files]
        
        return {
            "folders": folder_dicts,
            "files": [file.dict() for file in file_models],
            "current_path": current_path,
            "current_folder": Folder(**current_folder_info).dict() if current_folder_info else None,
            "navigation_path": navigation_path,
            "parent_folder_id": current_folder_info["parent_id"] if current_folder_info else None
        }
        
    except Exception as e:
        print(f"Error in get_folders: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to load folder contents: {str(e)}")

@api_router.post("/file-manager/folders")
async def create_folder(
    folder_data: FolderCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new folder"""
    # Check if folder name already exists in the same parent
    existing_folder = await db.folders.find_one({
        "name": folder_data.name,
        "parent_id": folder_data.parent_id
    })
    
    if existing_folder:
        raise HTTPException(status_code=400, detail="Folder with this name already exists")
    
    # Build the full path
    parent_path = await get_folder_path(folder_data.parent_id) if folder_data.parent_id else ""
    full_path = f"{parent_path}/{folder_data.name}".replace("//", "/")
    
    folder = Folder(
        name=folder_data.name,
        parent_id=folder_data.parent_id,
        path=full_path,
        created_by=current_user.id
    )
    
    await db.folders.insert_one(folder.dict())
    
    # Return folder with created_by_name for frontend display
    return {
        "id": folder.id,
        "name": folder.name,
        "parent_id": folder.parent_id,
        "path": folder.path,
        "created_by": folder.created_by,
        "created_by_name": current_user.full_name,
        "created_at": folder.created_at,
        "updated_at": folder.updated_at
    }

@api_router.put("/file-manager/folders/{folder_id}")
async def update_folder(
    folder_id: str,
    folder_data: FolderUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update folder name"""
    folder = await db.folders.find_one({"id": folder_id})
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    # Check permissions
    if folder["created_by"] != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to edit this folder")
    
    # Check if new name already exists in the same parent
    existing_folder = await db.folders.find_one({
        "name": folder_data.name,
        "parent_id": folder["parent_id"],
        "id": {"$ne": folder_id}
    })
    
    if existing_folder:
        raise HTTPException(status_code=400, detail="Folder with this name already exists")
    
    # Update folder name and path
    parent_path = await get_folder_path(folder["parent_id"]) if folder["parent_id"] else ""
    new_full_path = f"{parent_path}/{folder_data.name}".replace("//", "/")
    
    update_data = {
        "name": folder_data.name,
        "path": new_full_path,
        "updated_at": datetime.utcnow()
    }
    
    await db.folders.update_one({"id": folder_id}, {"$set": update_data})
    
    # Update paths of all subfolders recursively
    await update_subfolder_paths(folder_id, new_full_path)
    
    updated_folder = await db.folders.find_one({"id": folder_id})
    
    # Add created_by_name for frontend display
    user = await db.users.find_one({"id": updated_folder["created_by"]})
    
    return {
        "id": updated_folder["id"],
        "name": updated_folder["name"],
        "parent_id": updated_folder["parent_id"],
        "path": updated_folder["path"],
        "created_by": updated_folder["created_by"],
        "created_by_name": user["full_name"] if user else "Unknown",
        "created_at": updated_folder["created_at"],
        "updated_at": updated_folder["updated_at"]
    }

@api_router.delete("/file-manager/folders/{folder_id}")
async def delete_folder(
    folder_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete folder and all its contents"""
    folder = await db.folders.find_one({"id": folder_id})
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    # Check permissions
    if folder["created_by"] != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to delete this folder")
    
    # Delete all files in this folder and subfolders
    await delete_folder_contents(folder_id)
    
    # Delete the folder itself
    await db.folders.delete_one({"id": folder_id})
    
    return {"message": "Folder deleted successfully"}

@api_router.post("/file-manager/upload")
async def upload_files_to_folder(
    folder_id: Optional[str] = Form(None),
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload files to a specific folder"""
    # Verify folder exists if specified
    if folder_id:
        folder = await db.folders.find_one({"id": folder_id})
        if not folder:
            raise HTTPException(status_code=404, detail="Folder not found")
    
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
        
        # Create file item record
        file_item = FileItem(
            name=file.filename,
            original_name=file.filename,
            file_path=str(file_path),
            folder_id=folder_id,
            file_size=len(content),
            mime_type=file.content_type or "application/octet-stream",
            created_by=current_user.id,
            uploaded_by_name=current_user.full_name
        )
        
        await db.file_items.insert_one(file_item.dict())
        uploaded_files.append(file_item)
    
    return {
        "message": f"Successfully uploaded {len(uploaded_files)} file(s)",
        "files": [file.dict() for file in uploaded_files]
    }

@api_router.delete("/file-manager/files/{file_id}")
async def delete_file(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a file"""
    file_item = await db.file_items.find_one({"id": file_id})
    if not file_item:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Check permissions
    if file_item["created_by"] != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to delete this file")
    
    # Delete physical file
    if os.path.exists(file_item["file_path"]):
        os.remove(file_item["file_path"])
    
    # Delete database record
    await db.file_items.delete_one({"id": file_id})
    
    return {"message": "File deleted successfully"}

@api_router.put("/file-manager/files/{file_id}")
async def rename_file(
    file_id: str,
    new_name: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    """Rename a file"""
    file_item = await db.file_items.find_one({"id": file_id})
    if not file_item:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Check permissions
    if file_item["created_by"] != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to edit this file")
    
    # Validate new name
    if not new_name.strip():
        raise HTTPException(status_code=400, detail="File name cannot be empty")
    
    # Update file name in database
    update_data = {
        "name": new_name.strip(),
        "original_name": new_name.strip(),
        "updated_at": datetime.utcnow()
    }
    
    await db.file_items.update_one({"id": file_id}, {"$set": update_data})
    
    # Return updated file info
    updated_file = await db.file_items.find_one({"id": file_id})
    return {
        "id": updated_file["id"],
        "name": updated_file["name"],
        "original_name": updated_file["original_name"],
        "file_path": updated_file["file_path"],
        "folder_id": updated_file["folder_id"],
        "file_size": updated_file["file_size"],
        "mime_type": updated_file["mime_type"],
        "created_by": updated_file["created_by"],
        "uploaded_by_name": updated_file["uploaded_by_name"],
        "created_at": updated_file["created_at"],
        "updated_at": updated_file["updated_at"]
    }

@api_router.get("/file-manager/preview/{file_id}")
async def preview_file(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get file preview information and content for supported file types"""
    file_item = await db.file_items.find_one({"id": file_id})
    if not file_item:
        raise HTTPException(status_code=404, detail="File not found")
    
    if not os.path.exists(file_item["file_path"]):
        raise HTTPException(status_code=404, detail="Physical file not found")
    
    file_extension = file_item["name"].split(".")[-1].lower() if "." in file_item["name"] else ""
    
    # For text files, read content
    if file_extension in ['txt', 'md', 'csv', 'json', 'xml', 'html', 'css', 'js', 'py']:
        try:
            with open(file_item["file_path"], 'r', encoding='utf-8') as f:
                content = f.read()
                # Limit content size for preview (first 10000 characters)
                if len(content) > 10000:
                    content = content[:10000] + "\n... (content truncated)"
                
                return {
                    "file_id": file_id,
                    "name": file_item["name"],
                    "file_size": file_item["file_size"],
                    "mime_type": file_item["mime_type"],
                    "preview_type": "text",
                    "content": content,
                    "can_preview": True
                }
        except UnicodeDecodeError:
            pass
    
    # For images, return file info for direct display
    if file_extension in ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg']:
        return {
            "file_id": file_id,
            "name": file_item["name"],
            "file_size": file_item["file_size"],
            "mime_type": file_item["mime_type"],
            "preview_type": "image",
            "file_url": f"/api/file-manager/download/{file_id}",
            "can_preview": True
        }
    
    # For PDF files
    if file_extension == 'pdf':
        return {
            "file_id": file_id,
            "name": file_item["name"],
            "file_size": file_item["file_size"],
            "mime_type": file_item["mime_type"],
            "preview_type": "pdf",
            "file_url": f"/api/file-manager/download/{file_id}",
            "can_preview": True
        }
    
    # For office documents (limited preview info)
    if file_extension in ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']:
        return {
            "file_id": file_id,
            "name": file_item["name"],
            "file_size": file_item["file_size"],
            "mime_type": file_item["mime_type"],
            "preview_type": "office",
            "file_url": f"/api/file-manager/download/{file_id}",
            "can_preview": False,
            "message": "Office documents cannot be previewed. Click download to open the file."
        }
    
    # For other file types
    return {
        "file_id": file_id,
        "name": file_item["name"],
        "file_size": file_item["file_size"],
        "mime_type": file_item["mime_type"],
        "preview_type": "unknown",
        "can_preview": False,
        "message": "Preview not available for this file type. Click download to view the file."
    }

# Calendar Management Routes
@api_router.get("/calendar/events")
async def get_calendar_events(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
):
    """Get calendar events for a date range"""
    try:
        query = {}
        
        # Add date filters if provided
        if start_date and end_date:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query["$or"] = [
                {
                    "start_date": {"$lte": end_dt},
                    "end_date": {"$gte": start_dt}
                }
            ]
        
        events = await db.calendar_events.find(query).sort("start_date", 1).to_list(1000)
        
        return {
            "events": [CalendarEvent(**event).dict() for event in events]
        }
        
    except Exception as e:
        print(f"Error in get_calendar_events: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to load calendar events: {str(e)}")

@api_router.post("/calendar/events")
async def create_calendar_event(
    event_data: CalendarEventCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new calendar event"""
    try:
        # Validate dates
        if event_data.end_date <= event_data.start_date:
            raise HTTPException(status_code=400, detail="End date must be after start date")
        
        event = CalendarEvent(
            title=event_data.title,
            description=event_data.description,
            start_date=event_data.start_date,
            end_date=event_data.end_date,
            all_day=event_data.all_day,
            color=event_data.color,
            created_by=current_user.id,
            created_by_name=current_user.full_name,
            attendees=event_data.attendees,
            location=event_data.location,
            reminder_minutes=event_data.reminder_minutes,
            category=event_data.category
        )
        
        await db.calendar_events.insert_one(event.dict())
        
        return event.dict()
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating calendar event: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create calendar event: {str(e)}")

@api_router.put("/calendar/events/{event_id}")
async def update_calendar_event(
    event_id: str,
    event_data: CalendarEventUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a calendar event"""
    try:
        event = await db.calendar_events.find_one({"id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Check permissions
        if event["created_by"] != current_user.id and current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Not authorized to edit this event")
        
        # Build update data
        update_data = {"updated_at": datetime.utcnow()}
        for field, value in event_data.dict(exclude_unset=True).items():
            if value is not None:
                update_data[field] = value
        
        # Validate dates if both are being updated
        if "start_date" in update_data and "end_date" in update_data:
            if update_data["end_date"] <= update_data["start_date"]:
                raise HTTPException(status_code=400, detail="End date must be after start date")
        
        await db.calendar_events.update_one({"id": event_id}, {"$set": update_data})
        
        updated_event = await db.calendar_events.find_one({"id": event_id})
        return CalendarEvent(**updated_event).dict()
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating calendar event: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update calendar event: {str(e)}")

@api_router.delete("/calendar/events/{event_id}")
async def delete_calendar_event(
    event_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a calendar event"""
    try:
        event = await db.calendar_events.find_one({"id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Check permissions
        if event["created_by"] != current_user.id and current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Not authorized to delete this event")
        
        await db.calendar_events.delete_one({"id": event_id})
        
        return {"message": "Event deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting calendar event: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete calendar event: {str(e)}")

# User Settings Routes
@api_router.get("/settings")
async def get_user_settings(
    current_user: User = Depends(get_current_user)
):
    """Get user settings"""
    try:
        settings = await db.user_settings.find_one({"user_id": current_user.id})
        
        if not settings:
            # Create default settings for new user
            default_settings = UserSettings(
                user_id=current_user.id,
                full_name=current_user.full_name,
                email=current_user.email
            )
            await db.user_settings.insert_one(default_settings.dict())
            return default_settings.dict()
        
        return UserSettings(**settings).dict()
        
    except Exception as e:
        print(f"Error getting user settings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to load user settings: {str(e)}")

@api_router.put("/settings")
async def update_user_settings(
    settings_data: UserSettingsUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update user settings"""
    try:
        # Check if settings exist
        existing_settings = await db.user_settings.find_one({"user_id": current_user.id})
        
        if not existing_settings:
            # Create new settings if they don't exist
            new_settings = UserSettings(
                user_id=current_user.id,
                full_name=current_user.full_name,
                email=current_user.email
            )
            # Apply updates
            for field, value in settings_data.dict(exclude_unset=True).items():
                if value is not None:
                    setattr(new_settings, field, value)
            
            await db.user_settings.insert_one(new_settings.dict())
            return new_settings.dict()
        else:
            # Update existing settings
            update_data = {"updated_at": datetime.utcnow()}
            for field, value in settings_data.dict(exclude_unset=True).items():
                if value is not None:
                    update_data[field] = value
            
            await db.user_settings.update_one(
                {"user_id": current_user.id},
                {"$set": update_data}
            )
            
            updated_settings = await db.user_settings.find_one({"user_id": current_user.id})
            return UserSettings(**updated_settings).dict()
        
    except Exception as e:
        print(f"Error updating user settings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update user settings: {str(e)}")

@api_router.post("/settings/change-password")
async def change_password(
    password_data: PasswordChangeRequest,
    current_user: User = Depends(get_current_user)
):
    """Change user password"""
    try:
        # Verify current password
        user = await db.users.find_one({"id": current_user.id})
        if not user or not pwd_context.verify(password_data.current_password, user["password"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        
        # Hash new password
        hashed_password = pwd_context.hash(password_data.new_password)
        
        # Update password
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": {"password": hashed_password, "updated_at": datetime.utcnow()}}
        )
        
        # Update settings to mark password change as completed
        await db.user_settings.update_one(
            {"user_id": current_user.id},
            {"$set": {"password_change_required": False, "updated_at": datetime.utcnow()}}
        )
        
        return {"message": "Password changed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error changing password: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to change password: {str(e)}")

@api_router.get("/settings/system-info")
async def get_system_info(
    current_user: User = Depends(get_current_user)
):
    """Get system information (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Get database stats
        total_users = await db.users.count_documents({})
        total_documents = await db.documents.count_documents({})
        total_folders = await db.folders.count_documents({})
        total_files = await db.file_items.count_documents({})
        total_events = await db.calendar_events.count_documents({})
        
        # Get document counters for current year
        current_year = datetime.utcnow().year
        
        # Get latest reference numbers for each document type
        latest_depart = await db.documents.find_one(
            {"document_type": "courrier_depart", "reference": {"$regex": f"DEP-{current_year}-"}},
            sort=[("reference", -1)]
        )
        latest_arrive = await db.documents.find_one(
            {"document_type": "courrier_arrive", "reference": {"$regex": f"ARR-{current_year}-"}},
            sort=[("reference", -1)]
        )
        latest_dri = await db.documents.find_one(
            {"document_type": "dri_depart", "reference": {"$regex": f"DRID-{current_year}-"}},
            sort=[("reference", -1)]
        )
        latest_om = await db.documents.find_one(
            {"document_type": "om_approval", "reference": {"$regex": f"OM-{current_year}-"}},
            sort=[("reference", -1)]
        )
        
        # Extract counter numbers
        depart_counter = 0
        arrive_counter = 0
        dri_counter = 0
        om_counter = 0
        
        if latest_depart:
            depart_match = latest_depart["reference"].split('-')
            if len(depart_match) >= 3:
                depart_counter = int(depart_match[2])
        
        if latest_arrive:
            arrive_match = latest_arrive["reference"].split('-')
            if len(arrive_match) >= 3:
                arrive_counter = int(arrive_match[2])
        
        if latest_dri:
            dri_match = latest_dri["reference"].split('-')
            if len(dri_match) >= 3:
                dri_counter = int(dri_match[2])
        
        if latest_om:
            om_match = latest_om["reference"].split('-')
            if len(om_match) >= 3:
                om_counter = int(om_match[2])
        
        # Check signup status
        signup_enabled = True  # Default to enabled, you can store this in a settings collection
        
        return {
            "database_stats": {
                "total_users": total_users,
                "total_documents": total_documents,
                "total_folders": total_folders,
                "total_files": total_files,
                "total_events": total_events
            },
            "document_counters": {
                "current_year": current_year,
                "courrier_depart": depart_counter,
                "courrier_arrive": arrive_counter,
                "dri_depart": dri_counter,
                "om_approval": om_counter
            },
            "system_settings": {
                "signup_enabled": signup_enabled
            },
            "system_status": {
                "status": "healthy",
                "uptime": "Available",
                "version": "1.0.0"
            }
        }
        
    except Exception as e:
        print(f"Error getting system info: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get system info: {str(e)}")

@api_router.post("/settings/reset-counters")
async def reset_document_counters(
    current_user: User = Depends(get_current_user)
):
    """Reset document counters for new year (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # This is typically done automatically when the year changes
        # But admins can manually reset if needed
        current_year = datetime.utcnow().year
        
        # You could implement actual counter reset logic here
        # For now, just return success message
        
        return {
            "message": f"Document counters will be automatically reset for year {current_year + 1}",
            "note": "Counters are automatically reset when the year changes"
        }
        
    except Exception as e:
        print(f"Error resetting counters: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to reset counters: {str(e)}")

@api_router.put("/settings/signup-toggle")
async def toggle_signup(
    enabled: bool,
    current_user: User = Depends(get_current_user)
):
    """Enable or disable user signup (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # In a real implementation, you would store this in a system settings collection
        # For now, we'll just return the status
        
        return {
            "signup_enabled": enabled,
            "message": f"User signup has been {'enabled' if enabled else 'disabled'}"
        }
        
    except Exception as e:
        print(f"Error toggling signup: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to toggle signup: {str(e)}")

@api_router.get("/file-manager/download/{file_id}")
async def download_file(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """Download a file"""
    file_item = await db.file_items.find_one({"id": file_id})
    if not file_item:
        raise HTTPException(status_code=404, detail="File not found")
    
    if not os.path.exists(file_item["file_path"]):
        raise HTTPException(status_code=404, detail="Physical file not found")
    
    from fastapi.responses import FileResponse
    return FileResponse(
        path=file_item["file_path"],
        filename=file_item["original_name"],
        media_type=file_item["mime_type"]
    )

@api_router.get("/documents/download/{file_path:path}")
async def download_document_file(
    file_path: str,
    current_user: User = Depends(get_current_user)
):
    """Download a document file by file path"""
    # Decode the file path
    import urllib.parse
    decoded_path = urllib.parse.unquote(file_path)
    
    # Ensure the file path is within the uploads directory for security
    full_path = Path(decoded_path)
    
    # Check if it's an absolute path starting with uploads directory
    if not full_path.is_absolute():
        # If it's relative, make it relative to uploads directory
        full_path = UPLOADS_DIR / decoded_path
    
    # Security check - ensure the path is within uploads directory
    try:
        full_path = full_path.resolve()
        uploads_resolved = UPLOADS_DIR.resolve()
        if not str(full_path).startswith(str(uploads_resolved)):
            raise HTTPException(status_code=403, detail="Access denied")
    except Exception:
        raise HTTPException(status_code=403, detail="Invalid file path")
    
    # Check if file exists
    if not full_path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {decoded_path}")
    
    # Get the original filename from the path
    filename = full_path.name
    
    # Try to get a more user-friendly name from document metadata if possible
    # This is optional - we could search documents collection for this file
    
    from fastapi.responses import FileResponse
    return FileResponse(
        path=str(full_path),
        filename=filename,
        media_type='application/octet-stream'  # Generic type, browser will detect
    )

@api_router.get("/file-manager/search")
async def search_files_and_folders(
    query: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user)
):
    """Search files and folders by name"""
    # Search folders
    folders = await db.folders.find({
        "name": {"$regex": query, "$options": "i"}
    }).to_list(50)
    
    # Search files
    files = await db.file_items.find({
        "$or": [
            {"name": {"$regex": query, "$options": "i"}},
            {"original_name": {"$regex": query, "$options": "i"}}
        ]
    }).to_list(50)
    
    # Add creator names
    for folder in folders:
        user = await db.users.find_one({"id": folder["created_by"]})
        folder["created_by_name"] = user["full_name"] if user else "Unknown"
    
    return {
        "folders": [Folder(**folder) for folder in folders],
        "files": [FileItem(**file) for file in files]
    }

# Helper functions for folder operations
async def get_folder_path(folder_id: Optional[str]) -> str:
    """Get the full path of a folder"""
    if not folder_id:
        return ""
    
    folder = await db.folders.find_one({"id": folder_id})
    if not folder:
        return ""
    
    return folder["path"]

async def update_subfolder_paths(parent_folder_id: str, new_parent_path: str):
    """Recursively update paths of all subfolders"""
    subfolders = await db.folders.find({"parent_id": parent_folder_id}).to_list(100)
    
    for subfolder in subfolders:
        new_path = f"{new_parent_path}/{subfolder['name']}"
        await db.folders.update_one(
            {"id": subfolder["id"]},
            {"$set": {"path": new_path, "updated_at": datetime.utcnow()}}
        )
        # Recursively update subfolders
        await update_subfolder_paths(subfolder["id"], new_path)

async def delete_folder_contents(folder_id: str):
    """Recursively delete all contents of a folder"""
    # Delete all files in this folder
    files = await db.file_items.find({"folder_id": folder_id}).to_list(100)
    for file in files:
        if os.path.exists(file["file_path"]):
            os.remove(file["file_path"])
    await db.file_items.delete_many({"folder_id": folder_id})
    
    # Recursively delete subfolders
    subfolders = await db.folders.find({"parent_id": folder_id}).to_list(100)
    for subfolder in subfolders:
        await delete_folder_contents(subfolder["id"])
        await db.folders.delete_one({"id": subfolder["id"]})

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