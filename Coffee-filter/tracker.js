/* Records participant interactions on a stimulus page and reports them to the survey that embeds it.
   Condition info comes from window.STIM (written into each page by tracking.py).
   Inside an iframe (Qualtrics): posts {source: "stim-page", type: "complete", data} to the parent on Continue,
   and posts the page height whenever it changes so the parent can size the iframe.
   Standalone: redirects to ?return=<url> with the results appended, or just shows a confirmation. */
(function () {
  "use strict";
  var S = window.STIM || {};
  var embedded = window.parent && window.parent !== window;
  var t0 = performance.now();
  function now() { return Math.round(performance.now() - t0); }

  var events = [];
  function log(type, detail) { events.push([now(), type, detail || ""]); }

  var counts = { details_opens: 0, reviews_opens: 0, spec_opens: 0, all_toggles: 0, choice_changes: 0 };
  var perProduct = { A: { details: 0, reviews: 0 }, B: { details: 0, reviews: 0 }, C: { details: 0, reviews: 0 } };
  var firstChoiceMs = null;
  var specOpenSince = null, specOpenMs = 0;
  var allViewSince = null, allViewMs = 0;
  var aiActiveSince = null, aiViewMs = 0;
  var maxScrollPct = 0;
  var finished = false;

  log("load", S.page);

  // ---------- clicks (capture phase, so page handlers still run afterwards) ----------
  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("button");
    if (!btn || finished) return;

    if (btn.id === "continueBtn") {
      // Replace the prototype's alert: stop the page's own Continue handler and report instead.
      e.stopPropagation();
      e.preventDefault();
      if (!btn.disabled) finish();
      return;
    }

    var product = btn.getAttribute("data-product");
    if (btn.classList.contains("details-btn")) {
      setTimeout(function () {
        var open = document.getElementById("details-" + product).classList.contains("open");
        if (open) { counts.details_opens++; perProduct[product].details++; }
        log(open ? "details_open" : "details_close", product);
      }, 0);
    } else if (btn.classList.contains("rating-btn")) {
      setTimeout(function () {
        var open = document.getElementById("reviews-" + product).classList.contains("open");
        if (open) { counts.reviews_opens++; perProduct[product].reviews++; }
        log(open ? "reviews_open" : "reviews_close", product);
      }, 0);
    } else if (btn.classList.contains("close-reviews")) {
      log("reviews_close", product);
    } else if (btn.id === "specBtn") {
      setTimeout(function () {
        var open = document.getElementById("specPanel").classList.contains("open");
        if (open) { counts.spec_opens++; specOpenSince = now(); }
        else if (specOpenSince !== null) { specOpenMs += now() - specOpenSince; specOpenSince = null; }
        log(open ? "spec_open" : "spec_close");
      }, 0);
    } else if (/^all\w+Btn$/.test(btn.id)) {
      setTimeout(function () {
        var all = btn.getAttribute("aria-pressed") === "true";
        counts.all_toggles++;
        if (all) { allViewSince = now(); }
        else if (allViewSince !== null) { allViewMs += now() - allViewSince; allViewSince = null; }
        recommendedActive = !all;
        syncAI();
        log(all ? "view_all" : "view_recommended");
      }, 0);
    } else if (btn.classList.contains("choice")) {
      var letter = btn.getAttribute("data-choice");
      counts.choice_changes++;
      if (firstChoiceMs === null) firstChoiceMs = now();
      log("choice", letter);
    }
  }, true);

  // ---------- how long the AI output was on screen ----------
  // Interpretive pages: the Specification Explainer panel.
  // Filter pages: the "Recommended for You" section, counted only while the recommended view is active.
  var isFilter = S.ai_type === "filter";
  var aiOutput = isFilter ? document.querySelector("section.products") : document.querySelector(".assistance");
  var aiOnScreen = false, recommendedActive = true;
  function syncAI() {
    var active = aiOnScreen && recommendedActive;
    if (active && aiActiveSince === null) aiActiveSince = now();
    if (!active && aiActiveSince !== null) { aiViewMs += now() - aiActiveSince; aiActiveSince = null; }
  }
  if (aiOutput && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { aiOnScreen = en.intersectionRatio >= 0.5; });
      syncAI();
    }, { threshold: [0, 0.5, 1] }).observe(aiOutput);
  }

  // ---------- scroll depth ----------
  function trackScroll() {
    var doc = document.documentElement;
    var seen = (window.scrollY || doc.scrollTop) + window.innerHeight;
    var pct = Math.min(100, Math.round(100 * seen / Math.max(doc.scrollHeight, 1)));
    if (pct > maxScrollPct) maxScrollPct = pct;
  }
  window.addEventListener("scroll", trackScroll, { passive: true });
  trackScroll();

  // ---------- iframe height for the survey ----------
  function postHeight() {
    if (embedded) window.parent.postMessage({ source: "stim-page", type: "height", height: document.documentElement.scrollHeight }, "*");
  }
  if (embedded) {
    window.addEventListener("load", postHeight);
    if ("ResizeObserver" in window) new ResizeObserver(postHeight).observe(document.body);
  }

  // ---------- results ----------
  function finish() {
    finished = true;
    var t = now();
    if (specOpenSince !== null) specOpenMs += t - specOpenSince;
    if (allViewSince !== null) allViewMs += t - allViewSince;
    if (aiActiveSince !== null) aiViewMs += t - aiActiveSince;
    var sel = document.querySelector(".choice.selected");
    var letter = sel ? sel.getAttribute("data-choice") : "";
    log("continue", letter);
    // Option the AI output favors: the correct one when aligned, the misaligned AI target when misaligned.
    var aiTarget = S.alignment === "misaligned" ? S.lure : S.correct;

    var data = {
      page: S.page, category: S.category, ai_type: S.ai_type, alignment: S.alignment, transparency: S.transparency,
      correct: S.correct, lure: S.lure,
      choice: letter, choice_name: sel ? sel.textContent.trim() : "",
      chose_correct: letter === S.correct ? 1 : 0, chose_lure: letter === S.lure ? 1 : 0,
      ai_target: aiTarget, followed_ai: letter === aiTarget ? 1 : 0,
      rt_ms: t, first_choice_ms: firstChoiceMs === null ? "" : firstChoiceMs, choice_changes: counts.choice_changes,
      details_opens: counts.details_opens, reviews_opens: counts.reviews_opens,
      details_A: perProduct.A.details, details_B: perProduct.B.details, details_C: perProduct.C.details,
      reviews_A: perProduct.A.reviews, reviews_B: perProduct.B.reviews, reviews_C: perProduct.C.reviews,
      spec_opens: counts.spec_opens, spec_open_ms: specOpenMs,
      all_toggles: counts.all_toggles, all_view_ms: allViewMs,
      ai_view_ms: aiOutput ? aiViewMs : "",
      rec_view_ms: isFilter ? t - allViewMs : "",
      max_scroll_pct: embedded ? "" : maxScrollPct,  // inside the survey the iframe is page-height, so scrolling happens outside it
      events: JSON.stringify(events)
    };

    var cont = document.getElementById("continueBtn");
    if (cont) { cont.disabled = true; cont.textContent = "Saving…"; }

    if (embedded) {
      window.parent.postMessage({ source: "stim-page", type: "complete", data: data }, "*");
      return;
    }
    var ret = new URLSearchParams(window.location.search).get("return");
    if (ret) {
      var url = new URL(ret);
      Object.keys(data).forEach(function (k) { if (k !== "events") url.searchParams.set(S.category + "_" + k, data[k]); });
      window.location.href = url.toString();
      return;
    }
    var msg = document.getElementById("choiceMessage");
    if (msg) msg.textContent = "Response recorded. You selected " + data.choice_name + ".";
    if (cont) cont.textContent = "Recorded";
    console.log("stim-page result", data);
  }
})();
