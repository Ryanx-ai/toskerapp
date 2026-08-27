import Image from "next/image";
import Link from "next/link";
export function ToskerLogo() { return <Link href="/" className="brand-logo" aria-label="Tosker home"><Image src="/brand/toskerlogo-full-white.svg" alt="Tosker" width={178} height={72} priority /></Link>; }
