"use strict";

(() => {
  const pairs = {
    "app.title": ["Cortex", "Cortex"],
    "app.tagline": ["Practice, with perspective", "Üben mit Augenmaß"],
    "app.localOnly": ["Local only. No account. No network.", "Nur lokal. Kein Konto. Kein Netzwerk."],
    "nav.home": ["Practice", "Üben"],
    "nav.results": ["Results", "Ergebnisse"],
    "nav.reliability": ["Reliability", "Messzuverlässigkeit"],
    "nav.data": ["Your data", "Deine Daten"],
    "nav.about": ["Evidence & limitations", "Evidenz & Grenzen"],

    "settings.title": ["Task settings", "Aufgabeneinstellungen"],
    "settings.language": ["Language", "Sprache"],
    "settings.english": ["English", "Englisch"],
    "settings.german": ["German", "Deutsch"],
    "settings.vibration": ["Brief vibration after responses, when supported", "Kurze Vibration nach Antworten, sofern unterstützt"],
    "settings.defaults": ["Default: {value}", "Standard: {value}"],
    "settings.reset": ["Restore task defaults", "Aufgabenstandard wiederherstellen"],
    "settings.saved": ["Settings saved.", "Einstellungen gespeichert."],
    "settings.seriesBreak": [
      "Changing parameters starts a separate comparison series. Keep the same settings, device and input method to track change.",
      "Geänderte Parameter beginnen eine separate Vergleichsreihe. Behalte Einstellungen, Gerät und Eingabemethode bei, um Veränderungen zu verfolgen."
    ],
    "settings.task": ["Task", "Aufgabe"],
    "settings.rangeError": ["The minimum must not exceed the maximum. Check your settings.", "Der Mindestwert darf den Höchstwert nicht überschreiten. Prüfe die Einstellungen."],
    "settings.invalidValue": ["A setting is outside its permitted range or step size. Check the highlighted fields.", "Eine Einstellung liegt außerhalb des erlaubten Bereichs oder der Schrittweite. Prüfe die Felder."],

    "common.close": ["Close", "Schließen"],
    "common.cancel": ["Cancel", "Abbrechen"],
    "common.continue": ["Continue", "Weiter"],
    "common.start": ["Start", "Starten"],
    "common.back": ["Back", "Zurück"],
    "common.save": ["Save", "Speichern"],
    "common.reset": ["Reset", "Zurücksetzen"],
    "common.dismiss": ["Dismiss", "Ausblenden"],
    "common.none": ["None", "Keine"],
    "common.yes": ["Yes", "Ja"],
    "common.no": ["No", "Nein"],
    "common.all": ["All", "Alle"],
    "common.unknown": ["Not available", "Nicht verfügbar"],
    "common.error": ["Something went wrong.", "Etwas ist schiefgegangen."],
    "common.delete": ["Delete", "Löschen"],
    "common.loading": ["Loading…", "Wird geladen…"],
    "common.view": ["View", "Ansehen"],
    "common.unitMs": ["ms", "ms"],
    "common.unitSeconds": ["s", "s"],

    "mode.training": ["Training", "Training"],
    "mode.assessment": ["Assessment", "Messung"],
    "mode.trainingHelp": [
      "Practice with feedback and task-specific difficulty adjustments. Training scores reflect practice, not a fixed test.",
      "Übe mit Rückmeldung und aufgabenspezifischer Schwierigkeitsanpassung. Trainingswerte beschreiben das Üben, keinen festen Test."
    ],
    "mode.assessmentHelp": [
      "Measure with a fixed protocol and no correctness feedback in the test block. Each task is available for assessment once every 14 days.",
      "Miss mit festem Ablauf und ohne Richtig-falsch-Rückmeldung im Testblock. Jede Aufgabe ist alle 14 Tage für eine Messung verfügbar."
    ],

    "home.eyebrow": ["A little practice. A clearer picture.", "Ein wenig üben. Genauer hinschauen."],
    "home.title": ["Train the task. Track your progress.", "Übe die Aufgabe. Verfolge deinen Fortschritt."],
    "home.subtitle": [
      "{count} local tools for memory, attention, speed, reasoning and forecasting. Compare like with like; progress here is not proof of broader cognitive gains.",
      "{count} lokale Werkzeuge für Gedächtnis, Aufmerksamkeit, Tempo, Schlussfolgern und Prognosen. Vergleiche nur Vergleichbares; Fortschritt hier belegt keine allgemeinen kognitiven Zugewinne."
    ],
    "home.suggested": ["Today's suggested sequence", "Vorschlag für heute"],
    "home.stateCheck": [
      "Start with a three-minute vigilance check, then three tasks. Use a quiet space and a consistent setup; take a break if tired.",
      "Beginne mit drei Minuten zur anhaltenden Aufmerksamkeit, danach folgen drei Aufgaben. Nutze einen ruhigen Ort und gleiche Bedingungen; pausiere bei Müdigkeit."
    ],
    "home.startSuggested": ["Start suggested sequence", "Vorgeschlagene Folge starten"],
    "home.allTasks": ["All tasks", "Alle Aufgaben"],
    "home.streak": ["{count} days", "{count} Tage"],
    "home.sessions": ["{count} sessions", "{count} Sitzungen"],
    "home.exposures": ["{count} exposures", "{count} Durchgänge"],
    "home.available": ["{count} tools", "{count} Werkzeuge"],
    "home.practice": ["Practice first", "Zuerst einüben"],
    "home.assessmentWait": ["Next assessment: {date}", "Nächste Messung: {date}"],
    "home.done": ["No suggested assessments are available yet. Try training or return after the waiting period.", "Noch keine vorgeschlagenen Messungen verfügbar. Nutze das Training oder kehre nach der Wartezeit zurück."],

    "runner.title": ["Task in progress", "Aufgabe läuft"],
    "runner.description": ["Visual task area. Follow the task instructions and use the selected input method. Press Escape to end the task.", "Visueller Aufgabenbereich. Folge der Aufgabenanleitung und nutze die gewählte Eingabemethode. Drücke Escape, um die Aufgabe zu beenden."],
    "runner.practice": ["Start 8 practice trials", "8 Übungsdurchgänge starten"],
    "runner.practiceIntro": [
      "Complete 8 mandatory practice trials before every main block. Practice is recorded separately and never contributes to the main score. Then start the training or assessment block explicitly.",
      "Absolviere vor jedem Hauptblock 8 verpflichtende Übungsdurchgänge. Sie werden separat gespeichert und zählen nie zum Hauptergebnis. Starte danach ausdrücklich den Trainings- oder Messblock."
    ],
    "runner.practiceDone": ["Practice complete", "Einübung abgeschlossen"],
    "runner.practiceCount": ["{count} practice trials completed", "{count} Übungsdurchgänge abgeschlossen"],
    "runner.startBlock": ["Start main block", "Hauptblock starten"],
    "runner.countdown": ["Get ready", "Mach dich bereit"],
    "runner.abort": ["End task", "Aufgabe beenden"],
    "runner.aborted": ["Task ended early. This session is retained but excluded from valid comparisons.", "Aufgabe vorzeitig beendet. Diese Sitzung bleibt gespeichert, zählt aber nicht für gültige Vergleiche."],
    "runner.focus": ["The app lost focus or became hidden. Restart the task without switching tabs or apps.", "Die App verlor den Fokus oder wurde verdeckt. Starte neu, ohne Tabs oder Apps zu wechseln."],
    "runner.rotation": ["Screen orientation changed during the task. Restart in a stable orientation.", "Die Bildschirmausrichtung änderte sich während der Aufgabe. Starte mit fester Ausrichtung neu."],
    "runner.refresh": ["Measured refresh rate fell below 50 Hz. This session is not valid for comparison; close demanding apps and retry.", "Die gemessene Bildwiederholrate lag unter 50 Hz. Die Sitzung ist nicht für Vergleiche gültig. Schließe rechenintensive Apps und versuche es erneut."],
    "runner.inputChanged": ["Input method changed during the task. Use the selected method throughout and restart.", "Die Eingabemethode änderte sich während der Aufgabe. Nutze durchgehend die gewählte Methode und starte neu."],
    "runner.processing": ["Symmetry accuracy was below 85%. This session is invalid: give both symmetry judgments and location recall your attention.", "Die Symmetriegenauigkeit lag unter 85 %. Diese Sitzung ist ungültig: Achte sowohl auf die Symmetrieurteile als auch auf das Merken der Positionen."],
    "runner.recorded": ["Session recorded locally.", "Sitzung lokal erfasst."],
    "runner.invalid": ["Session not valid for comparison", "Sitzung nicht für Vergleiche gültig"],
    "runner.instructions": ["How to respond", "So antwortest du"],
    "runner.keyboard": ["Use the listed keyboard keys. Release each key between responses.", "Nutze die angegebenen Tasten. Lasse jede Taste zwischen Antworten los."],
    "runner.touch": ["Tap the labelled response areas. For memory recall, tap in the requested order. In PVT-B, tap anywhere in the task area only when the counter appears.", "Tippe auf die beschrifteten Antwortflächen. Tippe beim Abrufen in der geforderten Reihenfolge. Bei PVT-B: Tippe erst beim Erscheinen des Zählers irgendwo in den Aufgabenbereich."],
    "runner.mouse": ["Click the labelled response areas. Keep using the mouse for the entire block.", "Klicke auf die beschrifteten Antwortflächen. Bleibe während des ganzen Blocks bei der Maus."],
    "runner.noFeedback": ["Assessment: no correctness feedback and no adaptive changes during the test block. Practice trials do not count toward the test score.", "Messung: keine Richtig-falsch-Rückmeldung und keine adaptive Änderung im Testblock. Übungsdurchgänge zählen nicht zum Testergebnis."],
    "runner.rotate": ["Landscape recommended", "Querformat empfohlen"],
    "runner.rotateHelp": ["Rotate your device before continuing. A wider view helps keep stimuli and response areas visible. Continuing in portrait may limit the task.", "Drehe dein Gerät, bevor du fortfährst. Eine breitere Ansicht hält Reize und Antwortflächen sichtbar. Hochformat kann die Aufgabe einschränken."],
    "runner.fullscreenUnavailable": ["Fullscreen is unavailable. Keep the browser visible and avoid other controls during the task.", "Vollbild ist nicht verfügbar. Halte den Browser sichtbar und vermeide andere Bedienelemente während der Aufgabe."],
    "runner.wakeUnavailable": ["Screen wake lock is unavailable. Prevent automatic screen lock before starting.", "Das automatische Ausschalten des Bildschirms lässt sich nicht verhindern. Deaktiviere die automatische Bildschirmsperre vor dem Start."],
    "runner.unsupportedAudio": ["No local speech voice is available for this language. Install an English voice in your device's speech settings or try another browser, then test the audio again. You can also choose position-only or arithmetic n-back. Tones are never substituted.", "Für diese Sprache ist keine lokale Stimme verfügbar. Installiere eine deutsche Stimme in den Spracheinstellungen deines Geräts oder nutze einen anderen Browser und teste den Ton erneut. Alternativ kannst du Positions- oder Rechen-n-back wählen. Es werden keine Ersatztöne verwendet."],
    "runner.failure": ["The task could not finish correctly. This session is invalid. Return to the instructions and retry.", "Die Aufgabe konnte nicht korrekt abgeschlossen werden. Diese Sitzung ist ungültig. Kehre zur Anleitung zurück und versuche es erneut."],
    "runner.complete": ["Main block complete", "Hauptblock abgeschlossen"],
    "runner.return": ["Return to tasks", "Zurück zu den Aufgaben"],
    "runner.escape": ["Press Escape or use End task to stop. An interrupted block is stored as invalid.", "Drücke Escape oder nutze „Aufgabe beenden“. Ein unterbrochener Block wird als ungültig gespeichert."],
    "runner.audioNote": ["Listen for spoken letters or short words; choose the set in Settings. Letters are spoken by name, without a capital/uppercase prefix. Test the audio before starting. Only local browser voices in the selected language are used; there is no tone fallback. Letter, word and older audio results stay in separate comparison series.", "Höre auf gesprochene Buchstaben oder kurze Wörter; wähle den Reizsatz in den Einstellungen. Buchstaben werden ohne den Zusatz „Großbuchstabe“ gesprochen. Teste den Ton vor dem Start. Es werden nur lokale Browserstimmen in der gewählten Sprache genutzt, ohne Ersatztöne. Buchstaben-, Wort- und ältere Audioergebnisse bleiben in getrennten Vergleichsreihen."],
    "runner.previewAudio": ["Test audio", "Ton testen"],
    "runner.audioLoading": ["Preparing local speech…", "Lokale Sprachausgabe wird vorbereitet…"],
    "runner.audioPreviewDone": ["Sample finished. If you did not hear it clearly, check your volume or try another local voice/browser before starting.", "Hörprobe beendet. Falls du sie nicht klar gehört hast, prüfe die Lautstärke oder nutze eine andere lokale Stimme bzw. einen anderen Browser vor dem Start."],
    "audio.unavailable": ["Required audio is unavailable. Check sound support or select a non-audio variant.", "Erforderliches Audio ist nicht verfügbar. Prüfe die Audiounterstützung oder wähle eine Variante ohne Ton."],
    "audio.failed": ["Speech did not play in time. Check sound and try the audio preview again, or increase the gap between items in Settings. Any interrupted session is invalid.", "Die Sprachausgabe erfolgte nicht rechtzeitig. Prüfe den Ton und teste ihn erneut oder verlängere die Pause zwischen Reizen in den Einstellungen. Eine unterbrochene Sitzung ist ungültig."],
    "runner.matchRecorded": ["✓ Recorded", "✓ Erfasst"],
    "runner.matchReady": ["Ready", "Bereit"],
    "runner.rememberOnly": ["Remember only", "Nur merken"],
    "runner.matchPrompt": ["Respond now if there is a match. No match: press nothing.", "Antworte jetzt bei Übereinstimmung. Kein Treffer: nichts drücken."],
    "runner.warmupInput": ["Remember only — building the first n items. Responses are not recorded yet.", "Nur merken — die ersten n Reize aufbauen. Antworten werden noch nicht erfasst."],
    "runner.inputRecorded": ["Recorded: {responses}", "Erfasst: {responses}"],
    "runner.inputWait": ["Not recorded — wait for the next item.", "Nicht erfasst — warte auf den nächsten Reiz."],
    "runner.inputLate": ["Too late — not recorded. Wait for the next item.", "Zu spät — nicht erfasst. Warte auf den nächsten Reiz."],
    "runner.useMatchKeys": ["Not recorded — use {keys} for a match.", "Nicht erfasst — nutze {keys} bei Übereinstimmung."],
    "runner.releaseKey": ["Not recorded — release {key}, then press it again for this item.", "Nicht erfasst — lasse {key} los und drücke sie für diesen Reiz erneut."],
    "runner.useMatchAreas": ["Not recorded — use the labelled response areas below.", "Nicht erfasst — nutze die beschrifteten Antwortflächen unten."],
    "runner.responseClosed": ["Response window closed.", "Antwortzeit beendet."],
    "runner.nbackItem": ["Item {item} / {count} · {n}-back", "Reiz {item} / {count} · {n}-back"],
    "runner.correct": ["Correct", "Richtig"],
    "runner.incorrect": ["Not quite", "Nicht richtig"],

    "results.title": ["Your task history", "Dein Aufgabenverlauf"],
    "results.subtitle": ["Track within-task change over time. Training and assessment are shown separately; invalid sessions remain visible but are not plotted.", "Verfolge Veränderungen innerhalb einer Aufgabe. Training und Messung erscheinen getrennt; ungültige Sitzungen bleiben sichtbar, werden aber nicht eingezeichnet."],
    "results.task": ["Task", "Aufgabe"],
    "results.device": ["Device class", "Geräteklasse"],
    "results.input": ["Input method", "Eingabemethode"],
    "results.overlay": ["Overlay other devices and inputs", "Andere Geräte und Eingaben einblenden"],
    "results.notComparable": ["Overlaid device and input series are for context only. Their timing and layout differ; do not treat them as directly comparable.", "Eingeblendete Geräte- und Eingabereihen dienen nur zur Einordnung. Zeitmessung und Layout unterscheiden sich; die Werte sind nicht direkt vergleichbar."],
    "results.languageNote": ["This task depends on language. English and German sessions remain in separate comparison series.", "Diese Aufgabe ist sprachabhängig. Englische und deutsche Sitzungen bleiben in getrennten Vergleichsreihen."],
    "results.parameterNote": ["A series shares task parameters, device class, input method and stimulus set, plus language where relevant. Parameter changes create separate lines.", "Eine Reihe teilt Aufgabenparameter, Geräteklasse, Eingabemethode und Reizsatz sowie gegebenenfalls die Sprache. Parameteränderungen erzeugen eigene Linien."],
    "results.trainingChart": ["Training · practice effects included", "Training · Übungseffekte enthalten"],
    "results.assessmentChart": ["Assessment · fixed protocol", "Messung · fester Ablauf"],
    "results.empty": ["No matching scored sessions yet. Complete a main block to see results here.", "Noch keine passenden ausgewerteten Sitzungen. Absolviere einen Hauptblock, um hier Ergebnisse zu sehen."],
    "results.date": ["Date", "Datum"],
    "results.score": ["Score", "Ergebnis"],
    "results.mode": ["Mode", "Modus"],
    "results.duration": ["Duration", "Dauer"],
    "results.validity": ["Validity", "Gültigkeit"],
    "results.valid": ["Valid", "Gültig"],
    "results.invalid": ["Invalid", "Ungültig"],
    "results.details": ["Details", "Details"],
    "results.exposure": ["Exposure {count}", "Durchgang {count}"],
    "results.retained": ["Raw trial data is available for this session.", "Rohdaten der einzelnen Durchgänge sind für diese Sitzung verfügbar."],
    "results.noTrials": ["No raw trial data is retained. The session summary is still available.", "Keine Rohdaten der Durchgänge mehr gespeichert. Die Sitzungszusammenfassung ist weiterhin verfügbar."],
    "results.series": ["Series", "Reihe"],
    "results.stimulusSet": ["Stimulus set", "Reizsatz"],
    "results.parameters": ["Parameters", "Parameter"],
    "results.excluded": ["{count} RT exclusions", "{count} Reaktionszeit-Ausschlüsse"],
    "results.thresholdNote": ["UFOV thresholds are exposure durations in ms; lower is better within the same setup and method. Training reports the mean of the last six staircase reversals. Assessment uses fixed, preplanned, logarithmically spaced exposures and isotonic regression to estimate the duration at 70.7% accuracy. These are different methods, not interchangeable scores. A threshold is not estimable if there are fewer than six training reversals or the assessment data do not establish a crossing of 70.7%. No threshold is fabricated: an unavailable value is not zero.", "UFOV-Schwellen sind Darbietungszeiten in ms; bei gleichem Aufbau und gleicher Methode ist niedriger besser. Training berichtet den Mittelwert der letzten sechs Umkehrpunkte der adaptiven Anpassung. Messung nutzt feste, vorab geplante, logarithmisch verteilte Darbietungszeiten und isotone Regression zur Schätzung der Dauer bei 70,7 % Genauigkeit. Dies sind verschiedene Methoden, keine austauschbaren Werte. Eine Schwelle ist nicht schätzbar, wenn weniger als sechs Trainingsumkehrpunkte vorliegen oder die Messdaten keinen Übergang über 70,7 % belegen. Es wird keine Schwelle erfunden: Ein nicht verfügbarer Wert ist nicht null."],
    "results.practiceCount": ["Practice trials (not scored)", "Übungsdurchgänge (nicht gewertet)"],

    "reliability.title": ["How stable are your scores?", "Wie stabil sind deine Werte?"],
    "reliability.subtitle": ["Descriptive checks for your own repeated measurements, not population norms or a clinical reliability estimate.", "Beschreibende Prüfungen deiner eigenen wiederholten Messungen, keine Bevölkerungsnormen oder klinische Reliabilitätsschätzung."],
    "reliability.splitHalf": ["Latest odd–even proxy", "Letzter Gerade-ungerade-Näherungswert"],
    "reliability.runningMedian": ["Median odd–even proxy", "Median der Gerade-ungerade-Näherungswerte"],
    "reliability.retest": ["Within-person retest correlation", "Retest-Korrelation innerhalb einer Person"],
    "reliability.needData": ["Not enough comparable data, or no variation to estimate a correlation. Retest needs at least four comparable assessments. Keep the same setup and return after the assessment interval.", "Nicht genügend vergleichbare Daten oder keine Streuung für eine Korrelation. Retest benötigt mindestens vier vergleichbare Messungen. Behalte den Aufbau bei und kehre nach dem Messintervall zurück."],
    "reliability.warning": ["A descriptive reliability value is below 0.70. Treat small changes cautiously; this is a noise warning, not a diagnostic cutoff.", "Ein beschreibender Zuverlässigkeitswert liegt unter 0,70. Bewerte kleine Veränderungen vorsichtig; dies ist ein Hinweis auf Messrauschen, kein diagnostischer Grenzwert."],
    "reliability.method": ["Within each session, adjacent odd/even observations are paired within conditions and their correlation receives a Spearman–Brown correction. The running median summarizes these proxies. Retest correlates successive comparable assessment scores within one person; it needs at least four sessions and nonzero variation. All are noisy descriptive measures, not validated reliability coefficients.", "Innerhalb jeder Sitzung werden benachbarte ungerade/gerade Beobachtungen je Bedingung gepaart und ihre Korrelation nach Spearman–Brown korrigiert. Der laufende Median fasst diese Näherungswerte zusammen. Retest korreliert aufeinanderfolgende vergleichbare Messwerte einer Person; nötig sind mindestens vier Sitzungen und vorhandene Streuung. Alle Werte sind verrauschte Beschreibungen, keine validierten Reliabilitätskoeffizienten."],
    "reliability.unavailable": ["Cannot estimate from the available observations.", "Aus den vorhandenen Beobachtungen nicht schätzbar."],
    "reliability.deviceNote": ["Reliability uses the selected device class and input method only. Modes, parameters, stimulus sets and language-dependent variants remain separate, even when overlays are enabled.", "Messzuverlässigkeit nutzt nur die gewählte Geräteklasse und Eingabemethode. Modi, Parameter, Reizsätze und sprachabhängige Varianten bleiben auch bei aktivierter Überlagerung getrennt."],

    "data.title": ["Your data, on this device", "Deine Daten auf diesem Gerät"],
    "data.subtitle": ["Everything stays in this browser. Export a JSON backup regularly; there is no account, server copy or automatic sync.", "Alles bleibt in diesem Browser. Exportiere regelmäßig eine JSON-Sicherung; es gibt kein Konto, keine Serverkopie und keine automatische Synchronisierung."],
    "data.exportJSON": ["Export JSON backup", "JSON-Sicherung exportieren"],
    "data.exportCSV": ["Export session CSV", "Sitzungen als CSV exportieren"],
    "data.import": ["Import JSON backup", "JSON-Sicherung importieren"],
    "data.prune": ["Delete raw trial data", "Rohdaten der Durchgänge löschen"],
    "data.pruneHelp": ["Remove all raw trial rows now; keep session summaries, scores, forecasts, preferences and used-item history. Raw trial rows older than 90 days are also pruned automatically. Export first if you need them.", "Entferne jetzt alle Rohdaten der Durchgänge; Sitzungszusammenfassungen, Ergebnisse, Prognosen, Einstellungen und der Verlauf genutzter Aufgaben bleiben erhalten. Rohdaten älter als 90 Tage werden auch automatisch gelöscht. Exportiere sie bei Bedarf vorher."],
    "data.wipe": ["Erase all local data", "Alle lokalen Daten löschen"],
    "data.wipeHelp": ["Permanently erase sessions, trial data, forecasts, settings, adaptive progress and used-item history in this browser. This cannot be undone. Export a backup first.", "Lösche Sitzungen, Durchgangsdaten, Prognosen, Einstellungen, adaptive Fortschritte und den Verlauf genutzter Aufgaben in diesem Browser dauerhaft. Dies lässt sich nicht rückgängig machen. Exportiere zuerst eine Sicherung."],
    "data.confirmLabel": ["Type DELETE to confirm", "Zur Bestätigung DELETE eingeben"],
    "data.confirmError": ["Nothing erased. Type DELETE exactly to confirm.", "Nichts gelöscht. Gib zur Bestätigung genau DELETE ein."],
    "data.imported": [
      "Imported {added} sessions; {conflicts} ID conflicts preserved as separate sessions. Local preferences are retained when data already exists.",
      "{added} Sitzungen importiert; {conflicts} ID-Konflikte als separate Sitzungen erhalten. Lokale Einstellungen bleiben erhalten, wenn bereits Daten vorhanden sind."
    ],
    "data.schema": ["This backup uses an unsupported schema version. Import a compatible Cortex JSON backup.", "Diese Sicherung verwendet eine nicht unterstützte Schemaversion. Importiere eine kompatible Cortex-JSON-Sicherung."],
    "data.invalid": ["This is not a valid Cortex backup. Check the file and try an unmodified JSON export.", "Dies ist keine gültige Cortex-Sicherung. Prüfe die Datei und versuche einen unveränderten JSON-Export."],
    "data.duplicate": ["A duplicate session ID was found where it must be unique. The operation was rejected.", "Eine Sitzungs-ID wurde doppelt gefunden, obwohl sie eindeutig sein muss. Der Vorgang wurde abgelehnt."],
    "data.quota": ["Browser storage is full. Pending data remains in memory: export JSON now, then delete raw trial data to free space. Do not close or reload first.", "Der Browserspeicher ist voll. Ungespeicherte Daten bleiben im Arbeitsspeicher: Exportiere jetzt JSON und lösche danach Rohdaten, um Platz zu schaffen. Schließe oder lade die Seite nicht vorher neu."],
    "data.unavailable": ["Browser storage is unavailable or blocked. Data may last only until this page closes. Export JSON before leaving.", "Der Browserspeicher ist nicht verfügbar oder gesperrt. Daten bleiben möglicherweise nur bis zum Schließen dieser Seite erhalten. Exportiere vorher JSON."],
    "data.corrupt": ["Stored data could not be read safely and has not been overwritten. Export the original for recovery and export any pending work separately before resetting local data.", "Gespeicherte Daten konnten nicht sicher gelesen werden und wurden nicht überschrieben. Exportiere das Original zur Wiederherstellung und ungespeicherte Arbeit separat, bevor du lokale Daten zurücksetzt."],
    "data.reminder": ["Backup reminder: export your data regularly. Your browser is the only stored copy.", "Sicherungserinnerung: Exportiere deine Daten regelmäßig. Dein Browser enthält die einzige gespeicherte Kopie."],
    "data.pruned": ["Raw trial data removed. Session summaries remain; check for any storage warning.", "Rohdaten entfernt. Sitzungszusammenfassungen bleiben erhalten; beachte mögliche Speicherwarnungen."],
    "data.wiped": ["Local data reset. Check for any storage warning before closing.", "Lokale Daten zurückgesetzt. Beachte mögliche Speicherwarnungen vor dem Schließen."],
    "data.pending": ["Unsaved data is held in memory. Export JSON now; reloading or closing may lose it.", "Ungespeicherte Daten liegen im Arbeitsspeicher. Exportiere jetzt JSON; Neuladen oder Schließen kann sie verlieren."],
    "data.summary": ["Session summaries", "Sitzungszusammenfassungen"],
    "data.rawRows": ["Raw trial rows", "Rohdatenzeilen"],
    "data.sessions": ["Sessions", "Sitzungen"],
    "data.size": ["Stored data size", "Datenumfang"],
    "data.importHelp": ["Choose a Cortex JSON backup. Matching sessions are merged; conflicting IDs are preserved. Forecast resolution updates are merged, while disagreements are kept as reviewable conflicts and excluded from calibration. Existing local preferences take priority when records exist. CSV exports cannot restore the app.", "Wähle eine Cortex-JSON-Sicherung. Identische Sitzungen werden zusammengeführt; ID-Konflikte bleiben erhalten. Prognoseauflösungen werden aktualisiert, widersprüchliche Versionen bleiben als prüfbare, von der Kalibrierung ausgenommene Konflikte erhalten. Bei vorhandenen Einträgen haben lokale Einstellungen Vorrang. CSV-Exporte können die App nicht wiederherstellen."],
    "data.exportOriginal": ["Export unreadable original", "Unlesbares Original exportieren"],

    "about.title": ["Practice, without overpromising", "Üben ohne überzogene Versprechen"],
    "about.evidence": ["What training can—and cannot—show", "Was Training zeigen kann – und was nicht"],
    "about.evidenceText": ["Gains on trained tasks are reliable. Near transfer to closely related tasks is generally modest. Against active controls, far transfer to fluid intelligence or everyday cognition is near zero on average. Better scores here primarily demonstrate learning these tasks, not becoming generally smarter.", "Verbesserungen in trainierten Aufgaben sind gut belegt. Nahtransfer auf eng verwandte Aufgaben ist meist gering. Gegenüber aktiven Kontrollgruppen liegt Ferntransfer auf fluide Intelligenz oder Alltagskognition im Mittel nahe null. Bessere Werte hier zeigen vor allem das Erlernen dieser Aufgaben, keine allgemeine Intelligenzsteigerung."],
    "about.ufov": ["UFOV: promising evidence, specific interventions", "UFOV: vielversprechende Evidenz, spezifische Interventionen"],
    "about.ufovText": ["UFOV-style speed-of-processing training has some of the strongest evidence for transfer to everyday function in this area. Some studies used roughly 10 hours of training. Those findings concern specific validated interventions and populations; they do not guarantee that this browser implementation reproduces the intervention or its benefits.", "UFOV-artiges Verarbeitungsgeschwindigkeitstraining gehört in diesem Bereich zu den Ansätzen mit der stärksten Evidenz für einen Transfer auf Alltagsfunktionen. Manche Studien nutzten ungefähr 10 Trainingsstunden. Diese Ergebnisse betreffen spezifische validierte Interventionen und Populationen; sie garantieren nicht, dass diese Browserumsetzung die Intervention oder ihren Nutzen reproduziert."],
    "about.measurement": ["Measurement before interpretation", "Erst messen, dann einordnen"],
    "about.measurementText": ["Compare the same task, mode, parameters, device class, input method and stimulus set; keep language constant for language-dependent tasks. Practice trials are stored separately. Reaction times below 150 ms or above three times the session median are excluded where applicable; false starts are tracked separately. Invalid sessions remain in your history but not in valid score charts. Scores are task-specific, not a universal cognitive scale.", "Vergleiche dieselbe Aufgabe, denselben Modus, dieselben Parameter, Geräteklasse, Eingabemethode und denselben Reizsatz; halte bei sprachabhängigen Aufgaben die Sprache konstant. Übungsdurchgänge werden separat gespeichert. Reaktionszeiten unter 150 ms oder über dem Dreifachen des Sitzungsmedians werden gegebenenfalls ausgeschlossen; Fehlstarts werden separat erfasst. Ungültige Sitzungen bleiben im Verlauf, aber nicht in gültigen Ergebnisdiagrammen. Werte sind aufgabenspezifisch, keine universelle kognitive Skala."],
    "about.modes": ["Training is not assessment", "Training ist keine Messung"],
    "about.modesText": ["Training provides feedback and task-specific adaptation; assessment uses a fixed protocol without correctness feedback. Both start with 8 mandatory practice trials, excluded from the main score. Assessments are spaced at least 14 days apart per task. Conflict-task blocks last 90 seconds; avoid comparing adaptive training with fixed assessment scores.", "Training bietet Rückmeldung und aufgabenspezifische Anpassung; Messungen nutzen einen festen Ablauf ohne Richtig-falsch-Rückmeldung. Beides beginnt mit 8 verpflichtenden Übungsdurchgängen, die nicht zum Hauptergebnis zählen. Messungen derselben Aufgabe liegen mindestens 14 Tage auseinander. Blöcke der Konfliktaufgaben dauern 90 Sekunden; vergleiche adaptive Trainingswerte nicht mit festen Messwerten."],
    "about.reliability": ["Reliability indicators are descriptive", "Zuverlässigkeitshinweise sind beschreibend"],
    "about.reliabilityText": ["The within-person odd–even indicator is a noisy descriptive proxy, neither a validated clinical reliability coefficient nor a normative score. Repeated-score correlations can also reflect practice, fatigue or trends. A value below 0.70 is a caution about noise, not a diagnosis or a pass/fail criterion.", "Der Gerade-ungerade-Indikator innerhalb einer Person ist ein verrauschter beschreibender Näherungswert, weder ein validierter klinischer Reliabilitätskoeffizient noch ein Normwert. Korrelationen wiederholter Werte können auch Übung, Müdigkeit oder Trends widerspiegeln. Ein Wert unter 0,70 warnt vor Messrauschen, ist aber keine Diagnose und kein Bestehenskriterium."],
    "about.devices": ["Keep your setup consistent", "Halte deine Bedingungen konstant"],
    "about.devicesText": ["Desktop, tablet and phone results are separated, as are keyboard, touch and mouse inputs. Overlays are context, not equivalence. Screen size, viewing distance, refresh rate and input latency affect performance. Prefer landscape for spatial tasks and a keyboard for precise timing; use the same physical device whenever possible.", "Desktop-, Tablet- und Smartphone-Ergebnisse werden ebenso getrennt wie Tastatur-, Touch- und Mauseingaben. Überlagerungen dienen zur Einordnung, nicht als Gleichsetzung. Bildschirmgröße, Betrachtungsabstand, Bildwiederholrate und Eingabeverzögerung beeinflussen die Leistung. Nutze für räumliche Aufgaben möglichst Querformat und für präzise Zeitmessung eine Tastatur; bleibe möglichst beim selben physischen Gerät."],
    "about.limitations": ["Research-inspired, not a clinical instrument", "Forschungsorientiert, kein klinisches Instrument"],
    "about.limitationsText": ["Browser visual timing is quantized to display frames; requested milliseconds are not guaranteed physical onset times. Speech is asynchronous and may be delayed. Without an eye tracker, antisaccade gaze compliance cannot be confirmed. Generated reasoning items are not normed. This app makes no IQ claims, offers no diagnosis and is not a validated clinical assessment or treatment.", "Visuelle Browserzeiten sind an Bildschirmframes gebunden; angeforderte Millisekunden garantieren keinen tatsächlichen Reizbeginn. Sprachausgabe ist asynchron und kann verzögert sein. Ohne Eye-Tracker lässt sich die korrekte Blickbewegung bei Antisakkaden nicht bestätigen. Generierte Denkaufgaben sind nicht normiert. Die App macht keine IQ-Aussagen, stellt keine Diagnosen und ist kein validiertes klinisches Mess- oder Behandlungsverfahren."],
    "about.privacy": ["Local storage is not a backup", "Lokaler Speicher ist keine Sicherung"],
    "about.privacyText": ["Data stays in browser localStorage, specific to the browser, profile and origin. Behaviour for file URLs differs between browsers; moving the files may expose a different store. Private browsing, clearing site data or restarting with storage blocked can lose data. Exporting JSON is the only portable backup. No account, analytics, network sync or server copy is used.", "Daten bleiben im localStorage des Browsers, getrennt nach Browser, Profil und Ursprung. Das Verhalten bei Datei-URLs unterscheidet sich; verschobene Dateien können auf einen anderen Speicher zugreifen. Privates Surfen, gelöschte Websitedaten oder ein Neustart bei gesperrtem Speicher können Daten verlieren. Nur ein JSON-Export ist eine portable Sicherung. Es gibt kein Konto, keine Analytik, Netzwerksynchronisierung oder Serverkopie."],
    "about.tierTwo": ["Extended tasks and forecasting", "Erweiterte Aufgaben und Prognosen"],
    "about.tierTwoText": ["Tier 2 adds inhibition, switching, memory search, learning, generated 3D rotation and planning tasks. Tower of London uses exact shortest legal paths. Stop-signal reaction time is estimated only when sample and race-model checks permit it; an unavailable estimate is not a zero score. Forecasts are an untimed journal, not assessments: probabilities are fixed at entry, outcomes are resolved manually, and Brier scores use resolved, non-void, non-conflicting records only. These implementations have no clinical norms; physical-device timing and measurement validity are not guaranteed.", "Stufe 2 ergänzt Hemmung, Aufgabenwechsel, Gedächtnissuche, Lernen, generierte 3D-Rotation und Planungsaufgaben. Der Turm von London nutzt exakte kürzeste zulässige Lösungswege. Die Stoppsignal-Reaktionszeit wird nur bei geeigneter Stichprobe und erfüllten Race-Modell-Prüfungen geschätzt; eine fehlende Schätzung ist kein Nullwert. Prognosen bilden ein Journal ohne Zeitlimit, keine Messblöcke: Wahrscheinlichkeiten bleiben ab Eintrag fest, Ergebnisse werden manuell aufgelöst und Brier-Werte berücksichtigen nur aufgelöste, gültige, konfliktfreie Einträge. Es gibt keine klinischen Normen; Gerätezeiten und Messgültigkeit sind nicht garantiert."],

    "tier.two": ["Tier 2", "Stufe 2"],
    "domain.learning": ["Learning & recall", "Lernen & Abruf"],
    "domain.calibration": ["Forecast calibration", "Prognosekalibrierung"],
    "runner.trainingOnly": ["This tool does not use assessment blocks.", "Dieses Werkzeug verwendet keine Messblöcke."],
    "runner.operationProcessing": ["Processing accuracy is below the configured minimum. This block is invalid.", "Die Verarbeitungsgenauigkeit liegt unter dem eingestellten Mindestwert. Dieser Block ist ungültig."],
    "task.running-span.name": ["Running span", "Fortlaufende Spanne"],
    "task.running-span.desc": ["Keep only the latest digits from an unpredictably ending stream.", "Behalte nur die letzten Ziffern einer unvorhersehbar endenden Folge."],
    "task.running-span.instructions": ["Complete eight short practice streams first. The number shown before each stream tells you how many final digits to retain. Watch without typing; the stream ends unpredictably. Enter only its last digits in their original order, including repeats and leading zeros, then submit. Training adapts the recall load; assessment holds it fixed.", "Absolviere zuerst acht kurze Übungsfolgen. Die Zahl vor jeder Folge gibt an, wie viele letzte Ziffern du behalten sollst. Beobachte ohne Eingabe; die Folge endet unvorhersehbar. Gib nur die letzten Ziffern in ursprünglicher Reihenfolge ein, einschließlich Wiederholungen und führender Nullen, und bestätige. Training passt die Abruflast an; Messungen halten sie fest."],
    "task.running-span.keys": ["Digits 0–9; Backspace deletes the last digit; Enter submits. Or use the on-screen keypad.", "Ziffern 0–9; Rücktaste löscht die letzte Ziffer; Enter bestätigt. Alternativ Bildschirmtastatur nutzen."],
    "running.invalidRange": ["Recall length must not exceed maximum recall; maximum recall must be below the minimum stream length; stream limits must be ordered.", "Die Abruflänge darf das Abrufmaximum nicht überschreiten. Das Abrufmaximum muss unter der Mindestlänge der Folge liegen; die Folgengrenzen müssen geordnet sein."],
    "stim.runningRecall": ["Retain the last {count} digits", "Behalte die letzten {count} Ziffern"],
    "task.operation-span.name": ["Operation span", "Operationsspanne"],
    "task.operation-span.desc": ["Verify arithmetic statements while maintaining a sequence of letters.", "Prüfe Rechenaussagen und behalte dabei eine Buchstabenfolge."],
    "task.operation-span.instructions": ["Complete eight practice sequences. Decide whether each arithmetic statement is true, then remember the following letter. After the set, select all letters in their original order. Both jobs matter: processing accuracy below {criterion}% invalidates the block. Training calibrates and adapts the processing deadline; assessment uses the fixed setting. Recall earns partial credit by position, not only for perfect sets.", "Absolviere acht Übungsfolgen. Entscheide, ob jede Rechenaussage stimmt, und merke dir danach den Buchstaben. Wähle nach dem Satz alle Buchstaben in ursprünglicher Reihenfolge. Beide Teile zählen: Verarbeitungsgenauigkeit unter {criterion}% macht den Block ungültig. Training kalibriert und passt die Bearbeitungsfrist an; Messungen nutzen den festen Wert. Richtige Abrufpositionen erhalten Teilpunkte, nicht nur perfekte Sätze."],
    "task.operation-span.keys": ["A = true, L = false. Recall with the displayed option keys 1–9, Q, W, E, R, T, Y, U, or tap the letters. A complete recall submits automatically.", "A = richtig, L = falsch. Abruf über die angezeigten Optionstasten 1–9, Q, W, E, R, T, Y, U oder per Tippen auf die Buchstaben. Vollständiger Abruf wird automatisch abgegeben."],
    "task.sternberg.name": ["Sternberg memory search", "Sternberg-Gedächtnissuche"],
    "task.sternberg.desc": ["Decide whether a probe digit appeared in a briefly memorized set.", "Entscheide, ob eine Testziffer in einer kurz gemerkten Menge vorkam."],
    "task.sternberg.instructions": ["Complete eight practice trials. Memorize the displayed set of digits. After the blank retention interval, decide whether the single probe belonged to that set. A means present and L means absent. Set sizes and probe membership are mixed. Training adjusts the response deadline; assessment keeps it fixed. Scores are accuracy and valid correct-response time, not an RT difference.", "Absolviere acht Übungsdurchgänge. Merke dir die gezeigte Ziffernmenge. Entscheide nach dem leeren Behalteintervall, ob die einzelne Testziffer dazugehört. A bedeutet enthalten, L nicht enthalten. Mengengrößen und Zugehörigkeit sind gemischt. Training verändert die Antwortfrist; Messungen halten sie fest. Werte sind Genauigkeit und gültige Zeit richtiger Antworten, keine Reaktionszeitdifferenz."],
    "task.sternberg.keys": ["A = present; L = absent. Or tap the corresponding response.", "A = enthalten; L = nicht enthalten. Oder die entsprechende Antwort antippen."],
    "task.paired-associates.name": ["Paired-associate learning", "Paarassoziationslernen"],
    "task.paired-associates.desc": ["Learn word pairs, then distinguish intact pairs from recombinations.", "Lerne Wortpaare und unterscheide unveränderte von neu kombinierten Paaren."],
    "task.paired-associates.instructions": ["Complete eight practice recognition trials. Study every word pair as a relationship. At recognition, choose intact only when those two words were shown together; familiar words paired with a different partner are recombinations. New pairings are learned in every block. Training adapts the number of pairs; assessment fixes it. d′ uses answered recognition trials, with omissions reported separately. Languages are not directly comparable.", "Absolviere acht Übungserkennungen. Lerne jedes Wortpaar als Beziehung. Wähle bei der Erkennung unverändert nur dann, wenn beide Wörter zusammen gezeigt wurden; vertraute Wörter mit anderem Partner sind Neukombinationen. Jeder Block enthält neue Paarungen. Training passt die Paarzahl an; Messungen halten sie fest. d′ nutzt beantwortete Erkennungen; Auslassungen werden getrennt ausgewiesen. Sprachen sind nicht direkt vergleichbar."],
    "task.paired-associates.keys": ["A = intact pair; L = recombined pair. Or tap the corresponding option.", "A = unverändertes Paar; L = neu kombiniertes Paar. Oder entsprechende Option antippen."],
    "task.method-loci.name": ["Method of loci", "Loci-Methode"],
    "task.method-loci.desc": ["Associate words with a familiar route and retrieve them in route order.", "Verbinde Wörter mit einer vertrauten Route und rufe sie in Routenreihenfolge ab."],
    "task.method-loci.instructions": ["Choose a familiar route in settings, preferably your own unique landmarks, one per line. Complete eight short practice sets. Imagine a vivid interaction between each displayed word and its landmark. Walk the route mentally, then select the words in the same order. This trains the mnemonic strategy, not general intelligence. Training changes the route load; assessment fixes load and study time. Preset routes are examples, not personal places.", "Wähle in den Einstellungen eine vertraute Route, möglichst eigene eindeutige Orte, je einer pro Zeile. Absolviere acht kurze Übungssätze. Stelle dir eine lebhafte Verbindung zwischen Wort und Ort vor. Gehe die Route gedanklich ab und wähle die Wörter in derselben Reihenfolge. Geübt wird eine Gedächtnisstrategie, nicht allgemeine Intelligenz. Training verändert die Routenlast; Messungen halten Last und Lernzeit fest. Vorlagen sind Beispiele, keine persönlichen Orte."],
    "task.method-loci.keys": ["Choose words using their displayed keys 1–9, Q, W, E, R, T, Y, U, or tap them. The required number of selections submits automatically.", "Wähle Wörter über die angezeigten Tasten 1–9, Q, W, E, R, T, Y, U oder per Tippen. Nach der erforderlichen Zahl von Antworten wird automatisch abgegeben."],
    "loci.invalidRange": ["Initial loci must not exceed maximum loci; maximum loci plus distractors must be at most 16.", "Anfängliche Orte dürfen das Maximum nicht überschreiten; maximale Orte plus Ablenker dürfen höchstens 16 sein."],
    "loci.invalidRoute": ["Provide at least as many unique landmarks as maximum loci, one per line, with at most 60 characters each.", "Gib mindestens so viele eindeutige Orte wie das eingestellte Maximum an, einen pro Zeile und jeweils höchstens 60 Zeichen."],
    "stim.lociStudy": ["Build the word–place association", "Verbinde Wort und Ort"],
    "stim.loci.home": ["Front door|Hallway|Coat rack|Sofa|Bookshelf|Window|Dining table|Sink|Refrigerator|Staircase|Bedroom door|Wardrobe|Bed|Mirror|Balcony|Mailbox", "Haustür|Flur|Garderobe|Sofa|Bücherregal|Fenster|Esstisch|Spüle|Kühlschrank|Treppe|Schlafzimmertür|Schrank|Bett|Spiegel|Balkon|Briefkasten"],
    "stim.loci.walk": ["Gate|Corner|Bus stop|Bakery|Crossing|Fountain|Bridge|Park bench|Oak tree|Playground|Library|Clock tower|Market stall|Station|Garden|Doorstep", "Tor|Straßenecke|Haltestelle|Bäckerei|Kreuzung|Brunnen|Brücke|Parkbank|Eiche|Spielplatz|Bücherei|Uhrturm|Marktstand|Bahnhof|Garten|Türschwelle"],
    "stim.spanAlphabet": ["BCDFGHJKLMNPRSTW", "BCDFGHJKLMNPRSTW"],
    "stim.memory.words": ["apple|book|key|moon|chair|tree|shoe|clock|fish|cup|door|star|leaf|bell|bread|boat|lamp|ring|cloud|fork|glass|horse|train|bridge|stone|cake|bird|desk|rain|hat|coin|lake|rope|sun|drum|pear|house|shelf|snow|duck|ball|brush|kite|plate|snake|box|seed|shell|wheel|coat|tower|grape|bear|flower|hand|river|mask|comb|button|mountain|pencil|beach|orange|candle", "Apfel|Buch|Schlüssel|Mond|Stuhl|Baum|Schuh|Uhr|Fisch|Tasse|Tür|Stern|Blatt|Glocke|Brot|Boot|Lampe|Ring|Wolke|Gabel|Glas|Pferd|Zug|Brücke|Stein|Kuchen|Vogel|Tisch|Regen|Hut|Münze|See|Seil|Sonne|Trommel|Birne|Haus|Regal|Schnee|Ente|Ball|Bürste|Drachen|Teller|Schlange|Kiste|Samen|Muschel|Rad|Mantel|Turm|Traube|Bär|Blume|Hand|Fluss|Maske|Kamm|Knopf|Berg|Stift|Strand|Orange|Kerze"],
    "stim.studyPairs": ["Study the pairs", "Lerne die Paare"],
    "stim.recognizePairs": ["Intact or recombined?", "Unverändert oder neu kombiniert?"],
    "stim.pairFormat": ["{left} ↔ {right}", "{left} ↔ {right}"],
    "response.true": ["True", "Richtig"],
    "response.false": ["False", "Falsch"],
    "response.present": ["Present", "Enthalten"],
    "response.absent": ["Absent", "Nicht enthalten"],
    "response.intact": ["Intact", "Unverändert"],
    "response.recombined": ["Recombined", "Neu kombiniert"],
    "param.recallLength": ["Digits to retain", "Zu behaltende Ziffern"],
    "param.maxRecall": ["Maximum recall load", "Maximale Abruflast"],
    "param.minStreamLength": ["Minimum stream length", "Kürzeste Folge"],
    "param.maxStreamLength": ["Maximum stream length", "Längste Folge"],
    "param.presentationMs": ["Item interval (ms)", "Reizintervall (ms)"],
    "param.minSet": ["Minimum set size", "Kleinste Mengengröße"],
    "param.maxSet": ["Maximum set size", "Größte Mengengröße"],
    "param.repetitions": ["Sets per size", "Sätze je Größe"],
    "param.calibrationFactor": ["Practice-time multiplier", "Übungszeit-Multiplikator"],
    "param.minProcessingAccuracy": ["Minimum processing accuracy (0–1)", "Minimale Verarbeitungsgenauigkeit (0–1)"],
    "param.distractorCount": ["Extra recall options", "Zusätzliche Abrufoptionen"],
    "param.targetShare": ["Target proportion (0–1)", "Zielanteil (0–1)"],
    "param.studyMs": ["Study time per item (ms)", "Lernzeit je Reiz (ms)"],
    "param.pairs": ["Initial pair count", "Anfängliche Paarzahl"],
    "param.maxPairs": ["Maximum pair count", "Maximale Paarzahl"],
    "param.recognitionRepeats": ["Recognition repetitions per condition", "Erkennungswiederholungen je Bedingung"],
    "param.loci": ["Initial loci", "Anfängliche Orte"],
    "param.maxLoci": ["Maximum loci", "Maximale Orte"],
    "param.route": ["Memory route", "Gedächtnisroute"],
    "param.customLoci": ["Custom landmarks: one per line", "Eigene Orte: einer pro Zeile"],
    "choice.home": ["Example home route", "Beispielroute zuhause"],
    "choice.walk": ["Example walking route", "Beispielspaziergang"],
    "choice.custom": ["My own route", "Eigene Route"],
    "score.recognitionOmissions": ["Recognition omissions", "Erkennungsauslassungen"],
    "score.dPrime": ["Recognition d′", "Erkennungs-d′"],
    "score.pairLoadMean": ["Mean learned pair count", "Mittlere gelernte Paarzahl"],
    "score.meanBrier": ["Mean Brier score", "Mittlerer Brier-Wert"],

    "task.forecasting.name": ["Forecasting journal", "Prognosejournal"],
    "task.forecasting.desc": ["Record explicit binary predictions, resolve outcomes, and track Brier score and calibration.", "Halte eindeutige binäre Prognosen fest, löse Ergebnisse auf und verfolge Brier-Wert und Kalibrierung."],
    "task.forecasting.instructions": ["Write a falsifiable yes/no claim, assign a probability, and specify its resolution date. Resolve only when the outcome is known. This is a journal, not a timed assessment.", "Formuliere eine prüfbare Ja/Nein-Aussage, gib ihre Wahrscheinlichkeit und den Auflösungstermin an. Löse erst bei bekanntem Ergebnis auf. Dies ist ein Journal, keine zeitgebundene Messung."],
    "task.forecasting.keys": ["Use Tab and Enter to navigate forms, or tap the controls.", "Nutze Tab und Enter in Formularen oder tippe auf die Bedienelemente."],
    "forecast.open": ["Open journal", "Journal öffnen"],
    "forecast.count": ["{count} forecasts", "{count} Prognosen"],
    "forecast.entries": ["Forecast entries", "Prognoseeinträge"],
    "forecast.journalNote": ["Untimed and independent of training/assessment limits. Claims and probabilities cannot be edited after entry. Resolution is manual; there is no network lookup or automatic truth assignment.", "Ohne Zeitlimit und unabhängig von Trainings-/Messfristen. Aussagen und Wahrscheinlichkeiten sind nach Eintrag unveränderlich. Auflösung erfolgt manuell; es gibt keine Netzwerksuche und keine automatische Wahrheitszuweisung."],
    "forecast.new": ["New forecast", "Neue Prognose"],
    "forecast.immutable": ["Make the outcome objectively decidable. Probability 0% means impossible, 100% certain. Mistaken entries can be voided without erasing the audit record.", "Formuliere ein objektiv entscheidbares Ergebnis. 0 % bedeutet unmöglich, 100 % sicher. Fehlerhafte Einträge können ohne Löschung des Protokolls ausgenommen werden."],
    "forecast.claim": ["Yes/no claim", "Ja/Nein-Aussage"],
    "forecast.probability": ["Probability of YES (%)", "Wahrscheinlichkeit für JA (%)"],
    "forecast.resolveBy": ["Resolution date", "Auflösungstermin"],
    "forecast.topic": ["Topic (optional)", "Thema (optional)"],
    "forecast.add": ["Record forecast", "Prognose festhalten"],
    "forecast.status": ["Status", "Status"],
    "forecast.status.open": ["Unresolved", "Offen"],
    "forecast.status.resolved": ["Resolved", "Aufgelöst"],
    "forecast.status.void": ["Voided", "Ausgenommen"],
    "forecast.status.conflict": ["Import conflict", "Importkonflikt"],
    "forecast.resolvedCount": ["Resolved forecasts", "Aufgelöste Prognosen"],
    "forecast.brier": ["Brier score (0 best, 1 worst)", "Brier-Wert (0 bester, 1 schlechtester)"],
    "forecast.calibration": ["Calibration curve", "Kalibrierungskurve"],
    "forecast.calibrationNote": ["Uses resolved, non-void, non-conflicting forecasts in the selected topic, regardless of the table's status filter. The diagonal represents perfect calibration; point size reflects bin count. Small samples are noisy.", "Nutzt aufgelöste, gültige, konfliktfreie Prognosen im gewählten Thema, unabhängig vom Statusfilter der Tabelle. Die Diagonale zeigt perfekte Kalibrierung; Punktgröße steht für Gruppengröße. Kleine Stichproben sind verrauscht."],
    "forecast.emptyCalibration": ["Resolve forecasts to obtain Brier scores and a calibration curve.", "Löse Prognosen auf, um Brier-Werte und eine Kalibrierungskurve zu erhalten."],
    "forecast.predicted": ["Mean predicted probability", "Mittlere vorhergesagte Wahrscheinlichkeit"],
    "forecast.observed": ["Observed YES frequency", "Beobachteter JA-Anteil"],
    "forecast.binTooltip": ["{count} forecasts; predicted {predicted}; observed {observed}", "{count} Prognosen; vorhergesagt {predicted}; beobachtet {observed}"],
    "forecast.pagination": ["Showing {from}–{to} of {total}", "{from}–{to} von {total} Einträgen"],
    "forecast.outcome": ["Outcome", "Ergebnis"],
    "forecast.actions": ["Actions", "Aktionen"],
    "forecast.overdue": ["Due for review", "Zur Prüfung fällig"],
    "forecast.yes": ["YES", "JA"],
    "forecast.no": ["NO", "NEIN"],
    "forecast.resolveYes": ["Resolve YES", "Als JA auflösen"],
    "forecast.resolveNo": ["Resolve NO", "Als NEIN auflösen"],
    "forecast.void": ["Void entry", "Eintrag ausnehmen"],
    "forecast.acceptConflict": ["Use imported version", "Importierte Version nutzen"],
    "forecast.noEntries": ["No matching forecasts.", "Keine passenden Prognosen."],
    "forecast.previous": ["Previous page", "Vorherige Seite"],
    "forecast.next": ["Next page", "Nächste Seite"],
    "forecast.saved": ["Forecast recorded. Its claim and probability are now fixed.", "Prognose festgehalten. Aussage und Wahrscheinlichkeit sind jetzt fest."],
    "forecast.resolved": ["Outcome recorded and calibration updated.", "Ergebnis festgehalten und Kalibrierung aktualisiert."],
    "forecast.voided": ["Entry retained for audit but excluded from calibration.", "Eintrag bleibt im Protokoll, wird aber von der Kalibrierung ausgenommen."],
    "forecast.reviewed": ["Imported version accepted; the previous local entry is retained as void.", "Importierte Version angenommen; der vorige lokale Eintrag bleibt als ausgenommen erhalten."],
    "forecast.confirmResolve": ["Record outcome {outcome} for this claim?\n\n{claim}\n\nOnly resolve when the result is known.", "Ergebnis {outcome} für diese Aussage festhalten?\n\n{claim}\n\nNur bei bekanntem Ergebnis auflösen."],
    "forecast.earlyResolution": ["The planned resolution date is still in the future. Continue only if the event has already resolved unambiguously.", "Der geplante Auflösungstermin liegt noch in der Zukunft. Fahre nur fort, wenn das Ereignis bereits eindeutig entschieden ist."],
    "forecast.confirmVoid": ["Exclude this entry from calibration? The original record and any outcome will remain in the journal.", "Diesen Eintrag von der Kalibrierung ausnehmen? Original und gegebenenfalls Ergebnis bleiben im Journal."],
    "forecast.confirmConflict": ["Use this imported version instead of the local version? The local record will be preserved as void, not deleted.", "Diese importierte statt der lokalen Version nutzen? Der lokale Eintrag bleibt als ausgenommen erhalten und wird nicht gelöscht."],
    "forecast.conflictNotice": ["{count} imported conflicts await review. They are retained but excluded from scores until explicitly accepted.", "{count} Importkonflikte warten auf Prüfung. Sie bleiben erhalten, sind aber bis zur ausdrücklichen Annahme von Werten ausgeschlossen."],
    "forecast.imported": ["Forecasts: {forecastsAdded} added, {forecastsUpdated} resolved updates, {forecastConflicts} preserved conflicts.", "Prognosen: {forecastsAdded} ergänzt, {forecastsUpdated} Auflösungen aktualisiert, {forecastConflicts} Konflikte erhalten."],
    "forecast.invalid": ["Invalid forecast data. Check the claim, probability, dates and status.", "Ungültige Prognosedaten. Prüfe Aussage, Wahrscheinlichkeit, Daten und Status."],
    "forecast.futureDate": ["Choose today or a future date for a new forecast.", "Wähle für eine neue Prognose den heutigen Tag oder ein zukünftiges Datum."],
    "forecast.invalidResolution": ["This entry cannot be resolved or changed in its current state.", "Dieser Eintrag kann im aktuellen Zustand nicht aufgelöst oder geändert werden."],
    "forecast.invalidBins": ["Calibration needs 2–20 probability bins.", "Die Kalibrierung benötigt 2–20 Wahrscheinlichkeitsgruppen."],
    "forecast.exportCSV": ["Export forecast CSV", "Prognosen als CSV exportieren"],
    "param.defaultProbability": ["Default YES probability (%)", "Standardwahrscheinlichkeit für JA (%)"],
    "param.defaultDeadlineDays": ["Default resolution horizon (days)", "Standardhorizont bis Auflösung (Tage)"],
    "param.calibrationBins": ["Calibration bins", "Kalibrierungsgruppen"],
    "param.pageSize": ["Journal entries per page", "Journaleinträge je Seite"],
    "param.claimMaxLength": ["Maximum new-claim characters", "Maximale Zeichen neuer Aussagen"],

    "domain.working-memory": ["Working memory", "Arbeitsgedächtnis"],
    "domain.processing-speed": ["Processing speed", "Verarbeitungsgeschwindigkeit"],
    "domain.attention": ["Attention & control", "Aufmerksamkeit & Kontrolle"],
    "domain.reasoning": ["Reasoning", "Schlussfolgerndes Denken"],
    "domain.vigilance": ["Vigilance", "Anhaltende Aufmerksamkeit"],

    "task.dual-nback.name": ["Dual n-back", "Duales n-back"],
    "task.dual-nback.desc": ["Track positions and spoken letters or words n steps back, separately or together; an arithmetic variant adds a fixed operand.", "Verfolge Positionen und gesprochene Buchstaben oder Wörter n Schritte zurück, einzeln oder gemeinsam; die Rechenvariante addiert einen festen Wert."],
    "task.dual-nback.instructions": [
      "First complete 8 practice trials; they do not count toward the main score. Compare each active stream with exactly n items earlier. Respond only to a match; use both response areas if both streams match. The first n items are for remembering only. You can respond after the square disappears, until the time bar runs out. Each accepted response stays highlighted with a check and “Recorded” until the item ends; this confirms your input, not correctness. Pressing again does not undo or duplicate it. Training shows correctness only after the response window closes; assessment never does. Do not respond to nonmatches, including repeats n−1 or n+1 steps back. Arithmetic: a match means the current number equals the number n steps back plus the configured operand.",
      "Absolviere zuerst 8 Übungsdurchgänge; sie zählen nicht zum Hauptergebnis. Vergleiche jeden aktiven Reizstrom mit genau n Reizen zuvor. Antworte nur bei Übereinstimmung; nutze beide Antwortflächen, wenn beide Ströme passen. Die ersten n Reize dienen nur dem Merken. Du kannst auch nach dem Verschwinden des Quadrats antworten, bis der Zeitbalken abgelaufen ist. Jede angenommene Antwort bleibt bis zum Reizende mit Häkchen und „Erfasst“ hervorgehoben; das bestätigt die Eingabe, nicht die Richtigkeit. Erneutes Drücken macht sie weder rückgängig noch zählt es doppelt. Im Training erscheint die Richtig-falsch-Rückmeldung erst nach Ende der Antwortzeit, in Messungen nie. Antworte nicht bei Nichtübereinstimmung, auch nicht bei Wiederholungen n−1 oder n+1 Schritte zurück. Rechenvariante: Die aktuelle Zahl muss der Zahl n Schritte zuvor plus dem eingestellten Wert entsprechen."
    ],
    "task.dual-nback.keys": ["A = position match; L = audio match; press both if both match (together or separately). Release keys between items. Arithmetic: A = arithmetic match. No match: press nothing. Look for “✓ Recorded” on each accepted response.", "A = Positionsübereinstimmung; L = Audioübereinstimmung; bei beiden Treffern beide drücken (gleichzeitig oder nacheinander). Lasse die Tasten zwischen Reizen los. Rechenvariante: A = Rechenübereinstimmung. Kein Treffer: nichts drücken. Jede angenommene Antwort zeigt „✓ Erfasst“."],

    "task.ufov.name": ["Useful field of view", "Nutzbares Gesichtsfeld"],
    "task.ufov.desc": ["Identify a central vehicle and locate a peripheral target, with and without distractors.", "Erkenne ein Fahrzeug im Zentrum und die Position eines Randreizes, mit und ohne Ablenkreize."],
    "task.ufov.instructions": [
      "Complete 8 mandatory practice trials across the three subtests; they do not count toward the main test. Look at the centre during each brief display. Central: identify car or truck after the mask. Divided: identify the vehicle, then select the direction of the peripheral square. Selective: do the same while ignoring triangles. Both answers must be correct on divided and selective trials.",
      "Absolviere 8 verpflichtende Übungsdurchgänge über die drei Untertests; sie zählen nicht zum Haupttest. Blicke während jeder kurzen Darbietung ins Zentrum. Zentral: Erkenne nach der Maske Auto oder Lkw. Geteilt: Nenne das Fahrzeug und wähle danach die Richtung des Quadrats am Rand. Selektiv: Tue dasselbe und ignoriere Dreiecke. In geteilten und selektiven Durchgängen müssen beide Antworten stimmen."
    ],
    "task.ufov.keys": ["First A = car, L = truck. Then 1–8 = target direction, clockwise from top: 1 top, 2 top-right, 3 right, 4 bottom-right, 5 bottom, 6 bottom-left, 7 left, 8 top-left.", "Zuerst A = Auto, L = Lkw. Danach 1–8 = Zielrichtung, im Uhrzeigersinn ab oben: 1 oben, 2 rechts oben, 3 rechts, 4 rechts unten, 5 unten, 6 links unten, 7 links, 8 links oben."],

    "task.stroop-squared.name": ["Stroop²", "Stroop²"],
    "task.stroop-squared.desc": ["Choose the word meaning or ink colour while ignoring the conflicting information.", "Wähle Wortbedeutung oder Schriftfarbe und ignoriere die widersprüchliche Information."],
    "task.stroop-squared.instructions": [
      "Complete 8 mandatory practice trials before the main test; practice is not scored with it. Read the rule before each 90-second block. WORD: choose the colour named by the word, ignoring its ink. INK: choose its displayed ink colour, ignoring the word. Choose the matching response label quickly and accurately; the left/right answer positions can change.",
      "Absolviere vor dem Haupttest 8 verpflichtende Übungsdurchgänge; sie zählen nicht zu dessen Ergebnis. Lies vor jedem 90-Sekunden-Block die Regel. WORT: Wähle die vom Wort benannte Farbe, unabhängig von der Schriftfarbe. FARBE: Wähle die sichtbare Schriftfarbe, unabhängig vom Wort. Wähle zügig und genau die passende Antwortbeschriftung; ihre linke oder rechte Position kann wechseln."
    ],
    "task.stroop-squared.keys": ["A = left response option; L = right response option. Follow the WORD or INK rule and read the current labels; keys are not fixed to colours.", "A = linke Antwortoption; L = rechte Antwortoption. Beachte die Regel WORT oder FARBE und die aktuellen Beschriftungen; die Tasten sind nicht fest an Farben gebunden."],

    "task.flanker-squared.name": ["Flanker²", "Flanker²"],
    "task.flanker-squared.desc": ["Report the middle arrow's direction while ignoring the surrounding arrows.", "Gib die Richtung des mittleren Pfeils an und ignoriere die umgebenden Pfeile."],
    "task.flanker-squared.instructions": [
      "Complete 8 mandatory practice trials; they are separate from the main test score. In each 90-second block, look only at the middle arrow in the five-arrow row. Select the response arrow pointing the same way as that middle arrow, even when its neighbours point the other way. Read the current response options: their left/right positions can change.",
      "Absolviere 8 verpflichtende Übungsdurchgänge; sie werden getrennt vom Haupttestergebnis erfasst. Achte in jedem 90-Sekunden-Block nur auf den mittleren Pfeil der Fünferreihe. Wähle den Antwortpfeil, der in dieselbe Richtung zeigt, auch wenn die Nachbarn entgegengesetzt zeigen. Lies die aktuellen Antwortoptionen: Ihre linke oder rechte Position kann wechseln."
    ],
    "task.flanker-squared.keys": ["A = left response option; L = right response option. Choose the option matching the middle arrow, not the flankers.", "A = linke Antwortoption; L = rechte Antwortoption. Wähle die Option passend zum mittleren Pfeil, nicht zu den Nachbarn."],

    "task.simon-squared.name": ["Simon²", "Simon²"],
    "task.simon-squared.desc": ["Respond to a circle's colour, not its screen position, using a fixed colour mapping.", "Antworte mit fester Farbzuordnung auf die Kreisfarbe, nicht auf die Bildschirmposition."],
    "task.simon-squared.instructions": [
      "Complete 8 mandatory practice trials, excluded from the main test score. During each 90-second block, choose red for every red circle and green for every green circle. Ignore whether the circle appears on the left or right. The mapping stays fixed: red is always the left response and green the right response.",
      "Absolviere 8 verpflichtende Übungsdurchgänge, die nicht zum Haupttestergebnis zählen. Wähle während jedes 90-Sekunden-Blocks für jeden roten Kreis Rot und für jeden grünen Kreis Grün. Ignoriere, ob der Kreis links oder rechts erscheint. Die Zuordnung bleibt fest: Rot ist immer die linke, Grün die rechte Antwort."
    ],
    "task.simon-squared.keys": ["A = red; L = green. This mapping never changes, regardless of the circle's position.", "A = Rot; L = Grün. Diese Zuordnung bleibt unverändert, unabhängig von der Kreisposition."],

    "task.antisaccade.name": ["Antisaccade", "Antisakkade"],
    "task.antisaccade.desc": ["Look away from a sudden cue to identify a brief letter on the opposite side.", "Blicke von einem plötzlichen Hinweisreiz weg und erkenne einen kurzen Buchstaben auf der Gegenseite."],
    "task.antisaccade.instructions": [
      "Complete 8 mandatory practice trials before the main test; practice does not count toward its score. Fixate the central cross. When a square flashes on one side, move your eyes immediately to the opposite side, not toward the flash. Identify the brief B, P or R there and respond after the mask. Keep your head still. Without eye tracking, the app cannot verify your eye movement.",
      "Absolviere vor dem Haupttest 8 verpflichtende Übungsdurchgänge; sie zählen nicht zu dessen Ergebnis. Fixiere das Kreuz im Zentrum. Wenn auf einer Seite ein Quadrat aufblitzt, bewege die Augen sofort zur Gegenseite, nicht zum Blitz. Erkenne dort das kurz gezeigte B, P oder R und antworte nach der Maske. Halte den Kopf still. Ohne Blickmessung kann die App deine Augenbewegung nicht prüfen."
    ],
    "task.antisaccade.keys": ["B, P or R = the letter seen opposite the cue. Touch or mouse: choose the matching letter button.", "B, P oder R = der gegenüber dem Hinweisreiz gesehene Buchstabe. Touch oder Maus: Wähle die entsprechende Buchstabentaste."],

    "task.visual-arrays.name": ["Visual arrays", "Visuelle Farbfelder"],
    "task.visual-arrays.desc": ["Remember coloured squares and judge whether a single probe kept its original colour.", "Merke dir farbige Quadrate und beurteile, ob ein einzelnes Testquadrat seine Farbe behielt."],
    "task.visual-arrays.instructions": [
      "Complete 8 mandatory practice trials, separate from the main test score. Remember the colours and positions of the 4, 6 or 8 coloured squares; ignore all gray squares. After the blank delay, one square reappears. Choose SAME if its colour matches the original colour at that position, otherwise DIFFERENT. Judge that one location, not whether the colour appeared anywhere in the array.",
      "Absolviere 8 verpflichtende Übungsdurchgänge, getrennt vom Haupttestergebnis. Merke dir Farben und Positionen der 4, 6 oder 8 farbigen Quadrate; ignoriere alle grauen Quadrate. Nach der leeren Pause erscheint ein Quadrat erneut. Wähle GLEICH, wenn seine Farbe der ursprünglichen Farbe an dieser Position entspricht, sonst ANDERS. Beurteile nur diese Position, nicht ob die Farbe irgendwo im Feld vorkam."
    ],
    "task.visual-arrays.keys": ["A = same colour at that location; L = different colour. Ignore gray distractors.", "A = gleiche Farbe an dieser Position; L = andere Farbe. Ignoriere graue Ablenkreize."],

    "task.symmetry-span.name": ["Symmetry span", "Symmetriespanne"],
    "task.symmetry-span.desc": ["Alternate symmetry judgments with remembering locations, then recall the locations in order.", "Wechsle zwischen Symmetrieurteilen und dem Merken von Positionen; rufe die Positionen danach in Reihenfolge ab."],
    "task.symmetry-span.instructions": [
      "Complete 8 mandatory practice sequences; they calibrate the training deadline but do not count toward the main score. Assessment uses the fixed processing deadline from settings. For each pattern, decide whether its left and right halves mirror each other. Then remember the highlighted cell in the 4×4 grid. After the sequence, recall all highlighted cells in their original order. Both parts matter: symmetry accuracy below 85% invalidates the main session.",
      "Absolviere 8 verpflichtende Übungsfolgen; sie kalibrieren die Trainingsfrist, zählen aber nicht zum Hauptergebnis. Messungen nutzen die feste Bearbeitungsfrist aus den Einstellungen. Entscheide bei jedem Muster, ob linke und rechte Hälfte spiegelbildlich sind. Merke dir dann die markierte Zelle im 4×4-Gitter. Rufe nach der Folge alle markierten Zellen in ursprünglicher Reihenfolge ab. Beide Teile zählen: Symmetriegenauigkeit unter 85 % macht die Hauptsitzung ungültig."
    ],
    "task.symmetry-span.keys": ["Judgment: A = symmetric, L = asymmetric. Recall: 4×4 grid keys, row by row from top-left: 1 2 3 4 / 5 6 7 8 / 9 Q W E / R T Y U. Enter the cells in order; the sequence submits when full.", "Urteil: A = symmetrisch, L = asymmetrisch. Abruf: Tasten des 4×4-Gitters, zeilenweise ab links oben: 1 2 3 4 / 5 6 7 8 / 9 Q W E / R T Y U. Gib die Zellen in Reihenfolge ein; die vollständige Folge wird automatisch abgegeben."],

    "task.corsi.name": ["Corsi block span", "Corsi-Blockspanne"],
    "task.corsi.desc": ["Remember a sequence of spatial blocks and reproduce it forward or backward.", "Merke dir eine Folge räumlicher Blöcke und wiederhole sie vorwärts oder rückwärts."],
    "task.corsi.instructions": [
      "Complete 8 mandatory practice sequences, excluded from the main test score. Watch the blocks flash without responding. Once recall begins, select the same blocks in the shown order for FORWARD, or reverse order for BACKWARD. Reproduce every position exactly. The response submits after the required number of blocks; two failed sequences at one length end the main block.",
      "Absolviere 8 verpflichtende Übungsfolgen, die nicht zum Haupttestergebnis zählen. Beobachte die aufleuchtenden Blöcke, ohne zu antworten. Wähle beim Abruf dieselben Blöcke bei VORWÄRTS in gezeigter, bei RÜCKWÄRTS in umgekehrter Reihenfolge. Wiederhole jede Position genau. Nach der erforderlichen Blockzahl wird automatisch abgegeben; zwei misslungene Folgen einer Länge beenden den Hauptblock."
    ],
    "task.corsi.keys": ["1–9 = the correspondingly labelled spatial blocks, in the requested order. Or tap/click the blocks themselves. These are spatial block labels, not a numeric sequence.", "1–9 = die entsprechend beschrifteten räumlichen Blöcke in der geforderten Reihenfolge. Oder tippe/klicke direkt auf die Blöcke. Die Zahlen bezeichnen räumliche Blöcke, keine Zahlenfolge."],

    "task.digit-span.name": ["Digit span", "Ziffernspanne"],
    "task.digit-span.desc": ["Recall a sequence of digits in its original or reversed order.", "Rufe eine Ziffernfolge in ursprünglicher oder umgekehrter Reihenfolge ab."],
    "task.digit-span.instructions": [
      "Complete 8 mandatory practice sequences, separate from the main test score. Watch each digit without typing. When recall starts, enter all digits in the shown order for FORWARD or reverse order for BACKWARD, including repeats and leading zeros. Check your entry and submit. Two failed sequences at the same length end the main block.",
      "Absolviere 8 verpflichtende Übungsfolgen, getrennt vom Haupttestergebnis. Beobachte jede Ziffer, ohne zu tippen. Gib beim Abruf alle Ziffern bei VORWÄRTS in gezeigter, bei RÜCKWÄRTS in umgekehrter Reihenfolge ein, einschließlich Wiederholungen und führender Nullen. Prüfe die Eingabe und gib sie ab. Zwei misslungene Folgen derselben Länge beenden den Hauptblock."
    ],
    "task.digit-span.keys": ["0–9 = digits; Backspace = remove the last digit; Enter = submit the complete sequence.", "0–9 = Ziffern; Rücktaste (Backspace) = letzte Ziffer löschen; Eingabetaste (Enter) = vollständige Folge abgeben."],

    "task.matrix-reasoning.name": ["Matrix reasoning", "Matrizenlogik"],
    "task.matrix-reasoning.desc": ["Infer visual transformation or logic rules and choose the missing matrix cell.", "Erkenne visuelle Transformations- oder Logikregeln und wähle die fehlende Matrixzelle."],
    "task.matrix-reasoning.instructions": [
      "Complete 8 mandatory practice items; they are excluded from the main test score. Study changes across the matrix rows and columns, such as shape, number, position, rotation or combined features. Choose the one of eight options that completes all relevant rules in the missing cell before time expires. Assessment balances fixed difficulty levels across your selected minimum–maximum range; training adapts within it. Generated items are not an IQ test.",
      "Absolviere 8 verpflichtende Übungsaufgaben; sie zählen nicht zum Haupttestergebnis. Untersuche Veränderungen über Zeilen und Spalten, etwa Form, Anzahl, Position, Drehung oder kombinierte Merkmale. Wähle vor Ablauf der Zeit die eine von acht Optionen, die alle relevanten Regeln in der fehlenden Zelle erfüllt. Messungen verteilen feste Schwierigkeitsstufen ausgewogen zwischen gewähltem Minimum und Maximum; Training passt sich innerhalb dieser Spanne an. Generierte Aufgaben sind kein IQ-Test."
    ],
    "task.matrix-reasoning.keys": ["1–8 = the correspondingly numbered answer option. Or tap/click an option. One selection submits your answer.", "1–8 = die entsprechend nummerierte Antwortoption. Oder tippe/klicke auf eine Option. Eine Auswahl gibt die Antwort ab."],

    "task.number-series.name": ["Number & letter series", "Zahlen- & Buchstabenfolgen"],
    "task.number-series.desc": ["Find the rule in a number or letter sequence and select the next item.", "Finde die Regel einer Zahlen- oder Buchstabenfolge und wähle das nächste Element."],
    "task.number-series.instructions": [
      "Complete 8 mandatory practice items before the main test; practice is scored separately. Inspect the sequence and find its rule: differences, ratios, alternating subsequences, repeated operation cycles or alphabet steps. Choose the one of six options that best continues the full pattern before time expires. Assessment balances fixed difficulty levels across your selected minimum–maximum range; training adapts within it. These generated items are not normed intelligence scores.",
      "Absolviere vor dem Haupttest 8 verpflichtende Übungsaufgaben; die Übung wird separat gewertet. Untersuche die Folge und finde ihre Regel: Differenzen, Verhältnisse, abwechselnde Teilfolgen, wiederholte Rechenschritte oder Alphabetschritte. Wähle vor Ablauf der Zeit die eine von sechs Optionen, die das gesamte Muster am besten fortsetzt. Messungen verteilen feste Schwierigkeitsstufen ausgewogen zwischen gewähltem Minimum und Maximum; Training passt sich innerhalb dieser Spanne an. Diese generierten Aufgaben liefern keine normierten Intelligenzwerte."
    ],
    "task.number-series.keys": ["1–6 = the correspondingly numbered answer option, not the answer's numeric value. Or tap/click an option.", "1–6 = die entsprechend nummerierte Antwortoption, nicht der Zahlenwert der Antwort. Oder tippe/klicke auf eine Option."],

    "task.mental-arithmetic.name": ["Mental arithmetic", "Kopfrechnen"],
    "task.mental-arithmetic.desc": ["Solve arithmetic, chained calculations and optional percentages against the clock.", "Löse Rechenaufgaben, verkettete Rechnungen und optionale Prozentaufgaben gegen die Zeit."],
    "task.mental-arithmetic.instructions": [
      "Complete 8 mandatory practice problems, excluded from the main test score. Calculate the displayed expression mentally; follow parentheses and standard operation order. Enter the full numeric answer, including a minus sign or decimal when needed, then submit before the deadline. For percentages, calculate the stated percent of the value. Work accurately and quickly without a calculator.",
      "Absolviere 8 verpflichtende Übungsaufgaben, die nicht zum Haupttestergebnis zählen. Berechne den gezeigten Ausdruck im Kopf; beachte Klammern und Punkt vor Strich. Gib das vollständige Zahlenergebnis gegebenenfalls mit Minuszeichen oder Dezimalstellen ein und bestätige vor Fristende. Berechne bei Prozentaufgaben den genannten Prozentsatz des Wertes. Arbeite genau und zügig ohne Taschenrechner."
    ],
    "task.mental-arithmetic.keys": ["0–9 = digits; comma or period = decimal separator; minus (−) = negative sign; Backspace = delete last character; Enter = submit.", "0–9 = Ziffern; Komma oder Punkt = Dezimaltrennzeichen; Minus (−) = negatives Vorzeichen; Rücktaste (Backspace) = letztes Zeichen löschen; Eingabetaste (Enter) = abgeben."],

    "task.pvt-b.name": ["Brief vigilance test · PVT-B", "Kurzer Vigilanztest · PVT-B"],
    "task.pvt-b.desc": ["A three-minute reaction-time task with unpredictable waits and a visible counter.", "Eine dreiminütige Reaktionszeitaufgabe mit unvorhersehbaren Wartezeiten und sichtbarem Zähler."],
    "task.pvt-b.instructions": [
      "Complete 8 mandatory practice trials; they are not part of the three-minute main test or its score. Watch the blank task area and wait. As soon as the counter appears, respond once as quickly as possible, then release and wait for the next appearance. Do not respond while blank or anticipate the counter: these are false starts. The stopped counter shows your reaction time; there is no correctness feedback.",
      "Absolviere 8 verpflichtende Übungsdurchgänge; sie gehören weder zum dreiminütigen Haupttest noch zu dessen Ergebnis. Beobachte den leeren Aufgabenbereich und warte. Sobald der Zähler erscheint, antworte einmal so schnell wie möglich, lasse los und warte auf das nächste Erscheinen. Antworte nicht bei leerem Bildschirm und nimm den Zähler nicht vorweg: Das sind Fehlstarts. Der angehaltene Zähler zeigt die Reaktionszeit; es gibt keine Richtig-falsch-Rückmeldung."
    ],
    "task.pvt-b.keys": ["Space = respond when the counter appears, or tap/click anywhere in the task area. Do not respond while blank. Release between responses; do not hold Space.", "Leertaste = beim Erscheinen des Zählers antworten, oder irgendwo im Aufgabenbereich tippen/klicken. Nicht bei leerem Bildschirm antworten. Zwischen Antworten loslassen; Leertaste nicht halten."],

    "mobile.ufov": ["Small screens change peripheral viewing angles and crowd the targets. Use landscape, keep a fixed viewing distance and prefer a larger screen. Mobile UFOV results are not equivalent to validated desktop testing.", "Kleine Bildschirme verändern periphere Sehwinkel und drängen Ziele zusammen. Nutze Querformat, halte den Betrachtungsabstand konstant und bevorzuge einen größeren Bildschirm. Mobile UFOV-Werte entsprechen keinem validierten Desktop-Test."],
    "mobile.antisaccade": ["Small screens shorten the required eye movement; touch can also shift attention. Prefer a larger landscape display and a fixed viewing distance. Eye movement compliance is not measured.", "Kleine Bildschirme verkürzen die erforderliche Blickbewegung; Touch kann zusätzlich die Aufmerksamkeit verschieben. Bevorzuge einen größeren Bildschirm im Querformat und einen festen Betrachtungsabstand. Die korrekte Blickbewegung wird nicht gemessen."],
    "mobile.pvt-b": ["Touch latency and screen timing can differ substantially from keyboard setups. Use one device and input consistently; do not compare mobile reaction times directly with laboratory or keyboard norms.", "Touch-Verzögerung und Bildschirmtiming können stark von Tastaturaufbauten abweichen. Nutze durchgehend dasselbe Gerät und dieselbe Eingabe; vergleiche mobile Reaktionszeiten nicht direkt mit Labor- oder Tastaturnormen."],

    "score.accuracy": ["Accuracy", "Genauigkeit"],
    "score.correct": ["Correct responses", "Richtige Antworten"],
    "score.correctPer90": ["Correct per 90 s", "Richtig pro 90 s"],
    "score.nLevelMean": ["Mean n-back level", "Mittlere n-back-Stufe"],
    "score.hits": ["Hits", "Treffer"],
    "score.falseAlarms": ["False alarms", "Fehlalarme"],
    "score.misses": ["Misses", "Verpasste Treffer"],
    "score.correctRejections": ["Correct rejections", "Korrekte Zurückweisungen"],
    "score.positionDPrime": ["Position sensitivity (d′)", "Positionssensitivität (d′)"],
    "score.audioDPrime": ["Audio sensitivity (d′)", "Audiosensitivität (d′)"],
    "score.lureFalseAlarmRate": ["Lure false-alarm rate", "Fehlalarmrate bei ähnlichen Nichttreffern"],
    "score.centralThreshold": ["Central threshold (ms)", "Zentrale Schwelle (ms)"],
    "score.dividedThreshold": ["Divided-attention threshold (ms)", "Schwelle geteilter Aufmerksamkeit (ms)"],
    "score.selectiveThreshold": ["Selective-attention threshold (ms)", "Schwelle selektiver Aufmerksamkeit (ms)"],
    "score.centralAccuracy": ["Central accuracy", "Zentrale Genauigkeit"],
    "score.dividedAccuracy": ["Divided-attention accuracy", "Genauigkeit geteilter Aufmerksamkeit"],
    "score.selectiveAccuracy": ["Selective-attention accuracy", "Genauigkeit selektiver Aufmerksamkeit"],
    "score.k4": ["Cowan's K · 4 items", "Cowans K · 4 Elemente"],
    "score.k6": ["Cowan's K · 6 items", "Cowans K · 6 Elemente"],
    "score.k8": ["Cowan's K · 8 items", "Cowans K · 8 Elemente"],
    "score.kMean": ["Mean Cowan's K", "Mittleres Cowans K"],
    "score.partialCredit": ["Items recalled in correct position (raw count)", "An richtiger Stelle erinnerte Elemente (Anzahl)"],
    "score.partialCreditLoad": ["Load-weighted recall (correctly recalled items / all presented items)", "Lastgewichteter Abruf (richtig erinnerte / alle gezeigten Elemente)"],
    "score.absoluteScore": ["Items in fully correct sequences", "Elemente vollständig richtiger Folgen"],
    "score.span": ["Longest fully correct span", "Längste vollständig richtige Spanne"],
    "score.totalCorrect": ["Fully correct sequences", "Vollständig richtige Folgen"],
    "score.processingAccuracy": ["Symmetry judgment accuracy", "Genauigkeit der Symmetrieurteile"],
    "score.correctPerMinute": ["Correct per minute", "Richtig pro Minute"],
    "score.meanReciprocalRT": ["Mean reciprocal RT (1/s)", "Mittlere reziproke Reaktionszeit (1/s)"],
    "score.meanRT": ["Mean reaction time (ms)", "Mittlere Reaktionszeit (ms)"],
    "score.lapses": ["Lapses (>355 ms or no response)", "Aussetzer (>355 ms oder keine Antwort)"],
    "score.falseStarts": ["False starts", "Fehlstarts"],
    "score.estimatedThreshold": ["Estimated reasoning level", "Geschätzte Denkaufgabenstufe"],
    "score.bin1": ["Level 1 accuracy", "Genauigkeit Stufe 1"],
    "score.bin2": ["Level 2 accuracy", "Genauigkeit Stufe 2"],
    "score.bin3": ["Level 3 accuracy", "Genauigkeit Stufe 3"],
    "score.bin4": ["Level 4 accuracy", "Genauigkeit Stufe 4"],
    "score.bin5": ["Level 5 accuracy", "Genauigkeit Stufe 5"],
    "score.excluded": ["Excluded reaction times", "Ausgeschlossene Reaktionszeiten"],

    "param.variant": ["Task variant", "Aufgabenvariante"],
    "param.n": ["Starting n-back level", "n-back-Startstufe"],
    "param.audioStimuli": ["Audio stimuli", "Audioreize"],
    "param.stimulusMs": ["Stimulus duration (ms)", "Reizdauer (ms)"],
    "param.isiMs": ["Gap after stimulus (ms)", "Pause nach dem Reiz (ms)"],
    "param.lureShare": ["Lure share (0–1)", "Anteil ähnlicher Nichttreffer (0–1)"],
    "param.operand": ["Arithmetic n-back increment", "Zuschlag beim Rechen-n-back"],
    "param.blocks": ["Number of blocks", "Anzahl Blöcke"],
    "param.durationMs": ["Starting exposure (ms)", "Anfängliche Darbietung (ms)"],
    "param.durationMinMs": ["Minimum exposure (ms)", "Kürzeste Darbietung (ms)"],
    "param.durationMaxMs": ["Maximum exposure (ms)", "Längste Darbietung (ms)"],
    "param.assessmentLevels": ["Fixed assessment exposure levels", "Feste Darbietungsstufen der Messung"],
    "param.trialsPerSubtest": ["Trials per subtest", "Durchgänge je Untertest"],
    "param.responseMs": ["Response time limit (ms)", "Antwortfrist (ms)"],
    "param.durationSeconds": ["Block duration (s)", "Blockdauer (s)"],
    "param.deadlineMs": ["Starting response deadline (ms)", "Anfängliche Antwortfrist (ms)"],
    "param.trials": ["Main-block trials", "Durchgänge im Hauptblock"],
    "param.fixationMinMs": ["Minimum fixation (ms)", "Kürzeste Fixation (ms)"],
    "param.fixationMaxMs": ["Maximum fixation (ms)", "Längste Fixation (ms)"],
    "param.cueMs": ["Peripheral cue duration (ms)", "Dauer des seitlichen Hinweisreizes (ms)"],
    "param.targetMs": ["Starting target duration (ms)", "Anfängliche Zieldauer (ms)"],
    "param.exposureMs": ["Starting array exposure (ms)", "Anfängliche Felddarbietung (ms)"],
    "param.retentionMs": ["Memory delay (ms)", "Behaltensintervall (ms)"],
    "param.processingMs": ["Practice symmetry deadline (ms)", "Symmetriefrist der Einübung (ms)"],
    "param.memoryMs": ["Memory-cell display (ms)", "Anzeige der Merkzelle (ms)"],
    "param.recallMs": ["Recall time limit (ms)", "Abruffrist (ms)"],
    "param.direction": ["Recall direction", "Abrufrichtung"],
    "param.startLength": ["Starting sequence length", "Anfängliche Folgenlänge"],
    "param.maxLength": ["Maximum sequence length", "Maximale Folgenlänge"],
    "param.flashMs": ["Item display duration (ms)", "Anzeigedauer je Element (ms)"],
    "param.intervalMs": ["Item onset interval (ms)", "Intervall zwischen Reizanfängen (ms)"],
    "param.minOperand": ["Minimum operand", "Kleinste Rechenzahl"],
    "param.maxOperand": ["Starting maximum operand", "Anfänglich größte Rechenzahl"],
    "param.operations": ["Arithmetic operations", "Rechenarten"],
    "param.chained": ["Include chained calculations", "Verkettete Rechnungen einschließen"],
    "param.percentages": ["Include percentages", "Prozentaufgaben einschließen"],
    "param.minIsiMs": ["Minimum waiting interval (ms)", "Kürzestes Warteintervall (ms)"],
    "param.maxIsiMs": ["Maximum waiting interval (ms)", "Längstes Warteintervall (ms)"],
    "param.lapseMs": ["Lapse threshold (ms)", "Aussetzerschwelle (ms)"],
    "param.startLevel": ["Starting difficulty level", "Anfängliche Schwierigkeitsstufe"],
    "param.minLevel": ["Minimum difficulty level", "Niedrigste Schwierigkeitsstufe"],
    "param.maxLevel": ["Maximum difficulty level", "Höchste Schwierigkeitsstufe"],
    "param.family": ["Item family", "Aufgabenfamilie"],

    "choice.dual": ["Position + audio", "Position + Audio"],
    "choice.position": ["Position only", "Nur Position"],
    "choice.audio": ["Audio only", "Nur Audio"],
    "choice.arithmetic": ["Arithmetic n-back", "Rechen-n-back"],
    "choice.forward": ["Forward", "Vorwärts"],
    "choice.backward": ["Backward", "Rückwärts"],
    "choice.mixed": ["Mixed", "Gemischt"],
    "choice.add": ["Addition", "Addition"],
    "choice.subtract": ["Subtraction", "Subtraktion"],
    "choice.multiply": ["Multiplication", "Multiplikation"],
    "choice.divide": ["Division", "Division"],
    "choice.yes": ["Yes", "Ja"],
    "choice.no": ["No", "Nein"],
    "choice.numbers": ["Numbers", "Zahlen"],
    "choice.letters": ["Letters", "Buchstaben"],
    "choice.words": ["Words", "Wörter"],
    "choice.transformation": ["Visual transformations", "Visuelle Transformationen"],
    "choice.logic": ["Visual logic", "Visuelle Logik"],

    "response.word": ["WORD: choose the word meaning", "WORT: Wähle die Wortbedeutung"],
    "response.ink": ["INK: choose the ink colour", "FARBE: Wähle die Schriftfarbe"],
    "response.choose": ["Choose the correct response", "Wähle die richtige Antwort"],
    "response.decimal": [".", ","],
    "stim.nbackLevel": ["n = {n} · {variant}", "n = {n} · {variant}"],
    "stim.spanLevel": ["{direction} · {length} items", "{direction} · {length} Elemente"],
    "stim.ufov.central": ["Central identification", "Zentrale Erkennung"],
    "stim.ufov.divided": ["Divided attention", "Geteilte Aufmerksamkeit"],
    "stim.ufov.selective": ["Selective attention", "Selektive Aufmerksamkeit"],
    "response.back": ["Undo", "Zurück"],
    "response.enter": ["OK", "OK"],
    "response.respond": ["Respond", "Antworten"],
    "response.match": ["Match", "Übereinstimmung"],
    "response.position": ["Position match", "Position gleich"],
    "response.audio": ["Audio match", "Audio gleich"],
    "response.same": ["Same", "Gleich"],
    "response.different": ["Different", "Anders"],
    "response.symmetric": ["Symmetric", "Symmetrisch"],
    "response.asymmetric": ["Asymmetric", "Asymmetrisch"],
    "response.car": ["Car", "Auto"],
    "response.truck": ["Truck", "Lkw"],
    "response.left": ["Left", "Links"],
    "response.right": ["Right", "Rechts"],
    "response.direction0": ["Top", "Oben"],
    "response.direction1": ["Top-right", "Rechts oben"],
    "response.direction2": ["Right", "Rechts"],
    "response.direction3": ["Bottom-right", "Rechts unten"],
    "response.direction4": ["Bottom", "Unten"],
    "response.direction5": ["Bottom-left", "Links unten"],
    "response.direction6": ["Left", "Links"],
    "response.direction7": ["Top-left", "Links oben"],
    "stim.percent": ["{percent}% of {value}", "{percent}% von {value}"],
    "color.0": ["Red", "Rot"],
    "color.1": ["Green", "Grün"],
    "color.2": ["Blue", "Blau"],
    "color.3": ["Yellow", "Gelb"],

    "device.desktop": ["Desktop", "Desktop"],
    "device.tablet": ["Tablet", "Tablet"],
    "device.phone": ["Phone", "Smartphone"],
    "input.keyboard": ["Keyboard", "Tastatur"],
    "input.touch": ["Touch", "Touch"],
    "input.mouse": ["Mouse", "Maus"],
    "stimulus.tones": ["Tones", "Töne"],
    "stimulus.speech-en": ["English speech", "Englische Sprachausgabe"],
    "stimulus.speech-de": ["German speech", "Deutsche Sprachausgabe"],
    "stimulus.speech-letters-en": ["English letter names", "Englische Buchstabennamen"],
    "stimulus.speech-letters-de": ["German letter names", "Deutsche Buchstabennamen"],
    "stimulus.speech-words-en": ["English words", "Englische Wörter"],
    "stimulus.speech-words-de": ["German words", "Deutsche Wörter"],
    "stimulus.spatial": ["Spatial positions", "Räumliche Positionen"],
    "stimulus.digits": ["Digits", "Ziffern"],
    "stimulus.visual": ["Visual stimuli", "Visuelle Reize"],
    "stimulus.letters": ["Letters", "Buchstaben"],
    "stimulus.mixed": ["Numbers & letters", "Zahlen & Buchstaben"],
    "stimulus.words": ["Localized words", "Lokalisierte Wörter"],

    "i18n.missingKey": ["Missing translation: {key} ({language}); falling back to English or the key.", "Fehlende Übersetzung: {key} ({language}); Englisch oder der Schlüssel wird verwendet."]
  };

  Object.assign(pairs, {
  "task.stop-signal.name": [
    "Stop-signal",
    "Stoppsignal"
  ],
  "task.stop-signal.desc": [
    "Respond to arrow direction unless a delayed stop cue appears.",
    "Antworte auf die Pfeilrichtung, außer ein verzögertes Stoppsignal erscheint."
  ],
  "task.stop-signal.instructions": [
    "Complete 8 mandatory practice trials first; they are recorded separately and never enter the main score. Respond left or right to every arrow unless the red stop cue appears after the arrow starts. Respond promptly: do not wait for a possible stop signal. On stop trials, withhold the response completely even if the cue comes late. Training adapts the stop-signal delay only on valid stop trials; assessment keeps a fixed delay. SSRT remains unavailable when the sample or race-model checks are inadequate; unavailable is not zero.",
    "Absolviere zuerst 8 verpflichtende Übungsdurchgänge; sie werden getrennt erfasst und zählen nie zum Hauptergebnis. Antworte bei jedem Pfeil links oder rechts, außer nach Beginn erscheint das rote Stoppsignal. Antworte zügig: Warte nicht auf ein mögliches Stoppsignal. Bei Stoppsignalen unterdrücke die Antwort vollständig, auch wenn der Hinweis spät kommt. Im Training passt sich nur die Stoppsignalverzögerung auf gültigen Stoppsignalen an; in Messungen bleibt sie fest. Die SSRT bleibt bei unzureichender Stichprobe oder nicht erfüllten Race-Modell-Prüfungen unverfügbar; fehlend ist nicht null."
  ],
  "task.stop-signal.keys": [
    "A = left arrow; L = right arrow. When the red stop cue appears, do not press anything. Touch or mouse: choose the left or right panel only on go trials.",
    "A = linker Pfeil; L = rechter Pfeil. Wenn das rote Stoppsignal erscheint, drücke nichts. Bei Touch oder Maus wähle nur in Go-Durchgängen das linke oder rechte Feld."
  ],
  "task.ax-cpt.name": [
    "AX continuous performance",
    "AX-Daueraufmerksamkeitstest"
  ],
  "task.ax-cpt.desc": [
    "Use cue-probe context: respond TARGET only to AX, and NONTARGET to AY, BX and BY.",
    "Nutze den Hinweisreiz-Kontext: Antworte nur bei AX mit ZIEL und bei AY, BX und BY mit NICHT ZIEL."
  ],
  "task.ax-cpt.instructions": [
    "Complete 8 mandatory practice trials first, including all four cue-probe types. Remember the cue letter through the blank delay, then classify the probe: AX is the only target. AY, BX and BY are all non-targets. Omitted responses are errors; on non-target trials, an omission is not a correct rejection. Training adapts the response deadline in 10-trial chunks; assessment keeps the configured timing fixed.",
    "Absolviere zuerst 8 verpflichtende Übungsdurchgänge mit allen vier Hinweisreiz-Testreiz-Typen. Merke dir den Hinweisbuchstaben über die leere Pause und klassifiziere dann den Testreiz: Nur AX ist ein Zielreiz. AY, BX und BY sind immer Nicht-Zielreize. Ausgelassene Antworten sind Fehler; bei Nicht-Zielreizen ist eine Auslassung keine korrekte Zurückweisung. Im Training passt sich die Antwortfrist in 10er-Blöcken an; Messungen behalten die eingestellten Zeiten fest bei."
  ],
  "task.ax-cpt.keys": [
    "A = target (AX only); L = non-target (AY, BX, BY). Touch or mouse: choose the target or non-target panel after the probe appears.",
    "A = Ziel (nur AX); L = Nicht-Ziel (AY, BX, BY). Bei Touch oder Maus wähle nach dem Testreiz das Feld Ziel oder Nicht-Ziel."
  ],
  "task.task-switching.name": [
    "Cued task switching",
    "Hinweisreiz-Aufgabenwechsel"
  ],
  "task.task-switching.desc": [
    "Switch between parity and magnitude judgments on single digits.",
    "Wechsle zwischen Paritäts- und Größenurteilen für einzelne Ziffern."
  ],
  "task.task-switching.instructions": [
    "Complete 8 mandatory practice trials first; they are scored separately. A cue appears before each digit and tells you whether to judge PARITY or MAGNITUDE. For PARITY, answer odd versus even; for MAGNITUDE, answer low (<5) versus high (>5). Digits 1-9 appear except 5. Training adapts the response deadline during mixed blocks; assessment keeps it fixed. The score is deadline-limited accuracy, not a switch-cost RT difference.",
    "Absolviere zuerst 8 verpflichtende Übungsdurchgänge; sie werden getrennt bewertet. Vor jeder Ziffer erscheint ein Hinweisreiz, der PARITÄT oder GRÖSSE vorgibt. Bei PARITÄT antworte ungerade oder gerade; bei GRÖSSE antworte klein (<5) oder groß (>5). Es erscheinen die Ziffern 1-9 außer 5. Im Training passt sich die Antwortfrist in Mischblöcken an; in Messungen bleibt sie fest. Der Wert ist Genauigkeit unter Zeitlimit, keine Reaktionszeitdifferenz von Wechselkosten."
  ],
  "task.task-switching.keys": [
    "PARITY: A = odd, L = even. MAGNITUDE: A = low (<5), L = high (>5). Touch or mouse: use the currently labelled response panel.",
    "PARITÄT: A = ungerade, L = gerade. GRÖSSE: A = klein (<5), L = groß (>5). Bei Touch oder Maus nutze das aktuell beschriftete Antwortfeld."
  ],
  "task.digit-symbol.name": [
    "Digit-symbol lookup",
    "Ziffer-Symbol-Zuordnung"
  ],
  "task.digit-symbol.desc": [
    "Use a visible 1-9 code key to translate abstract symbols back to digits as quickly as possible.",
    "Nutze einen sichtbaren 1-9-Schlüssel, um abstrakte Symbole so schnell wie möglich wieder in Ziffern zu übersetzen."
  ],
  "task.digit-symbol.instructions": [
    "Complete 8 mandatory practice trials before the main block. The code key stays visible above every target symbol; respond with the digit paired with that symbol. There is no visible block timer. Training adapts the response deadline; assessment keeps the configured deadline fixed. Practice and main blocks may use a new symbol mapping, and the score is correct answers per minute plus accuracy, not an IQ score.",
    "Absolviere vor dem Hauptblock 8 verpflichtende Übungsdurchgänge. Der Schlüssel bleibt über jedem Zielsymbol sichtbar; antworte mit der zugehörigen Ziffer. Es gibt keinen sichtbaren Blocktimer. Im Training passt sich die Antwortfrist an; in Messungen bleibt die eingestellte Frist fest. Übungs- und Hauptblock können eine neue Symbolzuordnung verwenden, und der Wert ist richtige Antworten pro Minute plus Genauigkeit, kein IQ-Wert."
  ],
  "task.digit-symbol.keys": [
    "Press 1-9 for the digit paired with the target symbol. Touch or mouse: select the matching digit button.",
    "Drücke 1-9 für die dem Zielsymbol zugeordnete Ziffer. Bei Touch oder Maus wähle die passende Zifferntaste."
  ],
  "param.stopProbability": [
    "Stop-trial share",
    "Anteil der Stoppsignaldurchgänge"
  ],
  "param.itiMs": [
    "Inter-trial interval (ms)",
    "Intervall zwischen Durchgängen (ms)"
  ],
  "param.ssdStartMs": [
    "Fixed / starting stop-signal delay (ms)",
    "Feste / anfängliche Stoppsignalverzögerung (ms)"
  ],
  "param.ssdMinMs": [
    "Minimum stop-signal delay (ms)",
    "Minimale Stoppsignalverzögerung (ms)"
  ],
  "param.ssdMaxMs": [
    "Maximum stop-signal delay (ms)",
    "Maximale Stoppsignalverzögerung (ms)"
  ],
  "param.ssdStepMs": [
    "Stop-signal delay step (ms)",
    "Schrittweite der Stoppsignalverzögerung (ms)"
  ],
  "param.axShare": [
    "AX target-trial share",
    "Anteil der AX-Zieldurchgänge"
  ],
  "param.cueDurationMs": [
    "Cue duration (ms)",
    "Dauer des Hinweisreizes (ms)"
  ],
  "param.cueProbeDelayMs": [
    "Cue-probe delay (ms)",
    "Pause zwischen Hinweis- und Testreiz (ms)"
  ],
  "param.probeDurationMs": [
    "Probe visibility (ms)",
    "Sichtbarkeit des Testreizes (ms)"
  ],
  "param.trialsPerBlock": [
    "Trials per mixed block",
    "Durchgänge pro Mischblock"
  ],
  "param.switchProbability": [
    "Switch-trial share",
    "Anteil der Wechseldurchgänge"
  ],
  "param.cueTargetIntervalMs": [
    "Cue-target interval (ms)",
    "Intervall zwischen Hinweisreiz und Zielreiz (ms)"
  ],
  "response.target": [
    "Target",
    "Ziel"
  ],
  "response.nonTarget": [
    "Non-target",
    "Nicht-Ziel"
  ],
  "response.odd": [
    "Odd",
    "Ungerade"
  ],
  "response.even": [
    "Even",
    "Gerade"
  ],
  "response.low": [
    "Low",
    "Klein"
  ],
  "response.high": [
    "High",
    "Groß"
  ],
  "stim.stopSignal.block": [
    "Stop-signal block",
    "Stoppsignalblock"
  ],
  "stim.axCpt.block": [
    "AX-CPT block",
    "AX-CPT-Block"
  ],
  "stim.axCpt.cueA": [
    "A",
    "A"
  ],
  "stim.axCpt.cueB": [
    "B",
    "B"
  ],
  "stim.axCpt.probeX": [
    "X",
    "X"
  ],
  "stim.axCpt.probeY": [
    "Y",
    "Y"
  ],
  "stim.taskSwitching.block": [
    "Task-switching block",
    "Aufgabenwechselblock"
  ],
  "stim.taskSwitching.parityCue": [
    "PARITY",
    "PARITÄT"
  ],
  "stim.taskSwitching.magnitudeCue": [
    "MAGNITUDE",
    "GRÖSSE"
  ],
  "stim.taskSwitching.parityLegend": [
    "Odd on the left · Even on the right",
    "Ungerade links · Gerade rechts"
  ],
  "stim.taskSwitching.magnitudeLegend": [
    "Low on the left · High on the right",
    "Klein links · Groß rechts"
  ],
  "stim.digitSymbol.block": [
    "Digit-symbol block",
    "Ziffer-Symbol-Block"
  ],
  "stim.digitSymbol.lookup": [
    "Code key",
    "Schlüssel"
  ],
  "stim.digitSymbol.target": [
    "Target symbol",
    "Zielsymbol"
  ],
  "stimulus.symbols": [
    "Abstract symbols",
    "Abstrakte Symbole"
  ],
  "score.ssrt": [
    "Stop-signal reaction time (ms)",
    "Stoppsignal-Reaktionszeit (ms)"
  ],
  "score.goAccuracy": [
    "Go-trial accuracy",
    "Go-Genauigkeit"
  ],
  "score.stopAccuracy": [
    "Successful inhibition rate",
    "Erfolgsrate der Hemmung"
  ],
  "score.stopResponseRate": [
    "Stop-trial response rate",
    "Antwortquote auf Stoppsignalen"
  ],
  "score.meanSSD": [
    "Mean actual stop-signal delay (ms)",
    "Mittlere tatsächliche Stoppsignalverzögerung (ms)"
  ],
  "score.ssrtEstimable": [
    "SSRT estimate available",
    "SSRT-Schätzung verfügbar"
  ],
  "score.goOmissions": [
    "Go-trial omissions",
    "Auslassungen in Go-Durchgängen"
  ],
  "score.meanGoRT": [
    "Mean correct go RT (ms)",
    "Mittlere korrekte Go-Reaktionszeit (ms)"
  ],
  "score.failedStopMeanRT": [
    "Mean failed-stop RT (ms)",
    "Mittlere Reaktionszeit misslungener Stoppsignale (ms)"
  ],
  "score.ayErrors": [
    "AY errors",
    "AY-Fehler"
  ],
  "score.bxErrors": [
    "BX errors",
    "BX-Fehler"
  ],
  "score.ayErrorRate": [
    "AY error rate",
    "AY-Fehlerrate"
  ],
  "score.bxErrorRate": [
    "BX error rate",
    "BX-Fehlerrate"
  ],
  "score.omissions": [
    "Response omissions",
    "Antwortauslassungen"
  ],
  "score.nonTargetOmissions": [
    "Non-target omissions",
    "Nicht-Ziel-Auslassungen"
  ],
  "score.switchAccuracy": [
    "Switch-trial accuracy",
    "Genauigkeit bei Wechseldurchgängen"
  ],
  "score.repeatAccuracy": [
    "Repeat-trial accuracy",
    "Genauigkeit bei Wiederholungsdurchgängen"
  ],
  "score.parityAccuracy": [
    "Parity-rule accuracy",
    "Genauigkeit der Paritätsregel"
  ],
  "score.magnitudeAccuracy": [
    "Magnitude-rule accuracy",
    "Genauigkeit der Größenregel"
  ],
  "score.ssrtReason.minGo": [
    "SSRT unavailable: fewer than 20 eligible go trials.",
    "SSRT nicht verfügbar: weniger als 20 gültige Go-Durchgänge."
  ],
  "score.ssrtReason.minStop": [
    "SSRT unavailable: fewer than 8 eligible stop trials.",
    "SSRT nicht verfügbar: weniger als 8 gültige Stoppsignaldurchgänge."
  ],
  "score.ssrtReason.goOmissions": [
    "SSRT unavailable: too many omitted go responses.",
    "SSRT nicht verfügbar: zu viele ausgelassene Go-Antworten."
  ],
  "score.ssrtReason.stopRate": [
    "SSRT unavailable: stop-trial response rate lies outside 25-75%.",
    "SSRT nicht verfügbar: Die Antwortquote auf Stoppsignalen liegt außerhalb von 25-75 %."
  ],
  "score.ssrtReason.race": [
    "SSRT unavailable: failed-stop RT is not faster than mean go RT.",
    "SSRT nicht verfügbar: Misslungene Stoppsignal-Reaktionszeiten sind nicht schneller als die mittlere Go-Reaktionszeit."
  ],
  "score.ssrtReason.ssd": [
    "SSRT unavailable: actual stop-signal delays are missing.",
    "SSRT nicht verfügbar: tatsächliche Stoppsignalverzögerungen fehlen."
  ],
  "score.ssrtReason.distribution": [
    "SSRT unavailable: valid go RT distribution is missing.",
    "SSRT nicht verfügbar: die gültige Go-Reaktionszeitverteilung fehlt."
  ],
  "score.ssrtReason.nonpositive": [
    "SSRT unavailable: the integration estimate was zero or negative.",
    "SSRT nicht verfügbar: die Integrationsschätzung war null oder negativ."
  ],
  "stopSignal.invalidSsdRange": [
    "The stop-signal delay range must stay below the response deadline, with minimum ≤ start ≤ maximum.",
    "Der Bereich der Stoppsignalverzögerung muss unter der Antwortfrist bleiben, mit Minimum ≤ Start ≤ Maximum."
  ]
});

  Object.assign(pairs, {
  "task.mental-rotation.name": [
    "Mental rotation",
    "Mentale Rotation"
  ],
  "task.mental-rotation.desc": [
    "Decide whether two shaded voxel figures are the same object in different rotation or a mirror-different foil.",
    "Entscheide, ob zwei schattierte Voxel-Figuren dasselbe gedrehte Objekt oder eine spiegelverkehrt andere Figur zeigen."
  ],
  "task.mental-rotation.instructions": [
    "Complete 8 mandatory practice trials first; they are recorded separately and never contribute to the main score. Each trial shows two block figures. Choose SAME only when the right figure can be obtained by rotating the left figure in 3D. Choose DIFFERENT when it is a mirrored foil, even if it looks similar. Training adapts the rotation angle within the selected range; assessment balances fixed angles without correctness feedback. Generated figures avoid mirror-symmetric solutions and are not an IQ test.",
    "Absolviere zuerst 8 verpflichtende Übungsdurchgänge; sie werden getrennt erfasst und zählen nie zum Hauptergebnis. Jeder Durchgang zeigt zwei Blockfiguren. Wähle GLEICH nur dann, wenn die rechte Figur durch eine 3D-Drehung aus der linken entsteht. Wähle ANDERS, wenn sie eine gespiegelte Täuschungsfigur ist, auch wenn sie ähnlich aussieht. Im Training passt sich der Rotationswinkel innerhalb des gewählten Bereichs an; die Messung balanciert feste Winkel ohne Richtig-falsch-Rückmeldung. Die generierten Figuren vermeiden spiegelsymmetrische Lösungen und sind kein IQ-Test."
  ],
  "task.mental-rotation.keys": [
    "A = same object; L = mirrored different object. Or tap the corresponding response.",
    "A = gleiches Objekt; L = gespiegelt anderes Objekt. Oder tippe auf die entsprechende Antwort."
  ],
  "task.tower-london.name": [
    "Tower of London",
    "Turm von London"
  ],
  "task.tower-london.desc": [
    "Recreate a visible goal arrangement in as few legal moves as possible.",
    "Stelle eine sichtbare Zielanordnung mit möglichst wenigen zulässigen Zügen nach."
  ],
  "task.tower-london.instructions": [
    "Complete 8 mandatory practice problems first; they are stored separately and never affect the main score. The left board is the GOAL and the right board is your CURRENT arrangement. Select peg 1, 2 or 3 as the source, then peg 1, 2 or 3 as the destination. Only the top ball moves, peg capacities are 3, 2 and 1, and choosing the same source peg again cancels the selection. Each problem ends when solved, at the displayed move limit, or at the configured response deadline. Symbols help: ∅ means the peg was empty, × marks an illegal destination, and n→? shows the selected source peg. Training adapts optimal-move difficulty in small blocks; assessment uses fixed balanced distances and no correctness feedback.",
    "Absolviere zuerst 8 verpflichtende Übungsprobleme; sie werden getrennt gespeichert und beeinflussen das Hauptergebnis nie. Das linke Brett ist das ZIEL, das rechte deine AKTUELLE Anordnung. Wähle Stab 1, 2 oder 3 als Start und danach Stab 1, 2 oder 3 als Ziel. Es darf nur die oberste Kugel bewegt werden, die Stabkapazitäten sind 3, 2 und 1, und die erneute Wahl desselben Startstabs hebt die Auswahl auf. Jedes Problem endet bei Lösung, am angezeigten Zuglimit oder an der eingestellten Antwortfrist. Symbole helfen: ∅ bedeutet, dass der Stab leer war, × markiert ein unzulässiges Ziel, und n→? zeigt den gewählten Startstab. Im Training passt sich die Schwierigkeit nach optimalen Zügen in kleinen Blöcken an; die Messung nutzt fest balancierte Distanzen und keine Richtig-falsch-Rückmeldung."
  ],
  "task.tower-london.keys": [
    "Use keys 1, 2 and 3 for peg choices, or tap/click the peg-number panel. Every legal move is recorded automatically after the destination choice.",
    "Nutze die Tasten 1, 2 und 3 für die Stabwahl oder tippe/klicke auf das Zahlenfeld. Jeder zulässige Zug wird nach der Zielwahl automatisch gespeichert."
  ],
  "param.blockCount": [
    "Blocks per figure",
    "Blöcke pro Figur"
  ],
  "param.minAngleDeg": [
    "Minimum rotation angle (deg)",
    "Minimaler Rotationswinkel (Grad)"
  ],
  "param.maxAngleDeg": [
    "Maximum rotation angle (deg)",
    "Maximaler Rotationswinkel (Grad)"
  ],
  "param.startMoves": [
    "Starting optimal-move difficulty",
    "Anfängliche Schwierigkeit nach Optimalzügen"
  ],
  "param.minMoves": [
    "Minimum optimal moves",
    "Minimale Optimalzüge"
  ],
  "param.maxMoves": [
    "Maximum optimal moves",
    "Maximale Optimalzüge"
  ],
  "param.maxExtraMoves": [
    "Allowed extra moves above optimal",
    "Erlaubte Zusatzzüge über dem Optimum"
  ],
  "score.angle90Accuracy": [
    "90° accuracy",
    "90°-Genauigkeit"
  ],
  "score.angle120Accuracy": [
    "120° accuracy",
    "120°-Genauigkeit"
  ],
  "score.angle180Accuracy": [
    "180° accuracy",
    "180°-Genauigkeit"
  ],
  "score.optimalSolutions": [
    "Solved optimally",
    "Optimal gelöst"
  ],
  "score.meanExcessMoves": [
    "Mean excess moves when solved",
    "Mittlere Zusatzzüge bei gelösten Problemen"
  ],
  "score.optimalMoveEfficiency": [
    "Mean optimal-move efficiency",
    "Mittlere Optimalzug-Effizienz"
  ],
  "score.meanFirstMoveLatency": [
    "Mean first legal move latency (ms)",
    "Mittlere Latenz des ersten zulässigen Zugs (ms)"
  ],
  "tower.goal": [
    "Goal",
    "Ziel"
  ],
  "tower.current": [
    "Current",
    "Aktuell"
  ],
  "tower.moveLimit": [
    "Move limit: {count}",
    "Zuglimit: {count}"
  ],
  "rotation.invalidAngles": [
    "Choose a minimum and maximum angle that include at least one supported 3D rotation angle: 90°, 120° or 180°.",
    "Wähle einen minimalen und maximalen Winkel, die mindestens einen unterstützten 3D-Rotationswinkel enthalten: 90°, 120° oder 180°."
  ],
  "tower.invalidRange": [
    "Starting, minimum and maximum optimal-move settings must be ordered and stay within the legal Tower range.",
    "Einstellungen für Start-, Mindest- und Höchstzahl optimaler Züge müssen geordnet sein und im zulässigen Turm-Bereich bleiben."
  ]
});

  const dictionaries = {
    en: Object.fromEntries(Object.entries(pairs).map(([key, values]) => [key, values[0]])),
    de: Object.fromEntries(Object.entries(pairs).map(([key, values]) => [key, values[1]]))
  };
  const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const interpolate = (text, vars) => text.replace(/\{([^{}]+)\}/g, (placeholder, name) =>
    vars != null && has(vars, name) ? String(vars[name]) : placeholder);

  function t(key, vars = {}, language = "en") {
    const dictionary = has(dictionaries, language) ? dictionaries[language] : null;
    let translation = dictionary && has(dictionary, key) ? dictionary[key] : undefined;
    if (typeof translation !== "string") {
      console.warn(interpolate(pairs["i18n.missingKey"][0], { key, language }));
      translation = has(dictionaries.en, key) ? dictionaries.en[key] : undefined;
    }
    return typeof translation === "string" ? interpolate(translation, vars) : String(key);
  }

  window.CortexI18n = { dictionaries, t };
})();
