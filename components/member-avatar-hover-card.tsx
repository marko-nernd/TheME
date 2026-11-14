import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { memberPlaceholder } from "@/lib/member-placeholder";

export default function MemberAvatarHoverCard({
  name,
  href,
  imageSrc,
  role,
  location,
  online = false,
  size = 42,
}: {
  name: string;
  href: string;
  imageSrc: string | null;
  role: string;
  location?: string | null;
  online?: boolean;
  size?: number;
}) {
  return (
    <span className="member-avatar-hover" style={{ "--avatar-size": `${size}px` } as CSSProperties}>
      <span className="member-avatar-image">
        {imageSrc ? (
          <Image unoptimized src={imageSrc} alt={`${name} profile`} width={size} height={size} />
        ) : <Image unoptimized src={memberPlaceholder(role)} alt={`${role} placeholder`} width={size} height={size} />}
        {online && <i aria-label="Online now" title="Online now" />}
      </span>
      <span className="member-mini-profile" role="tooltip">
        <span className="member-mini-profile-image">
          {imageSrc ? (
            <Image unoptimized src={imageSrc} alt="" width={72} height={72} />
          ) : <Image unoptimized src={memberPlaceholder(role)} alt="" width={72} height={72} />}
          {online && <i />}
        </span>
        <span>
          <strong>{name}</strong>
          <small>{role}{location ? ` · ${location}` : ""}</small>
          <Link href={href} target="_blank" rel="noopener noreferrer">
            Open profile ↗
          </Link>
        </span>
      </span>
    </span>
  );
}
