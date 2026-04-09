const pool = require('../config/database');

const getDashboardStats = async (req, res) => {
    try {
        const totalPegawaiRes = await pool.query('SELECT COUNT(*) FROM pegawai WHERE status_aktif = true');
        const monitoringDataRes = await pool.query('SELECT status_kelayakan FROM vw_monitoring_kenaikan_jabatan');

        const totalPegawai = parseInt(totalPegawaiRes.rows[0].count, 10);
        const monitoringData = monitoringDataRes.rows;

        const stats = {
            total: totalPegawai,
            layak: monitoringData.filter(m => m.status_kelayakan === 'LAYAK').length,
            akan_layak: monitoringData.filter(m => m.status_kelayakan === 'AKAN LAYAK').length,
            belum_layak: monitoringData.filter(m => m.status_kelayakan === 'BELUM LAYAK').length
        };

        // Get recent 5
        const recentPegawaiRes = await pool.query(`
      SELECT * FROM vw_monitoring_kenaikan_jabatan 
      ORDER BY tanggal_layak_masa_jabatan ASC 
      LIMIT 5
    `);

        // Format for frontend
        const recentPegawai = recentPegawaiRes.rows.map(row => ({
            pegawai: {
                id: row.pegawai_id,
                nama: row.nama,
                nip: row.nip,
                jabatan_sekarang: row.jabatan_sekarang,
                unit_kerja: row.unit_kerja
            },
            tanggal_layak_final: row.tanggal_layak_masa_jabatan,
            status_kelayakan: row.status_kelayakan
        }));

        res.json({ stats, recent: recentPegawai });

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getYearlyStats = async (req, res) => {
    try {
        const query = `
            SELECT 
                EXTRACT(YEAR FROM tanggal_layak_masa_jabatan) as year,
                jenis_pegawai,
                COUNT(*) as count
            FROM vw_monitoring_kenaikan_jabatan
            GROUP BY year, jenis_pegawai
            ORDER BY year ASC
        `;
        const result = await pool.query(query);

        // Group by year
        const statsByYear = {};
        result.rows.forEach(row => {
            const yr = parseInt(row.year, 10);
            if (!statsByYear[yr]) {
                statsByYear[yr] = { year: yr, pns: 0, pppk: 0, total: 0 };
            }
            const count = parseInt(row.count, 10);
            if (row.jenis_pegawai === 'PPPK') {
                statsByYear[yr].pppk = count;
            } else {
                statsByYear[yr].pns = count;
            }
            statsByYear[yr].total += count;
        });

        res.json(Object.values(statsByYear));
    } catch (error) {
        console.error('Error fetching yearly stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getDashboardStats,
    getYearlyStats
};
