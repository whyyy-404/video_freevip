// ==UserScript==
// @name         🫧404小站 — 🎬VIP追剧神器 | 完全免费 | 支持多平台 | (电脑/手机/平板...自适应)
// @namespace    https://scriptcat.org/zh-CN/users/162063
// @version      3.5.1
// @description  ▶在线VIP视频解析工具 (电脑/手机/平板...自适应) | free | 支持多平台【爱奇艺】【腾讯视频】【优酷土豆】【芒果TV】【乐视视频】【哔哩哔哩】【搜狐视频】等常见平台。✨9条解析接口实测可用 ✨内嵌播放无广告 ✨智能切集追剧 ✨内嵌铺满原播放区 ✨一键自动解析  制作不易，有问题可加微信咨询：Why15236444193 [如果加微信未能及时回复，请多多包涵哈！]
// @author       yyy404
// @match        *://*/*
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_openInTab
// @grant        GM_xmlhttpRequest
// @resource     hlsJs       https://cdn.jsdelivr.net/npm/hls.js@1.7.3/dist/hls.min.js
// @resource     artPlayerJs https://cdn.jsdelivr.net/npm/artplayer@5.4.0/dist/artplayer.js
// @grant        GM_getResourceText
// @connect      *
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

    // ===== 66dpw 跳板页接管 =====
    // https://www.66dpw.vip/?url=<视频页> 不是解析接口，单独打开是没用的：
    //   · 服务端忽略 ?url=（带 / 不带 / 编码过的 ?url= 返回完全相同的首页 HTML）
    //   · 首页自身没有播放能力（HTML 与 12 个外部 JS 里没有任何播放器库的痕迹）
    // 它的唯一用途是当「授权宿主页」：真播放接口只有当「自己嵌在这个已授权域名下」才放行，
    // 顶层直接打开同一个接口会被拒（实测提示「您的域名未授权播放」）。
    // 授权判定读的是祖先域、不是 Referer 头，所以这里不伪造来源。
    // 做法：点击时把「宿主页地址 / 真播放接口 / 要解析的视频页地址」三个值记进 GM 存储；
    //      宿主页读到后整体替换 body，只留一个容器 + 一个 iframe，
    //      并用常驻 CSS 把它的其余元素移出屏幕。
    // ⚠️ iframe 上这几组属性都要带，少一个都会出问题（都是实测对比出来的）：
    //    · sandbox="allow-scripts allow-same-origin"
    //        缺了它，内层页面（它自己会加载统计脚本和 Cast SDK）能弹窗、能跳顶层；
    //        带上之后这些都被禁掉。allow-same-origin 必须留，否则内层拿不到 localStorage。
    //    · loading="eager" importance="high" fetchpriority="high"
    //        加载优先级。不标的话这个 iframe 是默认优先级，
    //        会和宿主页那 1 MB 脚本 + 几百张封面图抢带宽，起播明显变慢。
    //    · allow="autoplay;encrypted-media;picture-in-picture;…" + allowfullscreen
    //        不给她方权限，起播和全屏都会被挡。
    // ⚠️ 不能在这里调 window.stop()：它会连「新的 frame」一起停掉，
    //    会导致新建的 iframe 永远不出画面（表现：整页纯黑，连它自己的 loading 图都看不到）。
    const GATE_HOST = 'www.66dpw.vip';
    const GATE_PLAY_API = 'https://svip.qlplayer.cyou/?url=';
    // 宿主页的窗口名。
    // ⚠️ 必须是【具名窗口】，不能再用 '_blank'：
    //    具名窗口同名只有一个，第二次点会复用它并导航过去，而不是再开一个新标签。
    //    用 _blank 的话每点一次就多留一个宿主页标签，而每个宿主页都在往真播放接口加载 iframe，
    //    十几个标签同时抢同一个域名的连接 → 新开那个的请求一直排不到 → iframe 永远不出画面。
    const GATE_WIN_NAME = 'vip_jx_gate';
    // 宿主页的完整前缀。判断「当前这页是不是跳板页」必须用它整串比对：
    // ⚠️ 只查 hostname + 有没有 ?url= 是不够的 —— 那样 jiexi.html?url=…（66网2）也会被吃掉，
    //    66网2 就变成 66网1 了。路径必须是 /，参数必须紧跟在 ? 后面。
    const GATE_PREFIX = 'https://' + GATE_HOST + '/?url=';

    // 要解析的目标地址【直接读地址栏的 ?url=】，不经过 GM 存储：
    // 目标就明明白白写在地址栏上，手动打开或刷新那一页也能用，不存在跨页隐藏状态。
    // （原先还写了一份到 GM 存储做兜底，但地址栏永远带着目标 ⇒ 那份兜底从来没被读到过，已删）
    function gateInfo() {
        try {
            if (!String(window.location.href).startsWith(GATE_PREFIX)) return null;
            // 取「url=」之后的全部内容，不按 & 截断（视频页地址自带 & 也不会被切掉）
            const m = /[?&]url=(.+)$/.exec(window.location.search);
            if (!m) return null;
            let v = m[1];
            try { v = decodeURIComponent(v); } catch (e) { }
            return /^https?:\/\//i.test(v) ? { api: GATE_PLAY_API, target: v } : null;
        } catch (e) {
            return null;
        }
    }

    const GATE = gateInfo();
    if (GATE) {
        let gateWrap = null;

        const buildGate = () => {
            if (gateWrap) return true;
            const body = document.body;
            if (!body) return false;

            // 常驻规则：把它的元素移出屏幕并压成零尺寸。
            // 只写 display:none 不够 —— 它自己的懒加载仍可能把首屏那几 MB 封面图拉下来。
            const st = document.createElement('style');
            st.textContent = 'html,body{margin:0;padding:0;height:100%;overflow:hidden;}'
                + 'body>:not(#vip_gate_wrap){display:none !important;max-width:0 !important;max-height:0 !important;'
                + 'overflow:hidden !important;position:absolute;left:-102030px;}';
            (document.head || document.documentElement).appendChild(st);

            // 建容器 + iframe。
            // ⚠️ 顺序很关键：必须【先挂 load 监听 → 再进 DOM → 最后才设 src】。
            //    之前用 body.innerHTML 插入，iframe 一进 DOM 就开始导航，
            //    等我们再回头找它挂监听时已经错过 load，表现就是「永远加载不出来」。
            // 容器用 fixed + 视口单位，不吃 body 的高度（宿主页自己有 360 KB 的 CSS，body 高度不可靠）
            gateWrap = document.createElement('div');
            gateWrap.id = 'vip_gate_wrap';
            gateWrap.style.cssText = 'visibility:visible!important;opacity:1!important;overflow:visible!important;'
                + 'position:fixed;top:0;left:0;width:100vw;height:100vh;margin:0;padding:0;'
                + 'z-index:1;background:#000;display:flex;justify-content:center;align-items:center;flex-direction:column;';

            const ifrEl = document.createElement('iframe');
            ifrEl.setAttribute('frameborder', '0');
            ifrEl.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
            ifrEl.setAttribute('allowfullscreen', 'true');
            ifrEl.style.cssText = 'display:block;position:absolute;top:0;left:0;width:100%;height:100%;'
                + 'border:0;margin:0;padding:0;';

            const gateSrc = GATE.api + GATE.target;

            gateWrap.appendChild(ifrEl);
            body.innerHTML = '';
            body.appendChild(gateWrap);

            // 最后一步才开始加载：容器和样式都就位了，免得加载时布局还没稳
            ifrEl.src = gateSrc;

            if (document.title === '') document.title = 'VIP追剧神器 · 播放';

            return true;
        };

        // 后到的元素靠常驻 CSS 挡；这里再移一次，避免它们留在 DOM 里参与布局
        // （容器必须保留：把它一起删掉会卸载 iframe，播放得重来）
        const dropOthers = () => {
            const body = document.body;
            if (!body || !gateWrap) return;
            Array.prototype.slice.call(body.children).forEach((el) => {
                if (el !== gateWrap) { try { el.remove(); } catch (e) { } }
            });
        };

        if (!buildGate()) {
            const waitBody = setInterval(() => { if (buildGate()) clearInterval(waitBody); }, 1);
        }
        document.addEventListener('DOMContentLoaded', dropOthers, { once: true });
        window.addEventListener('load', dropOthers, { once: true });
    }

    // 接口 / 条目的底色标记（想换颜色只改这里）
    // 规律：同一家的条目，不管在哪个标签页，都用同一个 mark —— 这样一眼能认出是同一家。
    //   special = 邦宁（红）：解析结果特殊
    //   qilin   = 66网 / 麒麟（绿）：同一家的全部入口 ——
    //             解析接口 66网1·66网2·麒麟1 ＋ 搜索跳转 66网1片库搜索 ＋ 导航 66大片网
    //   wsyzy   = 无损云（蓝）：主站 wsyzy.cc / 采集接口 api.wsyzy.net —— 采集源 + 搜索跳转 + 导航 三处同色
    //   txnp    = txnp.cn 一家（紫）：解析接口 TXNQ(bfq.) / 酥皮(art.) + 搜索跳转 cms.txnp.cn + 导航 cms.txnp.cn
    //   lxyy    = 洛雪TV（橙）：导航页（目前只有这一条）
    //   zip0    = ZIP0（青柠黄绿）：导航页第一条（作者的邀请链接）
    // ⚠️ 这是【文字颜色】，不是底色 —— 只给名字上色，不铺背景（铺背景会"顶眼睛"，看久了不舒服）。
    //    所以用实色 hex（不要带透明度）：文字色一旦半透明就会发灰、看不清。
    //    底色是深灰 #2c2e34，所以这些颜色都偏亮 —— 亮色在深底上才读得清。
    // ⚠️ 排列规则：同一家（同色）必须挨在一起，而且【三个分区的家族顺序必须一致】——
    //    下面这个声明顺序就是家族顺序：导航页 / 搜索跳转 / 解析接口 都按它排。
    //    各家的顺序在三个分区里完全相同，看熟一个分区就够了。
    // ⚠️ 配色尽量照顾色觉障碍（红绿色弱最常见）：
    //    ① 不用纯红+纯绿这一对（红绿色弱下会混成相近的黄褐色）⇒ 66网一家改用【蓝绿 teal】
    //    ② 靠色相之余也拉开明度（黄最亮、粉次之、朱红/橙居中）
    //    ③ 但要说实话：8 家颜色不可能两两都被所有色觉类型分辨。颜色在这里只是【辅助分组】——
    //       名字就写在旁边，不靠颜色也能用，所以不影响功能。
    const API_MARK_COLOR = {
        zip0: '#c6f36b',      // ① 青柠黄绿 —— ZIP0（取自它官网「找到就直接播放」那句的颜色，就是站点主色）
        txnp: '#c9a0f0',      // ② 紫红 —— txnp.cn 一家（TXNQ / 酥皮 / txnp搜索 / cms.txnp.cn）
        qilin: '#3fd9b8',     // ③ 蓝绿 —— 66大片网 / 麒麟 一家（原纯绿，色弱考虑换掉）
        wsyzy: '#5cb8ff',     // ④ 天蓝 —— 无水印资源网 / 无损云
        eco: '#ffa64d',       // ⑤ 橙  —— EcoHub 一家
        ikanbot: '#9db8d1',   // ⑥ 钢蓝灰 —— 爱看机器人（名字带「机器人」，配金属冷色；也是唯一低饱和色，最好认）
        lxyy: '#ff8fb0',      // ⑦ 粉  —— 洛雪TV
        special: '#ff6b4a'    // ⑧ 朱红 —— 邦宁（原来跟纯绿挨着，现在绿已改蓝绿）
    };

    const parseApis = [
        // ===== 解析接口【只保留已实测可用的 9 条】=====
        // 这 9 条都是逐条实测确认可用的；历史上删掉的失效条目不再收录。
        // ⚠️ 排列规则：同一家的（同色）挨在一起，且【家族顺序跟导航页 / 搜索跳转一致】
        //    （见 API_MARK_COLOR 的声明顺序）。TXNQ 那家排最前，因为它是实测里最好用的。
        {"name": "TXNQ", "type": "1,3", "url": "https://bfq.txnp.cn/player?url=", "mark": "txnp"},
        {"name": "酥皮", "type": "1,3", "url": "https://art.txnp.cn/?url=", "mark": "txnp"},
        // ===== 66大片网 / 麒麟 这一家的三个解析入口（同色 = 同一家）=====
        // 命名：66网1/2 = 走 66大片网 的两个入口；麒麟1 = 麒麟自己的接口域名。
        // 66网1：站内跳转入口（= 授权宿主页）。需要"剥 query + 不编码"的形态，所以打 clean 标记
        {"name": "66网1", "type": "3", "url": "https://www.66dpw.vip/?url=", "mark": "qilin", "clean": true, "windowOpen": true},
        // 66网2：独立解析页（内部再嵌真正的接口）。内嵌会被域名授权挡住
        {"name": "66网2", "type": "3", "url": "https://www.66dpw.vip/88888888/jiexi.html?url=", "mark": "qilin"},
        // 麒麟1：麒麟的另一个接口域名。实测 title 是「麒麟视频播放器」。
        // ⚠️ type 用 "1,3" 是故意的：66网2 内嵌被域名授权挡所以只敢写 "3"；这条静态检查没发现拦截，
        //    但静态查不出运行时的域名授权 ⇒ 写 "1,3" 让界面上能【一键切内嵌/弹窗】自己试。
        {"name": "麒麟1", "type": "1,3", "url": "https://free.maccms.xyz/?url=", "mark": "qilin"},
        // 邦宁：解析结果特殊，所以单独一个颜色。放在最后 —— 原来紧跟 66网那组（蓝绿）之后、
        // 那时 66网还是纯绿，红绿相邻对红绿色弱不友好；现在绿已换蓝绿，而且它排在家族顺序的末位。
        {"name": "邦宁", "type": "1,3", "url": "https://video.isyour.love/player/getplayer?url=", "mark": "special"},
        // ===== 以下 3 条没有颜色（不属于上面任何一家）=====
        {"name": "七哥", "type": "1,3", "url": "https://jx.202617.xyz/tv.php?url="},
        {"name": "M1907", "type": "1,2,3", "url": "https://im1907.top/?jx="},
        {"name": "Node", "type": "1,3", "url": "https://jx.nodenode.dpdns.org/?url="},
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
            <br>&nbsp;&nbsp;1、<b>「自定义设置」</b>改样式 / 快捷键 / 接口（加错的接口可在里面的「管理自定义接口」删掉）
            <br>&nbsp;&nbsp;2、<b>解析视频</b>：点击内嵌接口解析（优先试靠前的「TXNQ」「酥皮」「66网1」等；）
            <br>&nbsp;&nbsp;3、<b>播放模式</b>：点击接口右侧「内嵌/弹窗」可切换
            <br>&nbsp;&nbsp;4、<b>解析切集后</b>：换集后旧播放器会关闭，开自动解析则自动解析新集
            <br>&nbsp;&nbsp;5、<b>自动解析</b>：先在「自动解析设置」选接口，再点发呆熊/跳熊浮标开关
            <br>&nbsp;&nbsp;6、<b>快捷键</b>：Alt+V 呼出/隐藏，Alt+R 刷新接口，Alt+S 样式设置
            <br>&nbsp;&nbsp;7、<b>关闭解析</b>：点击播放器右上角 × 刷新页面恢复原视频（手机端点浮标即可开关面板）
            <br>&nbsp;&nbsp;<span style="color:#7dd3fc;"><b>8、404极阴岛 QQ 群</b>：<span style="font-size:12px;">725752181</span></span>
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
        apiTypeSelect: null,
        // ===== 采集源 / 导航 标签页 =====
        collectTab: null,
        navTab: null,
        collectKeyword: null,
        collectFilterChk: null,
        collectStatus: null,
        collectSources: null,
        collectEpisodes: null,
        collectOutput: null,
        navLinks: null
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
            /* 一行 4 个。box-sizing:border-box + 收紧内边距后，每格可用宽度比原来多 6px */
            width: calc(25% - 2px);
            box-sizing: border-box;
            line-height: 21px;
            float: left;
            border: 1px solid gray;
            padding: 0 2px;
            margin: 4px 1px;
            overflow: hidden;
            /* 改成 flex 行：名字可以被省略号截断，但「内嵌/弹窗」永远不被挤掉（否则切换不了） */
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transform: translateY(10px);
            cursor: pointer;
        }
        #${CONFIG.vipBoxId} .vip_list li .api-name {
            flex: 0 1 auto;
            min-width: 0;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            -o-text-overflow: ellipsis;
        }
        #${CONFIG.vipBoxId} .vip_list li .api-mode {
            flex: 0 0 auto;
            white-space: nowrap;
        }
        /* 解析标签页【底部】的「必看说明」：小字、左对齐、上面一条细分割线，不抢接口列表的注意力 */
        #${CONFIG.vipBoxId} .api-must-read {
            font-size: 11px;
            line-height: 1.7;
            text-align: left;
            padding: 8px 10px 4px 10px;
            margin-top: 10px;
            border-top: 1px solid rgba(255, 255, 255, 0.12);
            opacity: 0.9;
        }
        #${CONFIG.vipBoxId} .api-must-read b { color: #ffcf6b; }
        /* ⚠️ 蓝色规则必须连子孙一起写：.api-must-read b（0,1,1）作用在 <b> 上时比 .qq（0,2,0）更具体，
           只写 .qq 的话里面的 <b> 会被染成琥珀色 —— 表现就是"设了蓝色却显示黄色"。
           ⚠️ 这段 CSS 在【模板字符串】里，注释里不能写反引号，否则会把字符串截断。 */
        #${CONFIG.vipBoxId} .api-must-read .qq,
        #${CONFIG.vipBoxId} .api-must-read .qq b { color: #7dd3fc; }
        #${CONFIG.vipBoxId} .api-must-read .mr-title { color: #7dd3fc; font-weight: bold; }
        /* 标题里那个怒脸单独给红色；「👉必看说明：」继承 .mr-title 的蓝色不变 */
        #${CONFIG.vipBoxId} .api-must-read .mr-title .mr-angry { color: #ff4d4d; }
        #${CONFIG.vipBoxId} .vip_list.visible li {
            opacity: 1;
            transform: translateY(0);
            transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1) 0.1s;
        }
        #${CONFIG.vipBoxId} .complex-api-list li {
            width: calc(50% - 2px);
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
                width: calc(50% - 2px) !important;
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
        #${CONFIG.vipBoxId} #add_api_btn, #${CONFIG.vipBoxId} #manage_api_btn, #${CONFIG.vipBoxId} #open-style-set-btn, #${CONFIG.vipBoxId} #open-shortcut-set-btn, #${CONFIG.vipBoxId} #open-auto-parse-set-btn {
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
        #${CONFIG.vipBoxId} #add_api_btn:hover, #${CONFIG.vipBoxId} #manage_api_btn:hover, #${CONFIG.vipBoxId} #open-style-set-btn:hover, #${CONFIG.vipBoxId} #open-shortcut-set-btn:hover, #${CONFIG.vipBoxId} #open-auto-parse-set-btn:hover {
            background-color: #42444a;
        }
        /* 「 | 内嵌 / 弹窗」里那个字。【只有一个类 .mode】—— 能不能点不由类名区分，
           由 <li> 上有没有 data-modes 决定（访问 togglePlayMode 之前会先查它）。
           故意不加 cursor:pointer —— 可切的和不可切的长得完全一样，
           不给"看着能点、点了没反应"的假提示。 */
        .mode {
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
        /* ===== 采集源页内嵌播放器（阶段3） ===== */
        #${CONFIG.vipBoxId} .collect-player-wrap {
            margin-top: 6px;
        }
        #${CONFIG.vipBoxId} .collect-player-bar {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            margin-bottom: 4px;
            text-align: left;
        }
        /* ===== 共用的表单外观 =====
           输入框(input/select)和主按钮的外观在 4 个标签页里反复出现、属性值一模一样，
           这里集中写一份；下面各规则只留自己特有的（padding / font-size / width 等）。
           ⚠️ 顺序要求：这条必须在各具体规则【之前】—— 选择器同优先级时，靠后的才盖得住。
           ⚠️ .add-api-form .cancel-btn 改的是背景色，它选择器更具体，不受这条影响。 */
        #${CONFIG.vipBoxId} .collect-player-bar select,
        #${CONFIG.vipBoxId} .collect-search input,
        #${CONFIG.vipBoxId} .collect-url-row input,
        #${CONFIG.vipBoxId} .add-api-form input,
        #${CONFIG.vipBoxId} .add-api-form select,
        #vip-style-set-panel input,
        #vip-shortcut-set-panel input,
        #vip-auto-parse-set-panel select {
            border-radius: 3px;
            border: 1px solid #5a5a5a;
            background-color: #2c2e34;
            color: #ccc;
        }
        #${CONFIG.vipBoxId} .collect-player-bar button,
        #${CONFIG.vipBoxId} .collect-search button,
        #${CONFIG.vipBoxId} .collect-url-row button,
        #${CONFIG.vipBoxId} .add-api-form button {
            border: none;
            border-radius: 3px;
            background-color: #1c84c6;
            color: #fff;
            cursor: pointer;
        }
        #${CONFIG.vipBoxId} .collect-player-bar select {
            padding: 2px 4px;
            font-size: 11px;
        }
        #${CONFIG.vipBoxId} .collect-player-bar button {
            padding: 3px 10px;
            font-size: 11px;
        }
        /* ===== 采集源标签页 ===== */
        #${CONFIG.vipBoxId} .collect-search {
            display: flex;
            gap: 6px;
            padding: 6px 10px 0 10px;
        }
        #${CONFIG.vipBoxId} .collect-search input {
            flex: 1;
            min-width: 0;
            padding: 6px;
            font-size: 12px;
        }
        #${CONFIG.vipBoxId} .collect-search button {
            padding: 6px 12px;
            font-size: 12px;
            white-space: nowrap;
        }
        #${CONFIG.vipBoxId} .collect-filter-row {
            padding: 4px 10px 0 10px;
            font-size: 11px;
            text-align: left;
            line-height: 1.5;
        }
        #${CONFIG.vipBoxId} .collect-filter-row label {
            cursor: pointer;
            user-select: none;
        }
        #${CONFIG.vipBoxId} .collect-status {
            padding: 4px 10px;
            font-size: 11px;
            opacity: 1;
            text-align: left;
            line-height: 1.4;
        }
        /* 没有内容时整块不占位 —— 否则它会带着 padding 撑出一截空白 */
        #${CONFIG.vipBoxId} .collect-status:empty {
            display: none;
        }
        #${CONFIG.vipBoxId} .collect-sources {
            max-height: 300px;
            overflow-y: auto;
        }
        /* 功能/来源 两级分区标题 */
        #${CONFIG.vipBoxId} .collect-sec {
            font-size: 12px;
            font-weight: bold;
            text-align: left;
            padding: 5px 10px 0 10px;
            opacity: 1;
        }
        /* 「← 返回命中列表」：只在命中多部时出现（见 renderCollectEpisodeList）。
           命中列表和剧集列表渲染进同一个容器，展开剧集会把列表覆盖掉 —— 这个按钮让人退回去换一部。 */
        #${CONFIG.vipBoxId} .collect-back {
            display: inline-block;
            font-size: 11px;
            padding: 3px 8px;
            margin: 5px 0 1px 10px;
            border: 1px solid #1c84c6;
            border-radius: 2px;
            color: #7dd3fc;
            cursor: pointer;
            opacity: 1;
        }
        #${CONFIG.vipBoxId} .collect-back:hover {
            background: rgba(28, 132, 198, 0.25);
        }
        #${CONFIG.vipBoxId} .collect-src-title {
            font-size: 10px;
            text-align: left;
            padding: 4px 10px 2px 10px;
            opacity: 0.7;
        }
        /* 采集源标签页顶部那条「晚上容易卡」的提示：居中、颜色不解淡（opacity:1 且用暖色，别让它糊成一团浅灰） */
        #${CONFIG.vipBoxId} .collect-night-note {
            font-size: 11px;
            text-align: center;
            padding: 6px 8px 2px 8px;
            color: #ffcf6b;
            opacity: 1;
            line-height: 1.5;
        }
        #${CONFIG.vipBoxId} .collect-src-title.warn {
            color: #ff6b6b;
            opacity: 1;
            font-weight: bold;
        }
        #${CONFIG.vipBoxId} .collect-src-list {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            padding: 0 10px 4px 10px;
            max-height: 150px;
            overflow-y: auto;
        }
        #${CONFIG.vipBoxId} .collect-src-item {
            font-size: 11px;
            line-height: 20px;
            box-sizing: border-box;
            width: calc(33.33% - 4px);
            padding: 0 6px;
            text-align: center;
            border: 1px solid gray;
            border-radius: 2px;
            cursor: pointer;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
        }
        #${CONFIG.vipBoxId} .collect-src-item:hover {
            background: rgba(28, 132, 198, 0.15);
            border-color: #1c84c6;
        }
        #${CONFIG.vipBoxId} .collect-src-item.selected {
            background: #075985 !important;
            color: #fff;
            border-color: #7dd3fc;
        }
        /* 实测不可用的源：虚线边框 + 变暗，但仍可点击复测 */
        #${CONFIG.vipBoxId} .collect-src-item.bad {
            border-style: dashed;
            opacity: 0.7;
        }
        #${CONFIG.vipBoxId} .collect-hint {
            font-size: 10px;
            opacity: 0.85;
            margin-left: 6px;
        }
        #${CONFIG.vipBoxId} .collect-result-list {
            max-height: 220px;
            overflow-y: auto;
            padding: 0 10px;
        }
        #${CONFIG.vipBoxId} .collect-result-item {
            font-size: 12px;
            text-align: left;
            padding: 5px 6px;
            margin: 4px 0;
            border: 1px solid gray;
            border-radius: 2px;
            cursor: pointer;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
        }
        #${CONFIG.vipBoxId} .collect-result-item:hover {
            background: rgba(28, 132, 198, 0.15);
            border-color: #1c84c6;
        }
        #${CONFIG.vipBoxId} .collect-result-item.selected {
            background: #075985;
            color: #fff;
            border-color: #7dd3fc;
        }
        #${CONFIG.vipBoxId} .collect-result-item .collect-meta {
            font-size: 10px;
            opacity: 0.75;
            margin-left: 4px;
        }
        #${CONFIG.vipBoxId} .collect-episodes {
            max-height: 220px;
            overflow-y: auto;
            padding: 0 10px 6px 10px;
        }
        #${CONFIG.vipBoxId} .collect-ep-list {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
        }
        #${CONFIG.vipBoxId} .collect-route-name {
            font-size: 10px;
            text-align: left;
            opacity: 0.75;
            margin: 6px 0 3px 0;
        }
        #${CONFIG.vipBoxId} .collect-ep {
            font-size: 11px;
            line-height: 20px;
            box-sizing: border-box;
            width: calc(33.33% - 4px);
            padding: 0 4px;
            text-align: center;
            border: 1px solid gray;
            border-radius: 2px;
            cursor: pointer;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
        }
        #${CONFIG.vipBoxId} .collect-ep:hover {
            background: rgba(28, 132, 198, 0.15);
            border-color: #1c84c6;
        }
        #${CONFIG.vipBoxId} .collect-ep.selected {
            background: #075985;
            color: #fff;
            border-color: #7dd3fc;
        }
        #${CONFIG.vipBoxId} .collect-output {
            padding: 0 10px 6px 10px;
        }
        #${CONFIG.vipBoxId} .collect-url-row {
            text-align: left;
            margin-top: 4px;
        }
        #${CONFIG.vipBoxId} .collect-url-src {
            display: block;
            font-size: 10px;
            opacity: 0.75;
            margin-bottom: 3px;
        }
        #${CONFIG.vipBoxId} .collect-url-row input {
            width: 100%;
            box-sizing: border-box;
            padding: 5px;
            font-size: 11px;
        }
        #${CONFIG.vipBoxId} .collect-url-row button {
            margin-top: 4px;
            padding: 5px 14px;
            font-size: 12px;
        }
        /* ===== 导航标签页 ===== */
        #${CONFIG.vipBoxId} .nav-list {
            padding: 0 10px;
            max-height: 300px;
            overflow-y: auto;
        }
        #${CONFIG.vipBoxId} .nav-item {
            display: block;
            text-align: left;
            padding: 7px 8px;
            margin: 5px 0;
            border: 1px solid gray;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            line-height: 1.5;
        }
        #${CONFIG.vipBoxId} .nav-item:hover {
            background: rgba(28, 132, 198, 0.15);
            border-color: #1c84c6;
        }
        #${CONFIG.vipBoxId} .nav-item .nav-desc {
            display: block;
            font-size: 11px;
            opacity: 0.92;
            margin-top: 3px;
        }
        #${CONFIG.vipBoxId} .nav-item .nav-url {
            display: block;
            font-size: 10px;
            opacity: 0.7;
            margin-top: 2px;
            word-break: break-all;
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
        }
        #${CONFIG.vipBoxId} .add-api-form button {
            padding: 8px 12px;
            margin: 5px 2px;
            font-size: 12px;
        }
        #${CONFIG.vipBoxId} .add-api-form .cancel-btn {
            background-color: #72747a;
        }
        /* ===== 「管理自定义接口」面板 =====
           为什么要有它：原来 customApis 只增不减（全文件只有 push，没有删除/编辑入口），
           加错一个地址就只能去清浏览器数据。这里列出用户加过的每一条 + 一个删除按钮。
           它不在 .add-api-form 里面，所以拿不到那条共用输入框样式，这里单独写。 */
        #${CONFIG.vipBoxId} .custom-api-manage {
            display: none;
            margin: 10px;
            padding: 8px 10px;
            border-radius: 4px;
            border: 1px solid #5a5a5a;
            text-align: left;
        }
        #${CONFIG.vipBoxId} .custom-api-row {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        #${CONFIG.vipBoxId} .custom-api-row:last-child {
            border-bottom: none;
        }
        #${CONFIG.vipBoxId} .custom-api-info {
            flex: 1 1 auto;
            min-width: 0;
        }
        #${CONFIG.vipBoxId} .custom-api-name {
            display: block;
            font-size: 12px;
        }
        #${CONFIG.vipBoxId} .custom-api-url {
            display: block;
            font-size: 10px;
            opacity: 0.65;
            word-break: break-all;
        }
        #${CONFIG.vipBoxId} .custom-api-del {
            flex: 0 0 auto;
            padding: 4px 10px;
            border: none;
            border-radius: 3px;
            background-color: #b3352f;
            color: #fff;
            font-size: 11px;
            cursor: pointer;
        }
        #${CONFIG.vipBoxId} .custom-api-del:hover {
            background-color: #d13f38;
        }
        #${CONFIG.vipBoxId} .custom-api-empty {
            font-size: 11px;
            opacity: 0.7;
            text-align: center;
            padding: 2px 0;
        }
        /* 自定义接口在解析列表里的记号：中性灰蓝，不占用 7 个家族色 */
        #${CONFIG.vipBoxId} .api-custom-mark {
            color: #9fb3c8;
            font-weight: bold;
            margin-right: 1px;
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

    // ===================================================================
    // ===== 采集源页（功能 × 来源 两级分区）=====
    // 请求方式：接口地址 + ?ac=detail&wd=剧名  →  返回 JSON（vod_play_url 里是 .m3u8）
    // fmt 说明：
    //   maccms10 = 苹果CMS v10（ac=detail）
    //   maccms8  = 苹果CMS v8（ac=videolist）
    //   custom   = 非标准路径，按模板拼（{kw} 替换剧名）
    //   search   = 不是接口，直接用剧名拼好 URL 打开新标签
    //   jump     = 强制跳转：用【当前视频页地址】拼好 URL 打开新标签
    //   random   = 随机组合源（从 pool 里随机挑一个真源来搜）
    //   link     = 不是接口，点开新标签（用于纯外链型条目）
    //   info     = 纯展示，不可点（没有可用地址的条目）
    // 裸域名会由 normalizeCollectApi() 自动补 /api.php/provide/vod/
    // 数据来源：公开渠道整理的采集接口清单 + EcoHub + 18+.json
    // v 字段 = 可用性备注（部分条目在浏览器之外的环境取不到数据，以实际点开的结果为准）
    // ===================================================================
    const COLLECT_GROUPS = [
        // 四个分区：采集源 / EcoHub / 搜索跳转 / 其他。
        // 每个来源【内部】再按实测结果分子类，从「好用」排到「没用」。
        // ⚠️ 各条的 v 记的是【最近一次实测】的状态，不是永久结论：
        //    采集站的可用性会波动（站长带宽、限流、间歇宕机），同一个源两次测出不同结果是常态。
        //    复测后只需改子类归属和 v，顶层分区不用动。
        {
            sec: '采集源', src: '推荐 · 随机挑一个',
            items: [
                { name: '日常', api: '', fmt: 'random', pool: 'auto' }
            ]
        },
        {
            sec: '采集源', src: '✅ 可用',
            items: [
                { name: '期颐', api: 'https://iqiyizyapi.com/api.php/provide/vod/from/iqym3u8', fmt: 'maccms10', hit: true },
                { name: '巨量', api: 'https://api.juliang.live/api/provide/vod', fmt: 'maccms10', hit: true },
                { name: '天堂', api: 'http://caiji.dyttzyapi.com', fmt: 'maccms10', hit: true },
                { name: '豪华', api: 'https://hhzyapi.com', fmt: 'maccms10', hit: true },
                { name: '西瓜', api: 'https://caiji.xgzyapi.com', fmt: 'maccms10', hit: true },
                { name: '极速', api: 'https://jszyapi.com', fmt: 'maccms10', hit: true },
                { name: '虎牙', api: 'https://www.huyaapi.com', fmt: 'maccms10', hit: true },
                { name: '百度', api: 'https://api.apibdzy.com', fmt: 'maccms10', hit: true },
                { name: '量子', api: 'https://cj.lziapi.com', fmt: 'maccms10', hit: true },
                { name: '最大', api: 'https://api.zuidapi.com', fmt: 'maccms10', hit: true },
                { name: '无忧', api: 'https://www.wyvod.com', fmt: 'maccms10', hit: true },
                { name: '魔都', api: 'https://caiji.moduapi.cc', fmt: 'maccms10', hit: true },
                { name: '魔都2', api: 'https://caiji.moduapi.cc/api.php/provide/vod/from/modum3u8', fmt: 'maccms10', hit: true },
                // 下面两条和 EcoHub 分区里的「速博(SUBO)」「非凡(FF)」同源，两边都保留。
                // ⚠️ 与 EcoHub 分区的「速博(SUBO)」「非凡(FF)」同源，这两条的 v 里已写明，悬停可见。
                { name: '速播', api: 'https://subocj.com', fmt: 'maccms10', hit: true },
                { name: '非凡', api: 'http://api.ffzyapi.com', fmt: 'maccms10', hit: true }
            ]
        },
        {
            // 和上面「✅ 可用」是同一类结果（直连就能搜到），单独成组只因为【形状不同】：
            //   它搜索只返回视频 ID，播放地址要再按 ID 问一次详情 ⇒ 多一次请求，稍慢。
            // 这是【格式】差异，不是【策略】：对方没有拒绝我们，只是话不一样。
            sec: '采集源', src: '✅ 可用 · 稍慢',
            items: [
                { name: '沃云', api: 'http://zhibo.jishuwo.com/api/so/index.php?wd={kw}', fmt: 'woyun', detail: 'http://zhibo.jishuwo.com/api/so/index.php?ac=detail&id={id}', hit: true }
            ]
        },
        {
            sec: '采集源', src: '⚠️ 可用，代理稍慢',
            items: [
                { name: '酷播', api: 'https://api.yzzy-api.com/inc/apijson.php', fmt: 'maccms10' },
                { name: '如意', api: 'https://cj.rycjapi.com', fmt: 'maccms10' },
                { name: 'U酷', api: 'https://api.ukuapi.com', fmt: 'maccms10' },
                { name: '爱坤', api: 'http://www.ikunzy.com', fmt: 'maccms10' }
            ]
        },
        {
            // 和上面「✅ 可用」是同一类结果（都能搜到），分开只是因为机制不同：
            //   这些站点禁用了关键词搜索，脚本识别到之后会自动改走「联想接口 + 按 ID 取详情」
            // 识别信号有两种形态，两种都处理：
            //   一种是把拒绝包成 JSON 错误码返回，另一种是直接回一句纯文本
            sec: '采集源', src: '✅ 可用 · 自动换接口',
            items: [
                { name: '茅台', api: 'https://caiji.maotaizy.cc', fmt: 'maccms10' },
                { name: '天涯', api: 'https://tyyszyapi.com', fmt: 'maccms10' },
                { name: '牛牛', api: 'https://api.niuniuzy.me', fmt: 'maccms10' },
                { name: '丫丫', api: 'https://cj.yayazy.net', fmt: 'maccms10' },
                { name: 'OK', api: 'http://api.okzyw.net', fmt: 'maccms10' },
                { name: '无损云', api: 'https://api.wsyzy.net', fmt: 'maccms10', mark: 'wsyzy' }
            ]
        },
        {
            sec: 'EcoHub', src: '✅ 可用',
            items: [
                { name: '默认', api: 'https://jinyingzy.com/api.php/provide/vod', fmt: 'maccms10', hit: true },
                { name: '速博(SUBO)', api: 'https://subocaiji.com/api.php/provide/vod', fmt: 'maccms10', hit: true },
                { name: '金鹰2(JY)', api: 'https://jyzyapi.com/api.php/provide/vod', fmt: 'maccms10', hit: true },
                { name: '非凡(FF)', api: 'http://cj.ffzyapi.com/api.php/provide/vod/', fmt: 'maccms10', hit: true },
                { name: 'HD(LY)', api: 'https://360zy.com/api.php/provide/vod/at/json', fmt: 'maccms10', hit: true },
                { name: 'U酷(UKU)', api: 'https://api.ukuapi88.com/api.php/provide/vod', fmt: 'maccms10', hit: true },
                { name: '光速(GS)', api: 'https://api.guangsuapi.com/api.php/provide/vod/json', fmt: 'maccms10', hit: true },
                { name: 'HD(BF)', api: 'https://bfzyapi.com/api.php/provide/vod/', fmt: 'maccms10', hit: true },
                { name: '红牛(HN)', api: 'https://www.hongniuzy2.com/api.php/provide/vod/at/json', fmt: 'maccms10', hit: true }
            ]
        },
        {
            // 和「✅ 可用」也是同一类结果（都能搜到），单独成组是因为它走的是第三条机制：
            //   关键词搜被拒 → 联想接口也被拒 → 改翻最近几页列表，在本地按剧名找。
            // ⚠️ 这条机制只对「最近更新过」的剧有效 —— 这类站分页总数上万，找老剧翻两页不可能命中。
            sec: 'EcoHub', src: '✅ 可用 · 只能找新剧',
            items: [
                { name: '樱花(YH)', api: 'https://m3u8.apiyhzy.com/api.php/provide/vod/', fmt: 'maccms10' }
            ]
        },
        {
            sec: 'EcoHub', src: '⚠️ 可用，代理稍慢',
            items: [
                { name: 'HD(IK)', api: 'https://ikunzyapi.com/api.php/provide/vod/at/json', fmt: 'maccms10' }
            ]
        },
        {
            sec: '搜索跳转', src: '跳到对方站自己搜',
            items: [
                // 排列：家族顺序跟导航页 / 解析接口【保持一致】（见 API_MARK_COLOR 的声明顺序），无色的沉底
                { name: 'txnp搜索', api: 'https://cms.txnp.cn/index.php/vod/search.html?wd={kw}', fmt: 'search', mark: 'txnp' },
                { name: '66网1片库搜索', api: 'https://www.66dpw.vip/vodsearch/-------------.html?wd={kw}', fmt: 'search', mark: 'qilin' },
                { name: '无损云搜索', api: 'http://wsyzy.cc/index.php/vod/search.html?wd={kw}&submit=search', fmt: 'search', mark: 'wsyzy' },
                { name: 'EcoHub站', api: 'https://eco.fe-spark.cn/search?search={kw}', fmt: 'search', mark: 'eco' },
                { name: '爱看机器人（主）', api: 'https://www.ikanbot.com/search?q={kw}', fmt: 'search', mark: 'ikanbot' },
                { name: '爱看机器人（备）', api: 'http://ikanbot.eu.org/search?q={kw}', fmt: 'search', mark: 'ikanbot' }
            ]
        },
    ];

    // 扁平化：让「渲染顺序」和「点击索引」永远一致，避免漏项/错位
    const COLLECT_ALL = [];
    COLLECT_GROUPS.forEach((g) => {
        g.items.forEach((it) => {
            it.sec = g.sec;
            it.src = g.src;
            // 成人标记只看条目自己的 adult 字段；分区标题的 warn 只负责样式，不再兼作成人判定
            it._idx = COLLECT_ALL.length;
            COLLECT_ALL.push(it);
        });
    });

    // ===== 导航（纯外链，点击用 GM_openInTab 打开）=====
    const NAV_LINKS = [
        // ⚠️ 排列规则：
        //   ① 同色的必须挨在一起；
        //   ② 家族顺序跟搜索跳转 / 解析接口保持一致（见 API_MARK_COLOR 的声明顺序）——
        //      在一个分区看熟了顺序，到别的分区不用重新找；
        //   ③ 带颜色的排在前面（它们是"有来头"的站），不带颜色的沉底。
        { name: 'ZIP0', url: 'https://zip0.com/?r=0LUAMJ', mark: 'zip0', desc: '在线影视聚合搜索，一次查询多个公开来源 · 覆盖电影 / 短剧 / 电视剧 / 综艺 / 纪录片 / 体育 · 另有看电视 / 听广播 / 音乐 / 小游戏 · (❤️ ω ❤️) 作者力推，非常推荐 · ┏ (゜ω゜)=👉 邀请链接' },
        { name: 'cms.txnp.cn', url: 'https://cms.txnp.cn/', mark: 'txnp', desc: '免费短视频分享站，影视 / 短视频 / 动漫 / 综艺 / 学习 / 音乐等分类，自带搜索' },
        { name: '66大片网', url: 'https://www.66dpw.vip/', mark: 'qilin', desc: '电影 / 动漫 / 短剧 / 综艺等，各分类上万部，每日更新，手机端流畅播放' },
        { name: '无水印资源网', url: 'http://wsyzy.cc/', mark: 'wsyzy', desc: '电影 / 电视剧 / 美剧 / 韩剧 / 综艺 / 动漫 / 短剧 / 纪录片，站内标称 12.5 万条，自带搜索（首次需验证码）· ⚠️ 它自带的播放器会做 P2P 上传、占用上行带宽' },
        { name: 'EcoHub 演示站', url: 'https://eco.fe-spark.cn/', mark: 'eco', desc: '开源多播放源聚合站（电视剧 / 电影 / 动漫 / 综艺 / 体育），站点自述「自动采集、多播放源集成」' },
        { name: '爱看机器人', url: 'https://www.ikanbot.com/', mark: 'ikanbot', desc: '全网影视资源搜索引擎（爬虫检索免费在线影视），自带搜索' },
        { name: '洛雪TV', url: 'https://tv.lxyy.club/', mark: 'lxyy', desc: '影视推荐聚合（电影 / 电视剧 / 动漫 / 综艺 / 短剧），多来源聚合搜索；搜索在前端做，URL 带不了关键词' },
        // 以下三条不带颜色（不属于任何一个"家族"）
        { name: '网盘资源导航', url: 'https://wangpanziyuan.pages.dev/', desc: '电子书 / 漫画 / 影视 / 游戏 / 音乐 / 学习资料 / 办公软件的网盘合集，站内标称 10 万+ 资源' },
        { name: '动漫共和国', url: 'https://666.oneghg.com/', desc: '日漫 / 国创 / 经典番剧 / 剧场版免费在线追番，另有安卓 / iOS / Windows 客户端' },
        { name: '小小漫迷', url: 'https://xxmanmi.com/', desc: '动漫在线观看，另有电影 / 综艺 / 美剧 / 韩剧 / 短剧分类，自带搜索' }
    ];

    const COLLECT_TIMEOUT = 15000;      // 单请求超时(ms)
    // ===== 采集代理兜底（方案 A）=====
    // 直连失败时，把目标地址拼在代理后面重试（前缀式：代理地址 + 目标URL）
    // 直连失败的源走这个代理重试（第三方服务，可用性与安全性自负）
    // ⚠️ 这是第三方服务器：只在【直连失败】时才用；想彻底关掉就把下面这一行改成空字符串 ''
    const COLLECT_PROXY = 'https://p.xbta.cc/';
    // 已经在代理 / 跨域服务上的地址，不再重复套代理
    const COLLECT_PROXY_SKIP = /^\s*?https?:\/\/(?:[^\/]+?\.)?(?:cors|p\.xbta|seep\.eu|codetabs|similarsites)\./i;
    const COLLECT_PROXY_MAXFAIL = 3;    // 代理连续失败几次，就本次会话停用代理
    const COLLECT_LIST_MAXPAGE = 2;     // 「翻最近列表」兜底最多翻几页（每页 20 条，写死防止无限翻）
    const COLLECT_TWOSTEP_MAX = 3;      // 「两步型」源（沃云）搜索命中很多时，最多跟几条去取详情。
                                        // 实测搜「斗破」沃云一次返回 20 条，而每条都要一次详情请求 —— 不封顶就会连打 20 次。
    let collectProxyUsed = 0;           // 统计：本次会话成功走代理几次
    let collectProxyFail = 0;           // 连续失败计数
    // ===== 采集源内嵌播放器（阶段3）=====
    // collectPlayerMode：art = Artplayer；native = 原生 <video controls>
    const COLLECT_PLAYER_KEY = 'collect_player_mode';
    let collectPlayerMode = GM_getValue(COLLECT_PLAYER_KEY, 'art') === 'native' ? 'native' : 'art';
    // 两个库用 @resource 注册，只在真要播的时候才取出来注入 iframe（不给每个页面拖负担）
    const COLLECT_PLAYER_SANDBOX = 'allow-scripts allow-same-origin';
    const COLLECT_PLAYER_ALLOW = 'autoplay; fullscreen; encrypted-media';
    const COLLECT_STATE = { items: [], current: null, sourceIdx: -1, busy: false, keyword: '', listName: '' };

    // 剧名清洗用的噪声词（站点名 / 类型词）
    const COLLECT_NOISE_RE = /^(电视剧|电影|动漫|番剧|综艺|纪录片|短剧|网剧|美剧|韩剧|日剧|港剧|国漫|全集|高清|正片|预告|预告片|花絮|在线观看|免费观看|手机版|电脑版|完整版|抢先版|国语|粤语|中文版|bilibili|哔哩哔哩|爱奇艺|腾讯视频|优酷|芒果tv|搜狐视频|乐视|pptv|西瓜视频|1905电影网|咪咕视频|好看视频|acfun|抖音|快手)$/i;

    function escapeAttr(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // 裸域名 → 补全 MacCMS 标准路径
    function normalizeCollectApi(api) {
        if (!api) return '';
        if (/^https?:\/\/[^\/]+\/?$/i.test(api)) {
            return api.replace(/\/+$/, '') + '/api.php/provide/vod/';
        }
        return api;
    }

    // 拼搜索地址
    function buildCollectUrl(source, keyword) {
        const kw = encodeURIComponent(keyword);
        // search / woyun：非常规路径，直接套模板
        if (source.fmt === 'search' || source.fmt === 'woyun') {
            return String(source.api).replace('{kw}', kw);
        }
        const api = normalizeCollectApi(source.api);
        const sep = api.indexOf('?') >= 0 ? '&' : '?';
        const ac = source.fmt === 'maccms8' ? 'ac=videolist' : 'ac=detail';
        return api + sep + ac + '&wd=' + kw;
    }

    // 取站点根地址（用于拼 suggest / 详情接口）
    function collectBaseUrl(api) {
        try { return new URL(api).origin; } catch (e) { return String(api || '').replace(/\/+$/, ''); }
    }

    // 判断接口是否明确「禁止关键词搜索」（苹果CMS 的 code=1002）
    function isKeywordSearchForbidden(json) {
        if (!json) return false;
        if (Number(json.code) === 1002) return true;
        return /forbids?\s*keyword|禁止[\s\S]{0,4}搜索|不支持[\s\S]{0,4}搜索/i.test(String(json.msg || ''));
    }

    // 单次 JSON 请求（GM_xmlhttpRequest 由扩展发出，不受同源策略限制）
    function requestJsonOnce(url, timeout) {
        return new Promise((resolve) => {
            if (typeof GM_xmlhttpRequest !== 'function') {
                resolve({ ok: false, error: 'GM_xmlhttpRequest 不可用' });
                return;
            }
            let settled = false;
            const finish = (r) => { if (!settled) { settled = true; resolve(r); } };
            try {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    timeout: timeout || COLLECT_TIMEOUT,
                    headers: { 'Accept': 'application/json, text/plain, */*' },
                    onload: (res) => {
                        // 记下 HTTP 状态码。只看正文的话，「403 被拒」和「200 返回一张网站首页」
                        // 会被归成同一类（都叫「返回的是 HTML 网页」），看不出真实病因。
                        const status = (res && res.status) || 0;
                        const st = status ? '（HTTP ' + status + '）' : '';
                        // gotResponse = 对方确实回了话（区别于连不上）—— 上层靠它判断值不值得换打法
                        const failBase = { ok: false, gotResponse: true, status: status };
                        const text = ((res && res.responseText) || '').trim();
                        if (!text) { finish(Object.assign({}, failBase, { error: '空响应' + st })); return; }
                        // 先判断是不是被防护页 / 网页挡住（有些源返回 HTML 而不是接口数据）
                        if (/^\s*<|Just a moment|Attention Required|cf-browser|Sorry, you have been blocked|Enable JavaScript and cookies/i.test(text)) {
                            const cf = /cloudflare|Just a moment|Attention Required|you have been blocked|Enable JavaScript and cookies/i.test(text);
                            finish(Object.assign({}, failBase, {
                                cf: cf,
                                error: (cf ? '被 Cloudflare / 人机验证拦截' : '返回的是 HTML 网页，不是采集接口') + st
                            }));
                            return;
                        }
                        let json = null;
                        try { json = JSON.parse(text); } catch (e) { /* 下面做宽松提取 */ }
                        if (!json) {
                            const m = text.match(/\{[\s\S]*\}/);
                            if (m) { try { json = JSON.parse(m[0]); } catch (e2) { json = null; } }
                        }
                        if (!json) {
                            // 站点用【纯文本】回绝关键词搜索（实测就是 6 个字节的「暂不支持搜索」）——
                            // 这和苹果CMS 的 code=1002 是同一件事，只是没包成 JSON。
                            // 标记出来交给上层，改走「联想接口 + ids 详情」两步法，否则这条就白死了。
                            if (/暂不支持[\s\S]{0,6}搜索|forbids?\s*keyword|禁止[\s\S]{0,6}搜索|不支持[\s\S]{0,6}搜索/i.test(text)) {
                                finish(Object.assign({}, failBase, { error: '不支持关键词搜索', searchForbidden: true, text: text.slice(0, 120) }));
                                return;
                            }
                            finish(Object.assign({}, failBase, { error: '返回不是 JSON' + st + '：' + text.slice(0, 50).replace(/\s+/g, ' ') }));
                            return;
                        }
                        finish({ ok: true, data: json, status: status });
                    },
                    ontimeout: () => finish({ ok: false, error: '超时' }),
                    onerror: () => finish({ ok: false, error: '请求失败' }),
                    onabort: () => finish({ ok: false, error: '已中断' })
                });
            } catch (e) {
                finish({ ok: false, error: String((e && e.message) || e) });
            }
        });
    }

    // 代理显示名：只取域名（例 p.xbta.cc），状态栏里一眼能看出走的是哪个代理
    function proxyLabel(u) {
        try {
            return String(u).replace(/^https?:\/\//i, '').replace(/\/.*$/, '') || String(u);
        } catch (e) {
            return String(u);
        }
    }

    // 带代理兜底的 JSON 请求：直连优先，只有【直连失败】才走第三方代理（方案 A）
    async function requestJson(url, timeout) {
        const direct = await requestJsonOnce(url, timeout);
        if (direct.ok) return direct;
        if (!COLLECT_PROXY) return direct;                              // 代理已关闭
        if (COLLECT_PROXY_SKIP.test(url)) return direct;                // 已在代理/跨域服务上
        if (collectProxyFail >= COLLECT_PROXY_MAXFAIL) return direct;   // 代理连续失败，本次会话停用
        const proxied = await requestJsonOnce(COLLECT_PROXY + url, timeout);
        if (proxied.ok) {
            collectProxyFail = 0;
            collectProxyUsed++;
            proxied.viaProxy = true;
            proxied.proxyUrl = COLLECT_PROXY;   // 记下走的是哪个代理，供界面显示
            return proxied;
        }
        collectProxyFail++;
        // 直连是网络错误、但代理那边拿到了「不支持关键词搜索」的正文时，用代理的结果
        // （否则这条会被当成普通失败，白白错过联想接口两步法）
        if (!direct.searchForbidden && proxied.searchForbidden) return proxied;
        return direct;   // 返回直连的原始错误（更真实，也方便排查）
    }

    // 备用搜索：先用 /index.php/ajax/suggest 拿 id，再用 ac=detail&ids= 取详情
    // 有些采集站禁用了 ?wd= 关键词搜索，但联想接口仍然可用
    async function fetchBySuggest(api, keyword) {
        const base = collectBaseUrl(api);
        const sres = await requestJson(base + '/index.php/ajax/suggest?mid=1&wd=' + encodeURIComponent(keyword));
        if (!sres.ok) {
            return { ok: false, error: '联想接口失败：' + sres.error, gotResponse: !!sres.gotResponse, cf: !!sres.cf };
        }
        const arr = (sres.data && sres.data.list) || [];
        const ids = arr
            .map((x) => (x && x.id != null ? x.id : (x && x.vod_id)))
            .filter((x) => x != null && x !== '')
            .slice(0, 5);
        if (!ids.length) return { ok: false, error: '联想接口没有结果', gotResponse: true };
        const dres = await requestJson(base + '/api.php/provide/vod/?ac=detail&ids=' + ids.join(','));
        if (!dres.ok) {
            return { ok: false, error: '详情接口失败：' + dres.error, gotResponse: !!dres.gotResponse, cf: !!dres.cf };
        }
        return { ok: true, data: dres.data, viaProxy: !!dres.viaProxy, proxyUrl: dres.proxyUrl || '' };
    }

    // 最后一条兜底：翻最近几页列表，在本地按剧名找。
    // 有些站把「按名字问」的两条路都堵死了（?wd= 被拒、联想接口也被拒），但「按页拉列表」还开着。
    // 列表里的条目结构和正常搜索结果一模一样（直接带着播放地址）⇒ 挑出来就能喂给后面的流程，
    // 不需要另写一套解析。
    // ⚠️ 只对「最近更新过」的剧有效：这类站分页总数上万，找老剧翻两页（40 条）不可能命中。
    async function fetchByRecentList(api, keyword) {
        const base = collectBaseUrl(api);
        for (let pg = 1; pg <= COLLECT_LIST_MAXPAGE; pg++) {
            const res = await requestJson(base + '/api.php/provide/vod/?ac=videolist&pg=' + pg);
            if (!res.ok) return { ok: false, error: '第 ' + pg + ' 页失败：' + res.error };
            const list = (res.data && Array.isArray(res.data.list)) ? res.data.list : [];
            if (!list.length) break;   // 没有更多页了
            const hit = list.filter((x) => String((x && x.vod_name) || '').indexOf(keyword) >= 0);
            if (hit.length) {
                return {
                    ok: true,
                    data: { code: 1, list: hit },       // 伪装成一次正常搜索结果，后面的解析/渲染完全复用
                    viaProxy: !!res.viaProxy,
                    proxyUrl: res.proxyUrl || '',
                    page: pg,
                };
            }
        }
        return { ok: false, error: '翻了最近 ' + COLLECT_LIST_MAXPAGE + ' 页没找到' };
    }

    // MacCMS JSON → 统一结构
    function parseMaccmsJson(json) {
        const list = (json && json.list) || [];
        const out = [];
        list.forEach((item) => {
            if (!item || !item.vod_play_url) return;
            const froms = String(item.vod_play_from || '').split('$$$');
            const groups = String(item.vod_play_url).split('$$$');
            const episodes = [];
            groups.forEach((group, gi) => {
                const fromName = String(froms[gi] || ('线路' + (gi + 1))).trim();
                String(group).split('#').forEach((seg) => {
                    if (!seg) return;
                    // 苹果CMS 的段是「剧集名$地址」。但有的源给的是【裸地址】段，没有 `$` 前缀
                    // —— 实测 乐园(18) 的 ckplayer 线路就是这样：
                    //      http://zyznygvideo.m6b3xt5.com/…/hls/encrypt/index.m3u8
                    // 旧写法在这里直接 return，把整段丢掉 ⇒ 该源被判成「返回 1 部，但都取不到播放地址」。
                    // 现在退化成「整段当 url、label 用默认值」，下面那句 /^https?:\/\// 仍然兜底。
                    const pos = seg.indexOf('$');
                    const label = pos < 0 ? '' : seg.slice(0, pos).trim();
                    const url = (pos < 0 ? seg : seg.slice(pos + 1)).trim();
                    if (!/^https?:\/\//i.test(url)) return;
                    // 不再强制要求 .m3u8/.mp4 后缀：有些线路给的是无扩展名的分享链接（如 /share/xxxx）
                    episodes.push({ label: label || '播放', url: url, from: fromName });
                });
            });
            if (!episodes.length) return;
            out.push({
                id: item.vod_id,
                name: String(item.vod_name || '').trim(),
                typeId: String(item.type_id == null ? '' : item.type_id),
                typeName: String(item.type_name || ''),
                year: String(item.vod_year || ''),
                remarks: String(item.vod_remarks || ''),
                pic: String(item.vod_pic || ''),
                episodes: episodes
            });
        });
        return out;
    }

    // ===== 两步型源（沃云）=====
    // 它的搜索响应是自研格式 { code, data:{ search_info, videos:[{ vod_id, vod_name, type_name, vod_time, detail_url }] } }，
    // 【里面没有播放地址】，得拿 vod_id 再问一次 ?ac=detail&id= 才拿到 play_info.play_urls。
    // 这属于【格式】不同（对方正常答应了、只是话不一样），不是【策略】（对方拒绝了换个打法），
    // 所以它不占兜底链的位子，也不复用 suggest / 翻列表那两条。
    // ⚠️ 搜索里那个 detail_url 是【相对 /api/so/ 的】相对路径（如 index.php?ac=detail&id=86003），
    //    不是相对网站根目录 —— 这个基址搞错过一次，直接把沃云判成了「只给网站详情页、不给播放地址」。
    //    所以这里不解析 detail_url，改用数据里写死的 detail 模板（见 COLLECT_GROUPS 里沃云那条）。
    function parseWoyunSearch(json) {
        const vids = (json && json.data && json.data.videos) || [];
        const out = [];
        vids.forEach((v) => {
            if (!v || v.vod_id == null) return;
            out.push({
                id: String(v.vod_id),
                name: String(v.vod_name || '').trim(),
                typeName: String(v.type_name || ''),
                time: String(v.vod_time || '')
            });
        });
        return out;
    }

    // 取沃云一条命中的播放地址。走 requestJson，所以自动享受代理兜底。
    async function fetchWoyunDetail(src, hit) {
        if (!src.detail) return null;
        const url = String(src.detail).replace('{id}', encodeURIComponent(hit.id));
        const res = await requestJson(url);
        if (!res.ok || !res.data) return null;
        const d = res.data.data || {};
        const basic = d.basic_info || {};
        const list = (d.play_info && d.play_info.play_urls) || [];
        const episodes = [];
        list.forEach((e, i) => {
            if (!e) return;
            const u = String(e.url || '').trim();
            if (!/^https?:\/\//i.test(u)) return;   // 只要真地址，相对路径一律丢
            episodes.push({
                label: String(e.name || ('第' + (i + 1) + '集')).trim(),
                url: u,
                from: '沃云'
            });
        });
        if (!episodes.length) return null;
        return {
            viaProxy: !!res.viaProxy,
            proxyUrl: res.proxyUrl,
            item: {
                id: hit.id,
                name: String(basic.vod_name || hit.name || '').trim(),
                // 沃云不返回 type_id
                typeId: '',
                typeName: String(basic.type_name || hit.typeName || ''),
                year: '',
                remarks: String(hit.time || ''),
                pic: '',
                episodes: episodes
            }
        };
    }

    // 剧名草稿：从 document.title 取第一段并清洗（仅作默认值，用户可手动修改）
    // 例：「兰香如故_07_电视剧」→「兰香如故」
    function guessVideoTitle() {
        const raw = String(document.title || '').trim();
        if (!raw) return '';
        // 去掉括号内容
        let t = raw.replace(/[（(【\[][^）)】\]]{0,24}[）)】\]]/g, ' ');
        // 按分隔符切段
        const parts = t.split(/[|｜/\\\-–—_·•:：,，]/).map(s => s.trim()).filter(Boolean);
        if (!parts.length) return raw;
        // 取第一个「不是站点名/类型词」的段
        let pick = '';
        for (let i = 0; i < parts.length; i++) {
            if (!COLLECT_NOISE_RE.test(parts[i])) { pick = parts[i]; break; }
        }
        if (!pick) pick = parts[0];
        // 段内去掉「第X集」「X集」及其后内容
        pick = pick.replace(/\s*第\s*\d+\s*[集话話期章回][\s\S]*$/, '');
        pick = pick.replace(/\s*\d{1,4}\s*[集话話期章回][\s\S]*$/, '');
        pick = pick.replace(/\s*(在线观看|免费观看|在线播放|完整版|全集|抢先版)[\s\S]*$/, '');
        // 丢掉段内残留的噪声词与孤立数字（如「兰香如故 07」→「兰香如故」）
        const kept = pick.split(/\s+/)
            .map(s => s.trim())
            .filter(s => s && !COLLECT_NOISE_RE.test(s) && !/^\d{1,4}$/.test(s) && !/^\d{1,2}[-~]\d{1,2}$/.test(s));
        const out = kept.join(' ').trim();
        return out || pick.trim();
    }

    function setCollectStatus(text) {
        if (DOM_CACHE.collectStatus) DOM_CACHE.collectStatus.textContent = text || '';
    }

    // 清空采集源页的"上屏内容"（剧集列表 + 输出区）。
    // 搜索前、跳转前都要清，否则上一次的结果会留在那儿，看起来像是重复了。
    function clearCollectView() {
        if (DOM_CACHE.collectEpisodes) DOM_CACHE.collectEpisodes.innerHTML = '';
        if (DOM_CACHE.collectOutput) DOM_CACHE.collectOutput.innerHTML = '';
    }

    // 源列表渲染：功能(sec) 一级 → 来源(src) 二级
    function renderCollectSourceList() {
        const box = DOM_CACHE.collectSources;
        if (!box) return;
        let html = '';
        let lastSec = '';
        COLLECT_GROUPS.forEach((g) => {
            if (g.sec !== lastSec) {
                html += '<div class="collect-sec">【' + g.sec + '】</div>';
                lastSec = g.sec;
            }
            html += '<div class="collect-src-title' + (g.warn ? ' warn' : '') + '">'
                + g.src + '（' + g.items.length + '）'
                + (g.hint ? ' <span class="collect-hint">' + g.hint + '</span>' : '')
                + '</div><div class="collect-src-list">';
            g.items.forEach((it) => {
                const idx = it._idx;
                const cls = 'collect-src-item' + (it.bad ? ' bad' : '');
                const mStyle = it.mark ? ' style="color:' + (API_MARK_COLOR[it.mark] || 'inherit') + ';"' : '';
                // 「日常」这类随机组合源没有地址，悬停时把池子里有哪些源列出来
                let tip = it.name + (it.api ? '：' + it.api : '');
                if (it.fmt === 'random') {
                    const pool = COLLECT_ALL.filter((x) => x.hit && x.fmt !== 'random');
                    tip += '：随机池 ' + pool.length + ' 个源 —— ' + pool.map((x) => x.name).join(' / ');
                }
                html += '<span class="' + cls + '"' + mStyle + ' data-idx="' + idx + '" title="' + escapeAttr(tip) + '">'
                    + escapeAttr(it.name) + '</span>';
            });
            html += '</div>';
        });
        box.innerHTML = html;
    }

    // 命中多部时：先给片名列表让用户挑（只显示当前这一个源的）
    function renderCollectTitles(items, srcName) {
        const box = DOM_CACHE.collectEpisodes;
        if (!box) return;
        // 记住这一批结果的来源显示名：从剧集列表点「← 返回」时要用它重建标题
        COLLECT_STATE.listName = srcName || '';
        if (items.length === 1) {
            renderCollectEpisodeList(items[0], srcName);
            return;
        }
        let html = '<div class="collect-sec">[「' + escapeAttr(srcName) + '」命中 ' + items.length + ' 部]</div><div class="collect-result-list">';
        items.forEach((it, i) => {
            html += '<div class="collect-result-item" data-ti="' + i + '" title="' + escapeAttr(it.name) + '">'
                + escapeAttr(it.name)
                + (it.year ? ' <em>' + escapeAttr(it.year) + '</em>' : '')
                + '<span class="collect-meta">' + collectRouteInfo(it).length + ' 线路 · ' + it.episodes.length + ' 段'
                + (it.remarks ? ' · ' + escapeAttr(it.remarks) : '') + '</span></div>';
        });
        html += '</div>';
        box.innerHTML = html;
    }

    // 线路统计：同一部片常有 2 条以上线路，标签经常完全一样，必须分组才读得出来
    function collectRouteInfo(item) {
        const lines = [];
        const map = {};
        item.episodes.forEach((ep, i) => {
            const key = ep.from || '默认线路';
            if (!map[key]) { map[key] = { name: key, segs: [] }; lines.push(map[key]); }
            map[key].segs.push({ ep: ep, idx: i });
        });
        return lines;
    }

    // 剧集列表：按线路分组（平铺会把多条线路的同名标签挤成一片，看不出哪条是哪条）
    function renderCollectEpisodeList(item, srcName) {
        const box = DOM_CACHE.collectEpisodes;
        if (!box) return;
        const lines = collectRouteInfo(item);
        let html = '';
        // 「← 返回命中列表」：只有命中【多部】时才出现（命中 1 部时本来就没有上一层，见 renderCollectTitles）。
        // 为什么需要它：结果列表和剧集列表渲染进的是【同一个容器】，展开剧集会把列表覆盖掉，
        // 想换一部就得重新点源按钮、重新发请求。但那批结果其实还在 COLLECT_STATE.items 里，
        // 重渲染一下就回去了 —— 不多发任何一个请求。
        if (COLLECT_STATE.items.length > 1) {
            html += '<span class="collect-back" data-back="1">← 返回命中列表（' + COLLECT_STATE.items.length + ' 部）</span>';
        }
        html += '<div class="collect-sec">[' + escapeAttr(item.name) + ' · ' + escapeAttr(srcName || '')
            + ' · ' + lines.length + ' 线路 / 共 ' + item.episodes.length + ' 段]</div>';
        lines.forEach((ln) => {
            html += '<div class="collect-route-name">' + escapeAttr(ln.name) + ' · ' + ln.segs.length + ' 集</div>'
                + '<div class="collect-ep-list">';
            ln.segs.forEach((s) => {
                html += '<span class="collect-ep" data-ei="' + s.idx + '" title="' + escapeAttr(s.ep.label + ' · ' + s.ep.from) + '">'
                    + escapeAttr(s.ep.label) + '</span>';
            });
            html += '</div>';
        });
        box.innerHTML = html;
    }

    // 复制到剪贴板（带降级）
    function copyTextToClipboard(inputEl, text) {
        let copied = false;
        try {
            inputEl.select();
            inputEl.setSelectionRange(0, 99999);
            copied = document.execCommand('copy');
        } catch (e) { copied = false; }
        if (!copied && navigator.clipboard) {
            navigator.clipboard.writeText(text).catch(() => {});
            copied = true;
        }
        try {
            Swal.fire({
                title: copied ? '已复制' : '请手动复制',
                text: copied ? '已复制到剪贴板' : '自动复制失败，请手动选中复制',
                icon: copied ? 'success' : 'warning',
                toast: true,
                position: 'center',
                timer: copied ? 1500 : 2500,
                showConfirmButton: false
            });
        } catch (e) {}
    }

    // ===== 采集源内嵌播放器（阶段3）=====
    // 做法：把 hls.js（+ artplayer）和初始化代码拼成一个完整 HTML，
    //       用 document.write 塞进一个沙盒 iframe 里跑。
    // 为什么用 iframe：
    //   1) 完全隔离 —— 不会被任意视频站的 CSS / JS 干扰
    //   2) 沙盒带 allow-same-origin，iframe 保持父页面源，hls.js 拉 m3u8 时 Origin 正常（CORS 才过得去）
    //   3) 以后做 m3u8 去广告时，拦截逻辑可以直接注入同一个 iframe

    // 从 @resource 取库源码；取不到返回空串
    function getPlayerLib(name) {
        try {
            if (typeof GM_getResourceText === 'function') return GM_getResourceText(name) || '';
        } catch (e) { }
        return '';
    }

    // 把库源码安全地放进内联 script
    function escapeInlineScript(src) {
        return String(src || '').replace(/<\/script>/gi, '<\\/script>');
    }

    // 生成播放器 iframe 的完整 HTML
    function buildPlayerHtml(videoUrl, mode) {
        const hlsSrc = getPlayerLib('hlsJs');
        const artSrc = mode === 'art' ? getPlayerLib('artPlayerJs') : '';
        const urlJs = JSON.stringify(String(videoUrl || ''));

        const initNative = '(function(){'
            + 'var wrap=document.getElementById("wrap");'
            + 'var url=' + urlJs + ';'
            + 'var v=document.createElement("video");'
            + 'v.controls=true;v.autoplay=true;v.muted=true;v.setAttribute("playsinline","");'
            + 'v.style.cssText="width:100%;height:100%;background:#000;display:block;";'
            + 'wrap.appendChild(v);'
            + 'if(window.Hls&&Hls.isSupported()){var hls=new Hls();hls.loadSource(url);hls.attachMedia(v);}'
            + 'else if(v.canPlayType("application/vnd.apple.mpegurl")){v.src=url;}'
            + 'else{wrap.innerHTML=\'<div class="err">这个浏览器不支持 HLS 播放</div>\';}'
            + '})();';

        const initArt = '(function(){'
            + 'if(typeof Hls==="undefined"||typeof Artplayer==="undefined"){'
            + 'document.getElementById("wrap").innerHTML=\'<div class="err">播放器库没加载出来（@resource 可能没取到）</div>\';return;}'
            + 'new Artplayer({'
            + 'container:"#wrap",'
            + 'url:' + urlJs + ','
            + 'type:"m3u8",'
            + 'customType:{m3u8:function(video,url){'
            + 'if(Hls.isSupported()){var hls=new Hls();hls.loadSource(url);hls.attachMedia(video);}'
            + 'else if(video.canPlayType("application/vnd.apple.mpegurl")){video.src=url;}'
            + '}},'
            + 'autoplay:true,muted:true,volume:1,'
            + 'pip:true,fullscreen:true,fullscreenWeb:true,'
            + 'setting:true,playbackRate:true,aspectRatio:true,hotkey:true,screenshot:false,'
            + 'theme:"#23ade5",lang:"zh-cn",'
            + 'moreVideoAttr:{playsinline:true,"webkit-playsinline":true,preload:"auto"},'
            + 'miniProgressBar:true'
            + '});'
            + '})();';

        return '<!DOCTYPE html><html><head><meta charset="utf-8">'
            + '<meta name="viewport" content="width=device-width,initial-scale=1.0">'
            + '<style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000;}'
            + '#wrap{width:100%;height:100%;}'
            + '.err{color:#ff8080;font:12px/1.6 sans-serif;padding:12px;}</style>'
            + '</head><body><div id="wrap"></div>'
            + '<script>' + escapeInlineScript(hlsSrc) + '<\/script>'
            + (artSrc ? '<script>' + escapeInlineScript(artSrc) + '<\/script>' : '')
            + '<script>' + (mode === 'art' ? initArt : initNative) + '<\/script>'
            + '</body></html>';
    }

    // 当前站没有内嵌配置时：在页面上盖一个浮动播放器（不塞进面板）
    function playCollectFloat(playerHtml) {
        const old = document.getElementById('vip_collect_float');
        if (old) old.remove();
        const wrap = document.createElement('div');
        wrap.id = 'vip_collect_float';
        wrap.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);'
            + 'width:min(92vw,1080px);height:min(80vh,608px);z-index:2147483646;background:#000;'
            + 'border:1px solid #4a4d55;border-radius:6px;box-shadow:0 10px 40px rgba(0,0,0,.6);overflow:hidden;';
        const iframe = document.createElement('iframe');
        iframe.setAttribute('sandbox', COLLECT_PLAYER_SANDBOX);
        iframe.setAttribute('allow', COLLECT_PLAYER_ALLOW);
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('referrerpolicy', 'no-referrer');
        iframe.style.cssText = 'width:100%;height:100%;border:0;display:block;background:#000;';
        wrap.appendChild(iframe);
        const close = document.createElement('div');
        close.textContent = '×';
        close.title = '关闭播放器';
        close.style.cssText = 'position:absolute;top:6px;right:12px;color:#fff;font-size:22px;line-height:1;'
            + 'cursor:pointer;z-index:2;text-shadow:0 1px 3px #000;';
        close.addEventListener('click', (e) => { e.stopPropagation(); wrap.remove(); });
        wrap.appendChild(close);
        (document.body || document.documentElement).appendChild(wrap);
        try {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            doc.open();
            doc.write(playerHtml);
            doc.close();
        } catch (e) { }
    }

    // 播采集源的 m3u8：
    //   优先塞进【页面自己的播放器区】（复用解析接口内嵌模式的容器逻辑）；
    //   当前站没有配置时，降级成页面上的浮动播放器。
    function playCollectInPage(m3u8Url) {
        if (!m3u8Url) return;
        const html = buildPlayerHtml(m3u8Url, collectPlayerMode);
        playVideo({ name: '采集源', url: '' }, true, null, html, () => playCollectFloat(html));
    }

    // 选中剧集后：直接在【页面播放器区】播；面板里保留地址 / 复制 / 播放器切换 / 重新播放
    function showCollectUrl(ep, sourceName) {
        COLLECT_STATE.lastEp = ep;
        COLLECT_STATE.lastSrcName = sourceName || '';
        const box = DOM_CACHE.collectOutput;
        if (box) {
            box.innerHTML = '<div class="collect-player-bar">'
                + '<span>播放器</span>'
                + '<select id="collect-player-mode">'
                + '<option value="art"' + (collectPlayerMode === 'art' ? ' selected' : '') + '>Artplayer</option>'
                + '<option value="native"' + (collectPlayerMode === 'native' ? ' selected' : '') + '>原生 video</option>'
                + '</select>'
                + '<button id="collect-replay-btn">重新播放</button>'
                + '</div>'
                + '<div class="collect-url-row">'
                + '<span class="collect-url-src">' + escapeAttr(sourceName + ' / ' + ep.label + ' / ' + ep.from) + '</span>'
                + '<input type="text" id="collect-url-input" readonly value="' + escapeAttr(ep.url) + '">'
                + '<button id="collect-copy-btn">复制</button></div>';

            // 复制
            const btn = box.querySelector('#collect-copy-btn');
            const input = box.querySelector('#collect-url-input');
            if (btn && input) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    copyTextToClipboard(input, ep.url);
                });
            }

            // 重新播放
            const replay = box.querySelector('#collect-replay-btn');
            if (replay) {
                replay.addEventListener('click', (e) => {
                    e.stopPropagation();
                    playCollectInPage(ep.url);
                });
            }

            // 播放器切换（记住选择）
            const sel = box.querySelector('#collect-player-mode');
            if (sel) {
                sel.addEventListener('click', (e) => e.stopPropagation());
                sel.addEventListener('change', (e) => {
                    e.stopPropagation();
                    collectPlayerMode = sel.value === 'native' ? 'native' : 'art';
                    GM_setValue(COLLECT_PLAYER_KEY, collectPlayerMode);
                    playCollectInPage(ep.url);
                });
            }
        }

        // 直接在页面播放器区开播
        playCollectInPage(ep.url);
    }

    function collectMarkSelected(idx) {
        if (!DOM_CACHE.collectSources) return;
        DOM_CACHE.collectSources.querySelectorAll('.collect-src-item').forEach((el) => {
            el.classList.toggle('selected', parseInt(el.getAttribute('data-idx'), 10) === idx);
        });
    }

    // 搜索「某一个」采集源（每次只发 1 个请求）
    async function searchCollectSource(idx) {
        if (COLLECT_STATE.busy) return;
        const src = COLLECT_ALL[idx];
        if (!src) return;
        // 注：采集源里不再提供"强制跳转"入口；同样的跳转在【解析接口】页可用。
        const kw = String((DOM_CACHE.collectKeyword && DOM_CACHE.collectKeyword.value) || '').trim();
        if (!kw) {
            try {
                Swal.fire({
                    title: '请输入剧名',
                    icon: 'info',
                    toast: true,
                    position: 'center',
                    timer: 1800,
                    showConfirmButton: false
                });
            } catch (e) {}
            return;
        }
        // 随机组合源：从池子里随机挑一个真源，再按那个源的规则搜
        if (src.fmt === 'random') {
            // pool: 'auto' = 自动取「所有直连一次就能搜到的源」（数据里带 hit 标记的那些）
            // 这样源的可用性一变，只要改分区归属，池子就自动跟随，不存在「忘了同步改名单」这件事
            // （手动列名单的话，源一旦挂掉而名单没改，随机就会挑到死源 —— 酷播那次就是这么发生的）
            const pool = (src.pool === 'auto')
                ? COLLECT_ALL.filter((x) => x.hit && x.fmt !== 'random')
                : (src.pool || [])
                    .map((n) => COLLECT_ALL.find((x) => x.name === n && x.fmt !== 'random'))
                    .filter(Boolean);
            if (!pool.length) {
                setCollectStatus('「' + src.name + '」的随机池里没有找到可用源');
                return;
            }
            const pick = pool[Math.floor(Math.random() * pool.length)];
            collectMarkSelected(idx);
            COLLECT_STATE.sourceIdx = idx;
            setCollectStatus('「' + src.name + '」随机选中 → ' + pick.name + '，正在搜索…');
            await doCollectSearch(pick, kw, src.name + ' → ' + pick.name);
            return;
        }
        // 「搜索跳转」类：不是接口，直接用剧名拼好 URL 打开新标签
        if (src.fmt === 'search') {
            const target = buildCollectUrl(src, kw);
            collectMarkSelected(idx);
            COLLECT_STATE.sourceIdx = idx;
            COLLECT_STATE.keyword = kw;
            clearCollectView();
            try {
                GM_openInTab(target, {active: true, insert: true, setParent: true});
            } catch (e) {
                window.open(target, '_blank');
            }
            setCollectStatus('已用「' + src.name + '」打开搜索：' + kw);
            return;
        }
        collectMarkSelected(idx);
        COLLECT_STATE.sourceIdx = idx;
        await doCollectSearch(src, kw, src.name);
    }

    // 真正的取数逻辑（源可能来自随机组合，所以 src 和显示名分开传）
    async function doCollectSearch(src, kw, showName) {
        COLLECT_STATE.busy = true;
        COLLECT_STATE.keyword = kw;
        COLLECT_STATE.items = [];
        COLLECT_STATE.current = null;
        clearCollectView();
        try {
            if (!src.api) {
                setCollectStatus('「' + showName + '」没有可用地址');
                return;
            }
            setCollectStatus('正在搜索「' + showName + '」…');
            const res = await requestJson(buildCollectUrl(src, kw));
            // ⚠️ 「按名字问被拒」的判断必须在下面那个提前返回【之前】算出来 ——
            //    否则第 ③ 种（HTTP 403）会被当成普通失败直接 return，整条兜底链根本没机会跑。
            // 三种形态：
            //   ① 返回 JSON 但 code=1002（苹果CMS 的标准回绝）
            //   ② 返回纯文本「暂不支持搜索」（没包成 JSON，见 requestJsonOnce）
            //   ③ 直接被 WAF 拒（HTTP 403）—— 正文里既没有 code 也没有「暂不支持搜索」字样，只能靠状态码认
            const kwRefused = res.searchForbidden
                || (!res.ok && res.gotResponse && !res.cf && (res.status === 403 || res.status === 401));
            if (!res.ok && !kwRefused) {
                setCollectStatus('「' + showName + '」失败：' + res.error);
                return;
            }
            let viaP = res.viaProxy ? '（经代理 ' + proxyLabel(res.proxyUrl || COLLECT_PROXY) + '）' : '';
            let data = res.data;
            if (kwRefused || isKeywordSearchForbidden(data)) {
                setCollectStatus('「' + showName + '」不支持关键词搜索，改用联想接口…');
                const alt = await fetchBySuggest(src.api, kw);
                if (alt.ok) {
                    data = alt.data;
                    if (alt.viaProxy) viaP = '（经代理 ' + proxyLabel(alt.proxyUrl || COLLECT_PROXY) + '）';
                } else if (alt.gotResponse && !alt.cf) {
                    // 联想接口也不行 —— 但「对方是回了话才拒绝的」（不是连不上、也不是被 CF 拦），
                    // 说明这个站还在、只是把「按名字问」堵死了。再试最后一条：翻最近几页列表本地找。
                    setCollectStatus('「' + showName + '」联想接口也不行，改翻最近列表找…');
                    const byList = await fetchByRecentList(src.api, kw);
                    if (!byList.ok) {
                        setCollectStatus('「' + showName + '」不支持关键词搜索；联想接口：' + alt.error
                            + '；翻最近列表：' + byList.error);
                        return;
                    }
                    data = byList.data;
                    if (byList.viaProxy) viaP = '（经代理 ' + proxyLabel(byList.proxyUrl || COLLECT_PROXY) + '）';
                } else {
                    setCollectStatus('「' + showName + '」不支持关键词搜索，联想接口也不行：' + alt.error);
                    return;
                }
            }
            // ===== 两步型源（沃云）：搜索只给视频 ID，播放地址要再按 ID 问一次 =====
            // 为什么必须插在这个位置：下面那个 `Array.isArray(data.list)` 是苹果CMS的形状检查，
            // 沃云返回的是 {code,data:{videos:[…]}}，会在那里被判成「返回结构不认识」直接丢掉。
            if (src.fmt === 'woyun') {
                const hits = parseWoyunSearch(data);
                if (!hits.length) {
                    setCollectStatus('「' + showName + '」没有命中（' + (data && data.msg ? data.msg : '结果为空') + '）');
                    return;
                }
                const use = hits.slice(0, COLLECT_TWOSTEP_MAX);
                setCollectStatus('「' + showName + '」命中 ' + hits.length + ' 部'
                    + (hits.length > use.length ? '，只取前 ' + use.length + ' 部' : '') + '，正在取播放地址…');
                const got = [];
                let detailViaP = '';
                for (let i = 0; i < use.length; i++) {
                    const one = await fetchWoyunDetail(src, use[i]);
                    if (!one) continue;
                    got.push(one.item);
                    if (one.viaProxy && !detailViaP) detailViaP = '（详情经代理 ' + proxyLabel(one.proxyUrl || COLLECT_PROXY) + '）';
                }
                const kept = got;
                if (!kept.length) {
                    setCollectStatus('「' + showName + '」命中 ' + hits.length + ' 部，但都没取到播放地址');
                    return;
                }
                COLLECT_STATE.items = kept;
                renderCollectTitles(kept, showName);
                setCollectStatus('「' + showName + '」命中 ' + kept.length + ' 部 / ' + kw + viaP + detailViaP
                    + (hits.length > use.length ? '（另有 ' + (hits.length - use.length) + ' 部未取）' : ''));
                return;
            }
            if (!data || !Array.isArray(data.list)) {
                setCollectStatus('「' + showName + '」返回结构不认识'
                    + (data && data.msg ? '：' + data.msg : ''));
                return;
            }
            const all = parseMaccmsJson(data);
            const items = all;
            if (!items.length) {
                const rawCount = data.list.length;
                let why;
                if (rawCount) {
                    why = '返回 ' + rawCount + ' 部，'
                        + '但都取不到播放地址';
                } else {
                    why = data.msg ? String(data.msg) : '结果为空';
                }
                setCollectStatus('「' + showName + '」没有命中（' + why + '）');
                return;
            }
            COLLECT_STATE.items = items;
            renderCollectTitles(items, showName);
            setCollectStatus('「' + showName + '」命中 ' + items.length + ' 部 / ' + kw + viaP);
        } catch (e) {
            setCollectStatus('「' + showName + '」出错：' + String((e && e.message) || e));
        } finally {
            COLLECT_STATE.busy = false;
        }
    }

    // 「搜索」按钮：重搜上一次选中的源（没选过就提示先选源）
    function rerunCollectSearch() {
        if (COLLECT_STATE.sourceIdx < 0) {
            try {
                Swal.fire({
                    title: '请先点一个采集源',
                    text: '点击下方任一采集源即可开始搜索',
                    icon: 'info',
                    toast: true,
                    position: 'center',
                    timer: 2200,
                    showConfirmButton: false
                });
            } catch (e) {}
            return;
        }
        searchCollectSource(COLLECT_STATE.sourceIdx);
    }

    // ===== 导航 =====
    function renderNavLinks() {
        const box = DOM_CACHE.navLinks;
        if (!box) return;
        let html = '<div class="collect-sec">【导航 ' + NAV_LINKS.length + '】</div>';
        NAV_LINKS.forEach((n, i) => {
            // ⚠️ 颜色只能加在【名字】上，不能加在 .nav-item 上 ——
            //    加在外层时，里面的 .nav-desc / .nav-url 没有自己的 color，会一起继承变成彩色
            //    （表现：66大片网的说明和网址也变绿）。名字以前是裸文本节点，所以这里包一层 .nav-name。
            const mStyle = n.mark ? ' style="color:' + (API_MARK_COLOR[n.mark] || 'inherit') + ';"' : '';
            html += '<div class="nav-item" data-nidx="' + i + '">'
                + '<span class="nav-name"' + mStyle + '>' + escapeAttr(n.name) + '</span>'
                + '<span class="nav-desc">' + escapeAttr(n.desc) + '</span>'
                + '<span class="nav-url">' + escapeAttr(n.url) + '</span></div>';
        });
        box.innerHTML = html;
    }

    function openNavLink(idx) {
        const n = NAV_LINKS[idx];
        if (!n) return;
        try {
            GM_openInTab(n.url, {active: true, insert: true, setParent: true});
        } catch (e) {
            window.open(n.url, '_blank');
        }
    }

    function buildApiListsHtml() {
        let simpleApisHtml = "<div class='section-title'>[内嵌播放+弹窗无选集]</div><ul class='simple-api-list'>";
        let complexApisHtml = "<div class='section-title'>[弹窗带选集]</div><ul class='complex-api-list'>";

        allApis.forEach((item, index) => {
            const types = item.type.split(',');
            const name = item.name;
            // 带 mark 的接口用【文字颜色】标记（颜色见 API_MARK_COLOR）；注意兜底必须是 inherit ——
            // 写成 transparent 当底色没问题，当文字色就成了"字看不见"。
            // ⚠️ 颜色只能加在【名字】(.api-name) 上，【不能】加在 <li> 上 ——
            //    加在 <li> 上时，<li> 里那些没有自己 color 的子元素会一起继承过来，
            //    表现就是「 | 弹窗」「 | 内嵌」这几个字也跟着变成标记色。
            const nameStyle = item.mark ? ` style="color:${API_MARK_COLOR[item.mark] || 'inherit'};"` : '';
            // 自定义接口（用户在「自定义设置」里加的）在 allApis 里【排在最后】——
            // 所以 index >= uniqueApis.length 就是判据。它们没有家族色，
            // 就在名字前面加个 ＋ 记号，免得跟内置条目混在一起分不清。
            const isCustom = index >= uniqueApis.length;
            const customMark = isCustom ? '<span class="api-custom-mark">＋</span>' : '';
            // 名字和 title 一律过 escapeAttr：自定义的名字是手输的，
            // 里面若有 " 或 < 会把属性/标签结构弄坏
            const safeName = escapeAttr(name);
            const titleAttr = escapeAttr(name + '：' + (item.url || '') + (isCustom ? '（自定义接口）' : ''));
            // 「模式」那一列只有三种情况，一个类 .mode 就够：
            //   ① 同时支持 1 和 3 → 两种模式都能用，那个字可点着切（靠 data-modes 认出来）
            //   ② 只支持 1        → 只能内嵌
            //   ③ 只支持 3        → 只能弹窗
            // ⚠️ ② ③ 要排除「含 2」的：含 2 的走下面的 complex 列表（带选集），
            //    在这儿再出一个"内嵌"小格子，等于同一个接口多一条没意义的入口。
            //    ① 不排除 —— "1,2,3"（比如 M1907）本来就该两边都出现。
            // 注：上面这套判断是从 3.3.6 继承下来的，原来写成 4 个分支、其中第 4 个和第 1 个产出的 HTML
            //     一字不差（只是被 !includes2 挡住了才需要抄一份）。这里合并成等价的 2 条 if。
            const bothModes = types.includes("1") && types.includes("3");
            const oneMode = bothModes ? null : (types.includes("1") ? "1" : (types.includes("3") ? "3" : null));
            if (bothModes || (oneMode && !types.includes("2"))) {
                const attr = bothModes ? ' data-modes="1,3" data-current-mode="1"' : ` data-mode="${oneMode}"`;
                const cls = bothModes ? "api-item combined-simple" : "api-item";
                const word = (bothModes || oneMode === "1") ? "内嵌" : "弹窗";
                simpleApisHtml += `<li class="${cls}"${attr} data-index="${index}" title="${titleAttr}"><span class="api-name"${nameStyle}>${customMark}${safeName}</span><span class="api-mode"> | <span class="mode">${word}</span></span></li>`;
            }
            if (types.includes("2")) {
                complexApisHtml += `<li class="api-item" data-index="${index}" data-mode="2" title="${titleAttr}"><span class="api-name"${nameStyle}>${customMark}${safeName}</span></li>`;
            }
        });
        simpleApisHtml += "<div style='clear:both;'></div></ul>";
        complexApisHtml += "<div style='clear:both;'></div></ul>";
        // 「必看说明」必须由这里产出，【不能】写在 #vip-tab 的模板里 ——
        // renderApiLists() 会执行 `vipTab.innerHTML = simple + complex` 整个覆盖，
        // 写在模板里的东西会被冲掉（加自定义接口、切样式都会触发它）。
        complexApisHtml += `
            <div class="api-must-read">
                <span class="mr-title"><span class="mr-angry">(╬▔皿▔)╯</span>👉必看说明：</span>
                <br>&nbsp;&nbsp;1、本脚本为开源项目，完全免费，请勿上当受骗
                <br>&nbsp;&nbsp;2、请勿轻信任何广告，请谨慎辨别！
                <br>&nbsp;&nbsp;3、如遇卡顿 / 无法加载，可切换不同线路 / 使用海外网络观看
                <br>&nbsp;&nbsp;4、本脚本未提供资源上传、存储服务；播放器只拉流、不上传，不在后台做 P2P 上传、占用你的上行带宽
                <br>&nbsp;&nbsp;<span class="qq"><b>5、交流 QQ 群 请查看公告8</b></span>
            </div>`;
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

    // 把 type 的 "1,3" 这种代号翻成人话，给"管理自定义接口"面板显示用
    const API_TYPE_LABEL = {
        '1': '只能内嵌',
        '2': '只能弹窗 · 带选集',
        '3': '只能弹窗 · 不带选集',
        '1,3': '内嵌 + 弹窗（可切换）',
        '1,2,3': '内嵌 + 弹窗 + 带选集'
    };

    // 列出自己添加的解析接口，每条一个「删除」。
    // customApis 若只增不减，加错了就只能去清浏览器数据。
    function renderCustomApiManage() {
        const box = DOM_CACHE.customApiManage;
        if (!box) return;
        if (!customApis.length) {
            box.innerHTML = '<div class="custom-api-empty">还没有添加过自定义接口</div>';
            return;
        }
        let html = '';
        customApis.forEach((api, i) => {
            html += '<div class="custom-api-row">'
                + '<span class="custom-api-info">'
                + '<b class="custom-api-name">＋' + escapeAttr(api.name) + '</b>'
                + '<span class="custom-api-url">' + escapeAttr(api.url)
                + ' · ' + escapeAttr(API_TYPE_LABEL[api.type] || api.type) + '</span>'
                + '</span>'
                + '<button class="custom-api-del" data-ci="' + i + '">删除</button>'
                + '</div>';
        });
        box.innerHTML = html;
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
            // 这里只给 <li> 设"面板字体色"。带 mark 的条目不受影响 ——
            // 它的标记色加在子元素 .api-name 上，自己的行内样式优先于从 <li> 继承，所以不会被这句盖掉。
            el.style.color = fontColor;
            el.style.borderColor = 'rgba(128,128,128,0.5)';
        });

        DOM_CACHE.vipList.querySelectorAll('.mode').forEach(el => {
            el.style.color = '#1c84c6';
        });

        // 所有标签按钮都设成字体色；当前选中的那个靠 CSS 的 .tab-button.active { color: ...!important } 保持高亮
        // （原来只在"未选中"时设色，导致初始化时处于选中的「VIP视频解析」永远拿不到颜色，切走后变黑）
        DOM_CACHE.vipList.querySelectorAll('.tab-button').forEach(el => {
            el.style.color = fontColor;
        });

        DOM_CACHE.vipList.querySelectorAll('.tab-header').forEach(el => {
            el.style.backgroundColor = bgColor;
        });

        DOM_CACHE.vipList.querySelectorAll('#donate_section').forEach(el => {
            el.style.color = fontColor;
        });

        DOM_CACHE.vipList.querySelectorAll('.add-api-form, .custom-api-manage').forEach(el => {
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
                <button id="manage_api_btn">管理自定义接口</button>
                <button id="open-style-set-btn">面板样式设置</button>
                <button id="open-shortcut-set-btn">自定义快捷键</button>
                <button id="open-auto-parse-set-btn">自动解析设置</button>
                <div class="add-api-form" id="add-api-form">
                    <input type="text" id="api-name" placeholder="接口名称">
                    <input type="text" id="api-url" placeholder="接口地址（例：https://jx.example.com/?url=；参数名也可能不是 url，比如 ?jx=）">
                    <select id="api-type">
                        <option value="1">内嵌播放</option>
                        <option value="2">弹窗播放带选集</option>
                        <option value="3">弹窗播放不带选集</option>
                        <option value="1,3">内嵌 + 弹窗（两种都能用，可切换）</option>
                        <option value="1,2,3">内嵌 + 弹窗 + 带选集（全都支持）</option>
                    </select>
                    <button id="save-api-btn">添加</button>
                    <button class="cancel-btn" id="cancel-api-btn">取消</button>
                </div>
                <div class="custom-api-manage" id="custom-api-manage"></div>
            </div>
        `;
        const isAutoEnabled = !!GM_getValue(CONFIG.autoPlayerKey, null);
        const autoIconSrc = isAutoEnabled ? VIP_ICON_GIF.autoOn : VIP_ICON_GIF.autoOff;
        const noticePanelHtml = `
            <div class="vip_notice_panel" id="vip_notice_panel">
                ${VIP_USAGE_HTML}
                <div id="donate_section" style="text-align: center;">
                    <div style="font-size: 12px; margin-bottom: 5px;">如果觉得好用，欢迎打赏支持（づ￣3￣）づ╭❤️～</div>
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
                        <button class="tab-button" data-tab="collect">采集源</button>
                        <div class="tab-divider"></div>
                        <button class="tab-button" data-tab="nav">导航</button>
                        <div class="tab-divider"></div>
                        <button class="tab-button" data-tab="donate">自定义设置</button>
                    </div>
                    <div class="tab-content active" id="vip-tab">
                        ${simpleApisHtml}
                        ${complexApisHtml}
                    </div>
                    <div class="tab-content" id="collect-tab">
                        <div class="collect-night-note">资源采集源一般到晚上容易卡，因为站长服务器带宽不够大，非脚本原因，请勿反馈</div>
                        <div class="collect-search">
                            <input type="text" id="collect-keyword" placeholder="剧名（自动填入，可修改）">
                            <button id="collect-search-btn">搜索</button>
                        </div>
                        <div class="collect-filter-row">
                            <span class="collect-hint">点下方任一采集源即可搜索；改完剧名再点一次源即重搜</span>
                        </div>
                        <div class="collect-status" id="collect-status"></div>
                        <div class="collect-sources" id="collect-sources"></div>
                        <div class="collect-episodes" id="collect-episodes"></div>
                        <div class="collect-output" id="collect-output"></div>
                    </div>
                    <div class="tab-content" id="nav-tab">
                        <div class="collect-filter-row">
                            <span class="collect-hint">点下方任一条目，在新标签页打开</span>
                        </div>
                        <div class="nav-list" id="nav-links"></div>
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
        DOM_CACHE.customApiManage = vipBox.querySelector('#custom-api-manage');
        DOM_CACHE.simpleApiList = vipBox.querySelector('.simple-api-list');
        DOM_CACHE.complexApiList = vipBox.querySelector('.complex-api-list');
        DOM_CACHE.noticePanel = vipBox.querySelector('#vip_notice_panel');
        // ===== 采集源 / 导航 标签页 =====
        DOM_CACHE.collectTab = vipBox.querySelector('#collect-tab');
        DOM_CACHE.navTab = vipBox.querySelector('#nav-tab');
        DOM_CACHE.collectKeyword = vipBox.querySelector('#collect-keyword');
        DOM_CACHE.collectStatus = vipBox.querySelector('#collect-status');
        DOM_CACHE.collectSources = vipBox.querySelector('#collect-sources');
        DOM_CACHE.collectEpisodes = vipBox.querySelector('#collect-episodes');
        DOM_CACHE.collectOutput = vipBox.querySelector('#collect-output');
        DOM_CACHE.navLinks = vipBox.querySelector('#nav-links');
        renderCollectSourceList();
        renderNavLinks();
        renderCustomApiManage();
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

    // 切换标签页：按钮高亮 + 内容显示。
    // 抽出来的原因：「添加自定义接口后切回解析页」那段原来是把这个动作【手写了一遍】，
    // 以后加标签页会漏改其中一处。
    function switchTab(tabId) {
        const box = DOM_CACHE.vipBox;
        if (!box) return;
        box.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
        });
        box.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tabId + '-tab');
        });
    }

    // ===== 事件绑定 =====
    // 事件绑定入口：只负责准备共享的东西（DOM 引用 + 3 个跨组的小工具），然后依次调用下面各功能组。
    // 按功能拆开、而不是全堆在一个大函数里 —— 改哪个交互就去哪个函数，局部变量也不会互相污染。
    function bindEvents() {
        const vipBox = DOM_CACHE.vipBox;
        let suppressNextClick = false;   // 拖拽结束时浏览器还会补发一次 click，用它吞掉那一次
        const ctx = {
            vipBox: vipBox,
            vipList: DOM_CACHE.vipList,
            noticePanel: DOM_CACHE.noticePanel,
            vipIcon: vipBox.querySelector(".vip_icon"),
            autoBtn: vipBox.querySelector("#vip_auto"),
            noticeBtn: vipBox.querySelector("#vip_notice"),
            vipIconImg: vipBox.querySelector("#vip_icon_img"),
            isMobile: isMobilePlayerLayout(),
            closeNoticePanel: () => {
                const p = DOM_CACHE.noticePanel;
                if (p) {
                    p.classList.remove('visible');
                    p.style.display = 'none';
                }
            },
            // 被面板开关 / 公告 / 自动解析 / 拖拽四处共用，所以收进 ctx 一起传，
            // 而不是让每个小函数各自复制一份状态
            consumeDragClick: () => {
                if (suppressNextClick) {
                    suppressNextClick = false;
                    return true;
                }
                return false;
            },
            markDragClick: () => { suppressNextClick = true; }
        };
        bindPanelToggleEvents(ctx);
        bindTabEvents(ctx);
        bindCollectEvents(ctx);
        bindNavEvents();
        bindSettingsPanelEvents(ctx);
        bindNoticeEvents(ctx);
        bindCustomApiEvents(ctx);
        bindParseEvents(ctx);
        bindAutoParseEvents(ctx);
        bindDragEvents(ctx);
        // 收尾：把自动解析浮标的图标刷成当前状态（原来在 bindEvents 末尾）
        const autoIndex = GM_getValue(CONFIG.autoPlayerVal, 0);
        updateAutoSwitchIcon(!!GM_getValue(CONFIG.autoPlayerKey, null), allApis[autoIndex] && allApis[autoIndex].name);
    }

    // ① 面板开关：移动端点按切换 / 桌面 hover 显示隐藏
    function bindPanelToggleEvents(ctx) {
        const { vipBox, vipList, vipIcon, isMobile, closeNoticePanel, consumeDragClick } = ctx;
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
                const activeEl = document.activeElement;
                if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
                    return; // 焦点在输入框（如中文输入法），不关闭面板
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
                const activeEl = document.activeElement;
                if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
                    return; // 焦点在输入框（如中文输入法），不关闭面板
                }
                vipList.classList.remove("visible");
                vipBox.classList.remove("visible");
                const items = vipList.querySelectorAll('li, .section-title, #donate_section');
                items.forEach(item => {
                    item.style.transitionDelay = '';
                });
            });
        }
    }

    // ② 标签页切换
    function bindTabEvents(ctx) {
        const { vipBox } = ctx;
        const tabButtons = vipBox.querySelectorAll(".tab-button");
        tabButtons.forEach(button => {
            button.addEventListener("click", function() {
                const tabId = this.getAttribute("data-tab");
                switchTab(tabId);
                // 切到「采集源」时，自动填入当前视频名的草稿（用户可手动改）
                if (tabId === 'collect' && DOM_CACHE.collectKeyword && !DOM_CACHE.collectKeyword.value.trim()) {
                    DOM_CACHE.collectKeyword.value = guessVideoTitle();
                }
            });
        });

    }

    // ③ 采集源标签页
    function bindCollectEvents(ctx) {
        const { vipBox } = ctx;
        // ===== 采集源标签页：事件绑定 =====
        if (DOM_CACHE.collectKeyword) {
            DOM_CACHE.collectKeyword.addEventListener('click', (e) => e.stopPropagation());
            DOM_CACHE.collectKeyword.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    rerunCollectSearch();
                }
            });
        }
        const collectSearchBtn = vipBox.querySelector('#collect-search-btn');
        if (collectSearchBtn) {
            collectSearchBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                rerunCollectSearch();
            });
        }
        // 点采集源 → 立即用当前剧名搜「这一个源」（每次只发 1 个请求）
        if (DOM_CACHE.collectSources) {
            DOM_CACHE.collectSources.addEventListener('click', (e) => {
                const chip = e.target.closest('.collect-src-item');
                if (!chip) return;
                e.stopPropagation();
                searchCollectSource(parseInt(chip.getAttribute('data-idx'), 10));
            });
        }
        if (DOM_CACHE.collectEpisodes) {
            DOM_CACHE.collectEpisodes.addEventListener('click', (e) => {
                // 点「← 返回命中列表」→ 用内存里那批结果重渲染，【不重新请求】
                if (e.target.closest('.collect-back')) {
                    renderCollectTitles(COLLECT_STATE.items, COLLECT_STATE.listName || '');
                    return;
                }
                // 命中多部时：点片名 → 展开该片的剧集
                const titleRow = e.target.closest('.collect-result-item');
                if (titleRow) {
                    const ti = parseInt(titleRow.getAttribute('data-ti'), 10);
                    const item = COLLECT_STATE.items[ti];
                    if (!item) return;
                    COLLECT_STATE.current = item;
                    DOM_CACHE.collectEpisodes.querySelectorAll('.collect-result-item').forEach(x => x.classList.remove('selected'));
                    titleRow.classList.add('selected');
                    const selSrc = COLLECT_ALL[COLLECT_STATE.sourceIdx];
                    renderCollectEpisodeList(item, selSrc ? selSrc.name : '');
                    if (DOM_CACHE.collectOutput) DOM_CACHE.collectOutput.innerHTML = '';
                    return;
                }
                // 点剧集 → 出 m3u8 地址
                const epEl = e.target.closest('.collect-ep');
                if (!epEl) return;
                const item = COLLECT_STATE.current || COLLECT_STATE.items[0];
                if (!item) return;
                const ei = parseInt(epEl.getAttribute('data-ei'), 10);
                if (!item.episodes[ei]) return;
                DOM_CACHE.collectEpisodes.querySelectorAll('.collect-ep').forEach(x => x.classList.remove('selected'));
                epEl.classList.add('selected');
                const src = COLLECT_ALL[COLLECT_STATE.sourceIdx];
                showCollectUrl(item.episodes[ei], src ? src.name : '');
            });
        }

    }

    // ④ 导航标签页（只用 DOM_CACHE，不需要 ctx）
    function bindNavEvents() {
        // ===== 导航：事件绑定 =====
        if (DOM_CACHE.navLinks) {
            DOM_CACHE.navLinks.addEventListener('click', (e) => {
                const item = e.target.closest('.nav-item');
                if (!item) return;
                e.stopPropagation();
                openNavLink(parseInt(item.getAttribute('data-nidx'), 10));
            });
        }
    }

    // ⑤ 三个「设置面板」按钮（样式 / 快捷键 / 自动解析）：互相排斥，点开一个关掉其余
    function bindSettingsPanelEvents(ctx) {
        const { vipBox } = ctx;
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
    }

    // ⑥ 公告浮标 + 公告面板
    function bindNoticeEvents(ctx) {
        const { vipBox, vipList, noticeBtn, noticePanel, isMobile, closeNoticePanel, consumeDragClick } = ctx;
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
            // 桌面端：悬停浮标显示公告，离开就收起来；点击切换仍保留
            // ⚠️ 不能"一离开浮标就立刻关"：面板在 left:72px，而浮标只有 56px 宽，中间有约 16px 的缝隙。
            //    鼠标从浮标移向面板时会先落到这条缝上（relatedTarget 是空白，不在面板里），
            //    于是"面板还没碰到就被关掉了" —— 之前用 relatedTarget 判断就是这个毛病。
            // 改成【延迟关闭】：离开浮标或面板都只是"预约关闭"，300ms 内碰到另一个就把预约取消。
            let noticeCloseTimer = null;
            const cancelNoticeClose = () => {
                if (noticeCloseTimer) { clearTimeout(noticeCloseTimer); noticeCloseTimer = null; }
            };
            const scheduleNoticeClose = () => {
                cancelNoticeClose();
                noticeCloseTimer = setTimeout(() => { noticeCloseTimer = null; closeNoticePanel(); }, 300);
            };
            if (!isMobile) {
                noticeBtn.addEventListener('mouseenter', () => {
                    cancelNoticeClose();
                    openNoticePanel();
                });
                noticeBtn.addEventListener('mouseleave', scheduleNoticeClose);
                noticePanel.addEventListener('mouseenter', cancelNoticeClose);
                noticePanel.addEventListener('mouseleave', scheduleNoticeClose);
            }
        }
    }

    // ⑦ 自定义解析接口（添加 / 保存 / 取消）
    function bindCustomApiEvents(ctx) {
        const { vipBox } = ctx;
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
                    alert('请填写接口名称和地址');
                    return;
                }
                // ⚠️ 这里【故意不校验地址格式】：参数名各家不一样（?url= / ?jx= / ?v= …），
                //    强制要求某一种会把合法接口挡在外面。能不能用由使用者自行判断。
                const newApi = { name, type, url };
                customApis.push(newApi);
                allApis = [...uniqueApis, ...customApis];
                GM_setValue("custom_parse_apis", customApis);
                DOM_CACHE.apiNameInput.value = '';
                DOM_CACHE.apiUrlInput.value = '';
                DOM_CACHE.apiTypeSelect.value = '1';
                DOM_CACHE.addApiForm.style.display = "none";
                renderApiLists();
                renderCustomApiManage();   // 管理面板也要跟着刷新，否则删不掉刚加的那条
                // 切回「VIP视频解析」标签页，让新接口立即可见（无需刷新）
                switchTab('vip');
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
        // 「管理自定义接口」：和上面几个设置面板一样，互相排斥，点开一个关掉其余
        const manageApiBtn = vipBox.querySelector("#manage_api_btn");
        if (manageApiBtn && DOM_CACHE.customApiManage) {
            manageApiBtn.addEventListener("click", function(e) {
                e.stopPropagation();
                const isVisible = DOM_CACHE.customApiManage.style.display === "block";
                DOM_CACHE.addApiForm.style.display = 'none';
                DOM_CACHE.styleSetPanel.style.display = 'none';
                DOM_CACHE.shortcutSetPanel.style.display = 'none';
                DOM_CACHE.autoParseSetPanel.style.display = 'none';
                DOM_CACHE.customApiManage.style.display = isVisible ? "none" : "block";
                if (!isVisible) renderCustomApiManage();   // 每次打开都重画一遍，避免看到过期内容
            });
        }
        // 删一条自定义接口：改内存 → 存回去 → 重建解析列表 → 重画管理面板
        if (DOM_CACHE.customApiManage) {
            DOM_CACHE.customApiManage.addEventListener("click", (e) => {
                const delBtn = e.target.closest('.custom-api-del');
                if (!delBtn) return;
                e.stopPropagation();
                const ci = parseInt(delBtn.getAttribute('data-ci'), 10);
                const api = customApis[ci];
                if (!api) return;
                if (!confirm('确定删除自定义接口「' + api.name + '」？')) return;
                customApis.splice(ci, 1);
                GM_setValue("custom_parse_apis", customApis);
                allApis = [...uniqueApis, ...customApis];
                renderApiLists();
                renderCustomApiManage();
            });
        }
    }

    // ⑧ 解析接口列表里的点击（切模式 / 内嵌播放 / 弹窗打开）
    function bindParseEvents(ctx) {
        const { vipBox } = ctx;
        vipBox.querySelector('#vip-tab').addEventListener("click", (e) => {
            // 点「内嵌 / 弹窗」那两个字：只有【两种模式都支持】的接口才切得动（它有 data-modes）。
            // 只有一种模式的跟它长得一样但点了不动（不靠手型提示），所以这里必须显式判断，
            // 否则 togglePlayMode 会在 undefined 上 split(',') 直接抛错。
            if (e.target.classList.contains('mode')) {
                const owner = e.target.closest('.api-item');
                if (owner && owner.dataset.modes) togglePlayMode(e.target);
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
                // clean 的接口要"剥掉查询参数 + 不编码"（见 parseApis 里 66网1 的说明）
                const tail = videoObj.clean
                    ? String(window.location.href).split('#')[0].split('?')[0]
                    : encodeVideoUrl(window.location.href);
                const parseUrl = videoObj.url + tail;
                // windowOpen 的接口要用 window.open：GM_openInTab 是扩展发起的标签，通常不带 Referer，
                // 而个别站点要靠 Referer 才认参数。
                // 用【具名窗口】而不是 '_blank'：同名窗口会被复用，避免每点一次就多留一个宿主页标签
                // （标签堆积会让每个宿主页里的 iframe 抢不到连接，原因见 GATE_WIN_NAME 的注释）
                let opened = false;
                if (videoObj.windowOpen) {
                    try { opened = !!window.open(parseUrl, GATE_WIN_NAME); } catch (e) { opened = false; }
                }
                if (!opened) {
                    GM_openInTab(parseUrl, {active: true, insert: true, setParent: true});
                }
            }
        });
    }

    // ⑨ 自动解析浮标开关
    function bindAutoParseEvents(ctx) {
        const { autoBtn, closeNoticePanel, consumeDragClick } = ctx;
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
    }

    // ⑩ 浮标拖拽（鼠标 + 触摸）
    function bindDragEvents(ctx) {
        const { vipBox, vipList, noticePanel, vipIcon, autoBtn, noticeBtn, vipIconImg, markDragClick } = ctx;
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
                // 拖拽过 → 让后面那次补发的 click 被吞掉（原来直接改闭包变量，现在走 ctx）
                markDragClick();
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
        // 三个事件要做的动作完全一样：页面自己的 video/audio 一响就掐掉它（我们自己播放器里的放过）。
        // 原来三个回调体一字不差地抄了三遍 —— 写成一个处理函数、循环绑定，完全等价。
        const stopForeignMedia = (event) => {
            if (event.target instanceof HTMLMediaElement && !isInsideOurPlayer(event.target)) {
                stopPageMedia(event.target);
            }
        };
        ['play', 'playing', 'volumechange'].forEach(ev => {
            document.addEventListener(ev, stopForeignMedia, true);
        });
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

    // playerHtml：不为空时，把这段 HTML 用 document.write 灌进 iframe（采集源的内嵌播放器用）
    // onNoContainer：当前站没有内嵌配置时的回调（采集源用它降级成浮动播放器）
    function playVideo(videoObj, isEmbed, encodedUrl = null, playerHtml = null, onNoContainer = null) {
        if (!isEmbed) return;

        clearVipPlaybackTimers();

        const finalUrl = encodedUrl || encodeVideoUrl(window.location.href);
        const parseUrl = videoObj.url + finalUrl;

        // 获取当前网站的播放器容器配置
        const host = window.location.hostname;
        const playerConfig = PLAYER_CONTAINERS.find(config => host === config.host);

        if (!playerConfig) {
            if (typeof onNoContainer === 'function') { onNoContainer(); return; }
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
                if (playerHtml) {
                    iframe.setAttribute('sandbox', COLLECT_PLAYER_SANDBOX);
                } else {
                    iframe.src = parseUrl;
                }
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

                // 采集源内嵌播放器：容器就位后再把 HTML 灌进 iframe
                if (playerHtml) {
                    try {
                        const doc = iframe.contentDocument || iframe.contentWindow.document;
                        doc.open();
                        doc.write(playerHtml);
                        doc.close();
                    } catch (e) { }
                }
            })
            .catch(() => {
                clearVipPlaybackTimers();
                if (typeof onNoContainer === 'function') { onNoContainer(); return; }
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