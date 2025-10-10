Upload your 3D background video here.

Instructions:
- Place your video file in this folder and name it exactly: background.mp4
- Supported format: MP4 (H.264/H.265 recommended for wide browser support)
- Recommended resolution: 1920x1080 or 1280x720 for performance (higher works but may impact battery on mobile)
- Recommended length: Loopable 10–30 seconds

How it works:
- The site first tries to load ./assets/video/background.mp4
- If it fails (missing or unsupported), it automatically falls back to a neon tunnel video hosted on a CDN
- The same video is used both:
  1) As the HTML background video behind the canvas
  2) As a Three.js VideoTexture for subtle 3D parallax

Tips:
- Make sure the video is muted and visually loop-friendly (no hard cuts)
- If you change the filename, also update createVideoBackground() in main.js to match