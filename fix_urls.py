with open('backend/api/urls.py', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    "path('auth/google/', google_auth, name='google_auth'),",
    "path('auth/google/', google_auth, name='google_auth'),\n    path('auth/verify-code/', views.VerifyCodeView.as_view(), name='verify_code'),"
)

with open('backend/api/urls.py', 'w', encoding='utf-8') as f:
    f.write(text)
