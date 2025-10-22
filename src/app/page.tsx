import Link from "next/link";
export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-6">
      {/* Hero Section */}
      <h1 className="text-4xl font-bold text-gray-800 md:text-5xl">
        Welcome to <span className="text-blue-600">Labmate</span>
      </h1>
      <p className="mt-4 max-w-xl text-center text-gray-600 md:text-lg">
        Store, organize, and access all your college lab experiment files in one place.  
        Simple, fast, and secure.
      </p>

      {/* Button (uses Next.js <Link> for routing) */}
      <Link
        href="/login"
        className="mt-8 rounded-xl bg-blue-600 px-6 py-3 text-white font-semibold shadow-md transition hover:bg-blue-700"
      >
        Get Started
      </Link>
    </div>
  );
}
