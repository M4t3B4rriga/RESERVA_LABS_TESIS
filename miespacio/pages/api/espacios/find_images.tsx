import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const { CodEspacio, NombreImagen } = req.query;

  try {
    const imagePath = path.join('espacios_images', 'images', CodEspacio as string, NombreImagen as string);
    const image = fs.readFileSync(imagePath);

    // Obtener la extensión del archivo para determinar el tipo de contenido
    const extension = path.extname(NombreImagen as string).toLowerCase();
    let contentType;

    switch (extension) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      default:
        return res.status(415).json({ message: 'Tipo de imagen no soportado' });
    }

    res.setHeader('Content-Type', contentType);
    res.send(image);
  } catch (error) {
    console.error(error);
    res.status(404).json({ message: 'Imagen no encontrada' });
  }
};
