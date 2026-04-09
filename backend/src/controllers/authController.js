const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const login = async (req, res) => {
    try {
        const { nip, password } = req.body;

        const result = await pool.query('SELECT * FROM users WHERE nip = $1', [nip]);
        const user = result.rows[0];

        if (!user) {
            return res.status(400).json({ error: 'Invalid NIP or password.' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid NIP or password.' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, name: user.name, nip: user.nip },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                nip: user.nip,
                name: user.name,
                role: user.role,
                avatar_url: user.avatar_url
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const registerInitialAdmin = async (req, res) => {
    try {
        const userCountResult = await pool.query('SELECT COUNT(*) FROM users');
        const userCount = parseInt(userCountResult.rows[0].count, 10);

        if (userCount > 0) {
            return res.status(400).json({ error: 'Admin user already exists.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        await pool.query(
            'INSERT INTO users (nip, password, role, name) VALUES ($1, $2, $3, $4)',
            ['198507152010012345', hashedPassword, 'ADMIN', 'Administrator']
        );

        res.status(201).json({ message: 'Initial admin created successfully. NIP: 198507152010012345, pass: admin123' });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

const getProfile = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, nip, name, role, avatar_url FROM users WHERE id = $1', [req.user.id]);
        const user = result.rows[0];
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { name, nip } = req.body;
        const userId = req.user.id;
        let avatar_url = req.body.avatar_url;

        if (req.file) {
            avatar_url = `/uploads/profiles/${req.file.filename}`;
        }

        // Check unique NIP if changed
        if (nip) {
            const existing = await pool.query('SELECT id FROM users WHERE nip = $1 AND id != $2', [nip, userId]);
            if (existing.rowCount > 0) {
                return res.status(400).json({ error: 'NIP already used by another account' });
            }
        }

        const updateResult = await pool.query(
            `UPDATE users SET 
                name = COALESCE($1, name), 
                nip = COALESCE($2, nip),
                avatar_url = COALESCE($3, avatar_url)
             WHERE id = $4 RETURNING id, nip, name, role, avatar_url`,
            [name, nip, avatar_url, userId]
        );

        res.json({
            message: 'Profile updated successfully',
            user: updateResult.rows[0]
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.user.id;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ error: 'Password lama dan baru harus diisi' });
        }

        const trimmedOldPassword = oldPassword.trim();
        const trimmedNewPassword = newPassword.trim();

        const result = await pool.query('SELECT password FROM users WHERE id = $1', [userId]);
        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const validPassword = await bcrypt.compare(trimmedOldPassword, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Incorrect old password' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedNewPassword = await bcrypt.hash(trimmedNewPassword, salt);

        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedNewPassword, userId]);

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    login,
    registerInitialAdmin,
    getProfile,
    updateProfile,
    changePassword
};
