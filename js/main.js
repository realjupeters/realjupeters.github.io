import { getCurrentUser, logout as sessionLogout, isAdmin } from './api/session.js';
import {
  listItems,
  getMe as getPoolpartyMe,
  createRegistration,
  updateRegistration,
  deleteRegistration,
  createVolunteer,
  deleteVolunteer,
} from './api/poolparty.js';
import { ApiError } from './api/client.js';

// ===== Active / inactive toggle =====
// Toggle this to swap between active and inactive mode
const ACTIVE = true;

if (ACTIVE) {
  document.documentElement.style.setProperty('--display-active', 'initial');
  document.documentElement.style.setProperty('--display-inactive', 'none');
} else {
  document.documentElement.style.setProperty('--display-active', 'none');
  document.documentElement.style.setProperty('--display-inactive', 'initial');
}

// ===== Auth UI glue =====
// Expose cloudAuth / handleLogout on window so existing inline onclicks in index.html still resolve.
window.cloudAuth = function cloudAuth() {
  window.location.href = '/login.html';
};
window.handleLogout = async function handleLogout() {
  await sessionLogout();
  window.location.reload();
};

// ===== Page bootstrap (auth + poolparty state) =====
if (ACTIVE) {
  (async () => {
    let user;
    try {
      user = await getCurrentUser();
    } catch (err) {
      console.error('Failed to fetch current user', err);
      return;
    }
    if (!user) return;

    document.getElementById('personName').innerText =
      'Eingeloggt als ' + user.name + ' (' + user.email + ').';

    document.body.classList.add('signedIn');
    if (isAdmin(user)) {
      document.body.classList.add('admin');
    }

    let me;
    try {
      me = await getPoolpartyMe();
    } catch (err) {
      console.error('Failed to fetch poolparty state', err);
      return;
    }

    const { item, registration, volunteer } = me;

    if (registration && item) {
      document.getElementById('volunteerForm').style.display = '';

      async function unregister() {
        try {
          await deleteRegistration();
          alert('Dein Registrierungsstatus wurde erfolgreich gelöscht.');
          location.reload();
        } catch (err) {
          alert(err.message);
        }
      }

      const anmeldenForm = document.getElementById('anmeldenForm');
      anmeldenForm.innerHTML =
        '<div class="alert alert-success"><b>Du hast dich am ' +
        new Date(registration.updatedAt).toLocaleDateString() +
        ' mit ' +
        registration.peopleCount +
        ' Person' +
        (registration.peopleCount > 1 ? 'en' : '') +
        ' angemeldet. Du bringst "' +
        item.name +
        '" mit.</b></div>' +
        '<div class="form-section"><h3>Änderungen:</h3>' +
        anmeldenForm.innerHTML +
        '</div>';

      const abmeldenButton = document.createElement('button');
      abmeldenButton.innerText = 'Anmeldung zurückziehen';
      abmeldenButton.className = 'btn-danger';
      abmeldenButton.onclick = () => {
        abmeldenButton.className = 'btn-danger';
        abmeldenButton.innerText = 'Sicher?';
        abmeldenButton.onclick = () => unregister();
      };

      const formActions = anmeldenForm.querySelector('.form-actions');
      if (formActions) {
        formActions.appendChild(abmeldenButton);
      } else {
        anmeldenForm.append(abmeldenButton);
      }

      if (volunteer) {
        async function volunteerAbmelden() {
          try {
            await deleteVolunteer();
            alert('Dein Registrierungsstatus wurde erfolgreich gelöscht.');
            location.reload();
          } catch (err) {
            alert(err.message);
          }
        }

        const volunteerForm = document.getElementById('volunteerForm');
        volunteerForm.innerHTML =
          '<h3>Volunteer Status</h3>' +
          '<div class="alert alert-success">Du hast dich am ' +
          new Date(volunteer.updatedAt).toLocaleDateString() +
          ' mit einer Dauer von "' +
          volunteer.duration +
          '" angemeldet.</div>' +
          '<div class="form-actions"></div>';

        const button = document.createElement('button');
        button.innerText = 'Volunteer Anmeldung zurückziehen';
        button.className = 'btn-warning';
        button.onclick = () => {
          button.className = 'btn-danger';
          button.innerText = 'Sicher?';
          button.onclick = () => volunteerAbmelden();
        };

        volunteerForm.querySelector('.form-actions').appendChild(button);
      } else {
        document.getElementById('submitVolunteer').onclick = () => {
          const duration = document.getElementById('durationInput').value;
          if (duration.length < 3 || duration.length > 512) {
            document.getElementById('durationInput').classList.add('invalid');
            return;
          }
          document.getElementById('durationInput').classList.remove('invalid');

          sendHandler({
            kind: 'volunteer',
            data: { duration },
          });
        };
      }
    }

    const itemInput = document.getElementById('itemInput');

    let items;
    try {
      items = await listItems();
    } catch (err) {
      console.error('Failed to fetch item list', err);
      items = [];
    }

    items.sort((a, b) => (a.name > b.name ? 1 : -1));

    for (const it of items) {
      const opt = document.createElement('option');
      opt.value = it.id;
      opt.innerHTML = it.name;
      itemInput.appendChild(opt);
    }

    if (item && registration) {
      document.getElementById('submitRegistration').innerText = 'Anmeldung anpassen';
      document.getElementById('submitRegistration').classList.add('btn-warning');
      document.getElementById('peopleInput').value = registration.peopleCount;
      document.getElementById('musicInput').value = registration.music ?? '';

      // Inject the currently-held item so the select shows it as selected
      itemInput.children[0].selected = true;
      itemInput.children[0].innerText = item.name;
      itemInput.children[0].value = item.id;
      itemInput.children[0].disabled = false;
      itemInput.value = item.id;

      document.querySelector('.modal-title').innerText = 'Anmeldung anpassen';
      document.querySelector('.modal button').innerText = 'Anpassen';
    }

    document.getElementById('submitRegistration').onclick = () => {
      const itemId = Number(itemInput.value);
      const peopleCount = Number(document.getElementById('peopleInput').value);
      const music = document.getElementById('musicInput').value;

      if (!itemId) {
        itemInput.classList.add('invalid');
        return;
      }
      itemInput.classList.remove('invalid');
      if (!peopleCount || peopleCount < 1 || peopleCount > 2) {
        document.getElementById('peopleInput').classList.add('invalid');
        return;
      }
      document.getElementById('peopleInput').classList.remove('invalid');

      sendHandler({
        kind: 'registration',
        mode: registration && item ? 'update' : 'create',
        data: { peopleCount, itemId, music },
      });
    };
  })();
}

// ===== Photo gallery =====
function createPhotos(year, count) {
  const photos = document.getElementById('photos' + year);
  let photosString = '';
  for (let i = 1; i <= count; i++) {
    photosString += `
        <div>
            <a data-fslightbox="gallery${year}" href="img/${year}/large/img${i}.jpg">
                <img src="img/${year}/thumb/img${i}.${imgType}" class="thumb" type="image/${imgType}" alt="Img${i}" onload='thumbnailHandler(this)'>
            </a>
        </div>
        `;
  }
  photos.innerHTML = photosString;
}

// Exposed on window so the inline onload="thumbnailHandler(this)" in the gallery HTML keeps working.
window.thumbnailHandler = function thumbnailHandler(elem) {
  if (elem.src.includes('/thumb/')) {
    const width = elem.width * window.devicePixelRatio || 1;
    let size = 'large';
    if (width > 600) size = 'large';
    else if (width > 400) size = 'medium';
    else size = 'small';
    elem.setAttribute('src', elem.src.replace('thumb', size));
  } else {
    elem.classList.remove('thumb');
  }
};

let imgType = 'jpg';
createPhotos(2025, 10);
createPhotos(2024, 13);
createPhotos(2023, 15);
createPhotos(2022, 12);
createPhotos(2021, 18);
createPhotos(2020, 25);
createPhotos(2019, 18);
createPhotos(2018, 7);

// ===== Submit modal =====
let submitData;

function sendHandler(submission) {
  submitData = submission;

  let str = '';
  if (submission.kind === 'registration') {
    const d = submission.data;
    const itemOpt = document.querySelector(`#itemInput option[value="${d.itemId}"]`);
    if (itemOpt) str += `Mitbringen: ${itemOpt.innerText}\n`;
    str += `Personen: ${d.peopleCount}\n`;
    if (d.music) str += `Musik: ${d.music}\n`;
    document.querySelector('.modal-title').innerText =
      submission.mode === 'update' ? 'Anmeldung anpassen' : 'Anmeldung bestätigen';
    document.querySelector('.modal button').innerText =
      submission.mode === 'update' ? 'Anpassen' : 'Bestätigen';
  } else if (submission.kind === 'volunteer') {
    str += `Dauer: ${submission.data.duration}\n`;
    document.querySelector('.modal-title').innerText = 'Volunteer Anmeldung';
    document.querySelector('.modal button').innerText = 'Bestätigen';
  }

  document.getElementById('confirmationData').innerText = str;
  showModal();
}

const modalState = document.getElementById('confirmModal');
let closeTimer;

modalState.addEventListener('change', function (e) {
  if (!e.target.checked) hideModal();
});

function hideModal() {
  if (closeTimer) clearInterval(closeTimer);
  modalState.checked = false;
  progress.style.visibility = 'hidden';
  success.style.display = 'none';
  error.style.display = 'none';
  progress.children[0].className = 'bar success w-0';
  progress.children[0].style.width = '0%';
}

function showModal() {
  modalState.checked = true;
}

const progress = document.getElementById('progress');
const success = document.getElementById('success');
const error = document.getElementById('error');

// ===== Submit to backend =====
// Exposed on window so the existing inline onclick="submitModal()" in index.html still resolves.
window.submitModal = async function submitModal() {
  if (!submitData) return;
  progress.style.visibility = 'visible';
  progress.children[0].style.width = '100%';

  try {
    if (submitData.kind === 'registration') {
      if (submitData.mode === 'update') await updateRegistration(submitData.data);
      else await createRegistration(submitData.data);
    } else if (submitData.kind === 'volunteer') {
      await createVolunteer(submitData.data.duration);
    }
    modalFeedback({ success: 'Erfolgreich gespeichert' });
  } catch (err) {
    modalFeedback({ error: err instanceof ApiError ? err.message : 'Fehler beim Senden' });
  }
};

function modalFeedback(data) {
  if (data.error) {
    error.style.display = 'block';
    error.innerText = data.error;
    progress.children[0].className = 'bar danger w-0';
  } else {
    success.style.display = 'block';
    success.innerText = data.success;
  }
  closeTimer = setTimeout(() => {
    window.location.reload();
  }, 3000);
}

if (!submitData) hideModal();

console.info(`Wilkommen in der Entewicklerkonsole
    ,~~.
    (  6 )-_,
(\\___ )=='-'
\\ .   ) )
 \\ \`- ' /
~'\`~'\`~'\`~'\`~

Falls dir WebDev auch Spaß macht schreib mir doch auf Discord: logge.top`);

// ===== Mobile nav =====
document.addEventListener('DOMContentLoaded', function () {
  const mobileNavCheckbox = document.getElementById('collapsibleMenu');
  const navLinks = document.querySelectorAll('.collapsible-body a');

  navLinks.forEach((link) => {
    link.addEventListener('click', function () {
      if (window.innerWidth <= 768) mobileNavCheckbox.checked = false;
    });
  });

  document.addEventListener('click', function (e) {
    if (window.innerWidth <= 768 && mobileNavCheckbox.checked) {
      const navElement = document.querySelector('.collapsible');
      const navBody = document.querySelector('.collapsible-body');
      if (!navElement.contains(e.target) && !navBody.contains(e.target)) {
        mobileNavCheckbox.checked = false;
      }
    }
  });

  mobileNavCheckbox.addEventListener('change', function () {
    document.body.style.overflow = this.checked ? 'hidden' : '';
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > 768 && mobileNavCheckbox.checked) {
      mobileNavCheckbox.checked = false;
      document.body.style.overflow = '';
    }
  });
});
