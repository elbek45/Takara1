#!/usr/bin/env python3
"""
Verify API endpoint consistency between Frontend and Backend
"""

import re
import os
from pathlib import Path
from collections import defaultdict

# Colors
GREEN = '\033[0;32m'
RED = '\033[0;31m'
YELLOW = '\033[1;33m'
NC = '\033[0m'

def extract_backend_routes(routes_dir):
    """Extract all routes from backend route files"""
    routes = defaultdict(list)

    for route_file in Path(routes_dir).glob('*.routes.ts'):
        with open(route_file, 'r') as f:
            content = f.read()

        # Extract router.METHOD('path', ...) patterns
        patterns = [
            r"router\.(get|post|put|delete|patch)\('([^']+)'",
            r"router\.(get|post|put|delete|patch)\(\"([^\"]+)\""
        ]

        for pattern in patterns:
            matches = re.findall(pattern, content)
            for method, path in matches:
                # Clean up path
                path = path.strip()
                routes[route_file.stem].append({
                    'method': method.upper(),
                    'path': path
                })

    return routes

def extract_frontend_api_calls(api_file):
    """Extract all API calls from frontend api.ts"""
    api_calls = []

    with open(api_file, 'r') as f:
        content = f.read()

    # Extract this.client.METHOD patterns
    patterns = [
        r"this\.client\.(get|post|put|delete|patch)<[^>]+>\('([^']+)'",
        r"this\.client\.(get|post|put|delete|patch)<[^>]+>\(\"([^\"]+)\"",
        r"this\.client\.(get|post|put|delete|patch)\('([^']+)'",
        r"this\.client\.(get|post|put|delete|patch)\(\"([^\"]+)\""
    ]

    for pattern in patterns:
        matches = re.findall(pattern, content)
        for method, path in matches:
            api_calls.append({
                'method': method.upper(),
                'path': path
            })

    return api_calls

def normalize_path(path):
    """Normalize path for comparison"""
    # Remove /api prefix if present
    path = path.replace('/api/', '/')
    # Remove leading slash
    path = path.lstrip('/')
    # Replace :id with ${id} or vice versa
    path = re.sub(r'\$\{[^}]+\}', ':id', path)
    path = re.sub(r':[^/]+', ':id', path)
    return path

def main():
    print(f"{YELLOW}🔍 Verifying Frontend-Backend API Consistency{NC}")
    print("=" * 60)

    # Paths
    backend_routes_dir = Path('backend/src/routes')
    frontend_api_file = Path('frontend/src/services/api.ts')

    # Extract routes
    backend_routes = extract_backend_routes(backend_routes_dir)
    frontend_calls = extract_frontend_api_calls(frontend_api_file)

    print(f"\n{GREEN}✓{NC} Backend routes found: {sum(len(r) for r in backend_routes.values())}")
    print(f"{GREEN}✓{NC} Frontend API calls found: {len(frontend_calls)}")

    # Create normalized backend route set
    backend_set = set()
    for route_type, routes in backend_routes.items():
        for route in routes:
            normalized = normalize_path(route['path'])
            backend_set.add(f"{route['method']}:{normalized}")

    # Create normalized frontend call set
    frontend_set = set()
    for call in frontend_calls:
        normalized = normalize_path(call['path'])
        frontend_set.add(f"{call['method']}:{normalized}")

    print(f"\n{YELLOW}📋 Route Details:{NC}")
    for route_type, routes in sorted(backend_routes.items()):
        print(f"\n  {route_type}:")
        for route in routes:
            print(f"    {route['method']:6} {route['path']}")

    # Check for missing implementations
    print(f"\n{YELLOW}🔎 Checking for discrepancies...{NC}\n")

    issues_found = False

    # Frontend calls without backend implementation
    missing_backend = []
    for call in frontend_calls:
        normalized = normalize_path(call['path'])
        key = f"{call['method']}:{normalized}"

        # Check if exists in backend
        found = False
        for backend_key in backend_set:
            if backend_key == key or (
                backend_key.replace(':id', '') in key or
                key.replace(':id', '') in backend_key
            ):
                found = True
                break

        if not found:
            missing_backend.append(call)

    if missing_backend:
        print(f"{RED}❌ Frontend calls without backend implementation:{NC}")
        for call in missing_backend:
            print(f"   {call['method']:6} {call['path']}")
        issues_found = True
    else:
        print(f"{GREEN}✓{NC} All frontend calls have backend implementation")

    # Check for specific v2.2 features
    print(f"\n{YELLOW}🆕 Checking v2.2 Features:{NC}")

    v22_features = {
        'TAKARA Boost': [
            'POST:/investments/:id/boost/takara',
            'GET:/investments/:id/boost/takara'
        ],
        'Instant Sale': [
            'PUT:/investments/:id/instant-sale',
            'POST:/investments/:id/instant-sale/execute',
            'GET:/investments/:id/instant-sale/price'
        ]
    }

    for feature_name, expected_routes in v22_features.items():
        print(f"\n  {feature_name}:")
        for route in expected_routes:
            method, path = route.split(':', 1)
            normalized = normalize_path(path)

            # Check frontend
            frontend_has = any(
                normalize_path(c['path']) in normalized or normalized in normalize_path(c['path'])
                for c in frontend_calls if c['method'] == method
            )

            # Check backend
            backend_has = any(
                normalized in normalize_path(r['path']) or normalize_path(r['path']) in normalized
                for routes in backend_routes.values()
                for r in routes if r['method'] == method
            )

            status = f"{GREEN}✓{NC}" if (frontend_has and backend_has) else f"{RED}✗{NC}"
            print(f"    {status} {route}")

            if not (frontend_has and backend_has):
                issues_found = True
                if not frontend_has:
                    print(f"       {YELLOW}Missing in frontend{NC}")
                if not backend_has:
                    print(f"       {YELLOW}Missing in backend{NC}")

    # Summary
    print(f"\n{'=' * 60}")
    if not issues_found:
        print(f"{GREEN}✅ API Consistency Check: PASSED{NC}")
        return 0
    else:
        print(f"{RED}❌ API Consistency Check: FAILED{NC}")
        print(f"{YELLOW}Please review the issues above and update accordingly.{NC}")
        return 1

if __name__ == '__main__':
    exit(main())
