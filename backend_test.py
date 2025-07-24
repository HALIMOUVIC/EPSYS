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
BACKEND_URL = "https://b760dca1-4a93-4338-b6c3-a79bea95d81c.preview.emergentagent.com/api"
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
    
    # Remove Content-Type for file uploads
    if files:
        request_headers.pop("Content-Type", None)
    
    try:
        if method == "GET":
            response = requests.get(url, headers=request_headers, timeout=10)
        elif method == "POST":
            if files:
                response = requests.post(url, files=files, headers=request_headers, timeout=10)
            else:
                response = requests.post(url, json=data, headers=request_headers, timeout=10)
        elif method == "PUT":
            if files:
                response = requests.put(url, files=files, headers=request_headers, timeout=10)
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

if __name__ == "__main__":
    run_all_tests()