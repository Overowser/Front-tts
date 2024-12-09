import { wsGlobals } from './bundle.js';
function populateVoices(voices) {
    console.log('init tts with voices: ', voices);
    let el = document.querySelector('#voice_selector');
    if (el) {
        for (const voice of voices) {
            let option = document.createElement("option");
            option.innerHTML = voice.name + ", " + voice.lang + ", " + voice.voiceURI;
            option.value = voice.voiceURI;
            el.append(option);
        }
    }
    document.getElementById('voice_selector').value = tts.getVoiceURI();
}

function onStart (ev) {
    console.log('tts started, at: ', new Date());
    updateUiByState();
}

function onEnd(ev) {
    console.log('tts done, with ev = ', ev);
    if (shouldSpeak) {
        caretProgress();
        if (currentEl) {
            speakOutText(currentEl.textContent);
        } else {
            speak(); // ie start from beginning
        }
    }
}

function speakOutText(txt) {
    tts.speakOut(txt);
}

let tts = wsGlobals.TtsEngine;
let shouldSpeak = false;
let currentEl;

//console.log(tts);


tts.init({
    onInit: (voices) => {
        populateVoices(voices);
    },

    onStart: () => {
        onStart();
    },

    onDone: () => {
        onEnd();
    }
});

function speak() {
    shouldSpeak = true;
    if (!currentEl) {
        caretProgress();
    }
    tts.setVoiceByUri(document.getElementById("voice_selector").value);
    let txt = currentEl.textContent;
    //txt = "some very long text to test google termination bug. some very long text to test google termination bug. some very long text to test google termination bug. some very long text to test google termination bug. some very long text to test google termination bug. some very long text to test google termination bug. some very long text to test google termination bug. some very long text to test google termination bug. some very long text to test google termination bug. some very long text to test google termination bug. some very long text to test google termination bug. some very long text to test google termination bug. some very long text to test google termination bug. some very long text to test google termination bug. some very long text to test google termination bug. some very long text to test google termination bug. some very long text to test google termination bug. some very long text to test google termination bug. some very long text to test google termination bug. "
    speakOutText(txt);
    document.getElementById('toggle_speech_btn').innerHTML = "Stop";
}

function stop() {
    shouldSpeak = false;
    tts.stop();
    updateUiByState();
    document.getElementById('toggle_speech_btn').innerHTML = "Speak";
}

export const toggleSpeak = function () {
    if (shouldSpeak) {
        stop();
    } else {
        speak();
    }
}

function caretProgress() {
    if (!currentEl) {
        currentEl = document.querySelector('main');
        currentEl = currentEl.firstElementChild;
    } else {
        if (currentEl instanceof Element)
        currentEl = currentEl.nextElementSibling;
    }
}

function updateUiByState() {
    if (shouldSpeak) {
        if (currentEl) {
            document.querySelectorAll("p").forEach((el) => {
                if (el!=currentEl) {
                    el.classList.remove("highlight");
                } else {
                    currentEl.classList.add("highlight");
                }
            });
            currentEl.scrollIntoView();
        }
    }
}