<div align="center">

<img src="https://scriptcat.org/api/v2/resource/image/99FygmVywJp1O0gn
" width="120" alt="M3U8 广告过滤器" />

# 自嘲熊帮你清广告 - 404小岛

**拦截 m3u8 播放列表，删除插播广告片段 —— 6 种删除策略 + 2 种修复**

[![Version](https://img.shields.io/badge/version-1.0.1-3fd9b8?style=flat)](#)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-1f6feb.svg)](https://github.com/whyyy-404/video_freevip/blob/main/LICENSE)
[![脚本猫](https://img.shields.io/badge/%E8%84%9A%E6%9C%AC%E7%8C%AB-%E7%82%B9%E5%87%BB%E5%AE%89%E8%A3%85-3fd9b8?style=flat)](https://scriptcat.org/zh-CN/script-show-page/9073)
[![Greasy Fork](https://img.shields.io/badge/Greasy%20Fork-%E7%82%B9%E5%87%BB%E5%AE%89%E8%A3%85-ffa64d?style=flat)](https://greasyfork.org/zh-CN/scripts/605297)


[两种用法](#-两种用法) · [6 种策略](#-6-种删除策略) · [调试](#-调试) · [主项目](https://github.com/whyyy-404/video_freevip/blob/main/README.md)

</div>

***

## 📖 它做什么

采集站 / 影视站的 m3u8 播放列表里常插播广告（5~30 秒短片段，路径与正片不同）。
直接播放会看到广告。

本脚本劫持页面的 **XHR / fetch**，在播放器拿到数据之前把广告片段删掉，
播放器读到的是干净列表 —— 播放无缝，用户无感。

### 访客人数：
<img src="https://count.getloli.com/@M3U8广告过滤器?theme=rule34" alt="如果您无法看到此内容，请刷新页面。">

---

## 🔧 两种用法

| 用法 | 生效范围 | 怎么装 |
| --- | --- | --- |
| **主脚本内嵌** | 只在「采集源播放」时生效 | 装 [vip-video.user.js](https://github.com/whyyy-404/video_freevip/blob/main/vip-video.user.js) 即可，不用额外装 |
| **独立安装** | 所有页面和 iframe 都生效，**包括解析接口** | [脚本猫](https://scriptcat.org/zh-CN/script-show-page/9073) / [Greasy Fork](https://greasyfork.org/zh-CN/scripts/605297) / [GitHub 直装](https://github.com/whyyy-404/video_freevip/raw/main/M3u8Filter.user.js) |

### 为什么主脚本管不到解析接口？

```
解析接口的播放器在【第三方跨域 iframe】里：
  <iframe src="https://bfq.txnp.cn/player?url=...">
  ⇒ 主脚本无法向跨域 iframe 注入脚本
  ⇒ 内嵌的过滤器只能在主脚本自己创建的 iframe 里生效
```

**而本脚本 `@match *://*/*` 且没有 `@noframes`，脚本管理器会自动把它注入到每个 iframe。**

**⇒ 所以单独装一遍，解析接口的广告也能过滤。**

### 会重复过滤吗？

不会。脚本开头有防重复标记：

```js
if (window.__M3U8F_LOADED__) return;
window.__M3U8F_LOADED__ = true;
```

每个页面 / iframe 只会执行一次，先加载的赢，后加载的直接退出。

---

## 🎯 6 种删除策略

| # | 策略 | 原理 | 触发条件 |
| --- | --- | --- | --- |
| ① | **标记型** | 删除 `# ppvod-ad-injected` 之后紧跟的整段广告 | 有广告标记 |
| ② | **占比型** | 按路径前缀分组，占比 < 34% 的视为广告 | 带 4 道保险 |
| ③ | **不连续段型** | 夹在两处 `DISCONTINUITY` 之间的整秒短片段 | 默认关闭 |
| ④ | **双路径型** | 只有两条路径时，总时长短的那条视为广告 | 时长比 ≥ 3 倍 |
| ⑤ | **时长众数型** | 与正片时长众数不符的片段 | 众数占比 ≥ 95% |
| ⑥ | **URL 长度众数型** | 与正片地址长度众数不符的片段 | 众数占比 ≥ 78.9% |

### ① 标记型

```m3u8
# ppvod-ad-injected v1        ← 广告标记
#EXT-X-DISCONTINUITY
#EXTINF:4,
/ad/xxx.ts
...
#EXT-X-DISCONTINUITY          ← 广告段结束
#EXTINF:4,
/正片/xxx.ts
```

**⇒ 从标记行到下一个「后面跟着 `#EXTINF` 的 `DISCONTINUITY`」全部删除。**

### ② 占比型

```
正片：/20261003/84_9109598f/  → 713 个片段（96.2%）
广告：/ad/20261003/            →  28 个片段（ 3.8%）
⇒ 删除占比 < 34% 的路径
```

**四道保险：**
1. 最多路径占比必须 > 66%
2. 路径种类数 < 片段总数 × 66%
3. 要删的片段数 ≤ 要留的片段数
4. 白名单里的路径跳过

### ③ 不连续段型（默认关闭）

**⇒ 连续 5 个以上、时长都是整数秒（2~6s）、且夹在两处 `DISCONTINUITY` 之间。**

**⇒ 因为有些正片也符合这个特征，所以默认关闭。**

### ④ 双路径型

```
路径 A：1200s（正片）
路径 B：  60s（广告）
⇒ 时长比 20 倍 ≥ 3 倍 ⇒ 删除 B
```

**⇒ 只在恰好 2 条路径时生效，3 条以上交给策略 ②。**

### ⑤ 时长众数型

```
正片：4.000000s × 950 个
广告：3.000000s × 12 个、1.760000s × 5 个
⇒ 众数占比 98.2% ≥ 95% ⇒ 删除非众数片段
```

**⇒ 首尾片段永不删（防止误删片头片尾）。**

### ⑥ URL 长度众数型

```
正片：/xxx/b8143e816b8000001.ts（长度 26）
广告：/ad/20261003/hd/xxx.m3u8.ts（长度 34）
⇒ 众数占比 92.4% ≥ 78.9% ⇒ 删除非众数长度的片段
```

---

## 🔨 2 种修复

| # | 修复 | 作用 |
| --- | --- | --- |
| ⑦ | **孤儿行修复** | 删除广告后残留的孤立 `#EXTINF`（没有对应地址行） |
| ⑧ | **元数据修正** | 重算 `#EXT-X-TARGETDURATION`、补 `#EXT-X-ENDLIST` |

**⇒ 这两步默认开启，防止删除后播放器卡顿 / 跳片。**

---

## ⚠️ 限制

**⇒ 只能拦截 JS 发起的请求（XHR / fetch）。**

```
✅ 播放器用 hls.js / video.js / Artplayer → 走 XHR/fetch → 能拦
❌ 直接打开 .m3u8 链接 → 浏览器原生 HLS → 走网络层 → 拦不到
```

**⇒ 所以：**

| 场景 | 能过滤吗 |
| --- | --- |
| 采集源播放（hls.js） | ✅ |
| 解析接口播放（第三方播放器） | ✅（如果它用 XHR/fetch）|
| 直接打开 .m3u8 文件 | ❌ |
| Safari 原生 HLS | ❌ |

---

## 🐛 调试

**⇒ 控制台可用 `__M3U8F__` 对象：**

```js
// 查看统计
__M3U8F__.stats()
// → { intercepted: 12, filtered: 3, removedTotal: 45 }

// 测试过滤（返回 { text, result }）
__M3U8F__.filterM3U8(m3u8文本)

// 单独测某个策略
__M3U8F__.removeMarkedBlocks(文本)
__M3U8F__.removeMinorityPaths(文本)
__M3U8F__.removeShorterPath(文本)
__M3U8F__.removeByDurationMode(文本)
__M3U8F__.removeByUrlLengthMode(文本)
__M3U8F__.repairExtinfPairs(文本)
__M3U8F__.fixMetadata(文本)

// 解析片段
__M3U8F__.parseSegments(文本)
// → [{ lineIdx, urlLineIdx, dur, url, prefix }, ...]

// 关闭日志
__M3U8F__.debug(false)

// 查看所有命令
__M3U8F__.help()
```

### 日志长什么样

```
[M3U8过滤] 已加载 v1.0.1（XHR + fetch 劫持已就绪）
[M3U8过滤] 拦截 https://xxx.com/playlist.m3u8  → 删除 28 个片段
[M3U8过滤]   · 占比型: 28
[M3U8过滤] 元数据: TARGETDURATION: #EXT-X-TARGETDURATION:4 → #EXT-X-TARGETDURATION:8
```

---

## 🔍 工作原理

### XHR 劫持（关键设计）

**⇒ 用【惰性 getter】而不是 `readystatechange` 监听：**

```js
// ❌ 错误做法：监听 readystatechange
xhr.addEventListener('readystatechange', () => {
    // hls.js 用的是 xhr.onreadystatechange，它比 addEventListener 先执行
    // ⇒ 我们拿到数据时，hls.js 已经读完了
});

// ✅ 正确做法：覆写 responseText 的 getter
Object.defineProperty(xhr, 'responseText', {
    get: function () {
        // 第一次读取时才过滤
        return filtered || original;
    }
});
```

### fetch 劫持

```js
window.fetch = function (input, init) {
    return origFetch.apply(this, arguments).then(resp => {
        // 克隆响应 → 读文本 → 过滤 → 构造新 Response
        return resp.clone().text().then(text => {
            const filtered = handleText(url, text);
            return new Response(filtered, { status: resp.status, headers: resp.headers });
        });
    });
};
```

---

## 🙏 致谢

思路参考 [屏幕前的你](https://github.com/963540817) 大佬的 [dashu](https://github.com/963540817/dashu)。

本脚本在其基础上：

- 改用**逐行解析**（原来用正则整段匹配，容易误删）
- 补充 **ppvod 标记识别**
- 增加**日志**与**可测试接口**（`__M3U8F__`）
- 补充 3 种新策略（双路径 / 时长众数 / URL 长度众数）

**（引用前提：拒绝商业化）**

如认为收录或署名方式仍有不妥，欢迎提 Issue 或直接联系，我会立即调整或移除。

---

## 📄 License

[GPL-3.0](https://github.com/whyyy-404/video_freevip/blob/main/LICENSE)

---

## 🔗 相关

- [主脚本 README](https://github.com/whyyy-404/video_freevip/blob/main/README.md) —— VIP 追剧神器（解析 + 采集源 + 导航）
- [贡献指南](https://github.com/whyyy-404/video_freevip/blob/main/CONTRIBUTING.md)