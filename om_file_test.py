#!/usr/bin/env python3
"""
OM Approval File Upload Testing
Tests file upload functionality specifically for OM Approval documents.
"""

import requests
import tempfile
import os
import uuid

# Configuration
BACKEND_URL = "https://91ab24e1-2aa3-4897-84ac-69a3a5c4b76b.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

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
            response = requests.put(url, json=data, headers=request_headers, timeout=10)
        elif method == "DELETE":
            response = requests.delete(url, headers=request_headers, timeout=10)
        else:
            raise ValueError(f"Unsupported method: {method}")
            
        return response
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {method} {url} - {str(e)}")
        return None

def setup_test_user():
    """Create a test user and get auth token"""
    unique_suffix = str(uuid.uuid4())[:8]
    
    user_data = {
        "username": f"om_file_test_{unique_suffix}",
        "email": f"om_file_test_{unique_suffix}@epsys.com",
        "password": "TestPass123!",
        "full_name": "OM File Test User",
        "role": "user"
    }
    
    # Register user
    response = make_request("POST", "/register", user_data)
    if not response or response.status_code != 200:
        print("❌ Failed to create test user")
        return None, None
    
    user_id = response.json()["id"]
    
    # Login to get token
    login_data = {
        "username": user_data["username"],
        "password": user_data["password"]
    }
    
    response = make_request("POST", "/login", login_data)
    if not response or response.status_code != 200:
        print("❌ Failed to login test user")
        return None, None
    
    token = response.json()["access_token"]
    print(f"✅ Test user created and authenticated: {user_data['username']}")
    return token, user_id

def test_om_approval_file_upload():
    """Test file upload functionality for OM Approval documents"""
    print("\n📎 OM APPROVAL FILE UPLOAD TESTING")
    print("=" * 60)
    
    # Setup
    token, user_id = setup_test_user()
    if not token:
        return
    
    # Create OM Approval document first
    print("\n📋 Creating OM Approval document...")
    om_data = {
        "title": "Mission avec Fichiers - Test Upload",
        "description": "Test d'upload de fichiers pour ordre de mission",
        "document_type": "om_approval",
        "metadata": {
            "fullName": "Test Upload User",
            "matricule": "EMP-2025-UPLOAD",
            "jobTitle": "Test Engineer",
            "division": "Test Division",
            "itineraire": "Test - Upload - Test",
            "dateDepart": "2025-03-01",
            "dateRetour": "2025-03-05",
            "transport": "Test Transport",
            "objet": "Test mission avec upload de fichiers"
        }
    }
    
    response = make_request("POST", "/documents", om_data, auth_token=token)
    if not response or response.status_code != 200:
        print("❌ Failed to create OM Approval document")
        return
    
    doc = response.json()
    doc_id = doc["id"]
    print(f"✅ OM Approval document created: {doc_id}")
    print(f"✅ Reference: {doc.get('reference', 'N/A')}")
    
    # Test file upload
    print("\n📎 Testing file upload...")
    
    # Create test files
    test_files = [
        ("ordre_mission.pdf", b"PDF content for ordre de mission document"),
        ("justificatifs.docx", b"DOCX content for supporting documents"),
        ("rapport_mission.txt", b"Text content for mission report")
    ]
    
    uploaded_files = []
    
    for filename, content in test_files:
        # Create temporary file
        with tempfile.NamedTemporaryFile(suffix=f".{filename.split('.')[-1]}", delete=False) as temp_file:
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            with open(temp_file_path, 'rb') as f:
                files = {'files': (filename, f, 'application/octet-stream')}
                response = make_request("POST", f"/documents/{doc_id}/upload", 
                                      files=files, auth_token=token)
            
            if response and response.status_code == 200:
                print(f"✅ File uploaded successfully: {filename}")
                uploaded_files.append(filename)
            else:
                error = response.json().get("detail", "Unknown error") if response else "Connection failed"
                print(f"❌ File upload failed for {filename}: {error}")
        
        finally:
            # Clean up temporary file
            os.unlink(temp_file_path)
    
    # Verify file upload by retrieving document
    print("\n📋 Verifying file upload...")
    response = make_request("GET", f"/documents/{doc_id}", auth_token=token)
    if response and response.status_code == 200:
        doc = response.json()
        
        # Check if file information is stored
        if doc.get("file_path") or doc.get("file_name"):
            print(f"✅ File information stored in document")
            print(f"   File name: {doc.get('file_name', 'N/A')}")
            print(f"   File size: {doc.get('file_size', 'N/A')} bytes")
            print(f"   MIME type: {doc.get('mime_type', 'N/A')}")
        
        # Check metadata for uploaded files
        metadata = doc.get("metadata", {})
        if "uploaded_files" in metadata:
            uploaded_count = len(metadata["uploaded_files"])
            print(f"✅ Metadata contains {uploaded_count} uploaded file(s)")
            
            for i, file_info in enumerate(metadata["uploaded_files"]):
                print(f"   File {i+1}: {file_info.get('original_name', 'N/A')}")
        else:
            print("❌ No uploaded files found in metadata")
    
    # Test document retrieval with files
    print("\n📋 Testing document retrieval with files...")
    response = make_request("GET", "/documents?document_type=om_approval", auth_token=token)
    if response and response.status_code == 200:
        documents = response.json()
        om_docs_with_files = [doc for doc in documents if doc.get("file_path") or doc.get("file_name")]
        
        if om_docs_with_files:
            print(f"✅ Found {len(om_docs_with_files)} OM Approval documents with files")
        else:
            print("❌ No OM Approval documents with files found")
    
    # Cleanup
    print("\n🗑️ Cleaning up...")
    response = make_request("DELETE", f"/documents/{doc_id}", auth_token=token)
    if response and response.status_code == 200:
        print("✅ Test document deleted successfully")
    else:
        print("❌ Failed to delete test document")
    
    # Summary
    print("\n" + "=" * 60)
    print("📎 FILE UPLOAD TESTING SUMMARY")
    print("=" * 60)
    
    success_rate = len(uploaded_files) / len(test_files) * 100 if test_files else 0
    print(f"File upload success rate: {success_rate:.1f}% ({len(uploaded_files)}/{len(test_files)})")
    
    if success_rate == 100:
        print("🎉 ALL FILE UPLOAD TESTS PASSED!")
    else:
        print(f"⚠️  Some file uploads failed")
    
    return len(uploaded_files), len(test_files)

if __name__ == "__main__":
    test_om_approval_file_upload()