中文 | [English](./CREATE_YOUR_APP_EN.md)

---

# 基于 Starter 创建新应用

本指南是将 Starter 初始化为下游产品时，执行顺序、完成时机、安全边界和验证流程的事实来源。具体默认值、文件位置、secret、权限与产物配置由 README 的[品牌替换清单](../README.md#首次发布前必须完成的品牌替换)维护，本文只链接对应清单组，不复制其细项。

## 阶段 A：开始开发前

### 1. 确定仓库关系

先决定新应用是否继续跟踪 Starter：

- 需要持续合并上游改进时，使用自己的 fork 作为 `origin`，并将 Starter 仓库保留为 `upstream`。
- 需要完全独立的产品仓库时，将 `origin` 指向新仓库，并明确是否保留 `upstream` 仅用于参考。

使用 `git remote -v` 确认推送目标。不要为了去除 Starter 名称而破坏性地重写历史，也不要删除上游许可证声明。

### 2. 建立未定制基线

在仓库根目录安装锁定的工具链和依赖，并在品牌化前运行本地门禁：

```bash
mise run setup
mise run check:feature-docs
mise run check:lockfile
mise run typecheck
mise run lint
mise run test
```

再运行 `mise run dev`，确认系统 WebView 版本能够启动。基线失败时先记录并处理，避免将上游问题与下游改动混在一起。

### 3. 立即完成身份和状态隔离

业务开发开始前，按顺序完成 README 中的以下清单组：

1. [品牌与应用身份](../README.md#品牌与应用身份)：先建立独立应用身份和品牌资源。
2. [包名与本地状态](../README.md#包名与本地状态)：隔离 package scope、数据目录、应用自有环境变量和浏览器持久化 key。
3. [仓库与发布产物](../README.md#仓库与发布产物)：立即替换仓库、更新源和版本等产品归属；发布产物的最终验收可留到阶段 B。
4. [许可证与下游归属](../README.md#许可证与下游归属)：保留上游声明，并按需增加下游归属。

修改 scope、前缀或公开地址前先用 `rg` 找全引用。不要把证书、私钥或真实 secret 写入配置、示例文件或 Git 历史；在更新源完成隔离前，不要分发构建。

### 4. 替换占位外壳

从 `apps/desktop/src/app/page.tsx` 开始替换占位界面。需要原生能力时，继续通过 `apps/desktop/src/shared/rpc.ts` 的类型化 RPC 和 `apps/desktop/src/shared/commands.ts` 的命令层连接，不要从 renderer 直接导入 Bun-only 实现。

功能清单中尚未接入的模块应保持断开，直到产品明确需要它并定义好授权、校验和确认策略；接入状态变化时同步更新中英文功能清单。

### 5. 检查遗留并重跑门禁

完成初始品牌化后搜索 Starter 默认值：

```bash
rg -n 'shallinta|electrobun-app-starter|Electrobun App Starter|ElectrobunAppStarter|com\.shallinta|ELECTROBUN_APP_STARTER'
```

逐条判断命中是必须保留的上游归属，还是未替换的产品配置。随后重跑阶段 A 第 2 步的全部门禁和 `mise run dev`。

## 阶段 B：首次发布前

### 1. 完成可延后的发布配置

首次对外发布前完成以下清单组：

1. [Apple 签名与公证](../README.md#apple-签名与公证)：使用下游组织自己的 Team、证书、公证凭据和仓库 secrets；绝不复用 Starter 维护者的凭据。
2. [系统能力](../README.md#系统能力)：只声明产品实际需要的权限，并在签名应用中验证。
3. [仓库与发布产物](../README.md#仓库与发布产物)：复核更新源、版本、tag、产物名称和发布文案全部属于新产品。

### 2. 按顺序验证发布链路

先重跑本地门禁，再验证无签名打包和 release preflight：

```bash
mise run check:feature-docs
mise run check:lockfile
mise run typecheck
mise run lint
mise run test
mise run pack
mise run release -- --dry-run
```

需要预演本地签名路径时，再运行 `mise run pack:adhoc`。真实发布后，要求 release workflow 的两种架构构建、签名、公证和启动检查全部通过，再从 GitHub Release 验收安装与更新。
