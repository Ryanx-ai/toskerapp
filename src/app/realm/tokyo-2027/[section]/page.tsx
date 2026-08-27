import { notFound } from "next/navigation";
import { RealmContent, type RealmSection } from "@/components/realm-content";
const sections: RealmSection[] = ["chat", "plan", "people"];
export function generateStaticParams() { return sections.map((section) => ({ section })); }
export default async function RealmSectionPage({ params }: { params: Promise<{ section: string }> }) { const { section } = await params; if (!sections.includes(section as RealmSection)) notFound(); return <RealmContent section={section as RealmSection} />; }
