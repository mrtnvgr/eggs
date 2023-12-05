import asyncio

from pyppeteer import launch
from pyppeteer.errors import PageError

import subprocess
import os
import glob

import random
import hashlib
import requests


chromium_path = subprocess.check_output(["which", "chromium"]).decode("utf-8").strip()

def OGE_2_HELLO(x, y):
    goal = f" We need to find out {y}. " if y != "NONE" else " "
    return f"Hello! It's the electronic assistant of the {x}. We kindly ask you to take part in our survey.{goal}Please answer six questions. The survey is anonymous - you don't have to give your name. So, let's get started."

LOCALES = ["en-GB"]
BLACKLIST = ["en-GB-MaisieNeural", "en-US-AnaNeural"]

async def select_random_voice(page, current_voice):
    # Get all options from select element
    options = await page.querySelectorAllEval('select[name="charecter"] option', "(options) => options.map(option => option.value)")

    options = [option for option in options if option[:5] in LOCALES and not option in BLACKLIST]

    if current_voice in options:
        options.remove(current_voice)

    await page.select('select[name="charecter"]', random.choice(options))

async def generate_speech(page, text):
    await page.waitForSelector("#text")
    await page.evaluate("text => document.querySelector('#text').value = text", text);

    await page.waitForSelector("#submit")
    # NOTE: click() doesn't work
    await page.evaluate("document.getElementById('submit').click()");

    await page.waitForSelector("a[download]")
    return await page.querySelectorEval("a[download]", "a => a.href")

def download_file(url, path):
    with open(path, "wb") as f:
        f.write(requests.get(url).content)

async def main():
    browser = await launch(executablePath=chromium_path)
    page = await browser.newPage()

    # Retry multiple times because of random ERR_CONNECTION_RESET errors
    attempts = 5
    while attempts > 0:
        try:
            await page.goto("https://crikk.com/text-to-speech")
            break
        except PageError:
            attempts -= 1

    os.mkdir("audio")

    surveys = glob.glob("data/oge/*/2.txt")

    current_voice = None

    for i, survey in enumerate(surveys):
        variant = str(i + 1)

        text_path = os.path.join("data", "oge", variant, "2.txt")

        text = open(text_path).read()
        sentences = [x for x in text.split("\n") if x]

        theme = sentences.pop(0)
        goal = sentences.pop(0)

        hello = OGE_2_HELLO(theme, goal)
        goodbye = sentences.pop()

        await select_random_voice(page, current_voice)

        for sentence in [hello, goodbye] + sentences:
            await asyncio.sleep(0.5)
            url = await generate_speech(page, sentence)

            sentence_hash = hashlib.sha256(sentence.encode("utf-8")).hexdigest()
            audio_path = os.path.join("audio", f"{sentence_hash}.mp3")

            await asyncio.sleep(0.5)
            download_file(url, audio_path)
            print(url)

    await browser.close()

asyncio.run(main())
