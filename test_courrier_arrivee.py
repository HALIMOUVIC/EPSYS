#!/usr/bin/env python3
"""
Focused test for Courrier Arrivée functionality
Tests the modern design update for CourrierArriveeList functionality
"""

import requests
import json
import os
import tempfile
from datetime import datetime, timedelta
import uuid
import urllib.parse

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

def setup_authentication():
    """Setup authentication tokens for testing"""
    global admin_token, user_token, admin_user_id, user_user_id
    
    print("🔧 Setting up authentication...")
    
    # Generate unique usernames to avoid conflicts
    unique_suffix = str(uuid.uuid4())[:8]
    
    # Create admin user
    admin_data = {
        "username": f"admin_{unique_suffix}",
        "email": f"admin_{unique_suffix}@epsys.com",
        "password": "SecurePass123!",
        "full_name": "Test Admin",
        "role": "admin"
    }
    
    response = make_request("POST", "/register", admin_data)
    if response and response.status_code == 200:
        admin_user_id = response.json()["id"]
        
        # Login admin
        admin_login = {
            "username": admin_data["username"],
            "password": admin_data["password"]
        }
        
        response = make_request("POST", "/login", admin_login)
        if response and response.status_code == 200:
            admin_token = response.json()["access_token"]
            print("✅ Admin authentication setup")
        else:
            print("❌ Admin login failed")
    else:
        print("❌ Admin registration failed")
    
    # Create regular user
    user_data = {
        "username": f"user_{unique_suffix}",
        "email": f"user_{unique_suffix}@epsys.com", 
        "password": "UserPass456!",
        "full_name": "Test User",
        "role": "user"
    }
    
    response = make_request("POST", "/register", user_data)
    if response and response.status_code == 200:
        user_user_id = response.json()["id"]
        
        # Login user
        user_login = {
            "username": user_data["username"],
            "password": user_data["password"]
        }
        
        response = make_request("POST", "/login", user_login)
        if response and response.status_code == 200:
            user_token = response.json()["access_token"]
            print("✅ User authentication setup")
        else:
            print("❌ User login failed")
    else:
        print("❌ User registration failed")

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

def main():
    """Main test execution"""
    print("🚀 Starting Courrier Arrivée Backend API Tests...")
    print(f"Backend URL: {BACKEND_URL}")
    print("="*60)
    
    try:
        # Setup authentication
        setup_authentication()
        
        if not admin_token or not user_token:
            print("❌ Authentication setup failed. Cannot proceed with tests.")
            return
        
        # Run Courrier Arrivée tests
        test_courrier_arrivee_functionality()
        
    except KeyboardInterrupt:
        print("\n\n⚠️ Tests interrupted by user")
    except Exception as e:
        print(f"\n\n💥 Unexpected error during testing: {str(e)}")
    finally:
        results.summary()

if __name__ == "__main__":
    main()