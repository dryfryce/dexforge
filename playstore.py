#!/usr/bin/env python3
"""Play Store API helper for DEXFORGE"""
import sys
import json
import os
import requests
from playstoreapi.googleplay import GooglePlayAPI

CONFIG_PATH = '/root/.config/playstoreapi/config.json'

def get_api():
    api = GooglePlayAPI('en_IN', 'Asia/Kolkata')
    api.login(anonymous=True)
    return api

def search_apps(query, limit=10):
    api = get_api()
    try:
        details = api.details(query)
        if details and details.get('title'):
            ad = details.get('details', {}).get('appDetails', {})
            results = [{
                'id': ad.get('packageName', query),
                'title': details.get('title', ''),
                'creator': details.get('creator', ''),
                'version': ad.get('versionString', ''),
                'versionCode': ad.get('versionCode', 0),
                'size': ad.get('installationSize', 0),
                'icon': details.get('image', [{}])[0].get('url', '') if details.get('image') else '',
                'exact': True
            }]
            return json.dumps({'ok': True, 'results': results})
    except:
        pass

    # If exact match failed, try as search query
    try:
        results = []
        search_results = api.search(query)
        for doc in search_results:
            for cluster in doc.get('subItem', []):
                for app in cluster.get('subItem', []):
                    ad2 = app.get('details', {}).get('appDetails', {})
                    results.append({
                        'id': app.get('id', ''),
                        'title': app.get('title', ''),
                        'creator': app.get('creator', ''),
                        'version': ad2.get('versionString', ''),
                        'size': ad2.get('installationSize', 0),
                        'icon': app.get('image', [{}])[0].get('url', '') if app.get('image') else '',
                    })
                    if len(results) >= limit:
                        break
        return json.dumps({'ok': True, 'results': results})
    except Exception as e:
        return json.dumps({'ok': False, 'error': str(e)})

def download_apk(package_name, output_dir, version_code=None):
    api = get_api()
    try:
        requested_vc = int(version_code) if version_code else None
        
        details = api.details(package_name)
        ad = details.get('details', {}).get('appDetails', {})
        title = details.get('title', package_name)
        version = ad.get('versionString', 'unknown')
        if requested_vc:
            version = f"vc{requested_vc}"
        safe_title = "".join(c for c in title if c.isalnum() or c in ' _-').strip().replace(' ', '_')
        
        dl_kwargs = {}
        if requested_vc:
            dl_kwargs['versionCode'] = requested_vc
        dl = api.download(package_name, **dl_kwargs)
        url = dl['file']['url']
        cookies = dl['file'].get('cookies', {})
        
        # Download base APK
        resp = requests.get(url, cookies=cookies, stream=True, timeout=300)
        if resp.status_code != 200:
            return json.dumps({'ok': False, 'error': f'Download failed: HTTP {resp.status_code}'})
        
        filename = f"{safe_title}_{version}.apk"
        filepath = os.path.join(output_dir, filename)
        
        total = 0
        with open(filepath, 'wb') as f:
            for chunk in resp.iter_content(65536):
                f.write(chunk)
                total += len(chunk)
        
        # Check for split APKs
        splits = dl.get('splits', [])
        split_files = []
        for split in splits:
            split_file = split.get('file', {})
            split_url = split_file.get('url', '') if isinstance(split_file, dict) else ''
            if not split_url:
                continue
            split_cookies = split_file.get('cookies', cookies) if isinstance(split_file, dict) else cookies
            split_name = split.get('name', 'unknown')
            split_resp = requests.get(split_url, cookies=split_cookies, stream=True, timeout=300)
            if split_resp.status_code == 200:
                split_filename = f"{safe_title}_{version}_split_{split_name}.apk"
                split_path = os.path.join(output_dir, split_filename)
                with open(split_path, 'wb') as f:
                    for chunk in split_resp.iter_content(65536):
                        f.write(chunk)
                split_files.append({'name': split_filename, 'path': split_path})
        
        # If splits exist, create APKS bundle (zip of all APKs)
        if split_files:
            import zipfile
            apks_filename = f"{safe_title}_{version}.apks"
            apks_path = os.path.join(output_dir, apks_filename)
            with zipfile.ZipFile(apks_path, 'w', zipfile.ZIP_STORED) as zf:
                zf.write(filepath, 'base.apk')
                for sf in split_files:
                    zf.write(sf['path'], os.path.basename(sf['name']))
                    os.unlink(sf['path'])  # cleanup split files
            # Remove base APK, use APKS instead
            os.unlink(filepath)
            return json.dumps({
                'ok': True,
                'filename': apks_filename,
                'filepath': apks_path,
                'title': title,
                'version': version,
                'package': package_name,
                'size': os.path.getsize(apks_path),
                'ext': '.apks',
                'splits': [s['name'] for s in split_files]
            })
        
        return json.dumps({
            'ok': True,
            'filename': filename,
            'filepath': filepath,
            'title': title,
            'version': version,
            'package': package_name,
            'size': total,
            'ext': '.apk',
            'splits': []
        })
    except Exception as e:
        return json.dumps({'ok': False, 'error': str(e)})

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(json.dumps({'ok': False, 'error': 'Usage: playstore.py <search|download> <query|package> [output_dir]'}))
        sys.exit(1)
    
    action = sys.argv[1]
    if action == 'search':
        print(search_apps(sys.argv[2]))
    elif action == 'download':
        output_dir = sys.argv[3] if len(sys.argv) > 3 else '/tmp'
        version_code = sys.argv[4] if len(sys.argv) > 4 else None
        print(download_apk(sys.argv[2], output_dir, version_code))
    else:
        print(json.dumps({'ok': False, 'error': f'Unknown action: {action}'}))
