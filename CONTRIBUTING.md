# 贡献与反馈指南

感谢你愿意为本项目贡献代码或反馈问题！请先花一分钟阅读本指南，能大幅减少来回沟通。

## 报告 Bug

请通过 GitHub Issues 提交，并尽量包含以下信息：

1. **环境**：浏览器（Chrome/Firefox/Edge/Safari）、脚本管理器（Tampermonkey/ScriptCat/Violentmonkey）、操作系统
2. **问题页面**：完整的视频页面 URL
3. **复现步骤**：一步步说明怎么触发问题
4. **预期 vs 实际**：你期望发生什么，实际发生了什么
5. **截图**：如果涉及界面/报错，附截图更好
6. **解析源**：如果是解析问题，请说明具体是哪个解析源

## 提交代码（Pull Request）

1. Fork 本仓库
2. 新建分支，命名建议 `fix/xxx`（修复）或 `feat/xxx`（新功能）
3. 修改 `vip-video.user.js`
4. 本地测试通过后再提交
5. 提交 PR，按模板填写说明

## 代码规范

- 保持现有代码风格（4 空格缩进、单引号）
- 一个 PR 只做一件事，不要夹带无关改动
- 改动站点配置（`PLAYER_CONTAINERS`）时，请说明验证过的平台和域名
- 改动媒体压制 / 移动端布局时，请说明测试结果

## 目录说明

- `vip-video.user.js`：脚本本体
- `README.md`：项目说明
- `CONTRIBUTING.md`：贡献指南（本文件）
- `LICENSE`：GPL-3.0 开源协议
- `.github/`：Issue 模板、PR 模板、自动化流程
