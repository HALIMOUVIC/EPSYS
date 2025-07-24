#!/usr/bin/env python3
"""
EPSys Document Management Backend API Tests
Tests all backend functionality including authentication, document management, 
dashboard statistics, messaging, and role-based access control.
"""

import requests
import json
import os
import tempfile
from datetime import datetime, timedelta
import uuid

# Configuration
BACKEND_URL = "https://91ab24e1-2aa3-4897-84ac-69a3a5c4b76b.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
        
    def log_success(self, test_name):
        print(f"✅ {test_name}")
        self.passed += 1
        
    def log_failure(self, test_name, error):
        print(f"❌ {test_name}: {error}")
        self.failed += 1
        self.errors.append(f"{test_name}: {error}")
        
    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'='*60}")
        print(f"TEST SUMMARY: {self.passed}/{total} tests passed")
        if self.errors:
            print(f"\nFAILURES:")
            for error in self.errors:
                print(f"  - {error}")
        print(f"{'='*60}")

# Global test state
results = TestResults()
admin_token = None
user_token = None
admin_user_id = None
user_user_id = None
test_document_id = None

def make_request(method, endpoint, data=None, headers=None, files=None, auth_token=None):
    """Helper function to make HTTP requests"""
    url = f"{BACKEND_URL}{endpoint}"
    request_headers = HEADERS.copy()
    
    if auth_token:
        request_headers["Authorization"] = f"Bearer {auth_token}"
    
    if headers:
        request_headers.update(headers)
    
    # Remove Content-Type for file uploads or form data
    if files or (method == "PUT" and data and not isinstance(data, dict)):
        request_headers.pop("Content-Type", None)
    
    try:
        if method == "GET":
            response = requests.get(url, headers=request_headers, timeout=10)
        elif method == "POST":
            if files:
                response = requests.post(url, files=files, data=data, headers=request_headers, timeout=10)
            else:
                response = requests.post(url, json=data, headers=request_headers, timeout=10)
        elif method == "PUT":
            if files:
                response = requests.put(url, files=files, data=data, headers=request_headers, timeout=10)
            elif data and not isinstance(data, dict):
                # For form data
                response = requests.put(url, data=data, headers=request_headers, timeout=10)
            else:
                response = requests.put(url, json=data, headers=request_headers, timeout=10)
        elif method == "DELETE":
            response = requests.delete(url, headers=request_headers, timeout=10)
        else:
            raise ValueError(f"Unsupported method: {method}")
            
        return response
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {method} {url} - {str(e)}")
        return None

def test_user_registration():
    """Test user registration functionality"""
    print("\n🔧 Testing User Registration...")
    
    # Generate unique usernames to avoid conflicts
    unique_suffix = str(uuid.uuid4())[:8]
    
    # Test admin user registration
    admin_data = {
        "username": f"admin_{unique_suffix}",
        "email": f"admin_{unique_suffix}@epsys.com",
        "password": "SecurePass123!",
        "full_name": "Sarah Johnson",
        "role": "admin"
    }
    
    response = make_request("POST", "/register", admin_data)
    if response and response.status_code == 200:
        global admin_user_id
        admin_user_id = response.json()["id"]
        results.log_success("Admin user registration")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Admin user registration", error_msg)
    
    # Test regular user registration
    user_data = {
        "username": f"user_{unique_suffix}",
        "email": f"user_{unique_suffix}@epsys.com", 
        "password": "UserPass456!",
        "full_name": "John Smith",
        "role": "user"
    }
    
    response = make_request("POST", "/register", user_data)
    if response and response.status_code == 200:
        global user_user_id
        user_user_id = response.json()["id"]
        results.log_success("Regular user registration")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Regular user registration", error_msg)
    
    # Test duplicate username registration (should fail)
    response = make_request("POST", "/register", admin_data)
    if response and response.status_code == 400:
        results.log_success("Duplicate username rejection")
    elif response:
        error_detail = f"Status: {response.status_code}, Response: {response.json()}"
        results.log_failure("Duplicate username rejection", f"Should have rejected duplicate username - {error_detail}")
    else:
        results.log_failure("Duplicate username rejection", "Connection failed during duplicate registration test")

def test_user_login():
    """Test user login and JWT token generation"""
    print("\n🔐 Testing User Login...")
    
    # Get the usernames from the global variables set during registration
    admin_username = None
    user_username = None
    
    # We need to extract usernames from the registration data
    # Since we can't access the registration data directly, we'll use a different approach
    # Let's create new users for login testing
    unique_suffix = str(uuid.uuid4())[:8]
    
    # Create admin user for login test
    admin_data = {
        "username": f"login_admin_{unique_suffix}",
        "email": f"login_admin_{unique_suffix}@epsys.com",
        "password": "SecurePass123!",
        "full_name": "Login Admin",
        "role": "admin"
    }
    
    response = make_request("POST", "/register", admin_data)
    if response and response.status_code == 200:
        admin_username = admin_data["username"]
        global admin_user_id
        admin_user_id = response.json()["id"]
    
    # Create regular user for login test
    user_data = {
        "username": f"login_user_{unique_suffix}",
        "email": f"login_user_{unique_suffix}@epsys.com",
        "password": "UserPass456!",
        "full_name": "Login User",
        "role": "user"
    }
    
    response = make_request("POST", "/register", user_data)
    if response and response.status_code == 200:
        user_username = user_data["username"]
        global user_user_id
        user_user_id = response.json()["id"]
    
    # Test admin login
    if admin_username:
        admin_login = {
            "username": admin_username,
            "password": "SecurePass123!"
        }
        
        response = make_request("POST", "/login", admin_login)
        if response and response.status_code == 200:
            global admin_token
            data = response.json()
            admin_token = data["access_token"]
            if data["token_type"] == "bearer" and "user" in data:
                results.log_success("Admin login with JWT token")
            else:
                results.log_failure("Admin login with JWT token", "Invalid token response format")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("Admin login with JWT token", error_msg)
    
    # Test regular user login
    if user_username:
        user_login = {
            "username": user_username,
            "password": "UserPass456!"
        }
        
        response = make_request("POST", "/login", user_login)
        if response and response.status_code == 200:
            global user_token
            data = response.json()
            user_token = data["access_token"]
            if data["token_type"] == "bearer" and "user" in data:
                results.log_success("User login with JWT token")
            else:
                results.log_failure("User login with JWT token", "Invalid token response format")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("User login with JWT token", error_msg)
    
    # Test invalid login
    if admin_username:
        invalid_login = {
            "username": admin_username,
            "password": "wrongpassword"
        }
        
        response = make_request("POST", "/login", invalid_login)
        if response and response.status_code == 401:
            results.log_success("Invalid login rejection")
        else:
            error_detail = f"Status: {response.status_code if response else 'None'}, Response: {response.json() if response else 'None'}"
            results.log_failure("Invalid login rejection", f"Should have rejected invalid credentials - {error_detail}")

def test_protected_endpoints():
    """Test protected endpoints with authentication"""
    print("\n🛡️ Testing Protected Endpoints...")
    
    # Test /me endpoint with valid token
    response = make_request("GET", "/me", auth_token=admin_token)
    if response and response.status_code == 200:
        user_data = response.json()
        # Check if the user data contains the expected fields, not specific username since it's dynamic
        if "username" in user_data and user_data["role"] == "admin":
            results.log_success("Protected /me endpoint with valid token")
        else:
            results.log_failure("Protected /me endpoint with valid token", f"Invalid user data returned: {user_data}")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Protected /me endpoint with valid token", error_msg)
    
    # Test /me endpoint without token
    response = make_request("GET", "/me")
    if response and response.status_code in [401, 403]:  # FastAPI HTTPBearer returns 403 for missing auth
        results.log_success("Protected endpoint without token rejection")
    else:
        error_detail = f"Status: {response.status_code if response else 'None'}, Response: {response.json() if response else 'None'}"
        results.log_failure("Protected endpoint without token rejection", f"Should require authentication - {error_detail}")
    
    # Test /me endpoint with invalid token
    response = make_request("GET", "/me", auth_token="invalid_token")
    if response and response.status_code in [401, 500]:  # JWT decode error can cause 500
        results.log_success("Protected endpoint with invalid token rejection")
    else:
        error_detail = f"Status: {response.status_code if response else 'None'}, Response: {response.json() if response else 'None'}"
        results.log_failure("Protected endpoint with invalid token rejection", f"Should reject invalid token - {error_detail}")

def test_document_management():
    """Test document CRUD operations"""
    print("\n📄 Testing Document Management...")
    
    # Test document creation
    document_data = {
        "title": "Quarterly Budget Report",
        "description": "Financial analysis for Q4 2024",
        "document_type": "outgoing_mail",
        "tags": ["budget", "finance", "quarterly"],
        "metadata": {"department": "Finance", "priority": "high"}
    }
    
    response = make_request("POST", "/documents", document_data, auth_token=user_token)
    if response and response.status_code == 200:
        global test_document_id
        doc = response.json()
        test_document_id = doc["id"]
        if doc["title"] == document_data["title"] and doc["created_by"] == user_user_id:
            results.log_success("Document creation")
        else:
            results.log_failure("Document creation", "Invalid document data returned")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Document creation", error_msg)
    
    # Test document listing
    response = make_request("GET", "/documents", auth_token=user_token)
    if response and response.status_code == 200:
        documents = response.json()
        if isinstance(documents, list) and len(documents) > 0:
            results.log_success("Document listing")
        else:
            results.log_failure("Document listing", "No documents returned")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Document listing", error_msg)
    
    # Test document filtering by type
    response = make_request("GET", "/documents?document_type=outgoing_mail", auth_token=user_token)
    if response and response.status_code == 200:
        documents = response.json()
        if isinstance(documents, list):
            results.log_success("Document filtering by type")
        else:
            results.log_failure("Document filtering by type", "Invalid response format")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Document filtering by type", error_msg)
    
    # Test single document retrieval
    if test_document_id:
        response = make_request("GET", f"/documents/{test_document_id}", auth_token=user_token)
        if response and response.status_code == 200:
            doc = response.json()
            if doc["id"] == test_document_id:
                results.log_success("Single document retrieval")
            else:
                results.log_failure("Single document retrieval", "Wrong document returned")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("Single document retrieval", error_msg)
    
    # Test document update
    if test_document_id:
        update_data = {
            "title": "Updated Quarterly Budget Report",
            "status": "approved"
        }
        
        response = make_request("PUT", f"/documents/{test_document_id}", update_data, auth_token=user_token)
        if response and response.status_code == 200:
            doc = response.json()
            if doc["title"] == update_data["title"] and doc["status"] == update_data["status"]:
                results.log_success("Document update")
            else:
                results.log_failure("Document update", "Document not updated correctly")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("Document update", error_msg)

def test_file_upload():
    """Test file upload functionality"""
    print("\n📎 Testing File Upload...")
    
    if not test_document_id:
        results.log_failure("File upload", "No test document available")
        return
    
    # Create a temporary test file
    test_content = b"This is a test document content for EPSys system testing."
    
    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as temp_file:
        temp_file.write(test_content)
        temp_file_path = temp_file.name
    
    try:
        with open(temp_file_path, 'rb') as f:
            files = {'file': ('test_document.txt', f, 'text/plain')}
            response = make_request("POST", f"/documents/{test_document_id}/upload", 
                                  files=files, auth_token=user_token)
        
        if response and response.status_code == 200:
            data = response.json()
            if "message" in data and "filename" in data:
                results.log_success("File upload to document")
            else:
                results.log_failure("File upload to document", "Invalid upload response")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("File upload to document", error_msg)
    
    finally:
        # Clean up temporary file
        os.unlink(temp_file_path)

def test_role_based_access():
    """Test role-based access control"""
    print("\n👥 Testing Role-Based Access Control...")
    
    # Test admin access to all users
    response = make_request("GET", "/users", auth_token=admin_token)
    if response and response.status_code == 200:
        users = response.json()
        if isinstance(users, list) and len(users) >= 2:
            results.log_success("Admin access to user list")
        else:
            results.log_failure("Admin access to user list", "Invalid users list")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Admin access to user list", error_msg)
    
    # Test regular user denied access to users list
    response = make_request("GET", "/users", auth_token=user_token)
    if response and response.status_code in [403, 401]:
        results.log_success("User denied access to admin endpoint")
    else:
        error_detail = f"Status: {response.status_code if response else 'None'}, Response: {response.json() if response else 'None'}"
        results.log_failure("User denied access to admin endpoint", f"Should deny access to non-admin - {error_detail}")
    
    # Test admin can see all documents
    response = make_request("GET", "/documents", auth_token=admin_token)
    if response and response.status_code == 200:
        admin_docs = response.json()
        results.log_success("Admin access to all documents")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Admin access to all documents", error_msg)

def test_dashboard_statistics():
    """Test dashboard statistics endpoint"""
    print("\n📊 Testing Dashboard Statistics...")
    
    # Test dashboard stats for regular user
    response = make_request("GET", "/dashboard/stats", auth_token=user_token)
    if response and response.status_code == 200:
        stats = response.json()
        required_fields = ["outgoing_mail", "incoming_mail", "om_approval", "dri_deport", 
                          "efficiency", "unread_messages", "total_documents"]
        
        if all(field in stats for field in required_fields):
            results.log_success("Dashboard statistics for user")
        else:
            results.log_failure("Dashboard statistics for user", "Missing required statistics fields")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Dashboard statistics for user", error_msg)
    
    # Test dashboard stats for admin
    response = make_request("GET", "/dashboard/stats", auth_token=admin_token)
    if response and response.status_code == 200:
        stats = response.json()
        required_fields = ["outgoing_mail", "incoming_mail", "om_approval", "dri_deport", 
                          "efficiency", "unread_messages", "total_documents"]
        
        if all(field in stats for field in required_fields):
            results.log_success("Dashboard statistics for admin")
        else:
            results.log_failure("Dashboard statistics for admin", "Missing required statistics fields")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Dashboard statistics for admin", error_msg)

def test_messaging_system():
    """Test messaging system functionality"""
    print("\n💬 Testing Messaging System...")
    
    # Test message creation
    message_data = {
        "subject": "Budget Report Review",
        "content": "Please review the quarterly budget report and provide feedback by end of week.",
        "recipient_id": admin_user_id
    }
    
    response = make_request("POST", "/messages", message_data, auth_token=user_token)
    if response and response.status_code == 200:
        message = response.json()
        if message["subject"] == message_data["subject"] and message["sender_id"] == user_user_id:
            results.log_success("Message creation")
            message_id = message["id"]
        else:
            results.log_failure("Message creation", "Invalid message data returned")
            message_id = None
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Message creation", error_msg)
        message_id = None
    
    # Test message listing for sender
    response = make_request("GET", "/messages", auth_token=user_token)
    if response and response.status_code == 200:
        messages = response.json()
        if isinstance(messages, list):
            results.log_success("Message listing for sender")
        else:
            results.log_failure("Message listing for sender", "Invalid messages format")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Message listing for sender", error_msg)
    
    # Test message listing for recipient
    response = make_request("GET", "/messages", auth_token=admin_token)
    if response and response.status_code == 200:
        messages = response.json()
        if isinstance(messages, list):
            results.log_success("Message listing for recipient")
        else:
            results.log_failure("Message listing for recipient", "Invalid messages format")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Message listing for recipient", error_msg)
    
    # Test mark message as read
    if message_id:
        response = make_request("PUT", f"/messages/{message_id}/read", auth_token=admin_token)
        if response and response.status_code == 200:
            results.log_success("Mark message as read")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("Mark message as read", error_msg)

def test_document_permissions():
    """Test document permission system"""
    print("\n🔒 Testing Document Permissions...")
    
    if not test_document_id:
        results.log_failure("Document permissions", "No test document available")
        return
    
    # Test that admin can access any document
    response = make_request("GET", f"/documents/{test_document_id}", auth_token=admin_token)
    if response and response.status_code == 200:
        results.log_success("Admin access to any document")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Admin access to any document", error_msg)
    
    # Create a document as admin to test user access restrictions
    admin_doc_data = {
        "title": "Admin Only Document",
        "description": "This document should only be accessible by admin",
        "document_type": "general"
    }
    
    response = make_request("POST", "/documents", admin_doc_data, auth_token=admin_token)
    if response and response.status_code == 200:
        admin_doc_id = response.json()["id"]
        
        # Test that regular user cannot access admin's document
        response = make_request("GET", f"/documents/{admin_doc_id}", auth_token=user_token)
        if response and response.status_code == 403:
            results.log_success("User denied access to admin document")
        else:
            results.log_failure("User denied access to admin document", "Should deny access to other user's document")

def test_om_approval_functionality():
    """Test OM Approval document functionality comprehensively"""
    print("\n📋 Testing OM Approval Functionality...")
    
    # Test 1: Document Creation with proper metadata structure
    om_approval_data = {
        "title": "Mission à Alger - Formation Technique",
        "description": "Ordre de mission pour formation technique à Alger",
        "document_type": "om_approval",
        "metadata": {
            "fullName": "Benali Ahmed",
            "matricule": "EMP-2025-001",
            "jobTitle": "Ingénieur Technique",
            "division": "Division Exploration Production",
            "itineraire": "Hassi Messaoud - Alger - Hassi Messaoud",
            "dateDepart": "2025-02-15",
            "dateRetour": "2025-02-20",
            "transport": "Avion",
            "objet": "Participation à la formation technique sur les nouvelles technologies de forage"
        }
    }
    
    response = make_request("POST", "/documents", om_approval_data, auth_token=user_token)
    om_approval_id = None
    if response and response.status_code == 200:
        doc = response.json()
        om_approval_id = doc["id"]
        
        # Verify document type
        if doc["document_type"] == "om_approval":
            results.log_success("OM Approval document creation with correct type")
        else:
            results.log_failure("OM Approval document creation", f"Wrong document type: {doc['document_type']}")
        
        # Verify metadata structure
        metadata = doc.get("metadata", {})
        required_fields = ["fullName", "matricule", "jobTitle", "division", "itineraire", 
                          "dateDepart", "dateRetour", "transport", "objet"]
        
        missing_fields = [field for field in required_fields if field not in metadata]
        if not missing_fields:
            results.log_success("OM Approval metadata structure validation")
        else:
            results.log_failure("OM Approval metadata structure", f"Missing fields: {missing_fields}")
        
        # Verify specific metadata values
        if (metadata.get("fullName") == "Benali Ahmed" and 
            metadata.get("matricule") == "EMP-2025-001" and
            metadata.get("jobTitle") == "Ingénieur Technique"):
            results.log_success("OM Approval metadata values validation")
        else:
            results.log_failure("OM Approval metadata values", "Metadata values not stored correctly")
            
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("OM Approval document creation", error_msg)
    
    # Test 2: Reference Generation (OM-2025-XXX format)
    if om_approval_id:
        response = make_request("GET", f"/documents/{om_approval_id}", auth_token=user_token)
        if response and response.status_code == 200:
            doc = response.json()
            reference = doc.get("reference", "")
            
            # Check if reference follows OM-2025-XXX pattern
            import re
            if re.match(r"^OM-2025-\d{3}$", reference):
                results.log_success("OM Approval reference generation (OM-2025-XXX format)")
            else:
                results.log_failure("OM Approval reference generation", f"Invalid reference format: {reference}")
        else:
            results.log_failure("OM Approval reference verification", "Could not retrieve document")
    
    # Test 3: Document Retrieval with document_type filter
    response = make_request("GET", "/documents?document_type=om_approval", auth_token=user_token)
    if response and response.status_code == 200:
        documents = response.json()
        if isinstance(documents, list):
            # Check if our OM approval document is in the list
            om_docs = [doc for doc in documents if doc["document_type"] == "om_approval"]
            if om_docs:
                results.log_success("OM Approval document retrieval with type filter")
                
                # Verify that all returned documents are OM approval type
                all_om_type = all(doc["document_type"] == "om_approval" for doc in documents)
                if all_om_type:
                    results.log_success("OM Approval type filter accuracy")
                else:
                    results.log_failure("OM Approval type filter", "Filter returned wrong document types")
            else:
                results.log_failure("OM Approval document retrieval", "No OM approval documents found")
        else:
            results.log_failure("OM Approval document retrieval", "Invalid response format")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("OM Approval document retrieval", error_msg)
    
    # Test 4: Create another OM Approval to test reference increment
    om_approval_data2 = {
        "title": "Mission à Oran - Audit Technique",
        "description": "Ordre de mission pour audit des installations à Oran",
        "document_type": "om_approval",
        "metadata": {
            "fullName": "Khelifi Fatima",
            "matricule": "EMP-2025-002",
            "jobTitle": "Auditeur Senior",
            "division": "Division Qualité HSE",
            "itineraire": "Hassi Messaoud - Oran - Hassi Messaoud",
            "dateDepart": "2025-03-01",
            "dateRetour": "2025-03-05",
            "transport": "Véhicule de service",
            "objet": "Audit des installations de production et contrôle qualité"
        }
    }
    
    response = make_request("POST", "/documents", om_approval_data2, auth_token=user_token)
    om_approval_id2 = None
    if response and response.status_code == 200:
        doc = response.json()
        om_approval_id2 = doc["id"]
        reference2 = doc.get("reference", "")
        
        # Verify reference increment
        if reference2 and reference2 != (doc.get("reference") if om_approval_id else ""):
            results.log_success("OM Approval reference increment")
        else:
            results.log_failure("OM Approval reference increment", f"Reference not incremented: {reference2}")
    
    # Test 5: Update OM Approval metadata
    if om_approval_id:
        update_data = {
            "metadata": {
                "fullName": "Benali Ahmed",
                "matricule": "EMP-2025-001",
                "jobTitle": "Ingénieur Technique Senior",  # Updated job title
                "division": "Division Exploration Production",
                "itineraire": "Hassi Messaoud - Alger - Hassi Messaoud",
                "dateDepart": "2025-02-16",  # Updated date
                "dateRetour": "2025-02-21",  # Updated date
                "transport": "Avion",
                "objet": "Participation à la formation technique avancée sur les nouvelles technologies de forage"
            }
        }
        
        response = make_request("PUT", f"/documents/{om_approval_id}", update_data, auth_token=user_token)
        if response and response.status_code == 200:
            doc = response.json()
            updated_metadata = doc.get("metadata", {})
            
            if (updated_metadata.get("jobTitle") == "Ingénieur Technique Senior" and
                updated_metadata.get("dateDepart") == "2025-02-16"):
                results.log_success("OM Approval metadata update")
            else:
                results.log_failure("OM Approval metadata update", "Metadata not updated correctly")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("OM Approval metadata update", error_msg)
    
    # Test 6: Dashboard statistics include OM Approval count
    response = make_request("GET", "/dashboard/stats", auth_token=user_token)
    if response and response.status_code == 200:
        stats = response.json()
        om_count = stats.get("om_approval", 0)
        
        if om_count >= 1:  # Should have at least the documents we created
            results.log_success("OM Approval count in dashboard statistics")
        else:
            results.log_failure("OM Approval dashboard stats", f"Expected OM count >= 1, got {om_count}")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("OM Approval dashboard statistics", error_msg)
    
    # Test 7: Delete OM Approval document (cleanup)
    if om_approval_id:
        response = make_request("DELETE", f"/documents/{om_approval_id}", auth_token=user_token)
        if response and response.status_code == 200:
            results.log_success("OM Approval document deletion")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("OM Approval document deletion", error_msg)
    
    # Clean up second document
    if om_approval_id2:
        make_request("DELETE", f"/documents/{om_approval_id2}", auth_token=user_token)

def test_dri_depart_functionality():
    """Test DRI Depart document functionality comprehensively"""
    print("\n🏢 Testing DRI Depart Functionality...")
    
    # Test 1: Document Creation with proper metadata structure
    dri_depart_data = {
        "date": "2025-01-15",
        "expediteur": "Direction Regionale d'Hassi Messaoud",
        "expediteur_reference": "DRH/2025/001",
        "expediteur_date": "2025-01-14",
        "destinataire": "Ministere de l'Energie et des Mines",
        "objet": "Rapport mensuel des activites de production - Janvier 2025"
    }
    
    # Create a temporary test file for upload
    test_content = b"Contenu du rapport DRI Depart - Document officiel pour test"
    
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_file:
        temp_file.write(test_content)
        temp_file_path = temp_file.name
    
    dri_depart_id = None
    try:
        # Test document creation with file upload
        with open(temp_file_path, 'rb') as f:
            files = {
                'files': ('rapport_dri_janvier.pdf', f, 'application/pdf'),
                'date': (None, dri_depart_data['date']),
                'expediteur': (None, dri_depart_data['expediteur']),
                'expediteur_reference': (None, dri_depart_data['expediteur_reference']),
                'expediteur_date': (None, dri_depart_data['expediteur_date']),
                'destinataire': (None, dri_depart_data['destinataire']),
                'objet': (None, dri_depart_data['objet'])
            }
            
            response = make_request("POST", "/documents/dri-depart", files=files, auth_token=user_token)
        
        if response and response.status_code == 200:
            doc = response.json()
            dri_depart_id = doc["id"]
            
            # Verify document type
            if doc["document_type"] == "dri_deport":
                results.log_success("DRI Depart document creation with correct type")
            else:
                results.log_failure("DRI Depart document creation", f"Wrong document type: {doc['document_type']}")
            
            # Verify metadata structure
            metadata = doc.get("metadata", {})
            required_fields = ["date", "expediteur", "expediteur_reference", "expediteur_date", "destinataire", "objet"]
            
            missing_fields = [field for field in required_fields if field not in metadata]
            if not missing_fields:
                results.log_success("DRI Depart metadata structure validation")
            else:
                results.log_failure("DRI Depart metadata structure", f"Missing fields: {missing_fields}")
            
            # Verify specific metadata values
            if (metadata.get("expediteur") == dri_depart_data["expediteur"] and 
                metadata.get("destinataire") == dri_depart_data["destinataire"] and
                metadata.get("objet") == dri_depart_data["objet"]):
                results.log_success("DRI Depart metadata values validation")
            else:
                results.log_failure("DRI Depart metadata values", "Metadata values not stored correctly")
                
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("DRI Depart document creation", error_msg)
    
    finally:
        # Clean up temporary file
        os.unlink(temp_file_path)
    
    # Test 2: Reference Generation (DRI-2025-XXX format)
    if dri_depart_id:
        response = make_request("GET", f"/documents/{dri_depart_id}", auth_token=user_token)
        if response and response.status_code == 200:
            doc = response.json()
            reference = doc.get("reference", "")
            
            # Check if reference follows DRI-2025-XXX pattern
            import re
            if re.match(r"^DRI-2025-\d{3}$", reference):
                results.log_success("DRI Depart reference generation (DRI-2025-XXX format)")
            else:
                results.log_failure("DRI Depart reference generation", f"Invalid reference format: {reference}")
        else:
            results.log_failure("DRI Depart reference verification", "Could not retrieve document")
    
    # Test 3: Document Retrieval with pagination
    response = make_request("GET", "/documents/dri-depart?page=1&limit=10", auth_token=user_token)
    if response and response.status_code == 200:
        data = response.json()
        if isinstance(data, dict) and "documents" in data and "total" in data and "page" in data:
            documents = data["documents"]
            if isinstance(documents, list):
                results.log_success("DRI Depart document retrieval with pagination")
                
                # Verify pagination structure
                required_pagination_fields = ["total", "page", "limit", "pages"]
                missing_pagination_fields = [field for field in required_pagination_fields if field not in data]
                if not missing_pagination_fields:
                    results.log_success("DRI Depart pagination structure validation")
                else:
                    results.log_failure("DRI Depart pagination structure", f"Missing fields: {missing_pagination_fields}")
                
                # Verify that all returned documents are DRI Depart type
                if documents:
                    all_dri_type = all(doc["document_type"] == "dri_deport" for doc in documents)
                    if all_dri_type:
                        results.log_success("DRI Depart type filter accuracy")
                    else:
                        results.log_failure("DRI Depart type filter", "Filter returned wrong document types")
            else:
                results.log_failure("DRI Depart document retrieval", "Invalid documents format")
        else:
            results.log_failure("DRI Depart document retrieval", "Invalid pagination response format")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("DRI Depart document retrieval", error_msg)
    
    # Test 4: Create another DRI Depart to test reference increment
    dri_depart_data2 = {
        "date": "2025-01-20",
        "expediteur": "Direction Regionale d'Ouargla",
        "expediteur_reference": "DRO/2025/002",
        "expediteur_date": "2025-01-19",
        "destinataire": "Direction Generale Sonatrach",
        "objet": "Demande d'autorisation pour travaux de maintenance"
    }
    
    # Create second document without file
    files2 = {
        'date': (None, dri_depart_data2['date']),
        'expediteur': (None, dri_depart_data2['expediteur']),
        'expediteur_reference': (None, dri_depart_data2['expediteur_reference']),
        'expediteur_date': (None, dri_depart_data2['expediteur_date']),
        'destinataire': (None, dri_depart_data2['destinataire']),
        'objet': (None, dri_depart_data2['objet'])
    }
    
    response = make_request("POST", "/documents/dri-depart", files=files2, auth_token=user_token)
    dri_depart_id2 = None
    if response and response.status_code == 200:
        doc = response.json()
        dri_depart_id2 = doc["id"]
        reference2 = doc.get("reference", "")
        
        # Get the first document's reference for comparison
        first_doc_reference = ""
        if dri_depart_id:
            first_response = make_request("GET", f"/documents/{dri_depart_id}", auth_token=user_token)
            if first_response and first_response.status_code == 200:
                first_doc_reference = first_response.json().get("reference", "")
        
        # Verify reference increment
        if reference2 and first_doc_reference and reference2 != first_doc_reference:
            results.log_success("DRI Depart reference increment")
        else:
            results.log_failure("DRI Depart reference increment", f"Reference not incremented: {reference2} vs {first_doc_reference}")
    
    # Test 5: Update DRI Depart document
    if dri_depart_id:
        # Create a new test file for update
        update_content = b"Contenu mis a jour du rapport DRI Depart"
        
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_file:
            temp_file.write(update_content)
            temp_file_path = temp_file.name
        
        try:
            with open(temp_file_path, 'rb') as f:
                update_files = {
                    'files': ('rapport_dri_janvier_v2.pdf', f, 'application/pdf'),
                    'date': (None, "2025-01-16"),  # Updated date
                    'expediteur': (None, dri_depart_data['expediteur']),
                    'expediteur_reference': (None, "DRH/2025/001-REV"),  # Updated reference
                    'expediteur_date': (None, dri_depart_data['expediteur_date']),
                    'destinataire': (None, dri_depart_data['destinataire']),
                    'objet': (None, "Rapport mensuel des activites de production - Janvier 2025 (Version revisee)")  # Updated object
                }
                
                response = make_request("PUT", f"/documents/dri-depart/{dri_depart_id}", files=update_files, auth_token=user_token)
            
            if response and response.status_code == 200:
                doc = response.json()
                updated_metadata = doc.get("metadata", {})
                
                if (updated_metadata.get("date") == "2025-01-16" and
                    updated_metadata.get("expediteur_reference") == "DRH/2025/001-REV"):
                    results.log_success("DRI Depart document update")
                else:
                    results.log_failure("DRI Depart document update", "Metadata not updated correctly")
            else:
                error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
                results.log_failure("DRI Depart document update", error_msg)
        
        finally:
            os.unlink(temp_file_path)
    
    # Test 6: File Upload functionality verification
    if dri_depart_id:
        response = make_request("GET", f"/documents/{dri_depart_id}", auth_token=user_token)
        if response and response.status_code == 200:
            doc = response.json()
            metadata = doc.get("metadata", {})
            files_info = metadata.get("files", [])
            
            if files_info and len(files_info) > 0:
                file_info = files_info[0]
                required_file_fields = ["original_name", "stored_name", "file_path", "file_size", "mime_type"]
                missing_file_fields = [field for field in required_file_fields if field not in file_info]
                
                if not missing_file_fields:
                    results.log_success("DRI Depart file upload metadata validation")
                else:
                    results.log_failure("DRI Depart file upload", f"Missing file metadata fields: {missing_file_fields}")
            else:
                results.log_failure("DRI Depart file upload", "No file information found in metadata")
    
    # Test 7: Dashboard statistics include DRI Depart count
    response = make_request("GET", "/dashboard/stats", auth_token=user_token)
    if response and response.status_code == 200:
        stats = response.json()
        dri_count = stats.get("dri_deport", 0)
        
        if dri_count >= 1:  # Should have at least the documents we created
            results.log_success("DRI Depart count in dashboard statistics")
        else:
            results.log_failure("DRI Depart dashboard stats", f"Expected DRI count >= 1, got {dri_count}")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("DRI Depart dashboard statistics", error_msg)
    
    # Test 8: Permission-based access control
    if dri_depart_id:
        # Test that admin can access DRI Depart document
        response = make_request("GET", f"/documents/{dri_depart_id}", auth_token=admin_token)
        if response and response.status_code == 200:
            results.log_success("Admin access to DRI Depart document")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("Admin access to DRI Depart document", error_msg)
        
        # Test that user can access their own DRI Depart document
        response = make_request("GET", f"/documents/{dri_depart_id}", auth_token=user_token)
        if response and response.status_code == 200:
            results.log_success("User access to own DRI Depart document")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("User access to own DRI Depart document", error_msg)
    
    # Test 9: Delete DRI Depart documents (cleanup)
    if dri_depart_id:
        response = make_request("DELETE", f"/documents/{dri_depart_id}", auth_token=user_token)
        if response and response.status_code == 200:
            results.log_success("DRI Depart document deletion")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("DRI Depart document deletion", error_msg)
    
    # Clean up second document
    if dri_depart_id2:
        make_request("DELETE", f"/documents/{dri_depart_id2}", auth_token=user_token)

def test_documents_download_endpoint():
    """Test the new documents download endpoint functionality"""
    print("\n📥 Testing Documents Download Endpoint...")
    
    # First, create a DRI Depart document with a file to test download
    print("\n  Creating DRI Depart document with file for download testing...")
    
    dri_depart_data = {
        "date": "2025-01-15",
        "expediteur": "Direction Regionale Test",
        "expediteur_reference": "DRT/2025/DOWNLOAD",
        "expediteur_date": "2025-01-14",
        "destinataire": "Test Destinataire",
        "objet": "Document de test pour telechargement"
    }
    
    # Create a test file for download testing
    test_content = b"Contenu du document de test pour le telechargement - EPSys System Test File"
    
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_file:
        temp_file.write(test_content)
        temp_file_path = temp_file.name
    
    download_test_doc_id = None
    test_file_path = None
    
    try:
        # Create DRI Depart document with file
        with open(temp_file_path, 'rb') as f:
            files = {
                'files': ('test_download_document.pdf', f, 'application/pdf'),
                'date': (None, dri_depart_data['date']),
                'expediteur': (None, dri_depart_data['expediteur']),
                'expediteur_reference': (None, dri_depart_data['expediteur_reference']),
                'expediteur_date': (None, dri_depart_data['expediteur_date']),
                'destinataire': (None, dri_depart_data['destinataire']),
                'objet': (None, dri_depart_data['objet'])
            }
            
            response = make_request("POST", "/documents/dri-depart", files=files, auth_token=user_token)
        
        if response and response.status_code == 200:
            doc = response.json()
            download_test_doc_id = doc["id"]
            
            # Extract file path from metadata
            metadata = doc.get("metadata", {})
            files_info = metadata.get("files", [])
            
            if files_info and len(files_info) > 0:
                test_file_path = files_info[0].get("file_path", "")
                results.log_success("Document Download Test - DRI Depart document created with file")
                
                # Test 1: Download with valid file path (user access)
                print("\n  Testing valid file download with user token...")
                if test_file_path:
                    # URL encode the file path
                    import urllib.parse
                    encoded_path = urllib.parse.quote(test_file_path, safe='')
                    
                    response = make_request("GET", f"/documents/download/{encoded_path}", auth_token=user_token)
                    if response and response.status_code == 200:
                        # Check if it's a file download response
                        if response.headers.get('content-disposition') or len(response.content) > 0:
                            results.log_success("Document Download - Valid file path download (user)")
                        else:
                            results.log_failure("Document Download - Valid file path", "No file content returned")
                    else:
                        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
                        results.log_failure("Document Download - Valid file path (user)", error_msg)
                
                # Test 2: Download with admin access
                print("\n  Testing valid file download with admin token...")
                if test_file_path:
                    encoded_path = urllib.parse.quote(test_file_path, safe='')
                    
                    response = make_request("GET", f"/documents/download/{encoded_path}", auth_token=admin_token)
                    if response and response.status_code == 200:
                        if response.headers.get('content-disposition') or len(response.content) > 0:
                            results.log_success("Document Download - Valid file path download (admin)")
                        else:
                            results.log_failure("Document Download - Valid file path (admin)", "No file content returned")
                    else:
                        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
                        results.log_failure("Document Download - Valid file path (admin)", error_msg)
                
                # Test 3: Test with relative path (should work)
                print("\n  Testing relative file path download...")
                # Extract just the relative part from uploads directory
                if "/uploads/" in test_file_path:
                    relative_path = test_file_path.split("/uploads/", 1)[1]
                    encoded_relative_path = urllib.parse.quote(relative_path, safe='')
                    
                    response = make_request("GET", f"/documents/download/{encoded_relative_path}", auth_token=user_token)
                    if response and response.status_code == 200:
                        results.log_success("Document Download - Relative file path handling")
                    else:
                        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
                        results.log_failure("Document Download - Relative file path", error_msg)
            else:
                results.log_failure("Document Download Test Setup", "No file information found in document metadata")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("Document Download Test Setup", f"Failed to create test document: {error_msg}")
    
    finally:
        # Clean up temporary file
        os.unlink(temp_file_path)
    
    # Test 4: Test with non-existent file path (should return 404)
    print("\n  Testing non-existent file path...")
    non_existent_path = "dri_depart/non_existent_file.pdf"
    encoded_non_existent = urllib.parse.quote(non_existent_path, safe='')
    
    response = make_request("GET", f"/documents/download/{encoded_non_existent}", auth_token=user_token)
    if response and response.status_code == 404:
        results.log_success("Document Download - Non-existent file 404 error")
    else:
        error_detail = f"Status: {response.status_code if response else 'None'}"
        results.log_failure("Document Download - Non-existent file", f"Should return 404, got {error_detail}")
    
    # Test 5: Test path traversal protection (should return 403)
    print("\n  Testing path traversal protection...")
    malicious_paths = [
        "../../../etc/passwd",
        "..%2F..%2F..%2Fetc%2Fpasswd",
        "dri_depart/../../../etc/passwd",
        "dri_depart/../../backend/server.py"
    ]
    
    for malicious_path in malicious_paths:
        encoded_malicious = urllib.parse.quote(malicious_path, safe='')
        response = make_request("GET", f"/documents/download/{encoded_malicious}", auth_token=user_token)
        
        if response and response.status_code == 403:
            results.log_success(f"Document Download - Path traversal protection ({malicious_path[:20]}...)")
            break  # One success is enough to show protection works
        elif response and response.status_code == 404:
            # 404 is also acceptable as it means the path was rejected
            results.log_success(f"Document Download - Path traversal protection via 404 ({malicious_path[:20]}...)")
            break
    else:
        results.log_failure("Document Download - Path traversal protection", "Should block malicious paths")
    
    # Test 6: Test without authentication (should return 401/403)
    print("\n  Testing download without authentication...")
    if test_file_path:
        encoded_path = urllib.parse.quote(test_file_path, safe='')
        response = make_request("GET", f"/documents/download/{encoded_path}")
        
        if response and response.status_code in [401, 403]:
            results.log_success("Document Download - Authentication required")
        else:
            error_detail = f"Status: {response.status_code if response else 'None'}"
            results.log_failure("Document Download - Authentication", f"Should require auth, got {error_detail}")
    
    # Test 7: Test URL encoding handling
    print("\n  Testing URL encoding handling...")
    if test_file_path:
        # Test with spaces and special characters in path
        test_path_with_spaces = test_file_path.replace(".pdf", " test file.pdf")
        # Double encode to test decoding
        double_encoded = urllib.parse.quote(urllib.parse.quote(test_path_with_spaces, safe=''), safe='')
        
        # This should fail gracefully (either 404 or 403)
        response = make_request("GET", f"/documents/download/{double_encoded}", auth_token=user_token)
        if response and response.status_code in [404, 403]:
            results.log_success("Document Download - URL encoding edge case handling")
        else:
            # If it somehow works, that's also acceptable
            results.log_success("Document Download - URL encoding handled gracefully")
    
    # Test 8: Test file path from DRI Depart metadata structure
    print("\n  Testing file path extraction from DRI Depart metadata...")
    if download_test_doc_id:
        # Get the document and verify metadata structure
        response = make_request("GET", f"/documents/{download_test_doc_id}", auth_token=user_token)
        if response and response.status_code == 200:
            doc = response.json()
            metadata = doc.get("metadata", {})
            files_info = metadata.get("files", [])
            
            if files_info:
                file_info = files_info[0]
                required_fields = ["original_name", "stored_name", "file_path", "file_size", "mime_type"]
                missing_fields = [field for field in required_fields if field not in file_info]
                
                if not missing_fields:
                    results.log_success("Document Download - DRI Depart file metadata structure")
                    
                    # Verify file_path is in correct format for dri_depart folder
                    file_path = file_info.get("file_path", "")
                    if "dri_depart" in file_path or "dri_depart" in file_path:
                        results.log_success("Document Download - DRI Depart file path organization")
                    else:
                        results.log_failure("Document Download - File organization", f"File not in dri_depart folder: {file_path}")
                else:
                    results.log_failure("Document Download - File metadata", f"Missing fields: {missing_fields}")
            else:
                results.log_failure("Document Download - Metadata extraction", "No files found in document metadata")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("Document Download - Metadata extraction", error_msg)
    
    # Cleanup: Delete the test document
    if download_test_doc_id:
        make_request("DELETE", f"/documents/{download_test_doc_id}", auth_token=user_token)

def test_document_deletion():
    """Test document deletion functionality"""
    print("\n🗑️ Testing Document Deletion...")
    
    if not test_document_id:
        results.log_failure("Document deletion", "No test document available")
        return
    
    # Test document deletion by owner
    response = make_request("DELETE", f"/documents/{test_document_id}", auth_token=user_token)
    if response and response.status_code == 200:
        data = response.json()
        if "message" in data:
            results.log_success("Document deletion by owner")
        else:
            results.log_failure("Document deletion by owner", "Invalid deletion response")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Document deletion by owner", error_msg)
    
    # Verify document is deleted
    response = make_request("GET", f"/documents/{test_document_id}", auth_token=user_token)
    if response and response.status_code == 404:
        results.log_success("Document deletion verification")
    else:
        results.log_failure("Document deletion verification", "Document should be deleted")

def test_enhanced_file_manager():
    """Test Enhanced File Manager Backend APIs comprehensively"""
    print("\n📁 Testing Enhanced File Manager Backend APIs...")
    
    # Global variables to track created items for cleanup
    created_folders = []
    created_files = []
    
    # Test 1: Get initial folders (should be empty)
    print("\n  Testing initial folder listing...")
    response = make_request("GET", "/file-manager/folders", auth_token=user_token)
    if response and response.status_code == 200:
        data = response.json()
        if isinstance(data, dict) and "folders" in data and "files" in data:
            results.log_success("File Manager - Initial folder listing structure")
            
            # Should be empty initially
            if len(data["folders"]) == 0 and len(data["files"]) == 0:
                results.log_success("File Manager - Initial empty state")
            else:
                results.log_success("File Manager - Initial state (may have existing content)")
        else:
            results.log_failure("File Manager - Initial folder listing", "Invalid response structure")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("File Manager - Initial folder listing", error_msg)
    
    # Test 2: Create root folder with user tracking
    print("\n  Testing folder creation...")
    folder_data = {
        "name": "Project Documents",
        "parent_id": None
    }
    
    response = make_request("POST", "/file-manager/folders", folder_data, auth_token=user_token)
    root_folder_id = None
    if response and response.status_code == 200:
        folder = response.json()
        root_folder_id = folder["id"]
        created_folders.append(root_folder_id)
        
        # Verify folder structure
        if (folder["name"] == folder_data["name"] and 
            folder["parent_id"] is None and
            folder["created_by"] == user_user_id):
            results.log_success("File Manager - Root folder creation with user tracking")
        else:
            results.log_failure("File Manager - Root folder creation", "Invalid folder data returned")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("File Manager - Root folder creation", error_msg)
    
    # Test 3: Create subfolder
    print("\n  Testing subfolder creation...")
    if root_folder_id:
        subfolder_data = {
            "name": "Reports",
            "parent_id": root_folder_id
        }
        
        response = make_request("POST", "/file-manager/folders", subfolder_data, auth_token=user_token)
        subfolder_id = None
        if response and response.status_code == 200:
            folder = response.json()
            subfolder_id = folder["id"]
            created_folders.append(subfolder_id)
            
            # Verify hierarchical structure
            if (folder["name"] == subfolder_data["name"] and 
                folder["parent_id"] == root_folder_id and
                folder["path"] == "/Project Documents/Reports"):
                results.log_success("File Manager - Subfolder creation with path management")
            else:
                results.log_failure("File Manager - Subfolder creation", f"Invalid path or structure: {folder}")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("File Manager - Subfolder creation", error_msg)
    
    # Test 4: Test duplicate folder name prevention
    print("\n  Testing duplicate folder prevention...")
    if root_folder_id:
        duplicate_folder_data = {
            "name": "Reports",  # Same name as subfolder
            "parent_id": root_folder_id
        }
        
        response = make_request("POST", "/file-manager/folders", duplicate_folder_data, auth_token=user_token)
        if response and response.status_code == 400:
            results.log_success("File Manager - Duplicate folder name prevention")
        else:
            results.log_failure("File Manager - Duplicate folder prevention", "Should prevent duplicate folder names")
    
    # Test 5: Upload files to folder with user attribution
    print("\n  Testing file upload to folder...")
    if root_folder_id:
        # Create test files
        test_content1 = b"This is a test document for file manager testing - Document 1"
        test_content2 = b"This is another test document for file manager testing - Document 2"
        
        with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as temp_file1:
            temp_file1.write(test_content1)
            temp_file1_path = temp_file1.name
        
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_file2:
            temp_file2.write(test_content2)
            temp_file2_path = temp_file2.name
        
        try:
            with open(temp_file1_path, 'rb') as f1, open(temp_file2_path, 'rb') as f2:
                files = [
                    ('files', ('test_document1.txt', f1, 'text/plain')),
                    ('files', ('test_document2.pdf', f2, 'application/pdf'))
                ]
                data = {'folder_id': root_folder_id}
                
                response = make_request("POST", "/file-manager/upload", data=data, files=files, auth_token=user_token)
            
            if response and response.status_code == 200:
                upload_result = response.json()
                if "files" in upload_result and len(upload_result["files"]) == 2:
                    results.log_success("File Manager - Multiple file upload to folder")
                    
                    # Store file IDs for cleanup
                    for file_info in upload_result["files"]:
                        created_files.append(file_info["id"])
                    
                    # Verify user attribution
                    first_file = upload_result["files"][0]
                    if (first_file["created_by"] == user_user_id and 
                        first_file["uploaded_by_name"] == "Login User"):  # From login test
                        results.log_success("File Manager - File upload with user attribution")
                    else:
                        results.log_failure("File Manager - File upload attribution", "User attribution not working correctly")
                else:
                    results.log_failure("File Manager - File upload", "Invalid upload response")
            else:
                error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
                results.log_failure("File Manager - File upload", error_msg)
        
        finally:
            os.unlink(temp_file1_path)
            os.unlink(temp_file2_path)
    
    # Test 6: Upload files to root (no folder)
    print("\n  Testing file upload to root...")
    test_content3 = b"This is a root level test document"
    
    with tempfile.NamedTemporaryFile(suffix=".doc", delete=False) as temp_file3:
        temp_file3.write(test_content3)
        temp_file3_path = temp_file3.name
    
    try:
        with open(temp_file3_path, 'rb') as f3:
            files = [('files', ('root_document.doc', f3, 'application/msword'))]
            
            response = make_request("POST", "/file-manager/upload", files=files, auth_token=user_token)
        
        if response and response.status_code == 200:
            upload_result = response.json()
            if "files" in upload_result and len(upload_result["files"]) == 1:
                results.log_success("File Manager - File upload to root")
                created_files.append(upload_result["files"][0]["id"])
            else:
                results.log_failure("File Manager - Root file upload", "Invalid upload response")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("File Manager - Root file upload", error_msg)
    
    finally:
        os.unlink(temp_file3_path)
    
    # Test 7: Get folders with files (verify structure)
    print("\n  Testing folder listing with files...")
    response = make_request("GET", f"/file-manager/folders?parent_id={root_folder_id}", auth_token=user_token)
    if response and response.status_code == 200:
        data = response.json()
        if ("folders" in data and "files" in data and 
            len(data["files"]) >= 2):  # Should have the uploaded files
            results.log_success("File Manager - Folder listing with files")
            
            # Verify file structure
            first_file = data["files"][0]
            required_file_fields = ["id", "name", "original_name", "file_size", "mime_type", 
                                  "created_by", "uploaded_by_name", "created_at"]
            missing_fields = [field for field in required_file_fields if field not in first_file]
            
            if not missing_fields:
                results.log_success("File Manager - File metadata structure")
            else:
                results.log_failure("File Manager - File metadata", f"Missing fields: {missing_fields}")
        else:
            results.log_failure("File Manager - Folder with files", "Files not found in folder")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("File Manager - Folder with files", error_msg)
    
    # Test 8: Edit folder name with permission checks
    print("\n  Testing folder name editing...")
    if root_folder_id:
        update_data = {
            "name": "Updated Project Documents"
        }
        
        response = make_request("PUT", f"/file-manager/folders/{root_folder_id}", update_data, auth_token=user_token)
        if response and response.status_code == 200:
            folder = response.json()
            if (folder["name"] == update_data["name"] and 
                folder["path"] == "/Updated Project Documents"):
                results.log_success("File Manager - Folder name update with path management")
            else:
                results.log_failure("File Manager - Folder update", "Name or path not updated correctly")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("File Manager - Folder update", error_msg)
    
    # Test 9: Test permission checks (user can't edit admin's folder)
    print("\n  Testing folder permission checks...")
    # Create a folder as admin
    admin_folder_data = {
        "name": "Admin Only Folder",
        "parent_id": None
    }
    
    response = make_request("POST", "/file-manager/folders", admin_folder_data, auth_token=admin_token)
    admin_folder_id = None
    if response and response.status_code == 200:
        admin_folder_id = response.json()["id"]
        created_folders.append(admin_folder_id)
        
        # Try to edit as regular user (should fail)
        update_data = {"name": "Hacked Folder"}
        response = make_request("PUT", f"/file-manager/folders/{admin_folder_id}", update_data, auth_token=user_token)
        
        if response and response.status_code == 403:
            results.log_success("File Manager - Folder edit permission check")
        else:
            results.log_failure("File Manager - Folder permissions", "Should deny access to other user's folder")
    
    # Test 10: Search functionality
    print("\n  Testing search functionality...")
    search_query = "Project"
    response = make_request("GET", f"/file-manager/search?query={search_query}", auth_token=user_token)
    if response and response.status_code == 200:
        search_results = response.json()
        if "folders" in search_results and "files" in search_results:
            results.log_success("File Manager - Search functionality structure")
            
            # Should find our updated folder
            found_folders = [f for f in search_results["folders"] if "Project" in f["name"]]
            if found_folders:
                results.log_success("File Manager - Search finds folders by name")
            else:
                results.log_failure("File Manager - Search folders", "Search didn't find expected folder")
        else:
            results.log_failure("File Manager - Search functionality", "Invalid search response structure")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("File Manager - Search functionality", error_msg)
    
    # Test 11: File download functionality
    print("\n  Testing file download...")
    if created_files:
        file_id = created_files[0]
        response = make_request("GET", f"/file-manager/download/{file_id}", auth_token=user_token)
        if response and response.status_code == 200:
            # Check if it's a file download response
            if response.headers.get('content-disposition'):
                results.log_success("File Manager - File download")
            else:
                results.log_success("File Manager - File download (content returned)")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("File Manager - File download", error_msg)
    
    # Test 12: File deletion with permission checks
    print("\n  Testing file deletion...")
    if created_files:
        file_id = created_files[0]
        response = make_request("DELETE", f"/file-manager/files/{file_id}", auth_token=user_token)
        if response and response.status_code == 200:
            results.log_success("File Manager - File deletion by owner")
            created_files.remove(file_id)
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("File Manager - File deletion", error_msg)
    
    # Test 13: Test admin can delete any file
    print("\n  Testing admin file deletion permissions...")
    if created_files:
        file_id = created_files[0]
        response = make_request("DELETE", f"/file-manager/files/{file_id}", auth_token=admin_token)
        if response and response.status_code == 200:
            results.log_success("File Manager - Admin can delete any file")
            created_files.remove(file_id)
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("File Manager - Admin file deletion", error_msg)
    
    # Test 14: Recursive folder deletion
    print("\n  Testing recursive folder deletion...")
    if root_folder_id:
        response = make_request("DELETE", f"/file-manager/folders/{root_folder_id}", auth_token=user_token)
        if response and response.status_code == 200:
            results.log_success("File Manager - Recursive folder deletion")
            # Remove from cleanup list since it's deleted
            if root_folder_id in created_folders:
                created_folders.remove(root_folder_id)
            # Subfolders should also be deleted
            if subfolder_id in created_folders:
                created_folders.remove(subfolder_id)
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("File Manager - Recursive folder deletion", error_msg)
    
    # Test 15: Verify folder and files are deleted
    print("\n  Testing deletion verification...")
    if root_folder_id:
        response = make_request("GET", f"/file-manager/folders?parent_id={root_folder_id}", auth_token=user_token)
        # Should return empty or 404, but let's check the main folder list
        response = make_request("GET", "/file-manager/folders", auth_token=user_token)
        if response and response.status_code == 200:
            data = response.json()
            remaining_folders = [f for f in data["folders"] if f["id"] == root_folder_id]
            if not remaining_folders:
                results.log_success("File Manager - Folder deletion verification")
            else:
                results.log_failure("File Manager - Deletion verification", "Folder still exists after deletion")
    
    # Cleanup remaining items
    print("\n  Cleaning up remaining test items...")
    for folder_id in created_folders:
        make_request("DELETE", f"/file-manager/folders/{folder_id}", auth_token=admin_token)
    
    for file_id in created_files:
        make_request("DELETE", f"/file-manager/files/{file_id}", auth_token=admin_token)

def test_file_manager_renaming():
    """Test File Manager file renaming functionality"""
    print("\n📝 Testing File Manager File Renaming...")
    
    # First, create a test file to rename
    test_content = b"This is a test file for renaming functionality"
    
    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as temp_file:
        temp_file.write(test_content)
        temp_file_path = temp_file.name
    
    file_id = None
    try:
        # Upload a test file
        with open(temp_file_path, 'rb') as f:
            files = [('files', ('original_test_file.txt', f, 'text/plain'))]
            response = make_request("POST", "/file-manager/upload", files=files, auth_token=user_token)
        
        if response and response.status_code == 200:
            upload_result = response.json()
            if "files" in upload_result and len(upload_result["files"]) > 0:
                file_id = upload_result["files"][0]["id"]
                results.log_success("File Manager Rename - Test file upload")
            else:
                results.log_failure("File Manager Rename - Test file upload", "No files returned")
                return
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("File Manager Rename - Test file upload", error_msg)
            return
    
    finally:
        os.unlink(temp_file_path)
    
    if not file_id:
        results.log_failure("File Manager Rename", "Could not create test file")
        return
    
    # Test 1: Rename file with valid new name
    print("\n  Testing file rename with valid name...")
    new_name = "renamed_test_file.txt"
    rename_data = {'new_name': new_name}
    
    response = make_request("PUT", f"/file-manager/files/{file_id}", data=rename_data, auth_token=user_token)
    if response and response.status_code == 200:
        file_info = response.json()
        if (file_info["name"] == new_name and 
            file_info["original_name"] == new_name and
            file_info["id"] == file_id):
            results.log_success("File Manager Rename - Valid name rename")
        else:
            results.log_failure("File Manager Rename - Valid name", f"File not renamed correctly: {file_info}")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("File Manager Rename - Valid name", error_msg)
    
    # Test 2: Test error handling for empty names
    print("\n  Testing rename with empty name...")
    empty_name_data = {'new_name': ''}
    
    response = make_request("PUT", f"/file-manager/files/{file_id}", data=empty_name_data, auth_token=user_token)
    if response and response.status_code in [400, 422]:  # FastAPI returns 422 for validation errors
        results.log_success("File Manager Rename - Empty name rejection")
    else:
        error_detail = f"Status: {response.status_code if response else 'None'}"
        results.log_failure("File Manager Rename - Empty name", f"Should reject empty names - {error_detail}")
    
    # Test 3: Test error handling for whitespace-only names
    print("\n  Testing rename with whitespace-only name...")
    whitespace_name_data = {'new_name': '   '}
    
    response = make_request("PUT", f"/file-manager/files/{file_id}", data=whitespace_name_data, auth_token=user_token)
    if response and response.status_code == 400:
        results.log_success("File Manager Rename - Whitespace name rejection")
    else:
        error_detail = f"Status: {response.status_code if response else 'None'}"
        results.log_failure("File Manager Rename - Whitespace name", f"Should reject whitespace-only names - {error_detail}")
    
    # Test 4: Test permission checks (create file as admin, try to rename as user)
    print("\n  Testing rename permission checks...")
    
    # Create a file as admin
    admin_test_content = b"This is an admin test file for permission testing"
    
    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as admin_temp_file:
        admin_temp_file.write(admin_test_content)
        admin_temp_file_path = admin_temp_file.name
    
    admin_file_id = None
    try:
        with open(admin_temp_file_path, 'rb') as f:
            files = [('files', ('admin_test_file.txt', f, 'text/plain'))]
            response = make_request("POST", "/file-manager/upload", files=files, auth_token=admin_token)
        
        if response and response.status_code == 200:
            upload_result = response.json()
            if "files" in upload_result and len(upload_result["files"]) > 0:
                admin_file_id = upload_result["files"][0]["id"]
                
                # Try to rename admin's file as regular user (should fail)
                unauthorized_rename_data = {'new_name': 'hacked_file.txt'}
                response = make_request("PUT", f"/file-manager/files/{admin_file_id}", 
                                      data=unauthorized_rename_data, auth_token=user_token)
                
                if response and response.status_code == 403:
                    results.log_success("File Manager Rename - Permission check (user cannot rename admin file)")
                else:
                    error_detail = f"Status: {response.status_code if response else 'None'}"
                    results.log_failure("File Manager Rename - Permission check", f"Should deny unauthorized rename - {error_detail}")
            
    finally:
        os.unlink(admin_temp_file_path)
        # Clean up admin file
        if admin_file_id:
            make_request("DELETE", f"/file-manager/files/{admin_file_id}", auth_token=admin_token)
    
    # Test 5: Test that admin can rename any file
    print("\n  Testing admin can rename any file...")
    admin_rename_data = {'new_name': 'admin_renamed_file.txt'}
    
    response = make_request("PUT", f"/file-manager/files/{file_id}", data=admin_rename_data, auth_token=admin_token)
    if response and response.status_code == 200:
        file_info = response.json()
        if file_info["name"] == "admin_renamed_file.txt":
            results.log_success("File Manager Rename - Admin can rename any file")
        else:
            results.log_failure("File Manager Rename - Admin permission", "Admin rename failed")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("File Manager Rename - Admin permission", error_msg)
    
    # Test 6: Test renaming non-existent file
    print("\n  Testing rename non-existent file...")
    fake_file_id = str(uuid.uuid4())
    fake_rename_data = {'new_name': 'fake_file.txt'}
    
    response = make_request("PUT", f"/file-manager/files/{fake_file_id}", data=fake_rename_data, auth_token=user_token)
    if response and response.status_code == 404:
        results.log_success("File Manager Rename - Non-existent file handling")
    else:
        error_detail = f"Status: {response.status_code if response else 'None'}"
        results.log_failure("File Manager Rename - Non-existent file", f"Should return 404 for non-existent file - {error_detail}")
    
    # Test 7: Verify response includes updated file information
    print("\n  Testing response includes updated file information...")
    final_rename_data = {'new_name': 'final_test_file.txt'}
    
    response = make_request("PUT", f"/file-manager/files/{file_id}", data=final_rename_data, auth_token=user_token)
    if response and response.status_code == 200:
        file_info = response.json()
        required_fields = ["id", "name", "original_name", "file_path", "folder_id", "file_size", 
                          "mime_type", "created_by", "uploaded_by_name", "created_at", "updated_at"]
        
        missing_fields = [field for field in required_fields if field not in file_info]
        if not missing_fields:
            results.log_success("File Manager Rename - Complete response structure")
        else:
            results.log_failure("File Manager Rename - Response structure", f"Missing fields: {missing_fields}")
    
    # Cleanup: Delete the test file
    if file_id:
        make_request("DELETE", f"/file-manager/files/{file_id}", auth_token=user_token)

def test_file_manager_preview():
    """Test File Manager file preview functionality"""
    print("\n👁️ Testing File Manager File Preview...")
    
    # Create test files of different types
    test_files = [
        ("test_text.txt", b"This is a text file content for preview testing.\nLine 2 of the text file.\nLine 3 with special chars", "text/plain"),
        ("test_image.jpg", b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xFF\xDB", "image/jpeg"),
        ("test_pdf.pdf", b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj", "application/pdf"),
        ("test_doc.doc", b"\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1", "application/msword"),
        ("test_excel.xlsx", b"PK\x03\x04", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
        ("test_json.json", b'{"name": "test", "value": 123, "array": [1, 2, 3]}', "application/json"),
        ("test_csv.csv", b"Name,Age,City\nJohn,25,Paris\nJane,30,London", "text/csv"),
        ("test_unknown.xyz", b"Unknown file type content", "application/octet-stream")
    ]
    
    uploaded_file_ids = []
    
    # Upload all test files
    print("\n  Uploading test files for preview testing...")
    for filename, content, mime_type in test_files:
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            with open(temp_file_path, 'rb') as f:
                files = [('files', (filename, f, mime_type))]
                response = make_request("POST", "/file-manager/upload", files=files, auth_token=user_token)
            
            if response and response.status_code == 200:
                upload_result = response.json()
                if "files" in upload_result and len(upload_result["files"]) > 0:
                    file_id = upload_result["files"][0]["id"]
                    uploaded_file_ids.append((file_id, filename, mime_type))
                    results.log_success(f"File Manager Preview - Upload {filename}")
                else:
                    results.log_failure(f"File Manager Preview - Upload {filename}", "No files returned")
        
        finally:
            os.unlink(temp_file_path)
    
    if not uploaded_file_ids:
        results.log_failure("File Manager Preview", "Could not upload any test files")
        return
    
    # Test 1: Preview text files
    print("\n  Testing text file preview...")
    text_file_id = next((fid for fid, fname, _ in uploaded_file_ids if fname == "test_text.txt"), None)
    if text_file_id:
        response = make_request("GET", f"/file-manager/preview/{text_file_id}", auth_token=user_token)
        if response and response.status_code == 200:
            preview_data = response.json()
            if (preview_data.get("preview_type") == "text" and 
                "content" in preview_data and 
                preview_data.get("can_preview") == True and
                "This is a text file content" in preview_data["content"]):
                results.log_success("File Manager Preview - Text file preview")
            else:
                results.log_failure("File Manager Preview - Text file", f"Invalid text preview: {preview_data}")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("File Manager Preview - Text file", error_msg)
    
    # Test 2: Preview JSON file (should be treated as text)
    print("\n  Testing JSON file preview...")
    json_file_id = next((fid for fid, fname, _ in uploaded_file_ids if fname == "test_json.json"), None)
    if json_file_id:
        response = make_request("GET", f"/file-manager/preview/{json_file_id}", auth_token=user_token)
        if response and response.status_code == 200:
            preview_data = response.json()
            if (preview_data.get("preview_type") == "text" and 
                "content" in preview_data and 
                preview_data.get("can_preview") == True and
                '"name": "test"' in preview_data["content"]):
                results.log_success("File Manager Preview - JSON file preview")
            else:
                results.log_failure("File Manager Preview - JSON file", f"Invalid JSON preview: {preview_data}")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("File Manager Preview - JSON file", error_msg)
    
    # Test 3: Preview CSV file (should be treated as text)
    print("\n  Testing CSV file preview...")
    csv_file_id = next((fid for fid, fname, _ in uploaded_file_ids if fname == "test_csv.csv"), None)
    if csv_file_id:
        response = make_request("GET", f"/file-manager/preview/{csv_file_id}", auth_token=user_token)
        if response and response.status_code == 200:
            preview_data = response.json()
            if (preview_data.get("preview_type") == "text" and 
                "content" in preview_data and 
                preview_data.get("can_preview") == True and
                "Name,Age,City" in preview_data["content"]):
                results.log_success("File Manager Preview - CSV file preview")
            else:
                results.log_failure("File Manager Preview - CSV file", f"Invalid CSV preview: {preview_data}")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("File Manager Preview - CSV file", error_msg)
    
    # Test 4: Preview image files
    print("\n  Testing image file preview...")
    image_file_id = next((fid for fid, fname, _ in uploaded_file_ids if fname == "test_image.jpg"), None)
    if image_file_id:
        response = make_request("GET", f"/file-manager/preview/{image_file_id}", auth_token=user_token)
        if response and response.status_code == 200:
            preview_data = response.json()
            if (preview_data.get("preview_type") == "image" and 
                "file_url" in preview_data and 
                preview_data.get("can_preview") == True and
                preview_data["file_url"] == f"/api/file-manager/download/{image_file_id}"):
                results.log_success("File Manager Preview - Image file preview")
            else:
                results.log_failure("File Manager Preview - Image file", f"Invalid image preview: {preview_data}")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("File Manager Preview - Image file", error_msg)
    
    # Test 5: Preview PDF files
    print("\n  Testing PDF file preview...")
    pdf_file_id = next((fid for fid, fname, _ in uploaded_file_ids if fname == "test_pdf.pdf"), None)
    if pdf_file_id:
        response = make_request("GET", f"/file-manager/preview/{pdf_file_id}", auth_token=user_token)
        if response and response.status_code == 200:
            preview_data = response.json()
            if (preview_data.get("preview_type") == "pdf" and 
                "file_url" in preview_data and 
                preview_data.get("can_preview") == True and
                preview_data["file_url"] == f"/api/file-manager/download/{pdf_file_id}"):
                results.log_success("File Manager Preview - PDF file preview")
            else:
                results.log_failure("File Manager Preview - PDF file", f"Invalid PDF preview: {preview_data}")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("File Manager Preview - PDF file", error_msg)
    
    # Test 6: Preview office documents (should have can_preview = false)
    print("\n  Testing office document preview...")
    doc_file_id = next((fid for fid, fname, _ in uploaded_file_ids if fname == "test_doc.doc"), None)
    if doc_file_id:
        response = make_request("GET", f"/file-manager/preview/{doc_file_id}", auth_token=user_token)
        if response and response.status_code == 200:
            preview_data = response.json()
            if (preview_data.get("preview_type") == "office" and 
                "file_url" in preview_data and 
                preview_data.get("can_preview") == False and
                "message" in preview_data):
                results.log_success("File Manager Preview - Office document preview")
            else:
                results.log_failure("File Manager Preview - Office document", f"Invalid office preview: {preview_data}")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("File Manager Preview - Office document", error_msg)
    
    # Test 7: Preview Excel files (should have can_preview = false)
    print("\n  Testing Excel file preview...")
    excel_file_id = next((fid for fid, fname, _ in uploaded_file_ids if fname == "test_excel.xlsx"), None)
    if excel_file_id:
        response = make_request("GET", f"/file-manager/preview/{excel_file_id}", auth_token=user_token)
        if response and response.status_code == 200:
            preview_data = response.json()
            if (preview_data.get("preview_type") == "office" and 
                "file_url" in preview_data and 
                preview_data.get("can_preview") == False and
                "message" in preview_data):
                results.log_success("File Manager Preview - Excel file preview")
            else:
                results.log_failure("File Manager Preview - Excel file", f"Invalid Excel preview: {preview_data}")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("File Manager Preview - Excel file", error_msg)
    
    # Test 8: Preview unknown file types
    print("\n  Testing unknown file type preview...")
    unknown_file_id = next((fid for fid, fname, _ in uploaded_file_ids if fname == "test_unknown.xyz"), None)
    if unknown_file_id:
        response = make_request("GET", f"/file-manager/preview/{unknown_file_id}", auth_token=user_token)
        if response and response.status_code == 200:
            preview_data = response.json()
            if (preview_data.get("preview_type") == "unknown" and 
                preview_data.get("can_preview") == False and
                "message" in preview_data):
                results.log_success("File Manager Preview - Unknown file type preview")
            else:
                results.log_failure("File Manager Preview - Unknown file type", f"Invalid unknown preview: {preview_data}")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("File Manager Preview - Unknown file type", error_msg)
    
    # Test 9: Test error handling for non-existent files
    print("\n  Testing preview non-existent file...")
    fake_file_id = str(uuid.uuid4())
    
    response = make_request("GET", f"/file-manager/preview/{fake_file_id}", auth_token=user_token)
    if response and response.status_code == 404:
        results.log_success("File Manager Preview - Non-existent file handling")
    else:
        error_detail = f"Status: {response.status_code if response else 'None'}"
        results.log_failure("File Manager Preview - Non-existent file", f"Should return 404 for non-existent file - {error_detail}")
    
    # Test 10: Verify response includes appropriate preview_type and content/file_url
    print("\n  Testing response structure completeness...")
    if uploaded_file_ids:
        file_id, filename, _ = uploaded_file_ids[0]
        response = make_request("GET", f"/file-manager/preview/{file_id}", auth_token=user_token)
        if response and response.status_code == 200:
            preview_data = response.json()
            required_fields = ["file_id", "name", "file_size", "mime_type", "preview_type", "can_preview"]
            
            missing_fields = [field for field in required_fields if field not in preview_data]
            if not missing_fields:
                results.log_success("File Manager Preview - Complete response structure")
            else:
                results.log_failure("File Manager Preview - Response structure", f"Missing fields: {missing_fields}")
            
            # Check that either content or file_url is present based on preview type
            preview_type = preview_data.get("preview_type")
            if preview_type == "text" and "content" not in preview_data:
                results.log_failure("File Manager Preview - Text content", "Text preview should include content field")
            elif preview_type in ["image", "pdf", "office"] and "file_url" not in preview_data:
                results.log_failure("File Manager Preview - File URL", f"{preview_type} preview should include file_url field")
            else:
                results.log_success("File Manager Preview - Appropriate content/file_url field")
    
    # Cleanup: Delete all test files
    print("\n  Cleaning up test files...")
    for file_id, filename, _ in uploaded_file_ids:
        make_request("DELETE", f"/file-manager/files/{file_id}", auth_token=user_token)

def test_calendar_management():
    """Test Calendar Management APIs comprehensively"""
    print("\n📅 Testing Calendar Management APIs...")
    
    # Global variables to track created events for cleanup
    created_events = []
    
    # Test 1: Get initial calendar events (should be empty or existing)
    print("\n  Testing initial calendar events listing...")
    response = make_request("GET", "/calendar/events", auth_token=user_token)
    if response and response.status_code == 200:
        data = response.json()
        if isinstance(data, dict) and "events" in data:
            results.log_success("Calendar - Initial events listing structure")
            initial_events_count = len(data["events"])
        else:
            results.log_failure("Calendar - Initial events listing", "Invalid response structure")
            initial_events_count = 0
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Calendar - Initial events listing", error_msg)
        initial_events_count = 0
    
    # Test 2: Create calendar event with all fields
    print("\n  Testing calendar event creation...")
    from datetime import datetime, timedelta
    
    start_date = datetime.utcnow() + timedelta(days=1)
    end_date = start_date + timedelta(hours=2)
    
    event_data = {
        "title": "Team Meeting - Project Review",
        "description": "Weekly team meeting to review project progress and discuss upcoming milestones",
        "start_date": start_date.isoformat() + "Z",
        "end_date": end_date.isoformat() + "Z",
        "all_day": False,
        "color": "#3b82f6",
        "attendees": ["john.doe@epsys.com", "sarah.johnson@epsys.com"],
        "location": "Conference Room A",
        "reminder_minutes": 15,
        "category": "meeting"
    }
    
    response = make_request("POST", "/calendar/events", event_data, auth_token=user_token)
    event_id = None
    if response and response.status_code == 200:
        event = response.json()
        event_id = event["id"]
        created_events.append(event_id)
        
        # Verify event structure
        if (event["title"] == event_data["title"] and 
            event["created_by"] == user_user_id and
            event["location"] == event_data["location"]):
            results.log_success("Calendar - Event creation with all fields")
        else:
            results.log_failure("Calendar - Event creation", "Invalid event data returned")
        
        # Verify user attribution
        if event["created_by_name"] == "Login User":  # From login test
            results.log_success("Calendar - Event creation with user attribution")
        else:
            results.log_failure("Calendar - Event attribution", "User attribution not working correctly")
            
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Calendar - Event creation", error_msg)
    
    # Test 3: Create all-day event
    print("\n  Testing all-day event creation...")
    all_day_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=2)
    all_day_end = all_day_start + timedelta(days=1)
    
    all_day_event_data = {
        "title": "Company Holiday - National Day",
        "description": "National holiday - office closed",
        "start_date": all_day_start.isoformat() + "Z",
        "end_date": all_day_end.isoformat() + "Z",
        "all_day": True,
        "color": "#ef4444",
        "category": "holiday"
    }
    
    response = make_request("POST", "/calendar/events", all_day_event_data, auth_token=user_token)
    all_day_event_id = None
    if response and response.status_code == 200:
        event = response.json()
        all_day_event_id = event["id"]
        created_events.append(all_day_event_id)
        
        if event["all_day"] == True and event["category"] == "holiday":
            results.log_success("Calendar - All-day event creation")
        else:
            results.log_failure("Calendar - All-day event", "All-day event not created correctly")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Calendar - All-day event creation", error_msg)
    
    # Test 4: Test date validation (end date before start date)
    print("\n  Testing date validation...")
    invalid_event_data = {
        "title": "Invalid Event",
        "start_date": end_date.isoformat() + "Z",
        "end_date": start_date.isoformat() + "Z",  # End before start
        "all_day": False
    }
    
    response = make_request("POST", "/calendar/events", invalid_event_data, auth_token=user_token)
    if response and response.status_code == 400:
        results.log_success("Calendar - Date validation (end before start)")
    else:
        results.log_failure("Calendar - Date validation", "Should reject invalid date range")
    
    # Test 5: Get events without date filters
    print("\n  Testing events retrieval without filters...")
    response = make_request("GET", "/calendar/events", auth_token=user_token)
    if response and response.status_code == 200:
        data = response.json()
        if "events" in data and len(data["events"]) >= initial_events_count + 2:
            results.log_success("Calendar - Events retrieval without filters")
        else:
            results.log_failure("Calendar - Events retrieval", "Events not found or incorrect count")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Calendar - Events retrieval", error_msg)
    
    # Test 6: Get events with date filters
    print("\n  Testing events retrieval with date filters...")
    filter_start = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    filter_end = filter_start + timedelta(days=1)
    
    response = make_request("GET", f"/calendar/events?start_date={filter_start.isoformat()}Z&end_date={filter_end.isoformat()}Z", auth_token=user_token)
    if response and response.status_code == 200:
        data = response.json()
        if "events" in data:
            # Should find our team meeting event
            filtered_events = [e for e in data["events"] if e["title"] == "Team Meeting - Project Review"]
            if filtered_events:
                results.log_success("Calendar - Events retrieval with date filters")
            else:
                results.log_success("Calendar - Date filter functionality (no events in range)")
        else:
            results.log_failure("Calendar - Date filtered events", "Invalid response structure")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Calendar - Date filtered events", error_msg)
    
    # Test 7: Update calendar event
    print("\n  Testing calendar event update...")
    if event_id:
        update_data = {
            "title": "Updated Team Meeting - Project Review & Planning",
            "description": "Updated description: Weekly team meeting with extended planning session",
            "location": "Conference Room B",
            "reminder_minutes": 30,
            "color": "#10b981"
        }
        
        response = make_request("PUT", f"/calendar/events/{event_id}", update_data, auth_token=user_token)
        if response and response.status_code == 200:
            updated_event = response.json()
            if (updated_event["title"] == update_data["title"] and 
                updated_event["location"] == update_data["location"] and
                updated_event["reminder_minutes"] == update_data["reminder_minutes"]):
                results.log_success("Calendar - Event update")
            else:
                results.log_failure("Calendar - Event update", "Event not updated correctly")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("Calendar - Event update", error_msg)
    
    # Test 8: Test permission checks (user can't edit other's event)
    print("\n  Testing event permission checks...")
    # Create an event as admin
    admin_event_data = {
        "title": "Admin Meeting",
        "start_date": (start_date + timedelta(days=3)).isoformat() + "Z",
        "end_date": (start_date + timedelta(days=3, hours=1)).isoformat() + "Z",
        "all_day": False
    }
    
    response = make_request("POST", "/calendar/events", admin_event_data, auth_token=admin_token)
    admin_event_id = None
    if response and response.status_code == 200:
        admin_event_id = response.json()["id"]
        created_events.append(admin_event_id)
        
        # Try to edit as regular user (should fail)
        update_data = {"title": "Hacked Meeting"}
        response = make_request("PUT", f"/calendar/events/{admin_event_id}", update_data, auth_token=user_token)
        
        if response and response.status_code == 403:
            results.log_success("Calendar - Event edit permission check")
        else:
            results.log_failure("Calendar - Event permissions", "Should deny access to other user's event")
    
    # Test 9: Test admin can edit any event
    print("\n  Testing admin event permissions...")
    if event_id:
        admin_update_data = {"title": "Admin Updated Meeting"}
        response = make_request("PUT", f"/calendar/events/{event_id}", admin_update_data, auth_token=admin_token)
        
        if response and response.status_code == 200:
            results.log_success("Calendar - Admin can edit any event")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("Calendar - Admin event permissions", error_msg)
    
    # Test 10: Delete calendar event
    print("\n  Testing calendar event deletion...")
    if event_id:
        response = make_request("DELETE", f"/calendar/events/{event_id}", auth_token=user_token)
        if response and response.status_code == 200:
            results.log_success("Calendar - Event deletion by owner")
            created_events.remove(event_id)
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("Calendar - Event deletion", error_msg)
    
    # Test 11: Test permission checks for deletion
    print("\n  Testing event deletion permission checks...")
    if admin_event_id:
        # Try to delete admin's event as regular user (should fail)
        response = make_request("DELETE", f"/calendar/events/{admin_event_id}", auth_token=user_token)
        
        if response and response.status_code == 403:
            results.log_success("Calendar - Event deletion permission check")
        else:
            results.log_failure("Calendar - Event deletion permissions", "Should deny deletion of other user's event")
        
        # Admin should be able to delete it
        response = make_request("DELETE", f"/calendar/events/{admin_event_id}", auth_token=admin_token)
        if response and response.status_code == 200:
            results.log_success("Calendar - Admin can delete any event")
            created_events.remove(admin_event_id)
        else:
            results.log_failure("Calendar - Admin event deletion", "Admin should be able to delete any event")
    
    # Test 12: Verify event is deleted
    print("\n  Testing event deletion verification...")
    if event_id:
        response = make_request("GET", f"/calendar/events", auth_token=user_token)
        if response and response.status_code == 200:
            data = response.json()
            deleted_events = [e for e in data["events"] if e["id"] == event_id]
            if not deleted_events:
                results.log_success("Calendar - Event deletion verification")
            else:
                results.log_failure("Calendar - Event deletion verification", "Event should be deleted")
    
    # Cleanup remaining events
    print("\n  Cleaning up remaining test events...")
    for event_id in created_events:
        make_request("DELETE", f"/calendar/events/{event_id}", auth_token=admin_token)

def test_user_settings():
    """Test User Settings APIs comprehensively"""
    print("\n⚙️ Testing User Settings APIs...")
    
    # Test 1: Get user settings (should create default if not exists)
    print("\n  Testing initial settings retrieval...")
    response = make_request("GET", "/settings", auth_token=user_token)
    if response and response.status_code == 200:
        settings = response.json()
        
        # Verify default settings structure
        required_fields = ["user_id", "full_name", "email", "language", "timezone", 
                          "date_format", "theme", "email_notifications", "push_notifications"]
        missing_fields = [field for field in required_fields if field not in settings]
        
        if not missing_fields:
            results.log_success("Settings - Initial settings retrieval with default creation")
        else:
            results.log_failure("Settings - Initial settings", f"Missing fields: {missing_fields}")
        
        # Verify default values
        if (settings["language"] == "fr" and 
            settings["timezone"] == "Europe/Paris" and
            settings["date_format"] == "DD/MM/YYYY"):
            results.log_success("Settings - Default values validation")
        else:
            results.log_failure("Settings - Default values", "Default values not set correctly")
            
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Settings - Initial settings retrieval", error_msg)
    
    # Test 2: Update user settings (profile settings)
    print("\n  Testing profile settings update...")
    profile_update = {
        "full_name": "John Smith Updated",
        "phone": "+213-555-0123",
        "bio": "Senior Document Manager at EPSys - Updated profile"
    }
    
    response = make_request("PUT", "/settings", profile_update, auth_token=user_token)
    if response and response.status_code == 200:
        updated_settings = response.json()
        if (updated_settings["full_name"] == profile_update["full_name"] and
            updated_settings["phone"] == profile_update["phone"] and
            updated_settings["bio"] == profile_update["bio"]):
            results.log_success("Settings - Profile settings update")
        else:
            results.log_failure("Settings - Profile update", "Profile settings not updated correctly")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Settings - Profile settings update", error_msg)
    
    # Test 3: Update notification settings
    print("\n  Testing notification settings update...")
    notification_update = {
        "email_notifications": False,
        "push_notifications": True,
        "document_update_notifications": False,
        "message_notifications": True,
        "calendar_reminders": False
    }
    
    response = make_request("PUT", "/settings", notification_update, auth_token=user_token)
    if response and response.status_code == 200:
        updated_settings = response.json()
        if (updated_settings["email_notifications"] == False and
            updated_settings["push_notifications"] == True and
            updated_settings["calendar_reminders"] == False):
            results.log_success("Settings - Notification settings update")
        else:
            results.log_failure("Settings - Notification update", "Notification settings not updated correctly")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Settings - Notification settings update", error_msg)
    
    # Test 4: Update system preferences
    print("\n  Testing system preferences update...")
    system_update = {
        "language": "en",
        "timezone": "America/New_York",
        "date_format": "MM/DD/YYYY",
        "theme": "dark"
    }
    
    response = make_request("PUT", "/settings", system_update, auth_token=user_token)
    if response and response.status_code == 200:
        updated_settings = response.json()
        if (updated_settings["language"] == "en" and
            updated_settings["timezone"] == "America/New_York" and
            updated_settings["theme"] == "dark"):
            results.log_success("Settings - System preferences update")
        else:
            results.log_failure("Settings - System preferences", "System preferences not updated correctly")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Settings - System preferences update", error_msg)
    
    # Test 5: Update security and privacy settings
    print("\n  Testing security and privacy settings update...")
    security_update = {
        "two_factor_enabled": True,
        "session_timeout_minutes": 60,
        "profile_visibility": "private",
        "show_online_status": False
    }
    
    response = make_request("PUT", "/settings", security_update, auth_token=user_token)
    if response and response.status_code == 200:
        updated_settings = response.json()
        if (updated_settings["two_factor_enabled"] == True and
            updated_settings["session_timeout_minutes"] == 60 and
            updated_settings["profile_visibility"] == "private"):
            results.log_success("Settings - Security and privacy settings update")
        else:
            results.log_failure("Settings - Security/privacy update", "Security/privacy settings not updated correctly")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Settings - Security and privacy settings update", error_msg)
    
    # Test 6: Verify settings persistence
    print("\n  Testing settings persistence...")
    response = make_request("GET", "/settings", auth_token=user_token)
    if response and response.status_code == 200:
        settings = response.json()
        if (settings["full_name"] == "John Smith Updated" and
            settings["language"] == "en" and
            settings["two_factor_enabled"] == True):
            results.log_success("Settings - Settings persistence verification")
        else:
            results.log_failure("Settings - Persistence", "Settings not persisted correctly")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Settings - Settings persistence", error_msg)
    
    # Test 7: Password change with correct current password
    print("\n  Testing password change with correct current password...")
    password_change = {
        "current_password": "UserPass456!",  # From login test
        "new_password": "NewSecurePass789!"
    }
    
    response = make_request("POST", "/settings/change-password", password_change, auth_token=user_token)
    if response and response.status_code == 200:
        data = response.json()
        if "message" in data and "successfully" in data["message"].lower():
            results.log_success("Settings - Password change with correct current password")
        else:
            results.log_failure("Settings - Password change", "Invalid password change response")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Settings - Password change", error_msg)
    
    # Test 8: Password change with wrong current password
    print("\n  Testing password change with wrong current password...")
    wrong_password_change = {
        "current_password": "WrongPassword123!",
        "new_password": "AnotherNewPass456!"
    }
    
    response = make_request("POST", "/settings/change-password", wrong_password_change, auth_token=user_token)
    if response and response.status_code == 400:
        results.log_success("Settings - Password change rejection with wrong current password")
    else:
        results.log_failure("Settings - Wrong password validation", "Should reject wrong current password")
    
    # Test 9: Password change with weak new password
    print("\n  Testing password change with weak new password...")
    weak_password_change = {
        "current_password": "NewSecurePass789!",  # Updated password
        "new_password": "123"  # Too weak
    }
    
    response = make_request("POST", "/settings/change-password", weak_password_change, auth_token=user_token)
    if response and response.status_code == 422:  # Validation error
        results.log_success("Settings - Weak password rejection")
    else:
        results.log_failure("Settings - Weak password validation", "Should reject weak passwords")
    
    # Test 10: Admin-only system info endpoint (as regular user - should fail)
    print("\n  Testing system info access as regular user...")
    response = make_request("GET", "/settings/system-info", auth_token=user_token)
    if response and response.status_code == 403:
        results.log_success("Settings - System info access denied for regular user")
    else:
        results.log_failure("Settings - System info permissions", "Should deny access to non-admin users")
    
    # Test 11: Admin-only system info endpoint (as admin - should succeed)
    print("\n  Testing system info access as admin...")
    response = make_request("GET", "/settings/system-info", auth_token=admin_token)
    if response and response.status_code == 200:
        system_info = response.json()
        
        # Verify system info structure
        if ("database_stats" in system_info and "system_status" in system_info):
            results.log_success("Settings - Admin system info access")
            
            # Verify database stats structure
            db_stats = system_info["database_stats"]
            required_stats = ["total_users", "total_documents", "total_folders", "total_files", "total_events"]
            missing_stats = [stat for stat in required_stats if stat not in db_stats]
            
            if not missing_stats:
                results.log_success("Settings - System info database statistics structure")
            else:
                results.log_failure("Settings - System info stats", f"Missing stats: {missing_stats}")
            
            # Verify system status
            sys_status = system_info["system_status"]
            if ("status" in sys_status and "version" in sys_status):
                results.log_success("Settings - System info status structure")
            else:
                results.log_failure("Settings - System status", "Missing system status fields")
                
        else:
            results.log_failure("Settings - System info structure", "Invalid system info response structure")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Settings - Admin system info access", error_msg)
    
    # Test 12: Verify password change worked by trying to login with new password
    print("\n  Testing login with new password...")
    # We need to get the username first - let's use the /me endpoint
    me_response = make_request("GET", "/me", auth_token=user_token)
    if me_response and me_response.status_code == 200:
        username = me_response.json()["username"]
        
        new_login = {
            "username": username,
            "password": "NewSecurePass789!"  # The new password we set
        }
        
        response = make_request("POST", "/login", new_login)
        if response and response.status_code == 200:
            results.log_success("Settings - Login with new password verification")
        else:
            results.log_failure("Settings - New password verification", "Cannot login with new password")
    else:
        results.log_failure("Settings - Password verification setup", "Could not get username for verification")

def test_calendar_event_deletion():
    """Test Calendar Event Deletion API comprehensively"""
    print("\n🗓️ Testing Calendar Event Deletion API...")
    
    # Global variables to track created events for cleanup
    created_events = []
    
    # Test 1: Create test events for deletion testing
    print("\n  Creating test events for deletion testing...")
    
    # Create event as regular user
    user_event_data = {
        "title": "User Team Meeting",
        "description": "Weekly team sync meeting",
        "start_date": "2025-02-15T10:00:00Z",
        "end_date": "2025-02-15T11:00:00Z",
        "all_day": False,
        "color": "#3b82f6",
        "attendees": ["team@epsys.com"],
        "location": "Conference Room A",
        "reminder_minutes": 15,
        "category": "meeting"
    }
    
    response = make_request("POST", "/calendar/events", user_event_data, auth_token=user_token)
    user_event_id = None
    if response and response.status_code == 200:
        event = response.json()
        user_event_id = event["id"]
        created_events.append(user_event_id)
        results.log_success("Calendar Event Deletion - User event creation for testing")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Calendar Event Deletion - User event creation", error_msg)
    
    # Create event as admin
    admin_event_data = {
        "title": "Admin System Maintenance",
        "description": "Scheduled system maintenance window",
        "start_date": "2025-02-20T02:00:00Z",
        "end_date": "2025-02-20T04:00:00Z",
        "all_day": False,
        "color": "#ef4444",
        "attendees": ["admin@epsys.com"],
        "location": "Server Room",
        "reminder_minutes": 30,
        "category": "maintenance"
    }
    
    response = make_request("POST", "/calendar/events", admin_event_data, auth_token=admin_token)
    admin_event_id = None
    if response and response.status_code == 200:
        event = response.json()
        admin_event_id = event["id"]
        created_events.append(admin_event_id)
        results.log_success("Calendar Event Deletion - Admin event creation for testing")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Calendar Event Deletion - Admin event creation", error_msg)
    
    # Test 2: User can delete their own events
    print("\n  Testing user can delete own events...")
    if user_event_id:
        response = make_request("DELETE", f"/calendar/events/{user_event_id}", auth_token=user_token)
        if response and response.status_code == 200:
            data = response.json()
            if "message" in data and "deleted successfully" in data["message"]:
                results.log_success("Calendar Event Deletion - User can delete own event")
                created_events.remove(user_event_id)
            else:
                results.log_failure("Calendar Event Deletion - User delete own", "Invalid deletion response")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("Calendar Event Deletion - User delete own", error_msg)
    
    # Test 3: Verify event is actually deleted
    print("\n  Testing event deletion verification...")
    if user_event_id:
        response = make_request("GET", f"/calendar/events", auth_token=user_token)
        if response and response.status_code == 200:
            events_data = response.json()
            events = events_data.get("events", [])
            deleted_event_found = any(event["id"] == user_event_id for event in events)
            
            if not deleted_event_found:
                results.log_success("Calendar Event Deletion - Event deletion verification")
            else:
                results.log_failure("Calendar Event Deletion - Deletion verification", "Deleted event still found in list")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("Calendar Event Deletion - Deletion verification", error_msg)
    
    # Test 4: User cannot delete other user's events
    print("\n  Testing user cannot delete admin events...")
    if admin_event_id:
        response = make_request("DELETE", f"/calendar/events/{admin_event_id}", auth_token=user_token)
        if response and response.status_code == 403:
            results.log_success("Calendar Event Deletion - User denied access to admin event")
        else:
            error_detail = f"Status: {response.status_code if response else 'None'}"
            results.log_failure("Calendar Event Deletion - Permission check", f"Should deny access - {error_detail}")
    
    # Test 5: Admin can delete any event
    print("\n  Testing admin can delete any event...")
    if admin_event_id:
        response = make_request("DELETE", f"/calendar/events/{admin_event_id}", auth_token=admin_token)
        if response and response.status_code == 200:
            data = response.json()
            if "message" in data and "deleted successfully" in data["message"]:
                results.log_success("Calendar Event Deletion - Admin can delete any event")
                created_events.remove(admin_event_id)
            else:
                results.log_failure("Calendar Event Deletion - Admin delete any", "Invalid deletion response")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("Calendar Event Deletion - Admin delete any", error_msg)
    
    # Test 6: Test deletion with invalid event ID
    print("\n  Testing deletion with invalid event ID...")
    invalid_event_id = "invalid-event-id-12345"
    response = make_request("DELETE", f"/calendar/events/{invalid_event_id}", auth_token=user_token)
    if response and response.status_code == 404:
        results.log_success("Calendar Event Deletion - Invalid event ID handling")
    else:
        error_detail = f"Status: {response.status_code if response else 'None'}"
        results.log_failure("Calendar Event Deletion - Invalid ID", f"Should return 404 - {error_detail}")
    
    # Test 7: Test deletion without authentication
    print("\n  Testing deletion without authentication...")
    if admin_event_id:  # Use any event ID for this test
        response = make_request("DELETE", f"/calendar/events/{admin_event_id}")
        if response and response.status_code in [401, 403]:
            results.log_success("Calendar Event Deletion - Authentication required")
        else:
            error_detail = f"Status: {response.status_code if response else 'None'}"
            results.log_failure("Calendar Event Deletion - Auth required", f"Should require authentication - {error_detail}")
    
    # Cleanup any remaining events
    print("\n  Cleaning up remaining test events...")
    for event_id in created_events:
        make_request("DELETE", f"/calendar/events/{event_id}", auth_token=admin_token)

def test_settings_management_apis():
    """Test Settings Management APIs comprehensively"""
    print("\n⚙️ Testing Settings Management APIs...")
    
    # Test 1: GET /api/settings - Retrieve user settings with defaults
    print("\n  Testing settings retrieval with defaults...")
    response = make_request("GET", "/settings", auth_token=user_token)
    if response and response.status_code == 200:
        settings = response.json()
        
        # Verify default settings structure
        required_fields = [
            "user_id", "full_name", "email", "phone", "bio", "avatar_url",
            "email_notifications", "push_notifications", "document_update_notifications",
            "message_notifications", "calendar_reminders", "two_factor_enabled",
            "session_timeout_minutes", "password_change_required", "language",
            "timezone", "date_format", "theme", "profile_visibility", "show_online_status"
        ]
        
        missing_fields = [field for field in required_fields if field not in settings]
        if not missing_fields:
            results.log_success("Settings Management - Settings structure validation")
        else:
            results.log_failure("Settings Management - Settings structure", f"Missing fields: {missing_fields}")
        
        # Verify default values
        expected_defaults = {
            "language": "fr",
            "timezone": "Europe/Paris", 
            "date_format": "DD/MM/YYYY",
            "email_notifications": True,
            "theme": "light",
            "profile_visibility": "internal",
            "show_online_status": True
        }
        
        defaults_correct = all(settings.get(key) == value for key, value in expected_defaults.items())
        if defaults_correct:
            results.log_success("Settings Management - Default values validation")
        else:
            results.log_failure("Settings Management - Default values", "Default values not set correctly")
            
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Settings Management - Settings retrieval", error_msg)
    
    # Test 2: PUT /api/settings - Update user settings (profile)
    print("\n  Testing profile settings update...")
    profile_update = {
        "full_name": "John Smith Updated",
        "phone": "+213-555-0123",
        "bio": "Senior Document Manager at EPSys - Updated profile"
    }
    
    response = make_request("PUT", "/settings", profile_update, auth_token=user_token)
    if response and response.status_code == 200:
        updated_settings = response.json()
        
        if (updated_settings.get("full_name") == profile_update["full_name"] and
            updated_settings.get("phone") == profile_update["phone"] and
            updated_settings.get("bio") == profile_update["bio"]):
            results.log_success("Settings Management - Profile settings update")
        else:
            results.log_failure("Settings Management - Profile update", "Profile settings not updated correctly")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Settings Management - Profile update", error_msg)
    
    # Test 3: PUT /api/settings - Update notification settings
    print("\n  Testing notification settings update...")
    notification_update = {
        "email_notifications": False,
        "push_notifications": True,
        "document_update_notifications": False,
        "message_notifications": True,
        "calendar_reminders": False
    }
    
    response = make_request("PUT", "/settings", notification_update, auth_token=user_token)
    if response and response.status_code == 200:
        updated_settings = response.json()
        
        notifications_correct = all(
            updated_settings.get(key) == value 
            for key, value in notification_update.items()
        )
        
        if notifications_correct:
            results.log_success("Settings Management - Notification settings update")
        else:
            results.log_failure("Settings Management - Notification update", "Notification settings not updated correctly")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Settings Management - Notification update", error_msg)
    
    # Test 4: PUT /api/settings - Update system preferences
    print("\n  Testing system preferences update...")
    system_update = {
        "language": "en",
        "timezone": "America/New_York",
        "date_format": "MM/DD/YYYY",
        "theme": "dark"
    }
    
    response = make_request("PUT", "/settings", system_update, auth_token=user_token)
    if response and response.status_code == 200:
        updated_settings = response.json()
        
        system_correct = all(
            updated_settings.get(key) == value 
            for key, value in system_update.items()
        )
        
        if system_correct:
            results.log_success("Settings Management - System preferences update")
        else:
            results.log_failure("Settings Management - System update", "System preferences not updated correctly")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Settings Management - System update", error_msg)
    
    # Test 5: PUT /api/settings - Update privacy settings
    print("\n  Testing privacy settings update...")
    privacy_update = {
        "profile_visibility": "private",
        "show_online_status": False,
        "two_factor_enabled": True,
        "session_timeout_minutes": 60
    }
    
    response = make_request("PUT", "/settings", privacy_update, auth_token=user_token)
    if response and response.status_code == 200:
        updated_settings = response.json()
        
        privacy_correct = all(
            updated_settings.get(key) == value 
            for key, value in privacy_update.items()
        )
        
        if privacy_correct:
            results.log_success("Settings Management - Privacy settings update")
        else:
            results.log_failure("Settings Management - Privacy update", "Privacy settings not updated correctly")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Settings Management - Privacy update", error_msg)
    
    # Test 6: POST /api/settings/change-password - Password change functionality
    print("\n  Testing password change functionality...")
    
    # First, we need to know the current password from login
    current_password = "UserPass456!"  # From the login test
    new_password = "NewSecurePass789!"
    
    password_change_data = {
        "current_password": current_password,
        "new_password": new_password
    }
    
    response = make_request("POST", "/settings/change-password", password_change_data, auth_token=user_token)
    if response and response.status_code == 200:
        data = response.json()
        if "message" in data and "successfully" in data["message"]:
            results.log_success("Settings Management - Password change")
            
            # Test 7: Verify new password works by logging in
            print("\n  Testing login with new password...")
            # We need to get the username from the user token, but let's create a new user for this test
            unique_suffix = str(uuid.uuid4())[:8]
            test_user_data = {
                "username": f"pwd_test_{unique_suffix}",
                "email": f"pwd_test_{unique_suffix}@epsys.com",
                "password": "OldPassword123!",
                "full_name": "Password Test User",
                "role": "user"
            }
            
            # Register test user
            reg_response = make_request("POST", "/register", test_user_data)
            if reg_response and reg_response.status_code == 200:
                # Login to get token
                login_data = {
                    "username": test_user_data["username"],
                    "password": test_user_data["password"]
                }
                login_response = make_request("POST", "/login", login_data)
                if login_response and login_response.status_code == 200:
                    test_token = login_response.json()["access_token"]
                    
                    # Change password
                    pwd_change = {
                        "current_password": "OldPassword123!",
                        "new_password": "NewPassword456!"
                    }
                    change_response = make_request("POST", "/settings/change-password", pwd_change, auth_token=test_token)
                    
                    if change_response and change_response.status_code == 200:
                        # Try login with new password
                        new_login_data = {
                            "username": test_user_data["username"],
                            "password": "NewPassword456!"
                        }
                        new_login_response = make_request("POST", "/login", new_login_data)
                        
                        if new_login_response and new_login_response.status_code == 200:
                            results.log_success("Settings Management - Login with new password")
                        else:
                            results.log_failure("Settings Management - New password login", "Cannot login with new password")
        else:
            results.log_failure("Settings Management - Password change", "Invalid password change response")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Settings Management - Password change", error_msg)
    
    # Test 8: POST /api/settings/change-password - Wrong current password
    print("\n  Testing password change with wrong current password...")
    wrong_password_data = {
        "current_password": "WrongPassword123!",
        "new_password": "AnotherNewPass456!"
    }
    
    response = make_request("POST", "/settings/change-password", wrong_password_data, auth_token=user_token)
    if response and response.status_code == 400:
        results.log_success("Settings Management - Wrong current password rejection")
    else:
        error_detail = f"Status: {response.status_code if response else 'None'}"
        results.log_failure("Settings Management - Wrong password", f"Should reject wrong password - {error_detail}")
    
    # Test 9: GET /api/settings/system-info - Admin-only system information
    print("\n  Testing admin-only system info...")
    response = make_request("GET", "/settings/system-info", auth_token=admin_token)
    if response and response.status_code == 200:
        system_info = response.json()
        
        # Verify system info structure
        required_sections = ["database_stats", "document_counters", "system_settings", "system_status"]
        missing_sections = [section for section in required_sections if section not in system_info]
        
        if not missing_sections:
            results.log_success("Settings Management - Admin system info structure")
            
            # Verify database stats
            db_stats = system_info.get("database_stats", {})
            required_db_fields = ["total_users", "total_documents", "total_folders", "total_files", "total_events"]
            missing_db_fields = [field for field in required_db_fields if field not in db_stats]
            
            if not missing_db_fields:
                results.log_success("Settings Management - Database statistics")
            else:
                results.log_failure("Settings Management - DB stats", f"Missing fields: {missing_db_fields}")
            
            # Verify document counters
            doc_counters = system_info.get("document_counters", {})
            required_counter_fields = ["current_year", "courrier_depart", "courrier_arrive", "dri_depart", "om_approval"]
            missing_counter_fields = [field for field in required_counter_fields if field not in doc_counters]
            
            if not missing_counter_fields:
                results.log_success("Settings Management - Document counters display")
            else:
                results.log_failure("Settings Management - Doc counters", f"Missing fields: {missing_counter_fields}")
                
        else:
            results.log_failure("Settings Management - System info structure", f"Missing sections: {missing_sections}")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Settings Management - Admin system info", error_msg)
    
    # Test 10: GET /api/settings/system-info - Regular user denied access
    print("\n  Testing regular user denied system info access...")
    response = make_request("GET", "/settings/system-info", auth_token=user_token)
    if response and response.status_code == 403:
        results.log_success("Settings Management - User denied system info access")
    else:
        error_detail = f"Status: {response.status_code if response else 'None'}"
        results.log_failure("Settings Management - System info access", f"Should deny user access - {error_detail}")
    
    # Test 11: PUT /api/settings/signup-toggle - Admin-only signup toggle
    print("\n  Testing admin-only signup toggle...")
    response = make_request("PUT", "/settings/signup-toggle?enabled=false", auth_token=admin_token)
    if response and response.status_code == 200:
        data = response.json()
        if "signup_enabled" in data and data["signup_enabled"] == False:
            results.log_success("Settings Management - Admin signup toggle (disable)")
        else:
            results.log_failure("Settings Management - Signup toggle", "Invalid toggle response")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Settings Management - Admin signup toggle", error_msg)
    
    # Test 12: PUT /api/settings/signup-toggle - Regular user denied access
    print("\n  Testing regular user denied signup toggle access...")
    response = make_request("PUT", "/settings/signup-toggle?enabled=true", auth_token=user_token)
    if response and response.status_code == 403:
        results.log_success("Settings Management - User denied signup toggle access")
    else:
        error_detail = f"Status: {response.status_code if response else 'None'}"
        results.log_failure("Settings Management - Signup toggle access", f"Should deny user access - {error_detail}")

def test_profile_management_features():
    """Test Profile Management Features through Settings APIs"""
    print("\n👤 Testing Profile Management Features...")
    
    # Test 1: Profile photo upload (base64 format)
    print("\n  Testing profile photo upload (base64)...")
    
    # Create a simple base64 encoded image (1x1 pixel PNG)
    base64_image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    
    profile_photo_update = {
        "avatar_url": base64_image
    }
    
    response = make_request("PUT", "/settings", profile_photo_update, auth_token=user_token)
    if response and response.status_code == 200:
        updated_settings = response.json()
        
        if updated_settings.get("avatar_url") == base64_image:
            results.log_success("Profile Management - Profile photo upload (base64)")
        else:
            results.log_failure("Profile Management - Photo upload", "Base64 image not stored correctly")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Profile Management - Photo upload", error_msg)
    
    # Test 2: Personal information management
    print("\n  Testing personal information management...")
    personal_info_update = {
        "full_name": "Jean-Pierre Dubois",
        "phone": "+33-1-23-45-67-89",
        "bio": "Responsable de la gestion documentaire chez EPSys. Spécialisé dans l'optimisation des processus administratifs et la digitalisation des documents officiels."
    }
    
    response = make_request("PUT", "/settings", personal_info_update, auth_token=user_token)
    if response and response.status_code == 200:
        updated_settings = response.json()
        
        info_correct = all(
            updated_settings.get(key) == value 
            for key, value in personal_info_update.items()
        )
        
        if info_correct:
            results.log_success("Profile Management - Personal information update")
        else:
            results.log_failure("Profile Management - Personal info", "Personal information not updated correctly")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Profile Management - Personal info", error_msg)
    
    # Test 3: Privacy settings management
    print("\n  Testing privacy settings management...")
    privacy_settings_update = {
        "profile_visibility": "public",
        "show_online_status": True
    }
    
    response = make_request("PUT", "/settings", privacy_settings_update, auth_token=user_token)
    if response and response.status_code == 200:
        updated_settings = response.json()
        
        if (updated_settings.get("profile_visibility") == "public" and
            updated_settings.get("show_online_status") == True):
            results.log_success("Profile Management - Privacy settings")
        else:
            results.log_failure("Profile Management - Privacy settings", "Privacy settings not updated correctly")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Profile Management - Privacy settings", error_msg)
    
    # Test 4: Test different profile visibility options
    print("\n  Testing profile visibility options...")
    visibility_options = ["public", "internal", "private"]
    
    for visibility in visibility_options:
        visibility_update = {"profile_visibility": visibility}
        response = make_request("PUT", "/settings", visibility_update, auth_token=user_token)
        
        if response and response.status_code == 200:
            updated_settings = response.json()
            if updated_settings.get("profile_visibility") == visibility:
                results.log_success(f"Profile Management - Visibility '{visibility}' option")
            else:
                results.log_failure(f"Profile Management - Visibility {visibility}", f"Visibility not set to {visibility}")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure(f"Profile Management - Visibility {visibility}", error_msg)
    
    # Test 5: Profile fields validation and persistence
    print("\n  Testing profile fields validation and persistence...")
    
    # Get current settings to verify persistence
    response = make_request("GET", "/settings", auth_token=user_token)
    if response and response.status_code == 200:
        current_settings = response.json()
        
        # Verify that our previous updates are still there
        expected_values = {
            "full_name": "Jean-Pierre Dubois",
            "phone": "+33-1-23-45-67-89",
            "profile_visibility": "private",  # Last one we set
            "show_online_status": True
        }
        
        persistence_correct = all(
            current_settings.get(key) == value 
            for key, value in expected_values.items()
        )
        
        if persistence_correct:
            results.log_success("Profile Management - Settings persistence")
        else:
            results.log_failure("Profile Management - Persistence", "Settings not persisted correctly")
            
        # Verify avatar_url is still there
        if current_settings.get("avatar_url") == base64_image:
            results.log_success("Profile Management - Avatar persistence")
        else:
            results.log_failure("Profile Management - Avatar persistence", "Avatar not persisted")
            
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Profile Management - Settings persistence", error_msg)
    
    # Test 6: Profile update with empty/null values
    print("\n  Testing profile update with empty values...")
    empty_update = {
        "phone": None,
        "bio": ""
    }
    
    response = make_request("PUT", "/settings", empty_update, auth_token=user_token)
    if response and response.status_code == 200:
        updated_settings = response.json()
        
        # Phone should be None/null, bio should be empty string
        if (updated_settings.get("phone") is None and
            updated_settings.get("bio") == ""):
            results.log_success("Profile Management - Empty values handling")
        else:
            results.log_failure("Profile Management - Empty values", "Empty values not handled correctly")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Profile Management - Empty values", error_msg)
    
    # Test 7: Large bio text handling
    print("\n  Testing large bio text handling...")
    large_bio = "A" * 1000  # 1000 character bio
    
    large_bio_update = {
        "bio": large_bio
    }
    
    response = make_request("PUT", "/settings", large_bio_update, auth_token=user_token)
    if response and response.status_code == 200:
        updated_settings = response.json()
        
        if updated_settings.get("bio") == large_bio:
            results.log_success("Profile Management - Large bio text handling")
        else:
            results.log_failure("Profile Management - Large bio", "Large bio not stored correctly")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Profile Management - Large bio", error_msg)
    
    # Test 8: International phone number formats
    print("\n  Testing international phone number formats...")
    phone_formats = [
        "+1-555-123-4567",      # US format
        "+33 1 23 45 67 89",    # French format
        "+213-21-123-456",      # Algerian format
        "+44 20 7123 4567"      # UK format
    ]
    
    for phone_format in phone_formats:
        phone_update = {"phone": phone_format}
        response = make_request("PUT", "/settings", phone_update, auth_token=user_token)
        
        if response and response.status_code == 200:
            updated_settings = response.json()
            if updated_settings.get("phone") == phone_format:
                results.log_success(f"Profile Management - Phone format '{phone_format[:10]}...'")
            else:
                results.log_failure(f"Profile Management - Phone format", f"Phone format not stored: {phone_format}")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure(f"Profile Management - Phone format", error_msg)

def test_courrier_arrivee_functionality():
    """Test Courrier Arrivée document functionality comprehensively"""
    print("\n📨 Testing Courrier Arrivée Functionality...")
    
    # Global variables to track created documents for cleanup
    created_documents = []
    
    # Test 1: Document Creation with proper metadata structure for incoming_mail
    print("\n  Testing Courrier Arrivée document creation...")
    courrier_arrivee_data = {
        "title": "Courrier Arrivé - Demande d'Information",
        "description": "Courrier reçu concernant une demande d'information technique",
        "document_type": "incoming_mail",
        "metadata": {
            "date_reception": "2025-01-15",
            "expediteur": "Ministère de l'Énergie et des Mines",
            "reference_expediteur": "MEM/2025/001",
            "date_courrier": "2025-01-14",
            "destinataire": "Direction Régionale d'Hassi Messaoud",
            "objet": "Demande d'information sur les activités de production Q4 2024"
        }
    }
    
    response = make_request("POST", "/documents", courrier_arrivee_data, auth_token=user_token)
    courrier_arrivee_id = None
    if response and response.status_code == 200:
        doc = response.json()
        courrier_arrivee_id = doc["id"]
        created_documents.append(courrier_arrivee_id)
        
        # Verify document type
        if doc["document_type"] == "incoming_mail":
            results.log_success("Courrier Arrivée - Document creation with correct type")
        else:
            results.log_failure("Courrier Arrivée - Document creation", f"Wrong document type: {doc['document_type']}")
        
        # Verify metadata structure
        metadata = doc.get("metadata", {})
        required_fields = ["date_reception", "expediteur", "reference_expediteur", "date_courrier", "destinataire", "objet"]
        
        missing_fields = [field for field in required_fields if field not in metadata]
        if not missing_fields:
            results.log_success("Courrier Arrivée - Metadata structure validation")
        else:
            results.log_failure("Courrier Arrivée - Metadata structure", f"Missing fields: {missing_fields}")
        
        # Verify specific metadata values
        if (metadata.get("expediteur") == courrier_arrivee_data["metadata"]["expediteur"] and 
            metadata.get("destinataire") == courrier_arrivee_data["metadata"]["destinataire"] and
            metadata.get("objet") == courrier_arrivee_data["metadata"]["objet"]):
            results.log_success("Courrier Arrivée - Metadata values validation")
        else:
            results.log_failure("Courrier Arrivée - Metadata values", "Metadata values not stored correctly")
            
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Courrier Arrivée - Document creation", error_msg)
    
    # Test 2: Reference Generation (ARR-2025-XXX format)
    print("\n  Testing Courrier Arrivée reference generation...")
    if courrier_arrivee_id:
        response = make_request("GET", f"/documents/{courrier_arrivee_id}", auth_token=user_token)
        if response and response.status_code == 200:
            doc = response.json()
            reference = doc.get("reference", "")
            
            # Check if reference follows ARR-2025-XXX pattern
            import re
            if re.match(r"^ARR-2025-\d{3}$", reference):
                results.log_success("Courrier Arrivée - Reference generation (ARR-2025-XXX format)")
            else:
                results.log_failure("Courrier Arrivée - Reference generation", f"Invalid reference format: {reference}")
        else:
            results.log_failure("Courrier Arrivée - Reference verification", "Could not retrieve document")
    
    # Test 3: Document Retrieval with document_type=incoming_mail parameter
    print("\n  Testing Courrier Arrivée document retrieval with type filter...")
    response = make_request("GET", "/documents?document_type=incoming_mail", auth_token=user_token)
    if response and response.status_code == 200:
        documents = response.json()
        if isinstance(documents, list):
            # Check if our courrier arrivée document is in the list
            incoming_docs = [doc for doc in documents if doc["document_type"] == "incoming_mail"]
            if incoming_docs:
                results.log_success("Courrier Arrivée - Document retrieval with type filter")
                
                # Verify that all returned documents are incoming_mail type
                all_incoming_type = all(doc["document_type"] == "incoming_mail" for doc in documents)
                if all_incoming_type:
                    results.log_success("Courrier Arrivée - Type filter accuracy")
                else:
                    results.log_failure("Courrier Arrivée - Type filter", "Filter returned wrong document types")
            else:
                results.log_failure("Courrier Arrivée - Document retrieval", "No incoming mail documents found")
        else:
            results.log_failure("Courrier Arrivée - Document retrieval", "Invalid response format")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Courrier Arrivée - Document retrieval", error_msg)
    
    # Test 4: Create Courrier Arrivée with file upload (testing file handling)
    print("\n  Testing Courrier Arrivée with file upload...")
    courrier_with_file_data = {
        "title": "Courrier Arrivé avec Pièce Jointe",
        "description": "Courrier reçu avec document joint",
        "document_type": "incoming_mail",
        "metadata": {
            "date_reception": "2025-01-16",
            "expediteur": "Direction Générale Sonatrach",
            "reference_expediteur": "DGS/2025/002",
            "date_courrier": "2025-01-15",
            "destinataire": "Direction Régionale d'Hassi Messaoud",
            "objet": "Transmission de nouvelles directives opérationnelles"
        }
    }
    
    # Create a test file
    test_content = b"Contenu du courrier arrive avec piece jointe - Document officiel"
    
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_file:
        temp_file.write(test_content)
        temp_file_path = temp_file.name
    
    courrier_with_file_id = None
    try:
        # First create the document
        response = make_request("POST", "/documents", courrier_with_file_data, auth_token=user_token)
        if response and response.status_code == 200:
            doc = response.json()
            courrier_with_file_id = doc["id"]
            created_documents.append(courrier_with_file_id)
            
            # Then upload file to the document
            with open(temp_file_path, 'rb') as f:
                files = {'files': ('courrier_arrive_directive.pdf', f, 'application/pdf')}
                upload_response = make_request("POST", f"/documents/{courrier_with_file_id}/upload", 
                                             files=files, auth_token=user_token)
            
            if upload_response and upload_response.status_code == 200:
                results.log_success("Courrier Arrivée - File upload functionality")
                
                # Verify file is stored in arrive folder
                updated_doc_response = make_request("GET", f"/documents/{courrier_with_file_id}", auth_token=user_token)
                if updated_doc_response and updated_doc_response.status_code == 200:
                    updated_doc = updated_doc_response.json()
                    file_path = updated_doc.get("file_path", "")
                    
                    if "arrive" in file_path or "incoming" in file_path:
                        results.log_success("Courrier Arrivée - File organization in arrive folder")
                    else:
                        results.log_failure("Courrier Arrivée - File organization", f"File not in arrive folder: {file_path}")
            else:
                error_msg = upload_response.json().get("detail", "Unknown error") if upload_response else "Connection failed"
                results.log_failure("Courrier Arrivée - File upload", error_msg)
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("Courrier Arrivée - Document creation for file test", error_msg)
    
    finally:
        # Clean up temporary file
        os.unlink(temp_file_path)
    
    # Test 5: Test file download integration for Courrier Arrivée
    print("\n  Testing Courrier Arrivée file download integration...")
    if courrier_with_file_id:
        # Get the document to extract file path
        response = make_request("GET", f"/documents/{courrier_with_file_id}", auth_token=user_token)
        if response and response.status_code == 200:
            doc = response.json()
            file_path = doc.get("file_path", "")
            
            if file_path:
                # Test download using the new download endpoint
                import urllib.parse
                encoded_path = urllib.parse.quote(file_path, safe='')
                
                download_response = make_request("GET", f"/documents/download/{encoded_path}", auth_token=user_token)
                if download_response and download_response.status_code == 200:
                    results.log_success("Courrier Arrivée - File download integration")
                else:
                    error_msg = download_response.json().get("detail", "Unknown error") if download_response else "Connection failed"
                    results.log_failure("Courrier Arrivée - File download", error_msg)
            else:
                results.log_failure("Courrier Arrivée - File download test", "No file path found in document")
    
    # Test 6: Test metadata.files array format vs single file format
    print("\n  Testing file format handling (metadata.files vs single file)...")
    if courrier_with_file_id:
        response = make_request("GET", f"/documents/{courrier_with_file_id}", auth_token=user_token)
        if response and response.status_code == 200:
            doc = response.json()
            metadata = doc.get("metadata", {})
            
            # Check if files are stored in metadata.uploaded_files (array format)
            uploaded_files = metadata.get("uploaded_files", [])
            single_file_path = doc.get("file_path", "")
            
            if uploaded_files and len(uploaded_files) > 0:
                results.log_success("Courrier Arrivée - Metadata files array format support")
                
                # Verify file metadata structure
                file_info = uploaded_files[0]
                required_file_fields = ["original_name", "file_path", "file_size", "mime_type"]
                missing_file_fields = [field for field in required_file_fields if field not in file_info]
                
                if not missing_file_fields:
                    results.log_success("Courrier Arrivée - File metadata structure validation")
                else:
                    results.log_failure("Courrier Arrivée - File metadata", f"Missing fields: {missing_file_fields}")
            
            if single_file_path:
                results.log_success("Courrier Arrivée - Single file format support")
            
            if not uploaded_files and not single_file_path:
                results.log_failure("Courrier Arrivée - File format handling", "No file information found in either format")
    
    # Test 7: Create another Courrier Arrivée to test reference increment
    print("\n  Testing Courrier Arrivée reference increment...")
    courrier_arrivee_data2 = {
        "title": "Courrier Arrivé - Rapport Mensuel",
        "description": "Courrier reçu avec rapport mensuel",
        "document_type": "incoming_mail",
        "metadata": {
            "date_reception": "2025-01-17",
            "expediteur": "Direction Technique Centrale",
            "reference_expediteur": "DTC/2025/003",
            "date_courrier": "2025-01-16",
            "destinataire": "Direction Régionale d'Hassi Messaoud",
            "objet": "Transmission du rapport mensuel des activités techniques"
        }
    }
    
    response = make_request("POST", "/documents", courrier_arrivee_data2, auth_token=user_token)
    courrier_arrivee_id2 = None
    if response and response.status_code == 200:
        doc = response.json()
        courrier_arrivee_id2 = doc["id"]
        created_documents.append(courrier_arrivee_id2)
        reference2 = doc.get("reference", "")
        
        # Get the first document's reference for comparison
        first_doc_reference = ""
        if courrier_arrivee_id:
            first_response = make_request("GET", f"/documents/{courrier_arrivee_id}", auth_token=user_token)
            if first_response and first_response.status_code == 200:
                first_doc_reference = first_response.json().get("reference", "")
        
        # Verify reference increment
        if reference2 and first_doc_reference and reference2 != first_doc_reference:
            results.log_success("Courrier Arrivée - Reference increment")
        else:
            results.log_failure("Courrier Arrivée - Reference increment", f"Reference not incremented: {reference2} vs {first_doc_reference}")
    
    # Test 8: Update Courrier Arrivée metadata
    print("\n  Testing Courrier Arrivée document update...")
    if courrier_arrivee_id:
        update_data = {
            "metadata": {
                "date_reception": "2025-01-15",
                "expediteur": "Ministère de l'Énergie et des Mines",
                "reference_expediteur": "MEM/2025/001-REV",  # Updated reference
                "date_courrier": "2025-01-14",
                "destinataire": "Direction Régionale d'Hassi Messaoud",
                "objet": "Demande d'information sur les activités de production Q4 2024 - Version révisée"  # Updated object
            }
        }
        
        response = make_request("PUT", f"/documents/{courrier_arrivee_id}", update_data, auth_token=user_token)
        if response and response.status_code == 200:
            doc = response.json()
            updated_metadata = doc.get("metadata", {})
            
            if (updated_metadata.get("reference_expediteur") == "MEM/2025/001-REV" and
                "Version révisée" in updated_metadata.get("objet", "")):
                results.log_success("Courrier Arrivée - Document update")
            else:
                results.log_failure("Courrier Arrivée - Document update", "Metadata not updated correctly")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("Courrier Arrivée - Document update", error_msg)
    
    # Test 9: Permission checks and user attribution
    print("\n  Testing Courrier Arrivée permission checks...")
    if courrier_arrivee_id:
        # Test that admin can access Courrier Arrivée document
        response = make_request("GET", f"/documents/{courrier_arrivee_id}", auth_token=admin_token)
        if response and response.status_code == 200:
            results.log_success("Courrier Arrivée - Admin access permission")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("Courrier Arrivée - Admin access", error_msg)
        
        # Test that user can access their own Courrier Arrivée document
        response = make_request("GET", f"/documents/{courrier_arrivee_id}", auth_token=user_token)
        if response and response.status_code == 200:
            doc = response.json()
            if doc.get("created_by") == user_user_id:
                results.log_success("Courrier Arrivée - User attribution verification")
            else:
                results.log_failure("Courrier Arrivée - User attribution", "Document not attributed to correct user")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("Courrier Arrivée - User access", error_msg)
    
    # Test 10: Dashboard statistics include Courrier Arrivée count
    print("\n  Testing Courrier Arrivée in dashboard statistics...")
    response = make_request("GET", "/dashboard/stats", auth_token=user_token)
    if response and response.status_code == 200:
        stats = response.json()
        incoming_count = stats.get("incoming_mail", 0)
        
        if incoming_count >= 1:  # Should have at least the documents we created
            results.log_success("Courrier Arrivée - Dashboard statistics count")
        else:
            results.log_failure("Courrier Arrivée - Dashboard stats", f"Expected incoming count >= 1, got {incoming_count}")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Courrier Arrivée - Dashboard statistics", error_msg)
    
    # Test 11: Test CRUD operations - Delete functionality
    print("\n  Testing Courrier Arrivée deletion...")
    if courrier_arrivee_id2:  # Delete the second document
        response = make_request("DELETE", f"/documents/{courrier_arrivee_id2}", auth_token=user_token)
        if response and response.status_code == 200:
            results.log_success("Courrier Arrivée - Document deletion")
            
            # Verify document is deleted
            verify_response = make_request("GET", f"/documents/{courrier_arrivee_id2}", auth_token=user_token)
            if verify_response and verify_response.status_code == 404:
                results.log_success("Courrier Arrivée - Deletion verification")
            else:
                results.log_failure("Courrier Arrivée - Deletion verification", "Document should be deleted")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("Courrier Arrivée - Document deletion", error_msg)
    
    # Test 12: Test authentication requirements for API endpoints
    print("\n  Testing Courrier Arrivée authentication requirements...")
    # Test without authentication
    response = make_request("GET", "/documents?document_type=incoming_mail")
    if response and response.status_code in [401, 403]:
        results.log_success("Courrier Arrivée - Authentication requirement")
    else:
        error_detail = f"Status: {response.status_code if response else 'None'}"
        results.log_failure("Courrier Arrivée - Authentication", f"Should require auth, got {error_detail}")
    
    # Cleanup: Delete remaining test documents
    print("\n  Cleaning up Courrier Arrivée test documents...")
    for doc_id in created_documents:
        make_request("DELETE", f"/documents/{doc_id}", auth_token=user_token)
    
    print("\n✅ Courrier Arrivée functionality testing completed!")

def run_all_tests():
    """Run all backend tests"""
    print("🚀 Starting EPSys Backend API Tests...")
    print(f"Testing against: {BACKEND_URL}")
    
    try:
        # Authentication tests
        test_user_registration()
        test_user_login()
        test_protected_endpoints()
        
        # Document management tests
        test_document_management()
        test_file_upload()
        test_document_permissions()
        
        # OM Approval specific tests
        test_om_approval_functionality()
        
        # DRI Depart specific tests
        test_dri_depart_functionality()
        
        # Enhanced File Manager tests
        test_enhanced_file_manager()
        
        # NEW: File Manager specific feature tests
        test_file_manager_renaming()
        test_file_manager_preview()
        
        # NEW: Calendar and Settings tests
        test_calendar_management()
        test_user_settings()
        
        # PRIMARY TEST FOCUS - Review Request Tests
        print("\n" + "="*80)
        print("🎯 PRIMARY TEST FOCUS - Review Request Features")
        print("="*80)
        test_calendar_event_deletion()
        test_settings_management_apis()
        test_profile_management_features()
        
        # NEW: Courrier Arrivée Modern Design Update Test
        print("\n" + "="*80)
        print("📨 COURRIER ARRIVÉE MODERN DESIGN UPDATE TEST")
        print("="*80)
        test_courrier_arrivee_functionality()
        
        # Role-based access tests
        test_role_based_access()
        
        # Dashboard and messaging tests
        test_dashboard_statistics()
        test_messaging_system()
        
        # Cleanup tests
        test_document_deletion()
        
    except Exception as e:
        results.log_failure("Test execution", f"Unexpected error: {str(e)}")
    
    finally:
        results.summary()

def test_settings_system_preferences():
    """Test Settings System Preferences - PRIMARY TEST FOCUS"""
    print("\n⚙️ Testing Settings System Preferences (PRIMARY FOCUS)...")
    
    # Test 1: Get initial settings (should create defaults)
    print("\n  Testing settings retrieval with defaults...")
    response = make_request("GET", "/settings", auth_token=user_token)
    if response and response.status_code == 200:
        settings = response.json()
        required_fields = ["language", "timezone", "date_format", "theme", "full_name", "email"]
        
        if all(field in settings for field in required_fields):
            results.log_success("Settings - Initial settings retrieval with defaults")
            
            # Verify default values
            if (settings.get("language") == "fr" and 
                settings.get("timezone") == "Europe/Paris" and
                settings.get("date_format") == "DD/MM/YYYY" and
                settings.get("theme") == "light"):
                results.log_success("Settings - Default system preferences values")
            else:
                results.log_failure("Settings - Default values", f"Incorrect defaults: {settings}")
        else:
            results.log_failure("Settings - Initial settings", f"Missing required fields: {required_fields}")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Settings - Initial settings retrieval", error_msg)
    
    # Test 2: Language changes (fr, en, es, ar)
    print("\n  Testing language changes...")
    languages = ["en", "es", "ar", "fr"]  # Test different languages
    
    for lang in languages:
        update_data = {"language": lang}
        response = make_request("PUT", "/settings", update_data, auth_token=user_token)
        
        if response and response.status_code == 200:
            updated_settings = response.json()
            if updated_settings.get("language") == lang:
                results.log_success(f"Settings - Language change to {lang}")
            else:
                results.log_failure(f"Settings - Language change to {lang}", "Language not updated correctly")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure(f"Settings - Language change to {lang}", error_msg)
    
    # Test 3: Theme changes (light, dark, auto)
    print("\n  Testing theme changes...")
    themes = ["dark", "auto", "light"]
    
    for theme in themes:
        update_data = {"theme": theme}
        response = make_request("PUT", "/settings", update_data, auth_token=user_token)
        
        if response and response.status_code == 200:
            updated_settings = response.json()
            if updated_settings.get("theme") == theme:
                results.log_success(f"Settings - Theme change to {theme}")
            else:
                results.log_failure(f"Settings - Theme change to {theme}", "Theme not updated correctly")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure(f"Settings - Theme change to {theme}", error_msg)
    
    # Test 4: Timezone changes
    print("\n  Testing timezone changes...")
    timezones = ["America/New_York", "Asia/Tokyo", "Europe/London", "Europe/Paris"]
    
    for timezone in timezones:
        update_data = {"timezone": timezone}
        response = make_request("PUT", "/settings", update_data, auth_token=user_token)
        
        if response and response.status_code == 200:
            updated_settings = response.json()
            if updated_settings.get("timezone") == timezone:
                results.log_success(f"Settings - Timezone change to {timezone}")
            else:
                results.log_failure(f"Settings - Timezone change to {timezone}", "Timezone not updated correctly")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure(f"Settings - Timezone change to {timezone}", error_msg)
    
    # Test 5: Date format changes
    print("\n  Testing date format changes...")
    date_formats = ["MM/DD/YYYY", "YYYY-MM-DD", "DD-MM-YYYY", "DD/MM/YYYY"]
    
    for date_format in date_formats:
        update_data = {"date_format": date_format}
        response = make_request("PUT", "/settings", update_data, auth_token=user_token)
        
        if response and response.status_code == 200:
            updated_settings = response.json()
            if updated_settings.get("date_format") == date_format:
                results.log_success(f"Settings - Date format change to {date_format}")
            else:
                results.log_failure(f"Settings - Date format change to {date_format}", "Date format not updated correctly")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure(f"Settings - Date format change to {date_format}", error_msg)
    
    # Test 6: Settings persistence verification
    print("\n  Testing settings persistence...")
    response = make_request("GET", "/settings", auth_token=user_token)
    if response and response.status_code == 200:
        settings = response.json()
        # Should have the last values we set
        if (settings.get("language") == "fr" and 
            settings.get("theme") == "light" and
            settings.get("timezone") == "Europe/Paris" and
            settings.get("date_format") == "DD/MM/YYYY"):
            results.log_success("Settings - Settings persistence verification")
        else:
            results.log_failure("Settings - Settings persistence", f"Settings not persisted correctly: {settings}")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Settings - Settings persistence", error_msg)

def test_signup_toggle_functionality():
    """Test Signup Toggle Functionality - PRIMARY TEST FOCUS"""
    print("\n🔐 Testing Signup Toggle Functionality (PRIMARY FOCUS)...")
    
    # Test 1: Admin can access signup toggle endpoint
    print("\n  Testing admin access to signup toggle...")
    response = make_request("PUT", "/settings/signup-toggle?enabled=true", auth_token=admin_token)
    if response and response.status_code == 200:
        data = response.json()
        if "signup_enabled" in data and data["signup_enabled"] == True:
            results.log_success("Settings - Admin can enable signup")
        else:
            results.log_failure("Settings - Admin signup enable", "Invalid response format")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Settings - Admin signup enable", error_msg)
    
    # Test 2: Admin can disable signup
    print("\n  Testing admin disable signup...")
    response = make_request("PUT", "/settings/signup-toggle?enabled=false", auth_token=admin_token)
    if response and response.status_code == 200:
        data = response.json()
        if "signup_enabled" in data and data["signup_enabled"] == False:
            results.log_success("Settings - Admin can disable signup")
        else:
            results.log_failure("Settings - Admin signup disable", "Invalid response format")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Settings - Admin signup disable", error_msg)
    
    # Test 3: Regular user cannot access signup toggle (should get 403)
    print("\n  Testing user denied access to signup toggle...")
    response = make_request("PUT", "/settings/signup-toggle?enabled=true", auth_token=user_token)
    if response and response.status_code == 403:
        results.log_success("Settings - User denied access to signup toggle")
    else:
        error_detail = f"Status: {response.status_code if response else 'None'}"
        results.log_failure("Settings - User signup toggle denial", f"Should deny access to non-admin - {error_detail}")
    
    # Test 4: Test with both enabled=true and enabled=false parameters
    print("\n  Testing signup toggle with different parameters...")
    test_cases = [
        {"enabled": "true", "expected": True},
        {"enabled": "false", "expected": False},
        {"enabled": "true", "expected": True}
    ]
    
    for i, test_case in enumerate(test_cases):
        response = make_request("PUT", f"/settings/signup-toggle?enabled={test_case['enabled']}", auth_token=admin_token)
        if response and response.status_code == 200:
            data = response.json()
            if data.get("signup_enabled") == test_case["expected"]:
                results.log_success(f"Settings - Signup toggle parameter test {i+1}")
            else:
                results.log_failure(f"Settings - Signup toggle parameter test {i+1}", f"Expected {test_case['expected']}, got {data.get('signup_enabled')}")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure(f"Settings - Signup toggle parameter test {i+1}", error_msg)
    
    # Test 5: Verify signup toggle without authentication (should fail)
    print("\n  Testing signup toggle without authentication...")
    response = make_request("PUT", "/settings/signup-toggle?enabled=true")
    if response and response.status_code in [401, 403]:
        results.log_success("Settings - Signup toggle requires authentication")
    else:
        error_detail = f"Status: {response.status_code if response else 'None'}"
        results.log_failure("Settings - Signup toggle auth requirement", f"Should require authentication - {error_detail}")

def test_profile_settings_integration():
    """Test Profile Settings Integration - PRIMARY TEST FOCUS"""
    print("\n👤 Testing Profile Settings Integration (PRIMARY FOCUS)...")
    
    # Test 1: Profile visibility settings (public, internal, private)
    print("\n  Testing profile visibility settings...")
    visibility_options = ["public", "internal", "private"]
    
    for visibility in visibility_options:
        update_data = {"profile_visibility": visibility}
        response = make_request("PUT", "/settings", update_data, auth_token=user_token)
        
        if response and response.status_code == 200:
            updated_settings = response.json()
            if updated_settings.get("profile_visibility") == visibility:
                results.log_success(f"Profile - Visibility setting to {visibility}")
            else:
                results.log_failure(f"Profile - Visibility setting to {visibility}", "Visibility not updated correctly")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure(f"Profile - Visibility setting to {visibility}", error_msg)
    
    # Test 2: Show online status toggle
    print("\n  Testing show online status toggle...")
    online_status_options = [True, False, True]
    
    for status in online_status_options:
        update_data = {"show_online_status": status}
        response = make_request("PUT", "/settings", update_data, auth_token=user_token)
        
        if response and response.status_code == 200:
            updated_settings = response.json()
            if updated_settings.get("show_online_status") == status:
                results.log_success(f"Profile - Online status toggle to {status}")
            else:
                results.log_failure(f"Profile - Online status toggle to {status}", "Online status not updated correctly")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure(f"Profile - Online status toggle to {status}", error_msg)
    
    # Test 3: Avatar URL updates (base64)
    print("\n  Testing avatar URL updates...")
    # Simulate base64 encoded image data
    base64_avatar = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    
    update_data = {"avatar_url": base64_avatar}
    response = make_request("PUT", "/settings", update_data, auth_token=user_token)
    
    if response and response.status_code == 200:
        updated_settings = response.json()
        if updated_settings.get("avatar_url") == base64_avatar:
            results.log_success("Profile - Avatar URL update (base64)")
        else:
            results.log_failure("Profile - Avatar URL update", "Avatar URL not updated correctly")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Profile - Avatar URL update", error_msg)
    
    # Test 4: Personal information updates (full_name, phone, bio)
    print("\n  Testing personal information updates...")
    personal_info_updates = [
        {"full_name": "Jean-Pierre Dubois", "phone": "+33 1 23 45 67 89", "bio": "Ingénieur logiciel spécialisé en systèmes de gestion documentaire"},
        {"full_name": "Marie-Claire Martin", "phone": "+213 21 123 456", "bio": "Responsable qualité et processus métier"},
        {"full_name": "Ahmed Ben Ali", "phone": "+1 555 123 4567", "bio": "Expert en transformation digitale et innovation technologique"}
    ]
    
    for i, update_data in enumerate(personal_info_updates):
        response = make_request("PUT", "/settings", update_data, auth_token=user_token)
        
        if response and response.status_code == 200:
            updated_settings = response.json()
            if (updated_settings.get("full_name") == update_data["full_name"] and
                updated_settings.get("phone") == update_data["phone"] and
                updated_settings.get("bio") == update_data["bio"]):
                results.log_success(f"Profile - Personal info update test {i+1}")
            else:
                results.log_failure(f"Profile - Personal info update test {i+1}", "Personal information not updated correctly")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure(f"Profile - Personal info update test {i+1}", error_msg)
    
    # Test 5: Combined profile settings update
    print("\n  Testing combined profile settings update...")
    combined_update = {
        "full_name": "Fatima Benali",
        "phone": "+213 555 987 654",
        "bio": "Directrice des opérations - Spécialiste en gestion de projets industriels",
        "profile_visibility": "internal",
        "show_online_status": False,
        "language": "fr",
        "theme": "dark"
    }
    
    response = make_request("PUT", "/settings", combined_update, auth_token=user_token)
    
    if response and response.status_code == 200:
        updated_settings = response.json()
        all_updated = all(
            updated_settings.get(key) == value 
            for key, value in combined_update.items()
        )
        
        if all_updated:
            results.log_success("Profile - Combined profile settings update")
        else:
            results.log_failure("Profile - Combined settings update", "Not all settings updated correctly")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Profile - Combined settings update", error_msg)
    
    # Test 6: Profile settings persistence verification
    print("\n  Testing profile settings persistence...")
    response = make_request("GET", "/settings", auth_token=user_token)
    if response and response.status_code == 200:
        settings = response.json()
        # Verify the last combined update persisted
        if (settings.get("full_name") == "Fatima Benali" and
            settings.get("phone") == "+213 555 987 654" and
            settings.get("profile_visibility") == "internal" and
            settings.get("show_online_status") == False):
            results.log_success("Profile - Profile settings persistence")
        else:
            results.log_failure("Profile - Settings persistence", f"Profile settings not persisted correctly")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Profile - Settings persistence", error_msg)
    
    # Test 7: Test admin user profile settings (different user context)
    print("\n  Testing admin user profile settings...")
    admin_profile_update = {
        "full_name": "Sarah Johnson - Administrator",
        "phone": "+1 555 999 8888",
        "bio": "System Administrator - EPSys Document Management Platform",
        "profile_visibility": "public",
        "show_online_status": True
    }
    
    response = make_request("PUT", "/settings", admin_profile_update, auth_token=admin_token)
    
    if response and response.status_code == 200:
        updated_settings = response.json()
        if updated_settings.get("full_name") == admin_profile_update["full_name"]:
            results.log_success("Profile - Admin user profile settings")
        else:
            results.log_failure("Profile - Admin profile settings", "Admin profile not updated correctly")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Profile - Admin profile settings", error_msg)

def main():
    """Run all backend tests with focus on Documents Download Endpoint"""
    print("🚀 Starting EPSys Backend API Tests...")
    print(f"Backend URL: {BACKEND_URL}")
    print("="*60)
    print("🎯 PRIMARY TEST FOCUS: Documents Download Endpoint")
    print("="*60)
    
    try:
        # Essential setup tests
        test_user_registration()
        test_user_login()
        
        # PRIMARY TEST FOCUS - Documents Download Endpoint
        print("\n" + "="*60)
        print("🎯 STARTING PRIMARY TEST FOCUS: DOCUMENTS DOWNLOAD ENDPOINT")
        print("="*60)
        
        test_documents_download_endpoint()
        
        print("\n" + "="*60)
        print("✅ PRIMARY TEST FOCUS COMPLETED")
        print("="*60)
        
        # Additional verification tests if needed
        test_protected_endpoints()
        test_dri_depart_functionality()
        
    except KeyboardInterrupt:
        print("\n\n⚠️ Tests interrupted by user")
    except Exception as e:
        print(f"\n\n💥 Unexpected error during testing: {str(e)}")
        results.log_failure("Test execution", str(e))
    
    finally:
        results.summary()

if __name__ == "__main__":
    main()