const playerSections = document.querySelectorAll(".player-section");
const controlButtons = document.querySelectorAll(".control-button");
const volumeSlider = document.getElementById("volumeSlider");
const volumeValue = document.getElementById("volumeValue");
const globalControls = document.querySelector(".global-controls");
const audioPlayer = document.getElementById("audioPlayer");
const audioProgress = document.getElementById("audioProgress");
const audioTime = document.getElementById("audioTime");
const audioPanel = document.querySelector(".audio-panel");
const SYNC_INTERVAL_MS = 250;
let active = null;
let activeMode = null;
let startX = 0;
let startY = 0;
let startWidth = 0;
let startHeight = 0;
let startLeft = 0;
let startTop = 0;

const RUTUBE_ORIGIN = "https://rutube.ru";

const videos = [
  {
    type: "tutor",
    id: "tutorVid",
    videoId: "4511cbf57def8a0f85be9e987c295558"
  },
  {
    type: "board",
    id: "boardVid",
    videoId: "fd219fc7dda278154d936d46d253c312"
  },
  {
    type: "speech",
    id: "speechVid",
    videoId: "eca1525943de3de3c99cd988d3f57079"
  },
];

const getVideoObj = (videoId) => {
  return videos.find((videoObj)=> {return videoObj.videoId === videoId})
}

const getVideoPlayer = (videoId) => {
  return document.getElementById(getVideoObj(videoId).id);
}

const currentTimes = new Map();
let lastSyncTimeMs = 0;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "--:--";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const updateAudioProgress = () => {
  if (!audioPlayer || !audioProgress) return;
  const duration = audioPlayer.duration;
  const hasDuration = Number.isFinite(duration) && duration > 0;
  if (hasDuration) {
    audioProgress.max = duration;
  }
  audioProgress.value = audioPlayer.currentTime || 0;
  if (audioTime) {
    const durationText = hasDuration ? formatTime(duration) : "--:--";
    audioTime.textContent = `${formatTime(audioPlayer.currentTime || 0)} / ${durationText}`;
  }
};

const seekAudioBy = (deltaSeconds) => {
  if (!audioPlayer) return;
  const duration = audioPlayer.duration;
  const hasDuration = Number.isFinite(duration) && duration > 0;
  const target = hasDuration
    ? clamp((audioPlayer.currentTime || 0) + deltaSeconds, 0, duration)
    : Math.max(0, (audioPlayer.currentTime || 0) + deltaSeconds);
  audioPlayer.currentTime = target;
  updateAudioProgress();
};

const syncVideosToAudio = (force = false) => {
  if (!audioPlayer) return;
  const now = performance.now();
  //if (!force && now - lastSyncTimeMs < SYNC_INTERVAL_MS) return;
  const time = audioPlayer.currentTime || 0;
  videos.forEach((video) => {
    const currentTime = currentTimes.get(video.videoId);
    const diff =  time-currentTime;
    const forward = (diff >= 0)
    let speed = 1.0 
    if (Math.abs(diff) > 25) {
      speed = 1.0;
      //sendToPlayer(video.id, "player:relativelySeek", { time: diff });
    } else if (Math.abs(diff) > 5) {
      speed = forward ? 1.75 : 0.25;
    } else if (Math.abs(diff) > 2) {
      speed = forward ? 1.5 : 0.75
    } else if (Math.abs(diff) > 0.01) {
      speed = forward ? 1.25 : 0.75;
    } else {
      speed = 1.0;
    }
      sendToPlayer(video.id, "player:setPlaybackSpeed", { time: speed });
    console.log(video, currentTime, diff, forward, speed);
  });
  lastSyncTimeMs = now;
};

const sendToPlayer = (id, type, data = {}) => {
  const player = document.getElementById(id);
  if (!player || !player.contentWindow) return;
  player.contentWindow.postMessage(JSON.stringify({ type, data }), RUTUBE_ORIGIN);
};

const sendToVideo = (videoId, type, data = {}) => {
  const player = getVideoPlayer(videoId);
  if (!player || !player.contentWindow) return;
  player.contentWindow.postMessage(JSON.stringify({ type, data }), RUTUBE_ORIGIN);
}

const sendToAll = (type, data = {}) => {
  videos.forEach((element) => {
    sendToPlayer(element.id, type, data);
  });
};

let controlsTimer = null;
const scheduleControlsHide = () => {
  if (!globalControls && !audioPanel) return;
  const headers = document.querySelectorAll(".player-section header");
  clearTimeout(controlsTimer);
  if (globalControls) globalControls.classList.remove("is-hidden");
  if (audioPanel) audioPanel.classList.remove("is-hidden");
  headers.forEach((header) => header.classList.remove("is-hidden"));
  controlsTimer = setTimeout(() => {
    if (globalControls) globalControls.classList.add("is-hidden");
    if (audioPanel) audioPanel.classList.add("is-hidden");
    headers.forEach((header) => header.classList.add("is-hidden"));
  }, 3000);
};

const requestCurrentTimes = () => {
  sendToAll("player:currentTime");
};

const seekAllBy = (deltaSeconds) => {
  seekAudioBy(deltaSeconds);
  syncVideosToAudio(true);
  requestCurrentTimes();
  setTimeout(() => {
    videos.forEach((video) => {
      const currentTime = currentTimes.get(video.videoId);
      if (typeof currentTime !== "number") return;
      const targetTime = Math.max(0, currentTime + deltaSeconds);
      sendToPlayer(video.id, "player:relativelySeek", { time: deltaSeconds });
    });
  }, 150);
};

const setMainPlayer = (section) => {
  if (!section) return;
  const currentMain = document.querySelector(".main-player");
  if (currentMain === section) return;

  currentMain.classList.toggle("main-player", false);
  currentMain.classList.toggle("mini-player", true);
  section.classList.toggle("main-player", true);
  section.classList.toggle("mini-player", false);

  const style = section.getAttribute("style");
  section.setAttribute("style", "inset: 0;");
  currentMain.setAttribute("style", style);

  const targetButton = section.querySelector(".make-main");
  if (targetButton) targetButton.disabled = true;

  const currentButton = currentMain.querySelector(".make-main");
  if (currentButton) currentButton.disabled = false;
};

const onPointerMove = (event) => {
  if (!active) return;
  const dx = event.clientX - startX;
  const dy = event.clientY - startY;

  if (activeMode === "drag") {
    const newLeft = clamp(startLeft + dx, 0, window.innerWidth - active.offsetWidth);
    const newTop = clamp(startTop + dy, 0, window.innerHeight - active.offsetHeight);
    active.style.left = `${newLeft}px`;
    active.style.top = `${newTop}px`;
    active.style.right = "auto";
  }

  if (activeMode === "resize") {
    const minWidth = 220;
    const minHeight = 130;
    const maxWidth = window.innerWidth - active.offsetLeft;
    const maxHeight = window.innerHeight - active.offsetTop;
    const newWidth = clamp(startWidth + dx, minWidth, maxWidth);
    const newHeight = clamp(startHeight + dy, minHeight, maxHeight);
    active.style.width = `${newWidth}px`;
    active.style.height = `${newHeight}px`;
  }
};

const endInteraction = () => {
  if (!active) return;
  active.releasePointerCapture(active.pointerId || 0);
  active = null;
  activeMode = null;
  document.body.style.cursor = "";
};

function startInteraction(section, mode, event) {
    if (section.classList.contains("main-player")) return;

    active = section;
    activeMode = mode;
    startX = event.clientX;
    startY = event.clientY;
    active.pointerId = event.pointerId;

    if (mode === "drag") {
      startLeft = section.offsetLeft;
      startTop = section.offsetTop;
      document.body.style.cursor = "grabbing";
    }
    if (mode === "resize") {
      document.body.style.cursor = "se-resize";
      startWidth = section.offsetWidth;
      startHeight = section.offsetHeight;
      //section.querySelector("resize-handle").setPointerCapture(event.pointerId);
    }
}

playerSections.forEach((section) => {
  const header = section.querySelector("header");
  const cover = section.querySelector(".ui-cover");
  const handle = section.querySelector(".resize-handle");
  const makeMain = section.querySelector(".make-main");

  header.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    startInteraction(section, "drag", event);
    scheduleControlsHide();
  });

  cover.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    startInteraction(section, "drag", event);
    scheduleControlsHide();
  });

  handle.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    startInteraction(section, "resize", event);
    scheduleControlsHide();
  });

  makeMain.addEventListener("click", (event) => {
    setMainPlayer(section);
    scheduleControlsHide();
  });
});

window.addEventListener("pointermove", onPointerMove);
window.addEventListener("pointerup", endInteraction);
window.addEventListener("pointercancel", endInteraction);

controlButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.action;
    scheduleControlsHide();
    if (action === "play") {
      sendToAll("player:play");
      if (audioPlayer) audioPlayer.play();
    }
    if (action === "pause") {
      sendToAll("player:pause");
      if (audioPlayer) audioPlayer.pause();
    }
    if (action === "seek-back") seekAllBy(-10);
    if (action === "seek-forward") seekAllBy(10);
    if (action === "fullscreen") {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  });
});

if (volumeSlider && volumeValue) {
  if (audioPlayer) audioPlayer.volume = Number(volumeSlider.value) / 100;
  volumeSlider.addEventListener("input", () => {
    const volume = Number(volumeSlider.value) / 100;
    volumeValue.textContent = `${volumeSlider.value}%`;
    //sendToAll("player:setVolume", { volume });
    if (audioPlayer) audioPlayer.volume = volume;
    scheduleControlsHide();
  });
}

if (audioProgress && audioPlayer) {
  audioProgress.addEventListener("input", () => {
    const target = Number(audioProgress.value);
    if (!Number.isNaN(target)) {
      audioPlayer.currentTime = target;
      updateAudioProgress();
      syncVideosToAudio(true);
    }
    scheduleControlsHide();
  });
}

if (audioPlayer) {
  audioPlayer.addEventListener("loadedmetadata", updateAudioProgress);
  audioPlayer.addEventListener("timeupdate", () => {
    updateAudioProgress();
    syncVideosToAudio();
  });
  audioPlayer.addEventListener("seeked", () => {
    updateAudioProgress();
    syncVideosToAudio(true);
  });
  audioPlayer.addEventListener("ended", () => {
    audioPlayer.pause();
    updateAudioProgress();
  });
  updateAudioProgress();
}

document.addEventListener("mousemove", scheduleControlsHide);
document.addEventListener("keydown", scheduleControlsHide);
scheduleControlsHide();

window.addEventListener("message", (event) => {
  const handlers = {
    "player:init": function (message) {
      //console.log("init", message, message.data, message.data.videoId);
      sendToVideo(message?.data?.videoId,"player:setVolume", {volume: 0.01});
      //sendToAll("player:mute", {volume: 0.01});
      //sendToAll("player:pause");
    },
    "player:currentTime": function (message) {
      if (!message?.data) return;
      const { currentTime, videoId } = message.data;
      if (typeof currentTime === "number" && videoId) {
        currentTimes.set(videoId, currentTime);
      }
    },
  }

  if (event.origin !== RUTUBE_ORIGIN) return;
  if (typeof event.data !== "string") return;
  let message;
  try {
    message = JSON.parse(event.data);
  } catch (error) {
    return;
  } 

  if (handlers[message.type]) handlers[message.type](message);
});
