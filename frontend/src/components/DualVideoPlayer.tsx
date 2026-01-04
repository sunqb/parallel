import { useEffect, useRef } from "react";
import "../styles/DualVideoPlayer.css";

export type DualVideoPlayerProps = {
  src: string;
};

export function DualVideoPlayer({ src }: DualVideoPlayerProps) {
  const leftRef = useRef<HTMLVideoElement>(null);
  const rightRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>(0);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right) return;

    left.muted = true;
    right.muted = true;

    const syncTime = () => {
      if (isSyncingRef.current) return;
      const delta = Math.abs(left.currentTime - right.currentTime);
      if (delta > 0.05) {
        isSyncingRef.current = true;
        right.currentTime = left.currentTime;
        isSyncingRef.current = false;
      }
      rafRef.current = requestAnimationFrame(syncTime);
    };

    const onPlay = () => {
      right.playbackRate = left.playbackRate;
      right.play().catch(() => {});
    };

    const onPause = () => {
      right.pause();
    };

    const onSeeking = () => {
      if (!isSyncingRef.current) {
        right.currentTime = left.currentTime;
      }
    };

    const onRateChange = () => {
      right.playbackRate = left.playbackRate;
    };

    const onVolumeChange = () => {
      right.volume = left.volume;
      right.muted = left.muted;
    };

    left.addEventListener("play", onPlay);
    left.addEventListener("pause", onPause);
    left.addEventListener("seeking", onSeeking);
    left.addEventListener("ratechange", onRateChange);
    left.addEventListener("volumechange", onVolumeChange);

    rafRef.current = requestAnimationFrame(syncTime);

    const onCanPlay = () => {
      left.play().catch(() => {});
    };
    left.addEventListener("canplay", onCanPlay, { once: true });

    return () => {
      cancelAnimationFrame(rafRef.current);
      left.removeEventListener("play", onPlay);
      left.removeEventListener("pause", onPause);
      left.removeEventListener("seeking", onSeeking);
      left.removeEventListener("ratechange", onRateChange);
      left.removeEventListener("volumechange", onVolumeChange);
      left.removeEventListener("canplay", onCanPlay);
    };
  }, [src]);

  return (
    <div className="dual-container">
      <div className="dual-wrapper">
        <video
          ref={leftRef}
          src={src}
          controls
          playsInline
          className="video-left"
        />
        <video
          ref={rightRef}
          src={src}
          playsInline
          className="video-right"
        />
      </div>
      <div className="sync-hint">
        左侧播放器控制两个窗口同步播放
      </div>
    </div>
  );
}
