import { useEffect, useRef } from "react";
import Hls from "hls.js";
import "../styles/DualVideoPlayer.css";

export type DualVideoPlayerProps = {
  leftSrc: string;
  rightSrc: string;
  poster?: string;
};

// 使用 hls.js 直接驱动 <video>，Safari 走原生 HLS，其它浏览器用 MSE，最大化兼容性
export function DualVideoPlayer({ leftSrc, rightSrc, poster }: DualVideoPlayerProps) {
  const leftRef = useRef<HTMLVideoElement | null>(null);
  const rightRef = useRef<HTMLVideoElement | null>(null);
  const leftHls = useRef<Hls | null>(null);
  const rightHls = useRef<Hls | null>(null);

  useEffect(() => {
    const lv = leftRef.current;
    const rv = rightRef.current;
    if (!lv || !rv) return;

    [lv, rv].forEach((v) => {
      v.muted = true;
      v.playsInline = true as any;
      v.preload = "auto";
      if (poster) v.poster = poster;
    });

    const setupOne = (video: HTMLVideoElement, src: string, setRef: (h: Hls | null) => void) => {
      let h: Hls | null = null;
      if (Hls.isSupported()) {
        h = new Hls({ enableWorker: true, lowLatencyMode: false, backBufferLength: 120 });
        h.attachMedia(video);
        h.on(Hls.Events.MEDIA_ATTACHED, () => h?.loadSource(src));
        h.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) h?.startLoad();
            if (data.type === Hls.ErrorTypes.MEDIA_ERROR) h?.recoverMediaError();
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src; // Safari 原生 HLS
      } else {
        video.src = src; // 兜底
      }
      setRef(h);
    };

    setupOne(lv, leftSrc, (h) => (leftHls.current = h));
    setupOne(rv, rightSrc, (h) => (rightHls.current = h));

    const tryAutoPlay = (v: HTMLVideoElement) => {
      const p = v.play();
      if (p && typeof (p as any).catch === "function") (p as Promise<void>).catch(() => undefined);
    };
    const onCanPlayLeft = () => tryAutoPlay(lv);
    const onCanPlayRight = () => tryAutoPlay(rv);
    lv.addEventListener("canplay", onCanPlayLeft);
    rv.addEventListener("canplay", onCanPlayRight);

    return () => {
      lv.removeEventListener("canplay", onCanPlayLeft);
      rv.removeEventListener("canplay", onCanPlayRight);
      leftHls.current?.destroy();
      rightHls.current?.destroy();
      leftHls.current = null;
      rightHls.current = null;
      [lv, rv].forEach((v) => {
        try {
          v.pause();
          v.removeAttribute("src");
          v.load();
        } catch {}
      });
    };
  }, [leftSrc, rightSrc, poster]);

    // 播放/暂停/倍速/拖拽 + rAF 时钟校准
  useEffect(() => {
    const lv = leftRef.current;
    const rv = rightRef.current;
    if (!lv || !rv) return;

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const delta = Math.abs(lv.currentTime - rv.currentTime);
      if (delta > 0.05) rv.currentTime = lv.currentTime;
    };
    tick();

    const onPlay = () => {
      rv.playbackRate = lv.playbackRate;
      const p = rv.play();
      if (p) (p as any).catch(() => undefined);
    };
    const onPause = () => rv.pause();
    const onRate = () => (rv.playbackRate = lv.playbackRate);
    const onSeeking = () => (rv.currentTime = lv.currentTime);

    lv.addEventListener("play", onPlay);
    lv.addEventListener("pause", onPause);
    lv.addEventListener("ratechange", onRate);
    lv.addEventListener("seeking", onSeeking);

    return () => {
      cancelAnimationFrame(raf);
      lv.removeEventListener("play", onPlay);
      lv.removeEventListener("pause", onPause);
      lv.removeEventListener("ratechange", onRate);
      lv.removeEventListener("seeking", onSeeking);
    };
  }, [leftSrc, rightSrc]);

  return (
    <div className="dual-wrapper">
      <video ref={leftRef} controls playsInline muted />
      <video ref={rightRef} className="mirrored" playsInline muted />
    </div>
  );
}
