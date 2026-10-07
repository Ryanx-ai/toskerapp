import assert from "node:assert/strict";
/** Normal Clerk Development QA authentication, no cookie injection or auth bypass. */
export async function ensureFp6QaLogin(page,actor="a") {
  assert(["a","b"].includes(actor));
  await page.waitForFunction(()=>document.querySelector('[aria-label="Search places"]')||[...document.querySelectorAll('button')].some(e=>e.textContent==='Sign in'),{},{timeout:30000});
  const signIn=page.getByRole("button",{name:"Sign in",exact:true});
  if(!await signIn.count())return;
  const email=`tosker.user.${actor}+clerk_test@example.com`;
  await signIn.click();await page.getByRole("textbox",{name:"Email address",exact:true}).fill(email);
  await page.getByRole("button",{name:"Continue",exact:true}).click();
  await page.getByRole("link",{name:"Use another method",exact:true}).click();
  await Promise.all([page.waitForResponse(r=>r.url().includes("/prepare_first_factor")&&r.status()===200,{timeout:30000}),page.getByRole("button",{name:`Email code to ${email}`,exact:true}).click()]);
  await page.getByRole("textbox",{name:"Enter verification code",exact:true}).fill("424242");
  await page.getByRole("button",{name:"Open your Namecard",exact:true}).waitFor({timeout:60000});
}
