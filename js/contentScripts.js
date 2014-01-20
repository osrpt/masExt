var url = window.location.href;

var sites = {
    unknown: 'unknown',
    t66y: 't66y',
    zhibo8: 'zhibo8',
    cnblogs: 'cnblogs',
    weibo: 'weibo',
    qzone: 'qzone',
    rmdown: 'rmdown'
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

$(document).ready(function() {

    initReadability();

    var seeImage = false; //屏蔽这个功能

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
        tool.addClass('toolbar');

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
            for (var i = $('tr').length - 1; i >= 0; i--) {
                console.log($('tr')[i].className);
            }
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
            } else if ($(v).text().indexOf('NBA常规赛') < 0) {
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
        if (document.getElementById("g_wbmini")) return;
        var el = document.createElement("link");
        el.id = "g_wbmini";
        el.rel = "stylesheet";
        el.href = chrome.extension.getURL("css/wbMini.css");
        headEl = document.getElementsByTagName("head")[0];
        headEl.appendChild(el);
    }

    if (seeImage) {
        seeImages();
    }

    function seeImages() {
        var srcArr = [],
            imgArr = [];
        imgArr = document.getElementsByTagName("img");
        for (var i = 0, _i = imgArr.length; i < _i; i++) {
            srcArr.push(imgArr[i].src);
        }

        $("img").click(function(event) {
            inote_create_mc(srcArr, $(this)[0].src);
            event.preventDefault();
            event.stopPropagation();
            return false;
        });

        function inote_create_mc(src, the_src) {
            document.body.style.overflow = "hidden";
            var size = windowchange();
            var inote_mc_div = document.createElement("div");
            inote_mc_div.setAttribute("style", "position:fixed;top:0;left:0;background:#000;opacity:0.8;height:" + size.Height + ";width:" + size.Width);
            document.body.appendChild(inote_mc_div);
            var inote_img_look = document.createElement("img");
            inote_img_look.src = the_src;
            inote_img_look.setAttribute("style", "max-height:" + (parseInt(size.Height) - 300) + "px;max_width:" + (parseInt(size.Width) - 100) + "px;margin-bottom:40px")
            inote_img_look.id = "single_img_look";
            var inote_img_container = document.createElement("div");
            document.body.appendChild(inote_img_container);
            inote_img_container.appendChild(inote_img_look);
            inote_img_container.id = "inote_img_container";
            inote_img_container.setAttribute("style", "position:fixed;z-index:10;text-align:center;top:50%;left:50%;margin-top:-" + (inote_img_look.offsetHeight) / 2 +
                "px;margin-left:-" + (inote_img_look.offsetWidth) / 2 + "px;");
            var inote_div_nextimg = document.createElement("div");
            inote_div_nextimg.innerHTML = "" +
                "<img id='inote_img_pre' src='http://www.ireadhome.com/Content/Images/mobile/last_picture.png' style='font-size: 40px;cursor: pointer;margin-right: 50px;color: #fff'/>" +
                "<img src='http://www.ireadhome.com/Content/Images/mobile/close_picture.png' id='inote_img_close' style='font-size: 40px;cursor: pointer;color: #fff'>" +
                "<img src='http://www.ireadhome.com/Content/Images/mobile/next_picture.png' id='inote_img_next' style='font-size: 40px;cursor: pointer;margin-left: 50px;color: #fff'>&gt;</span>";
            inote_div_nextimg.setAttribute("style", "position:fixed;bottom:20px;left:50%;margin-left:-134px");
            inote_img_container.appendChild(inote_div_nextimg);
            var _num = 0,
                _src_len = src.length;;
            for (var j = 0; j < _src_len; j++) {
                if (src[j] == the_src) {
                    _num = j;
                }
            }
            document.getElementById("inote_img_next").onclick = function() {
                _num++;
                if (_num >= _src_len) {
                    _num = 0;
                }
                inote_other_img(src[_num]);

            };
            document.getElementById("inote_img_pre").onclick = function() {
                _num--;
                if (_num < 0) {
                    _num = _src_len - 1;
                }
                inote_other_img(src[_num]);

            };
            document.getElementById("inote_img_close").onclick = function() {
                document.body.removeChild(inote_img_container);
                document.body.removeChild(inote_mc_div);
                document.body.style.overflow = "auto";
            };
        }

        function inote_other_img(src) {
            document.getElementById("single_img_look").src = src;
            document.getElementById("inote_img_container").style.marginTop = (-document.getElementById("single_img_look").offsetHeight / 2) + "px";
            document.getElementById("inote_img_container").style.marginLeft = (-document.getElementById("single_img_look").offsetWidth / 2) + "px";
        }

        function windowchange() {
            var mainHeight, mainWith;
            if (window.innerHeight !== undefined) {
                mainHeight = parseInt(window.innerHeight) + "px";
                mainWith = parseInt(window.innerWidth) + "px";
            } else {
                var B = document.documentElement.offsetHeight,
                    D = document.documentElement.clientHeight;
                mainHeight = parseInt(Math.max(D, B)) + "px";
                var A = document.documentElement.offsetWidth,
                    C = document.documentElement.clientWidth;
                mainWith = parseInt(Math.max(A, C)) + "px";
            };
            return {
                "Height": mainHeight,
                "Width": mainWith
            };
        }
    }
});


((function($) {
    var isShowTran = false;

    var x, y;

    $(document).click(function(e) {
        console.log(e.target.className);
    });

    $(document).keypress(function(event) {
        var code = event.keyCode || event.whick;
        if (code == 100) {
            var t = getSelected().toString().trim();
            if (t != '' && t.length < 200) {
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
