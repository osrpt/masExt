var url = window.location.href;

var sites = {
    unknown: 'unknown',
    t66y: 't66y',
    zhibo8: 'zhibo8',
    cnblogs: 'cnblogs',
    weibo: 'weibo',
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
        default:
            return false;
    }

    /**
     * readability init
     * @return {[type]} [description]
     */

    function initReadability() {
        var wolf = $("<div/>");
        wolf.attr('id', 'masExtWolfIcon');
        wolf.html('<input type="button" class="btn" />');
        $('body').append(wolf);
        $("#masExtWolfIcon").click(function() {
            var cacheDoc = document.createElement('div');
            cacheDoc.innerHTML = window.document.body.innerHTML;
            var content = grabArticle(cacheDoc);
            alert(content);
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
                    var newHref = href.replace(/______/g, ".").replace("http://www.viidii.com/?", "");
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
});
