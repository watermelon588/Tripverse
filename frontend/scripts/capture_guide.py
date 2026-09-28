"""Re-shoot the /guide screenshots by driving the real app in headless Chrome.

Needs the frontend (5173) and backend (8000) running with real LLM keys. Uses only
the stdlib plus `websockets` (already in the backend venv via uvicorn[standard]):

    backend/.venv/Scripts/python frontend/scripts/capture_guide.py [--only one_shot|build]

Every run plans real trips in a fresh guest profile, so it takes a few minutes.
Shots land in frontend/public/guide/<name>.png.
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
        found = await self.js(f"""(() => {{
            const hits = [...document.querySelectorAll({json.dumps(selector)})]
              .filter(el => el.offsetParent !== null && el.textContent.trim().includes({json.dumps(text)}));
            const el = hits[{nth}]; if (!el) return false; el.scrollIntoView({{block: 'center'}}); el.click(); return true;
        }})()""")
        if not found:
            raise LookupError(f"No clickable element with text {text!r}")
        await asyncio.sleep(0.6)

    async def type(self, selector: str, text: str, enter: bool = False):
        """Set a React-controlled field's value; `enter` sends the chat composer."""
        ok = await self.js(f"""(() => {{ const el = document.querySelector({json.dumps(selector)});
            if (!el) return false;
            const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
            Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, {json.dumps(text)});
            el.dispatchEvent(new Event('input', {{bubbles: true}})); return true; }})()""")
        if not ok:
            raise LookupError(selector)
        await asyncio.sleep(0.4)
        if enter:
            await self.click("Plan", ".tv-chat__composer button")

    async def select(self, selector: str, value: str):
        await self.js(f"""(() => {{ const el = document.querySelector({json.dumps(selector)});
            const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
            set.call(el, {json.dumps(value)}); el.dispatchEvent(new Event('change', {{bubbles: true}})); }})()""")

    async def scroll_chat(self, where: str = "bottom"):
        await self.js(f"""(() => {{ const el = document.querySelector('.tv-chat__scroll'); if (!el) return;
            el.scrollTop = {'el.scrollHeight' if where == 'bottom' else '0'}; }})()""")
        await asyncio.sleep(0.5)

    async def scroll_to(self, text: str, selector: str = "h1, h2, h3, strong, p"):
        await self.js(f"""(() => {{ const el = [...document.querySelectorAll({json.dumps(selector)})]
            .find(el => el.textContent.includes({json.dumps(text)})); el?.scrollIntoView({{block: 'start'}}); }})()""")
        await asyncio.sleep(0.5)

    async def shot(self, name: str):
        await asyncio.sleep(0.8)
        data = await self.send("Page.captureScreenshot", format="png")
        OUT.mkdir(parents=True, exist_ok=True)
        (OUT / f"{name}.png").write_bytes(base64.b64decode(data["data"]))
        print("saved", name)


async def start_trip(page: Page, message: str, interests: str = "", avoid: str = ""):
    await page.idle(60)  # the planner ignores sends while it is still loading the trip
    await page.type(".tv-chat__composer textarea", message, enter=True)
    await page.wait("[...document.querySelectorAll('.tv-msg2--user')].length > 0", 20, "message sent")
    await page.idle()
    await page.wait("!!document.querySelector('.tv-onboarding')", 60, "trip details form")
    if interests:
        await page.type("input[placeholder^='e.g. food, quiet']", interests)
    if avoid:
        await page.type("input[placeholder^='e.g. early starts']", avoid)
    return page


async def one_shot(page: Page):
    await page.js("location.href = '/create'")
    await page.wait("!!document.querySelector('.tv-chat__composer textarea')", 60, "planner")
    await asyncio.sleep(2)
    await page.shot("01-planner-start")

    await start_trip(page, "Plan 3 days in Kyoto from Delhi. I love food and old temples.",
                     interests="food, temples", avoid="crowded attractions")
    await page.js("document.querySelector('.tv-onboarding').scrollIntoView({block: 'center'})")
    await page.shot("02-trip-details-form")
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

    await page.click("Route & map")
    await page.wait("!!document.querySelector('.tv-sv')", 20, "spatial panel")
    await page.click("3D graph")
    await asyncio.sleep(8)
    await page.shot("06-spatial-3d")
    await page.click("Map", ".tv-sv__modes button")
    await asyncio.sleep(8)
    await page.shot("07-route-map")
    await page.click("", "[aria-label='Close spatial view'].tv-iconbtn")

    await page.click("Budget")
    await page.wait("[...document.querySelectorAll('button')].some(b => b.textContent.includes('Suggest amounts'))", 60, "budget")
    await page.shot("08-budget-empty")
    await page.click("Suggest amounts")
    await page.wait("[...document.querySelectorAll('button')].some(b => b.textContent.includes('Use all suggestions'))", 180, "suggestions")
    await page.shot("09-budget-suggestions")
    await page.js("document.querySelector('.tv-budget__body').scrollTop = 520")
    await page.shot("10-budget-rows")
    await page.click("Close ×")


async def build(page: Page):
    await page.js("location.href = '/create'")
    await page.wait("!!document.querySelector('.tv-chat__composer textarea')", 60, "planner")
    await asyncio.sleep(2)
    await page.click("New trip")
    await asyncio.sleep(3)
    await start_trip(page, "3 days in Tokyo from Delhi", interests="food, quiet gardens", avoid="nightclubs")
    await page.click("Continue to planning options")
    await page.idle()
    await page.wait("!!document.querySelector('.tv-planning-choice')", 60, "planning choice")
    await page.click("Build with the agent")
    await page.type(".tv-planning-choice__build input[type=number]", "60000")
    await page.select(".tv-planning-choice__build select", "JPY")
    await page.type(".tv-planning-choice__build input[placeholder^='e.g. chill']", "chill, hidden gems")
    await page.js("document.querySelector('.tv-planning-choice__build').scrollIntoView({block: 'center'})")
    await page.shot("11-build-setup")

    await page.click("Start planning together")
    await page.idle(300)
    await page.wait("!!document.querySelector('.tv-copilot')", 60, "copilot panel")
    await page.scroll_chat("bottom")
    await page.shot("12-build-day-1")

    await page.click("+", ".tv-copilot__chips button")
    await page.idle()
    await page.scroll_chat("bottom")
    await page.shot("13-build-added")

    await page.click("D2", ".tv-copilot__days button")  # local switch: no request
    await page.shot("14-build-day-2-switch")
    await page.click("+", ".tv-copilot__chips button")
    await page.idle()
    await page.type(".tv-chat__composer textarea",
                    "I never want museums on this trip. Also add a great local lunch spot today.", enter=True)
    await page.idle(300)
    await page.scroll_chat("bottom")
    await page.shot("15-build-preferences")

    await page.click("D1", ".tv-copilot__days button")
    await page.click("Agent's notes for day 1")
    await page.shot("16-build-day-1-held")

    await page.click("Budget")
    await page.wait("!!document.querySelector('.tv-budget__summary')", 60, "budget")
    await asyncio.sleep(2)
    await page.shot("17-build-budget-sync")
    await page.click("Close ×")

    await page.click("Finish itinerary")
    await page.idle(300)
    await page.scroll_chat("bottom")
    await page.shot("18-build-complete")


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
