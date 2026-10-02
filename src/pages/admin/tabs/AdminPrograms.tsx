import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Pencil, Trash2, Save, BookOpen, GraduationCap, Award,
  X, Loader2, CloudUpload, FolderDown, Info,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  usePrograms,
  type ProgramRecord, type ProgramCategory, type ProgramSubjectGroup,
} from "@/hooks/usePrograms";

/* ═══════════════════════════════════════════════════════════════════════════
   AdminPrograms — manual control for managing academic programs & subjects

   HOW IT WORKS NOW (Supabase-backed):
   • Programs are stored in the `programs` table (created once by running
     supabase-migration.sql in the project root — one-time, 30 seconds).
   • Everything on the public /programs page is controllable from here:
     titles, taglines, descriptions, durations, subject groups (per year or
     semester), admission requirements, career pathways, per-program
     admission contact note and visibility (show/hide).
   • To EDIT a built-in program (e.g. Pre-Engineering): click "Edit" on it —
     built-ins with matching slugs are overridden by your changes. To HIDE a
     built-in: add a program with the same slug and untick "Active".
   • Offline safety: if Supabase is unreachable, changes are mirrored to
     localStorage so nothing is lost while you keep editing.
   ═══════════════════════════════════════════════════════════════════════════ */

const STORAGE_KEY = "gdc_programs_v1";

const emptyProgram = (): ProgramRecord => ({
  slug: "",
  category: "intermediate",
  title: "",
  shortName: "",
  duration: "2 Years",
  tagline: "",
  description: "",
  subjectGroups: [{ label: "1st Year (Part-I)", subjects: [] }],
  careerPaths: [],
  admissionRequirement: "",
  contactInfo: "",
  isActive: true,
  sortOrder: 0,
});

function saveLocalMirror(programs: ProgramRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(programs));
  } catch { /* quota */ }
}

function loadLocalMirror(): ProgramRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const CATEGORY_LABEL: Record<ProgramCategory, string> = {
  intermediate: "Intermediate (2-Year)",
  ad: "Associate Degree (2-Year AD)",
  bs: "BS Program (4-Year)",
};

const AdminPrograms = () => {
  const qc = useQueryClient();
  const { data: dbPrograms = [], isLoading } = usePrograms();

  const [editing, setEditing] = useState<ProgramRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dbOffline, setDbOffline] = useState(false);
  const [newSubjectIdx, setNewSubjectIdx] = useState<number | null>(null);
  const [newSubjectValue, setNewSubjectValue] = useState("");

  // If Supabase returned nothing usable, fall back to the local mirror so
  // the admin never faces an empty (broken-looking) list.
  const programs = dbPrograms.length > 0 ? dbPrograms : loadLocalMirror();
  const usingBuiltIns = !isLoading && dbPrograms.length === 0 && !dbOffline;

  useEffect(() => {
    // Track whether the DB fetch itself errored (hook returns [] on error)
    if (!isLoading && dbPrograms.length === 0) {
      // Can't distinguish "empty table" from "error" here — the hook already
      // warns in console; we only mirror offline programs when they exist.
      setDbOffline(loadLocalMirror().length > 0);
    }
  }, [dbPrograms, isLoading]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["programs"] });
  };

  const openAdd = () => {
    setEditing(emptyProgram());
    setModalOpen(true);
  };

  const openEdit = (p: ProgramRecord) => {
    setEditing({
      ...p,
      subjectGroups: p.subjectGroups.length
        ? p.subjectGroups.map((g) => ({ ...g, subjects: [...g.subjects] }))
        : [{ label: "Subjects", subjects: [] }],
      careerPaths: [...p.careerPaths],
    });
    setModalOpen(true);
  };

  /* ── Save to Supabase (insert or update by slug) ── */
  const persistToDb = async (p: ProgramRecord): Promise<boolean> => {
    const payload = {
      slug: p.slug,
      category: p.category,
      title: p.title,
      short_name: p.shortName || p.title,
      duration: p.duration || null,
      tagline: p.tagline || null,
      description: p.description || null,
      subject_groups: p.subjectGroups,
      career_paths: p.careerPaths,
      admission_requirement: p.admissionRequirement || null,
      contact_info: p.contactInfo || null,
      is_active: p.isActive,
      sort_order: p.sortOrder ?? 0,
    };

    // Session check — refresh if expired
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const { error: refreshErr } = await supabase.auth.refreshSession();
      if (refreshErr) {
        toast.error("Session expired — please sign in again.", { duration: 8000 });
        return false;
      }
    }

    const { data: existing } = await supabase
      .from("programs")
      .select("id")
      .eq("slug", p.slug)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase.from("programs").update(payload).eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("programs").insert(payload);
      if (error) throw error;
    }
    return true;
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.title.trim() || !editing.slug.trim()) {
      toast.error("Title and Slug are required");
      return;
    }
    setSaving(true);
    let saved = false;
    try {
      saved = await persistToDb(editing);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      const needsMigration = /relation|does not exist|schema/i.test(msg);
      toast.error(
        needsMigration
          ? "Saved locally only — the programs table doesn't exist yet. Run supabase-migration.sql (project root) in the Supabase SQL Editor to go live."
          : `Database save failed: ${msg} — kept locally.`,
        { duration: 9000 }
      );
    }
    // Always mirror locally so edits are never lost
    const mirror = [
      ...loadLocalMirror().filter((x) => x.slug !== editing.slug),
      editing,
    ];
    saveLocalMirror(mirror);

    if (saved) {
      toast.success("Program saved to database!");
      refresh();
    }
    setModalOpen(false);
    setEditing(null);
    setSaving(false);
  };

  const handleDelete = async (p: ProgramRecord) => {
    if (!confirm(`Delete "${p.title}"? If it overrides a built-in program, the built-in will show again.`)) return;
    try {
      if (p.id) {
        const { error } = await supabase.from("programs").delete().eq("id", p.id);
        if (error) throw error;
      } else {
        // Only exists in the local mirror
        saveLocalMirror(loadLocalMirror().filter((x) => x.slug !== p.slug));
      }
      saveLocalMirror(loadLocalMirror().filter((x) => x.slug !== p.slug));
      toast.success("Deleted");
      refresh();
    } catch (err) {
      toast.error("Delete failed: " + (err instanceof Error ? err.message : "unknown error"));
    }
  };

  /* ── Subject-group editor helpers ── */
  const setField = (k: keyof ProgramRecord, v: any) => {
    if (!editing) return;
    setEditing({ ...editing, [k]: v });
  };

  const addGroup = () => {
    if (!editing) return;
    const n = editing.subjectGroups.length + 1;
    setEditing({
      ...editing,
      subjectGroups: [...editing.subjectGroups, { label: `Semester ${n}`, subjects: [] }],
    });
  };

  const removeGroup = (idx: number) => {
    if (!editing) return;
    setEditing({ ...editing, subjectGroups: editing.subjectGroups.filter((_, i) => i !== idx) });
  };

  const setGroupLabel = (idx: number, label: string) => {
    if (!editing) return;
    setEditing({
      ...editing,
      subjectGroups: editing.subjectGroups.map((g, i) => (i === idx ? { ...g, label } : g)),
    });
  };

  const addSubject = (idx: number) => {
    if (!editing || !newSubjectValue.trim()) return;
    setEditing({
      ...editing,
      subjectGroups: editing.subjectGroups.map((g, i) =>
        i === idx ? { ...g, subjects: [...g.subjects, newSubjectValue.trim()] } : g
      ),
    });
    setNewSubjectValue("");
    setNewSubjectIdx(null);
  };

  const removeSubject = (groupIdx: number, subjectIdx: number) => {
    if (!editing) return;
    setEditing({
      ...editing,
      subjectGroups: editing.subjectGroups.map((g, i) =>
        i === groupIdx ? { ...g, subjects: g.subjects.filter((_, si) => si !== subjectIdx) } : g
      ),
    });
  };

  const CategoryIcon = (cat: ProgramCategory) =>
    cat === "bs" ? GraduationCap : cat === "ad" ? Award : BookOpen;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-heading font-bold text-foreground">Manage Programs & Subjects</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Full control over the public /programs page — edit any program below, or add new ones.
            Your changes override the built-in defaults whenever the slug matches.
          </p>
        </div>
        <Button onClick={openAdd} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Program
        </Button>
      </div>

      {usingBuiltIns && !dbOffline && (
        <div className="rounded-xl border border-gold/40 bg-gold/10 p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-bronze dark:text-gold shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-foreground mb-1">Showing built-in programs</p>
            <p className="text-muted-foreground leading-relaxed">
              These 12 programs come from the app itself. Edit any of them (pencil icon) to customise
              subjects and details, or add new programs. The first save creates them in the database —
              if saving fails, run <code className="text-xs bg-secondary px-1 py-0.5 rounded">supabase-migration.sql</code> from
              the project root in the Supabase SQL Editor (one-time setup).
            </p>
          </div>
        </div>
      )}

      {dbOffline && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 flex items-start gap-2">
          <FolderDown className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Database unreachable — showing programs saved on this device. They will sync once saving to the database succeeds.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="p-4"><div className="h-10 animate-pulse bg-muted rounded" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {programs.map((p) => {
            const Icon = CategoryIcon(p.category);
            const subjectCount = p.subjectGroups.reduce((n, g) => n + g.subjects.length, 0);
            return (
              <Card key={p.slug}>
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-heading font-semibold text-foreground">{p.title}</h3>
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                        {CATEGORY_LABEL[p.category] || p.category}
                      </Badge>
                      {p.duration && <Badge variant="outline" className="text-[10px]">{p.duration}</Badge>}
                      {!p.isActive && (
                        <Badge className="bg-muted text-muted-foreground text-[10px] uppercase">Hidden</Badge>
                      )}
                    </div>
                    {p.tagline && <p className="text-xs text-muted-foreground mt-0.5">{p.tagline}</p>}
                    {subjectCount > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.subjectGroups.map((g, gi) => (
                          <span key={gi} className="text-[11px] bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
                            <span className="font-semibold text-foreground/70">{g.label}:</span> {g.subjects.length} subjects
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" title="Edit" onClick={() => openEdit(p)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" title="Delete" onClick={() => handleDelete(p)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── Modal: Add/Edit Program ─── */}
      {modalOpen && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-heading font-bold">
                  {programs.some((p) => p.slug === editing.slug && p.id) ? "Edit Program" : "Add Program"}
                </h3>
                <Button size="icon" variant="ghost" onClick={() => setModalOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={editing.title}
                    onChange={(e) => setField("title", e.target.value)}
                    placeholder="e.g. BS English Literature"
                  />
                </div>
                <div>
                  <Label>Short Name</Label>
                  <Input
                    value={editing.shortName}
                    onChange={(e) => setField("shortName", e.target.value)}
                    placeholder="e.g. BS English"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <Label>Slug *</Label>
                  <Input
                    value={editing.slug}
                    onChange={(e) => setField("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                    placeholder="bs-english"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Use a built-in slug (e.g. pre-engineering) to override it
                  </p>
                </div>
                <div>
                  <Label>Category</Label>
                  <select
                    value={editing.category}
                    onChange={(e) => setField("category", e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="intermediate">{CATEGORY_LABEL.intermediate}</option>
                    <option value="ad">{CATEGORY_LABEL.ad}</option>
                    <option value="bs">{CATEGORY_LABEL.bs}</option>
                  </select>
                </div>
                <div>
                  <Label>Duration</Label>
                  <Input
                    value={editing.duration}
                    onChange={(e) => setField("duration", e.target.value)}
                    placeholder="2 Years"
                  />
                </div>
              </div>

              <div>
                <Label>Tagline</Label>
                <Input
                  value={editing.tagline}
                  onChange={(e) => setField("tagline", e.target.value)}
                  placeholder="Short one-line description"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={editing.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="Full program description..."
                />
              </div>

              <div>
                <Label>Admission Requirement</Label>
                <Input
                  value={editing.admissionRequirement}
                  onChange={(e) => setField("admissionRequirement", e.target.value)}
                  placeholder="e.g. Intermediate (HSSC) with at least 2nd division"
                />
              </div>

              <div>
                <Label>Career Pathways (comma-separated)</Label>
                <Textarea
                  rows={2}
                  value={editing.careerPaths.join(", ")}
                  onChange={(e) =>
                    setField(
                      "careerPaths",
                      e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                    )
                  }
                  placeholder="Lecturer, Researcher, Civil Services, ..."
                />
              </div>

              <div>
                <Label>Admission Contact Note <span className="text-xs text-muted-foreground font-normal">(optional, shown on the program page)</span></Label>
                <Input
                  value={editing.contactInfo || ""}
                  onChange={(e) => setField("contactInfo", e.target.value)}
                  placeholder="e.g. Contact the admission cell for ICS queries"
                />
              </div>

              {/* ─── Subject groups (years / semesters) ─── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Subject Groups <span className="text-xs text-muted-foreground font-normal">(years or semesters)</span></Label>
                  <Button type="button" variant="outline" size="sm" onClick={addGroup} className="gap-1">
                    <Plus className="w-3.5 h-3.5" /> Add Group
                  </Button>
                </div>

                {editing.subjectGroups.map((group, gIdx) => (
                  <div key={gIdx} className="rounded-xl border border-border bg-secondary/30 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={group.label}
                        onChange={(e) => setGroupLabel(gIdx, e.target.value)}
                        placeholder="Group label, e.g. 1st Year (Part-I) or Semester 1"
                        className="h-9 text-sm font-medium"
                      />
                      {editing.subjectGroups.length > 1 && (
                        <Button type="button" size="icon" variant="ghost" className="text-destructive shrink-0" onClick={() => removeGroup(gIdx)}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {group.subjects.map((s, sIdx) => (
                        <span key={sIdx} className="inline-flex items-center gap-1 bg-background border border-border text-sm px-2 py-1 rounded-md">
                          {s}
                          <button
                            type="button"
                            onClick={() => removeSubject(gIdx, sIdx)}
                            className="text-muted-foreground hover:text-destructive"
                            aria-label={`Remove ${s}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      {newSubjectIdx === gIdx ? (
                        <div className="flex gap-1.5">
                          <Input
                            autoFocus
                            value={newSubjectValue}
                            onChange={(e) => setNewSubjectValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { e.preventDefault(); addSubject(gIdx); }
                              if (e.key === "Escape") { setNewSubjectIdx(null); setNewSubjectValue(""); }
                            }}
                            placeholder="Subject name"
                            className="h-8 w-44 text-sm"
                          />
                          <Button type="button" size="sm" onClick={() => addSubject(gIdx)}>Add</Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setNewSubjectIdx(gIdx); setNewSubjectValue(""); }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline px-1"
                        >
                          <Plus className="w-3 h-3" /> Add subject
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editing.isActive}
                  onChange={(e) => setField("isActive", e.target.checked)}
                  className="w-4 h-4"
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Active (show on public /programs page) — unticking a built-in slug hides it
                </Label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Program
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <CloudUpload className="w-3.5 h-3.5" />
        Changes are saved to the database and appear on /programs immediately.
      </p>
    </div>
  );
};

export default AdminPrograms;
