BASE_ENDPOINT_URL = "https://" + window.location.hostname

var emoji = [...'☻😊🙃🤪🤓🤯😴💩👻👽🤖👾👐🖖✌️🤟🤘🤙👋🐭🦕🦖🐉']
var randEmoji = emoji[Math.floor(emoji.length * Math.random())]
if (randEmoji) document.querySelector('.spin').innerText = randEmoji

var progress = document.getElementById('progress')

function generalError(err) {
    document.querySelector('.spin').innerHTML = ''
    console.error(e)
    setTimeout(function () { window.location = './' }, 2000)
    return document.querySelector('h1').innerHTML = ('<span class="badge danger">Fehler: ' + err + '.</span>')
}

var hash = window.location.hash
if (!hash || !hash.startsWith('#ey')) {
    generalError('Kein Code gefunden')
}
var code = hash.replace('#', '')

function jsonToQS(json) {
    var qs = []
    for (element in json) {
        qs.push(element + "=" + json[element])
    }
    return "?" + qs.join("&")
}

progress.style.width = '60%'
var xhttp = new XMLHttpRequest()
xhttp.open("GET", BASE_ENDPOINT_URL + '/api/private/test', true)
xhttp.setRequestHeader('Authorization', code);
xhttp.setRequestHeader('Access-Control-Allow-Origin', '*')
xhttp.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
        try {
            var resp = JSON.parse(xhttp.responseText)
            if (resp.error) return generalError(resp.error)

            // Valid Token
            progress.style.width = "100%"
            localStorage.setItem('token', code)
            document.querySelector('h1').innerHTML = ('<span class="badge success">Erfolgreich angemeldet.</span>')
            setTimeout(function () { window.location = './' }, 1000)

        }
        catch (e) {
            generalError(e)
        }
    }
}
xhttp.send()