const escape = value => String(value).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const text = (en, zh) => `<span data-en="${escape(en)}" data-zh="${escape(zh)}">${escape(en)}</span>`;
const copy = id => `<button type="button" class="quiet" data-copy="${id}">${text('Copy', '复制')}</button>`;
const address = (id, en, zh) => `<div class="field"><label for="${id}">${text(en, zh)}</label><div class="value-row"><input id="${id}" readonly spellcheck="false" value="">${copy(id)}</div></div>`;
const credential = (id, label, en, zh) => `<div class="credential"><label for="${id}">${label}</label><p class="hint">${text(en, zh)}</p><div class="secret-value"><span data-mask="${id}" aria-hidden="true">••••••••••••••••••••••••</span><textarea id="${id}" hidden readonly spellcheck="false" autocomplete="off" rows="3"></textarea></div><div class="actions"><button type="button" class="quiet" data-reveal="${id}" aria-controls="${id}" aria-expanded="false">Show</button>${copy(id)}</div></div>`;

export const SETUP_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>DotLink · Personal setup</title>
<link rel="stylesheet" href="/setup/style.css">
<script type="module" src="/setup/app.js">
</script>
</head>
<body>
<a class="skip" href="#main">${text('Skip to setup', '跳转到设置')}</a>
<div class="shell">
<header class="topbar">
<a class="brand" href="/setup">
<span class="brand-mark" aria-hidden="true">d.</span>DotLink</a>
<div class="language" role="group" aria-label="Language / 语言">
<button type="button" data-language="en" aria-pressed="true">English</button>
<button type="button" data-language="zh-CN" aria-pressed="false">简体中文</button>
</div>
</header>
<main id="main">
<section class="hero">
<div>
<p class="eyebrow">${text('YOUR IPHONE. YOUR BRIDGE.', '你的 iPhone，你的 Bridge。')}</p>
<h1>${text('A little context.\nA closer connection.', '一点手机上下文，\n连接自己的 dot。')}</h1>
<p class="intro">${text('Connect selected iPhone events to your personal dot, through a Bridge you own. Start with a fresh deployment, then choose what your phone sends.', '通过自己部署的 Bridge，将选定的 iPhone 事件连接到个人 dot。先完成全新部署，再选择手机上传的内容。')}</p>
</div>
<aside class="hero-note">
<span class="note-dot" aria-hidden="true">
</span>
<strong>${text('Private by design', '由你掌握')}</strong>
<p>${text('Credentials are generated in this browser, only when you ask. This page never saves or sends them.', '只有你主动点击后，浏览器才生成凭据。此页面不会保存或发送凭据。')}</p>
<span class="small">${text('iPhone → your Worker → your dot', 'iPhone → 你的 Worker → 你的 dot')}</span>
</aside>
</section>
<noscript>
<div class="notice">This setup page needs JavaScript to switch languages and generate local credentials. 此页面需要 JavaScript 才能切换语言并在本地生成凭据。</div>
</noscript>
<nav class="mode" aria-label="Deployment type">
<button type="button" data-mode="fresh" aria-pressed="true">${text('New deployment', '全新部署')}</button>
<button type="button" data-mode="existing" aria-pressed="false">${text('Existing deployment', '已有部署')}</button>
</nav>
<section id="existing-path" class="card recovery" hidden>
<p class="eyebrow">${text('KEEP YOUR EXISTING KEYS', '保留现有密钥')}</p>
<h2>${text('Reconnect without replacing credentials.', '重新连接时，不要更换凭据。')}</h2>
<p>${text('This page cannot read your Worker settings or recover old keys. Use your existing private backup and the original deployment guide. Do not replace BRIDGE_SEAL_KEY or DEVICE_REGISTRY to reconnect: changing them can break stored subscriptions or phone uploads.', '此页面不能读取 Worker 配置或找回旧密钥。请使用原有私密备份和部署指南。不要为重新连接而替换 BRIDGE_SEAL_KEY 或 DEVICE_REGISTRY，否则可能破坏已有订阅或手机上传。')}</p>
<p>${text('If credentials are lost, plan a deliberate credential rotation and re-enrollment. This setup page does not perform recovery, migration or key rotation.', '如果凭据丢失，需要单独规划密钥轮换和重新登记。此设置页不执行恢复、迁移或密钥轮换。')}</p>${address('mcp-url', 'Your MCP address', '你的 MCP 地址')}</section>
<div id="fresh-path" class="steps">
<section class="card">
<div class="step-heading">
<span class="step-number">01</span>
<div>
<p class="eyebrow">${text('YOUR OWN CLOUD', '你自己的云端')}</p>
<h2>${text('Start with a separate Worker.', '从独立的新 Worker 开始。')}</h2>
</div>
</div>
<p>${text('Use the project deployment guide to create a fresh Cloudflare Worker with its own OAUTH_KV and SQLite BRIDGE Durable Object. Choose a new Worker name. Do not point it at an existing personal deployment or reuse its storage.', '按照项目部署指南创建全新的 Cloudflare Worker，独立配置 OAUTH_KV 和 SQLite BRIDGE Durable Object。使用新的 Worker 名称，不要指向现有个人部署或复用其存储。')}</p>
<p>${text('Open /setup on that Worker’s final HTTPS address. The addresses below come from this page’s origin; they are not a live configuration check. If this is a preview address, open the final Worker before continuing.', '在该 Worker 最终的 HTTPS 地址下打开 /setup。下面地址来自当前页面来源，不代表实时配置检查。如果现在是预览地址，请先打开最终 Worker。')}</p>${address('public-origin', 'Worker origin · PUBLIC_ORIGIN', 'Worker 来源 · PUBLIC_ORIGIN')}<div class="notice subtle">${text('Nothing on this page deploys a Worker or changes Cloudflare settings. Enter configuration yourself in your own Cloudflare dashboard.', '此页面不会部署 Worker 或更改 Cloudflare 设置。请在自己的 Cloudflare 控制台中手动填写配置。')}</div>
</section>
<section class="card">
<div class="step-heading">
<span class="step-number">02</span>
<div>
<p class="eyebrow">${text('VERIFY THE OWNER', '确认所有者')}</p>
<h2>${text('Create your own GitHub OAuth App.', '创建自己的 GitHub OAuth App。')}</h2>
</div>
</div>
<ol class="instruction-list">
<li>${text('Find your GitHub account’s numeric id in the official GitHub API response at https://api.github.com/users/YOUR_USERNAME. Use the id field, not your username or node_id.', '打开官方 GitHub API：https://api.github.com/users/你的用户名。找到数字 id 字段，不要使用用户名或 node_id。')}</li>
<li>${text('In GitHub Settings → Developer settings → OAuth Apps, create an OAuth App owned by you. Use the Worker origin as Homepage URL and this exact Authorization callback URL:', '在 GitHub Settings → Developer settings → OAuth Apps 中创建自己的 OAuth App。Homepage URL 填写 Worker 来源，Authorization callback URL 填写以下完整地址：')}${address('callback-url', 'GitHub callback URL', 'GitHub 回调 URL')}</li>
<li>${text('Keep the OAuth App’s Client ID and Client secret private. Enter them only in your own Cloudflare dashboard. GitHub confirms the configured owner’s numeric ID; no repository permission is requested.', '私密保存 OAuth App 的 Client ID 和 Client secret，只在自己的 Cloudflare 控制台中填写。GitHub 用于确认配置的所有者数字 ID，不申请仓库权限。')}</li>
</ol>
<div class="notice">${text('This page never asks for a Cloudflare API token or GitHub Client secret.', '此页面绝不会要求输入 Cloudflare API token 或 GitHub Client secret。')}</div>
</section>
<section class="card">
<div class="step-heading">
<span class="step-number">03</span>
<div>
<p class="eyebrow">${text('ONE FRESH SET', '生成一组全新凭据')}</p>
<h2>${text('Make your private credentials.', '生成你的私密凭据。')}</h2>
</div>
</div>
<p>${text('Two independent 32-byte random values are created locally: an encryption key for stored subscription secrets and an upload-only token for iphone-primary. DEVICE_REGISTRY contains the token’s SHA-256 digest, not the token.', '本地生成两个独立的 32 字节随机值：用于保存订阅秘密的加密密钥，以及 iphone-primary 的仅上传令牌。DEVICE_REGISTRY 包含令牌的 SHA-256 摘要，不包含令牌原文。')}</p>
<label class="acknowledgment">
<input id="fresh-install" type="checkbox">
<span>${text('I am configuring a fresh, separate Worker with no existing credentials or subscriptions.', '我正在配置独立的全新 Worker，其中没有已有凭据或订阅。')}</span>
</label>
<p id="insecure" class="notice" hidden>${text('Open the final HTTPS Worker in a browser with WebCrypto before generating credentials.', '生成凭据前，请在支持 WebCrypto 的浏览器中打开最终 HTTPS Worker。')}</p>
<button id="generate" type="button" class="primary" disabled>Generate credentials</button>
<p class="hint">${text('Generation happens only after this click. Switching language or modules keeps the same values. Refreshing or closing the page clears them; nothing is regenerated automatically.', '只有点击才会生成。切换语言或模块不会改变凭据。刷新或关闭页面后凭据即清空，不会自动重新生成。')}</p>
<div id="credentials" hidden>
<div class="notice">${text('Before continuing, deliberately copy all three values into your private password manager. Label the backup with this Worker’s origin. Do not put it in Git, screenshots, chat messages or shared notes. No automatic download is created.', '继续之前，请主动复制下面三项值到私密密码管理器，并标注此 Worker 的来源地址。不要放入 Git、截图、聊天消息或共享笔记。页面不会自动生成下载文件。')}</div>${credential('seal-key', 'BRIDGE_SEAL_KEY', 'Cloudflare Secret · encryption key. Keep it stable for this deployment.', 'Cloudflare Secret · 加密密钥。此部署中应保持不变。')}${credential('device-registry', 'DEVICE_REGISTRY', 'Cloudflare Secret · copy the entire JSON value.', 'Cloudflare Secret · 复制完整 JSON 值。')}${credential('device-token', text('iPhone upload token', 'iPhone 上传令牌'), 'Only for your own iPhone shortcut and private backup. Do not enter this raw token in Cloudflare variables.', '只用于自己的 iPhone 快捷指令和私密备份。不要把令牌原文填入 Cloudflare 变量。')}</div>
</section>
<section class="card">
<div class="step-heading">
<span class="step-number">04</span>
<div>
<p class="eyebrow">${text('CONFIGURE, THEN DEPLOY', '填写配置，再部署')}</p>
<h2>${text('Add the values in Cloudflare.', '在 Cloudflare 中填入配置。')}</h2>
</div>
</div>
<p>${text('Open your new Worker → Settings → Variables and Secrets. Add the following values, then save and deploy. Keep any existing deployment untouched.', '打开新 Worker → Settings → Variables and Secrets。添加以下配置后保存并部署。保留已有部署不变。')}</p>
<div class="table-wrap">
<table>
<thead>
<tr>
<th>${text('Name', '名称')}</th>
<th>${text('Type', '类型')}</th>
<th>${text('Value', '值')}</th>
</tr>
</thead>
<tbody>
<tr>
<td>
<code>PUBLIC_ORIGIN</code>
</td>
<td>${text('Text', '文本')}</td>
<td>${text('Worker origin from step 1; no trailing slash', '步骤 1 的 Worker 来源，不含末尾斜杠')}</td>
</tr>
<tr>
<td>
<code>OWNER_GITHUB_ID</code>
</td>
<td>${text('Text', '文本')}</td>
<td>${text('Your own numeric GitHub id', '你自己的 GitHub 数字 id')}</td>
</tr>
<tr>
<td>
<code>ENABLE_INGEST</code>
</td>
<td>${text('Text', '文本')}</td>
<td>
<code>false</code> ${text('until setup is complete', '，完成配置前保持关闭')}</td>
</tr>
<tr>
<td>
<code>GITHUB_CLIENT_ID</code>
</td>
<td>Secret</td>
<td>${text('Client ID from your own OAuth App', '你自己的 OAuth App Client ID')}</td>
</tr>
<tr>
<td>
<code>GITHUB_CLIENT_SECRET</code>
</td>
<td>Secret</td>
<td>${text('Client secret from your own OAuth App', '你自己的 OAuth App Client secret')}</td>
</tr>
<tr>
<td>
<code>BRIDGE_SEAL_KEY</code>
</td>
<td>Secret</td>
<td>${text('Generated in step 3', '步骤 3 生成')}</td>
</tr>
<tr>
<td>
<code>DEVICE_REGISTRY</code>
</td>
<td>Secret</td>
<td>${text('Entire generated JSON from step 3', '步骤 3 生成的完整 JSON')}</td>
</tr>
</tbody>
</table>
</div>
<p class="hint">${text('For this single-origin setup, leave AUTH_ORIGIN unset. If you intentionally use a separate authorization origin, follow the advanced deployment guide; this page does not configure that arrangement.', '本同源设置应不设置 AUTH_ORIGIN。如果有意使用独立授权来源，请遵循高级部署指南；此页面不配置该模式。')}</p>
<p>${text('Keep ENABLE_INGEST false while configuring your phone and dot. Enable uploads only after completing the connection and subscription in step 6. This switch does not install phone automations.', '配置手机与 dot 期间保持 ENABLE_INGEST 为 false。完成步骤 6 的连接与订阅后再开启上传。这个开关不会安装手机自动化。')}</p>
</section>
<section class="card">
<div class="step-heading">
<span class="step-number">05</span>
<div>
<p class="eyebrow">${text('CHOOSE YOUR PHONE EVENTS', '选择手机事件')}</p>
<h2>${text('Start small. Add what helps.', '从少量有用事件开始。')}</h2>
</div>
</div>
<p>${text('These choices only show setup guidance. They do not configure the server or narrow OAuth permissions. An authorized dot can read and subscribe to all data available on this Bridge.', '这些选择仅显示搭建说明，不会配置服务器或缩小 OAuth 权限。获授权的 dot 可以读取并订阅此 Bridge 上全部可用数据。')}</p>
<div class="modules">
<label class="module">
<input type="checkbox" data-module="notifications" checked>
<span>
<strong>${text('Notifications', '通知')}</strong>
<span>${text('New notifications from selected apps', '选定 App 的新通知')}</span>
</span>
</label>
<label class="module">
<input type="checkbox" data-module="battery">
<span>
<strong>${text('Battery & charging', '电量与充电')}</strong>
<span>${text('Battery level when charging changes', '充电变化时的电量')}</span>
</span>
</label>
<label class="module">
<input type="checkbox" data-module="focus">
<span>
<strong>${text('Focus', '专注模式')}</strong>
<span>${text('Named modes, started and ended', '指定模式的开启与关闭')}</span>
</span>
</label>
</div>
<div class="notice subtle">
<strong>${text('Four signed Beta templates are available.', '已提供四份签名 Beta 模板。')}</strong>
<a href="https://github.com/zzaachaary/dotlink/releases/tag/v0.1.0-beta.1" target="_blank" rel="noopener noreferrer">${text('Download templates', '下载模板')}</a> ·
<a href="https://github.com/zzaachaary/dotlink/blob/main/docs/iphone-shortcuts.md" target="_blank" rel="noopener noreferrer">English guide</a> ·
<a href="https://github.com/zzaachaary/dotlink/blob/main/docs/zh-CN/iphone-shortcuts.md" target="_blank" rel="noopener noreferrer">中文指南</a>
${text('Use your own upload URL and device token, bind each trigger, and verify first and repeated runs before enabling daily use.', '填写自己的上传地址和设备令牌，绑定各项触发器，先验证首次和重复运行，再用于日常使用。')}</div>
<div id="guide-notifications" class="module-guide">
<h3>${text('Notification automation', '通知自动化')}</h3>
<p>${text('Create an automation for new notifications and select the apps explicitly. Use only title/body fields iOS actually provides. Exclude ChatGPT, Codex and Shortcuts to avoid loops. This cannot read chat history or hidden content.', '创建新通知自动化并明确选择 App。只使用 iOS 实际提供的标题和正文字段。排除 ChatGPT、Codex 和快捷指令，避免循环。此功能不能读取聊天历史或隐藏内容。')}</p>
</div>
<div id="guide-battery" class="module-guide" hidden>
<h3>${text('Charging automations', '充电自动化')}</h3>
<p>${text('Create separate Charger Connected and Charger Disconnected automations. Read the current battery level and send the matching charging state. This records changes, not continuous monitoring.', '分别创建“充电器已连接”和“充电器已断开”自动化。读取当时电量并上传对应充电状态。这只记录变化，不是连续监控。')}</p>
</div>
<div id="guide-focus" class="module-guide" hidden>
<h3>${text('Focus automations', '专注模式自动化')}</h3>
<p>${text('For each selected Focus, create one automation for turning on and one for turning off. Set the mode name explicitly in both. Send active true or false and the event time; this does not control Focus.', '为每个选定专注模式分别创建开启与关闭自动化。两者都明确填写模式名称，上传 active true 或 false 与事件时间；此功能不会控制专注模式。')}</p>
</div>${address('ingest-url', 'iPhone upload endpoint', 'iPhone 上传地址')}<p class="hint">${text('Use device_id iphone-primary and the upload token from step 3. Follow the documented event payload exactly; this page does not create a shortcut or send a test event.', '使用 device_id iphone-primary 和步骤 3 的上传令牌。严格按照文档的事件格式搭建；此页面不会创建快捷指令或发送测试事件。')}</p>
</section>
<section class="card final-step">
<div class="step-heading">
<span class="step-number">06</span>
<div>
<p class="eyebrow">${text('CONNECT & VERIFY', '连接并验证')}</p>
<h2>${text('Give your dot the Bridge address.', '将 Bridge 地址交给你的 dot。')}</h2>
</div>
</div>
<p>${text('Add the MCP endpoint to your supported dot connection, approve the consent screen and sign in with the configured GitHub owner. Copy the Worker origin from step 1 and append /mcp.', '将 MCP 地址添加到支持的 dot 连接，确认授权页，并使用配置的 GitHub 所有者登录。复制步骤 1 的 Worker 来源并在末尾添加 /mcp。')}</p>${address('mcp-fresh-url', 'Your MCP address', '你的 MCP 地址')}<p>${text('Ask your dot to confirm iphone-primary with phone_devices, subscribe to phone.event for your selected modules, and check expiry with phone_bridge_status. After that, set ENABLE_INGEST to true in Cloudflare and apply the change before testing your phone.', '让 dot 用 phone_devices 确认 iphone-primary，订阅所选模块的 phone.event，并用 phone_bridge_status 检查到期时间。完成后，在 Cloudflare 将 ENABLE_INGEST 改为 true 并应用更改，再测试手机。')}</p><p>${text('Test with a non-private event. A 202 upload response confirms Bridge acceptance; a webhook 2xx confirms receiver acknowledgment. Separately verify that your dot actually processed the event. Offline retry and continuous subscription renewal are not guaranteed by this page.', '使用不含隐私的事件测试。上传返回 202 仅证明 Bridge 接收；webhook 返回 2xx 仅证明接收端确认。请单独核对 dot 是否实际处理。此页面不保证离线重试或持续订阅续期。')}</p>
</section>
</div>
<p id="status" class="status" role="status" aria-live="polite" aria-atomic="true">
</p>
</main>
<footer>
<span>DotLink</span>
<p>${text('Self-hosted. Single owner. Yours to configure.', '自行托管，单一所有者，由你配置。')}</p>
<p>${text('Not affiliated with Apple, Cloudflare, GitHub or OpenAI.', '与 Apple、Cloudflare、GitHub 或 OpenAI 无官方隶属关系。')}</p>
</footer>
</div>
</body>
</html>`;

export const SETUP_CSS = `
:root{
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  color:#20362e;
  background:#f5f5ef;
  font-synthesis:none;
  line-height:1.65;
  color-scheme:light;
  --green:#245b46;
  --muted:#667369;
  --border:#dce2d8}

*{
  box-sizing:border-box}
body{
  margin:0}
button,input,textarea{
  font:inherit}
button,a,input,textarea{
  touch-action:manipulation}
button{
  cursor:pointer;
  border:1px solid var(--border);
  background:#fff;
  color:inherit;
  border-radius:8px;
  padding:.55rem .9rem;
  line-height:1.35}
button:hover:not(:disabled){
  background:#edf2e9}
button:disabled{
  cursor:not-allowed;
  opacity:.52}
button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible{
  outline:3px solid #cc9151;
  outline-offset:3px}
a{
  color:var(--green)}
[hidden]{
  display:none!important}
.shell{
  max-width:1100px;
  margin:auto;
  padding:0 36px}
.topbar{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:20px;
  padding:28px 0;
  border-bottom:1px solid var(--border)}
.brand{
  display:flex;
  align-items:center;
  gap:10px;
  color:inherit;
  text-decoration:none;
  font-size:1.3rem;
  font-weight:700;
  letter-spacing:-.045em}
.brand-mark{
  display:grid;
  place-items:center;
  width:35px;
  height:35px;
  background:var(--green);
  color:#f8f8ed;
  border-radius:11px;
  font-family:Georgia,serif}
.language{
  display:flex;
  gap:3px;
  padding:3px;
  border:1px solid var(--border);
  border-radius:11px}
.language button{
  border:0;
  background:transparent;
  font-size:.8rem;
  padding:.45rem .6rem}
.language button[aria-pressed=true]{
  background:#fff;
  box-shadow:0 1px 4px #16342315}
.hero{
  display:grid;
  grid-template-columns:1fr 265px;
  gap:70px;
  align-items:center;
  padding:64px 0 45px}
.eyebrow{
  font-size:.68rem;
  letter-spacing:.14em;
  font-weight:700;
  color:var(--muted);
  margin:0 0 10px}
h1{
  font-family:Georgia,"Times New Roman",serif;
  font-size:clamp(2.4rem,5vw,3.9rem);
  font-weight:400;
  line-height:1.08;
  letter-spacing:-.05em;
  white-space:pre-line;
  margin:0 0 24px}
h2{
  font-size:1.45rem;
  line-height:1.3;
  letter-spacing:-.025em;
  margin:0}
h3{
  font-size:1rem;
  margin:0 0 8px}
p{
  margin:14px 0}
.intro{
  max-width:560px;
  color:var(--muted);
  font-size:1rem}
.hero-note{
  border-left:1px solid #c5d0c0;
  padding:6px 0 6px 24px;
  font-size:.88rem}
.hero-note strong{
  display:block;
  margin:12px 0 3px}
.hero-note p{
  color:var(--muted)}
.note-dot{
  display:block;
  width:9px;
  height:9px;
  border-radius:50%;
  background:#6c9b65;
  box-shadow:0 0 0 5px #e3ebdd}
.small{
  font-size:.7rem;
  letter-spacing:.02em}
.mode{
  display:flex;
  gap:8px;
  margin:5px 0 22px}
.mode button[aria-pressed=true]{
  background:var(--green);
  border-color:var(--green);
  color:#fff}
.steps{
  display:grid;
  gap:20px}
.card{
  padding:32px 36px;
  background:#fff;
  border:1px solid var(--border);
  border-radius:15px}
.step-heading{
  display:flex;
  align-items:flex-start;
  gap:18px;
  margin-bottom:22px}
.step-heading .eyebrow{
  margin-bottom:5px}
.step-number{
  font-family:ui-monospace,monospace;
  color:#819180;
  font-size:.8rem;
  padding-top:5px}
.card>p,.instruction-list{
  font-size:.93rem;
  color:#536157}
.field{
  margin:22px 0}
.field label,.credential>label{
  display:block;
  font-size:.8rem;
  font-weight:650;
  margin-bottom:8px}
.value-row{
  display:flex;
  gap:8px;
  align-items:flex-start}
.value-row input{
  min-width:0;
  flex:1}
.value-row input,textarea{
  border:1px solid var(--border);
  border-radius:7px;
  background:#f7f8f3;
  padding:.7rem .85rem;
  font-family:ui-monospace,SFMono-Regular,monospace;
  font-size:.78rem;
  color:#254c3b;
  line-height:1.6}
textarea{
  width:100%;
  resize:vertical;
  overflow-wrap:anywhere}
.notice{
  padding:15px 18px;
  border:1px solid #e7d6b8;
  background:#fff9ed;
  border-radius:8px;
  font-size:.83rem;
  color:#705938;
  margin:18px 0}
.notice.subtle{
  background:#f3f6ef;
  border-color:#dce6d4;
  color:#52674b}
.instruction-list{
  padding-left:22px}
.instruction-list>li{
  padding-left:5px;
  margin:18px 0}
.acknowledgment{
  display:flex;
  gap:12px;
  align-items:flex-start;
  padding:18px;
  background:#f4f7f0;
  border-radius:9px;
  margin:22px 0;
  font-size:.9rem}
.acknowledgment input,.module input{
  accent-color:var(--green);
  width:18px;
  height:18px;
  flex:none;
  margin-top:4px}
.primary{
  background:var(--green);
  color:#fff;
  border-color:var(--green);
  padding:.8rem 1.1rem}
.primary:hover:not(:disabled){
  background:#194431}
.hint{
  font-size:.8rem!important;
  color:var(--muted)!important}
.credential{
  padding:20px 0;
  border-top:1px solid var(--border)}
.credential .hint{
  margin:5px 0 13px}
.secret-value{
  background:#f4f6f1;
  border-radius:7px;
  padding:10px 12px;
  overflow-wrap:anywhere;
  min-height:48px}
.secret-value textarea{
  background:#fff}
.secret-value>[data-mask]{
  color:#798471;
  font-family:monospace;
  letter-spacing:.15em}
.actions{
  display:flex;
  gap:8px;
  margin-top:10px}
.quiet{
  font-size:.8rem}
.table-wrap{
  overflow-x:auto;
  border:1px solid var(--border);
  border-radius:8px}
table{
  width:100%;
  border-collapse:collapse;
  font-size:.8rem;
  text-align:left}
th,td{
  padding:13px 14px;
  vertical-align:top;
  border-bottom:1px solid var(--border)}
th{
  background:#f4f6f1;
  color:var(--muted);
  font-weight:600}
tbody tr:last-child td{
  border-bottom:0}
code{
  font-family:ui-monospace,SFMono-Regular,monospace;
  font-size:.86em;
  overflow-wrap:anywhere}
.modules{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:10px;
  margin:24px 0}
.module{
  display:flex;
  gap:10px;
  padding:16px 12px;
  border:1px solid var(--border);
  border-radius:9px;
  cursor:pointer}
.module:has(input:checked){
  border-color:#94ad89;
  background:#f3f7ed}
.module strong{
  display:block;
  font-size:.85rem}
.module span span{
  display:block;
  font-size:.75rem;
  color:var(--muted);
  margin-top:4px}
.module-guide{
  border-top:1px solid var(--border);
  padding-top:18px;
  margin:22px 0;
  font-size:.9rem}
.module-guide p{
  color:var(--muted)}
.final-step{
  background:#edf3e8;
  border-color:#d4dfcc}
.status:empty{
  display:none}
.status{
  position:sticky;
  bottom:16px;
  padding:15px 20px;
  color:#fff;
  background:#284f3e;
  border-radius:10px;
  font-size:.85rem;
  box-shadow:0 8px 25px #19302218}
footer{
  display:flex;
  align-items:center;
  gap:24px;
  flex-wrap:wrap;
  color:var(--muted);
  font-size:.7rem;
  padding:35px 0}
footer>span{
  font-weight:700;
  color:#324c3c;
  font-size:.9rem}
footer p:last-child{
  margin-left:auto}
.skip{
  position:absolute;
  left:16px;
  top:-80px;
  background:#fff;
  padding:10px;
  z-index:2}
.skip:focus{
  top:12px}
.consent-shell{
  max-width:700px;
  padding:35px 24px;
  margin:auto}
.consent-shell .card{
  margin-top:32px}
.consent-details{
  margin:24px 0;
  overflow-wrap:anywhere}
.consent-details dt{
  font-size:.78rem;
  color:var(--muted);
  margin-top:14px}
.consent-details dd{
  margin:2px 0}
.consent-shell .actions{
  flex-wrap:wrap;
  margin-top:24px}
.consent-shell h1{
  font-size:2.5rem;
  margin-top:24px}
.consent-shell .language a{
  font-size:.8rem;
  padding:.4rem;
  text-decoration:none}
.consent-shell .language a[aria-current=true]{
  font-weight:700}

@media(max-width:700px){
  .shell{
  padding:0 18px}
.topbar{
  padding:20px 0}
.hero{
  grid-template-columns:1fr;
  gap:25px;
  padding:38px 0 28px}
.hero-note{
  max-width:100%;
  padding:14px 18px;
  background:#eaf0e3;
  border:0;
  border-radius:10px}
.hero-note strong{
  margin:0}
.note-dot{
  display:none}
.hero-note p{
  margin:7px 0}
.card{
  padding:24px 20px}
.step-heading{
  gap:12px}
h2{
  font-size:1.25rem}
.modules{
  grid-template-columns:1fr}
.module{
  padding:15px}
.module span span{
  margin-top:0}
.value-row{
  flex-wrap:wrap}
.value-row input{
  flex-basis:100%}
.table-wrap{
  margin:0 -6px}
.language button{
  padding:.4rem .5rem}
.mode{
  flex-wrap:wrap}
footer{
  gap:5px 14px}
footer p{
  margin:4px 0}
footer p:last-child{
  margin-left:0;
  width:100%}
.consent-shell{
  padding:20px 16px}
.consent-shell .card{
  padding:24px 20px}
.consent-shell h1{
  font-size:2rem}
}

@media(prefers-reduced-motion:reduce){
  *{
  scroll-behavior:auto}
}

`;
