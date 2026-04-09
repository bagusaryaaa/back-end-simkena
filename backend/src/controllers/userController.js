const pool = require('../config/database');
const bcrypt = require('bcrypt');

const getAllUsers = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, nip, name, role, avatar_url FROM users ORDER BY name ASC'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createUser = async (req, res) => {
    try {
        const { name, nip, role } = req.body;

        if (!name || !nip || !role) {
            return res.status(400).json({ error: 'Nama, NIP, dan Role harus diisi.' });
        }

        // Check unique NIP
        const existing = await pool.query('SELECT id FROM users WHERE nip = $1', [nip]);
        if (existing.rowCount > 0) {
            return res.status(400).json({ error: 'NIP sudah terdaftar.' });
        }

        // Hash NIP as default password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(nip, salt);

        const result = await pool.query(
            'INSERT INTO users (name, nip, role, password) VALUES ($1, $2, $3, $4) RETURNING id, name, nip, role',
            [name, nip, role, hashedPassword]
        );

        res.status(201).json({
            message: 'User berhasil dibuat. Password default adalah NIP.',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user.id;

        if (id === currentUserId) {
            return res.status(400).json({ error: 'Anda tidak dapat menghapus akun Anda sendiri.' });
        }

        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'User tidak ditemukan.' });
        }

        res.json({ message: 'User berhasil dihapus.' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, role } = req.body;

        if (!name || !role) {
            return res.status(400).json({ error: 'Nama dan Role harus diisi.' });
        }

        const result = await pool.query(
            'UPDATE users SET name = $1, role = $2 WHERE id = $3 RETURNING id, name, nip, role',
            [name, role, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'User tidak ditemukan.' });
        }

        res.json({
            message: 'User berhasil diperbarui.',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getAllUsers,
    createUser,
    deleteUser,
    updateUser
};
