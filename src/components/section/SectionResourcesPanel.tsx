import { useState } from "react";

import {

  Plus,

  Link as LinkIcon,

  FileText,

  Trash2,

  ExternalLink,

  Download,

  Eye,

  Pencil,

  X,

  Check,

} from "lucide-react";

import { toast } from "sonner";

import { useSectionResources } from "@/hooks/useSectionResources";

import { api, openStoredFile } from "@/lib/api";

import { useUserStats } from "@/hooks/useUserStats";

import { RefreshButton } from "@/components/ui/refresh-button";



export function SectionResourcesPanel({

  courseCode,

  sectionLabel,

}: {

  courseCode: string;

  sectionLabel: string;

}) {

  const { profile } = useUserStats();

  const isFaculty = profile.role === "faculty" || profile.role === "admin";

  const { resources, loading, isFetching, refresh, createResource, deleteResource, updateResource } =

    useSectionResources(courseCode, sectionLabel);

  const [title, setTitle] = useState("");

  const [url, setUrl] = useState("");

  const [uploading, setUploading] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [editTitle, setEditTitle] = useState("");

  const [editUrl, setEditUrl] = useState("");



  const handleLink = async (e: React.FormEvent) => {

    e.preventDefault();

    if (!title.trim() || !url.trim()) return;

    try {

      await createResource({

        title: title.trim(),

        resource_kind: "link",

        external_url: url.trim(),

        mime_category: "other",

      });

      setTitle("");

      setUrl("");

      toast.success("Link added");

    } catch {

      toast.error("Could not add link");

    }

  };



  const handleFile = async (file: File) => {

    setUploading(true);

    try {

      const up = await api.uploadFile(file, "resources");

      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

      const mime =

        ext === "pdf"

          ? "pdf"

          : ext === "pptx" || ext === "ppt"

            ? "pptx"

            : ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)

              ? "image"

              : ["doc", "docx", "md"].includes(ext)

                ? "doc"

                : "other";

      await createResource({

        title: file.name,

        resource_kind: "file",

        file_id: up.file_id,

        mime_category: mime,

      });

      toast.success("File uploaded");

    } catch {

      toast.error("Upload failed");

    } finally {

      setUploading(false);

    }

  };



  const startEdit = (r: (typeof resources)[0]) => {

    setEditingId(r.id);

    setEditTitle(r.title);

    setEditUrl(r.external_url ?? "");

  };



  const handleOpenFile = async (
    fileId: number,
    filename: string,
    mode: "view" | "download"
  ) => {
    try {
      await openStoredFile(fileId, filename, mode);
    } catch {
      toast.error(mode === "view" ? "Could not open file" : "Could not download file");
    }
  };

  const saveEdit = async (id: number, kind: "file" | "link") => {

    try {

      await updateResource(id, {

        title: editTitle.trim(),

        ...(kind === "link" ? { external_url: editUrl.trim() } : {}),

      });

      setEditingId(null);

      toast.success("Resource updated");

    } catch {

      toast.error("Could not update resource");

    }

  };



  return (

    <div className="space-y-4">

      <div className="flex justify-end">

        <RefreshButton onClick={refresh} loading={isFetching} />

      </div>

      {isFaculty && (

        <div className="rounded-2xl border border-[#dce5d4] bg-[#faf8f3] p-4 space-y-4 shadow-sm">

          <h3 className="text-sm font-bold text-slate-800">Add resource</h3>

          <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-[#dce5d4] cursor-pointer hover:bg-white text-xs font-semibold text-slate-600 w-fit transition">

            <Plus className="w-4 h-4 text-[#7d9b76]" />

            {uploading ? "Uploading…" : "Upload file (PDF, PPTX, image, doc)"}

            <input

              type="file"

              className="hidden"

              accept=".pdf,.ppt,.pptx,.doc,.docx,.md,.png,.jpg,.jpeg,.gif,.webp"

              onChange={(e) => {

                const f = e.target.files?.[0];

                if (f) void handleFile(f);

              }}

            />

          </label>

          <form onSubmit={handleLink} className="flex flex-wrap gap-2">

            <input

              value={title}

              onChange={(e) => setTitle(e.target.value)}

              placeholder="Link title"

              className="flex-1 min-w-[120px] h-9 px-3 rounded-xl border border-[#dce5d4] bg-white text-xs"

            />

            <input

              value={url}

              onChange={(e) => setUrl(e.target.value)}

              placeholder="https://…"

              className="flex-[2] min-w-[160px] h-9 px-3 rounded-xl border border-[#dce5d4] bg-white text-xs"

            />

            <button

              type="submit"

              className="h-9 px-4 rounded-xl bg-[#7d9b76] hover:bg-[#6b8865] text-white text-xs font-bold transition"

            >

              Add link

            </button>

          </form>

        </div>

      )}



      {loading ? (

        <p className="text-sm text-slate-500">Loading resources…</p>

      ) : resources.length === 0 ? (

        <div className="rounded-2xl border border-dashed border-[#dce5d4] p-10 text-center text-sm text-slate-400">

          No resources yet.

        </div>

      ) : (

        <ul className="space-y-2">

          {resources.map((r) => {

            const href = r.file_url ?? r.external_url;

            const isEditing = editingId === r.id;

            return (

              <li

                key={r.id}

                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-[#dce5d4] bg-white shadow-sm"

              >

                {isEditing ? (

                  <div className="flex-1 flex flex-wrap gap-2">

                    <input

                      value={editTitle}

                      onChange={(e) => setEditTitle(e.target.value)}

                      className="flex-1 min-w-[140px] h-9 px-3 rounded-lg border text-xs"

                    />

                    {r.resource_kind === "link" && (

                      <input

                        value={editUrl}

                        onChange={(e) => setEditUrl(e.target.value)}

                        className="flex-[2] min-w-[160px] h-9 px-3 rounded-lg border text-xs"

                      />

                    )}

                  </div>

                ) : (

                  <div className="flex items-center gap-2 min-w-0 flex-1">

                    {r.resource_kind === "link" ? (

                      <LinkIcon className="w-4 h-4 text-sky-600 shrink-0" />

                    ) : (

                      <FileText className="w-4 h-4 text-rose-600 shrink-0" />

                    )}

                    <div className="min-w-0">

                      <span className="text-sm font-semibold text-slate-800 truncate block">

                        {r.title}

                      </span>

                      <span className="text-[10px] uppercase text-slate-400">

                        {r.mime_category}

                        {r.original_filename ? ` · ${r.original_filename}` : ""}

                      </span>

                    </div>

                  </div>

                )}

                <div className="flex items-center gap-1.5 shrink-0">

                  {isEditing ? (

                    <>

                      <button

                        type="button"

                        onClick={() => void saveEdit(r.id, r.resource_kind)}

                        className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-700"

                        title="Save"

                      >

                        <Check className="w-3.5 h-3.5" />

                      </button>

                      <button

                        type="button"

                        onClick={() => setEditingId(null)}

                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"

                        title="Cancel"

                      >

                        <X className="w-3.5 h-3.5" />

                      </button>

                    </>

                  ) : (

                    <>

                      {r.resource_kind === "file" && r.file_id ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              void handleOpenFile(
                                r.file_id!,
                                r.original_filename ?? r.title,
                                "view"
                              )
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-[#7d9b76] hover:bg-[#f5f8f2] transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void handleOpenFile(
                                r.file_id!,
                                r.original_filename ?? r.title,
                                "download"
                              )
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 border border-[#dce5d4] transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </button>
                        </>
                      ) : href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 border border-[#dce5d4] transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open link
                        </a>
                      ) : null}

                      {isFaculty && (

                        <>

                          <button

                            type="button"

                            onClick={() => startEdit(r)}

                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"

                            title="Edit"

                          >

                            <Pencil className="w-3.5 h-3.5" />

                          </button>

                          <button

                            type="button"

                            onClick={() => void deleteResource(r.id)}

                            className="p-2 rounded-lg hover:bg-rose-50 text-rose-600"

                            title="Delete"

                          >

                            <Trash2 className="w-3.5 h-3.5" />

                          </button>

                        </>

                      )}

                    </>

                  )}

                </div>

              </li>

            );

          })}

        </ul>

      )}

    </div>

  );

}

