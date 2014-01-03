/*debug function*/

var dbg = (typeof console !== 'undefined') ? function(s) {
        // console.log("iNote: " + s);
    } : function() {};
/*start private property*/

var protectImage = true;
var bigImageArea = 100 * 150;
var bigImageScoreRate = 3 / 100000; // 面积/10000 * bigImageScoreRate

var flags = 0x1 | 0x2 | 0x4;

var FLAG_STRIP_UNLIKELYS = 0x1;
var FLAG_WEIGHT_CLASSES = 0x2;
var FLAG_CLEAN_CONDITIONALLY = 0x4;

/*需要用到的正则表达式*/
/** @type 需要用到的正则表达式 */
var regexps = {
    unlikelyCandidates: /combx|comment|community|disqus|extra|foot|header|menu|remark|rss|shoutbox|sidebar|sponsor|ad-break|agegate|pagination|pager|popup|tweet|twitter/i,
    okMaybeItsACandidate: /and|article|body|column|main|shadow/i,
    positive: /article|body|content|entry|hentry|main|page|pagination|post|text|blog|story/i,
    negative: /combx|comment|com-|contact|foot|footer|footnote|masthead|media|meta|outbrain|promo|related|scroll|shoutbox|sidebar|sponsor|shopping|tags|tool|widget/i,
    extraneous: /print|archive|comment|discuss|e[\-]?mail|share|reply|all|login|sign|single/i,
    divToPElements: /<(a|blockquote|dl|div|img|ol|p|pre|table|ul)/i,
    replaceBrs: /(<br[^>]*>[ \n\r\t]*){2,}/gi,
    replaceFonts: /<(\/?)font[^>]*>/gi,
    trim: /^\s+|\s+$/g,
    normalize: /\s{2,}/g,
    killBreaks: /(<br\s*\/?>(\s|&nbsp;?)*){1,}/g,
    videos: /http:\/\/(www\.)?(youtube|vimeo|youku|tudou|sina)\.com/i,
    skipFootnoteLink: /^\s*(\[?[a-z0-9]{1,2}\]?|^|edit|citation needed)\s*$/i,
    nextLink: /(next|weiter|continue|next_page|>([^\|]|$)|([^\|]|$))/i, // Match: next, continue, >, >>, ? but not >|, ?| as those usually mean last.
    prevLink: /(prev|earl|old|new|<|)/i,
    indexLink: /http.*(\\.com\.cn|.net|\.com|\.cn)/
};

/*end private property*/

/*start private methods*/
/** 抽取文章内容 */

function grabArticle(page) {
    var stripUnlikelyCandidates = flagIsActive(FLAG_STRIP_UNLIKELYS);
    var allElements = page.getElementsByTagName('*'); //得到页面所有元素


    /**
     * 准备节点，将所有垃圾节点去除，将DIV标签转换为P标签
     **/
    var node = null;
    var nodesToScore = []; //可用节点数组
    for (var i = 0; i < allElements.length; ++i) {
        // Remove unlikely candidates */
        var continueFlag = false;
        node = allElements[i]; //提取所有节点中的第i个
        var unlikelyMatchString = node.className + node.id;
        if (unlikelyMatchString.search(regexps.unlikelyCandidatesRe) !== -1 && unlikelyMatchString.search(regexps.okMaybeItsACandidateRe) == -1 && node.tagName !== "BODY") {
            dbg("移除unlikly节点 - " + unlikelyMatchString);
            node.parentNode.removeChild(node);
            continueFlag = true;
        }

        if (!continueFlag && (node.tagName === 'P' || node.tagName === 'TD' || node.tagName === 'PRE')) {
            nodesToScore[nodesToScore.length] = node;
        }

        /*提取理论上可用大图片*/
        if (protectImage && !continueFlag && node.tagName === 'IMG' && elementVisible(node)) {
            var imgArea = node.width * node.height;
            if (imgArea > bigImageArea) {
                dbg("一个不错的图片节点：" + node);
                nodesToScore[nodesToScore.length] = node;
            }
        }

        // Turn all divs that don't have children block level elements into p's
        if (!continueFlag && node.tagName === "DIV") {
            if (node.innerHTML.search(regexps.divToPElements) === -1) {
                var newNode = document.createElement('p');
                var nodeArr = node.childNodes;
                newNode.innerHTML = node.innerHTML;
                node.parentNode.replaceChild(newNode, node);
                nodesToScore[nodesToScore.length] = node;
            } else {
                for (var j = 0, jl = node.childNodes.length; j < jl; j += 1) {
                    var childNode = node.childNodes[j];
                    /*如果为文本节点*/
                    if (childNode.nodeType === 3) {
                        var span = document.createElement('p');
                        span.innerHTML = childNode.nodeValue;
                        childNode.parentNode.replaceChild(span, childNode);
                    }
                }
            }
        }
    }
    /**
     * Loop through all paragraphs, and assign a score to them based on how content-y they look.
     * Then add their score to their parent node.
     *
     * A score is determined by things like number of commas, class names, etc. Maybe eventually link density.
     **/
    var candidates = [];
    for (var i = 0; i < nodesToScore.length; ++i) {
        var node = nodesToScore[i];
        var parentNode = node.parentNode;
        if (parentNode === null) continue; //todoyang:这里有问题，不应该有这个判断
        var grandParentNode = parentNode.parentNode;
        var innerText = getInnerText(node);
        var isGoodImg = node.tagName === 'IMG' && protectImage; //是否是图片
        if (!isGoodImg && escape(innerText).indexOf("%u") > 0 && innerText.length < 10) {
            dbg("包含中文且少于10个字，跳过：=>" + innerText);
            continue;
        } else if (!isGoodImg && escape(innerText).indexOf("%u") < 0 && innerText.length < 25) {
            //                dbg("不包含中文但少于25个字=>" + innerText);
            continue;
        }

        // Initialize readability data for the parent.
        if (typeof parentNode.readability == 'undefined') {
            initializeNode(parentNode);
            candidates.push(parentNode);
        }

        // Initialize readability data for the grandparent.
        if (grandParentNode && typeof grandParentNode.readability == 'undefined') {
            initializeNode(grandParentNode);
            candidates.push(grandParentNode);
        }

        //基础分数
        var contentScore = 1;

        if (isGoodImg) {
            var singleImgArea = node.width * node.height;
            var imgScore = bigImageScoreRate * singleImgArea;
            contentScore += imgScore;
            dbg("不错的图片，加分=>" + imgScore);
        }

        // Add points for any commas within this node */
        // support Chinese commas.支持中文逗号
        contentScore += innerText.replace('，', ',').split(',').length;

        // For every 100 characters in this node, add another point. Up to 3 points. */
        // adjust by yangsibai at 2013-9-24 100=>20
        contentScore += Math.min(Math.floor(innerText.length / 20), 3);

        //将分数加给父节点，祖父节点获取一半的分数
        parentNode.readability.contentScore += contentScore;
        if (grandParentNode) {
            grandParentNode.readability.contentScore += contentScore / 2;
        }
    }


    /**
     * After we've calculated scores, loop through all of the possible candidate nodes we found
     * and find the one with the highest score.
     **/
    var topCandidate = null;
    for (var c = 0, cl = candidates.length; c < cl; c += 1) {
        /**
         * Scale the final candidates score based on link density. Good content should have a
         * relatively small link density (5% or less) and be mostly unaffected by this operation.
         * 根据链接密度计算分数
         **/
        var node = candidates[c];
        var linkDensity = getLinkDensity(node);
        if (linkDensity && linkDensity > 0) {
            node.readability.contentScore = node.readability.contentScore * (1 - getLinkDensity(node));
        }
        dbg('Candidate: ' + node + " (" + node.className + ":" + node.id + ") with score " + node.readability.contentScore);

        if (!topCandidate || node.readability.contentScore > topCandidate.readability.contentScore) {
            topCandidate = node;
        }

    }

    /**
     * If we still have no top candidate, just use the body as a last resort.
     * We also have to copy the body node so it is something we can modify.
     **/
    if (topCandidate === null || topCandidate.tagName === "BODY") {
        topCandidate = document.createElement("DIV");
        topCandidate.innerHTML = page.innerHTML;
        page.innerHTML = "";
        page.appendChild(topCandidate);
        initializeNode(topCandidate);
    }

    /**
     * Now that we have the top candidate, look through its siblings for content that might also be related.
     * Things like preambles, content split by ads that we removed, etc.
     **/
    var articleContent = document.createElement("DIV");
    var siblingScoreThreshold = Math.max(10, topCandidate.readability.contentScore * 0.2);
    var siblingNodes = topCandidate.parentNode.childNodes;


    for (var s = 0, sl = siblingNodes.length; s < sl; s += 1) {
        var siblingNode = siblingNodes[s];
        var append = false;

        /**
         * Fix for odd IE7 Crash where siblingNode does not exist even though this should be a live nodeList.
         * Example of error visible here: http://www.esquire.com/features/honesty0707
         **/
        if (!siblingNode) {
            continue;
        }

        dbg("Looking at sibling node: " + siblingNode + " (" + siblingNode.className + ":" + siblingNode.id + ")" + ((typeof siblingNode.readability !== 'undefined') ? (" with score " + siblingNode.readability.contentScore) : ''));
        dbg("Sibling has score " + (siblingNode.readability ? siblingNode.readability.contentScore : 'Unknown'));

        if (siblingNode === topCandidate) {
            append = true;
        }

        var contentBonus = 0;
        /* Give a bonus if sibling nodes and top candidates have the example same classname */
        /*如果兄弟节点跟top节点有同样的className,加 20%分 */
        if (siblingNode.className === topCandidate.className && topCandidate.className !== "") {
            contentBonus += topCandidate.readability.contentScore * 0.2;
        }

        if (typeof siblingNode.readability !== 'undefined' && (siblingNode.readability.contentScore + contentBonus) >= siblingScoreThreshold) {
            append = true;
        }

        if (siblingNode.nodeName === "P") {
            var linkDensity = getLinkDensity(siblingNode);
            var nodeContent = getInnerText(siblingNode);
            var nodeLength = nodeContent.length;

            if (nodeLength > 80 && linkDensity < 0.25) {
                append = true;
            } else if (nodeLength < 80 && linkDensity === 0 && nodeContent.search(/\.( |$)/) !== -1) {
                append = true;
            }
        }

        if (append) {
            dbg("Appending node: " + siblingNode);

            var nodeToAppend = null;
            if (siblingNode.nodeName !== "DIV" && siblingNode.nodeName !== "P") {
                /* We have a node that isn't a common block level element, like a form or td tag. Turn it into a div so it doesn't get filtered out later by accident. */

                dbg("Altering siblingNode of " + siblingNode.nodeName + ' to div.');
                nodeToAppend = document.createElement("DIV");
                try {
                    nodeToAppend.id = siblingNode.id;
                    nodeToAppend.innerHTML = siblingNode.innerHTML;
                } catch (er) {
                    dbg("Could not alter siblingNode to div, probably an IE restriction, reverting back to original.");
                    nodeToAppend = siblingNode;
                    s -= 1;
                    sl -= 1;
                }
            } else {
                nodeToAppend = siblingNode;
                s -= 1;
                sl -= 1;
            }
            /* To ensure a node does not interfere with readability styles, remove its classnames */
            nodeToAppend.className = "";
            /* Append sibling and subtract from our list because it removes the node when you append to another node */
            articleContent.appendChild(nodeToAppend);
        }
    }
    prepArticle(articleContent);
    return articleContent;
}

/**
 * 获取文章footer,iread 版权声明 add by yangsibai 2013-9-23
 * @return 版权声明footer div
 */

/*在页脚创建版权声明*/

function getArticleFooter() {
    var articleFooter = document.createElement("DIV");
    articleFooter.id = "inote-footer";
    articleFooter.className = 'footer';
    articleFooter.innerHTML = [
        "<div class='footer-right'>",
        "<a href='http://www.ireadhome.com' target='_blank' class='footer-ireadlink'>powered by iread &raquo;</a>",
        "<span class='version'>version " + version + "</span>",
        "</div>",
        "</div>"
    ].join('');
    return articleFooter;
}

/**
 * 显示消息提示
 * @param  消息内容
 * @param  多少秒后隐藏
 * @return void
 */

function showMessage(msg, time) {
    if (!time || time <= 0) time = 3;
    var msgId = "inote_message_box";
    var box = document.getElementById(msgId);
    if (!box) { //还没有消息框
        box = document.createElement("div");
        box.id = msgId;
        document.body.appendChild(box);
    } else {
        box.style.display = "block";
    }
    box.innerHTML = '<p>' + msg + '</p>';
    $('#' + msgId).fadeIn();
    setTimeout(function() {
        $('#' + msgId).fadeOut();
    }, time * 1000);
}

/**
 * 检测flag是否启用
 * @param  flag
 * @return true/false
 */

function flagIsActive(flag) {
    return (flags & flag) > 0;
}

function getInnerText(e, normalizeSpaces) {
    var textContent = "";

    if (typeof(e.textContent) === "undefined" && typeof(e.innerText) === "undefined") {
        return "";
    }

    normalizeSpaces = (typeof normalizeSpaces === 'undefined') ? true : normalizeSpaces; //若传参，则提取参数，不传参，则等于true


    textContent = e.textContent.replace(regexps.trim, "");


    if (normalizeSpaces) {
        return textContent.replace(regexps.normalize, " ");
    } else {
        return textContent;
    }
}

/**
 * Initialize a node with the readability object. Also checks the
 * className/id for special names to add to its score.
 * 使用readability对象初始化节点，同时检查特殊的class名操作分数
 * @param Element
 * @return void
 **/

function initializeNode(node) {
    node.readability = {
        "contentScore": 0
    };

    switch (node.tagName) {
        case 'DIV':
            node.readability.contentScore += 5;
            break;
        case 'PRE':
        case 'TD':
        case 'BLOCKQUOTE':
            node.readability.contentScore += 3;
            break;
        case 'ADDRESS':
        case 'OL':
        case 'UL':
        case 'DL':
        case 'DD':
        case 'DT':
        case 'LI':
        case 'FORM':
            node.readability.contentScore -= 3;
            break;
        case 'H1':
        case 'H2':
        case 'H3':
        case 'H4':
        case 'H5':
        case 'H6':
        case 'TH':
            node.readability.contentScore -= 5;
            break;
    }

    node.readability.contentScore += getClassWeight(node);
}

/*获取一个class的分数*/

function getClassWeight(e) {
    if (!flagIsActive(FLAG_WEIGHT_CLASSES)) {
        return 0;
    }

    var weight = 0;

    /* Look for a special classname */
    if (typeof(e.className) === 'string' && e.className !== '') {
        if (e.className.search(regexps.negative) !== -1) {
            weight -= 25;
        }

        if (e.className.search(regexps.positive) !== -1) {
            weight += 25;
        }
    }

    /* 查找特殊的ID */
    if (typeof(e.id) === 'string' && e.id !== '') {
        if (e.id.search(regexps.negative) !== -1) {
            weight -= 25;
        }

        if (e.id.search(regexps.positive) !== -1) {
            weight += 25;
        }
    }

    return weight;
}

/*获取链接密度*/

function getLinkDensity(e) {
    var links = e.getElementsByTagName("a");
    var textLength = getInnerText(e).length; //e中内容长度
    var linkLength = 0; //e中a标签内容长度
    for (var i = 0, il = links.length; i < il; i += 1) {
        linkLength += getInnerText(links[i]).length;
    }

    return linkLength / textLength;
}

/*准备文章内容*/

function prepArticle(articleContent) {
    cleanStyles(articleContent); //清除样式
    killBreaks(articleContent); //清除换行

    /* Clean out junk from the article content */
    cleanConditionally(articleContent, "form");
    clean(articleContent, "object");
    clean(articleContent, "h1");

    /**
     * If there is only one h2, they are probably using it
     * as a header and not a subheader, so remove it since we already have a header.
     ***/
    if (articleContent.getElementsByTagName('h2').length === 1) {
        clean(articleContent, "h2");
    }
    clean(articleContent, "iframe");

    cleanHeaders(articleContent);

    /* Do these last as the previous stuff may have removed junk that will affect these */
    cleanConditionally(articleContent, "table");
    cleanConditionally(articleContent, "ul");
    cleanConditionally(articleContent, "div");

    //dbg("正在准备文章："+articleContent.innerHTML);
    /* Remove extra paragraphs */
    var articleParagraphs = articleContent.getElementsByTagName('p');
    for (var i = articleParagraphs.length - 1; i >= 0; i -= 1) {
        var imgCount = articleParagraphs[i].getElementsByTagName('img').length;
        var embedCount = articleParagraphs[i].getElementsByTagName('embed').length;
        var objectCount = articleParagraphs[i].getElementsByTagName('object').length;

        if (imgCount === 0 && embedCount === 0 && objectCount === 0 && getInnerText(articleParagraphs[i], false) === '') {
            articleParagraphs[i].parentNode.removeChild(articleParagraphs[i]);
        }
    }
    cleanSingleHeader(articleContent);

    prepImage(articleContent);

    try {
        articleContent.innerHTML = articleContent.innerHTML.replace(/<br[^>]*>\s*<p/gi, '<p');
    } catch (e) {
        dbg("清理换行失败，IE bug，忽略：" + e);
    }
}

/**
 * 处理图片：1.把相对路径改为绝对路径；2.尝试找出真实图片路径，解决延时加载问题；
 * @param  {[type]} content [description]
 * @return {[type]}         [description]
 */

function prepImage(content) {
    /*将为相对路径的图片改为绝对路径*/
    var aImg = content.getElementsByTagName("img");
    for (var i = 0, aImgLen = aImg.length; i < aImgLen; i++) {
        if (aImg[i]) {
            var realImageSrc = aImg[i].src;
            if (aImg[i].height) {
                aImg[i].removeAttribute("height");
            }
            var attrs = aImg[i].attributes;
            for (var j = attrs.length - 1; j >= 0; j--) {
                if (!isCommonAttribute(attrs[j].nodeName) && isUrl(attrs[j].nodeValue)) {
                    realImageSrc = attrs[j].nodeValue;
                    break; //找到一张图片，就不再遍历了
                }
            }
            aImg[i].setAttribute("src", realImageSrc);
            realImageSrc = null;
        }
    }
}

function isCommonAttribute(attr) {
    return ['class', 'title', 'src', 'alt', 'id'].indexOf(attr) >= 0;
}

function isUrl(s) {
    var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
    return regexp.test(s);
}

/*清理所有css样式*/

function cleanCssStyle() {
    var aLink = document.getElementsByTagName("link");
    dbg(aLink);
    for (var i = 0, aLinkLen = aLink.length; i < aLinkLen; i++) {
        if (aLink[i]) aLink[i].parentNode.removeChild(aLink[i]);
    }
}
/*清理元素的style*/

function cleanStyles(e) {
    e = e || document;
    var cur = e.firstChild;
    if (!e) {
        return;
    }

    // Remove any root styles, if we're able.
    if (typeof e.removeAttribute === 'function' && e.className !== 'iread_style') {
        e.removeAttribute('style');
        e.removeAttribute('align');
    }
    // Go until there are no more child nodes
    while (cur !== null && cur !== undefined) {
        if (cur.nodeType === 1) {
            // Remove style attribute(s) :
            if (cur.className !== "iread_style") {
                cur.removeAttribute("style");
                cur.removeAttribute('class');
            }
            cleanStyles(cur);
        }
        cur = cur.nextSibling;
    }
}

/*清理换行*/

function killBreaks(e) {
    try {
        e.innerHTML = e.innerHTML.replace(regexps.killBreaks, '<br />');
    } catch (eBreaks) {
        dbg("KillBreaks failed - this is an IE bug. Ignoring.: " + eBreaks);
    }
}

/**
 * Clean an element of all tags of type "tag" if they look fishy.
 * "Fishy" is an algorithm based on content length, classnames, link density, number of images & embeds, etc.
 *
 * @return void
 **/

function cleanConditionally(e, tag) {

    if (!flagIsActive(FLAG_CLEAN_CONDITIONALLY)) {
        return;
    }

    var tagsList = e.getElementsByTagName(tag);
    var curTagsLength = tagsList.length;

    /**
     * Gather counts for other typical elements embedded within.
     * Traverse backwards so we can remove nodes at the same time without effecting the traversal.
     *
     * TODO: Consider taking into account original contentScore here.
     **/
    for (var i = curTagsLength - 1; i >= 0; i -= 1) {
        var weight = getClassWeight(tagsList[i]);
        var contentScore = (typeof tagsList[i].readability !== 'undefined') ? tagsList[i].readability.contentScore : 0;

        dbg("Cleaning Conditionally " + tagsList[i] + " (" + tagsList[i].className + ":" + tagsList[i].id + ")" + ((typeof tagsList[i].readability !== 'undefined') ? (" with score " + tagsList[i].readability.contentScore) : ''));

        //todoyang:是否可以使用中文逗号?
        if (weight + contentScore < 0) {
            tagsList[i].parentNode.removeChild(tagsList[i]);
        } else if (getCharCount(tagsList[i], ',') < 10 || getCharCount(tagsList[i], '，') < 10) {
            /**
             * If there are not very many commas, and the number of
             * non-paragraph elements is more than paragraphs or other ominous signs, remove the element.
             **/
            var mustProtectImage = false;
            var imgs = tagsList[i].getElementsByTagName('img');
            for (var j = 0; j < imgs.length; j++) {
                var singleImg = imgs[j];
                if (singleImg.width > 300 || singleImg.height > 300) {
                    //toRemove = false; //不要移除掉大图片
                    mustProtectImage = true;
                }
            }
            if (!mustProtectImage && protectImage) {
                var p = tagsList[i].getElementsByTagName("p").length;
                var img = imgs.length;
                var li = tagsList[i].getElementsByTagName("li").length - 100;
                var input = tagsList[i].getElementsByTagName("input").length;

                var embedCount = 0;
                var embeds = tagsList[i].getElementsByTagName("embed");
                for (var ei = 0, il = embeds.length; ei < il; ei += 1) {
                    if (embeds[ei].src.search(regexps.videos) === -1) {
                        embedCount += 1;
                    }
                }

                var linkDensity = getLinkDensity(tagsList[i]);
                var contentLength = getInnerText(tagsList[i]).length;
                var toRemove = false;

                if (img > p) {
                    toRemove = true;
                } else if (li > p && tag !== "ul" && tag !== "ol") {
                    toRemove = true;
                } else if (input > Math.floor(p / 3)) {
                    toRemove = true;
                } else if (contentLength < 25 && (img === 0 || img > 2)) {
                    toRemove = true;
                } else if (weight < 25 && linkDensity > 0.2) {
                    toRemove = true;
                } else if (weight >= 25 && linkDensity > 0.5) {
                    toRemove = true;
                } else if ((embedCount === 1 && contentLength < 75) || embedCount > 1) {
                    toRemove = true;
                }

                if (toRemove) {
                    tagsList[i].parentNode.removeChild(tagsList[i]);
                }
            }
        }
    }
}

/**
 * Clean a node of all elements of type "tag".
 * (Unless it's a youtube/vimeo video. People love movies.)
 *
 * @param Element
 * @param string tag to clean
 * @return void
 **/

function clean(e, tag) {
    var targetList = e.getElementsByTagName(tag);
    var isEmbed = (tag == 'object' || tag == 'embed');

    for (var y = targetList.length - 1; y >= 0; y--) {
        /* Allow youtube and vimeo videos through as people usually want to see those. */
        if (isEmbed && targetList[y].innerHTML.search(regexps.videoRe) !== -1) {
            continue;
        }
        if (targetList[y] && targetList[y].parentNode) {
            var oParentNode = targetList[y].parentNode;
            oParentNode.removeChild(targetList[y]);
        }
    }
}

/**
 * Clean out spurious headers from an Element. Checks things like classnames and link density.
 *
 * @param Element
 * @return void
 **/

function cleanHeaders(e) {
    for (var headerIndex = 1; headerIndex < 3; headerIndex += 1) {
        var headers = e.getElementsByTagName('h' + headerIndex);
        for (var i = headers.length - 1; i >= 0; i -= 1) {
            if (getClassWeight(headers[i]) < 0 || getLinkDensity(headers[i]) > 0.33) {
                headers[i].parentNode.removeChild(headers[i]);
            }
        }
    }
}

/*获取node节点中字符串s出现的次数*/

function getCharCount(e, s) {
    s = s || ",";
    return getInnerText(e).split(s).length - 1;
}

/**
 * Remove the header that doesn't have next sibling.
 *
 * @param Element
 * @return void
 **/

function cleanSingleHeader(e) {
    for (var headerIndex = 1; headerIndex < 7; headerIndex++) {
        var headers = e.getElementsByTagName('h' + headerIndex);
        for (var i = headers.length - 1; i >= 0; --i) {
            if (headers[i].nextSibling === null) {
                headers[i].parentNode.removeChild(headers[i]);
            }
        }
    }
}

/** 判断元素是否可见 */

function elementVisible(element) {
    return element.offsetWidth > 0 || element.offSetHeight > 0;
}

/*从数组arr中删除已有数据string*/

function deletearr(arr, string) {
    for (var k = 0, arrlen = arr.length; k < arrlen; k++) {
        if (arr[k] == string) {
            for (var j = k; j < arrlen; j++) {
                arr[j] = arr[j + 1];
            }
            arr[arrlen - 1] = null;
            arr.pop();
        }
    }
    return arr;
}
