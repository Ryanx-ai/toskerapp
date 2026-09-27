import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { messageInline, messagePlainPreview } from "../src/lib/message-format";
import { MessageText } from "../src/components/message-text";

assert.deepEqual(messageInline("**bold** *italics* _also_"), [
  {kind:"strong",children:[{kind:"text",text:"bold"}]},{kind:"text",text:" "},
  {kind:"em",children:[{kind:"text",text:"italics"}]},{kind:"text",text:" "},{kind:"em",children:[{kind:"text",text:"also"}]},
]);
for (const value of ["unclosed **text", "snake_case_here", "** **", "plain 日本語", "<script>alert(1)</script>"]) assert.equal(messagePlainPreview(value),value);
assert.equal(messagePlainPreview("**bold with _italic_**"),"bold with italic");
assert.equal(messagePlainPreview("\\*literal\\*"),"*literal*");
const html=renderToStaticMarkup(<MessageText body={'**<img src=x onerror=alert(1)>** https://example.com/a_b?q=one_two _hello_'} />);
assert(html.includes("<strong>&lt;img")); assert(!html.includes("<img"));
assert(html.includes('href="https://example.com/a_b?q=one_two"')); assert(html.includes("<em>hello</em>"));
assert(!renderToStaticMarkup(<MessageText body="javascript:alert(1) <a href=x>hi</a>" />).includes("<a "));
const mentionBody="**Hi @Friend_name**";
const mentionHtml=renderToStaticMarkup(<MessageText body={mentionBody} mentions={[{start:5,length:12,label:"@Friend_name",userId:"0ee1e5a5-6d7a-4541-a6ca-ca69788997ef"}]} />);
assert(mentionHtml.includes('class="message-mention"')); assert(mentionHtml.includes("<strong>Hi "));
assert(!renderToStaticMarkup(<MessageText body="**https://example.com/path**" links={false} />).includes("<a"));
assert.equal(messagePlainPreview("**https://example.com/path**"),"https://example.com/path");
assert.equal(messagePlainPreview("*".repeat(4000)).length > 0,true);
console.log("PASS FP5 deterministic emphasis, literal malformed/control HTML, nested/escaped text, atomic mention/URL, non-link previews; no raw HTML renderer");
