
import isJpg from 'is-jpg';
import jpegAutorotate from './jpeg-autorotate.js';

export default ({
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