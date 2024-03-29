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
    goal = f" {y}. " if y != "NONE" else " "
    return f"Hello! It's the electronic assistant of the {x}. We kindly ask you to take part in our survey.{goal}Please answer six questions. The survey is anonymous - you don't have to give your name. So, let's get started."

OGE_2_GOODBYE = "That is the end of the survey. Thank you very much for your cooperation."


EGE_3_HELLO = lambda y: f"Hello everyone! It's the \"Teenagers Round the World\" Channel. Our new guest today is a teenager from Russia and we are going to discuss {y}. We'd like to know out guest's point of view on this issue. Please answer five questions. So, let's get started."
EGE_3_GOODBYE = "Thank you very much for your interview."


LOCALES = ["en-GB"]
BLACKLIST = ["en-GB-MaisieNeural", "en-US-AnaNeural", "en-GB-ThomasNeural"]

def download_file(url, path):
    with open(path, "wb") as f:
        f.write(requests.get(url).content)

async def select_random_voice(page, current_voice):
    # Get all options from select element
    options = await page.querySelectorAllEval('select[name="charecter"] option', "(options) => options.map(option => option.value)")

    options = [option for option in options if option[:5] in LOCALES and not option in BLACKLIST]

    if current_voice in options:
        options.remove(current_voice)

    new_voice = random.choice(options)
    await page.select('select[name="charecter"]', new_voice)

    return new_voice

async def get_speech_url(page, text):
    await page.waitForSelector("#text")
    await page.evaluate("text => document.querySelector('#text').value = text", text);

    await page.waitForSelector("#submit")
    await page.evaluate("document.getElementById('submit').click()");

    await page.waitForSelector("a[download]")
    return await page.querySelectorEval("a[download]", "a => a.href")

async def generate_surveys(page, ge_type, surveys):
    current_voice = None
    for i, survey in enumerate(surveys):
        variant = str(i + 1)

        task_file = "2.txt" if ge_type == "oge" else "3.txt"
        text_path = os.path.join("www", "data", ge_type, variant, task_file)
        print(text_path)

        text = open(text_path).read()
        sentences = [x for x in text.split("\n") if x]

        if ge_type == "oge":
            theme = sentences.pop(0)
            goal = sentences.pop(0)
            sentences.append(OGE_2_HELLO(theme, goal))
        else:
            theme = sentences.pop(0)
            sentences.append(EGE_3_HELLO(theme))

        task_goodbye = OGE_2_GOODBYE if ge_type == "oge" else EGE_3_GOODBYE
        sentences.append(task_goodbye)

        current_voice = await select_random_voice(page, current_voice)

        for sentence in sentences:
            await asyncio.sleep(0.5)
            url = await get_speech_url(page, sentence)

            sentence_hash = hashlib.sha256(sentence.encode("utf-8")).hexdigest()
            audio_path = os.path.join("www", "audio", f"{ge_type}_{variant}_{sentence_hash}.mp3")

            if os.path.exists(audio_path):
                continue

            await asyncio.sleep(0.5)
            download_file(url, audio_path)
            print(f"{current_voice}: {url}")

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

    os.makedirs(os.path.join("www", "audio"), exist_ok=True)

    await generate_surveys(page, "oge", glob.glob("www/data/oge/*/2.txt"))
    await generate_surveys(page, "ege", glob.glob("www/data/ege/*/3.txt"))

    await browser.close()

asyncio.run(main())
