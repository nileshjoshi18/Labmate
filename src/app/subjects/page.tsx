"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Upload,
  File,
  User,
  BookOpen,
  LogOut,
  ListTodo,
  Download,
  Clock,
  Trash2,
  Plus,
  Pencil,
  FlaskConical,
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

type SubjectKind = "LECTURE" | "LAB";

export default function SubjectsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [experiment, setExperiment] = useState("");
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<FileType[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasCompletedProfile, setHasCompletedProfile] = useState(true);

  // Add-project modal state
  const [addOpen, setAddOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newKind, setNewKind] = useState<SubjectKind>("LECTURE");
  const [savingSubject, setSavingSubject] = useState(false);

  const menuItems = [
    { name: "Profile", icon: User, active: false, path: "/newTrial" },
    { name: "Subjects", icon: BookOpen, active: true, path: "/subjects" },
    { name: "Files", icon: ListTodo, active: false, path: "/tasks" },
  ];

  // Fetch user's subjects on mount
  useEffect(() => {
    fetchUserSubjects();
  }, []);

  // Fetch files when subject changes
  useEffect(() => {
    if (selectedSubject) {
      fetchFiles();
    }
  }, [selectedSubject]);

  const fetchUserSubjects = async () => {
    try {
      const response = await fetch("/api/user/subjects");
      const data = await response.json();

      if (response.ok) {
        setSubjects(data.subjects || []);
        setSelectedSubject(data.subjects?.[0] || ""); // Select first subject
        setHasCompletedProfile(Boolean(data.hasCompletedProfile));
      }
    } catch (error) {
      console.error("Error fetching subjects:", error);
      // Fallback to default subjects
      setSubjects(["Physics", "Chemistry", "Biology", "Mathematics"]);
      setSelectedSubject("Physics");
    }
  };

  const handleLogout = async () => {
    const { signOut } = await import("next-auth/react");
    await signOut({ redirect: false });
    router.push("/");
  };

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/files/list?subject=${encodeURIComponent(selectedSubject)}`
      );
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!experiment.trim()) {
      alert("Please enter an experiment/task name");
      return;
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(
        `File too large (${(file.size / 1024 / 1024).toFixed(2)} MB). Maximum size is 50MB.`
      );
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("subject", selectedSubject);
    formData.append("experiment", experiment);

    try {
      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        alert("File uploaded successfully!");
        setExperiment("");
        fetchFiles();
        e.target.value = "";
      } else {
        alert(`Upload failed: ${data.error}`);
      }
    } catch (error) {
      alert("Upload error. Please try again.");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (file: FileType) => {
    try {
      const url = `/api/files/download?path=${encodeURIComponent(file.storagePath)}`;
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok && data.url) {
        window.open(data.url, "_blank");
      } else {
        alert(`Download failed: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Download error:", error);
      alert("Download failed. Please try again.");
    }
  };

  const handleDelete = async (file: FileType) => {
    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/files/delete?id=${file.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        alert("File deleted successfully!");
        fetchFiles();
      } else {
        alert(`Delete failed: ${data.error}`);
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Delete failed. Please try again.");
    }
  };

  // Create a new subject/project by appending to existing choices
  const handleCreateSubject = async () => {
    const subject = newSubject.trim();
    if (!subject) {
      alert("Please enter a subject/project name.");
      return;
    }

    setSavingSubject(true);
    try {
      // Load current choices
      const res = await fetch("/api/user/subjects");
      const data = await res.json();
      const existingChoices: { subject: string; kind: SubjectKind }[] =
        Array.isArray(data?.choices)
          ? data.choices
          : Array.isArray(data?.subjects)
          ? data.subjects.map((s: string) => ({ subject: s, kind: "LECTURE" }))
          : [];

      // Deduplicate by subject (case-insensitive)
      const exists = existingChoices.some(
        (c) => c.subject.toLowerCase() === subject.toLowerCase()
      );
      if (exists) {
        alert("This subject already exists.");
        setSavingSubject(false);
        return;
      }

      const newChoices = [...existingChoices, { subject, kind: newKind }];

      const post = await fetch("/api/user/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choices: newChoices, markCompleted: true }),
      });
      const out = await post.json();
      if (!post.ok) throw new Error(out.error || out.detail || "Failed to save.");

      setAddOpen(false);
      setNewSubject("");
      setNewKind("LECTURE");
      await fetchUserSubjects();
      setSelectedSubject(subject);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to add subject. Try again.");
    } finally {
      setSavingSubject(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
        {/* Show banner if profile not completed */}
        {!hasCompletedProfile && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">
              ⚠️ Complete your profile to customize your subjects!{" "}
              <button
                onClick={() => router.push("/profile-setup")}
                className="font-semibold underline"
              >
                Complete now
              </button>
            </p>
          </div>
        )}

        {/* Header + Actions */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">My Subjects</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/profile-setup")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
              title="Edit subjects you have added"
            >
              <Pencil className="w-4 h-4" />
              Edit subjects
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              title="Add another project/subject"
            >
              <Plus className="w-4 h-4" />
              Add project
            </button>
          </div>
        </div>

        {/* Subject Tabs */}
        {subjects.length > 0 ? (
          <div className="flex gap-2 mb-6 flex-wrap">
            {subjects.map((subject) => (
              <button
                key={subject}
                onClick={() => setSelectedSubject(subject)}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  selectedSubject === subject
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                {subject}
              </button>
            ))}
            {/* Quick Add from tabs */}
            <button
              onClick={() => setAddOpen(true)}
              className="px-6 py-3 rounded-lg font-medium border-2 border-dashed border-gray-300 text-gray-700 hover:bg-gray-50"
              title="Add another project/subject"
            >
              <span className="inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add project
              </span>
            </button>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No subjects configured yet</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push("/profile-setup")}
                className="px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Edit subjects
              </button>
              <button
                onClick={() => setAddOpen(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add project
              </button>
            </div>
          </div>
        )}

        {/* Upload + Files */}
        {selectedSubject && (
          <>
            {/* Upload Section */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Upload File for {selectedSubject}
              </h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Experiment/Task Name
                </label>
                <input
                  type="text"
                  value={experiment}
                  onChange={(e) => setExperiment(e.target.value)}
                  placeholder="e.g., Experiment 1, Lab 5, Assignment 3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
                <Upload
                  className={`w-12 h-12 mb-4 ${uploading ? "text-blue-600 animate-pulse" : "text-gray-400"}`}
                />
                <span className="text-lg font-medium text-gray-700 mb-1">
                  {uploading
                    ? "Uploading..."
                    : "Click to upload or drag and drop"}
                </span>
                <span className="text-sm text-gray-500">Max file size: 50MB</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            </div>

            {/* Files List */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Uploaded Files ({files.length})
              </h2>

              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  Loading files...
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <File className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>No files uploaded yet for {selectedSubject}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <File className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-800">
                            {file.name}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                            <span className="font-medium text-blue-600">
                              {file.experiment}
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
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                        <button
                          onClick={() => handleDelete(file)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Add Project/Subject Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Add project/subject
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="e.g., Physics, Organic Chem, Capstone"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setNewKind("LECTURE")}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition ${
                      newKind === "LECTURE"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                    type="button"
                  >
                    <BookOpen className="w-4 h-4" />
                    Lecture
                  </button>
                  <button
                    onClick={() => setNewKind("LAB")}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition ${
                      newKind === "LAB"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                    type="button"
                  >
                    <FlaskConical className="w-4 h-4" />
                    Lab
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setAddOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSubject}
                disabled={savingSubject}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {savingSubject ? "Saving..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}