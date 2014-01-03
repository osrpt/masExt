$(document).ready(function() {
    var key_data= "key_data";
    var key_love = "key_love";
    var key_host = "key_host";
    var key_time = "key_time";
    var default_love = "";
    var default_host = "202.115.133.161";
    var default_time = "50";
    var storage = chrome.storage.local;
    var obj = {};

    storage.get(key_data, function(result) {
        if (result) {
            var data=result[key_data];
            if (data[key_love]) {
                $("#love").val(data[key_love]);
            } else {
                $("#love").val(default_love);
            }

            if (data[key_host]) {
                $("#host").val(data[key_host]);
            } else {
                $("#host").val(default_host);
            }

            if (data[key_time]) {
                $("#time").val(data[key_time]);
            } else {
                $("#time").val(default_time);
            }
        } else {
            $("#love").val(default_love);
            $("#time").val(default_time);
            $("#host").val(default_host);
        }
    });

    $("#save").click(function() {
        var love = $("#love").val();
        var host = $("#host").val();
        var time = $("#time").val();
        obj[key_love] = love;
        obj[key_host] = host;
        obj[key_time] = time;
        storage.set({key_data:obj});
    });
});
