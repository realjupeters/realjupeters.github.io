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

// registration
fetch(BASE_ENDPOINT_URL + 'admin/poolparty/account', {
    method: 'get',
    headers: new Headers({
        'Authorization': token,
    })
}).then(async response => {
    const json = await response.json()
    console.log(json)
})


// registration
fetch(BASE_ENDPOINT_URL + 'admin/poolparty/registration', {
    method: 'get',
    headers: new Headers({
        'Authorization': token,
    })
}).then(async response => {
    const json = await response.json()
    console.log(json)
})

// item
fetch(BASE_ENDPOINT_URL + 'admin/poolparty/item', {
    method: 'get',
    headers: new Headers({
        'Authorization': token,
    })
}).then(async response => {
    const json = await response.json()
    console.log(json)
})

// volunteer
fetch(BASE_ENDPOINT_URL + 'admin/poolparty/volunteer', {
    method: 'get',
    headers: new Headers({
        'Authorization': token,
    })
}).then(async response => {
    const json = await response.json()
    console.log(json)
})

