# MS5 founder walkthrough

Run the app locally with the isolated Development Neon and Clerk values in `.env.local`, then `npm run dev`.

1. Sign in as User A. Confirm canonical Namecard/TID/Sandbox, the shared Room, and owner state.
2. Open the Room Chat and Personal Chat. Confirm messages from both users survive reload.
3. Open Room Hall. Confirm the pinned Chat reference and native note; create another note from the dashed `+ New Note` board card.
4. Open Add. Confirm installed Poll/Schedule are disabled as Added and another supported Gizmo persists after reload.
5. Open Friends. Confirm the accepted canonical User B connection and Message action.
6. Open Notifications. Confirm durable connection/Hall activity.
7. Sign out, then sign in as User B. Confirm the different Profile/TID/Sandbox, member state, same Room history, same personal conversation, Hall content, and accepted Friend.
8. Check invalid invite and guessed private Room URLs show intentional unavailable/not-found behavior.

Do not test this checkpoint on canonical production: it deliberately remains on MS4.1 pending approval.
