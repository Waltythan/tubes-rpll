export const ERROR_CODES = {
    AUTH: {
        NO_TOKEN: { code: 403, message: 'Akses ditolak: Token tidak ditemukan.' },
        INVALID_TOKEN: { code: 401, message: 'Sesi habis atau token tidak valid. Silakan login ulang.' },
        UNAUTHORIZED: { code: 403, message: 'Anda tidak memiliki izin (Role) untuk akses ini.' },
        NOT_FOUND: { code: 404, message: 'Data otentikasi tidak ditemukan.' },
        INVALID_CREDENTIALS: { code: 401, message: 'Email atau password salah.' },
    },

    USER: {
        NOT_FOUND: { code: 404, message: 'Data pengguna tidak ditemukan di sistem.' },
        ALREADY_EXISTS: { code: 400, message: 'Email atau Username sudah terdaftar.' },
    },

    ATTENDANCE: {
        ALREADY_CHECKIN: { code: 400, message: 'Anda sudah melakukan Absen Masuk hari ini.' },
        TOO_FAR: { code: 400, message: 'Lokasi Anda terlalu jauh dari koordinat kantor!' },
        INVALID_TIME: { code: 400, message: 'Waktu absensi tidak valid (di luar jam kerja).' },
    },

    SYSTEM: {
        INTERNAL_ERROR: { code: 500, message: 'Terjadi kesalahan pada server. Hubungi Admin IT.' },
        DB_CONNECTION: { code: 500, message: 'Gagal terhubung ke database.' },
    }
};