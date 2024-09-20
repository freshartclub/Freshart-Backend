const sharp = require('sharp');
const {svgFile} = require('./config')
module.exports.IMAGE_WIDTH = {
	SM: 200,
	MD: 300,
	L: 400,
	XL: 500,
	XXL: 600
};


module.exports.sharpMulter = async (BufferData, location, size) => {
    try {
		let fileBuffer;
		if (location === 'art') {
			const svgBuffer = Buffer.from(await svgFile(size));
			fileBuffer = await sharp(BufferData).composite([{
				input: svgBuffer,
				top: 0,
				left: 0,
				tile: true
			}]).resize({ fit: 'fill' }).toBuffer()
		} else {
			fileBuffer = await sharp(BufferData).resize({ fit: 'fill' }).toBuffer();
		}
		return fileBuffer;
	} catch (error) {
        throw error;
    }
};

module.exports.sharpResize = async (buffer, reSizeTo, location, size) => {
	try {
		let reSizedBuffer;
		if (location === 'art') {
			
			const svgBuffer = Buffer.from(await svgFile(size));
			reSizedBuffer = await sharp(Uint8Array.from(buffer))
				.composite([{
					input: svgBuffer,
					top: 0,
					left: 0,
					tile: true
				}]).toBuffer()

			reSizedBuffer = await sharp(reSizedBuffer).resize(reSizeTo).toBuffer()

		} else {
			reSizedBuffer = await sharp(Uint8Array.from(buffer))
				.resize(reSizeTo)
				.toBuffer();
		}
		return reSizedBuffer;
	} catch (error) {
		throw error;
	}
};