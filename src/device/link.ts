// Fallback for platforms with no Bluetooth file of their own.
// Web uses link.web.ts. iOS and Android use link.native.ts.
// This fallback reports that Bluetooth is unavailable. It does not invent readings.
export { simulatedLink as link } from './simulated';
