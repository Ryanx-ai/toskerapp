export type ConversationKind = "my-room" | "personal" | "room";
export type Language = "English" | "Chinese" | "Japanese" | "Indonesian" | "Thai";

export type Message = {
  id: string;
  author: string;
  initials: string;
  body: string;
  time: string;
  color: string;
  mine?: boolean;
  language?: Language;
  translation?: string;
  attachment?: { type: "image" | "file"; name: string; meta: string };
  replyTo?: string;
  reactions?: string[];
};

export type Conversation = {
  slug: string;
  kind: ConversationKind;
  name: string;
  initials: string;
  color: string;
  preview: string;
  time: string;
  unread?: number;
  context: string;
  messages: Message[];
  tag?: string;
};

export type HallNotice = { id: string; icon: string; category: "Announcement" | "Decision" | "Reminder" | "Link" | "Poll result" | "Details"; title: string; body: string; author: string; time: string; accent: "gold" | "pink" | "yellow" | "blue"; pinned?: boolean };

export const conversations: Conversation[] = [
  {
    slug: "my-room", kind: "my-room", name: "My Room", initials: "RY", color: "gold", preview: "Links, thoughts, notes", time: "Now", context: "Private · Just you",
    messages: [
      { id: "mine-welcome", author: "Tosker", initials: "✦", body: "This is your room. Send yourself something.", time: "9:00 AM", color: "gold" },
      { id: "mine-note", author: "Ryan", initials: "RY", body: "Ideas for Tokyo: quiet coffee, record stores, and one completely unplanned afternoon.", time: "9:14 AM", color: "gold", mine: true },
    ],
  },
  {
    slug: "mika-tan", kind: "personal", name: "Mika Tan", initials: "MK", color: "pink", preview: "I saved that place for Thursday", time: "7:58 PM", unread: 2, context: "Personal conversation",
    messages: [
      { id: "mika-1", author: "Mika", initials: "MK", body: "I found the tiny listening bar we talked about.", time: "7:44 PM", color: "pink" },
      { id: "mika-2", author: "Ryan", initials: "RY", body: "The one with six seats and the wall of jazz records?", time: "7:47 PM", color: "gold", mine: true },
      { id: "mika-3", author: "Mika", initials: "MK", body: "That’s it. I saved that place for Thursday.", time: "7:58 PM", color: "pink" },
    ],
  },
  {
    slug: "jordan-lee", kind: "personal", name: "Jordan Lee", initials: "JL", color: "yellow", preview: "Send me the flight details?", time: "5:20 PM", context: "Personal conversation",
    messages: [
      { id: "jordan-1", author: "Jordan", initials: "JL", body: "Send me the flight details when you get a chance?", time: "5:20 PM", color: "yellow" },
    ],
  },
  {
    slug: "anika-rai", kind: "personal", name: "Anika Rai", initials: "AN", color: "blue", preview: "Perfect, see you Friday!", time: "Mon", context: "Personal conversation",
    messages: [{ id: "anika-1", author: "Anika", initials: "AN", body: "Perfect, see you Friday!", time: "Monday", color: "blue" }],
  },
  {
    slug: "tokyo-2027", kind: "room", name: "Tokyo 2027", initials: "東京", color: "gold", preview: "Theo: This trip is operating at peak efficiency", time: "7:53 PM", unread: 4, context: "6 people · Tokyo, Japan", tag: "TRIP",
    messages: [
      { id: "tokyo-01", author: "Mika", initials: "MK", body: "I moved the flight details into Hall so nobody has to hunt for them again", time: "9:08 AM", color: "pink" },
      { id: "tokyo-02", author: "Ryan", initials: "RY", body: "Heroic. I was three scrolls away from giving up", time: "9:10 AM", color: "gold", mine: true, replyTo: "Flight details are now in Hall" },
      { id: "tokyo-03", author: "Theo", initials: "TH", body: "The shared itinerary is here: https://example.com/tokyo-plan", time: "9:14 AM", color: "green" },
      { id: "tokyo-04", author: "Ayu", initials: "AY", body: "Aku menemukan kedai kopi kecil dekat penginapan kita", time: "9:22 AM", color: "purple", language: "Indonesian", translation: "I found a small coffee shop near where we’re staying" },
      { id: "tokyo-05", author: "Ryan", initials: "RY", body: "Saving that for the jet-lag morning", time: "9:24 AM", color: "gold", mine: true },
      { id: "tokyo-06", author: "Lin", initials: "林", body: "我把地址和营业时间放在这里了", time: "10:03 AM", color: "blue", language: "Chinese", translation: "I put the address and opening hours here" },
      { id: "tokyo-07", author: "Lin", initials: "林", body: "Coffee shop details", time: "10:04 AM", color: "blue", attachment: { type: "file", name: "Kissa shortlist.pdf", meta: "PDF · 1.8 MB" } },
      { id: "tokyo-08", author: "Hana", initials: "花", body: "この景色を見て！", time: "11:18 AM", color: "yellow", language: "Japanese", translation: "Look at this view!", attachment: { type: "image", name: "shimokitazawa-evening.jpg", meta: "Image preview placeholder" } },
      { id: "tokyo-09", author: "Mika", initials: "MK", body: "Okay, important question: first-night ramen or tiny listening bar?", time: "12:42 PM", color: "pink" },
      { id: "tokyo-10", author: "Nok", initials: "NK", body: "ฉันจะเอากล้องฟิล์มไปด้วย", time: "12:51 PM", color: "green", language: "Thai", translation: "I’ll bring my film camera too" },
      { id: "tokyo-11", author: "Ryan", initials: "RY", body: "Both. This is not a trip for sensible compromises", time: "1:02 PM", color: "gold", mine: true, replyTo: "ramen or tiny listening bar?" },
      { id: "tokyo-12", author: "Theo", initials: "TH", body: "Poll says ramen first by a landslide 🍜", time: "2:16 PM", color: "green" },
      { id: "tokyo-13", author: "Mika", initials: "MK", body: "Booked six seats for 7:30. Details are pinned", time: "3:08 PM", color: "pink" },
      { id: "tokyo-14", author: "Hana", initials: "花", body: "完璧！その後レコード屋にも行こう", time: "4:31 PM", color: "yellow", language: "Japanese", translation: "Perfect! Let’s visit the record shop after that too" },
      { id: "tokyo-15", author: "Ryan", initials: "RY", body: "I’ve added the record-store shortlist. Vote with your wallet", time: "5:12 PM", color: "gold", mine: true },
      { id: "tokyo-16", author: "Ayu", initials: "AY", body: "Tiny update: the weather looks clear on Thursday", time: "6:04 PM", color: "purple" },
      { id: "tokyo-17", author: "Theo", initials: "TH", body: "This trip is already operating at peak efficiency", time: "7:53 PM", color: "green" },
    ],
  },
  {
    slug: "design-hack-night", kind: "room", name: "Design Hack Night", initials: "✦", color: "pink", preview: "Sofia: Doors open at seven", time: "3:12 PM", context: "24 people · Tomorrow, 7:00 PM", tag: "EVENT",
    messages: [{ id: "hack-1", author: "Sofia", initials: "SO", body: "Doors open at seven. Bring a charger and one strange idea.", time: "3:12 PM", color: "purple" }],
  },
  {
    slug: "friday-pokemon", kind: "room", name: "Friday Pokémon", initials: "◒", color: "yellow", preview: "Chris: I finished the bracket", time: "Fri", context: "8 people · Friday", tag: "GAMING",
    messages: [{ id: "pokemon-1", author: "Chris", initials: "CH", body: "I finished the bracket. No complaints about the seeding until snacks arrive.", time: "Friday", color: "yellow" }],
  },
];

export const hallNotices: HallNotice[] = [
  { id: "flight", icon: "✈", category: "Announcement", title: "Flight details updated", body: "Everyone’s arrival details are together. Meet by the North Wing arrivals café.", author: "Ryan", time: "Today, 4:12 PM", accent: "gold", pinned: true },
  { id: "dinner", icon: "✓", category: "Decision", title: "Dinner at 7:30 PM", body: "Six seats are booked at the tiny ramen place in Ebisu. Listening bar after.", author: "Mika", time: "Today, 2:06 PM", accent: "pink", pinned: true },
  { id: "passport", icon: "!", category: "Reminder", title: "Bring passports tomorrow", body: "We need them for the rail-pass collection at Tokyo Station.", author: "Ryan", time: "Yesterday", accent: "yellow" },
  { id: "itinerary", icon: "↗", category: "Link", title: "Shared itinerary", body: "The latest day-by-day plan, arrival details, and saved places live here.", author: "Ayu", time: "Yesterday", accent: "blue" },
  { id: "poll", icon: "◒", category: "Poll result", title: "Team chose Shibuya", body: "Five votes to one. Thursday afternoon is now officially record-store time.", author: "Tosker", time: "Monday", accent: "gold" },
  { id: "checkin", icon: "⌂", category: "Details", title: "Check-in after 3 PM", body: "Shibuya Stay, 5-12-8 Dogenzaka. The booking is under Ryan.", author: "Ryan", time: "Monday", accent: "blue" },
];

export function getConversation(slug: string) {
  return conversations.find((conversation) => conversation.slug === slug) ?? conversations[0];
}
