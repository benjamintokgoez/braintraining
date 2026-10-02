"use strict";

(() => {
  const C = window.Cortex;
  const categories = {
    en: {
      science: ["Biological processes", "Chemical reactions", "Physics"],
      technology: ["Computing", "Technology", "Inventions"],
      politics: ["Political concepts", "Political systems", "Political ideologies"],
      celebrities: ["American male film actors", "American film actresses", "British male film actors"],
      history: ["History", "Ancient history", "History of technology"],
      nature: ["Mammals", "Birds", "Trees"],
      space: ["Astronomical objects", "Planets", "Space probes"],
      arts: ["Art movements", "Music genres", "Works of art"],
      geography: ["Countries", "Islands", "Landforms"],
      sports: ["Sports", "Team sports", "Individual sports"]
    },
    de: {
      science: ["Biologischer Prozess", "Chemische Reaktion", "Physik"],
      technology: ["Technik", "Informatik", "Erfindung"],
      politics: ["Politisches System", "Politikwissenschaft", "Politische Ideologie"],
      celebrities: ["Filmschauspieler", "Popsänger", "Entertainer"],
      history: ["Geschichte", "Antike", "Technikgeschichte"],
      nature: ["Säugetiere", "Vögel", "Baum"],
      space: ["Astronomisches Objekt", "Raumfahrt", "Raumsonde"],
      arts: ["Kunstwerk", "Musikgenre"],
      geography: ["Staat", "Insel", "Geographischer Begriff"],
      sports: ["Sportart", "Olympische Sportart", "Sportveranstaltung"]
    }
  };
  const timeoutMs = 8000;
  let active = null, lastFailure = null;
  const key = () => {
    const settings = C.Storage.getSettings();
    return C.canonical({ date: C.today(), enabled: settings.dailyReadingEnabled,
      language: settings.language, interests: [...settings.dailyReadingInterests].sort() });
  };
  function cancel() {
    if (!active) return;
    active.cancelled = true;
    active.controller.abort();
    active = null;
  }
  function sync() {
    if (active && active.key !== key()) cancel();
  }
  function excerpt(raw, language) {
    const normalized = raw.replace(/\r\n?/gu, "\n").split(/\n\s*\n+/u)
      .map(paragraph => paragraph.replace(/\s+/gu, " ").trim()).filter(Boolean).join("\n\n");
    let text = "";
    const fits = value => value.length <= C.readingLimits.characters && C.wordCount(value) <= C.readingLimits.words;
    for (const { segment } of new Intl.Segmenter(language, { granularity: "sentence" }).segment(normalized)) {
      const next = text + segment;
      if (!fits(next.trim())) break;
      text = next;
    }
    text = text.trim();
    if (C.wordCount(text) < 25 && !fits(normalized)) {
      const words = normalized.split(/\s+/u).slice(0, C.readingLimits.words);
      while (words.length && !fits(`${words.join(" ")}...`)) words.pop();
      text = `${words.join(" ")}...`;
    }
    return { text, shortened: text !== normalized };
  }
  function paragraphs(text, language) {
    const result = [], segmenter = new Intl.Segmenter(language, { granularity: "sentence" });
    for (const block of text.split(/\n\s*\n+/u)) {
      let paragraph = "";
      for (const { segment } of segmenter.segment(block)) {
        const sentence = segment.trim();
        if (paragraph && C.wordCount(`${paragraph} ${sentence}`) > 65) {
          result.push(paragraph); paragraph = "";
        }
        paragraph = [paragraph, sentence].filter(Boolean).join(" ");
      }
      if (paragraph) result.push(paragraph);
    }
    return result;
  }
  function queryURL(language, interest) {
    if (!categories[language]?.[interest]) throw new RangeError("Unknown Wikipedia language or interest");
    const url = new URL(`https://${language}.wikipedia.org/w/api.php`);
    url.search = new URLSearchParams({
      action: "query", format: "json", formatversion: "2", origin: "*", maxlag: "5",
      generator: "search", gsrsearch: `incategory:"${categories[language][interest].join("|")}"`,
      gsrnamespace: "0", gsrlimit: "8", gsrsort: "random", prop: "extracts|info|pageprops|pageimages",
      piprop: "name", pilicense: "free", pilimit: "8",
      exintro: "1", explaintext: "1", exlimit: "8", inprop: "url", ppprop: "disambiguation"
    });
    return url.href;
  }
  function imageQueryURL(language, filename) {
    if (!categories[language] || typeof filename !== "string" || !filename.trim() ||
      filename.length > 300 || /[|\r\n]/u.test(filename)) throw new RangeError("Invalid Wikipedia image");
    const url = new URL(`https://${language}.wikipedia.org/w/api.php`);
    url.search = new URLSearchParams({ action: "query", format: "json", formatversion: "2", origin: "*", maxlag: "5",
      titles: `File:${filename}`, prop: "imageinfo", iiprop: "url|size|mime|thumbmime|extmetadata",
      iiurlwidth: "640", iiurlheight: "360", iiextmetadatalanguage: language,
      iiextmetadatafilter: "Artist|LicenseShortName|AttributionRequired" });
    return url.href;
  }
  function articleImageQueryURL(language, pageId) {
    const url = new URL(`https://${language}.wikipedia.org/w/api.php`);
    url.search = new URLSearchParams({ action: "query", format: "json", formatversion: "2", origin: "*", maxlag: "5",
      pageids: String(pageId), prop: "pageimages", piprop: "name", pilicense: "free" });
    return url.href;
  }
  function metadataText(raw) {
    if (typeof raw !== "string") return "";
    const template = document.createElement("template");
    template.innerHTML = raw;
    template.content.querySelectorAll("script,style,iframe,img,link,object").forEach(node => node.remove());
    template.content.querySelectorAll("br").forEach(node => node.replaceWith(document.createTextNode(" ")));
    template.content.querySelectorAll("p,div,li").forEach(node => node.append(document.createTextNode(" ")));
    return template.content.textContent.replace(/\s+/gu, " ").trim();
  }
  function fromImage(page) {
    const info = page?.imageinfo?.[0], metadata = info?.extmetadata;
    if (page?.imagerepository !== "shared" || !metadata ||
      !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(info.thumbmime || info.mime)) return null;
    const image = { url: info.thumburl || info.url, source: info.descriptionurl,
      width: info.thumbwidth || info.width, height: info.thumbheight || info.height,
      author: metadataText(metadata.Artist?.value), license: metadataText(metadata.LicenseShortName?.value) };
    if (!image.author && (metadata.AttributionRequired?.value === "true" || /^(CC BY|GFDL)/u.test(image.license))) return null;
    return C.readingImageError(image) ? null : image;
  }
  async function fetchJSON(url, signal) {
    const response = await fetch(url, { signal, credentials: "omit", referrerPolicy: "no-referrer", redirect: "error" });
    if (!response.ok) throw new Error("reading.unavailable");
    const data = await response.json();
    if (data?.error || !data || typeof data !== "object") throw new Error("reading.unavailable");
    return data;
  }
  function fromPage(page, { date, language, interest }) {
    if (!page || page.ns !== 0 || page.missing || page.pageprops && Object.hasOwn(page.pageprops, "disambiguation") ||
      typeof page.extract !== "string" || /\{\s*\\|\{\{|\[\[/u.test(page.extract) ||
      typeof page.title !== "string" || /^(List of |Liste |Liste der |Liste von )/u.test(page.title)) return null;
    const record = { date, language, interest, pageId: page.pageid, revisionId: page.lastrevid,
      title: page.title, ...excerpt(page.extract, language) };
    return C.readingRecordError(record) ? null : record;
  }
  const sourceURL = record => {
    if (C.readingRecordError(record) || !record) throw new TypeError("Invalid Wikipedia reading");
    return `https://${record.language}.wikipedia.org/w/index.php?curid=${record.pageId}&oldid=${record.revisionId}`;
  };
  const historyURL = record => {
    if (C.readingRecordError(record) || !record) throw new TypeError("Invalid Wikipedia reading");
    return `https://${record.language}.wikipedia.org/w/index.php?curid=${record.pageId}&action=history`;
  };
  async function load({ retry = false } = {}) {
    const settings = C.Storage.getSettings(), requestKey = key(), date = C.today(), language = settings.language;
    sync();
    if (!settings.dailyReadingEnabled) { cancel(); return { status: "disabled", record: null }; }
    const previous = C.Storage.getDailyReading();
    const cached = previous && previous.language === language && previous.date <= date &&
      settings.dailyReadingInterests.includes(previous.interest) ? previous : null;
    const upgrading = cached?.date === date;
    if (upgrading && (cached.imageChecked || cached.image || cached.imageUnavailable ||
      C.active || C.starting || document.hidden || navigator.onLine === false)) {
      cancel();
      return { status: "ready", record: cached, saved: !C.Storage.pending };
    }
    if (upgrading && active && !active.upgrading) cancel();
    if (C.active || C.starting || document.hidden) return { status: "paused", record: cached };
    if (navigator.onLine === false) return { status: "offline", record: cached };
    if (active?.key === requestKey) return active.promise;
    if (!retry && lastFailure?.key === requestKey) return { ...lastFailure.result, record: cached };
    cancel();
    const interests = [...settings.dailyReadingInterests].sort();
    const day = Math.floor(Date.parse(`${date}T12:00:00Z`) / 86400000);
    const interest = interests[day % interests.length];
    const job = { key: requestKey, controller: new AbortController(), cancelled: false, upgrading };
    active = job;
    job.promise = (async () => {
      const timer = setTimeout(() => job.controller.abort(new Error("reading.timeout")), timeoutMs);
      try {
        let record = upgrading ? C.clone(cached) : null, page;
        if (!upgrading) {
          const data = await fetchJSON(queryURL(language, interest), job.controller.signal);
          if (data?.batchcomplete === true && data.query === undefined && !data.error) throw new Error("reading.noResult");
          if (!Array.isArray(data?.query?.pages)) throw new Error("reading.unavailable");
          const candidates = data.query.pages.map(page => fromPage(page, { date, language, interest })).filter(Boolean)
            .filter(record => !cached || record.pageId !== cached.pageId);
          if (!candidates.length) throw new Error("reading.noResult");
          record = C.pick(candidates);
          page = data.query.pages.find(page => page.pageid === record.pageId);
        }
        if (job.cancelled || key() !== requestKey || C.active || C.starting || document.hidden) {
          return { status: "paused", record: cached };
        }
        try {
          if (upgrading) {
            const data = await fetchJSON(articleImageQueryURL(language, record.pageId), job.controller.signal);
            page = data.query?.pages?.find(page => page.pageid === record.pageId && !page.missing);
            if (!page) throw new Error("reading.imageUnavailable");
          }
          if (page.pageimage) {
            const data = await fetchJSON(imageQueryURL(language, page.pageimage), job.controller.signal);
            const image = data.query?.pages?.map(fromImage).find(Boolean);
            if (!image) throw new Error("reading.imageUnavailable");
            record.image = image;
          }
        } catch (error) {
          if (!job.cancelled) console.warn("Wikipedia illustration could not be loaded:", error);
          record.imageUnavailable = true;
        }
        record.imageChecked = true;
        if (job.cancelled || key() !== requestKey || C.active || C.starting || document.hidden) {
          return { status: "paused", record: cached };
        }
        const saved = C.Storage.setDailyReading(record);
        lastFailure = null;
        return { status: "ready", record, saved };
      } catch (error) {
        if (job.cancelled || key() !== requestKey) return { status: "paused", record: cached };
        const message = job.controller.signal.aborted ? "reading.timeout" :
          ["reading.noResult", "reading.unavailable"].includes(error.message) ? error.message : "reading.unavailable";
        console.warn("Daily Wikipedia reading could not be loaded:", error);
        const result = { status: "error", message, record: cached };
        lastFailure = { key: requestKey, result };
        return result;
      } finally {
        clearTimeout(timer);
        if (active === job) active = null;
      }
    })();
    return job.promise;
  }
  C.Reading = { load, cancel, sync, key, excerpt, paragraphs, fromPage, queryURL, imageQueryURL, fromImage,
    sourceURL, historyURL, timeoutMs,
    seconds: record => Math.ceil((C.wordCount(record.title) + C.wordCount(record.text)) / 120 * 60) };
})();
