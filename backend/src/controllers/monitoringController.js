const pool = require('../config/database');

const getMonitoringData = async (req, res) => {
    try {
        // Utilize the PostgreSQL View directly instead of calculating in JS
        const result = await pool.query('SELECT * FROM vw_monitoring_kenaikan_jabatan ORDER BY tanggal_layak_masa_jabatan ASC');

        // Format the result to match the expected structure in frontend somewhat
        const monitoringResults = result.rows.map(row => ({
            pegawai: {
                id: row.pegawai_id,
                nama: row.nama,
                nip: row.nip,
                pangkat_golongan: row.pangkat_golongan,
                jabatan_sekarang: row.jabatan_sekarang,
                unit_kerja: row.unit_kerja,
                jenis_pegawai: row.jenis_pegawai
            },
            status_skp: row.status_skp,
            status_diklat: row.status_diklat,
            status_disiplin: row.status_disiplin,
            tanggal_layak_final: row.tanggal_layak_masa_jabatan,
            status_kelayakan: row.status_kelayakan
        }));

        res.json(monitoringResults);
    } catch (error) {
        console.error('Error fetching monitoring data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getMonitoringData
};
