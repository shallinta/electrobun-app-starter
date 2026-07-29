中文 | [English](./FEATURES_EN.md)

---

# 功能清单

这份清单区分默认应用外壳已经连接的能力与仅提供实现、仍需下游产品主动接入的能力。源码存在不代表该能力已经出现在界面、注册到 RPC 或菜单、打进发行包，或完成产品级安全决策。

## 已接入 app 外壳

<!-- feature: lifecycle-environment -->

### 应用生命周期与环境加载

- **功能：** 在 GUI 启动时先加载登录 shell 环境，再创建进程级服务、窗口、RPC、更新器与退出清理。
- **使用场景：** 桌面应用需要稳定的启动顺序和可等待的关闭流程。
- **外壳状态：** 已接入默认 Bun 主进程。
- **接入方式：** 在 composition root 中构造新服务并显式注入依赖；保留环境加载先于动态 import 的顺序，并把需要落盘或释放的资源加入 `stop()`。
- **代码位置：** `apps/desktop/src/bun/index.ts`、`apps/desktop/src/bun/env/hydrate.ts`、`apps/desktop/src/bun/app/start-desktop-app.ts`

<!-- feature: window-state -->

### 原生窗口与持久化状态

- **功能：** 创建原生主窗口，并串行持久化窗口位置、尺寸、最大化、全屏与缩放状态。
- **使用场景：** 用户重启应用后恢复上次桌面布局。
- **外壳状态：** 已接入，关闭时会等待未完成的状态写入。
- **接入方式：** 通过 `createMainWindow` 扩展窗口配置；新增原生状态时在 Bun 侧完成采集、校验和持久化，渲染进程不要直接访问状态文件。
- **代码位置：** `apps/desktop/src/bun/app/window.ts`、`apps/desktop/src/bun/app/window-state.ts`、`packages/shared/src/server/window-state.ts`

<!-- feature: typed-rpc -->

### 类型化 RPC

- **功能：** 以一份共享 TypeScript 契约连接可信 Bun 主进程与 WebView 渲染进程。
- **使用场景：** 渲染界面需要请求原生能力或接收主进程状态变化。
- **外壳状态：** 已接入更新、命令、全屏状态以及 `getLocale`、`setLocale`、`localeChanged` 国际化同步。
- **接入方式：** 先在共享 schema 中声明 request 或 message，再在 Bun handler 与渲染端调用处分别实现；敏感参数仍须在 Bun 边界校验。
- **代码位置：** `apps/desktop/src/shared/rpc.ts`、`apps/desktop/src/bun/rpc/index.ts`、`apps/desktop/src/lib/electrobun.ts`

<!-- feature: command-routing -->

### 跨运行时命令路由

- **功能：** 用带目标元数据的统一 `Command` 表达菜单、命令面板和渲染控件触发的用户动作。
- **使用场景：** 同一个动作需要从多个入口触发，或需要跨 WebView 与 Bun 边界执行。
- **外壳状态：** 已接入设置、侧栏、窗口、链接与更新命令。
- **接入方式：** 在共享 union 与 `COMMAND_META` 注册命令目标，按目标在渲染 registry 或 Bun executor 实现，并在双语 `commands` catalog 增加显示名；同一渲染命令同一时间只应由当前界面所有者注册。
- **代码位置：** `apps/desktop/src/shared/commands.ts`、`apps/desktop/src/commands/index.tsx`、`apps/desktop/src/bun/commands.ts`

<!-- feature: native-menus -->

### 原生菜单与命令面板

- **功能：** 提供可随 locale 重建的 macOS 应用菜单、快捷键和可搜索命令面板，并统一转发到命令层。
- **使用场景：** 用户通过系统菜单、键盘或应用内面板执行相同行为。
- **外壳状态：** 已接入设置、侧栏、缩放、重载、更新与帮助链接；文件菜单占位项保持禁用。
- **接入方式：** 给新菜单项分配稳定 action 并映射到已有命令；仅将适合无上下文执行的命令暴露到命令面板。
- **代码位置：** `apps/desktop/src/bun/app/menu.ts`、`apps/desktop/src/components/command-palette.tsx`、`apps/desktop/src/shared/commands.ts`

<!-- feature: sidebar-shell -->

### 可折叠侧栏外壳

- **功能：** 提供可拖拽调整、可折叠并持久化像素宽度的左侧导航区域。
- **使用场景：** 下游产品需要文件树、导航或工作区列表。
- **外壳状态：** 已接入布局、`View > Toggle Sidebar` 和 `Command+B`，内容仍是占位符。
- **接入方式：** 在现有侧栏 panel 中替换占位内容；继续使用共享存储键和尺寸校验，不要在折叠到 `0px` 时覆盖已记住宽度。
- **代码位置：** `apps/desktop/src/app/page.tsx`、`apps/desktop/src/lib/sidebar-size.ts`、`packages/ui/src/lib/local-storage.ts`

<!-- feature: theme-preferences -->

### 主题与主色偏好

- **功能：** 支持浅色、深色、跟随系统和自定义主色，并在安全封装的 localStorage 中保存偏好。
- **使用场景：** 用户希望桌面界面跟随系统外观或产品品牌色。
- **外壳状态：** 已接入应用根节点、启动前防闪烁脚本和设置页。
- **接入方式：** 通过 `useTheme` 与 `usePrimaryColor` 消费；新增持久化 UI 键时由 `LOCAL_STORAGE_KEYS` registry 统一所有权，并同步启动前脚本中无法 import 的镜像字面量。
- **代码位置：** `packages/ui/src/components/theme-provider.tsx`、`packages/ui/src/lib/local-storage.ts`、`apps/desktop/src/mainview/index.html`

<!-- feature: settings-shell -->

### 设置外壳

- **功能：** 提供延迟加载的设置对话框、General/About 标签页、语言、主题主色、更新模式和版本展示。
- **使用场景：** 下游产品需要集中承载用户偏好和应用信息。
- **外壳状态：** 已接入原生菜单、命令面板和渲染命令。
- **接入方式：** 为新设置增加独立页面或 section，并将原生读写放到类型化 RPC 后；同步扩展 `SettingsTab` 与菜单入口时保持命令路由一致。
- **代码位置：** `apps/desktop/src/components/settings/`、`apps/desktop/src/app/page.tsx`、`apps/desktop/src/shared/commands.ts`

<!-- feature: localization -->

### 双语国际化

- **功能：** 使用 i18next 在 Bun 主进程与 React renderer 共享 `en-US`、`zh-CN` 的 `common`、`settings`、`menu`、`commands`、`updates` JSON namespace，支持不重启应用切换界面、原生菜单和更新提示语言。
- **使用场景：** 下游产品需要随系统语言首启，并允许用户在设置中显式选择英文或简体中文。
- **外壳状态：** 已接入设置页、主要壳页面、命令面板、更新界面和全部原生菜单项；Bun 是 locale 唯一数据源，首次将中文系统 locale 映射为 `zh-CN`、其余映射为 `en-US`，持久化到应用数据目录的 `settings/locale.json`，并通过 `getLocale`、`setLocale`、`localeChanged` 类型化 RPC 同步 renderer。
- **接入方式：** 在两套语言目录的相同 namespace 中同步增加相同 key，并通过 React `useTranslation` 或 Bun `translate` 消费；renderer 初始化会同步文档 `lang`/`dir`，Bun 会重建原生菜单，启动初始化失败页使用中英双语 fallback；修改品牌或文案后运行严格 key 类型检查和 locale parity 测试。
- **代码位置：** `apps/desktop/src/shared/i18n/`、`apps/desktop/src/bun/i18n/`、`apps/desktop/src/lib/renderer-i18n.ts`、`apps/desktop/src/hooks/use-locale.ts`、`apps/desktop/src/mainview/main.tsx`、`apps/desktop/src/shared/rpc.ts`

<!-- feature: external-url-security -->

### 外部 URL 安全边界

- **功能：** 将外部链接交给系统浏览器，并在 Bun 侧只允许可解析的 HTTP(S) URL。
- **使用场景：** 帮助菜单打开文档、主页或仓库，而不让 WebView 导航到不受信任协议。
- **外壳状态：** 已通过帮助菜单的 `openLink` 命令接入。
- **接入方式：** 所有新外链都走 `openLink`，不要直接从渲染进程调用原生 API；如需放宽协议必须先定义明确 allowlist 与威胁模型。
- **代码位置：** `apps/desktop/src/bun/parse-external-url.ts`、`apps/desktop/src/bun/commands.ts`、`apps/desktop/src/bun/app/menu.ts`

<!-- feature: fullscreen-runtime -->

### 全屏与窗口运行时状态

- **功能：** 在 RPC 中提供初始全屏查询与去重变更消息，并提供最大化命令和渲染端订阅 hook。
- **使用场景：** 自定义标题栏或沉浸式布局需要跟随原生窗口状态。
- **外壳状态：** 底层运行时已接通；系统全屏菜单可用，但 `useFullScreen` 尚未挂载，外壳没有自定义标题栏或最大化按钮。
- **接入方式：** 可选 UI 挂载 `useFullScreen` 并通过命令层执行 `toggleMaximized`；保持系统窗口状态为来源，避免在渲染层复制状态机。
- **代码位置：** `apps/desktop/src/hooks/use-full-screen.ts`、`apps/desktop/src/lib/full-screen-store.ts`、`apps/desktop/src/bun/app/window-state.ts`

<!-- feature: updates -->

### 自动更新与更新界面

- **功能：** 支持自动、手动和关闭更新模式，完成检查、下载、重启应用与状态提示。
- **使用场景：** 已发布的 macOS 应用从版本化 feed 安全获取新版本。
- **外壳状态：** 已接入 Bun 服务、RPC、菜单、设置页、状态指示器和更新对话框；开发 channel 不启动后台检查。
- **接入方式：** 更换品牌时配置自有 HTTPS feed、签名与公证凭据；保留检查去重、timer 清理、apply 失败恢复和更新模式语义。
- **代码位置：** `apps/desktop/src/bun/updates/`、`apps/desktop/src/components/update-status-provider.tsx`、`apps/desktop/electrobun.config.ts`

<!-- feature: cef-cdp-development -->

### CEF/CDP 开发诊断

- **功能：** 通过显式开发命令临时选择 CEF，并仅在本机 `127.0.0.1` 开放校验后的 CDP 端口。
- **使用场景：** 开发期间需要 Chromium DevTools Protocol 诊断 renderer。
- **外壳状态：** 已接入项目开发工具 `mise run dev:cef`；它不是产品功能，也不属于默认 `dev` 或任何 canary/stable 发行版。
- **接入方式：** 仅在本地诊断时运行该任务，并用系统 WebView 完成最终验证；正式构建脚本会强制选择 system renderer 并清空 CDP port。
- **代码位置：** `apps/desktop/src/config/renderer.ts`、`apps/desktop/electrobun.config.ts`、`apps/desktop/package.json`

<!-- feature: engineering-gates -->

### 工程质量门禁

- **功能：** 锁定 mise/Bun 工具链，并统一运行测试、零 warning lint、TypeScript、Vite 构建和锁文件镜像检查。
- **使用场景：** 本地与 CI 在合并前发现跨 workspace 的回归和构建问题。
- **外壳状态：** 已接入根脚本、mise task 与 GitHub Actions。
- **接入方式：** 新的人类可执行工作流同时加入 `package.json` 与 `mise.toml`；新增能力应补 focused test，并在提交前运行完整门禁。
- **代码位置：** `package.json`、`mise.toml`、`.github/workflows/ci.yml`

<!-- feature: release-pipeline -->

### 打包与发布流水线

- **功能：** 为 arm64/x64 构建、签名、公证、生成更新 feed，并以版本提交和 tag 原子发布 stable 或 canary。
- **使用场景：** 下游产品需要可重复、可校验的 macOS 交付流程。
- **外壳状态：** 已接入本地打包任务、release preflight 与 GitHub release workflow。
- **接入方式：** 首次发布前完成 bundle ID、图标、证书、App Store Connect、仓库 URL 和 feed 品牌替换；不要绕过 preflight 或单独推送 release tag。
- **代码位置：** `scripts/release.ts`、`.github/workflows/release.yml`、`apps/desktop/electrobun.config.ts`

## 未接入 / 未来可选

<!-- feature: confirm-dialog-cancel -->

### ConfirmDialog 显式取消

- **功能：** 提供可复用确认对话框，并允许 Cancel 按钮把关闭控制权交给调用方。
- **使用场景：** 不可逆操作需要确认，或取消动作本身需要执行恢复逻辑。
- **外壳状态：** 组件和取消策略已有测试，但默认应用当前没有消费者。
- **接入方式：** 在产品功能中以受控 `open` 状态挂载；`onCancel` 存在时调用方必须自行关闭，Escape/点击外部仍走 `onOpenChange`，破坏性操作只在 `onConfirm` 后执行。
- **代码位置：** `packages/ui/src/components/confirm-dialog.tsx`、`packages/ui/src/components/confirm-dialog.test.ts`

<!-- feature: native-files -->

### 原生文件操作

- **功能：** 提供文件/目录选择、打开、定位和移到系统废纸篓的 Bun-only 实现。
- **使用场景：** 下游产品明确需要用户选择文件或在 Finder 中操作已授权路径。
- **外壳状态：** 实现与测试存在，但没有 RPC、命令、菜单或 renderer 接入，默认外壳无法调用。
- **接入方式：** 选择器通过类型化 RPC 返回结果，打开/定位通过 Bun 命令或 request 暴露；必须校验绝对路径和产品 allowlist，移到废纸篓前使用确认对话框，禁止直接增加任意路径读写 RPC。
- **代码位置：** `apps/desktop/src/bun/native-files/index.ts`、`apps/desktop/src/bun/native-files/commands.ts`

<!-- feature: desktop-safe-link -->

### 桌面安全 Link

- **功能：** 共享 `Link` 保留真实 anchor 语义并注入外部打开回调，桌面 `ExternalLink` adapter 将点击路由到现有 `openLink` 安全边界。
- **使用场景：** About、帮助、Markdown 或文档界面展示可复制、可辅助访问的外链。
- **外壳状态：** 组件与 adapter 已实现，但 `ExternalLink` 当前没有 renderer 消费者。
- **接入方式：** 在 `CommandProvider` 下的产品界面导入 `ExternalLink`；保持 URL 经过 Bun 侧 HTTP(S) allowlist，不要使用普通 anchor 触发 WebView 页面跳转。
- **代码位置：** `packages/ui/src/components/link.tsx`、`apps/desktop/src/components/external-link.tsx`、`apps/desktop/src/bun/parse-external-url.ts`

<!-- feature: custom-titlebar-window-state -->

### 自定义标题栏窗口状态

- **功能：** 利用已接通的全屏订阅和最大化命令构建产品自有标题栏或窗口控件。
- **使用场景：** 产品需要在全屏时隐藏工具栏，或提供自定义最大化按钮。
- **外壳状态：** 底层能力可用，但 hook 未挂载，默认外壳没有自定义标题栏 UI。
- **接入方式：** 在实际标题栏组件中订阅 `useFullScreen`，通过 `useCommands` 执行 `toggleMaximized`，同时保留原生交通灯可操作区域、键盘菜单和系统状态为唯一来源。
- **代码位置：** `apps/desktop/src/hooks/use-full-screen.ts`、`apps/desktop/src/shared/commands.ts`、`apps/desktop/src/bun/app/window.ts`

<!-- feature: deep-link-template -->

### Deep link 模板

- **功能：** 提供严格 scheme/host/path 校验、有限冷启动队列、延迟 handler 和可清理事件监听。
- **使用场景：** 下游产品需要从自有 URL scheme 打开明确的内部目标。
- **外壳状态：** 模板与测试存在，但默认配置没有 `urlSchemes`，Bun entry 没有 import 或注册监听，也没有占位 scheme。
- **接入方式：** 选择应用自有 scheme 并写入 Electrobun 配置，环境加载后尽早注册 capture，在 composition root 注入校验后的 handler，再通过类型化 command/RPC 驱动可见效果；限制 host/path、长度和队列容量。
- **代码位置：** `apps/desktop/src/bun/deep-link/index.ts`、`apps/desktop/electrobun.config.ts`、`apps/desktop/src/bun/index.ts`
