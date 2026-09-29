"""Re-shoot the /guide screenshots by driving the real app in headless Chrome.

Needs the frontend (5173) and backend (8000) running with real LLM keys. Uses only
the stdlib plus `websockets` (already in the backend venv via uvicorn[standard]):

    backend/.venv/Scripts/python frontend/scripts/capture_guide.py [--only one_shot|build]

Every run plans real trips in a fresh guest profile, so it takes several minutes.
Shots land in frontend/public/guide/<name>.png. After a run, look at every shot and
make sure its caption in pages/GuidePage.tsx still says what the picture shows.
"""

import argparse
import asyncio
import base64
import json
import shutil
import subprocess
import tempfile
import time
import urllib.request
from datetime import date, timedelta
from pathlib import Path

import websockets

APP = "http://localhost:5173"
OUT = Path(__file__).resolve().parents[1] / "public" / "guide"
CHROME = next((p for p in (
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    shutil.which("google-chrome") or "", shutil.which("chromium") or "",
) if p and Path(p).exists()), None)
PORT = 9333

# Dates relative to today, so the Tokyo trip sits inside the forecast window and the
# Kyoto trip lands on months-ahead "typical" weather.
KYOTO_START = (date.today() + timedelta(days=12)).isoformat()
TOKYO_START = (date.today() + timedelta(days=3)).isoformat()


class Page:
    def __init__(self, ws):
        self.ws, self.next_id = ws, 0

    async def send(self, method: str, **params):
        self.next_id += 1
        await self.ws.send(json.dumps({"id": self.next_id, "method": method, "params": params}))
        while True:
            message = json.loads(await self.ws.recv())
            if message.get("id") == self.next_id:
                if "error" in message:
                    raise RuntimeError(f"{method}: {message['error']}")
                return message.get("result", {})

    async def js(self, expression: str):
        result = await self.send("Runtime.evaluate", expression=expression, awaitPromise=True, returnByValue=True)
        if "exceptionDetails" in result:
            raise RuntimeError(result["exceptionDetails"])
        return result.get("result", {}).get("value")

    async def wait(self, expression: str, timeout: float = 30, label: str = ""):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            if await self.js(expression):
                return
            await asyncio.sleep(0.5)
        raise TimeoutError(label or expression)

    async def idle(self, timeout: float = 240):
        """Wait for the planner to finish thinking/streaming."""
        await asyncio.sleep(1.5)
        await self.wait("!document.querySelector('.tv-chat__thinking') && !document.querySelector('.tv-dots[aria-label=Writing]')",
                        timeout, "planner idle")
        await asyncio.sleep(1.5)

    async def click(self, text: str, selector: str = "button, summary, [role=tab]", nth: int = 0):
        # Waits for the element to be enabled: a click on a disabled button is silently dropped.
        find = f"""[...document.querySelectorAll({json.dumps(selector)})]
              .filter(el => el.offsetParent !== null && el.textContent.trim().includes({json.dumps(text)}))[{nth}]"""
        try:
            await self.wait(f"(() => {{ const el = {find}; return !!el && !el.disabled; }})()", 20)
        except TimeoutError:
            raise LookupError(f"No enabled element with text {text!r} in {selector!r}") from None
        await self.js(f"(() => {{ const el = {find}; el.scrollIntoView({{block: 'center'}}); el.click(); }})()")
        await asyncio.sleep(0.6)

    async def type(self, selector: str, text: str, enter: bool = False):
        """Set a React-controlled field's value; `enter` presses the send button of that composer."""
        ok = await self.js(f"""(() => {{ const el = document.querySelector({json.dumps(selector)});
            if (!el) return false;
            const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
            Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, {json.dumps(text)});
            el.dispatchEvent(new Event('input', {{bubbles: true}})); return true; }})()""")
        if not ok:
            raise LookupError(selector)
        await asyncio.sleep(0.4)
        if enter:
            await self.js(f"""document.querySelector({json.dumps(selector)}).closest('.tv-chat__composer')
                .querySelector('button.tv-comp__send, button[type=submit]').click()""")
            await asyncio.sleep(0.6)

    async def brief(self, label: str, value: str):
        """Fill one field of the trip brief, found by the start of its label."""
        ok = await self.js(f"""(() => {{
            const label = [...document.querySelectorAll('.tv-onboarding label')].find(l => l.textContent.trim().startsWith({json.dumps(label)}));
            const el = label?.querySelector('input, select'); if (!el) return false;
            const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
            Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, {json.dumps(value)});
            el.dispatchEvent(new Event('input', {{bubbles: true}})); el.dispatchEvent(new Event('change', {{bubbles: true}}));
            return true; }})()""")
        if not ok:
            raise LookupError(f"brief field {label!r}")
        await asyncio.sleep(0.2)

    async def scroll_chat(self, where: str = "bottom"):
        await self.js(f"""(() => {{ const el = document.querySelector('.tv-chat__scroll'); if (!el) return;
            el.scrollTop = {'el.scrollHeight' if where == 'bottom' else '0'}; }})()""")
        await asyncio.sleep(0.5)

    async def shot(self, name: str):
        await asyncio.sleep(0.8)
        data = await self.send("Page.captureScreenshot", format="png")
        OUT.mkdir(parents=True, exist_ok=True)
        (OUT / f"{name}.png").write_bytes(base64.b64decode(data["data"]))
        print("saved", name)


async def start_trip(page: Page, message: str):
    await page.idle(60)  # the planner ignores sends while it is still loading the trip
    await page.type(".tv-chat__composer textarea", message, enter=True)
    await page.wait("[...document.querySelectorAll('.tv-msg2--user')].length > 0", 20, "message sent")
    await page.idle()
    await page.wait("!!document.querySelector('.tv-onboarding')", 60, "trip brief")


async def open_studio(page: Page):
    await page.scroll_chat("bottom")
    await page.click("Open studio", ".tv-trip-card button")
    await page.wait("!!document.querySelector('.tv-studio')", 30, "studio")
    await asyncio.sleep(3)


async def one_shot(page: Page):
    await page.js("location.href = '/create'")
    await page.wait("!!document.querySelector('.tv-chat__composer textarea')", 60, "planner")
    await page.idle(60)  # the greeting, not the "Preparing your trip" row
    await page.shot("01-planner-start")

    await start_trip(page, "Plan 3 days in Kyoto from Delhi. I love food and old temples.")
    await page.brief("Start date", KYOTO_START)
    await page.brief("Adults", "2")
    await page.brief("Total budget", "120000")
    await page.brief("Currency", "INR")
    await page.brief("What interests you?", "food, temples")
    await page.brief("Anything to avoid?", "crowded attractions")
    await page.js("document.querySelector('.tv-onboarding').scrollIntoView({block: 'start'})")
    await page.shot("02-trip-brief")
    await page.js("document.querySelector('.tv-onboarding__guides').scrollIntoView({block: 'center'})")
    await page.shot("02b-guide-picker")
    await page.click("Continue to planning options")
    await page.idle()
    await page.wait("!!document.querySelector('.tv-planning-choice')", 60, "planning choice")
    await page.js("document.querySelector('.tv-planning-choice').scrollIntoView({block: 'center'})")
    await page.shot("03-planning-choice")

    await page.click("Generate full itinerary")
    await page.idle(300)
    await page.js("[...document.querySelectorAll('.tv-msg2--agent')].at(-1).scrollIntoView({block: 'start'})")
    await asyncio.sleep(0.5)
    await page.shot("04-one-shot-itinerary")
    await page.scroll_chat("bottom")
    await page.shot("05-one-shot-itinerary-end")

    # Follow-ups revise the existing plan in place.
    await page.type(".tv-chat__composer textarea", "Can you add the Arashiyama bamboo grove on the morning of day 2?", enter=True)
    await page.idle(300)
    await page.js("[...document.querySelectorAll('.tv-msg2--agent')].at(-1).scrollIntoView({block: 'start'})")
    await asyncio.sleep(0.5)
    await page.shot("05b-one-shot-revision")

    await open_studio(page)
    await page.click("Plan", "[role=tab]")
    await asyncio.sleep(2)
    await page.shot("06-studio-plan")
    await page.click("Sketch", "[role=tab]")
    await asyncio.sleep(5)  # the guide draws the overview
    await page.shot("07-studio-sketch")
    await page.click("", "[aria-label='Next page']")
    await asyncio.sleep(1.2)
    await page.shot("07b-sketch-drawing")  # mid-draw: the guide's pen on the page
    await asyncio.sleep(4)
    await page.shot("07c-sketch-day")
    await page.click("Map", "[role=tab]")
    await asyncio.sleep(15)  # base-map tiles are slow in headless Chrome
    await page.shot("08-studio-map")
    await page.click("3D", "[role=tab]")
    await asyncio.sleep(8)
    await page.shot("09-studio-3d")

    await page.click("Plan", "[role=tab]")
    await page.click("Export", ".tv-export__trigger")
    await page.shot("10-export-menu")
    await page.js("document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}))")
    await asyncio.sleep(0.5)

    await page.click("Budget", ".tv-studio__bar button")
    await page.wait("[...document.querySelectorAll('button')].some(b => b.textContent.includes('Suggest amounts'))", 60, "budget")
    await page.shot("11-budget-empty")
    await page.click("Suggest amounts")
    await page.wait("[...document.querySelectorAll('button')].some(b => b.textContent.includes('Use all suggestions'))", 180, "suggestions")
    await page.shot("12-budget-suggestions")
    await page.js("document.querySelector('.tv-budget__body').scrollTop = 520")
    await page.shot("13-budget-rows")
    await page.click("Close ×")


async def build(page: Page):
    await page.js("location.href = '/create'")
    await page.wait("!!document.querySelector('.tv-chat__composer textarea')", 60, "planner")
    await asyncio.sleep(2)
    await page.click("New trip")
    await asyncio.sleep(3)
    await start_trip(page, "3 days in Tokyo from Delhi")
    await page.brief("Start date", TOKYO_START)
    await page.brief("Total budget", "60000")
    await page.brief("Currency", "JPY")
    await page.brief("What interests you?", "food, quiet gardens")
    await page.brief("Anything to avoid?", "nightclubs")
    await page.click("Beni", ".tv-onboarding__guide")
    await page.click("Continue to planning options")
    await page.idle()
    await page.wait("!!document.querySelector('.tv-planning-choice')", 60, "planning choice")
    await page.click("Build with Beni")
    await page.idle(300)
    await page.wait("!!document.querySelector('.tv-copilot')", 60, "copilot panel")
    await page.scroll_chat("bottom")
    await page.shot("14-build-day-1")

    await page.click("+", ".tv-copilot__chips button")
    await page.idle()
    await page.scroll_chat("bottom")
    await page.shot("15-build-added")

    await page.click("D2", ".tv-copilot__days button")  # local switch: no request
    await page.shot("16-build-day-2-switch")
    await page.click("+", ".tv-copilot__chips button")
    await page.idle()
    await page.type(".tv-chat__composer textarea",
                    "I never want museums on this trip. Also add a great local lunch spot today.", enter=True)
    await page.idle(300)
    await page.scroll_chat("bottom")
    await page.shot("17-build-preferences")

    await page.click("D1", ".tv-copilot__days button")
    await page.click("Agent's notes for day 1")
    await page.shot("18-build-day-1-held")

    await page.click("Budget", ".tv-chat__bar button")
    await page.wait("!!document.querySelector('.tv-budget__summary')", 60, "budget")
    await asyncio.sleep(2)
    await page.shot("19-build-budget-sync")
    await page.click("Close ×")

    # The studio with the chat open beside the sketch: a change drawn live.
    await page.click("Open studio", ".tv-chat__bar button")
    await page.wait("!!document.querySelector('.tv-studio')", 30, "studio")
    await asyncio.sleep(2)
    await page.click("Sketch", "[role=tab]")
    await page.click("DAY 1", ".tv-studio__daywin button")
    await asyncio.sleep(5)
    await page.click("Chat", ".tv-studio__windows button")
    await asyncio.sleep(1.5)
    await page.type(".tv-studio .tv-chat__composer textarea", "Add a quiet garden to day 1 if it fits.", enter=True)
    try:
        await page.wait("!!document.querySelector('.tv-sketch .tv-guide.is-drawing')", 120, "live draw")
        await asyncio.sleep(0.6)
    except TimeoutError:
        print("no live draw seen; the agent may have declined the change")
    await page.shot("20-build-live-sketch")
    await page.idle(300)
    await asyncio.sleep(2)
    await page.shot("21-build-live-sketch-done")

    trip_path = await page.js("location.pathname")
    await page.click("", "[aria-label='Back to the chat']")
    await asyncio.sleep(2)
    await page.click("Finish itinerary")
    await page.idle(300)
    await page.scroll_chat("bottom")
    await page.shot("22-build-complete")

    # The same studio on a phone held upright: portrait sketch pages and bottom sheets.
    await page.send("Emulation.setDeviceMetricsOverride", width=390, height=844, deviceScaleFactor=2, mobile=True)
    await page.js(f"localStorage.setItem('tripverse-studio-tab', 'sketch'); location.href = {json.dumps(trip_path)}")
    await page.wait("!!document.querySelector('.tv-sketch__page')", 60, "phone sketch")
    await asyncio.sleep(3)
    await page.click("", "[aria-label='Next page']")
    await asyncio.sleep(5)
    await page.shot("23-phone-sketch")
    await page.send("Emulation.setDeviceMetricsOverride", width=1440, height=900, deviceScaleFactor=1, mobile=False)


async def main(only: str | None):
    if not CHROME:
        raise SystemExit("Chrome or Edge not found")
    profile = tempfile.mkdtemp(prefix="tripverse-guide-")
    chrome = subprocess.Popen([CHROME, "--headless=new", f"--remote-debugging-port={PORT}", f"--user-data-dir={profile}",
                               "--window-size=1440,900", "--hide-scrollbars", "--use-angle=swiftshader",
                               "--enable-unsafe-swiftshader", "about:blank"])
    try:
        for _ in range(40):
            try:
                targets = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json"))
                target = next(t for t in targets if t["type"] == "page")
                break
            except Exception:
                time.sleep(0.5)
        async with websockets.connect(target["webSocketDebuggerUrl"], max_size=None) as ws:
            page = Page(ws)
            await page.send("Page.enable")
            await page.send("Emulation.setDeviceMetricsOverride", width=1440, height=900, deviceScaleFactor=1, mobile=False)
            await page.send("Page.navigate", url=f"{APP}/create")
            await asyncio.sleep(3)
            try:
                if only in (None, "one_shot"):
                    await one_shot(page)
                if only in (None, "build"):
                    await build(page)
            except Exception:
                await page.shot("_failure")  # what the page showed when a step gave up; not used by the guide
                raise
    finally:
        chrome.terminate()
        shutil.rmtree(profile, ignore_errors=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", choices=["one_shot", "build"])
    asyncio.run(main(parser.parse_args().only))
