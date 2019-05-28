const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);

var db = admin.firestore();

exports.halloWelt = functions.https.onRequest((request, response) => {
    response.send("Hallo von Firebase!");
});

// Lade alle Items die noch zu besorgen sind.
exports.ladeItems = functions.https.onRequest((request, response) => {
    var allVolunteers = db.collection('poolparty_items')
    allVolunteers.get().then(snapshot => {
        volunteers = snapshot.docs.map(doc => {
            obj = doc.data()
            // Nur wenn noch nicht von Leuten abgedeckt
            if (!obj.person) return { name: obj.name, sonstiges: obj.sonstiges }
        });
        return response.json(volunteers)
    }).catch(err => {
        response.json({ error: "Fehler beim Laden der Items: " + err })
    });
});

exports.setzeVolunteer = functions.https.onRequest((request, response) => {

})

exports.setzeAnmeldung = functions.https.onRequest((request, response) => {

})
