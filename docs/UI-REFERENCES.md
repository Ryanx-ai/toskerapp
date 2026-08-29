# UI References

## Milestone 2 shell lock

Sandbox is visually neutral and private, personal conversations remain person-led, and Rooms receive a gold sparkle plus a stronger uppercase tag. All three space types share Chat, Hall, and Add. Topbar utilities prioritize search and communication actions while lower-priority controls collapse on narrower desktop widths.

Hall cards use a consistent three-column desktop system, two columns at intermediate widths, and one column on mobile. Artwork must be mounted through the independent `art-layer-ready` surface layer so content and interaction structure never depend on illustration assets.

| Reference | Route / state | Surface |
| --- | --- | --- |
| `TOS.APP.01` | `/` and all conversation routes | Main messaging shell |
| `TOS.APP.SIDEBAR.01` | Desktop expanded/collapsed states | Product navigation, conversations, utilities, and profile |
| `TOS.PERSONAL.ROOM.01` | `/personal/my-room` | Permanent private Sandbox and self-messaging |
| `TOS.PERSONAL.CHAT.01` | `/personal/mika-tan` | Personal conversation |
| `TOS.ROOM.CHAT.01` | `/room/tokyo-2027` | Shared Room, defaulting to Chat |
| `TOS.ROOM.HALL.01` | `/room/tokyo-2027/hall` | High-signal shared notices |
| `TOS.ROOM.ADD.01` | Room header `+` | Future capability affordance |
| `TOS.MESSAGE.TRANSLATE.01` | Multilingual Tokyo messages | Reveal/hide predefined translation |
| `TOS.CREATE.ROOM.01` | `/create` | Minimal Create a Room flow |
| `TOS.ONBOARD.EMPTY.01` | `/` with Fresh account active | First launch inside the real Tosker shell |
| `TOS.ONBOARD.MYROOM.01` | `/personal/my-room` in Fresh account | Empty Sandbox and first self-message |
| `TOS.CREATE.ROOM.02` | `/create` → locally created `/room/[slug]` | Working local Room creation |
| `TOS.ROOM.EMPTY.01` | Newly created Room | Empty Chat and first-message moment |
| `TOS.ROOM.INVITE.01` | Room header, Invite | Prototype invite dialog |
| `TOS.ROOM.ADD.02` | Room header, `+` | Add-to-Room capability browser |
| `TOS.EXPLORE.01` | `/explore` | Playful capability discovery |
| `TOS.MARKETPLACE.01` | `/marketplace` | Future creator marketplace |
| `TOS.STUDIO.01` | `/studio` | Approachable creator surface |
| `TOS.SETTINGS.01` | `/settings` | Settings shell |
| `TOS.HELP.01` | `/help` | Help and feedback shell |
| `TOS.ROOM.COMMS.01` | Shared Room header | Search, voice, video, live, invite, and overflow prototype placement |
| `TOS.ART.RESERVE.01` | Chat, empty states, Explore hero | Neutral zones reserved for future founder-directed artwork |
| `TOS.APP.VIEWPORT.01` | Desktop application routes | Fixed viewport shell with independently scrolling work areas |
| `TOS.DASHBOARD.PERSONAL.01` | `/` | Prototype-user dashboard label and greeting |
| `TOS.APP.SEARCH.01` | Communication rail | Local filtering across Sandbox, people, Rooms, and tags |
| `TOS.CONVERSATION.ROW.02` | Conversation lists | Compact reusable row and overflow menu |
| `TOS.MESSAGE.MENU.01` | Message overflow or right-click | Context actions and guarded removal |
| `TOS.COMPOSER.MEDIA.01` | Chat composer | Image, file, emoji, and send affordances |
| `TOS.CHAT.SCROLL.01` | Tokyo 2027 | Predictable long-history scrolling |
| `TOS.EMPTY.SHADOW.01` | No selection | Quiet shadow-graphic atmosphere |
| `TOS.ROOM.SUBROOM.01` | Add to Room | Future Subroom concept |
| `TOS.SHELL.PERSISTENT.01` | All application routes | Stable communication rail with independently changing workspace |
| `TOS.LIST.UNIFIED.01` | Desktop and mobile Chats | Sandbox, people, and tagged Rooms in one ordered list |
| `TOS.FRIENDS.01` | `/friends` | Friends, requests, TID discovery, and Message action |
| `TOS.CREATE.CHOOSER.01` | Pink `+` | Start a chat or Create a Room |
| `TOS.CREATE.ROOM.03` | Room creation sheet | Name, optional tags/things/people, invite link, and QR prototype |
| `TOS.MOBILE.NAV.01` | 390px application shell | Messaging-priority bottom destinations without competing with Room tabs |

Milestone 1 Realm references and the dashboard-first Home are deprecated by the messaging-first founder IA refinement. Milestone 1.2 locks the shell and spatial Hall treatment. Milestone 2 references are in founder review and must not be treated as committed product architecture. The supplied MS2 concept boards guide layout, hierarchy, density, and future art direction only; their artwork is not bundled or reproduced.
