import { auth, currentUser } from "@clerk/nextjs/server";

import { ToskerIdentityProvider } from "@/components/tosker-identity";
import { AuthGate } from "@/components/auth-gate";
import { BootstrapFailure } from "@/components/bootstrap-failure";
import { ensureToskerAccount } from "@/server/accounts/bootstrap";

export async function ToskerSessionBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    return (
      <ToskerIdentityProvider identity={null}>
        <AuthGate>{children}</AuthGate>
      </ToskerIdentityProvider>
    );
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw new Error("The authenticated Clerk user could not be loaded.");
  }

  const emailName = clerkUser.primaryEmailAddress?.emailAddress.split("@")[0];
  const displayName =
    clerkUser.fullName || clerkUser.firstName || clerkUser.username || emailName || "Tosker";
  let identity;
  try {
    identity = await ensureToskerAccount({
      provider: "clerk",
      subject: userId,
      displayName,
      usernameHint: clerkUser.username || emailName,
      avatarUrl: clerkUser.imageUrl,
    });
  } catch {
    return <BootstrapFailure />;
  }

  return (
    <ToskerIdentityProvider identity={identity}>
      <AuthGate allowDemo={false}>{children}</AuthGate>
    </ToskerIdentityProvider>
  );
}
