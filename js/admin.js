var AUTH_DOMAIN
if (window.location.hostname == "poolparty.jupeters.de") {
    AUTH_DOMAIN = "https://poolparty-dev.logge.top"
}
else {
    AUTH_DOMAIN = "http://localhost:3000"
}

var BASE_ENDPOINT_URL = AUTH_DOMAIN + "/api/"

var token = localStorage.getItem('token')
if (!token) {
    alert('No token present. Please login first.')
}

fetch(BASE_ENDPOINT_URL + 'admin/test', {
    method: 'get',
    headers: new Headers({
        'Authorization': token,
    })
}).then(response => {
    response.json().then(json => {
        console.log(json)
        var data = json.data
        if (data.anmeldung.length > 0) {