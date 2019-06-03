const functions = require('firebase-functions');
const admin = require('firebase-admin');

const cors = require('cors')({ origin: true });

admin.initializeApp(functions.config().firebase);

var db = admin.firestore();

exports.halloWelt = functions.https.onRequest((request, response) => {
    response.send("Hallo von Firebase!");
});

// Lade alle Items die noch zu besorgen sind
exports.ladeItems = functions.https.onRequest((request, response) => {
    return cors(request, response, async () => {  
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
    })
});

// Eintragen von neuen Volunteers
exports.setzeVolunteer = functions.https.onRequest(async (request, response) => {
        return cors(request, response, async () => {  
        const name = request.query.name
        const dauer = request.query.dauer
        if (!name) return response.json({ error: "Kein Name angegeben" })
        if (!dauer) return response.json({ error: "Keine Dauer angegeben" })

        // Check if User is regsitered
        const anmeldungsRef = db.collection("poolparty_anmeldungen").doc(name)
        const anmeldungsDoc = await anmeldungsRef.get()
        if (!anmeldungsDoc.exists) return response.json({ error: "Name noch nicht angemeldet" })

        // Check if Data is already there
        const volunteerRef = db.collection("poolparty_volunteers").doc(name)
        const volunteerDoc = await volunteerRef.get()
        if (volunteerDoc.exists && volunteerDoc.data().dauer == dauer) return response.json({ error: "Dauer bereits für dich eingetragen" })

        volunteerRef.set({
            name: name,
            dauer: dauer,
            eingetragen: new Date().toLocaleDateString()
        })

        response.json({ success: "Erfolgreich eingetragen" })
    })
})

// Eintragen von neuen Anmeldungen
exports.setzeAnmeldung = functions.https.onRequest(async (request, response) => {
    return cors(request, response, async () => {  
        const name = request.query.name
        const item = request.query.item
        const personen = request.query.personen

        if (!name) return response.json({ error: "Kein Name angegeben" })
        if (!item) return response.json({ error: "Kein Item angegeben" })
        if (!personen) return response.json({ error: "Keine Personenanzahl angegeben" })

        if (parseInt(personen) <= 0 || parseInt(personen) > 4) return response.json({ error: "Ungülige Personenanzahl angegeben. Nur 1-4 mölgich." })

        // Check if Data is already there
        const userRef = db.collection("poolparty_anmeldungen").doc(name)
        const userDoc = await userRef.get()
        if (userDoc.exists) return response.json({ error: "Name bereits eingetragen" })

        // Check if the Item is in the DB and if it's taken
        const itemRef = db.collection("poolparty_items").doc(item)
        const itemDoc = await itemRef.get()
        if (!itemDoc.exists) return response.json({ error: "Item existiert nicht in der Datenbank" })
        if (itemDoc.data().person) return response.json({ error: "Item bereits vergeben" })

        itemRef.set({
            person: name
        })

        userRef.set({
            name: name,
            item: item,
            eingetragen: new Date().toLocaleDateString(),
            personen: personen
        })

        response.json({ success: "Erfolgreich eingetragen" })
    })
})
