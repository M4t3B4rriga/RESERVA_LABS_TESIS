import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/libs/db';
import { jwtVerify } from 'jose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method Not Allowed' });
    return;
  }

  const { cookie, date, time, ip, description, result, browser, device } = req.body;

  try {
    const { payload } = await jwtVerify(
      cookie,
      new TextEncoder().encode('secret')
    );
    const Estado = '1';
    const connection = await pool.getConnection();
    await connection.query(
      'INSERT INTO T_MSAUDITORIA (AUD_FECHA, AUD_HORA, AUD_IP_USUARIO, AUD_DESCRIPCION_ACTIV, AUD_RESULTADO_ACTIV, AUD_NAVEGADOR, AUD_DISPOSITIVO, ESTADO, XEUSU_CODIGO) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        date,
        time,
        ip,
        description,
        result,
        browser,
        device,
        Estado,
        payload.CodUsuario,
      ]
    );
    connection.release();
    res.status(200).json({ message: 'Audit log inserted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
