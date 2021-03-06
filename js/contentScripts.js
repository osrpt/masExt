﻿var url = window.location.href;

var sites = {
    unknown: 'unknown',
    t66y: 't66y',
    zhibo8: 'zhibo8',
    cnblogs: 'cnblogs',
    weibo: 'weibo',
    qzone: 'qzone',
    rmdown: 'rmdown',
    google: 'google'
};

var thisSite = getSitesType();
$("html").addClass(thisSite);

function getSitesType() {
    for (var key in sites) {
        if (url.search(sites[key]) !== -1) {
            return sites[key];
        }
    }
    return sites.unknown;
}

/**
 * 在页面加载完之前的一些特殊处理
 */
(function() {
    logHistory();
    switch (getSitesType()) {
        case sites.weibo:
            loadWbMiniCss(); //加载微博急简样式
            break;
    }
})();


$(document).ready(function() {
    initReadability();
    switch (getSitesType()) {
        case sites.t66y:
            beautyT66y();
            break;
        case sites.rmdown:
            beautyRmdown();
            break;
        case sites.zhibo8:
            beautyZhibo8();
            break;
        case sites.cnblogs:
            beautyCnblogs();
            break;
        case sites.qzone:
            beautyQzone();
            break;
        case sites.weibo:
            beautyWeibo();
            break;
        case sites.google:
            beautyGoogle();
        default:
            return false;
    }

    var isShowArticle = false;

    /**
     * readability init
     * @return {[type]} [description]
     */

    function initReadability() {
        var tool = $("<div/>");
        tool.attr('id', 'masExtToolbar');

        var wolf = $("<div/>");
        wolf.attr('id', 'masExtWolfIcon');
        wolf.addClass('wolf');
        // wolf.html('<input type="button" class="btn" />');

        var up = $("<div/>");
        up.attr('id', 'masExtUp');
        up.addClass('up');

        tool.append(wolf);
        tool.append(up);
        $('body').append(tool);
        $("#masExtWolfIcon").click(function() {
            if (!isShowArticle) {
                isShowArticle = true;
                window.scrollTo(0, 0);
                var cacheDoc = document.createElement('div');
                cacheDoc.innerHTML = window.document.body.innerHTML;
                var content = grabArticle(cacheDoc);
                var rea = $("<div></div>");
                rea.attr('class', 'readability');
                rea.html('<div class="article"><h2 class="title"></h2><div class="content"></div></div>');
                rea.appendTo('body');
                $('.readability .title').text($('title').text());
                $('.readability .content').html(content);
                $('body').css('overflow', 'hidden');
            } else {
                isShowArticle = false;
                $('.readability').remove();
                $('body').css('overflow', 'auto');
            }
        });

        $("#masExtUp").click(function() {
            $('body').animate({
                scrollTop: 0
            }, 'medium');
        });
    }

    /**
     * t66y beauty
     * @return {[type]} [description]
     */

    function beautyT66y() {
        if (url.indexOf('thread') >= 0) { //topic
            $(".t:eq(0)").hide();
        } else if (url.indexOf('htm_data') >= 0) { //single article
            $("#main .t2 table:eq(0)").find("a,img").each(function() {
                var tagName = $(this).prop("tagName");
                if (tagName === 'A') {
                    var href = String($(this).attr("href"));
                    var newHref = href.replace(/______/g, ".").replace("http://www.viidii.info/?", "");
                    $(this).attr("href", newHref);
                } else if (tagName === 'IMG') {
                    var src = String($(this).attr("src"));
                    $(this).attr("onClick", "window.open('" + src + "','_blank')");
                }
            });
        }
    }

    /**
     * rmdown.com
     * @return {[type]} [description]
     */

    function beautyRmdown() {
        $("table:eq(2)").hide(); //隐藏后面的广告
        $("input[type='submit']").removeAttr('onclick'); //移除onclick打开广告
        $("script")[0].remove(); //移除js，杜绝打开广告
    }

    /**
     * zhibo8.cc
     * @return {[type]} [description]
     */

    function beautyZhibo8() {
        $(".box li").each(function(i, v) {
            if ($(v).text().indexOf('热火') >= 0) {
                $(v).addClass('miamiHeat');
            } else if ($(v).text().indexOf('NBA常规赛') < 0 && $(v).text().indexOf('NBA季后赛') < 0) {
                $(v).remove();
            }
        });
    }

    function beautyCnblogs() {
        $(".post_item_body").click(function() {
            window.open($(this).children("H3").children('a').attr('href'));
        });
    }

    function beautyQzone() {
        $(".mod-side-nav").insertBefore("#QM_Container_3");
    }

    function beautyWeibo() {
        $('a').click(function(e) {
            var elem = $(e.target);
            if (elem.attr('href').indexOf('t.cn') !== -1) {
                window.open(elem.attr('title'));
                return false;
            }
        });
    }

    /**
     * 禁用google的跳转功能
     * @return {[type]} [description]
     */

    function beautyGoogle() {
        $('a').click(function(e) {
            var href = $(this).attr('href');
            var url = getParameterByName(href, 'url');
            if (url) {
                e.preventDefault();
                window.open(url);
            }
        })
    }

    /**
     * 获取今天的date
     * @return {[type]} [description]
     */

    function getDate() {
        var time = new Date();
        return time.getFullYear() + "-" + time.getMonth() + "-" + time.getDate();
    }

    /**
     * 从link中获得参数
     */

    function getParameterByName(link, name) {
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(link);
        return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }
});

/**
 * 记录日志
 * @return {[type]}
 */

function logHistory() {
    chrome.runtime.sendMessage({
        action: 'log',
        title: '记录网页访问',
        url: url
    }, function() {

    });
}

/**
 * 调用通知
 * @param  {[type]} msg
 * @return {[type]}
 */

function notify(title, msg) {
    chrome.runtime.sendMessage({
        action: 'notify',
        title: title,
        message: msg
    }, function() {});
}

/**
 * 加载微博急简css
 * @return {[type]} [description]
 */

function loadWbMiniCss() {
    if (document.getElementById("g_wbmini")) return;
    var el = document.createElement("link");
    el.id = "g_wbmini";
    el.rel = "stylesheet";
    el.href = chrome.extension.getURL("css/wbMini.css");
    headEl = document.getElementsByTagName("head")[0];
    headEl.appendChild(el);
}



var keys = {};

$(document).keydown(function(e) {
    keys[e.which] = true;
});

$(document).keyup(function(e) {
    delete keys[e.which];
});

/**
 * 翻译功能
 * @param  {[type]} $ [description]
 * @return {[type]}   [description]
 */
((function($) {
    var isShowTran = false;

    var x, y;

    $(document).keypress(function(event) {
        var code = event.keyCode || event.whick;
        if (keys['16'] && keys['90']) {
            var t = getSelected().toString().trim();
            if (t !== '' && t.length < 200) {
                youdaoApi(t, function(res) {
                    if (!isShowTran) {
                        var box = $("<div></div>");
                        box.attr('id', 'masTran');
                        box.addClass('masTran');
                        box.html(["<p class='title'>",
                            "<span id='masOriWord' class='oriWord'></span>",
                            "<span class='close'></span>",
                            "<span class='phonetic'></span>",
                            "</p>",
                            "<div id='masTranContent'>",
                            "</div>"
                        ].join(''));
                        $('body').append(box);
                        isShowTran = true;
                        $("#masTran .close").click(function() {
                            $("#masTran").hide();
                        });
                    }
                    $('#masTran').hide().css('left', x).css('top', y).show('500');;
                    $('#masOriWord').text(t); //res.translation
                    $('#masTran .phonetic').text(res.basic.phonetic);
                    var explains = res.basic.explains;
                    $('#masTran .explain').remove();
                    $("#masTranContent").append("<p class='explain'>1. " + res.translation + "</p>");
                    var index = 2;
                    for (var i = 0; i < explains.length; i++) {
                        var explain = explains[i];
                        if (explain != res.translation) {
                            $('#masTranContent').append("<p class='explain'>" + (index++) + '. ' + explain + "</p>");
                        }
                    }
                });
            }
        }
    });

    $(document).bind('mouseup', function(event) {
        var container = $('.masTran');
        if (!container.is(event.target) && container.has(event.target).length == 0) {
            container.hide('300');
        }
        x = event.pageX;
        y = event.pageY;
    });

    function getSelected() {
        var t = '';
        if (window.getSelection) {
            t = window.getSelection();
        } else if (document.getSelection) {
            t = document.getSelection();
        } else if (document.selection) {
            t = document.selection.createRange().text;
        }
        return t;
    }

    function youdaoApi(input, callback) {
        $.get("http://fanyi.youdao.com/fanyiapi.do?keyfrom=HaloWordDictionary&key=1311342268&type=data&doctype=json&version=1.1&q=" + input, function(res) {
            callback(res);
        });
    }
})(jQuery));
