"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/users/reset_password_confirm/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: params.uid,
          token: params.token,
          new_password: newPassword,
        }),
      });

      if (res.ok) {
        setStatus("success");
      } else {
        const data = await res.json();
        setErrorMsg(JSON.stringify(data));
        setStatus("error");
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center p-4 sm:p-8 bg-secondary">
        <div className="w-full max-w-md p-6 sm:p-8 bg-background rounded-xl shadow-md text-foreground flex flex-col items-center text-center">
          <Image src="/logo.png" alt="CirclePass Logo" width={80} height={26} className="mb-4 object-contain" priority />
          <h2 className="text-xl sm:text-2xl font-bold text-success mb-2">Password Reset!</h2>
          <p className="mb-6">Your password has been successfully updated.</p>
          <Link href="/login" className="text-primary hover:underline font-medium">Continue to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center p-4 sm:p-8 bg-secondary">
      <div className="w-full max-w-md p-6 sm:p-8 bg-background rounded-xl shadow-md text-foreground flex flex-col items-center">
        <Image src="/logo.png" alt="CirclePass Logo" width={80} height={26} className="mb-4 object-contain" priority />
        <h2 className="text-xl sm:text-2xl font-bold text-center text-primary mb-6">Create New Password</h2>
        <form className="space-y-4 w-full" onSubmit={handleSubmit}>
          {errorMsg && <p className="text-destructive text-sm text-center bg-destructive/10 p-2 rounded">{errorMsg}</p>}
          <input 
            type="password" 
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password" 
            className="w-full border rounded px-3 py-2" 
            required 
            minLength={8}
          />
          <input 
            type="password" 
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password" 
            className="w-full border rounded px-3 py-2" 
            required 
            minLength={8}
          />
          <button 
            type="submit" 
            disabled={status === "loading"}
            className="w-full bg-primary text-primary-foreground py-2 rounded font-medium disabled:opacity-50"
          >
            {status === "loading" ? "Updating..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
