const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for logo upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, 'logo-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

router.get('/', settingsController.getSettings);
router.put('/', authMiddleware, roleMiddleware(['ADMIN']), upload.single('logo'), settingsController.updateSettings);

module.exports = router;
