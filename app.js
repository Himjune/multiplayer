const playerSections = document.querySelectorAll(".player-section");
let active = null;
let activeMode = null;
let startX = 0;
let startY = 0;
let startWidth = 0;
let startHeight = 0;
let startLeft = 0;
let startTop = 0;

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
]

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

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
  });

  cover.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    startInteraction(section, "drag", event);
  });

  handle.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    startInteraction(section, "resize", event);
  });

  makeMain.addEventListener("click", (event) => {
    setMainPlayer(section);
  });
});

window.addEventListener("pointermove", onPointerMove);
window.addEventListener("pointerup", endInteraction);
window.addEventListener("pointercancel", endInteraction);


setTimeout(() => {
  videos.forEach(element => {
    const player = document.getElementById(element.id);
    player.contentWindow.postMessage(JSON.stringify({
        type: 'player:unMute',
        data: {} 
    }),'*')
  });
}, 5000);

setTimeout(() => {
  videos.forEach(element => {
    const player = document.getElementById(element.id);
    player.contentWindow.postMessage(JSON.stringify({
        type: 'player:setVolume',
        data: {volume: 0.01} 
    }),'*')
    player.contentWindow.postMessage(JSON.stringify({
        type: 'player:play',
        data: {} 
    }),'*')
  });
}, 5500);
setTimeout(() => {
  videos.forEach(element => {
    const player = document.getElementById(element.id);
    player.contentWindow.postMessage(JSON.stringify({
        type: 'player:unMute',
        data: {} 
    }),'*')
  });
}, 6000);

window.addEventListener('message', (event) => {

  const handlers = {
    "player:currentTime": (data, info)=>{
      //console.log(info, data);
    }
  }
  const message = JSON.parse(event.data);
  const video = videos.find((vid)=>{return vid.videoId === message.data.videoId});
  if (handlers[message.type]) handlers[message.type](message.data, video);
})
