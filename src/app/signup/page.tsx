"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegistrationPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      const signInRes = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (signInRes?.error) {
        setError("Registration successful, but login failed. Please login manually.");
        setLoading(false);
        return;
      }

      router.push("/newTrial");
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">
          Create Account
        </h2>

        <div className="space-y-5">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-400"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-400"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-400"
              placeholder="••••••••"
            />
            <p className="mt-1 text-xs text-gray-500">
              At least 6 characters
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold shadow-md transition hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </div>

        <div className="my-4 flex items-center">
          <hr className="flex-grow border-gray-300" />
          <span className="mx-2 text-sm text-gray-500">or</span>
          <hr className="flex-grow border-gray-300" />
        </div>

        <button
          onClick={() => signIn("google", { callbackUrl: "/newTrial" })}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 font-medium shadow-sm transition hover:bg-gray-100"
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            className="h-5 w-5"
          />
          Continue with Google
        </button>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <a href="/login" className="text-blue-600 hover:underline">
            Log in
          </a>
        </p>
      </div>
    </div>
  );
}