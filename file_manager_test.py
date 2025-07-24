#!/usr/bin/env python3
"""
File Manager Backend API Tests - Focused on Reported Issues
Tests the specific File Manager backend fixes for:
1. Folder Creation User Display (created_by_name field)
2. Folder Navigation (with and without parent_id)
3. User Information lookup
4. Error Handling for edge cases
"""

import requests
import json
import uuid
from datetime import datetime

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
        print(f"\n{'='*80}")
        print(f"FILE MANAGER TEST SUMMARY: {self.passed}/{total} tests passed")
        if self.errors:
            print(f"\nFAILURES:")
            for error in self.errors:
                print(f"  - {error}")
        print(f"{'='*80}")

# Global test state
results = TestResults()
user_token = None
user_user_id = None
created_folders = []
created_files = []

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
            response = requests.get(url, headers=request_headers, timeout=15)
        elif method == "POST":
            if files:
                response = requests.post(url, files=files, data=data, headers=request_headers, timeout=15)
            else:
                response = requests.post(url, json=data, headers=request_headers, timeout=15)
        elif method == "PUT":
            if files:
                response = requests.put(url, files=files, data=data, headers=request_headers, timeout=15)
            else:
                response = requests.put(url, json=data, headers=request_headers, timeout=15)
        elif method == "DELETE":
            response = requests.delete(url, headers=request_headers, timeout=15)
        else:
            raise ValueError(f"Unsupported method: {method}")
            
        return response
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {method} {url} - {str(e)}")
        return None

def setup_test_user():
    """Create and login a test user for File Manager testing"""
    print("🔧 Setting up test user for File Manager tests...")
    
    # Generate unique username to avoid conflicts
    unique_suffix = str(uuid.uuid4())[:8]
    
    # Create test user
    user_data = {
        "username": f"filemanager_user_{unique_suffix}",
        "email": f"filemanager_{unique_suffix}@epsys.com",
        "password": "FileManager123!",
        "full_name": "Marie Dubois",
        "role": "user"
    }
    
    response = make_request("POST", "/register", user_data)
    if response and response.status_code == 200:
        global user_user_id
        user_user_id = response.json()["id"]
        print(f"✅ Test user created: {user_data['username']}")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        print(f"❌ Failed to create test user: {error_msg}")
        return False
    
    # Login test user
    login_data = {
        "username": user_data["username"],
        "password": user_data["password"]
    }
    
    response = make_request("POST", "/login", login_data)
    if response and response.status_code == 200:
        global user_token
        user_token = response.json()["access_token"]
        print(f"✅ Test user logged in successfully")
        return True
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        print(f"❌ Failed to login test user: {error_msg}")
        return False

def test_folder_creation_user_display():
    """Test POST /api/file-manager/folders for proper created_by_name field"""
    print("\n📁 Testing Folder Creation User Display...")
    
    # Test 1: Create root folder and verify created_by_name
    folder_data = {
        "name": "Test Documents Folder",
        "parent_id": None
    }
    
    response = make_request("POST", "/file-manager/folders", folder_data, auth_token=user_token)
    if response and response.status_code == 200:
        folder = response.json()
        created_folders.append(folder["id"])
        
        # Check if created_by_name is present and not "undefined" or "Inconnu"
        created_by_name = folder.get("created_by_name")
        if created_by_name and created_by_name not in ["undefined", "Inconnu", None]:
            results.log_success("Folder creation includes created_by_name field")
            
            # Verify it matches the actual user's full name
            if created_by_name == "Marie Dubois":
                results.log_success("Folder creation shows correct user full name")
            else:
                results.log_failure("Folder creation user name", f"Expected 'Marie Dubois', got '{created_by_name}'")
        else:
            results.log_failure("Folder creation user display", f"created_by_name is '{created_by_name}' (should be user's full name)")
        
        # Verify other required fields
        required_fields = ["id", "name", "parent_id", "path", "created_by", "created_at"]
        missing_fields = [field for field in required_fields if field not in folder]
        if not missing_fields:
            results.log_success("Folder creation response structure")
        else:
            results.log_failure("Folder creation structure", f"Missing fields: {missing_fields}")
            
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Folder creation request", error_msg)
    
    # Test 2: Create subfolder and verify user tracking
    if created_folders:
        parent_id = created_folders[0]
        subfolder_data = {
            "name": "Reports Subfolder",
            "parent_id": parent_id
        }
        
        response = make_request("POST", "/file-manager/folders", subfolder_data, auth_token=user_token)
        if response and response.status_code == 200:
            subfolder = response.json()
            created_folders.append(subfolder["id"])
            
            # Check created_by_name for subfolder
            created_by_name = subfolder.get("created_by_name")
            if created_by_name == "Marie Dubois":
                results.log_success("Subfolder creation shows correct user full name")
            else:
                results.log_failure("Subfolder creation user name", f"Expected 'Marie Dubois', got '{created_by_name}'")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("Subfolder creation request", error_msg)

def test_folder_navigation():
    """Test GET /api/file-manager/folders with and without parent_id parameter"""
    print("\n🧭 Testing Folder Navigation...")
    
    # Test 1: Root folder listing (no parent_id)
    response = make_request("GET", "/file-manager/folders", auth_token=user_token)
    if response and response.status_code == 200:
        data = response.json()
        
        # Verify response structure
        required_fields = ["folders", "files", "current_path", "current_folder", "navigation_path"]
        missing_fields = [field for field in required_fields if field not in data]
        if not missing_fields:
            results.log_success("Root folder listing response structure")
        else:
            results.log_failure("Root folder listing structure", f"Missing fields: {missing_fields}")
        
        # Verify root folder properties
        if data["current_path"] == "/" and data["current_folder"] is None:
            results.log_success("Root folder navigation properties")
        else:
            results.log_failure("Root folder properties", f"current_path: {data['current_path']}, current_folder: {data['current_folder']}")
        
        # Check if our created folders are visible
        folder_names = [f["name"] for f in data["folders"]]
        if "Test Documents Folder" in folder_names:
            results.log_success("Root folder listing shows created folders")
        else:
            results.log_failure("Root folder visibility", "Created folders not visible in root listing")
            
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("Root folder listing request", error_msg)
    
    # Test 2: Navigate into folder (with parent_id)
    if created_folders:
        parent_folder_id = created_folders[0]
        response = make_request("GET", f"/file-manager/folders?parent_id={parent_folder_id}", auth_token=user_token)
        if response and response.status_code == 200:
            data = response.json()
            
            # Verify navigation into folder works
            if data["current_folder"] and data["current_folder"]["id"] == parent_folder_id:
                results.log_success("Folder navigation with parent_id works")
            else:
                results.log_failure("Folder navigation", "current_folder not set correctly")
            
            # Verify navigation path is built correctly
            if data["current_path"] == "/Test Documents Folder":
                results.log_success("Folder navigation path is correct")
            else:
                results.log_failure("Folder navigation path", f"Expected '/Test Documents Folder', got '{data['current_path']}'")
            
            # Check if subfolders are visible
            if len(created_folders) > 1:  # We created a subfolder
                subfolder_names = [f["name"] for f in data["folders"]]
                if "Reports Subfolder" in subfolder_names:
                    results.log_success("Subfolder navigation shows child folders")
                else:
                    results.log_failure("Subfolder visibility", "Child folders not visible in parent folder")
                    
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("Folder navigation request", error_msg)
    
    # Test 3: Navigate into subfolder (deeper navigation)
    if len(created_folders) > 1:
        subfolder_id = created_folders[1]
        response = make_request("GET", f"/file-manager/folders?parent_id={subfolder_id}", auth_token=user_token)
        if response and response.status_code == 200:
            data = response.json()
            
            # Verify deep navigation works
            if data["current_folder"] and data["current_folder"]["id"] == subfolder_id:
                results.log_success("Deep folder navigation works")
            else:
                results.log_failure("Deep folder navigation", "Subfolder navigation failed")
            
            # Verify navigation path for deep folder
            expected_path = "/Test Documents Folder/Reports Subfolder"
            if data["current_path"] == expected_path:
                results.log_success("Deep folder navigation path is correct")
            else:
                results.log_failure("Deep folder path", f"Expected '{expected_path}', got '{data['current_path']}'")
            
            # Verify navigation breadcrumb
            if data["navigation_path"] and len(data["navigation_path"]) >= 2:
                results.log_success("Navigation breadcrumb trail is built")
            else:
                results.log_failure("Navigation breadcrumb", "Breadcrumb trail not properly built")
                
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("Deep folder navigation request", error_msg)

def test_user_information_lookup():
    """Test that user lookup is working correctly for created_by_name"""
    print("\n👤 Testing User Information Lookup...")
    
    # Test 1: Verify user information is correctly populated in folder listings
    response = make_request("GET", "/file-manager/folders", auth_token=user_token)
    if response and response.status_code == 200:
        data = response.json()
        
        # Find our created folder and check user information
        test_folder = None
        for folder in data["folders"]:
            if folder["name"] == "Test Documents Folder":
                test_folder = folder
                break
        
        if test_folder:
            # Verify created_by_name is populated
            created_by_name = test_folder.get("created_by_name")
            if created_by_name == "Marie Dubois":
                results.log_success("User lookup populates correct full name in folder listing")
            else:
                results.log_failure("User lookup in listing", f"Expected 'Marie Dubois', got '{created_by_name}'")
            
            # Verify created_by field is also present
            if test_folder.get("created_by") == user_user_id:
                results.log_success("User ID correctly stored in created_by field")
            else:
                results.log_failure("User ID storage", "created_by field doesn't match user ID")
        else:
            results.log_failure("User lookup test", "Test folder not found in listing")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_failure("User lookup folder listing", error_msg)
    
    # Test 2: Upload a file and verify user attribution
    if created_folders:
        import tempfile
        import os
        
        # Create a test file
        test_content = b"Test file content for user attribution testing"
        
        with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as temp_file:
            temp_file.write(test_content)
            temp_file_path = temp_file.name
        
        try:
            with open(temp_file_path, 'rb') as f:
                files = [('files', ('test_user_attribution.txt', f, 'text/plain'))]
                data = {'folder_id': created_folders[0]}
                
                response = make_request("POST", "/file-manager/upload", data=data, files=files, auth_token=user_token)
            
            if response and response.status_code == 200:
                upload_result = response.json()
                if "files" in upload_result and len(upload_result["files"]) > 0:
                    file_info = upload_result["files"][0]
                    created_files.append(file_info["id"])
                    
                    # Check uploaded_by_name
                    uploaded_by_name = file_info.get("uploaded_by_name")
                    if uploaded_by_name == "Marie Dubois":
                        results.log_success("File upload user attribution works correctly")
                    else:
                        results.log_failure("File upload user attribution", f"Expected 'Marie Dubois', got '{uploaded_by_name}'")
                else:
                    results.log_failure("File upload for user test", "No file information returned")
            else:
                error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
                results.log_failure("File upload for user test", error_msg)
        
        finally:
            os.unlink(temp_file_path)

def test_error_handling():
    """Test edge cases and error handling"""
    print("\n⚠️ Testing Error Handling...")
    
    # Test 1: Invalid folder ID
    response = make_request("GET", "/file-manager/folders?parent_id=invalid-folder-id", auth_token=user_token)
    if response and response.status_code == 200:
        # Should return empty results, not error
        data = response.json()
        if data["folders"] == [] and data["files"] == []:
            results.log_success("Invalid folder ID handled gracefully")
        else:
            results.log_failure("Invalid folder ID handling", "Should return empty results for invalid folder ID")
    else:
        # Could also return 404 or 400, which is acceptable
        if response and response.status_code in [400, 404]:
            results.log_success("Invalid folder ID returns appropriate error")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("Invalid folder ID handling", error_msg)
    
    # Test 2: Non-existent parent folder
    fake_uuid = str(uuid.uuid4())
    response = make_request("GET", f"/file-manager/folders?parent_id={fake_uuid}", auth_token=user_token)
    if response and response.status_code == 200:
        data = response.json()
        if data["folders"] == [] and data["files"] == []:
            results.log_success("Non-existent parent folder handled gracefully")
        else:
            results.log_failure("Non-existent parent handling", "Should return empty results for non-existent parent")
    else:
        if response and response.status_code in [400, 404]:
            results.log_success("Non-existent parent folder returns appropriate error")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_failure("Non-existent parent handling", error_msg)
    
    # Test 3: Create folder with empty name
    empty_name_data = {
        "name": "",
        "parent_id": None
    }
    
    response = make_request("POST", "/file-manager/folders", empty_name_data, auth_token=user_token)
    if response and response.status_code in [400, 422]:
        results.log_success("Empty folder name validation works")
    else:
        results.log_failure("Empty folder name validation", "Should reject empty folder names")
    
    # Test 4: Create folder with duplicate name in same parent
    if created_folders:
        duplicate_data = {
            "name": "Test Documents Folder",  # Same as existing folder
            "parent_id": None
        }
        
        response = make_request("POST", "/file-manager/folders", duplicate_data, auth_token=user_token)
        if response and response.status_code == 400:
            results.log_success("Duplicate folder name prevention works")
        else:
            results.log_failure("Duplicate folder prevention", "Should prevent duplicate folder names in same parent")
    
    # Test 5: Access without authentication
    response = make_request("GET", "/file-manager/folders")
    if response and response.status_code in [401, 403]:
        results.log_success("Authentication required for folder access")
    else:
        results.log_failure("Authentication requirement", "Should require authentication for folder access")

def cleanup_test_data():
    """Clean up created test data"""
    print("\n🧹 Cleaning up test data...")
    
    # Delete created files
    for file_id in created_files:
        response = make_request("DELETE", f"/file-manager/files/{file_id}", auth_token=user_token)
        if response and response.status_code == 200:
            print(f"✅ Deleted file {file_id}")
        else:
            print(f"⚠️ Failed to delete file {file_id}")
    
    # Delete created folders (in reverse order to handle hierarchy)
    for folder_id in reversed(created_folders):
        response = make_request("DELETE", f"/file-manager/folders/{folder_id}", auth_token=user_token)
        if response and response.status_code == 200:
            print(f"✅ Deleted folder {folder_id}")
        else:
            print(f"⚠️ Failed to delete folder {folder_id}")

def main():
    """Run all File Manager tests"""
    print("🚀 Starting File Manager Backend API Tests")
    print("=" * 80)
    
    # Setup
    if not setup_test_user():
        print("❌ Failed to setup test user. Aborting tests.")
        return
    
    try:
        # Run focused tests for reported issues
        test_folder_creation_user_display()
        test_folder_navigation()
        test_user_information_lookup()
        test_error_handling()
        
    finally:
        # Cleanup
        cleanup_test_data()
    
    # Show results
    results.summary()
    
    # Return exit code based on results
    return 0 if results.failed == 0 else 1

if __name__ == "__main__":
    exit(main())