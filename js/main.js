var AUTH_DOMAIN = "https://poolparty-dev.logge.top"
//var AUTH_DOMAIN = "http://localhost:3000"

var BASE_ENDPOINT_URL = AUTH_DOMAIN + "/api/"

function jsonToQS(json) {
    var qs = []
    for (element in json) {
        qs.push(element + "=" + json[element])
    }
    return "?" + qs.join("&")
}

// Populate Select with items
function fillSelect(elements) {
    var input = document.getElementById('mitbringenInput')
    if (!input) return
    for (i = 0; i < elements.length; i++) {
        if (!elements[i]) continue
        var option = document.createElement('option')
        option.setAttribute('value', elements[i]._id)
        option.innerText = elements[i].name
        input.append(option)
    }
}

let itemNames = {}
let userNames = {}

var token = localStorage.getItem('token')
var email, name
if (token) {
    try {
        var userObj = JSON.parse(atob(token.split('.')[1]))
        email = userObj.email
        name = userObj.name
        document.getElementById('personName').innerText = 'Du bist derzeit als ' + userObj.name + ' angemeldet.'

        fetch(BASE_ENDPOINT_URL + 'private/poolparty/ladeNutzer', {
            method: 'get',
            headers: new Headers({
                'Authorization': token,
            })
        })
            .then(response => {
                response.json().then(json => {
                    console.log(json)
                    var data = json.data
                    if (data.anmeldung.length > 0) {

                        document.getElementById('volunteerForm').style.display = ''

                        var item = data.item[0]
                        var anmeldung = data.anmeldung[0]
                        function anmeldungAbmelden() {

                            fetch(BASE_ENDPOINT_URL + 'private/poolparty/anmeldungAbmelden', {
                                method: 'post',
                                headers: new Headers({
                                    'Authorization': token,
                                }),
                                body: new URLSearchParams(jsonToQS({ anmeldungID: anmeldung._id, anmeldungRev: anmeldung._rev, itemID: item._id, itemRev: item._rev, itemName: item.name })),
                            }).then(response => response.json()
                                .then(json => {
                                    if (volunteerAbmelden) { return volunteerAbmelden() }
                                    else {
                                        alert(JSON.stringify(json))
                                        location.reload(true)
                                    }
                                })).catch(console.error)
                        }

                        var anmeldenForm = document.getElementById('anmeldenForm')
                        anmeldenForm.innerHTML = '<div class="alert alert-success">Du hast dich am ' + new Date(anmeldung.date).toLocaleDateString() + ' mit ' + anmeldung.personen + ' Person' + (anmeldung.personen > 0 ? 'en' : '') + ' angemeldet. Du bringst "' + item.name + '" mit. </ br > </div > '
                        var abmeldenButon = document.createElement('button')
                        abmeldenButon.innerText = 'Abmelden'
                        abmeldenButon.className = 'btn-warning'
                        abmeldenButon.onclick = () => {
                            abmeldenButon.className = 'btn-danger'
                            abmeldenButon.innerText = 'Sicher?'
                            abmeldenButon.onclick = () => anmeldungAbmelden()
                        }
                        anmeldenForm.append(abmeldenButon)


                        if (data.volunteer.length > 0) {

                            var volunteer = data.volunteer[0]

                            function volunteerAbmelden() {

                                fetch(BASE_ENDPOINT_URL + 'private/poolparty/volunteerAbmelden', {
                                    method: 'post',
                                    headers: new Headers({
                                        'Authorization': token,
                                    }),
                                    body: new URLSearchParams(jsonToQS({ volunteerID: volunteer._id, volunteerRev: volunteer._rev })),
                                }).then(response => response.json()
                                    .then(json => {
                                        alert(JSON.stringify(json))
                                        location.reload(true)
                                    })).catch(console.error)
                            }


                            var volunteerForm = document.getElementById('volunteerForm')
                            volunteerForm.innerHTML = '<div class="alert alert-success">Du hast dich am ' + new Date(volunteer.date).toLocaleDateString() + ' mit einer Dauer von "' + volunteer.dauer + '" angemeldet.</ br > </div > '
                            var button = document.createElement('button')
                            button.innerText = 'Abmelden'
                            button.className = 'btn-warning'
                            button.onclick = () => {
                                button.className = 'btn-danger'
                                button.innerText = 'Sicher?'
                                button.onclick = () => volunteerAbmelden()
                            }
                            volunteerForm.append(button)
                        }
                    }
                })
            })
            .catch(error => alert("Fehler beim Laden der Nutzerdaten: " + errro))

        document.body.className = 'signedIn'

        //Nutzer ist Admin
        if (userObj.roles.includes('admin')) {

            function loadAdminContent() {

                function removeElement(element, _id, _rev) {
                    fetch(BASE_ENDPOINT_URL + 'admin/poolparty/removeElement', {
                        method: 'post',
                        headers: new Headers({
                            'Authorization': token,
                        }),
                        body: new URLSearchParams(jsonToQS({ element, _id, _rev })),
                    }).then(res => res.json().then(json => loadAdminContent(alert(JSON.stringify(json))))).catch(console.error)
                }

                document.body.className += ' admin'
                fetch(BASE_ENDPOINT_URL + 'admin/poolparty/ladeAnmeldungen', {
                    method: 'get',
                    headers: new Headers({
                        'Authorization': token,
                    })
                }).then(response =>
                    response.json().then(json => {
                        const { items, anmeldungen, volunteers, users } = json.data

                        for (let i = 0; i < items.length; i++) {
                            itemNames[items[i]._id] = items[i].name
                        }

                        for (let i = 0; i < users.length; i++) {
                            userNames[users[i]._id] = users[i].name
                        }

                        // Item handling
                        const itemList = document.getElementById('itemList')
                        itemList.innerHTML = ''
                        for (let i = 0; i < items.length; i++) {
                            const item = items[i]
                            const tr = document.createElement('tr')
                            let td
                            td = document.createElement('td')
                            td.innerText = item._id
                            tr.append(td)

                            td = document.createElement('td')
                            td.innerText = item.name
                            tr.append(td)

                            td = document.createElement('td')
                            td.innerText = item.userID
                            tr.append(td)

                            td = document.createElement('td')
                            if (item.userID) {
                                td.innerText = userNames[item.userID]
                            }
                            else {
                                td.innerText = null
                            }
                            tr.append(td)

                            td = document.createElement('td')
                            const a = document.createElement('button')
                            a.innerText = "X"
                            //a.href = '#admin'
                            a.onclick = () => {
                                a.className = 'btn-danger'
                                a.onclick = () => removeElement("item", item._id, item._rev)
                            }
                            td.append(a)
                            tr.append(td)

                            itemList.append(tr)
                        }

                        // Anmeldung handling
                        const anmeldungList = document.getElementById('anmeldungList')
                        anmeldungList.innerHTML = ''
                        for (let i = 0; i < anmeldungen.length; i++) {
                            const anmeldung = anmeldungen[i]
                            const tr = document.createElement('tr')
                            let td
                            td = document.createElement('td')
                            td.innerText = anmeldung.userID
                            tr.append(td)

                            td = document.createElement('td')
                            td.innerText = userNames[anmeldung.userID]
                            tr.append(td)

                            td = document.createElement('td')
                            td.innerText = anmeldung.personen
                            tr.append(td)

                            td = document.createElement('td')
                            td.innerText = itemNames[anmeldung.itemID]
                            tr.append(td)

                            td = document.createElement('td')
                            td.innerText = new Date(anmeldung.date).toLocaleString()
                            tr.append(td)

                            td = document.createElement('td')
                            const a = document.createElement('button')
                            a.innerText = "X"
                            //a.href = '#admin'
                            a.onclick = () => {
                                a.className = 'btn-danger'
                                a.onclick = () => removeElement("anmeldung", anmeldung._id, anmeldung._rev)
                            }
                            td.append(a)
                            tr.append(td)

                            anmeldungList.append(tr)
                        }

                        // Volunteer handling
                        const volunteerList = document.getElementById('volunteerList')
                        volunteerList.innerHTML = ''
                        for (let i = 0; i < volunteers.length; i++) {
                            const volunteer = volunteers[i]
                            const tr = document.createElement('tr')
                            let td
                            td = document.createElement('td')
                            td.innerText = volunteer.userID
                            tr.append(td)

                            td = document.createElement('td')
                            td.innerText = userNames[volunteer.userID]
                            tr.append(td)

                            td = document.createElement('td')
                            td.innerText = volunteer.dauer
                            tr.append(td)

                            td = document.createElement('td')
                            td.innerText = new Date(volunteer.date).toLocaleString()
                            tr.append(td)

                            td = document.createElement('td')
                            const a = document.createElement('button')
                            a.innerText = "X"
                            //a.href = '#admin'
                            a.onclick = () => {
                                a.className = 'btn-danger'
                                a.onclick = () => removeElement("volunteer", volunteer._id, volunteer._rev)
                            }
                            td.append(a)
                            tr.append(td)

                            volunteerList.append(tr)
                        }

                    })
                ).catch(console.error)
            }
            loadAdminContent()

            var itemInput = document.getElementById('setzeItem')
            function setzeItem() {
                var name = itemInput.value
                if (!name) return alert('Kein Itemname eingetragen')
                fetch(BASE_ENDPOINT_URL + 'admin/poolparty/setzeItem', {
                    method: 'post',
                    body: new URLSearchParams(jsonToQS({ name })),
                    headers: new Headers({
                        'Authorization': token,
                    }),
                }).then(response =>
                    response.json().then(json => {
                        console.log(json)
                        loadAdminContent()
                    })
                ).catch(console.error)
            }
        }

        // Load Items
        console.log(BASE_ENDPOINT_URL + 'private/poolparty/ladeItems')
        fetch(BASE_ENDPOINT_URL + 'private/poolparty/ladeItems', {
            method: 'get',
            headers: new Headers({
                'Authorization': token,
            }),
        }).then(response =>
            response.json().then(json => {
                console.log(json)
                fillSelect(json.data)
            })
        ).catch(console.error)
    }
    catch (e) {
        // Clear broken token
        console.error(e)
        localStorage.removeItem('token')
        alert('Ungültiger Token bitte erneut anmelden')
    }
}

function createPhotos(year, count) {
    var photos = document.getElementById('photos' + year)
    for (i = 1; i <= count; i++) {
        `
        <div class="image-container" data-large="">
            <img class="placeholder" src="" class="img-small">
        </div>
    
        `

        var container = document.createElement('div')
        container.setAttribute('data-large', 'img/' + year + '/full/img' + i + '.jpg')
        container.className = 'image-container'

        var a = document.createElement('a')
        a.target = '_blank'
        a.href = 'img/' + year + '/full/img' + i + '.jpg'

        var small = new Image()
        small.src = 'img/' + year + '/svg/img' + i + '.svg'
        small.className = 'img-small placeholder'
        small.onload = function () {
            this.classList.add("loaded")

            var imgLarge = new Image()
            imgLarge.src = this.parentElement.href
            imgLarge.onload = function () {
                setTimeout(function () {
                    this.classList.add('loaded');
                    small.className = 'hidden'
                }.bind(this), Math.random() * 3000)
            }
            imgLarge.classList.add('picture');

            this.parentElement.appendChild(imgLarge)
        }

        a.append(small)
        container.append(a)

        photos.append(container)

    }
}

function cloudAuth() {
    window.location = AUTH_DOMAIN + '/login.html?permissions=IDENTIFY;MODIFY&service=' + window.location.host + '/login.html'
}


window.onload = function () {
    createPhotos(2019, 18)
    createPhotos(2018, 7)
}

document.getElementById('anmeldungAbsenden').onclick = function (event) {
    var mitbringen = document.getElementById('mitbringenInput')
    var personen = document.getElementById('personenInput').value

    var item = mitbringen.options[mitbringen.selectedIndex].innerText
    var itemID = mitbringen.options[mitbringen.selectedIndex].value

    if (!mitbringen || !name || !item) return // Leere Inputs
    if (name.length < 3 || name.length > 512) return // Komische Nameslänge
    if (personen < 1 || personen > 4) return // Falsche Anzahl

    sendHandler({
        path: 'private/poolparty/setzeAnmeldung',
        data: { name: userObj.name, userID: userObj._id, personen, item, itemID }
    })
}

document.getElementById('volunteerAbsenden').onclick = function (event) {
    var dauer = document.getElementById('volunteerDauer').value

    if (!dauer) return// Leere Inputs
    if (dauer.length < 3 || dauer.length > 512) return // Komische Dauerlänge

    sendHandler({
        path: 'private/poolparty/setzeVolunteer',
        data: { userID: userObj._id, dauer: dauer }
    })
}

var submitData

sendHandler = function (data) {
    submitData = data

    var str = ""
    for (key in submitData.data) {
        str += key + ': ' + submitData.data[key] + '\n'
    }
    document.getElementById('confirmationData').innerText = str
    showModal()
}

var modalState = document.getElementById('confirmModal')
var closeTimer

modalState.addEventListener('change', function (e) {
    if (!event.target.checked) {
        console.log('not checked')
        hideModal()
    }
})

function hideModal() {
    if (closeTimer) clearInterval(closeTimer)
    modalState.checked = false
    progress.style.visibility = 'hidden'
    success.style.display = 'none'
    error.style.display = 'none'
    progress.children[0].className = 'bar success w-0'
    progress.children[0].style.width = '0%'
}

function showModal() {
    modalState.checked = true
}

var progress = document.getElementById('progress')
var success = document.getElementById('success')
var error = document.getElementById('error')

// Send Data to Backend
function submitModal() {
    console.log('Daten in DB eintragen: ' + JSON.stringify(submitData.data))
    progress.style.visibility = 'visible'
    progress.children[0].style.width = '100%'
    fetch(BASE_ENDPOINT_URL + submitData.path, {
        method: 'post',
        headers: new Headers({
            'Authorization': token,
        }),
        body: new URLSearchParams(jsonToQS(submitData.data)),
    }).then(response =>
        response.json().then(json => {
            modalFeedback(json)
        })
    ).catch(console.error)
}

// Answer from Backend
function modalFeedback(data) {
    if (data.error) {
        error.style.display = 'block'
        error.innerText = data.error
        progress.children[0].className = "bar danger w-0"
    } else {
        success.style.display = 'block'
        success.innerText = data.success
    }
    closeTimer = setTimeout(function () {
        window.location.reload(true)
    }, 3000)
}

// Lazy Loading
var lazyImages = [].slice.call(document.querySelectorAll("img.lazy"))

if ("IntersectionObserver" in window) {
    let lazyImageObserver = new IntersectionObserver(function (entries, observer) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                let lazyImage = entry.target
                lazyImage.src = lazyImage.dataset.src
                lazyImage.srcset = lazyImage.dataset.srcset
                lazyImage.classList.remove("lazy")
                lazyImageObserver.unobserve(lazyImage)
            }
        })
    })

    lazyImages.forEach(function (lazyImage) {
        lazyImageObserver.observe(lazyImage)
    })
} else {
    console.log("LL not supported")
}

if (!submitData) hideModal()

