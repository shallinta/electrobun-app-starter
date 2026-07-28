中文 | [English](./README_EN.md)

---

# Electrobun App Starter

一个面向生产工程的原生 macOS 桌面应用脚手架，技术栈包括
[Electrobun](https://electrobun.dev)、React、TypeScript、Bun、Tailwind CSS
和 shadcn/ui。

仓库提供可复用的应用外壳，让你可以直接开始开发自己的产品，而不必重复搭建桌面基础设施。脚手架有意不包含具体业务逻辑、托管 Web
应用、遥测、代理设置或内嵌 Chromium 版本。

<!-- i18n: included -->

## 已包含

- Electrobun Bun 主进程和由 Vite 驱动的 React 渲染进程。
- 两个运行时上下文之间的类型安全 RPC 边界和命令路由。
- 原生窗口与菜单管理、窗口状态持久化、可折叠侧栏，以及安全的外部链接处理。
- 全屏状态 RPC、渲染端订阅基础和最大化命令；自定义标题栏 UI 由下游应用按需挂载。
- 主题、主色、软件更新和关于设置。
- 自动更新基础设施，以及面向 Apple Silicon 和 Intel 的 macOS 发布工作流。
- 可选的本地 CEF/CDP 诊断命令；默认开发和所有发行构建仍使用系统 WebView。
- 基于 Tailwind CSS 和 shadcn/ui primitives 的共享 UI 包。
- Bun 测试、TypeScript 检查、ESLint、Prettier、Husky 和 GitHub Actions。

<!-- i18n: feature-catalog -->

## 功能清单

[中文功能清单](./docs/FEATURES.md)区分默认应用外壳已经连接的能力与需要下游产品主动接入的可选模块，并在清单顶部提供英文切换。源码存在不等于该能力已经默认启用、打包、注册或发布；例如原生文件操作和 deep link 模板默认保持断开。

<!-- i18n: requirements -->

## 环境要求

- macOS
- 推荐安装 [mise](https://mise.jdx.dev)
- 不使用 mise 时需要安装 [Bun](https://bun.com)

<!-- i18n: getting-started -->

## 快速开始

克隆仓库后，安装锁定版本的工具链和依赖：

```bash
mise run setup
```

通过 Vite HMR 启动桌面应用：

```bash
mise run dev
```

React 渲染进程的改动会通过 HMR 更新。修改 Bun 主进程代码后，需要重启该命令。

<!-- i18n: common-commands -->

## 常用命令

| 任务               | 命令                          |
| ------------------ | ----------------------------- |
| 查看全部任务       | `mise tasks ls`               |
| 安装依赖           | `bun install`                 |
| 启动桌面应用       | `mise run dev`                |
| 使用 CEF/CDP 诊断  | `mise run dev:cef`            |
| 运行测试           | `mise run test`               |
| 检查双语功能清单   | `mise run check:feature-docs` |
| 运行 lint          | `mise run lint`               |
| 运行类型检查       | `mise run typecheck`          |
| 构建 canary 安装包 | `mise run build:canary`       |
| 构建 stable 安装包 | `mise run build:stable`       |
| 执行无签名打包检查 | `mise run pack`               |

本仓库统一使用 Bun 管理依赖和运行脚本，不要使用 npm、pnpm 或 Yarn。

<!-- i18n: project-layout -->

## 项目结构与运行时边界

```text
apps/
  desktop/        Electrobun 应用：Bun 主进程和 React 渲染进程
packages/
  shared/         与框架无关的文件系统和窗口状态工具
  ui/             共享 React 组件、设计 token 和 UI primitives
scripts/
  release.ts      版本、tag 和发布推送流程
```

Bun 主进程负责原生能力。渲染进程通过
`apps/desktop/src/shared/rpc.ts` 中的类型化 RPC 契约请求这些能力，不应直接导入仅限
Bun 的模块。跨运行时用户操作统一使用
`apps/desktop/src/shared/commands.ts` 中定义的命令。

<!-- i18n: customize -->

## 定制脚手架

主要产品区域位于 `apps/desktop/src/app/page.tsx`。可以用自己的应用界面替换其中的占位内容，并通过现有
RPC 和命令边界扩展原生能力。

### 首次发布前必须完成的品牌替换

以新品牌发布下游应用前，请完成所有适用项目。当前值是脚手架默认值，不是你的产品可直接使用的生产配置。

<!-- i18n: rebrand.brand-identity -->

#### 品牌与应用身份

- [ ] 替换 `apps/desktop/icon.iconset` 中的全部 PNG。保留现有 macOS
      iconset 文件名和尺寸，并确认
      `apps/desktop/electrobun.config.ts` 中的
      `build.mac.icons: "icon.iconset"` 仍然指向该目录。
- [ ] 修改 `apps/desktop/electrobun.config.ts` 中的应用名称（`app.name`，当前为
      `Electrobun App Starter`），并同步替换
      `apps/desktop/src/mainview/index.html`、
      `apps/desktop/src/app/page.tsx`、
      `apps/desktop/src/components/settings/settings-dialog.tsx`、
      `apps/desktop/src/bun/app/window.ts` 和
      `apps/desktop/src/bun/app/menu.ts` 中所有用户可见文本。
- [ ] 在 `apps/desktop/electrobun.config.ts` 中设置归属于你所在组织的 bundle
      identifier（`app.identifier`，当前为
      `com.shallinta.electrobun-app-starter`）。发布后应将其视为永久标识，因为已安装应用和更新器状态都依赖它识别应用。

<!-- i18n: rebrand.packages-local-state -->

#### 包名与本地状态

- [ ] 重命名根 workspace 包（`package.json` 中的 `name`），以及各自
      `package.json` 中的 `@shallinta/desktop`、`@shallinta/shared` 和
      `@shallinta/ui`。如果修改 `@shallinta` scope，请同步更新 `apps/` 和
      `packages/` 下的全部 import 和依赖，然后运行 `bun install`，确保
      `bun.lock` 与重命名后的 workspace 包一致。
- [ ] 在 `packages/shared/src/server/paths.ts` 中为产品设置独立的数据目录和覆盖变量（当前为
      `~/.electrobun-app-starter` 和
      `ELECTROBUN_APP_STARTER_HOME`）。同步更新相关测试、`.gitignore`、
      `eslint.config.js` 中的 `.electrobun-app-starter/**` ignore，以及
      `AGENTS.md` 和两份 README 中的路径引用。
- [ ] 重命名应用自有的 `ELECTROBUN_APP_STARTER_*` 环境变量前缀，包括
      `apps/desktop/electrobun.config.ts`、
      `apps/desktop/src/bun/env/hydrate.ts`、
      `apps/desktop/scripts/serve-feed.ts`、
      `packages/shared/src/server/paths.ts`、`mise.toml` 和相关测试中的所有引用。除非
      Electrobun 接口本身发生变化，否则不要修改 Electrobun 自有的
      `ELECTROBUN_DEVELOPER_ID` 或 `ELECTROBUN_APPLEAPI*` 变量。这个应用前缀也覆盖仅用于开发和构建选择的
      `ELECTROBUN_APP_STARTER_DESKTOP_RENDERER` 与
      `ELECTROBUN_APP_STARTER_CDP_PORT`。
- [ ] 为新产品隔离浏览器持久化数据。在
      `packages/ui/src/components/theme-provider.tsx` 和
      `apps/desktop/src/mainview/index.html` 的 React 启动前脚本中，同时替换
      `electrobun-app-starter-theme` 和
      `electrobun-app-starter-primary`。

<!-- i18n: rebrand.repository-artifacts -->

#### 仓库与发布产物

- [ ] 选择公开产物前缀和 DMG 文件名。Electrobun 会根据 `app.name` 生成中间产物名称；版本化发布会在
      `.github/workflows/release.yml` 中通过
      `rename_dmgs artifacts/regular ElectrobunAppStarter`
      重命名安装包。请替换该前缀、示例文件名，以及同一工作流中的发布安装说明。
- [ ] 替换 GitHub owner/repository 和产品链接。固定 URL 位于
      `apps/desktop/electrobun.config.ts`（`RELEASE_DOWNLOADS` 和
      `updates` feed）、`apps/desktop/src/bun/app/menu.ts`（`DOCS_URL`、
      `HOMEPAGE_URL` 和 `REPOSITORY_URL`）、
      `apps/desktop/src/components/update-status-provider.tsx`（`RELEASE_TAG_URL`），以及
      `scripts/release.ts`（release Actions URL）。按需同步更新 README 中的产品链接。发布工作流使用
      GitHub 的 `GITHUB_REPOSITORY` 生成仓库相关的 release 和 changelog
      链接，因此还需验证它能在新仓库中正确运行。
- [ ] 在 `apps/desktop/package.json` 中设置预期的首个版本，并在
      `CHANGELOG.md` 中添加对应的 `## [x.y.z]` 章节。`.versionrc.json` 和
      `scripts/release.ts` 会更新该 package；`.github/workflows/release.yml`
      要求 tag `v{x.y.z}` 与其匹配，并使用相应的 changelog 章节作为 release notes。

<!-- i18n: rebrand.apple-release -->

#### Apple 签名与公证

- [ ] 为你自己的 Apple Developer team 配置 **Developer ID Application**
      证书并确认 Team ID。将证书连同对应的**私钥**导出为受密码保护的 `.p12`，以
      Base64 编码保存到 GitHub Actions secret `MACOS_CERTIFICATE_P12`，并将密码保存到
      `MACOS_CERTIFICATE_PWD`。`.github/workflows/release.yml` 会导入该
      `.p12`、提取签名 identity 并导出
      `ELECTROBUN_DEVELOPER_ID`；当前工作流没有单独的 Team ID 配置项。
- [ ] 为同一组织创建 App Store Connect 公证凭据，并配置
      `.github/workflows/release.yml` 使用的 GitHub Actions secrets：
      `ASC_API_KEY_P8`、`ASC_API_KEY_ID` 和
      `ASC_API_ISSUER_ID`。执行签名构建，并确认工作流中的 `codesign`、`spctl`
      和 `stapler` 检查全部通过。

不要复用脚手架维护者的证书、Team ID、私钥、App Store Connect key 或 GitHub
secrets。本仓库不包含签名私钥；每个下游发布者都必须自行配置并妥善保护这些资源。

<!-- i18n: rebrand.system-capabilities -->

#### 系统能力

- [ ] 如果下游应用需要访问受保护的 macOS 资源或额外能力，请在
      `apps/desktop/electrobun.config.ts` 的
      `build.mac.entitlements` 中添加所需条目。对于 Electrobun 会映射为
      `NS*UsageDescription` key 的 entitlement，请使用准确、面向用户的用途说明作为
      entitlement 值，并在签名应用中验证 entitlements 和生成的
      `Info.plist`。本脚手架不包含产品特定权限，请根据下游产品实际需求选择，不要直接照搬。

<!-- i18n: rebrand.license-attribution -->

#### 许可证与下游归属

- [ ] 添加下游项目版权归属时，保留 `LICENSE` 中的上游版权声明。

替换默认值后，请在首次发布前搜索是否仍有遗留品牌信息：

```bash
rg -n 'shallinta|electrobun-app-starter|Electrobun App Starter|ElectrobunAppStarter|com\.shallinta|ELECTROBUN_APP_STARTER'
```

<!-- i18n: releases -->

## 发布

应用版本以 `apps/desktop/package.json` 为准。发布命令会执行前置检查、创建版本提交和
tag，然后进行原子推送：

```bash
mise run release
mise run release:canary
```

使用 `mise run release -- --dry-run` 预览发布。架构、发布和贡献约定详见
[AGENTS.md](./AGENTS.md)。

<!-- i18n: license -->

## 许可证

Electrobun App Starter 基于 [MIT License](./LICENSE) 发布。
