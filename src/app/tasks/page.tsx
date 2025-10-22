"use client";

import { useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  User,
  BookOpen,
  LogOut,
  File as FileIcon,
  Download,
  Trash2,
  Clock,
  Search,
} from "lucide-react";

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

export default function LabmateDashboard() {
  const router = useRouter();
  const { data: session } = useSession();

  const [files, setFiles] = useState<FileType[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const menuItems = [
    { name: "Profile", icon: User, active: false, path: "/newTrial" },
    { name: "Subjects", icon: BookOpen, active: false, path: "/subjects" },
    { name: "Files", icon: FileIcon, active: true, path: "/tasks" }, // current page
  ];

  useEffect(() => {
    fetchFiles();
  }, []);

  const subjects = useMemo(() => {
    const set = new Set<string>();
    files.forEach((f) => set.add(f.subject));
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [files]);

  const visibleFiles = useMemo(() => {
    let list = files;
    if (selectedSubject !== "All") {
      list = list.filter((f) => f.subject === selectedSubject);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.experiment.toLowerCase().includes(q) ||
          f.subject.toLowerCase().includes(q) ||
          f.type.toLowerCase().includes(q)
      );
    }
    // Sort newest first
    return [...list].sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }, [files, selectedSubject, search]);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  async function fetchFiles() {
    setLoading(true);
    try {
      // If your API supports subject filtering, you can append ?subject=...
      const res = await fetch("/api/files/list");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load files");
      setFiles(data.files || []);
    } catch (e) {
      console.error("Error fetching files:", e);
    } finally {
      setLoading(false);
    }
  }

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
    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) return;

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

  function formatDate(dateString: string) {
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
      <div className="flex-1 overflow-auto p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Uploaded Files</h1>
            <p className="text-gray-500 mt-1">Browse, search, download, or delete your uploads.</p>
          </div>
          <button
            onClick={fetchFiles}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between mb-6">
          {/* Subject filter */}
          <div className="flex gap-2 flex-wrap">
            {subjects.map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSubject(s)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedSubject === s
                    ? "bg-blue-600 text-white shadow"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, experiment, subject..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Files List */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Files ({visibleFiles.length})
          </h2>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading files...</div>
          ) : visibleFiles.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>No files found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-800 truncate">
                        {file.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
                        <span className="font-medium text-blue-600 truncate">
                          {file.experiment}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          {file.subject}
                        </span>
                        <span>{formatFileSize(file.size)}</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatDate(file.uploadedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(file)}
                      disabled={downloadingId === file.id}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
                    >
                      <Download className="w-4 h-4" />
                      {downloadingId === file.id ? "Downloading..." : "Download"}
                    </button>
                    <button
                      onClick={() => handleDelete(file)}
                      disabled={deletingId === file.id}
                      className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-60"
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
      </div>
    </div>
  );
}