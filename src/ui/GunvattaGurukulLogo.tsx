import { EMBLEM_SRC, LOGO_ALT, LOGO_SRC } from "../brand";

const WIDTH: Record<"login" | "header" | "footer" | "compact", number> = {
  login: 240,
  header: 148,
  footer: 88,
  compact: 40,
};

type Props = {
  size?: keyof typeof WIDTH;
  variant?: "full" | "emblem";
  className?: string;
};

/** Official Gunvatta Gurukul mark. Always a local official asset; never redrawn. */
export function GunvattaGurukulLogo({ size = "header", variant = "full", className = "" }: Props) {
  const width = WIDTH[size];
  const full = variant === "full";
  return (
    <img
      src={full ? LOGO_SRC : EMBLEM_SRC}
      alt={LOGO_ALT}
      width={width}
      className={`gg-logo gg-logo-${size}${full ? "" : " gg-logo-emblem"}${className ? ` ${className}` : ""}`}
      decoding="async"
    />
  );
}
