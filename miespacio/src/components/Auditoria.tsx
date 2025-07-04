import { NextApiRequest } from 'next';
import pool from '@/libs/db';
import { jwtVerify } from "jose";
export async function insertAuditLog(
  coockie: string,
  date: string,
  time: string,
  ip: string,
  description: string,
  result: string,
  browser: string,
  device: string
) {
  
  try {
    const Estado = '1';
    const { payload } = await jwtVerify(
      coockie,
      new TextEncoder().encode("secret")
    );
    const connection = await pool.getConnection();
    await connection.query(
      'INSERT INTO t_msauditoria (AUD_FECHA, AUD_HORA, AUD_IP_USUARIO, AUD_DESCRIPCION_ACTIV, AUD_RESULTADO_ACTIV, AUD_NAVEGADOR, AUD_DISPOSITIVO, XEUSU_CODIGO, ESTADO) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [date, time, ip, description, result, browser, device, payload.CodUsuario, Estado]
    );
    connection.release();
  } catch (error) {
    console.error(error);
  }
}