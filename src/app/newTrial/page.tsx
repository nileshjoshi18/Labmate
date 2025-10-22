"use client";

import { useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  User,
  BookOpen,
  LogOut,
  Bubbles,
  File as FileIcon,
  Download,
  Trash2,
  Clock,
} from "lucide-react";

type SubjectKind = "LECTURE" | "LAB";

interface FileType {
  id: number;
  name: string;
  size: number;
  type: string;
  subject: string;
  experiment: string;
  storagePath: string;
  uploadedAt: string;
}

interface Choice {
  subject: string;
  kind: SubjectKind;
}

export default function LabmateDashboard() {
  const router = useRouter();
  const { data: session } = useSession();

  // Data
  const [hasCompletedProfile, setHasCompletedProfile] = useState(true);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [files, setFiles] = useState<FileType[]>([]);

  // UI state
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const menuItems = [
    { name: "Profile", icon: User, active: true, path: "/newTrial" },
    { name: "Subjects", icon: BookOpen, active: false, path: "/subjects" },
    { name: "Files", icon: Bubbles, active: false, path: "/tasks" },
  ];

  useEffect(() => {
    // Load subjects + types
    (async () => {
      try {
        const res = await fetch("/api/user/subjects");
        const data = await res.json();
        if (res.ok) {
          setHasCompletedProfile(Boolean(data.hasCompletedProfile));
          const subs: string[] = Array.isArray(data.subjects) ? data.subjects : [];
          setSubjects(subs);

          const cs: Choice[] = Array.isArray(data.choices)
            ? data.choices.map((c: any) => ({
                subject: String(c.subject),
                kind: c.kind === "LAB" ? "LAB" : "LECTURE",
              }))
            : subs.map((s) => ({ subject: s, kind: "LECTURE" }));
          setChoices(cs);
        }
      } catch (e) {
        console.error("Error loading subjects:", e);
      }
    })();
  }, []);

  useEffect(() => {
    if (subjects.length) fetchAllFiles();
  }, [subjects]);

  async function fetchAllFiles() {
    setLoadingFiles(true);
    try {
      // Try a single endpoint that returns all files
      let all: FileType[] = [];
      const res = await fetch("/api/files/list");
      if (res.ok) {
        const data = await res.json();
        all = data.files || [];
      } else {
        // Fallback: fetch per subject if your API needs a subject filter
        const results = await Promise.all(
          subjects.map((s) =>
            fetch(`/api/files/list?subject=${encodeURIComponent(s)}`)
              .then((r) => (r.ok ? r.json() : { files: [] }))
              .catch(() => ({ files: [] }))
          )
        );
        all = results.flatMap((r: any) => r.files || []);
        // Deduplicate by id
        const map = new Map<number, FileType>();
        for (const f of all) map.set(f.id, f);
        all = Array.from(map.values());
      }
      setFiles(all);
    } catch (e) {
      console.error("Error loading files:", e);
    } finally {
      setLoadingFiles(false);
    }
  }

  const totals = useMemo(() => {
    const totalSubjects = subjects.length;
    const lectureCount = choices.filter((c) => c.kind === "LECTURE").length;
    const labCount = choices.filter((c) => c.kind === "LAB").length;
    const totalFiles = files.length;
    const totalBytes = files.reduce((sum, f) => sum + (f.size || 0), 0);
    const lastUpload = files.length
      ? new Date(
          Math.max(...files.map((f) => new Date(f.uploadedAt).getTime()))
        )
      : null;
    return { totalSubjects, lectureCount, labCount, totalFiles, totalBytes, lastUpload };
  }, [subjects, choices, files]);

  const recentFiles = useMemo(() => {
    return [...files]
      .sort(
        (a, b) =>
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      )
      .slice(0, 5);
  }, [files]);

  const subjectOverview = useMemo(() => {
    const map = new Map<
      string,
      { count: number; lastUploadedAt: string | null }
    >();
    for (const s of subjects) map.set(s, { count: 0, lastUploadedAt: null });
    for (const f of files) {
      const current = map.get(f.subject) ?? { count: 0, lastUploadedAt: null };
      const newer =
        !current.lastUploadedAt ||
        new Date(f.uploadedAt) > new Date(current.lastUploadedAt)
          ? f.uploadedAt
          : current.lastUploadedAt;
      map.set(f.subject, { count: current.count + 1, lastUploadedAt: newer });
    }
    return Array.from(map.entries()).map(([subject, data]) => ({
      subject,
      ...data,
    }));
  }, [subjects, files]);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  async function handleDownload(file: FileType) {
    try {
      setDownloadingId(file.id);
      const url = `/api/files/download?path=${encodeURIComponent(
        file.storagePath
      )}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.url) {
        window.open(data.url, "_blank");
      } else {
        alert(`Download failed: ${data.error || "Unknown error"}`);
      }
    } catch (e) {
      console.error("Download error:", e);
      alert("Download failed. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(file: FileType) {
    if (!confirm(`Delete "${file.name}"?`)) return;
    try {
      setDeletingId(file.id);
      const res = await fetch(`/api/files/delete?id=${file.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    } catch (e) {
      console.error("Delete error:", e);
      alert("Delete failed. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function formatDate(dateString?: string | null) {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-800">Labmate</h1>
        </div>

        <nav className="px-3 space-y-1">
          {menuItems.map((item, index) => (
            <button
              key={index}
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

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">
          {/* Banner */}
          {!hasCompletedProfile && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
                ⚠️ Complete your profile to set up subjects and types.{" "}
                <button
                  onClick={() => router.push("/profile-setup")}
                  className="font-semibold underline"
                >
                  Complete now
                </button>
              </p>
            </div>
          )}

          {/* Profile Header */}
          <div className="bg-white rounded-2xl shadow-sm p-8 mb-6">
            <div className="flex flex-col md:flex-row md:items-start gap-8">
              {/* Avatar */}
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center overflow-hidden shadow-lg">
                  {session?.user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={session.user.image}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-16 h-16 text-white" />
                  )}
                </div>
              </div>

              {/* Info + Actions */}
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-800 mb-1">
                      {session?.user?.name || "User"}
                    </h2>
                    <p className="text-gray-500">{session?.user?.email}</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push("/profile-setup")}
                      className="px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-100"
                    >
                      Edit subjects
                    </button>
                    <button
                      onClick={() => router.push("/subjects")}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Go to subjects
                    </button>
                    <button
                      onClick={() => router.push("/tasks")}
                      className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                    >
                      View files
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
                  <Stat label="Subjects" value={totals.totalSubjects} />
                  <Stat label="Lectures" value={totals.lectureCount} />
                  <Stat label="Labs" value={totals.labCount} />
                  <Stat label="Total uploads" value={totals.totalFiles} />
                  <Stat
                    label="Storage used"
                    value={formatFileSize(totals.totalBytes)}
                  />
                  <Stat
                    label="Last upload"
                    value={
                      totals.lastUpload ? formatDate(totals.lastUpload.toISOString()) : "—"
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Recent uploads */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-800">
                Recent uploads
              </h3>
              <button
                onClick={fetchAllFiles}
                className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-100 text-sm"
              >
                Refresh
              </button>
            </div>

            {loadingFiles ? (
              <div className="text-gray-500 py-8 text-center">Loading...</div>
            ) : recentFiles.length === 0 ? (
              <div className="text-gray-500 py-8 text-center">
                No uploads yet.
              </div>
            ) : (
              <div className="space-y-3">
                {recentFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg grid place-items-center">
                        <FileIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-800 truncate">
                          {file.name}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                            {file.subject}
                          </span>
                          <span className="font-medium text-blue-600">
                            {file.experiment}
                          </span>
                          <span>{formatFileSize(file.size)}</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatDate(file.uploadedAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownload(file)}
                        disabled={downloadingId === file.id}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                      >
                        <Download className="w-4 h-4" />
                        {downloadingId === file.id ? "Downloading..." : "Download"}
                      </button>
                      <button
                        onClick={() => handleDelete(file)}
                        disabled={deletingId === file.id}
                        className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 disabled:opacity-60"
                      >
                        <Trash2 className="w-4 h-4" />
                        {deletingId === file.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subjects overview */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Subjects overview
            </h3>
            {subjects.length === 0 ? (
              <div className="text-gray-500 py-8 text-center">
                No subjects configured.{" "}
                <button
                  onClick={() => router.push("/profile-setup")}
                  className="text-blue-600 underline"
                >
                  Set up now
                </button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {subjectOverview.map((s) => (
                  <div
                    key={s.subject}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-gray-800">
                        {s.subject}
                      </div>
                      <div className="text-sm text-gray-500">
                        {s.count} file{s.count === 1 ? "" : "s"}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Last upload: {formatDate(s.lastUploadedAt)}
                    </div>
                    <div className="mt-3">
                      <button
                        onClick={() => router.push("/subjects")}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Open subject →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-lg font-bold text-gray-800">{value}</p>
    </div>
  );
}