import { NextApiRequest, NextApiResponse } from 'next';
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { FotoEspacio } from '@/libs/fotoEspacio';
import { OkPacket, RowDataPacket } from 'mysql2';
import pool from '@/libs/db';
import url from 'url';
import { IncomingForm, Fields, Files, File as FormidableFile } from 'formidable';

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === 'POST') {
        const form = new IncomingForm();

        form.parse(req, async (err: any, fields: Fields, files: Files) => {
            if (err) {
                console.error(err);
                res.status(500).json({ message: 'Error al procesar el formulario' });
                return;
            }
            try {
                const { CodEspacio } = fields;
                console.log(CodEspacio);

                await pool.query(`
                    DELETE FROM T_MEFOTO_ESPACIO
                    WHERE PK_TMEESPACIO = ?
                `, [CodEspacio]);

                const imagePath = path.join('espacios_images', 'images', Array.isArray(CodEspacio) ? CodEspacio[0] : CodEspacio);
                const dbImagePath = path.join('/', 'images', Array.isArray(CodEspacio) ? CodEspacio[0] : CodEspacio);
                console.log(imagePath);
                if (fs.existsSync(imagePath)) {
                    fs.rmSync(imagePath, { recursive: true });
                }

                fs.mkdirSync(imagePath, { recursive: true });

                const imageKeys = Object.keys(files).filter((key) => key.startsWith('image-'));
                let i = 0;
                for (const key of imageKeys) {
                    const imageFile = files[key] as FormidableFile;
                    const newPath = path.join(imagePath, imageFile.originalFilename ? imageFile.originalFilename : '');
                    fs.writeFileSync(newPath, fs.readFileSync(imageFile.filepath));
                    console.log(newPath, imagePath);
                    const fotoEspacio: FotoEspacio = {
                        CodFotoEspacio: 0,
                        CodEspacio: Number(CodEspacio),
                        NombreFoto: imageFile.originalFilename ? imageFile.originalFilename : '',
                        RutaFoto: "/api/espacios/find_images?CodEspacio=" + CodEspacio + "&NombreImagen=",
                        Orden: i++,
                        Estado: '1',
                    };

                    const { CodFotoEspacio, NombreFoto, RutaFoto, Orden, Estado } = fotoEspacio;
                    console.log(fotoEspacio);

                    const [result] = await pool.query<OkPacket>(`
                    INSERT INTO T_MEFOTO_ESPACIO (PK_TMEESPACIO, FES_NOMBRE, FES_RUTA, FES_ORDEN, ESTADO)
                    VALUES (?, ?, ?, ?, ?)`, [CodEspacio, NombreFoto, RutaFoto, Orden, Estado]);

                }

                res.status(200).json({ message: 'Imágenes subidas y guardadas correctamente' });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Error al guardar las imágenes' });
            }
        });
    } else {
        res.status(405).json({ message: 'Método no permitido' });
    }
};

