#!/usr/bin/env python3
"""
Debug script to test organization extraction
"""

import subprocess
import re

def debug_extraction():
    """Debug the organization extraction process"""
    print("🔍 Debugging organization extraction...")
    
    redis_command = [
        'redis-cli', '-h', 'localhost', '-p', '6379',
        'FT.SEARCH', 'beamdevlive:config:type',
        '@type:{service\\:cudb} @objectStatus:{active}',
        'LIMIT', '0', '10'
    ]
    
    try:
        result = subprocess.run(redis_command, capture_output=True, text=True, check=True)
        output_lines = result.stdout.strip().split('\n')
        
        print(f"📊 Total lines: {len(output_lines)}")
        print(f"📊 First few lines:")
        for i, line in enumerate(output_lines[:10]):
            print(f"   {i}: {line[:100]}...")
        
        organizations = []
        for i in range(1, len(output_lines), 2):
            if i + 1 < len(output_lines):
                json_line = output_lines[i + 1]
                print(f"\n🔍 Processing line {i+1}:")
                print(f"   Contains 'serviceId': {'serviceId' in json_line}")
                print(f"   Contains 'cudb': {'cudb' in json_line}")
                
                if '"serviceId":"' in json_line and '"cudb"' in json_line:
                    # Extract the organization serviceId from the nested JSON structure
                    service_id_match = re.search(r'"serviceId":"([^"]+)"', json_line)
                    if service_id_match:
                        service_id = service_id_match.group(1)
                        print(f"   Found serviceId: {service_id}")
                        # Filter out onboarding service itself, but keep the actual organizations
                        if service_id != 'onboarding':
                            organizations.append(service_id)
                            print(f"   ✅ Added: {service_id}")
                        else:
                            print(f"   ❌ Skipped (onboarding): {service_id}")
                    else:
                        print(f"   ❌ No serviceId match found")
                else:
                    print(f"   ❌ Conditions not met")
        
        print(f"\n✅ Extracted {len(organizations)} active organizations")
        print(f"📋 Organizations: {organizations[:10]}")  # Show first 10
        return organizations
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Error: {e}")
        return []

if __name__ == "__main__":
    debug_extraction()

