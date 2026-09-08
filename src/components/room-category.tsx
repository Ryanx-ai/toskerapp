import { BookOpen, BriefcaseBusiness, Gamepad2, Map, MessagesSquare, Trophy, Tag } from "lucide-react";
export function RoomCategory({ value }: { value: string }) {
  const category = value.trim().toLowerCase();
  const [Icon, color] = /gaming|game/.test(category) ? [Gamepad2, "#c8b4e5"] : /trip|travel/.test(category) ? [Map, "#a4d3cf"] : /study|learning/.test(category) ? [BookOpen, "#edcd92"] : /work/.test(category) ? [BriefcaseBusiness, "#accce8"] : /chill|family|social/.test(category) ? [MessagesSquare, "#e8b6cb"] : /sport/.test(category) ? [Trophy, "#b9d5a1"] : [Tag, "#c6cbc9"];
  return <span className="room-category" style={{ color: color as string }}><Icon size={13} aria-hidden="true" /><span>{value}</span></span>;
}
