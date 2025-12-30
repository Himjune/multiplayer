const miniPlayers = document.querySelectorAll(".mini-player");
let active = null;
let mode = null;
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

const onPointerMove = (event) => {
  if (!active) return;
  const dx = event.clientX - startX;
  const dy = event.clientY - startY;

  if (mode === "drag") {
    const newLeft = clamp(startLeft + dx, 0, window.innerWidth - active.offsetWidth);
    const newTop = clamp(startTop + dy, 0, window.innerHeight - active.offsetHeight);
    active.style.left = `${newLeft}px`;
    active.style.top = `${newTop}px`;
    active.style.right = "auto";
  }

  if (mode === "resize") {
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
  mode = null;
  document.body.style.cursor = "";
};

miniPlayers.forEach((mini) => {
  const cover = mini.querySelector(".ui-cover");
  const handle = mini.querySelector(".resize-handle");

  cover.addEventListener("pointerdown", (event) => {
    active = mini;
    mode = "drag";
    startX = event.clientX;
    startY = event.clientY;
    startLeft = mini.offsetLeft;
    startTop = mini.offsetTop;
    active.pointerId = event.pointerId;
    document.body.style.cursor = "grabbing";
  });

  handle.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    active = mini;
    mode = "resize";
    startX = event.clientX;
    startY = event.clientY;
    startWidth = mini.offsetWidth;
    startHeight = mini.offsetHeight;
    active.pointerId = event.pointerId;
    handle.setPointerCapture(event.pointerId);
    document.body.style.cursor = "se-resize";
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