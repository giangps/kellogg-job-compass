import { useQuery } from "@tanstack/react-query";
import { Camera } from "lucide-react";
import { useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function isExternal(path: string) {
  return path.startsWith("http://") || path.startsWith("https://");
}

export function useAvatarUrl(path: string | null | undefined) {
  const query = useQuery({
    queryKey: ["avatar-url", path],
    enabled: Boolean(path) && !isExternal(path!),
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path!, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  if (path && isExternal(path)) return path;
  return query.data ?? null;
}

export function UserAvatar({
  path,
  name,
  className = "size-10",
}: {
  path: string | null | undefined;
  name: string | null | undefined;
  className?: string;
}) {
  const url = useAvatarUrl(path);

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-semibold text-primary ${className}`}
    >
      {url ? (
        <img
          src={url}
          alt={name ? `${name}'s profile picture` : "Profile picture"}
          className="size-full object-cover"
          loading="lazy"
        />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  );
}

export function AvatarUpload({
  userId,
  name,
  table,
  currentPath,
  onUploaded,
}: {
  userId: string;
  name: string | null | undefined;
  table: "users" | "alum_profiles";
  currentPath: string | null | undefined;
  onUploaded: () => void | Promise<unknown>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Pick an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase
        .from(table)
        .update({ avatar_url: path })
        .eq("id", userId);
      if (dbErr) throw dbErr;
      await onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <UserAvatar path={currentPath} name={name} className="size-16 text-base" />
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={onPick}
          className="hidden"
          aria-label="Upload profile picture"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-60"
        >
          <Camera className="size-3.5" aria-hidden />
          {uploading ? "Uploading…" : currentPath ? "Change photo" : "Upload photo"}
        </button>
        <p className="mt-1.5 text-xs text-muted-foreground">JPG or PNG, up to 5 MB.</p>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
