"use strict";

(() => {
  const pairs = {
    "app.title": ["BBG", "BBG"],
    "app.description": [
      "BBG - Benny's Brain Gym: challenging brain training, not easy-win games. Adaptive exercises respond to your performance. Serious practice, honest progress.",
      "BBG - Benny's Brain Gym: anspruchsvolles Gehirntraining statt einfacher Spielsiege. Adaptive Übungen reagieren auf deine Leistung. Ernsthaft üben, Fortschritt ehrlich einordnen."
    ],
    "app.tagline": ["Benny's Brain Gym", "Benny's Brain Gym"],
    "app.localOnly": ["Training stays in this browser. No account.", "Training bleibt in diesem Browser. Kein Konto."],
    "reading.title": ["Daily Wikipedia read", "Tägliche Wikipedia-Lektüre"],
    "reading.eyebrow": ["A small discovery · Up to 2 minutes", "Eine kleine Entdeckung · Bis zu 2 Minuten"],
    "reading.settings": ["Reading interests", "Leseinteressen"],
    "reading.enable": ["Enable daily Wikipedia reading (uses the internet)", "Tägliche Wikipedia-Lektüre aktivieren (nutzt das Internet)"],
    "reading.interests": ["Choose your interests", "Wähle deine Interessen"],
    "reading.privacy": ["Optional and off by default. Your browser contacts Wikipedia directly to request a topic. Wikipedia sees your IP address and the requested topic, but receives no scores, forecasts, complete interest profile or account data. Requests omit cookies and referrers. No AI, API key or app backend is used. The latest excerpt is saved locally for offline reading.", "Optional und standardmäßig aus. Dein Browser ruft ein Thema direkt bei Wikipedia ab. Wikipedia sieht deine IP-Adresse und das angefragte Thema, erhält aber keine Ergebnisse, Prognosen, vollständige Interessenliste oder Kontodaten. Anfragen senden weder Cookies noch Referrer. Keine KI, kein API-Schlüssel und kein App-Backend. Der letzte Auszug wird für die Offline-Lektüre lokal gespeichert."],
    "reading.settingsHelp": ["Selected topics rotate by local calendar day. A random article excerpt within today's topic stays the same after reload. Categories are broad, and celebrity choices vary by Wikipedia language. Text is capped at 180 words plus a short title; reading time is estimated at 120 words/minute and your pace may vary.", "Gewählte Themen wechseln mit dem lokalen Kalendertag. Ein zufälliger Artikelauszug zum Tagesthema bleibt nach dem Neuladen gleich. Kategorien sind breit; die Personenauswahl unterscheidet sich je Wikipedia-Sprache. Höchstens 180 Wörter plus kurzer Titel; die Lesezeit wird mit 120 Wörtern/Minute geschätzt, dein Tempo kann abweichen."],
    "reading.disabled": ["Discover a short Wikipedia excerpt here each day. Enable it and choose your interests in settings. An internet connection is needed for a new read; no AI is involved.", "Entdecke hier täglich einen kurzen Wikipedia-Auszug. Aktiviere die Funktion und wähle deine Interessen in den Einstellungen. Neue Lektüre benötigt Internet, aber keine KI."],
    "reading.loading": ["Finding today's Wikipedia read…", "Die heutige Wikipedia-Lektüre wird geladen…"],
    "reading.ready": ["Today's read is ready.", "Die heutige Lektüre ist bereit."],
    "reading.offline": ["You are offline. The last matching saved excerpt is shown below if available; a new daily read needs internet.", "Du bist offline. Der letzte passende gespeicherte Auszug wird, falls vorhanden, unten angezeigt. Neue Tageslektüre benötigt Internet."],
    "reading.paused": ["Reading requests are paused while training or while the page is hidden. Try again when you are ready.", "Während des Trainings oder bei verborgener Seite werden Leseanfragen pausiert. Versuche es erneut, wenn du bereit bist."],
    "reading.unavailable": ["Wikipedia could not be reached or returned an unusable response. Your training still works. Check your connection and try again.", "Wikipedia war nicht erreichbar oder lieferte eine unbrauchbare Antwort. Dein Training funktioniert weiterhin. Prüfe deine Verbindung und versuche es erneut."],
    "reading.timeout": ["Wikipedia took too long to respond. Your training is unaffected; try again later.", "Wikipedia hat zu lange für die Antwort gebraucht. Dein Training ist nicht betroffen; versuche es später erneut."],
    "reading.noResult": ["No suitable short excerpt was found for today's topic. Try again for another random selection, or adjust your interests.", "Zum heutigen Thema wurde kein geeigneter kurzer Auszug gefunden. Versuche eine andere zufällige Auswahl oder passe deine Interessen an."],
    "reading.retry": ["Try loading today's read", "Heutige Lektüre erneut laden"],
    "reading.invalidPreferences": ["Choose only the available reading interests.", "Wähle nur die verfügbaren Leseinteressen."],
    "reading.chooseInterest": ["Choose at least one interest before enabling daily reading.", "Wähle mindestens ein Interesse, bevor du die Tageslektüre aktivierst."],
    "reading.todayDate": ["Selected for {date}", "Ausgewählt für den {date}"],
    "reading.cachedDate": ["Saved read from {date} · Not today's selection", "Gespeicherte Lektüre vom {date} · Nicht die heutige Auswahl"],
    "reading.source": ["Read the source on Wikipedia", "Quelle auf Wikipedia lesen"],
    "reading.contributors": ["Wikipedia contributors", "Wikipedia-Mitwirkende"],
    "reading.shortened": ["Wikipedia introduction excerpt, shortened without AI. The source article contains the full context.", "Auszug aus der Wikipedia-Einleitung, ohne KI gekürzt. Der Quellartikel enthält den vollständigen Kontext."],
    "reading.excerpt": ["Wikipedia introduction excerpt, not an AI-generated fact.", "Auszug aus der Wikipedia-Einleitung, kein KI-generierter Fakt."],
    "reading.context": ["Encyclopedia reading, not breaking news or an independently verified fact. No quiz, score or training claim.", "Enzyklopädische Lektüre, keine aktuellen Nachrichten oder unabhängig geprüfte Tatsache. Kein Quiz, keine Wertung und kein Trainingsversprechen."],
    "reading.unsaved": ["This excerpt is available now but could not be saved for offline use. Review the storage warning or export pending data.", "Dieser Auszug ist jetzt verfügbar, konnte aber nicht für die Offline-Nutzung gespeichert werden. Prüfe die Speicherwarnung oder exportiere ausstehende Daten."],
    "reading.interest.science": ["Science", "Wissenschaft"],
    "reading.interest.technology": ["Technology", "Technik"],
    "reading.interest.politics": ["Politics", "Politik"],
    "reading.interest.celebrities": ["Celebrities", "Prominente"],
    "reading.interest.history": ["History", "Geschichte"],
    "reading.interest.nature": ["Nature", "Natur"],
    "reading.interest.space": ["Space", "Weltraum"],
    "reading.interest.arts": ["Arts & culture", "Kunst & Kultur"],
    "reading.interest.geography": ["Geography", "Geografie"],
    "reading.interest.sports": ["Sports", "Sport"],
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
      "Training gives feedback and adjusts difficulty on supported tasks. Your responses guide the challenge; these scores are practice, not a fixed test.",
      "Training gibt Rückmeldung und passt bei unterstützten Aufgaben die Schwierigkeit an. Deine Antworten bestimmen die Herausforderung. Trainingswerte sind kein fester Test."
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
    "results.parameterNote": ["A series shares task parameters, device class, input method, orientation, stimulus set and protocol version, plus language where relevant. Changed setups create separate lines.", "Eine Reihe teilt Aufgabenparameter, Geräteklasse, Eingabemethode, Ausrichtung, Reizsatz und Ablaufversion sowie gegebenenfalls die Sprache. Andere Bedingungen erzeugen eigene Linien."],
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
    "data.schema": ["This backup uses an unsupported schema version. Import a compatible BBG JSON backup.", "Diese Sicherung verwendet eine nicht unterstützte Schemaversion. Importiere eine kompatible JSON-Sicherung von BBG."],
    "data.invalid": ["This is not a valid BBG backup. Check the file and try an unmodified JSON export.", "Dies ist keine gültige Sicherung von BBG. Prüfe die Datei und versuche einen unveränderten JSON-Export."],
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
    "data.importHelp": ["Choose a BBG JSON backup; older backups remain compatible. Matching sessions are merged; conflicting IDs are preserved. Forecast resolution updates are merged, while disagreements are kept as reviewable conflicts and excluded from calibration. Existing local preferences take priority when records exist. CSV exports cannot restore the app.", "Wähle eine JSON-Sicherung von BBG. Ältere Sicherungen bleiben kompatibel. Identische Sitzungen werden zusammengeführt; ID-Konflikte bleiben erhalten. Prognoseauflösungen werden aktualisiert, widersprüchliche Versionen bleiben als prüfbare, von der Kalibrierung ausgenommene Konflikte erhalten. Bei vorhandenen Einträgen haben lokale Einstellungen Vorrang. CSV-Exporte können die App nicht wiederherstellen."],
    "data.exportOriginal": ["Export unreadable original", "Unlesbares Original exportieren"],

    "about.title": ["Serious training. Honest limits.", "Ernsthaftes Training. Ehrliche Grenzen."],
    "about.purpose": ["A brain gym, not a reward machine", "Ein Gehirn-Gym statt einer Belohnungsmaschine"],
    "about.purposeText": [
      "BBG is for people who want challenging, repeatable practice, not manufactured wins, points, badges or streak pressure. Adaptive exercises use your responses to adjust difficulty within your settings and retain eligible progress for the same setup. Non-adaptive tasks and assessments keep their own protocols. This is a serious practice tool, not a diagnosis, treatment or promise of higher intelligence.",
      "BBG richtet sich an Menschen, die anspruchsvoll und wiederholbar üben wollen, statt künstliche Siege, Punkte, Abzeichen oder Druck durch Trainingsserien zu sammeln. Adaptive Übungen passen anhand deiner Antworten die Schwierigkeit innerhalb deiner Einstellungen an und speichern geeignete Fortschritte für denselben Aufbau. Nicht adaptive Aufgaben und Messungen behalten ihre eigenen Abläufe. Dies ist ein ernsthaftes Übungswerkzeug, keine Diagnose, Behandlung oder Garantie höherer Intelligenz."
    ],
    "about.evidence": ["What training can—and cannot—show", "Was Training zeigen kann – und was nicht"],
    "about.evidenceText": ["Gains on trained tasks are reliable. Near transfer to closely related tasks is generally modest. Against active controls, far transfer to fluid intelligence or everyday cognition is near zero on average. Better scores here primarily demonstrate learning these tasks, not becoming generally smarter.", "Verbesserungen in trainierten Aufgaben sind gut belegt. Nahtransfer auf eng verwandte Aufgaben ist meist gering. Gegenüber aktiven Kontrollgruppen liegt Ferntransfer auf fluide Intelligenz oder Alltagskognition im Mittel nahe null. Bessere Werte hier zeigen vor allem das Erlernen dieser Aufgaben, keine allgemeine Intelligenzsteigerung."],
    "about.ufov": ["UFOV: promising evidence, specific interventions", "UFOV: vielversprechende Evidenz, spezifische Interventionen"],
    "about.ufovText": ["UFOV-style speed-of-processing training has some of the strongest evidence for transfer to everyday function in this area. Some studies used roughly 10 hours of training. Those findings concern specific validated interventions and populations; they do not guarantee that this browser implementation reproduces the intervention or its benefits.", "UFOV-artiges Verarbeitungsgeschwindigkeitstraining gehört in diesem Bereich zu den Ansätzen mit der stärksten Evidenz für einen Transfer auf Alltagsfunktionen. Manche Studien nutzten ungefähr 10 Trainingsstunden. Diese Ergebnisse betreffen spezifische validierte Interventionen und Populationen; sie garantieren nicht, dass diese Browserumsetzung die Intervention oder ihren Nutzen reproduziert."],
    "about.measurement": ["Measurement before interpretation", "Erst messen, dann einordnen"],
    "about.measurementText": ["Compare the same task, mode, parameters, device class, input method, orientation, stimulus set and protocol version; keep language constant for language-dependent tasks. Practice trials are stored separately. Reaction times below 150 ms or above three times the session median are excluded where applicable; false starts are tracked separately. PVT-B retains slow lapses in both lapse counts and reaction-time metrics. An unanswered final window shortened by the block timer is unscored, not an ordinary error. Unreliable or interrupted sessions remain in history but not valid score charts. Training completed with only display-timing warnings counts toward the routine and practice days, not score comparisons; other interrupted rounds require retry or skip. Scores are task-specific, not a universal cognitive scale.", "Vergleiche dieselbe Aufgabe, denselben Modus, dieselben Parameter, Geräteklasse, Eingabemethode, Ausrichtung, Reizsatz und Ablaufversion. Halte bei sprachabhängigen Aufgaben die Sprache konstant. Übungsdurchgänge werden separat gespeichert. Reaktionszeiten unter 150 ms oder über dem Dreifachen des Sitzungsmedians werden gegebenenfalls ausgeschlossen. Fehlstarts werden separat erfasst. PVT-B berücksichtigt langsame Aussetzer sowohl in ihrer Anzahl als auch in Reaktionszeitwerten. Ein durch den Blocktimer verkürztes letztes Antwortfenster ohne Antwort bleibt ungewertet und gilt nicht als gewöhnlicher Fehler. Unzuverlässige oder abgebrochene Sitzungen bleiben im Verlauf, aber nicht in gültigen Ergebnisdiagrammen. Nur durch Bildschirm-Zeitmessungswarnungen beeinträchtigtes, abgeschlossenes Training zählt für Routine und Trainingstage, nicht für Ergebnisvergleiche. Andere abgebrochene Runden benötigen einen neuen Versuch oder können übersprungen werden. Werte sind aufgabenspezifisch, keine universelle kognitive Skala."],
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
    "task.running-span.instructions": ["The number shown before each stream tells you how many final digits to retain. Watch without typing; the stream ends unpredictably. Enter only its last digits in their original order, including repeats and leading zeros, then submit. Training adapts the recall load; assessment holds it fixed.", "Die Zahl vor jeder Folge gibt an, wie viele letzte Ziffern du behalten sollst. Beobachte ohne Eingabe; die Folge endet unvorhersehbar. Gib nur die letzten Ziffern in ursprünglicher Reihenfolge ein, einschließlich Wiederholungen und führender Nullen, und bestätige. Training passt die Abruflast an; Messungen halten sie fest."],
    "task.running-span.keys": ["Digits 0–9; Backspace deletes the last digit; Enter submits. Or use the on-screen keypad.", "Ziffern 0–9; Rücktaste löscht die letzte Ziffer; Enter bestätigt. Alternativ Bildschirmtastatur nutzen."],
    "running.invalidRange": ["Recall length must not exceed maximum recall; maximum recall must be below the minimum stream length; stream limits must be ordered.", "Die Abruflänge darf das Abrufmaximum nicht überschreiten. Das Abrufmaximum muss unter der Mindestlänge der Folge liegen; die Folgengrenzen müssen geordnet sein."],
    "stim.runningRecall": ["Retain the last {count} digits", "Behalte die letzten {count} Ziffern"],
    "task.operation-span.name": ["Operation span", "Operationsspanne"],
    "task.operation-span.desc": ["Verify arithmetic statements while maintaining a sequence of letters.", "Prüfe Rechenaussagen und behalte dabei eine Buchstabenfolge."],
    "task.operation-span.instructions": ["Decide whether each arithmetic statement is true, then remember the following letter. After the set, select all letters in their original order. Both jobs matter: processing accuracy below {criterion}% invalidates the block. Training calibrates and adapts the processing deadline; assessment uses the fixed setting. Recall earns partial credit by position, not only for perfect sets.", "Entscheide, ob jede Rechenaussage stimmt, und merke dir danach den Buchstaben. Wähle nach dem Satz alle Buchstaben in ursprünglicher Reihenfolge. Beide Teile zählen: Verarbeitungsgenauigkeit unter {criterion}% macht den Block ungültig. Training kalibriert und passt die Bearbeitungsfrist an; Messungen nutzen den festen Wert. Richtige Abrufpositionen erhalten Teilpunkte, nicht nur perfekte Sätze."],
    "task.operation-span.keys": ["A = true, L = false. Recall with the displayed option keys 1–9, Q, W, E, R, T, Y, U, or tap the letters. A complete recall submits automatically.", "A = richtig, L = falsch. Abruf über die angezeigten Optionstasten 1–9, Q, W, E, R, T, Y, U oder per Tippen auf die Buchstaben. Vollständiger Abruf wird automatisch abgegeben."],
    "task.sternberg.name": ["Sternberg memory search", "Sternberg-Gedächtnissuche"],
    "task.sternberg.desc": ["Decide whether a probe digit appeared in a briefly memorized set.", "Entscheide, ob eine Testziffer in einer kurz gemerkten Menge vorkam."],
    "task.sternberg.instructions": ["Memorize the displayed set of digits. After the blank retention interval, decide whether the single probe belonged to that set. A means present and L means absent. Set sizes and probe membership are mixed. Training adjusts the response deadline; assessment keeps it fixed. Scores are accuracy and valid correct-response time, not an RT difference.", "Merke dir die gezeigte Ziffernmenge. Entscheide nach dem leeren Behalteintervall, ob die einzelne Testziffer dazugehört. A bedeutet enthalten, L nicht enthalten. Mengengrößen und Zugehörigkeit sind gemischt. Training verändert die Antwortfrist; Messungen halten sie fest. Werte sind Genauigkeit und gültige Zeit richtiger Antworten, keine Reaktionszeitdifferenz."],
    "task.sternberg.keys": ["A = present; L = absent. Or tap the corresponding response.", "A = enthalten; L = nicht enthalten. Oder die entsprechende Antwort antippen."],
    "task.paired-associates.name": ["Paired-associate learning", "Paarassoziationslernen"],
    "task.paired-associates.desc": ["Learn word pairs, then distinguish intact pairs from recombinations.", "Lerne Wortpaare und unterscheide unveränderte von neu kombinierten Paaren."],
    "task.paired-associates.instructions": ["Study every word pair as a relationship. At recognition, choose intact only when those two words were shown together; familiar words paired with a different partner are recombinations. New pairings are learned in every block. Training adapts the number of pairs; assessment fixes it. d′ uses answered recognition trials, with omissions reported separately. Languages are not directly comparable.", "Lerne jedes Wortpaar als Beziehung. Wähle bei der Erkennung unverändert nur dann, wenn beide Wörter zusammen gezeigt wurden; vertraute Wörter mit anderem Partner sind Neukombinationen. Jeder Block enthält neue Paarungen. Training passt die Paarzahl an; Messungen halten sie fest. d′ nutzt beantwortete Erkennungen; Auslassungen werden getrennt ausgewiesen. Sprachen sind nicht direkt vergleichbar."],
    "task.paired-associates.keys": ["A = intact pair; L = recombined pair. Or tap the corresponding option.", "A = unverändertes Paar; L = neu kombiniertes Paar. Oder entsprechende Option antippen."],
    "task.method-loci.name": ["Memory palace practice", "Gedächtnispalast-Training"],
    "task.method-loci.desc": ["Learn the method of loci, then memorize objects, familiar people or playing cards and reconstruct their order.", "Lerne die Loci-Methode, merke dir Gegenstände, vertraute Personen oder Spielkarten und stelle ihre Reihenfolge wieder her."],
    "task.method-loci.instructions": ["Choose a familiar, fixed route, preferably your own unique landmarks in settings. Create a vivid interaction between each item and the next place. Training and warm-ups have no memorization deadline: review all items with Previous/Next, revisit them as needed, then choose Ready to recall. Guided mode offers optional route help; independent mode shows no landmarks during study. Recall hides the study sequence and route. Reconstruct the order from the entire item catalogue, not a shortlist of targets. Browse catalogue pages, undo mistakes or skip a forgotten position, then explicitly submit. An unsubmitted recall times out without credit. Training adjusts item count, not study speed. Main assessments present every item for the fixed assessment study time and never reveal correctness. People should be names you already recognize; playing cards work best with your own consistent card-to-image associations. Scores describe ordered, catalogue-assisted recall and study time, not proof of using loci or general memory improvement.", "Wähle eine vertraute, feste Route, möglichst eigene eindeutige Orte in den Einstellungen. Stelle dir eine lebhafte Interaktion jedes Elements mit dem nächsten Ort vor. Training und Aufwärmen haben keine Lernfrist: Sieh mit Zurück/Weiter alle Elemente an, wiederhole sie nach Bedarf und wähle dann Bereit zum Abruf. Der geführte Modus bietet optionale Routenhilfe; selbstständiges Üben zeigt beim Lernen keine Orte. Beim Abruf sind Lernfolge und Route verborgen. Stelle die Reihenfolge aus dem gesamten Katalog statt einer kleinen Zielauswahl wieder her. Blättere im Katalog, mache Fehler rückgängig oder überspringe eine vergessene Position und gib dann ausdrücklich ab. Ohne Abgabe endet der Abruf ohne Wertungspunkte an der Zeitgrenze. Training verändert die Elementzahl, nicht das Lerntempo. Hauptblöcke der Messung zeigen jedes Element für die feste Lernzeit ohne Richtig-falsch-Rückmeldung. Nutze nur bereits bekannte Personennamen; für Spielkarten eignen sich eigene, feste Bildzuordnungen. Werte beschreiben geordneten, kataloggestützten Abruf und Lernzeit, keinen Nachweis der Loci-Nutzung oder allgemeiner Gedächtnisverbesserung."],
    "task.method-loci.keys": ["Left/Right arrows = previous/next item or catalogue page. R = optional route help during guided study. Enter = ready to recall / submit recall. Recall items with 1–6, Backspace to undo, Space to skip a position. Or use the response buttons.", "Pfeile links/rechts = vorheriges/nächstes Element oder Katalogseite. R = optionale Routenhilfe beim geführten Lernen. Eingabe = bereit zum Abruf / Abruf abgeben. Elemente mit 1–6 wählen, Rücktaste für Rückgängig, Leertaste zum Überspringen einer Position. Oder die Antwortfelder nutzen."],
    "loci.invalidRange": ["Initial item count must not exceed the maximum.", "Die anfängliche Elementzahl darf das Maximum nicht überschreiten."],
    "loci.invalidRoute": ["Provide at least as many unique landmarks as maximum loci, one per line, with at most 60 characters each.", "Gib mindestens so viele eindeutige Orte wie das eingestellte Maximum an, einen pro Zeile und jeweils höchstens 60 Zeichen."],
    "loci.invalidPeople": ["List enough familiar, unique people for your maximum item count, one name per line. Use at most 32 names and 60 characters per name.", "Gib genügend vertraute, eindeutige Personen für die maximale Elementzahl an, je ein Name pro Zeile. Höchstens 32 Namen und 60 Zeichen je Name."],
    "param.itemSet": ["Memory items", "Merkmaterial"],
    "param.coaching": ["Route coaching", "Routenbegleitung"],
    "param.publicFigures": ["Public figures you recognize (one per line)", "Dir bekannte öffentliche Personen (eine je Zeile)"],
    "param.lociStudyMs": ["Fixed assessment study time per item (ms)", "Feste Lernzeit je Element in Messungen (ms)"],
    "choice.objects": ["Everyday objects", "Alltagsgegenstände"],
    "choice.people": ["Familiar public figures", "Bekannte öffentliche Personen"],
    "choice.cards": ["Classic playing cards", "Klassische Spielkarten"],
    "choice.guided": ["Guided · optional route help", "Geführt · optionale Routenhilfe"],
    "choice.independent": ["Independent · no study cues", "Selbstständig · ohne Lernhinweise"],
    "loci.settingsHelp": ["Training and warm-ups are self-paced; the study-time setting applies only to measured assessments. Use a route you really know. For people, remove or replace unfamiliar names. Recall uses the full selected catalogue. New rounds reuse the route: consciously clear the previous images.", "Training und Aufwärmen sind selbstbestimmt; die Lernzeit gilt nur für Messungen. Nutze eine wirklich vertraute Route. Entferne oder ersetze unbekannte Personennamen. Der Abruf nutzt den gesamten gewählten Katalog. Neue Folgen verwenden die Route erneut: Lösche alte Bilder bewusst."],
    "loci.lesson.title": ["Learn the memory-palace technique", "Lerne die Gedächtnispalast-Technik"],
    "loci.lesson.routeTitle": ["Choose a route.", "Wähle eine Route."],
    "loci.lesson.route": ["Use places you can picture without effort, in a fixed order. Your own home or a familiar walk works better than memorizing somebody else's example route.", "Nutze Orte, die du dir mühelos in fester Reihenfolge vorstellen kannst. Deine Wohnung oder ein vertrauter Spaziergang eignen sich besser als eine fremde Beispielroute."],
    "loci.lesson.imagesTitle": ["Make things interact.", "Lass Dinge miteinander interagieren."],
    "loci.lesson.images": ["Put one item at each place. Imagine action, unusual size, sound or motion—not just a word floating above a label. Take the time you need.", "Lege an jedem Ort ein Element ab. Stelle dir eine Handlung, ungewöhnliche Größe, Geräusche oder Bewegung vor – nicht nur ein Wort über einem Etikett. Nimm dir die nötige Zeit."],
    "loci.lesson.recallTitle": ["Walk it mentally.", "Gehe sie gedanklich ab."],
    "loci.lesson.recall": ["Once the items are hidden, revisit your places in order and reconstruct what happened there. Keep a blank position when you cannot remember, rather than shifting the rest of the sequence.", "Besuche nach dem Verbergen der Elemente deine Orte der Reihe nach und erinnere dich, was dort passiert ist. Lasse bei fehlender Erinnerung eine Position frei, statt den Rest der Folge zu verschieben."],
    "loci.lesson.example": ["Example: a giant apple blocks {place}. Imagine pushing it away, hearing it crunch and smelling it. This is a suggested mental scene, not a required correct image.", "Beispiel: Ein riesiger Apfel versperrt {place}. Stelle dir vor, wie du ihn wegdrückst, ihn knacken hörst und riechst. Dies ist eine mögliche Vorstellung, kein vorgeschriebenes richtiges Bild."],
    "loci.lesson.addRoute": ["Add your familiar landmarks in settings before practising.", "Trage vor dem Üben deine vertrauten Orte in den Einstellungen ein."],
    "loci.lesson.objects": ["Start with everyday objects. They already have familiar shapes, uses and actions you can imagine at your places.", "Beginne mit Alltagsgegenständen. Ihre vertrauten Formen, Verwendungen und Handlungen lassen sich gut an deinen Orten vorstellen."],
    "loci.lesson.people": ["Use people you already recognize. Imagine them doing something distinctive at each place. Edit the names in settings; this is not a face/name-learning test and no photographs are downloaded.", "Nutze Personen, die du bereits kennst. Stelle dir eine besondere Handlung an jedem Ort vor. Bearbeite die Namen in den Einstellungen; dies ist kein Gesicht-Namen-Lerntest und es werden keine Fotos heruntergeladen."],
    "loci.lesson.cards": ["Cards are an advanced set. Give each card a consistent personal image before trying longer sequences—for example, the ace of spades could be a giant shovel at your front door. There is no universal required mapping. All 52 standard cards are in the recall catalogue; practice sequences contain up to 16 cards, not a full-deck competition test.", "Karten sind fortgeschrittenes Material. Ordne jeder Karte ein festes persönliches Bild zu, bevor du längere Folgen übst – etwa dem Pik-Ass eine riesige Schaufel an deiner Haustür. Es gibt keine vorgeschriebene Zuordnung. Der Abrufkatalog enthält alle 52 Standardkarten; Übungsfolgen umfassen bis zu 16 Karten, keinen vollständigen Wettkampf-Kartensatz."],
    "loci.lesson.yourRoute": ["Review your route", "Deine Route ansehen"],
    "loci.lesson.customRoute": ["Use this same order each time; mentally clear old images before a new sequence.", "Nutze immer diese Reihenfolge; entferne alte Bilder gedanklich vor einer neuen Folge."],
    "loci.lesson.exampleRoute": ["This is only an example. Set your own familiar landmarks in exercise settings.", "Dies ist nur ein Beispiel. Trage deine eigenen vertrauten Orte in den Übungseinstellungen ein."],
    "loci.lesson.limits": ["You can use another memory strategy if you prefer. The app cannot verify which strategy you used; it reports ordered recall and memorization time, not general cognitive benefit.", "Du kannst auch eine andere Gedächtnisstrategie verwenden. Die App kann deine Strategie nicht prüfen; sie berichtet geordneten Abruf und Lernzeit, keinen allgemeinen kognitiven Nutzen."],
    "stim.loci.objects": ["apple|banana|orange|bread|milk|egg|cup|spoon|fork|plate|key|book|pencil|phone|wallet|clock|lamp|chair|shoe|hat|coat|umbrella|bag|bottle|toothbrush|comb|soap|paper roll|scissors|camera|ball|candle", "Apfel|Banane|Orange|Brot|Milch|Ei|Tasse|Löffel|Gabel|Teller|Schlüssel|Buch|Stift|Telefon|Geldbörse|Uhr|Lampe|Stuhl|Schuh|Hut|Mantel|Regenschirm|Tasche|Flasche|Zahnbürste|Kamm|Seife|Papierrolle|Schere|Kamera|Ball|Kerze"],
    "loci.studyPosition": ["Memorize {count} / {total}", "Merke dir {count} / {total}"],
    "loci.landmark": ["Optional place: {place}", "Optionaler Ort: {place}"],
    "loci.previous": ["Previous", "Zurück"],
    "loci.next": ["Next", "Weiter"],
    "loci.ready": ["Ready to recall", "Bereit zum Abruf"],
    "loci.routeHelp": ["Show/hide place", "Ort zeigen/verbergen"],
    "loci.selfPaced": ["Memorize at your own pace · No time limit", "Lerne in deinem Tempo · Ohne Zeitlimit"],
    "loci.fixedStudy": ["Fixed assessment · {seconds} seconds per item", "Feste Messung · {seconds} Sekunden je Element"],
    "loci.studyHelp": ["Build a vivid image at the next place on your route.", "Stelle dir ein lebhaftes Bild am nächsten Ort deiner Route vor."],
    "loci.reviewAll": ["Review every item before starting recall.", "Sieh vor dem Abruf jedes Element an."],
    "loci.newRound": ["New sequence · Clear your previous images", "Neue Folge · Entferne deine vorherigen Bilder"],
    "loci.recallTitle": ["Walk your route mentally", "Gehe deine Route gedanklich ab"],
    "loci.recallProgress": ["Recall: {count} / {total} · Catalogue {page} / {pages}", "Abruf: {count} / {total} · Katalog {page} / {pages}"],
    "loci.recallHelp": ["Choose items in order, then submit. Route and study items are hidden.", "Wähle Elemente in Reihenfolge und gib dann ab. Route und Lernfolge sind verborgen."],
    "loci.recallFull": ["All positions entered. Undo or submit your recall.", "Alle Positionen eingegeben. Korrigiere oder gib deinen Abruf ab."],
    "loci.undo": ["Undo", "Rückgängig"],
    "loci.skip": ["Skip position", "Position frei lassen"],
    "loci.blank": ["blank", "frei"],
    "loci.submit": ["Submit recall", "Abruf abgeben"],
    "loci.cardName": ["{rank} of {suit}", "{suit} {rank}"],
    "loci.rank.A": ["Ace", "Ass"],
    "loci.rank.J": ["Jack", "Bube"],
    "loci.rank.Q": ["Queen", "Dame"],
    "loci.rank.K": ["King", "König"],
    "loci.suit.spades": ["spades", "Pik"],
    "loci.suit.hearts": ["hearts", "Herz"],
    "loci.suit.diamonds": ["diamonds", "Karo"],
    "loci.suit.clubs": ["clubs", "Kreuz"],
    "score.meanStudySeconds": ["Mean memorization time (s)", "Mittlere Lernzeit (s)"],
    "score.studySecondsPerItem": ["Memorization time per item (s)", "Lernzeit je Element (s)"],
    "stimulus.loci-objects": ["Memory-palace everyday objects", "Gedächtnispalast-Alltagsgegenstände"],
    "stimulus.loci-people": ["Memory-palace familiar people", "Gedächtnispalast-bekannte Personen"],
    "stimulus.loci-cards": ["Memory-palace playing cards", "Gedächtnispalast-Spielkarten"],
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
    "param.loci": ["Initial memory items", "Anfängliche Merkelemente"],
    "param.maxLoci": ["Maximum memory items", "Maximale Merkelemente"],
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
      "Compare each active stream with exactly n items earlier. Respond only to a match; use both response areas if both streams match. The first n items are for remembering only. You can respond after the square disappears, until the time bar runs out. Each accepted response stays highlighted with a check and “Recorded” until the item ends; this confirms your input, not correctness. Pressing again does not undo or duplicate it. Training shows correctness only after the response window closes; assessment never does. Do not respond to nonmatches, including repeats n−1 or n+1 steps back. Arithmetic: a match means the current number equals the number n steps back plus the configured operand.",
      "Vergleiche jeden aktiven Reizstrom mit genau n Reizen zuvor. Antworte nur bei Übereinstimmung; nutze beide Antwortflächen, wenn beide Ströme passen. Die ersten n Reize dienen nur dem Merken. Du kannst auch nach dem Verschwinden des Quadrats antworten, bis der Zeitbalken abgelaufen ist. Jede angenommene Antwort bleibt bis zum Reizende mit Häkchen und „Erfasst“ hervorgehoben; das bestätigt die Eingabe, nicht die Richtigkeit. Erneutes Drücken macht sie weder rückgängig noch zählt es doppelt. Im Training erscheint die Richtig-falsch-Rückmeldung erst nach Ende der Antwortzeit, in Messungen nie. Antworte nicht bei Nichtübereinstimmung, auch nicht bei Wiederholungen n−1 oder n+1 Schritte zurück. Rechenvariante: Die aktuelle Zahl muss der Zahl n Schritte zuvor plus dem eingestellten Wert entsprechen."
    ],
    "task.dual-nback.keys": ["A = position match; L = audio match; press both if both match (together or separately). Release keys between items. Arithmetic: A = arithmetic match. No match: press nothing. Look for “✓ Recorded” on each accepted response.", "A = Positionsübereinstimmung; L = Audioübereinstimmung; bei beiden Treffern beide drücken (gleichzeitig oder nacheinander). Lasse die Tasten zwischen Reizen los. Rechenvariante: A = Rechenübereinstimmung. Kein Treffer: nichts drücken. Jede angenommene Antwort zeigt „✓ Erfasst“."],

    "task.ufov.name": ["Useful field of view", "Nutzbares Gesichtsfeld"],
    "task.ufov.desc": ["Identify a central vehicle and locate a peripheral target, with and without distractors.", "Erkenne ein Fahrzeug im Zentrum und die Position eines Randreizes, mit und ohne Ablenkreize."],
    "task.ufov.instructions": [
      "Look at the centre during each brief display. Central: identify car or truck after the mask. Divided: identify the vehicle, then select the direction of the peripheral square. Selective: do the same while ignoring triangles. Both answers must be correct on divided and selective trials.",
      "Blicke während jeder kurzen Darbietung ins Zentrum. Zentral: Erkenne nach der Maske Auto oder Lkw. Geteilt: Nenne das Fahrzeug und wähle danach die Richtung des Quadrats am Rand. Selektiv: Tue dasselbe und ignoriere Dreiecke. In geteilten und selektiven Durchgängen müssen beide Antworten stimmen."
    ],
    "task.ufov.keys": ["First A = car, L = truck. Then 1–8 = target direction, clockwise from top: 1 top, 2 top-right, 3 right, 4 bottom-right, 5 bottom, 6 bottom-left, 7 left, 8 top-left.", "Zuerst A = Auto, L = Lkw. Danach 1–8 = Zielrichtung, im Uhrzeigersinn ab oben: 1 oben, 2 rechts oben, 3 rechts, 4 rechts unten, 5 unten, 6 links unten, 7 links, 8 links oben."],

    "task.stroop-squared.name": ["Stroop²", "Stroop²"],
    "task.stroop-squared.desc": ["Choose the word meaning or ink colour while ignoring the conflicting information.", "Wähle Wortbedeutung oder Schriftfarbe und ignoriere die widersprüchliche Information."],
    "task.stroop-squared.instructions": [
      "Read the rule before each 90-second block. WORD: choose the colour named by the word, ignoring its ink. INK: choose its displayed ink colour, ignoring the word. Choose the matching response label quickly and accurately; the left/right answer positions can change. The eight warm-up presentations cover both rules when both are enabled. Training adapts the response deadline; assessment keeps it fixed.",
      "Lies vor jedem 90-Sekunden-Block die Regel. WORT: Wähle die vom Wort benannte Farbe, unabhängig von der Schriftfarbe. FARBE: Wähle die sichtbare Schriftfarbe, unabhängig vom Wort. Wähle zügig und genau die passende Antwortbeschriftung; ihre linke oder rechte Position kann wechseln. Die acht Übungsdurchgänge zeigen beide Regeln, wenn beide aktiviert sind. Training passt die Antwortfrist an; Messungen halten sie fest."
    ],
    "task.stroop-squared.keys": ["A = left response option; L = right response option. Follow the WORD or INK rule and read the current labels; keys are not fixed to colours.", "A = linke Antwortoption; L = rechte Antwortoption. Beachte die Regel WORT oder FARBE und die aktuellen Beschriftungen; die Tasten sind nicht fest an Farben gebunden."],

    "task.flanker-squared.name": ["Flanker²", "Flanker²"],
    "task.flanker-squared.desc": ["Report the middle arrow's direction while ignoring the surrounding arrows.", "Gib die Richtung des mittleren Pfeils an und ignoriere die umgebenden Pfeile."],
    "task.flanker-squared.instructions": [
      "In each 90-second block, look only at the middle arrow in the five-arrow row. Select the response arrow pointing the same way as that middle arrow, even when its neighbours point the other way. Read the current response options: their left/right positions can change.",
      "Achte in jedem 90-Sekunden-Block nur auf den mittleren Pfeil der Fünferreihe. Wähle den Antwortpfeil, der in dieselbe Richtung zeigt, auch wenn die Nachbarn entgegengesetzt zeigen. Lies die aktuellen Antwortoptionen: Ihre linke oder rechte Position kann wechseln."
    ],
    "task.flanker-squared.keys": ["A = left response option; L = right response option. Choose the option matching the middle arrow, not the flankers.", "A = linke Antwortoption; L = rechte Antwortoption. Wähle die Option passend zum mittleren Pfeil, nicht zu den Nachbarn."],

    "task.simon-squared.name": ["Simon²", "Simon²"],
    "task.simon-squared.desc": ["Respond to a circle's colour, not its screen position, using a fixed colour mapping.", "Antworte mit fester Farbzuordnung auf die Kreisfarbe, nicht auf die Bildschirmposition."],
    "task.simon-squared.instructions": [
      "During each 90-second block, choose red for every red circle and green for every green circle. Ignore whether the circle appears on the left or right. The mapping stays fixed: red is always the left response and green the right response.",
      "Wähle während jedes 90-Sekunden-Blocks für jeden roten Kreis Rot und für jeden grünen Kreis Grün. Ignoriere, ob der Kreis links oder rechts erscheint. Die Zuordnung bleibt fest: Rot ist immer die linke, Grün die rechte Antwort."
    ],
    "task.simon-squared.keys": ["A = red; L = green. This mapping never changes, regardless of the circle's position.", "A = Rot; L = Grün. Diese Zuordnung bleibt unverändert, unabhängig von der Kreisposition."],

    "task.antisaccade.name": ["Antisaccade", "Antisakkade"],
    "task.antisaccade.desc": ["Look away from a sudden cue to identify a brief letter on the opposite side.", "Blicke von einem plötzlichen Hinweisreiz weg und erkenne einen kurzen Buchstaben auf der Gegenseite."],
    "task.antisaccade.instructions": [
      "Fixate the central cross. When a square flashes on one side, move your eyes immediately to the opposite side, not toward the flash. Identify the brief B, P or R there and respond after the mask. Keep your head still. Without eye tracking, the app cannot verify your eye movement.",
      "Fixiere das Kreuz im Zentrum. Wenn auf einer Seite ein Quadrat aufblitzt, bewege die Augen sofort zur Gegenseite, nicht zum Blitz. Erkenne dort das kurz gezeigte B, P oder R und antworte nach der Maske. Halte den Kopf still. Ohne Blickmessung kann die App deine Augenbewegung nicht prüfen."
    ],
    "task.antisaccade.keys": ["B, P or R = the letter seen opposite the cue. Touch or mouse: choose the matching letter button.", "B, P oder R = der gegenüber dem Hinweisreiz gesehene Buchstabe. Touch oder Maus: Wähle die entsprechende Buchstabentaste."],

    "task.visual-arrays.name": ["Visual arrays", "Visuelle Farbfelder"],
    "task.visual-arrays.desc": ["Remember coloured squares and judge whether a single probe kept its original colour.", "Merke dir farbige Quadrate und beurteile, ob ein einzelnes Testquadrat seine Farbe behielt."],
    "task.visual-arrays.instructions": [
      "Remember the colours and positions of the 4, 6 or 8 coloured squares; ignore all gray squares. After the blank delay, one square reappears. Choose SAME if its colour matches the original colour at that position, otherwise DIFFERENT. Judge that one location, not whether the colour appeared anywhere in the array.",
      "Merke dir Farben und Positionen der 4, 6 oder 8 farbigen Quadrate; ignoriere alle grauen Quadrate. Nach der leeren Pause erscheint ein Quadrat erneut. Wähle GLEICH, wenn seine Farbe der ursprünglichen Farbe an dieser Position entspricht, sonst ANDERS. Beurteile nur diese Position, nicht ob die Farbe irgendwo im Feld vorkam."
    ],
    "task.visual-arrays.keys": ["A = same colour at that location; L = different colour. Ignore gray distractors.", "A = gleiche Farbe an dieser Position; L = andere Farbe. Ignoriere graue Ablenkreize."],

    "task.symmetry-span.name": ["Symmetry span", "Symmetriespanne"],
    "task.symmetry-span.desc": ["Alternate symmetry judgments with remembering locations, then recall the locations in order.", "Wechsle zwischen Symmetrieurteilen und dem Merken von Positionen; rufe die Positionen danach in Reihenfolge ab."],
    "task.symmetry-span.instructions": [
      "Assessment uses the fixed processing deadline from settings. For each pattern, decide whether its left and right halves mirror each other. Then remember the highlighted cell in the 4×4 grid. After the sequence, recall all highlighted cells in their original order. Both parts matter: symmetry accuracy below 85% invalidates the main session.",
      "Messungen nutzen die feste Bearbeitungsfrist aus den Einstellungen. Entscheide bei jedem Muster, ob linke und rechte Hälfte spiegelbildlich sind. Merke dir dann die markierte Zelle im 4×4-Gitter. Rufe nach der Folge alle markierten Zellen in ursprünglicher Reihenfolge ab. Beide Teile zählen: Symmetriegenauigkeit unter 85 % macht die Hauptsitzung ungültig."
    ],
    "task.symmetry-span.keys": ["Judgment: A = symmetric, L = asymmetric. Recall: 4×4 grid keys, row by row from top-left: 1 2 3 4 / 5 6 7 8 / 9 Q W E / R T Y U. Enter the cells in order; the sequence submits when full.", "Urteil: A = symmetrisch, L = asymmetrisch. Abruf: Tasten des 4×4-Gitters, zeilenweise ab links oben: 1 2 3 4 / 5 6 7 8 / 9 Q W E / R T Y U. Gib die Zellen in Reihenfolge ein; die vollständige Folge wird automatisch abgegeben."],

    "task.corsi.name": ["Corsi block span", "Corsi-Blockspanne"],
    "task.corsi.desc": ["Remember a sequence of spatial blocks and reproduce it forward or backward.", "Merke dir eine Folge räumlicher Blöcke und wiederhole sie vorwärts oder rückwärts."],
    "task.corsi.instructions": [
      "Watch the blocks flash without responding. Once recall begins, select the same blocks in the shown order for FORWARD, or reverse order for BACKWARD. Reproduce every position exactly. The response submits after the required number of blocks; two failed sequences at one length end the main block.",
      "Beobachte die aufleuchtenden Blöcke, ohne zu antworten. Wähle beim Abruf dieselben Blöcke bei VORWÄRTS in gezeigter, bei RÜCKWÄRTS in umgekehrter Reihenfolge. Wiederhole jede Position genau. Nach der erforderlichen Blockzahl wird automatisch abgegeben; zwei misslungene Folgen einer Länge beenden den Hauptblock."
    ],
    "task.corsi.keys": ["1–9 = the correspondingly labelled spatial blocks, in the requested order. Or tap/click the blocks themselves. These are spatial block labels, not a numeric sequence.", "1–9 = die entsprechend beschrifteten räumlichen Blöcke in der geforderten Reihenfolge. Oder tippe/klicke direkt auf die Blöcke. Die Zahlen bezeichnen räumliche Blöcke, keine Zahlenfolge."],

    "task.digit-span.name": ["Digit span", "Ziffernspanne"],
    "task.digit-span.desc": ["Recall a sequence of digits in its original or reversed order.", "Rufe eine Ziffernfolge in ursprünglicher oder umgekehrter Reihenfolge ab."],
    "task.digit-span.instructions": [
      "Watch each digit without typing. When recall starts, enter all digits in the shown order for FORWARD or reverse order for BACKWARD, including repeats and leading zeros. Check your entry and submit. Two failed sequences at the same length end the main block.",
      "Beobachte jede Ziffer, ohne zu tippen. Gib beim Abruf alle Ziffern bei VORWÄRTS in gezeigter, bei RÜCKWÄRTS in umgekehrter Reihenfolge ein, einschließlich Wiederholungen und führender Nullen. Prüfe die Eingabe und gib sie ab. Zwei misslungene Folgen derselben Länge beenden den Hauptblock."
    ],
    "task.digit-span.keys": ["0–9 = digits; Backspace = remove the last digit; Enter = submit the complete sequence.", "0–9 = Ziffern; Rücktaste (Backspace) = letzte Ziffer löschen; Eingabetaste (Enter) = vollständige Folge abgeben."],

    "task.matrix-reasoning.name": ["Matrix reasoning", "Matrizenlogik"],
    "task.matrix-reasoning.desc": ["Infer visual transformation or logic rules and choose the missing matrix cell.", "Erkenne visuelle Transformations- oder Logikregeln und wähle die fehlende Matrixzelle."],
    "task.matrix-reasoning.instructions": [
      "Study changes across the matrix rows and columns, such as shape, number, position, rotation or combined features. Choose the one of eight options that completes all relevant rules in the missing cell before time expires. Assessment balances fixed difficulty levels across your selected minimum–maximum range; training adapts within it. Generated items are not an IQ test.",
      "Untersuche Veränderungen über Zeilen und Spalten, etwa Form, Anzahl, Position, Drehung oder kombinierte Merkmale. Wähle vor Ablauf der Zeit die eine von acht Optionen, die alle relevanten Regeln in der fehlenden Zelle erfüllt. Messungen verteilen feste Schwierigkeitsstufen ausgewogen zwischen gewähltem Minimum und Maximum; Training passt sich innerhalb dieser Spanne an. Generierte Aufgaben sind kein IQ-Test."
    ],
    "task.matrix-reasoning.keys": ["1–8 = the correspondingly numbered answer option. Or tap/click an option. One selection submits your answer.", "1–8 = die entsprechend nummerierte Antwortoption. Oder tippe/klicke auf eine Option. Eine Auswahl gibt die Antwort ab."],

    "task.number-series.name": ["Number & letter series", "Zahlen- & Buchstabenfolgen"],
    "task.number-series.desc": ["Find the rule in a number or letter sequence and select the next item.", "Finde die Regel einer Zahlen- oder Buchstabenfolge und wähle das nächste Element."],
    "task.number-series.instructions": [
      "Inspect the sequence and find its rule: differences, ratios, alternating subsequences, repeated operation cycles or alphabet steps. Choose the one of six options that best continues the full pattern before time expires. Assessment balances fixed difficulty levels across your selected minimum–maximum range; training adapts within it. These generated items are not normed intelligence scores.",
      "Untersuche die Folge und finde ihre Regel: Differenzen, Verhältnisse, abwechselnde Teilfolgen, wiederholte Rechenschritte oder Alphabetschritte. Wähle vor Ablauf der Zeit die eine von sechs Optionen, die das gesamte Muster am besten fortsetzt. Messungen verteilen feste Schwierigkeitsstufen ausgewogen zwischen gewähltem Minimum und Maximum; Training passt sich innerhalb dieser Spanne an. Diese generierten Aufgaben liefern keine normierten Intelligenzwerte."
    ],
    "task.number-series.keys": ["1–6 = the correspondingly numbered answer option, not the answer's numeric value. Or tap/click an option.", "1–6 = die entsprechend nummerierte Antwortoption, nicht der Zahlenwert der Antwort. Oder tippe/klicke auf eine Option."],

    "task.mental-arithmetic.name": ["Mental arithmetic", "Kopfrechnen"],
    "task.mental-arithmetic.desc": ["Solve arithmetic, chained calculations and optional percentages against the clock.", "Löse Rechenaufgaben, verkettete Rechnungen und optionale Prozentaufgaben gegen die Zeit."],
    "task.mental-arithmetic.instructions": [
      "Calculate the displayed expression mentally; follow parentheses and standard operation order. Enter the full numeric answer, including a minus sign or decimal when needed, then submit before the deadline. For percentages, calculate the stated percent of the value. Training adapts operand magnitude up to the separate training ceiling and adjusts the response deadline; assessment uses the starting maximum and fixed deadline. Every calculation operand, including the dividend, stays between the configured minimum and current maximum. Percentage rates and results may be outside those bounds. Division has exact integer results and never uses a zero divisor. Work accurately and quickly without a calculator.",
      "Berechne den gezeigten Ausdruck im Kopf; beachte Klammern und Punkt vor Strich. Gib das vollständige Zahlenergebnis gegebenenfalls mit Minuszeichen oder Dezimalstellen ein und bestätige vor Fristende. Berechne bei Prozentaufgaben den genannten Prozentsatz des Wertes. Training passt die Zahlengröße bis zur gesonderten Trainingsobergrenze und die Antwortfrist an; Messungen nutzen das anfängliche Maximum und die feste Frist. Jede Rechenzahl einschließlich Dividend liegt zwischen eingestelltem Minimum und aktuellem Maximum. Prozentsätze und Ergebnisse dürfen außerhalb dieser Grenzen liegen. Divisionen ergeben ganze Zahlen und haben nie null als Divisor. Arbeite genau und zügig ohne Taschenrechner."
    ],
    "task.mental-arithmetic.keys": ["0–9 = digits; comma or period = decimal separator; minus (−) = negative sign; Backspace = delete last character; Enter = submit.", "0–9 = Ziffern; Komma oder Punkt = Dezimaltrennzeichen; Minus (−) = negatives Vorzeichen; Rücktaste (Backspace) = letztes Zeichen löschen; Eingabetaste (Enter) = abgeben."],

    "task.pvt-b.name": ["Brief vigilance test · PVT-B", "Kurzer Vigilanztest · PVT-B"],
    "task.pvt-b.desc": ["A three-minute reaction-time task with unpredictable waits and a visible counter.", "Eine dreiminütige Reaktionszeitaufgabe mit unvorhersehbaren Wartezeiten und sichtbarem Zähler."],
    "task.pvt-b.instructions": [
      "Watch the blank task area and wait. As soon as the counter appears, respond once as quickly as possible, then release and wait for the next appearance. Do not respond while blank or anticipate the counter: these are false starts. The stopped counter shows your reaction time; there is no correctness feedback. A response slower than 355 ms, or no response after at least 355 ms, is a lapse. Slow lapses remain in the lapse count and reaction-time metrics rather than being removed as outliers.",
      "Beobachte den leeren Aufgabenbereich und warte. Sobald der Zähler erscheint, antworte einmal so schnell wie möglich, lasse los und warte auf das nächste Erscheinen. Antworte nicht bei leerem Bildschirm und nimm den Zähler nicht vorweg: Das sind Fehlstarts. Der angehaltene Zähler zeigt die Reaktionszeit; es gibt keine Richtig-falsch-Rückmeldung. Eine Antwort nach mehr als 355 ms oder keine Antwort nach mindestens 355 ms zählt als Aussetzer. Langsame Aussetzer bleiben in ihrer Anzahl und den Reaktionszeitwerten enthalten, statt als Ausreißer entfernt zu werden."
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
    "param.processingMs": ["Fixed / warm-up processing deadline (ms)", "Feste Bearbeitungsfrist / Übungsfrist (ms)"],
    "param.memoryMs": ["Memory item display (ms)", "Anzeige des Merkreizes (ms)"],
    "param.recallMs": ["Recall time limit (ms)", "Abruffrist (ms)"],
    "param.direction": ["Recall direction", "Abrufrichtung"],
    "param.startLength": ["Starting sequence length", "Anfängliche Folgenlänge"],
    "param.maxLength": ["Maximum sequence length", "Maximale Folgenlänge"],
    "param.flashMs": ["Item display duration (ms)", "Anzeigedauer je Element (ms)"],
    "param.intervalMs": ["Item onset interval (ms)", "Intervall zwischen Reizanfängen (ms)"],
    "param.minOperand": ["Minimum operand", "Kleinste Rechenzahl"],
    "param.maxOperand": ["Starting / fixed maximum operand", "Anfänglich / fest größte Rechenzahl"],
    "param.operandCeiling": ["Maximum training operand", "Größte Rechenzahl im Training"],
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
    "Respond left or right to every arrow unless the red stop cue appears after the arrow starts. Respond promptly: do not wait for a possible stop signal. On stop trials, withhold the response completely even if the cue comes late. Training adapts the stop-signal delay only on valid stop trials; assessment keeps a fixed delay. SSRT remains unavailable when the sample or race-model checks are inadequate; unavailable is not zero.",
    "Antworte bei jedem Pfeil links oder rechts, außer nach Beginn erscheint das rote Stoppsignal. Antworte zügig: Warte nicht auf ein mögliches Stoppsignal. Bei Stoppsignalen unterdrücke die Antwort vollständig, auch wenn der Hinweis spät kommt. Im Training passt sich nur die Stoppsignalverzögerung auf gültigen Stoppsignalen an; in Messungen bleibt sie fest. Die SSRT bleibt bei unzureichender Stichprobe oder nicht erfüllten Race-Modell-Prüfungen unverfügbar; fehlend ist nicht null."
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
    "Remember the cue letter through the blank delay, then classify the probe: AX is the only target. AY, BX and BY are all non-targets. Omitted responses are errors; on non-target trials, an omission is not a correct rejection. Training adapts the response deadline in 10-trial chunks; assessment keeps the configured timing fixed.",
    "Merke dir den Hinweisbuchstaben über die leere Pause und klassifiziere dann den Testreiz: Nur AX ist ein Zielreiz. AY, BX und BY sind immer Nicht-Zielreize. Ausgelassene Antworten sind Fehler; bei Nicht-Zielreizen ist eine Auslassung keine korrekte Zurückweisung. Im Training passt sich die Antwortfrist in 10er-Blöcken an; Messungen behalten die eingestellten Zeiten fest bei."
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
    "A cue appears before each digit and tells you whether to judge PARITY or MAGNITUDE. For PARITY, answer odd versus even; for MAGNITUDE, answer low (<5) versus high (>5). Digits 1-9 appear except 5. Training adapts the response deadline during mixed blocks; assessment keeps it fixed. The score is deadline-limited accuracy, not a switch-cost RT difference.",
    "Vor jeder Ziffer erscheint ein Hinweisreiz, der PARITÄT oder GRÖSSE vorgibt. Bei PARITÄT antworte ungerade oder gerade; bei GRÖSSE antworte klein (<5) oder groß (>5). Es erscheinen die Ziffern 1-9 außer 5. Im Training passt sich die Antwortfrist in Mischblöcken an; in Messungen bleibt sie fest. Der Wert ist Genauigkeit unter Zeitlimit, keine Reaktionszeitdifferenz von Wechselkosten."
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
    "The code key stays visible above every target symbol; respond with the digit paired with that symbol. There is no visible block timer. Training adapts the response deadline; assessment keeps the configured deadline fixed. Practice and main blocks may use a new symbol mapping, and the score is correct answers per minute plus accuracy, not an IQ score.",
    "Der Schlüssel bleibt über jedem Zielsymbol sichtbar; antworte mit der zugehörigen Ziffer. Es gibt keinen sichtbaren Blocktimer. Im Training passt sich die Antwortfrist an; in Messungen bleibt die eingestellte Frist fest. Übungs- und Hauptblock können eine neue Symbolzuordnung verwenden, und der Wert ist richtige Antworten pro Minute plus Genauigkeit, kein IQ-Wert."
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
    "Each trial shows two block figures. Choose SAME only when one figure can be obtained by rotating the other in 3D. Choose DIFFERENT when it is a mirrored foil, even if it looks similar. Figures are stacked on small portrait screens and side by side on wider screens. Training adapts the rotation angle within the selected range; assessment balances fixed angles without correctness feedback. Generated figures avoid mirror-symmetric solutions and are not an IQ test.",
    "Jeder Durchgang zeigt zwei Blockfiguren. Wähle GLEICH nur dann, wenn eine Figur durch eine 3D-Drehung aus der anderen entsteht. Wähle ANDERS, wenn sie eine gespiegelte Täuschungsfigur ist, auch wenn sie ähnlich aussieht. Auf kleinen Hochformat-Bildschirmen stehen die Figuren untereinander, auf breiteren nebeneinander. Im Training passt sich der Rotationswinkel innerhalb des gewählten Bereichs an. Die Messung balanciert feste Winkel ohne Richtig-falsch-Rückmeldung. Die generierten Figuren vermeiden spiegelsymmetrische Lösungen und sind kein IQ-Test."
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
    "Recreate a goal arrangement with visible moves or plan the whole sequence mentally.",
    "Stelle eine Zielanordnung mit sichtbaren Zügen nach oder plane die gesamte Zugfolge im Kopf."
  ],
  "task.tower-london.instructions": [
    "The boards are labelled GOAL and CURRENT. On small portrait screens, the goal is above your current arrangement; on wider screens it is on the left. Select peg 1, 2 or 3 as the source, then peg 1, 2 or 3 as the destination. Only the top ball moves, peg capacities are 3, 2 and 1, and choosing the same source peg again cancels the selection. Each problem ends when solved, at the displayed move limit, or at the configured response deadline. Symbols help: ∅ means the peg was empty, × marks an illegal destination, and n→? shows the selected source peg. Training adapts optimal-move difficulty in small blocks; assessment uses fixed balanced distances and no correctness feedback.",
    "Die Bretter sind als ZIEL und AKTUELL beschriftet. Auf kleinen Hochformat-Bildschirmen steht das Ziel über deiner aktuellen Anordnung, auf breiteren links davon. Wähle Stab 1, 2 oder 3 als Start und danach Stab 1, 2 oder 3 als Ziel. Es darf nur die oberste Kugel bewegt werden. Die Stabkapazitäten sind 3, 2 und 1. Die erneute Wahl desselben Startstabs hebt die Auswahl auf. Jedes Problem endet bei Lösung, am angezeigten Zuglimit oder an der eingestellten Antwortfrist. Symbole helfen: ∅ bedeutet, dass der Stab leer war, × markiert ein unzulässiges Ziel, und n→? zeigt den gewählten Startstab. Im Training passt sich die Schwierigkeit nach optimalen Zügen in kleinen Blöcken an; die Messung nutzt fest balancierte Distanzen und keine Richtig-falsch-Rückmeldung."
  ],
  "task.tower-london.keys": [
    "Use keys 1, 2 and 3 for peg choices, or tap/click the peg-number panel. Every legal move is recorded automatically after the destination choice.",
    "Nutze die Tasten 1, 2 und 3 für die Stabwahl oder tippe/klicke auf das Zahlenfeld. Jeder zulässige Zug wird nach der Zielwahl automatisch gespeichert."
  ],
  "param.planningMode": ["Planning mode", "Planungsmodus"],
  "choice.visible": ["Visible moves", "Sichtbare Züge"],
  "choice.mental": ["Mental planning", "Planen im Kopf"],
  "tower.mental.name": ["Tower of London · Mental planning", "Turm von London · Planen im Kopf"],
  "tower.mental.guide": [
    "Keep the starting board in mind and plan all moves to the goal. The board stays frozen. Enter each source and destination, edit with Undo, then Submit plan to check the whole sequence.",
    "Merke dir das Startbrett und plane alle Züge zum Ziel. Das Brett bleibt unverändert. Gib jeweils Start- und Zielstab ein, bearbeite die Folge mit Rückgängig und prüfe sie mit Plan prüfen."
  ],
  "tower.mental.instructions": [
    "The GOAL and START boards remain visible, but the start never updates while you plan. Move only the top ball; peg capacities are 3, 2 and 1. Choose a source peg, then a destination with 1, 2 or 3. Choosing the source again cancels the selection. Every completed pair is added without revealing whether it is legal. Undo cancels a pending source or removes the last complete move. Submit the whole plan explicitly within the displayed move limit and response deadline; finish or cancel a pending source first. Any legal sequence ending at the goal within the limit is accepted. In warm-ups and training, a successful plan animates your actual moves; failures show the first illegal move and last legal arrangement, or the final arrangement if the target was missed. Reduced motion uses stepped states. Main assessments show no correctness feedback or replay. Training adapts difficulty separately from visible-move practice.",
    "Die Bretter ZIEL und START bleiben sichtbar, aber das Startbrett ändert sich beim Planen nicht. Bewege nur die oberste Kugel; die Stabkapazitäten sind 3, 2 und 1. Wähle mit 1, 2 oder 3 zuerst den Startstab und dann den Zielstab. Die erneute Wahl des Startstabs hebt die Auswahl auf. Jedes vollständige Paar wird ohne Hinweis auf seine Zulässigkeit hinzugefügt. Rückgängig hebt eine offene Startwahl auf oder entfernt den letzten vollständigen Zug. Prüfe den gesamten Plan ausdrücklich innerhalb des angezeigten Zuglimits und der Antwortfrist; vervollständige oder lösche zuerst eine offene Startwahl. Jede zulässige Folge, die innerhalb des Limits am Ziel endet, wird akzeptiert. In Aufwärmübungen und Training werden deine tatsächlichen Züge bei Erfolg animiert; bei Fehlern erscheinen der erste unzulässige Zug und die letzte zulässige Anordnung oder die Endanordnung bei verfehltem Ziel. Reduzierte Bewegung zeigt einzelne Zustände. Hauptblöcke der Messung zeigen weder Richtig-falsch-Rückmeldung noch Wiedergabe. Die Trainingsschwierigkeit passt sich getrennt von der Übung mit sichtbaren Zügen an."
  ],
  "tower.mental.keys": [
    "1 / 2 / 3 = source, then destination. Backspace = undo or cancel a pending source. Enter = submit the complete plan. Or use the response buttons.",
    "1 / 2 / 3 = Startstab, dann Zielstab. Rücktaste = letzten Zug oder offene Startwahl löschen. Eingabe = vollständigen Plan prüfen. Oder nutze die Antwortfelder."
  ],
  "tower.start": ["Start (frozen)", "Start (unverändert)"],
  "tower.replay": ["Your plan · Replay", "Dein Plan · Wiedergabe"],
  "tower.undo": ["Undo", "Rückgängig"],
  "tower.submit": ["Submit plan", "Plan prüfen"],
  "tower.plan": ["Plan: {count} / {limit} moves", "Plan: {count} / {limit} Züge"],
  "tower.planEmpty": ["Choose a source, then a destination.", "Wähle zuerst den Startstab, dann den Zielstab."],
  "tower.finishMove": ["Finish or undo the pending move before submitting.", "Vervollständige oder lösche den offenen Zug vor der Prüfung."],
  "tower.enterMoves": ["Enter at least one move before submitting.", "Gib vor der Prüfung mindestens einen Zug ein."],
  "tower.planFull": ["Move limit reached. Undo a move or submit your plan.", "Zuglimit erreicht. Lösche einen Zug oder prüfe deinen Plan."],
  "tower.timeout": ["Time expired · Plan not submitted", "Zeit abgelaufen · Plan nicht geprüft"],
  "tower.notSolved": ["Your plan did not reach the goal.", "Dein Plan hat das Ziel nicht erreicht."],
  "tower.error.empty-source": ["Move {count}: peg {peg} is empty.", "Zug {count}: Stab {peg} ist leer."],
  "tower.error.illegal-destination": ["Move {count}: peg {peg} is full.", "Zug {count}: Stab {peg} ist voll."],
  "tower.error.same-peg": ["Move {count}: source and destination match.", "Zug {count}: Start- und Zielstab sind gleich."],
  "tower.error.invalid-peg": ["Move {count}: unknown peg.", "Zug {count}: unbekannter Stab."],
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

  Object.assign(pairs, {
    "app.tagline": ["Benny's Brain Gym", "Benny's Brain Gym"],
    "app.localOnly": ["Private by default. Training stays in this browser.", "Privat als Standard. Dein Training bleibt in diesem Browser."],
    "nav.home": ["Today", "Heute"],
    "nav.library": ["Exercises", "Übungen"],
    "nav.results": ["Progress", "Fortschritt"],
    "nav.main": ["Main navigation", "Hauptnavigation"],
    "nav.more": ["More about BBG", "Mehr über BBG"],
    "nav.skip": ["Skip to content", "Zum Inhalt springen"],
    "nav.notFound": ["This page isn't here.", "Diese Seite gibt es nicht."],
    "nav.notFoundHelp": ["Use the navigation to return to your practice space.", "Kehre über die Navigation zu deinem Training zurück."],
    "common.noValue": ["—", "—"],
    "home.title": ["Challenge your mind.", "Fordere deinen Kopf."],
    "home.subtitle": ["Challenging brain training, not easy-win games. Adaptive exercises respond to your performance as you train. Serious practice, honest progress.", "Anspruchsvolles Gehirntraining statt einfacher Spielsiege. Adaptive Übungen reagieren beim Training auf deine Leistung. Ernsthaft üben, Fortschritt ehrlich einordnen."],
    "home.finishedTitle": ["Today's training is finished.", "Dein heutiges Training ist beendet."],
    "home.finishedHelp": ["Completed rounds are saved. Review your task-specific progress or take a break. No badges to earn, no streak to protect.", "Abgeschlossene Runden sind gespeichert. Schaue dir deinen aufgabenspezifischen Fortschritt an oder pausiere. Keine Abzeichen, keine Trainingsserie, die du schützen musst."],
    "home.week": ["The last 7 days", "Die letzten 7 Tage"],
    "home.weekLabel": ["Practice activity over the last seven days", "Trainingsaktivität der letzten sieben Tage"],
    "home.practiceDays": ["{count} days of practice", "{count} Tage geübt"],
    "home.practiceDays.one": ["{count} day of practice", "{count} Tag geübt"],
    "home.practiced": ["Practiced", "Geübt"],
    "home.notPracticed": ["No completed round", "Keine abgeschlossene Runde"],
    "home.consistency": ["A record of practice, not a streak to protect. Train consistently; take breaks when you need them.", "Ein Trainingsprotokoll, keine Serie, die du schützen musst. Übe regelmäßig und pausiere, wenn du es brauchst."],
    "home.pickTitle": ["Train skills. Not points.", "Trainiere Fähigkeiten. Nicht Punkte."],
    "home.pickHelp": ["Choose a specific challenge, revisit a demanding exercise, or save your favourites. Practice is the purpose, not easy wins.", "Wähle eine Herausforderung, wiederhole eine anspruchsvolle Übung oder speichere Favoriten. Üben ist das Ziel, nicht einfache Siege."],
    "home.explore": ["Browse exercises", "Übungen entdecken"],
    "home.perspective": ["Progress is specific to the tasks you practice, not a universal brain score.", "Fortschritt bezieht sich auf die geübten Aufgaben, nicht auf einen allgemeinen Gehirnwert."],
    "home.evidenceLink": ["Evidence & limitations", "Evidenz & Grenzen"],
    "about.design": ["Color with a purpose, not a promise", "Farbe mit Funktion, ohne Versprechen"],
    "about.designText": [
      "Color research is context-dependent: a hue that helps one task may not help another. Choose Rose, Graphite or Amber accents in Settings, with a clean light or dark view or your device's preference. Neutral backgrounds, readable contrast, labeled categories and distinct icons support navigation, not proven cognitive enhancement. Graphite keeps the interface monochrome; exercise backgrounds and stimulus colors stay consistent across all appearances. Decoration remains outside timed rounds; motion respects your device's reduced-motion setting.",
      "Farbforschung ist kontextabhängig: Ein Farbton, der bei einer Aufgabe hilft, muss bei einer anderen nicht helfen. Wähle in den Einstellungen Rosé-, Graphit- oder Bernstein-Akzente mit einer klaren hellen oder dunklen Ansicht oder der Geräteeinstellung. Neutrale Hintergründe, lesbare Kontraste, beschriftete Kategorien und unterschiedliche Symbole dienen der Orientierung, nicht einer nachgewiesenen Steigerung der Denkfähigkeit. Graphit hält die Oberfläche monochrom; Hintergründe und Reizfarben der Übungen bleiben in allen Ansichten gleich. Dekoration bleibt außerhalb der zeitgemessenen Runden; Bewegung berücksichtigt die Einstellung für reduzierte Bewegung."
    ],
    "about.designSources": ["Color & accessibility references", "Quellen zu Farbe & Zugänglichkeit"],
    "about.accessibilitySource": ["W3C: Web Content Accessibility Guidelines 2.2", "W3C: Richtlinien für barrierefreie Webinhalte 2.2"],
    "routine.eyebrow": ["Your practice plan", "Dein Trainingsplan"],
    "routine.title": ["Practice routine", "Trainingsroutine"],
    "routine.title.morning": ["Morning practice", "Morgentraining"],
    "routine.title.afternoon": ["Afternoon practice", "Nachmittagstraining"],
    "routine.title.evening": ["Evening practice", "Abendtraining"],
    "routine.title.night": ["Night practice", "Nachttraining"],
    "routine.title.flexible": ["Your practice", "Dein Training"],
    "routine.intro": ["A focused mix of memory, attention and reasoning. Work at your level; adaptive tasks adjust as your performance changes.", "Ein klarer Mix aus Gedächtnis, Aufmerksamkeit und Denken. Übe auf deinem Niveau. Adaptive Aufgaben passen sich an deine Leistung an."],
    "routine.start": ["Begin practice", "Training beginnen"],
    "routine.optionalStart": ["Practice anyway", "Trotzdem trainieren"],
    "routine.adjust": ["Personalize your practice", "Training anpassen"],
    "routine.preferredToday": ["Preferred start: {time} (local time).", "Bevorzugter Start: {time} (Ortszeit)."],
    "routine.preferredDays": ["A selected practice day, without a fixed start time.", "Ein gewählter Trainingstag ohne feste Startzeit."],
    "routine.restDay": ["No practice is planned for today. You can still train if you wish.", "Für heute ist kein Training geplant. Du kannst trotzdem trainieren, wenn du möchtest."],
    "routine.unscheduled": ["No days scheduled. Practice whenever suits you.", "Keine Tage geplant. Trainiere, wann es dir passt."],
    "routine.nextPreferred": ["Next preferred start: {date}.", "Nächster bevorzugter Start: {date}."],
    "routine.resume": ["Continue your practice", "Training fortsetzen"],
    "routine.resumeHelp": ["{done} of {total} rounds completed. Pick up from the next unfinished round.", "{done} von {total} Runden abgeschlossen. Setze bei der nächsten offenen Runde fort."],
    "routine.review": ["Review today's practice", "Heutiges Training ansehen"],
    "routine.finishedCount": ["{done} of {total} rounds completed. Skipped rounds are labelled below.", "{done} von {total} Runden abgeschlossen. Übersprungene Runden sind unten gekennzeichnet."],
    "routine.estimateNote": ["A time budget, not a countdown. New exercises include a warm-up and may take longer. You can leave between rounds and return later today.", "Ein Zeitbudget, kein Countdown. Neue Übungen enthalten eine Einübung und können länger dauern. Zwischen Runden kannst du aufhören und später heute zurückkehren."],
    "routine.profileNote": ["This routine uses a short training profile without changing your exercise settings. Its results are kept separate from other protocols.", "Diese Routine nutzt ein kurzes Trainingsprofil, ohne deine Aufgabeneinstellungen zu ändern. Ihre Ergebnisse bleiben von anderen Abläufen getrennt."],
    "routine.minutes": ["{count} min", "{count} Min."],
    "routine.seconds": ["{count} s", "{count} s"],
    "routine.approxMinutes": ["About {count} min", "Etwa {count} Min."],
    "routine.round": ["Round {current} of {total}", "Runde {current} von {total}"],
    "routine.done": ["Complete", "Abgeschlossen"],
    "routine.skipped": ["Skipped", "Übersprungen"],
    "routine.skip": ["Skip this round", "Diese Runde überspringen"],
    "routine.next": ["Next round", "Nächste Runde"],
    "routine.finish": ["Finish your routine", "Routine abschließen"],
    "routine.saveExit": ["Save & leave for now", "Speichern & vorerst aufhören"],
    "routine.viewProgress": ["View progress", "Fortschritt ansehen"],
    "routine.returnHome": ["Back to today", "Zurück zu Heute"],
    "routine.finishedEyebrow": ["Practice, not perfection", "Üben statt Perfektion"],
    "routine.finishedTitle": ["Your practice is finished.", "Dein Training ist beendet."],
    "routine.finishedHelp": ["Completed rounds and eligible adaptive progress are saved on this device. Review your task results or take a break. No reward loop to keep you here.", "Abgeschlossene Runden und geeignete adaptive Fortschritte sind auf diesem Gerät gespeichert. Prüfe deine Ergebnisse oder pausiere. Keine Belohnungsschleife, die dich hier halten soll."],
    "routine.completedRounds": ["Rounds completed", "Abgeschlossene Runden"],
    "routine.timePracticed": ["Time in completed rounds", "Zeit in abgeschlossenen Runden"],
    "routine.invalid": ["This saved routine cannot be resumed with the current exercises. Your history is safe; export a backup and start a new routine.", "Diese gespeicherte Routine passt nicht zu den verfügbaren Übungen. Dein Verlauf bleibt erhalten. Exportiere eine Sicherung und beginne eine neue Routine."],
    "library.title": ["Find your next exercise.", "Finde deine nächste Übung."],
    "library.subtitle": ["Demanding exercises, clear instructions, no reward loops. Choose your challenge; adaptive tasks respond to your training.", "Anspruchsvolle Übungen, klare Anleitungen, keine Belohnungsschleifen. Wähle deine Herausforderung. Adaptive Aufgaben reagieren auf dein Training."],
    "library.search": ["Find an exercise", "Übung suchen"],
    "library.filter": ["Filter exercises by skill", "Übungen nach Fähigkeit filtern"],
    "library.saved": ["Saved", "Gespeichert"],
    "library.save": ["Save {name}", "{name} speichern"],
    "library.unsave": ["Remove {name} from saved exercises", "{name} aus gespeicherten Übungen entfernen"],
    "library.count": ["{count} exercises", "{count} Übungen"],
    "library.count.one": ["{count} exercise", "{count} Übung"],
    "library.roundCount": ["{count} rounds", "{count} Runden"],
    "library.roundCount.one": ["{count} round", "{count} Runde"],
    "forecast.count.one": ["{count} forecast", "{count} Prognose"],
    "library.untimed": ["Untimed", "Ohne Zeitlimit"],
    "library.timingSensitive": ["Timing-sensitive", "Zeitmessung beachten"],
    "library.emptyTitle": ["No exercises in this view.", "Keine Übungen in dieser Ansicht."],
    "library.emptyHelp": ["Try another search or filter. Save an exercise with the star to find it here later.", "Ändere die Suche oder den Filter. Mit dem Stern speicherst du eine Übung für später."],
    "library.clear": ["Clear filters", "Filter zurücksetzen"],
    "preferences.title": ["Settings", "Einstellungen"],
    "preferences.budget": ["Time budget for a new routine", "Zeitbudget für eine neue Routine"],
    "preferences.practiceTime": ["Preferred start time (optional)", "Bevorzugte Startzeit (optional)"],
    "preferences.practiceDays": ["Preferred practice days", "Bevorzugte Trainingstage"],
    "preferences.scheduleHelp": ["Times use this device's local time. Leave the time blank for flexible timing, or clear all days for no schedule. You can always practice on any day.", "Zeiten beziehen sich auf die Ortszeit dieses Geräts. Lass die Zeit für flexible Starts leer oder wähle für einen freien Plan alle Tage ab. Du kannst jederzeit an jedem Tag trainieren."],
    "preferences.scheduleInvalid": ["Check the practice days, start time and time budget.", "Prüfe die Trainingstage, Startzeit und das Zeitbudget."],
    "preferences.reminderScheduleRequired": ["Choose at least one day and a start time to enable browser reminders or export calendar reminders.", "Wähle mindestens einen Tag und eine Startzeit, um Browser-Erinnerungen zu aktivieren oder Kalender-Erinnerungen zu exportieren."],
    "preferences.calendar": ["Export calendar reminders (.ics)", "Kalender-Erinnerungen exportieren (.ics)"],
    "preferences.reminders": ["Practice reminders", "Trainingserinnerungen"],
    "preferences.calendarFailure": ["The calendar file could not be created. Check your schedule and try again.", "Die Kalenderdatei konnte nicht erstellt werden. Prüfe deinen Plan und versuche es erneut."],
    "preferences.calendarHelp": ["Import this file into a calendar app for reminders even when BBG is closed. Times follow that calendar's local-time rules; alarm delivery depends on the calendar app. Later changes or completed practice in BBG do not update imported events: replace the old event when changing your schedule. Durations are estimates, not cutoffs.", "Importiere die Datei in eine Kalender-App für Erinnerungen auch bei geschlossenem BBG. Zeiten folgen den Ortszeitregeln des Kalenders; die Zustellung hängt von der Kalender-App ab. Spätere Änderungen oder abgeschlossenes Training in BBG aktualisieren importierte Termine nicht: Ersetze den alten Termin bei Planänderungen. Dauern sind Schätzungen, keine Abbruchzeiten."],
    "preferences.calendarDescription": ["BBG practice. The duration is an estimated budget; exercises keep their full protocols. This calendar event does not update when BBG settings change or practice is completed.", "BBG-Training. Die Dauer ist ein geschätztes Budget; Übungen behalten ihren vollständigen Ablauf. Dieser Kalendertermin wird bei geänderten BBG-Einstellungen oder abgeschlossenem Training nicht aktualisiert."],
    "reminders.title": ["Browser reminders (while the app is open)", "Browser-Erinnerungen (bei geöffneter App)"],
    "reminders.help": ["Best-effort reminders within 30 minutes of your preferred start, once per selected day. BBG must remain open; background tabs may be paused. Reminders do not interrupt rounds and are skipped once you have practiced or started today's routine. This local-only app has no push service to wake it when closed.", "Erinnerungen nach Möglichkeit innerhalb von 30 Minuten nach deinem bevorzugten Start, einmal pro gewähltem Tag. BBG muss geöffnet bleiben; Hintergrund-Tabs können pausiert werden. Erinnerungen unterbrechen keine Runden und entfallen nach Training oder Start der heutigen Routine. Diese lokale App hat keinen Push-Dienst, der sie im geschlossenen Zustand aufweckt."],
    "reminders.default": ["Allow notifications explicitly, then save your reminder setting. No permission is requested automatically.", "Erlaube Benachrichtigungen ausdrücklich und speichere die Erinnerungseinstellung. Die Berechtigung wird nie automatisch angefordert."],
    "reminders.granted": ["Notification permission is granted on this device.", "Benachrichtigungen sind auf diesem Gerät erlaubt."],
    "reminders.denied": ["Notifications are blocked. Change the browser or OS permission, or use calendar reminders.", "Benachrichtigungen sind blockiert. Ändere die Berechtigung im Browser oder Betriebssystem oder nutze Kalender-Erinnerungen."],
    "reminders.unsupported": ["Browser reminders are unavailable here. On supported iPhones/iPads, install BBG on the Home Screen first; otherwise use calendar reminders.", "Browser-Erinnerungen sind hier nicht verfügbar. Installiere BBG auf unterstützten iPhones/iPads zuerst auf dem Home-Bildschirm oder nutze Kalender-Erinnerungen."],
    "reminders.insecure": ["Browser notifications require HTTPS or localhost. Calendar reminders remain available.", "Browser-Benachrichtigungen benötigen HTTPS oder localhost. Kalender-Erinnerungen bleiben verfügbar."],
    "reminders.notGranted": ["Permission was not granted. Browser reminders remain off.", "Die Berechtigung wurde nicht erteilt. Browser-Erinnerungen bleiben ausgeschaltet."],
    "reminders.permissionRequired": ["Allow notifications on this device, or turn off browser reminders before saving.", "Erlaube Benachrichtigungen auf diesem Gerät oder schalte Browser-Erinnerungen vor dem Speichern aus."],
    "reminders.pending": ["Finish the notification permission request before saving.", "Beende die Anfrage zur Benachrichtigungsberechtigung vor dem Speichern."],
    "reminders.workerUnavailable": ["Offline setup is not ready for notifications. Retry after the app finishes loading, or use calendar reminders.", "Die Offline-Einrichtung ist noch nicht bereit für Benachrichtigungen. Versuche es nach dem Laden erneut oder nutze Kalender-Erinnerungen."],
    "reminders.failure": ["A browser reminder could not be shown. Check notification permission and offline setup, or use calendar reminders.", "Eine Browser-Erinnerung konnte nicht angezeigt werden. Prüfe Benachrichtigungsberechtigung und Offline-Einrichtung oder nutze Kalender-Erinnerungen."],
    "reminders.body": ["Your preferred practice time has arrived. Train when you're ready; this is not a deadline.", "Deine bevorzugte Trainingszeit ist da. Trainiere, wenn du bereit bist; das ist keine Frist."],
    "share.open": ["Share BBG", "BBG teilen"],
    "share.title": ["Share BBG", "BBG teilen"],
    "share.privacy": ["Share the app with friends. Only the app link and a short public description are shared; your results, forecasts and settings are not included.", "Teile die App mit Freunden. Nur der App-Link und eine kurze öffentliche Beschreibung werden geteilt; deine Ergebnisse, Prognosen und Einstellungen sind nicht enthalten."],
    "share.link": ["App link", "App-Link"],
    "share.copy": ["Copy link", "Link kopieren"],
    "share.native": ["Share with your device", "Über dein Gerät teilen"],
    "share.message": ["BBG - Benny's Brain Gym: local-first memory, attention and reasoning practice. No account needed.", "BBG - Benny's Brain Gym: lokales Training für Gedächtnis, Aufmerksamkeit und Denken. Kein Konto nötig."],
    "share.copied": ["App link copied. Your training data were not included.", "App-Link kopiert. Deine Trainingsdaten wurden nicht einbezogen."],
    "share.manualCopy": ["Automatic copying is unavailable. The link is selected; copy it manually.", "Automatisches Kopieren ist nicht verfügbar. Der Link ist markiert; kopiere ihn manuell."],
    "share.unavailable": ["The browser could not open a sharing target. Copy the link or choose a social network below.", "Der Browser konnte kein Teilen-Ziel öffnen. Kopiere den Link oder wähle unten ein soziales Netzwerk."],
    "share.busy": ["Finish or leave the current round before opening sharing options.", "Beende oder verlasse die aktuelle Runde, bevor du die Teilen-Optionen öffnest."],
    "share.localWarning": ["This is a local development address. People on other devices need your published app address.", "Dies ist eine lokale Entwicklungsadresse. Personen auf anderen Geräten benötigen die veröffentlichte App-Adresse."],
    "preferences.warmup": ["Training warm-ups", "Einübung im Training"],
    "preferences.warmup.familiar": ["Optional for familiar exercises", "Bei vertrauten Übungen optional"],
    "preferences.warmup.always": ["Eight practice trials every time", "Jedes Mal acht Übungsdurchgänge"],
    "preferences.protocolNote": ["New setups include eight practice trials. Familiar training setups can skip them after a successful warm-up. Assessments always include eight; their protocol never changes. Time-budget changes apply to the next new routine.", "Neue Bedingungen enthalten acht Übungsdurchgänge. Vertraute Trainingsbedingungen können sie nach erfolgreicher Einübung auslassen. Messungen enthalten immer acht; ihr Ablauf bleibt unverändert. Änderungen des Zeitbudgets gelten für die nächste neue Routine."],
    "preferences.appearance": ["Appearance", "Darstellung"],
    "preferences.theme": ["Light / dark", "Hell / dunkel"],
    "preferences.theme.system": ["Follow device", "Geräteeinstellung"],
    "preferences.theme.light": ["Light", "Hell"],
    "preferences.theme.dark": ["Dark", "Dunkel"],
    "preferences.colorTheme": ["Color theme", "Farbdesign"],
    "preferences.colorTheme.rose": ["Rose", "Rosé"],
    "preferences.colorTheme.graphite": ["Graphite (monochrome)", "Graphit (monochrom)"],
    "preferences.colorTheme.amber": ["Amber", "Bernstein"],
    "preferences.accentPreview": ["Accent preview", "Akzentvorschau"],
    "preferences.appearanceHelp": ["Preview your choice here; Save settings keeps it. All views use clean, neutral backgrounds. Graphite removes interface category colors; colors inside exercises never change.", "Sieh dir deine Auswahl hier an; Einstellungen speichern behält sie. Alle Ansichten nutzen klare, neutrale Hintergründe. Graphit entfernt die Kategoriefarben der Oberfläche; Farben innerhalb der Übungen ändern sich nie."],
    "preferences.appearanceInvalid": ["Choose a supported color theme and light/dark setting.", "Wähle ein unterstütztes Farbdesign und eine Hell-/Dunkel-Einstellung."],
    "preferences.input": ["Default controls", "Standard-Eingabe"],
    "preferences.input.auto": ["Choose for this device", "Passend zum Gerät"],
    "preferences.fullscreen": ["Use fullscreen when supported", "Vollbild nutzen, wenn unterstützt"],
    "preferences.save": ["Save settings", "Einstellungen speichern"],
    "settings.discard": ["Discard your unsaved exercise-setting changes?", "Ungespeicherte Änderungen der Aufgabeneinstellungen verwerfen?"],
    "runner.backLibrary": ["Back to exercises", "Zurück zu den Übungen"],
    "runner.practice": ["Try 8 practice trials", "8 Übungsdurchgänge ausprobieren"],
    "runner.practiceIntro": ["Start with eight practice trials to get comfortable with this setup. They are kept separate and never affect your main score.", "Beginne mit acht Übungsdurchgängen, um diese Bedingungen kennenzulernen. Sie bleiben getrennt und beeinflussen nie dein Hauptergebnis."],
    "runner.familiar": ["You have practiced this setup before. Go straight to the main round, or choose another warm-up.", "Du hast unter diesen Bedingungen bereits geübt. Beginne direkt mit der Hauptrunde oder wähle eine weitere Einübung."],
    "runner.exerciseCanvas": ["Visual exercise: {name}", "Visuelle Übung: {name}"],
    "runner.startRound": ["Start round", "Runde starten"],
    "runner.optionalPractice": ["Warm up again", "Erneut einüben"],
    "runner.practiceRequired": ["Complete eight practice trials before starting this assessment.", "Absolviere acht Übungsdurchgänge, bevor du diese Messung startest."],
    "runner.practiceDone": ["Ready for your round.", "Bereit für deine Runde."],
    "runner.practiceScore": ["Warm-up accuracy: {value}. This does not count toward your score.", "Einübungsgenauigkeit: {value}. Dies zählt nicht zu deinem Ergebnis."],
    "runner.startBlock": ["Begin main round", "Hauptrunde beginnen"],
    "runner.readyHelp": ["Take a moment if you need it. The main round starts only when you choose.", "Nimm dir bei Bedarf einen Moment. Die Hauptrunde beginnt erst, wenn du bereit bist."],
    "runner.reviewInstructions": ["Review instructions", "Anleitung erneut ansehen"],
    "runner.fullInstructions": ["Full instructions & scoring", "Vollständige Anleitung & Wertung"],
    "runner.mobileNote": ["About timing on this device", "Zur Zeitmessung auf diesem Gerät"],
    "runner.audioCheckHelp": ["Check your volume and local voice before starting.", "Prüfe vor dem Start die Lautstärke und die lokale Stimme."],
    "runner.responses": ["Exercise response controls", "Antwortflächen der Übung"],
    "runner.practiceProgress": ["Practice {count} / 8", "Einübung {count} / 8"],
    "runner.abort": ["End round", "Runde beenden"],
    "runner.timingWarning": ["Timing varies. Review this round before comparing.", "Zeitmessung schwankt. Prüfe die Vergleichbarkeit dieser Runde."],
    "runner.complete": ["Round complete.", "Runde abgeschlossen."],
    "runner.completeHelp": ["Take a moment, then continue or leave it here for today.", "Nimm dir einen Moment. Danach kannst du fortsetzen oder für heute aufhören."],
    "runner.completedWithTiming": ["You completed this training round. Display timing was unreliable, so it counts as practice but is not used for score comparisons. Turn off battery-saving mode or use a steadier device for measurements.", "Du hast diese Trainingsrunde abgeschlossen. Die Bildschirm-Zeitmessung war unzuverlässig. Die Runde zählt als Übung, wird aber nicht für Ergebnisvergleiche genutzt. Deaktiviere den Energiesparmodus oder nutze für Messungen ein stabileres Gerät."],
    "runner.interruptedTitle": ["This round needs another try.", "Diese Runde braucht einen neuen Versuch."],
    "runner.interruptedHelp": ["Saved, but not used for comparisons. Completed rounds are safe. Retry when you're ready, or skip this round.", "Gespeichert, aber nicht für Vergleiche genutzt. Abgeschlossene Runden bleiben erhalten. Versuche es erneut, wenn du bereit bist, oder überspringe diese Runde."],
    "runner.retry": ["Try this round again", "Diese Runde erneut versuchen"],
    "runner.again": ["Practice again", "Erneut üben"],
    "runner.practiceSaved": ["Warm-up saved.", "Einübung gespeichert."],
    "runner.practiceSavedHelp": ["No main round was scored. Return to the instructions when you are ready to continue.", "Es wurde keine Hauptrunde gewertet. Kehre zur Anleitung zurück, wenn du fortsetzen möchtest."],
    "runner.recorded": ["Saved in this browser.", "In diesem Browser gespeichert."],
    "results.title": ["Your practice, over time.", "Dein Training im Verlauf."],
    "results.subtitle": ["Look for steady within-task change, not a perfect daily score. Compare the same exercise, setup and mode.", "Achte auf stetige Veränderungen innerhalb einer Aufgabe, nicht auf ein perfektes Tagesergebnis. Vergleiche dieselbe Übung, dieselben Bedingungen und denselben Modus."],
    "results.firstTitle": ["Your first round starts the story.", "Deine erste Runde macht den Anfang."],
    "results.firstHelp": ["Finish a main round to see your history and task-specific progress here.", "Schließe eine Hauptrunde ab, um hier deinen Verlauf und aufgabenspezifischen Fortschritt zu sehen."],
    "results.setup": ["Comparison setup", "Vergleichsbedingungen"],
    "results.protocolVersion": ["Protocol version {count}", "Ablaufversion {count}"],
    "layout.portrait": ["Portrait", "Hochformat"],
    "layout.landscape": ["Landscape", "Querformat"],
    "layout.unknown": ["Unknown orientation", "Unbekannte Ausrichtung"],
    "results.history": ["Round history", "Rundenverlauf"],
    "results.chartLimit": ["Charts show up to 240 recent scored rounds per mode. The full history and exports remain available. Protocol versions are separate series.", "Diagramme zeigen bis zu 240 aktuelle gewertete Runden je Modus. Der vollständige Verlauf und Exporte bleiben verfügbar. Ablaufversionen bilden getrennte Reihen."],
    "results.thresholdHelp": ["How UFOV thresholds are estimated", "Wie UFOV-Schwellen geschätzt werden"],
    "results.validity": ["Status", "Status"],
    "results.valid": ["Scored", "Gewertet"],
    "results.invalid": ["Not comparable", "Nicht vergleichbar"],
    "results.practice": ["Warm-up only", "Nur Einübung"],
    "data.backupTitle": ["Keep a portable backup.", "Behalte eine portable Sicherung."],
    "data.backupLink": ["Backups & data", "Sicherungen & Daten"],
    "data.backupHelp": ["JSON can restore your data in another browser. CSV is for analysis only. Installing the app does not create a backup or sync devices.", "JSON kann deine Daten in einem anderen Browser wiederherstellen. CSV dient nur der Auswertung. Eine App-Installation erstellt keine Sicherung und synchronisiert keine Geräte."],
    "data.manage": ["Manage storage & delete data", "Speicher verwalten & Daten löschen"],
    "data.pruneConfirm": ["Delete all raw trial data? Session summaries, scores and forecasts remain. This cannot be undone without a backup.", "Alle Rohdaten der Durchgänge löschen? Sitzungszusammenfassungen, Ergebnisse und Prognosen bleiben erhalten. Ohne Sicherung ist dies nicht rückgängig zu machen."],
    "data.otherTab": ["Another tab changed your data during this session. This tab will not overwrite it. Export any pending work before reloading, then merge your backup from Your data.", "Ein anderer Tab hat während dieser Sitzung Daten geändert. Dieser Tab überschreibt sie nicht. Exportiere ungespeicherte Arbeit vor dem Neuladen und führe die Sicherung danach unter Deine Daten zusammen."],
    "pwa.title": ["Use BBG on your phone", "BBG auf dem Smartphone nutzen"],
    "pwa.install": ["Install BBG", "BBG installieren"],
    "pwa.installHelp": ["On iPhone or iPad, open BBG in Safari and choose Share → Add to Home Screen. On Android or desktop, use your browser's Install app option. Once the app has loaded and its offline cache is ready, the exercises work without a connection.", "Öffne BBG auf dem iPhone oder iPad in Safari und wähle Teilen → Zum Home-Bildschirm. Nutze auf Android oder am Desktop die Option App installieren des Browsers. Nachdem die App geladen und der Offline-Speicher bereit ist, funktionieren die Übungen ohne Verbindung."],
    "pwa.originNote": ["Installation and offline caching need HTTPS, or localhost for development. Keep using the same address and browser for your history; phone and desktop storage are separate.", "Installation und Offline-Speicherung benötigen HTTPS oder localhost bei der Entwicklung. Nutze für deinen Verlauf dieselbe Adresse und denselben Browser. Smartphone- und Desktop-Speicher sind getrennt."],
    "pwa.update": ["App update ready", "App-Update bereit"],
    "pwa.updateReady": ["An app update is ready. Use App update ready in the footer between rounds to apply it.", "Ein App-Update ist bereit. Wähle zwischen den Runden App-Update bereit in der Fußzeile, um es anzuwenden."],
    "pwa.wait": ["Finish or leave the current round and save drafts or export unsaved data before updating.", "Beende oder verlasse die aktuelle Runde und speichere Entwürfe oder exportiere ungespeicherte Daten vor dem Update."],
    "pwa.failed": ["Offline installation is unavailable. You can still practice while this page is open; check your browser and connection before relying on offline access.", "Offline-Installation ist nicht verfügbar. Du kannst auf dieser geöffneten Seite weiter üben. Prüfe Browser und Verbindung, bevor du dich auf Offline-Zugriff verlässt."],
    "forecast.draftUnavailable": ["The journal draft cannot be restored or kept for reloads in this browser. Copy any unfinished text before leaving this page; saved entries still appear below.", "Der Entwurf im Journal kann in diesem Browser nicht wiederhergestellt oder für ein Neuladen gespeichert werden. Kopiere unfertigen Text, bevor du die Seite verlässt. Gespeicherte Einträge stehen weiterhin unten."],
    "mode.assessmentHelp": ["Fixed protocol, no correctness feedback in the main block. Scored assessments of the same task are spaced 14 days apart; interrupted or invalid attempts do not lock you out.", "Fester Ablauf, keine Richtig-falsch-Rückmeldung im Hauptblock. Gewertete Messungen derselben Aufgabe liegen 14 Tage auseinander. Abgebrochene oder ungültige Versuche sperren dich nicht aus."],
    "about.modesText": ["Training gives feedback and task-specific adaptation. New setups start with eight unscored practice trials; familiar training setups may skip them. Assessment always includes eight practice trials and a fixed main protocol without correctness feedback. Valid assessments are spaced at least 14 days apart per task. Conflict-task blocks last 90 seconds. Short routine profiles and the updated task implementation have their own comparison series.", "Training bietet Rückmeldung und aufgabenspezifische Anpassung. Neue Bedingungen beginnen mit acht ungewerteten Übungsdurchgängen. Bei vertrauten Trainingsbedingungen können sie entfallen. Messungen enthalten immer acht Übungsdurchgänge und einen festen Hauptablauf ohne Richtig-falsch-Rückmeldung. Gültige Messungen derselben Aufgabe liegen mindestens 14 Tage auseinander. Konfliktblöcke dauern 90 Sekunden. Kurze Routinenprofile und die aktualisierte Aufgabenimplementierung haben eigene Vergleichsreihen."],
    "about.privacyText": ["Training data stays in browser localStorage, tied to the browser, profile and address. Static app files are cached for offline use; no training data, analytics or speech is sent to a server. Sharing includes only the app link and public description; social networks are contacted only when you choose one. Browser reminders are optional and local, not a server push service. Local speech voices are required for audio exercises. Clearing site data, private browsing or blocked storage can lose your history. Installing does not sync devices. A JSON export is your portable backup. File URLs have browser-dependent storage behavior; use a stable hosted address or localhost.", "Trainingsdaten bleiben im localStorage des Browsers, gebunden an Browser, Profil und Adresse. Statische App-Dateien werden offline gespeichert. Es werden keine Trainingsdaten, Analytik oder Sprache an einen Server gesendet. Teilen umfasst nur den App-Link und die öffentliche Beschreibung. Soziale Netzwerke werden erst bei deiner Auswahl kontaktiert. Browser-Erinnerungen sind optional und lokal, kein Server-Push-Dienst. Audioübungen benötigen lokale Stimmen. Gelöschte Websitedaten, privates Surfen oder gesperrter Speicher können deinen Verlauf verlieren. Eine Installation synchronisiert keine Geräte. Ein JSON-Export ist deine portable Sicherung. Datei-URLs haben browserabhängiges Speicherverhalten. Nutze eine feste gehostete Adresse oder localhost."],
    "nback.name.dual": ["Dual n-back", "Duales n-back"],
    "nback.name.position": ["Position n-back", "Positions-n-back"],
    "nback.name.audio": ["Audio n-back", "Audio-n-back"],
    "nback.name.arithmetic": ["Arithmetic n-back", "Rechen-n-back"],
    "guide.nback.dual": ["Remember each square position and spoken item. Choose position match or audio match when that stream repeats exactly {n} items back. If both match, choose both. No match: do nothing.", "Merke dir jede Quadratposition und jeden gesprochenen Reiz. Wähle Positions- oder Audiotreffer, wenn sich der entsprechende Reiz von genau {n} Reizen zuvor wiederholt. Bei beiden Treffern wähle beide. Kein Treffer: nichts tun."],
    "guide.nback.position": ["Remember the square positions. Choose position match when the position repeats exactly {n} items back. The first items are just for remembering. No match: do nothing.", "Merke dir die Quadratpositionen. Wähle Positionstreffer, wenn sich die Position von genau {n} Reizen zuvor wiederholt. Die ersten Reize dienen nur dem Merken. Kein Treffer: nichts tun."],
    "guide.nback.audio": ["Remember the spoken items. Choose audio match when you hear the same item as exactly {n} items back. The first items are just for remembering. No match: do nothing.", "Merke dir die gesprochenen Reize. Wähle Audiotreffer, wenn du denselben Reiz wie genau {n} Reize zuvor hörst. Die ersten Reize dienen nur dem Merken. Kein Treffer: nichts tun."],
    "guide.nback.arithmetic": ["Choose match when the current number equals the number exactly {n} items back plus {operand}. Remember the first items without responding. No match: do nothing.", "Wähle Treffer, wenn die aktuelle Zahl der Zahl genau {n} Reize zuvor plus {operand} entspricht. Merke dir die ersten Reize ohne Antwort. Kein Treffer: nichts tun."],
    "guide.ufov": ["Look at the centre. Identify the car or truck after the brief display. In divided and selective rounds, also choose the square's direction; ignore the triangles.", "Blicke ins Zentrum. Erkenne nach der kurzen Darstellung Auto oder Lkw. Wähle in geteilten und selektiven Runden außerdem die Richtung des Quadrats. Ignoriere die Dreiecke."],
    "guide.stroop-squared": ["Follow the rule shown before the block. WORD: choose the word's meaning. INK: choose its ink colour. Read the response labels: their positions can change.", "Beachte die Regel vor dem Block. WORT: Wähle die Wortbedeutung. FARBE: Wähle die Schriftfarbe. Lies die Antwortbeschriftungen: Ihre Positionen können wechseln."],
    "guide.flanker-squared": ["Focus on the middle arrow. Choose the option pointing the same way and ignore its neighbours. Read the response labels: their positions can change.", "Achte auf den mittleren Pfeil. Wähle die Option mit derselben Richtung und ignoriere die Nachbarn. Lies die Antwortbeschriftungen: Ihre Positionen können wechseln."],
    "guide.simon-squared": ["Respond to the circle's colour, not its position. Red always uses the left response; green always uses the right.", "Antworte auf die Kreisfarbe, nicht auf die Position. Rot nutzt immer die linke, Grün immer die rechte Antwort."],
    "guide.antisaccade": ["Keep your eyes on the cross. When the square flashes, look immediately to the opposite side. Identify the brief B, P or R there, then choose that letter.", "Fixiere das Kreuz. Blicke beim Aufblitzen des Quadrats sofort zur Gegenseite. Erkenne dort das kurze B, P oder R und wähle diesen Buchstaben."],
    "guide.visual-arrays": ["Remember the coloured squares and ignore the gray ones. After the delay, choose whether the single square kept its original colour at that exact position.", "Merke dir die farbigen Quadrate und ignoriere die grauen. Entscheide nach der Pause, ob das einzelne Quadrat seine ursprüngliche Farbe an genau dieser Position behielt."],
    "guide.symmetry-span": ["Judge whether each pattern is symmetrical, then remember the highlighted grid cell. Recall the cells in order. Both jobs matter: symmetry accuracy must reach 85%.", "Beurteile die Symmetrie jedes Musters und merke dir danach die markierte Gitterzelle. Rufe die Zellen in Reihenfolge ab. Beides zählt: Die Symmetriegenauigkeit muss 85 % erreichen."],
    "guide.corsi": ["Watch the blocks flash without responding. Then reproduce their order. If backward recall is selected, reproduce the sequence in reverse.", "Beobachte die aufleuchtenden Blöcke ohne Antwort. Wiederhole danach ihre Reihenfolge. Bei rückwärts gewähltem Abruf wiederhole die Folge in umgekehrter Reihenfolge."],
    "guide.digit-span": ["Watch the digits without typing. Recall all of them in the requested order, including repeated digits and leading zeros. Check your entry, then submit.", "Beobachte die Ziffern ohne Eingabe. Rufe alle in der geforderten Reihenfolge ab, einschließlich Wiederholungen und führender Nullen. Prüfe die Eingabe und bestätige."],
    "guide.matrix-reasoning": ["Find the rules across rows and columns. Choose the one of eight options that completes the missing cell. Look for more than one changing feature.", "Finde die Regeln über Zeilen und Spalten. Wähle die eine von acht Optionen für die fehlende Zelle. Achte auf mehrere veränderliche Merkmale."],
    "guide.number-series": ["Find the pattern in the numbers or letters, then choose the next item. The option number is its button or key, not the numerical answer itself.", "Finde das Muster in den Zahlen oder Buchstaben und wähle das nächste Element. Die Optionsnummer bezeichnet ihre Taste, nicht den Zahlenwert der Antwort."],
    "guide.mental-arithmetic": ["Solve the expression mentally. Enter the complete answer, including a minus sign or decimal if needed. Submit to move on; Backspace corrects your entry.", "Löse den Ausdruck im Kopf. Gib das vollständige Ergebnis bei Bedarf mit Minuszeichen oder Dezimalstelle ein. Bestätige für die nächste Aufgabe. Die Rücktaste korrigiert die Eingabe."],
    "guide.pvt-b": ["Wait while the screen is blank. Respond once, as soon as the counter appears. Release and wait for the next counter. Early taps or key presses count as false starts.", "Warte bei leerem Bildschirm. Antworte einmal, sobald der Zähler erscheint. Lasse los und warte auf den nächsten Zähler. Frühe Eingaben zählen als Fehlstarts."],
    "guide.running-span": ["Keep only the last requested number of digits as the stream continues. When it stops, enter those final digits in their original order and submit.", "Behalte während der laufenden Folge nur die verlangte Zahl letzter Ziffern. Gib beim Ende diese letzten Ziffern in ihrer ursprünglichen Reihenfolge ein und bestätige."],
    "guide.operation-span": ["Judge each arithmetic statement, then remember the following letter. After the set, recall the letters in order. Accurate arithmetic judgments are required as well as recall.", "Beurteile jede Rechenaussage und merke dir danach den Buchstaben. Rufe nach dem Satz die Buchstaben in Reihenfolge ab. Neben dem Abruf sind genaue Rechenurteile erforderlich."],
    "guide.sternberg": ["Remember the displayed digits. After the delay, choose whether the single probe digit was present in that set.", "Merke dir die gezeigten Ziffern. Entscheide nach der Pause, ob die einzelne Testziffer in dieser Menge enthalten war."],
    "guide.paired-associates": ["Learn each pair as a relationship. At recall, choose intact only if the two words were shown together; familiar words with different partners are recombined.", "Lerne jedes Paar als Beziehung. Wähle beim Abruf unverändert nur dann, wenn beide Wörter zusammen gezeigt wurden. Vertraute Wörter mit anderen Partnern sind neu kombiniert."],
    "guide.method-loci": ["Memorize the items at your own pace, placing vivid images along a familiar route. Review every item, choose Ready to recall, then reconstruct the order from the full catalogue and submit. Route help is optional; main assessments use fixed study time.", "Merke dir die Elemente in deinem Tempo als lebhafte Bilder entlang einer vertrauten Route. Sieh jedes Element an, wähle Bereit zum Abruf, stelle die Reihenfolge aus dem vollständigen Katalog wieder her und gib ab. Routenhilfe ist optional; Hauptblöcke der Messung nutzen feste Lernzeit."],
    "guide.stop-signal": ["Respond promptly to each arrow's direction. If the red stop cue appears, withhold your response. Do not slow down to wait for a possible stop cue.", "Antworte zügig auf die Pfeilrichtung. Unterdrücke die Antwort, wenn das rote Stoppsignal erscheint. Warte nicht verlangsamt auf ein mögliches Stoppsignal."],
    "guide.ax-cpt": ["Remember the cue through the blank delay. Only A followed by X is a target. Choose non-target for AY, BX and BY; every probe needs an answer.", "Merke dir den Hinweisreiz über die Pause. Nur A gefolgt von X ist ein Ziel. Wähle Nicht-Ziel für AY, BX und BY. Jeder Testreiz benötigt eine Antwort."],
    "guide.task-switching": ["Follow the cue before each digit. PARITY means odd or even. MAGNITUDE means below or above 5. Use the current response labels as the rule changes.", "Beachte den Hinweisreiz vor jeder Ziffer. PARITÄT bedeutet ungerade oder gerade. GRÖSSE bedeutet unter oder über 5. Nutze beim Regelwechsel die aktuellen Antwortbeschriftungen."],
    "guide.digit-symbol": ["Find the target symbol in the visible code key and choose its paired digit. The mapping can change between warm-up and the main round.", "Finde das Zielsymbol im sichtbaren Schlüssel und wähle die zugehörige Ziffer. Zwischen Einübung und Hauptrunde kann sich die Zuordnung ändern."],
    "guide.mental-rotation": ["Choose same if one figure can be rotated in 3D to match the other. A mirror image is different, even if it looks very similar.", "Wähle gleich, wenn eine Figur durch eine 3D-Drehung zur anderen passt. Ein Spiegelbild ist anders, auch wenn es sehr ähnlich aussieht."],
    "guide.tower-london": ["Match the board labelled Current to the one labelled Goal. Choose a source peg, then a destination. Move only the top ball and use as few moves as possible.", "Gleiche das mit Aktuell beschriftete Brett dem Zielbrett an. Wähle erst den Startstab, dann den Zielstab. Bewege nur die oberste Kugel und nutze möglichst wenige Züge."]
  });

  Object.assign(pairs, {
    "journey.eyebrow": ["Your training journey", "Dein Trainingsweg"],
    "journey.baselineTitle": ["Build your baseline", "Baue deine Ausgangsbasis auf"],
    "journey.establishedTitle": ["Baseline established", "Ausgangsbasis erfasst"],
    "journey.reviewTitle": ["Review your recent change", "Betrachte deine jüngste Veränderung"],
    "journey.baselineHelp": ["Valid scored rounds still needed for your three-round baseline: {remaining}. Keep this comparison setup unchanged.", "Noch benötigte gültige Runden mit verwertbarem Wert für deine Drei-Runden-Ausgangsbasis: {remaining}. Behalte diese Vergleichsbedingungen bei."],
    "journey.establishedHelp": ["Your starting point is recorded. Comparable scored rounds still needed for a separate recent window: {remaining}.", "Dein Ausgangspunkt ist erfasst. Noch benötigte vergleichbare Runden mit verwertbarem Wert für ein getrenntes jüngstes Fenster: {remaining}."],
    "journey.reviewHelp": ["Compare your starting point with your three most recent comparable rounds. This describes task performance, not a change in intelligence.", "Vergleiche deinen Ausgangspunkt mit deinen drei jüngsten vergleichbaren Runden. Das beschreibt die Aufgabenleistung, keine Veränderung deiner Intelligenz."],
    "journey.count": ["Usable scores: {count} · valid rounds in this setup: {total}.", "Verwertbare Werte: {count} · gültige Runden unter diesen Bedingungen: {total}."],
    "journey.setup": ["Comparison setup — never pooled", "Vergleichsbedingungen – nie zusammengelegt"],
    "journey.setupOption": ["Setup {index} · last used {date} · {count} valid rounds", "Bedingungen {index} · zuletzt {date} · {count} gültige Runden"],
    "journey.latest": ["Most recent usable score", "Jüngster verwertbarer Wert"],
    "journey.baselineLabel": ["Starting median · first 3 rounds", "Ausgangsmedian · erste 3 Runden"],
    "journey.recentLabel": ["Recent median · latest 3 rounds", "Jüngster Median · letzte 3 Runden"],
    "journey.change": ["Change from your baseline", "Veränderung zur Ausgangsbasis"],
    "journey.higher": ["Higher by {value}", "Um {value} höher"],
    "journey.lower": ["Lower by {value}", "Um {value} niedriger"],
    "journey.unchanged": ["Unchanged", "Unverändert"],
    "journey.points": ["{value} percentage points", "{value} Prozentpunkte"],
    "journey.milliseconds": ["{value} ms", "{value} ms"],
    "journey.direction.higher": ["Higher is the preferred direction for this metric", "Höher ist bei diesem Wert die bevorzugte Richtung"],
    "journey.direction.lower": ["Lower is the preferred direction for this metric", "Niedriger ist bei diesem Wert die bevorzugte Richtung"],
    "journey.range": ["Your latest three scores ranged from {low} to {high}. This is observed variation, not a confidence interval.", "Deine letzten drei Werte lagen zwischen {low} und {high}. Das ist beobachtete Schwankung, kein Konfidenzintervall."],
    "journey.excluded": ["This attempt does not enter your progress calculation. Earlier eligible rounds in the same setup can still appear here.", "Dieser Versuch geht nicht in die Fortschrittsberechnung ein. Frühere geeignete Runden unter denselben Bedingungen können hier weiterhin erscheinen."],
    "journey.missing": ["Missing or guarded estimates are not zero. They do not count toward either three-round window.", "Fehlende oder nicht belastbar schätzbare Werte sind nicht null. Sie zählen zu keinem der beiden Drei-Runden-Fenster."],
    "journey.context": ["Check accuracy, speed and task context", "Prüfe Genauigkeit, Tempo und Aufgabenkontext"],
    "journey.accuracyDrop": ["Accuracy also decreased from {baseline} to {recent} in these windows. Read the main score alongside that change rather than treating greater speed or load alone as progress.", "Die Genauigkeit sank in diesen Fenstern ebenfalls von {baseline} auf {recent}. Betrachte den Hauptwert gemeinsam mit dieser Veränderung, statt höheres Tempo oder höhere Belastung allein als Fortschritt zu werten."],
    "journey.contextHelp": ["Read these alongside the main score: faster responses with more mistakes are not automatically progress. Each value needs all three scores in its window; otherwise it stays unavailable.", "Lies diese Angaben gemeinsam mit dem Hauptwert: Schnellere Antworten mit mehr Fehlern sind nicht automatisch Fortschritt. Jeder Wert benötigt alle drei Angaben seines Fensters; andernfalls bleibt er nicht verfügbar."],
    "journey.method": ["How this comparison works", "So funktioniert dieser Vergleich"],
    "journey.methodHelp": ["The baseline is the median (middle value) of your first three eligible scores. Recent performance is the median of your latest three, only after at least six scores, so the windows never overlap. The change is their raw difference, not a population percentile or a relative percentage gain. Percentage-based scores use percentage points. Only one setup is used, even with chart overlays enabled. Warm-ups, invalid or interrupted rounds, missing estimates and conflicting backup variants are excluded. Saved-round views stop at that round's date.", "Die Ausgangsbasis ist der Median (mittlere Wert) deiner ersten drei geeigneten Werte. Die jüngste Leistung ist der Median deiner letzten drei, erst ab mindestens sechs Werten, damit sich die Fenster nie überschneiden. Die Veränderung ist ihre absolute Differenz, kein Bevölkerungsperzentil oder relativer Prozentzuwachs. Prozentwerte verwenden Prozentpunkte. Auch bei überlagerten Diagrammen werden nur identische Bedingungen verwendet. Einübungen, ungültige oder abgebrochene Runden, fehlende Schätzwerte und widersprüchliche Sicherungsvarianten sind ausgeschlossen. Gespeicherte Rundendetails berücksichtigen nur den Verlauf bis zu dieser Runde."],
    "journey.adaptiveNote": ["Training can change difficulty within the same configuration. These are descriptive training results, not equivalent fixed tests. Keep an eye on accuracy and load; use the separate fixed assessment mode for a more stable protocol. Its cooldown still applies.", "Training kann innerhalb derselben Konfiguration die Schwierigkeit verändern. Das sind beschreibende Trainingswerte, keine gleichwertigen festen Tests. Beachte Genauigkeit und Belastung. Der getrennte feste Messmodus bietet einen stabileren Ablauf. Seine Wartezeit gilt weiterhin."],
    "journey.assessmentNote": ["These are fixed-protocol assessments, kept separate from training. Repeated exposure, sleep and measurement noise can still change results. Do not bypass the 14-day assessment cooldown to fill the windows faster.", "Das sind Messungen mit festem Ablauf, getrennt vom Training. Wiederholte Erfahrung, Schlaf und Messrauschen können die Ergebnisse dennoch verändern. Umgehe nicht die 14-tägige Messwartezeit, um die Fenster schneller zu füllen."],
    "journey.processingDeadline": ["Recorded processing deadline: {value} ms. Different recorded deadlines form different comparison setups.", "Erfasste Verarbeitungsfrist: {value} ms. Unterschiedliche erfasste Fristen bilden getrennte Vergleichsbedingungen."],
    "journey.limits": ["Three-round windows reduce the influence of one unusual round but do not establish statistical significance, a stable ability estimate or general cognitive improvement. No overall brain score is calculated.", "Drei-Runden-Fenster mindern den Einfluss einer ungewöhnlichen Runde, belegen aber keine statistische Signifikanz, stabile Fähigkeitsschätzung oder allgemeine kognitive Verbesserung. Es wird kein Gesamtwert fürs Gehirn berechnet."],
    "evidence.title": ["Comparison with other people", "Vergleich mit anderen Menschen"],
    "evidence.unavailable": ["No validated reference yet", "Noch keine validierte Referenz"],
    "evidence.noRanking": ["A percentile for this app version is not available. Research on a related task is not enough to claim “better than 95% of people worldwide”. Personal progress compares you with your own history instead.", "Für diese App-Version ist kein Perzentil verfügbar. Forschung zu einer verwandten Aufgabe reicht nicht für die Aussage „besser als 95 % der Menschen weltweit“. Persönlicher Fortschritt vergleicht dich stattdessen mit deinem eigenen Verlauf."],
    "evidence.sources": ["Research context and requirements for fair rankings", "Forschungskontext und Anforderungen an faire Rangwerte"],
    "evidence.scope": ["These sources explain related task families or measurement principles; they do not validate this app or supply interchangeable norms. A study mean and standard deviation alone do not justify inventing a percentile. Research support for a task is not proof that practicing this version improves everyday cognition.", "Diese Quellen erläutern verwandte Aufgabenfamilien oder Messprinzipien. Sie validieren diese App nicht und liefern keine austauschbaren Normwerte. Mittelwert und Standardabweichung einer Studie allein rechtfertigen kein erfundenes Perzentil. Forschung zu einer Aufgabe beweist nicht, dass das Training dieser Version die Alltagskognition verbessert."],
    "evidence.futureTitle": ["What a credible peer comparison needs", "Was ein glaubwürdiger Vergleich mit anderen benötigt"],
    "evidence.future": ["A usable reference needs an appropriately licensed dataset, a defined population and adequate sample size, matched task version, fixed settings and scoring, validated device/input timing, and relevant age/language groups. Repeat attempts must not count as different people; uncertainty and ties must be reported. An opt-in app-user cohort would mean “among participating users”, not “worldwide”. This local-only app currently has no shared participant dataset or collection service.", "Eine nutzbare Referenz benötigt einen passend lizenzierten Datensatz, eine definierte Population und ausreichende Stichprobe, passende Aufgabenversion, feste Einstellungen und Wertung, validierte Geräte-/Eingabezeiten sowie relevante Alters-/Sprachgruppen. Wiederholte Versuche dürfen nicht als verschiedene Menschen zählen; Unsicherheit und Gleichstände müssen ausgewiesen werden. Eine freiwillige App-Nutzergruppe würde „unter teilnehmenden Nutzern“ bedeuten, nicht „weltweit“. Diese rein lokale App hat derzeit keinen gemeinsamen Teilnehmerdatensatz oder Erfassungsdienst."],
    "evidence.agePrivacy": ["Age can matter, but cannot repair a mismatched test. We do not ask for age or birth date without an appropriate age-based reference, and no training data is uploaded. A future peer study would require explicit consent and a clear privacy design.", "Alter kann relevant sein, repariert aber keinen unpassenden Test. Ohne geeignete altersbezogene Referenz fragen wir weder Alter noch Geburtsdatum ab, und es werden keine Trainingsdaten hochgeladen. Eine spätere Vergleichsstudie würde ausdrückliche Einwilligung und ein klares Datenschutzkonzept benötigen."],
    "evidence.complex": ["Complex span research combines recall with a processing task. This app's symmetry/operation trials, response controls, deadlines and partial-credit scoring need their own validation; the processing-accuracy requirement is not a population rank.", "Komplexe Spannenforschung verbindet Abruf mit einer Verarbeitungsaufgabe. Die Symmetrie-/Rechendurchgänge, Eingaben, Fristen und Teilpunktwertung dieser App benötigen eine eigene Validierung. Die geforderte Verarbeitungsgenauigkeit ist kein Bevölkerungsrang."],
    "evidence.running": ["Running span studies examine recall of the end of an unpredictable sequence. Stream speed, length and scoring matter; a published average digit count is not a percentile for this adaptive version.", "Laufende Spannen untersuchen den Abruf des Endes einer unvorhersehbaren Folge. Tempo, Länge und Wertung sind wichtig. Eine veröffentlichte mittlere Ziffernzahl ist kein Perzentil für diese adaptive Version."],
    "evidence.nback": ["N-back has a substantial research history, but position, speech, arithmetic, lure rates and adaptive n produce different tasks. Average n is a practice-load measure, not an IQ or worldwide rank; training-transfer studies do not validate this implementation.", "N-back hat eine umfangreiche Forschungsgeschichte. Position, Sprache, Rechnen, Köderanteile und adaptives n ergeben jedoch unterschiedliche Aufgaben. Mittleres n beschreibt die Übungsbelastung, keinen IQ oder Weltrang. Studien zum Trainingstransfer validieren diese Implementierung nicht."],
    "evidence.ufov": ["Useful-field-of-view research examines brief central and peripheral identification. This generated browser version is not the standardized instrument. Adaptive reversal thresholds and fixed-grid assessment thresholds use different estimators and stay separate.", "Forschung zum nutzbaren Blickfeld untersucht kurze zentrale und periphere Erkennung. Diese generierte Browserversion ist nicht das standardisierte Instrument. Adaptive Umkehrschwellen und feste Messraster verwenden unterschiedliche Schätzer und bleiben getrennt."],
    "evidence.conflict": ["Stroop, flanker and spatial-conflict research studies interference control. These custom 90-second variants score correct responses and adapt deadlines; published interference effects cannot be converted into percentiles for those scores. Robust group effects do not guarantee reliable individual rankings.", "Stroop-, Flanker- und räumliche Konfliktforschung untersucht Interferenzkontrolle. Diese eigenen 90-Sekunden-Varianten werten richtige Antworten und passen Fristen an. Veröffentlichte Interferenzeffekte lassen sich nicht in Perzentile dieser Werte umrechnen. Robuste Gruppeneffekte garantieren keine zuverlässigen individuellen Rangwerte."],
    "evidence.antisaccade": ["Antisaccade research concerns goal-directed attention against a distracting cue. This app scores letter identification without tracking your eyes; it cannot establish actual saccade latency or use eye-tracker norms.", "Antisakkadenforschung betrifft zielgerichtete Aufmerksamkeit entgegen einem ablenkenden Reiz. Diese App wertet Buchstabenerkennung ohne Augenverfolgung. Sie kann weder die tatsächliche Sakkadenlatenz feststellen noch Eye-Tracking-Normen verwenden."],
    "evidence.arrays": ["Visual change-detection studies investigate limited visual working memory. Cowan-style K estimates depend on the display, timing and detection design; this app's distractors and adaptive exposure need a matched reference, not a universal memory-capacity rank.", "Visuelle Veränderungserkennung untersucht begrenztes visuelles Arbeitsgedächtnis. K-Schätzungen nach Cowan hängen von Darstellung, Zeitverlauf und Erkennungsdesign ab. Ablenker und adaptive Darbietung dieser App benötigen eine passende Referenz, keinen universellen Gedächtniskapazitätsrang."],
    "evidence.corsi": ["Published Corsi norms exist: Kessels et al. used 70 healthy controls and a standardized block-tapping procedure. That is not a representative worldwide sample, nor an interchangeable norm for this screen layout, flash timing, touch/keyboard input and forward/backward options.", "Veröffentlichte Corsi-Normen existieren: Kessels et al. verwendeten 70 gesunde Kontrollpersonen und ein standardisiertes Block-Tipp-Verfahren. Das ist weder eine repräsentative Weltstichprobe noch eine austauschbare Norm für dieses Bildschirmlayout, Blinktempo, Touch-/Tastatureingaben und Vorwärts-/Rückwärtsvarianten."],
    "evidence.digits": ["Digit-span norms depend on presentation and scoring. Woods et al. used auditory digits and a mean-span estimator; this app presents visual digits and reports maximum correct span and partial credit. Those norms, including licensed clinical-test norms, cannot simply be transplanted.", "Ziffernspannennormen hängen von Darbietung und Wertung ab. Woods et al. verwendeten gehörte Ziffern und einen Mittelspannenschätzer. Diese App zeigt Ziffern visuell und berichtet maximale richtige Spanne und Teilpunkte. Solche Normen, einschließlich lizenzierter klinischer Testnormen, lassen sich nicht einfach übertragen."],
    "evidence.reasoning": ["Research on relational rule induction informs these exercise families. The app generates its own matrices and series with local difficulty bins, not standardized Raven items. Its estimated level is not an IQ score or an age-normed intelligence percentile.", "Forschung zur Ableitung relationaler Regeln informiert diese Aufgabenfamilien. Die App erzeugt eigene Matrizen und Folgen mit lokalen Schwierigkeitsstufen, keine standardisierten Raven-Aufgaben. Ihre geschätzte Stufe ist weder IQ-Wert noch altersnormiertes Intelligenzperzentil."],
    "evidence.arithmetic": ["Processing-speed research explains why timed reasoning must be interpreted alongside accuracy and task demands. Generated operands, operations and adaptive deadlines make this a custom arithmetic practice task, not a standardized arithmetic test with transferable norms.", "Verarbeitungstempoforschung erklärt, warum zeitbegrenztes Denken gemeinsam mit Genauigkeit und Aufgabenanforderungen betrachtet werden muss. Generierte Operanden, Operationen und adaptive Fristen ergeben eine eigene Rechenübung, keinen standardisierten Rechentest mit übertragbaren Normen."],
    "evidence.pvt": ["The original PVT-B study tested 74 healthy adults aged 22–45 in controlled sleep-loss experiments, using a dedicated handheld device. This app follows the three-minute/355-ms lapse convention, but browser timing, feedback and exclusions differ. The study is not a worldwide normative dataset; this score must not determine fitness to drive or work.", "Die ursprüngliche PVT-B-Studie untersuchte 74 gesunde Erwachsene im Alter von 22–45 Jahren in kontrollierten Schlafverlustexperimenten mit einem speziellen Handgerät. Diese App folgt der Drei-Minuten-/355-ms-Aussetzerkonvention, aber Browserzeiten, Rückmeldung und Ausschlüsse unterscheiden sich. Die Studie ist kein weltweiter Normdatensatz. Dieser Wert darf nicht die Fahrt- oder Arbeitstauglichkeit bestimmen."],
    "evidence.sternberg": ["Sternberg-style tasks examine recognition after holding a short set in memory. Set sizes, retention intervals, deadlines and speed–accuracy tradeoffs affect results; this adaptive version cannot inherit a general recognition percentile.", "Sternberg-Aufgaben untersuchen Erkennung nach dem Behalten einer kurzen Menge. Mengengrößen, Behaltensintervalle, Fristen und Tempo-Genauigkeits-Abwägungen beeinflussen Ergebnisse. Diese adaptive Version kann kein allgemeines Erkennungsperzentil übernehmen."],
    "evidence.pairs": ["Associative-recognition research distinguishes remembering individual items from their pairings. This app uses its own English/German words, pair loads and recombined probes. Its d-prime measures discrimination within this task, not a clinical memory rank.", "Assoziative Erkennungsforschung unterscheidet Erinnern einzelner Elemente von ihren Paarungen. Diese App verwendet eigene englische/deutsche Wörter, Paaranzahlen und neu kombinierte Testpaare. Ihr d-prime beschreibt Unterscheidung innerhalb dieser Aufgabe, keinen klinischen Gedächtnisrang."],
    "evidence.loci": ["Mnemonic-training research studies learned strategies, including the method of loci. This app teaches the strategy and measures ordered, catalogue-assisted reconstruction—not free recall, verified strategy use or general memory improvement. Self-paced study, optional cues, personal routes and object/person/card sets differ from study protocols and memory competitions. Recorded study time is descriptive context, not a validated speed score or a percentile among memory athletes.", "Mnemotechnikforschung untersucht erlernte Strategien einschließlich der Loci-Methode. Diese App erklärt die Strategie und misst geordnete, kataloggestützte Rekonstruktion – keinen freien Abruf, nachgewiesene Strategienutzung oder allgemeine Gedächtnisverbesserung. Selbstbestimmtes Lernen, optionale Hinweise, eigene Routen und Gegenstands-, Personen- oder Kartensätze unterscheiden sich von Studienabläufen und Gedächtniswettbewerben. Lernzeit ist beschreibender Kontext, kein validierter Geschwindigkeitswert oder Perzentil unter Gedächtnisathleten."],
    "evidence.stop": ["The stop-signal consensus specifies design and estimation safeguards. SSRT is available only when this app's checks pass. Meeting those checks does not create population norms or make one short round a diagnostic measure of impulsivity.", "Der Stoppsignal-Konsens spezifiziert Absicherungen für Design und Schätzung. SSRT ist nur verfügbar, wenn die Prüfungen dieser App erfüllt sind. Das erzeugt keine Bevölkerungsnormen und macht eine kurze Runde nicht zu einer diagnostischen Impulsivitätsmessung."],
    "evidence.control": ["AX-CPT-style tasks study maintaining a cue and using its context. Target frequencies, cue/probe timing and language-independent letter stimuli affect performance; this app's d-prime and AY/BX errors require task-matched references, not a generic attention percentile.", "AX-CPT-Aufgaben untersuchen das Behalten eines Hinweises und die Nutzung seines Kontexts. Zielhäufigkeiten, Hinweis-/Testzeiten und sprachunabhängige Buchstabenreize beeinflussen die Leistung. D-prime und AY-/BX-Fehler dieser App benötigen aufgabengleiche Referenzen, kein allgemeines Aufmerksamkeitsperzentil."],
    "evidence.switching": ["Task-switching studies examine changing between response rules. Cue timing, switch probability and response mapping alter the effect. This app's accuracy and reaction times are practice measures, not a standardized cognitive-flexibility rank.", "Aufgabenwechselforschung untersucht Wechsel zwischen Antwortregeln. Hinweiszeiten, Wechselwahrscheinlichkeit und Antwortzuordnung verändern den Effekt. Genauigkeit und Reaktionszeiten dieser App sind Übungsmaße, kein standardisierter Rang kognitiver Flexibilität."],
    "evidence.symbols": ["Digit-symbol studies show the influence of search and response speed, including age differences. This app's custom glyphs, changing codebook and multiple-choice input are not equivalent to written clinical substitution tests or their licensed norms.", "Ziffern-Symbol-Studien zeigen den Einfluss von Such- und Antworttempo einschließlich Altersunterschieden. Eigene Zeichen, wechselnder Schlüssel und Auswahleingaben dieser App sind nicht gleichwertig mit schriftlichen klinischen Zuordnungstests oder deren lizenzierten Normen."],
    "evidence.rotation": ["Mental-rotation research relates response time to angular disparity. These generated 3D figures, mirror alternatives and difficulty bins differ from standardized paper tests. Accuracy here is not a worldwide spatial-ability percentile.", "Mentale Rotationsforschung setzt Antwortzeit mit Winkelunterschieden in Beziehung. Diese generierten 3D-Figuren, Spiegelalternativen und Schwierigkeitsstufen unterscheiden sich von standardisierten Papiertests. Genauigkeit hier ist kein weltweites Perzentil räumlicher Fähigkeit."],
    "evidence.tower": ["Tower-of-London research investigates planning under move constraints. Generated puzzles, minimum paths, peg capacity and input timing define this version. Optimal solutions and excess moves are useful practice feedback, not interchangeable clinical planning norms.", "Tower-of-London-Forschung untersucht Planung unter Zugbeschränkungen. Generierte Rätsel, Mindestwege, Stabkapazität und Eingabezeiten definieren diese Version. Optimale Lösungen und zusätzliche Züge sind hilfreiche Übungsrückmeldungen, keine austauschbaren klinischen Planungsnormen."],
    "evidence.forecast": ["Proper-scoring research supports Brier scores and calibration for resolved probabilistic predictions. People predicting different events, horizons and base rates do not face equivalent difficulty. Your journal's score and calibration bins describe your recorded forecasts, not your rank among forecasters.", "Forschung zu korrekten Bewertungsregeln unterstützt Brier-Werte und Kalibrierung aufgelöster Wahrscheinlichkeitsprognosen. Menschen mit unterschiedlichen Ereignissen, Zeithorizonten und Basisraten bearbeiten nicht dieselbe Schwierigkeit. Journalwert und Kalibrierungsgruppen beschreiben deine erfassten Prognosen, keinen Rang unter Prognostikern."],
    "results.parameterNote": ["Comparisons keep parameters, device, input, relevant language, stimulus set, protocol, orientation and recorded processing deadline separate. The numerical journey always uses one setup, even when charts are overlaid.", "Vergleiche trennen Parameter, Gerät, Eingabe, relevante Sprache, Reizsatz, Protokoll, Ausrichtung und erfasste Verarbeitungsfrist. Der numerische Trainingsweg verwendet auch bei überlagerten Diagrammen nur identische Bedingungen."]
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
    const selected = (vars?.count === 1 || vars?.count === "1") && dictionary && has(dictionary, `${key}.one`) ? `${key}.one` : key;
    let translation = dictionary && has(dictionary, selected) ? dictionary[selected] : undefined;
    if (typeof translation !== "string") {
      console.warn(interpolate(pairs["i18n.missingKey"][0], { key, language }));
      translation = has(dictionaries.en, key) ? dictionaries.en[key] : undefined;
    }
    return typeof translation === "string" ? interpolate(translation, vars) : String(key);
  }

  window.CortexI18n = { dictionaries, t };
})();
