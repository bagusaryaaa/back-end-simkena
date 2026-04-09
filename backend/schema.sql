-- Drop old views and tables to start fresh if needed
DROP VIEW IF EXISTS vw_monitoring_kenaikan_jabatan;
DROP TABLE IF EXISTS hukuman_disiplin CASCADE;
DROP TABLE IF EXISTS diklat CASCADE;
DROP TABLE IF EXISTS skp CASCADE;
DROP TABLE IF EXISTS riwayat_jabatan CASCADE;
DROP TABLE IF EXISTS monitoring_kenaikan CASCADE;
DROP TABLE IF EXISTS pegawai CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nip VARCHAR(30) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'OPERATOR',
    name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pegawai Table
CREATE TABLE pegawai (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nip VARCHAR(50) UNIQUE NOT NULL,
    nama VARCHAR(255) NOT NULL,
    tanggal_lahir DATE NOT NULL,
    unit_kerja VARCHAR(255) NOT NULL,
    jabatan_sekarang VARCHAR(255) NOT NULL,
    pangkat_golongan VARCHAR(100) NOT NULL,
    tmt_pns DATE NOT NULL,
    status_aktif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Riwayat Jabatan Table
CREATE TABLE riwayat_jabatan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pegawai_id UUID REFERENCES pegawai(id) ON DELETE CASCADE,
    nama_jabatan VARCHAR(255) NOT NULL,
    tmt_jabatan DATE NOT NULL,
    masa_minimal_tahun INTEGER NOT NULL,
    sk_jabatan VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SKP Table
CREATE TABLE skp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pegawai_id UUID REFERENCES pegawai(id) ON DELETE CASCADE,
    tahun INTEGER NOT NULL,
    nilai NUMERIC(5,2) NOT NULL,
    predikat VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Diklat Table
CREATE TABLE diklat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pegawai_id UUID REFERENCES pegawai(id) ON DELETE CASCADE,
    nama_diklat VARCHAR(255) NOT NULL,
    jp INTEGER NOT NULL,
    tahun INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hukuman Disiplin Table
CREATE TABLE hukuman_disiplin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pegawai_id UUID REFERENCES pegawai(id) ON DELETE CASCADE,
    jenis_hukuman VARCHAR(255) NOT NULL,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    status_aktif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Advanced View Requirement: vw_monitoring_kenaikan_jabatan
CREATE OR REPLACE VIEW vw_monitoring_kenaikan_jabatan AS
WITH LastJabatan AS (
    -- Get latest riwayat jabatan
    SELECT DISTINCT ON (pegawai_id) 
        pegawai_id, tmt_jabatan, masa_minimal_tahun
    FROM riwayat_jabatan
    ORDER BY pegawai_id, tmt_jabatan DESC
),
SkpValidation AS (
    -- Get SKP from last 2 years (simplified)
    SELECT skp.pegawai_id, 
           COUNT(*) FILTER (WHERE predikat IN ('Baik', 'Sangat Baik')) as count_baik
    FROM skp 
    JOIN LastJabatan lj ON lj.pegawai_id = skp.pegawai_id
    WHERE tahun >= (EXTRACT(YEAR FROM CURRENT_DATE) - 2)
    GROUP BY skp.pegawai_id
),
DiklatValidation AS (
    -- Get Diklat total JP this year
    SELECT pegawai_id, SUM(jp) as total_jp
    FROM diklat
    WHERE tahun = EXTRACT(YEAR FROM CURRENT_DATE)
    GROUP BY pegawai_id
),
DisciplineValidation AS (
    SELECT pegawai_id, COUNT(*) as active_punishments
    FROM hukuman_disiplin
    WHERE status_aktif = TRUE AND CURRENT_DATE BETWEEN tanggal_mulai AND tanggal_selesai
    GROUP BY pegawai_id
),
BaseData AS (
    SELECT 
        p.id AS pegawai_id,
        p.nip,
        p.nama,
        p.jabatan_sekarang,
        p.unit_kerja,
        p.pangkat_golongan, -- Existing line
        p.jenis_pegawai, -- Added this line
        COALESCE(lj.tmt_jabatan, p.tmt_pns) AS tmt_referensi,
        COALESCE(lj.masa_minimal_tahun, 4) AS masa_minimal,
        COALESCE(sk.count_baik, 0) AS count_baik_skp,
        COALESCE(dk.total_jp, 0) AS total_jp_diklat,
        COALESCE(hd.active_punishments, 0) AS hukuman_aktif
    FROM pegawai p
    LEFT JOIN LastJabatan lj ON p.id = lj.pegawai_id
    LEFT JOIN SkpValidation sk ON p.id = sk.pegawai_id
    LEFT JOIN DiklatValidation dk ON p.id = dk.pegawai_id
    LEFT JOIN DisciplineValidation hd ON p.id = hd.pegawai_id
),
CalculatedDates AS (
    SELECT 
        *,
        (tmt_referensi + (masa_minimal || ' years')::interval)::date AS tanggal_layak_masa_jabatan
    FROM BaseData
)
SELECT 
    pegawai_id,
    nip,
    nama,
    pangkat_golongan,
    jenis_pegawai,
    jabatan_sekarang,
    unit_kerja,
    tmt_referensi as tmt_terakhir,
    tanggal_layak_masa_jabatan,
    CASE WHEN count_baik_skp >= 2 THEN 'Memenuhi' ELSE 'Tidak Memenuhi' END AS status_skp,
    CASE WHEN total_jp_diklat >= 20 THEN 'Memenuhi' ELSE 'Tidak Memenuhi' END AS status_diklat,
    CASE WHEN hukuman_aktif = 0 THEN 'Memenuhi' ELSE 'Tidak Memenuhi' END AS status_disiplin,
    
    (EXTRACT(YEAR FROM tanggal_layak_masa_jabatan) - EXTRACT(YEAR FROM CURRENT_DATE)) * 12 +
    (EXTRACT(MONTH FROM tanggal_layak_masa_jabatan) - EXTRACT(MONTH FROM CURRENT_DATE)) AS months_until_eligible,
    
    CASE 
        WHEN CURRENT_DATE >= tanggal_layak_masa_jabatan THEN 'LAYAK'
        WHEN 
            ((EXTRACT(YEAR FROM tanggal_layak_masa_jabatan) - EXTRACT(YEAR FROM CURRENT_DATE)) * 12 +
            (EXTRACT(MONTH FROM tanggal_layak_masa_jabatan) - EXTRACT(MONTH FROM CURRENT_DATE))) <= 6
            AND 
            ((EXTRACT(YEAR FROM tanggal_layak_masa_jabatan) - EXTRACT(YEAR FROM CURRENT_DATE)) * 12 +
            (EXTRACT(MONTH FROM tanggal_layak_masa_jabatan) - EXTRACT(MONTH FROM CURRENT_DATE))) > 0
        THEN 'AKAN LAYAK'
        ELSE 'BELUM LAYAK'
    END AS status_kelayakan
FROM CalculatedDates;
-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO settings (key, value) VALUES 
('site_name', 'SIMKENA'),
('org_name_1', 'Balai Guru dan Tenaga Kependidikan'),
('org_name_2', 'Provinsi Nusa Tenggara Barat'),
('logo_url', '/assets/Background copy.png')
ON CONFLICT (key) DO NOTHING;
