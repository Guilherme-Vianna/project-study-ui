import Image from "next/image";

export function ImageThumb({ url, alt, className = "size-20" }: { url: string | null; alt: string; className?: string }) {
  return (
    <span className={`relative block shrink-0 overflow-hidden rounded-xl border border-border bg-canvas ${className}`}>
      {url ? (
        <Image src={url} alt={alt} fill unoptimized sizes="160px" className="object-cover" />
      ) : (
        <span className="flex h-full items-center justify-center px-2 text-center text-xs text-muted">Sem prévia</span>
      )}
    </span>
  );
}
