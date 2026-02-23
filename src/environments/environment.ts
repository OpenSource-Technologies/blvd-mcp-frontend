// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  PAYMENT_API_BASE_URL: "https://vault-sandbox.joinblvd.com",
  MAIN_URL : 'http://localhost:3010/chat', //local
  // MAIN_URL : ' https://middleware.ostlive.com/chat', //live
  //  CHECKOUT_URL : 'http://localhost:4200/checkout'
   CHECKOUT_URL : 'https://blvd-chatbot.ostlive.com/checkout',
   PAYMENT_ENCRYPTION_KEY: 'cffb12f2250bad556f81e0fda891685c6a1576386e9baf3d14f954e745f4a9cb',
   BACKEND_URL: 'https://lg-chatbot.ostwork.com/api-token',
   CHAT_AGENT_URL: 'https://chat-agent.ostwork.com'
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
