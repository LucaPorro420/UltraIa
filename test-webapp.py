"""Test UltraIa web app health and basic functionality."""
from playwright.sync_api import sync_playwright
import json

def test_ultrai():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        results = {
            "health": None,
            "health_providers": None,
            "login_page": None,
            "console_errors": [],
            "failed_requests": []
        }
        
        # Capture console errors
        page.on("console", lambda msg: results["console_errors"].append(msg.text) if msg.type == "error" else None)
        page.on("requestfailed", lambda req: results["failed_requests"].append(f"{req.method} {req.url}"))
        
        # Test 1: Health endpoint
        print("Testing /api/health...")
        try:
            response = page.goto("http://localhost:3000/api/health")
            page.wait_for_load_state("networkidle")
            content = page.content()
            # Extract JSON from page
            health_data = page.evaluate("() => document.body.innerText")
            results["health"] = json.loads(health_data) if health_data else None
            print(f"  Health: {results['health'].get('ok', False)}")
        except Exception as e:
            print(f"  Health endpoint failed: {e}")
        
        # Test 2: Provider health endpoint
        print("Testing /api/health/providers...")
        try:
            response = page.goto("http://localhost:3000/api/health/providers")
            page.wait_for_load_state("networkidle")
            providers_data = page.evaluate("() => document.body.innerText")
            results["health_providers"] = json.loads(providers_data) if providers_data else None
            print(f"  Providers: {results['health_providers'].get('ok', False)}")
        except Exception as e:
            print(f"  Providers endpoint failed: {e}")
        
        # Test 3: Login page (should redirect)
        print("Testing login page...")
        try:
            response = page.goto("http://localhost:3000")
            page.wait_for_load_state("networkidle")
            page.screenshot(path="C:/Users/UTEC-5695/Desktop/UltraIa/test-screenshot.png")
            results["login_page"] = {
                "url": page.url,
                "title": page.title(),
                "status": response.status if response else None
            }
            print(f"  Login page: {results['login_page']['url']}")
        except Exception as e:
            print(f"  Login page failed: {e}")
        
        # Test 4: Check for console errors
        print(f"\nConsole errors: {len(results['console_errors'])}")
        for err in results["console_errors"][:5]:
            print(f"  - {err[:100]}")
        
        # Test 5: Check for failed requests
        print(f"Failed requests: {len(results['failed_requests'])}")
        for req in results["failed_requests"][:5]:
            print(f"  - {req}")
        
        browser.close()
        
        # Summary
        print("\n=== Test Summary ===")
        print(f"Health endpoint: {'PASS' if results['health'] and results['health'].get('ok') else 'FAIL'}")
        print(f"Providers endpoint: {'PASS' if results['health_providers'] and results['health_providers'].get('ok') else 'FAIL'}")
        print(f"Login page: {'PASS' if results['login_page'] else 'FAIL'}")
        print(f"Console errors: {'PASS' if len(results['console_errors']) == 0 else 'WARN'}")
        print(f"Failed requests: {'PASS' if len(results['failed_requests']) == 0 else 'WARN'}")
        
        return results

if __name__ == "__main__":
    test_ultrai()
