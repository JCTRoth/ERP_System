import os, json, subprocess, pathlib

base_url = 'http://localhost:8087'
repo_root = '/home/jonas/Git/ERP_System'
templates_dir = os.path.join(repo_root, 'apps/services/nodejs/templates-service/templates')

keys = [
    'invoice',
    'order-confirmation',
    'shipping-notice',
    'delivery-note',
    'packing-slip',
    'cancellation',
    'refund',
]

print('Fetching templates from API...')
raw = subprocess.check_output(['curl', '-s', f'{base_url}/api/templates'])
all_templates = json.loads(raw)
by_key = {t['key']: t for t in all_templates}

for key in keys:
    t = by_key.get(key)
    if not t:
        print(f'SKIP {key}: not found in API')
        continue
    tid = t['id']
    path = os.path.join(templates_dir, key + '.adoc')
    if not os.path.exists(path):
        print(f'SKIP {key}: file {path} missing')
        continue
    content = pathlib.Path(path).read_text(encoding='utf-8')
    payload = json.dumps({
        'content': content,
        'lastModifiedBy': 'template-sync-script'
    })
    print(f'Updating {key} ({tid}) from {path}...')
    res = subprocess.run([
        'curl','-s','-X','PUT',f'{base_url}/api/templates/{tid}',
        '-H','Content-Type: application/json',
        '-d', payload
    ], capture_output=True, text=True)
    if res.returncode != 0:
        print(f'  ERROR {key}: curl failed: {res.stderr}')
    else:
        print(f'  DONE {key}: {len(content)} bytes sent')
