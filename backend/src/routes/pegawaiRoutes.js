const express = require('express');
const router = express.Router();
const pegawaiController = require('../controllers/pegawaiController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// Protected routes for all logged in users
router.use(authMiddleware);

router.get('/', pegawaiController.getAllPegawai);
router.get('/:id', pegawaiController.getPegawaiById);

// Restricted to ADMIN & OPERATOR
router.post('/', roleMiddleware(['ADMIN', 'OPERATOR']), pegawaiController.createPegawai);
router.put('/:id', roleMiddleware(['ADMIN', 'OPERATOR']), pegawaiController.updatePegawai);
router.delete('/:id', roleMiddleware(['ADMIN', 'OPERATOR']), pegawaiController.deletePegawai);

module.exports = router;
