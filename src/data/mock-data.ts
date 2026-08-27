export type Realm = { slug: string; name: string; kind: "Trip" | "Event" | "Gaming"; people: number; timing: string; note: string; palette: "gold" | "pink" | "yellow"; members: string[] };
export type Member = { name: string; initials: string; role: string; status: string; color: string };
export type Announcement = { title: string; body: string; author: string; time: string; icon: string };
export type ChatMessage = { author: string; initials: string; body: string; time: string; mine?: boolean; color: string };
export type PlanItem = { title: string; label: string; detail: string; meta: string; accent: "gold" | "pink" | "yellow" };

export const realms: Realm[] = [
  { slug: "tokyo-2027", name: "Tokyo 2027", kind: "Trip", people: 6, timing: "12–19 April", note: "Seven days, too many ramen spots, one shared plan.", palette: "gold", members: ["RY", "MK", "JL", "AN"] },
  { slug: "design-hack-night", name: "Design Hack Night", kind: "Event", people: 24, timing: "Tomorrow, 7:00 PM", note: "Make something strange before midnight.", palette: "pink", members: ["SO", "KL", "MI", "AP"] },
  { slug: "friday-pokemon", name: "Friday Pokémon", kind: "Gaming", people: 8, timing: "Friday", note: "Trades, snacks, and a very serious bracket.", palette: "yellow", members: ["RX", "CH", "TO", "EV"] },
];
export const members: Member[] = [
  { name: "Ryan", initials: "RY", role: "Host", status: "Planning Shibuya day", color: "gold" }, { name: "Mika", initials: "MK", role: "Co-host", status: "Found three coffee shops", color: "pink" }, { name: "Jordan", initials: "JL", role: "Member", status: "Arrives 4:20 PM", color: "yellow" }, { name: "Anika", initials: "AN", role: "Member", status: "Team window seat", color: "blue" }, { name: "Theo", initials: "TH", role: "Member", status: "Saving record stores", color: "green" }, { name: "Sofia", initials: "SO", role: "Member", status: "Bringing the film camera", color: "purple" },
];
export const announcements: Announcement[] = [
  { title: "Flights booked ✈", body: "Everyone’s arrival details are now together in the plan. We’ll meet by the North Wing arrivals café.", author: "Ryan", time: "Today, 4:12 PM", icon: "✈" }, { title: "Home base confirmed", body: "We’re staying in Shimokitazawa—two minutes from the station and dangerously close to late-night curry.", author: "Mika", time: "Yesterday", icon: "⌂" }, { title: "Bring one wildcard idea", body: "Save one afternoon for something none of us planned. Drop your best oddball suggestion in Chat.", author: "Ryan", time: "Monday", icon: "✦" },
];
export const messages: ChatMessage[] = [
  { author: "Mika", initials: "MK", body: "Okay, important question: first-night ramen or tiny listening bar?", time: "7:42 PM", color: "pink" }, { author: "Jordan", initials: "JL", body: "Both feels like the only culturally responsible answer.", time: "7:44 PM", color: "yellow" }, { author: "Ryan", initials: "RY", body: "I’ve added the ramen shortlist to Plan. Vote with your stomach.", time: "7:46 PM", mine: true, color: "gold" }, { author: "Sofia", initials: "SO", body: "I found a photo walk through Yanaka that ends near a bakery shaped like a cat 🐈", time: "7:51 PM", color: "purple" }, { author: "Theo", initials: "TH", body: "This trip is already operating at peak efficiency.", time: "7:53 PM", color: "green" },
];
export const planItems: PlanItem[] = [
  { title: "Seven days in Tokyo", label: "Itinerary", detail: "6 days sketched · 14 saved places", meta: "Next: arrival night", accent: "gold" }, { title: "Places we keep talking about", label: "Shared map", detail: "Ramen, records, gardens, coffee", meta: "28 pins", accent: "pink" }, { title: "First-night dinner", label: "Group poll", detail: "Ramen has a narrow lead", meta: "5 of 6 voted", accent: "yellow" },
];
