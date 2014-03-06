$(document).ready(function() {
    $("#sites").focus();
    $("#sites").val(localStorage.distractingSites || '');

    $("#save").click(function() {
        var sites = $("#sites").val().trim().toLowerCase();
        localStorage.distractingSites = sites;
    })
});
