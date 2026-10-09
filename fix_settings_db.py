with open(r'backend/circlepass_backend/settings.py', 'r', encoding='utf-8') as f:
    text = f.read()

old_db = """        'PASSWORD': os.environ.get('DB_PASSWORD', 'Mr_engineer44'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '3306'),"""

new_db = """        'PASSWORD': os.environ.get('DB_PASSWORD', 'Mr_engineer44'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '3306'),
        'OPTIONS': {
            'charset': 'utf8mb4',
        },"""

if 'charset' not in text:
    text = text.replace(old_db, new_db)
    with open(r'backend/circlepass_backend/settings.py', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Replaced")
