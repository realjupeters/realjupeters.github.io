var AUTH_DOMAIN
if (window.location.hostname == "poolparty.jupeters.de") {
    AUTH_DOMAIN = "https://jpCore.logge.top"
}
else {
    // AUTH_DOMAIN = "http://localhost:3000"^
    AUTH_DOMAIN = 'http://' + window.location.hostname + ':3000'
}

var BASE_ENDPOINT_URL = AUTH_DOMAIN + "/api/"

var token = localStorage.getItem('token')
if (!token) {
    alert('No token present. Please login first.')
}

// account
fetch(BASE_ENDPOINT_URL + 'admin/poolparty/account', {
    method: 'get',
    headers: new Headers({
        'Authorization': token,
    })
}).then(async response => {
    const accounts = (await response.json()).sort((a, b) => b.lastActivity - a.lastActivity)
    console.log("account", accounts)
    const accountTable = document.getElementById('accountTable')
    for (let i = 0; i < accounts.length; i++) {
        const a = accounts[i]
        const tr = document.createElement('tr')


        for (key in a) {
            const td = document.createElement('td')
            if (key == "lastActivity") a[key] = a[key] ? new Date(a[key]).toLocaleDateString() : ''
            td.innerText = a[key] || ''
            tr.append(td)
        }

        accountTable.append(tr)
    }
}).catch(console.error)

// registration
fetch(BASE_ENDPOINT_URL + 'admin/poolparty/registration', {
    method: 'get',
    headers: new Headers({
        'Authorization': token,
    })
}).then(async response => {
    const registration = await response.json()
    console.log("registration", registration)
    const registrationTable = document.getElementById('registrationTable')

    for (let i = 0; i < registration.length; i++) {
        const a = registration[i]
        const tr = document.createElement('tr')


        for (key in a) {
            const td = document.createElement('td')
            if (key == "lastActivity") a[key] = a[key] = a[key] ? new Date(a[key]).toLocaleDateString() : ''
            td.innerText = a[key] || ''
            tr.append(td)
        }

        registrationTable.append(tr)
    }
})

// item
fetch(BASE_ENDPOINT_URL + 'admin/poolparty/item', {
    method: 'get',
    headers: new Headers({
        'Authorization': token,
    })
}).then(async response => {
    const item = await response.json()
    console.log("item", item)
    const itemTable = document.getElementById('itemTable')

    for (let i = 0; i < item.length; i++) {
        const a = item[i]
        const tr = document.createElement('tr')

        for (key in a) {
            const td = document.createElement('td')
            if (key == "lastActivity") a[key] = a[key] = a[key] ? new Date(a[key]).toLocaleDateString() : ''
            td.innerText = a[key] || ''
            tr.append(td)
        }

        const removeButton = document.createElement('button')
        removeButton.innerText = 'X'
        removeButton.onclick = () => {
            removeButton.className = 'btn-danger'
            removeButton.innerText = 'Sicher?'
            removeButton.onclick = async () => {
                const response = await fetch(BASE_ENDPOINT_URL + 'admin/poolparty/item/' + a.id, {
                    method: 'DELETE',
                    headers: new Headers({
                        'Authorization': token,
                    })
                })

                const json = await response.json()

                if (json.success) {
                    alert(json.success)
                    removeButton.parentElement.remove()
                }
                else {
                    alert(JSON.stringify(json))
                }
            }
        }
        tr.append(removeButton)

        itemTable.append(tr)
    }
})

const addItemInput = document.getElementById('addItemInput')
document.getElementById('addItem').onclick = () => {
    const name = addItemInput.value
    if (name.length < 3) return
    if (name.length > 512) return
    fetch(BASE_ENDPOINT_URL + 'admin/poolparty/item', {
        method: 'post',
        headers: new Headers({
            'Authorization': token,
            'Content-Type': 'application/json'
        }),
        body: JSON.stringify({ name })
    }).then(async response => {
        const json = await response.json()
        console.log('Added Item', json)
        if (json.success) {
            alert(json.success)
        }
    })
}

// volunteer
fetch(BASE_ENDPOINT_URL + 'admin/poolparty/volunteer', {
    method: 'get',
    headers: new Headers({
        'Authorization': token,
    })
}).then(async response => {
    const volunteer = await response.json()
    console.log("volunteer", volunteer)
    const volunteerTable = document.getElementById('volunteerTable')

    for (let i = 0; i < volunteer.length; i++) {
        const a = volunteer[i]
        const tr = document.createElement('tr')


        for (key in a) {
            const td = document.createElement('td')
            if (key == "lastActivity") a[key] = a[key] = a[key] ? new Date(a[key]).toLocaleDateString() : ''
            td.innerText = a[key] || ''
            tr.append(td)
        }

        volunteerTable.append(tr)
    }
})

