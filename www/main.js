// Ахтунг! 🍝!

import { downloadZip } from "https://cdn.jsdelivr.net/npm/client-zip/index.js";

// MediaRecorder polyfill with MP3 support
// https://github.com/ai/audio-recorder-polyfill
import AudioRecorder from "https://cdn.jsdelivr.net/npm/audio-recorder-polyfill/index.js";

import mpegEncoder from "https://cdn.jsdelivr.net/npm/audio-recorder-polyfill/mpeg-encoder/index.js";
AudioRecorder.encoder = mpegEncoder;
AudioRecorder.prototype.mimeType = "audio/mpeg";

window.MediaRecorder = AudioRecorder;

// --- Constants ---

const OGE_1_HEADER = "Task 1. You are going to read the text aloud. You have 1.5 minutes to read text silently, and then be ready to read it aloud. Remember that you will not have more than 2 minutes for reading aloud.";

const OGE_2_HEADER = "Task 2. You are going to take part in a telephone survey. You have to answer six questions. Give full answers to the questions. Remember that you have 40 seconds to answer each question.";
const OGE_2_HELLO = (x, y) => `Hello! It's the electronic assistant of the ${x}. We kindly ask you to take part in our survey.${y !== "NONE" ? ` ${y}. ` : " "}Please answer six questions. The survey is anonymous - you don't have to give your name. So, let's get started.`;
const OGE_2_GOODBYE = "That is the end of the survey. Thank you very much for your cooperation.";

const OGE_3_HEADER = (x) => `You are going to give a talk about ${x}.\nYou will have to start in 1.5 minutes and will speak for not more than 2 minutes (10-12 sentences).`;
const OGE_3_QUESTIONS_TITLE = "Remember to say:";
const OGE_3_FOOTER = "You have to talk continuously.";


const EGE_1_HEADER = "Task 1. Imagine that you are preparing a project with your friend. You have found some interesting material for the presentation and you want to read this text to your friend. You have 1.5 minutes to read the text silently, then be ready to read it out aloud. You will not have more than 1.5 minutes to read it.";

const EGE_2_HEADER = "Task 2. Study the advertisment.";
const EGE_2_TASK = (x) => `You are considering ${x} and you'd like to get more information. In 1.5 minutes you are to ask four direct questions to find out about the following:`;
const EGE_2_FOOTER = "You have 20 seconds to ask each question.";

const EGE_3_HEADER = "Task 3. You are going to give an interview. You have to answer five questions. Give full answers to the questions (2–3 sentences). Remember that you have 40 seconds to answer each question.";
const EGE_3_HELLO = (x) => `Hello everyone! It's the "Teenagers Round the World" Channel. Our new guest today is a teenager from Russia and we are going to discuss ${x}. We'd like to know out guest's point of view on this issue. Please answer five questions. So, let's get started.`;
const EGE_3_GOODBYE = "Thank you very much for your interview.";

const EGE_4_HEADER = (x) => `Task 4. Imagine that you and your friend are doing a school project “${x}”. You have found some photos to illustrate it but for technical reasons you cannot send them now. Leave a voice message to your friend explaining your choice of the photos and sharing some ideas about the project. In 2.5 minutes be ready to:`;
const EGE_4_FIRST = "explain the choice of the illustrations for the project by briefly describing them and noting the differences;";
const EGE_4_SECOND = (x) => `mention the advantages (1-2) of the ${x}`;
const EGE_4_THIRD = (x) => `mention the disadvantages (1-2) of the ${x}`;
const EGE_4_FOURTH = (x) => `explain your opinion on the subject of the project - ${x}`;
const EGE_4_FOOTER = "You will speak for not more than 3 minutes (12-15 sentences). You have to talk continuously.";
const EGE_4_IMG_COUNT = 2;

const VOICE_SPEED_KEY = "voice_speed";
const DEFAULT_VOICE_SPEED = 0.9;
const MIN_VOICE_SPEED = 0.5;

const SETTINGS_SCHEMA = [
	// Name, Storage key, Default value
	["cheats", "Читы", true]
];
const SETTINGS_KEY = (x) => `settings_${x}`;

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

function sleep(s) {
    return new Promise(resolve => setTimeout(resolve, s * 1000));
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

// Split and filter out empty lines
String.prototype.splitlines = function() {
	return this.split(/\r?\n/).filter((x) => x);
};

// https://stackoverflow.com/a/53490958
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => ("00" + b.toString(16)).slice(-2)).join("");
}

function setLocalStorageDefault(key, value) {
	if (localStorage.getItem(key) == null) {
		localStorage.setItem(key, value);
	}
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
	let checkboxes = document.querySelectorAll('input[name="task"]:checked');
	window.selected_tasks = Array.from(checkboxes).map(x => x.id);

	if (selected_tasks.length == 0) return;

	// Get variant count
	const count = await getFileContents(`${ge_type}/count`);

	// Disable all task stuff
	disableElementsByClassName("checkbox");
	disableElementsByClassName("continue-btn");

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
	link.href = "https://github.com/mrtnvgr/eggs";
	selector.appendChild(link);

	return selector;
}

function createTaskSelector() {
	// Get task count
	window.task_count = ge_type === "oge" ? 3 : 4;

	let task_selector = createSelector();

	let task_form = document.createElement("fieldset");
	task_selector.appendChild(task_form);

	let legend = document.createElement("legend");
	legend.innerHTML = "Задания варианта:";
	task_form.appendChild(legend);

	for (let i = 1; i <= task_count; i++) {
		let checkbox = createCheckbox(i, `${i} задание`);
		task_form.appendChild(checkbox);
	}

	let btn_wrapper = document.createElement("div");
	btn_wrapper.className = "buttons";
	task_form.appendChild(btn_wrapper);

	let continue_button = document.createElement("button");
	continue_button.className = "btn continue-btn";
	continue_button.innerHTML = "Начать";
	continue_button.addEventListener("click", select_task);
	btn_wrapper.appendChild(continue_button);

	switchBodyTo(task_selector);
}

function createCheckbox(id, text, default_state=true, handler=null) {
	let wrapper = document.createElement("div");

	let label = document.createElement("label");
	label.htmlFor = id;
	label.className = text.endsWith("задание") ? "task-name" : "";
	label.innerHTML = text;

	wrapper.appendChild(label);

	let toggler_wrapper = document.createElement("label");
	toggler_wrapper.className = "toggler-wrapper";
	wrapper.appendChild(toggler_wrapper);

	let checkbox = document.createElement("input");

	checkbox.type = "checkbox";
	checkbox.className = "checkbox";
	checkbox.name = "task";
	checkbox.id = id;
	checkbox.value = id;
	checkbox.checked = default_state;

	checkbox.onchange = handler;

	toggler_wrapper.appendChild(checkbox);

	let slider = document.createElement("div");
	slider.className = "toggler-slider";
	toggler_wrapper.appendChild(slider);

	let knob = document.createElement("div");
	knob.className = "toggler-knob";
	slider.appendChild(knob);

	return wrapper;
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
	task.innerHTML = ge_type === "oge" ? OGE_1_HEADER : EGE_1_HEADER;
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
	task.innerHTML = ge_type === "oge" ? OGE_2_HEADER : EGE_3_HEADER;
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

function createResearchPage(img_text, topic, questions) {
	let research_page = document.createElement("body");

	research_page.className = "center";
	research_page.id = "task-page";

	let wrapper = document.createElement("div");
	wrapper.id = "task-wrapper";
	wrapper.className = "wrapper";
	research_page.appendChild(wrapper);

	let task_wrapper = document.createElement("div");
	task_wrapper.className = "task-wrapper";
	wrapper.appendChild(task_wrapper);

	let header_task = document.createElement("p");
	header_task.className = "task";
	header_task.innerHTML = EGE_2_HEADER;
	task_wrapper.appendChild(header_task);

	let task_line = document.createElement("div");
	task_line.className = "task-line";
	wrapper.appendChild(task_line);

	let imgs_wrapper = document.createElement("div");
	imgs_wrapper.className = "images-wrapper";
	wrapper.appendChild(imgs_wrapper);

	let img_wrapper = document.createElement("div");
	img_wrapper.className = "image-wrapper";
	imgs_wrapper.appendChild(img_wrapper);

	let image_p = document.createElement("p");
	image_p.className = "image-text";
	image_p.innerHTML = img_text;
	img_wrapper.appendChild(image_p);

	let image = document.createElement("img");
	image.className = "task-image";
	image.src = `data/ege/${ge_variant}/2.png`;
	img_wrapper.appendChild(image);

	let main_task = document.createElement("p");
	main_task.className = "task";
	main_task.innerHTML = EGE_2_TASK(topic);
	wrapper.appendChild(main_task);

	let question_list = document.createElement("ol");
	question_list.className = "questions";
	wrapper.appendChild(question_list);

	for (let question of questions) {
		let li = document.createElement("li");
		li.innerHTML = question;
		question_list.appendChild(li);
	}

	wrapper.appendChild(task_line);

	let footer = document.createElement("p");
	footer.innerHTML = EGE_2_FOOTER;
	footer.className = "task";
	wrapper.appendChild(footer);

	switchBodyTo(research_page);

	return research_page;
}

function createProjectPage(topic, questions) {
	let project_page = document.createElement("body");

	project_page.className = "center";
	project_page.id = "task-page";

	let wrapper = document.createElement("div");
	wrapper.id = "task-wrapper";
	wrapper.className = "wrapper";
	project_page.appendChild(wrapper);

	let task_wrapper = document.createElement("div");
	task_wrapper.className = "task-wrapper";
	wrapper.appendChild(task_wrapper);

	let task = document.createElement("p");
	task.className = "task";
	task.innerHTML = EGE_4_HEADER(topic);
	task_wrapper.appendChild(task);

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
	footer_sentence.innerHTML = EGE_4_FOOTER;
	footer_wrapper.appendChild(footer_sentence);

	let imgs_wrapper = document.createElement("div");
	imgs_wrapper.className = "images-wrapper two-images-wrapper";
	wrapper.appendChild(imgs_wrapper);

	for (let i = 1; i <= EGE_4_IMG_COUNT; i++) {
		let img_wrapper = document.createElement("div");
		img_wrapper.className = "image-wrapper";
		imgs_wrapper.appendChild(img_wrapper);

		let image_p = document.createElement("p");
		image_p.className = "image-text";
		image_p.innerHTML = `Picture ${i}`;
		img_wrapper.appendChild(image_p);

		let image = document.createElement("img");
		image.className = "task-image";
		image.src = `data/ege/${ge_variant}/4_${i}.png`;
		img_wrapper.appendChild(image);
	}

	switchBodyTo(project_page);

	return project_page;
}

function showSettings() {
	let settings_selector = createSelector();

	let settings_form = document.createElement("fieldset");
	settings_selector.appendChild(settings_form);

	let legend = document.createElement("legend");
	legend.innerHTML = "Настройки:";
	settings_form.appendChild(legend);

	let createToggle = (id, label, def_value) => {
		let item = SETTINGS_KEY(id);
		let state = localStorage.getItem(item);

		return createCheckbox(id, label, state ? state : def_value, (e) => {
			localStorage.setItem(item, e.target.checked);
		});
	};

	for (let setting of SETTINGS_SCHEMA) {
		settings_form.appendChild(createToggle(setting[0], setting[1], setting[2]));
	}

	let vk_wrapper = document.createElement("div");
	vk_wrapper.className = "mm-settings-wrapper";
	settings_form.appendChild(vk_wrapper);

	let vk_icon = document.createElement("div");
	vk_icon.className = "vk";
	vk_wrapper.appendChild(vk_icon);

	let vk_link = document.createElement("p");
	vk_link.innerHTML = "Привязать";
	vk_wrapper.appendChild(vk_link);

	switchBodyTo(settings_selector);
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

	let is_fake = text == "Speaking" && seconds == 0;
	let is_recording = text == "Recording";
	let is_speaking = text == "Speaking";
	let sv_cheats_1 = localStorage.getItem("settings_cheats");

	// Create task timer wrapper
	let timer = document.createElement("div");
	timer.id = "task-timer";

	// Create countdown text
	let count = document.createElement("p");
	count.className = "tt-countdown";
	count.innerHTML = seconds.toMMSS();
	count.style = is_fake ? "display: none": "";
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
	pause.style = is_speaking && sv_cheats_1 ? "display: none" : "";

	pause.addEventListener("click", () => {
		togglePauseRecording();
		pause.classList.toggle("paused");
	});

	icon_wrapper.appendChild(pause);

	// Create skip button
	let skip = document.createElement("div");
	skip.className = "skip";
	skip.style = is_speaking && sv_cheats_1 ? "display: none" : "";

	skip.addEventListener("click", () => {
		skip.disable = true;
		skip.classList.toggle("skipped");
	});

	icon_wrapper.appendChild(skip);

	// Create "repeat question" button
	let repeat = document.createElement("div");
	repeat.className = "repeat";
	repeat.style = is_recording && sv_cheats_1 ? "" : "display: none";

	repeat.addEventListener("click", () => {
		repeat.disable = true;
		repeat.classList.toggle("repeat-please");
	});

	icon_wrapper.appendChild(repeat);

	// Create speed slider
	if (is_speaking && sv_cheats_1) {
		let vs_wrapper = document.createElement("div");
		vs_wrapper.className = "vs_wrapper";

		let slow = document.createElement("div");
		slow.className = "slow";
		vs_wrapper.appendChild(slow);

		let voiceSpeed = document.createElement("input");
		voiceSpeed.type = "range";
		voiceSpeed.min = MIN_VOICE_SPEED;
		voiceSpeed.max = 1.0;
		voiceSpeed.step = 0.01;
		voiceSpeed.value = localStorage.getItem(VOICE_SPEED_KEY);

		voiceSpeed.oninput = () => {
			localStorage.setItem(VOICE_SPEED_KEY, voiceSpeed.value);
			_tts_audio.playbackRate = voiceSpeed.value;
		};

		vs_wrapper.appendChild(voiceSpeed);

		let fast = document.createElement("div");
		fast.className = "fast";
		vs_wrapper.appendChild(fast);

		icon_wrapper.appendChild(vs_wrapper);
	}

	// Add timer to task page wrapper
	let wrapper = document.getElementById("task-wrapper");
	wrapper.classList.toggle("with-timer");
	wrapper.appendChild(timer);

	for (let i = is_fake ? 1 : seconds; i >= 0; i--) {
		count.innerHTML = i.toMMSS();

		// Check events every 100ms for better responsiveness
		for (let j = 10; j > 0; j--) {
			if (skip.classList.contains("skipped")) {
				i = 0;
				break;
			}

			if (pause.classList.contains("paused")) {
				j += 1;
			}

			if (repeat.classList.contains("repeat-please")) {
				i = seconds;

				repeat.remove();
				repeat.classList.remove("repeat-please");

				togglePauseRecording();
				await say(_current_tts_sentence);
				togglePauseRecording();

				break;
			}

			await sleep(0.1);

			if (is_fake && !_tts_audio.ended) {
				j += 1;
			} else if (is_fake && _tts_audio.ended) {
				break;
			}
		}
	}

	timer.remove();

	wrapper.classList.toggle("with-timer");
}

// --- Recorder ---

async function initRecorder() {
	window._files = [];
	window._chunks = [];

	try {
		let audio_stream = await navigator.mediaDevices.getUserMedia({audio: {
			autoGainControl: false,
			echoCancellation: false,
			noiseSuppression: false,
		}});
		window._recorder = new MediaRecorder(audio_stream);
	} catch (e) {
		console.error(`Failed to get microphone permissions: ${e}`);
		alert("Failed to get microphone permissions\nYour answers won't be recorded");
		return;
	}

	// In polyfill constructor options are not supported
	// and "dataavailable" is called only once
	_recorder.addEventListener("dataavailable", (e) => {
		_chunks.push(e.data);
	});

	_recorder.addEventListener("stop", (e) => _recorder.processed = true);
}

// Convenience wrappers with some checks
function startRecording() {
	if (typeof _recorder !== "undefined" && _recorder.state == "inactive") {
		_recorder.start();
		_recorder.processed = false;
	}
}

async function stopRecording() {
	if (typeof _recorder === "undefined" || _recorder.state != "recording") {
		return;
	}

	_recorder.stop();

	// In polyfill recorder stop is not blocking, so wait until processing is done
	while (_recorder.processed != true) {
		await sleep(0.1);
	}

	let blob = new Blob(_chunks);

	let task_directory = `Task ${current_task}`;

	let count = 0;
	for (let file of _files) {
		if (file.name.includes(task_directory) && file.name.endsWith(".mp3")) {
			count++;
		}
	}

	_files.push({
		name: `${task_directory}/${count+1}.mp3`,
		input: blob,
	});

	_chunks = [];
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
	let sv_cheats_1 = localStorage.getItem(SETTINGS_KEY("cheats"));
	let text_hash = await sha256(text);

	_tts_audio.src = `audio/${ge_type}_${ge_variant}_${text_hash}.mp3`;
	_tts_audio.playbackRate = sv_cheats_1 ? localStorage.getItem(VOICE_SPEED_KEY) : 1.0;
	_tts_audio.play();

	// Await for audio to finish
	await new Promise((resolve) => {
		_tts_audio.addEventListener("ended", resolve);
	})
}

// --- Download page ---

async function showDownloadPage() {
	let blob = await downloadZip(_files).blob();

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
	console.log(`Tasks: ${selected_tasks}`);

	// Remove last selector
	document.getElementById("selector-page").remove();

	// Start timer
	await showTimerPage("Be ready for the test", 5);

	// Run tasks
	for (let task of selected_tasks) {
		window.current_task = task;
		await start_task(task);

		if (task < selected_tasks.length) {
			await showTimerPage("Be ready for the next task", 5);
		}
	}

	await showDownloadPage();
}

// --- Task starters ---

async function start_task(task_number) {
	console.log(`Starting task ${task_number}`);

	let choose = (x, y) => ge_type === "oge" ? x : y;

	if (task_number == 1) {
		await start_text_reading_task();
	} else if (task_number == 2) {
		await choose(start_survey_task, start_research_task)();
	} else if (task_number == 3) {
		await choose(start_monologue_task, start_survey_task)();
	} else if (task_number == 4) {
		await start_project_task();
	}
}

async function start_text_reading_task() {
	let text = await getFileContents(`${ge_type}/${ge_variant}/1.txt`);

	_files.push({
		name: "Task 1/Text.txt",
		input: text,
	});

	let tr_page = createTextReadingPage(text);

	await startTaskTimer("Preparation", 90);

	await showTimerPage("Be ready for the answer", 5);

	startRecording();
	await startTaskTimer("Recording", ge_variant === "oge" ? 120 : 90);
	await stopRecording();

	tr_page.remove();
}

async function start_survey_task() {
	let is_oge = ge_type === "oge";

	let file = is_oge ? "2.txt" : "3.txt";
	let text = await getFileContents(`${ge_type}/${ge_variant}/${file}`);
	let sentences = text.splitlines();

	let survey = createSurveyPage();

	await startTaskTimer("Preparation", 20);

	if (is_oge) {
		let theme = sentences.shift();
		let goal = sentences.shift();

		say(OGE_2_HELLO(theme, goal));
	} else {
		say(EGE_3_HELLO(sentences.shift()));
	}

	// note: tts will be awaited in task timer
	await startTaskTimer("Speaking", 0);

	for (let sentence of sentences) {
		startRecording();

		window._current_tts_sentence = sentence;

		// note: tts will be awaited in task timer
		say(sentence);
		await startTaskTimer("Speaking", 0);

		await startTaskTimer("Recording", 40);
		await stopRecording();

		delete window._current_tts_sentence;
	}

	// note: tts will be awaited in task timer
	say(is_oge ? OGE_2_GOODBYE : EGE_3_GOODBYE);
	await startTaskTimer("Speaking", 0);

	survey.remove();
}

async function start_monologue_task() {
	let raw = await getFileContents(`${ge_type}/${ge_variant}/3.txt`);

	let questions = raw.splitlines();
	let topic = questions.shift();

	_files.push({
		name: "Task 3/Task.txt",
		input: `${OGE_3_HEADER(topic)[0]}\n\n${questions.join("\n")}`,
	});

	let monologue = createMonologuePage(topic, questions);

	await startTaskTimer("Preparation", 90);

	await showTimerPage("Be ready for the answer", 5);

	startRecording();
	await startTaskTimer("Recording", 120);
	await stopRecording();

	monologue.remove();
}

async function start_research_task() {
	let text = await getFileContents(`${ge_type}/${ge_variant}/2.txt`);

	let lines = text.splitlines();
	let img_text = lines.shift();
	let topic = lines.shift();

	let research = createResearchPage(img_text, topic, lines);

	await startTaskTimer("Preparation", 90);

	await showTimerPage("Be ready for the answer", 5);

	for (let i = 0; i < 4; i++) {
		startRecording();
		await startTaskTimer("Recording", 20);
		await stopRecording();
	}

	research.remove();
}

async function start_project_task() {
	let raw = await getFileContents(`${ge_type}/${ge_variant}/4.txt`);
	let lines = raw.splitlines();

	let topic = lines.shift();

	let questions = [];
	questions.push(EGE_4_FIRST);
	questions.push(EGE_4_SECOND(lines.shift()));
	questions.push(EGE_4_THIRD(lines.shift()));
	questions.push(EGE_4_FOURTH(lines.shift()));

	let project = createProjectPage(topic, questions);

	await startTaskTimer("Preparation", 150);

	await showTimerPage("Be ready for the answer", 5);

	startRecording();
	await startTaskTimer("Recording", 180);
	await stopRecording();

	project.remove();
}

// --- Startup hook ---

window.onload = function() {
	initRecorder();

	document.getElementById("oge").addEventListener("click", select_ge);
	document.getElementById("ege").addEventListener("click", select_ge);

	document.getElementById("settings").addEventListener("click", showSettings);

	for (let setting of SETTINGS_SCHEMA) {
		setLocalStorageDefault(SETTINGS_KEY(setting[0]), setting[2]);
	}

	setLocalStorageDefault(VOICE_SPEED_KEY, DEFAULT_VOICE_SPEED);
}
