"use client";

import { signIn, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { data: session, status } = useSession();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (!res) {
      setError("Unexpected error");
      return;
    }

    if (res.error) {
      setError(res.error || "Invalid credentials");
      return;
    }
  };

  // 🚀 Redirect if logged in
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/newTrial");
    }
  }, [status, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">
          Labmate Login
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
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
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-400"
              placeholder="you@example.com"
            />
          </div>

          {/* Password */}
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
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-400"
              placeholder="••••••••"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold shadow-md transition hover:bg-blue-700"
          >
            Log In
          </button>
          {error && <p className="text-red-500">{error}</p>}
        </form>

        {/* OR divider */}
        <div className="my-4 flex items-center">
          <hr className="flex-grow border-gray-300" />
          <span className="mx-2 text-sm text-gray-500">or</span>
          <hr className="flex-grow border-gray-300" />
        </div>

        {/* Google Login Button */}
        {status === "unauthenticated" && (
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
        )}

        <p className="mt-4 text-center text-sm text-gray-600">
          Don’t have an account?{" "}
          <a href="/signup" className="text-blue-600 hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
