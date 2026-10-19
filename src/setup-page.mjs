const escape = value => String(value).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const text = (en, zh) => `<span data-en="${escape(en)}" data-zh="${escape(zh)}">${escape(en)}</span>`;
const copy = id => `<button type="button" class="quiet" data-copy="${id}">${text('Copy', '复制')}</button>`;
const address = (id, en, zh) => `<div class="field"><label for="${id}">${text(en, zh)}</label><div class="value-row"><input id="${id}" readonly spellcheck="false" value="">${copy(id)}</div></div>`;
const credential = (id, label, en, zh) => `<div class="credential"><label for="${id}">${label}</label><p class="hint">${text(en, zh)}</p><div class="secret-value"><span data-mask="${id}" aria-hidden="true">••••••••••••••••••••••••</span><textarea id="${id}" hidden readonly spellcheck="false" autocomplete="off" rows="3"></textarea></div><div class="actions"><button type="button" class="quiet" data-reveal="${id}" aria-controls="${id}" aria-expanded="false">Show</button>${copy(id)}</div></div>`;
const configValue = (id, en, zh) => `<div class="value-row"><input id="${id}" readonly spellcheck="false" data-placeholder-en="${escape(en)}" data-placeholder-zh="${escape(zh)}" placeholder="${escape(en)}">${copy(id)}</div>`;
const configSecret = id => `<p class="hint" data-config-pending>${text('Generate your credentials in step 3 first.', '先在步骤 3 生成凭据，值会自动出现在这里。')} <a href="#step-3">${text('Go to step 3', '前往步骤 3')}</a></p><div data-config-ready hidden><div class="secret-value"><span data-mask="${id}" aria-hidden="true">••••••••••••••••</span><textarea id="${id}" hidden readonly spellcheck="false" autocomplete="off" rows="3"></textarea></div><div class="actions"><button type="button" class="quiet" data-reveal="${id}" aria-controls="${id}" aria-expanded="false">Show</button>${copy(id)}</div></div>`;

export const SETUP_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title data-en="DotLink · Personal setup" data-zh="DotLink · 个人设置">DotLink · Personal setup</title>
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
<p class="eyebrow">${text('DotLink setup', 'DotLink 设置指南')}</p>
<h1>${text('Your iPhone.\nConnected to your dot.', '让你的 iPhone，\n连接你的 dot。')}</h1>
<p class="intro">${text('Set up your own Bridge in six steps. Configure the connection, choose the events to share, then verify delivery.', '按六步完成自己的 Bridge 设置：先配置连接，再选择要分享的手机事件，最后确认能否送达。')}</p>
<p class="hero-meta">${text('Your accounts · Your data · Your choice', '自己的账号 · 自己的数据 · 自己决定')}</p>
</div>
<aside class="hero-note">
<strong>${text('Private by design', '由你掌握')}</strong>
<p>${text('Credentials are generated only when you click. Everything you enter stays in this page until you refresh or close it.', '只有主动点击才会生成凭据。填写和生成的值仅留在当前页面，刷新或关闭后清空。')}</p>
<span class="small">${text('iPhone → your Worker → your dot', 'iPhone → 你的 Worker → 你的 dot')}</span>
</aside>
</section>
<noscript>
<div class="notice">This setup page needs JavaScript to switch languages and generate local credentials. 此页面需要 JavaScript 才能切换语言并在本地生成凭据。</div>
</noscript>
<nav class="mode" aria-label="Deployment type" data-aria-label-en="Deployment type" data-aria-label-zh="部署类型">
<button type="button" data-mode="fresh" aria-pressed="true">${text('New deployment', '全新部署')}</button>
<button type="button" data-mode="existing" aria-pressed="false">${text('Existing deployment', '已有部署')}</button>
</nav>
<section id="existing-path" class="card recovery" hidden>
<p class="eyebrow">${text('KEEP YOUR EXISTING KEYS', '保留现有密钥')}</p>
<h2>${text('Reconnect without replacing credentials.', '重新连接时，不要更换凭据。')}</h2>
<p>${text('This page cannot read your Worker settings or recover old keys. Use your existing private backup and the original deployment guide. Do not replace BRIDGE_SEAL_KEY or DEVICE_REGISTRY to reconnect: changing them can break stored subscriptions or phone uploads.', '此页面不能读取 Worker 配置或找回旧密钥。请使用原有私密备份和部署指南。不要为重新连接而替换 BRIDGE_SEAL_KEY 或 DEVICE_REGISTRY，否则可能破坏已有订阅或手机上传。')}</p>
<p>${text('If credentials are lost, plan a deliberate credential rotation and re-enrollment. This setup page does not perform recovery, migration or key rotation.', '如果凭据丢失，需要单独规划密钥轮换和重新登记。此设置页不执行恢复、迁移或密钥轮换。')}</p>${address('mcp-url', 'Your MCP address', '你的 MCP 地址')}</section>
<div id="fresh-path" class="steps">
<nav class="step-nav" aria-label="Setup steps" data-aria-label-en="Setup steps" data-aria-label-zh="设置步骤">
<a href="#step-1">01 ${text('Worker', '部署')}</a>
<a href="#step-2">02 GitHub</a>
<a href="#step-3">03 ${text('Credentials', '凭据')}</a>
<a href="#step-4">04 ${text('Configuration', '配置')}</a>
<a href="#step-5">05 iPhone</a>
<a href="#step-6">06 ${text('Connect', '连接')}</a>
</nav>
<section class="card" id="step-1">
<div class="step-heading">
<span class="step-number">01</span>
<div>
<p class="eyebrow">${text('YOUR OWN CLOUD', '你自己的云端')}</p>
<h2>${text('Open your new Worker.', '打开你的新 Worker')}</h2>
</div>
</div>
<ol class="instruction-list">
<li>${text('Deploy the project to a new Worker in your own Cloudflare account. Use a new name and separate OAUTH_KV and SQLite BRIDGE storage. Leave variables and Secrets empty for now.', '在自己的 Cloudflare 账号中将项目部署为新 Worker，使用新名称和独立的 OAUTH_KV、SQLite BRIDGE 存储。首次部署先不填变量和 Secrets。')}</li>
<li>${text('Open the final HTTPS Worker address with /setup at the end. Check the address below before continuing; do not use a temporary preview address.', '打开 Worker 最终的 HTTPS 地址，在末尾加上 /setup。继续之前核对下方地址，不要使用临时预览地址。')}</li>
</ol>${address('public-origin', 'Worker address · PUBLIC_ORIGIN', 'Worker 地址 · PUBLIC_ORIGIN')}<p class="hint">${text('This is the current page’s origin, without a trailing slash. Step 4 uses the same value. This page cannot check or change your Cloudflare configuration.', '这是当前页面的来源地址，不含末尾斜杠，步骤 4 会自动使用同一个值。本页不能检查或修改 Cloudflare 配置。')}</p>
</section>
<section class="card" id="step-2">
<div class="step-heading">
<span class="step-number">02</span>
<div>
<p class="eyebrow">${text('VERIFY THE OWNER', '确认所有者')}</p>
<h2>${text('Create your GitHub OAuth App.', '创建 GitHub OAuth App')}</h2>
</div>
</div>
<ol class="instruction-list">
<li>${text('Open https://api.github.com/users/YOUR_USERNAME, replacing YOUR_USERNAME with your GitHub username. Find the numeric id field and enter it below. Do not use login or node_id.', '打开 https://api.github.com/users/你的用户名，将“你的用户名”替换为 GitHub 用户名。找到数字 id 并填在下方，不要填写 login 或 node_id。')}</li>
<li>${text('In GitHub Settings → Developer settings → OAuth Apps, create an OAuth App owned by you. Use the Worker origin as Homepage URL and this exact Authorization callback URL:', '在 GitHub Settings → Developer settings → OAuth Apps 中创建自己的 OAuth App。Homepage URL 填写 Worker 来源，Authorization callback URL 填写以下完整地址：')}${address('callback-url', 'GitHub callback URL', 'GitHub 回调 URL')}</li>
<li>${text('After creating the App, enter its Client ID below. Generate a Client secret in GitHub, save it privately, and paste it directly into Cloudflare in step 4. GitHub verifies your identity; no repository permission is requested.', '创建后，将 App 的 Client ID 填在下方。在 GitHub 生成 Client secret，私密保存，等到步骤 4 直接粘贴进 Cloudflare。GitHub 只用于验证身份，不申请仓库权限。')}</li>
</ol>
<div class="identity-fields">
<div class="field"><label for="owner-github-id">${text('GitHub numeric ID', 'GitHub 数字 ID')}</label><input id="owner-github-id" type="text" inputmode="numeric" pattern="[0-9]+" autocomplete="off" spellcheck="false" aria-describedby="identity-hint owner-id-error" data-placeholder-en="The id field, e.g. 12345678" data-placeholder-zh="id 字段，例如 12345678" placeholder="The id field, e.g. 12345678"><p id="owner-id-error" class="validation" data-validation="owner-github-id" hidden>${text('Use digits only. Copy the id field, not login or node_id.', '这里只填写数字。请复制 id 字段，不要使用 login 或 node_id。')}</p></div>
<div class="field"><label for="github-client-id">GitHub OAuth App · Client ID</label><input id="github-client-id" type="text" autocomplete="off" spellcheck="false" aria-describedby="identity-hint" data-placeholder-en="Paste the App’s Client ID" data-placeholder-zh="粘贴 App 的 Client ID" placeholder="Paste the App’s Client ID"></div>
</div>
<p id="identity-hint" class="hint">${text('Enter these once. Step 4 updates as you type. They stay only in this page and are cleared on refresh.', '这里只需填一次，步骤 4 会随输入同步更新。内容仅保留在当前页面，刷新后清空。')}</p>
<div class="notice">${text('This page never asks for a Cloudflare API token or GitHub Client secret.', '此页面绝不会要求输入 Cloudflare API token 或 GitHub Client secret。')}</div>
</section>
<section class="card" id="step-3">
<div class="step-heading">
<span class="step-number">03</span>
<div>
<p class="eyebrow">${text('ONE FRESH SET', '生成一组全新凭据')}</p>
<h2>${text('Generate and save your credentials.', '生成并保存私密凭据')}</h2>
</div>
</div>
<p>${text('Confirm this is a new deployment, then click Generate. Save all three values in your private password manager. The encryption key and device registry appear automatically in step 4; the upload token is for your iPhone shortcut.', '确认这是全新部署后，点击“生成凭据”，将生成的三项值存进自己的密码管理器。加密密钥和设备登记会自动同步到步骤 4；上传令牌留给 iPhone 快捷指令使用。')}</p>
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
<section class="card" id="step-4">
<div class="step-heading">
<span class="step-number">04</span>
<div>
<p class="eyebrow">${text('CONFIGURE, THEN DEPLOY', '填写配置，再部署')}</p>
<h2>${text('Copy these values to Cloudflare.', '把这些值复制到 Cloudflare')}</h2>
</div>
</div>
<ol class="instruction-list">
<li>${text('Open your new Worker → Settings → Variables and Secrets → Add.', '打开新 Worker → Settings（设置）→ Variables and Secrets（变量和机密）→ Add（添加）。')}</li>
<li>${text('For each row, choose Text or Secret, enter the exact name on the left, and copy the value on the right. Add all seven settings, then save and deploy.', '逐行选择 Text（文本）或 Secret（机密），名称按左栏填写，值直接从右栏复制。添加完 7 项后，保存并部署。')}</li>
</ol>
<p class="hint">${text('Values stay in sync with this page. Copy works even when a credential is hidden. Client secret is the only value copied directly from GitHub.', '下方值与本页实时同步；凭据无需显示也能复制。只有 Client secret 需要直接从 GitHub 复制。')}</p>
<div class="table-wrap">
<table class="config-table">
<caption class="sr-only">${text('Seven settings for your new Cloudflare Worker', '新 Cloudflare Worker 的七项配置')}</caption>
<thead>
<tr>
<th>${text('Name', '名称')}</th>
<th>${text('Type', '类型')}</th>
<th>${text('Value', '值')}</th>
</tr>
</thead>
<tbody>
<tr>
<th scope="row"><label for="config-origin"><code>PUBLIC_ORIGIN</code></label></th>
<td>${text('Text', '文本')}</td>
<td>${configValue('config-origin', 'Current Worker address', '当前 Worker 地址')}</td>
</tr>
<tr>
<th scope="row"><label for="config-owner-id"><code>OWNER_GITHUB_ID</code></label></th>
<td>${text('Text', '文本')}</td>
<td>${configValue('config-owner-id', 'Enter your numeric ID in step 2', '先在步骤 2 填写数字 ID')}<a class="field-link" href="#owner-github-id">${text('Edit in step 2', '在步骤 2 填写或修改')}</a></td>
</tr>
<tr>
<th scope="row"><label for="config-ingest"><code>ENABLE_INGEST</code></label></th>
<td>${text('Text', '文本')}</td>
<td>${configValue('config-ingest', 'false', 'false')}<p class="hint">${text('Enable only after the connection and subscription in step 6.', '完成步骤 6 中的连接与订阅后，再开启上传。')}</p></td>
</tr>
<tr>
<th scope="row"><label for="config-client-id"><code>GITHUB_CLIENT_ID</code></label></th>
<td>${text('Secret', '机密')}</td>
<td>${configValue('config-client-id', 'Enter the App’s Client ID in step 2', '先在步骤 2 填写 App 的 Client ID')}<a class="field-link" href="#github-client-id">${text('Edit in step 2', '在步骤 2 填写或修改')}</a></td>
</tr>
<tr>
<th scope="row"><code>GITHUB_CLIENT_SECRET</code></th>
<td>${text('Secret', '机密')}</td>
<td><p class="manual-value">${text('Copy the Client secret from GitHub → OAuth App, then paste it directly into Cloudflare.', '从 GitHub → OAuth App 复制 Client secret，直接粘贴到 Cloudflare。')}</p><p class="hint">${text('For your privacy, do not enter it on this page.', '为保护隐私，本页不接收这个值。')}</p></td>
</tr>
<tr>
<th scope="row"><label for="config-seal-key"><code>BRIDGE_SEAL_KEY</code></label></th>
<td>${text('Secret', '机密')}</td>
<td>${configSecret('config-seal-key')}</td>
</tr>
<tr>
<th scope="row"><label for="config-registry"><code>DEVICE_REGISTRY</code></label></th>
<td>${text('Secret', '机密')}</td>
<td>${configSecret('config-registry')}<p class="hint">${text('Copy includes the entire JSON value.', '复制按钮会复制完整 JSON。')}</p></td>
</tr>
</tbody>
</table>
</div>
<p class="hint">${text('For this single-origin setup, leave AUTH_ORIGIN unset. If you intentionally use a separate authorization origin, follow the advanced deployment guide; this page does not configure that arrangement.', '本同源设置应不设置 AUTH_ORIGIN。如果有意使用独立授权来源，请遵循高级部署指南；此页面不配置该模式。')}</p>
<p>${text('Keep ENABLE_INGEST false while configuring your phone and dot. Enable uploads only after completing the connection and subscription in step 6. This switch does not install phone automations.', '配置手机与 dot 期间保持 ENABLE_INGEST 为 false。完成步骤 6 的连接与订阅后再开启上传。这个开关不会安装手机自动化。')}</p>
</section>
<section class="card" id="step-5">
<div class="step-heading">
<span class="step-number">05</span>
<div>
<p class="eyebrow">${text('CHOOSE YOUR PHONE EVENTS', '选择手机事件')}</p>
<h2>${text('Set up your iPhone shortcuts.', '设置 iPhone 快捷指令')}</h2>
</div>
</div>
<p>${text('Start with the Charging template. Enter and save your upload URL and token, but keep automations off. Complete the connection and subscription in step 6 before running a test.', '先从充电模板开始。填写并保存上传地址和令牌，暂时不要开启自动化。完成步骤 6 的连接与订阅后，再运行测试。')}</p>
<p>${text('These choices only show setup guidance. They do not configure the server or narrow OAuth permissions. An authorized dot can read and subscribe to all data available on this Bridge.', '这些选择仅显示搭建说明，不会配置服务器或缩小 OAuth 权限。获授权的 dot 可以读取并订阅此 Bridge 上全部可用数据。')}</p>
<div class="modules">
<label class="module">
<input type="checkbox" data-module="notifications">
<span>
<strong>${text('Notifications', '通知')}</strong>
<span>${text('New notifications from selected apps', '选定 App 的新通知')}</span>
</span>
</label>
<label class="module">
<input type="checkbox" data-module="battery" checked>
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
<strong>${text('Four signed Shortcut templates are available.', '已提供四份签名快捷指令模板。')}</strong>
<a href="https://github.com/zzaachaary/dotlink/releases/tag/v0.1.0" target="_blank" rel="noopener noreferrer">${text('Download templates', '下载模板')}</a> ·
<a href="https://github.com/zzaachaary/dotlink/blob/main/docs/iphone-shortcuts.md" target="_blank" rel="noopener noreferrer">English guide</a> ·
<a href="https://github.com/zzaachaary/dotlink/blob/main/docs/zh-CN/iphone-shortcuts.md" target="_blank" rel="noopener noreferrer">中文指南</a>
${text('Use your own upload URL and device token, bind each trigger, and verify first and repeated runs before enabling daily use.', '填写自己的上传地址和设备令牌，绑定各项触发器，先验证首次和重复运行，再用于日常使用。')}</div>
<div id="guide-notifications" class="module-guide" hidden>
<h3>${text('Notification automation', '通知自动化')}</h3>
<p>${text('Bind a Notification trigger to the imported Notifications template and explicitly choose its source apps. Bind only title/body fields iOS actually provides. Exclude ChatGPT, Codex and Shortcuts to avoid loops. Keep automation off until configured and tested. This cannot read chat history or hidden content.', '为已导入的 Notifications 模板绑定 Notification（通知）触发器，明确选择来源 App，并绑定 iOS 实际提供的标题和正文字段。排除 ChatGPT、Codex 和快捷指令，避免循环。配置和测试完成前保持自动化关闭。此功能不能读取聊天历史或隐藏内容。')}</p>
</div>
<div id="guide-battery" class="module-guide">
<h3>${text('Charging automations', '充电自动化')}</h3>
<p>${text('After the manual test in step 6 passes, bind Charger → Connects or Disconnects to the imported Charging template. Use this one trigger for both changes; do not add duplicate upload actions. The template reads the current battery and charging state. It records changes, not continuous monitoring.', '完成步骤 6 的手动测试后，为已导入的 Charging 模板绑定 Charger（充电器）→ Connects or Disconnects（连接或断开）触发器。用这一条触发器处理两种变化，不要重复添加上传动作。模板会读取当时电量和充电状态，只记录变化，不是连续监控。')}</p>
</div>
<div id="guide-focus" class="module-guide" hidden>
<h3>${text('Focus automations', '专注模式自动化')}</h3>
<p>${text('Import Focus On and Focus Off with the same mode name. Bind that mode’s Is Turned On trigger to On and Is Turned Off to Off. Keep both automations off until configured and tested. The templates already send the event fields; they do not control Focus.', '导入 Focus On 和 Focus Off，填写同一个模式名称。为 On 绑定该模式的 Is Turned On（开启）触发器，为 Off 绑定 Is Turned Off（关闭）。配置和测试完成前保持两项自动化关闭。模板已包含事件上传字段，不会控制专注模式。')}</p>
</div>${address('ingest-url', 'iPhone upload endpoint', 'iPhone 上传地址')}<p class="hint">${text('Keep device_id iphone-primary. Use the iPhone upload token saved in step 3, without Bearer or whitespace; do not use BRIDGE_SEAL_KEY. The templates include the upload action, so no extra uploader is needed. This page does not install shortcuts or send test events.', '保留 device_id iphone-primary，使用步骤 3 已保存的 iPhone 上传令牌，不加 Bearer 或空格，不要误用 BRIDGE_SEAL_KEY。模板已包含上传动作，无需另建上传器。本页不会安装快捷指令或发送测试事件。')}</p>
</section>
<section class="card final-step" id="step-6">
<div class="step-heading">
<span class="step-number">06</span>
<div>
<p class="eyebrow">${text('CONNECT & VERIFY', '连接并验证')}</p>
<h2>${text('Connect your dot and test delivery.', '连接 dot，验证事件送达')}</h2>
</div>
</div>
<p>${text('Copy the complete address below into your supported dot’s MCP connection. Approve the consent screen and sign in with the GitHub account you configured in step 2.', '将下方完整地址复制到支持 MCP 的 dot 连接中。确认授权页，并用步骤 2 配置的 GitHub 账号登录。')}</p>${address('mcp-fresh-url', 'Your MCP address', '你的 MCP 地址')}<ol class="instruction-list"><li>${text('Ask your dot to confirm iphone-primary with phone_devices, subscribe to phone.event for the selected modules, and check the subscription expiry with phone_bridge_status.', '让 dot 用 phone_devices 确认 iphone-primary，订阅所选模块的 phone.event，并用 phone_bridge_status 检查订阅到期时间。')}</li><li>${text('In Cloudflare, change ENABLE_INGEST to true and save and deploy. Run the Charging shortcut manually once, allow its first-use permissions, and verify the result before enabling automation.', '在 Cloudflare 将 ENABLE_INGEST 改为 true，保存并部署。先手动运行一次充电快捷指令，完成首次权限授权，核对结果后再开启自动化。')}</li><li>${text('Test a charger connection and disconnection with your iPhone locked. Confirm that the Bridge recorded each event and your dot processed it.', '在 iPhone 锁屏时分别测试连接和断开充电器，确认 Bridge 记录了每次事件，且 dot 实际处理了事件。')}</li></ol><p class="hint">${text('Use non-private test data. HTTP 202 proves Bridge acceptance; webhook 2xx proves receiver acknowledgment. Neither alone proves dot processing. Offline retry and continuous subscription renewal are not guaranteed.', '使用不含隐私的测试数据。HTTP 202 只证明 Bridge 接收，webhook 2xx 只证明接收端确认，都不能单独证明 dot 已处理。不保证离线重试或持续订阅续期。')}</p>
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
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
  color:#1d1d1f;
  background:#f5f5f7;
  font-synthesis:none;
  line-height:1.65;
  color-scheme:light;
  --accent:#0066cc;
  --muted:#626269;
  --border:#e5e5e9;
  --surface:#f5f5f7}
*{box-sizing:border-box}
body{margin:0}
button,input,textarea{font:inherit}
button,a,input,textarea{touch-action:manipulation}
button{
  cursor:pointer;
  border:1px solid transparent;
  background:var(--surface);
  color:inherit;
  border-radius:10px;
  padding:.6rem 1rem;
  min-height:40px;
  line-height:1.35;
  font-weight:500;
  transition:background-color .18s ease,border-color .18s ease}
button:hover:not(:disabled){background:#e9e9ed}
button:active:not(:disabled){background:#dedee4}
button:disabled{cursor:not-allowed;opacity:.45}
button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible{
  outline:3px solid #0066cc;
  outline-offset:3px}
a{color:var(--accent);text-underline-offset:3px}
[hidden]{display:none!important}
.shell{max-width:1120px;margin:auto;padding:0 40px}
.topbar{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:20px;
  padding:24px 0;
  border-bottom:1px solid var(--border)}
.brand{
  display:flex;align-items:center;gap:10px;
  color:inherit;text-decoration:none;font-size:1.2rem;
  font-weight:650;letter-spacing:-.04em}
.brand-mark{
  display:grid;place-items:center;width:34px;height:34px;
  background:#1d1d1f;color:#fff;border-radius:11px;
  font-weight:650;letter-spacing:-.08em}
.language,.mode{
  display:inline-flex;gap:3px;padding:4px;
  border-radius:13px;background:#eaeaec}
.language button,.mode button{border:0;background:transparent}
.language button{font-size:.8rem;padding:.4rem .75rem;min-height:34px}
.language button[aria-pressed=true],.mode button[aria-pressed=true]{
  background:#fff;color:#1d1d1f;box-shadow:0 1px 4px #1d1d1f0d}
.hero{
  display:grid;grid-template-columns:minmax(0,1fr) 260px;
  gap:64px;align-items:center;padding:64px 0 44px}
.eyebrow{font-size:.76rem;font-weight:550;color:var(--muted);margin:0 0 12px;letter-spacing:.02em}
h1{
  font-size:clamp(2.2rem,4.6vw,3.4rem);font-weight:650;
  line-height:1.16;letter-spacing:-.045em;white-space:pre-line;
  text-wrap:balance;margin:0 0 22px}
:lang(zh-CN) h1{letter-spacing:-.035em;line-height:1.27}
h2{font-size:1.55rem;font-weight:650;line-height:1.35;letter-spacing:-.025em;margin:0;text-wrap:balance}
h3{font-size:1rem;font-weight:600;margin:0 0 8px}
p{margin:14px 0}
.intro{max-width:580px;color:var(--muted);font-size:1rem;line-height:1.8}
.hero-meta{font-size:.78rem;color:var(--muted);margin:22px 0 0}
.hero-note{background:#ebebef;border-radius:20px;padding:24px;font-size:.84rem}
.hero-note strong{display:block;font-weight:600;margin:0 0 8px}
.hero-note p{color:var(--muted);margin:8px 0 18px;line-height:1.75}
.small{font-size:.74rem;line-height:1.6}
.mode{margin:0 0 20px}
.mode button{font-size:.84rem;padding:.65rem 1.2rem}
.steps{display:grid;gap:24px}
.step-nav{display:flex;flex-wrap:wrap;gap:4px 10px;padding:0 0 4px}
.step-nav a{font-size:.79rem;color:var(--muted);text-decoration:none;padding:8px 12px;border-radius:9px}
.step-nav a:hover{background:#eaeaec;color:#1d1d1f}
.card{padding:36px 40px;background:#fff;border:1px solid var(--border);border-radius:22px;min-width:0;scroll-margin-top:24px}
.step-heading{display:flex;align-items:center;gap:16px;margin-bottom:24px}
.step-heading .eyebrow{margin-bottom:4px;font-size:.72rem}
.step-number{
  display:grid;place-items:center;flex:none;width:40px;height:40px;
  border-radius:12px;background:var(--surface);color:var(--muted);
  font-size:.85rem;font-weight:600;font-variant-numeric:tabular-nums}
.card>p,.instruction-list{font-size:.92rem;color:#515157;line-height:1.8;overflow-wrap:anywhere}
.field{margin:22px 0;min-width:0}
.field label,.credential>label{display:block;font-size:.82rem;font-weight:600;margin-bottom:8px}
.value-row{display:flex;gap:8px;align-items:center;min-width:0}
.value-row input{min-width:0;flex:1}
input[type=text],.value-row input,textarea{
  border:1px solid var(--border);border-radius:10px;background:#f9f9fb;
  padding:.7rem .8rem;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
  font-size:.79rem;color:#333338;line-height:1.6;min-width:0}
input::placeholder,textarea::placeholder{color:#77777e;opacity:1}
textarea{width:100%;resize:vertical;overflow-wrap:anywhere}
.identity-fields{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:24px}
.identity-fields .field{margin:0}
.identity-fields input{width:100%}
input[aria-invalid=true]{border-color:#b4412d}
.validation{font-size:.8rem;color:#a73223;margin:8px 0 0}
.notice{
  padding:16px 18px;border:1px solid #eadfc9;background:#fcf8f0;
  border-radius:12px;font-size:.83rem;color:#735329;margin:20px 0}
.notice.subtle{background:#f5f5f7;border-color:var(--border);color:#515157}
.notice strong{display:block;margin-bottom:6px;color:#1d1d1f;font-weight:600}
.instruction-list{padding-left:22px;margin:18px 0}
.instruction-list>li{padding-left:5px;margin:14px 0}
.instruction-list>li::marker{color:#626269;font-weight:600}
.acknowledgment{display:flex;gap:12px;align-items:flex-start;padding:18px;background:var(--surface);border-radius:12px;margin:22px 0;font-size:.89rem}
.acknowledgment input,.module input{accent-color:var(--accent);width:18px;height:18px;flex:none;margin-top:4px}
.primary{background:var(--accent);color:#fff;padding:.8rem 1.15rem}
.primary:hover:not(:disabled){background:#005bb5}
.primary:active:not(:disabled){background:#004d99}
.hint{font-size:.79rem!important;color:var(--muted)!important;line-height:1.7}
.credential{padding:22px 0;border-top:1px solid var(--border)}
.credential .hint{margin:5px 0 12px}
.secret-value{background:var(--surface);border-radius:10px;padding:10px 12px;overflow-wrap:anywhere;min-height:44px}
.secret-value textarea{background:#fff}
.secret-value>[data-mask]{color:#76767d;font-family:monospace;letter-spacing:.12em}
.actions{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
.quiet{font-size:.79rem;flex:none;color:var(--accent)}
.table-wrap{border:1px solid var(--border);border-radius:14px;overflow:hidden;margin:24px 0}
table{width:100%;border-collapse:collapse;font-size:.8rem;text-align:left;table-layout:fixed}
th,td{padding:16px;vertical-align:top;border-bottom:1px solid var(--border)}
thead th{background:var(--surface);color:var(--muted);font-weight:550;font-size:.76rem;padding:12px 16px}
thead th:nth-child(1){width:28%}
thead th:nth-child(2){width:11%}
tbody th{font-weight:500}
tbody tr:last-child td,tbody tr:last-child th{border-bottom:0}
tbody th label{display:block;padding-top:9px}
tbody td:nth-child(2){color:var(--muted);padding-top:25px}
.config-table code{font-size:.78rem;word-break:normal}
.config-table .hint{margin:8px 0 0}
.config-table .value-row{gap:6px}
.config-table .value-row input{width:100%;padding:.6rem .65rem}
.config-table .quiet{padding:.6rem .8rem}
.config-table .manual-value{margin:6px 0 0;line-height:1.8}
.field-link{display:inline-block;font-size:.75rem;margin-top:8px}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.86em;overflow-wrap:anywhere}
.modules{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:24px 0}
.module{display:flex;gap:10px;padding:16px 12px;border:1px solid var(--border);border-radius:12px;cursor:pointer}
.module:has(input:checked){border-color:#8db6df;background:#f3f8fe}
.module strong{display:block;font-size:.85rem;font-weight:600}
.module span span{display:block;font-size:.75rem;color:var(--muted);margin-top:4px}
.module-guide{border-top:1px solid var(--border);padding-top:18px;margin:22px 0;font-size:.9rem}
.module-guide p{color:var(--muted)}
.status:empty{display:none}
.status{
  position:sticky;bottom:16px;width:fit-content;max-width:100%;margin:20px auto 0;
  padding:12px 18px;color:#fff;background:#303035;border-radius:12px;
  font-size:.82rem;box-shadow:0 6px 24px #1d1d1f12}
footer{display:flex;align-items:center;gap:20px;flex-wrap:wrap;color:var(--muted);font-size:.7rem;padding:32px 0}
footer>span{font-weight:600;color:#1d1d1f;font-size:.9rem}
footer p:last-child{margin-left:auto}
.skip{position:absolute;left:16px;top:-80px;background:#fff;padding:10px;z-index:2}
.skip:focus{top:12px}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}
.consent-shell{max-width:700px;padding:35px 24px;margin:auto}
.consent-shell .card{margin-top:32px}
.consent-details{margin:24px 0;overflow-wrap:anywhere}
.consent-details dt{font-size:.78rem;color:var(--muted);margin-top:14px}
.consent-details dd{margin:2px 0}
.consent-shell .actions{flex-wrap:wrap;margin-top:24px}
.consent-shell h1{font-size:2.5rem;margin-top:24px}
.consent-shell .language a{font-size:.8rem;padding:.4rem;text-decoration:none}
.consent-shell .language a[aria-current=true]{font-weight:700}
@media(max-width:760px){
  .shell{padding:0 20px}
  .topbar{padding:20px 0}
  .hero{grid-template-columns:1fr;gap:24px;padding:40px 0 30px}
  .hero-note{padding:20px;border-radius:16px}
  .hero-note p{margin:6px 0 12px}
  .hero-meta{margin-top:18px}
  .card{padding:26px 22px;border-radius:18px}
  h2{font-size:1.3rem}
  .step-heading{gap:12px;align-items:flex-start}
  .step-number{width:34px;height:34px;border-radius:10px;margin-top:3px}
  .identity-fields,.modules{grid-template-columns:1fr}
  .identity-fields{gap:18px}
  .module{padding:16px}
  .module span span{margin-top:0}
  .step-nav{gap:2px 4px}
  .step-nav a{padding:8px 10px}
  .config-table,.config-table tbody{display:block}
  .config-table thead{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
  .config-table tr{display:grid;grid-template-columns:minmax(0,1fr) auto;padding:18px;gap:12px;border-bottom:1px solid var(--border)}
  .config-table tr:last-child{border-bottom:0}
  .config-table th,.config-table td{padding:0;border:0;min-width:0}
  .config-table tbody th label{padding:0}
  .config-table tbody td:nth-child(2){padding:0;font-size:.73rem}
  .config-table tbody td:last-child{grid-column:1/-1}
  .config-table .hint{margin-top:8px}
  .value-row{gap:6px}
  button{min-height:44px}
  .language button{padding:.4rem .6rem;min-height:36px}
  .mode{display:flex}
  .mode button{flex:1;padding:.65rem .8rem}
  .quiet{padding:.65rem .8rem}
  footer{gap:5px 14px}
  footer p{margin:4px 0}
  footer p:last-child{margin-left:0;width:100%}
  .consent-shell{padding:20px 16px}
  .consent-shell .card{padding:24px 20px}
  .consent-shell h1{font-size:2rem}}
@media(max-width:380px){
  .shell{padding:0 14px}
  .card{padding:24px 16px}
  .topbar{gap:10px}
  .brand{font-size:1.05rem;gap:7px}
  .language button{padding:.4rem .45rem}
  .config-table tr{padding:14px}}
@media(prefers-reduced-motion:reduce){
  *{scroll-behavior:auto;transition:none!important}}
`;
