// ==UserScript==
// @name         🫧404小站 — 🎬VIP追剧神器 | 完全免费 | 支持多平台 | (电脑/手机/平板...自适应)
// @namespace    https://scriptcat.org/zh-CN/users/162063
// @version      3.3.5
// @description  ▶在线VIP视频解析工具 (电脑/手机/平板...自适应) | free | 支持多平台【爱奇艺】【腾讯视频】【优酷土豆】【芒果TV】【乐视视频】【哔哩哔哩】【搜狐视频】等常见平台。✨50+解析接口任选 ✨内嵌播放无广告 ✨智能切集追剧 ✨内嵌铺满原播放区 ✨一键自动解析  制作不易，有问题可加微信咨询：Why15236444193 [如果加微信未能及时回复，请多多包涵哈！]
// @author       yyy404
// @match        *://*/*
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_openInTab
// @require      https://cdn.jsdelivr.net/npm/sweetalert2@11
// @run-at       document-start
// @icon         https://cdn.jsdmirror.com/gh/whyyy-404/icon@main/Collection/Cartoon/bear-yes.gif
// ==/UserScript==
/*
　　　┏┓　　　┏┓
 　 ┏┛┻━━━━━━┛ ┻┓
　　┃　　　　　  ┃
　　┃　　　━　　 ┃
　　┃　┳┛　┗┳　 ┃
　　┃　　　　　　┃
　　┃　　　┻　　 ┃
　　┃　　　　　　┃
　　┗━━━┓　　　┏━┛Codes are far away from bugs with the animal protecting
　　　　┃　　　┃    神兽保佑,代码无bug
　　　　┃　　　┃
　　　　┃　　　┗━━━┓
　　　　┃　　　　　 ┣┓
　　　　┃　　　　 ┏┛
　　　　┗┓┓┏━┳┓┏┛
　　　　　┃┫┫　┃┫┫
　　　　　┗┻┛　┗┻┛
*/

(function() {
    'use strict';

    // ===== 防止在iframe中重复执行 =====
    if (window.self !== window.top) {
        console.log('VIP解析脚本：检测到iframe环境，跳过执行');
        return;
    }

    const parseApis = [
        {"name": "默认A", "type": "1,3", "url": "https://json.fongmi.cc/web?url=", "recommended": true},
        {"name": "TXNQ", "type": "1,3", "url": "https://bfq.txnp.cn/player?url=", "recommended": true},
        {"name": "七七云", "type": "1,3", "url": "https://jx.77flv.cc/?url="},
        {"name": "虾米", "type": "1,3", "url": "https://jx.xmflv.cc/?url="},
        {"name": "虾米2", "type": "1,3", "url": "https://jx.xmflv.com/?url="},
        {"name": "HLS", "type": "1,3", "url": "https://jx.hls.one/?url="},
        {"name": "七哥", "type": "1,3", "url": "https://jx.202617.xyz/tv.php?url="},
        {"name": "七哥旧", "type": "1,3", "url": "https://jx.nnxv.cn/tv.php?url="},
        {"name": "冰豆", "type": "1,3", "url": "https://bd.jx.cn/?url="},
        {"name": "playm3u8", "type": "1,3", "url": "https://www.playm3u8.cn/jiexi.php?url="},
        {"name": "CK", "type": "1,3", "url": "https://www.ckplayer.vip/jiexi/?url="},
        {"name": "剖元", "type": "1,3", "url": "https://www.pouyun.com/?url="},
        {"name": "爱豆", "type": "1,3", "url": "https://jx.aidouer.net/?url="},
        {"name": "M3U8", "type": "1,3", "url": "https://jx.m3u8.tv/jiexi/?url="},
        {"name": "8090", "type": "1,3", "url": "https://www.8090g.cn/?url="},
        {"name": "极速", "type": "1,3", "url": "https://jx.2s0.cn/player/?url="},
        {"name": "Player-JY", "type": "1,3", "url": "https://jx.playerjy.com/?url="},
        {"name": "芒果TV1", "type": "1,3", "url": "https://video.isyour.love/player/getplayer?url="},
        {"name": "M1907", "type": "1,2,3", "url": "https://im1907.top/?jx="},
        {"name": "Yparse", "type": "1,2,3", "url": "https://jx.yparse.com/index.php?url="},
        {"name": "默认B", "type": "1,3", "url": "https://super.playr.top/?url=", "recommended": true},
        {"name": "789", "type": "1,3", "url": "https://jiexi.789jiexi.icu:4433/?url="},
        {"name": "Node", "type": "1,3", "url": "https://jx.nodenode.dpdns.org/?url="},
        {"name": "937", "type": "1,3", "url": "https://bfq.937auth.vip?url="},
        {"name": "973", "type": "1,3", "url": "https://jx.973973.xyz/?url="},
        {"name": "花旗", "type": "1,3", "url": "https://www.huaqi.live/?url="},
        {"name": "麒麟", "type": "3", "url": "https://rdfplayer.mrgaocloud.com/player/?url="},
        {"name": "B站1", "type": "1,3", "url": "https://jx.jsonplayer.com/player/?url="},
        {"name": "BL", "type": "1,3", "url": "https://vip.bljiex.com/?v="},
        {"name": "百域", "type": "1,3", "url": "https://jx.618g.com/?url="},
        {"name": "CHok", "type": "1,3", "url": "https://www.gai4.com/?url="},
        {"name": "ckmov", "type": "1,3", "url": "https://www.ckmov.vip/api.php?url="},
        {"name": "H8", "type": "1,3", "url": "https://www.h8jx.com/jiexi.php?url="},
        {"name": "通用", "type": "1,3", "url": "https://ckmov.ccyjjd.com/ckmov/?url="},
        {"name": "la", "type": "1,3", "url": "https://api.jiexi.la/?url="},
        {"name": "老板", "type": "1,3", "url": "https://vip.laobandq.com/jiexi.php?url="},
        {"name": "MAO", "type": "1,3", "url": "https://www.mtosz.com/m3u8.php?url="},
        {"name": "诺讯", "type": "1,3", "url": "https://www.nxflv.com/?url="},
        {"name": "OK", "type": "1,3", "url": "https://okjx.cc/?url="},
        {"name": "盘古", "type": "1,3", "url": "https://www.pangujiexi.cc/jiexi.php?url="},
        {"name": "RDHK", "type": "1,3", "url": "https://jx.rdhk.net/?v="},
        {"name": "人人迷", "type": "1,3", "url": "https://jx.blbo.cc:4433/?url="},
        {"name": "思云", "type": "1,3", "url": "https://jx.ap2p.cn/?url="},
        {"name": "思古3", "type": "1,3", "url": "https://jsap.attakids.com/?url="},
        {"name": "听乐", "type": "1,3", "url": "https://jx.dj6u.com/?url="},
        {"name": "维多", "type": "1,3", "url": "https://jx.ivito.cn/?url="},
        {"name": "YT", "type": "1,3", "url": "https://jx.yangtu.top/?url="},
        {"name": "云端", "type": "1,3", "url": "https://sb.5gseo.net/?url="},
        {"name": "0523", "type": "1,3", "url": "https://go.yh0523.cn/y.cy?url="},
        {"name": "17云", "type": "1,3", "url": "https://www.1717yun.com/jx/ty.php?url="},
        {"name": "180", "type": "1,3", "url": "https://jx.000180.top/jx/?url="},
        {"name": "4K", "type": "1,3", "url": "https://jx.4kdv.com/?url="},
        {"name": "全民", "type": "1,3", "url": "https://43.240.74.102:4433?url="},
        {"name": "夜幕", "type": "1,3", "url": "https://www.yemu.xyz/?url="},
    ];

    const uniqueApis = [];
    const seenUrls = new Set();
    parseApis.forEach(api => {
        if (!seenUrls.has(api.url)) {
            seenUrls.add(api.url);
            uniqueApis.push(api);
        }
    });

    let customApis = GM_getValue("custom_parse_apis", []);
    let allApis = [...uniqueApis, ...customApis];

    const vipBoxId = 'vip_jx_box_' + Math.ceil(Math.random() * 100000000);

    const VIP_ICON_CDN = 'https://cdn.jsdmirror.com/gh/whyyy-404/icon@main/Collection/Cartoon';
    const VIP_ICON_GIF = {
        idle: `${VIP_ICON_CDN}/bear-idle.gif`,
        drag: `${VIP_ICON_CDN}/bear-drag.gif`,
        autoOff: `${VIP_ICON_CDN}/bear-auto-off.gif`,
        autoOn: `${VIP_ICON_CDN}/bear-auto-on.gif`,
        notice: `${VIP_ICON_CDN}/notice.gif`
    };
    const VIP_MAIN_ICON_SIZE = 72;
    const VIP_FLOAT_ICON_SIZE = 56;
    const VIP_USAGE_HTML = `
        <div id="vip-usage-desc" style="text-align:left;color:#FFF;font-size:10px;padding:0px 10px;margin-top:10px;">
            <b>📖 使用说明：</b>
            <br>&nbsp;&nbsp;1、<b>自定义设置</b>：VIP 面板「自定义设置」里可改样式、快捷键、接口等
            <br>&nbsp;&nbsp;2、<b>解析视频</b>：点击内嵌接口解析（优先试「默认A」「TXNQ」「七七云」等靠前接口）
            <br>&nbsp;&nbsp;3、<b>播放模式</b>：点击接口右侧「内嵌/弹窗」可切换
            <br>&nbsp;&nbsp;4、<b>解析切集后</b>：换集后旧播放器会关闭，开自动解析则自动解析新集
            <br>&nbsp;&nbsp;5、<b>自动解析</b>：先在「自动解析设置」选接口，再点发呆熊/跳熊浮标开关
            <br>&nbsp;&nbsp;6、<b>快捷键</b>：Alt+V 呼出/隐藏，Alt+R 刷新接口，Alt+S 样式设置
            <br>&nbsp;&nbsp;7、<b>关闭解析</b>：点击播放器右上角 × 刷新页面恢复原视频（手机端点浮标即可开关面板）
        </div>`;

    function updateAutoSwitchIcon(enabled, apiName) {
        const autoBtn = DOM_CACHE.vipBox && DOM_CACHE.vipBox.querySelector('#vip_auto');
        const autoImg = autoBtn && autoBtn.querySelector('#vip_auto_img');
        if (autoImg) {
            autoImg.src = enabled ? VIP_ICON_GIF.autoOn : VIP_ICON_GIF.autoOff;
        }
        if (autoBtn) {
            autoBtn.title = enabled
                ? (apiName ? `自动解析已开启：${apiName}（点击关闭）` : '自动解析已开启（点击关闭）')
                : '点击开启自动解析（需先在自动解析设置中选择接口）';
        }
    }

    // 播放器容器配置
    const PLAYER_CONTAINERS = [
        {
            host: "v.qq.com",
            container: "#mod_player,#player-container,.container-player",
            displayNodes: ["#mask_layer", ".mod_vip_popup", "#mask_layer", ".panel-tip-pay"]
        },
        {
            host: "m.v.qq.com",
            container: ".mod_player,#player",
            displayNodes: [".mod_vip_popup", "[class^=app_],[class^=app-],[class*=_app_],[class*=-app-],[class$=_app],[class$=-app]", "div[dt-eid=open_app_bottom]", "div.video_function.video_function_new", "a[open-app]", "section.mod_source", "section.mod_box.mod_sideslip_h.mod_multi_figures_h,section.mod_sideslip_privileges,section.mod_game_rec"]
        },
        {host: "w.mgtv.com", container: "#mgtv-player-wrap", displayNodes: []},
        {host: "www.mgtv.com", container: "#mgtv-player-wrap", displayNodes: []},
        {
            host: "m.mgtv.com",
            container: ".video-area",
            displayNodes: ["div.adFixedContain,div.ad-banner,div.m-list-graphicxcy.fstp-mark", "div[class^=mg-app],div#comment-id.video-comment div.ft,div.bd.clearfix,div.v-follower-info", "div.ht.mgui-btn.mgui-btn-nowelt", "div.personal", "div[data-v-41c9a64e]"]
        },
        {host: "www.bilibili.com", container: "#player_module,#bilibiliPlayer,#bilibili-player", displayNodes: []},
        {host: "m.bilibili.com", container: ".player-wrapper,.player-container,.mplayer", displayNodes: []},
        {
            host: "www.iqiyi.com",
            container: "#outlayer,.iqp-player-videolayer,.m-video-player-wrap",
            displayNodes: ["#playerPopup", "#vipCoversBox", "div.iqp-player-vipmask", "div.iqp-player-paymask", "div.iqp-player-loginmask", "div[class^=qy-header-login-pop]", ".covers_cloudCover__ILy8R", "#videoContent > div.loading_loading__vzq4j", ".iqp-player-guide", ".defaultController_playCtrl__Smes8", ".tips_textsBackImg__svIhR", "[class*='defaultController']", "[class*='player-buttons']", "[class*='tips_']", ".qy-player-controller", ".qy-player-tips", "[class*='danmu']", "[class*='Danmu']", ".iqp-danmu", ".qy-player-danmu", "[class*='barrage']", ".XPlayer_heatMapContainer__17MIj", ".progressBar_container__0x13u", ".XPlayer_bottom__xzRnb", "div.m-iqyGuide-layer", "a[down-app-android-url]", ".loading_loading__vzq4j", "[name=m-extendBar]", "[class*=ChannelHomeBanner]", "section.m-hotWords-bottom"]
        },
        {
            host: "m.iqiyi.com",
            container: ".m-video-player-wrap, .iqp-player-videolayer",
            displayNodes: ["div.m-iqyGuide-layer", "a[down-app-android-url]", "div.iqp-player-vipmask", ".loading_loading__vzq4j", "[name=m-extendBar]", "[class*=ChannelHomeBanner]", "section.m-hotWords-bottom"]
        },
        {host: "www.iq.com", container: ".intl-video-wrap", displayNodes: []},
        {
            host: "v.youku.com",
            container: "#ykPlayer,#playerMouseWheel,.h5-detail-player",
            displayNodes: ["#iframaWrapper", "#video_side_cashier", ".secondary-container.video_side_cashier_wrapper", ".advertise-layer", ".youku-advertise-layer", "#youku-advertise", "#player-advertise", ".advertise-youku-tips", ".preloading-layer", ".preplay-layer", ".kui-preloading-layer-0", ".kui-layer-0", ".kui-preloadinglayer-preloading-animation", ".kui-preplaylayer-preplay-background", ".kui-dashboard-timer-container", ".kui-dashboard-bar-container", ".kui-dashboard-dashboard-panel", "#youku-dashboard > div.kui-dashboard-dashboard-panel", "#youku-dashboard > div.kui-dashboard-dashboard-background", "#youku-dashboard > div.kui-dashboard-bar-container", "#youku-dashboard > div.kui-dashboard-timer-container"]
        },
        {host: "m.youku.com", container: "#playerMouseWheel,.h5-detail-player", displayNodes: []},
        {host: "tv.sohu.com", container: "#player", displayNodes: []},
        {host: "film.sohu.com", container: "#playerWrap", displayNodes: []},
        {host: "www.le.com", container: "#le_playbox", displayNodes: []},
        {host: "video.tudou.com", container: ".td-playbox", displayNodes: []},
        {host: "v.pptv.com", container: "#pptv_playpage_box", displayNodes: []},
        {host: "vip.pptv.com", container: ".w-video", displayNodes: []},
        {host: "www.wasu.cn", container: "#flashContent", displayNodes: []},
        {host: "www.acfun.cn", container: "#player", displayNodes: []},
        {host: "www.1905.com", container: "#player,#vodPlayer", displayNodes: []},
        {host: "vip.1905.com", container: "#player,#vodPlayer", displayNodes: []},
    ];
    const DEFAULT_STYLE = {
        bgColor: '#3f4149',
        fontColor: '#DCDCDC',
        opacity: 0.95,
        width: '380px'
    };
    const DEFAULT_SHORTCUT = {
        toggle: 'v',
        refresh: 'r',
        style: 's'
    };
    // 样式/快捷键/面板位置/自动解析等全网共用同一套 GM 键；手动解析标记仍按站点隔离，避免多标签页互相干扰
    const VIP_STORAGE_GLOBAL = "404vip_jx_global";
    const shortcutStorageKey = "vip_custom_shortcut_" + VIP_STORAGE_GLOBAL;
    const CONFIG = {
        vipBoxId: vipBoxId,
        autoPlayerKey: "auto_player_key_" + VIP_STORAGE_GLOBAL,
        autoPlayerVal: "auto_player_value_" + VIP_STORAGE_GLOBAL,
        flag: "flag_vip_" + window.location.host.replace(/[^a-z0-9.-]/gi, "_"),
        panelPosKey: "vip_panel_pos_" + VIP_STORAGE_GLOBAL,
        customStyleKey: "vip_custom_style_" + VIP_STORAGE_GLOBAL,
        customShortcutKey: shortcutStorageKey,
        shortcut: GM_getValue(shortcutStorageKey, DEFAULT_SHORTCUT)
    };

    (function migratePerHostPrefsToGlobal() {
        const h = window.location.host;
        const tryCopy = (newKey, oldPrefix) => {
            const oldKey = oldPrefix + h;
            if (GM_getValue(newKey) === undefined && GM_getValue(oldKey) !== undefined) {
                GM_setValue(newKey, GM_getValue(oldKey));
            }
        };
        tryCopy(CONFIG.customStyleKey, "vip_custom_style_");
        tryCopy(CONFIG.customShortcutKey, "vip_custom_shortcut_");
        tryCopy(CONFIG.panelPosKey, "vip_panel_pos_");
        tryCopy(CONFIG.autoPlayerKey, "auto_player_key_");
        tryCopy(CONFIG.autoPlayerVal, "auto_player_value_");
    })();

    const DOM_CACHE = {
        vipBox: null,
        vipList: null,
        vipTab: null,
        donateTab: null,
        simpleApiList: null,
        complexApiList: null,
        addApiForm: null,
        styleSetPanel: null,
        shortcutSetPanel: null,
        autoParseSetPanel: null,
        noticePanel: null,
        apiNameInput: null,
        apiUrlInput: null,
        apiTypeSelect: null
    };

    // 全局播放器控制
    let lastPageUrl = window.location.href;

    GM_addStyle(`
        #${CONFIG.vipBoxId} {
            cursor: pointer;
            position: fixed;
            top: 120px;
            left: 0px;
            z-index: 2147483647;
            text-align: left;
            transition: left 0.3s ease;
        }
        #${CONFIG.vipBoxId}.visible {
            left: 0px;
        }
        #${CONFIG.vipBoxId} .img_box {
            width: 32px;
            height: 32px;
            line-height: 32px;
            text-align: center;
            background-color: lightgreen;
            margin: 6px 0px;
            color: white;
            font-size: 16px;
            font-weight: bold;
            border-radius: 5px;
        }
        #${CONFIG.vipBoxId} .vip_icon > .img_box {
            width: ${VIP_MAIN_ICON_SIZE}px;
            height: ${VIP_MAIN_ICON_SIZE}px;
            line-height: 0;
            background-color: transparent;
            border-radius: 8px;
            overflow: hidden;
            padding: 0;
            margin-top: 0;
            touch-action: none;
        }
        #${CONFIG.vipBoxId} .vip_float_btn {
            width: ${VIP_FLOAT_ICON_SIZE}px;
            height: ${VIP_FLOAT_ICON_SIZE}px;
            line-height: 0;
            background-color: transparent;
            border-radius: 8px;
            overflow: hidden;
            padding: 0;
            touch-action: none;
        }
        #${CONFIG.vipBoxId} #vip_icon_img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center 58%;
            transform: scale(1.14);
            display: block;
            pointer-events: none;
            user-select: none;
        }
        #${CONFIG.vipBoxId} #vip_auto_img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: 30% center;
            transform: scale(1.22);
            display: block;
            pointer-events: none;
            user-select: none;
        }
        #${CONFIG.vipBoxId} #vip_notice_img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center;
            transform: scale(1.1);
            display: block;
            pointer-events: none;
            user-select: none;
        }
        #${CONFIG.vipBoxId} .vip_list {
            display: none;
            position: absolute;
            border-radius: 5px;
            left: ${VIP_MAIN_ICON_SIZE}px;
            top: 0;
            text-align: center;
            border: 1px solid white;
            padding: 10px 0px;
            max-height: 80vh;
            overflow-y: auto;
            opacity: 0;
            transform: translateX(-10px);
            transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
        }
        #${CONFIG.vipBoxId} .vip_list.visible {
            display: block;
            opacity: 1;
            transform: translateX(0);
        }
        #${CONFIG.vipBoxId} .vip_list ul {
            padding-left: 10px;
            margin: 0;
        }
        #${CONFIG.vipBoxId} .vip_list li {
            border-radius: 2px;
            font-size: 12px;
            text-align: center;
            width: calc(25% - 14px);
            line-height: 21px;
            float: left;
            border: 1px solid gray;
            padding: 0 4px;
            margin: 4px 2px;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            -o-text-overflow: ellipsis;
            opacity: 0;
            transform: translateY(10px);
            cursor: pointer;
        }
        #${CONFIG.vipBoxId} .vip_list.visible li {
            opacity: 1;
            transform: translateY(0);
            transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1) 0.1s;
        }
        #${CONFIG.vipBoxId} .complex-api-list li {
            width: calc(50% - 14px);
        }
        #${CONFIG.vipBoxId} .vip_list li:hover {
            background: rgba(28, 132, 198, 0.15) !important;
            border: 1px solid #1c84c6 !important;
        }
        #${CONFIG.vipBoxId} .vip_list::-webkit-scrollbar {
            width: 5px;
            height: 1px;
        }
        #${CONFIG.vipBoxId} .vip_list::-webkit-scrollbar-thumb {
            box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
            background: #A8A8A8;
        }
        #${CONFIG.vipBoxId} .vip_list::-webkit-scrollbar-track {
            box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
            background: #F1F1F1;
        }
        #${CONFIG.vipBoxId} li.selected {
            background: #075985 !important;
            color: #ffffff !important;
            border: 1px solid #7dd3fc !important;
        }
        @media (max-width: 768px) {
            #${CONFIG.vipBoxId} .vip_list {
                width: calc(100vw - 88px) !important;
                max-width: 380px;
                max-height: 70vh;
                box-sizing: border-box;
            }
            #${CONFIG.vipBoxId} .vip_list li {
                width: calc(50% - 14px) !important;
                font-size: 13px;
                line-height: 26px;
            }
        }
        #${CONFIG.vipBoxId} #vip_auto {
            background-color: transparent;
        }
        #${CONFIG.vipBoxId} .vip_notice_panel {
            display: none;
            position: absolute;
            left: ${VIP_MAIN_ICON_SIZE}px;
            bottom: 0;
            width: 380px;
            max-width: calc(100vw - ${VIP_MAIN_ICON_SIZE + 20}px);
            max-height: 70vh;
            overflow-y: auto;
            border-radius: 8px;
            border: 1px solid white;
            padding: 10px;
            box-sizing: border-box;
            z-index: 1;
        }
        #${CONFIG.vipBoxId} .vip_notice_panel.visible {
            display: block;
        }
        #${CONFIG.vipBoxId} .vip_notice_panel #donate_section {
            opacity: 1;
            transform: none;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #555;
        }
        #${CONFIG.vipBoxId} #add_api_btn, #${CONFIG.vipBoxId} #open-style-set-btn, #${CONFIG.vipBoxId} #open-shortcut-set-btn, #${CONFIG.vipBoxId} #open-auto-parse-set-btn {
            background-color: #36383f;
            color: #ccc;
            border: 1px solid #5a5a5a;
            font-size: 12px;
            width: auto;
            padding: 6px 12px;
            margin-top: 5px;
            border-radius: 3px;
            cursor: pointer;
            margin-left: 5px;
        }
        #${CONFIG.vipBoxId} #add_api_btn:hover, #${CONFIG.vipBoxId} #open-style-set-btn:hover, #${CONFIG.vipBoxId} #open-shortcut-set-btn:hover, #${CONFIG.vipBoxId} #open-auto-parse-set-btn:hover {
            background-color: #42444a;
        }
        .mode-toggle {
            cursor: pointer;
            margin-left: 2px;
        }
        .section-title {
            font-weight: bold;
            font-size: 14px;
            padding: 5px 0px;
            clear: both;
            opacity: 0;
            transform: translateY(10px);
        }
        #${CONFIG.vipBoxId} .vip_list.visible .section-title {
            opacity: 1;
            transform: translateY(0);
            transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1) 0.05s;
        }
        #${CONFIG.vipBoxId} #donate_section {
            clear: both;
            margin-top: 10px;
            padding: 10px;
            text-align: center !important;
            border-top: 1px solid #555;
            opacity: 0;
            transform: translateY(10px);
        }
        #${CONFIG.vipBoxId} .vip_list.visible #donate_section {
            opacity: 1;
            transform: translateY(0);
            transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1) 0.15s;
        }
        #${CONFIG.vipBoxId} #donate_section .donate-title {
            font-size: 12px;
            margin-bottom: 5px;
        }
        #${CONFIG.vipBoxId} #qr-code-img {
            max-width: 100px;
            max-height: 100px;
            margin: 5px auto 0 auto !important;
            border: 1px solid #ddd;
            background: white;
            display: block !important;
        }
        #${CONFIG.vipBoxId} .tab-header {
            display: flex;
        }
        #${CONFIG.vipBoxId} .tab-button {
            flex: 1;
            padding: 5px 0;
            border: none;
            cursor: pointer;
            outline: none;
            font-size: 12px;
            background: none;
        }
        #${CONFIG.vipBoxId} .tab-button.active {
            font-weight: bold;
            color: #1c84c6 !important;
        }
        #${CONFIG.vipBoxId} .tab-divider {
            width: 1px;
            background-color: #5a5a5a;
            margin: 5px 0;
        }
        #${CONFIG.vipBoxId} .tab-content {
            display: none;
        }
        #${CONFIG.vipBoxId} .tab-content.active {
            display: block;
        }
        #${CONFIG.vipBoxId} .add-api-form {
            padding: 10px;
            border-radius: 4px;
            margin: 10px;
            display: none;
        }
        #${CONFIG.vipBoxId} .add-api-form input,
        #${CONFIG.vipBoxId} .add-api-form select,
        #vip-style-set-panel input,
        #vip-shortcut-set-panel input,
        #vip-auto-parse-set-panel select {
            width: 100%;
            padding: 6px;
            margin: 5px 0;
            border-radius: 3px;
            border: 1px solid #5a5a5a;
            background-color: #2c2e34;
            color: #ccc;
        }
        #${CONFIG.vipBoxId} .add-api-form button {
            padding: 8px 12px;
            margin: 5px 2px;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            background-color: #1c84c6;
            color: white;
            font-size: 12px;
        }
        #${CONFIG.vipBoxId} .add-api-form .cancel-btn {
            background-color: #72747a;
        }
        #vip-style-set-panel, #vip-shortcut-set-panel, #vip-auto-parse-set-panel {
            padding: 10px;
            margin: 10px;
            border-top: 1px solid #555;
            display: none;
        }
        #vip-style-set-panel .style-item, #vip-shortcut-set-panel .shortcut-item, #vip-auto-parse-set-panel .auto-parse-item {
            display: flex;
            align-items: center;
            margin: 8px 0;
            gap: 8px;
        }
        #vip-style-set-panel .style-item label, #vip-shortcut-set-panel .shortcut-item label, #vip-auto-parse-set-panel .auto-parse-item label {
            font-size: 12px;
            width: 80px;
            text-align: left;
        }
        #vip-style-set-panel .style-item input, #vip-shortcut-set-panel .shortcut-item input, #vip-auto-parse-set-panel .auto-parse-item select {
            flex: 1;
            padding: 4px;
        }
        #vip-style-set-panel button,
        #vip-shortcut-set-panel button,
        #vip-auto-parse-set-panel button {
            width: 40%;
            padding: 8px 12px;
            margin: 5px 1%;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            display: inline-block;
        }
        #reset-style-btn, #reset-shortcut-btn, #disable-auto-parse-btn {
            background: #ff69b4 !important;
            color: white !important;
        }
        #save-auto-parse-btn, #save-shortcut-btn, #save-style-btn {
            background: #1c84c6 !important;
            color: white !important;
        }
        .shortcut-tip {
            font-size: 10px;
            color: #ccc;
            margin-top: 5px;
            text-align: left;
            line-height: 1.4;
        }

        /* 播放器控制按钮样式 */
        .vip-player-close-btn {
            position: absolute;
            top: 15px;
            right: 15px;
            width: auto;
            height: auto;
            padding: 5px 10px;
            background: transparent;
            border: none;
            cursor: pointer;
            font-size: 32px;
            color: rgba(255, 255, 255, 0.8);
            transition: all 0.3s ease;
            opacity: 1;
            text-shadow: 0 2px 4px rgba(0,0,0,0.5);
            pointer-events: auto;
        }
        .vip-player-close-btn:hover {
            color: rgba(255, 255, 255, 1);
            transform: scale(1.2);
        }
        .vip-player-close-btn.hidden {
            opacity: 0;
            pointer-events: none;
        }
    `);

    function findTargetElement(targetContainer) {
        const body = window.document;
        let tabContainer;
        let tryTime = 0;
        const maxTryTime = 120;
        let startTimestamp;
        return new Promise((resolve, reject) => {
            function tryFindElement(timestamp) {
                if (!startTimestamp) {
                    startTimestamp = timestamp;
                }
                const elapsedTime = timestamp - startTimestamp;
                if (elapsedTime >= 500) {
                    tabContainer = body.querySelector(targetContainer);
                    if (tabContainer) {
                        resolve(tabContainer);
                    } else if (++tryTime === maxTryTime) {
                        reject();
                    } else {
                        startTimestamp = timestamp;
                    }
                }
                if (!tabContainer && tryTime < maxTryTime) {
                    requestAnimationFrame(tryFindElement);
                }
            }
            requestAnimationFrame(tryFindElement);
        });
    }

    function encodeVideoUrl(url) {
        if (!url) return '';
        return encodeURIComponent(url).replace(/%20/g, '+');
    }

    function buildApiListsHtml() {
        let simpleApisHtml = "<div class='section-title'>[内嵌播放+弹窗无选集]</div><ul class='simple-api-list'>";
        let complexApisHtml = "<div class='section-title'>[弹窗带选集]</div><ul class='complex-api-list'>";

        allApis.forEach((item, index) => {
            const types = item.type.split(',');
            const name = item.name;
            if (types.includes("1") || types.includes("3")) {
                if ((types.includes("1") || types.includes("3")) && !types.includes("2")) {
                    if (types.includes("1") && types.includes("3")) {
                        simpleApisHtml += `<li class="api-item combined-simple" data-index="${index}" data-modes="1,3" data-current-mode="1" title="${name}">${name} | <span class="mode-toggle">内嵌</span></li>`;
                    } else if (types.includes("1")) {
                        simpleApisHtml += `<li class="api-item" data-index="${index}" data-mode="1" title="${name}">${name} | 内嵌</li>`;
                    } else if (types.includes("3")) {
                        simpleApisHtml += `<li class="api-item" data-index="${index}" data-mode="3" title="${name}">${name} | 弹窗</li>`;
                    }
                }
                if (types.includes("1") && types.includes("2") && types.includes("3")) {
                    simpleApisHtml += `<li class="api-item combined-simple" data-index="${index}" data-modes="1,3" data-current-mode="1" title="${name}">${name} | <span class="mode-toggle">内嵌</span></li>`;
                }
            }
            if (types.includes("2")) {
                complexApisHtml += `<li class="api-item" data-index="${index}" data-mode="2" title="${name}">${name}</li>`;
            }
        });
        simpleApisHtml += "<div style='clear:both;'></div></ul>";
        complexApisHtml += "<div style='clear:both;'></div></ul>";
        return { simpleApisHtml, complexApisHtml };
    }

    function renderApiLists() {
        if (!DOM_CACHE.vipTab) return;
        const { simpleApisHtml, complexApisHtml } = buildApiListsHtml();
        DOM_CACHE.vipTab.innerHTML = simpleApisHtml + complexApisHtml;
        DOM_CACHE.simpleApiList = DOM_CACHE.vipTab.querySelector('.simple-api-list');
        DOM_CACHE.complexApiList = DOM_CACHE.vipTab.querySelector('.complex-api-list');
        applyPanelStyle();
    }

    function applyPanelStyle(style = null) {
        const customStyle = style || GM_getValue(CONFIG.customStyleKey, DEFAULT_STYLE);
        if (!DOM_CACHE.vipList) return;
        const fontColor = customStyle.fontColor;
        const bgColor = customStyle.bgColor;

        // 应用背景色和字体色
        DOM_CACHE.vipList.style.backgroundColor = bgColor;
        DOM_CACHE.vipList.style.color = fontColor;
        DOM_CACHE.vipList.style.opacity = customStyle.opacity;
        DOM_CACHE.vipList.style.width = customStyle.width;

        // 应用到所有子元素
        DOM_CACHE.vipList.querySelectorAll('.section-title').forEach(el => {
            el.style.color = fontColor;
        });

        DOM_CACHE.vipList.querySelectorAll('.api-item').forEach(el => {
            el.style.color = fontColor;
            el.style.borderColor = 'rgba(128,128,128,0.5)';
        });

        DOM_CACHE.vipList.querySelectorAll('.mode-toggle').forEach(el => {
            el.style.color = '#1c84c6';
        });

        DOM_CACHE.vipList.querySelectorAll('.tab-button').forEach(el => {
            if (!el.classList.contains('active')) {
                el.style.color = fontColor;
            }
        });

        DOM_CACHE.vipList.querySelectorAll('.tab-header').forEach(el => {
            el.style.backgroundColor = bgColor;
        });

        DOM_CACHE.vipList.querySelectorAll('#donate_section').forEach(el => {
            el.style.color = fontColor;
        });

        DOM_CACHE.vipList.querySelectorAll('.add-api-form').forEach(el => {
            el.style.backgroundColor = bgColor;
        });

        // 应用到样式设置面板
        if (DOM_CACHE.styleSetPanel) {
            DOM_CACHE.styleSetPanel.style.backgroundColor = bgColor;
            DOM_CACHE.styleSetPanel.style.color = fontColor;
        }

        // 应用到快捷键设置面板
        if (DOM_CACHE.shortcutSetPanel) {
            DOM_CACHE.shortcutSetPanel.style.backgroundColor = bgColor;
            DOM_CACHE.shortcutSetPanel.style.color = fontColor;
        }

        // 应用到自动解析设置面板
        if (DOM_CACHE.autoParseSetPanel) {
            DOM_CACHE.autoParseSetPanel.style.backgroundColor = bgColor;
            DOM_CACHE.autoParseSetPanel.style.color = fontColor;
        }

        if (DOM_CACHE.noticePanel) {
            DOM_CACHE.noticePanel.style.backgroundColor = bgColor;
            DOM_CACHE.noticePanel.style.color = fontColor;
            DOM_CACHE.noticePanel.style.opacity = customStyle.opacity;
            DOM_CACHE.noticePanel.querySelectorAll('#vip-usage-desc, #donate_section').forEach(el => {
                el.style.color = fontColor;
            });
        }

        GM_setValue(CONFIG.customStyleKey, customStyle);
    }

    function createStyleSetPanel() {
        if (DOM_CACHE.styleSetPanel) return;
        const customStyle = GM_getValue(CONFIG.customStyleKey, DEFAULT_STYLE);
        const panel = document.createElement('div');
        panel.id = 'vip-style-set-panel';
        panel.innerHTML = `
            <div class="style-item">
                <label>面板背景色：</label>
                <input type="color" id="style-bgcolor" value="${customStyle.bgColor}">
            </div>
            <div class="style-item">
                <label>文字颜色：</label>
                <input type="color" id="style-fontcolor" value="${customStyle.fontColor}">
            </div>
            <div class="style-item">
                <label>面板透明度：</label>
                <input type="range" id="style-opacity" min="0.5" max="1" step="0.05" value="${customStyle.opacity}">
            </div>
            <div class="style-item">
                <label>面板宽度：</label>
                <input type="text" id="style-width" placeholder="如380px" value="${customStyle.width}">
            </div>
            <div class="shortcut-tip" style="margin-top:8px;font-size:11px;color:#aaa;">说明：保存后对所有视频网站页面生效（全网统一）。</div>
            <div style="text-align: center; margin-top: 10px;">
                <button id="save-style-btn">保存</button>
                <button id="reset-style-btn" type="button">恢复默认</button>
            </div>
        `;
        DOM_CACHE.donateTab.appendChild(panel);
        DOM_CACHE.styleSetPanel = panel;

        // 实时预览功能
        panel.querySelector('#style-bgcolor').addEventListener('input', (e) => {
            applyPanelStyle({
                ...GM_getValue(CONFIG.customStyleKey, DEFAULT_STYLE),
                bgColor: e.target.value
            });
        });
        panel.querySelector('#style-fontcolor').addEventListener('input', (e) => {
            applyPanelStyle({
                ...GM_getValue(CONFIG.customStyleKey, DEFAULT_STYLE),
                fontColor: e.target.value
            });
        });
        panel.querySelector('#style-opacity').addEventListener('input', (e) => {
            applyPanelStyle({
                ...GM_getValue(CONFIG.customStyleKey, DEFAULT_STYLE),
                opacity: e.target.value
            });
        });
        panel.querySelector('#style-width').addEventListener('blur', (e) => {
            if (!e.target.value) return;
            applyPanelStyle({
                ...GM_getValue(CONFIG.customStyleKey, DEFAULT_STYLE),
                width: e.target.value
            });
        });

        // 保存按钮
        panel.querySelector('#save-style-btn').addEventListener('click', () => {
            const bgColor = panel.querySelector('#style-bgcolor').value;
            const fontColor = panel.querySelector('#style-fontcolor').value;
            const opacity = panel.querySelector('#style-opacity').value;
            const width = panel.querySelector('#style-width').value;

            const newStyle = { bgColor, fontColor, opacity, width };
            GM_setValue(CONFIG.customStyleKey, newStyle);
            applyPanelStyle(newStyle);

            Swal.fire({
                title: '保存成功',
                text: '样式设置已保存',
                icon: 'success',
                toast: true,
                position: 'center',
                timer: 1500,
                showConfirmButton: false
            });
        });

        // 恢复默认（写回 GM，全站生效）
        panel.querySelector('#reset-style-btn').addEventListener('click', () => {
            GM_setValue(CONFIG.customStyleKey, DEFAULT_STYLE);
            applyPanelStyle(DEFAULT_STYLE);
            panel.querySelector('#style-bgcolor').value = DEFAULT_STYLE.bgColor;
            panel.querySelector('#style-fontcolor').value = DEFAULT_STYLE.fontColor;
            panel.querySelector('#style-opacity').value = DEFAULT_STYLE.opacity;
            panel.querySelector('#style-width').value = DEFAULT_STYLE.width;

            Swal.fire({
                title: '已恢复默认',
                text: '样式已恢复为默认并已保存（所有网站共用）',
                icon: 'success',
                toast: true,
                position: 'center',
                timer: 2000,
                showConfirmButton: false
            });
        });
    }

    function createShortcutSetPanel() {
        if (DOM_CACHE.shortcutSetPanel) return;
        const customShortcut = GM_getValue(CONFIG.customShortcutKey, DEFAULT_SHORTCUT);
        const panel = document.createElement('div');
        panel.id = 'vip-shortcut-set-panel';
        panel.innerHTML = `
            <div class="shortcut-item">
                <label>呼出/隐藏面板：</label>
                <input type="text" id="shortcut-toggle" maxlength="1" value="${customShortcut.toggle}">
            </div>
            <div class="shortcut-item">
                <label>刷新解析接口：</label>
                <input type="text" id="shortcut-refresh" maxlength="1" value="${customShortcut.refresh}">
            </div>
            <div class="shortcut-item">
                <label>打开样式设置：</label>
                <input type="text" id="shortcut-style" maxlength="1" value="${customShortcut.style}">
            </div>
            <div class="shortcut-tip">提示：仅支持单字母/数字，使用方式为 Alt + 自定义键</div>
            <div style="text-align: center; margin-top: 10px;">
                <button id="save-shortcut-btn">保存</button>
                <button id="reset-shortcut-btn">重置</button>
            </div>
        `;
        DOM_CACHE.donateTab.appendChild(panel);
        DOM_CACHE.shortcutSetPanel = panel;
        panel.querySelector('#save-shortcut-btn').addEventListener('click', () => {
            const toggle = panel.querySelector('#shortcut-toggle').value.trim().toLowerCase();
            const refresh = panel.querySelector('#shortcut-refresh').value.trim().toLowerCase();
            const style = panel.querySelector('#shortcut-style').value.trim().toLowerCase();
            if (!toggle || !refresh || !style) {
                Swal.fire({
                    title: '提示',
                    text: '快捷键不能为空！',
                    icon: 'warning',
                    toast: true,
                    position: 'center',
                    timer: 2000,
                    showConfirmButton: false
                });
                return;
            }
            const newShortcut = { toggle, refresh, style };
            GM_setValue(CONFIG.customShortcutKey, newShortcut);
            CONFIG.shortcut = newShortcut;
            Swal.fire({
                title: '保存成功',
                text: '快捷键已保存，立即生效',
                icon: 'success',
                toast: true,
                position: 'center',
                timer: 1500,
                showConfirmButton: false
            });
        });
        panel.querySelector('#reset-shortcut-btn').addEventListener('click', () => {
            GM_setValue(CONFIG.customShortcutKey, DEFAULT_SHORTCUT);
            CONFIG.shortcut = DEFAULT_SHORTCUT;
            panel.querySelector('#shortcut-toggle').value = DEFAULT_SHORTCUT.toggle;
            panel.querySelector('#shortcut-refresh').value = DEFAULT_SHORTCUT.refresh;
            panel.querySelector('#shortcut-style').value = DEFAULT_SHORTCUT.style;
            Swal.fire({
                title: '重置成功',
                text: '已恢复默认快捷键',
                icon: 'success',
                toast: true,
                position: 'center',
                timer: 1500,
                showConfirmButton: false
            });
        });
    }

    function createAutoParseSetPanel() {
        if (DOM_CACHE.autoParseSetPanel) return;

        const panel = document.createElement('div');
        panel.id = 'vip-auto-parse-set-panel';

        // 构建接口选项列表（只包含支持内嵌播放的接口）
        let optionsHtml = '<option value="-1">请选择解析接口</option>';
        allApis.forEach((api, index) => {
            if (api.type.includes("1")) {
                optionsHtml += `<option value="${index}">${api.name}</option>`;
            }
        });

        const currentIndex = GM_getValue(CONFIG.autoPlayerVal, 0);
        const isAutoEnabled = !!GM_getValue(CONFIG.autoPlayerKey, null);

        panel.innerHTML = `
            <div class="auto-parse-item">
                <label>自动解析接口：</label>
                <select id="auto-parse-api-select">
                    ${optionsHtml}
                </select>
            </div>
            <div class="shortcut-tip">提示：选择后点击保存，再通过发呆熊/跳熊浮标控制自动解析</div>
            <div style="text-align: center; margin-top: 10px;">
                <button id="save-auto-parse-btn">保存</button>
                <button id="disable-auto-parse-btn">关闭</button>
            </div>
        `;
        DOM_CACHE.donateTab.appendChild(panel);
        DOM_CACHE.autoParseSetPanel = panel;

        // 设置当前选中的接口
        const selectElement = panel.querySelector('#auto-parse-api-select');
        selectElement.value = currentIndex;

        // 保存并开启按钮
        panel.querySelector('#save-auto-parse-btn').addEventListener('click', () => {
            const selectedIndex = parseInt(selectElement.value);
            if (selectedIndex === -1) {
                Swal.fire({
                    title: '提示',
                    text: '请先选择一个解析接口！',
                    icon: 'warning',
                    toast: true,
                    position: 'center',
                    timer: 2000,
                    showConfirmButton: false
                });
                return;
            }

            const selectedApi = allApis[selectedIndex];
            GM_setValue(CONFIG.autoPlayerVal, selectedIndex);

            Swal.fire({
                title: '保存成功',
                html: `已设置 <b>${selectedApi.name}</b> 为自动解析接口<br><small>点击跳熊/发呆熊浮标控制自动解析</small>`,
                icon: 'success',
                toast: true,
                position: 'center',
                timer: 2000,
                showConfirmButton: false
            });

            // 更新自动解析按钮的提示
            const autoBtn = DOM_CACHE.vipBox.querySelector("#vip_auto");
            if (autoBtn && !!GM_getValue(CONFIG.autoPlayerKey, null)) {
                updateAutoSwitchIcon(true, selectedApi.name);
            }
        });

        // 关闭自动解析按钮
        panel.querySelector('#disable-auto-parse-btn').addEventListener('click', () => {
            GM_setValue(CONFIG.autoPlayerKey, null);

            Swal.fire({
                title: '已关闭自动解析',
                text: '刷新页面后生效',
                icon: 'info',
                toast: true,
                position: 'center',
                timer: 1500,
                showConfirmButton: false
            });

            // 更新自动解析按钮状态
            const autoBtn = DOM_CACHE.vipBox.querySelector("#vip_auto");
            if (autoBtn) {
                updateAutoSwitchIcon(false);
            }

            setTimeout(() => {
                window.location.reload();
            }, 1500);
        });
    }

    function createVipButton() {
        // ===== 修复3：防止重复创建浮标 =====
        // 检查当前文档和顶层文档是否已存在浮标
        if (document.getElementById(CONFIG.vipBoxId) ||
            (window.top && window.top.document && window.top.document.getElementById(CONFIG.vipBoxId))) {
            console.log('VIP浮标已存在，跳过创建');
            return;
        }

        const { simpleApisHtml, complexApisHtml } = buildApiListsHtml();
        let customSettingsHtml = `
            <div style="padding: 10px; text-align: center;">
                <button id="add_api_btn">添加自定义接口</button>
                <button id="open-style-set-btn">面板样式设置</button>
                <button id="open-shortcut-set-btn">自定义快捷键</button>
                <button id="open-auto-parse-set-btn">自动解析设置</button>
                <div class="add-api-form" id="add-api-form">
                    <input type="text" id="api-name" placeholder="接口名称">
                    <input type="text" id="api-url" placeholder="接口地址 (例: https://jx.example.com/?url=)">
                    <select id="api-type">
                        <option value="1">内嵌播放</option>
                        <option value="2">弹窗播放带选集</option>
                        <option value="3">弹窗播放不带选集</option>
                    </select>
                    <button id="save-api-btn">添加</button>
                    <button class="cancel-btn" id="cancel-api-btn">取消</button>
                </div>
            </div>
        `;
        const isAutoEnabled = !!GM_getValue(CONFIG.autoPlayerKey, null);
        const autoIconSrc = isAutoEnabled ? VIP_ICON_GIF.autoOn : VIP_ICON_GIF.autoOff;
        const noticePanelHtml = `
            <div class="vip_notice_panel" id="vip_notice_panel">
                ${VIP_USAGE_HTML}
                <div id="donate_section" style="text-align: center;">
                    <div style="font-size: 12px; margin-bottom: 5px;">如果觉得好用，欢迎打赏支持</div>
                    <img id="qr-code-img" src="data:image/jpeg;base64,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" alt="爱与正义" style="max-width: 100px; max-height: 100px; border: 1px solid #ddd; background: white;">
                </div>
            </div>`;
        const vipBox = document.createElement('div');
        vipBox.id = CONFIG.vipBoxId;
        vipBox.innerHTML = `
            <div class="vip_icon">
                <div class="img_box" title="选择解析源">
                    <img id="vip_icon_img" src="${VIP_ICON_GIF.idle}" alt="VIP" draggable="false">
                </div>
                <div class="vip_list">
                    <div class="tab-header">
                        <button class="tab-button active" data-tab="vip">VIP视频解析</button>
                        <div class="tab-divider"></div>
                        <button class="tab-button" data-tab="donate">自定义设置</button>
                    </div>
                    <div class="tab-content active" id="vip-tab">
                        ${simpleApisHtml}
                        ${complexApisHtml}
                    </div>
                    <div class="tab-content" id="donate-tab">
                        ${customSettingsHtml}
                    </div>
                </div>
            </div>
            <div class="img_box vip_float_btn" id="vip_auto" title="点击开启自动解析（需先在自动解析设置中选择接口）">
                <img id="vip_auto_img" src="${autoIconSrc}" alt="自动解析" draggable="false">
            </div>
            <div class="img_box vip_float_btn" id="vip_notice" title="公告：使用说明与赞赏">
                <img id="vip_notice_img" src="${VIP_ICON_GIF.notice}" alt="公告" draggable="false">
            </div>
            ${noticePanelHtml}
        `;
        const savePos = GM_getValue(CONFIG.panelPosKey, { top: 120, left: 0 });
        vipBox.style.top = savePos.top + 'px';
        vipBox.style.left = savePos.left + 'px';

        // ===== 确保浮标只添加到顶层body =====
        const targetBody = window.top.document.body || document.body;
        if (targetBody) {
            targetBody.appendChild(vipBox);
            initDOMCache(vipBox);
            if (!!GM_getValue(CONFIG.autoPlayerKey, null)) {
                setTimeout(() => {
                    autoPlayVideo();
                }, 2500);
            }
        } else {
            // 如果body还未加载，等待DOM加载完成
            findTargetElement('body')
                .then((container) => {
                    container.appendChild(vipBox);
                    initDOMCache(vipBox);
                    if (!!GM_getValue(CONFIG.autoPlayerKey, null)) {
                        setTimeout(() => {
                            autoPlayVideo();
                        }, 2500);
                    }
                })
                .catch(() => {
                    document.body.appendChild(vipBox);
                    initDOMCache(vipBox);
                    if (!!GM_getValue(CONFIG.autoPlayerKey, null)) {
                        setTimeout(() => {
                            autoPlayVideo();
                        }, 2500);
                    }
                });
        }
    }

    function initDOMCache(vipBox) {
        DOM_CACHE.vipBox = vipBox;
        DOM_CACHE.vipList = vipBox.querySelector('.vip_list');
        DOM_CACHE.vipTab = vipBox.querySelector('#vip-tab');
        DOM_CACHE.donateTab = vipBox.querySelector('#donate-tab');
        DOM_CACHE.addApiForm = vipBox.querySelector('#add-api-form');
        DOM_CACHE.apiNameInput = vipBox.querySelector('#api-name');
        DOM_CACHE.apiUrlInput = vipBox.querySelector('#api-url');
        DOM_CACHE.apiTypeSelect = vipBox.querySelector('#api-type');
        DOM_CACHE.simpleApiList = vipBox.querySelector('.simple-api-list');
        DOM_CACHE.complexApiList = vipBox.querySelector('.complex-api-list');
        DOM_CACHE.noticePanel = vipBox.querySelector('#vip_notice_panel');
        createStyleSetPanel();
        createShortcutSetPanel();
        createAutoParseSetPanel();
        applyPanelStyle();
        bindEvents();
    }

    function togglePlayMode(element) {
        const listItem = element.closest('.api-item');
        const modes = listItem.dataset.modes.split(',');
        const currentMode = listItem.dataset.currentMode;
        let nextModeIndex = modes.indexOf(currentMode) + 1;
        if (nextModeIndex >= modes.length) nextModeIndex = 0;
        const nextMode = modes[nextModeIndex];
        let modeText = nextMode === "1" ? "内嵌" : "弹窗";
        element.textContent = modeText;
        listItem.dataset.currentMode = nextMode;
    }

    function isMobilePlayerLayout() {
        const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
        const narrow = !!(window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
        return !!(uaMobile || narrow);
    }

    function bindEvents() {
        const vipBox = DOM_CACHE.vipBox;
        const vipList = DOM_CACHE.vipList;
        const noticePanel = DOM_CACHE.noticePanel;
        const closeNoticePanel = () => {
            if (noticePanel) {
                noticePanel.classList.remove('visible');
                noticePanel.style.display = 'none';
            }
        };
        const isMobile = isMobilePlayerLayout();
        const vipIcon = vipBox.querySelector(".vip_icon");
        const autoBtn = vipBox.querySelector("#vip_auto");
        const noticeBtn = vipBox.querySelector("#vip_notice");
        const vipIconImg = vipBox.querySelector("#vip_icon_img");
        let suppressNextClick = false;
        const consumeDragClick = () => {
            if (suppressNextClick) {
                suppressNextClick = false;
                return true;
            }
            return false;
        };
        if (isMobile) {
            // 移动端：点击切换显示/隐藏
            vipIcon.addEventListener("click", (e) => {
                if (consumeDragClick()) return;
                // 点击面板内部（标签页/接口列表）时不要触发切换
                if (vipList.contains(e.target)) return;
                if (vipList.classList.contains("visible")) {
                    vipList.classList.remove("visible");
                    vipBox.classList.remove("visible");
                } else {
                    closeNoticePanel();
                    vipBox.classList.add("visible");
                    vipList.classList.add("visible");
                }
            });
        } else {
            // 桌面：hover 显示/隐藏
            vipIcon.addEventListener("mouseover", () => {
                closeNoticePanel();
                vipBox.classList.add("visible");
                vipList.classList.add("visible");
                setTimeout(() => {
                    const items = vipList.querySelectorAll('li, .section-title, #donate_section');
                    items.forEach((item, index) => {
                        setTimeout(() => {
                            item.style.transitionDelay = '0ms';
                        }, index * 30);
                    });
                }, 50);
            });
            vipIcon.addEventListener("mouseout", (e) => {
                const relatedTarget = e.relatedTarget;
                if (relatedTarget && (vipList.contains(relatedTarget) || relatedTarget === vipList)) {
                    return;
                }
                vipList.classList.remove("visible");
                vipBox.classList.remove("visible");
                const items = vipList.querySelectorAll('li, .section-title, #donate_section');
                items.forEach(item => {
                    item.style.transitionDelay = '';
                });
            });

            vipList.addEventListener("mouseenter", () => {
                vipBox.classList.add("visible");
                vipList.classList.add("visible");
            });
            vipList.addEventListener("mouseleave", () => {
                vipList.classList.remove("visible");
                vipBox.classList.remove("visible");
                const items = vipList.querySelectorAll('li, .section-title, #donate_section');
                items.forEach(item => {
                    item.style.transitionDelay = '';
                });
            });
        }
        const tabButtons = vipBox.querySelectorAll(".tab-button");
        tabButtons.forEach(button => {
            button.addEventListener("click", function() {
                tabButtons.forEach(btn => btn.classList.remove("active"));
                vipBox.querySelectorAll(".tab-content").forEach(content => content.classList.remove("active"));
                this.classList.add("active");
                const tabId = this.getAttribute("data-tab");
                vipBox.querySelector(`#${tabId}-tab`).classList.add("active");
            });
        });
        vipBox.querySelector('#open-style-set-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const stylePanel = DOM_CACHE.styleSetPanel;
            const isVisible = stylePanel.style.display === 'block';

            // 隐藏所有设置面板
            DOM_CACHE.addApiForm.style.display = 'none';
            DOM_CACHE.styleSetPanel.style.display = 'none';
            DOM_CACHE.shortcutSetPanel.style.display = 'none';
            DOM_CACHE.autoParseSetPanel.style.display = 'none';

            // 切换当前面板
            stylePanel.style.display = isVisible ? 'none' : 'block';
        });
        vipBox.querySelector('#open-shortcut-set-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const shortcutPanel = DOM_CACHE.shortcutSetPanel;
            const isVisible = shortcutPanel.style.display === 'block';

            // 隐藏所有设置面板
            DOM_CACHE.addApiForm.style.display = 'none';
            DOM_CACHE.styleSetPanel.style.display = 'none';
            DOM_CACHE.shortcutSetPanel.style.display = 'none';
            DOM_CACHE.autoParseSetPanel.style.display = 'none';

            // 切换当前面板
            shortcutPanel.style.display = isVisible ? 'none' : 'block';
        });

        vipBox.querySelector('#open-auto-parse-set-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const autoParsePanel = DOM_CACHE.autoParseSetPanel;
            const isVisible = autoParsePanel.style.display === 'block';

            // 隐藏所有设置面板
            DOM_CACHE.addApiForm.style.display = 'none';
            DOM_CACHE.styleSetPanel.style.display = 'none';
            DOM_CACHE.shortcutSetPanel.style.display = 'none';
            DOM_CACHE.autoParseSetPanel.style.display = 'none';

            // 切换当前面板
            autoParsePanel.style.display = isVisible ? 'none' : 'block';
        });
        if (noticeBtn && noticePanel) {
            const openNoticePanel = () => {
                vipList.classList.remove('visible');
                vipBox.classList.remove('visible');
                noticePanel.style.display = 'block';
                noticePanel.classList.add('visible');
                applyPanelStyle();
            };
            noticeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (consumeDragClick()) return;
                const isVisible = noticePanel.classList.contains('visible');
                if (isVisible) {
                    closeNoticePanel();
                } else {
                    openNoticePanel();
                }
            });
            // 桌面端：悬停浮标显示公告，离开面板隐藏；点击切换仍保留
            if (!isMobile) {
                noticeBtn.addEventListener('mouseenter', () => {
                    openNoticePanel();
                });
                noticeBtn.addEventListener('mouseleave', (e) => {
                    const relatedTarget = e.relatedTarget;
                    if (relatedTarget && (noticePanel.contains(relatedTarget) || relatedTarget === noticePanel)) {
                        return;
                    }
                    closeNoticePanel();
                });
                noticePanel.addEventListener('mouseleave', () => {
                    closeNoticePanel();
                });
            }
        }
        const addApiBtn = vipBox.querySelector("#add_api_btn");
        if (addApiBtn) {
            addApiBtn.addEventListener("click", function(e) {
                e.stopPropagation();
                const isVisible = DOM_CACHE.addApiForm.style.display === "block";

                // 隐藏所有设置面板
                DOM_CACHE.addApiForm.style.display = 'none';
                DOM_CACHE.styleSetPanel.style.display = 'none';
                DOM_CACHE.shortcutSetPanel.style.display = 'none';
                DOM_CACHE.autoParseSetPanel.style.display = 'none';

                // 切换当前面板
                DOM_CACHE.addApiForm.style.display = isVisible ? "none" : "block";
            });
        }
        const saveApiBtn = vipBox.querySelector("#save-api-btn");
        if (saveApiBtn) {
            saveApiBtn.addEventListener("click", function(e) {
                e.stopPropagation();
                const name = DOM_CACHE.apiNameInput.value.trim();
                const url = DOM_CACHE.apiUrlInput.value.trim();
                const type = DOM_CACHE.apiTypeSelect.value;
                if (!name || !url) {
                    alert('请填写完整信息');
                    return;
                }
                if (!url.includes('?url=') && !url.includes('&url=')) {
                    alert('接口地址必须包含 "?url=" 或 "&url=" 参数占位符');
                    return;
                }
                const newApi = { name, type, url };
                customApis.push(newApi);
                allApis = [...uniqueApis, ...customApis];
                GM_setValue("custom_parse_apis", customApis);
                DOM_CACHE.addApiForm.reset();
                DOM_CACHE.addApiForm.style.display = "none";
                renderApiLists();
                Swal.fire({
                    title: '添加成功',
                    text: '自定义接口已添加，直接使用无需刷新！',
                    icon: 'success',
                    toast: true,
                    position: 'center',
                    timer: 2000,
                    showConfirmButton: false
                });
            });
        }
        const cancelApiBtn = vipBox.querySelector("#cancel-api-btn");
        if (cancelApiBtn) {
            cancelApiBtn.addEventListener("click", function(e) {
                e.stopPropagation();
                DOM_CACHE.addApiForm.style.display = "none";
            });
        }
        vipBox.querySelector('#vip-tab').addEventListener("click", (e) => {
            if (e.target.classList.contains('mode-toggle')) {
                togglePlayMode(e.target);
                return;
            }
            const apiItem = e.target.closest('.api-item');
            if (!apiItem) return;
            const index = parseInt(apiItem.getAttribute("data-index"));
            const videoObj = allApis[index];
            let apiType;
            if (apiItem.classList.contains('combined-simple')) {
                apiType = apiItem.dataset.currentMode;
            } else {
                apiType = apiItem.getAttribute("data-mode");
            }
            if (apiType === "1") {
                // 保存选中的接口索引（用于自动解析）
                GM_setValue(CONFIG.autoPlayerVal, index);
                GM_setValue(CONFIG.flag, "true"); // 标记手动解析过
                playVideo(videoObj, true, encodeVideoUrl(window.location.href));
                vipBox.querySelectorAll(".api-item").forEach(li => li.classList.remove("selected"));
                apiItem.classList.add("selected");

                // 更新自动解析按钮的提示
                if (!!GM_getValue(CONFIG.autoPlayerKey, null)) {
                    updateAutoSwitchIcon(true, videoObj.name);
                }
            } else {
                const encodedUrl = encodeVideoUrl(window.location.href);
                const parseUrl = videoObj.url + encodedUrl;
                GM_openInTab(parseUrl, {active: true, insert: true, setParent: true});
            }
        });
        autoBtn.addEventListener("click", function(e) {
            e.stopPropagation();
            if (consumeDragClick()) return;
            closeNoticePanel();
            if (!!GM_getValue(CONFIG.autoPlayerKey, null)) {
                GM_setValue(CONFIG.autoPlayerKey, null);
                updateAutoSwitchIcon(false);
                Swal.fire({
                    title: '已关闭自动解析',
                    text: '刷新页面后生效',
                    icon: 'info',
                    toast: true,
                    position: 'center',
                    timer: 1500,
                    showConfirmButton: false
                });
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                // 检查是否已设置接口
                const selectedIndex = GM_getValue(CONFIG.autoPlayerVal, 0);
                const selectedApi = allApis[selectedIndex];

                if (!selectedApi || !selectedApi.type.includes("1")) {
                    Swal.fire({
                        title: '请先设置自动解析接口',
                        text: '点击下方"自动解析设置"按钮选择解析接口',
                        icon: 'info',
                        toast: true,
                        position: 'center',
                        timer: 2500,
                        showConfirmButton: false
                    });
                    return;
                }

                // 开启自动解析
                GM_setValue(CONFIG.autoPlayerKey, "true");
                updateAutoSwitchIcon(true, selectedApi.name);

                Swal.fire({
                    title: '已开启自动解析',
                    html: `使用 <b>${selectedApi.name}</b> 自动解析<br>刷新页面后生效`,
                    icon: 'success',
                    toast: true,
                    position: 'center',
                    timer: 1500,
                    showConfirmButton: false
                });

                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            }
        });
        const canStartFloatDrag = (target) => {
            if (vipList.contains(target)) return false;
            if (noticePanel && noticePanel.contains(target)) return false;
            if (!vipIcon.contains(target) && !autoBtn.contains(target) && !noticeBtn.contains(target)) return false;
            return true;
        };
        let floatDragging = false;
        let floatDragMoved = false;
        let floatDragFromVipIcon = false;
        let floatDragOffsetX = 0;
        let floatDragOffsetY = 0;
        let floatDragOldTransition = '';
        const applyFloatDragMove = (clientX, clientY) => {
            let x = clientX - floatDragOffsetX;
            let y = clientY - floatDragOffsetY;
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            if (x < 0) x = 0;
            else if (x > windowWidth - vipBox.offsetWidth - 100) {
                x = windowWidth - vipBox.offsetWidth - 100;
            }
            if (y < 0) y = 0;
            else if (y > windowHeight - vipBox.offsetHeight) {
                y = windowHeight - vipBox.offsetHeight;
            }
            vipBox.style.left = x + "px";
            vipBox.style.top = y + "px";
            floatDragMoved = true;
        };
        const endFloatDrag = () => {
            if (!floatDragging) return;
            floatDragging = false;
            document.removeEventListener("mousemove", onFloatDragMouseMove);
            document.removeEventListener("mouseup", onFloatDragEnd);
            document.removeEventListener("touchmove", onFloatDragTouchMove);
            document.removeEventListener("touchend", onFloatDragEnd);
            document.removeEventListener("touchcancel", onFloatDragEnd);
            vipBox.style.cursor = "pointer";
            vipBox.style.transition = floatDragOldTransition;
            if (floatDragFromVipIcon && vipIconImg) {
                vipIconImg.src = VIP_ICON_GIF.idle;
            }
            if (floatDragMoved) {
                suppressNextClick = true;
                GM_setValue(CONFIG.panelPosKey, {
                    left: parseInt(vipBox.style.left, 10),
                    top: parseInt(vipBox.style.top, 10)
                });
            }
        };
        const startFloatDrag = (clientX, clientY, fromVipIcon) => {
            floatDragging = true;
            floatDragMoved = false;
            floatDragFromVipIcon = fromVipIcon;
            vipBox.style.cursor = "move";
            if (floatDragFromVipIcon && vipIconImg) {
                vipIconImg.src = VIP_ICON_GIF.drag;
            }
            floatDragOldTransition = vipBox.style.transition;
            vipBox.style.transition = "none";
            const positionDiv = vipBox.getBoundingClientRect();
            floatDragOffsetX = clientX - positionDiv.left;
            floatDragOffsetY = clientY - positionDiv.top;
        };
        const onFloatDragMouseMove = (e) => {
            if (!floatDragging) return;
            applyFloatDragMove(e.clientX, e.clientY);
        };
        const onFloatDragTouchMove = (e) => {
            if (!floatDragging) return;
            if (e.cancelable) e.preventDefault();
            const touch = e.touches[0];
            if (touch) applyFloatDragMove(touch.clientX, touch.clientY);
        };
        const onFloatDragEnd = () => endFloatDrag();
        vipBox.addEventListener("mousedown", function(e) {
            if (e.button !== 0) return;
            if (!canStartFloatDrag(e.target)) return;
            e.preventDefault();
            startFloatDrag(e.clientX, e.clientY, vipIcon.contains(e.target));
            document.addEventListener("mousemove", onFloatDragMouseMove);
            document.addEventListener("mouseup", onFloatDragEnd);
        });
        vipBox.addEventListener("touchstart", function(e) {
            if (!canStartFloatDrag(e.target)) return;
            const touch = e.touches[0];
            if (!touch) return;
            startFloatDrag(touch.clientX, touch.clientY, vipIcon.contains(e.target));
            document.addEventListener("touchmove", onFloatDragTouchMove, { passive: false });
            document.addEventListener("touchend", onFloatDragEnd);
            document.addEventListener("touchcancel", onFloatDragEnd);
        }, { passive: true });
        const autoIndex = GM_getValue(CONFIG.autoPlayerVal, 0);
        updateAutoSwitchIcon(!!GM_getValue(CONFIG.autoPlayerKey, null), allApis[autoIndex] && allApis[autoIndex].name);
    }

    function clearVipPlaybackTimers() {
        if (window._vipHideInterval) {
            clearInterval(window._vipHideInterval);
            window._vipHideInterval = null;
        }
        if (window._vipVideoCleanupInterval) {
            clearInterval(window._vipVideoCleanupInterval);
            window._vipVideoCleanupInterval = null;
        }
        if (window._vipMediaObserver) {
            try {
                window._vipMediaObserver.disconnect();
            } catch (e) {}
            window._vipMediaObserver = null;
        }
    }

    // 掐掉单个 video/audio（暂停、静音、清源）
    function stopPageMedia(media) {
        if (!media) return;
        try {
            media.pause();
        } catch (e) {}
        try {
            media.autoplay = false;
            media.loop = false;
            media.muted = true;
            media.defaultMuted = true;
            media.volume = 0;
            media.playbackRate = 1;
            media.removeAttribute('autoplay');
            media.removeAttribute('src');
            media.srcObject = null;
            media.querySelectorAll('source').forEach((node) => node.remove());
            if (media.currentSrc || media.srcObject || media.querySelector('source')) {
                media.load();
            }
        } catch (e) {}
    }

    // 判断元素是否在我们自己的解析播放器内（跨域 iframe 天然隔离，这里再显式兜底）
    function isInsideOurPlayer(el) {
        return !!(el && el.closest && el.closest('.vip_jx_iframe_wrapper'));
    }

    // 扫描指定作用域内的 video/audio，跳过我们自己的播放器
    function mutePageMediaInScope(scope) {
        const root = scope && scope.querySelectorAll ? scope : document;
        root.querySelectorAll('video, audio').forEach((media) => {
            if (isInsideOurPlayer(media)) return;
            stopPageMedia(media);
        });
    }

    // 扫本页面 + 钻进同源 iframe 内部（跨域 iframe 进不去会自动跳过）
    function muteAllPageMedia() {
        mutePageMediaInScope(document);
        document.querySelectorAll('iframe').forEach((f) => {
            if (isInsideOurPlayer(f)) return;
            let doc = null;
            try { doc = f.contentDocument; } catch (e) { return; }
            if (doc) { try { mutePageMediaInScope(doc); } catch (e) {} }
        });
    }

    // 拦截原站 play()，避免原播放器把声音/画面抢回来
    function blockNativeMediaPlayback() {
        if (window._vipMediaPlayBlocked || !window.HTMLMediaElement) return;
        window._vipMediaPlayBlocked = true;
        const rawPlay = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function () {
            stopPageMedia(this);
            return Promise.resolve();
        };
        document.addEventListener('play', (event) => {
            if (event.target instanceof HTMLMediaElement && !isInsideOurPlayer(event.target)) {
                stopPageMedia(event.target);
            }
        }, true);
        document.addEventListener('playing', (event) => {
            if (event.target instanceof HTMLMediaElement && !isInsideOurPlayer(event.target)) {
                stopPageMedia(event.target);
            }
        }, true);
        document.addEventListener('volumechange', (event) => {
            if (event.target instanceof HTMLMediaElement && !isInsideOurPlayer(event.target)) {
                stopPageMedia(event.target);
            }
        }, true);
        try {
            HTMLMediaElement.prototype.play.toString = () => rawPlay.toString();
        } catch (e) {}
    }

    // 定时扫 + MutationObserver：新出现的 video/audio 立刻掐掉
    function startNativeMediaKiller() {
        blockNativeMediaPlayback();
        muteAllPageMedia();

        if (window._vipVideoCleanupInterval) {
            clearInterval(window._vipVideoCleanupInterval);
        }
        window._vipVideoCleanupInterval = setInterval(() => {
            muteAllPageMedia();
        }, 500);

        if (window._vipMediaObserver) {
            try {
                window._vipMediaObserver.disconnect();
            } catch (e) {}
            window._vipMediaObserver = null;
        }
        const target = document.documentElement || document.body;
        if (!target || !window.MutationObserver) return;

        window._vipMediaObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.target instanceof Element) {
                    if (mutation.target.matches('video, audio') && !isInsideOurPlayer(mutation.target)) {
                        stopPageMedia(mutation.target);
                    }
                    return;
                }
                mutation.addedNodes.forEach((node) => {
                    if (!(node instanceof Element)) return;
                    if (node.matches && node.matches('video, audio')) {
                        if (!isInsideOurPlayer(node)) stopPageMedia(node);
                        return;
                    }
                    mutePageMediaInScope(node);
                });
            });
        });
        window._vipMediaObserver.observe(target, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src', 'autoplay']
        });
    }

    function hideOverlayNodes(selectors) {
        (selectors || []).forEach((selector) => {
            try {
                document.querySelectorAll(selector).forEach((el) => {
                    el.style.setProperty('display', 'none', 'important');
                    el.style.setProperty('visibility', 'hidden', 'important');
                    el.style.setProperty('opacity', '0', 'important');
                    el.style.setProperty('pointer-events', 'none', 'important');
                    el.style.setProperty('z-index', '-9999', 'important');
                });
            } catch (e) {
                // 忽略无效选择器
            }
        });
    }

    // 清空原播放器容器 + 掐原站媒体 + 嵌入解析 iframe
    function applyInlineStyles(element, styles) {
        Object.entries(styles || {}).forEach(([propertyName, propertyValue]) => {
            if (propertyValue === undefined || propertyValue === null || propertyValue === '') return;
            element.style[propertyName] = propertyValue;
        });
    }

    // PC：铺满原容器；手机/窄屏：按容器与视口计算高度，避免塌陷/错位
    function buildPlayerFrameLayout({ isMobile, containerRect = {}, containerStyle = {}, viewportHeight = 0 }) {
        const parsePixelValue = (value) => {
            const parsedValue = Number.parseFloat(value);
            return Number.isFinite(parsedValue) ? parsedValue : 0;
        };

        if (!isMobile) {
            return {
                containerStyles: { overflow: 'hidden' },
                wrapperStyles: {
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    width: '100%',
                    height: '100%',
                    background: '#000',
                    overflow: 'hidden',
                    zIndex: '1'
                },
                iframeStyles: {
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    display: 'block',
                    background: '#000'
                }
            };
        }

        const width = parsePixelValue(containerRect.width);
        const height = parsePixelValue(containerRect.height);
        const paddingTop = parsePixelValue(containerStyle.paddingTop);
        const ratioHeight = width > 0 ? Math.round((width * 9) / 16) : 0;
        const fallbackViewportHeight = viewportHeight > 0 ? Math.round(viewportHeight * 0.32) : 180;
        const rawHeight = height || paddingTop || ratioHeight || fallbackViewportHeight;
        const maxHeight = viewportHeight > 0 ? Math.max(220, Math.round(viewportHeight * 0.7)) : rawHeight;
        const resolvedHeight = Math.max(180, Math.min(rawHeight, maxHeight));
        const usesPaddingAspect = width > 0 && paddingTop > 0 && (paddingTop / width) > 0.25;

        return {
            containerStyles: {
                overflow: 'hidden',
                height: 'auto',
                minHeight: `${resolvedHeight}px`,
                ...(usesPaddingAspect ? { paddingTop: '0' } : {})
            },
            wrapperStyles: {
                position: 'relative',
                display: 'block',
                width: '100%',
                minHeight: `${resolvedHeight}px`,
                aspectRatio: '16 / 9',
                background: '#000',
                overflow: 'hidden',
                zIndex: '1'
            },
            iframeStyles: {
                position: 'absolute',
                inset: '0',
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block',
                background: '#000'
            }
        };
    }

    function playVideo(videoObj, isEmbed, encodedUrl = null) {
        if (!isEmbed) return;

        clearVipPlaybackTimers();

        const finalUrl = encodedUrl || encodeVideoUrl(window.location.href);
        const parseUrl = videoObj.url + finalUrl;

        // 获取当前网站的播放器容器配置
        const host = window.location.hostname;
        const playerConfig = PLAYER_CONTAINERS.find(config => host === config.host);

        if (!playerConfig) {
            console.warn('未找到当前网站的播放器配置');
            Swal.fire({
                title: '暂不支持内嵌',
                text: '当前页面暂无播放器区域配置，请改用列表中的「弹窗」类接口解析。',
                icon: 'info',
                toast: true,
                position: 'center',
                timer: 3000,
                showConfirmButton: false
            });
            return;
        }

        // 隐藏 VIP 遮罩等节点（!important，避免被站点样式抢回）
        if (playerConfig.displayNodes && playerConfig.displayNodes.length > 0) {
            hideOverlayNodes(playerConfig.displayNodes);
            window._vipHideInterval = setInterval(() => {
                hideOverlayNodes(playerConfig.displayNodes);
            }, 500);
        }

        // 查找原播放器容器
        findTargetElement(playerConfig.container)
            .then((container) => {
                const isMobile = isMobilePlayerLayout();
                const initialRect = container.getBoundingClientRect();
                const initialStyle = window.getComputedStyle(container);
                const frameLayout = buildPlayerFrameLayout({
                    isMobile,
                    containerRect: initialRect,
                    containerStyle: { paddingTop: initialStyle.paddingTop },
                    viewportHeight: window.innerHeight || document.documentElement.clientHeight || 0
                });

                // 完全清空容器
                container.innerHTML = '';

                // 掐死原站 video/audio（拦截 play + 监听新节点 + 定时扫）
                startNativeMediaKiller();

                if (initialStyle.position === 'static') {
                    container.style.position = 'relative';
                }
                applyInlineStyles(container, frameLayout.containerStyles);

                // 创建iframe容器
                const iframeWrapper = document.createElement('div');
                iframeWrapper.className = 'vip_jx_iframe_wrapper';
                applyInlineStyles(iframeWrapper, frameLayout.wrapperStyles);

                const iframe = document.createElement('iframe');
                iframe.src = parseUrl;
                iframe.frameBorder = '0';
                iframe.allow = 'autoplay; encrypted-media; fullscreen';
                iframe.allowFullscreen = true;
                iframe.referrerPolicy = 'no-referrer';
                applyInlineStyles(iframe, frameLayout.iframeStyles);

                // 创建关闭按钮
                const closeBtn = document.createElement("div");
                closeBtn.className = "vip-player-close-btn";
                closeBtn.innerHTML = "×";
                closeBtn.title = "关闭解析（刷新页面恢复原视频）";
                closeBtn.style.cssText = `
                    position: absolute;
                    top: ${isMobile ? '10px' : '15px'};
                    right: ${isMobile ? '10px' : '15px'};
                    z-index: 2;
                    width: auto;
                    height: auto;
                    padding: ${isMobile ? '6px 12px' : '5px 10px'};
                    background: ${isMobile ? 'rgba(0, 0, 0, 0.35)' : 'transparent'};
                    border: none;
                    border-radius: ${isMobile ? '6px' : '0'};
                    cursor: pointer;
                    font-size: ${isMobile ? '28px' : '32px'};
                    line-height: 1;
                    color: rgba(255, 255, 255, 0.9);
                    transition: all 0.3s ease;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
                    opacity: ${isMobile ? '1' : '0'};
                    pointer-events: ${isMobile ? 'auto' : 'none'};
                `;
                closeBtn.onclick = () => {
                    clearVipPlaybackTimers();
                    window.location.reload();
                };

                iframeWrapper.appendChild(iframe);

                if (isMobile) {
                    // 手机端：无鼠标捕获层，关闭按钮常显
                    iframeWrapper.appendChild(closeBtn);
                } else {
                    // PC：透明捕获层 + 悬停显示关闭按钮
                    const mouseCatcher = document.createElement('div');
                    mouseCatcher.style.cssText = `
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        z-index: 1;
                        pointer-events: auto;
                        background: transparent;
                    `;

                    let hideTimer = null;
                    const showCloseBtn = () => {
                        clearTimeout(hideTimer);
                        closeBtn.style.opacity = '1';
                        closeBtn.style.pointerEvents = 'auto';
                        mouseCatcher.style.pointerEvents = 'none';
                        hideTimer = setTimeout(() => {
                            closeBtn.style.opacity = '0';
                            closeBtn.style.pointerEvents = 'none';
                            mouseCatcher.style.pointerEvents = 'auto';
                        }, 3000);
                    };

                    mouseCatcher.onmousemove = showCloseBtn;
                    mouseCatcher.onmouseenter = showCloseBtn;

                    closeBtn.onmouseover = () => {
                        clearTimeout(hideTimer);
                        closeBtn.style.color = 'rgba(255, 255, 255, 1)';
                        closeBtn.style.transform = 'scale(1.2)';
                    };
                    closeBtn.onmouseout = () => {
                        closeBtn.style.color = 'rgba(255, 255, 255, 0.8)';
                        closeBtn.style.transform = 'scale(1)';
                        showCloseBtn();
                    };

                    iframeWrapper.appendChild(mouseCatcher);
                    iframeWrapper.appendChild(closeBtn);
                }

                container.appendChild(iframeWrapper);
            })
            .catch(() => {
                clearVipPlaybackTimers();
                console.warn('未找到播放器容器');
                Swal.fire({
                    title: '未找到播放器区域',
                    text: '页面结构可能有变化，请尝试「弹窗」解析或刷新后重试。',
                    icon: 'warning',
                    toast: true,
                    position: 'center',
                    timer: 3000,
                    showConfirmButton: false
                });
            });
    }

    function autoPlayVideo() {
        let index = GM_getValue(CONFIG.autoPlayerVal, 0);
        let autoObj = allApis[index];
        if (autoObj && autoObj.type.includes("1")) {
            playVideo(autoObj, true, encodeVideoUrl(window.location.href));
            const vipBox = DOM_CACHE.vipBox;
            if (vipBox) {
                const selectedItem = vipBox.querySelector(`.api-item[data-index="${index}"]`);
                if (selectedItem) {
                    selectedItem.classList.add("selected");
                }
                updateAutoSwitchIcon(true, autoObj.name);
            }
        }
    }

    // 监听URL变化
    function monitorUrlChange() {
        if (!!GM_getValue(CONFIG.autoPlayerKey, null)) {
            // 如果开启了自动解析，URL变化时刷新页面
            let oldHref = window.location.href;
            setInterval(() => {
                const newHref = window.location.href;
                if (oldHref !== newHref) {
                    oldHref = newHref;
                    window.location.reload();
                }
            }, 500);
        } else {
            // 如果没开启自动解析，检测到手动解析后URL变化时刷新
            let oldHref = window.location.href;
            setInterval(() => {
                let newHref = window.location.href;
                if (oldHref !== newHref) {
                    oldHref = newHref;
                    if (!!GM_getValue(CONFIG.flag, null)) {
                        window.location.reload();
                    }
                }
            }, 1000);
        }
    }

    function waitForBody() {
        if (document.body) {
            createVipButton();
        } else {
            requestAnimationFrame(waitForBody);
        }
    }

    document.addEventListener('keydown', (e) => {
        if (!e.altKey) return;
        const vipBox = DOM_CACHE.vipBox;
        if (!vipBox) return;
        switch (e.key.toLowerCase()) {
            case CONFIG.shortcut.toggle:
                e.preventDefault();
                vipBox.style.display = vipBox.style.display === 'none' ? 'block' : 'none';
                if (vipBox.style.display === 'block') {
                    vipBox.classList.add('visible');
                    vipBox.querySelector('.vip_list').classList.add('visible');
                }
                break;
            case CONFIG.shortcut.refresh:
                e.preventDefault();
                customApis = GM_getValue("custom_parse_apis", []);
                allApis = [...uniqueApis, ...customApis];
                renderApiLists();
                Swal.fire({
                    title: '刷新成功',
                    text: '接口列表已重新加载！',
                    icon: 'success',
                    toast: true,
                    position: 'center',
                    timer: 1500,
                    showConfirmButton: false
                });
                break;
            case CONFIG.shortcut.style:
                e.preventDefault();
                const stylePanel = DOM_CACHE.styleSetPanel;
                if (stylePanel) {
                    stylePanel.style.display = stylePanel.style.display === 'block' ? 'none' : 'block';
                    DOM_CACHE.vipBox.querySelector('.tab-button[data-tab="donate"]').click();
                }
                break;
        }
    });

    (function registerMenu() {
        GM_registerMenuCommand('🎬 VIP解析窗口', function() {
            const vipBox = document.getElementById(CONFIG.vipBoxId);
            if (vipBox) {
                const isVisible = vipBox.style.display !== 'none';
                vipBox.style.display = isVisible ? 'none' : 'block';
                if (!isVisible) {
                    vipBox.classList.add('visible');
                    vipBox.querySelector('.vip_list').classList.add('visible');
                }
            } else {
                createVipButton();
            }
        }, 'v');
        GM_registerMenuCommand('📊 脚本状态', function() {
            const version = GM_info.script.version;
            alert('当前版本：' + version + '\n解析工具已启动，支持多平台VIP视频解析\n共整合 ' + allApis.length + ' 个解析接口\n支持样式自定义、快捷键自定义、接口动态添加！');
        });
    })();

    const util = {
        findTargetEle: (targetEle) => findTargetElement(targetEle)
    };

    const host = window.location.hostname;
    // 与 playVideo 使用的 PLAYER_CONTAINERS 一致，避免出现浮标但内嵌无配置
    const isSupportSite = PLAYER_CONTAINERS.some(cfg => host === cfg.host);

    if (isSupportSite) {
        // 确保只创建一次VIP浮标
        let vipButtonCreated = false;

        // 初始化flag
        GM_setValue(CONFIG.flag, null);

        util.findTargetEle('body')
            .then(() => {
                if (!vipButtonCreated) {
                    vipButtonCreated = true;
                    createVipButton();
                    monitorUrlChange(); // 启动URL监听
                }
            })
            .catch(() => {
                if (document.readyState === "loading") {
                    document.addEventListener("DOMContentLoaded", () => {
                        if (!vipButtonCreated) {
                            vipButtonCreated = true;
                            waitForBody();
                            monitorUrlChange(); // 启动URL监听
                        }
                    });
                } else {
                    if (!vipButtonCreated) {
                        vipButtonCreated = true;
                        waitForBody();
                        monitorUrlChange(); // 启动URL监听
                    }
                }
            });
    }
})();