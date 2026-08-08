import requests
import sys

BASE_URL = "http://localhost:8000/api/auth"

def test_auth_flow():
    print("Testing Authentication Flow...")

    # 1. Register
    print("\n1. Testing /register...")
    r = requests.post(f"{BASE_URL}/register", json={
        "email": "test_athlete@example.com",
        "password": "securepassword123",
        "first_name": "Test",
        "last_name": "Athlete",
        "role_id": 1
    })
    if r.status_code == 201:
        print("PASS - Registration successful")
        print(f"   User: {r.json()['first_name']} {r.json()['last_name']} | Role: {r.json()['role']['name']}")
    elif r.status_code == 400 and "already exists" in r.text:
        print("SKIP - User already registered (OK)")
    else:
        print(f"FAIL - {r.status_code}: {r.text}")
        sys.exit(1)

    # 2. Login
    print("\n2. Testing /login...")
    r = requests.post(f"{BASE_URL}/login", data={
        "username": "test_athlete@example.com",
        "password": "securepassword123"
    })
    if r.status_code == 200:
        token = r.json()["access_token"]
        print("PASS - Login successful")
        print(f"   Token: {token[:30]}...")
    else:
        print(f"FAIL - {r.status_code}: {r.text}")
        sys.exit(1)

    # 3. Get current user (/me)
    print("\n3. Testing /me (protected route)...")
    r = requests.get(f"{BASE_URL}/me", headers={"Authorization": f"Bearer {token}"})
    if r.status_code == 200:
        u = r.json()
        print("PASS - Authenticated user retrieved")
        print(f"   Logged in as: {u['first_name']} {u['last_name']} ({u['email']}) | Role: {u['role']['name']}")
    else:
        print(f"FAIL - {r.status_code}: {r.text}")
        sys.exit(1)

    # 4. Bad credentials check
    print("\n4. Testing wrong password (should reject)...")
    r = requests.post(f"{BASE_URL}/login", data={
        "username": "test_athlete@example.com",
        "password": "wrongpassword"
    })
    if r.status_code == 401:
        print("PASS - Wrong password correctly rejected (401)")
    else:
        print(f"FAIL - Expected 401, got {r.status_code}")
        sys.exit(1)

    print("\n============================================")
    print("ALL TESTS PASSED - Auth flow is working!")
    print("============================================")

if __name__ == "__main__":
    try:
        test_auth_flow()
    except requests.exceptions.ConnectionError:
        print("ERROR - Could not connect to backend at http://localhost:8000")
        print("Make sure the server is running.")
        sys.exit(1)
