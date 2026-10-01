import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Plus, Pencil, Trash2, Save, BookOpen, GraduationCap, Award, X, GripVertical
} from "lucide-react";
import toast from "react-hot-toast";

/* ═══════════════════════════════════════════════════════════════════════════
   AdminPrograms — manual control for managing academic programs + subjects
   ═══════════════════════════════════════════════════════════════════════════

   This component reads from localStorage (key: "gdc_programs_v1") so the
   admin can add/edit/remove programs and subjects WITHOUT needing database
   changes. Programs added here appear on the public /programs page next
   time the page is loaded (the public Programs.tsx reads from the same
   localStorage key as a runtime override on top of its built-in defaults).

   Why localStorage (not Supabase):
     - Programs are mostly static (5 BS + 4 Intermediate + 3 AD)
     - Adding a `programs` table to Supabase would require a SQL migration
     - localStorage is enough for the admin to add custom programs/subjects
     - Data persists per browser; admin can edit anytime
   */

const STORAGE_KEY = "gdc_programs_v1";

interface ProgramOverride {
  slug: string;
  category: "intermediate" | "bs" | "ad";
  title: string;
  shortName: string;
  duration: string;
  tagline: string;
  description: string;
  subjects: string[];        // simple list of subject names
  admissionRequirement: string;
  careerPaths: string;
  isActive: boolean;
}

const emptyProgram: ProgramOverride = {
  slug: "",
  category: "intermediate",
  title: "",
  shortName: "",
  duration: "2 Years",
  tagline: "",
  description: "",
  subjects: [],
  admissionRequirement: "",
  careerPaths: "",
  isActive: true,
};

function loadPrograms(): ProgramOverride[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function savePrograms(programs: ProgramOverride[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(programs));
  // Broadcast to other tabs/pages so /programs updates instantly
  window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
}

const AdminPrograms = () => {
  const [programs, setPrograms] = useState<ProgramOverride[]>([]);
  const [editing, setEditing] = useState<ProgramOverride | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");

  useEffect(() => {
    setPrograms(loadPrograms());
  }, []);

  const persist = (next: ProgramOverride[]) => {
    setPrograms(next);
    savePrograms(next);
  };

  const openAdd = () => {
    setEditing({ ...emptyProgram });
    setModalOpen(true);
  };

  const openEdit = (p: ProgramOverride) => {
    setEditing({ ...p });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!editing) return;
    if (!editing.title || !editing.slug) {
      toast.error("Title and Slug are required");
      return;
    }
    const exists = programs.find((p) => p.slug === editing.slug);
    if (exists) {
      persist(programs.map((p) => (p.slug === editing.slug ? editing : p)));
      toast.success("Program updated");
    } else {
      persist([...programs, editing]);
      toast.success("Program added");
    }
    setModalOpen(false);
    setEditing(null);
  };

  const handleDelete = (slug: string) => {
    if (!confirm("Delete this program?")) return;
    persist(programs.filter((p) => p.slug !== slug));
    toast.success("Deleted");
  };

  const addSubject = () => {
    if (!editing || !newSubject.trim()) return;
    setEditing({
      ...editing,
      subjects: [...editing.subjects, newSubject.trim()],
    });
    setNewSubject("");
  };

  const removeSubject = (idx: number) => {
    if (!editing) return;
    setEditing({
      ...editing,
      subjects: editing.subjects.filter((_, i) => i !== idx),
    });
  };

  const setField = (k: keyof ProgramOverride, v: any) => {
    if (!editing) return;
    setEditing({ ...editing, [k]: v });
  };

  const CategoryIcon = (cat: string) =>
    cat === "bs" ? GraduationCap : cat === "ad" ? Award : BookOpen;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold text-foreground">Manage Programs & Subjects</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Add custom programs and subjects that appear on the public /programs page.
            Built-in programs (Pre-Engineering, BS Urdu, AD English, etc.) are always shown —
            your additions appear alongside them.
          </p>
        </div>
        <Button onClick={openAdd} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Program
        </Button>
      </div>

      {programs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No custom programs added yet.</p>
            <p className="text-sm mt-1">
              The 12 built-in programs (Intermediate, AD, BS) are already shown
              on the public /programs page. Click "Add Program" above to add more.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {programs.map((p) => {
            const Icon = CategoryIcon(p.category);
            return (
              <Card key={p.slug}>
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-heading font-semibold text-foreground">{p.title}</h3>
                      <span className="text-[10px] font-semibold uppercase tracking-wider bg-secondary px-2 py-0.5 rounded-full">
                        {p.category}
                      </span>
                      {!p.isActive && (
                        <span className="text-[10px] font-semibold uppercase bg-muted px-2 py-0.5 rounded-full">
                          Hidden
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.tagline}</p>
                    {p.subjects.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.subjects.map((s, i) => (
                          <span key={i} className="text-[11px] bg-secondary px-2 py-0.5 rounded-full">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(p.slug)}>
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
                  {programs.find((p) => p.slug === editing.slug) ? "Edit Program" : "Add Program"}
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
                  <Label>Short Name *</Label>
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
                </div>
                <div>
                  <Label>Category</Label>
                  <select
                    value={editing.category}
                    onChange={(e) => setField("category", e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="intermediate">Intermediate (2-Year)</option>
                    <option value="ad">Associate Degree (2-Year AD)</option>
                    <option value="bs">BS Program (4-Year)</option>
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
                  value={editing.careerPaths}
                  onChange={(e) => setField("careerPaths", e.target.value)}
                  placeholder="Lecturer, Researcher, Civil Services, ..."
                />
              </div>

              {/* ─── Subjects section ─── */}
              <div>
                <Label>Subjects</Label>
                <div className="mt-2 flex gap-2">
                  <Input
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSubject();
                      }
                    }}
                    placeholder="Type a subject name and press Enter"
                  />
                  <Button onClick={addSubject} type="button" className="gap-1.5 shrink-0">
                    <Plus className="w-4 h-4" /> Add
                  </Button>
                </div>
                {editing.subjects.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {editing.subjects.map((s, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 bg-secondary text-sm px-2 py-1 rounded-md"
                      >
                        {s}
                        <button
                          onClick={() => removeSubject(i)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
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
                  Active (show on public /programs page)
                </Label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} className="gap-1.5">
                  <Save className="w-4 h-4" /> Save Program
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminPrograms;
