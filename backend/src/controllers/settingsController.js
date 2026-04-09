const pool = require('../config/database');

const getSettings = async (req, res) => {
    try {
        const result = await pool.query('SELECT key, value FROM settings');
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });
        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const updateSettings = async (req, res) => {
    const { site_name, org_name_1, org_name_2 } = req.body;
    let logo_url = req.body.logo_url;

    if (req.file) {
        logo_url = `/uploads/${req.file.filename}`;
    }

    try {
        const updates = [];

        // Use !== undefined to allow empty strings
        if (site_name !== undefined) updates.push(pool.query('UPDATE settings SET value = $1 WHERE key = \'site_name\'', [site_name]));
        if (org_name_1 !== undefined) updates.push(pool.query('UPDATE settings SET value = $1 WHERE key = \'org_name_1\'', [org_name_1]));
        if (org_name_2 !== undefined) updates.push(pool.query('UPDATE settings SET value = $1 WHERE key = \'org_name_2\'', [org_name_2]));
        if (logo_url !== undefined) updates.push(pool.query('UPDATE settings SET value = $1 WHERE key = \'logo_url\'', [logo_url]));

        await Promise.all(updates);
        console.log('Settings updated successfully in DB');
        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    getSettings,
    updateSettings
};
