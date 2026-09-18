> **[redacted]** Raw dev-console capture from a remote-SSH session, committed to a public repo.
> Before committing, these were replaced with placeholders: remote hostnames/IPs (`<remote-A>`
> –`<remote-D>`), private project names and paths (`<project-1>`, `<project-2>`,
> `<workspace-path>`), and task/webview UUIDs (`<task-id>`). Nothing else changed — line
> order, message text, sizes and timings are unaltered.

```text
First Server A:
"
[Extension Host] [webview-metrics] WARN "state" payload 711KB > 256KB top[taskHistory=621KB customModes=78KB clineMessages=0KB] runbook=docs/runbooks/gray-webview.md
console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
webviewElement.ts:507 An iframe which has both allow-scripts and allow-same-origin for its sandbox attribute can escape its sandboxing.
mountTo @ webviewElement.ts:507
console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
console.ts:139 [Extension Host] [webview-metrics] state_msgs=2 p50=400KB p99=711KB max=711KB
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=11 p99=13 max=30 mean=10 | jitter_ms max=2 | cpu_pct=4 | heap_mb=158 rss_mb=492 ext_mb=9 | state_serialize_ms p50=0 p99=10 max=10 n=2
console.ts:139 [Extension Host] [webview-metrics] WARN "state" payload 711KB > 256KB top[taskHistory=621KB customModes=78KB clineMessages=0KB] runbook=docs/runbooks/gray-webview.md
console.ts:139 [Extension Host] [createTaskWithHistoryItem] parent task <task-id> instantiated
console.ts:139 [Extension Host] [Task#getCheckpointService] initializing checkpoints service
2console.ts:139 [Extension Host] [Task#getCheckpointService] initializing shadow git
console.ts:139 [Extension Host] [createSanitizedGit] Created git instance for baseDir: /root/.vscodium-server/data/User/globalStorage/xavier-arosemena.roo-plus/tasks/<task-id>/checkpoints
2console.ts:139 [Extension Host] [t#create] git = 2.43.0
2console.ts:139 [Extension Host] [t#initShadowGit] shadow git repo already exists at /root/.vscodium-server/data/User/globalStorage/xavier-arosemena.roo-plus/tasks/<task-id>/checkpoints/.git
2console.ts:139 [Extension Host] [t#initShadowGit] initialized shadow repo with base commit 06178c82c3cec770b8e67bba44a4e9d2a95894df in 17ms
2console.ts:139 [Extension Host] [Task#getCheckpointService] service initialized
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: false)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 99ms -> c8c7be2ae648bf93378ae548350b8f327309a895
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=11 p99=14 max=112 mean=10 | jitter_ms max=48 | cpu_pct=11 | heap_mb=224 rss_mb=616 ext_mb=13 | state_serialize_ms p50=0 p99=7 max=7 n=9
console.ts:139 [Extension Host] [webview-metrics] state_msgs=9 p50=183KB p99=711KB max=711KB
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=11 p99=13 max=74 mean=10 | jitter_ms max=22 | cpu_pct=8 | heap_mb=162 rss_mb=440 ext_mb=10 | state_serialize_ms p50=0 p99=0 max=0 n=23
console.ts:139 [Extension Host] [webview-metrics] state_msgs=23 p50=183KB p99=184KB max=184KB
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=11 p99=13 max=119 mean=10 | jitter_ms max=50 | cpu_pct=9 | heap_mb=270 rss_mb=641 ext_mb=25 | state_serialize_ms p50=0 p99=0 max=0 n=15
console.ts:139 [Extension Host] [webview-metrics] state_msgs=15 p50=182KB p99=184KB max=184KB
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=10 p99=12 max=94 mean=10 | jitter_ms max=1 | cpu_pct=5 | heap_mb=174 rss_mb=620 ext_mb=35 | state_serialize_ms p50=0 p99=0 max=0 n=0
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=10 p99=12 max=19 mean=10 | jitter_ms max=1 | cpu_pct=6 | heap_mb=172 rss_mb=619 ext_mb=26 | state_serialize_ms p50=0 p99=0 max=0 n=0
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=11 p99=11 max=20 mean=10 | jitter_ms max=7 | cpu_pct=4 | heap_mb=179 rss_mb=619 ext_mb=51 | state_serialize_ms p50=0 p99=0 max=0 n=0
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=10 p99=11 max=20 mean=10 | jitter_ms max=1 | cpu_pct=4 | heap_mb=169 rss_mb=619 ext_mb=9 | state_serialize_ms p50=0 p99=0 max=0 n=0
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=10 p99=11 max=19 mean=10 | jitter_ms max=1 | cpu_pct=2 | heap_mb=173 rss_mb=619 ext_mb=11 | state_serialize_ms p50=0 p99=0 max=0 n=0
console.ts:139 [Extension Host] [Task#dispose] disposing task <task-id>
console.ts:139 [Extension Host] [webview-metrics] WARN "state" payload 711KB > 256KB top[taskHistory=621KB customModes=78KB clineMessages=0KB] runbook=docs/runbooks/gray-webview.md
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=11 p99=11 max=133 mean=10 | jitter_ms max=20 | cpu_pct=5 | heap_mb=226 rss_mb=571 ext_mb=10 | state_serialize_ms p50=6 p99=6 max=6 n=1
console.ts:139 [Extension Host] [createTaskWithHistoryItem] parent task <task-id> instantiated
console.ts:139 [Extension Host] [webview-metrics] state_msgs=3 p50=400KB p99=711KB max=711KB
console.ts:139 [Extension Host] [Task#getCheckpointService] initializing checkpoints service
2console.ts:139 [Extension Host] [Task#getCheckpointService] initializing shadow git
console.ts:139 [Extension Host] [createSanitizedGit] Created git instance for baseDir: /root/.vscodium-server/data/User/globalStorage/xavier-arosemena.roo-plus/tasks/<task-id>/checkpoints
2console.ts:139 [Extension Host] [t#create] git = 2.43.0
2console.ts:139 [Extension Host] [t#initShadowGit] shadow git repo already exists at /root/.vscodium-server/data/User/globalStorage/xavier-arosemena.roo-plus/tasks/<task-id>/checkpoints/.git
2console.ts:139 [Extension Host] [t#initShadowGit] initialized shadow repo with base commit 8d26c62f2b38cf4741e5d1a64f2e9f8d5e7fa352 in 27ms
2console.ts:139 [Extension Host] [Task#getCheckpointService] service initialized
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=11 p99=13 max=48 mean=10 | jitter_ms max=8 | cpu_pct=7 | heap_mb=275 rss_mb=647 ext_mb=26 | state_serialize_ms p50=0 p99=0 max=0 n=13
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 121ms -> d7eb1ed6489848b7e7f447c08ddc0f1743a56176
console.ts:139 [Extension Host] [webview-metrics] state_msgs=15 p50=176KB p99=181KB max=181KB
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=11 p99=12 max=36 mean=10 | jitter_ms max=21 | cpu_pct=7 | heap_mb=174 rss_mb=633 ext_mb=11 | state_serialize_ms p50=0 p99=0 max=0 n=4
console.ts:139 [Extension Host] [Task#dispose] disposing task <task-id>
console.ts:139 [Extension Host] [webview-metrics] WARN "state" payload 704KB > 256KB top[taskHistory=621KB customModes=71KB clineMessages=0KB] runbook=docs/runbooks/gray-webview.md
console.ts:139 [Extension Host] [createTask] child task <task-id> instantiated
console.ts:139 [Extension Host] [getTaskWithId] api_conversation_history.json missing for task <task-id>, returning empty history
log @ console.ts:139
console.ts:139 [Extension Host] [Task#getCheckpointService] initializing checkpoints service
2console.ts:139 [Extension Host] [Task#getCheckpointService] initializing shadow git
console.ts:139 [Extension Host] [createSanitizedGit] Created git instance for baseDir: /root/.vscodium-server/data/User/globalStorage/xavier-arosemena.roo-plus/tasks/<task-id>/checkpoints
2console.ts:139 [Extension Host] [t#create] git = 2.43.0
2console.ts:139 [Extension Host] [t#initShadowGit] creating shadow git repo at /root/.vscodium-server/data/User/globalStorage/xavier-arosemena.roo-plus/tasks/<task-id>/checkpoints
2console.ts:139 [Extension Host] [t#initShadowGit] initialized shadow repo with base commit 2d42bf05d73f052208d837214ff9c0780aff335e in 1164ms
2console.ts:139 [Extension Host] [Task#getCheckpointService] service initialized
console.ts:139 [Extension Host] [webview-metrics] state_msgs=8 p50=63KB p99=704KB max=704KB
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=11 p99=12 max=41 mean=10 | jitter_ms max=1 | cpu_pct=6 | heap_mb=256 rss_mb=655 ext_mb=49 | state_serialize_ms p50=0 p99=6 max=6 n=15
console.ts:139 [Extension Host] [webview-metrics] state_msgs=7 p50=64KB p99=65KB max=65KB
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=10 p99=12 max=128 mean=10 | jitter_ms max=3 | cpu_pct=6 | heap_mb=202 rss_mb=638 ext_mb=19 | state_serialize_ms p50=0 p99=0 max=0 n=7
console.ts:139 [Extension Host] [webview-metrics] state_msgs=36 p50=85KB p99=124KB max=124KB
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=11 p99=12 max=44 mean=10 | jitter_ms max=7 | cpu_pct=8 | heap_mb=316 rss_mb=708 ext_mb=15 | state_serialize_ms p50=0 p99=0 max=0 n=29
console.ts:139 [Extension Host] [webview-metrics] state_msgs=21 p50=174KB p99=178KB max=178KB
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 101ms -> 02fc8e1dd6eebad12ac80826db085980058eee9a
8console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=11 p99=18 max=152 mean=11 | jitter_ms max=27 | cpu_pct=12 | heap_mb=228 rss_mb=609 ext_mb=12 | state_serialize_ms p50=0 p99=0 max=0 n=30
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 104ms -> 85b4c1e546405e1127fd0d1221a32976509e7f94
8console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 103ms -> b7328d15a9cd5aff3fb033c95d0dd03769778326
console.ts:139 [Extension Host] [webview-metrics] state_msgs=25 p50=171KB p99=178KB max=178KB
8console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=11 p99=19 max=129 mean=10 | jitter_ms max=12 | cpu_pct=12 | heap_mb=187 rss_mb=627 ext_mb=10 | state_serialize_ms p50=0 p99=0 max=0 n=27
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 102ms -> d0b0fa8c424b5094d1a4329b5a3f94893a673a4a
console.ts:139 [Extension Host] [webview-metrics] state_msgs=46 p50=171KB p99=178KB max=178KB
8console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 193ms -> 173d2b7af51db941b0d8dd016f3495dd0129bcef
13console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=11 p99=18 max=49 mean=10 | jitter_ms max=23 | cpu_pct=12 | heap_mb=237 rss_mb=630 ext_mb=24 | state_serialize_ms p50=0 p99=0 max=0 n=42
3console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 107ms -> 2c18ce875b7fe5cdbf9722fc9c4609db9794ce5d
18console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 105ms -> ea809c10f13005d0c96174f41afac27067005e26
8console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
console.ts:139 [Extension Host] [webview-metrics] state_msgs=36 p50=164KB p99=178KB max=178KB
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 105ms -> 9a30b0dc2e4cfc706628b91de417d7da0773df21
8console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=12 p99=23 max=105 mean=11 | jitter_ms max=4 | cpu_pct=16 | heap_mb=232 rss_mb=634 ext_mb=14 | state_serialize_ms p50=0 p99=1 max=1 n=43
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 112ms -> 84d20b8f5295e4e072ace6c6ee1cd4d7d46a8799
8console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 112ms -> 54f3a5494df0a5eac576d3bee5b45daa414a949c
8console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 102ms -> a4a8b8bd72f1c7df8151d254f74d1dd897d68a23
8console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
console.ts:139 [Extension Host] [webview-metrics] state_msgs=41 p50=99KB p99=177KB max=177KB
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=12 p99=23 max=100 mean=11 | jitter_ms max=15 | cpu_pct=16 | heap_mb=278 rss_mb=662 ext_mb=26 | state_serialize_ms p50=0 p99=0 max=0 n=42
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 144ms -> f0c6772c87c918357ae8893747bae770741ad31b
64console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
console.ts:139 [Extension Host] [webview-metrics] state_msgs=27 p50=152KB p99=171KB max=171KB
8console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 113ms -> 72b4e7fbb901dc09f2f3d597b01a50c35299205b
21console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=11 p99=18 max=47 mean=10 | jitter_ms max=16 | cpu_pct=11 | heap_mb=199 rss_mb=643 ext_mb=13 | state_serialize_ms p50=0 p99=0 max=0 n=21
51console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 110ms -> 329c03913e449c9eaf3e8a7558e1828c4308479d
8console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
console.ts:139 [Extension Host] [webview-metrics] state_msgs=27 p50=155KB p99=166KB max=166KB
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 105ms -> 314ced3323b780201a333bf5f0b8a311dd64796f
10console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=11 p99=20 max=62 mean=11 | jitter_ms max=7 | cpu_pct=12 | heap_mb=218 rss_mb=647 ext_mb=23 | state_serialize_ms p50=0 p99=0 max=0 n=32
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 104ms -> 001e53a4fd559b197485689c296d4bf21eb241bf
8console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
console.ts:139 [Extension Host] [webview-metrics] state_msgs=44 p50=158KB p99=161KB max=161KB
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 107ms -> 522be23b376c5fda4063e61718b6db09d930cf15
8console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=12 p99=19 max=88 mean=11 | jitter_ms max=4 | cpu_pct=13 | heap_mb=263 rss_mb=649 ext_mb=34 | state_serialize_ms p50=0 p99=0 max=0 n=35
console.ts:139 [Extension Host] [webview-metrics] state_msgs=8 p50=166KB p99=166KB max=166KB
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=11 p99=12 max=23 mean=10 | jitter_ms max=3 | cpu_pct=5 | heap_mb=197 rss_mb=636 ext_mb=27 | state_serialize_ms p50=0 p99=0 max=0 n=3
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 105ms -> dabf0bf4f3f2e50a5b1c6c72661df1bd4ae1a9d8
10console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
console.ts:139 [Extension Host] [webview-metrics] state_msgs=12 p50=166KB p99=168KB max=168KB
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=11 p99=15 max=156 mean=10 | jitter_ms max=11 | cpu_pct=8 | heap_mb=200 rss_mb=636 ext_mb=31 | state_serialize_ms p50=0 p99=0 max=0 n=12
console.ts:139 [Extension Host] [webview-metrics] state_msgs=7 p50=166KB p99=168KB max=168KB
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=11 p99=12 max=40 mean=10 | jitter_ms max=10 | cpu_pct=6 | heap_mb=205 rss_mb=637 ext_mb=47 | state_serialize_ms p50=0 p99=0 max=0 n=7
console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 104ms -> 21af3b3a82dc2297b4244c44d1dc0c8cf9db7deb
4console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
log.ts:117   ERR [Extension Host] Document vscode-remote://ssh-remote%2B<remote-A>/root/roo-plus/src/core/services/TaskHistoryService.ts not found in AST tracker
logToConsole @ log.ts:117
console.ts:139 [Extension Host] Document vscode-remote://ssh-remote%2B<remote-A>/root/roo-plus/src/core/services/TaskHistoryService.ts not found in AST tracker
log @ console.ts:139
3console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
console.ts:139 [Extension Host] [webview-metrics] state_msgs=9 p50=168KB p99=171KB max=171KB
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 114ms -> 1f9387a9b786ba21e0eb0bc4cfae5027df01e10b
8console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=11 p99=16 max=137 mean=10 | jitter_ms max=15 | cpu_pct=11 | heap_mb=249 rss_mb=652 ext_mb=13 | state_serialize_ms p50=0 p99=0 max=0 n=25
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 105ms -> 37d210c2a131bb3abacd4335d7f123ed3f37d260
8console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 104ms -> b0349052000b5d64c4a8bc31bc72951a7ae3e80c
8console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
console.ts:139 [Extension Host] [webview-metrics] state_msgs=34 p50=166KB p99=178KB max=178KB
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 107ms -> 290f83239f2ca80a7e084d53c011e0739f5d04c5
8console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=11 p99=17 max=135 mean=10 | jitter_ms max=19 | cpu_pct=13 | heap_mb=205 rss_mb=666 ext_mb=29 | state_serialize_ms p50=0 p99=0 max=0 n=27
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 104ms -> 6b73a6f79498547127540a17b7320b6c78c84524
8console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
console.ts:139 [Extension Host] [webview-metrics] state_msgs=17 p50=176KB p99=177KB max=177KB
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=11 p99=14 max=90 mean=10 | jitter_ms max=16 | cpu_pct=7 | heap_mb=244 rss_mb=667 ext_mb=70 | state_serialize_ms p50=0 p99=0 max=0 n=12
console.ts:139 [Extension Host] [webview-metrics] state_msgs=4 p50=173KB p99=174KB max=174KB
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=11 p99=12 max=37 mean=10 | jitter_ms max=27 | cpu_pct=6 | heap_mb=251 rss_mb=673 ext_mb=42 | state_serialize_ms p50=0 p99=0 max=0 n=5
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 102ms -> e68b38498c8cb95a64e2102b5b2d610146b58d50
17console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
console.ts:139 [Extension Host] [webview-metrics] state_msgs=20 p50=171KB p99=175KB max=175KB
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=11 p99=16 max=100 mean=10 | jitter_ms max=47 | cpu_pct=9 | heap_mb=238 rss_mb=673 ext_mb=18 | state_serialize_ms p50=0 p99=0 max=0 n=20
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 155ms -> c911332050ecfd17784858279aa188453aeec2a6
7console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 104ms -> 43a0fc72a895226aa42796c70f4a126d332d51c8
2console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
console.ts:139 [Extension Host] [webview-metrics] state_msgs=32 p50=158KB p99=175KB max=175KB
14console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 112ms -> 435f84da2b44439049df3e1b3abd8040d4e4cc76
8console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=12 p99=20 max=119 mean=11 | jitter_ms max=11 | cpu_pct=13 | heap_mb=234 rss_mb=670 ext_mb=13 | state_serialize_ms p50=0 p99=0 max=0 n=37
console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
console.ts:139 [Extension Host] [webview-metrics] state_msgs=13 p50=172KB p99=173KB max=173KB
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=11 p99=14 max=125 mean=10 | jitter_ms max=6 | cpu_pct=8 | heap_mb=252 rss_mb=671 ext_mb=63 | state_serialize_ms p50=0 p99=0 max=0 n=10
console.ts:139 [Extension Host] [webview-metrics] state_msgs=8 p50=168KB p99=173KB max=173KB
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=12 p99=15 max=90 mean=10 | jitter_ms max=4 | cpu_pct=8 | heap_mb=221 rss_mb=669 ext_mb=39 | state_serialize_ms p50=0 p99=0 max=0 n=12
console.ts:139 [Extension Host] [webview-metrics] state_msgs=11 p50=160KB p99=168KB max=168KB
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=10 p99=11 max=19 mean=10 | jitter_ms max=1 | cpu_pct=5 | heap_mb=203 rss_mb=669 ext_mb=45 | state_serialize_ms p50=0 p99=0 max=0 n=0
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=10 p99=11 max=20 mean=10 | jitter_ms max=2 | cpu_pct=4 | heap_mb=199 rss_mb=669 ext_mb=33 | state_serialize_ms p50=0 p99=0 max=0 n=0
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=10 p99=12 max=26 mean=10 | jitter_ms max=1 | cpu_pct=5 | heap_mb=205 rss_mb=669 ext_mb=55 | state_serialize_ms p50=0 p99=0 max=0 n=0
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=10 p99=11 max=23 mean=10 | jitter_ms max=5 | cpu_pct=5 | heap_mb=194 rss_mb=669 ext_mb=18 | state_serialize_ms p50=0 p99=0 max=0 n=0
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=10 p99=12 max=21 mean=10 | jitter_ms max=1 | cpu_pct=5 | heap_mb=198 rss_mb=669 ext_mb=27 | state_serialize_ms p50=0 p99=0 max=0 n=0
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=10 p99=11 max=23 mean=10 | jitter_ms max=9 | cpu_pct=4 | heap_mb=207 rss_mb=670 ext_mb=60 | state_serialize_ms p50=0 p99=0 max=0 n=0
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=10 p99=12 max=21 mean=10 | jitter_ms max=1 | cpu_pct=4 | heap_mb=210 rss_mb=670 ext_mb=72 | state_serialize_ms p50=0 p99=0 max=0 n=0
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=10 p99=12 max=20 mean=10 | jitter_ms max=1 | cpu_pct=5 | heap_mb=200 rss_mb=670 ext_mb=36 | state_serialize_ms p50=0 p99=0 max=0 n=0
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=10 p99=12 max=19 mean=10 | jitter_ms max=8 | cpu_pct=5 | heap_mb=194 rss_mb=670 ext_mb=14 | state_serialize_ms p50=0 p99=0 max=0 n=0
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=11 p99=12 max=20 mean=10 | jitter_ms max=4 | cpu_pct=5 | heap_mb=207 rss_mb=670 ext_mb=46 | state_serialize_ms p50=0 p99=0 max=0 n=0
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=10 p99=11 max=20 mean=10 | jitter_ms max=2 | cpu_pct=4 | heap_mb=196 rss_mb=670 ext_mb=19 | state_serialize_ms p50=0 p99=0 max=0 n=0
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=10 p99=12 max=19 mean=10 | jitter_ms max=1 | cpu_pct=5 | heap_mb=197 rss_mb=670 ext_mb=27 | state_serialize_ms p50=0 p99=0 max=0 n=0
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=10 p99=11 max=20 mean=10 | jitter_ms max=1 | cpu_pct=5 | heap_mb=196 rss_mb=670 ext_mb=18 | state_serialize_ms p50=0 p99=0 max=0 n=0
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=10 p99=11 max=22 mean=10 | jitter_ms max=1 | cpu_pct=4 | heap_mb=195 rss_mb=670 ext_mb=18 | state_serialize_ms p50=0 p99=0 max=0 n=0
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=11 p99=12 max=20 mean=10 | jitter_ms max=1 | cpu_pct=5 | heap_mb=199 rss_mb=670 ext_mb=27 | state_serialize_ms p50=0 p99=0 max=0 n=0
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=10 p99=11 max=22 mean=10 | jitter_ms max=1 | cpu_pct=4 | heap_mb=207 rss_mb=670 ext_mb=63 | state_serialize_ms p50=0 p99=0 max=0 n=0
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=10 p99=12 max=22 mean=10 | jitter_ms max=1 | cpu_pct=5 | heap_mb=193 rss_mb=670 ext_mb=9 | state_serialize_ms p50=0 p99=0 max=0 n=0
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=10 p99=11 max=21 mean=10 | jitter_ms max=5 | cpu_pct=4 | heap_mb=207 rss_mb=670 ext_mb=64 | state_serialize_ms p50=0 p99=0 max=0 n=0
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=10 p99=12 max=19 mean=10 | jitter_ms max=2 | cpu_pct=5 | heap_mb=203 rss_mb=670 ext_mb=45 | state_serialize_ms p50=0 p99=0 max=0 n=0
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=10 p99=12 max=19 mean=10 | jitter_ms max=3 | cpu_pct=5 | heap_mb=207 rss_mb=670 ext_mb=45 | state_serialize_ms p50=0 p99=0 max=0 n=0
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=11 p99=13 max=66 mean=10 | jitter_ms max=11 | cpu_pct=6 | heap_mb=258 rss_mb=685 ext_mb=39 | state_serialize_ms p50=0 p99=0 max=0 n=6
console.ts:139 [Extension Host] [webview-metrics] state_msgs=13 p50=154KB p99=160KB max=160KB
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=11 p99=14 max=82 mean=10 | jitter_ms max=3 | cpu_pct=7 | heap_mb=194 rss_mb=670 ext_mb=14 | state_serialize_ms p50=0 p99=0 max=0 n=7
console.ts:139 [Extension Host] [webview-metrics] state_msgs=3 p50=149KB p99=149KB max=149KB
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=10 p99=12 max=99 mean=10 | jitter_ms max=2 | cpu_pct=6 | heap_mb=219 rss_mb=672 ext_mb=42 | state_serialize_ms p50=0 p99=0 max=0 n=7
console.ts:139 [Extension Host] [webview-metrics] state_msgs=4 p50=119KB p99=120KB max=120KB
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=11 p99=13 max=36 mean=10 | jitter_ms max=15 | cpu_pct=5 | heap_mb=205 rss_mb=674 ext_mb=36 | state_serialize_ms p50=0 p99=0 max=0 n=0
console.ts:139 [Extension Host] [webview-metrics] state_msgs=6 p50=120KB p99=121KB max=121KB
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 150ms -> 8e61618206933a93805a40f33dcfa6ccf6bcf1e9
console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
log.ts:117  INFO Extension host (Remote) is unresponsive.
console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
log.ts:117  INFO Extension host (Remote) is responsive.
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=12 p99=17 max=270 mean=10 | jitter_ms max=214 | cpu_pct=9 | heap_mb=231 rss_mb=651 ext_mb=21 | state_serialize_ms p50=0 p99=0 max=0 n=20
2console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
log.ts:117   ERR [Extension Host] Document vscode-remote://ssh-remote%2B<remote-A>/root/roo-plus/packages/types/src/extension-messages/__tests__/parseExtensionMessage.spec.ts not found in AST tracker
logToConsole @ log.ts:117
console.ts:139 [Extension Host] Document vscode-remote://ssh-remote%2B<remote-A>/root/roo-plus/packages/types/src/extension-messages/__tests__/parseExtensionMessage.spec.ts not found in AST tracker
log @ console.ts:139
11console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
console.ts:139 [Extension Host] [webview-metrics] state_msgs=20 p50=125KB p99=146KB max=146KB
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=11 p99=14 max=70 mean=10 | jitter_ms max=1 | cpu_pct=7 | heap_mb=202 rss_mb=646 ext_mb=72 | state_serialize_ms p50=0 p99=0 max=0 n=6
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=10 p99=12 max=26 mean=10 | jitter_ms max=1 | cpu_pct=5 | heap_mb=188 rss_mb=646 ext_mb=18 | state_serialize_ms p50=0 p99=0 max=0 n=0
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=10 p99=11 max=21 mean=10 | jitter_ms max=4 | cpu_pct=4 | heap_mb=202 rss_mb=646 ext_mb=65 | state_serialize_ms p50=0 p99=0 max=0 n=0
console.ts:139 [Extension Host] [host-health] elu_ms p50=10 p95=10 p99=12 max=21 mean=10 | jitter_ms max=1 | cpu_pct=5 | heap_mb=191 rss_mb=646 ext_mb=28 | state_serialize_ms p50=0 p99=0 max=0 n=0
"

Now the 3 projects in server B:
<project-1> (This one recovered by it-self):
"
 INFO Started local extension host with pid 6678.
log.ts:117  INFO [AgentHost:remote] Initializing (remoteAuthority=ssh-remote+<remote-C>)
log.ts:117  INFO [AccountPolicyGate] apply: state=inactive, reason=undefined, isRestricted=false
log.ts:117  WARN Failed to get installed servers from file://<workspace-path> Error: Failed to parse scanned MCP servers: [288, 22] Comma expected
    at Object.factory (mcpResourceScannerService.ts:112:13)
logToConsole @ log.ts:117
log.ts:117  WARN Authentication provider github was not declared in the Extension Manifest.
logToConsole @ log.ts:117
log.ts:117  WARN Authentication provider github-enterprise was not declared in the Extension Manifest.
logToConsole @ log.ts:117
log.ts:117  INFO Invoking resolveAuthority(ssh-remote)...
log.ts:117  INFO [LocalProcess0][resolveAuthority(ssh-remote,1)][0ms] obtaining proxy...
log.ts:117  INFO [LocalProcess0][resolveAuthority(ssh-remote,1)][20ms] invoking...
log.ts:117  INFO [LocalProcess0][resolveAuthority(ssh-remote,1)][1047ms] waiting...
log.ts:117  INFO [LocalProcess0][resolveAuthority(ssh-remote,1)][2021ms] waiting...
log.ts:117  INFO [LocalProcess0][resolveAuthority(ssh-remote,1)][2124ms] returned WebSocket(127.0.0.1:43091)
log.ts:117  INFO resolveAuthority(ssh-remote) returned 'WebSocket(127.0.0.1:43091)' after 2126 ms
log.ts:117  INFO Creating a socket (renderer-Management-<task-id>)...
log.ts:117  INFO Creating a socket (renderer-ExtensionHost-<task-id>)...
log.ts:117  INFO Creating a socket (renderer-Management-<task-id>) was successful after 326 ms.
log.ts:117  INFO Creating a socket (renderer-ExtensionHost-<task-id>) was successful after 644 ms.
log.ts:117  INFO [reconnection-grace-time] Client received grace time from server: 10800000ms (10800s)
log.ts:117  INFO [AccountPolicyGate] apply: state=inactive, reason=undefined, isRestricted=false
log.ts:117  WARN MCP migration: Failed to parse MCP config from vscode-remote://ssh-remote%2B<remote-C>/root/.vscodium-server/data/Machine/settings.json: SyntaxError: Expected ',' or '}' after property value in JSON at position 178 (line 13 column 2)
    at JSON.parse (<anonymous>)
    at yP (jsonc.ts:62:15)
    at V9e.parseMcpConfig (mcpMigration.ts:128:55)
    at async V9e.migrateMcpConfig (mcpMigration.ts:64:33)
logToConsole @ log.ts:117
log.ts:117  INFO [Continue.continue]: Command `continue.focusContinueInput` already registered by Continue - open-source AI code agent (Continue.continue)
log.ts:117  INFO [perf] Render performance baseline is 67ms
log.ts:117   ERR [Extension Host] Failed to register Continue config.yaml schema, most likely, YAML extension is not installed CodeExpectedError: Unable to write to User Settings because yaml.schemas is not a registered configuration.
    at WZt.toConfigurationEditingError (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:8353)
    at WZt.validate (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:11133)
    at WZt.doWriteConfiguration (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:4722)
    at Object.factory (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:4578)
    at kE.consume (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:30:78522)
    at vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:30:78337
    at new Promise (<anonymous>)
    at kE.queue (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:30:78261)
    at WZt.writeConfiguration (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:4547)
    at Jnr.writeConfigurationValue (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:61687)
    at async Promise.all (index 0)
    at async Object.e [as settled] (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:30:85791)
    at async Jnr.updateValue (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:44632)
logToConsole @ log.ts:117
console.ts:139 [Extension Host] Failed to register Continue config.yaml schema, most likely, YAML extension is not installed CodeExpectedError: Unable to write to User Settings because yaml.schemas is not a registered configuration.
    at WZt.toConfigurationEditingError (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:8353)
    at WZt.validate (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:11133)
    at WZt.doWriteConfiguration (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:4722)
    at Object.factory (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:4578)
    at kE.consume (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:30:78522)
    at vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:30:78337
    at new Promise (<anonymous>)
    at kE.queue (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:30:78261)
    at WZt.writeConfiguration (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:4547)
    at Jnr.writeConfigurationValue (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:61687)
    at async Promise.all (index 0)
    at async Object.e [as settled] (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:30:85791)
    at async Jnr.updateValue (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:44632)
log @ console.ts:139
console.ts:139 [Extension Host] Loaded translations for languages: ca, de, en, es, fr, hi, id, it, ja, ko, nl, pl, pt-BR, ru, tr, vi, zh-CN, zh-TW
log.ts:117   ERR navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.: PendingMigrationError: navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.
    at get (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:7413)
    at Object.<anonymous> (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:3422:7503)
    at Module._compile (node:internal/modules/cjs/loader:1871:14)
    at Object..js (node:internal/modules/cjs/loader:2002:10)
    at Module.load (node:internal/modules/cjs/loader:1594:32)
    at Module.<anonymous> (node:internal/modules/cjs/loader:1396:12)
    at e._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:6783)
    at i._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:280:29221)
    at r._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:272:27101)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.require (node:internal/modules/cjs/loader:1617:12)
    at require (node:internal/modules/helpers:153:16)
    at Sle._doLoadModule (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:283:1507)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
logToConsole @ log.ts:117
log.ts:117   ERR navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.: PendingMigrationError: navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.
    at get (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:7413)
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:589:17803
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at bCt.exports (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:764:132)
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:767:11671
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:775:690
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:797:625
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at Object.<anonymous> (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:3429:10351)
    at Module._compile (node:internal/modules/cjs/loader:1871:14)
    at Object..js (node:internal/modules/cjs/loader:2002:10)
    at Module.load (node:internal/modules/cjs/loader:1594:32)
    at Module.<anonymous> (node:internal/modules/cjs/loader:1396:12)
    at e._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:6783)
    at i._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:280:29221)
    at r._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:272:27101)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.require (node:internal/modules/cjs/loader:1617:12)
    at require (node:internal/modules/helpers:153:16)
    at Sle._doLoadModule (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:283:1507)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
logToConsole @ log.ts:117
log.ts:117   ERR navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.: PendingMigrationError: navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.
    at get (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:7413)
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:50:8175
    at get value (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:50:3145)
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:76:200
    at $ZodObject.a (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:50:902)
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:78:18795
    at a (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:50:902)
    at new ZodObject (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:50:1161)
    at Yd (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:78:8982)
    at Object.<anonymous> (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:3495:4986)
    at Module._compile (node:internal/modules/cjs/loader:1871:14)
    at Object..js (node:internal/modules/cjs/loader:2002:10)
    at Module.load (node:internal/modules/cjs/loader:1594:32)
    at Module.<anonymous> (node:internal/modules/cjs/loader:1396:12)
    at e._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:6783)
    at i._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:280:29221)
    at r._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:272:27101)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.require (node:internal/modules/cjs/loader:1617:12)
    at require (node:internal/modules/helpers:153:16)
    at Sle._doLoadModule (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:283:1507)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
logToConsole @ log.ts:117
log.ts:117   ERR navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.: PendingMigrationError: navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.
    at get (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:7413)
    at Object.<anonymous> (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:4095:76375)
    at Module._compile (node:internal/modules/cjs/loader:1871:14)
    at Object..js (node:internal/modules/cjs/loader:2002:10)
    at Module.load (node:internal/modules/cjs/loader:1594:32)
    at Module.<anonymous> (node:internal/modules/cjs/loader:1396:12)
    at e._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:6783)
    at i._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:280:29221)
    at r._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:272:27101)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.require (node:internal/modules/cjs/loader:1617:12)
    at require (node:internal/modules/helpers:153:16)
    at Sle._doLoadModule (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:283:1507)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
logToConsole @ log.ts:117
log.ts:117   ERR navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.: PendingMigrationError: navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.
    at get (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:7413)
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:2946:94733
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:2955:88231
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:2955:90560
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at Object.<anonymous> (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:4103:18960)
    at Module._compile (node:internal/modules/cjs/loader:1871:14)
    at Object..js (node:internal/modules/cjs/loader:2002:10)
    at Module.load (node:internal/modules/cjs/loader:1594:32)
    at Module.<anonymous> (node:internal/modules/cjs/loader:1396:12)
    at e._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:6783)
    at i._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:280:29221)
    at r._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:272:27101)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.require (node:internal/modules/cjs/loader:1617:12)
    at require (node:internal/modules/helpers:153:16)
    at Sle._doLoadModule (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:283:1507)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
logToConsole @ log.ts:117
console.ts:139 [Extension Host] [SembleProvider] Semble found and ready.
log.ts:117   ERR [Extension Host] Vercel AI Gateway models response is invalid {"_errors":[],"data":{"107":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"108":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"109":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"110":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"111":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"112":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"113":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"114":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"128":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"129":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"228":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"229":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"280":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"291":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"292":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"293":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"353":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"354":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"_errors":[]}}
logToConsole @ log.ts:117
console.ts:139 [Extension Host] Vercel AI Gateway models response is invalid {"_errors":[],"data":{"107":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"108":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"109":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"110":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"111":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"112":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"113":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"114":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"128":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"129":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"228":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"229":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"280":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"291":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"292":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"293":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"353":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"354":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"_errors":[]}}
log @ console.ts:139
webviewElement.ts:427 Unrecognized feature: 'local-network-access'.
_createElement @ webviewElement.ts:427
webviewElement.ts:507 An iframe which has both allow-scripts and allow-same-origin for its sandbox attribute can escape its sandboxing.
mountTo @ webviewElement.ts:507
webviewElement.ts:507 An iframe which has both allow-scripts and allow-same-origin for its sandbox attribute can escape its sandboxing.
mountTo @ webviewElement.ts:507
console.ts:139 [Extension Host] [webview-metrics] ERROR "state" payload 1097KB > 1MB top[taskHistory=1039KB customModes=59KB clineMessages=0KB] runbook=docs/runbooks/gray-webview.md
console.ts:139 [Extension Host] [createTaskWithHistoryItem] parent task <task-id> instantiated
console.ts:139 [Extension Host] [Task#getCheckpointService] initializing checkpoints service
2console.ts:139 [Extension Host] [Task#getCheckpointService] initializing shadow git
console.ts:139 [Extension Host] [createSanitizedGit] Created git instance for baseDir: /root/.vscodium-server/data/User/globalStorage/xavier-arosemena.roo-plus/tasks/<task-id>/checkpoints
2console.ts:139 [Extension Host] [t#create] git = 2.53.0
2console.ts:139 [Extension Host] [t#initShadowGit] shadow git repo already exists at /root/.vscodium-server/data/User/globalStorage/xavier-arosemena.roo-plus/tasks/<task-id>/checkpoints/.git
2console.ts:139 [Extension Host] [t#initShadowGit] initialized shadow repo with base commit 49151b3ab29689a19312900fda6a547c57b3e508 in 36ms
2console.ts:139 [Extension Host] [Task#getCheckpointService] service initialized
console.ts:139 [Extension Host] [webview-metrics] state_msgs=16 p50=78KB p99=1097KB max=1097KB
console.ts:139 [Extension Host] [webview-metrics] state_msgs=7 p50=118KB p99=138KB max=138KB
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 134ms -> 1899ce2b0b03f59caa560ebf62fddd8a9e1353c4
4console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
console.ts:139 [Extension Host] [webview-metrics] state_msgs=10 p50=159KB p99=165KB max=165KB
3console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 114ms -> 89f2d13feeee645c491fc29f4440a2638642d6b4
8console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
console.ts:139 [Extension Host] [webview-metrics] state_msgs=9 p50=159KB p99=168KB max=168KB
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 107ms -> bf85ebb326d989a5d4cca4844a31e5c297756498
8console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 106ms -> a2a5ecd8a9c5b6378db745d0df29705fc2cfd678
8console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 120ms -> b60e338cfa022bd8dd57833433a0451e01eeffd9
8console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 102ms -> 122a5b767168fb8311bb4d72f130b22b620f30a7
console.ts:139 [Extension Host] [webview-metrics] state_msgs=24 p50=166KB p99=173KB max=173KB
8console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 108ms -> b37b99c9ab780c702aba38a1498732272b7effcb
16console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
console.ts:139 [Extension Host] [webview-metrics] state_msgs=16 p50=146KB p99=177KB max=177KB
console.ts:139 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
console.ts:139 [Extension Host] [webview-metrics] state_msgs=12 p50=153KB p99=155KB max=155KB
console.ts:139 [Extension Host] [webview-metrics] state_msgs=11 p50=158KB p99=162KB max=162KB
console.ts:139 [Extension Host] [AttemptCompletionTool] Skipping delegation for child <task-id>: parent <task-id> is not awaiting this child. Diagnostic: { childStatus: "interrupted", parentStatus: "active", awaitingChildId: "undefined" }
console.ts:139 [Extension Host] [AttemptCompletionTool] Skipping delegation for child <task-id>: parent <task-id> is not awaiting this child. Diagnostic: { childStatus: "interrupted", parentStatus: "active", awaitingChildId: "undefined" }
log @ console.ts:139
console.ts:139 [Extension Host] [webview-metrics] state_msgs=18 p50=164KB p99=174KB max=174KB
console.ts:139 [Extension Host] [Task#dispose] disposing task <task-id>
console.ts:139 [Extension Host] [webview-metrics] ERROR "state" payload 1091KB > 1MB top[taskHistory=1037KB customModes=56KB clineMessages=0KB] runbook=docs/runbooks/gray-webview.md
console.ts:139 [Extension Host] [createTaskWithHistoryItem] parent task <task-id> instantiated
console.ts:139 [Extension Host] [webview-metrics] state_msgs=2 p50=163KB p99=1091KB max=1091KB
console.ts:139 [Extension Host] [Task#getCheckpointService] initializing checkpoints service
2console.ts:139 [Extension Host] [Task#getCheckpointService] initializing shadow git
console.ts:139 [Extension Host] [createSanitizedGit] Created git instance for baseDir: /root/.vscodium-server/data/User/globalStorage/xavier-arosemena.roo-plus/tasks/<task-id>/checkpoints
2console.ts:139 [Extension Host] [t#create] git = 2.53.0
2console.ts:139 [Extension Host] [t#initShadowGit] shadow git repo already exists at /root/.vscodium-server/data/User/globalStorage/xavier-arosemena.roo-plus/tasks/<task-id>/checkpoints/.git
2console.ts:139 [Extension Host] [t#initShadowGit] initialized shadow repo with base commit f3e695fe07e09b577380a858b06a67fbaa681a02 in 44ms
2console.ts:139 [Extension Host] [Task#getCheckpointService] service initialized
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: false)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 120ms -> 3fb747383f11ce8c3c6bb9878c003dced70b1c9e
2console.ts:139 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2console.ts:139 [Extension Host] [t#saveCheckpoint] checkpoint saved in 113ms -> 8c531e7f7a20fa5010541e9979519432f335faad
console.ts:139 [Extension Host] [Task#dispose] disposing task <task-id>
console.ts:139 [Extension Host] [webview-metrics] ERROR "state" payload 1099KB > 1MB top[taskHistory=1037KB customModes=64KB clineMessages=0KB] runbook=docs/runbooks/gray-webview.md
console.ts:139 [Extension Host] [createTask] child task <task-id> instantiated
console.ts:139 [Extension Host] [getTaskWithId] api_conversation_history.json missing for task <task-id>, returning empty history
log @ console.ts:139
console.ts:139 [Extension Host] [Task#getCheckpointService] initializing checkpoints service
2console.ts:139 [Extension Host] [Task#getCheckpointService] initializing shadow git
console.ts:139 [Extension Host] [createSanitizedGit] Created git instance for baseDir: /root/.vscodium-server/data/User/globalStorage/xavier-arosemena.roo-plus/tasks/<task-id>/checkpoints
2console.ts:139 [Extension Host] [t#create] git = 2.53.0
2console.ts:139 [Extension Host] [t#initShadowGit] creating shadow git repo at /root/.vscodium-server/data/User/globalStorage/xavier-arosemena.roo-plus/tasks/<task-id>/checkpoints
2console.ts:139 [Extension Host] [t#initShadowGit] initialized shadow repo with base commit 39a0390a0baa29c241acf3831de244b4a3c23bc4 in 1585ms
2console.ts:139 [Extension Host] [Task#getCheckpointService] service initialized
console.ts:139 [Extension Host] [webview-metrics] state_msgs=21 p50=63KB p99=1099KB max=1099KB
console.ts:139 [Extension Host] [webview-metrics] state_msgs=40 p50=72KB p99=84KB max=84KB
log.ts:117  INFO Extension host (Remote) is unresponsive.
log.ts:117  INFO [remote-connection][ExtensionHost][c253f…][reconnect] received socket timeout event (reason: unacknowledgedMessage, unacknowledgedMsgCount: 4556, timeSinceOldestUnacknowledgedMsg: 46940, timeSinceLastReceivedSomeData: 20000).
log.ts:117  INFO [remote-connection][ExtensionHost][c253f…][reconnect] starting reconnecting loop. You can get more information with the trace log level.
log.ts:117  INFO [remote-connection][ExtensionHost][c253f…][reconnect] starting reconnection with grace time: 10800000ms (10800s)
log.ts:117  INFO [remote-connection][ExtensionHost][c253f…][reconnect] resolving connection...
log.ts:117  INFO [remote-connection][ExtensionHost][c253f…][reconnect] connecting to WebSocket(127.0.0.1:43091)...
log.ts:117  INFO Creating a socket (renderer-ExtensionHost-<task-id>)...
log.ts:117  INFO Creating a socket (renderer-ExtensionHost-<task-id>) was successful after 388 ms.
log.ts:117  INFO [remote-connection][ExtensionHost][c253f…][reconnect] reconnected!
log.ts:117  INFO [remote-connection][ExtensionHost][c253f…][reconnect] received socket timeout event (reason: unacknowledgedMessage, unacknowledgedMsgCount: 4556, timeSinceOldestUnacknowledgedMsg: 20000, timeSinceLastReceivedSomeData: 20003).
log.ts:117  INFO [remote-connection][ExtensionHost][c253f…][reconnect] starting reconnecting loop. You can get more information with the trace log level.
log.ts:117  INFO [remote-connection][ExtensionHost][c253f…][reconnect] starting reconnection with grace time: 10800000ms (10800s)
log.ts:117  INFO [remote-connection][ExtensionHost][c253f…][reconnect] resolving connection...
log.ts:117  INFO [remote-connection][ExtensionHost][c253f…][reconnect] connecting to WebSocket(127.0.0.1:43091)...
log.ts:117  INFO Creating a socket (renderer-ExtensionHost-<task-id>)...
log.ts:117  INFO Creating a socket (renderer-ExtensionHost-<task-id>) was successful after 6722 ms.
log.ts:117  INFO [remote-connection][ExtensionHost][c253f…][reconnect] reconnected!
log.ts:117  INFO [remote-connection][ExtensionHost][c253f…][reconnect] received socket timeout event (reason: unacknowledgedMessage, unacknowledgedMsgCount: 4556, timeSinceOldestUnacknowledgedMsg: 20001, timeSinceLastReceivedSomeData: 20003).
log.ts:117  INFO [remote-connection][ExtensionHost][c253f…][reconnect] starting reconnecting loop. You can get more information with the trace log level.
log.ts:117  INFO [remote-connection][ExtensionHost][c253f…][reconnect] starting reconnection with grace time: 10800000ms (10800s)
log.ts:117  INFO [remote-connection][ExtensionHost][c253f…][reconnect] resolving connection...
log.ts:117  INFO [remote-connection][ExtensionHost][c253f…][reconnect] connecting to WebSocket(127.0.0.1:43091)...
log.ts:117  INFO Creating a socket (renderer-ExtensionHost-<task-id>)...
log.ts:117  INFO Creating a socket (renderer-ExtensionHost-<task-id>) was successful after 294 ms.
log.ts:117   ERR [remote-connection][ExtensionHost][c253f…][reconnect][WebSocket(127.0.0.1:43091)] received error control message when negotiating connection. Error:
logToConsole @ log.ts:117
error @ log.ts:564
error @ log.ts:669
error @ logService.ts:51
(anonymous) @ remoteAgentConnection.ts:328
_deliver @ event.ts:1391
fire @ event.ts:1422
fire @ ipc.net.ts:658
_receiveMessage @ ipc.net.ts:1034
(anonymous) @ ipc.net.ts:968
_deliver @ event.ts:1391
fire @ event.ts:1422
acceptChunk @ ipc.net.ts:400
(anonymous) @ ipc.net.ts:356
(anonymous) @ browserSocketFactory.ts:232
_deliver @ event.ts:1391
fire @ event.ts:1422
(anonymous) @ browserSocketFactory.ts:93
log.ts:117   ERR Error: Connection error: Unknown reconnection token (seen before)
    at GMs (remoteAgentConnection.ts:800:17)
    at uke.value (remoteAgentConnection.ts:326:17)
    at A._deliver (event.ts:1391:13)
    at A.fire (event.ts:1422:9)
    at DJ.fire (ipc.net.ts:658:19)
    at iFn._receiveMessage (ipc.net.ts:1034:28)
    at uke.value (ipc.net.ts:968:72)
    at A._deliver (event.ts:1391:13)
    at A.fire (event.ts:1422:9)
    at yvt.acceptChunk (ipc.net.ts:400:21)
    at ipc.net.ts:356:51
    at uke.value (browserSocketFactory.ts:232:39)
    at A._deliver (event.ts:1391:13)
    at A.fire (event.ts:1422:9)
    at Aor._fileReader.onload (browserSocketFactory.ts:93:17)
logToConsole @ log.ts:117
error @ log.ts:564
error @ log.ts:669
error @ logService.ts:51
(anonymous) @ remoteAgentConnection.ts:329
_deliver @ event.ts:1391
fire @ event.ts:1422
fire @ ipc.net.ts:658
_receiveMessage @ ipc.net.ts:1034
(anonymous) @ ipc.net.ts:968
_deliver @ event.ts:1391
fire @ event.ts:1422
acceptChunk @ ipc.net.ts:400
(anonymous) @ ipc.net.ts:356
(anonymous) @ browserSocketFactory.ts:232
_deliver @ event.ts:1391
fire @ event.ts:1422
(anonymous) @ browserSocketFactory.ts:93
log.ts:117   ERR [remote-connection][ExtensionHost][c253f…][reconnect] A permanent error occurred in the reconnecting loop! Will give up now! Error:
logToConsole @ log.ts:117
error @ log.ts:564
error @ log.ts:669
error @ logService.ts:51
_runReconnectingLoop @ remoteAgentConnection.ts:690
log.ts:117   ERR Error: Connection error: Unknown reconnection token (seen before)
    at GMs (remoteAgentConnection.ts:800:17)
    at uke.value (remoteAgentConnection.ts:326:17)
    at A._deliver (event.ts:1391:13)
    at A.fire (event.ts:1422:9)
    at DJ.fire (ipc.net.ts:658:19)
    at iFn._receiveMessage (ipc.net.ts:1034:28)
    at uke.value (ipc.net.ts:968:72)
    at A._deliver (event.ts:1391:13)
    at A.fire (event.ts:1422:9)
    at yvt.acceptChunk (ipc.net.ts:400:21)
    at ipc.net.ts:356:51
    at uke.value (browserSocketFactory.ts:232:39)
    at A._deliver (event.ts:1391:13)
    at A.fire (event.ts:1422:9)
    at Aor._fileReader.onload (browserSocketFactory.ts:93:17)
logToConsole @ log.ts:117
error @ log.ts:564
error @ log.ts:669
error @ logService.ts:51
_runReconnectingLoop @ remoteAgentConnection.ts:691
abstractExtensionService.ts:888 Extension host (Remote) terminated unexpectedly. Code: 0, Signal: <task-id>
_onExtensionHostCrashed @ abstractExtensionService.ts:888
_onExtensionHostCrashed @ nativeExtensionService.ts:160
_onExtensionHostCrashOrExit @ abstractExtensionService.ts:880
(anonymous) @ abstractExtensionService.ts:853
_deliver @ event.ts:1391
fire @ event.ts:1422
_onExtHostConnectionLost @ remoteExtensionHost.ts:205
(anonymous) @ remoteExtensionHost.ts:139
_deliver @ event.ts:1391
fire @ event.ts:1422
fire @ ipc.net.ts:658
acceptDisconnect @ ipc.net.ts:992
safeDisposeProtocolAndSocket @ remoteAgentConnection.ts:789
_gotoPermanentFailure @ remoteAgentConnection.ts:744
_onReconnectionPermanentFailure @ remoteAgentConnection.ts:738
_runReconnectingLoop @ remoteAgentConnection.ts:692
log.ts:117   ERR Extension host (Remote) terminated unexpectedly with code null.
logToConsole @ log.ts:117
error @ log.ts:564
error @ log.ts:669
error @ logService.ts:51
_onRemoteExtensionHostCrashed @ abstractExtensionService.ts:918
log.ts:117   ERR Extension host (Remote) terminated unexpectedly. The following extensions were running: vscode.emmet, xavier-arosemena.roo-plus, vscode.tunnel-forwarding, vscode.git-base, vscode.git, vscode.github, vscode.debug-auto-launch, vscode.merge-conflict, vscode.extension-editing, vscode.markdown-language-features, vscode.markdown-math, vscode.mermaid-markdown-features
logToConsole @ log.ts:117
error @ log.ts:564
error @ log.ts:669
error @ logService.ts:51
_logExtensionHostCrash @ abstractExtensionService.ts:953
_onRemoteExtensionHostCrashed @ abstractExtensionService.ts:921
log.ts:117  INFO Automatically restarting the remote extension host.
log.ts:117  INFO Creating a socket (renderer-ExtensionHost-<task-id>)...
log.ts:117  INFO Creating a socket (renderer-ExtensionHost-<task-id>) was successful after 314 ms.
console.ts:139 [Extension Host] Loaded translations for languages: ca, de, en, es, fr, hi, id, it, ja, ko, nl, pl, pt-BR, ru, tr, vi, zh-CN, zh-TW
log.ts:117   ERR navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.: PendingMigrationError: navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.
    at get (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:7413)
    at Object.<anonymous> (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:3422:7503)
    at Module._compile (node:internal/modules/cjs/loader:1871:14)
    at Object..js (node:internal/modules/cjs/loader:2002:10)
    at Module.load (node:internal/modules/cjs/loader:1594:32)
    at Module.<anonymous> (node:internal/modules/cjs/loader:1396:12)
    at e._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:6783)
    at i._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:280:29221)
    at r._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:272:27101)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.require (node:internal/modules/cjs/loader:1617:12)
    at require (node:internal/modules/helpers:153:16)
    at Sle._doLoadModule (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:283:1507)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
logToConsole @ log.ts:117
error @ log.ts:564
error @ log.ts:669
error @ logService.ts:51
handleUnexpectedError @ workbench.ts:129
(anonymous) @ workbench.ts:110
onUnexpectedError @ errors.ts:65
onUnexpectedError @ errors.ts:110
$onUnexpectedError @ mainThreadErrors.ts:21
_doInvokeHandler @ rpcProtocol.ts:458
_invokeHandler @ rpcProtocol.ts:443
_receiveRequest @ rpcProtocol.ts:370
_receiveOneMessage @ rpcProtocol.ts:297
(anonymous) @ rpcProtocol.ts:159
_deliver @ event.ts:1391
fire @ event.ts:1422
fire @ ipc.net.ts:658
_receiveMessage @ ipc.net.ts:1028
(anonymous) @ ipc.net.ts:885
_deliver @ event.ts:1391
fire @ event.ts:1422
acceptChunk @ ipc.net.ts:400
(anonymous) @ ipc.net.ts:356
(anonymous) @ browserSocketFactory.ts:232
_deliver @ event.ts:1391
fire @ event.ts:1422
(anonymous) @ browserSocketFactory.ts:93
log.ts:117   ERR navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.: PendingMigrationError: navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.
    at get (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:7413)
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:589:17803
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at bCt.exports (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:764:132)
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:767:11671
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:775:690
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:797:625
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at Object.<anonymous> (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:3429:10351)
    at Module._compile (node:internal/modules/cjs/loader:1871:14)
    at Object..js (node:internal/modules/cjs/loader:2002:10)
    at Module.load (node:internal/modules/cjs/loader:1594:32)
    at Module.<anonymous> (node:internal/modules/cjs/loader:1396:12)
    at e._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:6783)
    at i._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:280:29221)
    at r._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:272:27101)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.require (node:internal/modules/cjs/loader:1617:12)
    at require (node:internal/modules/helpers:153:16)
    at Sle._doLoadModule (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:283:1507)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
logToConsole @ log.ts:117
error @ log.ts:564
error @ log.ts:669
error @ logService.ts:51
handleUnexpectedError @ workbench.ts:129
(anonymous) @ workbench.ts:110
onUnexpectedError @ errors.ts:65
onUnexpectedError @ errors.ts:110
$onUnexpectedError @ mainThreadErrors.ts:21
_doInvokeHandler @ rpcProtocol.ts:458
_invokeHandler @ rpcProtocol.ts:443
_receiveRequest @ rpcProtocol.ts:370
_receiveOneMessage @ rpcProtocol.ts:297
(anonymous) @ rpcProtocol.ts:159
_deliver @ event.ts:1391
fire @ event.ts:1422
fire @ ipc.net.ts:658
_receiveMessage @ ipc.net.ts:1028
(anonymous) @ ipc.net.ts:885
_deliver @ event.ts:1391
fire @ event.ts:1422
acceptChunk @ ipc.net.ts:400
(anonymous) @ ipc.net.ts:356
(anonymous) @ browserSocketFactory.ts:232
_deliver @ event.ts:1391
fire @ event.ts:1422
(anonymous) @ browserSocketFactory.ts:93
log.ts:117   ERR navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.: PendingMigrationError: navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.
    at get (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:7413)
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:50:8175
    at get value (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:50:3145)
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:76:200
    at $ZodObject.a (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:50:902)
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:78:18795
    at a (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:50:902)
    at new ZodObject (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:50:1161)
    at Yd (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:78:8982)
    at Object.<anonymous> (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:3495:4986)
    at Module._compile (node:internal/modules/cjs/loader:1871:14)
    at Object..js (node:internal/modules/cjs/loader:2002:10)
    at Module.load (node:internal/modules/cjs/loader:1594:32)
    at Module.<anonymous> (node:internal/modules/cjs/loader:1396:12)
    at e._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:6783)
    at i._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:280:29221)
    at r._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:272:27101)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.require (node:internal/modules/cjs/loader:1617:12)
    at require (node:internal/modules/helpers:153:16)
    at Sle._doLoadModule (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:283:1507)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
logToConsole @ log.ts:117
error @ log.ts:564
error @ log.ts:669
error @ logService.ts:51
handleUnexpectedError @ workbench.ts:129
(anonymous) @ workbench.ts:110
onUnexpectedError @ errors.ts:65
onUnexpectedError @ errors.ts:110
$onUnexpectedError @ mainThreadErrors.ts:21
_doInvokeHandler @ rpcProtocol.ts:458
_invokeHandler @ rpcProtocol.ts:443
_receiveRequest @ rpcProtocol.ts:370
_receiveOneMessage @ rpcProtocol.ts:297
(anonymous) @ rpcProtocol.ts:159
_deliver @ event.ts:1391
fire @ event.ts:1422
fire @ ipc.net.ts:658
_receiveMessage @ ipc.net.ts:1028
(anonymous) @ ipc.net.ts:885
_deliver @ event.ts:1391
fire @ event.ts:1422
acceptChunk @ ipc.net.ts:400
(anonymous) @ ipc.net.ts:356
(anonymous) @ browserSocketFactory.ts:232
_deliver @ event.ts:1391
fire @ event.ts:1422
(anonymous) @ browserSocketFactory.ts:93
log.ts:117   ERR navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.: PendingMigrationError: navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.
    at get (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:7413)
    at Object.<anonymous> (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:4095:76375)
    at Module._compile (node:internal/modules/cjs/loader:1871:14)
    at Object..js (node:internal/modules/cjs/loader:2002:10)
    at Module.load (node:internal/modules/cjs/loader:1594:32)
    at Module.<anonymous> (node:internal/modules/cjs/loader:1396:12)
    at e._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:6783)
    at i._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:280:29221)
    at r._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:272:27101)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.require (node:internal/modules/cjs/loader:1617:12)
    at require (node:internal/modules/helpers:153:16)
    at Sle._doLoadModule (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:283:1507)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
logToConsole @ log.ts:117
error @ log.ts:564
error @ log.ts:669
error @ logService.ts:51
handleUnexpectedError @ workbench.ts:129
(anonymous) @ workbench.ts:110
onUnexpectedError @ errors.ts:65
onUnexpectedError @ errors.ts:110
$onUnexpectedError @ mainThreadErrors.ts:21
_doInvokeHandler @ rpcProtocol.ts:458
_invokeHandler @ rpcProtocol.ts:443
_receiveRequest @ rpcProtocol.ts:370
_receiveOneMessage @ rpcProtocol.ts:297
(anonymous) @ rpcProtocol.ts:159
_deliver @ event.ts:1391
fire @ event.ts:1422
fire @ ipc.net.ts:658
_receiveMessage @ ipc.net.ts:1028
(anonymous) @ ipc.net.ts:885
_deliver @ event.ts:1391
fire @ event.ts:1422
acceptChunk @ ipc.net.ts:400
(anonymous) @ ipc.net.ts:356
(anonymous) @ browserSocketFactory.ts:232
_deliver @ event.ts:1391
fire @ event.ts:1422
(anonymous) @ browserSocketFactory.ts:93
log.ts:117   ERR navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.: PendingMigrationError: navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.
    at get (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:7413)
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:2946:94733
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:2955:88231
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:2955:90560
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at Object.<anonymous> (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:4103:18960)
    at Module._compile (node:internal/modules/cjs/loader:1871:14)
    at Object..js (node:internal/modules/cjs/loader:2002:10)
    at Module.load (node:internal/modules/cjs/loader:1594:32)
    at Module.<anonymous> (node:internal/modules/cjs/loader:1396:12)
    at e._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:6783)
    at i._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:280:29221)
    at r._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:272:27101)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.require (node:internal/modules/cjs/loader:1617:12)
    at require (node:internal/modules/helpers:153:16)
    at Sle._doLoadModule (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:283:1507)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
logToConsole @ log.ts:117
error @ log.ts:564
error @ log.ts:669
error @ logService.ts:51
handleUnexpectedError @ workbench.ts:129
(anonymous) @ workbench.ts:110
onUnexpectedError @ errors.ts:65
onUnexpectedError @ errors.ts:110
$onUnexpectedError @ mainThreadErrors.ts:21
_doInvokeHandler @ rpcProtocol.ts:458
_invokeHandler @ rpcProtocol.ts:443
_receiveRequest @ rpcProtocol.ts:370
_receiveOneMessage @ rpcProtocol.ts:297
(anonymous) @ rpcProtocol.ts:159
_deliver @ event.ts:1391
fire @ event.ts:1422
fire @ ipc.net.ts:658
_receiveMessage @ ipc.net.ts:1028
(anonymous) @ ipc.net.ts:885
_deliver @ event.ts:1391
fire @ event.ts:1422
acceptChunk @ ipc.net.ts:400
(anonymous) @ ipc.net.ts:356
(anonymous) @ browserSocketFactory.ts:232
_deliver @ event.ts:1391
fire @ event.ts:1422
(anonymous) @ browserSocketFactory.ts:93
webviewElement.ts:507 An iframe which has both allow-scripts and allow-same-origin for its sandbox attribute can escape its sandboxing.
mountTo @ webviewElement.ts:507
_show @ overlayWebview.ts:236
claim @ overlayWebview.ts:149
updateTreeVisibility @ webviewViewPane.ts:155
(anonymous) @ webviewViewPane.ts:98
_deliver @ event.ts:1391
fire @ event.ts:1422
register @ webviewViewService.ts:112
$registerWebviewViewProvider @ mainThreadWebviewViews.ts:67
_doInvokeHandler @ rpcProtocol.ts:458
_invokeHandler @ rpcProtocol.ts:443
_receiveRequest @ rpcProtocol.ts:370
_receiveOneMessage @ rpcProtocol.ts:297
(anonymous) @ rpcProtocol.ts:159
_deliver @ event.ts:1391
fire @ event.ts:1422
fire @ ipc.net.ts:658
_receiveMessage @ ipc.net.ts:1028
(anonymous) @ ipc.net.ts:885
_deliver @ event.ts:1391
fire @ event.ts:1422
acceptChunk @ ipc.net.ts:400
(anonymous) @ ipc.net.ts:356
(anonymous) @ browserSocketFactory.ts:232
_deliver @ event.ts:1391
fire @ event.ts:1422
(anonymous) @ browserSocketFactory.ts:93
index.html?id=<task-id>&parentId=2&origin=<task-id>&swVersion=6&extensionId=xavier-arosemena.roo-plus&platform=electron&vscode-resource-base-authority=vscode-resource.vscode-cdn.net&parentOrigin=vscode-file%3A%2F%2Fvscode-app&remoteAuthority=ssh-remote%2B<remote-C>&purpose=webviewView:1038 Unrecognized feature: 'local-network-access'.
(anonymous) @ index.html?id=<task-id>&parentId=2&origin=<task-id>&swVersion=6&extensionId=xavier-arosemena.roo-plus&platform=electron&vscode-resource-base-authority=vscode-resource.vscode-cdn.net&parentOrigin=vscode-file%3A%2F%2Fvscode-app&remoteAuthority=ssh-remote%2B<remote-C>&purpose=webviewView:1038
console.ts:139 [Extension Host] [TaskHistoryStore] Reconciled orphaned active child: child <task-id> → interrupted, task <task-id> → active
log @ console.ts:139
$logExtensionHostMessage @ mainThreadConsole.ts:45
_doInvokeHandler @ rpcProtocol.ts:458
_invokeHandler @ rpcProtocol.ts:443
_receiveRequest @ rpcProtocol.ts:370
_receiveOneMessage @ rpcProtocol.ts:297
(anonymous) @ rpcProtocol.ts:159
_deliver @ event.ts:1391
fire @ event.ts:1422
fire @ ipc.net.ts:658
_receiveMessage @ ipc.net.ts:1028
(anonymous) @ ipc.net.ts:885
_deliver @ event.ts:1391
fire @ event.ts:1422
acceptChunk @ ipc.net.ts:400
(anonymous) @ ipc.net.ts:356
(anonymous) @ browserSocketFactory.ts:232
_deliver @ event.ts:1391
fire @ event.ts:1422
(anonymous) @ browserSocketFactory.ts:93
console.ts:139 [Extension Host] [TaskHistoryStore] Reconciled orphaned active child: child <task-id> → interrupted, task <task-id> → active
log @ console.ts:139
$logExtensionHostMessage @ mainThreadConsole.ts:45
_doInvokeHandler @ rpcProtocol.ts:458
_invokeHandler @ rpcProtocol.ts:443
_receiveRequest @ rpcProtocol.ts:370
_receiveOneMessage @ rpcProtocol.ts:297
(anonymous) @ rpcProtocol.ts:159
_deliver @ event.ts:1391
fire @ event.ts:1422
fire @ ipc.net.ts:658
_receiveMessage @ ipc.net.ts:1028
(anonymous) @ ipc.net.ts:885
_deliver @ event.ts:1391
fire @ event.ts:1422
acceptChunk @ ipc.net.ts:400
(anonymous) @ ipc.net.ts:356
(anonymous) @ browserSocketFactory.ts:232
_deliver @ event.ts:1391
fire @ event.ts:1422
(anonymous) @ browserSocketFactory.ts:93
index.js:413 Dynamically loaded translations: Array(18)
log.ts:117   ERR [Extension Host] Vercel AI Gateway models response is invalid {"_errors":[],"data":{"107":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"108":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"109":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"110":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"111":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"112":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"113":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"114":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"128":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"129":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"228":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"229":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"280":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"291":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"292":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"293":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"353":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"354":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"_errors":[]}}
logToConsole @ log.ts:117
console.ts:139 [Extension Host] Vercel AI Gateway models response is invalid {"_errors":[],"data":{"107":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"108":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"109":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"110":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"111":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"112":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"113":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"114":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"128":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"129":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"228":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"229":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"280":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"291":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"292":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"293":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"353":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"354":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"_errors":[]}}
log @ console.ts:139
console.ts:139 [Extension Host] [SembleProvider] Semble found and ready.
vscode-remote+ssh-002dremote-002b<remote-C>.vscode-resource.vscode-cdn.net/assets/shellscript-xyv2Ai2R.js:1  Failed to load resource: the server responded with a status of 401 ()
vscode-remote+ssh-002dremote-002b<remote-C>.vscode-resource.vscode-cdn.net/assets/rolldown-runtime-DAXXjFlN.js:1  Failed to load resource: the server responded with a status of 401 ()
console.ts:139 [Extension Host] [webview-metrics] ERROR "state" payload 1098KB > 1MB top[taskHistory=1035KB customModes=64KB clineMessages=0KB] runbook=docs/runbooks/gray-webview.md
vscode-remote+ssh-002dremote-002b<remote-C>.vscode-resource.vscode-cdn.net/assets/howler-DNFnvU0Y.js:1  Failed to load resource: the server responded with a status of 401 ()
console.ts:139 [Extension Host] [webview-metrics] state_msgs=2 p50=1098KB p99=1098KB max=1098KB
6The AudioContext was not allowed to start. It must be resumed (or created) from a user gesture event handler. <URL>
"

<project-2>
"
 INFO Started local extension host with pid 7026.
workbench.desktop.main.js:sourcemap:38  INFO [AgentHost:remote] Initializing (remoteAuthority=ssh-remote+<remote-D>)
workbench.desktop.main.js:sourcemap:38  INFO [AccountPolicyGate] apply: state=inactive, reason=undefined, isRestricted=false
workbench.desktop.main.js:sourcemap:38  WARN Authentication provider github was not declared in the Extension Manifest.
TR @ workbench.desktop.main.js:sourcemap:38
workbench.desktop.main.js:sourcemap:38  WARN Authentication provider github-enterprise was not declared in the Extension Manifest.
TR @ workbench.desktop.main.js:sourcemap:38
workbench.desktop.main.js:sourcemap:38  INFO Invoking resolveAuthority(ssh-remote)...
workbench.desktop.main.js:sourcemap:38  INFO [LocalProcess0][resolveAuthority(ssh-remote,1)][0ms] obtaining proxy...
workbench.desktop.main.js:sourcemap:38  INFO [LocalProcess0][resolveAuthority(ssh-remote,1)][29ms] invoking...
workbench.desktop.main.js:sourcemap:38  INFO [LocalProcess0][resolveAuthority(ssh-remote,1)][1151ms] waiting...
workbench.desktop.main.js:sourcemap:38  INFO [LocalProcess0][resolveAuthority(ssh-remote,1)][2031ms] waiting...
workbench.desktop.main.js:sourcemap:38  INFO [LocalProcess0][resolveAuthority(ssh-remote,1)][2455ms] returned WebSocket(127.0.0.1:34475)
workbench.desktop.main.js:sourcemap:38  INFO resolveAuthority(ssh-remote) returned 'WebSocket(127.0.0.1:34475)' after 2458 ms
workbench.desktop.main.js:sourcemap:38  INFO Creating a socket (renderer-Management-<task-id>)...
workbench.desktop.main.js:sourcemap:38  INFO Creating a socket (renderer-ExtensionHost-<task-id>)...
workbench.desktop.main.js:sourcemap:38  INFO Creating a socket (renderer-Management-<task-id>) was successful after 281 ms.
workbench.desktop.main.js:sourcemap:38  INFO Creating a socket (renderer-ExtensionHost-<task-id>) was successful after 580 ms.
workbench.desktop.main.js:sourcemap:38  INFO [AccountPolicyGate] apply: state=inactive, reason=undefined, isRestricted=false
workbench.desktop.main.js:sourcemap:38  INFO [reconnection-grace-time] Client received grace time from server: 10800000ms (10800s)
workbench.desktop.main.js:sourcemap:38  INFO [Continue.continue]: Command `continue.focusContinueInput` already registered by Continue - open-source AI code agent (Continue.continue)
workbench.desktop.main.js:sourcemap:38  WARN MCP migration: Failed to parse MCP config from vscode-remote://ssh-remote%2B<remote-D>/root/.vscodium-server/data/Machine/settings.json: SyntaxError: Expected ',' or '}' after property value in JSON at position 178 (line 13 column 2)
    at JSON.parse (<anonymous>)
    at yP (workbench.desktop.main.js:sourcemap:2281:151)
    at V9e.parseMcpConfig (workbench.desktop.main.js:sourcemap:3408:22253)
    at async V9e.migrateMcpConfig (workbench.desktop.main.js:sourcemap:3408:21021)
TR @ workbench.desktop.main.js:sourcemap:38
workbench.desktop.main.js:sourcemap:38  INFO [perf] Render performance baseline is 76ms
workbench.desktop.main.js:sourcemap:38  INFO Extension host (LocalProcess pid: 7026) is unresponsive.
workbench.desktop.main.js:sourcemap:38  INFO Extension host (Remote) is unresponsive.
workbench.desktop.main.js:sourcemap:4991 Extension Host
workbench.desktop.main.js:sourcemap:4991 Debugger attached.
workbench.desktop.main.js:sourcemap:38  INFO UNRESPONSIVE extension host: starting to profile NOW
workbench.desktop.main.js:sourcemap:38  INFO Extension host (LocalProcess pid: 7026) is responsive.
workbench.desktop.main.js:sourcemap:38  INFO UNRESPONSIVE extension host: received responsive event and cancelling profiling session
workbench.desktop.main.js:sourcemap:38   ERR [Extension Host] Failed to register Continue config.yaml schema, most likely, YAML extension is not installed CodeExpectedError: Unable to write to User Settings because yaml.schemas is not a registered configuration.
    at WZt.toConfigurationEditingError (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:8353)
    at WZt.validate (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:11133)
    at WZt.doWriteConfiguration (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:4722)
    at Object.factory (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:4578)
    at kE.consume (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:30:78522)
    at vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:30:78337
    at new Promise (<anonymous>)
    at kE.queue (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:30:78261)
    at WZt.writeConfiguration (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:4547)
    at Jnr.writeConfigurationValue (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:61687)
    at async Promise.all (index 0)
    at async Object.e [as settled] (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:30:85791)
    at async Jnr.updateValue (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:44632)
TR @ workbench.desktop.main.js:sourcemap:38
workbench.desktop.main.js:sourcemap:692 [Extension Host] Failed to register Continue config.yaml schema, most likely, YAML extension is not installed CodeExpectedError: Unable to write to User Settings because yaml.schemas is not a registered configuration.
    at WZt.toConfigurationEditingError (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:8353)
    at WZt.validate (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:11133)
    at WZt.doWriteConfiguration (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:4722)
    at Object.factory (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:4578)
    at kE.consume (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:30:78522)
    at vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:30:78337
    at new Promise (<anonymous>)
    at kE.queue (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:30:78261)
    at WZt.writeConfiguration (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:4547)
    at Jnr.writeConfigurationValue (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:61687)
    at async Promise.all (index 0)
    at async Object.e [as settled] (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:30:85791)
    at async Jnr.updateValue (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:44632)
pWi @ workbench.desktop.main.js:sourcemap:692
workbench.desktop.main.js:sourcemap:38  INFO Extension host (Remote) is responsive.
workbench.desktop.main.js:sourcemap:38  WARN UNRESPONSIVE extension host: 'continue.continue' took 73.5264577058891% of 1044.647ms, saved PROFILE here: 'file:///tmp/exthost-264c09.cpuprofile'
TR @ workbench.desktop.main.js:sourcemap:38
workbench.desktop.main.js:sourcemap:692 [Extension Host] Loaded translations for languages: ca, de, en, es, fr, hi, id, it, ja, ko, nl, pl, pt-BR, ru, tr, vi, zh-CN, zh-TW
workbench.desktop.main.js:sourcemap:38   ERR navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.: PendingMigrationError: navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.
    at get (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:7413)
    at Object.<anonymous> (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:3422:7503)
    at Module._compile (node:internal/modules/cjs/loader:1871:14)
    at Object..js (node:internal/modules/cjs/loader:2002:10)
    at Module.load (node:internal/modules/cjs/loader:1594:32)
    at Module.<anonymous> (node:internal/modules/cjs/loader:1396:12)
    at e._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:6783)
    at i._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:280:29221)
    at r._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:272:27101)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.require (node:internal/modules/cjs/loader:1617:12)
    at require (node:internal/modules/helpers:153:16)
    at Sle._doLoadModule (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:283:1507)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
TR @ workbench.desktop.main.js:sourcemap:38
workbench.desktop.main.js:sourcemap:38   ERR navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.: PendingMigrationError: navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.
    at get (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:7413)
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:589:17803
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at bCt.exports (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:764:132)
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:767:11671
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:775:690
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:797:625
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at Object.<anonymous> (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:3429:10351)
    at Module._compile (node:internal/modules/cjs/loader:1871:14)
    at Object..js (node:internal/modules/cjs/loader:2002:10)
    at Module.load (node:internal/modules/cjs/loader:1594:32)
    at Module.<anonymous> (node:internal/modules/cjs/loader:1396:12)
    at e._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:6783)
    at i._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:280:29221)
    at r._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:272:27101)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.require (node:internal/modules/cjs/loader:1617:12)
    at require (node:internal/modules/helpers:153:16)
    at Sle._doLoadModule (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:283:1507)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
TR @ workbench.desktop.main.js:sourcemap:38
workbench.desktop.main.js:sourcemap:38   ERR navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.: PendingMigrationError: navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.
    at get (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:7413)
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:50:8175
    at get value (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:50:3145)
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:76:200
    at $ZodObject.a (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:50:902)
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:78:18795
    at a (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:50:902)
    at new ZodObject (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:50:1161)
    at Yd (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:78:8982)
    at Object.<anonymous> (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:3495:4986)
    at Module._compile (node:internal/modules/cjs/loader:1871:14)
    at Object..js (node:internal/modules/cjs/loader:2002:10)
    at Module.load (node:internal/modules/cjs/loader:1594:32)
    at Module.<anonymous> (node:internal/modules/cjs/loader:1396:12)
    at e._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:6783)
    at i._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:280:29221)
    at r._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:272:27101)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.require (node:internal/modules/cjs/loader:1617:12)
    at require (node:internal/modules/helpers:153:16)
    at Sle._doLoadModule (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:283:1507)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
TR @ workbench.desktop.main.js:sourcemap:38
workbench.desktop.main.js:sourcemap:38   ERR navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.: PendingMigrationError: navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.
    at get (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:7413)
    at Object.<anonymous> (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:4095:76375)
    at Module._compile (node:internal/modules/cjs/loader:1871:14)
    at Object..js (node:internal/modules/cjs/loader:2002:10)
    at Module.load (node:internal/modules/cjs/loader:1594:32)
    at Module.<anonymous> (node:internal/modules/cjs/loader:1396:12)
    at e._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:6783)
    at i._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:280:29221)
    at r._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:272:27101)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.require (node:internal/modules/cjs/loader:1617:12)
    at require (node:internal/modules/helpers:153:16)
    at Sle._doLoadModule (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:283:1507)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
TR @ workbench.desktop.main.js:sourcemap:38
workbench.desktop.main.js:sourcemap:38   ERR navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.: PendingMigrationError: navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.
    at get (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:7413)
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:2946:94733
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:2955:88231
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:2955:90560
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at Object.<anonymous> (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:4103:18960)
    at Module._compile (node:internal/modules/cjs/loader:1871:14)
    at Object..js (node:internal/modules/cjs/loader:2002:10)
    at Module.load (node:internal/modules/cjs/loader:1594:32)
    at Module.<anonymous> (node:internal/modules/cjs/loader:1396:12)
    at e._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:6783)
    at i._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:280:29221)
    at r._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:272:27101)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.require (node:internal/modules/cjs/loader:1617:12)
    at require (node:internal/modules/helpers:153:16)
    at Sle._doLoadModule (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:283:1507)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
TR @ workbench.desktop.main.js:sourcemap:38
workbench.desktop.main.js:sourcemap:692 [Extension Host] [SembleProvider] Semble found and ready.
workbench.desktop.main.js:sourcemap:38   ERR [Extension Host] Vercel AI Gateway models response is invalid {"_errors":[],"data":{"107":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"108":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"109":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"110":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"111":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"112":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"113":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"114":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"128":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"129":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"228":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"229":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"280":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"291":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"292":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"293":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"353":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"354":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"_errors":[]}}
TR @ workbench.desktop.main.js:sourcemap:38
workbench.desktop.main.js:sourcemap:692 [Extension Host] Vercel AI Gateway models response is invalid {"_errors":[],"data":{"107":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"108":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"109":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"110":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"111":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"112":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"113":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"114":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"128":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"129":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"228":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"229":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"280":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"291":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"292":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"293":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"353":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"354":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"_errors":[]}}
pWi @ workbench.desktop.main.js:sourcemap:692
workbench.desktop.main.js:sourcemap:5300 Unrecognized feature: 'local-network-access'.
_createElement @ workbench.desktop.main.js:sourcemap:5300
workbench.desktop.main.js:sourcemap:5300 An iframe which has both allow-scripts and allow-same-origin for its sandbox attribute can escape its sandboxing.
mountTo @ workbench.desktop.main.js:sourcemap:5300
workbench.desktop.main.js:sourcemap:692 [Extension Host] [webview-metrics] ERROR "state" payload 1108KB > 1MB top[taskHistory=1039KB customModes=71KB clineMessages=0KB] runbook=docs/runbooks/gray-webview.md
workbench.desktop.main.js:sourcemap:692 [Extension Host] [createTaskWithHistoryItem] parent task <task-id> instantiated
workbench.desktop.main.js:sourcemap:692 [Extension Host] [Task#getCheckpointService] initializing checkpoints service
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [Task#getCheckpointService] initializing shadow git
workbench.desktop.main.js:sourcemap:692 [Extension Host] [createSanitizedGit] Created git instance for baseDir: /root/.vscodium-server/data/User/globalStorage/xavier-arosemena.roo-plus/tasks/<task-id>/checkpoints
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#create] git = 2.53.0
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#initShadowGit] shadow git repo already exists at /root/.vscodium-server/data/User/globalStorage/xavier-arosemena.roo-plus/tasks/<task-id>/checkpoints/.git
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#initShadowGit] initialized shadow repo with base commit 6f175f8a02f66f8f58b304b21e3579c4b66c9f8e in 30ms
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [Task#getCheckpointService] service initialized
workbench.desktop.main.js:sourcemap:692 [Extension Host] [webview-metrics] state_msgs=9 p50=188KB p99=1108KB max=1108KB
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#saveCheckpoint] checkpoint saved in 96ms -> fad8061dd04196cfcf29cc74ed79b4d56402ff7f
workbench.desktop.main.js:sourcemap:692 [Extension Host] [Task#dispose] disposing task <task-id>
workbench.desktop.main.js:sourcemap:692 [Extension Host] [webview-metrics] ERROR "state" payload 1119KB > 1MB top[taskHistory=1039KB customModes=82KB clineMessages=0KB] runbook=docs/runbooks/gray-webview.md
workbench.desktop.main.js:sourcemap:692 [Extension Host] [createTask] child task <task-id> instantiated
workbench.desktop.main.js:sourcemap:692 [Extension Host] [getTaskWithId] api_conversation_history.json missing for task <task-id>, returning empty history
pWi @ workbench.desktop.main.js:sourcemap:692
workbench.desktop.main.js:sourcemap:692 [Extension Host] [Task#getCheckpointService] initializing checkpoints service
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [Task#getCheckpointService] initializing shadow git
workbench.desktop.main.js:sourcemap:692 [Extension Host] [createSanitizedGit] Created git instance for baseDir: /root/.vscodium-server/data/User/globalStorage/xavier-arosemena.roo-plus/tasks/<task-id>/checkpoints
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#create] git = 2.53.0
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#initShadowGit] creating shadow git repo at /root/.vscodium-server/data/User/globalStorage/xavier-arosemena.roo-plus/tasks/<task-id>/checkpoints
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#initShadowGit] initialized shadow repo with base commit b3421aa077f76018c25ec397487208e1151e65c1 in 839ms
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [Task#getCheckpointService] service initialized
workbench.desktop.main.js:sourcemap:692 [Extension Host] [webview-metrics] state_msgs=58 p50=90KB p99=1119KB max=1119KB
workbench.desktop.main.js:sourcemap:692 [Extension Host] [webview-metrics] state_msgs=60 p50=101KB p99=141KB max=141KB
workbench.desktop.main.js:sourcemap:692 [Extension Host] [webview-metrics] state_msgs=32 p50=183KB p99=188KB max=188KB
workbench.desktop.main.js:sourcemap:692 [Extension Host] [webview-metrics] state_msgs=7 p50=188KB p99=188KB max=188KB
workbench.desktop.main.js:sourcemap:38   ERR [Extension Host] [ExecaTerminalProcess#run] shell execution error: Command failed with exit code 2: 'which python3 python3.13 python3.12 2>/dev/null; ls -d .venv venv 2>/dev/null; ls -d /srv/projects/<project-2>/.venv 2>/dev/null'

/usr/bin/python3
venv
TR @ workbench.desktop.main.js:sourcemap:38
workbench.desktop.main.js:sourcemap:692 [Extension Host] [ExecaTerminalProcess#run] shell execution error: Command failed with exit code 2: 'which python3 python3.13 python3.12 2>/dev/null; ls -d .venv venv 2>/dev/null; ls -d /srv/projects/<project-2>/.venv 2>/dev/null'

/usr/bin/python3
venv
pWi @ workbench.desktop.main.js:sourcemap:692
workbench.desktop.main.js:sourcemap:692 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
workbench.desktop.main.js:sourcemap:692 [Extension Host] [webview-metrics] state_msgs=6 p50=188KB p99=188KB max=188KB
workbench.desktop.main.js:sourcemap:692 [Extension Host] [webview-metrics] state_msgs=8 p50=177KB p99=188KB max=188KB
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#saveCheckpoint] checkpoint saved in 115ms -> 62def495c1b4354addc17fa096c752631d6fe355
7workbench.desktop.main.js:sourcemap:692 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#saveCheckpoint] checkpoint saved in 101ms -> 347993a23f7dfb4cd7f653aea8a04478a02d7389
8workbench.desktop.main.js:sourcemap:692 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#saveCheckpoint] checkpoint saved in 96ms -> ae9e8170430090d64b2d4a36213267f300db92a1
8workbench.desktop.main.js:sourcemap:692 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
workbench.desktop.main.js:sourcemap:692 [Extension Host] [webview-metrics] state_msgs=30 p50=180KB p99=184KB max=184KB
workbench.desktop.main.js:sourcemap:692 [Extension Host] [webview-metrics] state_msgs=8 p50=139KB p99=142KB max=142KB
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#saveCheckpoint] checkpoint saved in 103ms -> ac00973c7220c696096f3ec9c80ba35adaf13c9e
8workbench.desktop.main.js:sourcemap:692 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#saveCheckpoint] checkpoint saved in 95ms -> 956ff12879b8637961de0840ccc63d0818ecf59c
8workbench.desktop.main.js:sourcemap:692 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
workbench.desktop.main.js:sourcemap:692 [Extension Host] [webview-metrics] state_msgs=28 p50=161KB p99=178KB max=178KB
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#saveCheckpoint] checkpoint saved in 122ms -> 1f97503f311544d489ede0575af25985df92e0d1
8workbench.desktop.main.js:sourcemap:692 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#saveCheckpoint] checkpoint saved in 123ms -> 125e6bfde16e638f1d61622e45872e355ae4279b
10workbench.desktop.main.js:sourcemap:692 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#saveCheckpoint] checkpoint saved in 111ms -> 96475225e9033508e29074b85c643f69eb2acb17
8workbench.desktop.main.js:sourcemap:692 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#saveCheckpoint] checkpoint saved in 121ms -> 25d2de5aadc2d8d5ba0967da032d9ba3a90b4296
8workbench.desktop.main.js:sourcemap:692 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
workbench.desktop.main.js:sourcemap:692 [Extension Host] [webview-metrics] state_msgs=26 p50=178KB p99=185KB max=185KB
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#saveCheckpoint] checkpoint saved in 234ms -> cf1c4589518d296508818b9a27bfcd4a86ffbb6d
10workbench.desktop.main.js:sourcemap:692 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
workbench.desktop.main.js:sourcemap:692 [Extension Host] [webview-metrics] state_msgs=9 p50=165KB p99=166KB max=166KB
"

aef-site (this one also recoverd by itself)
"
 INFO Started local extension host with pid 7323.
workbench.desktop.main.js:sourcemap:38  INFO [AgentHost:remote] Initializing (remoteAuthority=ssh-remote+<remote-B>)
workbench.desktop.main.js:sourcemap:38  WARN Authentication provider github was not declared in the Extension Manifest.
TR @ workbench.desktop.main.js:sourcemap:38
workbench.desktop.main.js:sourcemap:38  WARN Authentication provider github-enterprise was not declared in the Extension Manifest.
TR @ workbench.desktop.main.js:sourcemap:38
workbench.desktop.main.js:sourcemap:38  INFO Invoking resolveAuthority(ssh-remote)...
workbench.desktop.main.js:sourcemap:38  INFO [LocalProcess0][resolveAuthority(ssh-remote,1)][1ms] obtaining proxy...
workbench.desktop.main.js:sourcemap:38  INFO [LocalProcess0][resolveAuthority(ssh-remote,1)][20ms] invoking...
workbench.desktop.main.js:sourcemap:38  INFO [AccountPolicyGate] apply: state=inactive, reason=undefined, isRestricted=false
workbench.desktop.main.js:sourcemap:38  INFO [LocalProcess0][resolveAuthority(ssh-remote,1)][1051ms] waiting...
workbench.desktop.main.js:sourcemap:38  INFO [LocalProcess0][resolveAuthority(ssh-remote,1)][2017ms] returned WebSocket(127.0.0.1:42365)
workbench.desktop.main.js:sourcemap:38  INFO resolveAuthority(ssh-remote) returned 'WebSocket(127.0.0.1:42365)' after 2019 ms
workbench.desktop.main.js:sourcemap:38  INFO Creating a socket (renderer-Management-<task-id>)...
workbench.desktop.main.js:sourcemap:38  INFO Creating a socket (renderer-ExtensionHost-<task-id>)...
workbench.desktop.main.js:sourcemap:38  INFO Creating a socket (renderer-Management-<task-id>) was successful after 373 ms.
workbench.desktop.main.js:sourcemap:38  INFO Creating a socket (renderer-ExtensionHost-<task-id>) was successful after 906 ms.
workbench.desktop.main.js:sourcemap:38  INFO [reconnection-grace-time] Client received grace time from server: 10800000ms (10800s)
workbench.desktop.main.js:sourcemap:38  INFO [Continue.continue]: Command `continue.focusContinueInput` already registered by Continue - open-source AI code agent (Continue.continue)
workbench.desktop.main.js:sourcemap:38  WARN MCP migration: Failed to parse MCP config from vscode-remote://ssh-remote%2B<remote-B>/root/.vscodium-server/data/Machine/settings.json: SyntaxError: Expected ',' or '}' after property value in JSON at position 178 (line 13 column 2)
    at JSON.parse (<anonymous>)
    at yP (workbench.desktop.main.js:sourcemap:2281:151)
    at V9e.parseMcpConfig (workbench.desktop.main.js:sourcemap:3408:22253)
    at async V9e.migrateMcpConfig (workbench.desktop.main.js:sourcemap:3408:21021)
TR @ workbench.desktop.main.js:sourcemap:38
workbench.desktop.main.js:sourcemap:38  INFO [AccountPolicyGate] apply: state=inactive, reason=undefined, isRestricted=false
workbench.desktop.main.js:sourcemap:38  INFO [perf] Render performance baseline is 42ms
workbench.desktop.main.js:sourcemap:692 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
workbench.desktop.main.js:sourcemap:38   ERR [Extension Host] Failed to register Continue config.yaml schema, most likely, YAML extension is not installed CodeExpectedError: Unable to write to User Settings because yaml.schemas is not a registered configuration.
    at WZt.toConfigurationEditingError (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:8353)
    at WZt.validate (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:11133)
    at WZt.doWriteConfiguration (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:4722)
    at Object.factory (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:4578)
    at kE.consume (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:30:78522)
    at vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:30:78337
    at new Promise (<anonymous>)
    at kE.queue (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:30:78261)
    at WZt.writeConfiguration (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:4547)
    at Jnr.writeConfigurationValue (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:61687)
    at async Promise.all (index 0)
    at async Object.e [as settled] (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:30:85791)
    at async Jnr.updateValue (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:44632)
TR @ workbench.desktop.main.js:sourcemap:38
workbench.desktop.main.js:sourcemap:692 [Extension Host] Failed to register Continue config.yaml schema, most likely, YAML extension is not installed CodeExpectedError: Unable to write to User Settings because yaml.schemas is not a registered configuration.
    at WZt.toConfigurationEditingError (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:8353)
    at WZt.validate (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:11133)
    at WZt.doWriteConfiguration (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:4722)
    at Object.factory (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:4578)
    at kE.consume (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:30:78522)
    at vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:30:78337
    at new Promise (<anonymous>)
    at kE.queue (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:30:78261)
    at WZt.writeConfiguration (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:4547)
    at Jnr.writeConfigurationValue (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:61687)
    at async Promise.all (index 0)
    at async Object.e [as settled] (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:30:85791)
    at async Jnr.updateValue (vscode-file://vscode-app/usr/share/codium/resources/app/out/vs/workbench/workbench.desktop.main.js:4935:44632)
pWi @ workbench.desktop.main.js:sourcemap:692
workbench.desktop.main.js:sourcemap:692 [Extension Host] Loaded translations for languages: ca, de, en, es, fr, hi, id, it, ja, ko, nl, pl, pt-BR, ru, tr, vi, zh-CN, zh-TW
workbench.desktop.main.js:sourcemap:38   ERR navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.: PendingMigrationError: navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.
    at get (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:7413)
    at Object.<anonymous> (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:3422:7503)
    at Module._compile (node:internal/modules/cjs/loader:1871:14)
    at Object..js (node:internal/modules/cjs/loader:2002:10)
    at Module.load (node:internal/modules/cjs/loader:1594:32)
    at Module.<anonymous> (node:internal/modules/cjs/loader:1396:12)
    at e._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:6783)
    at i._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:280:29221)
    at r._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:272:27101)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.require (node:internal/modules/cjs/loader:1617:12)
    at require (node:internal/modules/helpers:153:16)
    at Sle._doLoadModule (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:283:1507)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
TR @ workbench.desktop.main.js:sourcemap:38
workbench.desktop.main.js:sourcemap:38   ERR navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.: PendingMigrationError: navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.
    at get (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:7413)
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:589:17803
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at bCt.exports (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:764:132)
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:767:11671
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:775:690
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:797:625
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at Object.<anonymous> (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:3429:10351)
    at Module._compile (node:internal/modules/cjs/loader:1871:14)
    at Object..js (node:internal/modules/cjs/loader:2002:10)
    at Module.load (node:internal/modules/cjs/loader:1594:32)
    at Module.<anonymous> (node:internal/modules/cjs/loader:1396:12)
    at e._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:6783)
    at i._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:280:29221)
    at r._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:272:27101)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.require (node:internal/modules/cjs/loader:1617:12)
    at require (node:internal/modules/helpers:153:16)
    at Sle._doLoadModule (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:283:1507)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
TR @ workbench.desktop.main.js:sourcemap:38
workbench.desktop.main.js:sourcemap:38   ERR navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.: PendingMigrationError: navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.
    at get (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:7413)
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:50:8175
    at get value (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:50:3145)
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:76:200
    at $ZodObject.a (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:50:902)
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:78:18795
    at a (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:50:902)
    at new ZodObject (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:50:1161)
    at Yd (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:78:8982)
    at Object.<anonymous> (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:3495:4986)
    at Module._compile (node:internal/modules/cjs/loader:1871:14)
    at Object..js (node:internal/modules/cjs/loader:2002:10)
    at Module.load (node:internal/modules/cjs/loader:1594:32)
    at Module.<anonymous> (node:internal/modules/cjs/loader:1396:12)
    at e._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:6783)
    at i._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:280:29221)
    at r._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:272:27101)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.require (node:internal/modules/cjs/loader:1617:12)
    at require (node:internal/modules/helpers:153:16)
    at Sle._doLoadModule (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:283:1507)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
TR @ workbench.desktop.main.js:sourcemap:38
workbench.desktop.main.js:sourcemap:38   ERR navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.: PendingMigrationError: navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.
    at get (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:7413)
    at Object.<anonymous> (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:4095:76375)
    at Module._compile (node:internal/modules/cjs/loader:1871:14)
    at Object..js (node:internal/modules/cjs/loader:2002:10)
    at Module.load (node:internal/modules/cjs/loader:1594:32)
    at Module.<anonymous> (node:internal/modules/cjs/loader:1396:12)
    at e._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:6783)
    at i._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:280:29221)
    at r._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:272:27101)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.require (node:internal/modules/cjs/loader:1617:12)
    at require (node:internal/modules/helpers:153:16)
    at Sle._doLoadModule (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:283:1507)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
TR @ workbench.desktop.main.js:sourcemap:38
workbench.desktop.main.js:sourcemap:38   ERR navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.: PendingMigrationError: navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.
    at get (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:7413)
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:2946:94733
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:2955:88231
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:2955:90560
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at Object.<anonymous> (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:4103:18960)
    at Module._compile (node:internal/modules/cjs/loader:1871:14)
    at Object..js (node:internal/modules/cjs/loader:2002:10)
    at Module.load (node:internal/modules/cjs/loader:1594:32)
    at Module.<anonymous> (node:internal/modules/cjs/loader:1396:12)
    at e._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:6783)
    at i._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:280:29221)
    at r._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:272:27101)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.require (node:internal/modules/cjs/loader:1617:12)
    at require (node:internal/modules/helpers:153:16)
    at Sle._doLoadModule (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:283:1507)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
TR @ workbench.desktop.main.js:sourcemap:38
workbench.desktop.main.js:sourcemap:692 [Extension Host] [TaskHistoryStore] Reconciled orphaned active child: child <task-id> → interrupted, task <task-id> → active
pWi @ workbench.desktop.main.js:sourcemap:692
workbench.desktop.main.js:sourcemap:38   ERR [Extension Host] Vercel AI Gateway models response is invalid {"_errors":[],"data":{"107":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"108":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"109":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"110":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"111":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"112":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"113":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"114":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"128":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"129":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"228":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"229":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"280":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"291":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"292":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"293":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"353":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"354":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"_errors":[]}}
TR @ workbench.desktop.main.js:sourcemap:38
workbench.desktop.main.js:sourcemap:692 [Extension Host] Vercel AI Gateway models response is invalid {"_errors":[],"data":{"107":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"108":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"109":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"110":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"111":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"112":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"113":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"114":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"128":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"129":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"228":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"229":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"280":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"291":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"292":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"293":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"353":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"354":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"_errors":[]}}
pWi @ workbench.desktop.main.js:sourcemap:692
workbench.desktop.main.js:sourcemap:692 [Extension Host] [SembleProvider] Semble found and ready.
workbench.desktop.main.js:sourcemap:5300 Unrecognized feature: 'local-network-access'.
_createElement @ workbench.desktop.main.js:sourcemap:5300
workbench.desktop.main.js:sourcemap:5300 An iframe which has both allow-scripts and allow-same-origin for its sandbox attribute can escape its sandboxing.
mountTo @ workbench.desktop.main.js:sourcemap:5300
index.html?id=<task-id>&parentId=5&origin=<task-id>&swVersion=6&extensionId=xavier-arosemena.roo-plus&platform=electron&vscode-resource-base-authority=vscode-resource.vscode-cdn.net&parentOrigin=vscode-file%3A%2F%2Fvscode-app&remoteAuthority=ssh-remote%2B<remote-B>&purpose=webviewView:1038 Unrecognized feature: 'local-network-access'.
(anonymous) @ index.html?id=<task-id>&parentId=5&origin=<task-id>&swVersion=6&extensionId=xavier-arosemena.roo-plus&platform=electron&vscode-resource-base-authority=vscode-resource.vscode-cdn.net&parentOrigin=vscode-file%3A%2F%2Fvscode-app&remoteAuthority=ssh-remote%2B<remote-B>&purpose=webviewView:1038
index.js:413 Dynamically loaded translations: Array(18)
vscode-remote+ssh-002dremote-002b<remote-B>.vscode-resource.vscode-cdn.net/assets/shellscript-xyv2Ai2R.js:1  Failed to load resource: the server responded with a status of 401 ()
vscode-remote+ssh-002dremote-002b<remote-B>.vscode-resource.vscode-cdn.net/assets/rolldown-runtime-DAXXjFlN.js:1  Failed to load resource: the server responded with a status of 401 ()
workbench.desktop.main.js:sourcemap:692 [Extension Host] [webview-metrics] ERROR "state" payload 1111KB > 1MB top[taskHistory=1042KB customModes=70KB clineMessages=0KB] runbook=docs/runbooks/gray-webview.md
vscode-remote+ssh-002dremote-002b<remote-B>.vscode-resource.vscode-cdn.net/assets/howler-DNFnvU0Y.js:1  Failed to load resource: the server responded with a status of 401 ()
workbench.desktop.main.js:sourcemap:692 [Extension Host] Provider profile 'Qwen' from history no longer exists. Using current configuration.
workbench.desktop.main.js:sourcemap:692 [Extension Host] [createTaskWithHistoryItem] parent task <task-id> instantiated
workbench.desktop.main.js:sourcemap:38   ERR [Extension Host] Error fetching Unbound models: {
  "stack": "TypeError: o is not iterable\n\tat WBn (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:3686:17821)\n\tat process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n\tat async $8t (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:4091:8816)\n\tat async Zp (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:4091:9569)\n\tat async d (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:5471:22632)\n\tat async /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:5471:25277\n\tat async Promise.allSettled (index 2)\n\tat async vGi (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:5471:25213)\n\tat async vit (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:5477:16041)\n\tat async Cp.a [as value] (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:5534:144)",
  "message": "o is not iterable"
}
TR @ workbench.desktop.main.js:sourcemap:38
workbench.desktop.main.js:sourcemap:692 [Extension Host] Error fetching Unbound models: {
  "stack": "TypeError: o is not iterable\n\tat WBn (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:3686:17821)\n\tat process.processTicksAndRejections (node:internal/process/task_queues:104:5)\n\tat async $8t (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:4091:8816)\n\tat async Zp (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:4091:9569)\n\tat async d (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:5471:22632)\n\tat async /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:5471:25277\n\tat async Promise.allSettled (index 2)\n\tat async vGi (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:5471:25213)\n\tat async vit (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:5477:16041)\n\tat async Cp.a [as value] (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:5534:144)",
  "message": "o is not iterable"
}
pWi @ workbench.desktop.main.js:sourcemap:692
workbench.desktop.main.js:sourcemap:692 [Extension Host] [Task#getCheckpointService] initializing checkpoints service
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [Task#getCheckpointService] initializing shadow git
workbench.desktop.main.js:sourcemap:692 [Extension Host] [createSanitizedGit] Created git instance for baseDir: /root/.vscodium-server/data/User/globalStorage/xavier-arosemena.roo-plus/tasks/<task-id>/checkpoints
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#create] git = 2.53.0
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#initShadowGit] shadow git repo already exists at /root/.vscodium-server/data/User/globalStorage/xavier-arosemena.roo-plus/tasks/<task-id>/checkpoints/.git
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#initShadowGit] initialized shadow repo with base commit 658d7f66ddb4c552e9b9c445590ab58ca2594a4d in 30ms
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [Task#getCheckpointService] service initialized
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#saveCheckpoint] starting checkpoint save (allowEmpty: true)
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#saveCheckpoint] checkpoint saved in 96ms -> 82cf7f324eb4e95794a4f6973de80ac7776a6885
workbench.desktop.main.js:sourcemap:692 [Extension Host] [webview-metrics] state_msgs=10 p50=164KB p99=1111KB max=1111KB
workbench.desktop.main.js:sourcemap:692 [Extension Host] [Task#dispose] disposing task <task-id>
workbench.desktop.main.js:sourcemap:692 [Extension Host] [webview-metrics] ERROR "state" payload 1096KB > 1MB top[taskHistory=1042KB customModes=56KB clineMessages=0KB] runbook=docs/runbooks/gray-webview.md
workbench.desktop.main.js:sourcemap:692 [Extension Host] [createTask] child task <task-id> instantiated
workbench.desktop.main.js:sourcemap:692 [Extension Host] [getTaskWithId] api_conversation_history.json missing for task <task-id>, returning empty history
pWi @ workbench.desktop.main.js:sourcemap:692
workbench.desktop.main.js:sourcemap:692 [Extension Host] [Task#getCheckpointService] initializing checkpoints service
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [Task#getCheckpointService] initializing shadow git
workbench.desktop.main.js:sourcemap:692 [Extension Host] [createSanitizedGit] Created git instance for baseDir: /root/.vscodium-server/data/User/globalStorage/xavier-arosemena.roo-plus/tasks/<task-id>/checkpoints
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#create] git = 2.53.0
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#initShadowGit] creating shadow git repo at /root/.vscodium-server/data/User/globalStorage/xavier-arosemena.roo-plus/tasks/<task-id>/checkpoints
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [t#initShadowGit] initialized shadow repo with base commit bb19057764bd8267742035428a700c4fb9b0ae66 in 581ms
2workbench.desktop.main.js:sourcemap:692 [Extension Host] [Task#getCheckpointService] service initialized
workbench.desktop.main.js:sourcemap:692 [Extension Host] [webview-metrics] state_msgs=68 p50=66KB p99=1096KB max=1096KB
workbench.desktop.main.js:sourcemap:692 [Extension Host] deleteChain called from onDidChangeVisibleTextEditors
workbench.desktop.main.js:sourcemap:692 [Extension Host] [webview-metrics] state_msgs=10 p50=86KB p99=95KB max=95KB
workbench.desktop.main.js:sourcemap:692 [Extension Host] [webview-metrics] state_msgs=7 p50=96KB p99=97KB max=97KB
workbench.desktop.main.js:sourcemap:692 [Extension Host] [webview-metrics] state_msgs=3 p50=97KB p99=97KB max=97KB
workbench.desktop.main.js:sourcemap:692 [Extension Host] [webview-metrics] state_msgs=3 p50=98KB p99=99KB max=99KB
workbench.desktop.main.js:sourcemap:692 [Extension Host] [webview-metrics] state_msgs=5 p50=99KB p99=100KB max=100KB
workbench.desktop.main.js:sourcemap:692 [Extension Host] [webview-metrics] state_msgs=11 p50=161KB p99=165KB max=165KB
"

Beyond that, <project-1> is not working well. The chat returns to the initial view.
Here is the latest logs from that project:
"
[Extension Host] [webview-metrics] state_msgs=2 p50=1089KB p99=1089KB max=1089KB
console.ts:139 [Extension Host] [webview-metrics] ERROR "state" payload 1098KB > 1MB top[taskHistory=1035KB customModes=64KB clineMessages=0KB] runbook=docs/runbooks/gray-webview.md
console.ts:139 [Extension Host] [createTaskWithHistoryItem] parent task <task-id> instantiated
console.ts:139 [Extension Host] [webview-metrics] state_msgs=2 p50=173KB p99=1098KB max=1098KB
console.ts:139 [Extension Host] [Task#getCheckpointService] initializing checkpoints service
2console.ts:139 [Extension Host] [Task#getCheckpointService] initializing shadow git
console.ts:139 [Extension Host] [createSanitizedGit] Created git instance for baseDir: /root/.vscodium-server/data/User/globalStorage/xavier-arosemena.roo-plus/tasks/<task-id>/checkpoints
2console.ts:139 [Extension Host] [t#create] git = 2.53.0
2console.ts:139 [Extension Host] [t#initShadowGit] shadow git repo already exists at /root/.vscodium-server/data/User/globalStorage/xavier-arosemena.roo-plus/tasks/<task-id>/checkpoints/.git
2console.ts:139 [Extension Host] [t#initShadowGit] initialized shadow repo with base commit 39a0390a0baa29c241acf3831de244b4a3c23bc4 in 37ms
2console.ts:139 [Extension Host] [Task#getCheckpointService] service initialized
console.ts:139 [Extension Host] [webview-metrics] state_msgs=3 p50=173KB p99=173KB max=173KB
log.ts:117  INFO [remote-connection][ExtensionHost][8217a…][reconnect] received socket timeout event (reason: unacknowledgedMessage, unacknowledgedMsgCount: 1854, timeSinceOldestUnacknowledgedMsg: 45036, timeSinceLastReceivedSomeData: 20000).
log.ts:117  INFO [remote-connection][ExtensionHost][8217a…][reconnect] starting reconnecting loop. You can get more information with the trace log level.
log.ts:117  INFO [remote-connection][ExtensionHost][8217a…][reconnect] starting reconnection with grace time: 10800000ms (10800s)
log.ts:117  INFO [remote-connection][ExtensionHost][8217a…][reconnect] resolving connection...
log.ts:117  INFO [remote-connection][ExtensionHost][8217a…][reconnect] connecting to WebSocket(127.0.0.1:41497)...
log.ts:117  INFO Creating a socket (renderer-ExtensionHost-<task-id>)...
log.ts:117  INFO Creating a socket (renderer-ExtensionHost-<task-id>) was successful after 292 ms.
log.ts:117  INFO [remote-connection][ExtensionHost][8217a…][reconnect] reconnected!
log.ts:117  INFO [remote-connection][ExtensionHost][8217a…][reconnect] received socket timeout event (reason: unacknowledgedMessage, unacknowledgedMsgCount: 1854, timeSinceOldestUnacknowledgedMsg: 20001, timeSinceLastReceivedSomeData: 20004).
log.ts:117  INFO [remote-connection][ExtensionHost][8217a…][reconnect] starting reconnecting loop. You can get more information with the trace log level.
log.ts:117  INFO [remote-connection][ExtensionHost][8217a…][reconnect] starting reconnection with grace time: 10800000ms (10800s)
log.ts:117  INFO [remote-connection][ExtensionHost][8217a…][reconnect] resolving connection...
log.ts:117  INFO [remote-connection][ExtensionHost][8217a…][reconnect] connecting to WebSocket(127.0.0.1:41497)...
log.ts:117  INFO Creating a socket (renderer-ExtensionHost-<task-id>)...
log.ts:117  INFO Creating a socket (renderer-ExtensionHost-<task-id>) was successful after 264 ms.
log.ts:117   ERR [remote-connection][ExtensionHost][8217a…][reconnect][WebSocket(127.0.0.1:41497)] received error control message when negotiating connection. Error:
logToConsole @ log.ts:117
log.ts:117   ERR Error: Connection error: Unknown reconnection token (seen before)
    at GMs (remoteAgentConnection.ts:800:17)
    at uke.value (remoteAgentConnection.ts:326:17)
    at A._deliver (event.ts:1391:13)
    at A.fire (event.ts:1422:9)
    at DJ.fire (ipc.net.ts:658:19)
    at iFn._receiveMessage (ipc.net.ts:1034:28)
    at uke.value (ipc.net.ts:968:72)
    at A._deliver (event.ts:1391:13)
    at A.fire (event.ts:1422:9)
    at yvt.acceptChunk (ipc.net.ts:400:21)
    at ipc.net.ts:356:51
    at uke.value (browserSocketFactory.ts:232:39)
    at A._deliver (event.ts:1391:13)
    at A.fire (event.ts:1422:9)
    at Aor._fileReader.onload (browserSocketFactory.ts:93:17)
logToConsole @ log.ts:117
log.ts:117   ERR [remote-connection][ExtensionHost][8217a…][reconnect] A permanent error occurred in the reconnecting loop! Will give up now! Error:
logToConsole @ log.ts:117
log.ts:117   ERR Error: Connection error: Unknown reconnection token (seen before)
    at GMs (remoteAgentConnection.ts:800:17)
    at uke.value (remoteAgentConnection.ts:326:17)
    at A._deliver (event.ts:1391:13)
    at A.fire (event.ts:1422:9)
    at DJ.fire (ipc.net.ts:658:19)
    at iFn._receiveMessage (ipc.net.ts:1034:28)
    at uke.value (ipc.net.ts:968:72)
    at A._deliver (event.ts:1391:13)
    at A.fire (event.ts:1422:9)
    at yvt.acceptChunk (ipc.net.ts:400:21)
    at ipc.net.ts:356:51
    at uke.value (browserSocketFactory.ts:232:39)
    at A._deliver (event.ts:1391:13)
    at A.fire (event.ts:1422:9)
    at Aor._fileReader.onload (browserSocketFactory.ts:93:17)
logToConsole @ log.ts:117
abstractExtensionService.ts:888 Extension host (Remote) terminated unexpectedly. Code: 0, Signal: <task-id>
_onExtensionHostCrashed @ abstractExtensionService.ts:888
log.ts:117   ERR Extension host (Remote) terminated unexpectedly with code null.
logToConsole @ log.ts:117
log.ts:117   ERR Extension host (Remote) terminated unexpectedly. The following extensions were running: xavier-arosemena.roo-plus, vscode.emmet, vscode.tunnel-forwarding, vscode.git-base, vscode.git, vscode.github, vscode.debug-auto-launch, vscode.merge-conflict
logToConsole @ log.ts:117
log.ts:117  INFO Automatically restarting the remote extension host.
log.ts:117  INFO Creating a socket (renderer-ExtensionHost-<task-id>)...
log.ts:117  INFO Creating a socket (renderer-ExtensionHost-<task-id>) was successful after 318 ms.
console.ts:139 [Extension Host] Loaded translations for languages: ca, de, en, es, fr, hi, id, it, ja, ko, nl, pl, pt-BR, ru, tr, vi, zh-CN, zh-TW
log.ts:117   ERR navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.: PendingMigrationError: navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.
    at get (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:7413)
    at Object.<anonymous> (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:3422:7503)
    at Module._compile (node:internal/modules/cjs/loader:1871:14)
    at Object..js (node:internal/modules/cjs/loader:2002:10)
    at Module.load (node:internal/modules/cjs/loader:1594:32)
    at Module.<anonymous> (node:internal/modules/cjs/loader:1396:12)
    at e._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:6783)
    at i._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:280:29221)
    at r._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:272:27101)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.require (node:internal/modules/cjs/loader:1617:12)
    at require (node:internal/modules/helpers:153:16)
    at Sle._doLoadModule (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:283:1507)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
logToConsole @ log.ts:117
log.ts:117   ERR navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.: PendingMigrationError: navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.
    at get (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:7413)
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:589:17803
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at bCt.exports (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:764:132)
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:767:11671
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:775:690
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:797:625
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at Object.<anonymous> (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:3429:10351)
    at Module._compile (node:internal/modules/cjs/loader:1871:14)
    at Object..js (node:internal/modules/cjs/loader:2002:10)
    at Module.load (node:internal/modules/cjs/loader:1594:32)
    at Module.<anonymous> (node:internal/modules/cjs/loader:1396:12)
    at e._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:6783)
    at i._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:280:29221)
    at r._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:272:27101)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.require (node:internal/modules/cjs/loader:1617:12)
    at require (node:internal/modules/helpers:153:16)
    at Sle._doLoadModule (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:283:1507)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
logToConsole @ log.ts:117
log.ts:117   ERR navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.: PendingMigrationError: navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.
    at get (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:7413)
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:50:8175
    at get value (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:50:3145)
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:76:200
    at $ZodObject.a (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:50:902)
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:78:18795
    at a (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:50:902)
    at new ZodObject (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:50:1161)
    at Yd (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:78:8982)
    at Object.<anonymous> (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:3495:4986)
    at Module._compile (node:internal/modules/cjs/loader:1871:14)
    at Object..js (node:internal/modules/cjs/loader:2002:10)
    at Module.load (node:internal/modules/cjs/loader:1594:32)
    at Module.<anonymous> (node:internal/modules/cjs/loader:1396:12)
    at e._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:6783)
    at i._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:280:29221)
    at r._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:272:27101)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.require (node:internal/modules/cjs/loader:1617:12)
    at require (node:internal/modules/helpers:153:16)
    at Sle._doLoadModule (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:283:1507)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
logToConsole @ log.ts:117
log.ts:117   ERR navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.: PendingMigrationError: navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.
    at get (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:7413)
    at Object.<anonymous> (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:4095:76375)
    at Module._compile (node:internal/modules/cjs/loader:1871:14)
    at Object..js (node:internal/modules/cjs/loader:2002:10)
    at Module.load (node:internal/modules/cjs/loader:1594:32)
    at Module.<anonymous> (node:internal/modules/cjs/loader:1396:12)
    at e._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:6783)
    at i._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:280:29221)
    at r._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:272:27101)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.require (node:internal/modules/cjs/loader:1617:12)
    at require (node:internal/modules/helpers:153:16)
    at Sle._doLoadModule (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:283:1507)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
logToConsole @ log.ts:117
log.ts:117   ERR navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.: PendingMigrationError: navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.
    at get (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:7413)
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:2946:94733
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:2955:88231
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:2955:90560
    at /root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:1:422
    at Object.<anonymous> (/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.7-universal/dist/extension.js:4103:18960)
    at Module._compile (node:internal/modules/cjs/loader:1871:14)
    at Object..js (node:internal/modules/cjs/loader:2002:10)
    at Module.load (node:internal/modules/cjs/loader:1594:32)
    at Module.<anonymous> (node:internal/modules/cjs/loader:1396:12)
    at e._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:449:6783)
    at i._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:280:29221)
    at r._load (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:272:27101)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.require (node:internal/modules/cjs/loader:1617:12)
    at require (node:internal/modules/helpers:153:16)
    at Sle._doLoadModule (file:///root/.vscodium-server/bin/1a46a584725d5dd330e0bcd7f5510f24990efcf2/out/vs/workbench/api/node/extensionHostProcess.js:283:1507)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
logToConsole @ log.ts:117
webviewElement.ts:507 An iframe which has both allow-scripts and allow-same-origin for its sandbox attribute can escape its sandboxing.
mountTo @ webviewElement.ts:507
index.html?id=<task-id>&parentId=2&origin=<task-id>&swVersion=6&extensionId=xavier-arosemena.roo-plus&platform=electron&vscode-resource-base-authority=vscode-resource.vscode-cdn.net&parentOrigin=vscode-file%3A%2F%2Fvscode-app&remoteAuthority=ssh-remote%2B<remote-C>&purpose=webviewView:1038 Unrecognized feature: 'local-network-access'.
(anonymous) @ index.html?id=<task-id>&parentId=2&origin=<task-id>&swVersion=6&extensionId=xavier-arosemena.roo-plus&platform=electron&vscode-resource-base-authority=vscode-resource.vscode-cdn.net&parentOrigin=vscode-file%3A%2F%2Fvscode-app&remoteAuthority=ssh-remote%2B<remote-C>&purpose=webviewView:1038
index.js:413 Dynamically loaded translations: Array(18)
vscode-remote+ssh-002dremote-002b<remote-C>.vscode-resource.vscode-cdn.net/assets/shellscript-xyv2Ai2R.js:1  Failed to load resource: the server responded with a status of 401 ()
vscode-remote+ssh-002dremote-002b<remote-C>.vscode-resource.vscode-cdn.net/assets/rolldown-runtime-DAXXjFlN.js:1  Failed to load resource: the server responded with a status of 401 ()
console.ts:139 [Extension Host] [webview-metrics] ERROR "state" payload 1089KB > 1MB top[taskHistory=1035KB customModes=56KB clineMessages=0KB] runbook=docs/runbooks/gray-webview.md
log.ts:117   ERR [Extension Host] Vercel AI Gateway models response is invalid {"_errors":[],"data":{"107":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"108":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"109":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"110":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"111":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"112":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"113":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"114":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"128":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"129":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"228":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"229":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"280":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"291":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"292":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"293":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"353":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"354":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"_errors":[]}}
logToConsole @ log.ts:117
console.ts:139 [Extension Host] Vercel AI Gateway models response is invalid {"_errors":[],"data":{"107":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"108":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"109":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"110":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"111":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"112":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"113":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"114":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"128":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"129":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"228":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"229":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"280":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"291":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"292":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"293":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"353":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"354":{"_errors":[],"context_window":{"_errors":["Required"]},"max_tokens":{"_errors":["Required"]}},"_errors":[]}}
log @ console.ts:139
console.ts:139 [Extension Host] [SembleProvider] Semble found and ready.
vscode-remote+ssh-002dremote-002b<remote-C>.vscode-resource.vscode-cdn.net/assets/howler-DNFnvU0Y.js:1  Failed to load resource: the server responded with a status of 401 ()
6The AudioContext was not allowed to start. It must be resumed (or created) from a user gesture event handler. <URL>
console.ts:139 [Extension Host] [webview-metrics] state_msgs=2 p50=1089KB p99=1089KB max=1089KB
"
```
