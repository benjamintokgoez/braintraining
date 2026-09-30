(() => {
  const C = window.Cortex;
  const font = '"Segoe UI", Aptos, Calibri, sans-serif';
  const colors = () => {
    const style = getComputedStyle(document.documentElement);
    return Object.fromEntries(["task-bg", "task-fg", "task-panel", "stim-red", "stim-green", "stim-blue", "stim-yellow",
      "stim-gray", "accent", "accent-fg", "border", "surface", "text", "text-muted"].map(name =>
      [name, style.getPropertyValue(`--cp-${name}`).trim()]));
  };
  C.Draw = {
    palette: null,
    init() { this.palette = colors(); },
    scene(paint, width = 420, height = 240) {
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const g = canvas.getContext("2d");
      g.fillStyle = this.palette["task-bg"]; g.fillRect(0, 0, width, height);
      g.fillStyle = this.palette["task-fg"]; g.strokeStyle = this.palette["task-fg"];
      g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = 2;
      paint(g, width, height);
      return canvas;
    },
    text(value, size = 54, color) {
      return this.scene((g, w, h) => {
        g.font = `600 ${size}px ${font}`;
        g.fillStyle = color || this.palette["task-fg"];
        g.fillText(String(value), w / 2, h / 2, w - 24);
      }, 420, 140);
    },
    series(values) {
      const terms = [...values, "?"];
      const split = terms.join("   ").length > 34;
      const middle = Math.ceil(terms.length / 2);
      const lines = split ? [terms.slice(0, middle), terms.slice(middle)] : [terms];
      return this.scene((g, w, h) => {
        g.font = `600 32px ${font}`;
        lines.forEach((line, i) => g.fillText(line.join("   "), w / 2, h * (i + 1) / (lines.length + 1), w - 24));
      }, 420, split ? 180 : 140);
    },
    grid(size, active = [], color, irregular = false) {
      return this.scene((g, w, h) => {
        const positions = irregular ? [[.13,.15],[.5,.12],[.8,.22],[.31,.35],[.63,.4],
          [.12,.65],[.43,.68],[.82,.65],[.64,.86]] :
          Array.from({ length: size * size }, (_, i) => [((i % size) + .5) / size, (Math.floor(i / size) + .5) / size]);
        const cell = irregular ? 40 : Math.floor(220 / size) - 8;
        positions.forEach(([x, y], i) => {
          g.fillStyle = active.includes(i) ? color || this.palette["stim-red"] : this.palette["task-panel"];
          g.strokeStyle = this.palette["stim-gray"];
          g.fillRect(x * w - cell / 2, y * h - cell / 2, cell, cell);
          g.strokeRect(x * w - cell / 2, y * h - cell / 2, cell, cell);
        });
      }, irregular ? 360 : 240, 240);
    },
    mask: () => C.Draw.scene((g, w, h) => {
      g.strokeStyle = C.Draw.palette["stim-gray"];
      for (let i = 0; i < 100; i++) {
        g.beginPath(); g.moveTo(C.rand(0, w), C.rand(0, h)); g.lineTo(C.rand(0, w), C.rand(0, h)); g.stroke();
      }
    }),
    vehicle(truck, g, x, y, size = 32) {
      g.fillStyle = this.palette["task-fg"];
      g.fillRect(x - size / 2, y - 5, size, 12);
      if (truck) g.fillRect(x - size / 2, y - 17, size * .6, 15);
      else { g.beginPath(); g.moveTo(x - 11, y - 5); g.lineTo(x - 5, y - 14); g.lineTo(x + 8, y - 14); g.lineTo(x + 14, y - 5); g.fill(); }
      for (const dx of [-size / 3, size / 3]) { g.beginPath(); g.arc(x + dx, y + 9, 5, 0, Math.PI * 2); g.fill(); }
    },
    matrixCell(cell, g, x, y, width, height) {
      g.save(); g.translate(x, y);
      if (cell.bits !== undefined) {
        const unit = Math.min(width, height) / 4;
        for (let i = 0; i < 9; i++) if (cell.bits & (1 << i)) {
          g.fillStyle = this.palette["task-fg"];
          g.fillRect((i % 3 - 1) * unit - unit * .3, (Math.floor(i / 3) - 1) * unit - unit * .3, unit * .6, unit * .6);
        }
      } else {
        const count = cell.count, radius = Math.min(width / (count * 2.4), height / 2.8) * (.5 + cell.size * .2);
        for (let i = 0; i < count; i++) {
          g.save(); g.translate((i - (count - 1) / 2) * width / (count + .2), 0);
          g.rotate(cell.orientation * Math.PI / 2);
          g.beginPath();
          const sides = cell.shape + 3;
          for (let v = 0; v < sides; v++) {
            const angle = v * Math.PI * 2 / sides - Math.PI / 2;
            const px = Math.cos(angle) * radius, py = Math.sin(angle) * radius;
            if (!v) g.moveTo(px, py); else g.lineTo(px, py);
          }
          g.closePath();
          g.fillStyle = cell.shade === 0 ? this.palette["task-bg"] :
            cell.shade === 1 ? this.palette["stim-gray"] : this.palette["task-fg"];
          g.strokeStyle = this.palette["task-fg"]; g.lineWidth = 1.5; g.fill(); g.stroke();
          // A small directional stem disambiguates rotations of symmetric polygons.
          g.beginPath(); g.moveTo(0, -radius); g.lineTo(0, -radius * 1.4); g.stroke();
          g.restore();
        }
      }
      g.restore();
    },
    svgCell(cell, x, y, width, height) {
      let content = "";
      if (cell.bits !== undefined) {
        const unit = Math.min(width, height) / 4;
        for (let i = 0; i < 9; i++) if (cell.bits & (1 << i)) content +=
          `<rect x="${(i % 3 - 1) * unit - unit * .3}" y="${(Math.floor(i / 3) - 1) * unit - unit * .3}"
            width="${unit * .6}" height="${unit * .6}" fill="var(--cp-task-fg)"/>`;
      } else {
        const count = cell.count, radius = Math.min(width / (count * 2.4), height / 2.8) * (.5 + cell.size * .2);
        for (let i = 0; i < count; i++) {
          const sides = cell.shape + 3, points = Array.from({ length: sides }, (_, v) => {
            const angle = v * Math.PI * 2 / sides - Math.PI / 2;
            return `${Math.cos(angle) * radius},${Math.sin(angle) * radius}`;
          }).join(" ");
          const fill = cell.shade === 0 ? "--cp-task-bg" : cell.shade === 1 ? "--cp-stim-gray" : "--cp-task-fg";
          content += `<g transform="translate(${(i - (count - 1) / 2) * width / (count + .2)} 0) rotate(${cell.orientation * 90})">
            <polygon points="${points}" fill="var(${fill})" stroke="var(--cp-task-fg)" stroke-width="1.5"/>
            <path d="M0 ${-radius}v${-radius * .4}" stroke="var(--cp-task-fg)" stroke-width="1.5"/></g>`;
        }
      }
      return `<g transform="translate(${x} ${y})">${content}</g>`;
    },
    options(labels, keys, pictures) {
      return labels.map((label, i) => ({ value: i, label, key: keys?.[i] || String(i + 1), picture: pictures?.[i] }));
    }
  };

  C.Audio = {
    voice: null, pending: null, stimulusSet: null,
    stimuli: {
      en: {
        // Speak letter names, not capital characters that some voices announce as "capital R".
        letters: ["see", "aitch", "kay", "ell", "cue", "are", "ess", "tee"],
        words: ["cat", "dog", "fish", "house", "moon", "book", "sun", "tree"]
      },
      de: {
        letters: ["eff", "ha", "ka", "ell", "em", "er", "ess", "weh"],
        words: ["Ball", "Baum", "Buch", "Fisch", "Haus", "Hund", "Mond", "Stern"]
      }
    },
    async unlock(language, kind, preserveVoice = false) {
      this.stop();
      if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return false;
      const findVoice = () => speechSynthesis.getVoices().find(v =>
        v.localService && v.lang.toLowerCase().startsWith(language));
      if (!preserveVoice) {
        this.voice = findVoice();
        if (!this.voice) {
          await new Promise(resolve => {
            const finish = () => {
              clearTimeout(timer);
              speechSynthesis.removeEventListener("voiceschanged", changed);
              resolve();
            };
            const changed = () => { if (findVoice()) finish(); };
            const timer = setTimeout(finish, 1500);
            speechSynthesis.addEventListener("voiceschanged", changed);
            changed();
          });
          this.voice = findVoice();
        }
      }
      if (!this.voice || !this.voice.localService || !this.voice.lang.toLowerCase().startsWith(language)) return false;
      this.stimulusSet = `speech-${kind}-${language}`;
      const silent = new SpeechSynthesisUtterance(" ");
      silent.voice = this.voice; silent.volume = 0; silent.lang = this.voice.lang;
      speechSynthesis.speak(silent);
      return true;
    },
    prepare(values, language, kind) {
      if (!this.voice) throw new Error("audio.unavailable");
      return values.map(value => {
        const utterance = new SpeechSynthesisUtterance(this.stimuli[language][kind][value]);
        utterance.voice = this.voice; utterance.lang = this.voice.lang; utterance.rate = 1;
        return { utterance, value };
      });
    },
    async play(sound, trial, maxDurationMs = 3000) {
      if (this.pending) {
        this.stop();
        throw new Error("audio.failed");
      }
      return new Promise((resolve, reject) => {
        const utterance = sound.utterance;
        const finish = error => {
          if (this.pending?.utterance !== utterance) return;
          clearTimeout(timer);
          this.pending = null;
          utterance.onstart = utterance.onend = utterance.onerror = null;
          if (error) reject(error); else resolve();
        };
        const timer = setTimeout(() => {
          finish(new Error("audio.failed"));
          speechSynthesis.cancel();
        }, maxDurationMs);
        this.pending = { utterance, cancel: () => finish(new DOMException("Aborted", "AbortError")) };
        utterance.onstart = () => { trial.audioOnset = C.now(); };
        utterance.onend = () => finish(Number.isFinite(trial.audioOnset) ? null : new Error("audio.failed"));
        utterance.onerror = () => finish(new Error("audio.failed"));
        try { speechSynthesis.speak(utterance); }
        catch (error) { console.error("Speech playback:", error); finish(new Error("audio.failed")); }
      });
    },
    stop() {
      this.pending?.cancel();
      if ("speechSynthesis" in window) speechSynthesis.cancel();
    }
  };
  if ("speechSynthesis" in window) speechSynthesis.getVoices();

  class Runner {
    constructor(task, params, mode, language, input) {
      const parameterError = C.parameterError(task, params);
      if (parameterError) throw new Error(parameterError);
      this.task = task; this.params = params; this.mode = mode; this.language = language; this.input = input;
      this.vibration = C.Storage.getSettings().vibration;
      this.controller = new AbortController(); this.signal = this.controller.signal;
      this.trials = []; this.practiceTrials = []; this.invalid = false; this.reasons = [];
      this.phase = "instructions"; this.current = null; this.pointers = new Set(); this.states = new Map();
      this.svgScenes = [];
      this.startedAt = C.iso(); this.startTime = C.now();
      this.canvas = document.getElementById("stage"); this.g = this.canvas.getContext("2d");
      this.responseStatus = document.getElementById("response-status");
      this.responseStatus.textContent = "";
      this.controls = document.getElementById("response-controls");
      this.controlButtons = [];
      const runnerStyle = getComputedStyle(document.getElementById("runner"));
      this.safeBottom = parseFloat(runnerStyle.paddingBottom) || 0;
      this.safeTop = parseFloat(runnerStyle.paddingTop) || 0;
      this.safeSide = Math.max(parseFloat(runnerStyle.paddingLeft) || 0, parseFloat(runnerStyle.paddingRight) || 0);
      this.palette = C.Draw.palette;
      this.resize();
      this.deviceClass = C.device(); this.refreshHz = C.Timing.refreshHz;
      this.orientation = screen.orientation?.type || (innerWidth > innerHeight ? "landscape" : "portrait");
      this.frameDuration = 0; this.frameCount = 0;
      this.keyHandler = event => {
        if (event.code === "Escape") {
          event.preventDefault(); this.abort();
          if (this.phase === "between") void C.UI.finish(this);
          return;
        }
        if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
        const key = event.key === " " ? "space" : event.key.toLowerCase();
        if (["enter", "space"].includes(key) && event.target?.closest?.("#abort, .response-control")) return;
        if (event.repeat) {
          const option = this.current?.options.find(o => o.key.toLowerCase() === key);
          if (option) {
            event.preventDefault();
            if (this.current.panel?.layout === "matches" && this.current.responseEnabled &&
              !this.current.responses.some(response => response.value === option.value)) {
              this.setResponseStatus("runner.releaseKey", { key: option.key.toUpperCase() });
            }
          }
          return;
        }
        if (this.current) {
          const option = this.current.options.find(o => o.key.toLowerCase() === key ||
            (o.value === "." && [".", ","].includes(key)) ||
            (key === "enter" && o.key === "Enter") || (key === "backspace" && o.key === "Backspace"));
          if (option || this.current.anywhere && (key === "space" || key === "enter")) {
            event.preventDefault(); this.respond(option?.value ?? 0, "keyboard");
          } else if (this.current.panel?.layout === "matches" && key.length === 1) {
            this.setResponseStatus("runner.useMatchKeys", { keys: this.current.options.map(o => o.key.toUpperCase()).join(" / ") });
          }
        } else if (this.task.id === "dual-nback" && ["practice", "block"].includes(this.phase) && ["a", "l"].includes(key)) {
          event.preventDefault();
          this.setResponseStatus("runner.inputWait");
        }
      };
      this.pointerHandler = event => {
        event.preventDefault();
        this.pointers.add(event.pointerId);
        if (!this.current) {
          if (this.task.id === "dual-nback") this.setResponseStatus("runner.inputWait");
          return;
        }
        if (this.pointers.size > 1 && !this.current.multi) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) * this.w / rect.width;
        const y = (event.clientY - rect.top) * this.h / rect.height;
        const buttonIndex = this.controlButtons.indexOf(event.target?.closest?.(".response-control"));
        const zone = buttonIndex >= 0 ? this.current.zones[buttonIndex] :
          this.current.zones.find(o => x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h);
        if (zone || this.current.anywhere) this.respond(zone?.value ?? 0, event.pointerType === "touch" ? "touch" : "mouse");
        else if (this.current.panel?.layout === "matches") this.setResponseStatus("runner.useMatchAreas");
      };
      this.releaseHandler = event => this.pointers.delete(event.pointerId);
      this.focusHandler = () => { if (this.phase === "block" || this.phase === "practice") this.abort("runner.focus"); };
      this.visibilityHandler = () => { if (document.hidden) this.focusHandler(); };
      this.orientationHandler = () => {
        const orientation = screen.orientation?.type || (innerWidth > innerHeight ? "landscape" : "portrait");
        const aspectChanged = Math.abs(innerWidth - this.w) > 64 && (innerWidth > innerHeight) !== (this.w > this.h);
        if ((orientation !== this.orientation || aspectChanged) && ["block", "practice"].includes(this.phase)) this.abort("runner.rotation");
        else this.layout();
      };
      addEventListener("keydown", this.keyHandler);
      this.canvas.addEventListener("pointerdown", this.pointerHandler);
      this.controls?.addEventListener("pointerdown", this.pointerHandler);
      addEventListener("pointerup", this.releaseHandler); addEventListener("pointercancel", this.releaseHandler);
      addEventListener("blur", this.focusHandler); addEventListener("visibilitychange", this.visibilityHandler);
      screen.orientation?.addEventListener("change", this.orientationHandler);
      addEventListener("orientationchange", this.orientationHandler);
      addEventListener("resize", this.orientationHandler);
      if (this.refreshHz < 50) this.invalidate("runner.refresh");
      this.blank = C.Draw.text("");
      this.feedbackImages = [C.Draw.text(C.t("runner.incorrect"), 36), C.Draw.text(C.t("runner.correct"), 36)];
      this.digits = Array.from({ length: 10 }, (_, i) => C.Draw.text(i, 48));
      this.countdownImages = [1, 2, 3].map(n => C.Draw.text(n, 64));
    }
    resize() {
      const rect = document.getElementById("runner").getBoundingClientRect();
      this.w = Math.floor(rect.width || innerWidth);
      this.h = Math.floor(rect.height || innerHeight);
      const dpr = Math.min(2, devicePixelRatio || 1);
      this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr);
      this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.stimulusHeight = this.h - this.safeBottom;
      this.viewport = { width: this.w, height: this.h, dpr: devicePixelRatio };
      this.layout();
    }
    layout() {
      const rect = document.getElementById("runner").getBoundingClientRect();
      const width = rect.width || innerWidth, height = rect.height || innerHeight;
      this.layoutScale = Math.min(width / this.w, height / this.h);
      this.layoutX = (width - this.w * this.layoutScale) / 2;
      this.layoutY = (height - this.h * this.layoutScale) / 2;
      Object.assign(this.canvas.style, {
        left: `${this.layoutX}px`, top: `${this.layoutY}px`,
        width: `${this.w * this.layoutScale}px`, height: `${this.h * this.layoutScale}px`
      });
      if (this.controls) Object.assign(this.controls.style, {
        width: `${this.w}px`, height: `${this.h}px`, left: `${this.layoutX}px`, top: `${this.layoutY}px`,
        transform: `scale(${this.layoutScale})`
      });
      for (const svg of this.svgScenes) Object.assign(svg.style, {
        left: `${this.layoutX}px`, top: `${this.layoutY}px`,
        width: `${this.w * this.layoutScale}px`, height: `${this.h * this.layoutScale}px`
      });
      this.layoutControls();
    }
    layoutControls() {
      if (!this.controlPanel) return;
      this.controlButtons.forEach((button, index) => {
        const zone = this.controlPanel.zones[index], minimum = 44 / this.layoutScale;
        const width = Math.max(zone.w, minimum), height = Math.max(zone.h, minimum);
        Object.assign(button.style, {
          left: `${C.clamp(zone.x - (width - zone.w) / 2, 0, this.w - width)}px`,
          top: `${C.clamp(zone.y - (height - zone.h) / 2, 0, this.h - height)}px`, width: `${width}px`, height: `${height}px`
        });
      });
    }
    syncControls(panel) {
      if (!this.controls) return;
      this.controls.hidden = !panel || !panel.zones.length;
      if (!panel) return;
      if (this.controlPanel !== panel) {
        this.controlPanel = panel;
        this.controlButtons = panel.zones.map(zone => {
          const button = document.createElement("button");
          button.type = "button"; button.className = "response-control";
          button.setAttribute("aria-label", this.input === "keyboard" ? `${zone.label} (${zone.key.toUpperCase()})` : zone.label);
          button.addEventListener("click", event => { if (event.detail === 0) this.respond(zone.value, "keyboard"); });
          return button;
        });
        this.controls.replaceChildren(...this.controlButtons);
        this.layoutControls();
      }
      this.controlButtons.forEach((button, index) => {
        button.disabled = !this.current || this.current.responseEnabled === false || this.current.done && !this.current.multi;
        if (this.current?.multi) button.setAttribute("aria-pressed",
          String(this.current.responses.some(response => response.value === panel.zones[index].value)));
        else button.removeAttribute("aria-pressed");
      });
    }
    setResponseStatus(key, vars = {}) {
      const heading = this.current?.responseHeading;
      const message = [heading, C.t(key, vars)].filter(Boolean).join("\n");
      if (this.responseStatus.textContent !== message) this.responseStatus.textContent = message;
    }
    invalidate(reason) {
      this.invalid = true;
      if (this.reasons.includes(reason)) return;
      this.reasons.push(reason);
      const key = this.reasons.find(key => key !== "runner.refresh") || "runner.timingWarning";
      const message = document.getElementById("runner-message"), value = C.t(key);
      if (message.textContent !== value) {
        message.textContent = value;
        message.title = value;
      }
    }
    abort(reason = "runner.aborted") {
      if (this.finished || this.signal.aborted) return;
      this.invalidate(reason);
      this.controller.abort();
      this.current = null;
      // Hidden tabs can suspend rAF indefinitely, so persist cancellation before waiting for another frame.
      if (["practice", "block", "between"].includes(this.phase)) void C.UI.finish(this);
    }
    check() { if (this.signal.aborted) throw new DOMException("Aborted", "AbortError"); }
    prepareOptions(options, layout = "standard") {
      const w = this.w, h = this.h, margin = Math.max(12, this.safeSide + 8), gap = 8;
      let cols = Math.min(options.length, 4);
      if (w >= 600 && w > h && !["matches", "grid"].includes(layout)) {
        cols = Math.min(options.length, Math.max(4, Math.floor((w - margin * 2 + gap) / (layout === "words" ? 144 : 88))));
      }
      if (layout === "matches") cols = Math.min(2, options.length);
      if (layout === "words" && w < 600 && h >= w) {
        // Longer labels get more horizontal space without shrinking hit targets.
        cols = options.length <= 8 ? 2 : 3;
      }
      let rows = Math.ceil(options.length / cols);
      const available = Math.min(h * (layout === "words" ? .6 : .41), rows * (["pictures", "matches"].includes(layout) ? 96 : 60) + gap * (rows - 1));
      const cellH = Math.max(48, (available - gap * (rows - 1)) / rows);
      const cellW = Math.min(layout === "grid" ? cellH : layout === "matches" ? 260 : 180,
        (w - margin * 2 - gap * (cols - 1)) / cols);
      const bottomMargin = Math.max(12, this.safeBottom + 8, h * .025);
      const top = h - rows * cellH - gap * (rows - 1) - bottomMargin;
      const left = (w - cols * cellW - gap * (cols - 1)) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = Math.ceil(h - top);
      const g = canvas.getContext("2d");
      g.textAlign = "center"; g.textBaseline = "middle";
      const zones = options.map((option, i) => {
        let x = left + (i % cols) * (cellW + gap), y = top + Math.floor(i / cols) * (cellH + gap);
        if (layout === "radial") {
          const centerY = (Math.max(72, this.safeTop + 64) + h - bottomMargin) / 2;
          const radius = Math.min(w / 2 - margin - 36, (h - bottomMargin - Math.max(72, this.safeTop + 64)) / 2 - 28);
          const angle = i * Math.PI / 4 - Math.PI / 2;
          return { ...option, x: w / 2 + Math.cos(angle) * radius - 24,
            y: centerY + Math.sin(angle) * radius - 24, w: 48, h: 48 };
        }
        if (layout === "corsi") {
          const positions = [[0,0],[2,.12],[4,0],[1,1],[3,1.15],[0,2.15],[2,2.05],[4,2.15],[3,3.15]];
          const unit = Math.min(56, (w - 2 * Math.max(16, margin) - 4 * gap) / 5), pitch = unit + gap;
          x = (w - 5 * unit - 4 * gap) / 2 + positions[i][0] * pitch;
          y = h - 3.15 * 56 - 48 - bottomMargin + positions[i][1] * 56;
          return { ...option, x, y, w: unit, h: 48 };
        }
        return { ...option, x, y, w: cellW, h: cellH };
      });
      // Corsi's irregular response panel is taller than the standard option grid.
      const panelTop = ["corsi", "radial"].includes(layout) ? Math.min(...zones.map(z => z.y)) : top;
      if (["corsi", "radial"].includes(layout)) canvas.height = Math.ceil(h - panelTop);
      for (const zone of zones) {
        const y = zone.y - panelTop;
        g.fillStyle = this.palette["task-panel"]; g.strokeStyle = this.palette["stim-gray"]; g.lineWidth = 1;
        g.fillRect(zone.x, y, zone.w, zone.h); g.strokeRect(zone.x, y, zone.w, zone.h);
        if (zone.picture) {
          g.drawImage(zone.picture, zone.x + 6, y + 4, zone.w - 12, zone.h - 24);
        }
        g.fillStyle = this.palette["task-fg"];
        const pictureLabel = zone.picture || layout === "pictures";
        const label = this.input === "keyboard" && !zone.picture && zone.key.length === 1 && zone.label !== zone.key ?
          `${zone.key.toUpperCase()}  ${zone.label}` : zone.label;
        const size = pictureLabel ? 13 : Math.max(14, Math.min(18, (zone.w - 10) / (label.length * .52)));
        g.font = `500 ${size}px ${font}`;
        g.fillText(label, zone.x + zone.w / 2, y + (pictureLabel ? zone.h - 11 : zone.h / 2), zone.w - 10);
      }
      return { canvas, zones, top: panelTop, options, layout };
    }
    prepareMatrix(item, panel) {
      let svg = this.matrixSvg;
      if (!svg) {
        svg = this.matrixSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("aria-hidden", "true");
        Object.assign(svg.style, { position: "absolute", pointerEvents: "none", visibility: "hidden" });
        document.getElementById("runner").append(svg);
        this.svgScenes.push(svg);
        this.layout();
      }
      svg.setAttribute("viewBox", `0 0 ${this.w} ${this.h}`);
      const top = Math.max(72, this.safeTop + 64);
      const available = Math.min(this.stimulusHeight - top - 12, panel.top - top - 24);
      const size = Math.min(330, available, this.w - 32), cell = size / 3;
      const left = (this.w - size) / 2;
      let markup = "";
      for (let i = 0; i < 9; i++) {
        const x = left + (i % 3) * cell, y = top + Math.floor(i / 3) * cell;
        markup += `<rect x="${x + 2}" y="${y + 2}" width="${cell - 4}" height="${cell - 4}" fill="var(--cp-task-bg)" stroke="var(--cp-stim-gray)"/>`;
        markup += i === 8 ? `<text x="${x + cell / 2}" y="${y + cell * .65}" text-anchor="middle" font-size="${cell / 2}" fill="var(--cp-task-fg)">?</text>` :
          C.Draw.svgCell(item.cells[i], x + cell / 2, y + cell / 2, cell - 10, cell - 10);
      }
      for (let i = 0; i < panel.zones.length; i++) {
        const zone = panel.zones[i];
        markup += C.Draw.svgCell(item.options[i], zone.x + zone.w / 2, zone.y + (zone.h - 20) / 2, zone.w - 12, zone.h - 28);
      }
      svg.innerHTML = markup;
      return { svg };
    }
    paint(scene, panel, entered = [], counter = null) {
      const g = this.g;
      g.fillStyle = this.palette["task-bg"]; g.fillRect(0, 0, this.w, this.h);
      if (this.visibleSvg) this.visibleSvg.style.visibility = "hidden";
      this.visibleSvg = scene?.svg || null;
      if (this.visibleSvg) this.visibleSvg.style.visibility = "visible";
      if (scene && !scene.svg) {
        const areaHeight = Math.min(this.stimulusHeight, panel ? panel.top - (panel.layout === "matches" ? 80 : 42) : this.stimulusHeight);
        const topMargin = Math.max(72, this.safeTop + 64);
        const maxH = Math.max(20, areaHeight - topMargin - 12);
        const scale = Math.min(1, (this.w - 24) / scene.width, maxH / scene.height);
        const width = scene.width * scale, height = scene.height * scale;
        const x = (this.w - width) / 2, y = topMargin + Math.max(0, (areaHeight - topMargin - height) / 2);
        if (scene.layers) {
          for (const layer of scene.layers) g.drawImage(layer.scene, x + layer.x * scale, y + layer.y * scale,
            layer.width * scale, layer.height * scale);
        } else g.drawImage(scene, x, y, width, height);
      }
      if (panel) g.drawImage(panel.canvas, 0, panel.top);
      if (panel?.layout === "matches") this.paintMatchControls();
      if (entered.length) {
        const text = entered.map(value => typeof value === "number" ? C.number(value) :
          value === "." ? C.t("response.decimal") : value).join(panel?.options.some(option => option.value === ".") ? "" : " ");
        g.fillStyle = this.palette["task-fg"]; g.textAlign = "center"; g.font = `28px ${font}`;
        g.fillText(text, this.w / 2, panel ? panel.top - 16 : this.stimulusHeight + 30, this.w - 24);
      }
      if (counter !== null) {
        g.fillStyle = this.palette["task-fg"]; g.font = `54px Consolas, monospace`; g.textAlign = "center";
        g.fillText(C.number(Math.floor(counter)), this.w / 2, this.stimulusHeight / 2);
      }
      this.syncControls(panel);
    }
    paintMatchControls() {
      const current = this.current;
      if (!current || current.panel?.layout !== "matches") return;
      const g = this.g;
      for (const zone of current.zones) {
        const recorded = current.responses.some(response => response.value === zone.value);
        g.fillStyle = this.palette[recorded ? "accent" : "task-panel"];
        g.fillRect(zone.x, zone.y, zone.w, zone.h);
        g.strokeStyle = this.palette[recorded ? "accent" : "stim-gray"];
        g.lineWidth = recorded ? 3 : 1;
        g.strokeRect(zone.x + 2, zone.y + 2, zone.w - 4, zone.h - 4);
        g.fillStyle = this.palette[recorded ? "accent-fg" : "task-fg"];
        g.textAlign = "center"; g.textBaseline = "middle"; g.font = `600 18px ${font}`;
        const label = this.input === "keyboard" ? `${zone.key.toUpperCase()} · ${zone.label}` : zone.label;
        g.fillText(label, zone.x + zone.w / 2, zone.y + zone.h * .34, zone.w - 16);
        g.font = `600 16px ${font}`;
        g.fillText(C.t(recorded ? "runner.matchRecorded" : !current.responseEnabled ?
          "runner.rememberOnly" : "runner.matchReady"), zone.x + zone.w / 2, zone.y + zone.h * .72, zone.w - 16);
      }
      const top = current.panel.top - 8;
      g.fillStyle = this.palette["task-panel"]; g.fillRect(12, top, this.w - 24, 4);
      g.fillStyle = this.palette["accent"];
      g.fillRect(12, top, (this.w - 24) * C.clamp(1 - (C.now() - current.startedAt) / current.deadline, 0, 1), 4);
    }
    async countdown() {
      for (let i = 2; i >= 0; i--) await C.Timing.wait(1000, this.signal, () => this.paint(this.countdownImages[i]));
    }
    async show(scene, ms, panel) {
      if (!this.current) this.responseStatus.textContent = "";
      return C.Timing.wait(ms, this.signal, () => this.paint(scene, panel));
    }
    respond(value, method) {
      const current = this.current;
      if (!current || current.done && !current.multi) return;
      if (current.responseEnabled === false) { this.setResponseStatus("runner.warmupInput"); return; }
      if (method !== this.input) { this.invalidate("runner.inputChanged"); }
      const time = C.now();
      if (current.falseStartPhase) { current.falseStarts.push(time); return; }
      if (time - current.startedAt >= current.deadline) {
        current.lateResponses.push({ value, time });
        if (current.panel?.layout === "matches") this.setResponseStatus("runner.inputLate");
        return;
      }
      if (current.interact) {
        const update = current.interact(value, time, current, current.trial);
        if (!update || typeof update !== "object") throw new TypeError("Interactive response must return a state update");
        if (update.accepted !== false) current.responses.push({ value: update.recordValue ?? value, time });
        if (update.scene) current.scene = update.scene;
        if (update.panel) {
          current.panel = update.panel; current.options = update.panel.options; current.zones = update.panel.zones;
        }
        if (update.done) { current.done = true; current.submittedAt = time; }
        this.paint(current.scene, current.panel, update.entered || []);
      } else if (current.multi) {
        if (!current.responses.some(r => r.value === value)) current.responses.push({ value, time });
        this.paintMatchControls();
        this.syncControls(current.panel);
        this.setResponseStatus("runner.inputRecorded", {
          responses: current.options.filter(option => current.responses.some(r => r.value === option.value)).map(option => option.label).join(" + ")
        });
      } else if (current.sequence) {
        if (value === "back") current.responses.pop();
        else if (value === "done") { current.done = true; current.submittedAt = time; }
        else current.responses.push({ value, time });
        if (current.maxLength && current.responses.length >= current.maxLength) current.done = true;
        this.paint(current.scene, current.panel, current.responses.map(r => current.displayResponse ? current.displayResponse(r.value) : r.value));
      } else {
        current.responses.push({ value, time }); current.done = true;
      }
    }
    async trial(spec) {
      this.check();
      if (!Number.isFinite(spec.deadline) || spec.deadline <= 0) throw new RangeError("Trial deadline must be positive");
      if (spec.fullDeadline !== undefined && (!Number.isFinite(spec.fullDeadline) || spec.fullDeadline < spec.deadline)) {
        throw new RangeError("Full deadline must include the response window");
      }
      if ((spec.timeline || []).some((event, index, events) => !Number.isFinite(event.atMs) || event.atMs < 0 ||
        event.atMs >= spec.deadline || index > 0 && event.atMs < events[index - 1].atMs)) {
        throw new RangeError("Trial timeline must be ordered within its response window");
      }
      const trial = { ...spec.meta, stimulusOnset: null, responseTime: null, rtMs: null, correct: false };
      let firstOnset = null, stimulusOnset = null;
      trial.phaseOnsets = [];
      for (const phase of spec.phases || []) {
        const onset = await this.show(phase.scene, phase.ms, phase.panel);
        firstOnset ??= onset;
        if (phase.stimulus) stimulusOnset = onset;
        trial.phaseOnsets.push({ onset, requestedMs: phase.ms, actualMs: C.now() - onset });
      }
      const panel = spec.panel;
      const current = { options: panel?.options || [], zones: panel?.zones || [], panel,
        responses: [], done: false, multi: spec.multi, sequence: spec.sequence,
        maxLength: spec.maxLength, anywhere: spec.anywhere, scene: spec.scene, falseStarts: [],
        falseStartPhase: spec.falseStartPhase, lateResponses: [], deadline: spec.deadline,
        interact: spec.interact, displayResponse: spec.displayResponse, trial,
        responseEnabled: spec.responseEnabled !== false, responseHeading: spec.responseHeading };
      const start = await C.Timing.frame(); this.check();
      current.startedAt = start;
      this.current = current;
      C.UI?.updateRunner?.(this);
      if (panel?.layout === "matches") {
        this.responseStatus.style.bottom = `${this.h - panel.top + 20}px`;
        this.setResponseStatus(current.responseEnabled ? "runner.matchPrompt" : "runner.warmupInput");
      } else this.responseStatus.textContent = "";
      trial.stimulusOnset = stimulusOnset ?? start;
      trial.rtReferenceOnset = spec.rtFromFirst ? firstOnset ?? start : start;
      trial.presentationOnset = firstOnset ?? start;
      trial.responseWindowOnset = start;
      if (spec.counter) this.paint(null, null, [], 0);
      else this.paint(spec.scene, panel);
      spec.onset?.(trial);
      const timeline = spec.timeline || [];
      let eventIndex = 0;
      const advanceTimeline = time => {
        while (eventIndex < timeline.length && time - start >= timeline[eventIndex].atMs) {
          const event = timeline[eventIndex++];
          if (time - start >= spec.deadline) { trial.forcedExclusion = true; continue; }
          if (event.scene) current.scene = event.scene;
          if (event.panel) {
            current.panel = event.panel; current.options = event.panel.options; current.zones = event.panel.zones;
          }
          this.paint(current.scene, current.panel);
          event.onset?.(trial, time);
        }
      };
      advanceTimeline(start);
      let frame = start, hidden = false;
      while (frame - start < spec.deadline && (!current.done || spec.multi || spec.waitFullWindow)) {
        const previousFrame = frame;
        frame = await C.Timing.frame(); this.check();
        this.frameDuration += frame - previousFrame; this.frameCount++;
        if (this.frameDuration >= 500) {
          const measured = this.frameCount * 1000 / this.frameDuration;
          this.minimumRefreshHz = Math.min(this.minimumRefreshHz ?? this.refreshHz, measured);
          if (measured < 50) this.invalidate("runner.refresh");
          this.frameDuration = 0; this.frameCount = 0;
        }
        if (spec.visibleMs !== undefined && !hidden && frame - start >= spec.visibleMs) {
          current.scene = spec.mask || this.blank;
          this.paint(current.scene, panel); hidden = true;
        }
        advanceTimeline(frame);
        if (panel?.layout === "matches") this.paintMatchControls();
        if (spec.counter) this.paint(null, null, [], frame - start);
      }
      this.current = null;
      this.syncControls(current.panel);
      if (panel?.layout === "matches") this.setResponseStatus("runner.responseClosed");
      trial.responses = current.responses;
      trial.lateResponses = current.lateResponses;
      trial.responseTime = spec.rtOnSubmit ? current.submittedAt ?? null : current.responses[0]?.time ?? null;
      trial.rtMs = trial.responseTime === null ? null : trial.responseTime - trial.rtReferenceOnset;
      trial.elapsedMs = frame - start;
      trial.response = current.responses.map(r => r.value);
      trial.correct = spec.evaluate ? spec.evaluate(trial.response, trial) : trial.response[0] === spec.answer;
      if (spec.rtOnSubmit && current.submittedAt === undefined) trial.correct = false;
      if (spec.fullDeadline !== undefined && spec.deadline < spec.fullDeadline) {
        trial.truncated = true;
        trial.requestedDeadlineMs = spec.fullDeadline;
        if (trial.responseTime === null) trial.unscored = true;
      }
      if (spec.enrich) spec.enrich(trial);
      const collection = this.phase === "practice" ? this.practiceTrials : this.trials;
      if (!spec.noRecord) collection.push(trial);
      if ((this.mode === "training" || this.phase === "practice") && !spec.noFeedback && !spec.noRecord) {
        await this.show((spec.feedbackImages || this.feedbackImages)[Number(trial.correct)], 250);
        if (this.vibration && navigator.vibrate) navigator.vibrate(15);
      }
      return trial;
    }
    state(variant, type, config) {
      const key = C.Adaptive.key(this.task.id, this.deviceClass, this.input, this.language,
        `${C.canonical(this.params)}|${variant}`);
      if (!this.states.has(key)) this.states.set(key, { key, state: this.mode === "assessment" || this.phase === "practice" ?
        C.Adaptive.create(type, config) : C.Adaptive.load(key, type, config) });
      return this.states.get(key);
    }
    adapt(entry, result) {
      if (this.mode === "training" && this.phase !== "practice") entry.state = C.Adaptive.update(entry.state, result);
      return entry.state.value;
    }
    async close() {
      this.current = null; C.Audio.stop();
      this.controls?.replaceChildren();
      if (this.controls) this.controls.hidden = true;
      this.responseStatus.textContent = "";
      this.svgScenes.forEach(svg => svg.remove());
      removeEventListener("keydown", this.keyHandler);
      this.canvas.removeEventListener("pointerdown", this.pointerHandler);
      this.controls?.removeEventListener("pointerdown", this.pointerHandler);
      removeEventListener("pointerup", this.releaseHandler); removeEventListener("pointercancel", this.releaseHandler);
      removeEventListener("blur", this.focusHandler); removeEventListener("visibilitychange", this.visibilityHandler);
      screen.orientation?.removeEventListener("change", this.orientationHandler);
      removeEventListener("orientationchange", this.orientationHandler);
      removeEventListener("resize", this.orientationHandler);
    }
  }
  C.Runner = Runner;
})();
