import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/libs/db';
import path from 'path';

const imagesHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    const { CodEspacio } = req.query;

    // Validar que CodEspacio sea un valor válido
    if (!CodEspacio) {
        return res.status(400).json({ message: 'Falta el parámetro CodEspacio' });
    }

    try {
        const [result] = await pool.query<any[]>(`
            SELECT FES_RUTA, FES_NOMBRE
            FROM T_MEFOTO_ESPACIO
            WHERE PK_TMEESPACIO = ? AND ESTADO = 1
            ORDER BY FES_ORDEN ASC
        `, [CodEspacio]);

        // Validar si no se encontraron imágenes
        if (result.length === 0) {
            return res.status(200).json([]);
        }

        const imagePaths = result.map((row) => path.join(row.FES_RUTA, row.FES_NOMBRE));

        res.status(200).json(imagePaths);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener las imágenes' });
    }
};

export default imagesHandler;