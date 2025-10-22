"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  User,
  BookOpen,
  ListTodo,
  LogOut,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  FlaskConical,
} from "lucide-react";

type SubjectKind = "LECTURE" | "LAB";

interface Choice {
  subject: string;
  kind: SubjectKind;
}

export default function ProfileSetupPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [choices, setChoices] = useState<Choice[]>([]);
  const [subjectInput, setSubjectInput] = useState("");
  const [kindInput, setKindInput] = useState<SubjectKind>("LECTURE");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasCompletedProfile, setHasCompletedProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const menuItems = useMemo(
    () => [
      { name: "Profile", icon: User, active: true, path: "/profile-setup" },
      { name: "Subjects", icon: BookOpen, active: false, path: "/subjects" },
      { name: "Files", icon: ListTodo, active: false, path: "/tasks" },
    ],
    []
  );

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        setLoading(true);
        // Try to fetch existing subjects (and kinds if your API returns them)
        const res = await fetch("/api/user/subjects");
        const data = await res.json();

        if (!ignore && res.ok) {
          setHasCompletedProfile(Boolean(data.hasCompletedProfile));

          // If API supports kinds, prefill them; otherwise default to LECTURE
          const prefilled: Choice[] =
            data.choices?.length
              ? data.choices.map((c: any) => ({
                  subject: c.subject,
                  kind: c.kind === "LAB" ? "LAB" : "LECTURE",
                }))
              : Array.isArray(data.subjects)
              ? data.subjects.map((s: string) => ({
                  subject: s,
                  kind: "LECTURE",
                }))
              : [];

          setChoices(prefilled);
        }
      } catch (e) {
        console.error("Failed to load subjects:", e);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const addChoice = () => {
    setError(null);
    const subject = subjectInput.trim();
    if (!subject) {
      setError("Please enter a subject name.");
      return;
    }
    const exists = choices.some(
      (c) => c.subject.toLowerCase() === subject.toLowerCase()
    );
    if (exists) {
      setError("Subject already added.");
      return;
    }
    setChoices((prev) => [...prev, { subject, kind: kindInput }]);
    setSubjectInput("");
  };

  const removeChoice = (subject: string) => {
    setChoices((prev) => prev.filter((c) => c.subject !== subject));
  };

  const handleSave = async () => {
    if (choices.length === 0) {
      setError("Add at least one subject before continuing.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      // Send subjects plus kind to backend
      const res = await fetch("/api/user/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          choices,
          markCompleted: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save profile.");
      }

      // Navigate to subjects page on success
      router.push("/subjects");
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    const { signOut } = await import("next-auth/react");
    await signOut({ redirect: false });
    router.push("/");
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-800">Labmate</h1>
        </div>

        <nav className="px-3 space-y-1">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => router.push(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                item.active
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </button>
          ))}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </nav>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-auto p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Profile Setup</h1>
          <p className="text-gray-500 mt-1">
            Add your subjects and mark each as a regular lecture or lab experiment.
          </p>
        </div>

        {!hasCompletedProfile && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              You’re almost there — set up your subjects to personalize your workspace.
            </p>
          </div>
        )}

        {/* Add Subject Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Add a subject
          </h2>

          {error && (
            <div className="mb-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject name
              </label>
              <input
                type="text"
                value={subjectInput}
                onChange={(e) => setSubjectInput(e.target.value)}
                placeholder="e.g., Physics, Data Structures, Organic Chem"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setKindInput("LECTURE")}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition ${
                    kindInput === "LECTURE"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  Lecture
                </button>
                <button
                  type="button"
                  onClick={() => setKindInput("LAB")}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition ${
                    kindInput === "LAB"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <FlaskConical className="w-4 h-4" />
                  Lab
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={addChoice}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add subject
            </button>

            {/* Quick suggestions */}
            <div className="flex flex-wrap gap-2">
              {["Physics", "Chemistry", "Biology", "Mathematics"].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSubjectInput(s);
                    setKindInput("LECTURE");
                  }}
                  className="text-sm px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Current Selections */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Your subjects ({choices.length})
            </h2>
            <button
              onClick={handleSave}
              disabled={saving || choices.length === 0}
              className={`px-5 py-2 rounded-lg font-medium transition-colors ${
                choices.length === 0 || saving
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {saving ? "Saving..." : "Finish setup"}
            </button>
          </div>

          {loading ? (
            <div className="text-gray-500">Loading...</div>
          ) : choices.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No subjects added yet.
            </div>
          ) : (
            <div className="grid gap-3">
              {choices.map((c) => (
                <div
                  key={c.subject}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg grid place-items-center">
                      {c.kind === "LAB" ? (
                        <FlaskConical className="w-5 h-5 text-blue-600" />
                      ) : (
                        <BookOpen className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">
                        {c.subject}
                      </div>
                      <div className="text-sm">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                            c.kind === "LAB"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {c.kind === "LAB" ? "Lab experiment" : "Lecture"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeChoice(c.subject)}
                    className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => router.push("/subjects")}
              className="text-gray-600 hover:text-gray-800 underline"
            >
              Skip for now
            </button>
            <button
              onClick={handleSave}
              disabled={saving || choices.length === 0}
              className={`px-5 py-2 rounded-lg font-medium transition-colors ${
                choices.length === 0 || saving
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {saving ? "Saving..." : "Finish setup"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}