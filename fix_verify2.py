with open('src/app/(auth)/verify-email/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''      // Auto login using NextAuth credentials callback (we pass tokens if supported, or just use normal credentials)
      // Since we modified backend to return tokens, we could use them, but NextAuth credentials provider 
      // usually takes email/password. 
      // Wait, let's just redirect to login with a success message, OR we can try to force-login if we have a custom provider.
      // For now, redirecting to /login is the safest fallback if we don't have password.
      // Actually, if we want them to go straight to dashboard, we can use signIn("credentials", { email, password }) if we had it...
      // Since we don't have password, we will just redirect to login with a message.
      // The user requested: "take me to dashboard".
      // Let's redirect to login page with a verified flag so it can prompt for password, or if our NextAuth supports token passing, do that.
      // Easiest is to redirect to login. The user just registered so they know their password.
      router.push("/login?verified=true");'''

replacement = '''      // Auto login using the tokens returned from our backend
      const result = await signIn("credentials", {
        redirect: false,
        access_token: data.access,
        refresh_token: data.refresh,
        user_data: JSON.stringify(data.user)
      });
      
      if (result?.error) {
        toast.error("Verified successfully, but couldn't log in automatically. Please login.");
        router.push("/login?verified=true");
      } else {
        // Redirect to dashboard as requested!
        router.push("/dashboard/tickets");
      }'''

text = text.replace(target, replacement)
with open('src/app/(auth)/verify-email/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
