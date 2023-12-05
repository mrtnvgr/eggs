import { downloadZip } from "https://cdn.jsdelivr.net/npm/client-zip/index.js";

// --- Constants ---

const OGE_1_HEADER = "Task 1. You are going to read the text aloud. You have 1.5 minutes to read text silently, and then be ready to read it aloud. Remember that you will not have more than 2 minutes for reading aloud.";

const OGE_2_HEADER = "Task 2. You are going to take part in a telephone survey. You have to answer six questions. Give full answers to the questions. Remember that you have 40 seconds to answer each question.";
const OGE_2_HELLO = (x, y) => `Hello! It's the electronic assistant of the ${x}. We kindly ask you to take part in our survey.${y !== "NONE" ? ` We need to find out ${y}. ` : " "}Please answer six questions. The survey is anonymous - you don't have to give your name. So, let's get started.`;

const OGE_3_HEADER = (x) => `You are going to give a talk about ${x}.\nYou will have to start in 1.5 minutes and will speak for not more than 2 minutes (10-12 sentences).`;
const OGE_3_QUESTIONS_TITLE = "Remember to say:";
const OGE_3_FOOTER = "You have to talk continuously.";

// --- Helper functions ---

function disableElementsByClassName(className) {
	let elements = document.getElementsByClassName(className);
	for (let element of elements) {
		element.disabled = true;
	}
}

function switchBodyTo(element) {
	let bodies = document.getElementsByTagName("body");
	for (let body of bodies) {
		body.remove();
	}

	document.querySelector("html").appendChild(element);
}

async function getFileContents(url_path) {
    const host = window.location.host;
    const protocol = window.location.protocol;

	const response = await fetch(`${protocol}//${host}/data/${url_path}`);
	return await response.text();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms * 1000));
}

// https://stackoverflow.com/a/6313008
Number.prototype.toMMSS = function() {
	let hours   = Math.floor(this / 3600);
	let minutes = Math.floor((this - (hours * 3600)) / 60);
	let seconds = this - (hours * 3600) - (minutes * 60);

	if (minutes < 10) {minutes = "0"+minutes;}
	if (seconds < 10) {seconds = "0"+seconds;}

	return `${minutes}:${seconds}`;
}

// https://stackoverflow.com/a/53490958
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => ("00" + b.toString(16)).slice(-2)).join("");
}

// --- Main menu events ---

async function select_ge(event) {
	initTTS();

	// Get ge type
	window.ge_type = event.target.id;

	// Disable all ge buttons
	disableElementsByClassName("ge-btn");

	// Create task selector
	createTaskSelector();
}

async function select_task(event) {
	// Get selected task
	window.selected_task = event.target.id;

	// Get variant count
	const count = await getFileContents(`${ge_type}/count`);

	// Disable all task buttons
	disableElementsByClassName("task-btn");

	// Create new variant selector
	createVariantSelector(count);
}

// --- Factories ---

function createSelector() {
	let selector = document.createElement("body");
	selector.id = "selector-page";
	selector.className = "center";

	let logo = document.createElement("a");
	logo.className = "logo";
	logo.href = "https://github.com/mrtnvgr";
	selector.appendChild(logo);

	let link = document.createElement("a");
	link.className = "link";
	link.href = "https://github.com/mrtnvgr/trainoge";
	selector.appendChild(link);

	return selector;
}

function createTaskSelector() {
	// Get task count
	window.task_count = ge_type === "oge" ? 3 : 4;

	let task_selector = createSelector();

	// Create btn wrapper
	let task_buttons = document.createElement("div");
	task_buttons.className = "task-grid";
	task_selector.appendChild(task_buttons);

	// Add full variant button
	let fvbutton = document.createElement("button");

	fvbutton.className = "btn med-btn full-variant-btn task-btn";
	fvbutton.id = "full-variant";
	fvbutton.innerHTML = "Full";
	fvbutton.addEventListener("click", select_task);

	task_buttons.appendChild(fvbutton);

	// Add number buttons to variant selector
	for (let i = 1; i <= task_count; i++) {
		let button = document.createElement("button");

		button.className = "btn med-btn task-btn";
		button.id = i;
		button.innerHTML = i;

		button.addEventListener("click", select_task);

		task_buttons.appendChild(button);
	}

	switchBodyTo(task_selector);
}

function createVariantSelector(count) {
	let variant_selector = createSelector();

	let grid = document.createElement("div");
	grid.className = "var-grid";
	variant_selector.appendChild(grid);

	// Add buttons to variant selector
	for (let i = 1; i <= count; i++) {
		let button = document.createElement("button");

		button.className = "btn med-btn var-btn";
		button.id = i;
		button.innerHTML = i;

		button.addEventListener("click", start_ge);

		grid.appendChild(button);
	}

	switchBodyTo(variant_selector);
}

function createTimerPage(text) {
	let timer_page = document.createElement("body");

	timer_page.className = "center";
	timer_page.id = "timer-page";

	let wrapper = document.createElement("div");
	wrapper.className = "wrapper";
	timer_page.appendChild(wrapper);

	let timer = document.createElement("h1");
	timer.innerHTML = text;
	wrapper.appendChild(timer);

	let countdown = document.createElement("h1");
	countdown.id = "countdown";
	wrapper.appendChild(countdown);

	// Delete previous timer
	let previous_timer = document.getElementById("timer-page");
	if (previous_timer !== null) {
		previous_timer.remove();
	}

	document.querySelector("html").appendChild(timer_page);

	return timer_page;
}

function createTextReadingPage(text) {
	let tr_page = document.createElement("body");

	tr_page.className = "center";
	tr_page.id = "task-page";

	let wrapper = document.createElement("div");
	wrapper.id = "task-wrapper";
	wrapper.className = "wrapper";
	tr_page.appendChild(wrapper)

	let task_wrapper = document.createElement("div");
	task_wrapper.className = "task-wrapper";
	wrapper.appendChild(task_wrapper);

	let task = document.createElement("p");
	task.className = "task";
	task.innerHTML = OGE_1_HEADER;
	task_wrapper.appendChild(task);

	let line = document.createElement("div");
	line.className = "task-line";
	wrapper.appendChild(line);

	let text_wrapper = document.createElement("div");
	text_wrapper.className = "text-wrapper";
	wrapper.appendChild(text_wrapper);

	let text_p = document.createElement("p");
	text_p.className = "reading-text";
	text_p.innerHTML = text;

	text_wrapper.appendChild(text_p);

	switchBodyTo(tr_page);

	return tr_page;
}

function createSurveyPage() {
	let survey_page = document.createElement("body");

	survey_page.className = "center";
	survey_page.id = "task-page";

	let wrapper = document.createElement("div");
	wrapper.id = "task-wrapper";
	wrapper.className = "wrapper";
	survey_page.appendChild(wrapper);

	let task_wrapper = document.createElement("div");
	task_wrapper.className = "task-wrapper";
	wrapper.appendChild(task_wrapper);

	let task = document.createElement("p");
	task.className = "task";
	task.innerHTML = OGE_2_HEADER;
	task_wrapper.appendChild(task);

	switchBodyTo(survey_page);

	return survey_page;
}

function createMonologuePage(topic, questions) {
	let monologue_page = document.createElement("body");

	monologue_page.className = "center";
	monologue_page.id = "task-page";

	let wrapper = document.createElement("div");
	wrapper.id = "task-wrapper";
	wrapper.className = "wrapper";
	monologue_page.appendChild(wrapper);

	let header_wrapper = document.createElement("div");
	header_wrapper.className = "task-wrapper";
	wrapper.appendChild(header_wrapper);

	for (let sentence of OGE_3_HEADER(topic).split("\n")) {
		let header_sentence = document.createElement("p");
		header_sentence.className = "task";
		header_sentence.innerHTML = sentence;
		header_wrapper.appendChild(header_sentence);
	}

	let header_line = document.createElement("div");
	header_line.className = "task-line";
	wrapper.appendChild(header_line);

	let question_list = document.createElement("ul");
	question_list.className = "questions";
	wrapper.appendChild(question_list);

	for (let question of questions) {
		let li = document.createElement("li");
		li.innerHTML = question;
		question_list.appendChild(li);
	}

	let footer_line = document.createElement("div");
	footer_line.className = "task-line";
	wrapper.appendChild(footer_line);

	let footer_wrapper = document.createElement("div");
	footer_wrapper.className = "task-wrapper";
	wrapper.appendChild(footer_wrapper);

	let footer_sentence = document.createElement("p");
	footer_sentence.className = "task";
	footer_sentence.innerHTML = OGE_3_FOOTER;
	footer_wrapper.appendChild(footer_sentence);

	switchBodyTo(monologue_page);

	return monologue_page;
}

// --- Timer page ---

async function showTimerPage(text, time) {
	let bodies = document.getElementsByTagName("body");
	let body_exists = bodies.length > 0;
	if (body_exists) {
		bodies[0].hidden = true;
	}

	let timer = createTimerPage(text);

	let countdown = document.getElementById("countdown");

	for (let i = time; i >= 0; i--) {
		countdown.innerHTML = i;
		await sleep(1);
	}

	timer.remove();

	if (body_exists) {
		bodies[0].hidden = false;
	}
}

// --- Task timer ---

async function startTaskTimer(text, seconds) {
	// Delete previous timer
	let previous_timer = document.getElementById("task-timer");
	if (previous_timer !== null) {
		previous_timer.remove();
	}

	// Create task timer wrapper
	let timer = document.createElement("div");
	timer.id = "task-timer";

	// Create countdown text
	let count = document.createElement("p");
	count.className = "tt-countdown";
	count.innerHTML = seconds.toMMSS();
	timer.appendChild(count);

	// Create title
	let title = document.createElement("p");
	title.className = text == "Recording" ? "tt-title tt-recording" : "tt-title";
	title.innerHTML = text;
	timer.appendChild(title);

	// Icon wrapper
	let icon_wrapper = document.createElement("div");
	icon_wrapper.className = "icon-wrapper";
	timer.appendChild(icon_wrapper);

	// Create pause button
	let pause = document.createElement("div");
	pause.className = "pause";

	pause.addEventListener("click", () => {
		togglePauseRecording();
		pause.classList.toggle("paused");
	});

	icon_wrapper.appendChild(pause);

	// Create skip button
	let skip = document.createElement("div");
	skip.className = "skip";

	skip.addEventListener("click", () => {
		skip.disable = true;
		skip.classList.toggle("skipped");
	});

	icon_wrapper.appendChild(skip);

	// Create "repeat question" button
	let repeat_existance = typeof _current_tts_sentence !== "undefined" && text == "Recording";
	if (repeat_existance) {
		var repeat = document.createElement("div");
		repeat.className = "repeat";

		repeat.addEventListener("click", () => {
			repeat.disable = true;
			repeat.classList.toggle("repeat-please");
		});

		icon_wrapper.appendChild(repeat);
	}

	// Add timer to task page wrapper
	let wrapper = document.getElementById("task-wrapper");
	wrapper.classList.toggle("with-timer");
	wrapper.appendChild(timer);

	for (let i = seconds; i >= 0; i--) {
		count.innerHTML = i.toMMSS();

		// Check icon events every 100ms for better responsiveness
		for (let j = 10; j > 0; j--) {
			if (skip.classList.contains("skipped")) {
				i = 0;
				break;
			}

			if (pause.classList.contains("paused")) {
				j += 1;
			}

			if (repeat_existance && repeat.classList.contains("repeat-please")) {
				i = seconds;

				repeat.remove();
				repeat.classList.remove("repeat-please");

				togglePauseRecording();
				await say(_current_tts_sentence);
				togglePauseRecording();

				break;
			}

			await sleep(0.1);
		}
	}

	timer.remove();

	wrapper.classList.toggle("with-timer");
}

// --- Recorder ---

async function initRecorder() {
	window._recordings = [];
	window._chunks = [];

	try {
		let audio_stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		window._recorder = new MediaRecorder(audio_stream);
	} catch (e) {
		console.error(`Failed to get microphone permissions: ${e}`);
		alert("Failed to get microphone permissions\nYour answers won't be recorded");
		return;
	}

	_recorder.ondataavailable = (e) => {
		_chunks.push(e.data);
	};

	_recorder.onstop = (e) => {
		let blob = new Blob(_chunks);

		let task_directory = `Task ${current_task}`;

		let count = 0;
		for (let recording of _recordings) {
			if (recording.name.includes(task_directory)) {
				count++;
			}
		}

		_recordings.push({
			name: `${task_directory}/${count+1}.webm`,
			input: blob,
		})

		_chunks = [];
	};
}

// Convenience wrappers with some checks
function startRecording() {
	if (typeof _recorder !== "undefined" && _recorder.state == "inactive") {
		_recorder.start();
	}
}

function stopRecording() {
	if (typeof _recorder !== "undefined" && _recorder.state == "recording") {
		_recorder.stop();
	}
}

function togglePauseRecording() {
	if (typeof _recorder === "undefined" || _recorder.state == "inactive") {
		return;
	}

	if (_recorder.state == "recording") {
		_recorder.pause();
	} else {
		_recorder.resume();
	}
}

// --- TTS ---

async function initTTS() {
	window._tts_audio = document.createElement("audio");
	_tts_audio.src = "silence.mp3";
	_tts_audio.play().then(() => {
		_tts_audio.currentTime = 0;
		_tts_audio.pause();
		_tts_audio.muted = false;
	});
}

async function say(text) {
	let text_hash = await sha256(text);

	_tts_audio.src = `audio/${text_hash}.mp3`;
	_tts_audio.play();

	// Await for audio to finish
	await new Promise((resolve) => {
		_tts_audio.addEventListener("ended", resolve);
	})
}

// --- Download page ---

async function showDownloadPage() {
	console.log(_recordings);
	let blob = await downloadZip(_recordings).blob();
	console.log(blob);

	let download_page = document.createElement("body");

	download_page.className = "center";
	download_page.id = "download-page";

	let wrapper = document.createElement("div");
	wrapper.className = "wrapper";
	download_page.appendChild(wrapper);

	let download = document.createElement("a");
	download.className = "download";
	download.href = URL.createObjectURL(blob);
	download.download = `${ge_type}_${ge_variant}variant.zip`;
	wrapper.appendChild(download);

	switchBodyTo(download_page);
}

// --- Main GE loop ---

async function start_ge(event) {
	window.ge_variant = event.target.id;

	// Disable all variant buttons
	disableElementsByClassName("var-btn");

	// Log variables
	console.log(`GE type: ${ge_type}`);
	console.log(`GE variant: ${ge_variant}`);
	console.log(`Task count: ${task_count}`);
	console.log(`Task: ${selected_task}`); // `full-variant` - all tasks

	// Remove last selector
	document.getElementById("selector-page").remove();

	// Start timer
	await showTimerPage("Be ready for the test", 5);

	// Run tasks
	if (selected_task === "full-variant") {
		for (let i = 1; i <= task_count; i++) {
			window.current_task = `${i}`;
			await start_task(i);

			if (i < task_count) {
				await showTimerPage("Be ready for the next task", 5);
			}
		}
	} else {
		window.current_task = selected_task;
		await start_task(selected_task);
	}

	await showDownloadPage();
}

// --- Task starters ---

async function start_task(task_number) {
	console.log(`Starting task ${task_number}`);

	// Первое задание одинаковое и в ОГЭ и в ЕГЭ
	if (task_number == 1) {
		await start_text_reading_task();
	}

	if (ge_type === "oge") {
		if (task_number == 2) {
			await start_survey_task();
		} else if (task_number == 3) {
			await start_monologue_task();
		}
	}

	// NOTE: для 1, 2 и 4 ЕГЭ: await showTimerPage("Be ready for the answer", 5);
}

async function start_text_reading_task() {
	// Fetch task text
	let text = await getFileContents(`${ge_type}/${ge_variant}/1.txt`);

	let tr_page = createTextReadingPage(text);

	await startTaskTimer("Preparation", 90);

	await showTimerPage("Be ready for the answer", 5);

	startRecording();
	await startTaskTimer("Recording", 120);
	stopRecording();

	// Remove self
	tr_page.remove();
}

async function start_survey_task() {
	// Fetch task raw text
	let text = await getFileContents(`${ge_type}/${ge_variant}/2.txt`);

	// Get sentences and filter out empty lines
	let sentences = text.split("\n").filter(x => x);

	let survey = createSurveyPage();

	await startTaskTimer("Preparation", 20);

	let theme = sentences.shift();
	let goal = sentences.shift();

	let hello = OGE_2_HELLO(theme, goal);
	let goodbye = sentences.pop();

	await say(hello);

	for (let sentence of sentences) {
		window._current_tts_sentence = sentence;
		await say(sentence);
		delete window._current_tts_sentence;

		startRecording();
		await startTaskTimer("Recording", 40);
		stopRecording();
	}

	await say(goodbye);

	survey.remove();
}

async function start_monologue_task() {
	let raw = await getFileContents(`${ge_type}/${ge_variant}/3.txt`);
	let questions = raw.split("\n").filter(x => x);

	let topic = questions.shift();

	let monologue = createMonologuePage(topic, questions);

	await startTaskTimer("Preparation", 90);

	await showTimerPage("Be ready for the answer", 5);

	startRecording();
	await startTaskTimer("Recording", 120);
	stopRecording();

	monologue.remove();
}

// --- Startup hook ---

window.onload = function() {
	initRecorder();

	document.getElementById("oge").addEventListener("click", select_ge);
	document.getElementById("ege").addEventListener("click", select_ge);
}
