const AUTH_DOMAIN = 'https://jpCore.logge.top'
// const AUTH_DOMAIN = 'http://localhost:3000'
const BASE_ENDPOINT_URL = AUTH_DOMAIN + '/api/'

// Toggle this to swap between active and inactive mode
const ACTIVE = true

if (ACTIVE) {
  document.documentElement.style.setProperty('--display-active', 'initial')
  document.documentElement.style.setProperty('--display-inactive', 'none')
} else {
  document.documentElement.style.setProperty('--display-active', 'none')
  document.documentElement.style.setProperty('--display-inactive', 'initial')
}

function jsonToQS(json) {
  var qs = []
  for (element in json) {
    qs.push(element + '=' + json[element])
  }
  return '?' + qs.join('&')
}

// Populate Select with items
function fillSelect(elements) {
  var input = document.getElementById('mitbringenInput')
  if (!input) return
  // Sort by name
  elements.sort((a, b) => (a.name > b.name ? 1 : -1))
  console.log(elements)
  for (i = 0; i < elements.length; i++) {
    if (!elements[i]) continue
    var option = document.createElement('option')
    option.setAttribute('value', elements[i]._id)
    option.innerText = elements[i].name
    input.append(option)
  }
}

var token = localStorage.getItem('token')
var email, name
if (token && ACTIVE) {
  try {
    ;(async () => {
      const { id, email, name, roles } = JSON.parse(atob(token.split('.')[1]))

      if (!id || !email || !name) {
        localStorage.removeItem('token')
        alert('Altes Token Format. Bitte neu anmelden!')
        window.reload(true)
      }

      document.getElementById('personName').innerText =
        'Eingeloggt als ' + name + ' (' + email + ').'

      document.body.classList.add('signedIn')
      if (roles == 'admin') {
        document.body.classList.add('admin')
      }

      const response = await fetch(BASE_ENDPOINT_URL + 'private/poolparty/me', {
        method: 'get',
        headers: new Headers({
          Authorization: token,
        }),
      })
      const data = await response.json()

      const { item, registration, volunteer } = data

      if (registration && item) {
        document.getElementById('volunteerForm').style.display = ''

        async function unregister() {
          const unregisterResp = await fetch(
            BASE_ENDPOINT_URL + 'private/poolparty/registration',
            {
              method: 'DELETE',
              headers: new Headers({
                Authorization: token,
              }),
            }
          )
          const success = await unregisterResp.json()
          if (success) {
            alert('Dein Registrierungsstatus wurde erfolgreich gelöscht.')
            location.reload(true)
          }
        }

        var anmeldenForm = document.getElementById('anmeldenForm')
        anmeldenForm.innerHTML =
          '<div class="alert alert-success"><b>Du hast dich am ' +
          new Date(registration.lastActivity).toLocaleDateString() +
          ' mit ' +
          registration.people +
          ' Person' +
          (registration.people > 0 ? 'en' : '') +
          ' angemeldet. Du bringst "' +
          item.name +
          '" mit.</b></div> <br /> <div class="sm-12"> <h2>Änderungen:</h2></div>' +
          anmeldenForm.innerHTML
        var abmeldenButon = document.createElement('button')
        abmeldenButon.innerText = 'Anmeldung zurückziehen'
        abmeldenButon.className = 'btn-danger row'
        abmeldenButon.onclick = () => {
          abmeldenButon.className = 'btn-danger row'
          abmeldenButon.innerText = 'Sicher?'
          abmeldenButon.onclick = () => unregister()
        }
        anmeldenForm.append(abmeldenButon)

        if (volunteer) {
          async function volunteerAbmelden() {
            const volunteerResp = await fetch(
              BASE_ENDPOINT_URL + 'private/poolparty/volunteer',
              {
                method: 'DELETE',
                headers: new Headers({
                  Authorization: token,
                }),
              }
            )
            const success = await volunteerResp.json()
            if (success) {
              alert('Dein Registrierungsstatus wurde erfolgreich gelöscht.')
              location.reload(true)
            }
          }

          var volunteerForm = document.getElementById('volunteerForm')
          volunteerForm.innerHTML =
            '<div class="alert alert-success">Du hast dich am ' +
            new Date(volunteer.lastActivity).toLocaleDateString() +
            ' mit einer Dauer von "' +
            volunteer.duration +
            '" angemeldet.</ br > </div > '
          var button = document.createElement('button')
          button.innerText = 'Anmeldung zurückziehen'
          button.className = 'btn-warning row'
          button.onclick = () => {
            button.className = 'btn-danger row'
            button.innerText = 'Sicher?'
            button.onclick = () => volunteerAbmelden()
          }
          volunteerForm.append(button)
        } else {
          document.getElementById('submitVolunteer').onclick = () => {
            var duration = document.getElementById('durationInput').value
            if (duration.length < 3 || duration.length > 512)
              return document
                .getElementById('durationInput')
                .classList.add('invalid')
            else
              document
                .getElementById('durationInput')
                .classList.remove('invalid')

            sendHandler({
              path: 'private/poolparty/volunteer',
              method: 'POST',
              data: { duration },
            })
          }
        }
      }

      const itemInput = document.getElementById('itemInput')

      const itemResponse = await fetch(
        BASE_ENDPOINT_URL + 'private/poolparty/item',
        {
          method: 'get',
          headers: new Headers({
            Authorization: token,
          }),
        }
      )

      const items = await itemResponse.json()

      // Sort by name
      items.sort((a, b) => (a.name > b.name ? 1 : -1))

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const opt = document.createElement('option')
        opt.value = item.id
        opt.innerHTML = item.name // whatever property it has
        itemInput.appendChild(opt)
      }

      if (item && registration) {
        document.getElementById('submitRegistration').innerText =
          'Anmeldung anpassen'
        document
          .getElementById('submitRegistration')
          .classList.add('btn-warning')
        document.getElementById('peopleInput').value = registration.people
        document.getElementById('musicInput').value = registration.music

        // Inject item id
        const itemInput = document.getElementById('itemInput')
        // Change first option to selected
        itemInput.children[0].selected = true
        itemInput.children[0].innerText = item.name
        itemInput.children[0].value = item.id
        itemInput.children[0].disabled = false

        console.log(item)
        document.getElementById('itemInput').value = item.id

        document.querySelector('.modal-title').innerText = 'Anmeldung anpassen'
        document.querySelector('.modal button').innerText = 'Anpassen'
      }

      // Create or update registration
      document.getElementById('submitRegistration').onclick = () => {
        const itemID = itemInput.value
        const people = Number(document.getElementById('peopleInput').value)
        const music = document.getElementById('musicInput').value

        console.log(itemID, people, music)

        if (!Number(itemID)) return itemInput.classList.add('invalid')
        itemInput.classList.remove('invalid')
        if (!people)
          return document.getElementById('peopleInput').classList.add('invalid')
        if (people < 1 || people > 2)
          return document.getElementById('peopleInput').classList.add('invalid')
        document.getElementById('peopleInput').classList.remove('invalid')

        sendHandler({
          path: 'private/poolparty/registration',
          method: registration && item ? 'PATCH' : 'POST', // If item is already set, update, else create
          data: { people, itemID, music },
        })
      }
    })()
    // End of async block
  } catch (e) {
    alert('Etwas ist schief gelaufen...')
    console.error(e)
  }
}

// var isDark = localStorage.getItem('dark')
// function toggleDark() {
//     document.body.classList.toggle('darkmode')
//     isDark = !isDark
//     localStorage.setItem('dark', isDark)
//     console.log(isDark)
// }

// if (isDark == 'true') {
//     toggleDark()
// }

// isDark = !isDark

function createPhotos(year, count) {
  var photos = document.getElementById('photos' + year)
  let photosString = ''
  for (i = 1; i <= count; i++) {
    photosString += `
        <div>
            <a data-fslightbox="gallery${year}" href="img/${year}/full/img${i}.jpg">
                <img src="img/${year}/thumb/img${i}.${imgType}" class="thumb" type="image/${imgType}" alt="Img${i}" onload='thumbnailHandler(this)'>
            </a>
        </div>
        `
  }
  photos.innerHTML = photosString
}

function thumbnailHandler(elem) {
  if (elem.src.includes('/thumb/')) {
    const width = elem.width * window.devicePixelRatio || 1
    let size = 'large'
    if (width > 600) {
      size = 'large'
    } else if (width > 400) {
      size = 'medium'
    } else {
      size = 'small'
    }
    elem.setAttribute('src', elem.src.replace('thumb', size))
  } else {
    elem.classList.remove('thumb')
  }
}

function cloudAuth() {
  window.location = AUTH_DOMAIN + '/login.html'
}

let imgType = 'jpg'
createPhotos(2023, 15)
createPhotos(2022, 12)
createPhotos(2021, 18)
createPhotos(2020, 25)
createPhotos(2019, 18)
createPhotos(2018, 7)

var submitData

function sendHandler(data) {
  submitData = data

  var str = ''
  for (key in submitData.data) {
    switch (key) {
      case 'people':
        str += `Personen: ${submitData.data[key]}\n`
        break
      case 'itemID':
        if (
          document.querySelector(
            '#itemInput option[value="' + submitData.data[key] + '"]'
          )
        )
          break
        const itemName = document.querySelector(
          '#itemInput option[value="' + submitData.data[key] + '"]'
        ).innerText
        str += `Mitbringen: ${itemName}\n`
        break
      case 'music':
        str += `Musik: ${submitData.data[key]}\n`
        break
      case 'duration':
        str += `Dauer: ${submitData.data[key]}\n`
    }
    // str += key + ': ' + submitData.data[key] + '\n'
  }
  document.getElementById('confirmationData').innerText = str
  showModal(data)
}

var modalState = document.getElementById('confirmModal')
var closeTimer

modalState.addEventListener('change', function (e) {
  if (!event.target.checked) {
    // window.location.reload(true)
    hideModal()
  }
})

function hideModal() {
  //window.location.reload(true)
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
    method: submitData.method,
    headers: new Headers({
      Authorization: token,
    }),
    body: new URLSearchParams(jsonToQS(submitData.data)),
  })
    .then((response) =>
      response.json().then((json) => {
        modalFeedback(json)
      })
    )
    .catch(console.error)
}

// Answer from Backend
function modalFeedback(data) {
  if (data.error) {
    error.style.display = 'block'
    error.innerText = data.error
    progress.children[0].className = 'bar danger w-0'
  } else {
    success.style.display = 'block'
    success.innerText = data.success
  }
  closeTimer = setTimeout(function () {
    window.location.reload(true)
  }, 3000)
}

if (!submitData) hideModal()

console.info(`Wilkommen in der Entewicklerkonsole
    ,~~.
    (  6 )-_,
(\___ )=='-'
\ .   ) )
 \ \`- ' /    
~'\`~'\`~'\`~'\`~
    
Falls dir WebDev auch Spaß macht schreib mir doch auf Discord: Logge#1337`)
