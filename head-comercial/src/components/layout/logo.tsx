import Image from "next/image";

export function Logo({ height = 28, className }: { height?: number; className?: string }) {
  return (
    <Image
      src="/orbion-logo.png"
      alt="Orbion"
      height={height}
      width={height * 4}
      className={className}
      style={{ objectFit: "contain", height, width: "auto" }}
      priority
    />
  );
}
