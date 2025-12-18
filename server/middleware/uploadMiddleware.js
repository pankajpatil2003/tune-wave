const multer = require('multer');
const cloudinary = require('../config/cloudinary');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 
        'audio/ogg', 'audio/aac', 'audio/flac', 'audio/m4a', 
        'audio/webm', 'audio/x-m4a', 'video/mp4'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images and audio files are allowed.'), false);
    }
};

// Export multer instance WITHOUT .fields()
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024
    }
});

const uploadToCloudinary = (file) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'auto',
                folder: 'user_uploads'
            },
            (error, result) => {
                if (error) return reject(error);
                resolve({
                    url: result.secure_url,
                    public_id: result.public_id,
                    format: result.format,
                    resource_type: result.resource_type
                });
            }
        );
        
        const { Readable } = require('stream');
        const bufferStream = new Readable();
        bufferStream.push(file.buffer);
        bufferStream.push(null);
        bufferStream.pipe(uploadStream);
    });
};

module.exports = { upload, uploadToCloudinary };
