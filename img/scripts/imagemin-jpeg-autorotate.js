
const isJpg = require('is-jpg');
const jpegAutorotate = require('./jpeg-autorotate');

module.exports = ({
    disable = false,
    quality = 100
} = {}) => {
    return buffer => {
        if (disable || !isJpg(buffer)) {
            return buffer;
        }

        return jpegAutorotate(buffer, {
            quality
        })
            // Ignore rotate error
            .catch(() => {
                return buffer;
            });
    };
};