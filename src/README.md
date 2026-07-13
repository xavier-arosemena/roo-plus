<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://github.com/xavier-arosemena/roo-plus/raw/master/assets/icons/icon.png">
    <img alt="Roo+" src="https://github.com/xavier-arosemena/roo-plus/raw/master/assets/icons/icon.png" width="128" height="128">
  </picture>
</p>

<p align="center">
  <a href="https://open-vsx.org/extension/xavier-arosemena/roo-plus">
    <img src="https://img.shields.io/badge/Open_VSX_Registry-007ACC?style=flat&logo=eclipse&logoColor=white" alt="Open VSX Registry">
  </a>
  <a href="https://github.com/xavier-arosemena/roo-plus/issues">
    <img src="https://img.shields.io/badge/Report_Bug-GitHub-181717?style=flat&logo=github&logoColor=white" alt="Report Bug">
  </a>
  <a href="https://github.com/xavier-arosemena/roo-plus/blob/master/LICENSE">
    <img src="https://img.shields.io/badge/License-Apache_2.0-green.svg" alt="License">
  </a>
</p>

<br/>

<h1 align="center">🚀 Roo+</h1>
<h3 align="center">The Dev Team Plus for VS Code / VS Codium</h3>

<br/>

<p align="center">
  Roo+ is a <strong>fork of <a href="https://github.com/Zoo-Code-Org/Zoo-Code">Zoo Code</a></strong> (originally forked from <a href="https://github.com/RooVeterinaryInc/roo-cline">Roo Code</a> / <a href="https://github.com/cline/cline">Cline</a>) — a powerful AI-powered development assistant that brings a whole team of AI agents right into your editor.
</p>

<br/>

## ✨ What is Roo+?

Roo+ extends the incredible foundation of Zoo Code with **custom modes**, **enhanced features**, and a personalized configuration tailored for modern development workflows.

| Feature                       | Description                                                     |
| ----------------------------- | --------------------------------------------------------------- |
| 🤖 **AI Agent Team**          | Multiple AI agents working together in your editor              |
| 🎯 **Custom Modes**           | Specialized modes for different development tasks               |
| 🔌 **MCP Support**            | Full Model Context Protocol integration                         |
| 🌍 **Multi-Provider**         | Works with Anthropic, OpenAI, Gemini, Ollama, and 25+ providers |
| 🛠️ **Terminal Integration**   | Smart terminal with shell integration                           |
| 📁 **Tree-Sitter Code Index** | Intelligent code understanding for 30+ languages                |
| 🔒 **Atomic File Writing**    | Safe, crash-proof file operations                               |
| 🌐 **Localization**           | Available in 18+ languages                                      |

<br/>

## 🚀 Quick Start

### Install from VS Codium Marketplace

1. Open **VS Code** or **VS Codium**
2. Go to **Extensions** (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for **"Roo+"**
4. Click **Install**

Or install directly from the command line:

```bash
# Via the Open VSX CLI
ovsx install xavier-arosemena/roo-plus
```

### Install from VSIX

```bash
# Clone the repo
git clone https://github.com/xavier-arosemena/roo-plus.git
cd roo-plus

# Install dependencies
pnpm install

# Build the VSIX
pnpm vsix

# The VSIX will be at: bin/roo-plus-3.68.0.vsix
```

<br/>

## 🏗️ Project Structure

```
roo-plus/
├── src/                    # Extension source
│   ├── api/                # API provider integrations
│   ├── core/               # Core logic (task, config, webview)
│   ├── services/           # Services (MCP, terminal, auth, etc.)
│   ├── i18n/               # Internationalization
│   └── integrations/       # Editor integrations
├── webview-ui/             # React-based WebView UI
├── packages/               # Shared packages (types, core, IPC, etc.)
└── apps/                   # Applications (CLI, VS Code shim, e2e)
```

<br/>

## 🔄 Staying Updated

Since Roo+ is a fork of Zoo Code, you can pull the latest security updates and features from upstream:

```bash
git fetch upstream
git merge upstream/main
```

<br/>

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

- 🐛 **Report a bug**: [Open an issue](https://github.com/xavier-arosemena/roo-plus/issues/new?template=bug_report.md)
- 💡 **Suggest a feature**: [Open a discussion](https://github.com/xavier-arosemena/roo-plus/discussions)
- 🔀 **Submit a PR**: Fork the repo and create a pull request

<br/>

## 📜 License

This project is licensed under the **Apache 2.0 License** — see the [LICENSE](LICENSE) file for details.

<br/>

---

<p align="center">
  <sub>Built with ❤️ by <a href="https://github.com/xavier-arosemena">Xavier Arosemena</a></sub>
  <br/>
  <sub>Roo+ is not affiliated with Zoo Code, Roo Code, or Cline.</sub>
</p>
