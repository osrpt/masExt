var distracting = [];

if (localStorage.distractingSites) {
    var sites = localStorage.distractingSites.split('\n');
    for (var i = 0; i < sites.length; i++) {
        distracting.push(sites[i]);
    };
}

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        var action = request.action || 'unknown';
        if (action === 'notify') {
            chrome.notifications.create('notify', {
                type: 'basic',
                title: request.title,
                message: request.message,
                iconUrl: "/icons/icon-64.png"
            }, function(notificationId) {
                setTimeout(function() {
                    chrome.notifications.clear(notificationId, function() {});
                }, 3 * 1000);
            })
        } else if (action === 'log') {
            var currentSite = getHostNameFromUrl(request.url);
            var count = parseInt(localStorage[getCacheKey(currentSite)] || 0) + 1;
            localStorage[getCacheKey(currentSite)] = count;
            for (var i = 0; i < distracting.length; i++) {
                var site = distracting[i];
                if (currentSite.indexOf(site) !== -1) {
                    chrome.notifications.create('notify', {
                        type: 'basic',
                        title: 'Distracting Site',
                        message: '这是今天第 ' + count + ' 次上 ' + currentSite,
                        iconUrl: "/icons/icon-64.png"
                    }, function(notificationId) {
                        setTimeout(function() {
                            chrome.notifications.clear(notificationId, function() {});
                        }, 3 * 1000);
                    });
                    break;
                }
            };
        }
    }
);

/**
 * 获取站点的hostname
 * @param  {[type]} url
 * @return {[type]}
 */

function getHostNameFromUrl(url) {
    var matches = url.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
    var host = matches && matches[1];
    return host.toLowerCase();
}

/**
 * 获取站点的缓存key
 * @param  {[type]} site
 * @return {[type]}
 */

function getCacheKey(site) {
    var now = new Date();
    var date = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDay();
    return site + '@' + date;
}
