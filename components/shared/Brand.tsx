import Link from "next/link";

export function Brand({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return (
    <Link className={`brand-lockup${inverse ? " brand-lockup--inverse" : ""}`} href="/" aria-label="NASA EVENT home">
      <span className="brand-symbol" aria-hidden="true"><i>N</i></span>
      {!compact && <span className="brand-word">NASA<span>.</span>EVENT</span>}
    </Link>
  );
}
