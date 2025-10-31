import { FormEvent, useState } from "react";
import { DualVideoPlayer } from "./components/DualVideoPlayer";
import styles from "./styles/App.module.css";

type PlaybackVariant = {
  quality: string;
  format: string;
  cdnUrl: string;
};

type PlaybackResponse = {
  status: string;
  variants: PlaybackVariant[];
};

export default function App() {
  const [mediaId, setMediaId] = useState<string>("");
  const [playback, setPlayback] = useState<PlaybackResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const pollTokenRef = useState({ current: 0 })[0] as { current: number }; // simple ref without importing useRef

  // simple sleep helper
  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  const fetchPlayback = async (id: string) => {
    const resp = await fetch(`/api/v1/media/${id}/play`, {
      headers: { Authorization: "Bearer demo-token" }
    });
    if (!resp.ok) {
      throw new Error("获取播放信息失败");
    }
    const data = (await resp.json()) as { data: PlaybackResponse };
    return data.data;
  };

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const resp = await fetch("/api/v1/media", {
        method: "POST",
        body: form,
        headers: { Authorization: "Bearer demo-token" }
      });
      if (!resp.ok) {
        throw new Error("上传失败");
      }
      const data = await resp.json();
      setMediaId(String(data.data.mediaId));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      event.currentTarget.reset();
    }
  };

  const handleFetchByUrl = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const url = form.get("videoUrl");
    try {
      const resp = await fetch("/api/v1/media/by-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer demo-token"
        },
        body: JSON.stringify({ url })
      });
      if (!resp.ok) {
        throw new Error("提交地址失败");
      }
      const data = await resp.json();
      setMediaId(String(data.data.mediaId));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      event.currentTarget.reset();
    }
  };

  const loadPlayback = async () => {
    if (!mediaId) {
      setError("请先上传或提交视频地址");
      return;
    }
    setLoading(true);
    setError(null);
    try {
  // cancel any previous polling by bumping token
  pollTokenRef.current += 1;
  const myToken = pollTokenRef.current;

      const first = await fetchPlayback(mediaId);
      setPlayback(first);

      if (first.status === "FAILED") {
        throw new Error("转码失败，请重试上传或更换视频");
      }

      if (first.status === "READY" && first.variants?.length) {
        return;
      }

      // Start polling until READY with variants
      setPolling(true);
      const maxAttempts = 90; // ~3 minutes @ 2s
      for (let i = 0; i < maxAttempts; i++) {
        await sleep(2000);
  // if a new poll started, stop this one
  if (pollTokenRef.current !== myToken) break;
        const next = await fetchPlayback(mediaId);
        setPlayback(next);
        if (next.status === "FAILED") {
          setPolling(false);
          throw new Error("转码失败，请重试上传或更换视频");
        }
        if (next.status === "READY" && next.variants?.length) {
          break;
        }
      }
      setPolling(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const variantUrl = playback?.variants[0]?.cdnUrl ?? "";

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1>双屏同步视频播放器</h1>
        <p>上传文件或输入远程视频地址，左右同时播放同源视频以便对比。</p>
      </header>
      <section className={styles.controls}>
        <form onSubmit={handleUpload} className={styles.form}>
          <label className={styles.label}>本地文件上传</label>
          <input type="file" name="file" accept="video/*" required />
          <button type="submit" disabled={loading}>
            {loading ? "处理中" : "上传"}
          </button>
        </form>
        <form onSubmit={handleFetchByUrl} className={styles.form}>
          <label className={styles.label}>远程视频 URL</label>
          <input type="url" name="videoUrl" placeholder="https://example.com/video.mp4" required />
          <button type="submit" disabled={loading}>
            {loading ? "处理中" : "提交"}
          </button>
        </form>
        <div className={styles.playbackActions}>
          <label className={styles.label}>当前资源 ID</label>
          <input value={mediaId} onChange={(e) => setMediaId(e.target.value)} placeholder="mediaId" />
          <button type="button" onClick={loadPlayback} disabled={!mediaId || loading}>
            加载播放链接
          </button>
        </div>
        {error && <div className={styles.error}>{error}</div>}
      </section>
      <main className={styles.playerArea}>
        {playback && variantUrl ? (
          <DualVideoPlayer leftSrc={variantUrl} rightSrc={variantUrl} />
        ) : (
          <div className={styles.placeholder}>
            {polling || playback?.status === "PROCESSING"
              ? "正在转码，请稍候…（完成后将自动开始播放）"
              : "等待播放资源…"}
          </div>
        )}
      </main>
    </div>
  );
}
