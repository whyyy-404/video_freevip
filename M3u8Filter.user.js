// ==UserScript==
// @name         🫧404小站 — 🎬M3U8 广告过滤器
// @namespace    https://github.com/whyyy-404/video_freevip
// @version      1.0.5
// @description  拦截 m3u8 播放列表，删除插播广告片段（7 种删除策略 + 2 种修复）
// @author       yyy404
// @match        *://*/*
// @exclude      *://*.iqiyi.com/*
// @exclude      *://*.qq.com/*
// @exclude      *://*.youku.com/*
// @exclude      *://*.mgtv.com/*
// @exclude      *://*.bilibili.com/*
// @exclude      *://*.sohu.com/*
// @exclude      *://*.pptv.com/*
// @exclude      *://*.le.com/*
// @exclude      *://*.ixigua.com/*
// @exclude      *://*.acfun.cn/*
// @exclude      *://*.tudou.com/*
// @exclude      *://*.miguvideo.com/*
// @exclude      *://*.wasu.cn/*
// @exclude      *://*.pan.baidu.com/*
// @exclude      *://*.aliyundrive.com/*
// @exclude      *://*.alipan.com/*
// @exclude      *://*.115.com/*
// @exclude      *://*.123pan.com/*
// @exclude      *://*.lanzou*/*
// @exclude      *://*.ctfile.com/*
// @exclude      *://*.weiyun.com/*
// @exclude      *://*.mail.qq.com/*
// @exclude      *://*.mail.163.com/*
// @exclude      *://*.mail.google.com/*
// @exclude      *://*.greasyfork.org/*
// @exclude      *://*.scriptcat.org/*
// @exclude      *://*.github.com/*
// @exclude      *://*.githubusercontent.com/*
// @exclude      *://localhost/*
// @exclude      *://127.0.0.1/*
// @exclude      *://192.168.*/*
// @exclude      *://10.*/*
// @exclude      *://172.16.*/*
// @grant        none
// @run-at       document-start
// @homepageURL  https://github.com/whyyy-404/video_freevip
// @supportURL   https://github.com/whyyy-404/video_freevip/issues
// @license      GPL-3.0
// @icon         https://gcore.jsdelivr.net/gh/whyyy-404/icon@main/Collection/Cartoon/bear-beat.gif
// ==/UserScript==

/* ============================================================================
 *  【它做什么】
 *  劫持页面里的 XHR / fetch，当响应是 m3u8 播放列表时，删掉其中的广告片段，
 *  再把干净的播放列表交给播放器。
 *
 *  【为什么需要】
 *  采集站的 m3u8 里会插播广告（通常是 5~30 秒的短片段，路径与正片不同）。
 *  直接播放会看到广告；过滤后无缝播放。
 *
 *  【致谢与参考来源】
 *
 *  本项目的解析 / 采集 / 广告过滤等思路，参考自「屏幕前的你」大佬
 *  （https://github.com/963540817）分享的自用脚本：
 *
 *      https://github.com/963540817/dashu
 *
 *  本脚本在其基础上改用逐行解析、补充 ppvod 标记识别、增加日志与可测试接口。
 *  特此致谢。（引用前提：拒绝商业化）
 *
 *  如认为收录或署名方式不妥，欢迎提 Issue 或联系，我会立即调整或移除。
 *
 *  【七种删除策略 + 两种修复】
 *    【删除】
 *    ① 标记型：删除 "# ppvod-ad-injected" 之后紧跟的整段广告
 *    ② 占比型：统计每个路径前缀的片段数，占比 < 34% 的视为广告
 *    ③ 时长型：连续多个"整秒短片段"（如 3s/4s）夹在两处 DISCONTINUITY 之间
 *    ④ 双路径型：只有 2 组路径时，删总时长短的那一路
 *    ⑤ 时长众数型：某一种时长占比 > 98.7% 时，删掉其它时长的片段（默认关）
 *    ⑥ URL长度众数型：某一种 URL 长度占比 > 78.9% 时，删掉其它长度的片段（默认关）
 *    ⑦ 重复广告块：块内 4~6 个片段、总时长 <= 25 秒，且内容在整集里重复出现（或带填充值特征）
 *    【修复】
 *    · 元数据修正：把 EXT-X-TARGETDURATION 调到与实际片长一致
 *    · EXTINF 配对修复：清掉孤儿 EXTINF，避免播放器卡顿
 *
 *  【安全设计】
 *    · 每种策略都有阈值保护，宁可不删也不误删
 *    · 所有删除动作打印日志（可在控制台看到）
 *    · 提供 __M3U8F__ 对象供调试
 * ========================================================================== */
(function () {
    'use strict';

    // 只处理 HTML 文档。图片 / 纯文本 / JSON / PDF 这些不会有播放器，
    // 也不会有 XHR 劫持的价值，提前退出省掉一次完整解析。
    try {
        if (document.contentType && document.contentType !== 'text/html') return;
    } catch (e) { }

    if (window.__M3U8F_LOADED__) return;
    window.__M3U8F_LOADED__ = true;

    var DEBUG = true;
    var LOG_PREFIX = '%c[M3U8过滤]';

    function log() {
        if (!DEBUG) return;
        var args = Array.prototype.slice.call(arguments);
        args.unshift(LOG_PREFIX, 'color:#3fb950;font-weight:bold');
        try { console.log.apply(console, args); } catch (e) {}
    }
    function warn() {
        var args = Array.prototype.slice.call(arguments);
        args.unshift(LOG_PREFIX, 'color:#ffd166;font-weight:bold');
        try { console.warn.apply(console, args); } catch (e) {}
    }

    /* ========================================================================
     *  第一部分：纯函数（无副作用，可单独测试）
     * ====================================================================== */

    /**
     * 判断文本是否是 m3u8 播放列表
     * 只要有 #EXTM3U 就算，不额外校验 ts 文件名格式
     */
    function isM3U8(text) {
        if (!text || typeof text !== 'string') return false;
        if (text.length < 20) return false;
        // 去掉 BOM 后看开头
        var head = text.replace(/^﻿/, '').trim();
        return /^#EXTM3U/i.test(head);
    }

    /**
     * 判断是否是「片段列表」（而不是 master playlist）
     * master playlist 只有 #EXT-X-STREAM-INF，没有 #EXTINF
     */
    function isMediaPlaylist(text) {
        return isM3U8(text) && /^#EXTINF/i.test(text.trim().split(/\r?\n/).filter(function (l) {
            return l.trim().length > 0;
        }).join('\n').replace(/^#EXTM3U[^\n]*\n?/i, ''));
    }

    /**
     * 按行解析播放列表，提取片段
     * @returns {Array<{lineIdx, dur, url, prefix}>}
     */
    function parseSegments(text) {
        var lines = text.split(/\r?\n/);
        var segs = [];
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (!/^#EXTINF/i.test(line.trim())) continue;

            var m = line.match(/#EXTINF\s*:\s*([\d.]+)/i);
            var dur = m ? parseFloat(m[1]) : 0;

            // 下一行是地址（可能空行，跳过）
            var j = i + 1;
            while (j < lines.length && lines[j].trim() === '') j++;
            if (j >= lines.length) break;

            var url = lines[j].trim();
            if (!url || url.charAt(0) === '#') continue;

            segs.push({
                lineIdx: i,
                urlLineIdx: j,
                dur: dur,
                url: url,
                prefix: getPathPrefix(url)
            });
        }
        return segs;
    }

    /**
     * 提取 URL 的路径前缀（用于分组）
     * 例：'/20261003/84_9109598f/2000k/hls/x.ts' → '/20261003/84_9109598f/'
     *     'b8143e816b8000000.ts'                 → '(相对)'
     */
    function getPathPrefix(url) {
        if (!url) return '(空)';
        // 绝对路径（/ 开头）
        if (url.charAt(0) === '/') {
            var m = url.match(/^(\/[^\/]+\/[^\/]+\/)/);
            return m ? m[1] : '(绝对根)';
        }
        // 完整 URL
        if (/^https?:\/\//i.test(url)) {
            var m2 = url.match(/^https?:\/\/[^\/]+(\/[^\/]+\/[^\/]+\/)/i);
            return m2 ? 'URL:' + m2[1] : 'URL:(根)';
        }
        // 相对路径（含子目录）
        if (url.indexOf('/') > 0) {
            var m3 = url.match(/^([^\/]+\/[^\/]+\/)/);
            return 'REL:' + (m3 ? m3[1] : '(根)');
        }
        return '(相对)';
    }

    /**
     * 策略 ①：删除 ppvod 标记后的整段
     * 格式：
     *   # ppvod-ad-injected v1
     *   #EXT-X-DISCONTINUITY
     *   #EXTINF:4,
     *   /xxx/ad.ts
     *   ...
     *   #EXT-X-DISCONTINUITY
     */
    function removeMarkedBlocks(text) {
        var lines = text.split(/\r?\n/);
        var out = [];
        var removedSegs = 0;
        var removedLines = 0;
        var i = 0;
        var blocks = 0;

        while (i < lines.length) {
            var trimmed = lines[i].trim();

            // 检测广告标记（ppvod 或任何 *ad-injected*）
            if (/^#\s*\S*ad-injected/i.test(trimmed)) {
                blocks++;
                log('发现广告标记: ' + trimmed.slice(0, 50));
                i++;   // 跳过标记行

                // 跳过紧跟的 DISCONTINUITY（广告段的开始分隔符）
                while (i < lines.length && lines[i].trim() === '') { removedLines++; i++; }
                if (i < lines.length && /^#EXT-X-DISCONTINUITY/i.test(lines[i].trim())) {
                    removedLines++;
                    i++;
                }

                // 继续跳过所有片段，直到遇到「后面紧跟 #EXTINF 的 DISCONTINUITY」
                // 或遇到非片段内容
                while (i < lines.length) {
                    var t = lines[i].trim();
                    if (t === '') { removedLines++; i++; continue; }

                    // 关键判断：遇到 DISCONTINUITY 时，看它后面是不是 #EXTINF
                    if (/^#EXT-X-DISCONTINUITY/i.test(t)) {
                        // 往后找第一个非空行
                        var k = i + 1;
                        while (k < lines.length && lines[k].trim() === '') k++;
                        var nextNonEmpty = (k < lines.length) ? lines[k].trim() : '';

                        if (/^#EXTINF/i.test(nextNonEmpty)) {
                            // 后面还是片段 → 说明这是【广告段结束】的分隔符
                            // 保留这个 DISCONTINUITY，广告段到此为止
                            out.push(lines[i]);
                            i++;
                            break;
                        } else {
                            // 后面不是片段 → 广告段内还有一个 DISCONTINUITY，继续跳过
                            removedLines++;
                            i++;
                            continue;
                        }
                    }

                    // 广告段内的片段行（#EXTINF 或地址）
                    if (/^#EXTINF/i.test(t)) removedSegs++;
                    removedLines++;
                    i++;
                }
                continue;
            }

            out.push(lines[i]);
            i++;
        }

        return {
            text: out.join('\n'),
            removed: removedSegs,
            removedLines: removedLines,
            blocks: blocks,
            strategy: 'marked'
        };
    }

    /**
     * 策略 ②：按路径占比删除
     * 规则：占比 > 66% 的路径视为正片，其余视为广告
     * 四道保险：
     *   ① 最多路径占比 > 66%
     *   ② 路径种类 < 片段总数 × 66%
     *   ③ 要删的片段数 <= 要留的片段数
     *   ④ 不在白名单里
     */
    function removeMinorityPaths(text, opts) {
        opts = opts || {};
        var threshold = opts.threshold || 0.66;
        var whitelist = opts.whitelist || [];

        var segs = parseSegments(text);
        if (segs.length < 10) {
            return { text: text, removed: 0, strategy: 'minority', reason: '片段太少(' + segs.length + ')' };
        }

        // 按前缀分组
        var groups = {};
        segs.forEach(function (s) {
            if (!groups[s.prefix]) groups[s.prefix] = [];
            groups[s.prefix].push(s);
        });

        var prefixes = Object.keys(groups);
        var maxPrefix = '', maxCount = 0;
        prefixes.forEach(function (p) {
            if (groups[p].length > maxCount) {
                maxCount = groups[p].length;
                maxPrefix = p;
            }
        });

        // 保险 ①
        if (maxCount <= segs.length * threshold) {
            return {
                text: text, removed: 0, strategy: 'minority',
                reason: '最多路径占比 ' + (maxCount / segs.length * 100).toFixed(1) + '% <= ' + (threshold * 100) + '%'
            };
        }

        // 保险 ②
        if (prefixes.length >= segs.length * threshold) {
            return {
                text: text, removed: 0, strategy: 'minority',
                reason: '路径种类 ' + prefixes.length + ' >= ' + (segs.length * threshold).toFixed(0)
            };
        }

        // 收集要删的
        var toDelete = [];
        prefixes.forEach(function (p) {
            if (p === maxPrefix) return;
            // 保险 ④：白名单
            if (whitelist.some(function (w) { return p.indexOf(w) >= 0; })) {
                log('跳过白名单路径: ' + p);
                return;
            }
            groups[p].forEach(function (s) { toDelete.push(s); });
        });

        // 保险 ③
        if (toDelete.length > maxCount) {
            return {
                text: text, removed: 0, strategy: 'minority',
                reason: '要删 ' + toDelete.length + ' > 要留 ' + maxCount
            };
        }

        // 执行删除：按行号倒序删，避免索引错乱
        var lines = text.split(/\r?\n/);
        var deleteLineSet = {};
        toDelete.forEach(function (s) {
            deleteLineSet[s.lineIdx] = true;      // #EXTINF 行
            deleteLineSet[s.urlLineIdx] = true;   // url 行
        });

        var out = [];
        for (var i = 0; i < lines.length; i++) {
            if (deleteLineSet[i]) continue;
            out.push(lines[i]);
        }

        log('占比型删除: ' + toDelete.length + ' 个片段，路径 ' + (prefixes.length - 1) + ' 组');
        return {
            text: out.join('\n'),
            removed: toDelete.length,
            strategy: 'minority',
            detail: {
                maxPrefix: maxPrefix,
                maxCount: maxCount,
                total: segs.length,
                deletedPrefixes: prefixes.filter(function (p) { return p !== maxPrefix; })
            }
        };
    }

    /**
     * 策略 ③：删除 DISCONTINUITY 之间的"整秒短片段组"
     * 特征：连续 5 个以上、时长都是整数（3s/4s）、且夹在两处 DISCONTINUITY 之间
     */
    function removeDiscontinuityAds(text, opts) {
        opts = opts || {};
        var minCount = opts.minCount || 5;

        var lines = text.split(/\r?\n/);
        var segs = parseSegments(text);
        if (segs.length < 20) return { text: text, removed: 0, strategy: 'discontinuity' };

        // 找所有 DISCONTINUITY 行号
        var discLines = [];
        lines.forEach(function (l, i) {
            if (/^#EXT-X-DISCONTINUITY/i.test(l.trim())) discLines.push(i);
        });
        if (discLines.length < 2) return { text: text, removed: 0, strategy: 'discontinuity', reason: 'DISCONTINUITY 少于 2 处' };

        // 找被两处 DISCONTINUITY 夹住的片段
        var candidates = [];
        for (var d = 0; d < discLines.length - 1; d++) {
            var start = discLines[d];
            var end = discLines[d + 1];
            var inRange = segs.filter(function (s) { return s.lineIdx > start && s.lineIdx < end; });
            if (inRange.length < minCount) continue;

            // 检查是否全是整数秒
            var allInt = inRange.every(function (s) { return Math.abs(s.dur - Math.round(s.dur)) < 0.01; });
            if (!allInt) continue;

            // 检查时长是否集中在 2~6 秒
            var inRangeDur = inRange.every(function (s) { return s.dur >= 2 && s.dur <= 6; });
            if (!inRangeDur) continue;

            candidates.push({ start: start, end: end, segs: inRange });
        }

        if (!candidates.length) return { text: text, removed: 0, strategy: 'discontinuity', reason: '没找到符合条件的段' };

        // 删除
        var deleteLineSet = {};
        var removedCount = 0;
        candidates.forEach(function (c) {
            // 删 DISCONTINUITY 之间所有内容（保留第二个 DISCONTINUITY）
            for (var i = c.start + 1; i < c.end; i++) {
                if (lines[i].trim() !== '') {
                    deleteLineSet[i] = true;
                    removedCount++;
                }
            }
        });

        var out = [];
        for (var i = 0; i < lines.length; i++) {
            if (deleteLineSet[i]) continue;
            out.push(lines[i]);
        }

        log('时长型删除: ' + candidates.length + ' 段，' + removedCount + ' 行');
        return {
            text: out.join('\n'),
            removed: removedCount,
            strategy: 'discontinuity',
            detail: candidates.map(function (c) { return { start: c.start, end: c.end, count: c.segs.length }; })
        };
    }

    /**
     * 判断一个 EXTINF 时长字符串是不是「填充值」
     * 采集站生成假时长时，常有小数部分「连续重复同一个数字」的特征：
     *   连续 3 型：1.6333 / 19.6333 / 3.3333
     *   连续 6 型：1.6667 / 19.6667 / 6.6667
     * 正常正片的时长是真实的，几乎不会出现连续三位一模一样的小数。
     * 注：整数部分不限于一位 —— 19.6333 这种两位整数同样要能识别。
     */
    var RE_FILLER_3 = /^\s*\d+\.\d*3{3,}\d*\s*$/;
    var RE_FILLER_6 = /^\s*\d+\.\d*6{3,}\d*\s*$/;

    function isFiller3(durStr) {
        return RE_FILLER_3.test(String(durStr));
    }
    function isFiller6(durStr) {
        return RE_FILLER_6.test(String(durStr));
    }
    function isFillerDuration(durStr) {
        return isFiller3(durStr) || isFiller6(durStr);
    }

    /**
     * 策略 ⑦：重复广告块
     * 场景：采集站的广告段，被两处 EXT-X-DISCONTINUITY 夹住，
     *       块内 4~6 个片段、总时长 <= 25 秒，且 EXTINF 带「填充值」特征。
     *       这类广告在群友实测里是「每集 3~4 段、每段约 18 秒」。
     * 判据：
     *   ① 片段总数 >= minSegs（默认 20，避免小文件被处理）
     *   ② 块内片段数在 minBlock~maxBlock（默认 4~6）
     *   ③ 块内总时长 <= maxTotal（默认 25 秒）
     *   ④ 总时长不在 [18, 19) 区间 —— 正片单段常落在这个范围，排除掉更保险
     *   ⑤ 填充值片段 >= 2 个，或恰好 1 个且那个值是「连续 6」型
     * 与策略 ③ 的区别：③ 只认整秒短片段（2~6 秒），这里认小数长片段（约 18 秒）。
     */
    function removeDuplicateAdBlocks(text, opts) {
        opts = opts || {};
        var minSegs = opts.minSegs || 20;
        var minBlock = opts.minBlock || 4;
        var maxBlock = opts.maxBlock || 6;
        var maxTotal = opts.maxTotal || 25;

        var lines = text.split(/\r?\n/);
        var segs = parseSegments(text);
        if (segs.length < minSegs) return { text: text, removed: 0, strategy: 'dupAd' };

        var discLines = [];
        lines.forEach(function (l, i) {
            if (/^#EXT-X-DISCONTINUITY/i.test(l.trim())) discLines.push(i);
        });
        if (discLines.length < 2) {
            return { text: text, removed: 0, strategy: 'dupAd', reason: 'DISCONTINUITY 少于 2 处' };
        }

        // 先把所有块切出来，算出每块的「内容签名」
        var blocks = [];
        for (var d = 0; d < discLines.length - 1; d++) {
            var start = discLines[d];
            var end = discLines[d + 1];
            var inRange = [];
            for (var k = 0; k < segs.length; k++) {
                if (segs[k].lineIdx > start && segs[k].lineIdx < end) inRange.push(segs[k]);
            }
            if (!inRange.length) continue;

            var total = 0;
            var fillerCount = 0;
            var lastDurStr = '';
            var tsNames = [];
            for (var q = 0; q < inRange.length; q++) {
                var s = inRange[q];
                total += s.dur;
                var raw = lines[s.lineIdx] || '';
                var mm = raw.match(/#EXTINF\s*:\s*([\d.]+)/i);
                var durStr = mm ? mm[1] : '';
                lastDurStr = durStr;
                if (isFillerDuration(durStr)) fillerCount++;
                tsNames.push((s.url.split('/').pop() || '').split('?')[0]);
            }

            blocks.push({
                start: start,
                end: end,
                count: inRange.length,
                total: total,
                filler: fillerCount,
                lastDurStr: lastDurStr,
                sig: tsNames.join('|')
            });
        }

        if (!blocks.length) {
            return { text: text, removed: 0, strategy: 'dupAd', reason: '没有可分析的块' };
        }

        // 统计每个签名出现几次
        var sigTimes = {};
        blocks.forEach(function (b) {
            if (!b.sig) return;
            sigTimes[b.sig] = (sigTimes[b.sig] || 0) + 1;
        });

        var candidates = [];
        blocks.forEach(function (b) {
            if (b.count < minBlock || b.count > maxBlock) return;
            if (b.total > maxTotal) return;
            if (b.total >= 18 && b.total < 19) return;

            // 判据一：块内容在整集里重复出现（同一段广告插多次）
            var isDup = b.sig && sigTimes[b.sig] >= 2;
            // 判据二：EXTINF 带填充值特征（部分采集站用重复数字生成假时长）
            var isFiller = b.filler >= 2 || (b.filler === 1 && isFiller6(b.lastDurStr));

            if (!isDup && !isFiller) return;

            candidates.push({
                start: b.start, end: b.end, count: b.count, total: b.total,
                filler: b.filler, dupTimes: isDup ? sigTimes[b.sig] : 0, by: isDup ? '重复' : '填充值'
            });
        });

        if (!candidates.length) {
            return { text: text, removed: 0, strategy: 'dupAd', reason: '没找到重复/填充值的广告块' };
        }

        var del = {};
        var removedCount = 0;
        candidates.forEach(function (c) {
            for (var i = c.start + 1; i < c.end; i++) {
                if (lines[i].trim() !== '') {
                    del[i] = true;
                    removedCount++;
                }
            }
        });

        var out = [];
        for (var i = 0; i < lines.length; i++) {
            if (del[i]) continue;
            out.push(lines[i]);
        }

        log('重复/填充广告块删除: ' + candidates.length + ' 段，' + removedCount + ' 行（' +
            candidates.map(function (c) { return c.total.toFixed(1) + 's/' + c.count + '片/' + c.by; }).join('、') + '）');
        return {
            text: out.join('\n'),
            removed: removedCount,
            strategy: 'dupAd',
            detail: candidates.map(function (c) {
                return { start: c.start, end: c.end, count: c.count, total: c.total, filler: c.filler, dupTimes: c.dupTimes, by: c.by };
            })
        };
    }

    /**
     * 策略 ⑧：按签名参数白名单删除（默认关）
     * 场景：正片 ts 都带签名参数（sign / token / key / auth_key / expires / version），
     *      广告 ts 是裸地址。只在「带签名的显著多于不带」时才动手。
     *
     * 四道保险：
     *   ① 片段数 >= 10
     *   ② 不带的必须 > 0（否则没东西删）
     *   ③ 带签名的必须是不带的 SIGN_RATIO 倍以上
     *   ④ 要删的不超过总数的一半
     */
    // 签名参数识别。
    //   能认：?key= / ?sign= / ?token= / ?vkey= / ?sk= / ?expires= / ?version= /
    //         ?auth_key= / ?video_key=（任意 xxx_key 形式）
    //   不认：?monkey= 这类没有下划线分隔的同名尾巴（避免误伤）
    var SIGN_RE = /[\?&](?:[a-z_]*?(?:sign|token|version|expires|vkey|sk)|(?:[a-z_]+_)?key)=/i;

    function removeBySignatureWhitelist(text, opts) {
        opts = opts || {};
        var ratio = opts.signatureRatio || 2;

        var segs = parseSegments(text);
        if (segs.length < 10) {
            return { text: text, removed: 0, strategy: 'signature', reason: '片段太少(' + segs.length + ')' };
        }

        var signed = [], unsigned = [];
        segs.forEach(function (s) {
            if (SIGN_RE.test(s.url)) signed.push(s); else unsigned.push(s);
        });

        if (unsigned.length === 0) {
            return { text: text, removed: 0, strategy: 'signature', reason: '全部带签名，无广告' };
        }
        if (signed.length < unsigned.length * ratio) {
            return {
                text: text, removed: 0, strategy: 'signature',
                reason: '带签名 ' + signed.length + ' 不足不带 ' + unsigned.length + ' 的 ' + ratio + ' 倍'
            };
        }
        if (unsigned.length > segs.length / 2) {
            return {
                text: text, removed: 0, strategy: 'signature',
                reason: '要删 ' + unsigned.length + ' 超过总数一半'
            };
        }

        var del = {};
        unsigned.forEach(function (sg) {
            del[sg.lineIdx] = true;
            del[sg.urlLineIdx] = true;
        });

        var lines = text.split(/\r?\n/);
        var out = [];
        for (var i = 0; i < lines.length; i++) {
            if (!del[i]) out.push(lines[i]);
        }

        log('签名白名单删除: ' + unsigned.length + ' 个（带签名 ' + signed.length + ' 个）');
        return {
            text: out.join('\n'),
            removed: unsigned.length,
            strategy: 'signature',
            detail: { signed: signed.length, unsigned: unsigned.length }
        };
    }

    /**
     * 策略 ④：两路径时，删总时长短的那一路
     * 场景：正片走 CDN-A，广告走 CDN-B，两条路径各自成段
     * 判据：路径只有 2 组，且两组总时长差 >= 3 倍
     */
    function removeShorterPath(text, opts) {
        opts = opts || {};
        var minRatio = opts.minRatio || 3;

        var segs = parseSegments(text);
        if (segs.length < 20) {
            return { text: text, removed: 0, strategy: 'shorterPath', reason: '片段太少(' + segs.length + ')' };
        }

        // 按前缀分组并累计时长
        var groups = {};
        segs.forEach(function (s) {
            if (!groups[s.prefix]) groups[s.prefix] = { segs: [], dur: 0 };
            groups[s.prefix].segs.push(s);
            groups[s.prefix].dur += s.dur;
        });

        var prefixes = Object.keys(groups);
        // 只处理「恰好 2 组」的情况，多于 2 组交给策略②
        if (prefixes.length !== 2) {
            return {
                text: text, removed: 0, strategy: 'shorterPath',
                reason: '路径 ' + prefixes.length + ' 组（只处理 2 组）'
            };
        }

        var a = { prefix: prefixes[0], dur: groups[prefixes[0]].dur, count: groups[prefixes[0]].segs.length };
        var b = { prefix: prefixes[1], dur: groups[prefixes[1]].dur, count: groups[prefixes[1]].segs.length };

        // 时长比判据：短的 × minRatio <= 长的
        var shorter = a.dur <= b.dur ? a : b;
        var longer = a.dur <= b.dur ? b : a;

        if (shorter.dur <= 0 || longer.dur <= 0) {
            return { text: text, removed: 0, strategy: 'shorterPath', reason: '时长异常' };
        }

        var ratio = longer.dur / shorter.dur;
        if (ratio < minRatio) {
            return {
                text: text, removed: 0, strategy: 'shorterPath',
                reason: '时长比 ' + ratio.toFixed(2) + ' < ' + minRatio + '（差异不够大）'
            };
        }

        // 保险：要删的片段数不能超过要留的
        if (shorter.count > longer.count) {
            return {
                text: text, removed: 0, strategy: 'shorterPath',
                reason: '要删 ' + shorter.count + ' > 要留 ' + longer.count
            };
        }

        // 执行删除
        var del = {};
        groups[shorter.prefix].segs.forEach(function (sg) {
            del[sg.lineIdx] = true;
            del[sg.urlLineIdx] = true;
        });

        var lines = text.split(/\r?\n/);
        var out = [];
        for (var i = 0; i < lines.length; i++) {
            if (!del[i]) out.push(lines[i]);
        }

        log('双路径型删除: ' + shorter.prefix + '（' + shorter.dur.toFixed(1) + 's）保留 ' + longer.prefix + '（' + longer.dur.toFixed(1) + 's）');
        return {
            text: out.join('\n'),
            removed: shorter.count,
            strategy: 'shorterPath',
            detail: { kept: longer.prefix, keptDur: longer.dur, deleted: shorter.prefix, deletedDur: shorter.dur, ratio: ratio }
        };
    }

    /**
     * 策略 ⑤：按 EXTINF 时长众数删
     * 场景：正片全是 4.000000s，广告是 3s / 1.76s 等非众数
     * 判据：某个时长占比 >= 98.7%（说明正片时长高度统一）
     * 保护：首尾片段永不删
     */
    function removeByDurationMode(text, opts) {
        opts = opts || {};
        var minRatio = opts.durationModeRatio || 0.95;

        var lines = text.split(/\r?\n/);
        var segs = parseSegments(text);
        if (segs.length < 50) {
            return { text: text, removed: 0, strategy: 'durationMode', reason: '片段太少(' + segs.length + ')' };
        }

        // 统计时长分布
        var counts = {};
        segs.forEach(function (s) {
            var k = s.dur.toFixed(6);
            counts[k] = (counts[k] || 0) + 1;
        });

        var maxKey = '', maxCount = 0;
        Object.keys(counts).forEach(function (k) {
            if (counts[k] > maxCount) { maxCount = counts[k]; maxKey = k; }
        });

        var ratio = maxCount / segs.length;
        if (ratio < minRatio) {
            return {
                text: text, removed: 0, strategy: 'durationMode',
                reason: '众数占比 ' + (ratio * 100).toFixed(1) + '% < ' + (minRatio * 100) + '%'
            };
        }

        var modeDur = parseFloat(maxKey);

        // 收集非众数片段（跳过首尾）
        var toDelete = [];
        for (var i = 1; i < segs.length - 1; i++) {
            if (Math.abs(segs[i].dur - modeDur) > 0.0001) toDelete.push(segs[i]);
        }

        if (!toDelete.length) {
            return { text: text, removed: 0, strategy: 'durationMode', reason: '没有非众数片段' };
        }

        // 保险：要删的不能超过要留的
        if (toDelete.length >= maxCount) {
            return {
                text: text, removed: 0, strategy: 'durationMode',
                reason: '要删 ' + toDelete.length + ' >= 众数 ' + maxCount
            };
        }

        var del = {};
        toDelete.forEach(function (sg) {
            del[sg.lineIdx] = true;
            del[sg.urlLineIdx] = true;
        });

        var out = [];
        for (var j = 0; j < lines.length; j++) {
            if (!del[j]) out.push(lines[j]);
        }

        log('时长众数型删除: ' + toDelete.length + ' 个（众数 ' + modeDur + 's，占 ' + (ratio * 100).toFixed(1) + '%）');
        return {
            text: out.join('\n'),
            removed: toDelete.length,
            strategy: 'durationMode',
            detail: { modeDur: modeDur, modeRatio: ratio, deleted: toDelete.length }
        };
    }

    /**
     * 策略 ⑥：按 ts URL 长度众数删
     * 场景：正片 URL 长度一致（如 xxx000001.ts），广告 URL 长度不同
     * 判据：某个 URL 长度占比 >= 78.9%
     */
    function removeByUrlLengthMode(text, opts) {
        opts = opts || {};
        var minRatio = opts.urlLengthRatio || 0.789;

        var lines = text.split(/\r?\n/);
        var segs = parseSegments(text);
        if (segs.length < 50) {
            return { text: text, removed: 0, strategy: 'urlLengthMode', reason: '片段太少(' + segs.length + ')' };
        }

        // 统计 URL 长度分布
        var counts = {};
        segs.forEach(function (s) {
            counts[s.url.length] = (counts[s.url.length] || 0) + 1;
        });

        var maxLen = 0, maxCount = 0;
        Object.keys(counts).forEach(function (k) {
            if (counts[k] > maxCount) { maxCount = counts[k]; maxLen = parseInt(k, 10); }
        });

        var ratio = maxCount / segs.length;
        if (ratio < minRatio) {
            return {
                text: text, removed: 0, strategy: 'urlLengthMode',
                reason: '长度众数占比 ' + (ratio * 100).toFixed(1) + '% < ' + (minRatio * 100) + '%'
            };
        }

        // 收集长度不是众数的片段
        var toDelete = segs.filter(function (s) { return s.url.length !== maxLen; });

        if (!toDelete.length) {
            return { text: text, removed: 0, strategy: 'urlLengthMode', reason: '没有异常长度的片段' };
        }

        // 保险：要删的不能超过要留的
        if (toDelete.length >= maxCount) {
            return {
                text: text, removed: 0, strategy: 'urlLengthMode',
                reason: '要删 ' + toDelete.length + ' >= 众数 ' + maxCount
            };
        }

        var del = {};
        toDelete.forEach(function (sg) {
            del[sg.lineIdx] = true;
            del[sg.urlLineIdx] = true;
        });

        var out = [];
        for (var j = 0; j < lines.length; j++) {
            if (!del[j]) out.push(lines[j]);
        }

        log('URL长度众数型删除: ' + toDelete.length + ' 个（众数长度 ' + maxLen + '，占 ' + (ratio * 100).toFixed(1) + '%）');
        return {
            text: out.join('\n'),
            removed: toDelete.length,
            strategy: 'urlLengthMode',
            detail: { modeLen: maxLen, modeRatio: ratio, deleted: toDelete.length }
        };
    }

    /**
     * 修复：EXTINF 与 ts 的配对
     * 场景：m3u8 里 #EXTINF 比 ts 多（或错位），导致播放器卡顿/跳片
     * 做法：只保留「紧跟着 #EXTINF 的 ts」，孤立的 #EXTINF 丢掉
     */
    function repairExtinfPairs(text) {
        var lines = text.split(/\r?\n/);
        var out = [];
        var changes = 0;
        var orphanExtinf = 0;

        for (var i = 0; i < lines.length; i++) {
            var t = lines[i].trim();

            if (/^#EXTINF/i.test(t)) {
                // 找下一个非空行
                var j = i + 1;
                while (j < lines.length && lines[j].trim() === '') j++;
                var next = (j < lines.length) ? lines[j].trim() : '';

                if (next && next.charAt(0) !== '#') {
                    // 正常配对：EXTINF + URL 一起保留
                    out.push(lines[i]);
                    for (var k = i + 1; k < j; k++) out.push(lines[k]);
                    out.push(lines[j]);
                    i = j;
                } else {
                    // 孤儿 EXTINF：丢掉
                    orphanExtinf++;
                    changes++;
                }
                continue;
            }

            // 孤立的 URL 行（前面没有 EXTINF）也丢掉
            if (t && t.charAt(0) !== '#' && !/^#/.test(t)) {
                var prevNonEmpty = '';
                for (var p = out.length - 1; p >= 0; p--) {
                    if (out[p].trim() !== '') { prevNonEmpty = out[p].trim(); break; }
                }
                if (!/^#EXTINF/i.test(prevNonEmpty)) {
                    // 孤立 URL，丢掉
                    changes++;
                    continue;
                }
            }

            out.push(lines[i]);
        }

        return {
            text: out.join('\n'),
            changes: changes,
            orphanExtinf: orphanExtinf,
            strategy: 'repairExtinf'
        };
    }

    /**
     * 修正元数据
     *  ① 重算 #EXT-X-TARGETDURATION（取最大片段时长，向上取整）
     *  ② 确保有 #EXT-X-ENDLIST
     */
    function fixMetadata(text) {
        var lines = text.split(/\r?\n/);
        var segs = parseSegments(text);
        var changes = [];

        // ① TARGETDURATION
        // 算法：max + min（比单纯 ceil(max) 更宽松，防止播放器因为目标时长偏小卡顿）
        if (segs.length) {
            var maxDur = 0;
            var minDur = Infinity;
            segs.forEach(function (s) {
                if (s.dur > maxDur) maxDur = s.dur;
                if (s.dur < minDur) minDur = s.dur;
            });
            if (!isFinite(minDur)) minDur = 0;
            var target = Math.ceil(maxDur + minDur);
            var found = false;
            for (var i = 0; i < lines.length; i++) {
                if (/^#EXT-X-TARGETDURATION/i.test(lines[i].trim())) {
                    var old = lines[i];
                    lines[i] = '#EXT-X-TARGETDURATION:' + target;
                    if (old !== lines[i]) changes.push('TARGETDURATION: ' + old.trim() + ' → ' + lines[i]);
                    found = true;
                    break;
                }
            }
            if (!found) {
                // 插在 #EXTM3U 后面
                for (var j = 0; j < lines.length; j++) {
                    if (/^#EXTM3U/i.test(lines[j].trim())) {
                        lines.splice(j + 1, 0, '#EXT-X-TARGETDURATION:' + target);
                        changes.push('TARGETDURATION: 补上 ' + target);
                        break;
                    }
                }
            }
        }

        // ② ENDLIST
        var hasEnd = lines.some(function (l) { return /^#EXT-X-ENDLIST/i.test(l.trim()); });
        if (!hasEnd && segs.length) {
            // 找最后一行非空内容
            var lastIdx = lines.length - 1;
            while (lastIdx >= 0 && lines[lastIdx].trim() === '') lastIdx--;
            if (lastIdx >= 0) {
                lines.splice(lastIdx + 1, 0, '#EXT-X-ENDLIST');
                changes.push('ENDLIST: 补上');
            }
        }

        return { text: lines.join('\n'), changes: changes };
    }

    /**
     * 主过滤函数
     */
    function filterM3U8(text, opts) {
        opts = opts || {};
        var result = {
            original: { len: text.length, segs: 0 },
            final: { len: 0, segs: 0 },
            removed: 0,
            strategies: [],
            log: []
        };

        if (!isM3U8(text)) {
            result.log.push('不是 m3u8，跳过');
            result.final.len = text.length;
            return { text: text, result: result };
        }

        // master playlist 不处理（里面没有片段）
        var firstLines = text.split(/\r?\n/).slice(0, 20).join('\n');
        if (!/#EXTINF/i.test(firstLines) && /#EXT-X-STREAM-INF/i.test(text)) {
            result.log.push('是 master playlist，跳过');
            result.final.len = text.length;
            return { text: text, result: result };
        }

        var origSegs = parseSegments(text);
        result.original.segs = origSegs.length;

        // 全局熔断：整集只走一条路径前缀 = 没有广告可删。
        // 后面的策略要么需要 >=2 组前缀才能比较，要么需要 DISCONTINUITY，
        // 单组情况下它们全都是空转，直接返回能省掉整轮解析。
        // 例外：策略⑧（签名白名单）不看路径分组，单组时照样有效 —— 广告可能
        // 混进正片同一个目录里，只靠签名参数区分，所以它开着的时候不能熔断。
        var _pfSeen = {};
        var _pfCount = 0;
        for (var _pi = 0; _pi < origSegs.length; _pi++) {
            var _pk = origSegs[_pi].prefix;
            if (!_pfSeen[_pk]) { _pfSeen[_pk] = 1; _pfCount++; if (_pfCount > 1) break; }
        }
        if (_pfCount <= 1 && origSegs.length > 0 && !opts.useSignatureWhitelist) {
            result.log.push('全局熔断: 只有 1 组路径，跳过所有策略');
            result.final.len = text.length;
            result.final.segs = origSegs.length;
            return { text: text, result: result };
        }

        var cur = text;

        // 策略 ①：标记型
        if (opts.useMarked !== false) {
            var r1 = removeMarkedBlocks(cur);
            if (r1.removed > 0) {
                result.strategies.push({ name: '标记型', removed: r1.removed });
                result.log.push('标记型: 删除 ' + r1.removed + ' 行');
                cur = r1.text;
            }
        }

        // 策略 ②：占比型
        if (opts.useMinority !== false) {
            var r2 = removeMinorityPaths(cur, opts);
            if (r2.removed > 0) {
                result.strategies.push({ name: '占比型', removed: r2.removed, detail: r2.detail });
                result.log.push('占比型: 删除 ' + r2.removed + ' 个片段');
                cur = r2.text;
            } else if (r2.reason) {
                result.log.push('占比型跳过: ' + r2.reason);
            }
        }

        // 策略 ④：双路径型（只处理恰好 2 组路径）
        if (opts.useShorterPath !== false) {
            var r4 = removeShorterPath(cur, opts);
            if (r4.removed > 0) {
                result.strategies.push({ name: '双路径型', removed: r4.removed, detail: r4.detail });
                result.log.push('双路径型: 删除 ' + r4.removed + ' 个片段');
                cur = r4.text;
            } else if (r4.reason) {
                result.log.push('双路径型跳过: ' + r4.reason);
            }
        }

        // 策略 ⑤：时长众数型
        if (opts.useDurationMode) {
            var r5 = removeByDurationMode(cur, opts);
            if (r5.removed > 0) {
                result.strategies.push({ name: '时长众数型', removed: r5.removed, detail: r5.detail });
                result.log.push('时长众数型: 删除 ' + r5.removed + ' 个片段');
                cur = r5.text;
            } else if (r5.reason) {
                result.log.push('时长众数型跳过: ' + r5.reason);
            }
        }

        // 策略 ⑥：URL 长度众数型
        if (opts.useUrlLengthMode) {
            var r6 = removeByUrlLengthMode(cur, opts);
            if (r6.removed > 0) {
                result.strategies.push({ name: 'URL长度众数型', removed: r6.removed, detail: r6.detail });
                result.log.push('URL长度众数型: 删除 ' + r6.removed + ' 个片段');
                cur = r6.text;
            } else if (r6.reason) {
                result.log.push('URL长度众数型跳过: ' + r6.reason);
            }
        }

        // 策略 ③：时长型
        if (opts.useDiscontinuity) {
            var r3 = removeDiscontinuityAds(cur, opts);
            if (r3.removed > 0) {
                result.strategies.push({ name: '时长型', removed: r3.removed });
                result.log.push('时长型: 删除 ' + r3.removed + ' 行');
                cur = r3.text;
            } else if (r3.reason) {
                result.log.push('时长型跳过: ' + r3.reason);
            }
        }

        // 策略 ⑦：重复广告块（默认开）
        // 跟策略 ③ 互补：③ 认整秒短片段（2~6 秒），⑦ 认小数长片段（约 18 秒）
        if (opts.useDupAd !== false) {
            var r7ad = removeDuplicateAdBlocks(cur, opts);
            if (r7ad.removed > 0) {
                result.strategies.push({ name: '重复广告块', removed: r7ad.removed, detail: r7ad.detail });
                result.log.push('重复广告块: 删除 ' + r7ad.removed + ' 行');
                cur = r7ad.text;
            } else if (r7ad.reason) {
                result.log.push('重复广告块跳过: ' + r7ad.reason);
            }
        }

        // 策略 ⑧：签名白名单（默认关）
        // 跟前面的策略不重叠：前面的按路径/时长/长度分组，这个只认「有没有签名参数」。
        // 用在「广告混进正片同一路径、占比型失效」的场景。
        if (opts.useSignatureWhitelist) {
            var r8 = removeBySignatureWhitelist(cur, opts);
            if (r8.removed > 0) {
                result.strategies.push({ name: '签名白名单', removed: r8.removed, detail: r8.detail });
                result.log.push('签名白名单: 删除 ' + r8.removed + ' 个片段');
                cur = r8.text;
            } else if (r8.reason) {
                result.log.push('签名白名单跳过: ' + r8.reason);
            }
        }

        // 修正元数据
        if (opts.fixMeta !== false) {
            var r4 = fixMetadata(cur);
            if (r4.changes.length) {
                result.log.push('元数据: ' + r4.changes.join('; '));
                cur = r4.text;
            }
        }

        // 修复：修 EXTINF 配对（默认开，防止播放器卡顿）
        if (opts.repairExtinf !== false) {
            var r7 = repairExtinfPairs(cur);
            if (r7.changes > 0) {
                result.strategies.push({ name: 'EXTINF配对修复', removed: 0, changes: r7.changes });
                result.log.push('EXTINF配对修复: 清理 ' + r7.changes + ' 处（孤儿 EXTINF ' + r7.orphanExtinf + ' 个）');
                cur = r7.text;
            }
        }

        var finalSegs = parseSegments(cur);
        result.final.segs = finalSegs.length;
        result.final.len = cur.length;
        result.removed = origSegs.length - finalSegs.length;

        return { text: cur, result: result };
    }

    /* ========================================================================
     *  第二部分：劫持 XHR / fetch
     * ====================================================================== */

    var STATS = { intercepted: 0, filtered: 0, removedTotal: 0 };

    function isM3U8Url(url) {
        if (!url) return false;
        var u = String(url);
        // ① 标准后缀
        if (/\.m3u8(?:\?|$)/i.test(u)) return true;
        // ② 假扩展名的播放列表端点。
        //    有些解析接口把 m3u8 挂在 play.php / playlist.php 这类地址后面，
        //    响应头是 application/vnd.apple.mpegurl，URL 里却没有 .m3u8 —— 
        //    只看后缀会把它们整个漏掉（实测 TXNQ 的 /qcb/play.php/<base64> 就是这种）。
        if (/(?:play|playlist|m3u8list|live|vod)\.(?:php|asp|aspx|jsp)(?:[\/?]|$)/i.test(u)) return true;
        // ③ 用参数声明格式的
        if (/[?&](?:type|format|ext|fmt)=m3u8/i.test(u)) return true;
        return false;
    }

    function handleText(url, text) {
        STATS.intercepted++;
        if (!isM3U8(text)) return null;

        var r = filterM3U8(text);
        if (r.result.removed > 0) {
            STATS.filtered++;
            STATS.removedTotal += r.result.removed;
            log('拦截 ' + String(url).slice(0, 60) + '  → 删除 ' + r.result.removed + ' 个片段');
            r.result.strategies.forEach(function (s) {
                log('  · ' + s.name + ': ' + s.removed);
            });
            return r.text;
        }
        return null;
    }

    // ---- XHR ----
    // 关键设计：用【惰性 getter】而不是 readystatechange 监听
    //   原因：hls.js 用 xhr.onreadystatechange 读数据，它比 addEventListener 先执行
    //         ⇒ 必须让"第一次读取 responseText 时"就触发过滤
    var XHR = window.XMLHttpRequest;
    if (XHR && XHR.prototype) {
        var origOpen = XHR.prototype.open;
        var origSend = XHR.prototype.send;
        var protoTextDesc = Object.getOwnPropertyDescriptor(XHR.prototype, 'responseText');
        var protoRespDesc = Object.getOwnPropertyDescriptor(XHR.prototype, 'response');

        XHR.prototype.open = function (method, url) {
            this.__m3u8f_url = url;
            this.__m3u8f_done = false;
            this.__m3u8f_filtered = null;
            return origOpen.apply(this, arguments);
        };

        XHR.prototype.send = function () {
            var self = this;
            var url = self.__m3u8f_url;

            if (!isM3U8Url(url)) {
                return origSend.apply(this, arguments);
            }

            // 惰性过滤：第一次读 responseText/response 时执行
            function ensureFiltered() {
                if (self.__m3u8f_done) return;
                if (self.readyState !== 4) return;
                self.__m3u8f_done = true;

                try {
                    var raw = null;
                    if (protoTextDesc && protoTextDesc.get) {
                        raw = protoTextDesc.get.call(self);
                    }
                    if (typeof raw === 'string' && raw.length > 0) {
                        var f = handleText(url, raw);
                        if (f !== null) {
                            self.__m3u8f_filtered = f;
                        }
                    }
                } catch (e) {
                    warn('XHR 过滤异常: ' + e.message);
                }
            }

            // 覆写 responseText（惰性）
            try {
                Object.defineProperty(self, 'responseText', {
                    configurable: true,
                    get: function () {
                        ensureFiltered();
                        if (self.__m3u8f_filtered !== null) return self.__m3u8f_filtered;
                        return protoTextDesc && protoTextDesc.get ? protoTextDesc.get.call(self) : '';
                    }
                });
            } catch (e) { warn('覆写 responseText 失败: ' + e.message); }

            // 覆写 response（惰性）
            try {
                Object.defineProperty(self, 'response', {
                    configurable: true,
                    get: function () {
                        var rt = self.responseType;
                        if (rt === '' || rt === 'text') {
                            ensureFiltered();
                            if (self.__m3u8f_filtered !== null) return self.__m3u8f_filtered;
                        }
                        return protoRespDesc && protoRespDesc.get ? protoRespDesc.get.call(self) : null;
                    }
                });
            } catch (e) { warn('覆写 response 失败: ' + e.message); }

            // 兜底：如果没人读 responseText（比如播放器直接用别的方式），
            // 也在 readyState=4 时主动过滤一次
            self.addEventListener('readystatechange', function () {
                if (self.readyState === 4) {
                    setTimeout(ensureFiltered, 0);
                }
            });

            return origSend.apply(this, arguments);
        };
    }

    // ---- fetch ----
    var origFetch = window.fetch;
    if (typeof origFetch === 'function') {
        window.fetch = function (input, init) {
            var url = (typeof input === 'string') ? input : (input && input.url);
            var p = origFetch.apply(this, arguments);

            if (!isM3U8Url(url)) return p;

            return p.then(function (resp) {
                try {
                    return resp.clone().text().then(function (text) {
                        var filtered = handleText(url, text);
                        if (filtered === null) return resp;
                        // 构造新响应
                        return new Response(filtered, {
                            status: resp.status,
                            statusText: resp.statusText,
                            headers: resp.headers
                        });
                    });
                } catch (e) {
                    warn('fetch 过滤失败: ' + e.message);
                    return resp;
                }
            });
        };
    }

    /* ========================================================================
     *  第三部分：对外接口
     * ====================================================================== */

    window.__M3U8F__ = {
        version: '1.0.5',

        // 纯函数，可单独测试
        isM3U8: isM3U8,
        isMediaPlaylist: isMediaPlaylist,
        parseSegments: parseSegments,
        getPathPrefix: getPathPrefix,
        removeMarkedBlocks: removeMarkedBlocks,
        removeMinorityPaths: removeMinorityPaths,
        removeDiscontinuityAds: removeDiscontinuityAds,
        removeDuplicateAdBlocks: removeDuplicateAdBlocks,
        isFillerDuration: isFillerDuration,
        removeShorterPath: removeShorterPath,
        removeByDurationMode: removeByDurationMode,
        removeByUrlLengthMode: removeByUrlLengthMode,
        removeBySignatureWhitelist: removeBySignatureWhitelist,
        repairExtinfPairs: repairExtinfPairs,
        fixMetadata: fixMetadata,
        filterM3U8: filterM3U8,

        // 统计
        stats: function () { return JSON.parse(JSON.stringify(STATS)); },
        resetStats: function () { STATS.intercepted = 0; STATS.filtered = 0; STATS.removedTotal = 0; },

        // 调试
        debug: function (on) { DEBUG = on !== false; log('调试日志: ' + (DEBUG ? '开' : '关')); },
        help: function () {
            console.log('%c__M3U8F__ 可用命令', 'color:#7ee787;font-weight:bold;font-size:13px');
            console.log('  __M3U8F__.stats()                       查看统计');
            console.log('  __M3U8F__.filterM3U8(文本)              测试过滤（返回 {text, result}）');
            console.log('  __M3U8F__.parseSegments(文本)           解析片段');
            console.log('  __M3U8F__.removeMinorityPaths(文本)     只测占比型');
            console.log('  __M3U8F__.removeShorterPath(文本)       只测双路径型');
            console.log('  __M3U8F__.removeByDurationMode(文本)    只测时长众数型');
            console.log('  __M3U8F__.removeByUrlLengthMode(文本)   只测URL长度众数型');
            console.log('  __M3U8F__.removeBySignatureWhitelist(文本) 只测签名白名单');
            console.log('  __M3U8F__.removeDuplicateAdBlocks(文本) 只测重复广告块');
            console.log('  __M3U8F__.isFillerDuration("19.6333")   判断是否填充值时长');
            console.log('  __M3U8F__.repairExtinfPairs(文本)       只测EXTINF配对修复');
            console.log('  __M3U8F__.removeMarkedBlocks(文本)      只测标记型');
            console.log('  __M3U8F__.fixMetadata(文本)             只测元数据修正');
            console.log('  __M3U8F__.debug(false)                  关闭日志');
        }
    };

    log('已加载 v1.0.5（XHR + fetch 劫持已就绪）');
})();
