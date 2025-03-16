const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 8000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB file size limit
    }
}).array('files', 10); // Allow up to 10 files

// Serve static files
app.use(express.static(__dirname));
app.use('/uploads', express.static(uploadsDir));

// Enable CORS for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Handle file upload with error handling
app.post('/upload', (req, res) => {
    upload(req, res, function(err) {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading
            console.error('Multer error:', err);
            return res.status(400).json({
                error: true,
                message: `Upload error: ${err.message}`
            });
        } else if (err) {
            // An unknown error occurred
            console.error('Unknown error:', err);
            return res.status(500).json({
                error: true,
                message: 'An unexpected error occurred during upload'
            });
        }

        // Everything went fine
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                error: true,
                message: 'No files were uploaded'
            });
        }

        // Generate unique ID for the upload
        const uploadId = Date.now().toString(36) + Math.random().toString(36).substr(2);

        // Create response with file details
        const files = req.files.map(file => ({
            filename: file.filename,
            originalname: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
            path: `/uploads/${file.filename}`
        }));

        res.json({
            success: true,
            uploadId: uploadId,
            files: files,
            shareLink: `${req.protocol}://${req.get('host')}/uploads/${files[0].filename}`
        });
    });
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: true,
        message: 'An unexpected server error occurred'
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
