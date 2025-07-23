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
BACKEND_URL = "https://faba3a7b-cbaf-425e-aeb8-d9697447983f.preview.emergentagent.com/api"
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
            response = requests.get(url, headers=request_headers)
        elif method == "POST":
            if files:
                response = requests.post(url, files=files, headers=request_headers)
            else:
                response = requests.post(url, json=data, headers=request_headers)
        elif method == "PUT":
            response = requests.put(url, json=data, headers=request_headers)
        elif method == "DELETE":
            response = requests.delete(url, headers=request_headers)
        else:
            raise ValueError(f"Unsupported method: {method}")
            
        return response
    except requests.exceptions.RequestException as e:
        return None

def test_user_registration():
    """Test user registration functionality"""
    print("\n🔧 Testing User Registration...")
    
    # Test admin user registration
    admin_data = {
        "username": "sarah_admin",
        "email": "sarah.admin@epsys.com",
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
        "username": "john_clerk",
        "email": "john.clerk@epsys.com", 
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
    else:
        error_detail = f"Status: {response.status_code if response else 'None'}, Response: {response.json() if response else 'None'}"
        results.log_failure("Duplicate username rejection", f"Should have rejected duplicate username - {error_detail}")

def test_user_login():
    """Test user login and JWT token generation"""
    print("\n🔐 Testing User Login...")
    
    # Test admin login
    admin_login = {
        "username": "sarah_admin",
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
    user_login = {
        "username": "john_clerk",
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
    invalid_login = {
        "username": "sarah_admin",
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
        if user_data["username"] == "sarah_admin" and user_data["role"] == "admin":
            results.log_success("Protected /me endpoint with valid token")
        else:
            results.log_failure("Protected /me endpoint with valid token", "Invalid user data returned")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Protected /me endpoint with valid token", error_msg)
    
    # Test /me endpoint without token
    response = make_request("GET", "/me")
    if response and response.status_code == 401:
        results.log_success("Protected endpoint without token rejection")
    else:
        results.log_failure("Protected endpoint without token rejection", "Should require authentication")
    
    # Test /me endpoint with invalid token
    response = make_request("GET", "/me", auth_token="invalid_token")
    if response and response.status_code == 401:
        results.log_success("Protected endpoint with invalid token rejection")
    else:
        results.log_failure("Protected endpoint with invalid token rejection", "Should reject invalid token")

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
    if response and response.status_code == 403:
        results.log_success("User denied access to admin endpoint")
    else:
        results.log_failure("User denied access to admin endpoint", "Should deny access to non-admin")
    
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