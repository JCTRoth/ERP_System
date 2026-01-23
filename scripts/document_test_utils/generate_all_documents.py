#!/usr/bin/env python3
import os, sys, json, subprocess, time, urllib.request

BASE = 'http://localhost:8087'
OUTDIR = '/tmp/template-tests-' + str(int(time.time()))
KEYS = ['invoice','order-confirmation','shipping-notice','delivery-note','packing-slip','cancellation','refund']

os.makedirs(OUTDIR, exist_ok=True)
print('OUTDIR=' + OUTDIR)

# fetch templates
try:
    with urllib.request.urlopen(f'{BASE}/api/templates') as r:
        data = r.read().decode('utf8')
        templates = json.loads(data)
except Exception as e:
    print('ERROR: failed to fetch templates:', e, file=sys.stderr)
    sys.exit(2)

mapping = {t['key']: t['id'] for t in templates}

# basic generic context used for all templates
ctx = {
    'order':{
        'number':'ORD-AUTO-2026',
        'date':'2026-01-23',
        'dueDate':'2026-02-22',
        'status':'shipped',
        'subtotal':350,
        'tax':35,
        'shipping':10,
        'total':395,
        'items':[{'name':'Office Desk Chair','sku':'ODC-ERG-001','quantity':1,'unitPrice':150,'total':150},{'name':'Wireless Keyboard and Mouse Set','sku':'WKM-BT-200','quantity':2,'unitPrice':100,'total':200}]
    },
    'company':{
        'name':'ERP System Company',
        'address':'123 Business St',
        'postalCode':'12345',
        'city':'Business City',
        'country':'Germany',
        'email':'info@erp-system.com',
        'phone':'+49 123 456789',
        'taxId':'DE-12-3456789',
        'bankName':'Deutsche Bank',
        'bankIban':'DE12345678901234567890',
        'bankSwift':'DEUTDEBB'
    },
    'customer':{
        'name':'Max Mustermann GmbH',
        'address':{'street':'Musterstraße 456','postalCode':'54321','city':'Musterstadt','country':'Germany'},
        'email':'info@mustermann.de'
    }
}

def run_curl_pdf(template_id, out_file):
    cmd = ['curl','-s','-X','POST', f'{BASE}/api/templates/{template_id}/pdf', '-H','Content-Type: application/json', '-d', json.dumps(ctx), '-o', out_file]
    print('Running:', ' '.join(cmd))
    res = subprocess.run(cmd)
    return res.returncode

success = []
failed = []
for k in KEYS:
    tid = mapping.get(k)
    if not tid:
        print('MISSING TEMPLATE:', k, file=sys.stderr)
        failed.append((k,'missing'))
        continue
    out = os.path.join(OUTDIR, k + '.pdf')
    code = run_curl_pdf(tid, out)
    if code == 0 and os.path.exists(out) and os.path.getsize(out) > 0:
        print('WROTE', out)
        success.append(out)
    else:
        print('FAILED', k, 'exit', code, file=sys.stderr)
        failed.append((k, code))

# summary
print('\nRESULT_DIR=' + OUTDIR)
print('SUCCESS_COUNT=', len(success))
for p in success:
    try:
        print(os.path.basename(p), os.path.getsize(p))
    except:
        pass
if failed:
    print('\nFAILED TEMPLATES:')
    for k,rc in failed:
        print('-',k,rc)

# print ls -lh for convenience
print('\nLS -lh:')
for ln in subprocess.check_output(['ls','-lh',OUTDIR]).decode().splitlines():
    print(ln)
