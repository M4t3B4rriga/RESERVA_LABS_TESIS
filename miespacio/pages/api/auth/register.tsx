import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/libs/db';
import { OkPacket, RowDataPacket } from 'mysql2';
import bcrypt from 'bcrypt';

export default async function registerHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Método ${req.method} no permitido` });
  }

  console.log('Cuerpo de la solicitud:', req.body)

  const { username, password, firstName, lastName, secondLastName, email, role, carnetId, cedula, telefono } = req.body;

  if (!username || !password || !firstName || !lastName || !email || !role || !carnetId) {
    return res.status(400).json({ error: 'Los campos obligatorios son: usuario, contraseña, nombre, apellido paterno, correo institucional, rol y carnet ID' });
  }

  // Validar formato del email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'El correo institucional debe ser un email válido' });
  }

  // Validar rol
  if (!['Estudiante', 'Docente', 'Administrativo'].includes(role)) {
    return res.status(400).json({ error: 'El rol debe ser Estudiante, Docente o Administrativo' });
  }

  try {
    // Validar duplicados
    const [existingUsers] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM T_MCPERSONA_INTERNA WHERE PEI_EMAIL_INSTITUCIONAL = ? OR PEI_CARNET_ID = ? OR EXISTS (SELECT 1 FROM T_MSUSUARIO WHERE USU_NOMBRE = ?)',
      [email, carnetId, username]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'El usuario, correo institucional o carnet ID ya está registrado' });
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Iniciar transacción
    await pool.query('START TRANSACTION');

    // Insertar en T_MCPERSONA_INTERNA
    const [personaResult] = await pool.query<OkPacket>(
      'INSERT INTO T_MCPERSONA_INTERNA (PEI_NOMBRE, PEI_APELLIDO_PATERNO, PEI_APELLIDO_MATERNO, PEI_CARNET_ID, PEI_EMAIL_INSTITUCIONAL, PEI_EMAIL_PERSONAL, PEI_CEDULA, PEI_TELEFONO) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [firstName, lastName, secondLastName || null, carnetId, email, null, cedula || null, telefono || null]
    );

    const personaId = personaResult.insertId;

    // Insertar en T_REGISTRO_SOLICITUD
    const [solicitudResult] = await pool.query<OkPacket>(
      'INSERT INTO T_REGISTRO_SOLICITUD (PK_TMCPERSONA_INTERNA, USU_NOMBRE, XEUSU_PASWD, PEI_NOMBRE, PEI_APELLIDO_PATERNO, PEI_APELLIDO_MATERNO, PEI_EMAIL_INSTITUCIONAL, ROL, ESTADO) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [personaId, username, hashedPassword, firstName, lastName, secondLastName || null, email, role, 'Pendiente']
    );

    // Confirmar transacción
    await pool.query('COMMIT');

    return res.status(201).json({ message: 'Solicitud de registro enviada con éxito' });
  } catch (error: any) {
    await pool.query('ROLLBACK');
    console.error('Error al procesar la solicitud de registro:', {
      message: error.message,
      stack: error.stack,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState,
      code: error.code,
    });
    return res.status(500).json({
      error: 'Error interno al procesar la solicitud de registro',
      details: error.message || 'Error desconocido',
      sqlMessage: error.sqlMessage || null,
      sqlState: error.sqlState || null,
      code: error.code || null,
    });
  }
}