"""Cuts recorded frames (frames/<ms>.jpg) into clips: each part is a time range played back
over a target duration, so long waits become time-lapses. Usage: python3 clip.py <spec.json>
spec: {"out": "...mp4", "parts": [[start_ms, end_ms, seconds], ...]}"""
import bisect, json, os, subprocess, sys

FF = os.environ["FFMPEG"]
here = os.path.dirname(os.path.abspath(__file__))
FR = os.environ.get("FRAMES_DIR", "frames")
stamps = sorted(int(f[:-4]) for f in os.listdir(os.path.join(here, FR)) if f.endswith(".jpg"))
spec = json.load(open(sys.argv[1]))
lines = []
for a, b, secs in spec["parts"]:
    k = (b - a) / 1000 / secs  # speed-up
    i = max(0, bisect.bisect_right(stamps, a) - 1)  # the frame on screen at a
    j = bisect.bisect_left(stamps, b)
    keys = stamps[i:j] or [stamps[i]]
    times = [max(t, a) for t in keys] + [b]
    for t, nxt in zip(keys, times[1:]):
        d = (nxt - max(t, a)) / 1000 / k
        if d > 0:
            lines.append(f"file '{here}/{FR}/{t}.jpg'\nduration {d:.4f}")
lines.append(lines[-1].split("\n")[0])
lst = spec["out"] + ".txt"
open(lst, "w").write("\n".join(lines) + "\n")
subprocess.run([FF, "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-vf", "fps=30,scale=1920:1080,format=yuv420p",
                "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-r", "30", spec["out"]], check=True)
print("wrote", spec["out"], sum(p[2] for p in spec["parts"]), "s")
