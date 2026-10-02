# BBG

**Benny's Brain Gym**

Challenging brain training, not easy-win games. BBG is a serious, local-first tool for memory, attention and reasoning practice, with 25 timed exercises and an untimed forecasting journal. It supports English/German interfaces, keyboard/mouse/touch controls, and requires no account or backend.

There are no points, badges, leaderboards or streak rewards. Progress records describe your practice, not a game to win. Supported adaptive exercises use your responses to adjust difficulty within your configured bounds and remember eligible progress for the same setup. Assessments remain fixed; not every exercise adapts. The purpose is meaningful, repeatable practice, not a claim of general cognitive improvement or medical benefit.

## Run locally

Use Node.js 20 or newer for the development tools:

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:4173**. There is no build step and no production JavaScript dependency. The development server serves application assets only, not the rest of the repository.

For a phone on the same trusted Wi-Fi network:

```sh
npm run dev -- --host 0.0.0.0 --port 4173
```

Open `http://<your-computer-LAN-address>:4173` on the phone. Allow local-network access through the computer's firewall if necessary. LAN HTTP supports ordinary practice, but service workers, offline installation, browser notifications, native device sharing and screen wake locks require **HTTPS or localhost**. Link copying and social-share links remain available without native sharing. A phone's `localhost` is the phone, not the computer.

For everyday use, publish `index.html`, `app.js`, `i18n.js`, `styles.css`, `js/`, `icons/`, `manifest.webmanifest` and `sw.js` together on a static HTTPS host. Keep their relative paths and serve `sw.js` without long-lived HTTP caching. Do not publish development dependencies or test artifacts.

Browser data belongs to an **origin**: protocol, hostname and port. Changing from a LAN address to HTTPS, using another browser, or installing in a separate storage context may start with empty data. Export JSON before changing where you use the app; there is no automatic device sync. Opening the HTML directly as a file is not the supported offline-installation path.

## Your practice schedule

**Today** offers a date-based plan rather than requiring you to choose every exercise yourself. In **Settings**, choose a 10/15/20-minute budget, preferred weekdays and an optional local start time. The default remains every day at 08:00 with a 10-minute template of focus, memory and reasoning rounds. The 15-minute template adds PVT-B; the 20-minute template also adds paired associates.

Practice labels follow your preferred time: morning, afternoon, evening or night. Leave the time blank for flexible starts, or clear all days for an unscheduled plan. The home screen shows selected/rest days and the next preferred start, but never prevents off-day practice. Preferences belong to this browser's local profile, not an account; times follow the device's local timezone.

These are estimated budgets, **not countdown cutoffs**. Warm-ups, pauses and slower answers can add time. A round keeps its full protocol instead of being cut short to meet a budget. Completed and skipped steps persist, so you can return between rounds later that day. An interrupted measured round must be retried, not resumed halfway through.

Routine profiles do not overwrite your saved exercise parameters. Time-budget changes apply to the next new routine; an already-started plan stays stable for the current local calendar day. Use **Exercises** for individual practice, search, categories and favorites.

New training setups include eight actual warm-up presentations. Successful warm-up practice makes the same setup eligible for an optional warm-up next time; you can always choose to repeat it. Familiarity depends on parameters, device class, input method, relevant language and protocol. N-back also requires a target-match response for every enabled stream, not just correctly withholding responses.

**Assessments are separate:** they always include eight warm-up presentations, do not adapt their main difficulty or reveal main-round correctness, and retain their configured protocol. Only valid scored assessments start the same-task 14-day cooldown. Interrupted and practice-only attempts do not.

Arithmetic keeps its starting/fixed maximum separate from the configurable training ceiling (default 1,000), preserving upward adaptation without exceeding that ceiling. Every displayed calculation operand, including a division's dividend and chained additions, respects the configured minimum and current maximum. Percentage rates and calculated results need not fall within the operand bounds. Division uses nonzero divisors and exact integer results. Existing saved arithmetic settings and daily plans adopt the default ceiling.

Tower of London offers **Visible moves** (the default) and **Mental planning** under the exercise's **Settings > Planning mode**. Mental planning keeps the starting arrangement and target visible but does not reveal intermediate states or move legality while you enter your plan. Choose source/destination pegs with 1/2/3 or the response buttons; repeat the source to cancel its selection. **Undo / Backspace** cancels a pending source or removes the last complete move. **Submit plan / Enter** checks the whole sequence within the displayed move limit; reaching that limit does not submit automatically. Any legal sequence ending at the target is accepted, including nonoptimal solutions within the allowed extra moves. Start with two or three optimal moves and increase gradually.

Successful mental plans replay the player's actual moves after submission, with stepped board states instead of smooth movement when reduced motion is requested. Unsuccessful submissions reveal the first illegal move and the last legal state, or the final arrangement if the plan missed the target. Unsubmitted plans time out without being scored as solved. Warm-ups and training provide this feedback; main assessments provide neither correctness feedback nor replays. The planning-mode parameter keeps scores, adaptive state and warm-up familiarity separate. Existing settings and daily plans retain visible moves.

**Memory palace practice** replaces the old method-of-loci word/landmark recognition exercise while retaining its `method-loci` identifier and historical results. Its introduction explains how to choose a familiar ordered route, create vivid interactions and mentally revisit the places. The default three-item load increases through successful training, up to the configured maximum of 16. Clear the previous mental images before each new sequence; the route stays fixed.

Choose **Everyday objects** (32 illustrated objects), **Familiar public figures** (an editable list of names you already recognize, without downloaded portraits), or **Classic playing cards** (all 52 cards in the catalogue; practice sequences contain up to 16). Cards are an advanced set: first invent consistent personal card-to-image associations. Preset routes are examples, not substitutes for places you know. Set your own unique landmarks in exercise settings.

Training and all eight warm-ups are **self-paced**: navigate items with **Previous/Next / Left/Right**, revisit them as needed, and explicitly choose **Ready to recall / Enter** after viewing every item. There is no hidden memorization timeout or shortened warm-up exposure. **Guided** mode offers **Show/hide place / R** as optional coaching; **Independent** mode provides no study landmarks. Recall always hides the studied sequence and route. Reconstruct the order from the **entire catalogue**, with six options per page—not a shortlist revealing the studied items. **1–6** selects the displayed options, **Left/Right** changes pages, **Undo / Backspace** corrects entries, **Skip position / Space** preserves a forgotten position, and **Submit recall / Enter** submits explicitly. Filling all positions does not submit automatically. Unsubmitted recall times out without credit; submitted partial recalls earn credit for correct positions.

Main assessments retain fixed item count and expose each item for the configured **Fixed assessment study time per item** (default 10 seconds), without early advancement or correctness feedback. Memorization time is recorded separately from recall and reported as descriptive seconds per sequence/per item—not a speed target or proof that a player used loci. The task uses **protocol version 3** so its new scores, adaptive state and warm-up familiarity remain separate from old recognition rounds. New material sets and coaching settings also form separate setups. Old settings and daily plans acquire object/guided defaults; the obsolete distractor-count setting is no longer used.

Stroop warm-ups cover WORD and INK when both rules are enabled, still using eight presentations in total. Stroop, Flanker and Simon main blocks always run for the full 90 seconds, even when rapid input is excluded from scoring. PVT-B retains genuine slow lapses in its lapse count and reaction-time metrics; a missed stop-cue display cannot update the stop-signal staircase. Corrected arithmetic, vigilance, conflict and memory-palace rounds use protocol version 3, keeping their scores, adaptive state and warm-up familiarity separate from earlier implementations; other exercises retain protocol version 2. Historical records remain available.

### Optional daily Wikipedia reading

The main page offers **Daily Wikipedia read** beside Morning practice, above the last-seven-days activity card. It is **enabled by default** for fresh profiles and older profiles without a reading preference; an explicitly saved off setting remains off. Use **Settings > Daily Wikipedia read** (or the **Reading interests** button at the bottom of the card) to turn it off or choose science, technology, politics, celebrities, history, nature, space, arts/culture, geography or sports. It uses Wikipedia's public, anonymous Action API directly from the browser: no AI, API key, account, paid service or app backend.

Selected interests rotate by the local calendar day. Wikipedia randomly selects a small batch of articles in language-specific topic categories; the app chooses a suitable plain-text introduction, rejects disambiguations/lists/formula-heavy extracts, and keeps the day's selection stable after reload. These are encyclopedia excerpts, not generated trivia, independent fact checks or live news. Categories are broad, and English/German celebrity pools differ. There is no quiz or score.

The reading body is capped at **180 words and 1,400 characters**, plus a title of at most 20 words. The two-minute label is an estimate at 120 words/minute, not a guarantee about anyone's reading speed. Excerpts preserve source paragraphs and are shortened at sentence boundaries where possible, without summarizing or inventing information. Long blocks are presented as shorter paragraphs at sentence boundaries, with readable typography and an estimated reading time. Each carries a revision-specific Wikipedia source, contributor-history link and **CC BY-SA 4.0** attribution; shortening and context are disclosed in the expandable footer.

When the selected article has a free Wikimedia Commons illustration, the card shows a bounded thumbnail with its supplied creator, image license and file-credit link. Non-free images, incomplete attribution and untrusted image hosts are not used. Today's older text-only cache can gain an illustration without changing its selected article. An unavailable image never blocks the text.

An internet connection is needed for a new selection and for illustrations. The latest matching excerpt and image-credit metadata are stored in the existing local profile and JSON backups; the text can be read offline, without making image requests. An older cached read is dated explicitly, not presented as today's selection. API requests time out after eight seconds; failures offer a retry and do not block training. In-flight requests are cancelled when leaving the home page, hiding the app or disabling/changing the feature. No analytics or third-party scripts are loaded.

While enabled, the feature contacts Wikipedia and, for images, Wikimedia Commons; these services see your IP address and requested topic/file. API and image requests omit credentials/cookies and referrers. No scores, forecasts or complete interest profile are sent. Turning it off stops requests. Deleting local app data deletes the reading cache and resets preferences to their defaults, including enabled reading. Clearing raw trial rows leaves the excerpt and preferences intact. The service worker caches the reading code, not external Wikipedia responses or images.

### Optional reminders

Open **Settings > Practice reminders** to enable browser reminders explicitly. Permission is requested only when you turn the option on, and opting in is saved only with **Save settings**. They require notification permission and an active service worker. On supported iPhone/iPad versions, browser notification support is available to installed Home Screen apps; use calendar reminders if the browser cannot enable it.

**Browser reminders are best-effort while BBG is open, not scheduled push notifications when it is closed.** The app checks approximately every 30 seconds and on focus/visibility changes, within 30 minutes after your preferred start on selected days, at most once per local date. Suspended/background tabs may not run the check. It skips running/starting rounds, pending saved work, days with completed practice and already-started daily plans. Clicking a reminder focuses an existing app tab without navigating or losing a round/draft; otherwise it opens Today. No push subscription, server or background wakeup service is introduced.

For reminders **when BBG is closed**, export a weekly `.ics` calendar file from the same settings section and import it into your calendar app. The export uses the currently selected form values, local/floating start times, chosen weekdays, estimated duration and an at-start alarm. Delivery and timezone/daylight-saving rules depend on that calendar app. Imported events cannot observe completed practice or later BBG settings changes: replace the old calendar event when changing your schedule, rather than importing duplicate events.

### Sharing BBG

**Share BBG** is available in the footer and Settings. The dialog offers native device sharing when supported, link copying (with a selected-link manual fallback), and Facebook/X/WhatsApp links. It shares only the public app link and a short app description, never scores, forecasts, preferences or backups. Query parameters and private route identifiers are removed; deployment subpaths are retained.

No social SDKs or tracking are loaded, and no social-network request occurs until you choose a network. Sharing a localhost development address will not make it reachable on someone else's device; the dialog warns about that. Use the published app address for public sharing.

## Mobile, installation and offline use

The interface supports narrow portrait screens, landscape phones and tablet layouts. Response controls have native accessible buttons over the exercise surface, with at least 44 CSS-pixel hit targets after scaling. Arithmetic accepts either decimal separator; n-back supports independent simultaneous touches. Rotation and Tower boards stack in narrow portrait layouts.

Fullscreen is optional and off by default. Wake lock is best-effort; failure does not prevent practice. Choose your orientation before a measured phase: rotating or hiding the app during practice/main interrupts the attempt to avoid silently mixing measurements. Changing orientation between warm-up and main is allowed.

After the first successful online load and service-worker installation, the application shell and exercises reopen offline. Chromium can offer an install prompt; on iPhone/iPad use Safari's **Add to Home Screen**. Availability and storage behavior depend on the browser and OS.

Updates are offered explicitly. They do not automatically reload another tab or interrupt a round. Updating is blocked while starting/running a round, while saved data is pending, or while a forecast draft could not be persisted. Finish the round and save drafts or export pending work first.

Audio n-back uses **local speech voices only**, with distinct letter-name and word sets. Use the audio preview to check the selected language on your device. If a local voice is unavailable, audio practice is blocked with a notice; it does not silently use a remote voice or replace speech with tones.

## Visual design and color evidence

Open **Settings > Appearance** to independently choose **Light**, **Dark** or **Follow device**, and a **Rose**, **Graphite** or **Amber** color theme. The default is Graphite with device-following brightness. Saved color choices are preserved; new profiles, resets and older backups without a color choice use Graphite. All combinations use clean, neutral backgrounds rather than green-tinted surfaces; Graphite is the minimal monochrome interface, including category labels and illustrations. Selections preview immediately, but are only saved with **Save settings**. Close, Cancel or Escape restores the saved appearance without saving other draft preferences. Appearance is stored in the same local profile and JSON backups; older backups acquire the default accent without losing history or their existing light/dark choice.

Themes use semantic `--cp-*` tokens, contrast-tested text, visible focus indicators and reduced-motion support. In colored themes, restrained category colors always accompany written labels and distinct icons; Graphite retains those labels/icons without relying on color. Progress charts pair each of their four series styles with a matching line pattern and point shape in the legend, so color is not the only way to distinguish series. The decorative orbital illustration is static and never appears in a timed round. Exercise backgrounds, response highlights and stimulus colors remain independent of the interface theme, so color-sensitive exercises keep their protocols.

This is an evidence-informed usability decision, **not a claim that a palette improves cognition**. Color-psychology findings depend on task, difficulty, context and individual differences; effects of blue-enriched illumination are not evidence that a blue button improves performance. The palette prioritizes readable contrast, predictable navigation and restrained decoration over physiological or clinical promises.

- [Elliot (2015), *Color and psychological functioning: a review of theoretical and empirical work*](https://doi.org/10.3389/fpsyg.2015.00368) describes the field's methodological and contextual limitations.
- [Xia et al. (2016), *Exploring the effect of red and blue on cognitive task performances*](https://doi.org/10.3389/fpsyg.2016.00784) finds effects moderated by task type and difficulty, not a universally superior color.
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) supplies the practical contrast, non-color-only information and keyboard-focus requirements. This does not change the app's existing limits on nonvisual exercise accessibility.

## Progress and measurement limits

Progress is specific to the exercises practiced, not an IQ score, diagnosis, treatment or guarantee of general cognitive improvement. Read **Evidence & limitations** in the app.

Charts separate training/assessment, parameters, device class, input method, relevant language, stimulus set, protocol, orientation and recorded processing deadline. Keep a consistent setup when comparing scores. Unknown or unavailable statistics, including guarded UFOV thresholds and SSRT estimates, remain unknown rather than becoming zero.

**Your training journey** adds numerical feedback on Progress and saved rounds. Choose a single comparison setup and metric; chart overlays never pool the numerical calculation. A baseline needs three eligible scores and uses their median (middle value). At six or more scores, the latest three form a separate recent window, never overlapping the first three. The change is the raw difference between those medians, not a relative percentage gain or a percentile. Percentage-valued metrics use **percentage points**; reaction-time/temporal-threshold values show milliseconds. The latest-three range describes observed variation, not a confidence interval. Secondary accuracy, speed and task-context medians need all three observations per window. A drop in accompanying accuracy is surfaced alongside the main score instead of treating increased speed/load alone as progress.

Warm-ups, invalid/interrupted rounds, missing/nonfinite estimates and ambiguous backup conflicts (both variants and their originals) do not count. Legacy completed summaries without the newer completion flag remain eligible within their own protocol series. A saved-round view uses only history up to that round. Training adaptation can change challenge within the same configuration: numerical differences describe training performance, not equivalent fixed-test performance or proven ability gains. Fixed assessments remain separate, with the existing 14-day cooldown. Three-round windows are a transparent display rule, **not a psychometrically validated threshold or significance test**.

**Comparison with other people** explains research and reference limitations on every exercise, the forecasting journal and Progress. Related research exists, and some standardized instruments have norms, but no reference dataset has been validated for these exact app implementations. The app does not display invented “better than 95% worldwide” ranks, convert a paper's mean/SD into an assumed-normal percentile, or substitute a clinical instrument's norms for a custom practice score.

Examples: [Kessels et al. (2000)](https://doi.org/10.1207/S15324826AN0704_8) published Corsi percentile/cutoff data using 70 healthy controls and a standardized block-tapping procedure—not this screen/input protocol or a representative worldwide cohort. [Woods et al. (2011)](https://doi.org/10.1080/13803395.2010.493149) used auditory digit presentation and a different span estimator; this app uses visual digits. [Basner et al. (2011)](https://pmc.ncbi.nlm.nih.gov/articles/PMC3197786/) validated PVT-B with 74 healthy adults aged 22–45 under controlled sleep deprivation on dedicated hardware—not a worldwide browser reference. [Hedge et al. (2018)](https://doi.org/10.3758/s13428-017-0935-1) explains why robust experimental effects need not yield reliable individual rankings; [Bridges et al. (2020)](https://peerj.com/articles/9414/) examines platform-specific timing. [Simons et al. (2016)](https://doi.org/10.1177/1529100616661983) distinguishes improvement on trained tasks from evidence of broader or everyday transfer. The in-app sources describe task families, not validation of this app or proof of general training transfer.

A future external comparison would need an appropriately licensed reference, defined population/sample size, exact protocol and scoring match, device/input timing validation, relevant demographic groups, uncertainty and a documented tie convention. A voluntary app cohort would support “among participating users,” **not “worldwide.”** Repeated rounds must not be counted as independent people. A shared cohort would also require an explicit opt-in collection service and a reviewed privacy design; no such service or upload is introduced here. No age or birth date is collected without a valid age-based reference. Age alone cannot repair protocol or sampling differences. Forecasting comparisons additionally require comparable event difficulty and horizons.

A fully completed training round with only display-timing warnings still counts toward your practice routine and weekly activity. Its score remains excluded from comparison charts, its adaptive state is not saved, and it cannot start an assessment cooldown. Other invalid/interrupted attempts do not advance the routine. Timing advisories are compact during practice; complete reasons remain available in the saved round.

Browser timing is not calibrated physical-device latency. The interface has semantic controls, keyboard focus management, contrast coverage and reduced-motion support, but canvas stimuli are **not equivalent nonvisual exercises**. This is not a claim of full WCAG conformance. Local speech, real touch/display latency, notches/safe areas and installed-home-screen behavior still need checking on the actual devices you use.

## Backups and recovery

Open **Your data**, or **Settings > Backups & data**, to export and restore.

- **JSON** is the portable backup format: preferences, session summaries, retained trial rows, adaptive state, routine, used-item history, forecasts and the optional saved Wikipedia excerpt. Existing schema-1 backups remain supported.
- **CSV** is for analysis, not restoration. Formula-like text is neutralized without turning negative numeric values into text formulas.
- Restore merges records. Identical sessions and trial rows are deduplicated; conflicting sessions are preserved as variants. Repeatedly restoring the same conflict does not create endless copies. Existing local preferences and adaptive state win on a nonempty restore; an empty restore adopts the incoming preferences.
- Forecast claims/probabilities are immutable after saving. Compatible open-to-resolved imports can update outcomes; incompatible variants require explicit conflict review. Accepting a variant voids the previous non-conflict version rather than silently combining contradictory forecasts.

The app name is **BBG**, with **Benny's Brain Gym** as the subheadline in both interface languages and on phone layouts. The rebrand retains the existing app URL, manifest identity and storage keys, so installed apps and saved history remain compatible. New downloads use the `bbg-` prefix; older `bennys-brain-gym-` and `cortex-` JSON backups still restore without renaming or migration.

Data remains in browser `localStorage` under **`cortex.v1`**, with root schema version **1**. Forecast drafts are tab-local in `sessionStorage`; an unsaved draft is not included in a JSON backup. Save it as a forecast before exporting, or copy it out if browser draft storage is unavailable.

Raw trial rows older than **90 days** are pruned on startup and when recording or importing session data. Session summaries and forecasts remain. Quotas vary and can fill earlier: this is not a larger IndexedDB backend or a promise of 90 days of capacity.

If storage fills or becomes unavailable, pending work remains exportable in memory and a warning is shown. **Do not close or reload first.** Export JSON, then use **Manage local data > Delete raw trial data** to remove raw rows while keeping summaries, scores, forecasts and used-item history. If the browser still cannot write, keep the exported backup and restore it in a working storage context.

Unreadable stored data is not silently overwritten. Export the original for recovery and export any new pending work separately before resetting. Deleting all local data requires typing `DELETE`. Browser/private-mode cleanup can remove storage without the app's consent, so keep periodic JSON backups.

Use one active training tab. Idle tabs adopt saved changes; active or pending tabs conservatively refuse to overwrite a change from another tab. If warned, export pending work, reload to adopt the current records, then merge the backup. Browser leave warnings are a convenience, not protection against an OS closing the process.

## Code layout

The app uses deferred classic scripts and attaches shared APIs to `window.Cortex`; translations use `window.CortexI18n`. Keep the dependency order in `index.html`.

| Location | Responsibility |
| --- | --- |
| `js/core.js` | Compatible storage, import/export, statistics, adaptation and shared invariants |
| `js/generators.js` | Reasoning generators and reusable item models |
| `js/runner.js` | Drawing, local speech, timing, native response controls and runner lifecycle |
| `js/tasks/` | Six domain modules containing the exercise engines and spatial models |
| `js/routine.js` | Local-day plans, preferred days/times, calendar exports, completion and warm-up familiarity |
| `js/reminders.js` | Explicit browser notification permission, guarded app-open reminders and delivery deduplication |
| `js/reading.js` | Optional anonymous Wikipedia reads, bounded literal excerpts, attribution and daily cache selection |
| `js/forecasting.js` | Drafts, immutable journal actions, pagination and calibration |
| `js/progress.js` | Shared comparison keys, descriptive personal windows and exercise research references |
| `js/ui.js` | Navigation, personalized settings, safe app sharing, instructions, progress, results and data journeys |
| `js/pwa.js`, `sw.js` | Installation, safe updates and scoped offline shell caching |
| `i18n.js`, `styles.css` | Synchronized English/German copy and responsive theme |
| `app.js` | DOM-ready entrypoint |

Completed session summaries, raw rows, adaptive state, item hashes and routine progress are committed in one storage write before asynchronous screen/resource cleanup. Generators and expensive spatial rendering are lazy; the main canvas's backing resolution is capped at DPR 2.

When adding an application asset, wire it into both `index.html` and the `ASSETS` list in `sw.js` where appropriate. **Bump the `CACHE` version in `sw.js` whenever changed cached assets are shipped.** Otherwise an installed worker can continue serving an old shell. Worker caches are scoped to the app's registration and only store shell assets, not training data.

## Development checks

```sh
npm run check
npm test
npx playwright install chromium webkit
npm run test:e2e
```

The syntax check follows browser scripts from `index.html`. Unit/engine tests cover all timed tasks through warm-up and training/assessment paths, deliberately wrong answers and omissions, input and lifecycle regressions, task models, exact timed-block duration, arithmetic operand bounds, vigilance lapse retention, score guards, storage compatibility and every daily-budget rotation. Scheduling coverage includes timezone/DST boundaries, old preferences, strict validation, UTF-8-folded calendar exports, exact reminder windows, permission/readiness races and non-destructive notification clicks.

Playwright covers desktop Chromium, an Android-profile Chromium browser and an iPhone-profile WebKit browser. Every timed exercise completes its eight warm-ups and a full main round through native keyboard/touch handlers, including persisted results; mouse controls, all n-back variants, both speech sets and arithmetic-ceiling settings have dedicated coverage. These journeys use supported exercise settings, not shortened engine protocols. Other journeys include a complete practice routine, interruptions/resume, personalized schedules, calendar downloads, sharing/privacy/focus and fallback behavior, all exercise pages in both languages/themes, appearance preview/cancel/persistence and device-following brightness, portrait/landscape scenes, tablet dialogs, journal conflicts, backups, quota/corrupt recovery, contrast across all six color/brightness combinations, offline navigation and safe worker updates. Browser clocks accelerate durations without shortening production protocols. Notification and sharing APIs are mocked to verify gestures, permission denials, delivery calls and errors without OS prompts or external sharing. Speech tests use explicit local-voice mocks, verify the spoken stimuli within each warm-up, and verify that remote-only voices are blocked; actual OS notification delivery, native share sheets, pronunciation and device speech timing still need physical-device checks.

Chromium's offline test uses browser offline mode. WebKit's test stops an isolated test-owned origin and confirms service-worker navigation instead, because Playwright WebKit's offline emulation rejects worker responses ([microsoft/playwright#42775](https://github.com/microsoft/playwright/issues/42775)). Emulated coverage does not replace the physical-device checks described above.

Daily-reading tests cover enabled defaults and saved opt-outs, interest/language selection, measured text limits, paragraph formatting, literal rendering, image licensing/credit, anonymous requests, cancellation/retries and cached offline reads. Deterministic API tests mock Wikipedia with service workers blocked because WebKit bypasses request routing on controlled pages; separate offline tests use the real installed shell and a saved excerpt. Unrelated browser journeys use a deterministic encyclopedia response rather than contacting the public service.
