/**
 * 双屏同步视频播放器 - Cloudflare Workers
 *
 * 部署步骤:
 * 1. 登录 Cloudflare Dashboard -> Workers & Pages
 * 2. 创建新 Worker
 * 3. 将此文件内容粘贴到编辑器
 * 4. 点击 Deploy
 */

// 内嵌的HTML页面
const HTML_CONTENT = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>双屏同步视频播放器</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      color: #fff;
    }

    /* 上传页面 */
    .upload-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      gap: 24px;
    }
    .title { font-size: 28px; text-align: center; }
    .subtitle { color: #888; text-align: center; }

    .drop-zone {
      width: 100%;
      max-width: 500px;
      padding: 60px 40px;
      border: 2px dashed #444;
      border-radius: 16px;
      background: rgba(255,255,255,0.02);
      cursor: pointer;
      text-align: center;
      transition: all 0.3s;
    }
    .drop-zone:hover, .drop-zone.dragging {
      border-color: #2563eb;
      background: rgba(37,99,235,0.1);
    }
    .drop-zone input { display: none; }
    .drop-icon { font-size: 48px; margin-bottom: 16px; }
    .drop-text { color: #aaa; line-height: 1.8; }

    .divider {
      display: flex;
      align-items: center;
      width: 100%;
      max-width: 500px;
      gap: 16px;
      color: #666;
    }
    .divider::before, .divider::after {
      content: "";
      flex: 1;
      height: 1px;
      background: #333;
    }

    .url-form {
      display: flex;
      width: 100%;
      max-width: 500px;
      gap: 12px;
    }
    .url-input {
      flex: 1;
      padding: 14px 16px;
      border: 1px solid #333;
      border-radius: 8px;
      background: rgba(255,255,255,0.05);
      color: #fff;
      font-size: 14px;
      outline: none;
    }
    .url-input:focus { border-color: #2563eb; }
    .url-input::placeholder { color: #666; }

    .btn {
      padding: 14px 24px;
      background: #2563eb;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn:hover { background: #1d4ed8; }

    .error { color: #ef4444; text-align: center; }
    .tips { text-align: center; color: #666; font-size: 14px; }
    .tips h3 { color: #888; margin-bottom: 8px; }

    /* 播放器页面 */
    .player-container {
      display: none;
      flex-direction: column;
      height: 100vh;
    }
    .player-container.active { display: flex; }
    .upload-container.hidden { display: none; }

    .player-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px 16px;
      background: #0f0f1a;
      border-bottom: 1px solid #222;
    }
    .back-btn {
      padding: 8px 16px;
      background: transparent;
      color: #fff;
      border: 1px solid #444;
      border-radius: 6px;
      cursor: pointer;
    }
    .back-btn:hover { background: rgba(255,255,255,0.1); }
    .source-name {
      flex: 1;
      color: #888;
      font-size: 13px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .dual-wrapper {
      flex: 1;
      display: flex;
      background: #000;
    }
    .dual-wrapper video {
      flex: 1;
      width: 50%;
      height: 100%;
      object-fit: contain;
      background: #000;
    }
    .video-left { border-right: 1px solid #333; }
    .video-right { pointer-events: none; }
    .video-right::-webkit-media-controls { display: none !important; }

    .sync-hint {
      text-align: center;
      padding: 8px;
      background: #1a1a2e;
      color: #888;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <!-- 上传页面 -->
  <div class="upload-container" id="uploadPage">
    <h1 class="title">双屏同步视频播放器</h1>
    <p class="subtitle">上传本地视频或输入视频URL,两个播放器同步播放</p>

    <div class="drop-zone" id="dropZone">
      <input type="file" id="fileInput" accept="video/*">
      <div class="drop-icon">📁</div>
      <p class="drop-text">拖放视频文件到此处<br>或点击选择文件</p>
    </div>

    <div class="divider"><span>或</span></div>

    <form class="url-form" id="urlForm">
      <input type="text" class="url-input" id="urlInput" placeholder="输入视频URL地址">
      <button type="submit" class="btn">加载视频</button>
    </form>

    <div class="error" id="error"></div>

    <div class="tips">
      <h3>支持的格式</h3>
      <p>MP4, WebM, OGV 等浏览器原生支持的视频格式</p>
    </div>
  </div>

  <!-- 播放器页面 -->
  <div class="player-container" id="playerPage">
    <div class="player-header">
      <button class="back-btn" id="backBtn">← 返回</button>
      <span class="source-name" id="sourceName"></span>
    </div>
    <div class="dual-wrapper">
      <video id="videoLeft" class="video-left" controls playsinline></video>
      <video id="videoRight" class="video-right" playsinline></video>
    </div>
    <div class="sync-hint">左侧播放器控制两个窗口同步播放</div>
  </div>

  <script>
    const uploadPage = document.getElementById('uploadPage');
    const playerPage = document.getElementById('playerPage');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const urlForm = document.getElementById('urlForm');
    const urlInput = document.getElementById('urlInput');
    const errorDiv = document.getElementById('error');
    const backBtn = document.getElementById('backBtn');
    const sourceName = document.getElementById('sourceName');
    const videoLeft = document.getElementById('videoLeft');
    const videoRight = document.getElementById('videoRight');

    let objectUrl = null;

    // 拖放处理
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', e => {
      e.preventDefault();
      dropZone.classList.add('dragging');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragging'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.classList.remove('dragging');
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    });

    fileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) handleFile(file);
    });

    function handleFile(file) {
      if (!file.type.startsWith('video/')) {
        showError('请选择视频文件');
        return;
      }
      cleanup();
      objectUrl = URL.createObjectURL(file);
      playVideo(objectUrl, file.name);
    }

    urlForm.addEventListener('submit', e => {
      e.preventDefault();
      const url = urlInput.value.trim();
      if (!url) {
        showError('请输入视频URL');
        return;
      }
      try {
        new URL(url);
      } catch {
        showError('请输入有效的URL地址');
        return;
      }
      cleanup();
      playVideo(url, url);
    });

    function playVideo(src, name) {
      errorDiv.textContent = '';
      videoLeft.src = src;
      videoRight.src = src;
      sourceName.textContent = name;
      uploadPage.classList.add('hidden');
      playerPage.classList.add('active');

      // 同步逻辑
      videoLeft.muted = true;
      videoRight.muted = true;

      videoLeft.addEventListener('play', () => videoRight.play());
      videoLeft.addEventListener('pause', () => videoRight.pause());
      videoLeft.addEventListener('seeking', () => videoRight.currentTime = videoLeft.currentTime);
      videoLeft.addEventListener('ratechange', () => videoRight.playbackRate = videoLeft.playbackRate);
      videoLeft.addEventListener('volumechange', () => {
        videoRight.volume = videoLeft.volume;
        videoRight.muted = videoLeft.muted;
      });

      // 时间同步
      function syncTime() {
        if (Math.abs(videoLeft.currentTime - videoRight.currentTime) > 0.05) {
          videoRight.currentTime = videoLeft.currentTime;
        }
        requestAnimationFrame(syncTime);
      }
      syncTime();

      videoLeft.addEventListener('canplay', () => videoLeft.play(), { once: true });
    }

    backBtn.addEventListener('click', () => {
      cleanup();
      videoLeft.src = '';
      videoRight.src = '';
      urlInput.value = '';
      uploadPage.classList.remove('hidden');
      playerPage.classList.remove('active');
    });

    function cleanup() {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
    }

    function showError(msg) {
      errorDiv.textContent = msg;
    }
  </script>
</body>
</html>`;

export default {
  async fetch(request) {
    return new Response(HTML_CONTENT, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  },
};
