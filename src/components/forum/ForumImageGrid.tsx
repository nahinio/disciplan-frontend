import { cn } from "@/lib/utils";

export function ForumImageGrid({
  images,
  size = "md",
  onImageClick,
}: {
  images: string[];
  size?: "sm" | "md" | "lg";
  onImageClick?: (url: string) => void;
}) {
  if (images.length === 0) return null;

  const gridClass =
    images.length === 1
      ? "grid-cols-1"
      : images.length === 2
        ? "grid-cols-2"
        : "grid-cols-2 sm:grid-cols-3";

  const heightClass =
    size === "sm" ? "h-14" : size === "lg" ? "h-48 sm:h-56" : "h-24 sm:h-28";

  return (
    <div className={cn("grid gap-2 mt-3", gridClass)}>
      {images.map((url, i) => (
        <button
          key={`${url}-${i}`}
          type="button"
          onClick={() => onImageClick?.(url)}
          className={cn(
            "relative overflow-hidden rounded-xl border border-[#dce5d4] bg-[#fafcf8] group",
            heightClass,
            onImageClick && "cursor-zoom-in hover:ring-2 hover:ring-[#7d9b76]/40 transition"
          )}
        >
          <img
            src={url}
            alt=""
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        </button>
      ))}
    </div>
  );
}
