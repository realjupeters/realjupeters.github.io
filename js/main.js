function getRandomSize(min, max) {
    return Math.round(Math.random() * (max - min) + min);
}

for (var i = 0; i < 1; i++) {
    var width = getRandomSize(200, 400);
    var height = getRandomSize(200, 400);
    document.getElementById('photos').innerHTML += '<img class="" src="//www.placekitten.com/' + width + '/' + height + '" alt="pretty kitty">'
    // ToDo Add Data SRC with hq image & lazy class on actual images
}

var submitData

document.querySelectorAll('td button').forEach(function (button) {
    button.onclick = function (event) {
        submitData = {}
        var tr = event.target.parentElement.parentElement.children
        for (i = 0; i < tr.length; i++) {
            var element = tr[i].children[0]
            if (!element) continue
            if (element.nodeName === "INPUT") {

                // Validierung
                if (element.pattern && !element.value.match(element.pattern))
                    return element.setCustomValidity('Zu lang / kurz');
                if (element.min && (element.value <= element.min || element.max <= element.value))
                    return element.setCustomValidity('Zu viele / wenige');
                element.setCustomValidity('');

                submitData[element.name] = element.value
            }
        }

        var str = ""
        for (key in submitData) {
            str += key + ': ' + submitData[key] + '\n'
        }
        document.getElementById('confirmationData').innerText = str
        showModal()
    }
})

var modal = document.getElementById('confirmModal')

function hideModal() {
    modal.checked = false
}

function showModal() {
    modal.checked = true
}

var progress = document.getElementById('progress')
var success = document.getElementById('success')
var error = document.getElementById('error')

// Send Data to Backend
function submitModal() {
    alert('Daten in DB eintragen: ' + JSON.stringify(submitData))
    progress.style.visibility = 'visible'
    progress.children[0].style.width = '100%'
    setTimeout(function () {
        response(null)
    }, 3000)
}

// Answer from Backend
function response(responseError) {
    if (responseError) {
        error.style.display = 'block'
        error.innerText = responseError
    } else {
        success.style.display = 'block'
    }
    setTimeout(function () {
        progress.style.visibility = 'hidden'
        success.style.display = 'none'
        error.style.display = 'none'
        hideModal()
        progress.children[0].style.width = '0%'
    }, 1000)

}

// Lazy Loading
var lazyImages = [].slice.call(document.querySelectorAll("img.lazy"));

if ("IntersectionObserver" in window) {
    let lazyImageObserver = new IntersectionObserver(function (entries, observer) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                let lazyImage = entry.target;
                lazyImage.src = lazyImage.dataset.src;
                lazyImage.srcset = lazyImage.dataset.srcset;
                lazyImage.classList.remove("lazy");
                lazyImageObserver.unobserve(lazyImage);
            }
        });
    });

    lazyImages.forEach(function (lazyImage) {
        lazyImageObserver.observe(lazyImage);
    });
} else {
    console.log("LL not supported")
}

if (!submitData) hideModal()

