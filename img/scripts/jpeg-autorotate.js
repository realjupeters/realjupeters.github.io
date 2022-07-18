import Promise from 'Bluebird'
import jo from 'jpeg-autorotate';

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

export default jpegAutorotate;