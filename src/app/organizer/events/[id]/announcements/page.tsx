"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  ChangeEvent,
  DragEvent,
} from "react";
import {
  Send,
  Eye,
  Clock,
  Users,
  Mail,
  Upload,
  X,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useSession } from "@/context/AuthContext";
import { toast } from "react-hot-toast";
import { getEventAnnouncements, createEventAnnouncement, getEventById } from "@/lib/api/events";

// ── Types ─────────────────────────────────────────────────────────────────────

type Audience = "attendees_only" | "custom_only" | "both";

// ── Helpers ───────────────────────────────────────────────────────────────────

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

function extractEmails(text: string): string[] {
  const matches = text.match(EMAIL_REGEX) || [];
  return [...new Set(matches.map((e) => e.toLowerCase().trim()))];
}

// Pre-load mammoth eagerly so it's already cached when the user uploads a .docx
let mammothPromise: Promise<any> | null = null;
function getMammoth() {
  if (!mammothPromise) mammothPromise = import("mammoth");
  return mammothPromise;
}

// Pre-load pdfjs eagerly. The worker is bundled with the app (no CDN) so the
// version always matches and there is nothing extra to block or 404.
let pdfjsPromise: Promise<any> | null = null;
function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist/legacy/build/pdf.mjs" as any).then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();
      return lib;
    });
  }
  return pdfjsPromise;
}

async function parsePdfEmails(file: File): Promise<string[]> {
  const pdfjs = await getPdfjs();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
  }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map((item: any) => item.str).join(" ") + "\n";
  }
  return extractEmails(fullText);
}

async function parseFileEmails(file: File): Promise<string[]> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "docx" || ext === "doc") {
    const mammoth = await getMammoth();
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return extractEmails(result.value);
  }

  if (ext === "pdf") {
    return parsePdfEmails(file);
  }

  // txt / csv — plain text
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(extractEmails((e.target?.result as string) ?? ""));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsText(file);
  });
}

// ── Email Tag Component ───────────────────────────────────────────────────────

function EmailTag({ email, onRemove }: { email: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20 max-w-[220px]">
      <span className="truncate">{email}</span>
      <button
        type="button"
        onClick={onRemove}
        className="flex-shrink-0 hover:text-red-500 transition-colors ml-0.5"
        aria-label={`Remove ${email}`}
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AnnouncementsPage() {
  const params = useParams();
  const id = params?.id as string;
  const { data: session, status } = useSession();

  // ── State ──────────────────────────────────────────────────────────────────
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [event, setEvent] = useState<any | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewRecipientType, setPreviewRecipientType] = useState<"ticket_holder" | "generic">("ticket_holder");

  // Form fields
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<Audience>("attendees_only");

  // Custom email list
  const [customEmails, setCustomEmails] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState("");
  const [manualInputError, setManualInputError] = useState("");

  // File upload
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedEmails, setUploadedEmails] = useState<string[]>([]);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [parseFailed, setParseFailed] = useState(false);
  const [parsingFile, setParsingFile] = useState(false);
  const [showUploadedList, setShowUploadedList] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Computed ───────────────────────────────────────────────────────────────

  // Deduplicated union of manual + uploaded emails
  const allCustomEmails = [...new Set([...customEmails, ...uploadedEmails])];
  const showCustomPanel = audience === "custom_only" || audience === "both";

  const sendLabel = (() => {
    const n = allCustomEmails.length;
    if (audience === "attendees_only") return "Send to All Attendees";
    if (audience === "custom_only") return `Send to ${n} Custom Recipient${n !== 1 ? "s" : ""}`;
    return `Send to All Attendees + ${n} Custom Recipient${n !== 1 ? "s" : ""}`;
  })();

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchAnnouncements = useCallback(async () => {
    if (status === "loading") return;
    if (!session?.accessToken || !id || id === "undefined") return;
    try {
      const [data, eventData] = await Promise.all([
        getEventAnnouncements(session.accessToken as string, id),
        getEventById(session.accessToken as string, id).catch(() => null),
      ]);
      setAnnouncements(data);
      if (eventData) setEvent(eventData);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch announcements");
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, id, status]);

  useEffect(() => {
    fetchAnnouncements();
    // Pre-warm parsers so they're cached before the user uploads
    getMammoth().catch(() => {});
    getPdfjs().catch(() => {});
  }, [fetchAnnouncements]);

  // While the worker is still delivering an announcement, refresh the list so
  // the status badge (queued -> sent/failed) updates without a manual reload.
  useEffect(() => {
    const pending = announcements.some(
      (a) => a.delivery_status === "QUEUED" || a.delivery_status === "SENDING"
    );
    if (!pending) return;
    const timer = setInterval(() => {
      fetchAnnouncements();
    }, 8000);
    return () => clearInterval(timer);
  }, [announcements, fetchAnnouncements]);

  // ── Manual email parsing ───────────────────────────────────────────────────

  function commitManualInput() {
    if (!manualInput.trim()) return;
    const extracted = extractEmails(manualInput);
    const invalid = manualInput
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter((s) => s && !EMAIL_REGEX.test(s));

    if (extracted.length === 0) {
      setManualInputError("No valid email addresses found.");
      return;
    }

    const newEmails = extracted.filter((e) => !customEmails.includes(e));
    setCustomEmails((prev) => [...new Set([...prev, ...extracted])]);
    setManualInput("");
    setManualInputError("");
    if (newEmails.length > 0) {
      toast.success(`${newEmails.length} email${newEmails.length !== 1 ? "s" : ""} added`);
    }
  }

  function handleManualKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      commitManualInput();
    }
  }

  function removeCustomEmail(email: string) {
    setCustomEmails((prev) => prev.filter((e) => e !== email));
  }

  function removeUploadedEmail(email: string) {
    setUploadedEmails((prev) => {
      const next = prev.filter((e) => e !== email);
      setUploadedCount(next.length);
      return next;
    });
  }

  // ── File handling ──────────────────────────────────────────────────────────

  async function processFile(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const allowed = ["docx", "doc", "pdf", "txt", "csv"];
    if (!allowed.includes(ext)) {
      toast.error("Please upload a .docx, .doc, .txt, or .csv file.");
      return;
    }

    setParsingFile(true);
    setParseFailed(false);
    setUploadedFileName(file.name);
    setUploadedEmails([]);
    setUploadedCount(0);
    setShowUploadedList(false);

    try {
      const emails = await parseFileEmails(file);
      setUploadedEmails(emails);
      setUploadedCount(emails.length);
      if (emails.length === 0) {
        toast("No email addresses found in that file.", { icon: "⚠️" });
      } else {
        toast.success(`${emails.length} email${emails.length !== 1 ? "s" : ""} found in file`);
      }
    } catch (err) {
      console.error("Could not parse recipient file:", err);
      setParseFailed(true);
      toast.error(
        ext === "pdf"
          ? "Could not read that PDF. If it is a scanned image, export the list as .csv or .txt and upload again."
          : "Could not read the file. Try saving as .txt and uploading again."
      );
    } finally {
      setParsingFile(false);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function clearFile() {
    setUploadedFileName(null);
    setUploadedEmails([]);
    setUploadedCount(0);
    setShowUploadedList(false);
    setParseFailed(false);
  }

  // ── Preview and Submit ─────────────────────────────────────────────────────

  function handleOpenPreview(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("Please enter both an announcement title and message.");
      return;
    }

    if (audience !== "attendees_only" && allCustomEmails.length === 0) {
      toast.error("Add at least one custom recipient email.");
      return;
    }

    setShowPreviewModal(true);
  }

  async function handleSendConfirmed() {
    if (!title || !message) return;

    if (audience !== "attendees_only" && allCustomEmails.length === 0) {
      toast.error("Add at least one custom recipient email.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createEventAnnouncement(session?.accessToken as string, id, {
        title,
        message,
        audience,
        custom_recipients: audience === "attendees_only" ? [] : allCustomEmails,
      });

      const recipientText =
        audience === "attendees_only"
          ? "all attendees"
          : audience === "custom_only"
          ? `${allCustomEmails.length} custom recipient${allCustomEmails.length !== 1 ? "s" : ""}`
          : `all attendees + ${allCustomEmails.length} custom recipient${allCustomEmails.length !== 1 ? "s" : ""}`;

      const count = (created as any)?.recipients_count;
      if ((created as any)?.delivery_status === "FAILED") {
        toast.error(
          `Announcement saved, but delivery failed: ${
            (created as any)?.delivery_error || "unknown error"
          }`
        );
      } else if ((created as any)?.dispatch === "sent") {
        toast.success(
          `Announcement sent to ${count ?? recipientText} recipient${count === 1 ? "" : "s"}!`
        );
      } else {
        toast.success(
          `Announcement queued for ${count ?? recipientText} recipient${
            count === 1 ? "" : "s"
          }! Delivery usually completes within a minute.`
        );
      }
      setTitle("");
      setMessage("");
      setAudience("attendees_only");
      setCustomEmails([]);
      setManualInput("");
      clearFile();
      setShowPreviewModal(false);
      fetchAnnouncements();
    } catch (err: any) {
      toast.error(err.message || "Failed to send announcement");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-muted-foreground">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        Loading announcements...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">Event Announcements</h1>

      {/* ── Compose Card ── */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-5">Send New Announcement</h2>

        <form onSubmit={handleOpenPreview} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2 text-foreground focus:outline-none focus:border-primary transition-colors"
              placeholder="e.g. Schedule Update"
              required
              disabled={submitting}
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground min-h-[120px] focus:outline-none focus:border-primary transition-colors resize-y"
              placeholder="Type your message to attendees..."
              required
              disabled={submitting}
            />
          </div>

          {/* ── Audience Selector ── */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Who should receive this?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(
                [
                  {
                    value: "attendees_only",
                    icon: <Users className="w-4 h-4" />,
                    label: "All Ticketed Attendees",
                    desc: "Everyone who purchased a ticket",
                  },
                  {
                    value: "custom_only",
                    icon: <Mail className="w-4 h-4" />,
                    label: "Custom Email List",
                    desc: "Only the emails you specify",
                  },
                  {
                    value: "both",
                    icon: (
                      <span className="flex gap-0.5">
                        <Users className="w-3.5 h-3.5" />
                        <Mail className="w-3.5 h-3.5" />
                      </span>
                    ),
                    label: "Both",
                    desc: "Attendees + custom recipients",
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAudience(opt.value)}
                  disabled={submitting}
                  className={`flex flex-col items-start gap-1 p-3 rounded-xl border-2 text-left transition-all disabled:opacity-50 ${
                    audience === opt.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-background text-foreground hover:border-primary/40"
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-medium text-sm">
                    {opt.icon}
                    {opt.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Custom Email Panel ── */}
          {showCustomPanel && (
            <div className="rounded-xl border border-border bg-background/60 p-4 space-y-4">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                Custom Recipients
              </p>

              {/* Manual Input */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Enter emails manually
                  <span className="ml-1 text-muted-foreground/60 font-normal">
                    (comma, space, or Enter to add)
                  </span>
                </label>
                <div className="flex gap-2">
                  <textarea
                    value={manualInput}
                    onChange={(e) => {
                      setManualInput(e.target.value);
                      setManualInputError("");
                    }}
                    onKeyDown={handleManualKeyDown}
                    rows={2}
                    placeholder="john@example.com, jane@example.com"
                    className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors resize-none"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={commitManualInput}
                    disabled={!manualInput.trim() || submitting}
                    className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors self-start"
                  >
                    Add
                  </button>
                </div>
                {manualInputError && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {manualInputError}
                  </p>
                )}
              </div>

              {/* Email Tags */}
              {customEmails.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {customEmails.length} manually added
                    </span>
                    <button
                      type="button"
                      onClick={() => setCustomEmails([])}
                      className="text-xs text-red-500 hover:text-red-600 transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {customEmails.map((email) => (
                      <EmailTag
                        key={email}
                        email={email}
                        onRemove={() => removeCustomEmail(email)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* File Upload Zone */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-muted-foreground">
                  Or import from a file
                  <span className="ml-1 text-muted-foreground/60 font-normal">
                    (.docx, .doc, .pdf, .txt, .csv)
                  </span>
                </label>

                {!uploadedFileName ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all ${
                      isDragOver
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-primary/[0.02]"
                    }`}
                  >
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm text-foreground font-medium">
                        Drag & drop or click to upload
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Emails will be extracted automatically
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".docx,.doc,.pdf,.txt,.csv"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-card p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm text-foreground truncate font-medium">
                          {uploadedFileName}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={clearFile}
                        className="text-muted-foreground hover:text-red-500 transition-colors ml-2 flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {parsingFile ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
                        Extracting emails…
                      </div>
                    ) : parseFailed ? (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Failed to read file. If it is a scanned PDF, upload a .csv or .txt instead.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            {uploadedCount} unique email{uploadedCount !== 1 ? "s" : ""} found
                          </span>
                          {uploadedCount > 0 && (
                            <button
                              type="button"
                              onClick={() => setShowUploadedList((v) => !v)}
                              className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {showUploadedList ? (
                                <>Hide <ChevronUp className="w-3 h-3" /></>
                              ) : (
                                <>Preview <ChevronDown className="w-3 h-3" /></>
                              )}
                            </button>
                          )}
                        </div>

                        {showUploadedList && uploadedEmails.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                            {uploadedEmails.map((email) => (
                              <EmailTag
                                key={email}
                                email={email}
                                onRemove={() => removeUploadedEmail(email)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Total count badge */}
              {allCustomEmails.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/8 border border-primary/20">
                  <Mail className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium text-primary">
                    {allCustomEmails.length} total unique recipient{allCustomEmails.length !== 1 ? "s" : ""} in custom list
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Preview and Send Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 gap-2 shadow-sm"
            >
              <Eye className="w-4 h-4" />
              Preview and Send
            </button>
          </div>
        </form>
      </div>

      {/* ── Past Announcements ── */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Past Announcements</h3>

        {announcements.length === 0 && (
          <div className="py-10 text-center text-muted-foreground bg-card border border-border rounded-2xl">
            No announcements have been sent yet.
          </div>
        )}

        {announcements.map((ann) => {
          const status = (ann.delivery_status || '') as string;
          const statusMeta: Record<string, { label: string; className: string }> = {
            QUEUED: { label: 'Queued', className: 'bg-secondary text-muted-foreground' },
            SENDING: { label: 'Sending…', className: 'bg-amber-500/10 text-amber-600' },
            SENT: { label: 'Delivered', className: 'bg-emerald-500/10 text-emerald-600' },
            PARTIAL: { label: 'Partly delivered', className: 'bg-amber-500/10 text-amber-600' },
            FAILED: { label: 'Failed', className: 'bg-red-500/10 text-red-600' },
            NO_RECIPIENTS: { label: 'No recipients', className: 'bg-red-500/10 text-red-600' },
          };
          const meta = statusMeta[status];
          return (
            <div key={ann.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-start mb-2 gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-foreground">{ann.title}</h4>
                  {meta && (
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${meta.className}`}>
                      {meta.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center text-xs text-muted-foreground whitespace-nowrap">
                  <Clock className="w-3 h-3 mr-1" />
                  {new Date(ann.created_at).toLocaleString()}
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {ann.message}
              </p>
              {typeof ann.recipients_count === 'number' && ann.recipients_count > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  {typeof ann.delivered_count === 'number' && ann.delivered_count > 0
                    ? `Delivered to ${ann.delivered_count} of ${ann.recipients_count} recipients`
                    : `Sent to ${ann.recipients_count} recipient${ann.recipients_count === 1 ? '' : 's'}`}
                </p>
              )}
              {ann.delivery_error && (
                <p className="mt-2 text-xs text-red-500 break-words whitespace-pre-wrap">
                  {ann.delivery_error}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Preview and Send Modal ── */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-card shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-foreground">Announcement Email Preview</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Review the layout and greeting before sending to your recipients.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                disabled={submitting}
                className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Recipient Greeting Switcher */}
            <div className="px-4 py-2.5 bg-secondary/40 border-b border-border flex flex-wrap items-center justify-between gap-2 shrink-0">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Preview Greeting As:
              </span>
              <div className="inline-flex rounded-lg p-0.5 bg-secondary border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewRecipientType("ticket_holder")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    previewRecipientType === "ticket_holder"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Ticket Holder (&ldquo;Hello Jubril,&rdquo;)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewRecipientType("generic")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    previewRecipientType === "generic"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Waitlist / Custom (&ldquo;Hello there,&rdquo;)
                </button>
              </div>
            </div>

            {/* Email Canvas (Light Mode styled email frame matching reference) */}
            <div className="p-3 sm:p-5 overflow-y-auto bg-gray-100 flex justify-center">
              <div className="w-full max-w-[440px] bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden text-gray-900 font-sans">
                {/* Header with CirclePass Logo */}
                <div className="pt-4 pb-2 px-5 text-center">
                  <div className="inline-flex items-center justify-center gap-2">
                    <img src="/logo.png" alt="CirclePass Logo" className="w-6 h-6 object-contain" />
                    <span className="font-['Fredoka',sans-serif] text-xl font-bold text-gray-900 tracking-tight">
                      CirclePass
                    </span>
                  </div>
                  <div className="text-[9px] font-bold tracking-[2px] text-gray-500 uppercase mt-0.5">
                    YOUR PASS TO THE NEXT EXPERIENCE
                  </div>
                </div>

                {/* Event Banner (compact & uncropped so all words and details show) */}
                {event?.cover_image ? (
                  <div className="px-4 flex justify-center">
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-1.5 max-w-[300px] w-full flex items-center justify-center">
                      <img
                        src={event.cover_image}
                        alt={event.title || "Event Banner"}
                        className="max-h-[160px] w-auto max-w-full object-contain rounded-lg block"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="px-4 flex justify-center">
                    <div className="max-w-[300px] w-full h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white/90 p-3 text-center font-bold text-sm">
                      {event?.title || "Event Banner"}
                    </div>
                  </div>
                )}

                {/* Event Name */}
                <div className="px-5 pt-2.5 pb-1 text-center">
                  <h1 className="text-base sm:text-lg font-bold text-indigo-950 leading-tight">
                    {event?.title || "Event Name"}
                  </h1>
                </div>

                {/* Content Card */}
                <div className="p-3.5 mx-3.5 mb-3 rounded-xl border border-gray-200 bg-white shadow-sm">
                  {/* Greeting */}
                  <div className="text-xs sm:text-sm font-bold text-gray-900 mb-2">
                    {previewRecipientType === "ticket_holder" ? "Hello Jubril," : "Hello there,"}
                  </div>

                  {/* Title */}
                  <h2 className="text-sm sm:text-base font-bold text-gray-900 leading-snug mb-1.5">
                    {title}
                  </h2>

                  {/* Message */}
                  <p className="text-[12.5px] sm:text-[13px] leading-relaxed text-gray-700 whitespace-pre-line mb-3">
                    {message}
                  </p>

                  {/* Divider */}
                  <div className="h-px bg-gray-200 my-2.5" />

                  {/* Organizer Name */}
                  <div className="text-xs sm:text-[13px] font-semibold text-gray-900">
                    {event?.organizer_name || "The Event Team"}
                  </div>
                </div>

                {/* Action Button */}
                <div className="px-3.5 pb-3">
                  <div className="w-full py-2.5 px-4 bg-[#5046e5] text-white font-semibold text-center rounded-xl shadow-sm text-xs sm:text-sm flex items-center justify-center gap-2 cursor-default">
                    <span>View Event</span>
                    <span>&rarr;</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-4 pb-3 pt-1 border-t border-gray-100 text-center">
                  <p className="text-[10px] text-gray-500">
                    Sent via CirclePass on behalf of {event?.organizer_name || "The Organizer"}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-3 sm:p-4 border-t border-border bg-card flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                disabled={submitting}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-secondary transition-colors"
              >
                Back to Edit
              </button>

              <button
                type="button"
                onClick={handleSendConfirmed}
                disabled={submitting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending Announcement…
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {sendLabel.replace("Send to", "Send Announcement to")}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
