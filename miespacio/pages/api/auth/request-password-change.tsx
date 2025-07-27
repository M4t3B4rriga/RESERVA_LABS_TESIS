import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/libs/db';
import { OkPacket, RowDataPacket } from 'mysql2';

export default async function requestPasswordChangeHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Método ${req.method} no permitido` });
  }

  const { username, email, justificacion } = req.body;

  if (!username || !email || !justificacion) {
    return res.status(400).json({ 
      error: 'Los campos obligatorios son: usuario, correo institucional y justificación' 
    });
  }

  // Validar formato del email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'El correo institucional debe ser un email válido' });
  }

  try {
    // Verificar que el usuario existe y coincide con el email
    const [userRows] = await pool.query<RowDataPacket[]>(
      `SELECT u.XEUSU_CODIGO, u.USU_NOMBRE, pi.PEI_EMAIL_INSTITUCIONAL, pi.PEI_NOMBRE, pi.PEI_APELLIDO_PATERNO 
       FROM T_MSUSUARIO u 
       JOIN T_MCPERSONA_INTERNA pi ON u.PK_TMCPERSONA_INTERNA = pi.PK_TMCPERSONA_INTERNA 
       WHERE u.USU_NOMBRE = ? AND pi.PEI_EMAIL_INSTITUCIONAL = ?`,
      [username, email]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ 
        error: 'No se encontró un usuario con ese nombre de usuario y correo institucional' 
      });
    }

    const usuario = userRows[0];

    // Verificar si ya existe una solicitud pendiente para este usuario
    const [existingSolicitudes] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM T_CAMBIO_PASSWORD_SOLICITUD WHERE XEUSU_CODIGO = ? AND ESTADO = ?',
      [usuario.XEUSU_CODIGO, 'Pendiente']
    );

    if (existingSolicitudes.length > 0) {
      return res.status(400).json({ 
        error: 'Ya tienes una solicitud de cambio de contraseña pendiente' 
      });
    }

    // Insertar la nueva solicitud
    await pool.query<OkPacket>(
      `INSERT INTO T_CAMBIO_PASSWORD_SOLICITUD 
       (XEUSU_CODIGO, USU_NOMBRE, PEI_EMAIL_INSTITUCIONAL, PEI_NOMBRE, PEI_APELLIDO_PATERNO, JUSTIFICACION, ESTADO, FECHA_SOLICITUD) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        usuario.XEUSU_CODIGO,
        usuario.USU_NOMBRE,
        usuario.PEI_EMAIL_INSTITUCIONAL,
        usuario.PEI_NOMBRE,
        usuario.PEI_APELLIDO_PATERNO,
        justificacion,
        'Pendiente'
      ]
    );

    return res.status(201).json({ 
      message: 'Solicitud de cambio de contraseña enviada con éxito',
      detalles: 'Un administrador revisará tu solicitud y te contactará por correo'
    });

  } catch (error: any) {
    console.error('Error al procesar la solicitud de cambio de contraseña:', error);
    return res.status(500).json({
      error: 'Error interno al procesar la solicitud',
      details: error.message || 'Error desconocido'
    });
  }
}