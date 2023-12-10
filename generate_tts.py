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


EGE_3_HELLO = lambda x, y: f"Hello everyone! It's the {x}. Our new guest today is a teenager from Russia and we are going to discuss {y}. We'd like to know out guest's point of view on this issue. Please answer five questions. So, let's get started."
EGE_3_GOODBYE = "Thank you very much for your interview."


LOCALES = ["en-GB"]
BLACKLIST = ["en-GB-MaisieNeural", "en-US-AnaNeural"]

def download_file(url, path):
    with open(path, "wb") as f:
        f.write(requests.get(url).content)

async def select_random_voice(page, current_voice):
    # Get all options from select element
    options = await page.querySelectorAllEval('select[name="charecter"] option', "(options) => options.map(option => option.value)")

    options = [option for option in options if option[:5] in LOCALES and not option in BLACKLIST]

    if current_voice in options:
        options.remove(current_voice)

    await page.select('select[name="charecter"]', random.choice(options))

async def get_speech_url(page, text):
    await page.waitForSelector("#text")
    await page.evaluate("text => document.querySelector('#text').value = text", text);

    await page.waitForSelector("#submit")
    await page.evaluate("document.getElementById('submit').click()");

    await page.waitForSelector("a[download]")
    return await page.querySelectorEval("a[download]", "a => a.href")

async def generate_sentence(page, prefix, variant, sentence):
    await asyncio.sleep(0.5)
    url = await get_speech_url(page, sentence)

    sentence_hash = hashlib.sha256(sentence.encode("utf-8")).hexdigest()
    audio_path = os.path.join("www", "audio", f"{prefix}_{variant}_{sentence_hash}.mp3")

    await asyncio.sleep(0.5)
    download_file(url, audio_path)
    print(url)

async def generate_surveys(page, ge_type, surveys):
    current_voice = None
    for i, survey in enumerate(surveys):
        variant = str(i + 1)

        task_file = "2.txt" if ge_type == "oge" else "3.txt"
        text_path = os.path.join("www", "data", ge_type, variant, task_file)
        print(text_path)

        text = open(text_path).read()
        sentences = [x for x in text.split("\n") if x]

        theme = sentences.pop(0)
        goal = sentences.pop(0)

        task_hello = OGE_2_HELLO if ge_type == "oge" else EGE_3_HELLO
        sentences.append(task_hello(theme, goal))

        task_goodbye = OGE_2_GOODBYE if ge_type == "oge" else EGE_3_GOODBYE
        sentences.append(task_goodbye)

        await select_random_voice(page, current_voice)

        for sentence in sentences:
            await generate_sentence(page, ge_type, variant, sentence)

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

    os.mkdir(os.path.join("www", "audio"))

    # await generate_surveys(page, "oge", glob.glob("www/data/oge/*/2.txt"))
    await generate_surveys(page, "ege", glob.glob("www/data/ege/*/3.txt"))

    await browser.close()

asyncio.run(main())
