// run with node after installing playwright and its chromium browser
// all requests are intercepted; these checks use local files and made-up results
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.TEST_BROWSER_CHANNEL || undefined });
  try {
    const page = await browser.newPage();
    const errors = [];
    const requests = [];
    let insufficient = false;
    let failRequest = false;
    page.on("pageerror", error => errors.push(error.message));
    const part = (type, area, cost) => ({
      project_type: type, status: "completed",
      estimate: { low: cost - 10000, typical: cost, high: cost + 10000, pricing_area: area },
      evidence: { confidence_label: "Low Confidence", comparable_count: 5 }
    });
    await page.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith("/api/")) {
        requests.push({ url: url.pathname, body: route.request().postDataJSON() });
        if (failRequest) return route.fulfill({ status: 503, contentType: "application/json", body: '{"detail":"Test service unavailable"}' });
        const renovation = part("renovation", 50, 100000);
        const extension = part("extension", 30, 120000);
        if (insufficient) { extension.status = "insufficient_data"; extension.estimate = null; }
        return route.fulfill({ contentType: "application/json", body: JSON.stringify({
          project_type: "renovation_and_extension", status: insufficient ? "insufficient_data" : "completed",
          renovation, extension, estimate: insufficient ? null : { low: 200000, typical: 220000, high: 240000 },
          budget: insufficient ? null : { amount: 250000, verdict_label: "Feasible" }
        }) });
      }
      if (url.host !== "test.invalid") return route.abort();
      if (url.pathname === "/js/config.js") return route.fulfill({ contentType: "text/javascript", body: 'window.APP_CONFIG = {API_BASE_URL: "https://test.invalid"};' });
      const file = path.resolve(__dirname, "..", "." + url.pathname);
      if (!file.startsWith(path.resolve(__dirname, "..") + path.sep)) return route.abort();
      try { await route.fulfill({ path: file }); } catch { await route.abort(); }
    });
    await page.goto("https://test.invalid/index.html");
    const next = () => page.locator("#fp-continue-btn").click();
    const back = () => page.locator("#fp-back-btn").click();
    await page.locator('[data-type="renovation_and_extension"]').click();
    await next();
    await next();
    assert.match(await page.locator("#fp-step-error").innerText(), /area greater than zero/);
    await page.locator("#fp-combined-affectedArea").fill("50");
    await page.locator("#fp-combined-bathrooms").fill("0");
    await page.locator("#fp-combined-recladding").selectOption("true");
    await next();
    assert.equal(await page.locator("#fp-combined-affectedArea").inputValue(), "");
    await page.locator("#fp-combined-affectedArea").fill("30");
    await page.locator("#fp-combined-kitchens").fill("0");
    await page.locator("#fp-combined-levels").fill("1.5");
    await next();
    assert.match(await page.locator("#fp-step-error").innerText(), /whole numbers/);
    await page.locator("#fp-combined-levels").fill("2");
    await page.locator("#fp-combined-roofing").selectOption("false");
    await back();
    assert.equal(await page.locator("#fp-combined-affectedArea").inputValue(), "50");
    assert.equal(await page.locator("#fp-combined-recladding").inputValue(), "true");
    await next();
    assert.equal(await page.locator("#fp-combined-affectedArea").inputValue(), "30");
    await next();
    await page.locator("#fp-budget-input").fill("250000");
    await next();
    const review = await page.locator("#fp-step-content").innerText();
    assert.match(review, /Renovation details/i);
    assert.match(review, /Extension details/i);
    await page.locator('[data-goto="renovation_details"]').click();
    assert.equal(await page.locator("#fp-combined-bathrooms").inputValue(), "0");
    await next(); await next(); await next();
    failRequest = true;
    await next();
    await page.locator("#fp-state-error").waitFor({ state: "visible" });
    failRequest = false;
    await page.locator("#fp-error-retry-btn").click();
    await page.locator("#fp-results").waitFor({ state: "visible" });
    assert.match(await page.locator("#fp-results").innerText(), /220,000/);
    const sent = requests.at(-1);
    assert.equal(sent.url, "/api/feasibility/assess-combined");
    assert.equal(sent.body.renovation.area.affected_area, 50);
    assert.equal(sent.body.extension.area.affected_area, 30);
    assert.equal(sent.body.renovation.layout.bathrooms, 0);
    assert.equal(sent.body.extension.layout.kitchens, 0);
    assert.equal(sent.body.renovation.scope.recladding, true);
    assert.equal(sent.body.extension.scope.roofing, false);
    assert.equal(sent.body.budget, 250000);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    if (process.env.TEST_SCREENSHOT_DIR) {
      await fs.mkdir(process.env.TEST_SCREENSHOT_DIR, { recursive: true });
      await page.screenshot({ path: path.join(process.env.TEST_SCREENSHOT_DIR, "combined-result.png"), fullPage: true });
    }
    await page.locator("#fp-restart-btn").click();
    await page.locator('[data-type="renovation_and_extension"]').click();
    await next();
    assert.equal(await page.locator("#fp-combined-affectedArea").inputValue(), "");
    await page.locator("#fp-combined-affectedArea").fill("50");
    await next();
    await page.locator("#fp-combined-affectedArea").fill("30");
    await next();
    await page.locator("#fp-budget-input").fill("250000");
    await next();
    insufficient = true;
    await next();
    await page.locator("#fp-results").waitFor({ state: "visible" });
    assert.match(await page.locator("#fp-results").innerText(), /combined total is unavailable/);
    assert.doesNotMatch(await page.locator("#fp-results").innerText(), /Typical total/);
    await page.locator("#fp-restart-btn").click();
    for (const type of ["renovation", "extension", "new_build", "multi_unit"]) {
      await page.locator(`[data-type="${type}"]`).click();
      await next();
      assert.equal(await page.locator(type === "renovation" || type === "extension" ? "#fp-affected-area" : "#fp-floor-area").count(), 1);
      await back();
    }
    assert.deepEqual(errors, []);
    console.log("Passed: separate answers, validation, Back/Edit, payload, result, retry, restart, mobile width and existing options.");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
