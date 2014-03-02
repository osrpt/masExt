chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
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
    });