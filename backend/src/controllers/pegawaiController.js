const pool = require('../config/database');

const getAllPegawai = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM pegawai ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching pegawai:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getPegawaiById = async (req, res) => {
    try {
        const { id } = req.params;

        const pegawaiResult = await pool.query('SELECT * FROM pegawai WHERE id = $1', [id]);
        const pegawai = pegawaiResult.rows[0];

        if (!pegawai) {
            return res.status(404).json({ error: 'Pegawai not found' });
        }

        // Fetch related records concurrently
        const [riwayatRes, skpRes, diklatRes, hukumanRes, monitoringRes] = await Promise.all([
            pool.query('SELECT * FROM riwayat_jabatan WHERE pegawai_id = $1 ORDER BY tmt_jabatan DESC', [id]),
            pool.query('SELECT * FROM skp WHERE pegawai_id = $1 ORDER BY tahun DESC', [id]),
            pool.query('SELECT * FROM diklat WHERE pegawai_id = $1 ORDER BY tahun DESC', [id]),
            pool.query('SELECT * FROM hukuman_disiplin WHERE pegawai_id = $1 ORDER BY tanggal_mulai DESC', [id]),
            pool.query('SELECT * FROM vw_monitoring_kenaikan_jabatan WHERE pegawai_id = $1', [id])
        ]);

        pegawai.riwayat_jabatan = riwayatRes.rows;
        pegawai.skp = skpRes.rows;
        pegawai.diklat = diklatRes.rows;
        pegawai.hukuman_disiplin = hukumanRes.rows;
        pegawai.monitoring_kenaikan = monitoringRes.rows[0] || null;

        res.json(pegawai);
    } catch (error) {
        console.error('Error fetching pegawai details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createPegawai = async (req, res) => {
    const client = await pool.connect();
    try {
        const data = req.body;

        // Check if nip exists
        const existing = await client.query('SELECT 1 FROM pegawai WHERE nip = $1', [data.nip]);
        if (existing.rowCount > 0) {
            return res.status(400).json({ error: 'NIP already exists' });
        }

        await client.query('BEGIN');

        const pegawaiResult = await client.query(
            `INSERT INTO pegawai (nip, nama, tanggal_lahir, unit_kerja, jabatan_sekarang, pangkat_golongan, tmt_pns, jenis_pegawai, status_aktif)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [data.nip, data.nama, data.tanggal_lahir, data.unit_kerja, data.jabatan_sekarang, data.pangkat_golongan, data.tmt_pns, data.jenis_pegawai || 'PNS', data.status_aktif ?? true]
        );

        const pegawai = pegawaiResult.rows[0];

        await client.query('COMMIT');
        res.status(201).json(pegawai);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating pegawai:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
};

const deletePegawai = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM pegawai WHERE id = $1', [id]);
        res.json({ message: 'Pegawai deleted successfully' });
    } catch (error) {
        console.error('Error deleting pegawai:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updatePegawai = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const data = req.body;

        await client.query('BEGIN');

        const result = await client.query(
            `UPDATE pegawai 
       SET nip = $1, nama = $2, tanggal_lahir = $3, unit_kerja = $4, 
           jabatan_sekarang = $5, pangkat_golongan = $6, tmt_pns = $7, jenis_pegawai = $8, status_aktif = $9
       WHERE id = $10 RETURNING *`,
            [data.nip, data.nama, data.tanggal_lahir, data.unit_kerja, data.jabatan_sekarang, data.pangkat_golongan, data.tmt_pns, data.jenis_pegawai || 'PNS', data.status_aktif ?? true, id]
        );

        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Pegawai not found' });
        }

        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating pegawai:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
};

module.exports = {
    getAllPegawai,
    getPegawaiById,
    createPegawai,
    updatePegawai,
    deletePegawai
};
