# MCP frontend code review

1. Critical – src/app/pages/checkout/checkout.component.ts (lines 77-98) posts the card token to window.parent with the target set to '*'. Any site that iframes your checkout route can capture the tokenized card data, which is effectively a credential leak. Limit the target origin (and ideally validate the parent before posting) to keep tokens from leaving trusted domains.

2. High – src/app/chat/chat.component.ts (lines 54-65) accepts any postMessage without checking event.origin. A malicious script running on the page can forge a "checkout-iframe" payload and trigger sendTokanizeToken, letting an attacker push arbitrary tokens into the checkout flow. Validate the sender origin before trusting the message.

3. High – src/app/chat/chat.component.ts (lines 92-110) sets isMsgSend = true, trims the input, and returns when it is empty without resetting the flag. After one blank submit, every later message is silently blocked because isMsgSend never flips back.

4. Medium – src/app/chat/chat.component.ts (lines 100-109) flips isLoading to true before routing the message to the human-agent path, but handleHumanMessage never clears it. As soon as the bot hands off to an agent the typing indicator becomes permanent.

5. Medium – src/app/chat/chat.component.ts (lines 21-23) and src/app/services/chat.services.ts (lines 13-15) hard-code the chat API base URL, checkout host, and an OpenAI thread id. None of these can be overridden per environment, so staging/prod deployments require code edits and risk shipping internal endpoints.

## Recommendation

1. Lock down cross-window messaging so card tokens stay in trusted contexts, restore isMsgSend/isLoading when the user cancels or hands off, and move the various API endpoints/thread ids into environment configuration so deployments don’t require source edits.

2. Harden Markdown rendering: marked + [innerHTML] currently inserts raw HTML (see src/app/chat/chat.component.html). Either enable marked’s sanitizer or run the output through Angular’s DomSanitizer.sanitize so user-supplied content can’t inject scripts.

3. Unregister window listeners: add ngOnDestroy in ChatComponent to remove the message listener you attach in ngOnInit; otherwise navigating away/re-entering registers duplicates and leaks memory.

4. Modernize the HTTP call: replace .toPromise() in handleBotMessage with firstValueFrom/lastValueFrom—toPromise is deprecated and will disappear in future RxJS releases.

5. Externalize runtime configuration: lift mainUrl, checkoutUrl, and the threadId in ChatService into environment files so developers aren’t patching source to switch between dev/stage/prod.