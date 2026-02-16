

---

# 🧠 PasteKitLab — Paste anything. We figure out the rest.

> A Chrome Extension for developers.
> Just **paste**. The tool **auto-detects** what it is and shows the right utilities.

No tool switching.
No guessing.
No tabs full of dev tool websites.

**Ctrl + V → Done.**

---

## ✨ Why PasteKitLab?

Most developer tools work like this:

> Choose a tool → Paste content → Process

PasteKitLab works the opposite way:

> Paste content → PasteKitLab chooses the tool for you

This small difference creates a **massive productivity boost**.

---

## 🚀 Features (Auto Detection Engine)

PasteKitLab analyzes your input and automatically activates the right component.

| What you paste   | What PasteKitLab does               |
| ---------------- | --------------------------------- |
| `0 0 * * *`      | Shows next 5 Cron execution times |
| `example.com`    | DNS lookup (A / AAAA / CNAME)     |
| `{ "a": 1 }`     | JSON formatter & error locator    |
| `MTIzNA==`       | Auto-detect Base64 and decode     |
| `192.168.1.0/24` | Subnet calculator                 |
| `8.8.8.8`        | IP info + your public IP          |
| `1700000000`     | Timestamp ⇄ Date conversion       |
| Encoded text     | Smart decode / encode panel       |

---

## 🧩 Built-in Components

### 🕒 Cron Viewer

* Parses cron expressions
* Shows next 5 run times instantly

### 🌐 DNS Resolver

* Detects domains automatically
* Resolves A / AAAA / CNAME via DNS over HTTPS

### 🔐 Encode / Decode Lab

Auto-detects and supports:

* Base64
* URL Encode
* Hex
* Unicode
* ASCII Bytes
* UTF-8 Bytes

If content is encoded → auto decode
If not → default Base64 encode + other options

### 🧾 JSON Tool

* Format / Minify
* Smart error pointer (shows 3 chars around error)

### 🌍 IP & Subnet Tool

* IP information
* Your public IP
* CIDR subnet calculator (start IP, end IP, count)

### ⏱ Timestamp Tool

* Detects timestamps or date strings
* Converts both ways
* Shows current time

---

## 🧠 The Core Idea

PasteKitLab is not a tool collection.

It’s a **Content Detection Engine** that activates the right developer tool automatically.

```ts
detect(content): ToolType[]
```

---

## 📸 Demo

> Paste. Watch the magic.

(You can add GIFs here later)

---

## 🛠 Tech Stack

* Chrome Extension (Manifest V3)
* React
* TypeScript
* DNS over HTTPS APIs
* cron-parser
* Pure client-side logic

No backend required.

---

## 📦 Installation (Dev)

```bash
git clone https://github.com/pastekitlab/pastekitlab.git
cd PasteKitLab
npm install
npm run build
```

Load unpacked extension in Chrome.

---

## 🎯 Vision

PasteKitLab aims to become:

> The only developer tool you open when you don’t know which tool you need.

---

## 📣 Roadmap

* [x] Auto detection engine
* [x] JSON / Encode / Time tools
* [ ] Cron / IP / DNS
* [ ] History panel
* [ ] Export results
* [ ] Pro features

---

## 🌍 Promotion & Blog

This project is part of a larger effort to share:

* Chrome extension engineering
* Content detection algorithms
* Developer productivity design

Articles and videos will be published on GitHub Pages and YouTube.

---

## 🤝 Contributing

PRs are welcome. Ideas are welcome. Star is appreciated ⭐

---

## 📄 License

MIT

---
