import { useState, useRef, DragEvent } from "react";
import { DualVideoPlayer } from "./components/DualVideoPlayer";
import styles from "./styles/App.module.css";

export default function App() {
  const [videoSrc, setVideoSrc] = useState<string>("");
  const [urlInput, setUrlInput] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const cleanupObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("video/")) {
      setError("请选择视频文件");
      return;
    }
    setError(null);
    cleanupObjectUrl();
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setVideoSrc(url);
    setUrlInput("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      setError("请输入视频URL");
      return;
    }
    try {
      new URL(urlInput);
    } catch {
      setError("请输入有效的URL地址");
      return;
    }
    setError(null);
    cleanupObjectUrl();
    setVideoSrc(urlInput.trim());
  };

  const handleReset = () => {
    cleanupObjectUrl();
    setVideoSrc("");
    setUrlInput("");
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={styles.app}>
      {!videoSrc ? (
        <div className={styles.uploadContainer}>
          <h1 className={styles.title}>双屏同步视频播放器</h1>
          <p className={styles.subtitle}>
            上传本地视频或输入视频URL,两个播放器同步播放
          </p>

          <div
            className={`${styles.dropZone} ${isDragging ? styles.dragging : ""}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className={styles.hiddenInput}
            />
            <div className={styles.dropIcon}>📁</div>
            <p className={styles.dropText}>
              拖放视频文件到此处
              <br />
              或点击选择文件
            </p>
          </div>

          <div className={styles.divider}>
            <span>或</span>
          </div>

          <form onSubmit={handleUrlSubmit} className={styles.urlForm}>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="输入视频URL地址"
              className={styles.urlInput}
            />
            <button type="submit" className={styles.submitBtn}>
              加载视频
            </button>
          </form>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.tips}>
            <h3>支持的格式</h3>
            <p>MP4, WebM, OGV 等浏览器原生支持的视频格式</p>
          </div>
        </div>
      ) : (
        <div className={styles.playerContainer}>
          <div className={styles.playerHeader}>
            <button onClick={handleReset} className={styles.backBtn}>
              ← 返回
            </button>
            <span className={styles.currentSource}>
              {objectUrlRef.current ? "本地文件" : urlInput}
            </span>
          </div>
          <DualVideoPlayer src={videoSrc} />
        </div>
      )}
    </div>
  );
}
