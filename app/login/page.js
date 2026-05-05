"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../context/ThemeContext";
import { getBaseUrl } from "../lib/utils";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if already logged in (JWT in cookies)
  useEffect(() => {
    if (typeof window !== "undefined" && document.cookie.includes("jwt=")) {
      router.replace("/");
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const runId = `login-${Date.now()}`;
    const baseUrl = getBaseUrl();
    try {
      // #region agent log
      fetch('http://127.0.0.1:7542/ingest/970fa0b3-5c4d-40b4-9918-80be20fdc08f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e82416'},body:JSON.stringify({sessionId:'e82416',runId,hypothesisId:'H1',location:'app/login/page.js:handleSubmit:start',message:'Login submit started',data:{baseUrl,hasEmail:Boolean(email),passwordLength:password?.length||0},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      const formData = new URLSearchParams();
      formData.append("grant_type", "password");
      formData.append("username", email);
      formData.append("password", password);
      const loginUrl = `${baseUrl}/login`;
      // #region agent log
      fetch('http://127.0.0.1:7542/ingest/970fa0b3-5c4d-40b4-9918-80be20fdc08f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e82416'},body:JSON.stringify({sessionId:'e82416',runId,hypothesisId:'H2',location:'app/login/page.js:handleSubmit:beforeFetch',message:'Attempting login fetch',data:{loginUrl,contentType:'application/x-www-form-urlencoded'},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      const res = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });
      if (!res.ok) {
        // #region agent log
        fetch('http://127.0.0.1:7542/ingest/970fa0b3-5c4d-40b4-9918-80be20fdc08f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e82416'},body:JSON.stringify({sessionId:'e82416',runId,hypothesisId:'H3',location:'app/login/page.js:handleSubmit:nonOk',message:'Login response non-OK',data:{status:res.status,statusText:res.statusText,loginUrl},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        throw new Error("Invalid email or password");
      }
      const data = await res.json();
      // #region agent log
      fetch('http://127.0.0.1:7542/ingest/970fa0b3-5c4d-40b4-9918-80be20fdc08f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e82416'},body:JSON.stringify({sessionId:'e82416',runId,hypothesisId:'H4',location:'app/login/page.js:handleSubmit:success',message:'Login response parsed',data:{hasAccessToken:Boolean(data?.access_token),tokenType:data?.token_type||null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      // Store JWT in cookie
      document.cookie = `jwt=${data.access_token}; path=/;`;
      // Store user data in localStorage
      localStorage.setItem('user_name', data.name);
      localStorage.setItem('user_type', data.user_type);
      router.replace("/");
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7542/ingest/970fa0b3-5c4d-40b4-9918-80be20fdc08f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e82416'},body:JSON.stringify({sessionId:'e82416',runId,hypothesisId:'H5',location:'app/login/page.js:handleSubmit:catch',message:'Login fetch threw error',data:{errorName:err?.name||null,errorMessage:err?.message||null,baseUrl},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 px-4 py-12">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-500/20 blur-3xl"></div>
        <div className="absolute -bottom-32 -left-40 w-80 h-80 rounded-full bg-gradient-to-tr from-pink-400/20 to-blue-500/20 blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="modern-card p-8 backdrop-blur-sm bg-white/80 dark:bg-gray-900/80">
          {/* Theme Toggle */}
          <div className="flex justify-end mb-6">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {isDark ? (
                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-4 shadow-lg">
              <span className="text-white font-bold text-2xl">A</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome to Advogue AI.</h1>
            <p className="text-gray-600 dark:text-gray-400">Sign in to access your analytics dashboard</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                <p className="text-red-600 dark:text-red-400 text-sm text-center">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </div>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Secure login 
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}