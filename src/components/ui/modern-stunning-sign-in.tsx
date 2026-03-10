"use client" 

import * as React from "react"
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Wand2 } from "lucide-react";

export const SignIn1 = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/setup";
 
  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
 
  const handleSubmit = async () => {
    setError("");
    
    if (isRegister && !name) {
      setError("Please enter your name.");
      return;
    }
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const body = isRegister ? { name, email, password } : { email, password };
      
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }
      
      // Success! Redirect.
      router.push(callbackUrl);
      router.refresh(); // Refresh state to pick up the new cookie
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsRegister(!isRegister);
    setError("");
  };
 
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#090d14] relative overflow-hidden w-full">
      {/* OmniClip Backdrops matched to globals.css setup */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[6%] left-[-8%] w-[34rem] h-[34rem] bg-[rgb(226_109_45/0.22)] rounded-full blur-[48px] opacity-42"></div>
        <div className="absolute top-[3%] right-[-10%] w-[28rem] h-[28rem] bg-[rgb(164_34_34/0.24)] rounded-full blur-[48px] opacity-42"></div>
      </div>

      {/* Centered glass card */}
      <div className="relative z-10 w-full max-w-sm rounded-[24px] bg-gradient-to-r from-[#ffffff08] to-[#121212] backdrop-blur-md shadow-2xl p-8 flex flex-col items-center border border-white/10 outline outline-1 outline-[#1f2731]">
        {/* Logo */}
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#df6d2d] to-[#ffca89] mb-6 shadow-lg shadow-[#df6d2d]/20">
          <Wand2 className="w-7 h-7 text-[#111]" />
        </div>
        
        {/* Title */}
        <h2 className="text-3xl font-serif text-[#f8f3ea] mb-2 text-center" style={{ fontFamily: '"Noto Serif JP", serif' }}>
          OmniClip
        </h2>
        <p className="text-[#8c2d0d] font-bold text-xs uppercase tracking-widest mb-6">
          {isRegister ? "Create Account" : "Access Portal"}
        </p>

        {/* Form */}
        <div className="flex flex-col w-full gap-4">
          <div className="w-full flex flex-col gap-3">
            {isRegister && (
              <input
                placeholder="Full Name"
                type="text"
                value={name}
                className="w-full px-5 py-3 rounded-xl bg-white/5 border border-black/10 text-black placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-[#df6d2d] focus:bg-white/10 transition-colors"
                onChange={(e) => setName(e.target.value)}
              />
            )}
            <input
              placeholder="Email"
              type="email"
              value={email}
              className="w-full px-5 py-3 rounded-xl bg-white/5 border border-black/10 text-black placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-[#df6d2d] focus:bg-white/10 transition-colors"
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              placeholder="Password"
              type="password"
              value={password}
              className="w-full px-5 py-3 rounded-xl bg-white/5 border border-black/10 text-black placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-[#df6d2d] focus:bg-white/10 transition-colors"
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            {error && (
              <div className="text-sm text-[#f2a59b] bg-[#692118]/40 border border-[#f2a59b]/30 px-3 py-2 rounded-lg text-left mt-1">
                {error}
              </div>
            )}
          </div>
          
          <hr className="border-white/10 my-1" />
          
          <div>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-gradient-to-b from-[#ef872e] to-[#ffca89] text-[#111] font-bold px-5 py-3 rounded-xl shadow-[0_8px_18px_rgba(0,0,0,0.2)] hover:translate-y-[-2px] transition-all disabled:opacity-70 disabled:hover:translate-y-0 mb-4 text-sm"
            >
              {loading ? "Please wait..." : (isRegister ? "Sign up" : "Sign in")}
            </button>
            
            <div className="w-full text-center mt-2">
              <span className="text-sm text-[#5f7284]">
                {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  onClick={toggleMode}
                  className="font-medium text-[#d5d9e2] hover:text-white transition-colors"
                >
                  {isRegister ? "Sign in" : "Sign up, it's free"}
                </button>
              </span>
            </div>
          </div>
        </div>
      </div>
      

    </div>
  );
};
