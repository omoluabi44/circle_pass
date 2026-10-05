with open('src/lib/authOptions.ts', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;'''

replacement = '''      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        access_token: { label: "Token", type: "text" },
        refresh_token: { label: "Token", type: "text" },
        user_data: { label: "Data", type: "text" }
      },
      async authorize(credentials) {
        if (credentials?.access_token && credentials?.user_data) {
          const user = JSON.parse(credentials.user_data);
          return {
            id: user.id.toString(),
            name: user.username,
            email: user.email,
            role: user.role,
            isEmailVerified: true,
            accessToken: credentials.access_token,
            refreshToken: credentials.refresh_token,
          };
        }

        if (!credentials?.email || !credentials?.password) return null;'''

text = text.replace(target, replacement)

with open('src/lib/authOptions.ts', 'w', encoding='utf-8') as f:
    f.write(text)
