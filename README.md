# 📄 Pocket PDF

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Project Status](https://img.shields.io/badge/status-active-brightgreen)
[![View on GitHub Pages](https://img.shields.io/badge/Try%20it%20Live-pocket--pdf-blue)](https://TheoKVA.github.io/pocket-pdf/)
[![Made with Love in Switzerland](https://img.shields.io/badge/Made%20with%20%E2%9D%A4%EF%B8%8F-Switzerland-red.svg)](https://github.com/TheoKVA/)

> **A 100% private, browser-based document scanner**

Turn your phone into a document scanner — no installs, no sign-ups, no tracking. Pocket PDF lets you scan, crop, enhance, and generate multi-page PDFs directly from your browser. Your data never leaves your device. No ads, no fees, no hassle.

![Screenshot of Pocket PDF](assets/screenshot.png)

## 🧩 Features

- 📸 **Image input**: Upload from camera or file (with drag & drop support)
- 🧠 **Auto corner detection**: Automatically finds paper edges using OpenCV.js
- ✂ **Manual sdjustment**: Drag corner handles if auto-detection isn't perfect
- 🎛 **Image enhancements**: Grayscale, black & white, or full-color with real-time histogram
- 📏 **Format control**: Output to A3, A4, A5, cards, or receipt format (with auto-sizing)
- 🖼 **Multi-page support**: Reorder pages visually, delete or re-edit on click
- 📄 **PDF export**: Choose DPI and compression for best balance of size and quality
- 💾 **100% offline**: All processing happens in the browser — no uploads, no analytics

## 🔐 Why it's different

- **No servers. No trackers. No backend.**
- Runs on [OpenCV.js](https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html) and [PDF-lib](https://pdf-lib.js.org/)
- Built with privacy-first design: ideal for journalists, travelers, or anyone who values control

## 🚀 Try it online

> [👉 Launch Pocket PDF](https://TheoKVA.github.io/pocket-pdf/)


## 🧱 Built with

- Vanilla JS, HTML, and CSS
- [OpenCV.js](https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html) 
- [PDF-lib](https://pdf-lib.js.org/)
- [HEIC2Any](https://github.com/alexcorvi/heic2any) for iOS camera support
- ❤️ by Theo Francart

## 🗂 Project structure

```bash
index.html           # Entry point
css/                 # Stylesheets
js/                  # Logic modules (input, processing, PDF export)
src/                 # Static assets (icons, images)
```

## 🖥️ Local development

```bash
git clone https://github.com/TheoKVA/pocket-pdf.git
cd pocket-pdf
open index.html  # or use Live Server
```

## 📢 License

MIT License — use freely and fork responsibly.