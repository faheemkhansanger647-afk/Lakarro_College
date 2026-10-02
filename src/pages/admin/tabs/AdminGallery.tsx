import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Plus, Trash2, Loader2, Upload, ArrowLeft, Image as ImageIcon, Play,
  Link2, Film, AlertTriangle, Pencil, ImagePlus, CheckSquare, Square, X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useDropzone } from "react-dropzone";
import type { GalleryAlbum, GalleryPhoto } from "@/hooks/useGallery";
import { isVideoUrl } from "@/hooks/useGallery";
import { getEmbedInfo, normalizeMediaUrl, youTubeThumbnail } from "@/lib/embedMedia";
import EmbedFrame from "@/components/shared/EmbedFrame";

/* ═══════════════════════════════════════════════════════════════════════════
   AdminGallery — full gallery management for the admin panel

   Features:
   • Create / Edit / Delete albums (title, description, cover — upload or
     "set cover from an existing photo")
   • Upload photos & videos (multi-file drag & drop with progress)
   • Embed Facebook posts/videos/reels & YouTube links with live preview
   • Edit any photo/video caption
   • Bulk-select and bulk-delete media
   • Delete individual media
   ═══════════════════════════════════════════════════════════════════════════ */

const AdminGallery = () => {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<GalleryAlbum | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Edit-album state (title / description / replace cover)
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", description: "" });
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [removeCover, setRemoveCover] = useState(false);

  // Caption editing state
  const [captionPhoto, setCaptionPhoto] = useState<GalleryPhoto | null>(null);
  const [captionValue, setCaptionValue] = useState("");
  const [savingCaption, setSavingCaption] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // "Add from Link" — paste a Facebook post/video/reel or YouTube link and it
  // embeds automatically (stored as an ordinary album item, no DB changes).
  const [linkValue, setLinkValue] = useState("");
  const [addingLink, setAddingLink] = useState(false);

  const invalidateAlbums = () => {
    qc.invalidateQueries({ queryKey: ["admin-albums"] });
    qc.invalidateQueries({ queryKey: ["gallery-albums"] });
  };
  const invalidatePhotos = (albumId?: string) => {
    if (albumId) qc.invalidateQueries({ queryKey: ["admin-photos", albumId] });
    qc.invalidateQueries({ queryKey: ["gallery-photos"] });
    qc.invalidateQueries({ queryKey: ["gallery-fallback-cover"] });
    qc.invalidateQueries({ queryKey: ["gallery-photo-count"] });
  };

  const { data: albums = [], isLoading } = useQuery<GalleryAlbum[]>({
    queryKey: ["admin-albums"],
    queryFn: async () => {
      const { data, error } = await supabase.from("gallery_albums").select("id, title, description, cover_url, created_at").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const { data: photos = [], isLoading: loadingPhotos } = useQuery<GalleryPhoto[]>({
    queryKey: ["admin-photos", selectedAlbum?.id],
    queryFn: async () => {
      if (!selectedAlbum) return [];
      const { data, error } = await supabase.from("gallery_photos").select("id, album_id, photo_url, caption, media_type, created_at").eq("album_id", selectedAlbum.id).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((p) => ({
        ...p,
        media_type: p.media_type || (isVideoUrl(p.photo_url) ? "video" : "image"),
      })) as GalleryPhoto[];
    },
    enabled: !!selectedAlbum,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // ── Add-from-link derived values (AFTER `photos` is declared) ──────────
  const normalizedLink = normalizeMediaUrl(linkValue);
  const linkInfo = linkValue.trim() ? getEmbedInfo(normalizedLink) : null;
  const linkInvalid = !!linkValue.trim() && !linkInfo;
  const linkDuplicate = !!linkInfo && photos.some((p) => p.photo_url === normalizedLink);

  const addLinkedMedia = async () => {
    if (!selectedAlbum || !linkInfo) return;
    setAddingLink(true);
    try {
      const { error } = await supabase.from("gallery_photos").insert({
        album_id: selectedAlbum.id,
        photo_url: normalizedLink,
        media_type: "video",
      });
      if (error) {
        toast.error("Failed to embed: " + error.message);
      } else {
        toast.success(linkInfo.label + " embedded in album!");
        setLinkValue("");
        invalidatePhotos(selectedAlbum.id);
      }
    } finally {
      setAddingLink(false);
    }
  };

  const handleCreateAlbum = async () => {
    if (!form.title) { toast.error("Title required"); return; }
    setSaving(true);
    try {
      let cover_url: string | null = null;
      if (coverFile) {
        cover_url = await uploadToCloudinary(coverFile, "gallery");
      }
      const { error } = await supabase.from("gallery_albums").insert({ title: form.title, description: form.description || null, cover_url });
      if (error) toast.error("Failed to create album: " + error.message);
      else { toast.success("Album created!"); invalidateAlbums(); setModalOpen(false); }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed. Check Cloudinary env vars.");
    }
    setSaving(false);
  };

  // ── Edit album (rename / re-describe / replace or remove cover) ────────
  const openEditAlbum = (a: GalleryAlbum) => {
    setEditForm({ title: a.title, description: a.description || "" });
    setEditCoverFile(null);
    setRemoveCover(false);
    setEditModalOpen(true);
  };

  const handleUpdateAlbum = async () => {
    if (!selectedAlbum) return;
    if (!editForm.title.trim()) { toast.error("Title required"); return; }
    setSaving(true);
    try {
      const updates: Record<string, unknown> = {
        title: editForm.title.trim(),
        description: editForm.description || null,
      };
      if (editCoverFile) {
        updates.cover_url = await uploadToCloudinary(editCoverFile, "gallery");
      } else if (removeCover) {
        updates.cover_url = null;
      }
      const { error } = await supabase.from("gallery_albums").update(updates).eq("id", selectedAlbum.id);
      if (error) {
        toast.error("Failed to update album: " + error.message);
      } else {
        toast.success("Album updated!");
        invalidateAlbums();
        qc.invalidateQueries({ queryKey: ["gallery-fallback-cover", selectedAlbum.id] });
        setEditModalOpen(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed. Check Cloudinary env vars.");
    }
    setSaving(false);
  };

  const deleteAlbum = useMutation({
    mutationFn: async (id: string) => {
      // Note: Cloudinary files are not deleted here — manage via Cloudinary dashboard if needed
      await supabase.from("gallery_photos").delete().eq("album_id", id);
      const { error } = await supabase.from("gallery_albums").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Album deleted"); setSelectedAlbum(null); invalidateAlbums(); },
  });

  // ── Set an existing photo as the album cover ───────────────────────────
  const setAsCover = useMutation({
    mutationFn: async (photo: GalleryPhoto) => {
      if (!selectedAlbum) throw new Error("No album selected");
      const { error } = await supabase.from("gallery_albums").update({ cover_url: photo.photo_url }).eq("id", selectedAlbum.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Album cover updated!");
      invalidateAlbums();
    },
    onError: (err) => toast.error("Failed to set cover: " + err.message),
  });

  const onDropFiles = useCallback(async (acceptedFiles: File[]) => {
    if (!selectedAlbum || !acceptedFiles.length) return;
    setUploading(true);
    setUploadProgress(0);
    let uploaded = 0;
    for (const file of acceptedFiles) {
      const isVideo = file.type.startsWith("video/");
      const cloudFolder = isVideo ? "gallery" : "gallery";
      try {
        const url = await uploadToCloudinary(file, cloudFolder);
        const media_type = isVideo ? "video" : "image";
        await supabase.from("gallery_photos").insert({ album_id: selectedAlbum.id, photo_url: url, media_type });
      } catch {
        // skip failed file, continue with others
      }
      uploaded++;
      setUploadProgress(Math.round((uploaded / acceptedFiles.length) * 100));
    }
    toast.success(`${uploaded} files uploaded!`);
    invalidatePhotos(selectedAlbum.id);
    setUploading(false);
    setUploadProgress(0);
  }, [selectedAlbum, qc]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropFiles,
    accept: { "image/*": [], "video/*": [] },
    multiple: true,
    disabled: uploading,
  });

  const deletePhoto = useMutation({
    mutationFn: async (photo: GalleryPhoto) => {
      // Note: Cloudinary file not deleted here — manage via Cloudinary dashboard if needed
      const { error } = await supabase.from("gallery_photos").delete().eq("id", photo.id);
      if (error) throw error;
    },
    onSuccess: (_d, photo) => {
      toast.success("File deleted");
      setSelectedIds(prev => { const n = new Set(prev); n.delete(photo.id); return n; });
      invalidatePhotos(selectedAlbum?.id);
    },
  });

  // ── Bulk delete selected media ─────────────────────────────────────────
  const bulkDelete = async () => {
    if (!selectedAlbum || selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase.from("gallery_photos").delete().in("id", ids);
      if (error) throw error;
      toast.success(`${ids.length} item${ids.length > 1 ? "s" : ""} deleted`);
      setSelectedIds(new Set());
      invalidatePhotos(selectedAlbum.id);
    } catch (err) {
      toast.error("Bulk delete failed: " + (err instanceof Error ? err.message : "unknown error"));
    }
    setBulkDeleting(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allSelected = photos.length > 0 && photos.every(p => selectedIds.has(p.id));

  const openCaptionEditor = (p: GalleryPhoto) => {
    setCaptionPhoto(p);
    setCaptionValue(p.caption || "");
  };

  const saveCaption = async () => {
    if (!captionPhoto) return;
    setSavingCaption(true);
    const { error } = await supabase
      .from("gallery_photos")
      .update({ caption: captionValue.trim() || null })
      .eq("id", captionPhoto.id);
    setSavingCaption(false);
    if (error) {
      toast.error("Failed to save caption: " + error.message);
    } else {
      toast.success("Caption saved!");
      setCaptionPhoto(null);
      invalidatePhotos(selectedAlbum?.id);
    }
  };

  // Album detail view
  if (selectedAlbum) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { setSelectedAlbum(null); setSelectedIds(new Set()); }}><ArrowLeft className="w-5 h-5" /></Button>
          <h2 className="text-2xl font-heading font-bold text-foreground">{selectedAlbum.title}</h2>
          <Badge variant="secondary">{photos.length} items</Badge>
          <Button variant="outline" size="sm" className="gap-1.5 ml-auto" onClick={() => openEditAlbum(selectedAlbum)}>
            <Pencil className="w-3.5 h-3.5" /> Edit Album
          </Button>
        </div>

        {/* Upload zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Drag & drop photos/videos here, or click to select</p>
          <p className="text-xs text-muted-foreground mt-1">Images and videos supported</p>
        </div>

        {uploading && (
          <div className="space-y-1">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">{uploadProgress}% uploaded</p>
          </div>
        )}

        {/* Add Facebook / YouTube link — auto-embed with live preview */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-card">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg gradient-accent flex items-center justify-center shrink-0">
              <Link2 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-heading font-semibold text-foreground text-sm sm:text-base">Add Facebook post or video link</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Paste a Facebook post, video, reel, watch or YouTube link — it embeds automatically with its real thumbnail and plays right inside the gallery.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            <div className="relative flex-1">
              <Link2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
                placeholder="https://www.facebook.com/… post, video, reel or YouTube link"
                className="pl-9"
              />
            </div>
            <Button onClick={addLinkedMedia} disabled={!linkInfo || linkDuplicate || addingLink} className="gap-1.5 shrink-0">
              {addingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {addingLink ? "Embedding…" : "Embed"}
            </Button>
          </div>
          {linkInvalid && (
            <p className="text-xs text-destructive mt-2 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" />
              Only Facebook posts / videos / reels / watch links and YouTube links can be embedded. For direct photo or video files, use the upload zone above.
            </p>
          )}
          {linkInfo && (
            <div className="mt-3 rounded-lg bg-secondary/40 border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-primary text-primary-foreground gap-1">
                  <Film className="w-3 h-3" />{linkInfo.label}
                </Badge>
                <span className="text-xs text-muted-foreground">detected — will embed automatically</span>
                {linkDuplicate && <Badge className="bg-amber-500/90 text-white">Already in this album</Badge>}
              </div>
              <div
                className="mt-2.5 w-full max-w-[300px] rounded-lg overflow-hidden border border-border bg-black relative"
                style={{ aspectRatio: String(linkInfo.aspect) }}
              >
                <EmbedFrame url={normalizedLink} interactive showReason title="Embed preview" className="absolute inset-0 w-full h-full" />
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">Live preview — exactly how it will appear in the gallery. Click “Embed” to add it.</p>
              {linkInfo.provider === "facebook" && (
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  Share links (/share/…) are converted to Facebook's direct link automatically. If the preview still says “Video Unavailable”, the post is not <span className="font-semibold">Public</span> on Facebook — open it on Facebook, set its audience to Public (private or friends-only videos cannot be embedded by Facebook on any website), then paste the link again.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Bulk selection toolbar ── */}
        {photos.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 shadow-card">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => setSelectedIds(allSelected ? new Set() : new Set(photos.map(p => p.id)))}
            >
              {allSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
              {allSelected ? "Deselect all" : "Select all"}
            </Button>
            {selectedIds.size > 0 && (
              <>
                <Badge className="bg-primary text-primary-foreground">{selectedIds.size} selected</Badge>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive" className="gap-1.5" disabled={bulkDeleting}>
                      {bulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      Delete selected
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {selectedIds.size} selected item{selectedIds.size > 1 ? "s" : ""}?</AlertDialogTitle>
                      <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={bulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="gap-1.5">
                  <X className="w-4 h-4" /> Clear
                </Button>
              </>
            )}
            <span className="text-xs text-muted-foreground ml-auto hidden sm:block">
              Tick the checkbox on items to select multiple at once
            </span>
          </div>
        )}

        {loadingPhotos ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}</div>
        ) : photos.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
            No items yet — upload photos/videos above or embed a Facebook/YouTube link.
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map(p => {
              const embed = getEmbedInfo(p.photo_url);
              const ytThumb = embed?.provider === "youtube" ? youTubeThumbnail(p.photo_url) : null;
              const isVideo = !embed && (p.media_type === "video" || isVideoUrl(p.photo_url));
              const isSelected = selectedIds.has(p.id);
              const canBeCover = !embed && !isVideo;
              return (
                <div key={p.id} className={`relative group rounded-xl overflow-hidden aspect-square bg-muted ${isSelected ? "ring-2 ring-primary" : ""}`}>
                  {embed ? (
                    ytThumb ? (
                      <>
                        <img src={ytThumb} alt={p.caption || embed.label} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-10 h-10 rounded-full bg-black/50 border border-white/30 flex items-center justify-center">
                            <Play className="w-5 h-5 text-white ml-0.5" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <EmbedFrame url={p.photo_url} title={embed.label} className="absolute inset-0 w-full h-full" />
                    )
                  ) : isVideo ? (
                    <>
                      <video src={p.photo_url} preload="metadata" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-foreground/10 pointer-events-none">
                        <div className="w-10 h-10 rounded-full bg-black/50 border border-white/30 flex items-center justify-center">
                          <Play className="w-5 h-5 text-white ml-0.5" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <img src={p.photo_url} alt={p.caption || ""} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  )}

                  {/* selection checkbox — always visible */}
                  <button
                    type="button"
                    aria-label={isSelected ? "Deselect item" : "Select item"}
                    onClick={() => toggleSelect(p.id)}
                    className="absolute top-2 left-2 z-20 w-7 h-7 rounded-md bg-black/45 backdrop-blur-sm border border-white/40 flex items-center justify-center text-white hover:bg-black/65 transition-colors"
                  >
                    {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>

                  {(isVideo || embed) && (
                    <div className="absolute top-2 left-11 z-10">
                      <Badge className="bg-foreground/70 text-white text-[10px] gap-1"><Play className="w-3 h-3" />{embed ? embed.badge : "VIDEO"}</Badge>
                    </div>
                  )}

                  {/* caption strip */}
                  {p.caption && (
                    <div className="absolute bottom-0 inset-x-0 z-10 bg-gradient-to-t from-black/75 to-transparent px-2.5 pb-1.5 pt-5 pointer-events-none">
                      <p className="text-[11px] text-white truncate">{p.caption}</p>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center gap-1.5">
                    <Button
                      size="icon" variant="secondary" title="Edit caption"
                      className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8"
                      onClick={() => openCaptionEditor(p)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    {canBeCover && (
                      <Button
                        size="icon" variant="secondary" title="Set as album cover"
                        className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8"
                        onClick={() => setAsCover.mutate(p)}
                        disabled={setAsCover.isPending}
                      >
                        <ImagePlus className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="destructive" title="Delete" className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete this file?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deletePhoto.mutate(p)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Edit caption dialog ── */}
        <Dialog open={!!captionPhoto} onOpenChange={(open) => !open && setCaptionPhoto(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Edit Caption</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              {captionPhoto && !getEmbedInfo(captionPhoto.photo_url) && captionPhoto.media_type !== "video" && (
                <img src={captionPhoto.photo_url} alt="" className="w-full h-36 object-cover rounded-lg border border-border" />
              )}
              <div>
                <Label>Caption <span className="text-xs text-muted-foreground font-normal">(shown under the item in the gallery)</span></Label>
                <Input
                  value={captionValue}
                  autoFocus
                  onChange={e => setCaptionValue(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); saveCaption(); } }}
                  placeholder="e.g. Annual Sports Day 2026"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCaptionPhoto(null)}>Cancel</Button>
              <Button onClick={saveCaption} disabled={savingCaption} className="gap-1.5">
                {savingCaption ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save Caption
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Edit album dialog ── */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Edit Album</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Title *</Label><Input value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} /></div>
              <div><Label>Description</Label><Textarea rows={3} value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} /></div>
              <div>
                <Label>Cover Photo</Label>
                <div className="flex items-center gap-3 mt-1">
                  {editCoverFile && <img src={URL.createObjectURL(editCoverFile)} alt="" className="w-16 h-10 rounded object-cover" />}
                  {!editCoverFile && !removeCover && selectedAlbum?.cover_url && (
                    <img src={selectedAlbum.cover_url} alt="" className="w-16 h-10 rounded object-cover" />
                  )}
                  <label className="flex items-center gap-1.5 text-sm text-primary cursor-pointer hover:underline">
                    <Upload className="w-4 h-4" /> Replace Cover
                    <input type="file" accept="image/*" className="hidden" onChange={e => { setEditCoverFile(e.target.files?.[0] || null); setRemoveCover(false); }} />
                  </label>
                  {(selectedAlbum?.cover_url || editCoverFile) && (
                    <button
                      type="button"
                      className="text-xs text-destructive hover:underline"
                      onClick={() => { setRemoveCover(true); setEditCoverFile(null); }}
                    >
                      Remove cover
                    </button>
                  )}
                </div>
                {removeCover && <p className="text-xs text-muted-foreground mt-1">Cover will be removed — the gallery will auto-pick the newest photo instead.</p>}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateAlbum} disabled={saving} className="gap-1.5">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Albums list
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold text-foreground">Manage Gallery</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create albums, upload photos & videos, embed Facebook/YouTube posts, edit captions and covers.
          </p>
        </div>
        <Button onClick={() => { setForm({ title: "", description: "" }); setCoverFile(null); setModalOpen(true); }} className="gap-1.5">
          <Plus className="w-4 h-4" /> Create Album
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
      ) : albums.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No albums yet.</p>
          <p className="text-sm mt-1">Click "Create Album" above to make your first album, then upload photos into it.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {albums.map(a => (
            <Card key={a.id} className="overflow-hidden cursor-pointer hover:shadow-elevated transition-shadow border-border" onClick={() => setSelectedAlbum(a)}>
              <div className="aspect-video bg-muted relative">
                {a.cover_url
                  ? <img src={a.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-10 h-10 text-muted-foreground/30" /></div>}
              </div>
              <CardContent className="p-4">
                <h3 className="font-heading font-semibold text-foreground">{a.title}</h3>
                {a.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.description}</p>}
                <div className="flex items-center justify-between mt-3">
                  <Badge variant="secondary">Album</Badge>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" title="Edit album" onClick={e => { e.stopPropagation(); openEditAlbum(a); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={e => e.stopPropagation()}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete album and all photos?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteAlbum.mutate(a.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Album Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Album</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div>
              <Label>Cover Photo</Label>
              <div className="flex items-center gap-3 mt-1">
                {coverFile && <img src={URL.createObjectURL(coverFile)} alt="" className="w-16 h-10 rounded object-cover" />}
                <label className="flex items-center gap-1.5 text-sm text-primary cursor-pointer hover:underline">
                  <Upload className="w-4 h-4" /> Choose Cover
                  <input type="file" accept="image/*" className="hidden" onChange={e => setCoverFile(e.target.files?.[0] || null)} />
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateAlbum} disabled={saving} className="gap-1.5">{saving && <Loader2 className="w-4 h-4 animate-spin" />} Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminGallery;
