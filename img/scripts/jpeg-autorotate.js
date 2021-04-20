const Promise = require('Bluebird');
const jo = require('jpeg-autorotate');

const jpegAutorotate = buffer => {
    return new Promise((resolve, reject) => {
        jo.rotate(buffer, {
            quality: 100
        }, (err, newBuffer) => {
            if (err) {
                return reject(err);
            }

            resolve(newBuffer);
        });
    });
};

module.exports = jpegAutorotate;