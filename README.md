# Menya

Screening and decision-support app for a cough-counting wearable (Arduino Nano 33 BLE Sense).
It is **not a diagnostic tool**. Every results screen says: *"This is not a diagnosis. A health worker will follow up."*

Built with Expo (SDK 58) + React Native + Expo Router + TypeScript. It runs in **Expo Go** and in the browser with a built-in **demo device**. To talk to the real Arduino it needs a **development build** (see "Connecting the real Arduino").

## Run it on your phone

```bash
npm install
npx expo start
```

1. Install **Expo Go** on your Android or iOS phone.
2. Scan the QR code shown in the terminal (phone and computer on the same Wi-Fi).
   If the network blocks it, use `npx expo start --tunnel`.
3. On a computer browser: `npx expo start --web` shows the app in a phone-sized column.

Other commands: `npm run typecheck`, `npm run check:i18n` (checks every text exists in English and Kinyarwanda).

## Try the whole prototype

| Step | What to do |
| --- | --- |
| Patient flow | Get Started → tick consent → Patient → any Rwandan number (`78X XXX XXX`) → any 4-digit code → Search for device → Connect → Home |
| Health worker flow | Settings → Sign out → choose **Community health worker** |
| Design system | Welcome screen link, or Settings → Design system |

**Settings → Prototype tools** lets you test the hard states:

- **Show screens as: Full / Empty / Error** (empty states and friendly error screens on every screen)
- **Pretend I am offline** (offline banner, changes queue and send when you switch it off)
- **My cough status** (Normal / Watch / Follow-up changes Home, Follow-up and the CHW list)
- **Simulate a patient contacting me** (health worker: toast, red badge on the Alerts tab)

## Screens

| # | Screen | File |
| --- | --- | --- |
| 1 | Welcome | `src/app/index.tsx` |
| 2 | Consent and privacy | `src/app/consent.tsx` |
| 3 | Sign up / role / phone sign-in | `src/app/signup.tsx` |
| 4 | Pair device | `src/app/pair-device.tsx` |
| 5 | Home (patient) | `src/app/(tabs)/home.tsx` |
| 6 | History | `src/app/(tabs)/history.tsx` |
| 7 | Cough types | `src/app/cough-types.tsx` |
| 8 | Follow-up | `src/app/(tabs)/followup.tsx` |
| 9 | Health worker dashboard + patient detail | `src/app/(tabs)/patients.tsx`, `src/app/patient/[id].tsx` |
| 10 | Alerts | `src/app/(tabs)/alerts.tsx` |
| 11 | Settings, privacy, help | `src/app/(tabs)/settings.tsx`, `src/app/info/[topic].tsx` |
| + | Trends (health worker tab) | `src/app/(tabs)/trends.tsx` |
| + | Design system | `src/app/design-system.tsx` |

Tab bar: Patient = Home, History, Follow-up, Settings. Health worker = Patients, Alerts, Trends, Settings.
Cough types is one tap from Home. Any key information is at most 3 taps away.

## Code map

- `src/theme.ts`: colors, fonts, type scale, status colors
- `src/components/ui.tsx`: glass card, buttons, avatar, gauge, charts, banners, empty/error/loading states
- `src/i18n.ts`: English + Kinyarwanda text
- `src/store.tsx`: app state, saved on the phone (AsyncStorage), queue of changes to send when online
- `src/data/mock.ts`: realistic mock patients, alerts and cough counts

## Follow-up rules

- **Week of watching.** Every patient is followed for at least 7 days (`WATCH_DAYS` in `src/data/mock.ts`). During that week the patient only sees "Day X of 7" and no action is asked of them.
- **After the week.** If the cough is still rising, the patient is told "We suggest you get tested" and the Follow-up screen lists the community health workers in their sector (`CHW_DIRECTORY` and `chwsInSector()` in `src/data/mock.ts`).
- **The person notifies, not the system.** Menya never contacts a health worker. The patient calls or sends the message themselves (a pre-written SMS they press send on).
- **The person delivers, not the system.** The patient takes their own sample and any result to the health worker they choose. Menya never sends samples or results. The health worker marks "Sample and result received" on their side.
- Demo: Settings has a status override (Normal / Watch / Follow-up) that jumps the patient to day 4 or day 9.

## Design notes

- Backgrounds use the brand gradient `#5FA8B5 → #8CC3CE`. **White text on that gradient is only about 2.7:1 contrast**, so inside the app text on gradient and glass uses deep ink `#0E3B45` (4.5:1 or more). White text is used on deep teal `#2F7F8F`, ink, and the Welcome screen's deeper top.
- Status = colour **+ icon + word**, never colour alone.
- Body text 16 px, tap targets 48 px or more, screen-reader labels on controls, system font scaling stays on.

## What is simulated, and how to make it real

## Connecting the real Arduino

The app already speaks the protocol of the Edge Impulse sketch:

| Item | Value |
| --- | --- |
| Device name | `CoughCounter` |
| Service | `19B10000-E8F2-537E-4F6C-D104768A1214` |
| Characteristic (notify) | `19B10001-E8F2-537E-4F6C-D104768A1214` |
| Payload | 3 bytes, each 0-100: `[TB %, noise %, non-TB %]`, about one per second |

Keep the model labels in that order (TB, noise, non-TB). The code is in `src/device/`:

- `protocol.ts`: UUIDs and byte parsing
- `link.native.ts`: real Bluetooth (`react-native-ble-plx`). Falls back to the demo device if the native module is missing
- `link.ts` / `simulated.ts`: demo device for web and Expo Go (Live result screen has "Simulate a TB-like cough" tools)
- `DeviceProvider.tsx`: one connection for the whole app, auto-reconnect, turns readings into cough events saved on the phone

Steps:

1. Dependencies are already installed (`react-native-ble-plx`, `expo-dev-client`, plugin in `app.json`).
2. Make a development build: `npx expo run:android` (phone on USB) or `eas build --profile development --platform android`. Expo Go cannot use Bluetooth.
3. `npx expo start --dev-client`, open the build, **Settings > Device > Search for device**.
4. Open **Live result** from Home: first the live reading, then the counted coughs, then the conclusion.

**How the conclusion is made** (`src/analysis.ts`, screening guidance only, not a diagnosis). A reading with TB% + non-TB% of 60 or more is a cough; consecutive readings are one cough event; the event is TB-like if TB% is 50 or more and at least the non-TB%. Less than 10 coughs in 7 days: "collecting". Before day 7: Normal or Watch only. After day 7: Follow-up if the cough is rising and some of it is TB-like, or if it is mostly TB-like and frequent, or if it has lasted 14+ days. Each conclusion lists its reasons and a confidence level. **These numbers are defaults. Tune them (`COUGH_MIN`, `TB_MIN`, `TB_SOME`, `TB_HIGH`, `MIN_EVENTS`) with real pilot data and clinical advice.**

**Limits of the current sketch.** It only streams the current probabilities, so coughs are lost while the phone is out of range or the app is closed. Better firmware: count coughs on the Arduino, keep timestamps, and expose a cumulative counter (and optionally a battery characteristic) that the app reads on reconnect. Audio never leaves the device.

## Other parts that are still simulated

**Offline-first sync.** Everything is saved on the phone first. `store.tsx` keeps a `pending` queue (notes, visited, referred) and sends it when the connection returns. Replace the timer in `syncNow` with a call to your API.

**Contacting the health worker (privacy by design).** Menya never alerts a health worker on its own. On the Follow-up screen the patient taps "Tell my health worker"; the phone opens its own SMS app with a short pre-written message and the patient presses send. The health worker's Alerts tab therefore lists "patients who chose to contact you". There is no server-side SMS or push to health workers.

**Background listening.** Home and Settings have a "Listening in the background" switch (`listening` in `store.tsx`). The prototype only shows the state. For real use the app must keep its Bluetooth link to the Arduino alive while closed: add `react-native-ble-plx` in a development build, keep `UIBackgroundModes: bluetooth-central` (already in `app.json`) on iOS, and run a foreground service with a visible notification on Android. This does not work in Expo Go.

**Phone sign-in.** The code step accepts any 4 digits. Connect it to an SMS one-time-code service.

**Push notifications.** In-app alerts use the Alerts tab badge and a toast. Remote push needs a development build (Expo Go no longer supports it on Android).

**Kinyarwanda.** The translations are a careful first draft. Please have a native speaker and a CHW review them before field use.

**Health line.** The Help screen dials `114`. Confirm the right number for your programme.
