#!/usr/bin/env python3
"""
Focused OM Approval Testing
Tests specifically the OM Approval functionality as requested in the review.
"""

import requests
import json
import uuid
import re

# Configuration
BACKEND_URL = "https://6e6f4ea9-c21b-44f0-8abc-bb8f0d6ee7ee.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

def make_request(method, endpoint, data=None, headers=None, auth_token=None):
    """Helper function to make HTTP requests"""
    url = f"{BACKEND_URL}{endpoint}"
    request_headers = HEADERS.copy()
    
    if auth_token:
        request_headers["Authorization"] = f"Bearer {auth_token}"
    
    if headers:
        request_headers.update(headers)
    
    try:
        if method == "GET":
            response = requests.get(url, headers=request_headers, timeout=10)
        elif method == "POST":
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
        "username": f"om_test_{unique_suffix}",
        "email": f"om_test_{unique_suffix}@epsys.com",
        "password": "TestPass123!",
        "full_name": "OM Test User",
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

def test_om_approval_comprehensive():
    """Comprehensive OM Approval testing"""
    print("\n🎯 FOCUSED OM APPROVAL TESTING")
    print("=" * 60)
    
    # Setup
    token, user_id = setup_test_user()
    if not token:
        return
    
    test_results = []
    created_documents = []
    
    # Test 1: Create OM Approval with comprehensive metadata
    print("\n📋 Test 1: OM Approval Document Creation")
    om_data = {
        "title": "Mission Technique - Alger",
        "description": "Ordre de mission pour formation technique",
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
    
    response = make_request("POST", "/documents", om_data, auth_token=token)
    if response and response.status_code == 200:
        doc = response.json()
        created_documents.append(doc["id"])
        
        print(f"✅ Document created with ID: {doc['id']}")
        print(f"✅ Document type: {doc['document_type']}")
        print(f"✅ Reference: {doc.get('reference', 'N/A')}")
        
        # Verify metadata
        metadata = doc.get("metadata", {})
        required_fields = ["fullName", "matricule", "jobTitle", "division", "itineraire", 
                          "dateDepart", "dateRetour", "transport", "objet"]
        
        missing_fields = [field for field in required_fields if field not in metadata]
        if not missing_fields:
            print("✅ All required metadata fields present")
            test_results.append("✅ Metadata structure validation")
        else:
            print(f"❌ Missing metadata fields: {missing_fields}")
            test_results.append(f"❌ Missing metadata fields: {missing_fields}")
        
        # Verify reference format
        reference = doc.get("reference", "")
        if re.match(r"^OM-2025-\d{3}$", reference):
            print(f"✅ Reference format correct: {reference}")
            test_results.append("✅ Reference generation (OM-2025-XXX)")
        else:
            print(f"❌ Invalid reference format: {reference}")
            test_results.append(f"❌ Invalid reference format: {reference}")
            
    else:
        error = response.json().get("detail", "Unknown error") if response else "Connection failed"
        print(f"❌ Document creation failed: {error}")
        test_results.append(f"❌ Document creation failed: {error}")
    
    # Test 2: Create multiple OM Approvals to test reference increment
    print("\n📋 Test 2: Reference Number Increment")
    references = []
    
    for i in range(3):
        om_data_multi = {
            "title": f"Mission {i+1} - Test Reference",
            "description": f"Test document {i+1} for reference increment",
            "document_type": "om_approval",
            "metadata": {
                "fullName": f"Test User {i+1}",
                "matricule": f"EMP-2025-{i+1:03d}",
                "jobTitle": "Test Engineer",
                "division": "Test Division",
                "itineraire": "Test Route",
                "dateDepart": "2025-03-01",
                "dateRetour": "2025-03-05",
                "transport": "Test Transport",
                "objet": f"Test mission {i+1}"
            }
        }
        
        response = make_request("POST", "/documents", om_data_multi, auth_token=token)
        if response and response.status_code == 200:
            doc = response.json()
            created_documents.append(doc["id"])
            reference = doc.get("reference", "")
            references.append(reference)
            print(f"✅ Document {i+1} created with reference: {reference}")
        else:
            print(f"❌ Failed to create document {i+1}")
    
    # Check if references are incrementing
    if len(references) >= 2:
        ref_numbers = []
        for ref in references:
            match = re.match(r"^OM-2025-(\d{3})$", ref)
            if match:
                ref_numbers.append(int(match.group(1)))
        
        if len(ref_numbers) >= 2 and all(ref_numbers[i] < ref_numbers[i+1] for i in range(len(ref_numbers)-1)):
            print("✅ Reference numbers are incrementing correctly")
            test_results.append("✅ Reference increment validation")
        else:
            print(f"❌ Reference numbers not incrementing: {ref_numbers}")
            test_results.append(f"❌ Reference increment issue: {ref_numbers}")
    
    # Test 3: Document Retrieval with type filter
    print("\n📋 Test 3: Document Retrieval with Type Filter")
    response = make_request("GET", "/documents?document_type=om_approval", auth_token=token)
    if response and response.status_code == 200:
        documents = response.json()
        om_docs = [doc for doc in documents if doc["document_type"] == "om_approval"]
        
        print(f"✅ Retrieved {len(om_docs)} OM Approval documents")
        
        # Verify all returned documents are OM approval type
        all_om_type = all(doc["document_type"] == "om_approval" for doc in documents)
        if all_om_type:
            print("✅ Type filter working correctly - all documents are OM approval type")
            test_results.append("✅ Document type filter accuracy")
        else:
            print("❌ Type filter returned wrong document types")
            test_results.append("❌ Type filter returned wrong document types")
            
        # Check metadata integrity in retrieved documents
        docs_with_metadata = [doc for doc in om_docs if doc.get("metadata")]
        if docs_with_metadata:
            print(f"✅ {len(docs_with_metadata)} documents have metadata preserved")
            test_results.append("✅ Metadata preservation in retrieval")
        else:
            print("❌ No documents have metadata preserved")
            test_results.append("❌ Metadata not preserved in retrieval")
            
    else:
        error = response.json().get("detail", "Unknown error") if response else "Connection failed"
        print(f"❌ Document retrieval failed: {error}")
        test_results.append(f"❌ Document retrieval failed: {error}")
    
    # Test 4: Update OM Approval metadata
    print("\n📋 Test 4: OM Approval Metadata Update")
    if created_documents:
        doc_id = created_documents[0]
        update_data = {
            "metadata": {
                "fullName": "Benali Ahmed",
                "matricule": "EMP-2025-001",
                "jobTitle": "Ingénieur Technique Senior",  # Updated
                "division": "Division Exploration Production",
                "itineraire": "Hassi Messaoud - Alger - Hassi Messaoud",
                "dateDepart": "2025-02-16",  # Updated
                "dateRetour": "2025-02-21",  # Updated
                "transport": "Avion",
                "objet": "Formation technique avancée sur les nouvelles technologies"  # Updated
            }
        }
        
        response = make_request("PUT", f"/documents/{doc_id}", update_data, auth_token=token)
        if response and response.status_code == 200:
            doc = response.json()
            updated_metadata = doc.get("metadata", {})
            
            if (updated_metadata.get("jobTitle") == "Ingénieur Technique Senior" and
                updated_metadata.get("dateDepart") == "2025-02-16"):
                print("✅ Metadata updated successfully")
                test_results.append("✅ Metadata update functionality")
            else:
                print("❌ Metadata not updated correctly")
                test_results.append("❌ Metadata update failed")
        else:
            error = response.json().get("detail", "Unknown error") if response else "Connection failed"
            print(f"❌ Metadata update failed: {error}")
            test_results.append(f"❌ Metadata update failed: {error}")
    
    # Test 5: Dashboard statistics
    print("\n📋 Test 5: Dashboard Statistics Integration")
    response = make_request("GET", "/dashboard/stats", auth_token=token)
    if response and response.status_code == 200:
        stats = response.json()
        om_count = stats.get("om_approval", 0)
        
        print(f"✅ Dashboard shows {om_count} OM Approval documents")
        if om_count >= len(created_documents):
            test_results.append("✅ Dashboard statistics accuracy")
        else:
            test_results.append(f"❌ Dashboard count mismatch: expected >= {len(created_documents)}, got {om_count}")
    else:
        error = response.json().get("detail", "Unknown error") if response else "Connection failed"
        print(f"❌ Dashboard stats failed: {error}")
        test_results.append(f"❌ Dashboard stats failed: {error}")
    
    # Test 6: CRUD Operations Summary
    print("\n📋 Test 6: CRUD Operations Summary")
    if created_documents:
        # Read operation
        doc_id = created_documents[0]
        response = make_request("GET", f"/documents/{doc_id}", auth_token=token)
        if response and response.status_code == 200:
            print("✅ READ operation successful")
            test_results.append("✅ Individual document READ operation")
        else:
            print("❌ READ operation failed")
            test_results.append("❌ Individual document READ operation failed")
        
        # Delete operation (cleanup)
        deleted_count = 0
        for doc_id in created_documents:
            response = make_request("DELETE", f"/documents/{doc_id}", auth_token=token)
            if response and response.status_code == 200:
                deleted_count += 1
        
        print(f"✅ DELETE operation: {deleted_count}/{len(created_documents)} documents deleted")
        if deleted_count == len(created_documents):
            test_results.append("✅ DELETE operations successful")
        else:
            test_results.append(f"❌ DELETE operations: only {deleted_count}/{len(created_documents)} successful")
    
    # Final Summary
    print("\n" + "=" * 60)
    print("🎯 OM APPROVAL TESTING SUMMARY")
    print("=" * 60)
    
    passed = len([r for r in test_results if r.startswith("✅")])
    total = len(test_results)
    
    print(f"\nResults: {passed}/{total} tests passed\n")
    
    for result in test_results:
        print(result)
    
    print("\n" + "=" * 60)
    
    if passed == total:
        print("🎉 ALL OM APPROVAL TESTS PASSED!")
    else:
        print(f"⚠️  {total - passed} tests need attention")
    
    return passed, total, test_results

if __name__ == "__main__":
    test_om_approval_comprehensive()